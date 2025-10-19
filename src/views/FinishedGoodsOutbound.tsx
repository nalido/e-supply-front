import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ColumnsType } from 'antd/es/table';
import {
  Button,
  Card,
  Checkbox,
  Col,
  Form,
  Input,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import type { CheckboxValueType } from 'antd/es/checkbox/Group';
import { DeleteOutlined, DownloadOutlined, EditOutlined, FlagOutlined, PrinterOutlined } from '@ant-design/icons';
import { finishedGoodsOutboundService } from '../api/mock';
import type {
  FinishedGoodsOutboundGrouping,
  FinishedGoodsOutboundListResponse,
  FinishedGoodsOutboundMeta,
  FinishedGoodsOutboundRecord,
} from '../types/finished-goods-outbound';

const { Text } = Typography;

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 20, 50];

const groupingOptions: { label: string; value: FinishedGoodsOutboundGrouping }[] = [
  { label: '分仓库', value: 'warehouse' },
  { label: '分发货单', value: 'dispatch' },
  { label: '分客户', value: 'customer' },
  { label: '分订单', value: 'order' },
  { label: '分颜色', value: 'color' },
  { label: '分尺码', value: 'size' },
  { label: '分款号款名', value: 'style' },
];

const quantityFormatter = (value: number): string => value.toLocaleString('zh-CN');
const currencyFormatter = new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY', minimumFractionDigits: 2 });
const formatCurrency = (value: number): string => currencyFormatter.format(value ?? 0);

type TableRecord =
  | (FinishedGoodsOutboundRecord & { recordType: 'detail' })
  | ({
      id: string;
      recordType: 'aggregate';
      warehouseName?: string;
      dispatchNoteNo?: string;
      dispatchDate?: string;
      customerName?: string;
      orderNo?: string;
      styleNo?: string;
      styleName?: string;
      color?: string;
      size?: string;
      quantity: number;
      amount: number;
    });

