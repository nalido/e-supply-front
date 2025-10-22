import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { ColumnsType, TableProps } from 'antd/es/table';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import {
  Button,
  Card,
  DatePicker,
  Descriptions,
  Input,
  Modal,
  Progress,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import { DownloadOutlined, EyeOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { CaretDownOutlined, CaretUpOutlined, MinusOutlined } from '@ant-design/icons';
import type {
  OrderProgressCategory,
  OrderProgressDetailsListParams,
  OrderProgressDetailsRecord,
  OrderProgressStatus,
} from '../../types/order-progress-details-report';
import { orderProgressDetailsReportService } from '../../api/mock';

const { RangePicker } = DatePicker;
const { Text } = Typography;

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 20, 50];

type RangeValue = [Dayjs | null, Dayjs | null] | null;

type TrendIconKey = NonNullable<OrderProgressDetailsRecord['progressTrend']>;

type TrendMeta = {
  icon: ReactNode;
  tone: string;
  label: string;
};

const quantityFormatter = new Intl.NumberFormat('zh-CN');
const currencyFormatter = new Intl.NumberFormat('zh-CN', {
  style: 'currency',
  currency: 'CNY',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const statusMeta: Record<OrderProgressStatus, { label: string; color: string }> = {
  new: { label: '新建', color: 'default' },
  inProgress: { label: '进行中', color: 'processing' },
  delayed: { label: '预警', color: 'warning' },
  completed: { label: '已完成', color: 'success' },
};

const trendMeta: Record<TrendIconKey, TrendMeta> = {
  up: {
    icon: <CaretUpOutlined style={{ color: '#52c41a' }} />,
    tone: '#52c41a',
    label: '进度提升',
  },
  down: {
    icon: <CaretDownOutlined style={{ color: '#ff4d4f' }} />,
    tone: '#ff4d4f',
    label: '进度回落',
  },
  flat: {
    icon: <MinusOutlined style={{ color: '#8c8c8c' }} />,
    tone: '#8c8c8c',
    label: '进度持平',
  },
};

const toDateLabel = (value?: string) => (value ? dayjs(value).format('YYYY-MM-DD') : '-');
const toQuantity = (value?: number) => (value === undefined ? '-' : quantityFormatter.format(value));
const toCurrency = (value?: number) => (value === undefined ? '-' : currencyFormatter.format(value ?? 0));

const computeProgressStatus = (record: OrderProgressDetailsRecord): 'normal' | 'active' | 'exception' | 'success' => {
  if (record.orderStatus === 'completed' || record.progressPercent >= 100) {
    return 'success';
  }
  if (record.orderStatus === 'delayed') {
    return 'exception';
  }
  return 'active';
};

const getTrend = (trend?: OrderProgressDetailsRecord['progressTrend']): TrendMeta | null => {
  if (!trend) {
    return null;
  }
  return trendMeta[trend];
};

const columnsFactory = (
  onView: (record: OrderProgressDetailsRecord) => void,
  page: number,
  pageSize: number,
): ColumnsType<OrderProgressDetailsRecord> => [
  {
    title: '序号',
    dataIndex: 'index',
    key: 'index',
    width: 72,
    fixed: 'left',
    align: 'right',
    render: (_value, _record, rowIndex) => (page - 1) * pageSize + rowIndex + 1,
  },
  {
    title: '订单编号',
    dataIndex: 'orderNumber',
    key: 'orderNumber',
    width: 180,
    fixed: 'left',
    render: (value: string) => <Text strong>{value}</Text>,
  },
  {
    title: '客户',
    dataIndex: 'customer',
    key: 'customer',
    width: 180,
    ellipsis: true,
  },
  {
    title: '下单日期',
    dataIndex: 'orderDate',
    key: 'orderDate',
    width: 140,
    render: toDateLabel,
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
    title: '订单数量',
    dataIndex: 'orderQuantity',
    key: 'orderQuantity',
    width: 140,
    align: 'right',
    render: toQuantity,
  },
  {
    title: '开裁日期',
    dataIndex: 'cuttingDate',
    key: 'cuttingDate',
    width: 140,
    render: toDateLabel,
  },
  {
    title: '实裁数量',
    dataIndex: 'actualCutQuantity',
    key: 'actualCutQuantity',
    width: 140,
    align: 'right',
    render: toQuantity,
  },
  {
    title: '开货日期',
    dataIndex: 'dispatchDate',
    key: 'dispatchDate',
    width: 140,
    render: toDateLabel,
  },
  {
    title: '交货日期',
    dataIndex: 'deliveryDate',
    key: 'deliveryDate',
    width: 140,
    render: toDateLabel,
  },
  {
    title: '工序总价',
    dataIndex: 'totalProcessPrice',
    key: 'totalProcessPrice',
    width: 150,
    align: 'right',
    render: toCurrency,
  },
  {
    title: '订单状态',
    dataIndex: 'orderStatus',
    key: 'orderStatus',
    width: 120,
    render: (status: OrderProgressStatus) => {
      const meta = statusMeta[status];
      return <Tag color={meta.color}>{meta.label}</Tag>;
    },
  },
  {
    title: '订单进度',
    dataIndex: 'progressPercent',
    key: 'progressPercent',
    width: 200,
    render: (_value: number, record) => {
      const trend = getTrend(record.progressTrend);
      return (
        <Space size={8} align="center">
          <div style={{ minWidth: 140 }}>
            <Progress
              percent={Math.min(100, Math.round(record.progressPercent))}
              size="small"
              status={computeProgressStatus(record)}
            />
          </div>
          {trend ? (
            <Tooltip title={trend.label}>
              <span style={{ display: 'inline-flex', alignItems: 'center', color: trend.tone }}>
                {trend.icon}
              </span>
            </Tooltip>
          ) : null}
        </Space>
      );
    },
  },
  {
    title: '分类完成数',
    dataIndex: 'categorySummary',
    key: 'categorySummary',
    width: 140,
    fixed: 'right',
    render: (_value, record) => (
      <Button type="link" icon={<EyeOutlined />} onClick={() => onView(record)}>
        查看
      </Button>
    ),
  },
];

const OrderProgressDetailsSection = () => {
  const [records, setRecords] = useState<OrderProgressDetailsRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [keywordInput, setKeywordInput] = useState('');
  const [appliedKeyword, setAppliedKeyword] = useState<string | undefined>();
  const [dateRange, setDateRange] = useState<RangeValue>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [total, setTotal] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [detailRecord, setDetailRecord] = useState<OrderProgressDetailsRecord | null>(null);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const params: OrderProgressDetailsListParams = {
        page,
        pageSize,
        keyword: appliedKeyword,
        orderDateStart: dateRange?.[0]?.format('YYYY-MM-DD'),
        orderDateEnd: dateRange?.[1]?.format('YYYY-MM-DD'),
      };
      const response = await orderProgressDetailsReportService.getList(params);
      setRecords(response.list);
      setTotal(response.total);
    } catch (error) {
      console.error('failed to load order progress details list', error);
      message.error('获取订单进度明细失败');
    } finally {
      setLoading(false);
    }
  }, [appliedKeyword, dateRange, page, pageSize]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const handleSearch = () => {
    const normalized = keywordInput.trim();
    setAppliedKeyword(normalized ? normalized : undefined);
    setPage(1);
  };

  const handleReset = () => {
    setKeywordInput('');
    setAppliedKeyword(undefined);
    setDateRange(null);
    setPage(1);
    setPageSize(DEFAULT_PAGE_SIZE);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const params: OrderProgressDetailsListParams = {
        page,
        pageSize,
        keyword: appliedKeyword,
        orderDateStart: dateRange?.[0]?.format('YYYY-MM-DD'),
        orderDateEnd: dateRange?.[1]?.format('YYYY-MM-DD'),
      };
      const result = await orderProgressDetailsReportService.export(params);
      message.success('导出任务已生成，请稍后到下载中心查看');
      console.info('mock export file url', result.fileUrl);
    } catch (error) {
      console.error('failed to export order progress details', error);
      message.error('导出失败，请稍后重试');
    } finally {
      setExporting(false);
    }
  };

  const handleTableChange: TableProps<OrderProgressDetailsRecord>['onChange'] = (pagination) => {
    if (!pagination) {
      return;
    }
    const nextPage = pagination.current ?? 1;
    const nextPageSize = pagination.pageSize ?? pageSize;

    if (nextPageSize !== pageSize) {
      setPageSize(nextPageSize);
      setPage(1);
    } else if (nextPage !== page) {
      setPage(nextPage);
    }
  };

  const columns = useMemo(
    () => columnsFactory((record) => setDetailRecord(record), page, pageSize),
    [page, pageSize],
  );

  const tablePagination = useMemo(
    () => ({
      current: page,
      pageSize,
      total,
      showSizeChanger: true,
      pageSizeOptions: PAGE_SIZE_OPTIONS,
      showTotal: (value: number) => `共 ${value} 条`,
    }),
    [page, pageSize, total],
  );

  const categoryColumns: ColumnsType<OrderProgressCategory> = useMemo(
    () => [
      {
        title: '工序类别',
        dataIndex: 'name',
        key: 'name',
        width: 160,
      },
      {
        title: '完成数量',
        dataIndex: 'completedQty',
        key: 'completedQty',
        width: 160,
        align: 'right',
        render: (value: number, record) => (
          <span>
            {quantityFormatter.format(value)}
            <Text type="secondary"> / {quantityFormatter.format(record.totalQty)}</Text>
          </span>
        ),
      },
      {
        title: '完成进度',
        dataIndex: 'progress',
        key: 'progress',
        width: 220,
        render: (_value, record) => {
          const percent = record.totalQty ? Math.round((record.completedQty / record.totalQty) * 100) : 0;
          return <Progress percent={Math.min(100, percent)} size="small" status={percent >= 100 ? 'success' : 'active'} />;
        },
      },
      {
        title: '进度状态',
        dataIndex: 'onSchedule',
        key: 'onSchedule',
        width: 200,
        render: (_value, record) => (
          <Space size={4}>
            <Tag color={record.onSchedule ? 'success' : 'warning'}>
              {record.onSchedule ? '正常' : '滞后'}
            </Tag>
            {record.bottleneck ? <Tag color="error">瓶颈</Tag> : null}
          </Space>
        ),
      },
    ],
    [],
  );

  return (
    <Card bordered={false} bodyStyle={{ padding: 24 }}>
      <Space style={{ marginBottom: 16 }} wrap>
        <Input
          allowClear
          placeholder="输入订单号/客户/款号/款名"
          prefix={<SearchOutlined />}
          style={{ width: 280 }}
          value={keywordInput}
          onChange={(event) => setKeywordInput(event.target.value)}
          onPressEnter={handleSearch}
        />
        <RangePicker
          allowClear
          value={dateRange}
          onChange={(value) => {
            setDateRange(value);
            setPage(1);
          }}
          placeholder={['下单开始日期', '下单结束日期']}
        />
        <Button icon={<SearchOutlined />} type="primary" onClick={handleSearch}>
          查询
        </Button>
        <Button icon={<ReloadOutlined />} onClick={handleReset}>
          重置
        </Button>
      </Space>

      <Space style={{ marginBottom: 16 }}>
        <Text type="secondary">
          查询结果：共 {total ? quantityFormatter.format(total) : 0} 条订单
        </Text>
        <Button icon={<DownloadOutlined />} onClick={handleExport} loading={exporting}>
          导出Excel
        </Button>
      </Space>

      <Table<OrderProgressDetailsRecord>
        rowKey={(record) => record.id}
        columns={columns}
        loading={loading}
        dataSource={records}
        pagination={tablePagination}
        onChange={handleTableChange}
        scroll={{ x: 1400 }}
      />

      <Modal
        open={!!detailRecord}
        title="分类完成详情"
        onCancel={() => setDetailRecord(null)}
        footer={null}
        width={720}
      >
        {detailRecord ? (
          <>
            <Descriptions column={2} size="small" bordered style={{ marginBottom: 16 }}>
              <Descriptions.Item label="订单编号">{detailRecord.orderNumber}</Descriptions.Item>
              <Descriptions.Item label="客户">{detailRecord.customer}</Descriptions.Item>
              <Descriptions.Item label="款号">{detailRecord.styleNumber}</Descriptions.Item>
              <Descriptions.Item label="款名">{detailRecord.styleName}</Descriptions.Item>
              <Descriptions.Item label="订单数量">
                {quantityFormatter.format(detailRecord.orderQuantity)}
              </Descriptions.Item>
              <Descriptions.Item label="订单进度">
                <Progress
                  percent={Math.min(100, Math.round(detailRecord.progressPercent))}
                  size="small"
                  status={computeProgressStatus(detailRecord)}
                />
              </Descriptions.Item>
            </Descriptions>
            <Table<OrderProgressCategory>
              rowKey={(record) => record.key}
              columns={categoryColumns}
              dataSource={detailRecord.categorySummary}
              pagination={false}
              size="small"
            />
          </>
        ) : null}
      </Modal>
    </Card>
  );
};

export default OrderProgressDetailsSection;
