import http from './http';
import type {
  Announcement,
  DeliveryItem,
  PaginatedResponse,
  WorkplaceStats,
} from '../types/workplace';
import { fromBackendPage, requireNumericTenantId, toBackendPage } from './request-context';

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

const adaptDeliveryPage = (payload: BackendDeliveryResponse): PaginatedResponse<DeliveryItem> => ({
  list: payload.list ?? [],
  total: payload.total ?? 0,
  page: fromBackendPage(payload.page),
  pageSize: payload.pageSize ?? payload.list?.length ?? 0,
});

const adaptAnnouncementPage = (
  payload: BackendAnnouncementResponse,
): PaginatedResponse<Announcement> => ({
  list: payload.list ?? [],
  total: payload.total ?? 0,
  page: fromBackendPage(payload.page),
  pageSize: payload.pageSize ?? payload.list?.length ?? 0,
});

export const workplaceApi = {
  async getStats(): Promise<WorkplaceStats> {
    const tenantId = requireNumericTenantId();
    const { data } = await http.get<BackendStats>('/api/v1/workplace/stats', {
      params: { tenantId },
    });
    return data;
  },

  async getCustomerDeliveries(
    page: number,
    pageSize: number,
  ): Promise<PaginatedResponse<DeliveryItem>> {
    const tenantId = requireNumericTenantId();
    const { data } = await http.get<BackendDeliveryResponse>('/api/v1/workplace/deliveries/customers', {
      params: {
        tenantId,
        page: toBackendPage(page),
        size: pageSize,
      },
      skipPageNormalization: true,
    });
    return adaptDeliveryPage(data);
  },

  async getFactoryDeliveries(
    page: number,
    pageSize: number,
  ): Promise<PaginatedResponse<DeliveryItem>> {
    const tenantId = requireNumericTenantId();
    const { data } = await http.get<BackendDeliveryResponse>('/api/v1/workplace/deliveries/factories', {
      params: {
        tenantId,
        page: toBackendPage(page),
        size: pageSize,
      },
      skipPageNormalization: true,
    });
    return adaptDeliveryPage(data);
  },

  async getAnnouncements(
    page: number,
    pageSize: number,
  ): Promise<PaginatedResponse<Announcement>> {
    const tenantId = requireNumericTenantId();
    const { data } = await http.get<BackendAnnouncementResponse>('/api/v1/workplace/announcements', {
      params: {
        tenantId,
        page: toBackendPage(page),
        size: pageSize,
      },
      skipPageNormalization: true,
    });
    return adaptAnnouncementPage(data);
  },
};
