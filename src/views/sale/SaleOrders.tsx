import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Button, Checkbox, Col, Drawer, Empty, Form, Input, InputNumber, Pagination, Row, Select, Space, Tag, Typography, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { saleApi } from '../../api/sale';
import SaleChannelAccountSelect from '../../components/sale/SaleChannelAccountSelect';
import { formatSaleDateTime, formatSaleMoney, toDisplayText } from '../../components/sale/sale-center-formatters';
import {
  ProductThumb,
  SaleActionButton,
  SaleHero,
  SaleMetricCard,
  SaleSection,
  SaleStatusTag,
  SaleToneTag,
} from '../../components/sale/SaleCenterUI';
import type { SaleChannelAccount, SaleOrderDetail, SaleOrderItem } from '../../types/sale';
import { deriveOrderIssue, getShopLabel, isMappedStatus } from './sale-center-helpers';

const statusOptions = [
  { label: '全部状态', value: '' },
  { label: '待履约', value: 'WAITING_FULFILLMENT' },
  { label: '待交运', value: 'READY_TO_SHIP' },
  { label: '已发货', value: 'SHIPPED' },
  { label: '已完成', value: 'COMPLETED' },
  { label: '已取消', value: 'CANCELED' },
  { label: '异常', value: 'EXCEPTION' },
];

const ozonSyncStatusOptions = [
  { label: '全部状态', value: '' },
  { label: '待打包', value: 'awaiting_packaging' },
  { label: '待交运', value: 'awaiting_deliver' },
  { label: '配送中', value: 'delivering' },
  { label: '已签收', value: 'delivered' },
  { label: '已取消', value: 'cancelled' },
];

const isReadyForFulfillment = (order: SaleOrderItem | SaleOrderDetail) => {
  const status = (order.fulfillmentStatus || order.normalizedStatus || '').toUpperCase();
  return status === 'READY' || status === 'WAITING_FULFILLMENT';
};

const ORDER_STAGE_LABELS: Record<string, string> = {
  READY: '待打包',
  WAITING_FULFILLMENT: '待打包',
  AWAITING_PACKAGING: '待打包',
  READY_TO_SHIP: '待交运',
  AWAITING_DELIVERY: '待交运',
  AWAITING_DELIVER: '待交运',
  SHIPPED: '配送中',
  DELIVERING: '配送中',
  COMPLETED: '已完成',
  DELIVERED: '已完成',
  CANCELED: '已取消',
  CANCELLED: '已取消',
  EXCEPTION: '异常',
  ARBITRATION: '异常',
};

const getOrderStageLabel = (order: SaleOrderItem | SaleOrderDetail) => {
  const status = (order.fulfillmentStatus || order.normalizedStatus || order.platformOrderStatus || '').toUpperCase();
  return ORDER_STAGE_LABELS[status] || '待处理';
};

