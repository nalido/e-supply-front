import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import {
  Badge,
  Button,
  Card,
  Col,
  DatePicker,
  Dropdown,
  Input,
  List,
  message,
  Popconfirm,
  Row,
  Segmented,
  Space,
  Statistic,
  Table,
  Tag,
  Tooltip,
  Typography,
  Select,
} from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import type { MenuProps } from 'antd';
import {
  AppstoreOutlined,
  CopyOutlined,
  DeleteOutlined,
  EditOutlined,
  EllipsisOutlined,
  EyeOutlined,
  ExportOutlined,
  PictureOutlined,
  PlusOutlined,
  ReloadOutlined,
  ShoppingCartOutlined,
  TableOutlined,
} from '@ant-design/icons';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import type { SampleOrder, SampleQueryParams, SampleStats, SampleStatus } from '../types/sample';
import { SampleStatus as SampleStatusEnum } from '../types/sample';
import { sampleService } from '../api/mock';

const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { Text } = Typography;

type ViewMode = 'card' | 'table';
type StatCardKey = 'total' | 'pending' | 'confirmed' | 'producing' | 'completed' | 'cancelled' | 'thisMonth' | 'urgent';

type SampleListFilters = {
  keyword: string;
  status?: SampleStatus;
  customer?: string;
  priority?: SampleOrder['priority'];
  dateRange?: [Dayjs, Dayjs];
};

const STATUS_TO_CARD: Record<SampleStatus, StatCardKey> = {
  [SampleStatusEnum.PENDING]: 'pending',
  [SampleStatusEnum.CONFIRMED]: 'confirmed',
  [SampleStatusEnum.PRODUCING]: 'producing',
  [SampleStatusEnum.COMPLETED]: 'completed',
  [SampleStatusEnum.CANCELLED]: 'cancelled',
};

type StatCardConfig = {
  key: StatCardKey;
  title: string;
  valueKey: keyof SampleStats;
  color: string;
  apply: (prev: SampleListFilters) => SampleListFilters;
  description?: string;
};

const getCurrentMonthRange = (): [Dayjs, Dayjs] => [dayjs().startOf('month'), dayjs().endOf('month')];

const STAT_CARD_LIST: StatCardConfig[] = [
  {
    key: 'total',
    title: '总计',
    valueKey: 'total',
    color: '#1677ff',
    apply: (prev) => ({
      ...prev,
      status: undefined,
      priority: undefined,
      dateRange: undefined,
    }),
  },
  {
    key: 'pending',
    title: '待确认',
    valueKey: 'pending',
    color: '#fa8c16',
    apply: (prev) => ({
      ...prev,
      status: SampleStatusEnum.PENDING,
      priority: undefined,
      dateRange: undefined,
    }),
  },
  {
    key: 'confirmed',
    title: '已确认',
    valueKey: 'confirmed',
    color: '#1890ff',
    apply: (prev) => ({
      ...prev,
      status: SampleStatusEnum.CONFIRMED,
      priority: undefined,
      dateRange: undefined,
    }),
  },
  {
    key: 'producing',
    title: '生产中',
    valueKey: 'producing',
    color: '#722ed1',
    apply: (prev) => ({
      ...prev,
      status: SampleStatusEnum.PRODUCING,
      priority: undefined,
      dateRange: undefined,
    }),
  },
  {
    key: 'completed',
    title: '已完成',
    valueKey: 'completed',
    color: '#52c41a',
    apply: (prev) => ({
      ...prev,
      status: SampleStatusEnum.COMPLETED,
      priority: undefined,
      dateRange: undefined,
    }),
  },
  {
    key: 'cancelled',
    title: '已取消',
    valueKey: 'cancelled',
    color: '#ff4d4f',
    apply: (prev) => ({
      ...prev,
      status: SampleStatusEnum.CANCELLED,
      priority: undefined,
      dateRange: undefined,
    }),
  },
  {
    key: 'thisMonth',
    title: '本月新增',
    valueKey: 'thisMonth',
    color: '#13c2c2',
    apply: (prev) => ({
      ...prev,
      status: undefined,
      priority: undefined,
      dateRange: getCurrentMonthRange(),
    }),
  },
  {
    key: 'urgent',
    title: '紧急',
    valueKey: 'urgent',
    color: '#f5222d',
    apply: (prev) => ({
      ...prev,
      status: undefined,
      priority: 'urgent',
      dateRange: undefined,
    }),
  },
];

