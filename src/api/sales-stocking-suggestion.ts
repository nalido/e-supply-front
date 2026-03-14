import http from './http';
import { tenantStore } from '../stores/tenant';
import type {
  SalesStockingSuggestionMaterial,
  SalesStockingSuggestionQueryParams,
  SalesStockingSuggestionQueryResult,
  SalesStockingSuggestionStyle,
  SalesStockingSuggestionStyleContribution,
  SalesStockingSuggestionSummary,
  SalesStockingWeeklySalesMode,
} from '../types/sales-stocking-suggestion';

type BackendSuggestionStyle = {
  styleId?: number;
  styleNo?: string;
  styleName?: string;
  weeklySalesMode?: string;
  manualWeeklySales?: number;
  autoWeeklySales?: number;
  effectiveWeeklySales?: number;
  bomMaterialCount?: number;
  note?: string;
};

type BackendSuggestionStyleContribution = {
  styleId?: number;
  styleNo?: string;
  styleName?: string;
  weeklySalesMode?: string;
  weeklySalesQty?: number;
  bomConsumption?: number;
  lossRate?: number;
  suggestedStockQty?: number;
};

type BackendSuggestionMaterial = {
  materialId?: number;
  materialCode?: string;
  materialName?: string;
  materialType?: string;
  unit?: string;
  imageUrl?: string;
  supplier?: string;
  suggestedStockQty?: number;
  stockInventoryQty?: number;
  suggestedReplenishQty?: number;
  styleContributions?: BackendSuggestionStyleContribution[];
};

type BackendSuggestionSummary = {
  selectedStyleCount?: number;
  materialCount?: number;
  totalSuggestedStockQty?: number;
  totalSuggestedReplenishQty?: number;
};

type BackendSuggestionResult = {
  coverageWeeks?: number;
  autoSalesWeeks?: number;
  styles?: BackendSuggestionStyle[];
  materials?: BackendSuggestionMaterial[];
  summary?: BackendSuggestionSummary;
};

const toNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
};

const toMode = (value: string | undefined): SalesStockingWeeklySalesMode =>
  value?.toUpperCase() === 'MANUAL' ? 'MANUAL' : 'AUTO';

const ensureTenantId = (): number => {
  const tenantId = tenantStore.getTenantId();
  if (!tenantId) {
    throw new Error('未找到租户信息，请重新登录');
  }
  const parsed = Number(tenantId);
  if (!Number.isFinite(parsed)) {
    throw new Error('租户信息无效，请刷新后重试');
  }
  return parsed;
};

const adaptStyle = (style: BackendSuggestionStyle): SalesStockingSuggestionStyle => ({
  styleId: String(style.styleId ?? ''),
  styleNo: style.styleNo ?? '--',
  styleName: style.styleName ?? '--',
  weeklySalesMode: toMode(style.weeklySalesMode),
  manualWeeklySales: toNumber(style.manualWeeklySales),
  autoWeeklySales: toNumber(style.autoWeeklySales),
  effectiveWeeklySales: toNumber(style.effectiveWeeklySales),
  bomMaterialCount: toNumber(style.bomMaterialCount),
  note: style.note,
});

const adaptContribution = (
  contribution: BackendSuggestionStyleContribution,
): SalesStockingSuggestionStyleContribution => ({
  styleId: String(contribution.styleId ?? ''),
  styleNo: contribution.styleNo ?? '--',
  styleName: contribution.styleName ?? '--',
  weeklySalesMode: toMode(contribution.weeklySalesMode),
  weeklySalesQty: toNumber(contribution.weeklySalesQty),
  bomConsumption: toNumber(contribution.bomConsumption),
  lossRate: toNumber(contribution.lossRate),
  suggestedStockQty: toNumber(contribution.suggestedStockQty),
});

const adaptMaterial = (material: BackendSuggestionMaterial): SalesStockingSuggestionMaterial => ({
  materialId: String(material.materialId ?? ''),
  materialCode: material.materialCode ?? '--',
  materialName: material.materialName ?? '--',
  materialType: material.materialType?.toLowerCase() as SalesStockingSuggestionMaterial['materialType'],
  unit: material.unit,
  imageUrl: material.imageUrl,
  supplier: material.supplier,
  suggestedStockQty: toNumber(material.suggestedStockQty),
  stockInventoryQty: toNumber(material.stockInventoryQty),
  suggestedReplenishQty: toNumber(material.suggestedReplenishQty),
  styleContributions: (material.styleContributions ?? []).map(adaptContribution),
});

const adaptSummary = (summary: BackendSuggestionSummary | undefined): SalesStockingSuggestionSummary => ({
  selectedStyleCount: toNumber(summary?.selectedStyleCount),
  materialCount: toNumber(summary?.materialCount),
  totalSuggestedStockQty: toNumber(summary?.totalSuggestedStockQty),
  totalSuggestedReplenishQty: toNumber(summary?.totalSuggestedReplenishQty),
});

export const salesStockingSuggestionService = {
  async query(params: SalesStockingSuggestionQueryParams): Promise<SalesStockingSuggestionQueryResult> {
    const tenantId = ensureTenantId();
    const response = await http.post<BackendSuggestionResult>(
      '/api/v1/inventory/materials/sales-stocking-suggestions/query',
      {
        tenantId,
        materialType: params.materialType,
        coverageWeeks: params.coverageWeeks,
        autoSalesWeeks: params.autoSalesWeeks,
        restockNeeded: params.restockNeeded,
        keyword: params.keyword,
        styles: params.styles.map((style) => ({
          styleId: Number(style.styleId),
          weeklySalesMode: style.weeklySalesMode,
          manualWeeklySales: style.weeklySalesMode === 'MANUAL' ? style.manualWeeklySales : undefined,
        })),
      },
    );

    return {
      coverageWeeks: toNumber(response.data.coverageWeeks, params.coverageWeeks),
      autoSalesWeeks: toNumber(response.data.autoSalesWeeks, params.autoSalesWeeks),
      styles: (response.data.styles ?? []).map(adaptStyle),
      materials: (response.data.materials ?? []).map(adaptMaterial),
      summary: adaptSummary(response.data.summary),
    };
  },
};

export default salesStockingSuggestionService;
