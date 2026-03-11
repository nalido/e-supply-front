import http from './http';
import { tenantStore } from '../stores/tenant';
import type {
  OutsourcingProductionReportListParams,
  OutsourcingProductionReportListResponse,
  OutsourcingProductionReportListItem,
  OutsourcingProductionReportMeta,
  OutsourcingSubcontractorStat,
} from '../types/outsourcing-production-report';

const ensureTenantId = (): string => {
  const tenantId = tenantStore.getTenantId();
  if (!tenantId) {
    throw new Error('未获取到企业信息，请重新登录');
  }
  return tenantId;
};

type BackendListResponse = {
  items: OutsourcingProductionReportListItem[];
  total: number;
};

export const outsourcingProductionReportService = {
  async getMeta(): Promise<OutsourcingProductionReportMeta> {
    const tenantId = ensureTenantId();
    const response = await http.get<OutsourcingProductionReportMeta>(
      '/api/v1/outsourcing/reports/production/meta',
      { params: { tenantId } },
    );
    return response.data;
  },

  async getSubcontractorStats(): Promise<OutsourcingSubcontractorStat[]> {
    const tenantId = ensureTenantId();
    const response = await http.get<OutsourcingSubcontractorStat[]>(
      '/api/v1/outsourcing/reports/production/stats',
      { params: { tenantId } },
    );
    return response.data;
  },

  async getList(
    params: OutsourcingProductionReportListParams,
  ): Promise<OutsourcingProductionReportListResponse> {
    const tenantId = ensureTenantId();
    const response = await http.get<BackendListResponse>('/api/v1/outsourcing/reports/production', {
      params: {
        tenantId,
        page: params.page - 1,
        size: params.pageSize,
        subcontractorName: params.subcontractorName,
        keyword: params.keyword,
        processType: params.processType,
        orderStatus: params.orderStatus,
        sortBy: params.sortBy,
        order: params.order,
      },
    });
    return {
      list: response.data.items ?? [],
      total: response.data.total ?? 0,
    };
  },

  async export(params: OutsourcingProductionReportListParams) {
    const tenantId = ensureTenantId();
    const response = await http.post<{ fileUrl: string }>(
      '/api/v1/outsourcing/reports/production/export',
      {
        tenantId,
        subcontractorName: params.subcontractorName,
        keyword: params.keyword,
        processType: params.processType,
        orderStatus: params.orderStatus,
        sortBy: params.sortBy,
        order: params.order,
      },
    );
    return response.data;
  },

  async print(orderIds: string[]) {
    const tenantId = ensureTenantId();
    await http.post('/api/v1/outsourcing/reports/production/print', {
      tenantId,
      orderIds,
    });
  },
};
