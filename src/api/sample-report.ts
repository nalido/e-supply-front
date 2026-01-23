import type {
  SampleOrderAggregation,
  SampleOrderComparisonItem,
  SampleOrderComparisonParams,
  SampleOrderComparisonResponse,
} from '../types/sample-order-comparison-report';
import http from './http';
import { tenantStore } from '../stores/tenant';

type BackendRecord = {
  styleId?: number;
  styleNumber?: string;
  styleName?: string;
  imageUrl?: string;
  sampledTimes: number;
  sampledQuantity: number;
  orderedTimes: number;
  orderedQuantity: number;
};

type BackendListResponse = {
  items: BackendRecord[];
  total: number;
  page: number;
  size: number;
};

type ExportResponse = {
  fileUrl: string;
};

const ensureTenantId = (): string => {
  const tenantId = tenantStore.getTenantId();
  if (!tenantId) {
    throw new Error('未选择企业，请重新登录或刷新页面');
  }
  return tenantId;
};

const adaptRecord = (record: BackendRecord): SampleOrderComparisonItem => ({
  id:
    record.styleId
      ? String(record.styleId)
      : record.styleNumber ?? `style-${Math.random().toString(36).slice(2, 8)}`,
  imageUrl: record.imageUrl ?? undefined,
  styleNumber: record.styleNumber ?? '--',
  styleName: record.styleName ?? '--',
  sampledTimes: record.sampledTimes ?? 0,
  sampledQuantity: record.sampledQuantity ?? 0,
  orderedTimes: record.orderedTimes ?? 0,
  orderedQuantity: record.orderedQuantity ?? 0,
});

const adaptListResponse = (payload: BackendListResponse): SampleOrderComparisonResponse => ({
  list: (payload.items ?? []).map(adaptRecord),
  total: payload.total ?? 0,
});

export const sampleOrderComparisonReportService = {
  async getAggregation(): Promise<SampleOrderAggregation> {
    const tenantId = ensureTenantId();
    const response = await http.get<SampleOrderAggregation>(
      '/api/v1/sample/reports/order-comparison/aggregation',
      { params: { tenantId } },
    );
    return response.data;
  },

  async getList(params: SampleOrderComparisonParams): Promise<SampleOrderComparisonResponse> {
    const tenantId = ensureTenantId();
    const response = await http.get<BackendListResponse>('/api/v1/sample/reports/order-comparison', {
      params: {
        tenantId,
        styleName: params.styleName,
        sortBy: params.sortBy,
        order: params.order,
        page: params.page,
        size: params.pageSize,
      },
    });
    return adaptListResponse(response.data);
  },

  async export(params: SampleOrderComparisonParams): Promise<ExportResponse> {
    const tenantId = ensureTenantId();
    const response = await http.post<ExportResponse>(
      '/api/v1/sample/reports/order-comparison/export',
      {
        tenantId,
        styleName: params.styleName,
        sortBy: params.sortBy,
        order: params.order,
      },
    );
    return response.data;
  },
};
