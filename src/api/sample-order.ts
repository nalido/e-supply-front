import type { SampleQueryParams, SampleStats } from '../types/sample';
import http from './http';
import { apiConfig } from './config';
import { sampleService } from './mock';
import { tenantStore } from '../stores/tenant';
import {
  adaptSampleOrderSummary,
  buildListQuery,
  buildStatsFromCounters,
  getCurrentMonthRange,
  type SampleOrderListResponse,
} from './adapters/sample-order';
import type { SampleOrder } from '../types/sample';

export type SampleOrderListResult = {
  list: SampleOrder[];
  total: number;
  page: number;
  pageSize: number;
};

const ensureTenantId = (): string => {
  const tenantId = tenantStore.getTenantId();
  if (!tenantId) {
    throw new Error('tenantId is not set');
  }
  return tenantId;
};

const countOrders = async (params: SampleQueryParams): Promise<number> => {
  const tenantId = ensureTenantId();
  const query = buildListQuery({ ...params, page: 1, pageSize: 1 });
  const { data } = await http.get<SampleOrderListResponse>('/api/v1/sample-orders', {
    params: {
      tenantId,
      ...query,
    },
  });
  return Number(data.total ?? 0);
};

export const sampleOrderApi = {
  async list(params: SampleQueryParams & { page?: number; pageSize?: number }): Promise<SampleOrderListResult> {
    if (apiConfig.useMock) {
      const result = await sampleService.getSampleOrders(params);
      return result;
    }

    const tenantId = ensureTenantId();
    const query = buildListQuery(params);
    const { data } = await http.get<SampleOrderListResponse>('/api/v1/sample-orders', {
      params: {
        tenantId,
        ...query,
      },
    });

    const pageZero = typeof data.page === 'number' ? data.page : 0;
    const size = typeof data.size === 'number' ? data.size : params.pageSize ?? 20;

    return {
      list: (data.items ?? []).map(adaptSampleOrderSummary),
      total: Number(data.total ?? 0),
      page: pageZero + 1,
      pageSize: size,
    };
  },

  async getStats(params: SampleQueryParams = {}): Promise<SampleStats> {
    if (apiConfig.useMock) {
      return sampleService.getSampleStats(params);
    }

    const baseParams: SampleQueryParams = {
      ...params,
      status: undefined,
    };

    const { start, end } = getCurrentMonthRange();
    const normalizedMonthStart = baseParams.startDate && baseParams.startDate > start ? baseParams.startDate : start;
    const normalizedMonthEnd = baseParams.endDate && baseParams.endDate < end ? baseParams.endDate : end;
    const hasMonthRange = normalizedMonthStart <= normalizedMonthEnd;

    const [
      total,
      pending,
      approved,
      inProduction,
      closed,
      cancelled,
      urgent,
      thisMonth,
    ] = await Promise.all([
      countOrders({ ...baseParams }),
      countOrders({ ...baseParams, status: 'pending' }),
      countOrders({ ...baseParams, status: 'confirmed' }),
      countOrders({ ...baseParams, status: 'producing' }),
      countOrders({ ...baseParams, status: 'completed' }),
      countOrders({ ...baseParams, status: 'cancelled' }),
      countOrders({ ...baseParams, priority: 'urgent' }),
      hasMonthRange
        ? countOrders({ ...baseParams, startDate: normalizedMonthStart, endDate: normalizedMonthEnd })
        : Promise.resolve(0),
    ]);

    return buildStatsFromCounters(
      {
        total,
        pending,
        approved,
        inProduction,
        closed,
        cancelled,
      },
      urgent,
      thisMonth,
    );
  },
};

export default sampleOrderApi;
