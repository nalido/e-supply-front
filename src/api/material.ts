import type {
  CreateMaterialPayload,
  MaterialBasicType,
  MaterialDataset,
  MaterialItem,
  MaterialListParams,
  MaterialUnit,
} from '../types';
import { apiConfig } from './config';
import http from './http';
import { tenantStore } from '../stores/tenant';
import {
  createMaterial as mockCreateMaterial,
  exportMaterials as mockExportMaterials,
  importMaterials as mockImportMaterials,
  listMaterials as mockListMaterials,
  removeMaterial as mockRemoveMaterial,
  updateMaterial as mockUpdateMaterial,
} from '../mock/material';

const useMock = apiConfig.useMock;

type BackendMaterialStatus = 'ACTIVE' | 'INACTIVE';
type BackendMaterialType = 'FABRIC' | 'ACCESSORY';

type BackendMaterialResponse = {
  id: number;
  tenantId: number;
  sku: string;
  name: string;
  unit: string;
  imageUrl?: string;
  status: BackendMaterialStatus;
  materialType: BackendMaterialType;
  attributes?: Record<string, unknown> | null;
  createdAt?: string;
  updatedAt?: string;
};

type BackendPageResponse<T> = {
  items: T[];
  total: number;
  page: number;
  size: number;
};

type MaterialImportItem = {
  name: string;
  sku: string;
  unit: string;
  imageUrl?: string;
  attributes: Record<string, unknown>;
};

type MaterialImportRequest = {
  tenantId: number;
  materialType: BackendMaterialType;
  items: MaterialImportItem[];
};

type MaterialImportResponse = {
  imported: number;
};

type MaterialExportResponse = {
  exportedAt: string;
  list: BackendMaterialResponse[];
};

const adaptMaterialType = (type: BackendMaterialType): MaterialBasicType =>
  type === 'ACCESSORY' ? 'accessory' : 'fabric';

const normalizeMaterialType = (
  type: MaterialBasicType | undefined,
): BackendMaterialType | undefined => {
  if (!type) {
    return undefined;
  }
  return type === 'accessory' ? 'ACCESSORY' : 'FABRIC';
};

const adaptStatus = (status: BackendMaterialStatus | undefined): 'active' | 'inactive' | undefined => {
  if (!status) {
    return undefined;
  }
  return status === 'ACTIVE' ? 'active' : 'inactive';
};

const toMaterialUnit = (value: string | undefined): MaterialUnit | undefined => {
  if (!value) {
    return undefined;
  }
  return value as MaterialUnit;
};

const toStringValue = (value: unknown): string | undefined => {
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  return undefined;
};

const toNumberValue = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

const toStringArray = (value: unknown): string[] | undefined => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item));
  }
  if (typeof value === 'string' && value.trim()) {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return undefined;
};

