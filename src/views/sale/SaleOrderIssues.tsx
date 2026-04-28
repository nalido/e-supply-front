import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Drawer, Empty, Form, Input, Select, Space, Typography, message } from 'antd';
import { saleApi } from '../../api/sale';
import SaleChannelAccountSelect from '../../components/sale/SaleChannelAccountSelect';
import {
  formatSaleDateTime,
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

const processingStatusOptions = [
  { label: '待人工确认', value: 'PENDING_CONFIRM' },
  { label: '待补绑定', value: 'PENDING_BINDING' },
  { label: '待补数据', value: 'PENDING_DATA_FIX' },
  { label: '跟进中', value: 'IN_PROGRESS' },
  { label: '已超时', value: 'OVERDUE' },
  { label: '已升级', value: 'ESCALATED' },
  { label: '已确认关闭', value: 'CONFIRMED' },
  { label: '无需处理', value: 'IGNORED' },
];

const exceptionFlagOptions = [
  { label: '待补绑定', value: 'UNMAPPED_SKU' },
  { label: '收件信息缺失', value: 'MISSING_RECEIVER' },
  { label: '平台状态异常', value: 'STATUS_EXCEPTION' },
  { label: '需人工确认', value: 'MANUAL_CONFIRM' },
];

const SaleOrderIssues = () => {
  const [saving, setSaving] = useState(false);
  const [accounts, setAccounts] = useState<SaleChannelAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [orders, setOrders] = useState<SaleOrderItem[]>([]);
  const [activeOrder, setActiveOrder] = useState<SaleOrderDetail | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [form] = Form.useForm();

  const loadData = useCallback(async (accountId?: string) => {
    try {
      const [accountList, orderList] = await Promise.all([saleApi.listChannelAccounts(), saleApi.listOrders(accountId)]);
      setAccounts(accountList);
      setOrders(orderList.filter((item) => deriveOrderIssue(item) || item.processingStatus));
    } catch (error) {
      console.error(error);
    }
  }, []);

  useEffect(() => {
    void loadData(selectedAccountId || undefined);
  }, [selectedAccountId, loadData]);

  const accountMap = useMemo(() => new Map(accounts.map((item) => [item.id, item])), [accounts]);

  const metrics = useMemo(() => {
    const overdueCount = orders.filter((item) => item.processingStatus === 'OVERDUE' || item.processingStatus === 'ESCALATED').length;
    const bindingCount = orders.filter((item) => deriveOrderIssue(item)?.code === 'PENDING_BINDING').length;
    const dataFixCount = orders.filter((item) => deriveOrderIssue(item)?.code === 'PENDING_DATA_FIX').length;
    return {
      total: orders.length,
      bindingCount,
      dataFixCount,
      overdueCount,
    };
  }, [orders]);

  const openOrder = useCallback(async (order: SaleOrderItem) => {
    setDrawerLoading(true);
    try {
      const detail = await saleApi.getOrderDetail(order.id);
      setActiveOrder(detail);
      form.setFieldsValue({
        processingStatus: detail.processingStatus || deriveOrderIssue(order)?.code || undefined,
        processingOwner: detail.processingOwner || '',
        processingNote: detail.processingNote || '',
        exceptionFlags: detail.exceptionFlags || [],
      });
    } catch (error) {
      console.error(error);
    } finally {
      setDrawerLoading(false);
    }
  }, [form]);

  const handleSave = async () => {
    if (!activeOrder) {
      return;
    }
    const values = await form.validateFields();
    setSaving(true);
    try {
      const detail = await saleApi.updateOrderProcessing(activeOrder.id, values);
      setActiveOrder(detail);
      message.success('问题订单处理记录已更新');
      await loadData(selectedAccountId || undefined);
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <SaleHero
        eyebrow="订单中心 / 问题订单"
        title="问题订单处理台"
        subtitle="把异常原因、商品摘要、建议动作和本地处理记录放在一块，支持业务人员直接处理，而不是只看状态字段。"
        extra={
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
                    width={300}
                  />
                </div>
              </div>
            </div>
            <Button size="large" onClick={() => void loadData(selectedAccountId || undefined)}>
              刷新
            </Button>
          </div>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        <SaleMetricCard title="问题订单数" value={metrics.total} hint="当前筛选范围内的问题订单" tone="danger" />
        <SaleMetricCard title="待补绑定" value={metrics.bindingCount} hint="商品映射未闭环" tone="warning" />
        <SaleMetricCard title="待补数据" value={metrics.dataFixCount} hint="收件信息或基础数据异常" tone="warning" />
        <SaleMetricCard title="已超时 / 已升级" value={metrics.overdueCount} hint="需要优先跟进或升级" tone="danger" />
      </div>

      <SaleSection title="问题订单卡片列表" description="每张卡都先回答：什么订单、什么商品、为什么有问题、建议先做什么。">
        {!orders.length ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="当前没有问题订单" />
        ) : (
          orders.map((order) => {
            const issue = deriveOrderIssue(order);
            return (
              <div key={order.id} className="sale-center-object-card">
                <div className="sale-center-object-card__top">
                  <div>
                    <div className="sale-center-object-card__title">{order.platformOrderNo}</div>
                    <div className="sale-center-object-card__sub">
                      {getShopLabel(accountMap.get(order.channelAccountId))} · 收件人 {toDisplayText(order.receiverName)} · 更新时间{' '}
                      {formatSaleDateTime(order.platformUpdatedAt)}
                    </div>
                  </div>
                  <Space wrap>
                    {issue ? <SaleToneTag label={issue.label} tone={issue.tone} /> : null}
                    <SaleStatusTag value={order.processingStatus} label={order.processingStatus || '未处理'} />
                    <SaleActionButton label="进入处理" onClick={() => void openOrder(order)} />
                  </Space>
                </div>
                {issue ? (
                  <div className="sale-center-rich-grid" style={{ marginTop: 16 }}>
                    <div className="sale-center-rich-cell">
                      <div className="sale-center-rich-cell__label">异常原因</div>
                      <div className="sale-center-rich-cell__value">{issue.reason}</div>
                    </div>
                    <div className="sale-center-rich-cell">
                      <div className="sale-center-rich-cell__label">建议动作</div>
                      <div className="sale-center-rich-cell__value">{issue.recommendedAction}</div>
                    </div>
                    <div className="sale-center-rich-cell">
                      <div className="sale-center-rich-cell__label">责任人</div>
                      <div className="sale-center-rich-cell__value">{toDisplayText(order.processingOwner)}</div>
                    </div>
                  </div>
                ) : null}
                <div style={{ marginTop: 16 }}>
                  {(order.linePreview || []).map((line) => (
                    <div key={line.id} className="sale-center-object-card" style={{ padding: 14, marginTop: 10, background: '#fff9f1' }}>
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
              </div>
            );
          })
        )}
      </SaleSection>

      <Drawer
        title={activeOrder ? `问题订单处理 · ${activeOrder.platformOrderNo}` : '问题订单处理'}
        open={Boolean(activeOrder)}
        onClose={() => setActiveOrder(null)}
        width={620}
        destroyOnClose
      >
        {drawerLoading || !activeOrder ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={drawerLoading ? '加载中...' : '暂无详情'} />
        ) : (
          <Form form={form} layout="vertical">
            <div className="sale-center-drawer-section">
              <Typography.Title level={5}>摘要</Typography.Title>
              <div className="sale-center-rich-grid">
                <div className="sale-center-rich-cell">
                  <div className="sale-center-rich-cell__label">平台状态</div>
                  <div className="sale-center-rich-cell__value">{toDisplayText(activeOrder.platformOrderStatus)}</div>
                </div>
                <div className="sale-center-rich-cell">
                  <div className="sale-center-rich-cell__label">收件信息</div>
                  <div className="sale-center-rich-cell__value">{toDisplayText(activeOrder.receiverName)}</div>
                </div>
                <div className="sale-center-rich-cell">
                  <div className="sale-center-rich-cell__label">最近同步</div>
                  <div className="sale-center-rich-cell__value">{formatSaleDateTime(activeOrder.lastSyncedAt)}</div>
                </div>
              </div>
            </div>

            <div className="sale-center-drawer-section">
              <Typography.Title level={5}>动作</Typography.Title>
              <Form.Item label="处理状态" name="processingStatus" rules={[{ required: true, message: '请选择处理状态' }]}>
                <Select options={processingStatusOptions} />
              </Form.Item>
              <Form.Item label="责任人" name="processingOwner">
                <Input placeholder="填写当前跟进人" />
              </Form.Item>
              <Form.Item label="异常标签" name="exceptionFlags">
                <Select mode="multiple" options={exceptionFlagOptions} placeholder="选择异常标签" />
              </Form.Item>
              <Form.Item label="当前备注" name="processingNote">
                <Input.TextArea rows={4} placeholder="记录当前判断、处理动作和下一步" />
              </Form.Item>
              <Space>
                <Button type="primary" loading={saving} onClick={() => void handleSave()}>
                  保存本地处理记录
                </Button>
                <Button onClick={() => setActiveOrder(null)}>关闭</Button>
              </Space>
            </div>
          </Form>
        )}
      </Drawer>
    </Space>
  );
};

export default SaleOrderIssues;
