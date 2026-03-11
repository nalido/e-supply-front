import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ColumnsType } from 'antd/es/table';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import {
  Button,
  Card,
  DatePicker,
  Input,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import { DownloadOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { pieceworkService } from '../../api/piecework';
import type {
  SequentialProcessListParams,
  SequentialProcessRecord,
  SequentialProcessStage,
  SequentialProcessStageStatus,
} from '../../types/sequential-process-report';

const { RangePicker } = DatePicker;
const { Text } = Typography;

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = ['10', '20', '50'];

const quantityFormatter = new Intl.NumberFormat('zh-CN');

const stageStatusColorMap: Record<SequentialProcessStage['status'], string> = {
  completed: 'success',
  inProgress: 'processing',
  pending: 'default',
};

const formatQuantity = (value?: number) => quantityFormatter.format(Math.max(0, Math.round(value ?? 0)));
const statusOptions: { label: string; value: SequentialProcessStageStatus }[] = [
  { label: '未开始', value: 'pending' },
  { label: '进行中', value: 'inProgress' },
  { label: '已完成', value: 'completed' },
];

type SequentialFilters = {
  keyword?: string;
  startDate?: string;
  endDate?: string;
  status?: SequentialProcessStageStatus;
};

const buildParams = (
  page: number,
  pageSize: number,
  filters: SequentialFilters,
): SequentialProcessListParams => ({
  page,
  pageSize,
  keyword: filters.keyword,
  startDate: filters.startDate,
  endDate: filters.endDate,
  status: filters.status,
});

const SequentialProcessSection = () => {
  const [records, setRecords] = useState<SequentialProcessRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [keyword, setKeyword] = useState('');
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([null, null]);
  const [statusFilter, setStatusFilter] = useState<SequentialProcessStageStatus | undefined>();
  const [appliedFilters, setAppliedFilters] = useState<SequentialFilters>({});
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const response = await pieceworkService.getSequentialProcesses(
        buildParams(page, pageSize, appliedFilters),
      );
      setRecords(response.list ?? []);
      setTotal(response.total ?? 0);
    } catch (error) {
      console.error('failed to load sequential process report', error);
      message.error('获取按序工序表失败');
    } finally {
      setLoading(false);
    }
  }, [appliedFilters, page, pageSize]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const handleSearch = () => {
    setAppliedFilters({
      keyword: keyword.trim() || undefined,
      startDate: dateRange[0]?.format('YYYY-MM-DD'),
      endDate: dateRange[1]?.format('YYYY-MM-DD'),
      status: statusFilter,
    });
    setPage(1);
  };

  const handleReset = () => {
    setKeyword('');
    setDateRange([null, null]);
    setStatusFilter(undefined);
    setAppliedFilters({});
    setPage(1);
    setPageSize(DEFAULT_PAGE_SIZE);
  };

  const handleReload = () => {
    void loadList();
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const { fileUrl } = await pieceworkService.exportSequentialProcesses({
        keyword: appliedFilters.keyword,
        startDate: appliedFilters.startDate,
        endDate: appliedFilters.endDate,
        status: appliedFilters.status,
      });
      if (fileUrl) {
        message.success(`已生成导出文件：${fileUrl}`);
      } else {
        message.success('导出任务已生成，请在日志目录查看生成的文件');
      }
    } catch (error) {
      console.error('failed to export sequential process report', error);
      message.error('导出失败，请稍后重试');
    } finally {
      setExporting(false);
    }
  };

  const columns = useMemo<ColumnsType<SequentialProcessRecord>>(
    () => [
      {
        title: '订单编号',
        dataIndex: 'orderNumber',
        width: 160,
        fixed: 'left',
        render: (value: string) => <Text strong>{value}</Text>,
      },
      {
        title: '款号/款名',
        dataIndex: 'styleNumber',
        width: 220,
        render: (_: unknown, record) => (
          <Space direction="vertical" size={0}>
            <Text>{record.styleNumber}</Text>
            <Text type="secondary">{record.styleName}</Text>
          </Space>
        ),
      },
      {
        title: '客户',
        dataIndex: 'customer',
        width: 160,
        ellipsis: true,
        render: (value?: string) => value || '-',
      },
      {
        title: '计划产量',
        dataIndex: 'plannedQuantity',
        width: 140,
        align: 'right',
        render: (value: number) => `${formatQuantity(value)} 件`,
      },
      {
        title: '已完成',
        dataIndex: 'totalQuantity',
        width: 140,
        align: 'right',
        render: (value: number) => `${formatQuantity(value)} 件`,
      },
      {
        title: '首票时间',
        dataIndex: 'firstRecordedAt',
        width: 160,
        render: (value?: string | null) => value ?? '-',
      },
      {
        title: '最新扫描',
        dataIndex: 'lastRecordedAt',
        width: 160,
        render: (value?: string | null) => value ?? '-',
      },
      {
        title: '进度状态',
        dataIndex: 'progressStatus',
        width: 140,
        render: (value: SequentialProcessRecord['progressStatus']) => (
          <Tag color={stageStatusColorMap[value] ?? 'default'}>{value === 'completed' ? '已完成' : '进行中'}</Tag>
        ),
      },
      {
        title: '工序进度',
        dataIndex: 'stages',
        width: 360,
        render: (_: unknown, record) => (
          <Space size={12} wrap>
            {record.stages?.map((stage) => (
              <div key={`${record.id}-${stage.sequence}`} style={{ minWidth: 150 }}>
                <Tag color={stageStatusColorMap[stage.status] ?? 'default'}>
                  {`${stage.sequence}. ${stage.processName}`}
                </Tag>
                <div style={{ fontSize: 12, color: '#8c8c8c' }}>
                  {formatQuantity(stage.quantity)} 件 · {stage.progressPercent}%
                </div>
                {stage.firstRecordedAt ? (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {stage.firstRecordedAt}
                  </Text>
                ) : null}
              </div>
            ))}
          </Space>
        ),
      },
    ],
    [],
  );

  return (
    <Card title="按序生产工序表" styles={{ body: { paddingBottom: 0 } }}>
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Space size={12} wrap>
          <Input
            allowClear
            style={{ width: 260 }}
            placeholder="订单号/款号/款名"
            prefix={<SearchOutlined />}
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            onPressEnter={handleSearch}
          />
          <RangePicker
            allowClear
            style={{ width: 320 }}
            value={dateRange}
            onChange={(value) => setDateRange(value ?? [null, null])}
            disabledDate={(current) => current && current > dayjs().endOf('day')}
          />
          <Select<SequentialProcessStageStatus>
            allowClear
            placeholder="请选择状态"
            style={{ width: 180 }}
            value={statusFilter}
            onChange={(value) => setStatusFilter(value)}
            onClear={() => setStatusFilter(undefined)}
            options={statusOptions}
          />
          <Space>
            <Button type="primary" onClick={handleSearch}>
              筛选
            </Button>
            <Button onClick={handleReset}>重置</Button>
            <Button icon={<ReloadOutlined />} onClick={handleReload} loading={loading}>
              刷新
            </Button>
            <Button icon={<DownloadOutlined />} onClick={handleExport} loading={exporting}>
              导出
            </Button>
          </Space>
        </Space>

        <Space direction="vertical" size={0}>
          <Text strong>共 {total} 条记录</Text>
          <Text type="secondary">展示每个工单的工序执行顺序与进度</Text>
        </Space>

        <Table<SequentialProcessRecord>
          rowKey="id"
          bordered
          scroll={{ x: 1200 }}
          loading={loading}
          dataSource={records}
          columns={columns}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            pageSizeOptions: PAGE_SIZE_OPTIONS,
            showTotal: (value) => `共 ${value} 条`,
            onChange: (nextPage, nextSize) => {
              if (nextSize && nextSize !== pageSize) {
                setPageSize(nextSize);
                setPage(1);
              } else {
                setPage(nextPage);
              }
            },
          }}
        />
      </Space>
    </Card>
  );
};

export default SequentialProcessSection;
