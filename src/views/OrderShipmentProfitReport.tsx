import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ColumnsType, TableProps } from 'antd/es/table';
import {
  Button,
  Card,
  Col,
  Collapse,
  Grid,
  Input,
  Row,
  Space,
  Table,
  Typography,
  message,
} from 'antd';
import { DownloadOutlined, LineChartOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import DonutChart from '../components/charts/DonutChart';
import MonthlyDualAxisChart from '../components/charts/MonthlyDualAxisChart';
import { orderShipmentProfitReportService } from '../api/mock';
import type {
  OrderShipmentProfitAggregation,
  OrderShipmentProfitListParams,
  OrderShipmentProfitRecord,
} from '../types/order-shipment-profit-report';

const { useBreakpoint } = Grid;
const { Text, Title } = Typography;

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 20, 50];

const amountFormatter = new Intl.NumberFormat('zh-CN', {
  style: 'currency',
  currency: 'CNY',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const quantityFormatter = new Intl.NumberFormat('zh-CN');

const renderAmount = (value: number) => amountFormatter.format(value ?? 0);
const renderQuantity = (value: number) => quantityFormatter.format(Math.round(value ?? 0));
const renderMargin = (value: number) => `${(value * 100).toFixed(1)}%`;

const buildListParams = (
  page: number,
  pageSize: number,
  keyword?: string,
): OrderShipmentProfitListParams => ({
  page,
  pageSize,
  keyword: keyword?.trim() || undefined,
});

const OrderShipmentProfitReport = () => {
  const screens = useBreakpoint();
  const [aggregation, setAggregation] = useState<OrderShipmentProfitAggregation | null>(null);
  const [aggregationLoading, setAggregationLoading] = useState(false);
  const [showCharts, setShowCharts] = useState(true);

  const [records, setRecords] = useState<OrderShipmentProfitRecord[]>([]);
  const [recordTotal, setRecordTotal] = useState(0);
  const [summary, setSummary] = useState({ shipmentAmount: 0, profit: 0 });
  const [tableLoading, setTableLoading] = useState(false);
  const [keywordInput, setKeywordInput] = useState('');
  const [appliedKeyword, setAppliedKeyword] = useState<string | undefined>();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [exporting, setExporting] = useState(false);

  const loadAggregation = useCallback(async () => {
    setAggregationLoading(true);
    try {
      const response = await orderShipmentProfitReportService.getAggregation();
      setAggregation(response);
    } catch (error) {
      console.error('failed to load shipment profit aggregation', error);
      message.error('加载利润趋势数据失败');
    } finally {
      setAggregationLoading(false);
    }
  }, []);

  const loadList = useCallback(async () => {
    setTableLoading(true);
    try {
      const params = buildListParams(page, pageSize, appliedKeyword);
      const response = await orderShipmentProfitReportService.getList(params);
      setRecords(response.list);
      setRecordTotal(response.total);
      setSummary(response.summary);
    } catch (error) {
      console.error('failed to load shipment profit list', error);
      message.error('获取订单出货利润失败');
    } finally {
      setTableLoading(false);
    }
  }, [appliedKeyword, page, pageSize]);

  useEffect(() => {
    void loadAggregation();
  }, [loadAggregation]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const handleSearch = () => {
    const normalized = keywordInput.trim();
    setAppliedKeyword(normalized || undefined);
    setPage(1);
  };

  const handleReset = () => {
    setKeywordInput('');
    setAppliedKeyword(undefined);
    setPage(1);
    setPageSize(DEFAULT_PAGE_SIZE);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = buildListParams(page, pageSize, appliedKeyword);
      const result = await orderShipmentProfitReportService.export(params);
      message.success('导出任务已生成，请稍后到下载中心查看');
      console.info('mock export file url', result.fileUrl);
    } catch (error) {
      console.error('failed to export shipment profit', error);
      message.error('导出失败，请稍后重试');
    } finally {
      setExporting(false);
    }
  };

  const handleTableChange: TableProps<OrderShipmentProfitRecord>['onChange'] = (pagination) => {
    if (!pagination) {
      return;
    }
    const nextPage = pagination.current ?? 1;
    const nextSize = pagination.pageSize ?? pageSize;
    if (nextSize !== pageSize) {
      setPageSize(nextSize);
      setPage(1);
    } else if (nextPage !== page) {
      setPage(nextPage);
    }
  };

  const columns: ColumnsType<OrderShipmentProfitRecord> = useMemo(
    () => [
      {
        title: '工厂订单',
        dataIndex: 'orderNumber',
        key: 'orderNumber',
        width: 180,
        fixed: 'left',
      },
      {
        title: '客户',
        dataIndex: 'customer',
        key: 'customer',
        width: 180,
        ellipsis: true,
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
        title: '出货日期',
        dataIndex: 'shipmentDate',
        key: 'shipmentDate',
        width: 140,
      },
      {
        title: '出货数量',
        dataIndex: 'shippedQty',
        key: 'shippedQty',
        width: 140,
        align: 'right',
        render: renderQuantity,
      },
      {
        title: '出货金额',
        dataIndex: 'shipmentAmount',
        key: 'shipmentAmount',
        width: 160,
        align: 'right',
        render: renderAmount,
      },
      {
        title: '大货成本',
        dataIndex: 'cost',
        key: 'cost',
        width: 160,
        align: 'right',
        render: renderAmount,
      },
      {
        title: '利润总额',
        dataIndex: 'profit',
        key: 'profit',
        width: 160,
        align: 'right',
        render: renderAmount,
      },
      {
        title: '利润率',
        dataIndex: 'profitMargin',
        key: 'profitMargin',
        width: 120,
        align: 'right',
        render: (value: number) => <Text strong>{renderMargin(value)}</Text>,
      },
      {
        title: '操作',
        dataIndex: 'action',
        key: 'action',
        width: 150,
        fixed: 'right',
        render: () => (
          <Button type="link" onClick={() => message.info('成本明细功能将在后续版本开放')}>
            查看成本明细
          </Button>
        ),
      },
    ],
    [],
  );

  const pagination = useMemo(
    () => ({
      current: page,
      pageSize,
      total: recordTotal,
      showSizeChanger: true,
      pageSizeOptions: PAGE_SIZE_OPTIONS,
      showTotal: (value: number) => `共 ${value} 条`,
    }),
    [page, pageSize, recordTotal],
  );

  const trendDataset = useMemo(() => {
    if (!aggregation) {
      return {
        column: [],
        line: [],
      };
    }
    const { labels, shipmentAmount, totalProfit } = aggregation.profitTrend;
    return {
      column: labels.map((month, index) => ({ month, value: shipmentAmount[index] ?? 0 })),
      line: labels.map((month, index) => ({ month, value: totalProfit[index] ?? 0 })),
    };
  }, [aggregation]);

  const pieSlices = useMemo(() => {
    if (!aggregation) return [];
    const gradients: [string, string][] = [
      ['#2563eb', '#4f8df6'],
      ['#16a34a', '#4ad173'],
      ['#f97316', '#f9a94d'],
      ['#dc2626', '#f87171'],
      ['#7c3aed', '#a78bfa'],
      ['#0ea5e9', '#38bdf8'],
      ['#facc15', '#fde047'],
    ];
    return aggregation.customerProportion.customers.map((customer, index) => ({
      name: customer.name,
      value: customer.value,
      colorStops: gradients[index % gradients.length],
    }));
  }, [aggregation]);

  const chartCollapse = useMemo(
    () => (
      <Collapse
        bordered={false}
        activeKey={showCharts ? ['charts'] : []}
        onChange={(keys) => {
          setShowCharts(keys.includes('charts'));
        }}
        items={[
          {
            key: 'charts',
            label: (
              <Space size={8}>
                <LineChartOutlined />
                <span>订单出货利润概览</span>
              </Space>
            ),
            children: (
              <Row gutter={[16, 16]}>
                <Col xs={24} lg={14}>
                  <Card bordered={false} loading={aggregationLoading}>
                    <Title level={5} style={{ marginBottom: 24 }}>
                      订单出货利润表（半年）
                    </Title>
                    <MonthlyDualAxisChart
                      columnData={trendDataset.column}
                      lineData={trendDataset.line}
                      columnLabel="出货金额"
                      lineLabel="利润总额"
                      columnFormatter={(value) => (value >= 10000 ? `¥${(value / 10000).toFixed(1)}万` : `¥${value.toFixed(0)}`)}
                      lineFormatter={(value) => (value >= 10000 ? `¥${(value / 10000).toFixed(1)}万` : `¥${value.toFixed(0)}`)}
                    />
                  </Card>
                </Col>
                <Col xs={24} lg={10}>
                  <Card bordered={false} loading={aggregationLoading}>
                    <Title level={5} style={{ marginBottom: 24 }}>
                      客户下单金额占比
                    </Title>
                    <DonutChart
                      data={pieSlices}
                      total={aggregation?.customerProportion.total ?? 0}
                      centerTitle="六个月累计"
                      totalFormatter={(value) =>
                        value >= 10000 ? `¥${(value / 10000).toFixed(1)}万` : `¥${value.toFixed(0)}`
                      }
                      valueFormatter={(slice) =>
                        slice.value >= 10000 ? `¥${(slice.value / 10000).toFixed(1)}万` : `¥${slice.value.toFixed(0)}`
                      }
                    />
                  </Card>
                </Col>
              </Row>
            ),
          },
        ]}
      />
    ),
    [aggregation, aggregationLoading, pieSlices, showCharts, trendDataset],
  );

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      {chartCollapse}

      <Card bordered={false}>
        <Space
          direction={screens.xs ? 'vertical' : 'horizontal'}
          size={16}
          style={{ width: '100%', marginBottom: 16 }}
        >
          <Input
            allowClear
            placeholder="请输入订单号/客户/款号/款名"
            prefix={<SearchOutlined />}
            style={{ width: screens.xs ? '100%' : 320 }}
            value={keywordInput}
            onChange={(event) => setKeywordInput(event.target.value)}
            onPressEnter={handleSearch}
          />
          <Space size={12} wrap>
            <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
              筛选
            </Button>
            <Button icon={<ReloadOutlined />} onClick={handleReset}>
              重置
            </Button>
            <Button icon={<DownloadOutlined />} loading={exporting} onClick={handleExport}>
              导出Excel
            </Button>
          </Space>
        </Space>

        <Space size={24} style={{ marginBottom: 16 }} wrap>
          <Text type="secondary">
            出货金额合计：<Text strong>{renderAmount(summary.shipmentAmount)}</Text>
          </Text>
          <Text type="secondary">
            利润合计：<Text strong>{renderAmount(summary.profit)}</Text>
          </Text>
        </Space>

        <Table<OrderShipmentProfitRecord>
          rowKey={(record) => record.id}
          columns={columns}
          dataSource={records}
          loading={tableLoading}
          pagination={pagination}
          onChange={handleTableChange}
          scroll={{ x: 1200 }}
        />
      </Card>
    </Space>
  );
};

export default OrderShipmentProfitReport;
