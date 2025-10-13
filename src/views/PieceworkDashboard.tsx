import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import { Card, Col, Empty, Progress, Row, Space, Spin, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Column } from '@antv/g2plot';
import type { ColumnOptions } from '@antv/g2plot';
import DonutChart from '../components/charts/DonutChart';
import MonthlyAreaChart from '../components/charts/MonthlyAreaChart';
import type {
  PieceworkCapacityComparisonPoint,
  PieceworkCapacityTrendPoint,
  PieceworkCompletionSlice,
  PieceworkCuttingTrendPoint,
  PieceworkDashboardDataset,
  PieceworkMetric,
  PieceworkOverdueOrder,
} from '../types';
import { fetchPieceworkDashboardDataset } from '../mock';
import '../styles/piecework-dashboard.css';

const { Text } = Typography;

const chartPalette = {
  primary: '#567ff8',
  primaryLight: '#69b1ff',
  secondary: '#3ec3a0',
  tertiary: '#13c2c2',
  warning: '#faad14',
};

const EMPTY_METRICS: PieceworkMetric[] = [];
const EMPTY_CUTTING_TREND: PieceworkCuttingTrendPoint[] = [];
const EMPTY_CAPACITY_COMPARISON: PieceworkCapacityComparisonPoint[] = [];
const EMPTY_CAPACITY_TREND: PieceworkCapacityTrendPoint[] = [];
const EMPTY_COMPLETION_SLICES: PieceworkCompletionSlice[] = [];
const EMPTY_OVERDUE: PieceworkOverdueOrder[] = [];

type ColumnChartProps = {
  data: PieceworkCapacityComparisonPoint[];
  height?: number;
};

const GroupedColumnChart = ({ data, height = 260 }: ColumnChartProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const plotRef: MutableRefObject<Column | null> = useRef<Column | null>(null);

  const config = useMemo<ColumnOptions>(() => ({
    data,
    autoFit: true,
    height,
    xField: 'month',
    yField: 'quantity',
    seriesField: 'category',
    isGroup: true,
    columnStyle: {
      radius: [4, 4, 0, 0],
    },
    color: (item) => (item.category === '本年' ? chartPalette.primary : chartPalette.secondary),
    dodgePadding: 8,
    legend: {
      position: 'top',
    },
    tooltip: {
      shared: true,
    },
    xAxis: {
      label: {
        style: {
          fill: '#6b7280',
          fontSize: 12,
        },
      },
    },
    yAxis: {
      label: {
        style: {
          fill: '#6b7280',
          fontSize: 12,
        },
      },
      grid: {
        line: {
          style: {
            stroke: '#eef2f6',
            lineDash: [4, 4],
          },
        },
      },
    },
  }), [data, height]);

  const initialConfigRef = useRef<ColumnOptions>(config);

  useEffect(() => {
    if (!containerRef.current) {
      return () => undefined;
    }

    const plot = new Column(containerRef.current, initialConfigRef.current);
    plot.render();
    plotRef.current = plot;

    return () => {
      plot.destroy();
      plotRef.current = null;
    };
  }, []);

  useEffect(() => {
    plotRef.current?.update(config);
  }, [config]);

  return <div ref={containerRef} />;
};

const completionColors: Record<PieceworkCompletionSlice['key'], [string, string]> = {
  completed: ['#36cfc9', '#87e8de'],
  in_progress: ['#1677ff', '#69b1ff'],
};

