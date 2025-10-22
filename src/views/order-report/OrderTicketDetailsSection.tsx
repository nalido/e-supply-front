import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ColumnsType, TableProps } from 'antd/es/table';
import {
  Button,
  Card,
  Empty,
  Input,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import { DownloadOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { orderTicketDetailsReportService } from '../../api/mock';
import type {
  OrderTicketLot,
  OrderTicketLotListParams,
  OrderTicketRecord,
  OrderTicketRecordListParams,
} from '../../types/order-ticket-details-report';

const { Text } = Typography;

const LOT_PAGE_SIZE = 6;
const RECORD_PAGE_SIZE = 10;
const LOT_PAGE_OPTIONS = [6, 8, 10];
const RECORD_PAGE_OPTIONS = [10, 20, 50];

const quantityFormatter = new Intl.NumberFormat('zh-CN');
const currencyFormatter = new Intl.NumberFormat('zh-CN', {
  style: 'currency',
  currency: 'CNY',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const statusColorMap: Record<OrderTicketRecord['status'], string> = {
  pending: 'warning',
  settled: 'success',
  voided: 'default',
};

const statusLabelMap: Record<OrderTicketRecord['status'], string> = {
  pending: '未结算',
  settled: '已结算',
  voided: '已作废',
};

const formatCurrency = (value: number) => currencyFormatter.format(value ?? 0);
const formatQuantity = (value: number) => quantityFormatter.format(Math.round(value ?? 0));

const buildLotParams = (
  page: number,
  pageSize: number,
  keyword?: string,
): OrderTicketLotListParams => ({
  page,
  pageSize,
  keyword: keyword?.trim() || undefined,
});

const buildRecordParams = (
  lotId: string,
  page: number,
  pageSize: number,
  keyword?: string,
): OrderTicketRecordListParams => ({
  lotId,
  page,
  pageSize,
  keyword: keyword?.trim() || undefined,
});

const OrderTicketDetailsSection = () => {
  const [lotKeyword, setLotKeyword] = useState('');
  const [lotPage, setLotPage] = useState(1);
  const [lotPageSize, setLotPageSize] = useState(LOT_PAGE_SIZE);
  const [lots, setLots] = useState<OrderTicketLot[]>([]);
  const [lotTotal, setLotTotal] = useState(0);
  const [lotsLoading, setLotsLoading] = useState(false);
  const [activeLot, setActiveLot] = useState<OrderTicketLot | null>(null);

  const [recordKeyword, setRecordKeyword] = useState('');
  const [recordPage, setRecordPage] = useState(1);
  const [recordPageSize, setRecordPageSize] = useState(RECORD_PAGE_SIZE);
  const [records, setRecords] = useState<OrderTicketRecord[]>([]);
  const [recordTotal, setRecordTotal] = useState(0);
  const [recordSummary, setRecordSummary] = useState({ quantity: 0, amount: 0 });
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const loadLots = useCallback(async () => {
    setLotsLoading(true);
    try {
      const params = buildLotParams(lotPage, lotPageSize, lotKeyword);
      const response = await orderTicketDetailsReportService.getLots(params);
      setLots(response.list);
      setLotTotal(response.total);
      if (response.list.length && !response.list.find((lot) => lot.id === activeLot?.id)) {
        setActiveLot(response.list[0]);
      }
    } catch (error) {
      console.error('failed to load ticket lots', error);
      message.error('获取裁床批次失败');
    } finally {
      setLotsLoading(false);
    }
  }, [lotKeyword, lotPage, lotPageSize, activeLot?.id]);

  const loadRecords = useCallback(async () => {
    if (!activeLot) {
      setRecords([]);
      setRecordTotal(0);
      setRecordSummary({ quantity: 0, amount: 0 });
      return;
    }
    setRecordsLoading(true);
    try {
      const params = buildRecordParams(activeLot.id, recordPage, recordPageSize, recordKeyword);
      const response = await orderTicketDetailsReportService.getRecords(params);
      setRecords(response.list);
      setRecordTotal(response.total);
      setRecordSummary(response.summary);
    } catch (error) {
      console.error('failed to load ticket records', error);
      message.error('获取计菲明细失败');
    } finally {
      setRecordsLoading(false);
    }
  }, [activeLot, recordKeyword, recordPage, recordPageSize]);

  useEffect(() => {
    void loadLots();
  }, [loadLots]);

  useEffect(() => {
    setRecordPage(1);
  }, [activeLot?.id]);

  useEffect(() => {
    void loadRecords();
  }, [loadRecords]);

  const handleLotSearch = () => {
    setLotPage(1);
    void loadLots();
  };

  const handleLotReset = () => {
    setLotKeyword('');
    setLotPage(1);
    setLotPageSize(LOT_PAGE_SIZE);
  };

  const handleRecordSearch = () => {
    setRecordPage(1);
  };

  const handleRecordReset = () => {
    setRecordKeyword('');
    setRecordPage(1);
    setRecordPageSize(RECORD_PAGE_SIZE);
  };

  const handleExport = async () => {
    if (!activeLot) {
      message.warning('请选择需要导出的裁床批次');
      return;
    }
    setExporting(true);
    try {
      const params = buildRecordParams(activeLot.id, recordPage, recordPageSize, recordKeyword);
      const result = await orderTicketDetailsReportService.export(params);
      message.success('导出任务已生成，请稍后在下载中心查看');
      console.info('mock export file url', result.fileUrl);
    } catch (error) {
      console.error('failed to export ticket records', error);
      message.error('导出失败，请稍后重试');
    } finally {
      setExporting(false);
    }
  };

  const lotColumns: ColumnsType<OrderTicketLot> = useMemo(
    () => [
      {
        title: '订单编号',
        dataIndex: 'orderNumber',
        key: 'orderNumber',
        width: 160,
        ellipsis: true,
      },
      {
        title: '款号',
        dataIndex: 'styleNumber',
        key: 'styleNumber',
        width: 120,
      },
      {
        title: '款名',
        dataIndex: 'styleName',
        key: 'styleName',
        width: 180,
        ellipsis: true,
      },
      {
        title: '床次',
        dataIndex: 'bedNumber',
        key: 'bedNumber',
        width: 140,
      },
      {
        title: '颜色',
        dataIndex: 'color',
        key: 'color',
        width: 120,
      },
      {
        title: '裁床时间',
        dataIndex: 'cuttingDate',
        key: 'cuttingDate',
        width: 140,
      },
      {
        title: '数量',
        dataIndex: 'quantity',
        key: 'quantity',
        width: 120,
        align: 'right',
        render: (value: number) => formatQuantity(value),
      },
      {
        title: '备注',
        dataIndex: 'remark',
        key: 'remark',
        ellipsis: true,
      },
    ],
    [],
  );

  const recordColumns: ColumnsType<OrderTicketRecord> = useMemo(
    () => [
      {
        title: '菲票编号',
        dataIndex: 'ticketNo',
        key: 'ticketNo',
        width: 160,
        fixed: 'left',
      },
      {
        title: '工序名称',
        dataIndex: 'processName',
        key: 'processName',
        width: 160,
      },
      {
        title: '颜色',
        dataIndex: 'color',
        key: 'color',
        width: 120,
      },
      {
        title: '尺码',
        dataIndex: 'size',
        key: 'size',
        width: 100,
      },
      {
        title: '工价',
        dataIndex: 'pieceRate',
        key: 'pieceRate',
        width: 120,
        align: 'right',
        render: (value: number) => `${value.toFixed(2)} 元`,
      },
      {
        title: '数量',
        dataIndex: 'quantity',
        key: 'quantity',
        width: 120,
        align: 'right',
        render: (value: number) => formatQuantity(value),
      },
      {
        title: '金额',
        dataIndex: 'amount',
        key: 'amount',
        width: 140,
        align: 'right',
        render: (value: number) => formatCurrency(value),
      },
      {
        title: '员工',
        dataIndex: 'worker',
        key: 'worker',
        width: 120,
      },
      {
        title: '扫描时间',
        dataIndex: 'recordedAt',
        key: 'recordedAt',
        width: 160,
      },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        width: 120,
        render: (status: OrderTicketRecord['status']) => (
          <Tag color={statusColorMap[status]}>{statusLabelMap[status]}</Tag>
        ),
      },
    ],
    [],
  );

  const lotPagination = useMemo(
    () => ({
      current: lotPage,
      pageSize: lotPageSize,
      total: lotTotal,
      showSizeChanger: true,
      pageSizeOptions: LOT_PAGE_OPTIONS,
      showTotal: (value: number) => `共 ${value} 条`,
      onChange: (page: number, size: number) => {
        setLotPage(page);
        setLotPageSize(size);
      },
    }),
    [lotPage, lotPageSize, lotTotal],
  );

  const recordPagination = useMemo<TableProps<OrderTicketRecord>['pagination']>(
    () => ({
      current: recordPage,
      pageSize: recordPageSize,
      total: recordTotal,
      showSizeChanger: true,
      pageSizeOptions: RECORD_PAGE_OPTIONS,
      showTotal: (value: number) => `共 ${value} 条`,
    }),
    [recordPage, recordPageSize, recordTotal],
  );

  const handleRecordTableChange: TableProps<OrderTicketRecord>['onChange'] = (pagination) => {
    if (!pagination) {
      return;
    }
    const nextPage = pagination.current ?? 1;
    const nextSize = pagination.pageSize ?? recordPageSize;

    if (nextSize !== recordPageSize) {
      setRecordPageSize(nextSize);
      setRecordPage(1);
    } else if (nextPage !== recordPage) {
      setRecordPage(nextPage);
    }
  };

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card
        bordered={false}
        title="裁床批次"
        extra={
          <Space size={8}>
            <Input
              allowClear
              value={lotKeyword}
              onChange={(event) => setLotKeyword(event.target.value)}
              placeholder="请输入订单号/款号/床次/备注"
              prefix={<SearchOutlined />}
              style={{ width: 280 }}
              onPressEnter={handleLotSearch}
            />
            <Button type="primary" icon={<SearchOutlined />} onClick={handleLotSearch}>
              查询
            </Button>
            <Button icon={<ReloadOutlined />} onClick={handleLotReset}>
              重置
            </Button>
          </Space>
        }
      >
        <Table<OrderTicketLot>
          rowKey={(record) => record.id}
          dataSource={lots}
          columns={lotColumns}
          loading={lotsLoading}
          pagination={lotPagination}
          rowClassName={(record) => (record.id === activeLot?.id ? 'ant-table-row-selected' : '')}
          onRow={(record) => ({
            onClick: () => {
              setActiveLot(record);
            },
          })}
          size="small"
        />
      </Card>

      <Card
        bordered={false}
        title="计菲明细"
        extra={
          <Space size={8}>
            <Input
              allowClear
              value={recordKeyword}
              onChange={(event) => setRecordKeyword(event.target.value)}
              placeholder="搜索菲票编号/员工/工序"
              prefix={<SearchOutlined />}
              style={{ width: 260 }}
              onPressEnter={handleRecordSearch}
            />
            <Button type="primary" icon={<SearchOutlined />} onClick={handleRecordSearch}>
              查询
            </Button>
            <Button icon={<ReloadOutlined />} onClick={handleRecordReset}>
              重置
            </Button>
            <Button icon={<DownloadOutlined />} loading={exporting} onClick={handleExport}>
              导出Excel
            </Button>
          </Space>
        }
      >
        {activeLot ? (
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Space size={24}>
              <Text type="secondary">
                当前床次：<Text strong>{activeLot.bedNumber}</Text>
              </Text>
              <Text type="secondary">
                订单：<Text strong>{activeLot.orderNumber}</Text>
              </Text>
              <Text type="secondary">
                款式：<Text strong>{activeLot.styleNumber}</Text> {activeLot.styleName}
              </Text>
            </Space>
            <Space size={24}>
              <Text type="secondary">
                合计数量：<Text strong>{formatQuantity(recordSummary.quantity)}</Text>
              </Text>
              <Text type="secondary">
                合计金额：<Text strong>{formatCurrency(recordSummary.amount)}</Text>
              </Text>
            </Space>
            <Table<OrderTicketRecord>
              rowKey={(record) => record.id}
              columns={recordColumns}
              dataSource={records}
              loading={recordsLoading}
              pagination={recordPagination}
              onChange={handleRecordTableChange}
              scroll={{ x: 1200 }}
              size="middle"
            />
          </Space>
        ) : (
          <Empty description="请先选择上方的裁床批次" />
        )}
      </Card>
    </Space>
  );
};

export default OrderTicketDetailsSection;
