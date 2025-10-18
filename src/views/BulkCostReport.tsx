import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react';
import {
  Button,
  Card,
  Col,
  DatePicker,
  Empty,
  Input,
  Pagination,
  Row,
  Select,
  Skeleton,
  Space,
  Tag,
  Typography,
  message,
} from 'antd';
import type { Dayjs } from 'dayjs';
import type { RangeValue } from 'rc-picker/lib/interface';
import { DownloadOutlined, SearchOutlined } from '@ant-design/icons';
import MonthlyAreaChart from '../components/charts/MonthlyAreaChart';
import DonutChart from '../components/charts/DonutChart';
import { bulkCostReportService } from '../api/mock';
import type { BulkCostAggregation, BulkCostOrderItem } from '../types/bulk-cost-report';
import '../styles/bulk-cost-report.css';

const { RangePicker } = DatePicker;
const { Text } = Typography;

const DEFAULT_PAGE_SIZE = 4;

const STATUS_COLOR_MAP: Record<string, string> = {
  已完成: 'green',
  生产中: 'blue',
  待核算: 'orange',
  待审核: 'gold',
};

const COST_LABELS: Record<string, string> = {
  total: '总成本',
  unit: '单件成本',
  fabric: '面料',
  accessories: '辅料/包材',
  sewing: '车缝',
  finishing: '后整',
  inspection: '品检',
  washing: '水洗',
  packaging: '包装',
  printing: '印花',
  embroidery: '刺绣',
  downFilling: '填充',
  seamSealing: '压胶',
};

const COST_ROW_ORDER = [
  'total',
  'unit',
  'fabric',
  'accessories',
  'sewing',
  'printing',
  'embroidery',
  'washing',
  'finishing',
  'packaging',
  'inspection',
  'downFilling',
  'seamSealing',
];

const COST_SERIES_COLORS: Record<string, string> = {
  生产成本: '#3056FF',
  采购成本: '#27B69B',
};

const COST_SERIES_GRADIENTS: Record<string, string> = {
  生产成本: 'l(90) 0:rgba(48,86,255,0.32) 0.3:rgba(48,86,255,0.24) 1:rgba(48,86,255,0)',
  采购成本: 'l(90) 0:rgba(39,182,155,0.32) 0.3:rgba(39,182,155,0.24) 1:rgba(39,182,155,0)',
};

const PIE_GRADIENTS: [string, string][] = [
  ['#3056FF', '#648FFF'],
  ['#27B69B', '#5FD5BE'],
  ['#F59E0B', '#F7B84B'],
  ['#F87171', '#FB9CA7'],
  ['#8B5CF6', '#B197FC'],
  ['#0EA5E9', '#4DC3F7'],
];

const CURRENCY_FORMATTER = new Intl.NumberFormat('zh-CN', {
  style: 'currency',
  currency: 'CNY',
  minimumFractionDigits: 2,
});

const NUMBER_FORMATTER = new Intl.NumberFormat('zh-CN');

const formatCurrency = (value: number): string => CURRENCY_FORMATTER.format(value ?? 0);

const formatAxisAmount = (value: number): string => {
  if (!Number.isFinite(value)) {
    return '¥0';
  }
  if (Math.abs(value) >= 10000) {
    return `¥${(value / 10000).toFixed(1)}万`;
  }
  return `¥${Number(Math.round(value)).toLocaleString('zh-CN')}`;
};

const formatQuantity = (value: number): string => NUMBER_FORMATTER.format(Math.round(value ?? 0));

const toRangeStrings = (range: RangeValue<Dayjs>) => {
  if (!range || !range[0] || !range[1]) {
    return undefined;
  }
  return {
    start: range[0].format('YYYY-MM-DD'),
    end: range[1].format('YYYY-MM-DD'),
  } as const;
};

const getStatusColor = (status: string): string => STATUS_COLOR_MAP[status] ?? 'default';

const renderUnitValue = (value: number): string => `${value.toFixed(2)} 元/件`;

