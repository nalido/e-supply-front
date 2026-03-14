import type {
  StyleDetailData,
  StyleMaterialData,
  StyleDetailSavePayload,
  StyleFormMeta,
  StyleStatus,
  StyleWeeklySalesConfig,
} from '../types/style';
import http from './http';
import { tenantStore } from '../stores/tenant';

type BackendStyleStatus = 'ACTIVE' | 'INACTIVE';
type BackendWeeklySalesMode = 'AUTO' | 'MANUAL';

type BackendStyleVariant = {
  id: number;
  color?: string;
  size?: string;
  attributes?: Record<string, unknown> | null;
};

type BackendStyleResponse = {
  id: number;
  tenantId: number;
  styleNo: string;
  styleName: string;
  defaultUnit?: string;
  status: BackendStyleStatus;
  designerId?: number;
  remarks?: string;
  coverImageUrl?: string;
  variants: BackendStyleVariant[];
};

type BackendWeeklySalesSettingResponse = {
  styleId: number;
  salesMode: BackendWeeklySalesMode;
  manualWeeklySales?: number;
  autoSalesWeeks?: number;
  coverageWeeks?: number;
  overrideReason?: string;
  resolvedWeeklySales?: number;
};

type BackendWeeklySalesSettingRequest = {
  tenantId: number;
  salesMode: BackendWeeklySalesMode;
  manualWeeklySales?: number;
  autoSalesWeeks?: number;
  coverageWeeks?: number;
  overrideReason?: string;
};

type BackendStyleMaterialResponse = {
  materialId: number;
  materialName: string;
  materialSku?: string;
  materialType?: 'FABRIC' | 'ACCESSORY' | 'PACKAGING';
  unit?: string;
  consumption?: number;
  lossRate?: number;
};

type BackendStyleRequest = {
  tenantId: number;
  styleNo: string;
  styleName: string;
  categoryId?: number;
  defaultUnit?: string;
  status?: BackendStyleStatus;
  designerId?: number;
  remarks?: string;
  coverImageUrl?: string;
  variants: BackendStyleVariantRequest[];
};

type BackendStyleVariantRequest = {
  color?: string;
  size?: string;
  attributes?: Record<string, unknown> | null;
};

type BackendMetadataResponse = {
  units?: string[];
  designers?: Array<{ id: number; name: string }>;
};

const adaptStatus = (status: BackendStyleStatus): StyleStatus =>
  status === 'ACTIVE' ? 'active' : 'inactive';

const toBackendStatus = (status: StyleStatus): BackendStyleStatus =>
  status === 'inactive' ? 'INACTIVE' : 'ACTIVE';

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

const adaptMetadata = (payload: BackendMetadataResponse): StyleFormMeta => ({
  units: Array.isArray(payload.units) ? payload.units : [],
  designers: Array.isArray(payload.designers)
    ? payload.designers.map((item) => ({ id: String(item.id), name: item.name }))
    : [],
});

const adaptDetail = (payload: BackendStyleResponse): StyleDetailData => {
  const colorsSet = new Set<string>();
  const sizesSet = new Set<string>();
  const colorImages: Record<string, string | undefined> = {};
  let sizeChartImageUrl: string | undefined;

  payload.variants?.forEach((variant) => {
    const attrs = variant.attributes ?? {};
    if (variant.color) {
      colorsSet.add(variant.color);
      const colorImage = typeof attrs.colorImageUrl === 'string' ? attrs.colorImageUrl : undefined;
      if (colorImage && !colorImages[variant.color]) {
        colorImages[variant.color] = colorImage;
      }
    }
    if (variant.size) {
      sizesSet.add(variant.size);
    }
    if (!sizeChartImageUrl) {
      sizeChartImageUrl =
        typeof attrs.sizeChartImageUrl === 'string' ? attrs.sizeChartImageUrl : undefined;
    }
  });

  return {
    id: String(payload.id),
    styleNo: payload.styleNo,
    styleName: payload.styleName,
    status: adaptStatus(payload.status),
    defaultUnit: payload.defaultUnit ?? undefined,
    designerId: payload.designerId ? String(payload.designerId) : undefined,
    remarks: payload.remarks ?? undefined,
    coverImageUrl: payload.coverImageUrl ?? undefined,
    colors: Array.from(colorsSet),
    sizes: Array.from(sizesSet),
    colorImages,
    sizeChartImageUrl,
  };
};

const adaptWeeklySalesConfig = (
  payload?: BackendWeeklySalesSettingResponse,
): StyleWeeklySalesConfig | undefined => {
  if (!payload) {
    return undefined;
  }
  const effectiveWeeklySales = payload.resolvedWeeklySales;
  return {
    source: payload.salesMode,
    manualWeeklySales: payload.manualWeeklySales,
    autoSalesWeeks: payload.autoSalesWeeks,
    coverageWeeks: payload.coverageWeeks,
    overrideReason: payload.overrideReason,
    autoWeeklySales: payload.salesMode === 'AUTO' ? effectiveWeeklySales : undefined,
    effectiveWeeklySales,
  };
};