const STAT_CARD_MAP = STAT_CARD_LIST.reduce<Record<StatCardKey, StatCardConfig>>((acc, card) => {
  acc[card.key] = card;
  return acc;
}, {} as Record<StatCardKey, StatCardConfig>);

const CARD_LAYOUT_STYLE: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
};

const CARD_MEDIA_STYLE: CSSProperties = {
  position: 'relative',
  width: '100%',
  paddingTop: '100%',
  borderRadius: 12,
  background: 'linear-gradient(135deg, #f5f7ff 0%, #f0f3ff 100%)',
  overflow: 'hidden',
};

const CARD_IMAGE_STYLE: CSSProperties = {
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  objectFit: 'cover',
};

const CARD_PLACEHOLDER_STYLE: CSSProperties = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  color: '#bfbfbf',
};

const CARD_INFO_STYLE: CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
};

const CARD_HEADER_STYLE: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: 12,
};

const CARD_META_GRID_STYLE: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
  gap: 12,
};

const CARD_FOOTER_STYLE: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginTop: 8,
};

const INFO_ROW_STYLE: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  minWidth: 0,
};

const INFO_LABEL_STYLE: CSSProperties = {
  color: '#8c8c8c',
  fontSize: 12,
  flexShrink: 0,
};

const INFO_VALUE_STYLE: CSSProperties = {
  fontSize: 13,
  color: '#1f1f1f',
  fontWeight: 500,
  flex: 1,
  minWidth: 0,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  display: 'block',
};

const CARD_LIST_GRID = {
  gutter: 16,
  xs: 1,
  sm: 2,
  md: 2,
  lg: 3,
  xl: 3,
  xxl: 4,
};

const isCurrentMonthRange = (range?: [Dayjs, Dayjs]): boolean => {
  if (!range) {
    return false;
  }
  const [expectedStart, expectedEnd] = getCurrentMonthRange();
  return range[0].isSame(expectedStart, 'day') && range[1].isSame(expectedEnd, 'day');
};