const buildCostKeys = (order: BulkCostOrderItem): string[] => {
  const costKeys = Object.keys(order.costs ?? {});
  const originalKeys = [...costKeys];
  return costKeys.sort((a, b) => {
    const aIndex = COST_ROW_ORDER.indexOf(a);
    const bIndex = COST_ROW_ORDER.indexOf(b);
    const safeA = aIndex === -1 ? COST_ROW_ORDER.length + originalKeys.indexOf(a) : aIndex;
    const safeB = bIndex === -1 ? COST_ROW_ORDER.length + originalKeys.indexOf(b) : bIndex;
    return safeA - safeB;
  });
};

const buildLineDataset = (aggregation: BulkCostAggregation | null) => {
  if (!aggregation) {
    return [];
  }
  const { labels, productionCost, procurementCost } = aggregation.costTrend;
  return labels.flatMap((label, index) => [
    {
      month: label,
      type: '生产成本',
      count: productionCost[index] ?? 0,
    },
    {
      month: label,
      type: '采购成本',
      count: procurementCost[index] ?? 0,
    },
  ]);
};

const buildPieSlices = (aggregation: BulkCostAggregation | null) => {
  if (!aggregation) {
    return [];
  }
  return aggregation.customerProportion.customers.map((customer, index) => ({
    name: customer.name,
    value: customer.value,
    colorStops: PIE_GRADIENTS[index % PIE_GRADIENTS.length],
  }));
};