const adaptMaterial = (item: BackendMaterialResponse): MaterialItem => {
  const attributes = item.attributes ?? {};
  const colors = toStringArray(attributes.colors) ?? toStringArray(attributes.color) ?? [];
  return {
    id: String(item.id),
    tenantId: item.tenantId ? String(item.tenantId) : undefined,
    sku: item.sku,
    name: item.name,
    materialType: adaptMaterialType(item.materialType),
    unit: (toMaterialUnit(item.unit) ?? '米') as MaterialUnit,
    imageUrl: item.imageUrl ?? undefined,
    price: toNumberValue(attributes.price),
    width: toStringValue(attributes.width),
    grammage: toStringValue(attributes.grammage ?? attributes.weight),
    tolerance: toStringValue(attributes.tolerance),
    colors,
    remarks: toStringValue(attributes.remarks),
    status: adaptStatus(item.status),
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
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

const generateSku = (type: MaterialBasicType): string => {
  const prefix = type === 'accessory' ? 'ACC' : 'FAB';
  return `${prefix}-${Date.now()}`;
};

const buildAttributesPayload = (payload: CreateMaterialPayload): Record<string, unknown> => {
  const attributes: Record<string, unknown> = {};
  if (payload.width) {
    attributes.width = payload.width;
  }
  if (payload.grammage) {
    attributes.grammage = payload.grammage;
  }
  if (payload.tolerance) {
    attributes.tolerance = payload.tolerance;
  }
  if (payload.price !== undefined) {
    attributes.price = payload.price;
  }
  if (payload.colors && payload.colors.length > 0) {
    attributes.colors = payload.colors;
  }
  if (payload.remarks) {
    attributes.remarks = payload.remarks;
  }
  return attributes;
};

const applyDefaults = (payload: CreateMaterialPayload): CreateMaterialPayload => {
  if (payload.sku) {
    return payload;
  }
  return {
    ...payload,
    sku: generateSku(payload.materialType),
  };
};

const buildRequestPayload = (
  tenantId: number,
  payload: CreateMaterialPayload,
  options?: { includeStatus?: boolean },
) => {
  const normalized = applyDefaults(payload);
  return {
    tenantId,
    sku: normalized.sku,
    name: normalized.name,
    categoryId: null,
    unit: normalized.unit,
    imageUrl: normalized.imageUrl,
    status: options?.includeStatus === false ? undefined : 'ACTIVE',
    materialType: normalizeMaterialType(normalized.materialType),
    attributes: buildAttributesPayload(normalized),
  };
};

const buildImportPayload = (
  tenantId: number,
  materialType: MaterialBasicType,
  items: CreateMaterialPayload[],
): MaterialImportRequest => ({
  tenantId,
  materialType: normalizeMaterialType(materialType) ?? 'FABRIC',
  items: items.map((item) => {
    const normalized = applyDefaults(item);
    return {
      name: normalized.name,
      sku: normalized.sku!,
      unit: normalized.unit,
      imageUrl: normalized.imageUrl,
      attributes: buildAttributesPayload(normalized),
    } satisfies MaterialImportItem;
  }),
});

export const materialApi = {
  list: async (params: MaterialListParams): Promise<MaterialDataset> => {
    if (useMock) {
      return mockListMaterials(params);
    }
    const tenantId = ensureTenantId();
    const response = await http.get<BackendPageResponse<BackendMaterialResponse>>(
      '/api/v1/materials',
      {
        params: {
          tenantId,
          materialType: normalizeMaterialType(params.materialType),
          keyword: params.keyword,
          page: params.page,
          size: params.pageSize,
        },
      },
    );
    return {
      list: response.data.items.map(adaptMaterial),
      total: response.data.total,
    };
  },
  create: async (payload: CreateMaterialPayload): Promise<MaterialItem> => {
    if (useMock) {
      return mockCreateMaterial(payload);
    }
    const tenantId = ensureTenantId();
    const response = await http.post<BackendMaterialResponse>('/api/v1/materials', {
      ...buildRequestPayload(tenantId, payload, { includeStatus: true }),
    });
    return adaptMaterial(response.data);
  },
  update: async (id: string, payload: CreateMaterialPayload): Promise<MaterialItem | undefined> => {
    if (useMock) {
      return mockUpdateMaterial(id, payload);
    }
    const tenantId = ensureTenantId();
    const response = await http.post<BackendMaterialResponse>(
      `/api/v1/materials/${id}/update`,
      buildRequestPayload(tenantId, payload, { includeStatus: false }),
    );
    return adaptMaterial(response.data);
  },
  remove: async (id: string): Promise<boolean> => {
    if (useMock) {
      return mockRemoveMaterial(id);
    }
    const tenantId = ensureTenantId();
    await http.delete(`/api/v1/materials/${id}`, {
      params: { tenantId },
    });
    return true;
  },
  import: async (payload: CreateMaterialPayload[], materialType: MaterialBasicType): Promise<number> => {
    if (useMock) {
      return mockImportMaterials(payload, materialType);
    }
    const tenantId = ensureTenantId();
    const response = await http.post<MaterialImportResponse>('/api/v1/materials/import', {
      ...buildImportPayload(tenantId, materialType, payload),
    });
    return response.data.imported;
  },
  export: async (params: { materialType: MaterialBasicType; keyword?: string }): Promise<Blob> => {
    if (useMock) {
      return mockExportMaterials({ materialType: params.materialType, keyword: params.keyword });
    }
    const tenantId = ensureTenantId();
    const response = await http.get<MaterialExportResponse>('/api/v1/materials/export', {
      params: {
        tenantId,
        materialType: normalizeMaterialType(params.materialType),
        keyword: params.keyword,
      },
      responseType: 'json',
    });
    const payload = JSON.stringify(response.data, null, 2);
    return new Blob([payload], { type: 'application/json' });
  },
};

export default materialApi;
