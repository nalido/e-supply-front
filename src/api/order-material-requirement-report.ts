import http from './http';
import { tenantStore } from '../stores/tenant';
import type {
  OrderMaterialRequirementListParams,
  OrderMaterialRequirementListResponse,
  OrderMaterialRequirementListItem,
  SalesStockingSuggestionListItem,
  SalesStockingSuggestionListParams,
  SalesStockingSuggestionListResponse,
} from '../types/order-material-requirement-report';

const ensureTenantId = (): string => {
  const tenantId = tenantStore.getTenantId();
  if (!tenantId) {
    throw new Error('未获取到企业信息，请重新登录');
  }
  return tenantId;
};

type BackendOrderRecord = Partial<OrderMaterialRequirementListItem> & { id?: string | number };
type BackendSalesRecord = Partial<SalesStockingSuggestionListItem> & {
  id?: string | number;
  name?: string;
  materialName?: string;
  materialCode?: string;
  materialSku?: string;
  salesMode?: 'AUTO' | 'MANUAL' | 'auto' | 'manual';
  weeklySalesSource?: 'AUTO' | 'MANUAL' | 'auto' | 'manual';
  salesSource?: 'AUTO' | 'MANUAL' | 'auto' | 'manual';
  weeklySalesQty?: number;
  autoSalesWeeks?: number;
  bomConsumption?: number;
  stockInventoryQty?: number;
  stockInTransitQty?: number;
};

type BackendListResponse<T> = {
  items?: T[];
  list?: T[];
  total?: number;
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

const adaptOrderRecord = (record: BackendOrderRecord): OrderMaterialRequirementListItem => ({
  id: record.id ? String(record.id) : crypto.randomUUID(),
  imageUrl: record.imageUrl ?? '',
  name: record.name ?? '--',
  supplier: record.supplier ?? '--',
  materialCategory: record.materialCategory ?? '--',
  color: record.color ?? '--',
  width: record.width,
  grammage: record.grammage,
  allowance: record.allowance,
  supplierModel: record.supplierModel ?? '--',
  supplierColor: record.supplierColor ?? '--',
  stockPurchaseQty: record.stockPurchaseQty ?? 0,
  stockInventoryQty: record.stockInventoryQty ?? 0,
  stockInTransitQty: record.stockInTransitQty ?? 0,
  restockQty: record.restockQty ?? 0,
  totalRequiredQty: record.totalRequiredQty ?? 0,
});

const adaptSalesRecord = (record: BackendSalesRecord): SalesStockingSuggestionListItem => {
  const stockInventoryQty = toNumber(record.stockInventoryQty);
  const stockInTransitQty = toNumber(record.stockInTransitQty);
  return {
    id: record.id ? `${String(record.id)}-${record.styleNo ?? ''}` : crypto.randomUUID(),
    imageUrl: record.imageUrl ?? '',
    materialName: record.materialName ?? record.name ?? '--',
    materialCode: record.materialCode ?? record.materialSku ?? '--',
    supplier: record.supplier ?? '--',
    materialCategory: record.materialCategory ?? '--',
    color: record.color ?? '--',
    width: record.width,
    grammage: record.grammage,
    styleNo: record.styleNo,
    styleName: record.styleName,
    weeklySales: toNumber(record.weeklySales ?? record.weeklySalesQty),
    weeklySalesSource: (record.salesMode ?? record.weeklySalesSource ?? record.salesSource ?? 'AUTO').toString().toUpperCase() === 'MANUAL' ? 'MANUAL' : 'AUTO',
    salesWeeks: toNumber(record.salesWeeks ?? record.autoSalesWeeks, 0) || undefined,
    coverageWeeks: toNumber(record.coverageWeeks, 0),
    consumption: toNumber(record.consumption ?? record.bomConsumption),
    lossRate: toNumber(record.lossRate),
    suggestedStockQty: toNumber(record.suggestedStockQty),
    availableQty: stockInventoryQty + stockInTransitQty,
    suggestedReplenishQty: toNumber(record.suggestedReplenishQty),
    unit: record.unit,
  };
};

export const orderMaterialRequirementReportService = {
  async getList(
    params: OrderMaterialRequirementListParams,
  ): Promise<OrderMaterialRequirementListResponse> {
    const tenantId = ensureTenantId();
    const response = await http.get<BackendListResponse<BackendOrderRecord>>(
      '/api/v1/orders/reports/material-requirement',
      {
        params: {
          tenantId,
          materialType: params.materialType,
          restockNeeded: params.restockNeeded,
          name: params.name,
          page: params.page - 1,
          size: params.pageSize,
        },
      },
    );
    const items = response.data.items ?? response.data.list ?? [];
    return {
      list: items.map(adaptOrderRecord),
      total: response.data.total ?? 0,
    };
  },

  async getSalesStockingSuggestions(
    params: SalesStockingSuggestionListParams,
  ): Promise<SalesStockingSuggestionListResponse> {
    const tenantId = ensureTenantId();
    const response = await http.get<BackendListResponse<BackendSalesRecord>>(
      '/api/v1/orders/reports/material-requirement/sales-planning',
      {
        params: {
          tenantId,
          materialType: params.materialType,
          restockNeeded: params.restockNeeded,
          name: params.name,
          page: params.page - 1,
          size: params.pageSize,
        },
      },
    );
    const items = response.data.items ?? response.data.list ?? [];
    return {
      list: items.map(adaptSalesRecord),
      total: response.data.total ?? 0,
    };
  },
};
