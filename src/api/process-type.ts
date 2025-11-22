import type {
  CreateProcessTypePayload,
  ProcessType,
  ProcessTypeDataset,
  ProcessTypeListParams,
  ProcessTypeStatus,
  UpdateProcessTypePayload,
} from '../types';
import { apiConfig } from './config';
import http from './http';
import { tenantStore } from '../stores/tenant';
import {
  batchRemoveProcessTypes as mockBatchRemove,
  batchSetProcessTypeStatus as mockBatchSetStatus,
  createProcessType as mockCreateProcessType,
  exportProcessTypes as mockExportProcessTypes,
  importProcessTypes as mockImportProcessTypes,
  listProcessTypes as mockListProcessTypes,
  removeProcessType as mockRemoveProcessType,
  setProcessTypeStatus as mockSetProcessTypeStatus,
  updateProcessType as mockUpdateProcessType,
} from '../mock/process-type';

const useMock = apiConfig.useMock;

type BackendChargeMode = 'PIECEWORK' | 'HOURLY' | 'STAGE_BASED';
type BackendStatus = 'ACTIVE' | 'INACTIVE';

type BackendProcessCatalogResponse = {
  id: number;
  tenantId: number;
  code: string;
  name: string;
  chargeMode: BackendChargeMode;
  defaultWage: number;
  unit: string;
  description?: string;
  status: BackendStatus;
  createdAt?: string;
  updatedAt?: string;
};

type BackendPageResponse<T> = {
  items: T[];
  total: number;
  page: number;
  size: number;
};

const adaptChargeMode = (mode: BackendChargeMode): ProcessType['chargeMode'] => {
  switch (mode) {
    case 'HOURLY':
      return 'hourly';
    case 'STAGE_BASED':
      return 'stage';
    case 'PIECEWORK':
    default:
      return 'piecework';
  }
};

const normalizeChargeMode = (mode: ProcessType['chargeMode']): BackendChargeMode => {
  switch (mode) {
    case 'hourly':
      return 'HOURLY';
    case 'stage':
      return 'STAGE_BASED';
    case 'piecework':
    default:
      return 'PIECEWORK';
  }
};

const adaptStatus = (status: BackendStatus): ProcessTypeStatus =>
  status === 'ACTIVE' ? 'active' : 'inactive';

const normalizeStatus = (status?: ProcessTypeStatus): BackendStatus | undefined => {
  if (!status) {
    return undefined;
  }
  return status === 'active' ? 'ACTIVE' : 'INACTIVE';
};

const adaptProcessType = (item: BackendProcessCatalogResponse): ProcessType => ({
  id: String(item.id),
  tenantId: item.tenantId ? String(item.tenantId) : undefined,
  name: item.name,
  code: item.code,
  chargeMode: adaptChargeMode(item.chargeMode),
  defaultWage: Number(item.defaultWage ?? 0),
  unit: item.unit,
  description: item.description ?? undefined,
  status: adaptStatus(item.status),
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

const buildPayload = (
  tenantId: number,
  payload: CreateProcessTypePayload,
): Record<string, unknown> => ({
  tenantId,
  name: payload.name,
  code: payload.code,
  chargeMode: normalizeChargeMode(payload.chargeMode),
  defaultWage: payload.defaultWage,
  unit: payload.unit,
  description: payload.description,
  status: normalizeStatus(payload.status ?? 'active'),
});

const sequentialInvoke = async <T>(queue: Array<() => Promise<T>>): Promise<T[]> => {
  const results: T[] = [];
  // 顺序执行，便于简化冲突处理
  for (const task of queue) {
    results.push(await task());
  }
  return results;
};

export const processTypeApi = {
  list: async (params: ProcessTypeListParams): Promise<ProcessTypeDataset> => {
    if (useMock) {
      return mockListProcessTypes();
    }
    const tenantId = ensureTenantId();
    const response = await http.get<BackendPageResponse<BackendProcessCatalogResponse>>(
      '/api/v1/process-catalog',
      {
        params: {
          tenantId,
          keyword: params.keyword,
          status: normalizeStatus(params.status),
          page: params.page,
          size: params.pageSize,
        },
      },
    );
    return {
      list: response.data.items.map(adaptProcessType),
      total: response.data.total,
    };
  },
  create: async (payload: CreateProcessTypePayload): Promise<ProcessType> => {
    if (useMock) {
      return mockCreateProcessType(payload);
    }
    const tenantId = ensureTenantId();
    const response = await http.post<BackendProcessCatalogResponse>('/api/v1/process-catalog', {
      ...buildPayload(tenantId, payload),
    });
    return adaptProcessType(response.data);
  },
  update: async (id: string, payload: UpdateProcessTypePayload): Promise<ProcessType | undefined> => {
    if (useMock) {
      return mockUpdateProcessType(id, payload);
    }
    const tenantId = ensureTenantId();
    const response = await http.post<BackendProcessCatalogResponse>(
      `/api/v1/process-catalog/${id}/update`,
      buildPayload(tenantId, payload),
    );
    return adaptProcessType(response.data);
  },
  toggleStatus: async (id: string, status: ProcessTypeStatus): Promise<ProcessType | undefined> => {
    if (useMock) {
      return mockSetProcessTypeStatus(id, status);
    }
    const tenantId = ensureTenantId();
    const response = await http.post<BackendProcessCatalogResponse>(
      `/api/v1/process-catalog/${id}/status/update`,
      { status: normalizeStatus(status) },
      { params: { tenantId } },
    );
    return adaptProcessType(response.data);
  },
  remove: async (id: string): Promise<boolean> => {
    if (useMock) {
      return mockRemoveProcessType(id);
    }
    const tenantId = ensureTenantId();
    await http.delete(`/api/v1/process-catalog/${id}`, { params: { tenantId } });
    return true;
  },
  batchRemove: async (ids: string[]): Promise<number> => {
    if (useMock) {
      return mockBatchRemove(ids);
    }
    await sequentialInvoke(ids.map((id) => () => processTypeApi.remove(id)));
    return ids.length;
  },
  batchToggleStatus: async (ids: string[], status: ProcessTypeStatus): Promise<number> => {
    if (useMock) {
      return mockBatchSetStatus(ids, status);
    }
    await sequentialInvoke(ids.map((id) => () => processTypeApi.toggleStatus(id, status)));
    return ids.length;
  },
  import: async (payload: CreateProcessTypePayload[]): Promise<number> => {
    if (useMock) {
      return mockImportProcessTypes(payload);
    }
    await sequentialInvoke(payload.map((item) => () => processTypeApi.create(item)));
    return payload.length;
  },
  export: async (filters?: { onlyActive?: boolean; keyword?: string }): Promise<Blob> => {
    if (useMock) {
      return mockExportProcessTypes(filters);
    }
    const dataset = await processTypeApi.list({
      page: 1,
      pageSize: 500,
      keyword: filters?.keyword,
      status: filters?.onlyActive ? 'active' : undefined,
    });
    const json = JSON.stringify(dataset.list, null, 2);
    return new Blob([json], { type: 'application/json' });
  },
  hot: async (): Promise<ProcessType[]> => {
    if (useMock) {
      const dataset = await mockListProcessTypes();
      return dataset.list.filter((item) => item.status === 'active');
    }
    const tenantId = ensureTenantId();
    const response = await http.get<BackendProcessCatalogResponse[]>(
      '/api/v1/process-catalog/hot',
      { params: { tenantId } },
    );
    return response.data.map(adaptProcessType);
  },
};

export default processTypeApi;
