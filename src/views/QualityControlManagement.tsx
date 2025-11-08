import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ColumnsType, TableProps } from 'antd/es/table';
import type { Dayjs } from 'dayjs';
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
import { qualityControlManagementService } from '../api/mock';
import type {
  QualityControlListParams,
  QualityControlMeta,
  QualityControlRecord,
  QualityInspectionStatus,
} from '../types/quality-control-management';

const { RangePicker } = DatePicker;
const { Text } = Typography;

const DEFAULT_PAGE_SIZE = 20;
const PAGE_SIZE_OPTIONS = [20, 30, 50];

const numberFormatter = new Intl.NumberFormat('zh-CN');

const formatNumber = (value?: number) => numberFormatter.format(Math.round(value ?? 0));

const statusLabelMap: Record<QualityInspectionStatus, string> = {
  passed: '合格',
  failed: '不合格',
  rework: '返工',
};

const statusColorMap: Record<QualityInspectionStatus, string> = {
  passed: 'green',
  failed: 'red',
  rework: 'orange',
};

const resolveStatus = (record: QualityControlRecord): QualityInspectionStatus => {
  if (record.disposition === 'accepted') {
    return 'passed';
  }
  if (record.disposition === 'scrap') {
    return 'failed';
  }
  return 'rework';
};

const formatRangeValue = (range: [Dayjs | null, Dayjs | null]) => {
  const [start, end] = range;
  return {
    startDate: start ? start.format('YYYY-MM-DD') : undefined,
    endDate: end ? end.format('YYYY-MM-DD') : undefined,
  };
};

type AppliedFilters = {
  keyword?: string;
  status: QualityInspectionStatus | 'all';
  inspector?: string;
  startDate?: string;
  endDate?: string;
};

const createDefaultFilters = (status: QualityInspectionStatus | 'all'): AppliedFilters => ({
  keyword: undefined,
  status,
  inspector: undefined,
  startDate: undefined,
  endDate: undefined,
});