const FinishedGoodsOutbound = () => {
  const [meta, setMeta] = useState<FinishedGoodsOutboundMeta | null>(null);
  const [metaLoading, setMetaLoading] = useState(false);
  const [listState, setListState] = useState<FinishedGoodsOutboundListResponse>({ list: [], total: 0, summary: { quantity: 0, amount: 0 } });
  const [tableLoading, setTableLoading] = useState(false);
  const [groupBy, setGroupBy] = useState<FinishedGoodsOutboundGrouping[]>([]);
  const [showCompletedOrders, setShowCompletedOrders] = useState(false);
  const [customerFilter, setCustomerFilter] = useState<string | undefined>();
  const [warehouseFilter, setWarehouseFilter] = useState<string | undefined>();
  const [keyword, setKeyword] = useState('');
  const [appliedKeyword, setAppliedKeyword] = useState<string | undefined>();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  useEffect(() => {
    const loadMeta = async () => {
      setMetaLoading(true);
      try {
        const response = await finishedGoodsOutboundService.getMeta();
        setMeta(response);
      } catch (error) {
        console.error('failed to load outbound meta', error);
        message.error('加载出库筛选项失败');
      } finally {
        setMetaLoading(false);
      }
    };

    loadMeta();
  }, []);

  const loadList = useCallback(async () => {
    setTableLoading(true);
    try {
      const response = await finishedGoodsOutboundService.getList({
        page,
        pageSize,
        groupBy,
        showCompletedOrders,
        customerId: customerFilter,
        warehouseId: warehouseFilter,
        keyword: appliedKeyword,
      });
      setListState(response);
      const currentIds = new Set(response.list.map((item) => item.id));
      setSelectedRowKeys((prev) => prev.filter((key) => currentIds.has(String(key))));
    } catch (error) {
      console.error('failed to load outbound list', error);
      message.error('获取出库明细失败');
    } finally {
      setTableLoading(false);
    }
  }, [appliedKeyword, customerFilter, groupBy, page, pageSize, showCompletedOrders, warehouseFilter]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  useEffect(() => {
    setSelectedRowKeys([]);
  }, [groupBy]);

  const handleGroupingChange = (values: CheckboxValueType[]) => {
    setGroupBy(values as FinishedGoodsOutboundGrouping[]);
  };

  const handleShowCompletedToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
    setShowCompletedOrders(event.target.checked);
    setPage(1);
  };

  const handleCustomerChange = (value?: string) => {
    setCustomerFilter(value);
    setPage(1);
  };

  const handleWarehouseChange = (value?: string) => {
    setWarehouseFilter(value);
    setPage(1);
  };

  const handleSearch = (raw?: string) => {
    const sourceValue = raw !== undefined ? raw : keyword;
    const trimmed = sourceValue.trim();
    setKeyword(sourceValue);
    setAppliedKeyword(trimmed ? trimmed : undefined);
    setPage(1);
  };

  const handleReset = () => {
    setGroupBy([]);
    setShowCompletedOrders(false);
    setCustomerFilter(undefined);
    setWarehouseFilter(undefined);
    setKeyword('');
    setAppliedKeyword(undefined);
    setPage(1);
    setPageSize(DEFAULT_PAGE_SIZE);
    setSelectedRowKeys([]);
  };

  const handleTableChange = (nextPage: number, nextPageSize?: number) => {
    setPage(nextPage);
    if (nextPageSize && nextPageSize !== pageSize) {
      setPageSize(nextPageSize);
    }
  };

  const handleRowSelectionChange = (keys: React.Key[]) => {
    setSelectedRowKeys(keys);
  };

  const handleModify = () => {
    message.info(`已选择 ${selectedRowKeys.length} 条记录，准备修改出库信息`);
  };

  const handlePrint = () => {
    message.success('发货单打印任务已提交到打印中心');
  };

  const handleDelete = () => {
    message.warning('已提交出库记录作废申请，待仓储主管审批');
  };

  const handleStatusUpdate = () => {
    message.info('订单状态批量更新中，请稍后在操作日志查看结果');
  };

  const handleExport = () => {
    message.success('已生成出库明细导出任务，可前往下载中心查看');
  };

  const displayedData: TableRecord[] = useMemo(() => {
    if (!groupBy.length) {
      return listState.list.map((item) => ({ ...item, recordType: 'detail' }));
    }

    const aggregateMap = new Map<string, TableRecord>();

    listState.list.forEach((record) => {
      const keyParts = groupBy.map((group) => {
        switch (group) {
          case 'warehouse':
            return record.warehouseId;
          case 'dispatch':
            return record.dispatchNoteNo;
          case 'customer':
            return record.customerId;
          case 'order':
            return record.orderNo;
          case 'color':
            return `${record.styleNo}-${record.color}`;
          case 'size':
            return `${record.styleNo}-${record.size}`;
          case 'style':
            return record.styleNo;
          default:
            return 'unknown';
        }
      });
      const mapKey = keyParts.join('|');
      const existing = aggregateMap.get(mapKey);
      if (existing && existing.recordType === 'aggregate') {
        existing.quantity += record.quantity;
        existing.amount += record.amount;
        return;
      }
      const aggregateRecord: TableRecord = {
        id: `agg-${mapKey}`,
        recordType: 'aggregate',
        warehouseName: record.warehouseName,
        dispatchNoteNo: record.dispatchNoteNo,
        dispatchDate: record.dispatchDate,
        customerName: record.customerName,
        orderNo: record.orderNo,
        styleNo: record.styleNo,
        styleName: record.styleName,
        color: record.color,
        size: record.size,
        quantity: record.quantity,
        amount: record.amount,
      };
      aggregateMap.set(mapKey, aggregateRecord);
    });

    return Array.from(aggregateMap.values());
  }, [groupBy, listState.list]);

  const columns: ColumnsType<TableRecord> = useMemo(() => {
    const indexColumn: ColumnsType<TableRecord>[number] = {
      title: '序号',
      dataIndex: 'index',
      width: 72,
      align: 'right',
      render: (_value, _record, index) => (page - 1) * pageSize + index + 1,
      fixed: 'left',
    };

    const groupColumnsMap: Record<FinishedGoodsOutboundGrouping, ColumnsType<TableRecord>[number]> = {
      warehouse: { title: '仓库', dataIndex: 'warehouseName', width: 160 },
      dispatch: {
        title: '发货单',
        dataIndex: 'dispatchNoteNo',
        width: 200,
        render: (value: string, record) => (
          <Space direction="vertical" size={0}>
            <Text>{value}</Text>
            {record.dispatchDate ? <Text type="secondary">{record.dispatchDate}</Text> : null}
          </Space>
        ),
      },
      customer: { title: '客户', dataIndex: 'customerName', width: 220, ellipsis: true },
      order: { title: '订单号', dataIndex: 'orderNo', width: 160 },
      color: { title: '颜色', dataIndex: 'color', width: 120 },
      size: { title: '尺码', dataIndex: 'size', width: 100 },
      style: {
        title: '款号/款名',
        dataIndex: 'styleNo',
        width: 220,
        render: (value: string, record) => (
          <Space direction="vertical" size={0}>
            <Text>{value}</Text>
            {record.styleName ? <Text type="secondary">{record.styleName}</Text> : null}
          </Space>
        ),
      },
    };

    const quantityColumn: ColumnsType<TableRecord>[number] = {
      title: '数量',
      dataIndex: 'quantity',
      width: 110,
      align: 'right',
      render: (value: number) => quantityFormatter(value),
    };

    const unitPriceColumn: ColumnsType<TableRecord>[number] = {
      title: '单价',
      dataIndex: 'unitPrice',
      width: 110,
      align: 'right',
      render: (value: number) => (value ? formatCurrency(value) : '—'),
    };

    const amountColumn: ColumnsType<TableRecord>[number] = {
      title: '金额',
      dataIndex: 'amount',
      width: 140,
      align: 'right',
      render: (value: number) => formatCurrency(value),
    };

    if (groupBy.length) {
      return [indexColumn, ...groupBy.map((group) => groupColumnsMap[group]), quantityColumn, amountColumn];
    }

    const detailColumns: ColumnsType<TableRecord>[number][] = [
      { title: '发货单号', dataIndex: 'dispatchNoteNo', width: 200 },
      { title: '出库日期', dataIndex: 'dispatchDate', width: 140 },
      { title: '客户', dataIndex: 'customerName', width: 220, ellipsis: true },
      { title: '仓库', dataIndex: 'warehouseName', width: 160 },
      { title: '订单号', dataIndex: 'orderNo', width: 160 },
      { title: '款号', dataIndex: 'styleNo', width: 140 },
      { title: '款名', dataIndex: 'styleName', width: 220, ellipsis: true },
      { title: '颜色', dataIndex: 'color', width: 120 },
      { title: '尺码', dataIndex: 'size', width: 100 },
      quantityColumn,
      unitPriceColumn,
      amountColumn,
      { title: '物流公司', dataIndex: 'logisticsProvider', width: 160 },
      { title: '物流单号', dataIndex: 'trackingNumber', width: 200 },
      {
        title: '状态',
        dataIndex: 'status',
        width: 120,
        render: (value: FinishedGoodsOutboundRecord['status']) => (
          <Tag color={value === 'shipped' ? 'green' : 'gold'}>{value === 'shipped' ? '已发货' : '部分发货'}</Tag>
        ),
      },
    ];

    return [indexColumn, ...detailColumns];
  }, [groupBy, page, pageSize]);

  const isActionDisabled = selectedRowKeys.length === 0 || groupBy.length > 0;

  const rowSelection = groupBy.length
    ? undefined
    : {
        selectedRowKeys,
        onChange: handleRowSelectionChange,
        preserveSelectedRowKeys: true,
      };

  return (
    <Card title="出库明细" bordered={false} loading={metaLoading && !meta}>
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Row justify="space-between" align="middle">
          <Space wrap>
            <Button icon={<EditOutlined />} type="primary" disabled={isActionDisabled} onClick={handleModify}>
              修改
            </Button>
            <Button icon={<PrinterOutlined />} disabled={isActionDisabled} onClick={handlePrint}>
              打印
            </Button>
            <Button danger icon={<DeleteOutlined />} disabled={isActionDisabled} onClick={handleDelete}>
              删除
            </Button>
            <Button icon={<FlagOutlined />} disabled={isActionDisabled} onClick={handleStatusUpdate}>
              设置订单状态
            </Button>
            <Button icon={<DownloadOutlined />} onClick={handleExport}>
              导出Excel
            </Button>
          </Space>
          <Space>
            <Text type="secondary">共 {listState.total} 条记录</Text>
            {selectedRowKeys.length > 0 ? <Tag color="blue">已选 {selectedRowKeys.length} 条</Tag> : null}
          </Space>
        </Row>

        <Card size="small" bordered>
          <Form layout="vertical">
            <Row gutter={[16, 16]}>
              <Col span={24}>
                <Form.Item label="分组选项">
                  <Checkbox.Group
                    options={groupingOptions}
                    value={groupBy}
                    onChange={handleGroupingChange}
                  />
                </Form.Item>
              </Col>
              <Col span={24}>
                <Space size={24} wrap>
                  <Checkbox checked={showCompletedOrders} onChange={handleShowCompletedToggle}>
                    显示已完成订单
                  </Checkbox>
                  <Form.Item label="客户" style={{ marginBottom: 0 }}>
                    <Select
                      allowClear
                      placeholder="选择客户"
                      style={{ width: 200 }}
                      value={customerFilter}
                      onChange={handleCustomerChange}
                      loading={metaLoading}
                      options={meta?.customers.map((item) => ({ label: item.name, value: item.id }))}
                    />
                  </Form.Item>
                  <Form.Item label="仓库" style={{ marginBottom: 0 }}>
                    <Select
                      allowClear
                      placeholder="选择仓库"
                      style={{ width: 200 }}
                      value={warehouseFilter}
                      onChange={handleWarehouseChange}
                      loading={metaLoading}
                      options={meta?.warehouses.map((item) => ({ label: item.name, value: item.id }))}
                    />
                  </Form.Item>
                  <Form.Item label="订单/款式/发货单" style={{ marginBottom: 0 }}>
                    <Input.Search
                      allowClear
                      placeholder="输入订单号、款号或发货单号"
                      value={keyword}
                      onChange={(event) => setKeyword(event.target.value)}
                      onSearch={handleSearch}
                      enterButton="查询"
                      style={{ width: 280 }}
                    />
                  </Form.Item>
                  <Button onClick={handleReset}>重置</Button>
                </Space>
              </Col>
            </Row>
          </Form>
        </Card>

        <Table<TableRecord>
          rowKey={(record) => record.id}
          columns={columns}
          dataSource={displayedData}
          loading={tableLoading}
          rowSelection={rowSelection}
          pagination={{
            current: page,
            pageSize,
            total: listState.total,
            showSizeChanger: true,
            pageSizeOptions: PAGE_SIZE_OPTIONS.map(String),
            onChange: handleTableChange,
          }}
          scroll={{ x: 1400 }}
          summary={() => (
            <Table.Summary>
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={columns.length}>
                  <Space size={24} wrap>
                    <Text strong>合计</Text>
                    <Text>
                      总出库数量：<Text strong>{quantityFormatter(listState.summary.quantity)}</Text>
                    </Text>
                    <Text>
                      总金额：<Text strong>{formatCurrency(listState.summary.amount)}</Text>
                    </Text>
                  </Space>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            </Table.Summary>
          )}
        />
      </Space>
    </Card>
  );
};

export default FinishedGoodsOutbound;
