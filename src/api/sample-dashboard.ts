import http from './http';
import { tenantStore } from '../stores/tenant';
import type {
  SampleChartPoint,
  SampleDashboardStats,
  SampleOverdueItem,
  SamplePieDatum,
} from '../types/sample';
import type { Paginated } from '../types/pagination';

const ensureTenantId = (): string => {
  const tenantId = tenantStore.getTenantId();
  if (!tenantId) {
    throw new Error('未获取到企业信息，请重新登录');
  }
  return tenantId;
};

export const sampleDashboardService = {
  async getStats(): Promise<SampleDashboardStats> {
    const tenantId = ensureTenantId();
    const response = await http.get<SampleDashboardStats>('/api/v1/sample/dashboard/stats', {
      params: { tenantId },
    });
    return response.data;
  },

  async getChart(): Promise<SampleChartPoint[]> {
    const tenantId = ensureTenantId();
    const response = await http.get<SampleChartPoint[]>('/api/v1/sample/dashboard/chart', {
      params: { tenantId },
    });
    return response.data;
  },

  async getPie(): Promise<SamplePieDatum[]> {
    const tenantId = ensureTenantId();
    const response = await http.get<SamplePieDatum[]>('/api/v1/sample/dashboard/pie', {
      params: { tenantId },
    });
    return response.data;
  },

  async getOverdueSamples(params: { page: number; pageSize: number }): Promise<Paginated<SampleOverdueItem>> {
    const tenantId = ensureTenantId();
    const response = await http.get<Paginated<SampleOverdueItem>>(
      '/api/v1/sample/dashboard/overdue',
      {
        params: {
          tenantId,
          page: params.page - 1,
          size: params.pageSize,
        },
      },
    );
    return response.data;
  },
};
