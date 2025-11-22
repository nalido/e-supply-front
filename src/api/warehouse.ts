import type {
  SaveWarehousePayload,
  UpdateWarehousePayload,
  Warehouse,
  WarehouseDataset,
  WarehouseListParams,
  WarehouseStatus,
  WarehouseType,
} from '../types';
import { apiConfig } from './config';
import http from './http';
import { tenantStore } from '../stores/tenant';
import {
  createWarehouse as mockCreateWarehouse,
  listWarehouses as mockListWarehouses,
  removeWarehouse as mockRemoveWarehouse,
  updateWarehouse as mockUpdateWarehouse,
} from '../mock/warehouse';

const useMock = apiConfig.useMock;

type BackendWarehouseType = 'MATERIAL' | 'FINISHED' | 'VIRTUAL';
type BackendWarehouseStatus = 'ACTIVE' | 'INACTIVE';

type BackendWarehouseResponse = {
  id: number;
  tenantId: number;
  name: string;
  type: BackendWarehouseType;
  status: BackendWarehouseStatus;
  remarks?: string;
  address?: string;
  managerId?: number;
  createdAt?: string;
  updatedAt?: string;
};

type BackendPageResponse<T> = {
  items: T[];
  total: number;
  page: number;
  size: number;
};

const adaptWarehouseType = (type: BackendWarehouseType): WarehouseType => {
  switch (type) {
    case 'FINISHED':
      return 'finished';
    case 'VIRTUAL':
      return 'virtual';
    case 'MATERIAL':
    default:
      return 'material';
  }
};

const normalizeWarehouseType = (type: WarehouseType | undefined): BackendWarehouseType | undefined => {
  if (!type) {
    return undefined;
  }
  switch (type) {
    case 'finished':
      return 'FINISHED';
    case 'virtual':
      return 'VIRTUAL';
    case 'material':
    default:
      return 'MATERIAL';
  }
};

const adaptWarehouseStatus = (status: BackendWarehouseStatus): WarehouseStatus =>
  status === 'ACTIVE' ? 'active' : 'inactive';

const normalizeWarehouseStatus = (
  status: WarehouseStatus | undefined,
): BackendWarehouseStatus | undefined => {
  if (!status) {
    return undefined;
  }
  return status === 'active' ? 'ACTIVE' : 'INACTIVE';
};

const adaptWarehouse = (item: BackendWarehouseResponse): Warehouse => ({
  id: String(item.id),
  tenantId: item.tenantId ? String(item.tenantId) : undefined,
  name: item.name,
  type: adaptWarehouseType(item.type),
  status: adaptWarehouseStatus(item.status),
  remarks: item.remarks ?? undefined,
  address: item.address ?? undefined,
  managerId: item.managerId ? String(item.managerId) : undefined,
  createdAt: item.createdAt,
  updatedAt: item.updatedAt,
});

const ensureTenantId = (): number => {
  const tenantId = tenantStore.getTenantId();
  if (!tenantId) {
    throw new Error('未找到租户信息，请重新登录或选择企业。');
  }
  const parsed = Number(tenantId);
  if (!Number.isFinite(parsed)) {
    throw new Error('租户信息无效，请刷新后重试');
  }
  return parsed;
};

const buildRequestPayload = (
  tenantId: number,
  payload: SaveWarehousePayload,
): Record<string, unknown> => ({
  tenantId,
  name: payload.name,
  type: normalizeWarehouseType(payload.type),
  status: normalizeWarehouseStatus(payload.status ?? 'active'),
  remarks: payload.remarks,
  address: payload.address,
  managerId: payload.managerId ? Number(payload.managerId) : undefined,
});

export const warehouseApi = {
  list: async (params: WarehouseListParams): Promise<WarehouseDataset> => {
    if (useMock) {
      return mockListWarehouses(params);
    }
    const tenantId = ensureTenantId();
    const response = await http.get<BackendPageResponse<BackendWarehouseResponse>>(
      '/api/v1/warehouses',
      {
        params: {
          tenantId,
          type: normalizeWarehouseType(params.type),
          status: normalizeWarehouseStatus(params.status),
          keyword: params.keyword,
          page: params.page,
          size: params.pageSize,
        },
      },
    );
    return {
      list: response.data.items.map(adaptWarehouse),
      total: response.data.total,
    };
  },
  create: async (payload: SaveWarehousePayload): Promise<Warehouse> => {
    if (useMock) {
      return mockCreateWarehouse(payload);
    }
    const tenantId = ensureTenantId();
    const response = await http.post<BackendWarehouseResponse>('/api/v1/warehouses', {
      ...buildRequestPayload(tenantId, payload),
    });
    return adaptWarehouse(response.data);
  },
  update: async (id: string, payload: UpdateWarehousePayload): Promise<Warehouse | undefined> => {
    if (useMock) {
      return mockUpdateWarehouse(id, payload);
    }
    const tenantId = ensureTenantId();
    const response = await http.post<BackendWarehouseResponse>(
      `/api/v1/warehouses/${id}/update`,
      buildRequestPayload(tenantId, payload),
    );
    return adaptWarehouse(response.data);
  },
  remove: async (id: string): Promise<boolean> => {
    if (useMock) {
      return mockRemoveWarehouse(id);
    }
    const tenantId = ensureTenantId();
    await http.delete(`/api/v1/warehouses/${id}`, {
      params: { tenantId },
    });
    return true;
  },
};

export default warehouseApi;
