import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Dayjs } from 'dayjs';
import {
  Button,
  Card,
  DatePicker,
  Input,
  List,
  Pagination,
  Space,
  Typography,
  message,
} from 'antd';
import { DownloadOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import MonthlyAreaChart from '../components/charts/MonthlyAreaChart';
import DonutChart from '../components/charts/DonutChart';
import { sampleCostingReportService } from '../api/mock';
import type {
  SampleCostAggregation,
  SampleCostCard,
  SampleCostListParams,
} from '../types/sample-costing-report';

const { RangePicker } = DatePicker;
const { Text, Title } = Typography;

const DEFAULT_PAGE_SIZE = 6;

const currencyFormatter = new Intl.NumberFormat('zh-CN', {
  style: 'currency',
  currency: 'CNY',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const formatCurrency = (value: number) => currencyFormatter.format(value ?? 0);

const costColorMap: Record<string, string> = {
  开发费用: '#22c55e',
  样板成本: '#3b82f6',
};

const costGradientMap: Record<string, string> = {
  开发费用: 'l(90) 0:#b9f2c4 0.3:#69d98d 1:#ffffff',
  样板成本: 'l(90) 0:#c2d8ff 0.3:#5c8bff 1:#ffffff',
};

const pieColorStops: Record<string, [string, string]> = {
  头样: ['#93c5fd', '#2563eb'],
  复样: ['#fda4af', '#f43f5e'],
  产前样: ['#facc15', '#eab308'],
  对色样: ['#a5b4fc', '#6366f1'],
};

type AppliedFilters = Pick<SampleCostListParams, 'keyword' | 'startDate' | 'endDate'>;

const SampleCostingReport = () => {
  const [aggregation, setAggregation] = useState<SampleCostAggregation | null>(null);
  const [cards, setCards] = useState<SampleCostCard[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [loadingCharts, setLoadingCharts] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([null, null]);
  const [appliedFilters, setAppliedFilters] = useState<AppliedFilters>({});
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const loadAggregation = async () => {
      setLoadingCharts(true);
      try {
        const response = await sampleCostingReportService.getAggregation();
        setAggregation(response);
      } catch (error) {
        console.error('failed to load sample costing aggregation', error);
        message.error('加载成本趋势失败');
      } finally {
        setLoadingCharts(false);
      }
    };

    void loadAggregation();
  }, []);

  const loadList = useCallback(async () => {
    setListLoading(true);
    try {
      const params: SampleCostListParams = {
        page,
        pageSize,
        keyword: appliedFilters.keyword,
        startDate: appliedFilters.startDate,
        endDate: appliedFilters.endDate,
      };
      const response = await sampleCostingReportService.getList(params);
      setCards(response.list);
      setTotal(response.total);
    } catch (error) {
      console.error('failed to load sample costing list', error);
      message.error('获取成本核价列表失败');
    } finally {
      setListLoading(false);
    }
  }, [appliedFilters, page, pageSize]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const handleSearch = () => {
    const [start, end] = dateRange;
    setAppliedFilters({
      keyword: keyword.trim() || undefined,
      startDate: start ? start.format('YYYY-MM-DD') : undefined,
      endDate: end ? end.format('YYYY-MM-DD') : undefined,
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

  const trendDataset = useMemo(() => {
    if (!aggregation) {
      return [];
    }
    const { labels, developmentCost, sampleCost } = aggregation.trend;
    return labels.flatMap((label, index) => [
      { month: label, count: sampleCost[index] ?? 0, type: '样板成本' },
      { month: label, count: developmentCost[index] ?? 0, type: '开发费用' },
    ]);
  }, [aggregation]);

  const pieDataset = useMemo(() => {
    if (!aggregation) {
      return { data: [], total: 0 };
    }
    return {
      data: aggregation.typeComparison.types.map((slice) => ({
        name: slice.name,
        value: slice.value,
        colorStops: pieColorStops[slice.name] ?? ['#cbd5f5', '#4c51bf'],
      })),
      total: aggregation.typeComparison.total,
    };
  }, [aggregation]);

  const pagination = useMemo(
    () => ({
      current: page,
      pageSize,
      total,
      showSizeChanger: true,
      pageSizeOptions: ['6', '8', '12'],
      showTotal: (value: number) => `共 ${value} 条`,
      onChange: (nextPage: number, nextSize?: number) => {
        setPage(nextPage);
        if (nextSize && nextSize !== pageSize) {
          setPageSize(nextSize);
        }
      },
    }),
    [page, pageSize, total],
  );

  const handleExport = async () => {
    setExporting(true);
    try {
      const params: SampleCostListParams = {
        page: 1,
        pageSize: total || cards.length || DEFAULT_PAGE_SIZE,
        keyword: appliedFilters.keyword,
        startDate: appliedFilters.startDate,
        endDate: appliedFilters.endDate,
      };
      const result = await sampleCostingReportService.export(params);
      message.success('导出任务已生成，请稍后在下载中心查看');
      console.info('mock export url', result.fileUrl);
    } catch (error) {
      console.error('failed to export sample cost list', error);
      message.error('导出失败，请稍后重试');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card bordered={false} loading={loadingCharts}>
        {aggregation ? (
          <Space style={{ width: '100%' }} size={24} direction="vertical">
            <Title level={5} style={{ margin: 0 }}>
              成本走势（半年）
            </Title>
            <MonthlyAreaChart
              data={trendDataset}
              getColor={(type) => costColorMap[type] ?? '#38bdf8'}
              getGradient={(type) => costGradientMap[type] ?? 'l(90) 0:#bae6fd 1:#ffffff'}
              valueFormatter={(value) => formatCurrency(value)}
              tooltipValueFormatter={(value) => formatCurrency(value)}
              xLabelFormatter={(label) => {
                if (!label.includes('-')) return label;
                const [, month] = label.split('-');
                return `${Number(month)}月`;
              }}
              seriesLabelFormatter={(type) => type}
            />
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              <div style={{ flex: '0 0 320px' }}>
                <Title level={5} style={{ marginTop: 0 }}>
                  板类对比（半年）
                </Title>
                <DonutChart
                  data={pieDataset.data}
                  total={pieDataset.total}
                  centerTitle="总计板数"
                  totalFormatter={(value) => `${value} 款`}
                  valueFormatter={(slice) => `${slice.value} 款`}
                />
              </div>
            </div>
          </Space>
        ) : null}
      </Card>

      <Card
        bordered={false}
        title="成本核价列表"
        extra={
          <Space size={8} wrap>
            <Input
              allowClear
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="请输入订单号/款号/款名"
              prefix={<SearchOutlined />}
              style={{ width: 260 }}
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
              style={{ width: 280 }}
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
        <List
          loading={listLoading}
          grid={{ gutter: 16, column: 3 }}
          dataSource={cards}
          renderItem={(item) => (
            <List.Item>
              <Card hoverable>
                <Space direction="vertical" size={12} style={{ width: '100%' }}>
                  <Space size={16}
                    style={{ width: '100%' }}
                  >
                    <div
                      style={{
                        width: 72,
                        height: 72,
                        background: '#f5f5f5',
                        borderRadius: 8,
                        flexShrink: 0,
                        backgroundImage: item.imageUrl ? `url(${item.imageUrl})` : undefined,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                      }}
                    />
                    <Space direction="vertical" size={4} style={{ flex: 1 }}>
                      <Text strong>{item.styleNumber}</Text>
                      <Text type="secondary" ellipsis style={{ width: '100%' }}>
                        {item.styleName}
                      </Text>
                      <Text type="secondary">样板单号：{item.sampleOrderNo}</Text>
                      <Text type="secondary">下板日期：{item.completionDate}</Text>
                    </Space>
                  </Space>
                  <Space size={24} wrap>
                    <Text type="secondary">
                      单件成本：<Text strong>{formatCurrency(item.unitCost)}</Text>
                    </Text>
                    <Text type="secondary">
                      开发费用：<Text strong>{formatCurrency(item.developmentCost)}</Text>
                    </Text>
                    <Text type="secondary">
                      数量：<Text strong>{item.quantity}</Text>
                    </Text>
                  </Space>
                  <Space direction="vertical" size={8}>
                    <Title level={5} style={{ margin: 0 }}>
                      成本明细
                    </Title>
                    {item.costBreakdown.map((cost) => (
                      <Space key={cost.item} style={{ width: '100%', justifyContent: 'space-between' }}>
                        <Text>{cost.item}</Text>
                        <Text strong>{formatCurrency(cost.cost)}</Text>
                      </Space>
                    ))}
                  </Space>
                </Space>
              </Card>
            </List.Item>
          )}
        />
        <Pagination
          style={{ marginTop: 16, textAlign: 'right' }}
          {...pagination}
        />
      </Card>
    </Space>
  );
};

export default SampleCostingReport;
