import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Col, Drawer, Empty, Form, InputNumber, Row, Space, Typography, message } from 'antd';
import { saleApi } from '../../api/sale';
import SaleChannelAccountSelect from '../../components/sale/SaleChannelAccountSelect';
import {
  formatSaleDateTime,
  formatSaleMoney,
  ProductThumb,
  SaleActionButton,
  SaleHero,
  SaleMetricCard,
  SaleSection,
  SaleStatusTag,
  SaleToneTag,
  toDisplayText,
} from '../../components/sale/SaleCenterUI';
import type { SaleChannelAccount, SaleOrderDetail, SaleOrderItem } from '../../types/sale';
import { deriveOrderIssue, getShopLabel, isMappedStatus } from './sale-center-helpers';

const SaleOrders = () => {
  const [syncing, setSyncing] = useState(false);
  const [accounts, setAccounts] = useState<SaleChannelAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [orders, setOrders] = useState<SaleOrderItem[]>([]);
  const [activeOrder, setActiveOrder] = useState<SaleOrderDetail | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [syncForm] = Form.useForm();

  const loadData = useCallback(async (accountId?: string) => {
    try {
      const [accountList, orderList] = await Promise.all([saleApi.listChannelAccounts(), saleApi.listOrders(accountId)]);
      setAccounts(accountList);
      setOrders(orderList);
    } catch (error) {
      console.error(error);
    }
  }, []);

  useEffect(() => {
    void loadData(selectedAccountId || undefined);
  }, [selectedAccountId, loadData]);

  const accountMap = useMemo(() => new Map(accounts.map((item) => [item.id, item])), [accounts]);

  const metrics = useMemo(() => {
    const issueCount = orders.filter((item) => deriveOrderIssue(item)).length;
    const lineCount = orders.reduce((sum, item) => sum + (item.linePreview?.length || 0), 0);
    return {
      total: orders.length,
      issueCount,
      lineCount,
      updatedToday: orders.filter((item) => (item.platformUpdatedAt || '').slice(0, 10) === new Date().toISOString().slice(0, 10)).length,
    };
  }, [orders]);

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

  const handleSync = async () => {
    if (!selectedAccountId) {
      message.warning('请先选择具体店铺后再执行同步');
      return;
    }
    const values = await syncForm.validateFields();
    setSyncing(true);
    try {
      await saleApi.syncOrders({
        channelAccountId: Number(selectedAccountId),
        page: values.page,
        pageSize: values.pageSize,
      });
      message.success('订单同步请求已提交');
      await loadData(selectedAccountId);
    } catch (error) {
      console.error(error);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <SaleHero
        eyebrow="订单中心 / 订单总览"
        title="订单不是薄表格，而是可直接辨认商品与状态的厚列表"
        subtitle="列表首屏直接展示订单头摘要与商品摘要，减少反复点开详情确认“到底是什么商品、什么订单”。"
        extra={
          <Form form={syncForm} initialValues={{ page: 1, pageSize: 20 }}>
            <div className="sale-center-filter-bar">
              <div className="sale-center-filter-group">
                <div>
                  <Typography.Text type="secondary">店铺</Typography.Text>
                  <div style={{ marginTop: 8 }}>
                    <SaleChannelAccountSelect
                      accounts={accounts}
                      allowAll
                      value={selectedAccountId}
                      onChange={setSelectedAccountId}
                      allLabel="全部店铺"
                      placeholder="筛选店铺"
                      size="large"
                      width={280}
                    />
                  </div>
                </div>
                <Form.Item label="页码" name="page" style={{ marginBottom: 0 }}>
                  <InputNumber min={1} size="large" style={{ width: 96 }} />
                </Form.Item>
                <Form.Item label="每页" name="pageSize" style={{ marginBottom: 0 }}>
                  <InputNumber min={1} max={100} size="large" style={{ width: 108 }} />
                </Form.Item>
              </div>
              <Space>
                <Button size="large" onClick={() => void loadData(selectedAccountId || undefined)}>
                  刷新
                </Button>
                <Button type="primary" size="large" loading={syncing} onClick={() => void handleSync()}>
                  同步订单
                </Button>
              </Space>
            </div>
          </Form>
        }
      />

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} xl={6}>
          <SaleMetricCard title="订单数" value={metrics.total} hint="当前筛选范围内的订单主数据" />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <SaleMetricCard title="问题订单数" value={metrics.issueCount} hint="已识别为待人工处理的订单" tone="warning" />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <SaleMetricCard title="商品摘要行" value={metrics.lineCount} hint="已在首屏直接暴露商品行信息" />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <SaleMetricCard title="今日更新" value={metrics.updatedToday} hint="按平台更新时间统计" tone="success" />
        </Col>
      </Row>

      <SaleSection title="订单厚列表" description="订单头、商品摘要、状态与下一步建议统一在一屏内扫读。">
        {!orders.length ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="当前没有订单数据" />
        ) : (
          orders.map((order) => {
            const issue = deriveOrderIssue(order);
            const shop = accountMap.get(order.channelAccountId);
            return (
              <div key={order.id} className="sale-center-object-card">
                <div className="sale-center-object-card__top">
                  <div>
                    <div className="sale-center-object-card__title">
                      {order.platformOrderNo}
                      {order.platformParentOrderNo ? ` / 母单 ${order.platformParentOrderNo}` : ''}
                    </div>
                    <div className="sale-center-object-card__sub">
                      {getShopLabel(shop)} · 收件人 {toDisplayText(order.receiverName)} · 更新时间 {formatSaleDateTime(order.platformUpdatedAt)}
                    </div>
                  </div>
                  <Space wrap>
                    <SaleStatusTag value={order.normalizedStatus} label={order.normalizedStatus || order.platformOrderStatus || '未知状态'} />
                    {issue ? <SaleToneTag label={issue.label} tone={issue.tone} /> : <SaleToneTag label="正常" tone="success" />}
                    <SaleActionButton label="查看详情" onClick={() => void openOrderDetail(order.id)} />
                  </Space>
                </div>

                <div className="sale-center-rich-grid">
                  <div className="sale-center-rich-cell">
                    <div className="sale-center-rich-cell__label">订单金额</div>
                    <div className="sale-center-rich-cell__value">{formatSaleMoney(order.payAmount || order.orderAmount)}</div>
                  </div>
                  <div className="sale-center-rich-cell">
                    <div className="sale-center-rich-cell__label">本地处理状态</div>
                    <div className="sale-center-rich-cell__value">{toDisplayText(order.processingStatus)}</div>
                  </div>
                  <div className="sale-center-rich-cell">
                    <div className="sale-center-rich-cell__label">责任人</div>
                    <div className="sale-center-rich-cell__value">{toDisplayText(order.processingOwner)}</div>
                  </div>
                  <div className="sale-center-rich-cell">
                    <div className="sale-center-rich-cell__label">异常标签</div>
                    <div className="sale-center-rich-cell__value">
                      {(order.exceptionFlags || []).length ? (order.exceptionFlags || []).join(' / ') : '--'}
                    </div>
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
                              平台 SKU {toDisplayText(line.platformSkuCode || line.platformSkuId)} · 数量 {toDisplayText(line.quantity)}
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
      </SaleSection>

      <Drawer
        title={activeOrder ? `订单详情 · ${activeOrder.platformOrderNo}` : '订单详情'}
        open={Boolean(activeOrder)}
        onClose={() => setActiveOrder(null)}
        width={560}
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
                  <div className="sale-center-rich-cell__label">平台状态</div>
                  <div className="sale-center-rich-cell__value">{toDisplayText(activeOrder.platformOrderStatus)}</div>
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
                      .join(' ')}
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
                        平台 SKU {toDisplayText(line.platformSkuCode || line.platformSkuId)} · 数量 {toDisplayText(line.quantity)}
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
