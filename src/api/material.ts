import type {
  CreateMaterialPayload,
  MaterialBasicType,
  MaterialDataset,
  MaterialItem,
  MaterialListParams,
  MaterialMinimumSpecification,
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
  minimumSpecifications?: Array<{
    id?: number;
    code?: string;
    label?: string;
    color?: string;
    specification?: string;
    width?: string;
    grammage?: string;
    active?: boolean;
  }>;
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
  minimumSpecifications: Array<{
    code?: string;
    label: string;
    color?: string;
    specification?: string;
    width?: string;
    grammage?: string;
    active: boolean;
  }>;
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

const buildSpecificationLabel = (
  item: Pick<MaterialMinimumSpecification, 'color' | 'specification' | 'width' | 'grammage'>,
) => [item.color, item.specification, item.width, item.grammage].filter(Boolean).join(' · ') || '通用规格';

const adaptMinimumSpecifications = (
  item: BackendMaterialResponse,
  colors: string[],
  specifications: string[],
  attributes: Record<string, unknown>,
): MaterialMinimumSpecification[] => {
  if (item.minimumSpecifications?.length) {
    return item.minimumSpecifications.map((spec) => {
      const normalized = {
        id: spec.id == null ? undefined : String(spec.id),
        code: spec.code?.trim() || undefined,
        color: spec.color?.trim() || undefined,
        specification: spec.specification?.trim() || undefined,
        width: spec.width?.trim() || undefined,
        grammage: spec.grammage?.trim() || undefined,
        active: spec.active !== false,
      };
      return { ...normalized, label: spec.label?.trim() || buildSpecificationLabel(normalized) };
    });
  }

  const width = toStringValue(attributes.width);
  const grammage = toStringValue(attributes.grammage ?? attributes.weight);
  if (item.materialType === 'FABRIC') {
    const legacyColors = colors.length ? colors : [undefined];
    return legacyColors.map((color) => {
      const spec = { color, width, grammage, active: true };
      return { ...spec, label: buildSpecificationLabel(spec) };
    });
  }
  if (colors.length === 1 && specifications.length) {
    return specifications.map((specification) => {
      const spec = { color: colors[0], specification, active: true };
      return { ...spec, label: buildSpecificationLabel(spec) };
    });
  }
  if (specifications.length === 1 && colors.length) {
    return colors.map((color) => {
      const spec = { color, specification: specifications[0], active: true };
      return { ...spec, label: buildSpecificationLabel(spec) };
    });
  }
  const legacyValues = specifications.length
    ? specifications.map((specification) => ({ specification }))
    : colors.length
      ? colors.map((color) => ({ color }))
      : [{}];
  return legacyValues.map((value) => ({ ...value, label: buildSpecificationLabel(value), active: true }));
};

const adaptMaterial = (item: BackendMaterialResponse): MaterialItem => {
  const attributes = item.attributes ?? {};
  const colors = toStringArray(attributes.colors) ?? toStringArray(attributes.color) ?? [];
  const specifications = toStringArray(attributes.specifications) ?? toStringArray(attributes.specification) ?? [];
  const minimumSpecifications = adaptMinimumSpecifications(item, colors, specifications, attributes);
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
    minimumSpecifications,
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
  const specificationColors = payload.minimumSpecifications
    ?.map((item) => item.color?.trim())
    .filter((item): item is string => Boolean(item));
  const colors = Array.from(new Set(specificationColors?.length ? specificationColors : payload.colors));
  if (colors.length > 0) {
    attributes.colors = colors;
  }
  const specificationValues = payload.minimumSpecifications
    ?.map((item) => item.specification?.trim())
    .filter((item): item is string => Boolean(item));
  const specifications = Array.from(new Set(specificationValues?.length ? specificationValues : payload.specifications));
  if (payload.materialType === 'accessory' && specifications.length > 0) {
    attributes.specifications = specifications;
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
    minimumSpecifications: normalized.minimumSpecifications?.map((item) => ({
      id: item.id ? Number(item.id) : undefined,
      code: item.code?.trim() || undefined,
      label: item.label.trim() || buildSpecificationLabel(item),
      color: item.color?.trim() || undefined,
      specification: item.specification?.trim() || undefined,
      width: item.width?.trim() || undefined,
      grammage: item.grammage?.trim() || undefined,
      active: item.active !== false,
    })),
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
    const explicitSpecifications = item.minimumSpecifications?.filter((entry) => entry.label.trim());
    const minimumSpecifications: MaterialMinimumSpecification[] = explicitSpecifications?.length
      ? explicitSpecifications
      : materialType === 'fabric' && item.colors?.length
        ? item.colors.map((color) => ({ label: color, color, active: true }))
        : materialType === 'accessory' && item.specifications?.length
          ? item.specifications.map((specification) => ({ label: specification, specification, active: true }))
          : [{ label: '通用规格', active: true }];
    return {
      rowNumber: item.rowNumber ?? 0,
      name: item.name,
      sku: item.sku ?? '',
      unit: item.unit,
      imageUrl: item.imageUrl,
      attributes: buildAttributesPayload(item),
      minimumSpecifications: minimumSpecifications.map((entry) => ({
        code: entry.code?.trim() || undefined,
        label: entry.label.trim(),
        color: entry.color?.trim() || undefined,
        specification: entry.specification?.trim() || undefined,
        width: entry.width?.trim() || undefined,
        grammage: entry.grammage?.trim() || undefined,
        active: entry.active !== false,
      })),
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