const PieceworkDashboard = () => {
  const [dataset, setDataset] = useState<PieceworkDashboardDataset | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchPieceworkDashboardDataset()
      .then((data) => {
        setDataset(data);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const metrics = dataset?.metrics ?? EMPTY_METRICS;
  const cuttingTrend = dataset?.cuttingTrend ?? EMPTY_CUTTING_TREND;
  const capacityComparison = dataset?.capacityComparison ?? EMPTY_CAPACITY_COMPARISON;
  const capacityTrend = dataset?.capacityTrend ?? EMPTY_CAPACITY_TREND;
  const completionSlices = dataset?.completionSlices ?? EMPTY_COMPLETION_SLICES;
  const overdueOrders = dataset?.overdueOrders ?? EMPTY_OVERDUE;

  const cuttingTrendAreaData = useMemo(
    () =>
      cuttingTrend.map((point) => ({
        month: point.month,
        count: point.quantity,
        type: '实裁数',
      })),
    [cuttingTrend],
  );

  const capacityTrendAreaData = useMemo(
    () =>
      capacityTrend.map((point) => ({
        month: point.date,
        count: point.value,
        type: point.type,
      })),
    [capacityTrend],
  );

  const resolveTrendColor = useCallback(
    (seriesType: string) => {
      if (seriesType === '实际订单') return chartPalette.secondary;
      return chartPalette.primary;
    },
    [],
  );

  const resolveTrendGradient = useCallback(
    (seriesType: string) => {
      const baseColor = resolveTrendColor(seriesType);
      return `l(90) 0:${baseColor} 0.2:${baseColor} 1:rgba(255,255,255,1)`;
    },
    [resolveTrendColor],
  );

  const totalCompletionOrders = useMemo(
    () => completionSlices.reduce((sum, slice) => sum + slice.orders, 0),
    [completionSlices],
  );

  const completionDonutData = useMemo(
    () => completionSlices.map((slice) => ({
      name: slice.label,
      value: slice.orders,
      colorStops: completionColors[slice.key] ?? completionColors.in_progress,
    })),
    [completionSlices],
  );

  const overdueColumns: ColumnsType<PieceworkOverdueOrder> = useMemo(() => [
    {
      title: '图片',
      dataIndex: 'thumbnail',
      key: 'thumbnail',
      width: 80,
      render: (value: string, record) => (
        <img
          alt={record.styleName}
          src={value}
          className="piecework-overdue-thumb"
        />
      ),
    },
    {
      title: '订单号',
      dataIndex: 'orderNo',
      key: 'orderNo',
      render: (value: string) => (
        <Typography.Link onClick={() => {}}>{value}</Typography.Link>
      ),
    },
    {
      title: '客户',
      dataIndex: 'customer',
      key: 'customer',
    },
    {
      title: '款号款名',
      key: 'style',
      render: (_, record) => (
        <div>
          <div>{record.styleNo}</div>
          <Text type="secondary">{record.styleName}</Text>
        </div>
      ),
    },
    {
      title: '预计交货',
      dataIndex: 'expectedDelivery',
      key: 'expectedDelivery',
    },
    {
      title: '下单数',
      dataIndex: 'orderQuantity',
      key: 'orderQuantity',
      render: (value: number) => `${value.toLocaleString()} 件`,
    },
    {
      title: '实裁数',
      dataIndex: 'cuttingQuantity',
      key: 'cuttingQuantity',
      render: (value: number) => `${value.toLocaleString()} 件`,
    },
    {
      title: '完成比例',
      dataIndex: 'completionRate',
      key: 'completionRate',
      render: (value: number) => (
        <Progress
          percent={Math.round(value * 100)}
          status={value >= 0.75 ? 'success' : value >= 0.5 ? 'active' : 'exception'}
          size="small"
        />
      ),
    },
  ], []);

  return (
    <div className="piecework-dashboard-page">
      <Spin spinning={loading} tip="正在加载车间计件数据...">
        <div className="piecework-dashboard-content">
          <Row gutter={[16, 16]}>
            {metrics.map((metric: PieceworkMetric) => {
              const trendTag = metric.trendPercent != null ? (
                <Tag
                  color={metric.trendDirection === 'down' ? 'red' : metric.trendDirection === 'up' ? 'green' : 'default'}
                >
                  {metric.trendDirection === 'down' ? '↓' : metric.trendDirection === 'up' ? '↑' : '—'}
                  {Math.abs(metric.trendPercent).toFixed(1)}%
                </Tag>
              ) : null;

              return (
                <Col xs={24} sm={12} xl={6} key={metric.key}>
                  <Card className="piecework-kpi-card" bordered={false}>
                    <Space direction="vertical" size={8} style={{ width: '100%' }}>
                      <div className="piecework-kpi-header">
                        <Text type="secondary">{metric.title}</Text>
                        {trendTag}
                      </div>
                      <div className="piecework-kpi-values">
                        <div className="piecework-kpi-primary">{metric.orderCount.toLocaleString()} 单</div>
                        <Text type="secondary">
                          {metric.quantity.toLocaleString()} {metric.quantityUnit ?? '件'}
                        </Text>
                      </div>
                      {metric.description ? (
                        <Text type="secondary" className="piecework-kpi-description">{metric.description}</Text>
                      ) : null}
                    </Space>
                  </Card>
                </Col>
              );
            })}
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} xl={12}>
              <Card title="实裁数" bordered={false} className="piecework-chart-card">
                {cuttingTrendAreaData.length ? (
                  <MonthlyAreaChart
                    data={cuttingTrendAreaData}
                    getColor={resolveTrendColor}
                    getGradient={resolveTrendGradient}
                    height={260}
                  />
                ) : (
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无数据" />
                )}
              </Card>
            </Col>

            <Col xs={24} xl={12}>
              <Card title="产能对比表" bordered={false} className="piecework-chart-card">
                {capacityComparison.length ? (
                  <GroupedColumnChart data={capacityComparison} />
                ) : (
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无数据" />
                )}
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} xl={8}>
              <Card title="总完成百分比（年）" bordered={false} className="piecework-chart-card">
                {completionDonutData.length ? (
                  <DonutChart
                    data={completionDonutData}
                    total={totalCompletionOrders}
                    height={240}
                    width={240}
                  />
                ) : (
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无数据" />
                )}
              </Card>
            </Col>
            <Col xs={24} xl={16}>
              <Card title="产能图" bordered={false} className="piecework-chart-card">
                {capacityTrendAreaData.length ? (
                  <MonthlyAreaChart
                    data={capacityTrendAreaData}
                    getColor={resolveTrendColor}
                    getGradient={resolveTrendGradient}
                    height={260}
                  />
                ) : (
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无数据" />
                )}
              </Card>
            </Col>
          </Row>

          <Card title="订单超期" bordered={false} className="piecework-table-card">
            <Table
              rowKey="id"
              dataSource={overdueOrders}
              columns={overdueColumns}
              pagination={false}
              locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无超期订单" /> }}
            />
          </Card>
        </div>
      </Spin>
    </div>
  );
};

export default PieceworkDashboard;
