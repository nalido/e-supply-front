import http from './http';
import { tenantStore } from '../stores/tenant';
import type {
  OrderMaterialRequirementListParams,
  OrderMaterialRequirementListResponse,
  OrderMaterialRequirementListItem,
} from '../types/order-material-requirement-report';

const ensureTenantId = (): string => {
  const tenantId = tenantStore.getTenantId();
  if (!tenantId) {
    throw new Error('未获取到企业信息，请重新登录');
  }
  return tenantId;
};

type BackendRecord = Partial<OrderMaterialRequirementListItem> & { id?: string | number };

type BackendListResponse = {
  items?: BackendRecord[];
  list?: BackendRecord[];
  total: number;
};

const adaptRecord = (record: BackendRecord): OrderMaterialRequirementListItem => ({
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

export const orderMaterialRequirementReportService = {
  async getList(
    params: OrderMaterialRequirementListParams,
  ): Promise<OrderMaterialRequirementListResponse> {
    const tenantId = ensureTenantId();
    const response = await http.get<BackendListResponse>(
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
      list: items.map(adaptRecord),
      total: response.data.total ?? 0,
    };
  },
};
