import { useEffect, useMemo, useState } from 'react';
import type { ColumnsType } from 'antd/es/table';
import type { RangeValue } from 'rc-picker/lib/interface';
import type { Dayjs } from 'dayjs';
import {
  Button,
  Card,
  Col,
  DatePicker,
  Empty,
  Input,
  message,
  Row,
  Select,
  Skeleton,
  Space,
  Statistic,
  Table,
  Typography,
} from 'antd';
import { DownloadOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import MonthlyAreaChart from '../components/charts/MonthlyAreaChart';
import DonutChart from '../components/charts/DonutChart';
import { materialInventoryReportService } from '../api/mock';
import type {
  MaterialInboundRatioItem,
  MaterialInventoryAggregation,
  MaterialInventoryListItem,
  MaterialInventoryListParams,
  MaterialInventoryListResponse,
  MaterialInventoryListSummary,
  MaterialInventoryQueryParams,
} from '../types/material-inventory';

const { RangePicker } = DatePicker;
const { Text, Paragraph } = Typography;

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 20, 50];
const MATERIAL_TYPES = ['面料', '辅料', '包材'];

const TREND_SERIES_COLOR: Record<string, string> = {
  入库数: '#6366F1',
  出库数: '#F97316',
};

const TREND_SERIES_GRADIENT: Record<string, string> = {
  入库数: 'l(90) 0:rgba(99,102,241,0.32) 0.45:rgba(99,102,241,0.18) 1:rgba(99,102,241,0)',
  出库数: 'l(90) 0:rgba(249,115,22,0.32) 0.45:rgba(249,115,22,0.18) 1:rgba(249,115,22,0)',
};

const MATERIAL_TYPE_GRADIENTS: Record<string, [string, string]> = {
  面料: ['#6366F1', '#8B5CF6'],
  辅料: ['#22C55E', '#4ADE80'],
  包材: ['#F59E0B', '#FBBF24'],
};

const FALLBACK_DONUT_COLORS: [string, string][] = [
  ['#0EA5E9', '#38BDF8'],
  ['#F97316', '#FDBA74'],
  ['#8B5CF6', '#C4B5FD'],
  ['#EF4444', '#F87171'],
];

const CURRENCY_FORMATTER = new Intl.NumberFormat('zh-CN', {
  style: 'currency',
  currency: 'CNY',
  minimumFractionDigits: 2,
});

const NUMBER_FORMATTER = new Intl.NumberFormat('zh-CN');

const initialAggregation: MaterialInventoryAggregation = {
  trend: [],
  inboundTotal: 0,
  outboundTotal: 0,
  ratio: [],
  ratioTotal: 0,
};

const initialSummary: MaterialInventoryListSummary = {
  inboundQtyTotal: 0,
  issuedQtyTotal: 0,
  returnQtyTotal: 0,
  otherOutboundQtyTotal: 0,
};

const formatQuantity = (value: number): string => NUMBER_FORMATTER.format(value ?? 0);
const formatCurrency = (value: number): string => CURRENCY_FORMATTER.format(value ?? 0);

const getTrendColor = (series: string): string => TREND_SERIES_COLOR[series] ?? '#475569';
const getTrendGradient = (series: string): string => TREND_SERIES_GRADIENT[series] ?? 'l(90) 0:rgba(71,85,105,0.24) 1:rgba(71,85,105,0)';

const buildQueryParams = (
  keyword: string,
  materialType: string | undefined,
  dateRange: RangeValue<Dayjs>,
): MaterialInventoryQueryParams => {
  const params: MaterialInventoryQueryParams = {};
  const normalizedKeyword = keyword.trim();
  if (normalizedKeyword) {
    params.keyword = normalizedKeyword;
  }
  if (materialType) {
    params.type = materialType;
  }
  if (dateRange && dateRange[0] && dateRange[1]) {
    params.startDate = dateRange[0].startOf('day').format('YYYY-MM-DD');
    params.endDate = dateRange[1].endOf('day').format('YYYY-MM-DD');
  }
  return params;
};

const mapRatioToSlices = (ratio: MaterialInboundRatioItem[]) =>
  ratio.map((item, index) => {
    const palette = MATERIAL_TYPE_GRADIENTS[item.materialType] ?? FALLBACK_DONUT_COLORS[index % FALLBACK_DONUT_COLORS.length];
    return {
      name: item.materialType,
      value: item.amount,
      colorStops: palette,
    };
  });

