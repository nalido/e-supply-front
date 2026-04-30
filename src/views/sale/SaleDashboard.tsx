import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Col, Empty, Row, Space, Spin, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import { saleApi } from '../../api/sale';
import SaleChannelAccountSelect from '../../components/sale/SaleChannelAccountSelect';
import { formatSaleDateTime, toDisplayText } from '../../components/sale/sale-center-formatters';
import {
  SaleActionButton,
  SaleHero,
  SaleMetricCard,
  SaleMiniStat,
  SaleSection,
  SaleStatusTag,
  SaleToneTag,
} from '../../components/sale/SaleCenterUI';
import type { SaleChannelAccount, SaleOrderItem } from '../../types/sale';
import { deriveOrderIssue, getShopLabel, isMappedStatus } from './sale-center-helpers';

type DashboardState = {
  accounts: SaleChannelAccount[];
  orders: SaleOrderItem[];
  mappings: Awaited<ReturnType<typeof saleApi.listProductMappings>>;
  syncLogs: Awaited<ReturnType<typeof saleApi.listSyncLogs>>;
  retryCandidates: Awaited<ReturnType<typeof saleApi.listRetryCandidates>>;
};

type ShopRiskRow = {
  account: SaleChannelAccount;
  topRiskType: string;
  totalRisk: number;
  pendingBindingCount: number;
  issueOrderCount: number;
  failedSyncCount: number;
  lastSuccessAt: string | null | undefined;
  nextActionLabel: string;
  nextActionRoute: string;
};

const syncBizTypeLabelMap: Record<string, string> = {
  INVENTORY_READ: '库存同步',
  PURCHASE_ORDER_SYNC: '订单同步',
  FULFILLMENT_DEMAND_SYNC: '待发货同步',
  PRODUCT_LIST_SYNC: '商品同步',
};

const SaleDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [data, setData] = useState<DashboardState>({
    accounts: [],
    orders: [],
    mappings: [],
    syncLogs: [],
    retryCandidates: [],
  });

  const loadData = useCallback(async (channelAccountId?: string) => {
    setLoading(true);
    try {
      const accounts = await saleApi.listChannelAccounts();
      const syncLogs = await saleApi.listSyncLogs(channelAccountId ? { channelAccountId } : undefined);
      const [orders, mappings, retryCandidates] = await Promise.all([
        saleApi.listOrders(channelAccountId || undefined),
        saleApi.listProductMappings(channelAccountId ? { channelAccountId } : undefined),
        saleApi.listRetryCandidates(channelAccountId ? { channelAccountId } : undefined),
      ]);

      setData({
        accounts,
        orders,
        mappings,
        syncLogs,
        retryCandidates,
      });
    } catch {
      setData((current) => ({ ...current, orders: [], mappings: [], syncLogs: [], retryCandidates: [] }));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData(selectedAccountId || undefined);
  }, [selectedAccountId, loadData]);

  const metrics = useMemo(() => {
    const issueOrders = data.orders.filter((order) => deriveOrderIssue(order)).length;
    const pendingBindingCount = data.mappings.filter((item) => !isMappedStatus(item.mappingStatus)).length;
    const anomalyShopCount = data.accounts.filter((account) => {
      const pendingBinding = data.mappings.filter((item) => item.channelAccountId === account.id && !isMappedStatus(item.mappingStatus)).length;
      const issueCount = data.orders.filter((item) => item.channelAccountId === account.id && deriveOrderIssue(item)).length;
      const failedSyncCount = data.syncLogs.filter((item) => item.channelAccountId === account.id && !item.success).length;
      return pendingBinding > 0 || issueCount > 0 || failedSyncCount > 0;
    }).length;

    return {
      pendingBindingCount,
      issueOrders,
      anomalyShopCount,
      blockedTaskCount: data.retryCandidates.length,
    };
  }, [data.accounts, data.mappings, data.orders, data.retryCandidates.length, data.syncLogs]);

  const shopRiskRows = useMemo<ShopRiskRow[]>(() => {
    const rows = data.accounts
      .map((account) => {
        const orders = data.orders.filter((item) => item.channelAccountId === account.id);
        const issueOrders = orders.filter((item) => deriveOrderIssue(item));
        const mappings = data.mappings.filter((item) => item.channelAccountId === account.id);
        const pendingBindingCount = mappings.filter((item) => !isMappedStatus(item.mappingStatus)).length;
        const failedSyncCount = data.syncLogs.filter((item) => item.channelAccountId === account.id && !item.success).length;
        const lastSuccessAt = data.syncLogs
          .filter((item) => item.channelAccountId === account.id && item.success)
          .map((item) => item.occurredAt || item.createdAt)
          .filter(Boolean)
          .sort()
          .at(-1);

        const totalRisk = pendingBindingCount + issueOrders.length + failedSyncCount;
        if (!totalRisk) {
          return null;
        }

        if (pendingBindingCount > 0) {
          return {
            account,
            topRiskType: '商品待绑定',
            totalRisk,
            pendingBindingCount,
            issueOrderCount: issueOrders.length,
            failedSyncCount,
            lastSuccessAt,
            nextActionLabel: '去商品绑定',
            nextActionRoute: '/sale/products/bindings',
          };
        }

        if (issueOrders.length > 0) {
          return {
            account,
            topRiskType: '问题订单待处理',
            totalRisk,
            pendingBindingCount,
            issueOrderCount: issueOrders.length,
            failedSyncCount,
            lastSuccessAt,
            nextActionLabel: '去问题订单',
            nextActionRoute: '/sale/orders/issues',
          };
        }

        return {
          account,
          topRiskType: '同步异常待排查',
          totalRisk,
          pendingBindingCount,
          issueOrderCount: issueOrders.length,
          failedSyncCount,
          lastSuccessAt,
          nextActionLabel: '去治理中心',
          nextActionRoute: '/sale/governance/sync',
        };
      })
      .filter(Boolean) as ShopRiskRow[];

    return rows.sort((left, right) => right.totalRisk - left.totalRisk).slice(0, 6);
  }, [data.accounts, data.mappings, data.orders, data.syncLogs]);

  const taskCards = useMemo(
    () => [
      {
        key: 'binding',
        title: '商品绑定',
        value: metrics.pendingBindingCount,
        brief: '还有商品没绑到本地款式',
        actionLabel: '去绑定',
        action: () => navigate('/sale/products/bindings'),
      },
      {
        key: 'issues',
        title: '问题订单',
        value: metrics.issueOrders,
        brief: '这些订单还需要人工跟进',
        actionLabel: '去处理',
        action: () => navigate('/sale/orders/issues'),
      },
      {
        key: 'risk',
        title: '高风险 SKU',
        value: 0,
        brief: '缺口和断货风险先在经营数据里看',
        actionLabel: '去查看',
        action: () => navigate('/sale/insights/risk'),
      },
      {
        key: 'sync',
        title: '同步异常',
        value: metrics.blockedTaskCount,
        brief: '同步失败记录需要排查',
        actionLabel: '去排查',
        action: () => navigate('/sale/governance/sync'),
      },
    ],
    [metrics.anomalyShopCount, metrics.blockedTaskCount, metrics.issueOrders, metrics.pendingBindingCount, navigate],
  );

  const syncHealth = useMemo(() => {
    const groups = new Map<string, { success: number; failed: number }>();
    data.syncLogs.forEach((item) => {
      const key = item.bizType || 'UNKNOWN';
      const current = groups.get(key) ?? { success: 0, failed: 0 };
      if (item.success) {
        current.success += 1;
      } else {
        current.failed += 1;
      }
      groups.set(key, current);
    });
    return Array.from(groups.entries()).slice(0, 4);
  }, [data.syncLogs]);

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }} className="sale-dashboard-page">
      <SaleHero
        className="sale-dashboard-hero"
        eyebrow="销售中心 / 今日工作台"
        title="今日工作台"
        subtitle="先看今天要处理的店铺、商品和订单。"
        extra={
          <div className="sale-center-filter-bar">
            <div className="sale-center-filter-group">
              <div>
                <Typography.Text type="secondary">店铺范围</Typography.Text>
                <div style={{ marginTop: 8 }}>
                  <SaleChannelAccountSelect
                    accounts={data.accounts}
                    allowAll
                    value={selectedAccountId}
                    onChange={setSelectedAccountId}
                    allLabel="全部店铺"
                    placeholder="筛选店铺"
                    size="large"
                    width={320}
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

      <Spin spinning={loading}>
        <Row gutter={[16, 16]} className="sale-dashboard-metric-row">
          <Col xs={24} sm={12} xl={6}>
            <SaleMetricCard className="sale-dashboard-metric-card" title="待绑定商品" value={metrics.pendingBindingCount} hint="优先补齐映射关系" tone="warning" />
          </Col>
          <Col xs={24} sm={12} xl={6}>
            <SaleMetricCard className="sale-dashboard-metric-card" title="问题订单" value={metrics.issueOrders} hint="需要人工跟进" tone="danger" />
          </Col>
          <Col xs={24} sm={12} xl={6}>
            <SaleMetricCard className="sale-dashboard-metric-card" title="高风险 SKU" value={0} hint="缺口和断货风险商品" tone="warning" />
          </Col>
          <Col xs={24} sm={12} xl={6}>
            <SaleMetricCard className="sale-dashboard-metric-card" title="同步异常任务" value={metrics.blockedTaskCount} hint="先排查失败原因" tone="default" />
          </Col>
        </Row>

        <SaleSection className="sale-dashboard-shop-section" title="重点异常店铺" extra={<SaleActionButton label="进入店铺管理" onClick={() => navigate('/sale/shops')} />}>
          {!shopRiskRows.length ? (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="当前没有需要优先处理的店铺" />
          ) : (
            shopRiskRows.map((row) => (
              <div key={row.account.id} className="sale-center-object-card sale-dashboard-shop-card">
                <div className="sale-center-object-card__top">
                  <div>
                    <div className="sale-center-object-card__title sale-dashboard-shop-title">{getShopLabel(row.account)}</div>
                    <div className="sale-center-object-card__sub sale-dashboard-shop-sub">
                      最近成功同步 {formatSaleDateTime(row.lastSuccessAt)}
                    </div>
                  </div>
                  <Space wrap>
                    <SaleToneTag label={row.topRiskType} tone="warning" />
                    <SaleStatusTag value={row.failedSyncCount ? 'DEGRADED' : 'ACTIVE'} label={row.failedSyncCount ? '部分异常' : '正常'} />
                    <SaleActionButton label={row.nextActionLabel} onClick={() => navigate(row.nextActionRoute)} />
                  </Space>
                </div>
                <div className="sale-center-rich-grid">
                  <div className="sale-center-rich-cell">
                    <div className="sale-center-rich-cell__label">待绑定商品</div>
                    <div className="sale-center-rich-cell__value">{row.pendingBindingCount}</div>
                  </div>
                  <div className="sale-center-rich-cell">
                    <div className="sale-center-rich-cell__label">问题订单</div>
                    <div className="sale-center-rich-cell__value">{row.issueOrderCount}</div>
                  </div>
                  <div className="sale-center-rich-cell">
                    <div className="sale-center-rich-cell__label">同步失败</div>
                    <div className="sale-center-rich-cell__value">{row.failedSyncCount}</div>
                  </div>
                </div>
              </div>
            ))
          )}
        </SaleSection>

        <SaleSection className="sale-dashboard-task-section" title="今日待处理">
          <Row gutter={[16, 16]}>
            {taskCards.map((item) => (
              <Col xs={24} md={12} xl={6} key={item.key}>
                <div className="sale-center-object-card sale-dashboard-task-card">
                  <div className="sale-center-object-card__top">
                    <div className="sale-center-object-card__title">{item.title}</div>
                    <SaleToneTag label={`${item.value}`} tone={item.value ? 'danger' : 'success'} />
                  </div>
                  <div className="sale-center-object-card__sub" style={{ marginTop: 10 }}>
                    {item.brief}
                  </div>
                  <div style={{ marginTop: 16 }}>
                    <SaleActionButton label={item.actionLabel} onClick={item.action} />
                  </div>
                </div>
              </Col>
            ))}
          </Row>
        </SaleSection>

        <Row gutter={[16, 16]}>
          <Col xs={24} xl={12}>
            <SaleSection className="sale-dashboard-summary-section" title="同步情况">
              {syncHealth.length ? (
                <Row gutter={[12, 12]}>
                  {syncHealth.map(([bizType, stats]) => (
                    <Col xs={24} sm={12} key={bizType}>
                      <SaleMiniStat
                        label={syncBizTypeLabelMap[bizType] || bizType}
                        value={`成功 ${stats.success} / 失败 ${stats.failed}`}
                        tone={stats.failed > 0 ? 'warning' : 'success'}
                      />
                    </Col>
                  ))}
                </Row>
              ) : (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无同步记录" />
              )}
            </SaleSection>
          </Col>
          <Col xs={24} xl={12}>
            <SaleSection className="sale-dashboard-summary-section" title="今日概览">
              <Row gutter={[12, 12]}>
                <Col xs={24} sm={12}>
                  <SaleMiniStat label="店铺数量" value={toDisplayText(data.accounts.length)} tone="default" />
                </Col>
                <Col xs={24} sm={12}>
                  <SaleMiniStat label="异常店铺" value={toDisplayText(shopRiskRows.length)} tone="warning" />
                </Col>
                <Col xs={24} sm={12}>
                  <SaleMiniStat label="订单总数" value={toDisplayText(data.orders.length)} tone="default" />
                </Col>
                <Col xs={24} sm={12}>
                  <SaleMiniStat label="待重试任务" value={toDisplayText(data.retryCandidates.length)} tone="danger" />
                </Col>
              </Row>
            </SaleSection>
          </Col>
        </Row>
      </Spin>
    </Space>
  );
};

export default SaleDashboard;
