import http from './http';
import { tenantStore } from '../stores/tenant';
import type {
  ProductionComparisonListParams,
  ProductionComparisonListResponse,
  ProductionComparisonRecord,
  ProductionComparisonStage,
  ProductionComparisonSummary,
} from '../types/order-production-comparison';

const ensureTenantId = (): string => {
  const tenantId = tenantStore.getTenantId();
  if (!tenantId) {
    throw new Error('未获取到企业信息，请重新登录');
  }
  return tenantId;
};

type BackendRecord = Partial<ProductionComparisonRecord> & { id?: string | number };

type BackendResponse = {
  list: BackendRecord[];
  total: number;
  summary: Partial<ProductionComparisonSummary> & { progress?: Record<string, number> };
  stages: ProductionComparisonStage[];
};

const adaptRecord = (record: BackendRecord): ProductionComparisonRecord => ({
  id: record.id ? String(record.id) : crypto.randomUUID(),
  imageUrl: record.imageUrl ?? '',
  orderNumber: record.orderNumber ?? '--',
  orderStatus: record.orderStatus ?? '--',
  materialStatus: record.materialStatus ?? '--',
  customer: record.customer ?? '--',
  merchandiser: record.merchandiser ?? '--',
  styleNumber: record.styleNumber ?? '--',
  styleName: record.styleName ?? '--',
  orderDate: record.orderDate ?? '',
  expectedDelivery: record.expectedDelivery ?? '',
  orderQty: record.orderQty ?? 0,
  unit: record.unit ?? '',
  plannedCutQty: record.plannedCutQty ?? 0,
  progress: record.progress ?? {},
  warehousingQty: record.warehousingQty ?? 0,
  deliveryQty: record.deliveryQty ?? 0,
  inventoryQty: record.inventoryQty ?? 0,
});

const adaptSummary = (
  summary: BackendResponse['summary'],
): ProductionComparisonSummary => ({
  orderQty: summary.orderQty ?? 0,
  plannedCutQty: summary.plannedCutQty ?? 0,
  progress: summary.progress ?? {},
  warehousingQty: summary.warehousingQty ?? 0,
  deliveryQty: summary.deliveryQty ?? 0,
  inventoryQty: summary.inventoryQty ?? 0,
});

export const productionComparisonService = {
  async getList(
    params: ProductionComparisonListParams,
  ): Promise<ProductionComparisonListResponse> {
    const tenantId = ensureTenantId();
    const response = await http.get<BackendResponse>('/api/v1/production/comparison', {
      params: {
        tenantId,
        keyword: params.keyword,
        page: params.page - 1,
        size: params.pageSize,
        sortBy: params.sortBy,
        order: params.order === 'ascend' ? 'asc' : params.order === 'descend' ? 'desc' : undefined,
      },
    });
    return {
      list: response.data.list.map(adaptRecord),
      total: response.data.total ?? 0,
      summary: adaptSummary(response.data.summary ?? {}),
      stages: response.data.stages ?? [],
    };
  },

  async export(params: ProductionComparisonListParams) {
    const tenantId = ensureTenantId();
    const response = await http.post<{ fileUrl: string }>(
      '/api/v1/production/comparison/export',
      {
        tenantId,
        keyword: params.keyword,
        sortBy: params.sortBy,
        order: params.order,
      },
    );
    return response.data;
  },
};
