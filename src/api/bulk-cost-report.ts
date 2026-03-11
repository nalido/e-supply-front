import http from './http';
import { tenantStore } from '../stores/tenant';
import type {
  BulkCostAggregation,
  BulkCostListParams,
  BulkCostListResponse,
  BulkCostOrderItem,
} from '../types/bulk-cost-report';

const ensureTenantId = (): string => {
  const tenantId = tenantStore.getTenantId();
  if (!tenantId) {
    throw new Error('未获取到企业信息，请重新登录');
  }
  return tenantId;
};

type BackendAggregation = BulkCostAggregation;

type BackendOrderItem = Partial<BulkCostOrderItem> & { id?: string | number };

type BackendListResponse = {
  items: BackendOrderItem[];
  total: number;
};

const adaptOrderItem = (item: BackendOrderItem): BulkCostOrderItem => ({
  id: item.id ? String(item.id) : crypto.randomUUID(),
  imageUrl: item.imageUrl ?? '',
  styleCode: item.styleCode ?? '--',
  styleName: item.styleName ?? '--',
  orderNumber: item.orderNumber ?? '--',
  orderStatus: item.orderStatus ?? '--',
  customerId: item.customerId ?? '--',
  customerName: item.customerName ?? '--',
  calculatedQty: item.calculatedQty ?? 0,
  receivedQty: item.receivedQty ?? 0,
  unitPrice: item.unitPrice ?? 0,
  orderDate: item.orderDate ?? '',
  receiptDate: item.receiptDate ?? '',
  costs: item.costs ?? {},
  actualCost: item.actualCost,
  estimatedCost: item.estimatedCost,
});

export const bulkCostReportService = {
  async getAggregation(): Promise<BulkCostAggregation> {
    const tenantId = ensureTenantId();
    const response = await http.get<BackendAggregation>(
      '/api/v1/orders/reports/bulk-cost/aggregation',
      { params: { tenantId } },
    );
    return response.data;
  },

  async getList(params: BulkCostListParams): Promise<BulkCostListResponse> {
    const tenantId = ensureTenantId();
    const response = await http.get<BackendListResponse>('/api/v1/orders/reports/bulk-cost', {
      params: {
        tenantId,
        keyword: params.keyword,
        orderStartDate: params.orderStartDate,
        orderEndDate: params.orderEndDate,
        receiptStartDate: params.receiptStartDate,
        receiptEndDate: params.receiptEndDate,
        customerId: params.customerId,
        page: params.page - 1,
        size: params.pageSize,
      },
    });
    return {
      list: response.data.items.map(adaptOrderItem),
      total: response.data.total ?? 0,
    };
  },

  async export(params: BulkCostListParams) {
    const tenantId = ensureTenantId();
    const response = await http.post<{ fileUrl: string }>(
      '/api/v1/orders/reports/bulk-cost/export',
      {
        tenantId,
        keyword: params.keyword,
        orderStartDate: params.orderStartDate,
        orderEndDate: params.orderEndDate,
        receiptStartDate: params.receiptStartDate,
        receiptEndDate: params.receiptEndDate,
        customerId: params.customerId,
      },
    );
    return response.data;
  },
};
