import http from './http';
import { tenantStore } from '../stores/tenant';
import type {
  OutsourcingCuttingDetailGroupKey,
  OutsourcingCuttingDetailListParams,
  OutsourcingCuttingDetailListResponse,
  OutsourcingCuttingDetailRecord,
} from '../types/order-outsourcing-cutting-detail-report';

const ensureTenantId = (): string => {
  const tenantId = tenantStore.getTenantId();
  if (!tenantId) {
    throw new Error('未获取到企业信息，请重新登录');
  }
  return tenantId;
};

type BackendRecord = OutsourcingCuttingDetailRecord;

type BackendResponse = {
  items: BackendRecord[];
  total: number;
  summary: OutsourcingCuttingDetailListResponse['summary'];
};

const serializeGroupBy = (keys: OutsourcingCuttingDetailGroupKey[]) => keys.join(',');

export const outsourcingCuttingDetailReportService = {
  async getList(
    params: OutsourcingCuttingDetailListParams,
  ): Promise<OutsourcingCuttingDetailListResponse> {
    const tenantId = ensureTenantId();
    const response = await http.get<BackendResponse>(
      '/api/v1/outsourcing/reports/cutting-details',
      {
        params: {
          tenantId,
          groupBy: serializeGroupBy(params.groupBy),
          page: params.page - 1,
          size: params.pageSize,
        },
      },
    );
    return {
      list: response.data.items ?? [],
      total: response.data.total ?? 0,
      summary: response.data.summary ?? { quantity: 0, amount: 0 },
    };
  },

  async export(params: OutsourcingCuttingDetailListParams) {
    const tenantId = ensureTenantId();
    const response = await http.post<{ fileUrl: string }>(
      '/api/v1/outsourcing/reports/cutting-details/export',
      {
        tenantId,
        groupBy: params.groupBy,
      },
    );
    return response.data;
  },
};