const QualityControlManagement = () => {
  const [meta, setMeta] = useState<QualityControlMeta | null>(null);
  const [metaLoading, setMetaLoading] = useState(false);
  const [records, setRecords] = useState<QualityControlRecord[]>([]);
  const [summary, setSummary] = useState({ inspectedQty: 0, passedQty: 0, failedQty: 0, reworkQty: 0 });
  const [tableLoading, setTableLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [total, setTotal] = useState(0);

  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<QualityInspectionStatus | 'all'>('all');
  const [inspector, setInspector] = useState('');
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([null, null]);
  const [appliedFilters, setAppliedFilters] = useState<AppliedFilters>(() => createDefaultFilters('all'));
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const loadMeta = async () => {
      setMetaLoading(true);
      try {
        const response = await qualityControlManagementService.getMeta();
        setMeta(response);
      } catch (error) {
        console.error('failed to load quality control meta', error);
        message.error('加载质检筛选项失败');
      } finally {
        setMetaLoading(false);
      }
    };

    void loadMeta();
  }, []);

  useEffect(() => {
    if (!meta) {
      return;
    }
    if (meta.defaultStatus !== undefined && meta.defaultStatus !== status) {
      setStatus(meta.defaultStatus);
      setAppliedFilters(createDefaultFilters(meta.defaultStatus));
      setPage(1);
    }
  }, [meta, status]);

  const loadList = useCallback(async () => {
    setTableLoading(true);
    try {
      const params: QualityControlListParams = {
        page,
        pageSize,
        keyword: appliedFilters.keyword,
        status: appliedFilters.status,
        inspector: appliedFilters.inspector,
        startDate: appliedFilters.startDate,
        endDate: appliedFilters.endDate,
      };
      if (!params.keyword) {
        delete params.keyword;
      }
      if (!params.inspector) {
        delete params.inspector;
      }
      if (!params.startDate) {
        delete params.startDate;
      }
      if (!params.endDate) {
        delete params.endDate;
      }
      const response = await qualityControlManagementService.getList(params);
      setRecords(response.list);
      setTotal(response.total);
      setSummary(response.summary);
    } catch (error) {
      console.error('failed to load quality control list', error);
      message.error('获取质检记录失败');
    } finally {
      setTableLoading(false);
    }
  }, [appliedFilters, page, pageSize]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const handleSearch = () => {
    const { startDate, endDate } = formatRangeValue(dateRange);
    setAppliedFilters({
      keyword: keyword.trim() || undefined,
      status,
      inspector: inspector ? inspector : undefined,
      startDate,
      endDate,
    });
    setPage(1);
  };

  const handleReset = () => {
    setKeyword('');
    const defaultStatus = meta?.defaultStatus ?? 'all';
    setStatus(defaultStatus);
    setInspector('');
    setDateRange([null, null]);
    setAppliedFilters(createDefaultFilters(defaultStatus));
    setPage(1);
    setPageSize(DEFAULT_PAGE_SIZE);
  };

  const pagination = useMemo<TableProps<QualityControlRecord>['pagination']>(
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

  const handleTableChange: TableProps<QualityControlRecord>['onChange'] = (paginationConfig) => {
    if (!paginationConfig) {
      return;
    }
    const nextPage = paginationConfig.current ?? 1;
    const nextSize = paginationConfig.pageSize ?? pageSize;
    if (nextSize !== pageSize) {
      setPageSize(nextSize);
      setPage(1);
    } else if (nextPage !== page) {
      setPage(nextPage);
    }
  };

  const columns: ColumnsType<QualityControlRecord> = useMemo(
    () => [
      {
        title: '质检日期',
        dataIndex: 'qcDate',
        key: 'qcDate',
        width: 140,
      },
      {
        title: '订单编号',
        dataIndex: 'orderNumber',
        key: 'orderNumber',
        width: 160,
        render: (value: string) => <Text strong>{value}</Text>,
      },
      {
        title: '款号/款名',
        key: 'style',
        width: 220,
        render: (_value, record) => (
          <Space direction="vertical" size={4}>
            <Text>{record.styleNumber}</Text>
            <Text type="secondary" style={{ maxWidth: 200 }} ellipsis>
              {record.styleName}
            </Text>
          </Space>
        ),
      },
      {
        title: '工序名称',
        dataIndex: 'processName',
        key: 'processName',
        width: 160,
      },
      {
        title: '菲票编号',
        dataIndex: 'ticketNo',
        key: 'ticketNo',
        width: 160,
      },
      {
        title: '送检员工',
        dataIndex: 'worker',
        key: 'worker',
        width: 140,
      },
      {
        title: '检验数量',
        dataIndex: 'inspectedQty',
        key: 'inspectedQty',
        width: 120,
        align: 'right',
        render: (value: number) => formatNumber(value),
      },
      {
        title: '合格数量',
        dataIndex: 'passedQty',
        key: 'passedQty',
        width: 120,
        align: 'right',
        render: (value: number) => formatNumber(value),
      },
      {
        title: '不合格数量',
        dataIndex: 'failedQty',
        key: 'failedQty',
        width: 130,
        align: 'right',
        render: (value: number) => formatNumber(value),
      },
      {
        title: '次品原因',
        dataIndex: 'defectReason',
        key: 'defectReason',
        width: 200,
        render: (value?: string) => value || '-',
      },
      {
        title: '质检结果',
        dataIndex: 'disposition',
        key: 'disposition',
        width: 120,
        render: (_value, record) => {
          const statusValue = resolveStatus(record);
          return <Tag color={statusColorMap[statusValue]}>{statusLabelMap[statusValue]}</Tag>;
        },
      },
      {
        title: '质检员',
        dataIndex: 'inspector',
        key: 'inspector',
        width: 120,
      },
      {
        title: '操作',
        key: 'actions',
        fixed: 'right',
        width: 120,
        render: (_value, record) => (
          <Button
            type="link"
            onClick={() => message.info(`查看 ${record.ticketNo} 的质检详情（Mock）`)}
          >
            查看详情
          </Button>
        ),
      },
    ],
    [],
  );

  const statusOptions = meta?.statusOptions ?? [
    { label: '全部状态', value: 'all' as QualityInspectionStatus | 'all' },
    { label: '合格', value: 'passed' as QualityInspectionStatus },
    { label: '不合格', value: 'failed' as QualityInspectionStatus },
    { label: '返工', value: 'rework' as QualityInspectionStatus },
  ];

  const inspectorOptions = meta?.inspectorOptions ?? [
    { label: '全部质检员', value: '' },
    { label: '林珊', value: '林珊' },
    { label: '王婷', value: '王婷' },
    { label: '郭诚', value: '郭诚' },
  ];

  const handleExport = async () => {
    setExporting(true);
    try {
      const result = await qualityControlManagementService.export({
        keyword: appliedFilters.keyword,
        status: appliedFilters.status,
        inspector: appliedFilters.inspector,
        startDate: appliedFilters.startDate,
        endDate: appliedFilters.endDate,
      });
      message.success('导出任务已生成，请稍后在下载中心查看');
      console.info('mock export url', result.fileUrl);
    } catch (error) {
      console.error('failed to export quality control records', error);
      message.error('导出失败，请稍后重试');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card bordered={false} loading={metaLoading && !records.length}>
        <Space size={32} wrap>
          <Space direction="vertical" size={4}>
            <Text type="secondary">检验数量</Text>
            <Text strong style={{ fontSize: 18 }}>{formatNumber(summary.inspectedQty)}</Text>
          </Space>
          <Space direction="vertical" size={4}>
            <Text type="secondary">合格数量</Text>
            <Text strong style={{ fontSize: 18 }}>{formatNumber(summary.passedQty)}</Text>
          </Space>
          <Space direction="vertical" size={4}>
            <Text type="secondary">不合格数量</Text>
            <Text strong style={{ fontSize: 18, color: '#ff4d4f' }}>{formatNumber(summary.failedQty)}</Text>
          </Space>
          <Space direction="vertical" size={4}>
            <Text type="secondary">返工数量</Text>
            <Text strong style={{ fontSize: 18, color: '#fa8c16' }}>{formatNumber(summary.reworkQty)}</Text>
          </Space>
        </Space>
      </Card>

      <Card
        bordered={false}
        title="质检记录"
        extra={
          <Space size={8} wrap>
            <Input
              allowClear
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="回车搜索(订单/款号/款名/菲票/工序)"
              prefix={<SearchOutlined />}
              style={{ width: 280 }}
              onPressEnter={handleSearch}
            />
            <RangePicker
              value={dateRange}
              onChange={(values) => {
                if (!values) {
                  setDateRange([null, null]);
                } else {
                  setDateRange([values[0], values[1]] as [Dayjs | null, Dayjs | null]);
                }
              }}
              placeholder={['开始日期', '结束日期']}
              style={{ width: 260 }}
              allowClear
            />
            <Select
              value={status}
              onChange={(value) => setStatus(value)}
              style={{ width: 140 }}
              options={statusOptions}
            />
            <Select
              value={inspector}
              onChange={(value) => setInspector(value)}
              style={{ width: 160 }}
              options={inspectorOptions}
            />
            <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
              查询
            </Button>
            <Button icon={<ReloadOutlined />} onClick={handleReset}>
              重置
            </Button>
            <Button icon={<DownloadOutlined />} loading={exporting} onClick={handleExport}>
              导出Excel
            </Button>
          </Space>
        }
      >
        <Table<QualityControlRecord>
          rowKey={(record) => record.id}
          dataSource={records}
          columns={columns}
          loading={tableLoading}
          pagination={pagination}
          onChange={handleTableChange}
          scroll={{ x: 1400 }}
        />
      </Card>
    </Space>
  );
};

export default QualityControlManagement;
