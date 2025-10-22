import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ColumnsType } from 'antd/es/table';
import type { RangeValue } from 'rc-picker/lib/interface';
import type { Dayjs } from 'dayjs';
import {
  Button,
  Card,
  DatePicker,
  Form,
  message,
  Select,
  Space,
  Table,
  Typography,
} from 'antd';
import { DownloadOutlined, SearchOutlined } from '@ant-design/icons';
import MonthlyDualAxisChart from '../components/charts/MonthlyDualAxisChart';
import type {
  FactoryBusinessDetailAggregation,
  FactoryBusinessDetailListResponse,
  FactoryBusinessDetailMeta,
  FactoryBusinessDetailRecord,
} from '../types/settlement-report-factory-details';
import { factoryBusinessDetailReportService } from '../api/mock';

const { RangePicker } = DatePicker;
const { Link, Text } = Typography;

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 20, 50];

const currencyFormatter = new Intl.NumberFormat('zh-CN', {
  style: 'currency',
  currency: 'CNY',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

type FilterState = {
  factoryIds?: string[];
  startDate?: string;
  endDate?: string;
};

const SettlementReportFactoryDetails = () => {
  const [meta, setMeta] = useState<FactoryBusinessDetailMeta | null>(null);
  const [metaLoading, setMetaLoading] = useState(false);

  const [aggregation, setAggregation] = useState<FactoryBusinessDetailAggregation>({ trend: [] });
  const [aggregationLoading, setAggregationLoading] = useState(false);

  const [records, setRecords] = useState<FactoryBusinessDetailRecord[]>([]);
  const [summary, setSummary] = useState<FactoryBusinessDetailListResponse['summary']>({
    totalPayable: 0,
    totalPaid: 0,
  });
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [tableLoading, setTableLoading] = useState(false);

  const [factoryIds, setFactoryIds] = useState<string[] | undefined>(undefined);
  const [dateRange, setDateRange] = useState<RangeValue<Dayjs>>(null);
  const [appliedFilters, setAppliedFilters] = useState<FilterState>({});

  const loadMeta = useCallback(async () => {
    setMetaLoading(true);
    try {
      const response = await factoryBusinessDetailReportService.getMeta();
      setMeta(response);
    } catch (error) {
      console.error('failed to load factory detail report meta', error);
      message.error('加载加工厂列表失败');
    } finally {
      setMetaLoading(false);
    }
  }, []);

  const loadAggregation = useCallback(async () => {
    setAggregationLoading(true);
    try {
      const response = await factoryBusinessDetailReportService.getOverview({
        page: 1,
        pageSize: 1000,
        ...appliedFilters,
      });
      setAggregation(response);
    } catch (error) {
      console.error('failed to load factory detail trend', error);
      message.error('加载趋势图失败');
    } finally {
      setAggregationLoading(false);
    }
  }, [appliedFilters]);

  const loadList = useCallback(async () => {
    setTableLoading(true);
    try {
      const response = await factoryBusinessDetailReportService.getList({
        page,
        pageSize,
        ...appliedFilters,
      });
      setRecords(response.list);
      setTotal(response.total);
      setSummary(response.summary);
    } catch (error) {
      console.error('failed to load factory detail list', error);
      message.error('获取加工厂业务明细表失败');
    } finally {
      setTableLoading(false);
    }
  }, [appliedFilters, page, pageSize]);

  useEffect(() => {
    void loadMeta();
  }, [loadMeta]);

  useEffect(() => {
    void loadAggregation();
  }, [loadAggregation]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const buildFilters = (): FilterState => {
    const [start, end] = dateRange ?? [];
    return {
      factoryIds: factoryIds && factoryIds.length ? factoryIds : undefined,
      startDate: start?.format('YYYY-MM-DD'),
      endDate: end?.format('YYYY-MM-DD'),
    };
  };

  const handleQuery = () => {
    setAppliedFilters(buildFilters());
    setPage(1);
  };

  const handleReset = () => {
    setFactoryIds(undefined);
    setDateRange(null);
    setAppliedFilters({});
    setPage(1);
    setPageSize(DEFAULT_PAGE_SIZE);
  };

  const handleTableChange = (nextPage: number, nextPageSize?: number) => {
    if (nextPageSize && nextPageSize !== pageSize) {
      setPageSize(nextPageSize);
      setPage(1);
      return;
    }
    setPage(nextPage);
  };

  const handleExport = async () => {
    try {
      const result = await factoryBusinessDetailReportService.export({
        page,
        pageSize,
        ...appliedFilters,
      });
      message.success('已生成导出任务，请稍后到下载中心查看');
      console.info('mock export url', result.fileUrl);
    } catch (error) {
      console.error('failed to export factory detail report', error);
      message.error('导出失败，请稍后重试');
    }
  };

  const columnData = useMemo(
    () => aggregation.trend.map((item) => ({ month: item.month, value: item.payable })),
    [aggregation.trend],
  );
  const lineData = useMemo(
    () => aggregation.trend.map((item) => ({ month: item.month, value: item.paid })),
    [aggregation.trend],
  );

  const tableColumns: ColumnsType<FactoryBusinessDetailRecord> = useMemo(() => [
    {
      title: '加工厂',
      dataIndex: 'factoryName',
      width: 220,
      ellipsis: true,
    },
    {
      title: '业务日期',
      dataIndex: 'businessDate',
      width: 140,
    },
    {
      title: '单据类型',
      dataIndex: 'documentType',
      width: 140,
    },
    {
      title: '单据号',
      dataIndex: 'documentNo',
      width: 200,
      render: (value: string) => <Link>{value}</Link>,
    },
    {
      title: '应付',
      dataIndex: 'payable',
      align: 'right',
      width: 140,
      render: (value: number) => currencyFormatter.format(value ?? 0),
    },
    {
      title: '已付',
      dataIndex: 'paid',
      align: 'right',
      width: 140,
      render: (value: number) => currencyFormatter.format(value ?? 0),
    },
    {
      title: '出纳账户',
      dataIndex: 'cashierAccount',
      ellipsis: true,
      width: 180,
      render: (value?: string) => value ?? '-',
    },
  ], []);

  const factoryOptions = meta?.factories ?? [];

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card bordered={false} loading={metaLoading || aggregationLoading} title="应付已付趋势图 (年)">
        <MonthlyDualAxisChart
          columnData={columnData}
          lineData={lineData}
          columnLabel="应付金额"
          lineLabel="已付金额"
          columnFormatter={(value) => currencyFormatter.format(value)}
          lineFormatter={(value) => currencyFormatter.format(value)}
        />
      </Card>
      <Card bordered={false}>
        <Form layout="inline" style={{ marginBottom: 16 }}>
          <Form.Item label="加工厂" style={{ minWidth: 320 }}>
            <Select
              mode="multiple"
              allowClear
              placeholder="请选择加工厂"
              options={factoryOptions}
              value={factoryIds}
              onChange={(value) => setFactoryIds(value.length ? value : undefined)}
              showSearch
              optionFilterProp="label"
              maxTagCount="responsive"
            />
          </Form.Item>
          <Form.Item label="日期范围" style={{ minWidth: 320 }}>
            <RangePicker value={dateRange} onChange={setDateRange} allowEmpty={[true, true]} />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" icon={<SearchOutlined />} onClick={handleQuery}>
                查询
              </Button>
              <Button onClick={handleReset}>重置</Button>
              <Button icon={<DownloadOutlined />} onClick={handleExport}>
                导出Excel
              </Button>
            </Space>
          </Form.Item>
        </Form>
        <Table<FactoryBusinessDetailRecord>
          rowKey="id"
          loading={tableLoading}
          columns={tableColumns}
          dataSource={records}
          pagination={{
            current: page,
            pageSize,
            total,
            showTotal: (value) => `共 ${value} 条，应付合计 ${currencyFormatter.format(summary.totalPayable)}，已付合计 ${currencyFormatter.format(summary.totalPaid)}`,
            showSizeChanger: true,
            pageSizeOptions: PAGE_SIZE_OPTIONS.map(String),
            onChange: handleTableChange,
          }}
          scroll={{ x: 960 }}
          summary={() => (
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={4}>
                <Text strong>汇总</Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={4} align="right">
                <Text strong>{currencyFormatter.format(summary.totalPayable)}</Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={5} align="right">
                <Text strong>{currencyFormatter.format(summary.totalPaid)}</Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={6}>
                <Text type="secondary">共 {total} 条</Text>
              </Table.Summary.Cell>
            </Table.Summary.Row>
          )}
        />
      </Card>
    </Space>
  );
};

export default SettlementReportFactoryDetails;
