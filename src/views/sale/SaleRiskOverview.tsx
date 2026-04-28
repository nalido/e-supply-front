import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Empty, Space, Typography } from 'antd';
import SaleChannelAccountSelect from '../../components/sale/SaleChannelAccountSelect';
import { saleApi } from '../../api/sale';
import {
  ProductThumb,
  SaleHero,
  SaleMetricCard,
  SaleSection,
  SaleToneTag,
  toDisplayText,
} from '../../components/sale/SaleCenterUI';
import type { SaleChannelAccount, SaleInventoryItem } from '../../types/sale';
import { getInventoryRiskLevel } from './sale-center-helpers';

const SaleRiskOverview = () => {
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<SaleChannelAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [inventories, setInventories] = useState<SaleInventoryItem[]>([]);

  const loadData = useCallback(async (accountId: string) => {
    if (!accountId) {
      setInventories([]);
      return;
    }
    setLoading(true);
    try {
      const [accountList, inventoryList] = await Promise.all([
        saleApi.listChannelAccounts(),
        saleApi.listInventories(accountId).catch(() => []),
      ]);
      setAccounts(accountList);
      setInventories(inventoryList);
    } catch {
      setInventories([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void saleApi.listChannelAccounts().then((list) => {
      setAccounts(list);
      if (!selectedAccountId && list[0]) {
        setSelectedAccountId(list[0].id);
      }
    });
  }, [selectedAccountId]);

  useEffect(() => {
    if (selectedAccountId) {
      void loadData(selectedAccountId);
    }
  }, [selectedAccountId, loadData]);

  const metrics = useMemo(() => {
    const highRiskSkuCount = inventories.filter((item) => getInventoryRiskLevel(item) !== 'default').length;
    const lackSkuCount = inventories.filter((item) => (item.lackQuantity || 0) > 0).length;
    const unboundHotSkuCount = inventories.filter((item) => (item.lastSevenDaysSaleVolume || 0) >= 10 && item.mappingStatus !== 'ACTIVE' && item.mappingStatus !== 'MAPPED').length;
    const salesVolume = inventories.reduce((sum, item) => sum + (item.lastSevenDaysSaleVolume || 0), 0);
    return { highRiskSkuCount, lackSkuCount, unboundHotSkuCount, salesVolume };
  }, [inventories]);

  const ranked = useMemo(
    () =>
      [...inventories]
        .sort((left, right) => {
          const leftScore = (left.lackQuantity || 0) * 10 + Math.max(0, 7 - (left.availableSaleDays || 0)) + (left.lastSevenDaysSaleVolume || 0);
          const rightScore = (right.lackQuantity || 0) * 10 + Math.max(0, 7 - (right.availableSaleDays || 0)) + (right.lastSevenDaysSaleVolume || 0);
          return rightScore - leftScore;
        })
        .slice(0, 12),
    [inventories],
  );

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <SaleHero
        eyebrow="经营数据 / 风险总览"
        title="经营数据先服务于风险判断，而不是变成孤立报表"
        subtitle="一期优先把高风险 SKU、缺口、可售天数和未绑定高销量商品聚焦出来，支持快速跳转到绑定和治理。"
        extra={
          <div className="sale-center-filter-bar">
            <div className="sale-center-filter-group">
              <div>
                <Typography.Text type="secondary">店铺</Typography.Text>
                <div style={{ marginTop: 8 }}>
                  <SaleChannelAccountSelect
                    accounts={accounts}
                    value={selectedAccountId}
                    onChange={setSelectedAccountId}
                    placeholder="选择店铺"
                    size="large"
                    width={300}
                  />
                </div>
              </div>
            </div>
            <Button size="large" onClick={() => void loadData(selectedAccountId)}>
              刷新
            </Button>
          </div>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        <SaleMetricCard title="近 7 天销量" value={metrics.salesVolume} hint="当前库存读取结果中的近 7 天累计销量" />
        <SaleMetricCard title="高风险 SKU 数" value={metrics.highRiskSkuCount} hint="缺口或可售天数过低" tone="danger" />
        <SaleMetricCard title="缺口 SKU 数" value={metrics.lackSkuCount} hint="库存缺口明确存在" tone="warning" />
        <SaleMetricCard title="未绑定高销量 SKU" value={metrics.unboundHotSkuCount} hint="销量已起来但绑定未闭环" tone="warning" />
      </div>

      <SaleSection title="风险影响榜" description="一期先给出可解释的风险排序和直接动作。">
        {!ranked.length ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={loading ? '加载中...' : '当前没有售卖风险数据'} />
        ) : (
          ranked.map((item) => {
            const riskTone = getInventoryRiskLevel(item);
            const reason =
              (item.lackQuantity || 0) > 0
                ? '库存存在明确缺口'
                : (item.availableSaleDays || 999) <= 5
                  ? '可售天数过低'
                  : item.mappingStatus !== 'ACTIVE' && item.mappingStatus !== 'MAPPED'
                    ? '高销量但未绑定'
                    : '风险较低';
            return (
              <div key={item.platformSkuId} className="sale-center-object-card">
                <div className="sale-center-object-card__body" style={{ marginTop: 0 }}>
                  <ProductThumb src={undefined} alt={item.goodsName || item.platformSkuCode || ''} />
                  <div className="sale-center-object-card__content">
                    <div className="sale-center-object-card__top">
                      <div>
                        <div className="sale-center-object-card__title">{toDisplayText(item.goodsName)}</div>
                        <div className="sale-center-object-card__sub">平台 SKU {toDisplayText(item.platformSkuCode || item.platformSkuId)}</div>
                      </div>
                      <Space wrap>
                        <SaleToneTag label={reason} tone={riskTone === 'danger' ? 'danger' : riskTone === 'warning' ? 'warning' : 'success'} />
                        <SaleToneTag
                          label={item.mappingStatus === 'ACTIVE' || item.mappingStatus === 'MAPPED' ? '已绑定' : '待绑定'}
                          tone={item.mappingStatus === 'ACTIVE' || item.mappingStatus === 'MAPPED' ? 'success' : 'warning'}
                        />
                      </Space>
                    </div>
                    <div className="sale-center-rich-grid">
                      <div className="sale-center-rich-cell">
                        <div className="sale-center-rich-cell__label">近 7 天销量</div>
                        <div className="sale-center-rich-cell__value">{toDisplayText(item.lastSevenDaysSaleVolume)}</div>
                      </div>
                      <div className="sale-center-rich-cell">
                        <div className="sale-center-rich-cell__label">可售天数</div>
                        <div className="sale-center-rich-cell__value">{toDisplayText(item.availableSaleDays)}</div>
                      </div>
                      <div className="sale-center-rich-cell">
                        <div className="sale-center-rich-cell__label">缺口数量</div>
                        <div className="sale-center-rich-cell__value">{toDisplayText(item.lackQuantity)}</div>
                      </div>
                      <div className="sale-center-rich-cell">
                        <div className="sale-center-rich-cell__label">仓内库存</div>
                        <div className="sale-center-rich-cell__value">{toDisplayText(item.warehouseInventoryNum)}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </SaleSection>
    </Space>
  );
};

export default SaleRiskOverview;
