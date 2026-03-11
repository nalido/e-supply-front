import http from './http';
import { tenantStore } from '../stores/tenant';
import type {
  Announcement,
  DeliveryItem,
  PaginatedResponse,
  WorkplaceStats,
} from '../types/workplace';

type BackendStats = WorkplaceStats;

type BackendDeliveryResponse = {
  list: DeliveryItem[];
  total: number;
  page: number;
  pageSize: number;
};

type BackendAnnouncementResponse = {
  list: Announcement[];
  total: number;
  page: number;
  pageSize: number;
};

const ensureTenantId = (): number => {
  const tenantId = tenantStore.getTenantId();
  if (!tenantId) {
    throw new Error('未找到租户信息，请重新选择企业');
  }
  const parsed = Number(tenantId);
  if (!Number.isFinite(parsed)) {
    throw new Error('租户信息无效，请刷新后重试');
  }
  return parsed;
};

const adaptDeliveryPage = (payload: BackendDeliveryResponse): PaginatedResponse<DeliveryItem> => ({
  list: payload.list ?? [],
  total: payload.total ?? 0,
  page: (payload.page ?? 0) + 1,
  pageSize: payload.pageSize ?? payload.list?.length ?? 0,
});

const adaptAnnouncementPage = (
  payload: BackendAnnouncementResponse,
): PaginatedResponse<Announcement> => ({
  list: payload.list ?? [],
  total: payload.total ?? 0,
  page: (payload.page ?? 0) + 1,
  pageSize: payload.pageSize ?? payload.list?.length ?? 0,
});

export const workplaceApi = {
  async getStats(): Promise<WorkplaceStats> {
    const tenantId = ensureTenantId();
    const { data } = await http.get<BackendStats>('/api/v1/workplace/stats', {
      params: { tenantId },
    });
    return data;
  },

  async getCustomerDeliveries(
    page: number,
    pageSize: number,
  ): Promise<PaginatedResponse<DeliveryItem>> {
    const tenantId = ensureTenantId();
    const { data } = await http.get<BackendDeliveryResponse>('/api/v1/workplace/deliveries/customers', {
      params: {
        tenantId,
        page: Math.max(page - 1, 0),
        size: pageSize,
      },
    });
    return adaptDeliveryPage(data);
  },

  async getFactoryDeliveries(
    page: number,
    pageSize: number,
  ): Promise<PaginatedResponse<DeliveryItem>> {
    const tenantId = ensureTenantId();
    const { data } = await http.get<BackendDeliveryResponse>('/api/v1/workplace/deliveries/factories', {
      params: {
        tenantId,
        page: Math.max(page - 1, 0),
        size: pageSize,
      },
    });
    return adaptDeliveryPage(data);
  },

  async getAnnouncements(
    page: number,
    pageSize: number,
  ): Promise<PaginatedResponse<Announcement>> {
    const tenantId = ensureTenantId();
    const { data } = await http.get<BackendAnnouncementResponse>('/api/v1/workplace/announcements', {
      params: {
        tenantId,
        page: Math.max(page - 1, 0),
        size: pageSize,
      },
    });
    return adaptAnnouncementPage(data);
  },
};