const SaleOrders = () => {
  const navigate = useNavigate();
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<SaleChannelAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [orders, setOrders] = useState<SaleOrderItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [keyword, setKeyword] = useState('');
  const [appliedKeyword, setAppliedKeyword] = useState('');
  const [normalizedStatus, setNormalizedStatus] = useState('');
  const [issueOnly, setIssueOnly] = useState(false);
  const [activeOrder, setActiveOrder] = useState<SaleOrderDetail | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [syncForm] = Form.useForm();

  const loadAccounts = useCallback(async () => {
    const accountList = await saleApi.listChannelAccounts();
    setAccounts(accountList);
  }, []);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const result = await saleApi.listOrdersPage({
        channelAccountId: selectedAccountId || undefined,
        keyword: appliedKeyword,
        normalizedStatus: normalizedStatus || undefined,
        issueOnly,
        page,
        pageSize,
      });
      setOrders(result.list);
      setTotal(result.total);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [appliedKeyword, issueOnly, normalizedStatus, page, pageSize, selectedAccountId]);

  useEffect(() => {
    void loadAccounts();
  }, [loadAccounts]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const accountMap = useMemo(() => new Map(accounts.map((item) => [item.id, item])), [accounts]);
  const selectedAccount = selectedAccountId ? accountMap.get(selectedAccountId) : undefined;
  const selectedIsOzon = selectedAccount?.platformCode?.toUpperCase() === 'OZON';

  const metrics = useMemo(() => {
    const readyCount = orders.filter(isReadyForFulfillment).length;
    const issueCount = orders.filter((item) => deriveOrderIssue(item)).length;
    const lineCount = orders.reduce((sum, item) => sum + (item.linePreview?.length || 0), 0);
    return { total, readyCount, issueCount, lineCount };
  }, [orders, total]);

  const selectedOrderSet = useMemo(() => new Set(selectedOrderIds), [selectedOrderIds]);
  const selectedOrders = useMemo(
    () => orders.filter((order) => selectedOrderSet.has(order.id)),
    [orders, selectedOrderSet],
  );
  const fulfillmentReadySelected = selectedOrders.filter(isReadyForFulfillment);
  const currentPageReadyOrders = useMemo(() => orders.filter(isReadyForFulfillment), [orders]);
  const currentPageReadyIds = useMemo(() => currentPageReadyOrders.map((order) => order.id), [currentPageReadyOrders]);
  const selectedCurrentPageReadyCount = useMemo(
    () => currentPageReadyIds.filter((orderId) => selectedOrderSet.has(orderId)).length,
    [currentPageReadyIds, selectedOrderSet],
  );
  const allCurrentPageReadySelected =
    currentPageReadyIds.length > 0 && selectedCurrentPageReadyCount === currentPageReadyIds.length;
  const partiallyCurrentPageReadySelected =
    selectedCurrentPageReadyCount > 0 && selectedCurrentPageReadyCount < currentPageReadyIds.length;

  const openOrderDetail = useCallback(async (orderId: string) => {
    setDrawerLoading(true);
    try {
      const detail = await saleApi.getOrderDetail(orderId);
      setActiveOrder(detail);
    } catch (error) {
      console.error(error);
    } finally {
      setDrawerLoading(false);
    }
  }, []);

  const handleSearch = () => {
    setPage(1);
    setAppliedKeyword(keyword.trim());
  };

  const handleSync = async () => {
    if (!selectedAccountId) {
      message.warning('请先选择具体店铺后再执行订单同步');
      return;
    }
    const values = await syncForm.validateFields();
    setSyncing(true);
    try {
      const result = await saleApi.syncOrders({
        channelAccountId: Number(selectedAccountId),
        page: values.page,
        pageSize: values.pageSize,
        continuous: values.continuous,
        syncWindowDays: values.syncWindowDays,
        platformStatus: values.platformStatus || undefined,
      });
      message.success(`订单同步完成：新增 ${result.createdCount} 单，更新 ${result.updatedCount} 单`);
      setPage(1);
      await loadOrders();
    } catch (error) {
      console.error(error);
    } finally {
      setSyncing(false);
    }
  };

  const handleAccountChange = (value: string) => {
    setSelectedAccountId(value);
    setSelectedOrderIds([]);
    setPage(1);
    syncForm.setFieldsValue({ platformStatus: '' });
  };

  const toggleOrderSelection = (order: SaleOrderItem, checked: boolean) => {
    if (!isReadyForFulfillment(order)) {
      return;
    }
    setSelectedOrderIds((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(order.id);
      } else {
        next.delete(order.id);
      }
      return Array.from(next);
    });
  };

  const toggleCurrentPageReadySelection = (checked: boolean) => {
    if (!selectedIsOzon) {
      message.warning('请先选择 Ozon 店铺');
      return;
    }
    if (!currentPageReadyIds.length) {
      message.warning('当前页没有可进入发货准备的订单');
      return;
    }
    setSelectedOrderIds((current) => {
      const next = new Set(current);
      currentPageReadyIds.forEach((orderId) => {
        if (checked) {
          next.add(orderId);
        } else {
          next.delete(orderId);
        }
      });
      return Array.from(next);
    });
  };

  const startFulfillmentWorkbench = () => {
    if (!selectedAccountId || !selectedIsOzon) {
      message.warning('请先选择 Ozon 店铺');
      return;
    }
    if (!fulfillmentReadySelected.length) {
      message.warning('请选择待发货订单');
      return;
    }
    const orderIds = fulfillmentReadySelected.map((order) => order.id).join(',');
    navigate(`/sale/fulfillment-workbench/ozon-fbs?accountId=${selectedAccountId}&orderIds=${orderIds}`);
  };

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <SaleHero
        eyebrow="订单中心 / 订单总览"
        title="平台订单同步工作台"
        subtitle="按店铺同步并核对平台订单，沉淀商品明细、发货时限和绑定状态，为后续发货处理做好准备。"
        extra={
          <Form form={syncForm} initialValues={{ page: 1, pageSize: 50, continuous: true, syncWindowDays: 14, platformStatus: '' }}>
            <div className="sale-center-filter-bar">
              <div className="sale-center-filter-group">
                <div>
                  <Typography.Text type="secondary">店铺</Typography.Text>
                  <div style={{ marginTop: 8 }}>
                    <SaleChannelAccountSelect
                      accounts={accounts}
                      allowAll
                      value={selectedAccountId}
                      onChange={handleAccountChange}
                      allLabel="全部店铺"
                      placeholder="筛选店铺"
                      size="large"
                      width={280}
                    />
                  </div>
                </div>
                <div>
                  <Typography.Text type="secondary">关键词</Typography.Text>
                  <div style={{ marginTop: 8 }}>
                    <Input.Search
                      allowClear
                      value={keyword}
                      onChange={(event) => setKeyword(event.target.value)}
                      onSearch={handleSearch}
                      placeholder="订单号 / 收件人 / 平台货号 / 平台商品编码"
                      size="large"
                      style={{ width: 280 }}
                    />
                  </div>
                </div>
                <div>
                  <Typography.Text type="secondary">内部状态</Typography.Text>
                  <div style={{ marginTop: 8 }}>
                    <Select
                      value={normalizedStatus}
                      options={statusOptions}
                      onChange={(value) => {
                        setNormalizedStatus(value);
                        setPage(1);
                      }}
                      size="large"
                      style={{ width: 180 }}
                    />
                  </div>
                </div>
                <div>
                  <Typography.Text type="secondary">问题范围</Typography.Text>
                  <div style={{ marginTop: 8 }}>
                    <Select
                      value={issueOnly ? 'issue' : 'all'}
                      options={[
                        { label: '全部订单', value: 'all' },
                        { label: '只看问题订单', value: 'issue' },
                      ]}
                      onChange={(value) => {
                        setIssueOnly(value === 'issue');
                        setPage(1);
                      }}
                      size="large"
                      style={{ width: 160 }}
                    />
                  </div>
                </div>
              </div>
              <Space>
                <Button size="large" onClick={() => void loadOrders()} loading={loading}>
                  刷新
                </Button>
                <Button type="primary" size="large" loading={syncing} onClick={() => void handleSync()} disabled={!selectedAccountId}>
                  同步订单
                </Button>
              </Space>
            </div>
            <div className="sale-center-filter-bar" style={{ marginTop: 12 }}>
              <div className="sale-center-filter-group">
                <Form.Item label="起始页" name="page" style={{ marginBottom: 0 }}>
                  <InputNumber min={1} size="middle" style={{ width: 96 }} />
                </Form.Item>
                <Form.Item label="每页" name="pageSize" style={{ marginBottom: 0 }}>
                  <InputNumber min={1} max={100} size="middle" style={{ width: 108 }} />
                </Form.Item>
                <Form.Item label="同步窗口" name="syncWindowDays" style={{ marginBottom: 0 }}>
                  <InputNumber min={1} max={90} addonAfter="天" size="middle" style={{ width: 132 }} />
                </Form.Item>
                <Form.Item label="连续翻页" name="continuous" style={{ marginBottom: 0 }}>
                  <Select
                    options={[
                      { label: '连续同步', value: true },
                      { label: '仅当前页', value: false },
                    ]}
                    size="middle"
                    style={{ width: 132 }}
                  />
                </Form.Item>
                <Form.Item label="Ozon 订单阶段" name="platformStatus" style={{ marginBottom: 0 }}>
                  <Select disabled={!selectedIsOzon} options={ozonSyncStatusOptions} size="middle" style={{ width: 220 }} />
                </Form.Item>
              </div>
            </div>
          </Form>
        }
      />

      <Alert
        type="info"
        showIcon
        message="系统会同步订单、商品明细和发货时限，并标记待发货订单，方便后续集中处理发货。"
      />

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} xl={6}>
          <SaleMetricCard title="订单数" value={metrics.total} hint="当前筛选范围内的订单" />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <SaleMetricCard title="待进入发货" value={metrics.readyCount} hint="当前页待打包订单" tone="success" />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <SaleMetricCard title="问题订单" value={metrics.issueCount} hint="当前页存在绑定、资料或状态问题的订单" tone="warning" />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <SaleMetricCard title="商品摘要行" value={metrics.lineCount} hint="当前页已展示的商品行数量" />
        </Col>
      </Row>

      <SaleSection
        title="订单列表"
        description="统一展示订单状态、发货时限、商品明细和绑定状态，减少发货前的二次核对。"
        extra={
          <Space wrap>
            <Checkbox
              checked={allCurrentPageReadySelected}
              indeterminate={partiallyCurrentPageReadySelected}
              disabled={!selectedIsOzon || !currentPageReadyIds.length}
              onChange={(event) => toggleCurrentPageReadySelection(event.target.checked)}
            >
              全选当前页可发货订单
            </Checkbox>
            <Typography.Text type="secondary">已选 {fulfillmentReadySelected.length} 单</Typography.Text>
            <Button type="primary" disabled={!selectedIsOzon || !fulfillmentReadySelected.length} onClick={startFulfillmentWorkbench}>
              进入发货准备
            </Button>
          </Space>
        }
      >
        {!orders.length ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="当前没有订单数据" />
        ) : (
          orders.map((order) => {
            const issue = deriveOrderIssue(order);
            const shop = accountMap.get(order.channelAccountId);
            return (
              <div key={order.id} className="sale-center-object-card">
                <div className="sale-center-object-card__top">
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <Checkbox
                      checked={selectedOrderSet.has(order.id)}
                      disabled={!selectedIsOzon || !isReadyForFulfillment(order)}
                      onChange={(event) => toggleOrderSelection(order, event.target.checked)}
                    />
                    <div>
                      <div className="sale-center-object-card__title">
                        {order.platformOrderNo}
                        {order.platformParentOrderNo ? ` / 母单 ${order.platformParentOrderNo}` : ''}
                      </div>
                      <div className="sale-center-object-card__sub">
                        {getShopLabel(shop)} · 收件人 {toDisplayText(order.receiverName)} · 最近同步 {formatSaleDateTime(order.lastSyncedAt)}
                      </div>
                    </div>
                  </div>
                  <Space wrap>
                    {shop?.platformCode ? <Tag>{shop.platformCode}</Tag> : null}
                    <SaleStatusTag value={order.normalizedStatus} label={getOrderStageLabel(order)} />
                    {isReadyForFulfillment(order) ? <SaleToneTag label="可进入发货准备" tone="success" /> : null}
                    {issue ? <SaleToneTag label={issue.label} tone={issue.tone} /> : null}
                    <SaleActionButton label="查看详情" onClick={() => void openOrderDetail(order.id)} />
                  </Space>
                </div>

                <div className="sale-center-rich-grid">
                  <div className="sale-center-rich-cell">
                    <div className="sale-center-rich-cell__label">订单金额</div>
                    <div className="sale-center-rich-cell__value">
                      {formatSaleMoney(order.payAmount || order.orderAmount, order.currencyCode || undefined)}
                    </div>
                  </div>
                  <div className="sale-center-rich-cell">
                    <div className="sale-center-rich-cell__label">发货时限</div>
                    <div className="sale-center-rich-cell__value">{formatSaleDateTime(order.fulfillmentDueAt)}</div>
                  </div>
                  <div className="sale-center-rich-cell">
                    <div className="sale-center-rich-cell__label">配送 / 仓提示</div>
                    <div className="sale-center-rich-cell__value">
                      {[order.deliveryMethodId, order.warehouseHint].filter(Boolean).join(' / ') || '--'}
                    </div>
                  </div>
                  <div className="sale-center-rich-cell">
                    <div className="sale-center-rich-cell__label">处理状态</div>
                    <div className="sale-center-rich-cell__value">{issue?.label || '正常'}</div>
                    {issue ? (
                      <Typography.Text type="secondary" style={{ display: 'block', marginTop: 4, fontSize: 12 }}>
                        {issue.reason}；{issue.recommendedAction}
                      </Typography.Text>
                    ) : null}
                  </div>
                </div>

                <div style={{ marginTop: 16 }}>
                  {(order.linePreview || []).length ? (
                    (order.linePreview || []).map((line) => (
                      <div key={line.id} className="sale-center-object-card" style={{ padding: 14, marginTop: 10, background: '#fff9f1' }}>
                        <div className="sale-center-object-card__body" style={{ marginTop: 0 }}>
                          <ProductThumb src={line.platformMainImageUrl} alt={line.goodsName || line.platformSkuCode || ''} />
                          <div className="sale-center-object-card__content">
                            <div className="sale-center-object-card__title">{toDisplayText(line.goodsName)}</div>
                            <div className="sale-center-object-card__sub">
                              平台货号 {toDisplayText(line.platformSkuCode)} · 平台商品编码 {toDisplayText(line.platformSkuId)} · 平台商品ID{' '}
                              {toDisplayText(line.platformGoodsId)} · 数量 {toDisplayText(line.quantity)}
                            </div>
                            <div className="sale-center-chip-group" style={{ marginTop: 10 }}>
                              {line.normalizedColor ? <span className="sale-center-chip">{line.normalizedColor}</span> : null}
                              {line.normalizedSize ? <span className="sale-center-chip">{line.normalizedSize}</span> : null}
                              {line.normalizedSpecSummary ? <span className="sale-center-chip">{line.normalizedSpecSummary}</span> : null}
                              <span className={`sale-center-chip ${isMappedStatus(line.mappingStatus) ? 'sale-center-chip--success' : 'sale-center-chip--warning'}`}>
                                {isMappedStatus(line.mappingStatus) ? '已绑定' : '待补绑定'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <Typography.Text type="secondary">当前订单尚无可展示的商品摘要。</Typography.Text>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
          <Pagination
            current={page}
            pageSize={pageSize}
            total={total}
            showSizeChanger
            showTotal={(value) => `共 ${value} 单`}
            onChange={(nextPage, nextPageSize) => {
              setPage(nextPage);
              setPageSize(nextPageSize);
            }}
          />
        </div>
      </SaleSection>

      <Drawer
        title={activeOrder ? `订单详情 · ${activeOrder.platformOrderNo}` : '订单详情'}
        open={Boolean(activeOrder)}
        onClose={() => setActiveOrder(null)}
        width={720}
        destroyOnClose
      >
        {drawerLoading || !activeOrder ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={drawerLoading ? '加载中...' : '暂无详情'} />
        ) : (
          <Space direction="vertical" size={18} style={{ width: '100%' }}>
            <div className="sale-center-drawer-section">
              <Typography.Title level={5}>摘要</Typography.Title>
              <div className="sale-center-rich-grid">
                <div className="sale-center-rich-cell">
                  <div className="sale-center-rich-cell__label">订单阶段</div>
                  <div className="sale-center-rich-cell__value">{getOrderStageLabel(activeOrder)}</div>
                </div>
                <div className="sale-center-rich-cell">
                  <div className="sale-center-rich-cell__label">处理状态</div>
                  <div className="sale-center-rich-cell__value">{deriveOrderIssue(activeOrder)?.label || '正常'}</div>
                </div>
                <div className="sale-center-rich-cell">
                  <div className="sale-center-rich-cell__label">发货时限</div>
                  <div className="sale-center-rich-cell__value">{formatSaleDateTime(activeOrder.fulfillmentDueAt)}</div>
                </div>
                <div className="sale-center-rich-cell">
                  <div className="sale-center-rich-cell__label">收件人</div>
                  <div className="sale-center-rich-cell__value">{toDisplayText(activeOrder.receiverName)}</div>
                </div>
                <div className="sale-center-rich-cell">
                  <div className="sale-center-rich-cell__label">地址</div>
                  <div className="sale-center-rich-cell__value">
                    {[activeOrder.receiverCountry, activeOrder.receiverState, activeOrder.receiverCity, activeOrder.receiverAddress]
                      .filter(Boolean)
                      .join(' ') || '--'}
                  </div>
                </div>
              </div>
            </div>

            <div className="sale-center-drawer-section">
              <Typography.Title level={5}>商品明细</Typography.Title>
              {(activeOrder.lines || []).map((line) => (
                <div key={line.id} className="sale-center-object-card">
                  <div className="sale-center-object-card__body" style={{ marginTop: 0 }}>
                    <ProductThumb src={line.platformMainImageUrl} alt={line.goodsName || ''} />
                    <div className="sale-center-object-card__content">
                      <div className="sale-center-object-card__title">{toDisplayText(line.goodsName)}</div>
                      <div className="sale-center-object-card__sub">
                        平台货号 {toDisplayText(line.platformSkuCode)} · 平台商品编码 {toDisplayText(line.platformSkuId)} · 平台商品ID{' '}
                        {toDisplayText(line.platformGoodsId)} · 数量 {toDisplayText(line.quantity)}
                      </div>
                      <div className="sale-center-chip-group" style={{ marginTop: 10 }}>
                        {line.normalizedColor ? <span className="sale-center-chip">{line.normalizedColor}</span> : null}
                        {line.normalizedSize ? <span className="sale-center-chip">{line.normalizedSize}</span> : null}
                        {line.normalizedSpecSummary ? <span className="sale-center-chip">{line.normalizedSpecSummary}</span> : null}
                        <span className={`sale-center-chip ${isMappedStatus(line.mappingStatus) ? 'sale-center-chip--success' : 'sale-center-chip--warning'}`}>
                          {isMappedStatus(line.mappingStatus) ? '已绑定' : '待补绑定'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Space>
        )}
      </Drawer>
    </Space>
  );
};

export default SaleOrders;
