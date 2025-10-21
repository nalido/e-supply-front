import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ColumnsType } from 'antd/es/table';
import type { CheckboxValueType } from 'antd/es/checkbox/Group';
import { Button, Card, Checkbox, Space, Table, Typography, message } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { outsourcingCuttingDetailReportService } from '../api/mock';
import type {
  OutsourcingCuttingDetailGroupKey,
  OutsourcingCuttingDetailListParams,
  OutsourcingCuttingDetailRecord,
} from '../types/order-outsourcing-cutting-detail-report';

const { Text } = Typography;

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 20, 50];
const DEFAULT_GROUP_BY: OutsourcingCuttingDetailGroupKey[] = ['factoryOrder', 'subcontractor'];

const groupOptions = [
  { value: 'factoryOrder', label: '分工厂订单' },
  { value: 'status', label: '分状态' },
  { value: 'subcontractor', label: '分加工厂' },
  { value: 'sku', label: '分SKU' },
  { value: 'cuttingDate', label: '分裁剪日期' },
] as const satisfies { value: OutsourcingCuttingDetailGroupKey; label: string }[];

const quantityFormatter = new Intl.NumberFormat('zh-CN');
const amountFormatter = new Intl.NumberFormat('zh-CN', {
  style: 'currency',
  currency: 'CNY',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const formatQuantity = (value?: number) => quantityFormatter.format(value ?? 0);
const formatAmount = (value?: number) => amountFormatter.format(value ?? 0);

const accessGroupingValue: Record<
  OutsourcingCuttingDetailGroupKey,
  (record: OutsourcingCuttingDetailRecord) => string
> = {
  factoryOrder: (record) => record.orderNumber,
  status: (record) => record.status,
  subcontractor: (record) => record.subcontractor,
  sku: (record) => `${record.styleNumber}|${record.color}|${record.size}`,
  cuttingDate: (record) => record.cuttingDate,
};

const LABEL_PREFIX_MAP: Record<OutsourcingCuttingDetailGroupKey, string> = {
  factoryOrder: '工厂订单',
  status: '状态',
  subcontractor: '加工厂',
  sku: 'SKU',
  cuttingDate: '裁剪日期',
};

type DetailRow = OutsourcingCuttingDetailRecord & { rowType: 'detail' };
type AggregateRow = {
  rowType: 'aggregate';
  id: string;
  orderNumber?: string;
  status?: string;
  subcontractor?: string;
  styleNumber?: string;
  styleName?: string;
  color?: string;
  size?: string;
  unitPrice?: number;
  cuttingDate?: string;
  quantity: number;
  amount: number;
};

type TableRow = DetailRow | AggregateRow;

type SummaryValue = {
  quantity: number;
  amount: number;
};

const OrderOutsourcingCuttingDetailReport = () => {
  const [groupBy, setGroupBy] = useState<OutsourcingCuttingDetailGroupKey[]>(DEFAULT_GROUP_BY);
  const [records, setRecords] = useState<OutsourcingCuttingDetailRecord[]>([]);
  const [totalSummary, setTotalSummary] = useState<SummaryValue>({ quantity: 0, amount: 0 });
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [total, setTotal] = useState(0);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const params: OutsourcingCuttingDetailListParams = {
        groupBy,
        page,
        pageSize,
      };
      const response = await outsourcingCuttingDetailReportService.getList(params);
      setRecords(response.list);
      setTotal(response.total);
      setTotalSummary(response.summary);
    } catch (error) {
      console.error('failed to load outsourcing cutting detail list', error);
      message.error('获取外发裁剪明细失败');
    } finally {
      setLoading(false);
    }
  }, [groupBy, page, pageSize]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const handleGroupChange = (values: CheckboxValueType[]) => {
    const valueSet = new Set(values.map(String));
    const normalized = groupOptions
      .map((option) => option.value)
      .filter((key) => valueSet.has(key));
    setGroupBy(normalized);
    setPage(1);
  };

  const handleExport = () => {
    message.success('已生成外发裁剪明细导出任务，请稍后在下载中心查看');
  };

  const { displayedRows, pageSummary } = useMemo(() => {
    if (!records.length) {
      return {
        displayedRows: [] as TableRow[],
        pageSummary: { quantity: 0, amount: 0 },
      };
    }

    if (!groupBy.length) {
      const detailRows = records.map<TableRow>((record) => ({ ...record, rowType: 'detail' }));
      const summaryValue = detailRows.reduce(
        (acc, item) => {
          acc.quantity += item.quantity;
          acc.amount += item.amount;
          return acc;
        },
        { quantity: 0, amount: 0 },
      );
      return { displayedRows: detailRows, pageSummary: summaryValue };
    }

    const aggregateMap = new Map<string, AggregateRow>();

    records.forEach((record) => {
      const mapKey = groupBy
        .map((key) => accessGroupingValue[key](record))
        .join('||');
      const existing = aggregateMap.get(mapKey);
      if (existing) {
        existing.quantity += record.quantity;
        existing.amount += record.amount;
        return;
      }

      const aggregated: AggregateRow = {
        rowType: 'aggregate',
        id: `agg-${mapKey || 'all'}`,
        quantity: record.quantity,
        amount: record.amount,
      };

      if (groupBy.includes('factoryOrder')) {
        aggregated.orderNumber = record.orderNumber;
      }
      if (groupBy.includes('status')) {
        aggregated.status = record.status;
      }
      if (groupBy.includes('subcontractor')) {
        aggregated.subcontractor = record.subcontractor;
      }
      if (groupBy.includes('sku')) {
        aggregated.styleNumber = record.styleNumber;
        aggregated.styleName = record.styleName;
        aggregated.color = record.color;
        aggregated.size = record.size;
        aggregated.unitPrice = record.unitPrice;
      }
      if (groupBy.includes('cuttingDate')) {
        aggregated.cuttingDate = record.cuttingDate;
      }

      aggregateMap.set(mapKey, aggregated);
    });

    const aggregatedRows = Array.from(aggregateMap.values());
    const summaryValue = aggregatedRows.reduce(
      (acc, item) => {
        acc.quantity += item.quantity;
        acc.amount += item.amount;
        return acc;
      },
      { quantity: 0, amount: 0 },
    );

    return { displayedRows: aggregatedRows, pageSummary: summaryValue };
  }, [groupBy, records]);

  const displayedData = displayedRows;

  const groupLabelText = useMemo(() => {
    if (!groupBy.length) {
      return '无';
    }
    return groupBy
      .map((key) => LABEL_PREFIX_MAP[key])
      .join(' / ');
  }, [groupBy]);

  const columns: ColumnsType<TableRow> = useMemo(() => {
    const createTextCell = (value: string | undefined, bold: boolean) => {
      if (!value) {
        return null;
      }
      return bold ? <Text strong>{value}</Text> : value;
    };

    const renderText = (field: keyof AggregateRow & keyof OutsourcingCuttingDetailRecord) =>
      (_value: string | undefined, record: TableRow) => {
        if (record.rowType === 'aggregate') {
          return createTextCell(record[field], true);
        }
        return record[field];
      };

    const renderSkuField = (field: 'styleNumber' | 'styleName' | 'color' | 'size') =>
      (_value: string | undefined, record: TableRow) => {
        if (record.rowType === 'aggregate') {
          return createTextCell(record[field], true);
        }
        return record[field];
      };

    const renderUnitPrice = (value: number | undefined, record: TableRow) => {
      if (record.rowType === 'aggregate') {
        if (record.unitPrice !== undefined) {
          return formatAmount(record.unitPrice);
        }
        return null;
      }
      return formatAmount(value);
    };

    const renderNumberCell = (value: number, record: TableRow, formatter: (val: number) => string) => {
      if (record.rowType === 'aggregate') {
        return <Text strong>{formatter(value)}</Text>;
      }
      return formatter(value);
    };

    const showFactoryOrder = !groupBy.length || groupBy.includes('factoryOrder');
    const showStatus = !groupBy.length || groupBy.includes('status');
    const showSubcontractor = !groupBy.length || groupBy.includes('subcontractor');
    const showSku = !groupBy.length || groupBy.includes('sku');
    const showCuttingDate = !groupBy.length || groupBy.includes('cuttingDate');

    const columnsDefinition: ColumnsType<TableRow> = [];

    if (showFactoryOrder) {
      columnsDefinition.push({
        title: '工厂订单',
        dataIndex: 'orderNumber',
        width: 160,
        render: renderText('orderNumber'),
      });
    }

    if (showStatus) {
      columnsDefinition.push({
        title: '状态',
        dataIndex: 'status',
        width: 120,
        render: renderText('status'),
      });
    }

    if (showSubcontractor) {
      columnsDefinition.push({
        title: '加工厂',
        dataIndex: 'subcontractor',
        width: 160,
        render: renderText('subcontractor'),
      });
    }

    if (showSku) {
      columnsDefinition.push(
        {
          title: '款号',
          dataIndex: 'styleNumber',
          width: 140,
          render: renderSkuField('styleNumber'),
        },
        {
          title: '款名',
          dataIndex: 'styleName',
          width: 200,
          ellipsis: true,
          render: renderSkuField('styleName'),
        },
        {
          title: '颜色',
          dataIndex: 'color',
          width: 120,
          render: renderSkuField('color'),
        },
        {
          title: '尺码',
          dataIndex: 'size',
          width: 100,
          render: renderSkuField('size'),
        },
        {
          title: '单价',
          dataIndex: 'unitPrice',
          width: 120,
          align: 'right',
          render: renderUnitPrice,
        },
      );
    }

    if (showCuttingDate) {
      columnsDefinition.push({
        title: '裁剪日期',
        dataIndex: 'cuttingDate',
        width: 140,
        render: renderText('cuttingDate'),
      });
    }

    columnsDefinition.push(
      {
        title: '数量',
        dataIndex: 'quantity',
        width: 120,
        align: 'right',
        render: (value: number, record) => renderNumberCell(value, record, formatQuantity),
      },
      {
        title: '金额',
        dataIndex: 'amount',
        width: 140,
        align: 'right',
        render: (value: number, record) => renderNumberCell(value, record, formatAmount),
      },
    );

    return columnsDefinition;
  }, [groupBy]);

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card>
        <Space size={16} wrap>
          <Checkbox.Group
            options={groupOptions}
            value={groupBy}
            onChange={handleGroupChange}
          />
          <Button icon={<DownloadOutlined />} onClick={handleExport}>
            导出Excel
          </Button>
        </Space>
      </Card>

      <Card
        title="外发裁剪明细"
        extra={
          <Space size={16}>
            <Text type="secondary">当前分组：{groupLabelText}</Text>
            <Text type="secondary">本页数量：{formatQuantity(pageSummary.quantity)}</Text>
            <Text type="secondary">本页金额：{formatAmount(pageSummary.amount)}</Text>
            <Text type="secondary">总数量：{formatQuantity(totalSummary.quantity)}</Text>
            <Text type="secondary">总金额：{formatAmount(totalSummary.amount)}</Text>
          </Space>
        }
      >
        <Table<TableRow>
          rowKey={(record) => record.id}
          columns={columns}
          dataSource={displayedData}
          loading={loading}
          pagination={{
            current: page,
            pageSize,
            total,
            showQuickJumper: true,
            showSizeChanger: true,
            pageSizeOptions: PAGE_SIZE_OPTIONS.map(String),
            showTotal: (value) => `共 ${value} 条明细`,
            onChange: (nextPage, nextSize) => {
              if (nextSize && nextSize !== pageSize) {
                setPage(1);
                setPageSize(nextSize);
              } else {
                setPage(nextPage);
              }
            },
            onShowSizeChange: (_current, nextSize) => {
              setPage(1);
              setPageSize(nextSize);
            },
          }}
          bordered
          scroll={{ x: 1200 }}
          summary={() => {
            const descriptiveCount = Math.max(columns.length - 2, 0);
            const quantityCellIndex = descriptiveCount > 0 ? descriptiveCount : 0;
            const amountCellIndex = descriptiveCount > 0 ? descriptiveCount + 1 : 1;

            return (
              <Table.Summary fixed>
                <Table.Summary.Row>
                  {descriptiveCount > 0 && (
                    <Table.Summary.Cell index={0} colSpan={descriptiveCount}>
                      <Text strong>本页合计</Text>
                    </Table.Summary.Cell>
                  )}
                  <Table.Summary.Cell index={quantityCellIndex} align="right">
                    <Text strong>
                      {descriptiveCount === 0
                        ? `本页合计 ${formatQuantity(pageSummary.quantity)}`
                        : formatQuantity(pageSummary.quantity)}
                    </Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={amountCellIndex} align="right">
                    <Text strong>{formatAmount(pageSummary.amount)}</Text>
                  </Table.Summary.Cell>
                </Table.Summary.Row>
              </Table.Summary>
            );
          }}
        />
      </Card>
    </Space>
  );
};

export default OrderOutsourcingCuttingDetailReport;
