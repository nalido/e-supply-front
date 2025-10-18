import { useEffect, useMemo, useState } from 'react';
import type { ColumnsType } from 'antd/es/table';
import type { ProgressProps } from 'antd/es/progress';
import {
  Button,
  Checkbox,
  Empty,
  Input,
  Pagination,
  Progress,
  Segmented,
  Select,
  Skeleton,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from 'antd';
import {
  DownloadOutlined,
  ImportOutlined,
  InfoCircleOutlined,
  PlusOutlined,
  SearchOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { CheckboxChangeEvent } from 'antd/es/checkbox';
import type {
  FactoryOrderDataset,
  FactoryOrderMetric,
  FactoryOrderProgress,
  FactoryOrderStatusSummary,
  FactoryOrderTableRow,
} from '../types';
import { fetchFactoryOrdersDataset } from '../mock';
import '../styles/factory-orders.css';

type ViewMode = 'card' | 'table';

const initialDataset: FactoryOrderDataset = {
  metrics: [],
  orders: [],
  table: [],
  statusTabs: [],
};

const sortOptions = [
  { label: '预计交货（近 → 远）', value: 'delivery-asc' },
  { label: '预计交货（远 → 近）', value: 'delivery-desc' },
  { label: '下单时间（新 → 旧）', value: 'order-desc' },
  { label: '下单时间（旧 → 新）', value: 'order-asc' },
];

const statusColorMap: Record<NonNullable<FactoryOrderProgress['status']>, string> = {
  default: '#d9d9d9',
  success: '#52c41a',
  warning: '#fa8c16',
  danger: '#ff4d4f',
};

const progressStatusLabel: Record<NonNullable<FactoryOrderProgress['status']>, ProgressProps['status']> = {
  default: 'normal',
  success: 'success',
  warning: 'active',
  danger: 'exception',
};

const normalizeKeyword = (keyword: string) => keyword.trim().toLowerCase();

const getDateValue = (value?: string) => {
  if (!value) return Number.POSITIVE_INFINITY;
  const parsed = dayjs(value, 'YYYY-MM-DD', true);
  if (!parsed.isValid()) {
    return Number.POSITIVE_INFINITY;
  }
  return parsed.valueOf();
};

const getMaterialTagColor = (status: string) => {
  if (status.includes('未采购')) return 'volcano';
  if (status.includes('采购中')) return 'orange';
  if (status.includes('已入仓') || status.includes('齐备')) return 'green';
  return 'default';
};

const filterByKeyword = <T extends { code?: string; name?: string; customer?: string }>(records: T[], keyword: string) => {
  if (!keyword) return records;
  const normalized = normalizeKeyword(keyword);
  return records.filter((record) =>
    [record.code, record.name, record.customer]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(normalized)),
  );
};

const filterTableByKeyword = (records: FactoryOrderTableRow[], keyword: string) => {
  if (!keyword) return records;
  const normalized = normalizeKeyword(keyword);
  return records.filter((record) =>
    [
      record.orderCode,
      record.styleCode,
      record.styleName,
      record.customer,
      record.merchandiser,
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(normalized)),
  );
};

const { Paragraph, Text } = Typography;

const FactoryOrders = () => {
  const [dataset, setDataset] = useState<FactoryOrderDataset>(initialDataset);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [includeCompleted, setIncludeCompleted] = useState(false);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [activeStatus, setActiveStatus] = useState('pending');
  const [sortKey, setSortKey] = useState(sortOptions[0].value);
  const [viewMode, setViewMode] = useState<ViewMode>('card');
  const [cardPage, setCardPage] = useState(1);
  const [cardPageSize, setCardPageSize] = useState(6);

  useEffect(() => {
    setLoading(true);
    fetchFactoryOrdersDataset().then((data) => {
      setDataset(data);
      setSelectedOrderIds([]);
      if (data.statusTabs.length > 0) {
        setActiveStatus((prev) => (data.statusTabs.some((tab) => tab.key === prev) ? prev : data.statusTabs[0].key));
      }
    }).finally(() => {
      setLoading(false);
    });
  }, []);

  const allowCompleted = includeCompleted || activeStatus === 'completed';

  const sortedCardOrders = useMemo(() => {
    const filteredStatus = dataset.orders.filter((order) => {
      const matchStatus = activeStatus === 'all' ? true : order.statusKey === activeStatus;
      const matchCompletion = allowCompleted || !order.isCompleted;
      return matchStatus && matchCompletion;
    });
    const filteredKeyword = filterByKeyword(filteredStatus, keyword);

    const sorted = [...filteredKeyword];
    sorted.sort((a, b) => {
      if (sortKey === 'delivery-asc') {
        return getDateValue(a.expectedDelivery) - getDateValue(b.expectedDelivery);
      }
      if (sortKey === 'delivery-desc') {
        return getDateValue(b.expectedDelivery) - getDateValue(a.expectedDelivery);
      }
      if (sortKey === 'order-desc') {
        return getDateValue(b.orderDate) - getDateValue(a.orderDate);
      }
      return getDateValue(a.orderDate) - getDateValue(b.orderDate);
    });
    return sorted;
  }, [dataset.orders, activeStatus, allowCompleted, keyword, sortKey]);

  const sortedTableOrders = useMemo(() => {
    const filteredStatus = dataset.table.filter((record) => {
      const matchStatus = activeStatus === 'all' ? true : record.statusKey === activeStatus;
      const matchCompletion = allowCompleted || !record.isCompleted;
      return matchStatus && matchCompletion;
    });
    const filteredKeyword = filterTableByKeyword(filteredStatus, keyword);
    const sorted = [...filteredKeyword];
    sorted.sort((a, b) => {
      if (sortKey === 'delivery-asc') {
        return getDateValue(a.expectedDelivery) - getDateValue(b.expectedDelivery);
      }
      if (sortKey === 'delivery-desc') {
        return getDateValue(b.expectedDelivery) - getDateValue(a.expectedDelivery);
      }
      if (sortKey === 'order-desc') {
        return getDateValue(b.orderDate) - getDateValue(a.orderDate);
      }
      return getDateValue(a.orderDate) - getDateValue(b.orderDate);
    });
    return sorted;
  }, [dataset.table, activeStatus, allowCompleted, keyword, sortKey]);

  useEffect(() => {
    setCardPage(1);
  }, [keyword, activeStatus, includeCompleted, sortKey]);

  useEffect(() => {
    const pageCount = Math.max(1, Math.ceil(sortedCardOrders.length / cardPageSize));
    if (cardPage > pageCount) {
      setCardPage(pageCount);
    }
  }, [sortedCardOrders.length, cardPage, cardPageSize]);

  const paginatedCardOrders = useMemo(() => {
    const start = (cardPage - 1) * cardPageSize;
    return sortedCardOrders.slice(start, start + cardPageSize);
  }, [sortedCardOrders, cardPage, cardPageSize]);

  const currentVisibleIds = useMemo(() => (
    viewMode === 'card'
      ? paginatedCardOrders.map((order) => order.id)
      : sortedTableOrders.map((record) => record.id)
  ), [viewMode, paginatedCardOrders, sortedTableOrders]);

  const visibleSelectedCount = currentVisibleIds.filter((id) => selectedOrderIds.includes(id)).length;
  const allVisibleSelected = currentVisibleIds.length > 0 && visibleSelectedCount === currentVisibleIds.length;
  const indeterminate = visibleSelectedCount > 0 && visibleSelectedCount < currentVisibleIds.length;

  const handleSearch = (value: string) => {
    setKeyword(value.trim());
  };

  const handleIncludeCompletedChange = (event: CheckboxChangeEvent) => {
    setIncludeCompleted(event.target.checked);
  };

  const handleToggleOrder = (orderId: string, checked: boolean) => {
    setSelectedOrderIds((prev) => {
      if (checked) {
        if (prev.includes(orderId)) return prev;
        return [...prev, orderId];
      }
      return prev.filter((id) => id !== orderId);
    });
  };

  const handleToggleVisible = (event: CheckboxChangeEvent) => {
    const { checked } = event.target;
    if (checked) {
      setSelectedOrderIds((prev) => Array.from(new Set([...prev, ...currentVisibleIds])));
      return;
    }
    const visibleSet = new Set(currentVisibleIds);
    setSelectedOrderIds((prev) => prev.filter((id) => !visibleSet.has(id)));
  };

  useEffect(() => {
    setSelectedOrderIds((prev) => prev.filter((id) => dataset.orders.some((order) => order.id === id)));
  }, [dataset.orders]);

  const tabItems = dataset.statusTabs.map((tab: FactoryOrderStatusSummary) => ({
    key: tab.key,
    label: (
      <div className="factory-orders-tab-label">
        <div className="title">{tab.label}</div>
        <div className="meta">
          {tab.styles} 款 / {tab.orders} 单 / {tab.quantity.toLocaleString()} 件
        </div>
      </div>
    ),
  }));

  const tableColumns: ColumnsType<FactoryOrderTableRow> = useMemo(() => [
    {
      title: '订单号',
      dataIndex: 'orderCode',
      width: 160,
      fixed: 'left',
      render: (value: string, record) => (
        <Space size={4}>
          <span>{value}</span>
          {record.statusKey === 'overdue' ? <Tag color="volcano">已超期</Tag> : null}
          {record.isCompleted ? <Tag color="green">已完成</Tag> : null}
        </Space>
      ),
    },
    { title: '客户', dataIndex: 'customer', width: 140 },
    { title: '款号', dataIndex: 'styleCode', width: 140 },
    { title: '款名', dataIndex: 'styleName', width: 220, ellipsis: true },
    {
      title: '下单数量',
      dataIndex: 'orderQuantity',
      width: 120,
      align: 'right',
      render: (value: number) => `${value.toLocaleString()} 件`,
    },
    {
      title: '物料状态',
      dataIndex: 'materialStatus',
      width: 140,
      render: (value: string) => <Tag color={getMaterialTagColor(value)}>{value}</Tag>,
    },
    {
      title: '生产进度',
      dataIndex: 'productionPercent',
      width: 200,
      render: (_value: number, record) => (
        <div className="factory-orders-table-progress">
          <Progress percent={record.productionPercent} showInfo={false} size="small" />
          <Text type="secondary" style={{ fontSize: 12 }}>{record.productionStage}</Text>
        </div>
      ),
    },
    { title: '预计交货日期', dataIndex: 'expectedDelivery', width: 160 },
    { title: '跟单员', dataIndex: 'merchandiser', width: 120 },
    {
      title: '操作',
      dataIndex: 'actions',
      fixed: 'right',
      width: 180,
      render: (_value, record) => (
        <Space size={8}>
          <Button
            type="link"
            size="small"
            onClick={() => message.info(`查看大货成本：${record.orderCode}`)}
          >
            大货成本
          </Button>
          <Button
            type="link"
            size="small"
            onClick={() => message.success(`已复制订单：${record.orderCode}`)}
          >
            复制
          </Button>
          <Button
            type="link"
            size="small"
            onClick={() => message.info(`准备打印订单：${record.orderCode}`)}
          >
            打印
          </Button>
        </Space>
      ),
    },
  ], []);

  const rowSelection = useMemo(() => ({
    selectedRowKeys: selectedOrderIds,
    onChange: (keys: React.Key[]) => setSelectedOrderIds(keys.map(String)),
  }), [selectedOrderIds]);

  const renderCardView = () => {
    if (loading) {
      return (
        <div className="factory-orders-list">
          {Array.from({ length: cardPageSize }).map((_, index) => (
            <Skeleton key={index} active paragraph={{ rows: 4 }} />
          ))}
        </div>
      );
    }

    if (sortedCardOrders.length === 0) {
      return <Empty description={keyword ? '未找到匹配的工厂订单' : '暂无工厂订单'} />;
    }

    return (
      <>
        <div className="factory-orders-list">
          {paginatedCardOrders.map((order) => {
            const isChecked = selectedOrderIds.includes(order.id);
            return (
              <article className="factory-order-card" key={order.id}>
                <div className="factory-order-card-header">
                  <div className="factory-order-card-main">
                    <div className="factory-order-checkbox">
                      <Checkbox
                        checked={isChecked}
                        onChange={(event) => handleToggleOrder(order.id, event.target.checked)}
                      />
                    </div>
                    <div className="factory-order-card-info">
                      <img alt={order.name} src={order.thumbnail} className="factory-order-thumbnail" />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="factory-order-title">{order.name}</div>
                        <Space size={8} wrap>
                          <span className="factory-order-subtitle">订单号：{order.code}</span>
                          {order.customer ? (
                            <span className="factory-order-subtitle">客户：{order.customer}</span>
                          ) : null}
                          {order.expectedDelivery ? (
                            <span className="factory-order-subtitle">预计交货：{order.expectedDelivery}</span>
                          ) : null}
                        </Space>
                        {order.materialStatus ? (
                          <div style={{ marginTop: 4 }}>
                            <Tag color={getMaterialTagColor(order.materialStatus)}>{order.materialStatus}</Tag>
                          </div>
                        ) : null}
                        <div className="factory-order-tags">
                          <Tag color="blue" bordered={false}>
                            {order.quantityLabel}：{order.quantityValue}
                          </Tag>
                          {order.tags?.map((tag) => (
                            <Tag key={`${order.id}-${tag}`} bordered={false}>
                              {tag}
                            </Tag>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="factory-order-actions">
                    <Space size={8} wrap>
                      <Button
                        size="small"
                        type="text"
                        onClick={() => message.info(`查看大货成本：${order.code}`)}
                      >
                        大货成本
                      </Button>
                      <Button
                        size="small"
                        type="text"
                        onClick={() => message.success(`已复制订单：${order.code}`)}
                      >
                        复制
                      </Button>
                      <Button
                        size="small"
                        type="text"
                        onClick={() => message.info(`准备打印订单：${order.code}`)}
                      >
                        打印
                      </Button>
                    </Space>
                  </div>
                </div>

                <div className="factory-order-progress">
                  {order.progress.map((stage) => {
                    const status = stage.status ?? 'default';
                    const wrapClass = ['factory-order-progress-item'];
                    if (stage.muted) {
                      wrapClass.push('factory-order-progress-muted');
                    }
                    const percent = typeof stage.percent === 'number'
                      ? Math.max(0, Math.min(stage.percent, 100))
                      : undefined;
                    return (
                      <div className={wrapClass.join(' ')} key={`${order.id}-${stage.key}`}>
                        <div className="label">
                          <strong>{stage.label}</strong>
                          <span>
                            {[stage.date, stage.value].filter(Boolean).join(' · ')}
                          </span>
                        </div>
                        <div>
                          {typeof percent === 'number' ? (
                            <div style={{ display: 'grid', gap: 6 }}>
                              <Progress
                                percent={percent}
                                status={progressStatusLabel[status]}
                                showInfo={false}
                                strokeColor={statusColorMap[status]}
                                trailColor="#f0f0f0"
                              />
                              <div className="progress-value">{stage.value}</div>
                            </div>
                          ) : (
                            <div className="progress-value">{stage.value}</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </article>
            );
          })}
        </div>
        {sortedCardOrders.length > cardPageSize ? (
          <div className="factory-orders-pagination">
            <Pagination
              current={cardPage}
              pageSize={cardPageSize}
              total={sortedCardOrders.length}
              showQuickJumper
              showSizeChanger
              pageSizeOptions={['6', '9', '12']}
              showTotal={(total, range) => `${range[0]}-${range[1]} / 共 ${total} 单`}
              onChange={(page, size) => {
                setCardPage(page);
                if (size) {
                  setCardPageSize(size);
                }
              }}
            />
          </div>
        ) : null}
      </>
    );
  };

  const renderTableView = () => {
    if (sortedTableOrders.length === 0) {
      return loading ? (
        <div className="factory-orders-table-skeleton">
          <Skeleton active paragraph={{ rows: 6 }} />
        </div>
      ) : (
        <Empty description={keyword ? '未找到匹配的工厂订单' : '暂无工厂订单'} />
      );
    }

    return (
      <Table<FactoryOrderTableRow>
        bordered
        rowKey={(record) => record.id}
        columns={tableColumns}
        dataSource={sortedTableOrders}
        loading={loading}
        rowSelection={rowSelection}
        pagination={{
          showQuickJumper: true,
          showSizeChanger: true,
          defaultPageSize: 10,
          showTotal: (total, range) => `${range[0]}-${range[1]} / 共 ${total} 单`,
        }}
        scroll={{ x: 1200 }}
      />
    );
  };

  return (
    <div className="factory-orders-page">
      <section className="factory-orders-status-tabs">
        <Tabs
          activeKey={activeStatus}
          items={tabItems}
          onChange={(key) => setActiveStatus(key)}
        />
      </section>

      <section className="factory-orders-toolbar">
        <div className="factory-orders-toolbar-left">
          <div className="factory-orders-metrics">
            {dataset.metrics.map((metric: FactoryOrderMetric) => (
              <div
                key={metric.key}
                className={`factory-orders-metric-card${metric.tone === 'warning' ? ' warning' : ''}`}
              >
                <div className="factory-orders-metric-title">{metric.label}</div>
                <div className="factory-orders-metric-primary">{metric.primaryValue}</div>
                {metric.secondaryValue ? (
                  <div className="factory-orders-metric-secondary">{metric.secondaryValue}</div>
                ) : null}
              </div>
            ))}
          </div>
        </div>

        <div className="factory-orders-toolbar-right">
          <Space size={12} wrap>
            <Button type="primary" icon={<PlusOutlined />}>新建</Button>
            <Button icon={<ImportOutlined />}>导入</Button>
            <Button icon={<DownloadOutlined />}>导出</Button>
            <Button icon={<SettingOutlined />}>设置状态</Button>
          </Space>
        </div>
      </section>

      <section className="factory-orders-control-row">
        <Input.Search
          allowClear
          placeholder="请输入订单号/款号/款名/客户/跟单员"
          enterButton={<SearchOutlined />}
          onSearch={handleSearch}
          onChange={(event) => setKeyword(event.target.value)}
          value={keyword}
        />
        <Checkbox checked={includeCompleted} onChange={handleIncludeCompletedChange}>包含已完成</Checkbox>
        <Select
          className="factory-orders-sort-select"
          options={sortOptions}
          value={sortKey}
          onChange={(value) => setSortKey(value)}
        />
        <Segmented
          value={viewMode}
          options={[
            { label: '卡片视图', value: 'card' },
            { label: '表格视图', value: 'table' },
          ]}
          onChange={(value) => setViewMode(value as ViewMode)}
        />
      </section>

      <section className="factory-orders-search-row">
        <Checkbox
          indeterminate={indeterminate}
          checked={allVisibleSelected}
          onChange={handleToggleVisible}
        >
          仅勾选当前视图列表
        </Checkbox>
      </section>

      <div className="factory-orders-legend">
        图例说明：绿色-成功 / 橙色-提醒 / 红色-异常
      </div>

      {viewMode === 'card' ? renderCardView() : renderTableView()}

      {includeCompleted ? (
        <Paragraph style={{ marginTop: 16 }} type="secondary">
          <InfoCircleOutlined style={{ marginRight: 6 }} />
          已展示包含已完成订单的看板数据，此开关仅模拟交互。
        </Paragraph>
      ) : null}
    </div>
  );
};

export default FactoryOrders;