const buildWeeklySalesRequest = (
  config: StyleWeeklySalesConfig | undefined,
  tenantId: number,
): BackendWeeklySalesSettingRequest => ({
  tenantId,
  salesMode: config?.source ?? 'AUTO',
  manualWeeklySales:
    config?.source === 'MANUAL' ? config.manualWeeklySales : undefined,
  autoSalesWeeks: config?.autoSalesWeeks,
  coverageWeeks: config?.coverageWeeks,
  overrideReason: config?.overrideReason?.trim() || undefined,
});

const buildVariants = (payload: StyleDetailSavePayload): BackendStyleVariantRequest[] => {
  const { colors, sizes, colorImages, sizeChartImageUrl } = payload;
  if (!colors.length || !sizes.length) {
    return [];
  }
  const variants: BackendStyleVariantRequest[] = [];
  colors.forEach((color) => {
    sizes.forEach((size) => {
      const image = colorImages[color];
      const attributes: Record<string, unknown> = {};
      if (image) {
        attributes.colorImageUrl = image;
      }
      if (sizeChartImageUrl) {
        attributes.sizeChartImageUrl = sizeChartImageUrl;
      }
      variants.push({
        color,
        size,
        attributes: Object.keys(attributes).length > 0 ? attributes : null,
      });
    });
  });
  return variants;
};

const buildRequestBody = (payload: StyleDetailSavePayload, tenantId: number): BackendStyleRequest => ({
  tenantId,
  styleNo: payload.styleNo,
  styleName: payload.styleName,
  defaultUnit: payload.defaultUnit,
  status: toBackendStatus(payload.status),
  designerId: payload.designerId ? Number(payload.designerId) : undefined,
  remarks: payload.remarks,
  coverImageUrl: payload.coverImageUrl,
  variants: buildVariants(payload),
});

export const styleDetailApi = {
  async fetchMeta(): Promise<StyleFormMeta> {
    const tenantId = ensureTenantId();
    const response = await http.get<BackendMetadataResponse>('/api/v1/styles/meta', {
      params: { tenantId },
    });
    return adaptMetadata(response.data);
  },
  async fetchDetail(styleId: string): Promise<StyleDetailData> {
    const tenantId = ensureTenantId();
    const [detailResponse, weeklySalesResponse] = await Promise.all([
      http.get<BackendStyleResponse>(`/api/v1/styles/${styleId}`, {
        params: { tenantId },
      }),
      http.get<BackendWeeklySalesSettingResponse>(`/api/v1/styles/${styleId}/weekly-sales-setting`, {
        params: { tenantId },
      }),
    ]);
    return {
      ...adaptDetail(detailResponse.data),
      weeklySalesConfig: adaptWeeklySalesConfig(weeklySalesResponse.data),
    };
  },
  async fetchMaterials(styleId: string): Promise<StyleMaterialData[]> {
    const tenantId = ensureTenantId();
    const response = await http.get<BackendStyleMaterialResponse[]>(`/api/v1/styles/${styleId}/materials`, {
      params: { tenantId },
    });
    return (response.data ?? []).map((item) => ({
      materialId: item.materialId,
      materialName: item.materialName,
      materialSku: item.materialSku ?? '',
      materialType: item.materialType ?? 'ACCESSORY',
      unit: item.unit ?? '',
      consumption: Number(item.consumption ?? 0),
      lossRate: Number(item.lossRate ?? 0),
    }));
  },
  async create(payload: StyleDetailSavePayload): Promise<StyleDetailData> {
    const tenantId = ensureTenantId();
    const requestBody = buildRequestBody(payload, tenantId);
    const response = await http.post<BackendStyleResponse>('/api/v1/styles', requestBody);
    const createdDetail = adaptDetail(response.data);
    if (createdDetail.id && payload.weeklySalesConfig) {
      await http.post<BackendWeeklySalesSettingResponse>(
        `/api/v1/styles/${createdDetail.id}/weekly-sales-setting`,
        buildWeeklySalesRequest(payload.weeklySalesConfig, tenantId),
      );
      return this.fetchDetail(createdDetail.id);
    }
    return createdDetail;
  },
  async update(styleId: string, payload: StyleDetailSavePayload): Promise<StyleDetailData> {
    const tenantId = ensureTenantId();
    const requestBody = buildRequestBody(payload, tenantId);
    await http.post<BackendStyleResponse>(`/api/v1/styles/${styleId}/update`, requestBody);
    if (payload.weeklySalesConfig) {
      await http.post<BackendWeeklySalesSettingResponse>(
        `/api/v1/styles/${styleId}/weekly-sales-setting`,
        buildWeeklySalesRequest(payload.weeklySalesConfig, tenantId),
      );
    }
    return this.fetchDetail(styleId);
  },
};

export default styleDetailApi;