const SampleList: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('card');
  const [filters, setFilters] = useState<SampleListFilters>({
    keyword: '',
    status: undefined,
    customer: undefined,
    priority: undefined,
    dateRange: undefined,
  });
  const [activeCardKey, setActiveCardKey] = useState<StatCardKey | null>('total');
  const [dataSource, setDataSource] = useState<SampleOrder[]>([]);
  const [stats, setStats] = useState<SampleStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [pagination, setPagination] = useState<TablePaginationConfig>({
    current: 1,
    pageSize: 12,
    total: 0,
    showSizeChanger: true,
    showQuickJumper: true,
    pageSizeOptions: ['12', '24', '48', '96'],
    showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
  });

  const sampleOptions = useMemo(() => sampleService.getSampleFilterOptions(), []);

  const currentPage = pagination.current ?? 1;
  const currentPageSize = pagination.pageSize ?? 12;

  const resolveActiveKey = useCallback((nextFilters: SampleListFilters): StatCardKey | null => {
    if (nextFilters.status) {
      return STATUS_TO_CARD[nextFilters.status];
    }
    if (nextFilters.priority === 'urgent') {
      return 'urgent';
    }
    if (nextFilters.dateRange) {
      return isCurrentMonthRange(nextFilters.dateRange) ? 'thisMonth' : null;
    }
    return 'total';
  }, []);

  const buildQueryParams = useCallback((overrides: Partial<SampleQueryParams> = {}): SampleQueryParams => {
    const base: SampleQueryParams = {
      keyword: filters.keyword || undefined,
      status: filters.status,
      customer: filters.customer,
      priority: filters.priority,
      startDate: filters.dateRange ? filters.dateRange[0].format('YYYY-MM-DD') : undefined,
      endDate: filters.dateRange ? filters.dateRange[1].format('YYYY-MM-DD') : undefined,
    };
    return { ...base, ...overrides };
  }, [filters]);

  const loadStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const result = await sampleService.getSampleStats(buildQueryParams({ status: undefined }));
      setStats(result);
    } catch {
      message.error('加载统计数据失败');
    } finally {
      setStatsLoading(false);
    }
  }, [buildQueryParams]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const result = await sampleService.getSampleOrders(buildQueryParams({
        page: currentPage,
        pageSize: currentPageSize,
      }));
      setDataSource(result.list);
      setPagination((prev) => ({
        ...prev,
        total: result.total,
        current: result.page,
        pageSize: result.pageSize,
      }));
    } catch {
      message.error('加载样板单失败');
    } finally {
      setLoading(false);
    }
  }, [buildQueryParams, currentPage, currentPageSize]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleSearch = useCallback((value: string) => {
    const keyword = value.trim();
    setFilters((prev) => {
      const next = { ...prev, keyword };
      setActiveCardKey(resolveActiveKey(next));
      return next;
    });
    setPagination((prev) => ({ ...prev, current: 1 }));
  }, [resolveActiveKey]);

  const handleFilterChange = useCallback(<K extends keyof SampleListFilters>(key: K, value: SampleListFilters[K]) => {
    setFilters((prev) => {
      const next = { ...prev, [key]: value };
      setActiveCardKey(resolveActiveKey(next));
      return next;
    });
    setPagination((prev) => ({ ...prev, current: 1 }));
  }, [resolveActiveKey]);

  const handleRangeChange = useCallback((dates: null | [Dayjs | null, Dayjs | null]) => {
    if (dates && dates[0] && dates[1]) {
      handleFilterChange('dateRange', [dates[0], dates[1]]);
    } else {
      handleFilterChange('dateRange', undefined);
    }
  }, [handleFilterChange]);

  const handleReset = useCallback(() => {
    setFilters({
      keyword: '',
      status: undefined,
      customer: undefined,
      priority: undefined,
      dateRange: undefined,
    });
    setActiveCardKey('total');
    setPagination((prev) => ({ ...prev, current: 1 }));
  }, []);

  const handleViewModeChange = useCallback((value: string | number) => {
    setViewMode(value as ViewMode);
  }, []);

  const handleStatCardSelect = useCallback((key: StatCardKey) => {
    const card = STAT_CARD_MAP[key];
    if (!card) {
      return;
    }
    setFilters((prev) => {
      const next = card.apply(prev);
      setActiveCardKey(key);
      return next;
    });
    setPagination((prev) => ({ ...prev, current: 1 }));
  }, []);

  const handlePaginationChange = useCallback((page: number, pageSize?: number) => {
    setPagination((prev) => ({
      ...prev,
      current: page,
      pageSize: pageSize ?? prev.pageSize,
    }));
  }, []);

  const handleTableChange = useCallback((pager: TablePaginationConfig) => {
    setPagination((prev) => ({
      ...prev,
      current: pager.current ?? 1,
      pageSize: pager.pageSize ?? prev.pageSize,
    }));
  }, []);

  const handleCreate = useCallback(() => {
    message.info('新建样板单');
  }, []);

  const handleExport = useCallback(() => {
    message.info('导出样板单列表');
  }, []);

  const handleRefresh = useCallback(() => {
    void loadStats();
    void loadData();
  }, [loadData, loadStats]);

  const handleView = useCallback((order: SampleOrder) => {
    message.info(`查看样板单：${order.orderNo}`);
  }, []);

  const handleEdit = useCallback((order: SampleOrder) => {
    message.info(`编辑样板单：${order.orderNo}`);
  }, []);

  const handleCopy = useCallback((order: SampleOrder) => {
    message.success(`已复制样板单 ${order.orderNo}`);
  }, []);

  const handleBulkOrder = useCallback((order: SampleOrder) => {
    message.success(`已发起大货订单：${order.orderNo}`);
  }, []);

  const handleDelete = useCallback((order: SampleOrder) => {
    message.success(`已删除样板单：${order.orderNo}`);
  }, []);

  const columns = useMemo<ColumnsType<SampleOrder>>(() => [
    {
      title: '样板单号',
      dataIndex: 'orderNo',
      key: 'orderNo',
      fixed: 'left',
      width: 140,
      render: (_value, record) => (
        <Button type="link" size="small" onClick={() => handleView(record)}>
          {record.orderNo}
        </Button>
      ),
    },
    {
      title: '图片',
      dataIndex: 'images',
      key: 'images',
      width: 90,
      render: (_value, record) => (
        record.images?.[0] ? (
          <img
            src={record.images[0]}
            alt={record.styleName}
            style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 6 }}
          />
        ) : (
          <div style={{
            width: 56,
            height: 56,
            borderRadius: 6,
            backgroundColor: '#f5f5f5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#bfbfbf',
          }}
          >
            <PictureOutlined />
          </div>
        )
      ),
    },
    {
      title: '款式信息',
      dataIndex: 'styleName',
      key: 'styleInfo',
      width: 260,
      render: (_value, record) => (
        <div>
          <div style={{ fontWeight: 500 }}>{record.styleName}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            款号：{record.styleCode}
          </Text>
          <div style={{ marginTop: 4, fontSize: 12, color: '#595959' }}>
            品类：{record.category} / 面料：{record.fabric} / 颜色：{record.color} / 尺码：{record.size}
          </div>
        </div>
      ),
    },
    {
      title: '客户',
      dataIndex: 'customer',
      key: 'customer',
      width: 140,
    },
    {
      title: '数量',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 90,
      align: 'right',
      render: (value: number) => `${value} 件`,
    },
    {
      title: '单价',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      width: 100,
      align: 'right',
      render: (value: number) => `¥${value.toFixed(2)}`,
    },
    {
      title: '总金额',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      width: 110,
      align: 'right',
      render: (value: number) => (
        <span style={{ fontWeight: 500 }}>¥{value.toFixed(2)}</span>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (status: SampleStatus) => (
        <Tag color={sampleService.getStatusBadgeColor(status)}>
          {sampleService.getStatusLabel(status)}
        </Tag>
      ),
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 90,
      render: (priority: SampleOrder['priority']) => (
        <Tag color={sampleService.getPriorityBadgeColor(priority)}>
          {sampleService.getPriorityLabel(priority)}
        </Tag>
      ),
    },
    {
      title: '交期',
      dataIndex: 'deadline',
      key: 'deadline',
      width: 120,
      render: (value: string) => {
        const due = dayjs(value);
        const overdue = due.isBefore(dayjs(), 'day');
        return (
          <span style={{ color: overdue ? '#f5222d' : undefined }}>
            {due.format('YYYY-MM-DD')}
            {overdue && <Badge status="error" style={{ marginLeft: 4 }} />}
          </span>
        );
      },
    },
    {
      title: '设计师',
      dataIndex: 'designer',
      key: 'designer',
      width: 110,
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      key: 'createTime',
      width: 120,
      render: (value: string) => dayjs(value).format('YYYY-MM-DD'),
    },
    {
      title: '操作',
      key: 'actions',
      fixed: 'right',
      width: 150,
      render: (_value, record) => (
        <Space size="middle">
          <Tooltip title="查看">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handleView(record)}
            />
          </Tooltip>
          <Tooltip title="编辑">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Popconfirm
            title="确认删除该样板单？"
            onConfirm={() => handleDelete(record)}
            okText="删除"
            cancelText="取消"
          >
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ], [handleDelete, handleEdit, handleView]);

  const viewOptions = useMemo(() => [
    { label: <span><AppstoreOutlined /> 卡片</span>, value: 'card' },
    { label: <span><TableOutlined /> 列表</span>, value: 'table' },
  ], []);

  const renderCard = useCallback((order: SampleOrder) => {
    const overdue = dayjs(order.deadline).isBefore(dayjs(), 'day');
    const menu: MenuProps = {
      items: [
        { key: 'view', label: '查看详情' },
        { key: 'edit', label: '编辑' },
        { key: 'delete', label: <span style={{ color: '#ff4d4f' }}>删除</span> },
      ],
      onClick: ({ key }) => {
        if (key === 'view') {
          handleView(order);
        } else if (key === 'edit') {
          handleEdit(order);
        } else if (key === 'delete') {
          handleDelete(order);
        }
      },
    };

    return (
      <Card hoverable bodyStyle={{ padding: 16 }}>
        <div style={CARD_LAYOUT_STYLE}>
          <div style={CARD_MEDIA_STYLE}>
            {order.images?.[0] ? (
              <img
                src={order.images[0]}
                alt={order.styleName}
                style={CARD_IMAGE_STYLE}
              />
            ) : (
              <div style={CARD_PLACEHOLDER_STYLE}>
                <PictureOutlined style={{ fontSize: 64, color: '#bfbfbf' }} />
              </div>
            )}
          </div>
          <div style={CARD_INFO_STYLE}>
            <div style={CARD_HEADER_STYLE}>
              <div>
                <Typography.Title level={5} style={{ marginBottom: 4 }}>
                  {order.styleName}
                </Typography.Title>
                <Text type="secondary">款号：{order.styleCode}</Text>
              </div>
              <Space size={6}>
                <Tag color={sampleService.getStatusBadgeColor(order.status)}>
                  {sampleService.getStatusLabel(order.status)}
                </Tag>
                <Tag color={sampleService.getPriorityBadgeColor(order.priority)}>
                  {sampleService.getPriorityLabel(order.priority)}
                </Tag>
              </Space>
            </div>
            <div style={CARD_META_GRID_STYLE}>
              <div style={INFO_ROW_STYLE}>
                <span style={INFO_LABEL_STYLE}>样板单号</span>
                <span style={INFO_VALUE_STYLE}>{order.orderNo}</span>
              </div>
              <div style={INFO_ROW_STYLE}>
                <span style={INFO_LABEL_STYLE}>客户</span>
                <span style={INFO_VALUE_STYLE}>{order.customer}</span>
              </div>
              <div style={{ ...INFO_ROW_STYLE, justifyContent: 'space-between' }}>
                <div style={{ ...INFO_ROW_STYLE, flex: 1 }}>
                  <span style={INFO_LABEL_STYLE}>下单日期</span>
                  <span style={INFO_VALUE_STYLE}>{dayjs(order.createTime).format('YYYY-MM-DD')}</span>
                </div>
                <div style={{ ...INFO_ROW_STYLE, flexShrink: 0 }}>
                  <span style={{ ...INFO_VALUE_STYLE, fontWeight: 600 }}>{order.quantity}</span>
                </div>
              </div>
              <div style={INFO_ROW_STYLE}>
                <span style={INFO_LABEL_STYLE}>交期</span>
                <span style={{ ...INFO_VALUE_STYLE, color: overdue ? '#f5222d' : INFO_VALUE_STYLE.color }}>
                  {dayjs(order.deadline).format('YYYY-MM-DD')}
                  {overdue && <Badge status="error" style={{ marginLeft: 4 }} />}
                </span>
              </div>
            </div>
            <div style={CARD_FOOTER_STYLE}>
              <Space>
                <Button
                  type="primary"
                  size="small"
                  icon={<ShoppingCartOutlined />}
                  onClick={() => handleBulkOrder(order)}
                >
                  下大货
                </Button>
                <Button
                  size="small"
                  icon={<CopyOutlined />}
                  onClick={() => handleCopy(order)}
                >
                  复制
                </Button>
              </Space>
              <Dropdown menu={menu} trigger={['click']} placement="bottomRight">
                <Button size="small" icon={<EllipsisOutlined />} />
              </Dropdown>
            </div>
          </div>
        </div>
      </Card>
    );
  }, [handleBulkOrder, handleCopy, handleDelete, handleEdit, handleView]);

  return (
    <div style={{ padding: '0 24px 24px' }}>
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {STAT_CARD_LIST.map((card) => (
          <Col key={card.key} xs={12} sm={8} md={6} xl={3}>
            <Card
              hoverable
              loading={statsLoading}
              onClick={() => handleStatCardSelect(card.key)}
              bodyStyle={{ padding: 16 }}
              style={{
                borderColor: activeCardKey === card.key ? '#1677ff' : undefined,
                boxShadow: activeCardKey === card.key ? '0 0 0 2px rgba(22,119,255,0.12)' : undefined,
                cursor: 'pointer',
              }}
            >
              <Statistic
                title={card.title}
                value={stats?.[card.valueKey] ?? 0}
                valueStyle={{ color: card.color, fontWeight: 600 }}
                suffix="单"
              />
            </Card>
          </Col>
        ))}
      </Row>

      <Card>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap',
            alignItems: 'flex-end',
          }}
        >
          <Space size={12} wrap>
            <Search
              allowClear
              placeholder="搜索样板单号、款式名称、客户..."
              onSearch={handleSearch}
              style={{ width: 240 }}
              enterButton
            />
            <Select
              allowClear
              placeholder="状态"
              value={filters.status}
              style={{ width: 140 }}
              onChange={(value) => handleFilterChange('status', value as SampleStatus | undefined)}
            >
              <Option value={SampleStatusEnum.PENDING}>待确认</Option>
              <Option value={SampleStatusEnum.CONFIRMED}>已确认</Option>
              <Option value={SampleStatusEnum.PRODUCING}>生产中</Option>
              <Option value={SampleStatusEnum.COMPLETED}>已完成</Option>
              <Option value={SampleStatusEnum.CANCELLED}>已取消</Option>
            </Select>
            <Select
              allowClear
              showSearch
              placeholder="客户"
              value={filters.customer}
              style={{ width: 160 }}
              onChange={(value) => handleFilterChange('customer', value || undefined)}
              filterOption={(input, option) =>
                (option?.value as string)?.toLowerCase().includes(input.toLowerCase())
              }
            >
              {sampleOptions.customers.map((customer) => (
                <Option key={customer} value={customer}>
                  {customer}
                </Option>
              ))}
            </Select>
            <RangePicker
              value={filters.dateRange ?? null}
              onChange={handleRangeChange}
            />
            <Button onClick={handleReset}>
              重置
            </Button>
          </Space>

          <Space size={12} wrap>
            <Segmented options={viewOptions} value={viewMode} onChange={handleViewModeChange} />
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
              新建样板单
            </Button>
            <Button icon={<ExportOutlined />} onClick={handleExport}>
              导出
            </Button>
            <Button icon={<ReloadOutlined />} onClick={handleRefresh}>
              刷新
            </Button>
          </Space>
        </div>

        <div style={{ marginTop: 24 }}>
          {viewMode === 'card' ? (
            <List
              rowKey="id"
              grid={CARD_LIST_GRID}
              loading={loading}
              dataSource={dataSource}
              renderItem={(item) => (
                <List.Item>
                  {renderCard(item)}
                </List.Item>
              )}
              pagination={{
                ...pagination,
                onChange: handlePaginationChange,
                onShowSizeChange: handlePaginationChange,
              }}
              locale={{ emptyText: '暂无样板单数据' }}
            />
          ) : (
            <Table<SampleOrder>
              rowKey="id"
              columns={columns}
              dataSource={dataSource}
              loading={loading}
              scroll={{ x: 1200 }}
              pagination={pagination}
              onChange={handleTableChange}
            />
          )}
        </div>
      </Card>
    </div>
  );
};

export default SampleList;
