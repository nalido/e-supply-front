import { useEffect, useMemo, useState } from 'react';
import type { ColumnsType } from 'antd/es/table';
import type { RangeValue } from 'rc-picker/lib/interface';
import type { Dayjs } from 'dayjs';
import { Button, Card, Col, DatePicker, Empty, Input, message, Row, Skeleton, Space, Statistic, Table, Typography } from 'antd';
import { DownloadOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import MonthlyDualColumnChart from '../components/charts/MonthlyDualColumnChart';
import { finishedGoodsInventoryReportService } from '../api/mock';
import type {
  FinishedGoodsInventoryAggregation,
  FinishedGoodsInventoryListItem,
  FinishedGoodsInventoryListParams,
  FinishedGoodsInventoryListSummary,
  FinishedGoodsInventoryQueryParams,
} from '../types/finished-goods-inventory';

const { RangePicker } = DatePicker;
const { Text } = Typography;

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 20, 50];

const formatQuantity = (value: number): string => value.toLocaleString('zh-CN');

const buildQueryFromInputs = (
  keyword: string,
  dateRange: RangeValue<Dayjs>,
): FinishedGoodsInventoryQueryParams => {
  const trimmed = keyword.trim();
  const params: FinishedGoodsInventoryQueryParams = {};

  if (trimmed) {
    params.keyword = trimmed;
  }

  if (dateRange && dateRange[0] && dateRange[1]) {
    params.startDate = dateRange[0].format('YYYY-MM-DD');
    params.endDate = dateRange[1].format('YYYY-MM-DD');
  }

  return params;
};

const initialAggregation: FinishedGoodsInventoryAggregation = {
  monthlyFlow: [],
  inboundTotal: 0,
  outboundTotal: 0,
};

const initialSummary: FinishedGoodsInventoryListSummary = {
  inboundTotal: 0,
  outboundTotal: 0,
};

const FinishedGoodsInventoryReport = () => {
  const [keyword, setKeyword] = useState('');
  const [dateRange, setDateRange] = useState<RangeValue<Dayjs>>(null);
  const [filters, setFilters] = useState<FinishedGoodsInventoryQueryParams>({});
  const [aggregation, setAggregation] = useState<FinishedGoodsInventoryAggregation>(initialAggregation);
  const [aggregationLoading, setAggregationLoading] = useState(false);
  const [records, setRecords] = useState<FinishedGoodsInventoryListItem[]>([]);
  const [listSummary, setListSummary] = useState<FinishedGoodsInventoryListSummary>(initialSummary);
  const [total, setTotal] = useState(0);
  const [listLoading, setListLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  useEffect(() => {
    let ignore = false;
    setAggregationLoading(true);

    finishedGoodsInventoryReportService
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
        message.error('获取成品出入库汇总失败');
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

    const params: FinishedGoodsInventoryListParams = {
      ...filters,
      page,
      pageSize,
    };

    finishedGoodsInventoryReportService
      .getList(params)
      .then((response) => {
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
        message.error('获取成品进销存列表失败');
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

  const handleSearch = () => {
    const nextFilters = buildQueryFromInputs(keyword, dateRange);
    setPage(1);
    setFilters(nextFilters);
  };

  const handleReset = () => {
    setKeyword('');
    setDateRange(null);
    setPage(1);
    setFilters({});
  };

  const handleExport = () => {
    message.success('已生成成品进销存报表导出任务，将在后台下载中心提供');
  };

  const chartData = useMemo(() => aggregation.monthlyFlow, [aggregation.monthlyFlow]);

  const columns: ColumnsType<FinishedGoodsInventoryListItem> = useMemo(() => [
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
          alt={record.styleName}
          style={{ width: 64, height: 64, borderRadius: 8, objectFit: 'cover', background: '#f3f4f6' }}
        />
      ),
    },
    {
      title: '款号',
      dataIndex: 'styleNo',
      width: 120,
    },
    {
      title: '款名',
      dataIndex: 'styleName',
      width: 200,
      ellipsis: true,
    },
    {
      title: '颜色',
      dataIndex: 'color',
      width: 100,
    },
    {
      title: '尺码',
      dataIndex: 'size',
      width: 100,
    },
    {
      title: '单位',
      dataIndex: 'unit',
      width: 80,
      align: 'center',
    },
    {
      title: '入库数',
      dataIndex: 'inboundQty',
      width: 120,
      align: 'right',
      render: (value: number, record) => `${formatQuantity(value)} ${record.unit}`,
    },
    {
      title: '出库数',
      dataIndex: 'outboundQty',
      width: 120,
      align: 'right',
      render: (value: number, record) => `${formatQuantity(value)} ${record.unit}`,
    },
    {
      title: '当前库存',
      dataIndex: 'currentStock',
      width: 140,
      align: 'right',
      render: (value: number, record) => `${formatQuantity(value)} ${record.unit}`,
    },
  ], [page, pageSize]);

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card>
        <Space wrap size={16}>
          <Input
            value={keyword}
            allowClear
            placeholder="请输入款号款名"
            onChange={(event) => setKeyword(event.target.value)}
            style={{ width: 240 }}
          />
          <RangePicker
            value={dateRange}
            placeholder={['开始日期', '结束日期']}
            onChange={(range) => setDateRange(range)}
            style={{ width: 260 }}
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
          <Card title="成品出入库对比表（年）">
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={12}>
                <Statistic
                  title="入库合计"
                  value={aggregation.inboundTotal}
                  formatter={(value) => `${formatQuantity(Number(value))} 件`}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="出库合计"
                  value={aggregation.outboundTotal}
                  formatter={(value) => `${formatQuantity(Number(value))} 件`}
                />
              </Col>
            </Row>
            {aggregationLoading ? (
              <Skeleton active paragraph={{ rows: 6 }} />
            ) : chartData.length ? (
              <MonthlyDualColumnChart
                data={chartData}
                valueFormatter={(value) => `${formatQuantity(value)}`}
                tooltipValueFormatter={(value) => `${formatQuantity(value)} 件`}
              />
            ) : (
              <Empty description="暂无出入库数据" />
            )}
          </Card>
        </Col>
        <Col xs={24} xl={8}>
          <Card title="过滤条件提示">
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              <Text type="secondary">
                通过上方筛选可按款号、时间段聚焦特定SKU在周期内的入库与出库表现。
              </Text>
              <Text type="secondary">
                当前查询共有
                <Text strong style={{ margin: '0 4px' }}>
                  {formatQuantity(total)}
                </Text>
                个SKU满足条件。
              </Text>
              <Text type="secondary">
                如需进一步分析，可导出Excel进行多维度对比或复核期初期末数据。
              </Text>
            </Space>
          </Card>
        </Col>
      </Row>

      <Card title="进销存汇总">
        <Table<FinishedGoodsInventoryListItem>
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
              if (nextSize !== pageSize) {
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
          scroll={{ x: 1080 }}
          summary={() => (
            <Table.Summary fixed>
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={7}>
                  <Text strong>合计</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={7} align="right">
                  {`${formatQuantity(listSummary.inboundTotal)} 件`}
                </Table.Summary.Cell>
                <Table.Summary.Cell index={8} align="right">
                  {`${formatQuantity(listSummary.outboundTotal)} 件`}
                </Table.Summary.Cell>
                <Table.Summary.Cell index={9} align="right">--</Table.Summary.Cell>
              </Table.Summary.Row>
            </Table.Summary>
          )}
        />
      </Card>
    </Space>
  );
};

export default FinishedGoodsInventoryReport;
