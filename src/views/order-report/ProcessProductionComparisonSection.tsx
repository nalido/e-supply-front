import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ColumnsType } from 'antd/es/table';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import {
  Button,
  Card,
  DatePicker,
  Empty,
  Input,
  Progress,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { pieceworkService } from '../../api/piecework';
import type {
  ProcessProductionListParams,
  ProcessProductionRecord,
} from '../../types/process-production-comparison-report';

const { RangePicker } = DatePicker;
const { Text } = Typography;

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = ['10', '20', '50'];

const STAGE_LABELS: Record<string, string> = {
  cutting: '裁剪',
  sewing: '车缝',
  finishing: '后整',
  packaging: '包装',
  warehousing: '入库',
};

const numberFormatter = new Intl.NumberFormat('zh-CN');

const formatQuantity = (value?: number) => numberFormatter.format(Math.round(value ?? 0));

const buildParams = (
  filters: { keyword?: string; start?: string; end?: string },
  page: number,
  pageSize: number,
): ProcessProductionListParams => ({
  page: page - 1,
  pageSize,
  keyword: filters.keyword,
  startDate: filters.start,
  endDate: filters.end,
});

const ProcessProductionComparisonSection = () => {
  const [records, setRecords] = useState<ProcessProductionRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [inventoryQuantity, setInventoryQuantity] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [keyword, setKeyword] = useState('');
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([null, null]);
  const [appliedFilters, setAppliedFilters] = useState<{ keyword?: string; start?: string; end?: string }>({});
  const [loading, setLoading] = useState(false);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const response = await pieceworkService.getProcessComparison(
        buildParams(appliedFilters, page, pageSize),
      );
      setRecords(response.list ?? []);
      setTotal(response.total ?? 0);
      setInventoryQuantity(response.inventoryQuantity ?? 0);
    } catch (error) {
      console.error('failed to load process comparison report', error);
      message.error('获取工序对照报表失败');
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
      start: dateRange[0]?.format('YYYY-MM-DD'),
      end: dateRange[1]?.format('YYYY-MM-DD'),
    });
    setPage(1);
  };

  const handleReset = () => {
    setKeyword('');
    setDateRange([null, null]);
    setAppliedFilters({});
    setPage(1);
    setPageSize(DEFAULT_PAGE_SIZE);
  };

  const stageKeys = useMemo(() => {
    const keys = new Set<string>();
    records.forEach((record) => {
      record.stages?.forEach((stage) => keys.add(stage.key));
    });
    return Array.from(keys);
  }, [records]);

  const columns = useMemo<ColumnsType<ProcessProductionRecord>>(() => {
    const base: ColumnsType<ProcessProductionRecord> = [
      {
        title: '订单编号',
        dataIndex: 'orderNumber',
        fixed: 'left',
        width: 160,
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
        title: '下单数量',
        dataIndex: 'orderQuantity',
        width: 120,
        align: 'right',
        render: (value: number) => (
          <Space size={4}>
            <Text>{formatQuantity(value)}</Text>
            <Tag color="blue">件</Tag>
          </Space>
        ),
      },
    ];
    const dynamic: ColumnsType<ProcessProductionRecord> = stageKeys.map((key) => ({
      title: STAGE_LABELS[key] ?? key,
      dataIndex: key,
      width: 160,
      render: (_: unknown, record) => {
        const stage = record.stages?.find((item) => item.key === key);
        if (!stage) {
          return <Text type="secondary">-</Text>;
        }
        const percent = record.orderQuantity
          ? Math.min(100, Math.round((stage.completed / record.orderQuantity) * 100))
          : 0;
        return (
          <Space direction="vertical" size={0}>
            <Text strong>{formatQuantity(stage.completed)} 件</Text>
            <Progress percent={percent} size="small" showInfo={false} />
          </Space>
        );
      },
    }));
    return [...base, ...dynamic];
  }, [stageKeys]);

  return (
    <Card title="工序生产对照表">
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Card variant="borderless">
          <Space size={24} wrap>
            <Space direction="vertical" size={0}>
              <Text type="secondary">在制品库存</Text>
              <Text strong style={{ fontSize: 20 }}>{formatQuantity(inventoryQuantity)} 件</Text>
            </Space>
            <Space direction="vertical" size={0}>
              <Text type="secondary">记录数</Text>
              <Text strong style={{ fontSize: 20 }}>{formatQuantity(total)} 条</Text>
            </Space>
          </Space>
        </Card>

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
          <Space>
            <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
              筛选
            </Button>
            <Button icon={<ReloadOutlined />} onClick={handleReset}>
              重置
            </Button>
          </Space>
        </Space>

        {records.length === 0 ? (
          <Card variant="borderless">
            {loading ? <Empty description="正在加载" /> : <Empty description="暂无数据" />}
          </Card>
        ) : (
          <Table<ProcessProductionRecord>
            rowKey={(record) => `${record.orderNumber}-${record.styleNumber}`}
            columns={columns}
            dataSource={records}
            loading={loading}
            bordered
            scroll={{ x: 1200 }}
            pagination={{
              current: page,
              pageSize,
              total,
              showSizeChanger: true,
              pageSizeOptions: PAGE_SIZE_OPTIONS,
              onChange: (nextPage, nextSize) => {
                setPage(nextPage);
                if (nextSize && nextSize !== pageSize) {
                  setPageSize(nextSize);
                }
              },
              showTotal: (value, range) => `${range[0]}-${range[1]} / 共 ${value} 条`,
            }}
          />
        )}
      </Space>
    </Card>
  );
};

export default ProcessProductionComparisonSection;