const BulkCostReport = () => {
  const [aggregation, setAggregation] = useState<BulkCostAggregation | null>(null);
  const [aggregationLoading, setAggregationLoading] = useState<boolean>(false);
  const [orders, setOrders] = useState<BulkCostOrderItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [listLoading, setListLoading] = useState<boolean>(false);
  const [keyword, setKeyword] = useState<string>('');
  const [orderDateRange, setOrderDateRange] = useState<RangeValue<Dayjs>>(null);
  const [receiptDateRange, setReceiptDateRange] = useState<RangeValue<Dayjs>>(null);
  const [customerId, setCustomerId] = useState<string | undefined>();
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const [customerOptions, setCustomerOptions] = useState<Array<{ label: string; value: string }>>([]);

  const lineDataset = useMemo(() => buildLineDataset(aggregation), [aggregation]);
  const pieSlices = useMemo(() => buildPieSlices(aggregation), [aggregation]);
  const pieTotal = aggregation?.customerProportion.total ?? 0;

  const getLineColor = useCallback(
    (series: string) => COST_SERIES_COLORS[series] ?? COST_SERIES_COLORS['生产成本'],
    [],
  );

  const getLineGradient = useCallback(
    (series: string) => COST_SERIES_GRADIENTS[series] ?? COST_SERIES_GRADIENTS['生产成本'],
    [],
  );

  const buildListParams = useCallback(() => {
    const params = {
      page,
      pageSize,
    } as const;

    const requestParams: {
      page: number;
      pageSize: number;
      keyword?: string;
      customerId?: string;
      orderStartDate?: string;
      orderEndDate?: string;
      receiptStartDate?: string;
      receiptEndDate?: string;
    } = { ...params };

    const normalizedKeyword = keyword.trim();
    if (normalizedKeyword) {
      requestParams.keyword = normalizedKeyword;
    }
    if (customerId) {
      requestParams.customerId = customerId;
    }

    const orderRange = toRangeStrings(orderDateRange);
    if (orderRange) {
      requestParams.orderStartDate = orderRange.start;
      requestParams.orderEndDate = orderRange.end;
    }

    const receiptRange = toRangeStrings(receiptDateRange);
    if (receiptRange) {
      requestParams.receiptStartDate = receiptRange.start;
      requestParams.receiptEndDate = receiptRange.end;
    }

    return requestParams;
  }, [page, pageSize, keyword, customerId, orderDateRange, receiptDateRange]);

  const mergeCustomerOptions = useCallback((items: Array<{ label: string; value: string }>) => {
    setCustomerOptions((prev) => {
      const map = new Map<string, { label: string; value: string }>();
      prev.forEach((item) => {
        map.set(item.value, item);
      });
      items.forEach((item) => {
        map.set(item.value, item);
      });
      return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label, 'zh-CN'));
    });
  }, []);

  const loadAggregation = useCallback(async () => {
    setAggregationLoading(true);
    try {
      const data = await bulkCostReportService.getAggregation();
      setAggregation(data);
      const options = data.customerProportion.customers.map((customer) => ({
        label: customer.name,
        value: customer.id,
      }));
      mergeCustomerOptions(options);
    } catch (error) {
      console.error('Failed to load bulk cost aggregation', error);
      message.error('获取成本概览数据失败');
    } finally {
      setAggregationLoading(false);
    }
  }, [mergeCustomerOptions]);

  const loadOrders = useCallback(async () => {
    setListLoading(true);
    try {
      const params = buildListParams();
      const response = await bulkCostReportService.getList(params);
      setOrders(response.list);
      setTotal(response.total);
      const options = response.list.map((item) => ({
        label: item.customerName,
        value: item.customerId,
      }));
      mergeCustomerOptions(options);
    } catch (error) {
      console.error('Failed to load bulk cost list', error);
      message.error('获取大货成本列表失败');
    } finally {
      setListLoading(false);
    }
  }, [buildListParams, mergeCustomerOptions]);

  useEffect(() => {
    void loadAggregation();
  }, [loadAggregation]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const handleSearch = (value: string) => {
    setKeyword(value);
    setPage(1);
  };

  const handleKeywordChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.value;
    setKeyword(nextValue);
    if (!nextValue) {
      setPage(1);
    }
  };

  const handleOrderRangeChange = (range: RangeValue<Dayjs>) => {
    setOrderDateRange(range);
    setPage(1);
  };

  const handleReceiptRangeChange = (range: RangeValue<Dayjs>) => {
    setReceiptDateRange(range);
    setPage(1);
  };

  const handleCustomerChange = (value: string | undefined) => {
    setCustomerId(value);
    setPage(1);
  };

  const handleExport = () => {
    message.success('正在导出大货成本报表 Excel...');
  };

  const handlePageChange = (current: number, size?: number) => {
    setPage(current);
    if (size && size !== pageSize) {
      setPageSize(size);
    }
  };

  return (
    <div className="bulk-cost-report-page">
      <section>
        <Row gutter={[16, 16]}>
          <Col xs={24} md={16}>
            <Card
              title="成本金额趋势（半年）"
              loading={aggregationLoading}
              bodyStyle={{ height: 320, display: 'flex', alignItems: 'center' }}
            >
              {aggregationLoading ? null : lineDataset.length > 0 ? (
                <div className="bulk-cost-trend-chart">
                  <MonthlyAreaChart
                    data={lineDataset}
                    height={260}
                    getColor={getLineColor}
                    getGradient={getLineGradient}
                    valueFormatter={formatAxisAmount}
                    tooltipValueFormatter={formatCurrency}
                    seriesLabelFormatter={(type) => type}
                  />
                </div>
              ) : (
                <Empty description="暂无趋势数据" />
              )}
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card
              title="客户下单金额占比（半年）"
              loading={aggregationLoading}
              bodyStyle={{ height: 320, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              {aggregationLoading ? null : pieSlices.length > 0 ? (
                <div className="bulk-cost-donut-wrapper">
                  <div className="bulk-cost-donut-chart">
                  <DonutChart
                    data={pieSlices}
                    total={pieTotal}
                    height={240}
                    innerRadiusRatio={0.68}
                    connectorLength={16}
                    labelDistance={24}
                    centerTitle="半年总额"
                    totalFormatter={formatCurrency}
                    valueFormatter={(slice) => formatCurrency(slice.value)}
                  />
                  </div>
                </div>
              ) : (
                <Empty description="暂无客户占比数据" />
              )}
            </Card>
          </Col>
        </Row>
      </section>

      <section className="bulk-cost-filter-row">
        <div className="bulk-cost-filter-group">
          <Input.Search
            allowClear
            value={keyword}
            onChange={handleKeywordChange}
            onSearch={handleSearch}
            placeholder="请输入订单号/款号/款名"
            enterButton={<SearchOutlined />}
            style={{ minWidth: 260, maxWidth: 420 }}
          />
          <RangePicker
            value={orderDateRange}
            onChange={handleOrderRangeChange}
            placeholder={['下单开始日期', '下单结束日期']}
            allowClear
          />
          <RangePicker
            value={receiptDateRange}
            onChange={handleReceiptRangeChange}
            placeholder={['收货开始日期', '收货结束日期']}
            allowClear
          />
          <Select
            allowClear
            placeholder="选择客户"
            value={customerId}
            options={customerOptions}
            style={{ minWidth: 180 }}
            onChange={handleCustomerChange}
          />
        </div>
        <Button type="primary" icon={<DownloadOutlined />} onClick={handleExport}>
          导出Excel
        </Button>
      </section>

      <section>
        {listLoading ? (
          <div className="bulk-cost-card-list">
            {Array.from({ length: pageSize }).map((_, index) => (
              <Card key={index} className="bulk-cost-order-card">
                <Skeleton active avatar paragraph={{ rows: 4 }} />
              </Card>
            ))}
          </div>
        ) : orders.length === 0 ? (
          <Empty description="暂无订单成本数据" />
        ) : (
          <div className="bulk-cost-card-list">
            {orders.map((order) => {
              const costKeys = buildCostKeys(order);
              return (
                <article className="bulk-cost-order-card" key={order.id}>
                  <div className="bulk-cost-card-header">
                    <img src={order.imageUrl} alt={order.styleName} className="bulk-cost-card-image" />
                    <div className="bulk-cost-card-meta">
                      <div className="bulk-cost-card-title">
                        <Text strong>{order.styleName}</Text>
                        <Tag color={getStatusColor(order.orderStatus)}>{order.orderStatus}</Tag>
                      </div>
                      <Space size={12} wrap>
                        <Text type="secondary">订单号：{order.orderNumber}</Text>
                        <Text type="secondary">款号：{order.styleCode}</Text>
                        <Text type="secondary">客户：{order.customerName}</Text>
                        <Text type="secondary">下单日期：{order.orderDate}</Text>
                        <Text type="secondary">收货日期：{order.receiptDate}</Text>
                      </Space>
                      <div className="bulk-cost-card-metrics">
                        <div>
                          <span className="bulk-cost-metric-label">核算数</span>
                          <span className="bulk-cost-metric-value">{formatQuantity(order.calculatedQty)} 件</span>
                        </div>
                        <div>
                          <span className="bulk-cost-metric-label">收货数</span>
                          <span className="bulk-cost-metric-value">{formatQuantity(order.receivedQty)} 件</span>
                        </div>
                        <div>
                          <span className="bulk-cost-metric-label">单价</span>
                          <span className="bulk-cost-metric-value">{formatCurrency(order.unitPrice)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bulk-cost-card-body">
                    <table className="bulk-cost-cost-table">
                      <thead>
                        <tr>
                          <th style={{ textAlign: 'left' }}>项目</th>
                          <th>采购</th>
                          <th>生产</th>
                        </tr>
                      </thead>
                      <tbody>
                        {costKeys.map((key) => {
                          const cost = order.costs[key];
                          if (!cost) {
                            return null;
                          }
                          const label = COST_LABELS[key] ?? key;
                          const isTotal = key === 'total';
                          const isUnit = key === 'unit';
                          return (
                            <tr
                              key={key}
                              className={`${isTotal ? 'bulk-cost-row-total' : ''}${isUnit ? ' bulk-cost-row-unit' : ''}`.trim()}
                            >
                              <td style={{ textAlign: 'left' }}>{label}</td>
                              <td>{isUnit ? renderUnitValue(cost.procurement) : formatCurrency(cost.procurement)}</td>
                              <td>{isUnit ? renderUnitValue(cost.production) : formatCurrency(cost.production)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="bulk-cost-pagination">
        <Pagination
          current={page}
          pageSize={pageSize}
          total={total}
          showSizeChanger
          showTotal={(tot, range) => `第 ${range[0]}-${range[1]} 条，共 ${tot} 条`}
          onChange={handlePageChange}
          onShowSizeChange={handlePageChange}
        />
      </section>
    </div>
  );
};

export default BulkCostReport;
