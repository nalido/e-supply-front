import type {
  CreateMaterialPayload,
  MaterialBasicType,
  MaterialDataset,
  MaterialItem,
  MaterialListParams,
  MaterialUnit,
} from '../types';
import http from './http';
import { requireNumericTenantId, toBackendPage } from './request-context';

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
  rowNumber: number;
  name: string;
  sku: string;
  unit: string;
  imageUrl?: string;
  attributes: Record<string, unknown>;
};

type MaterialImportRequest = {
  tenantId: number;
  materialType: BackendMaterialType;
  importMode: 'UPSERT' | 'CREATE_ONLY';
  items: MaterialImportItem[];
};

export type MaterialImportRowResult = {
  rowNumber: number;
  sku?: string;
  name?: string;
  action: string;
  success: boolean;
  message?: string;
  materialId?: number;
};

export type MaterialImportResponse = {
  imported: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  success: boolean;
  rows: MaterialImportRowResult[];
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
  const specifications = toStringArray(attributes.specifications) ?? toStringArray(attributes.specification) ?? [];
  return {
    id: String(item.id),
    tenantId: item.tenantId ? String(item.tenantId) : undefined,
    sku: item.sku,
    name: item.name,
    materialType: adaptMaterialType(item.materialType),
    unit: (toMaterialUnit(item.unit) ?? '米') as MaterialUnit,
    imageUrl: item.imageUrl ?? undefined,
    referencePrice: toNumberValue(attributes.price),
    width: toStringValue(attributes.width),
    grammage: toStringValue(attributes.grammage ?? attributes.weight),
    tolerance: toStringValue(attributes.tolerance),
    colors,
    specifications,
    remarks: toStringValue(attributes.remarks),
    status: adaptStatus(item.status),
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
};

const generateSku = (type: MaterialBasicType): string => {
  const prefix = type === 'accessory' ? 'ACC' : 'FAB';
  return `${prefix}-${Date.now()}`;
};

const buildAttributesPayload = (payload: CreateMaterialPayload): Record<string, unknown> => {
  const attributes: Record<string, unknown> = {};
  const includeFabricSpecs = payload.materialType === 'fabric';
  if (includeFabricSpecs && payload.width) {
    attributes.width = payload.width;
  }
  if (includeFabricSpecs && payload.grammage) {
    attributes.grammage = payload.grammage;
  }
  if (includeFabricSpecs && payload.tolerance) {
    attributes.tolerance = payload.tolerance;
  }
  if (payload.referencePrice !== undefined) {
    attributes.price = payload.referencePrice;
  }
  if (payload.colors && payload.colors.length > 0) {
    attributes.colors = payload.colors;
  }
  if (payload.materialType === 'accessory' && payload.specifications && payload.specifications.length > 0) {
    attributes.specifications = payload.specifications;
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
  importMode: 'UPSERT' | 'CREATE_ONLY',
): MaterialImportRequest => ({
  tenantId,
  materialType: normalizeMaterialType(materialType) ?? 'FABRIC',
  importMode,
  items: items.map((item) => {
    return {
      rowNumber: item.rowNumber ?? 0,
      name: item.name,
      sku: item.sku ?? '',
      unit: item.unit,
      imageUrl: item.imageUrl,
      attributes: buildAttributesPayload(item),
    } satisfies MaterialImportItem;
  }),
});

export const materialApi = {
  list: async (params: MaterialListParams): Promise<MaterialDataset> => {
    const tenantId = requireNumericTenantId();
    const response = await http.get<BackendPageResponse<BackendMaterialResponse>>(
      '/api/v1/materials',
      {
        params: {
          tenantId,
          materialType: normalizeMaterialType(params.materialType),
          keyword: params.keyword,
          page: toBackendPage(params.page),
          size: params.pageSize,
        },
        skipPageNormalization: true,
      },
    );
    return {
      list: response.data.items.map(adaptMaterial),
      total: response.data.total,
    };
  },
  create: async (payload: CreateMaterialPayload): Promise<MaterialItem> => {
    const tenantId = requireNumericTenantId();
    const response = await http.post<BackendMaterialResponse>('/api/v1/materials', {
      ...buildRequestPayload(tenantId, payload, { includeStatus: true }),
    });
    return adaptMaterial(response.data);
  },
  update: async (id: string, payload: CreateMaterialPayload): Promise<MaterialItem | undefined> => {
    const tenantId = requireNumericTenantId();
    const response = await http.post<BackendMaterialResponse>(
      `/api/v1/materials/${id}/update`,
      buildRequestPayload(tenantId, payload, { includeStatus: false }),
    );
    return adaptMaterial(response.data);
  },
  remove: async (id: string): Promise<boolean> => {
    const tenantId = requireNumericTenantId();
    await http.post(`/api/v1/materials/${id}/delete`, undefined, {
      params: { tenantId },
    });
    return true;
  },
  import: async (
    payload: CreateMaterialPayload[],
    materialType: MaterialBasicType,
    importMode: 'UPSERT' | 'CREATE_ONLY' = 'UPSERT',
  ): Promise<MaterialImportResponse> => {
    const tenantId = requireNumericTenantId();
    const response = await http.post<MaterialImportResponse>('/api/v1/materials/import', {
      ...buildImportPayload(tenantId, materialType, payload, importMode),
    });
    return response.data;
  },
  export: async (params: { materialType: MaterialBasicType; keyword?: string }): Promise<Blob> => {
    const tenantId = requireNumericTenantId();
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
