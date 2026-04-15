import http from './http';
import { requireTenantId, toBackendPage } from './request-context';
import type {
  SampleChartPoint,
  SampleDashboardStats,
  SampleOverdueItem,
  SamplePieDatum,
} from '../types/sample';
import type { Paginated } from '../types/pagination';

export const sampleDashboardService = {
  async getStats(): Promise<SampleDashboardStats> {
    const tenantId = requireTenantId();
    const response = await http.get<SampleDashboardStats>('/api/v1/sample/dashboard/stats', {
      params: { tenantId },
    });
    return response.data;
  },

  async getChart(): Promise<SampleChartPoint[]> {
    const tenantId = requireTenantId();
    const response = await http.get<SampleChartPoint[]>('/api/v1/sample/dashboard/chart', {
      params: { tenantId },
    });
    return response.data;
  },

  async getPie(): Promise<SamplePieDatum[]> {
    const tenantId = requireTenantId();
    const response = await http.get<SamplePieDatum[]>('/api/v1/sample/dashboard/pie', {
      params: { tenantId },
    });
    return response.data;
  },

  async getOverdueSamples(params: { page: number; pageSize: number }): Promise<Paginated<SampleOverdueItem>> {
    const tenantId = requireTenantId();
    const response = await http.get<Paginated<SampleOverdueItem>>(
      '/api/v1/sample/dashboard/overdue',
      {
        params: {
          tenantId,
          page: toBackendPage(params.page),
          size: params.pageSize,
        },
        skipPageNormalization: true,
      },
    );
    return response.data;
  },
};
