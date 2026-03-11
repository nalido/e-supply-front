import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import {
  Button,
  Card,
  DatePicker,
  Empty,
  Input,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { pieceworkService } from '../../api/piecework';
import type {
  ReportDownloadListParams,
  ReportDownloadRecord,
} from '../../types/report-download-log';

const { RangePicker } = DatePicker;
const { Text } = Typography;

type RangeValue = [Dayjs | null, Dayjs | null] | null;

const REPORT_TYPE_OPTIONS: Array<{ label: string; value: ReportDownloadListParams['reportType'] }> = [
  { label: '全部报表', value: 'ALL' },
  { label: '工厂订单', value: 'FACTORY_ORDERS' },
  { label: '裁床报表', value: 'CUTTING_REPORT' },
  { label: '订单进度明细', value: 'ORDER_PROGRESS' },
  { label: '订单计菲明细', value: 'TICKET_RECORDS' },
  { label: '按序工序表', value: 'SEQUENTIAL_PROCESSES' },
  { label: '外发任务', value: 'OUTSOURCING_ORDERS' },
  { label: '质检记录', value: 'QUALITY_INSPECTIONS' },
];

const STATUS_OPTIONS: Array<{ label: string; value: ReportDownloadListParams['status'] }> = [
  { label: '全部状态', value: 'all' },
  { label: '已完成', value: 'COMPLETED' },
  { label: '失败', value: 'FAILED' },
];

const statusMeta: Record<ReportDownloadRecord['status'], { color: string; label: string }> = {
  COMPLETED: { color: 'success', label: '已完成' },
  FAILED: { color: 'error', label: '失败' },
};

const formatFilters = (value?: string): string => {
  if (!value) {
    return '-';
  }
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.join('、');
    }
    if (typeof parsed === 'object' && parsed !== null) {
      const entries = Object.entries(parsed)
        .filter(([, val]) => val !== undefined && val !== null && String(val).length > 0)
        .map(([key, val]) => `${key}: ${val}`);
      if (entries.length) {
        return entries.join('，');
      }
    }
  } catch (error) {
    console.warn('failed to parse report filters', error);
  }
  return value;
};

const DownloadRecordsSection = () => {
  const [records, setRecords] = useState<ReportDownloadRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [reportType, setReportType] = useState<ReportDownloadListParams['reportType']>('ALL');
  const [statusFilter, setStatusFilter] = useState<ReportDownloadListParams['status']>('all');
  const [dateRange, setDateRange] = useState<RangeValue>(null);
  const [keyword, setKeyword] = useState('');
  const [keywordInput, setKeywordInput] = useState('');

  const appliedParams: ReportDownloadListParams = useMemo(
    () => ({
      reportType,
      status: statusFilter,
      startDate: dateRange?.[0]?.format('YYYY-MM-DD'),
      endDate: dateRange?.[1]?.format('YYYY-MM-DD'),
      keyword,
      page,
      pageSize,
    }),
    [reportType, statusFilter, dateRange, keyword, page, pageSize],
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await pieceworkService.getReportDownloads(appliedParams);
      setRecords(response.list);
      setTotal(response.total);
      setPage(response.page);
      setPageSize(response.pageSize);
    } catch (error) {
      console.error('failed to load report download logs', error);
      message.error('获取下载记录失败');
    } finally {
      setLoading(false);
    }
  }, [appliedParams]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleSearch = () => {
    setPage(1);
    setKeyword(keywordInput.trim());
  };

  const handleReset = () => {
    setReportType('ALL');
    setStatusFilter('all');
    setKeyword('');
    setKeywordInput('');
    setDateRange(null);
    setPage(1);
    setPageSize(10);
  };

  const handleTableChange: TablePaginationConfig['onChange'] = (nextPage, nextPageSize) => {
    const size = nextPageSize ?? pageSize;
    if (size !== pageSize) {
      setPageSize(size);
      setPage(1);
      return;
    }
    setPage(nextPage ?? 1);
  };

  const columns = useMemo<ColumnsType<ReportDownloadRecord>>(
    () => [
      {
        title: '下载时间',
        dataIndex: 'requestedAt',
        key: 'requestedAt',
        width: 200,
        render: (value?: string) => (value ? dayjs(value).format('YYYY-MM-DD HH:mm') : '-'),
      },
      {
        title: '报表',
        dataIndex: 'reportType',
        key: 'reportType',
        width: 180,
        render: (value: ReportDownloadRecord['reportType']) => {
          const option = REPORT_TYPE_OPTIONS.find((item) => item.value === value);
          return option?.label ?? value;
        },
      },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        width: 120,
        render: (value: ReportDownloadRecord['status']) => {
          const meta = statusMeta[value];
          return <Tag color={meta?.color}>{meta?.label ?? value}</Tag>;
        },
      },
      {
        title: '下载文件',
        dataIndex: 'fileUrl',
        key: 'fileUrl',
        render: (value?: string) =>
          value ? (
            <a href={value} target="_blank" rel="noreferrer">
              {value}
            </a>
          ) : (
            <Text type="secondary">未生成</Text>
          ),
      },
      {
        title: '提交人',
        dataIndex: 'requestedByName',
        key: 'requestedByName',
        width: 160,
        render: (_: unknown, record) => record.requestedByName || record.requestedBy || '-',
      },
      {
        title: '筛选条件',
        dataIndex: 'filters',
        key: 'filters',
        ellipsis: true,
        render: (value?: string) => formatFilters(value),
      },
      {
        title: '备注',
        dataIndex: 'message',
        key: 'message',
        render: (value?: string) => value || '-',
      },
    ],
    [],
  );

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card variant="borderless">
        <Space size={12} wrap>
          <Select
            value={reportType}
            options={REPORT_TYPE_OPTIONS}
            style={{ width: 200 }}
            onChange={(value) => {
              setReportType(value);
              setPage(1);
            }}
          />
          <Select
            value={statusFilter}
            options={STATUS_OPTIONS}
            style={{ width: 160 }}
            onChange={(value) => {
              setStatusFilter(value);
              setPage(1);
            }}
          />
          <RangePicker value={dateRange} onChange={(value) => setDateRange(value)} style={{ width: 320 }} />
          <Input
            allowClear
            placeholder="支持文件名/提交人搜索"
            style={{ width: 260 }}
            value={keywordInput}
            onChange={(event) => setKeywordInput(event.target.value)}
            onPressEnter={handleSearch}
          />
          <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
            查询
          </Button>
          <Button icon={<ReloadOutlined />} onClick={handleReset}>
            重置
          </Button>
        </Space>
      </Card>

      <Card variant="borderless" title="下载记录">
        <Table<ReportDownloadRecord>
          rowKey={(record) => record.id}
          columns={columns}
          dataSource={records}
          loading={loading}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50'],
            onChange: handleTableChange,
            showTotal: (value) => `共 ${value} 条`,
          }}
          locale={{ emptyText: <Empty description="暂无下载记录" /> }}
        />
      </Card>
    </Space>
  );
};

export default DownloadRecordsSection;