const MaterialInventoryReport = () => {
  const [keyword, setKeyword] = useState('');
  const [materialType, setMaterialType] = useState<string | undefined>(undefined);
  const [dateRange, setDateRange] = useState<RangeValue<Dayjs>>(null);
  const [filters, setFilters] = useState<MaterialInventoryQueryParams>({});
  const [aggregation, setAggregation] = useState<MaterialInventoryAggregation>(initialAggregation);
  const [aggregationLoading, setAggregationLoading] = useState(false);
  const [records, setRecords] = useState<MaterialInventoryListItem[]>([]);
  const [listSummary, setListSummary] = useState<MaterialInventoryListSummary>(initialSummary);
  const [total, setTotal] = useState(0);
  const [listLoading, setListLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  useEffect(() => {
    let ignore = false;
    setAggregationLoading(true);

    materialInventoryReportService
      .getOverview(filters)
      .then((response) => {
        if (ignore) {
          return;
        }
        setAggregation(response);
      })
      .catch(() => {
        if (ignore) {
          return;
        }
        message.error('获取物料进销存汇总失败');
      })
      .finally(() => {
        if (ignore) {
          return;
        }
        setAggregationLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [filters]);

  useEffect(() => {
    let ignore = false;
    setListLoading(true);

    const params: MaterialInventoryListParams = {
      ...filters,
      page,
      pageSize,
    };

    materialInventoryReportService
      .getList(params)
      .then((response: MaterialInventoryListResponse) => {
        if (ignore) {
          return;
        }
        setRecords(response.list);
        setTotal(response.total);
        setListSummary(response.summary);
      })
      .catch(() => {
        if (ignore) {
          return;
        }
        message.error('获取物料进销存列表失败');
      })
      .finally(() => {
        if (ignore) {
          return;
        }
        setListLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [filters, page, pageSize]);

  const trendDataset = useMemo(() => {
    const dataset = aggregation.trend ?? [];
    return dataset.flatMap((item) => [
      { month: item.month, count: item.inboundQty, type: '入库数' },
      { month: item.month, count: item.outboundQty, type: '出库数' },
    ]);
  }, [aggregation.trend]);

  const donutSlices = useMemo(() => mapRatioToSlices(aggregation.ratio), [aggregation.ratio]);

  const handleSearch = () => {
    const nextFilters = buildQueryParams(keyword, materialType, dateRange);
    setFilters(nextFilters);
    setPage(1);
  };

  const handleReset = () => {
    setKeyword('');
    setMaterialType(undefined);
    setDateRange(null);
    setFilters({});
    setPage(1);
  };

  const handleExport = () => {
    message.success('已生成物料进销存报表导出任务，请稍后在下载中心查看');
  };

  const columns: ColumnsType<MaterialInventoryListItem> = useMemo(() => [
    {
      title: '序号',
      dataIndex: 'index',
      width: 72,
      align: 'right',
      render: (_value, _record, index) => (page - 1) * pageSize + index + 1,
    },
    {
      title: '图片',
      dataIndex: 'imageUrl',
      width: 92,
      render: (value: string, record) => (
        <img
          src={value}
          alt={record.materialName}
          style={{ width: 64, height: 64, borderRadius: 8, objectFit: 'cover', background: '#f3f4f6' }}
        />
      ),
    },
    {
      title: '物料类型',
      dataIndex: 'materialType',
      width: 120,
    },
    {
      title: '物料名称',
      dataIndex: 'materialName',
      width: 200,
      ellipsis: true,
    },
    {
      title: '颜色',
      dataIndex: 'color',
      width: 120,
    },
    {
      title: '幅宽|克重',
      dataIndex: 'spec',
      width: 160,
      ellipsis: true,
    },
    {
      title: '采购单位',
      dataIndex: 'unit',
      width: 100,
      align: 'center',
    },
    {
      title: '入库数',
      dataIndex: 'inboundQty',
      width: 120,
      align: 'right',
      render: (value: number) => formatQuantity(value),
    },
    {
      title: '领料数',
      dataIndex: 'issuedQty',
      width: 120,
      align: 'right',
      render: (value: number) => formatQuantity(value),
    },
    {
      title: '退料数',
      dataIndex: 'returnQty',
      width: 120,
      align: 'right',
      render: (value: number) => formatQuantity(value),
    },
    {
      title: '其它出库数',
      dataIndex: 'otherOutboundQty',
      width: 140,
      align: 'right',
      render: (value: number) => formatQuantity(value),
    },
    {
      title: '当前库存',
      dataIndex: 'currentStock',
      width: 140,
      align: 'right',
      render: (value: number) => formatQuantity(value),
    },
  ], [page, pageSize]);

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card>
        <Space wrap size={16}>
          <Input
            value={keyword}
            allowClear
            placeholder="请输入物料名称"
            onChange={(event) => setKeyword(event.target.value)}
            style={{ width: 240 }}
          />
          <Select
            allowClear
            placeholder="请选择物料类型"
            value={materialType}
            options={MATERIAL_TYPES.map((type) => ({ label: type, value: type }))}
            style={{ width: 180 }}
            onChange={(value) => setMaterialType(value ?? undefined)}
          />
          <RangePicker
            value={dateRange}
            placeholder={['开始日期', '结束日期']}
            onChange={(range) => setDateRange(range)}
            style={{ width: 280 }}
            allowEmpty={[true, true]}
          />
          <Space>
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
        </Space>
      </Card>

      <Row gutter={16}>
        <Col xs={24} xl={16}>
          <Card title="物料进出趋势（半年）">
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={12}>
                <Statistic
                  title="入库合计"
                  value={aggregation.inboundTotal}
                  formatter={(value) => formatQuantity(Number(value))}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="出库合计"
                  value={aggregation.outboundTotal}
                  formatter={(value) => formatQuantity(Number(value))}
                />
              </Col>
            </Row>
            {aggregationLoading ? (
              <Skeleton active paragraph={{ rows: 6 }} />
            ) : trendDataset.length ? (
              <MonthlyAreaChart
                data={trendDataset}
                height={260}
                getColor={getTrendColor}
                getGradient={getTrendGradient}
                valueFormatter={(value) => formatQuantity(value)}
                tooltipValueFormatter={(value) => `${formatQuantity(value)} 件`}
                seriesLabelFormatter={(series) => series}
                xLabelFormatter={(label) => `${label.slice(5)}月`}
              />
            ) : (
              <Empty description="暂无趋势数据" />
            )}
          </Card>
        </Col>
        <Col xs={24} xl={8}>
          <Card title="物料入库金额占比">
            {aggregationLoading ? (
              <Skeleton active paragraph={{ rows: 6 }} />
            ) : donutSlices.length ? (
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <DonutChart
                  data={donutSlices}
                  total={aggregation.ratioTotal}
                  height={240}
                  innerRadiusRatio={0.66}
                  connectorLength={18}
                  centerTitle="合计金额"
                  totalFormatter={(value) => formatCurrency(value)}
                  valueFormatter={(slice) => formatCurrency(slice.value)}
                />
              </div>
            ) : (
              <Empty description="暂无入库金额数据" />
            )}
          </Card>
        </Col>
      </Row>

      <Card>
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Text strong>报表说明</Text>
          <Paragraph type="secondary" style={{ marginBottom: 0 }}>
            统计区间内，入库数含采购入库及退料补库，出库数含生产领料及其它非生产出库；可结合右上角导出功能进行细项核对。
          </Paragraph>
        </Space>
      </Card>

      <Card title="物料进销存明细">
        <Table<MaterialInventoryListItem>
          rowKey="id"
          columns={columns}
          dataSource={records}
          loading={listLoading}
          pagination={{
            current: page,
            pageSize,
            total,
            showQuickJumper: true,
            showSizeChanger: true,
            pageSizeOptions: PAGE_SIZE_OPTIONS.map(String),
            onChange: (nextPage, nextSize) => {
              if (nextSize && nextSize !== pageSize) {
                setPage(1);
                setPageSize(nextSize);
                return;
              }
              setPage(nextPage);
            },
            onShowSizeChange: (_current, nextSize) => {
              setPage(1);
              setPageSize(nextSize);
            },
            showTotal: (value) => `共 ${value} 条`,
          }}
          scroll={{ x: 1180 }}
          summary={() => (
            <Table.Summary fixed>
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={7}>
                  <Text strong>合计</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={7} align="right">
                  {formatQuantity(listSummary.inboundQtyTotal)}
                </Table.Summary.Cell>
                <Table.Summary.Cell index={8} align="right">
                  {formatQuantity(listSummary.issuedQtyTotal)}
                </Table.Summary.Cell>
                <Table.Summary.Cell index={9} align="right">
                  {formatQuantity(listSummary.returnQtyTotal)}
                </Table.Summary.Cell>
                <Table.Summary.Cell index={10} align="right">
                  {formatQuantity(listSummary.otherOutboundQtyTotal)}
                </Table.Summary.Cell>
                <Table.Summary.Cell index={11} align="right">--</Table.Summary.Cell>
              </Table.Summary.Row>
            </Table.Summary>
          )}
        />
      </Card>
    </Space>
  );
};

export default MaterialInventoryReport;
