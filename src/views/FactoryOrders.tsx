import { useEffect, useMemo, useState } from 'react';
import type { ProgressProps } from 'antd/es/progress';
import {
  Button,
  Checkbox,
  Empty,
  Input,
  Progress,
  Skeleton,
  Space,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import {
  DownloadOutlined,
  ImportOutlined,
  InfoCircleOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  SettingOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import type { CheckboxChangeEvent } from 'antd/es/checkbox';
import type { FactoryOrderDataset, FactoryOrderItem, FactoryOrderMetric, FactoryOrderProgress } from '../types';
import { fetchFactoryOrdersDataset } from '../mock';
import '../styles/factory-orders.css';

const { Paragraph } = Typography;

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

const filterOrders = (orders: FactoryOrderItem[], keyword: string): FactoryOrderItem[] => {
  if (!keyword) return orders;
  const lower = keyword.toLowerCase();
  return orders.filter((order) =>
    [order.code, order.name, order.customer]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(lower)),
  );
};

const FactoryOrders = () => {
  const [dataset, setDataset] = useState<FactoryOrderDataset>({ metrics: [], orders: [] });
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [includeCompleted, setIncludeCompleted] = useState(false);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);

  useEffect(() => {
    setLoading(true);
    fetchFactoryOrdersDataset().then((data) => {
      setDataset(data);
      setSelectedOrderIds([]);
    }).finally(() => {
      setLoading(false);
    });
  }, []);

  const visibleOrders = useMemo(() => filterOrders(dataset.orders, keyword), [dataset.orders, keyword]);

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

  const visibleSelectedCount = visibleOrders.filter((order) => selectedOrderIds.includes(order.id)).length;
  const allVisibleSelected = visibleOrders.length > 0 && visibleSelectedCount === visibleOrders.length;
  const indeterminate = visibleSelectedCount > 0 && visibleSelectedCount < visibleOrders.length;

  const handleToggleVisible = (event: CheckboxChangeEvent) => {
    const { checked } = event.target;
    if (checked) {
      const visibleIds = visibleOrders.map((order) => order.id);
      setSelectedOrderIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
      return;
    }
    const visibleIds = new Set(visibleOrders.map((order) => order.id));
    setSelectedOrderIds((prev) => prev.filter((id) => !visibleIds.has(id)));
  };

  return (
    <div className="factory-orders-page">
      <div className="factory-orders-toolbar">
        <div className="factory-orders-toolbar-left">
          <Space size={12} wrap>
            <Button type="primary" ghost icon={<ReloadOutlined />}>待出库</Button>
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
          </Space>
        </div>

        <div className="factory-orders-toolbar-right">
          <Space size={12} wrap>
            <Button type="primary" icon={<PlusOutlined />}>新建</Button>
            <Button icon={<ImportOutlined />}>导入</Button>
            <Button icon={<DownloadOutlined />}>导出</Button>
            <Button icon={<SettingOutlined />}>设置状态</Button>
          </Space>
          <Checkbox checked={includeCompleted} onChange={handleIncludeCompletedChange}>包含已完成</Checkbox>
          <Button icon={<SwapOutlined />} type="default">视图切换</Button>
          <Tooltip title="按照预计交货时间升序排序">
            <Button type="link">按预计交货排序</Button>
          </Tooltip>
        </div>
      </div>

      <div className="factory-orders-search-row">
        <Input.Search
          allowClear
          style={{ flex: 1, minWidth: 260, maxWidth: 520 }}
          placeholder="请输入订单号/款号/款名/客户/跟单员"
          enterButton={<SearchOutlined />}
          onSearch={handleSearch}
          onChange={(event) => setKeyword(event.target.value)}
          value={keyword}
        />
        <Checkbox
          indeterminate={indeterminate}
          checked={allVisibleSelected}
          onChange={handleToggleVisible}
        >
          仅勾选当前列表
        </Checkbox>
      </div>

      <div className="factory-orders-legend">
        图例说明：进行中 / 已完成 / 提醒 / 超期
      </div>

      {loading ? (
        <div className="factory-orders-list">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} active paragraph={{ rows: 4 }} />
          ))}
        </div>
      ) : visibleOrders.length === 0 ? (
        <Empty description={keyword ? '未找到匹配的工厂订单' : '暂无工厂订单'} />
      ) : (
        <div className="factory-orders-list">
          {visibleOrders.map((order) => {
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
                      <img
                        alt={order.name}
                        src={order.thumbnail}
                        className="factory-order-thumbnail"
                      />
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
                            <Tag color="processing">{order.materialStatus}</Tag>
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
                      <Button size="small" type="text">复制</Button>
                      <Button size="small" type="text">打印</Button>
                      <Button size="small" type="text">更多</Button>
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
                    const percent = typeof stage.percent === 'number' ? Math.max(0, Math.min(stage.percent, 100)) : undefined;
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
                              <div className="progress-value">
                                {stage.value}
                              </div>
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
      )}

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
