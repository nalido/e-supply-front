import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  Input,
  Space,
  Table,
  Typography,
  message,
} from 'antd';
import type { ColumnsType, TableProps } from 'antd/es/table';
import { DownloadOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import MonthlyAreaChart from '../components/charts/MonthlyAreaChart';
import DonutChart from '../components/charts/DonutChart';
import { sampleOrderComparisonReportService } from '../api/mock';
import type {
  SampleOrderAggregation,
  SampleOrderComparisonItem,
  SampleOrderComparisonParams,
} from '../types/sample-order-comparison-report';

const { Text } = Typography;

const DEFAULT_PAGE_SIZE = 10;

const lineColorMap: Record<string, string> = {
  打版数量: '#3b82f6',
  打版款数: '#22c55e',
};

const lineGradientMap: Record<string, string> = {
  打版数量: 'l(90) 0:#bfdbfe 0.3:#60a5fa 1:#ffffff',
  打版款数: 'l(90) 0:#bbf7d0 0.3:#4ade80 1:#ffffff',
};

const pieColorStops: Record<string, [string, string]> = {
  纸样师: ['#6366f1', '#4338ca'],
  车板师: ['#f97316', '#ea580c'],
};

const SampleOrderComparisonReport = () => {
  const [aggregation, setAggregation] = useState<SampleOrderAggregation | null>(null);
  const [records, setRecords] = useState<SampleOrderComparisonItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [loadingCharts, setLoadingCharts] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [sortBy, setSortBy] = useState<SampleOrderComparisonParams['sortBy']>();
  const [order, setOrder] = useState<SampleOrderComparisonParams['order']>('desc');

  useEffect(() => {
    const loadAggregation = async () => {
      setLoadingCharts(true);
      try {
        const response = await sampleOrderComparisonReportService.getAggregation();
        setAggregation(response);
      } catch (error) {
        console.error('failed to load sample order aggregation', error);
        message.error('加载打板统计失败');
      } finally {
        setLoadingCharts(false);
      }
    };

    void loadAggregation();
  }, []);

  const loadList = useCallback(async () => {
    setTableLoading(true);
    try {
      const params: SampleOrderComparisonParams = {
        page,
        pageSize,
        styleName: keyword.trim() || undefined,
        sortBy,
        order,
      };
      const response = await sampleOrderComparisonReportService.getList(params);
      setRecords(response.list);
      setTotal(response.total);
    } catch (error) {
      console.error('failed to load sample order comparison list', error);
      message.error('获取打板对照列表失败');
    } finally {
      setTableLoading(false);
    }
  }, [keyword, order, page, pageSize, sortBy]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const trendDataset = useMemo(() => {
    if (!aggregation) {
      return [];
    }
    const { labels, sampleQuantity, styleCount } = aggregation.trend;
    return labels.flatMap((label, index) => [
      { month: label, count: sampleQuantity[index] ?? 0, type: '打版数量' },
      { month: label, count: styleCount[index] ?? 0, type: '打版款数' },
    ]);
  }, [aggregation]);

  const pieDataset = useMemo(() => {
    if (!aggregation) {
      return { data: [], total: 0 };
    }
    return {
      data: aggregation.proportion.roles.map((role) => ({
        name: role.name,
        value: role.value,
        colorStops: pieColorStops[role.name] ?? ['#cbd5f5', '#6366f1'],
      })),
      total: aggregation.proportion.total,
    };
  }, [aggregation]);

  const handleSearch = () => {
    setPage(1);
  };

  const handleReset = () => {
    setKeyword('');
    setSortBy(undefined);
    setOrder('desc');
    setPage(1);
    setPageSize(DEFAULT_PAGE_SIZE);
  };

  const handleExport = async () => {
    try {
      const params: SampleOrderComparisonParams = {
        page: 1,
        pageSize: total || records.length || DEFAULT_PAGE_SIZE,
        styleName: keyword.trim() || undefined,
        sortBy,
        order,
      };
      const result = await sampleOrderComparisonReportService.export(params);
      message.success('导出任务已生成，请稍后在下载中心查看');
      console.info('mock export url', result.fileUrl);
    } catch (error) {
      console.error('failed to export sample order comparison', error);
      message.error('导出失败，请稍后重试');
    }
  };

  const handleTableChange: TableProps<SampleOrderComparisonItem>['onChange'] = (paginationConfig, _filters, sorter) => {
    if (paginationConfig) {
      const nextPage = paginationConfig.current ?? 1;
      const nextSize = paginationConfig.pageSize ?? pageSize;
      if (nextSize !== pageSize) {
        setPageSize(nextSize);
        setPage(1);
      } else if (nextPage !== page) {
        setPage(nextPage);
      }
    }

    if (!Array.isArray(sorter)) {
      const sortField = sorter.field as SampleOrderComparisonParams['sortBy'];
      const sortOrder = sorter.order === 'ascend' ? 'asc' : sorter.order === 'descend' ? 'desc' : undefined;
      setSortBy(sortField);
      if (sortOrder) {
        setOrder(sortOrder);
      }
    }
  };

  const columns: ColumnsType<SampleOrderComparisonItem> = [
    {
      title: '图片',
      dataIndex: 'imageUrl',
      key: 'imageUrl',
      width: 80,
      render: (value?: string) => (
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 8,
            background: '#f5f5f5',
            backgroundImage: value ? `url(${value})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
      ),
    },
    {
      title: '款号',
      dataIndex: 'styleNumber',
      key: 'styleNumber',
      width: 140,
      render: (value: string) => <Text strong>{value}</Text>,
    },
    {
      title: '款名',
      dataIndex: 'styleName',
      key: 'styleName',
      ellipsis: true,
    },
    {
      title: '打板次数',
      dataIndex: 'sampledTimes',
      key: 'sampledTimes',
      align: 'right',
      sorter: true,
    },
    {
      title: '打板数量',
      dataIndex: 'sampledQuantity',
      key: 'sampledQuantity',
      align: 'right',
      sorter: true,
    },
    {
      title: '下单次数',
      dataIndex: 'orderedTimes',
      key: 'orderedTimes',
      align: 'right',
      sorter: true,
    },
    {
      title: '下单数量',
      dataIndex: 'orderedQuantity',
      key: 'orderedQuantity',
      align: 'right',
      sorter: true,
    },
  ];

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card bordered={false} loading={loadingCharts}>
        {aggregation ? (
          <Space direction="vertical" size={24} style={{ width: '100%' }}>
            <MonthlyAreaChart
              data={trendDataset}
              getColor={(type) => lineColorMap[type] ?? '#22d3ee'}
              getGradient={(type) => lineGradientMap[type] ?? 'l(90) 0:#bae6fd 1:#ffffff'}
              valueFormatter={(value) => `${Math.round(value)} 件`}
              tooltipValueFormatter={(value) => `${Math.round(value)} 件`}
              seriesLabelFormatter={(type) => type}
              xLabelFormatter={(label) => {
                if (!label.includes('-')) return label;
                const [, month] = label.split('-');
                return `${Number(month)}月`;
              }}
            />
            <div style={{ width: 320 }}>
              <DonutChart
                data={pieDataset.data}
                total={pieDataset.total}
                centerTitle="半年合计"
                totalFormatter={(value) => `${value} 次`}
                valueFormatter={(slice) => `${slice.value} 次`}
              />
            </div>
          </Space>
        ) : null}
      </Card>

      <Card
        bordered={false}
        title="打板下单对照表"
        extra={
          <Space size={8} wrap>
            <Input
              allowClear
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="请输入款名"
              prefix={<SearchOutlined />}
              style={{ width: 240 }}
              onPressEnter={handleSearch}
            />
            <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
              查询
            </Button>
            <Button icon={<ReloadOutlined />} onClick={handleReset}>
              重置
            </Button>
            <Button icon={<DownloadOutlined />} onClick={handleExport}>
              导出Excel
            </Button>
          </Space>
        }
      >
        <Table<SampleOrderComparisonItem>
          rowKey={(record) => record.id}
          dataSource={records}
          columns={columns}
          loading={tableLoading}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            pageSizeOptions: PAGE_SIZE_OPTIONS,
            showTotal: (value: number) => `共 ${value} 条`,
          }}
          onChange={handleTableChange}
          scroll={{ x: 960 }}
        />
      </Card>
    </Space>
  );
};

const PAGE_SIZE_OPTIONS = ['10', '20', '50'];

export default SampleOrderComparisonReport;
