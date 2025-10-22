import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CSSProperties, Key } from 'react';
import type { ColumnsType } from 'antd/es/table';
import type { SorterResult, SortOrder, TablePaginationConfig } from 'antd/es/table/interface';
import {
  Avatar,
  Button,
  Card,
  Col,
  Input,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import {
  DownloadOutlined,
  FilterOutlined,
  PrinterOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { outsourcingProductionReportService } from '../api/mock';
import type {
  OutsourcingOrderStatus,
  OutsourcingProductionReportListItem,
  OutsourcingProductionReportListParams,
  OutsourcingProductionReportListResponse,
  OutsourcingProductionReportMeta,
  OutsourcingSubcontractorStat,
} from '../types/outsourcing-production-report';

const { Text } = Typography;

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 20, 50];

const STATUS_COLOR_MAP: Record<OutsourcingOrderStatus, string> = {
  未开始: 'default',
  进行中: 'processing',
  已完成: 'success',
  逾期待收: 'warning',
  待结算: 'blue',
};

const QUANTITY_FORMATTER = new Intl.NumberFormat('zh-CN');
const CURRENCY_FORMATTER = new Intl.NumberFormat('zh-CN', {
  style: 'currency',
  currency: 'CNY',
  minimumFractionDigits: 2,
});
const PERCENT_FORMATTER = new Intl.NumberFormat('zh-CN', {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const formatQuantity = (value: number): string => QUANTITY_FORMATTER.format(value ?? 0);
const formatCurrency = (value: number): string => CURRENCY_FORMATTER.format(value ?? 0);
const formatPercent = (value: number): string => PERCENT_FORMATTER.format(value ?? 0);

type SortField = 'owedQty' | 'completionRate' | 'defectRate';

type SortState = {
  field?: SortField;
  order?: SortOrder;
};

type OrderStatusFilter = OutsourcingOrderStatus | '全部';

const FACTORY_BUTTON_STYLE: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  width: '100%',
  gap: 4,
};

const OutsourcingProductionReport = () => {
  const [meta, setMeta] = useState<OutsourcingProductionReportMeta | null>(null);
  const [stats, setStats] = useState<OutsourcingSubcontractorStat[]>([]);
  const [statsLoading, setStatsLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [records, setRecords] = useState<OutsourcingProductionReportListItem[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [total, setTotal] = useState(0);
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);

  const [subcontractorSearch, setSubcontractorSearch] = useState('');
  const [activeSubcontractor, setActiveSubcontractor] = useState<string | undefined>();
  const [keyword, setKeyword] = useState('');
  const [processType, setProcessType] = useState<string | undefined>();
  const [orderStatus, setOrderStatus] = useState<OrderStatusFilter>('全部');
  const [sortState, setSortState] = useState<SortState>({ field: undefined, order: undefined });

  const [appliedParams, setAppliedParams] = useState<OutsourcingProductionReportListParams>({
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
  });

  useEffect(() => {
    const loadMeta = async () => {
      try {
        const response = await outsourcingProductionReportService.getMeta();
        setMeta(response);
      } catch (error) {
        console.error('failed to load outsourcing production report meta', error);
        message.error('加载筛选项失败');
      }
    };

    void loadMeta();
  }, []);

  useEffect(() => {
    const loadStats = async () => {
      setStatsLoading(true);
      try {
        const response = await outsourcingProductionReportService.getSubcontractorStats();
        setStats(response);
      } catch (error) {
        console.error('failed to load subcontractor stats', error);
        message.error('加载加工厂统计失败');
      } finally {
        setStatsLoading(false);
      }
    };

    void loadStats();
  }, []);

  const loadList = useCallback(async () => {
    setTableLoading(true);
    try {
      const response: OutsourcingProductionReportListResponse =
        await outsourcingProductionReportService.getList(appliedParams);
      setRecords(response.list);
      setTotal(response.total);
    } catch (error) {
      console.error('failed to load outsourcing production report list', error);
      message.error('获取委外生产数据失败');
    } finally {
      setTableLoading(false);
    }
  }, [appliedParams]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const commitParams = (
    overrides: {
      page?: number;
      pageSize?: number;
      subcontractorName?: string | undefined;
      keywordValue?: string;
      processTypeValue?: string | undefined;
      orderStatusValue?: OrderStatusFilter;
      sortField?: SortField;
      sortOrder?: SortOrder;
    } = {},
  ) => {
    const nextPage = overrides.page ?? page;
    const nextPageSize = overrides.pageSize ?? pageSize;
    const nextSubcontractor = overrides.subcontractorName ?? activeSubcontractor;
    const nextKeyword = (overrides.keywordValue ?? keyword).trim();
    const nextProcessType = overrides.processTypeValue ?? processType;
    const nextOrderStatus = overrides.orderStatusValue ?? orderStatus;
    const nextSortField = overrides.sortField !== undefined ? overrides.sortField : sortState.field;
    const nextSortOrder = overrides.sortOrder !== undefined ? overrides.sortOrder : sortState.order;

    const params: OutsourcingProductionReportListParams = {
      page: nextPage,
      pageSize: nextPageSize,
      subcontractorName: nextSubcontractor || undefined,
      keyword: nextKeyword ? nextKeyword : undefined,
      processType: nextProcessType || undefined,
      orderStatus: nextOrderStatus === '全部' ? undefined : nextOrderStatus,
      sortBy: nextSortField,
      order: nextSortOrder,
    };

    setAppliedParams(params);
    setPage(nextPage);
    setPageSize(nextPageSize);
    setSortState({ field: nextSortField, order: nextSortOrder });
  };

  const handleSearch = () => {
    commitParams({ page: 1 });
    setSelectedRowKeys([]);
  };

  const handleReset = () => {
    setSubcontractorSearch('');
    setActiveSubcontractor(undefined);
    setKeyword('');
    setProcessType(undefined);
    setOrderStatus('全部');
    setSortState({ field: undefined, order: undefined });
    setAppliedParams({ page: 1, pageSize: DEFAULT_PAGE_SIZE });
    setPage(1);
    setPageSize(DEFAULT_PAGE_SIZE);
    setSelectedRowKeys([]);
  };

  const handleRefreshStats = async () => {
    setStatsLoading(true);
    try {
      const response = await outsourcingProductionReportService.getSubcontractorStats();
      setStats(response);
      message.success('加工厂在产数据已刷新');
    } catch (error) {
      console.error('failed to reload subcontractor stats', error);
      message.error('刷新加工厂数据失败');
    } finally {
      setStatsLoading(false);
    }
  };

  const handleSelectSubcontractor = (name?: string) => {
    const nextActive = name === activeSubcontractor ? undefined : name;
    setActiveSubcontractor(nextActive);
    setSelectedRowKeys([]);
    commitParams({ page: 1, subcontractorName: nextActive });
  };

  const handlePrint = async () => {
    if (!selectedRowKeys.length) {
      message.warning('请选择需要打印的记录');
      return;
    }
    try {
      await outsourcingProductionReportService.print(selectedRowKeys as string[]);
      message.success('已生成打印任务，请稍后查看结果');
    } catch (error) {
      console.error('failed to submit print task', error);
      message.error('打印任务提交失败，请稍后重试');
    }
  };

  const handleExport = async () => {
    try {
      await outsourcingProductionReportService.export(appliedParams);
      message.success('已生成导出任务，请稍后在下载中心查看');
    } catch (error) {
      console.error('failed to export outsourcing production report', error);
      message.error('导出失败，请稍后重试');
    }
  };

  const handleTableChange = (
    pagination: TablePaginationConfig,
    _filters: Record<string, unknown>,
    sorter: SorterResult<OutsourcingProductionReportListItem> | SorterResult<OutsourcingProductionReportListItem>[],
  ) => {
    const current = pagination.current ?? 1;
    const size = pagination.pageSize ?? pageSize;

    if (!Array.isArray(sorter) && sorter.field) {
      const candidate = sorter.field as string;
      const enabledFields: SortField[] = ['owedQty', 'completionRate', 'defectRate'];
      if (enabledFields.includes(candidate as SortField)) {
        const field = candidate as SortField;
        const order = sorter.order ?? undefined;
        commitParams({
          page: current,
          pageSize: size,
          sortField: order ? field : undefined,
          sortOrder: order ?? undefined,
        });
        return;
      }
    }

    commitParams({ page: current, pageSize: size, sortField: undefined, sortOrder: undefined });
  };

  const filteredStats = useMemo(() => {
    const trimmed = subcontractorSearch.trim();
    if (!trimmed) {
      return stats;
    }
    return stats.filter((item) => item.name.toLowerCase().includes(trimmed.toLowerCase()));
  }, [stats, subcontractorSearch]);

  const columns: ColumnsType<OutsourcingProductionReportListItem> = useMemo(() => {
    const sortOrderFor = (field: SortField): SortOrder | undefined =>
      sortState.field === field ? sortState.order : undefined;

    return [
      {
        title: '订单状态',
        dataIndex: 'orderStatus',
        width: 120,
        render: (value: OutsourcingOrderStatus) => <Tag color={STATUS_COLOR_MAP[value] ?? 'default'}>{value}</Tag>,
      },
      {
        title: '订单信息',
        dataIndex: 'orderInfo',
        render: (value) => (
          <Space>
            <Avatar shape="square" size={48} src={value.imageUrl}>
              {value.styleName.slice(0, 1)}
            </Avatar>
            <Space direction="vertical" size={0}>
              <Text strong>{value.styleName}</Text>
              <Text type="secondary">订单号：{value.orderNumber}</Text>
              <Text type="secondary">下单量：{formatQuantity(value.quantity)}</Text>
            </Space>
          </Space>
        ),
        width: 320,
      },
      {
        title: '加工类型',
        dataIndex: 'processType',
        width: 160,
        render: (_: string, record) => (
          <Space direction="vertical" size={0}>
            <Text strong>{record.processType}</Text>
            <Text type="secondary">单价：{formatCurrency(record.processPrice)}</Text>
          </Space>
        ),
      },
      {
        title: '加工厂',
        dataIndex: 'subcontractor',
        width: 160,
      },
      {
        title: '发货日期',
        dataIndex: 'dispatchDate',
        width: 140,
      },
      {
        title: '预计交货',
        dataIndex: 'expectedDelivery',
        width: 140,
        render: (value?: string | null) => value ?? '-',
      },
      {
        title: '加工厂报数',
        dataIndex: 'reportedQty',
        width: 140,
        align: 'right',
        render: (value: number) => formatQuantity(value),
      },
      {
        title: '加工厂发货',
        dataIndex: 'shippedQty',
        width: 140,
        align: 'right',
        render: (value: number) => formatQuantity(value),
      },
      {
        title: '按期收货',
        dataIndex: 'onTimeReceived',
        width: 140,
        align: 'right',
        render: (value: number) => formatQuantity(value),
      },
      {
        title: '逾期收货',
        dataIndex: 'overdueReceived',
        width: 140,
        align: 'right',
        render: (value: number) => formatQuantity(value),
      },
      {
        title: '收货数量',
        dataIndex: 'totalReceived',
        width: 140,
        align: 'right',
        render: (value: number) => formatQuantity(value),
      },
      {
        title: '实收数',
        dataIndex: 'actualReceived',
        width: 140,
        align: 'right',
        render: (value: number) => formatQuantity(value),
      },
      {
        title: '欠数',
        dataIndex: 'owedQty',
        width: 120,
        align: 'right',
        sorter: true,
        sortOrder: sortOrderFor('owedQty'),
        render: (value: number) => formatQuantity(value),
      },
      {
        title: '完成率',
        dataIndex: 'completionRate',
        width: 130,
        align: 'right',
        sorter: true,
        sortOrder: sortOrderFor('completionRate'),
        render: (value: number) => formatPercent(value),
      },
      {
        title: '返工数量',
        dataIndex: 'reworkQty',
        width: 130,
        align: 'right',
        render: (value: number) => formatQuantity(value),
      },
      {
        title: '返工率',
        dataIndex: 'reworkRate',
        width: 120,
        align: 'right',
        render: (value: number) => formatPercent(value),
      },
      {
        title: '次品数量',
        dataIndex: 'defectQty',
        width: 130,
        align: 'right',
        render: (value: number) => formatQuantity(value),
      },
      {
        title: '次品率',
        dataIndex: 'defectRate',
        width: 120,
        align: 'right',
        sorter: true,
        sortOrder: sortOrderFor('defectRate'),
        render: (value: number) => formatPercent(value),
      },
    ];
  }, [sortState]);

  return (
    <Card title="委外生产表">
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <div
          style={{
            display: 'flex',
            gap: 12,
            alignItems: 'center',
            flexWrap: 'wrap',
            padding: '4px 0',
          }}
        >
          <Input
            allowClear
            placeholder="输入加工厂名称"
            prefix={<SearchOutlined />}
            style={{ width: 220 }}
            value={subcontractorSearch}
            onChange={(event) => setSubcontractorSearch(event.target.value)}
          />
          <Input
            allowClear
            placeholder="请输入订单号/款号/款名"
            style={{ width: 260 }}
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
          />
          <Select<string>
            allowClear
            placeholder="加工类型"
            style={{ width: 200 }}
            value={processType}
            onChange={(value) => {
              setProcessType(value ?? undefined);
            }}
            options={meta?.processTypes.map((value) => ({ value, label: value }))}
          />
          <Select<OrderStatusFilter>
            placeholder="订单状态"
            style={{ width: 200 }}
            value={orderStatus}
            onChange={(value) => setOrderStatus(value)}
            options={[
              { value: '全部', label: '全部' },
              ...(meta?.orderStatuses ?? []).map((value) => ({ value, label: value })),
            ]}
          />
          <Button icon={<FilterOutlined />} type="primary" onClick={handleSearch}>
            筛选
          </Button>
          <Button onClick={handleReset}>重置</Button>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 12 }}>
            <Button icon={<PrinterOutlined />} disabled={!selectedRowKeys.length} onClick={handlePrint}>
              打印
            </Button>
            <Button icon={<DownloadOutlined />} onClick={handleExport}>
              导出Excel
            </Button>
          </div>
        </div>

        <Row gutter={16} wrap={false} style={{ minHeight: 520 }}>
          <Col flex="260px">
            <Card
              size="small"
              bodyStyle={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}
              style={{ height: '100%' }}
            >
              <Button
                block
                icon={<FilterOutlined />}
                type={activeSubcontractor ? 'default' : 'primary'}
                onClick={() => handleSelectSubcontractor(undefined)}
                style={{ justifyContent: 'flex-start' }}
              >
                全部
              </Button>
              <div
                style={{
                  flex: 1,
                  overflow: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  width: '100%',
                }}
              >
                {filteredStats.map((item) => {
                  const isActive = activeSubcontractor === item.name;
                  return (
                    <Button
                      key={item.name}
                      block
                      type={isActive ? 'primary' : 'default'}
                      onClick={() => handleSelectSubcontractor(item.name)}
                      style={{ justifyContent: 'flex-start', height: 'auto', padding: '8px 12px' }}
                    >
                      <div style={{ ...FACTORY_BUTTON_STYLE, color: isActive ? '#fff' : undefined }}>
                        <span style={{ fontWeight: 600 }}>{item.name}</span>
                        <span style={{ fontSize: 12 }}>在产数：{formatQuantity(item.wip)}</span>
                      </div>
                    </Button>
                  );
                })}
                {!filteredStats.length && <Text type="secondary">未找到匹配的加工厂</Text>}
              </div>
              <Button icon={<ReloadOutlined />} loading={statsLoading} onClick={() => void handleRefreshStats()}>
                刷新数据
              </Button>
            </Card>
          </Col>
          <Col flex="auto">
            <Card bordered={false} bodyStyle={{ padding: 0 }} style={{ height: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Space direction="vertical" size={0}>
                  <Text strong>{activeSubcontractor ? `${activeSubcontractor} 委外生产数据` : '全部加工厂委外生产数据'}</Text>
                  <Text type="secondary">共 {total} 条记录</Text>
                </Space>
              </div>

              <Table<OutsourcingProductionReportListItem>
                rowKey="id"
                bordered
                scroll={{ x: 1700 }}
                loading={tableLoading}
                dataSource={records}
                columns={columns}
                rowSelection={{
                  selectedRowKeys,
                  onChange: (keys) => setSelectedRowKeys(keys),
                }}
                pagination={{
                  current: page,
                  pageSize,
                  total,
                  showSizeChanger: true,
                  pageSizeOptions: PAGE_SIZE_OPTIONS.map(String),
                  showTotal: (value) => `共 ${value} 条`,
                }}
                onChange={handleTableChange}
              />
            </Card>
          </Col>
        </Row>
      </Space>
    </Card>
  );
};

export default OutsourcingProductionReport;
