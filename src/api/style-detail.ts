import type {
  StyleDetailData,
  StyleMaterialData,
  StyleDetailSavePayload,
  StyleFormMeta,
  StyleStatus,
} from '../types/style';
import http from './http';
import { requireNumericTenantId } from './request-context';
import { sortColorValues, sortSizeValues } from '../utils/spec';

type BackendStyleStatus = 'ACTIVE' | 'INACTIVE';
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
  let detailImageUrls: string[] = [];

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
    if (detailImageUrls.length === 0 && Array.isArray(attrs.detailImageUrls)) {
      detailImageUrls = attrs.detailImageUrls
        .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
        .map((item) => item.trim());
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
    detailImageUrls,
    colors: sortColorValues(Array.from(colorsSet)),
    sizes: sortSizeValues(Array.from(sizesSet)),
    colorImages,
    sizeChartImageUrl,
  };
};

const buildVariants = (payload: StyleDetailSavePayload): BackendStyleVariantRequest[] => {
  const colors = sortColorValues(payload.colors);
  const sizes = sortSizeValues(payload.sizes);
  const { colorImages, sizeChartImageUrl, detailImageUrls } = payload;
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
      if (detailImageUrls.length > 0) {
        attributes.detailImageUrls = detailImageUrls;
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
    const tenantId = requireNumericTenantId();
    const response = await http.get<BackendMetadataResponse>('/api/v1/styles/meta', {
      params: { tenantId },
    });
    return adaptMetadata(response.data);
  },
  async fetchDetail(styleId: string): Promise<StyleDetailData> {
    const tenantId = requireNumericTenantId();
    const detailResponse = await http.get<BackendStyleResponse>(`/api/v1/styles/${styleId}`, {
      params: { tenantId },
    });
    return adaptDetail(detailResponse.data);
  },
  async fetchMaterials(styleId: string): Promise<StyleMaterialData[]> {
    const tenantId = requireNumericTenantId();
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
    const tenantId = requireNumericTenantId();
    const requestBody = buildRequestBody(payload, tenantId);
    const response = await http.post<BackendStyleResponse>('/api/v1/styles', requestBody);
    return adaptDetail(response.data);
  },
  async update(styleId: string, payload: StyleDetailSavePayload): Promise<StyleDetailData> {
    const tenantId = requireNumericTenantId();
    const requestBody = buildRequestBody(payload, tenantId);
    await http.post<BackendStyleResponse>(`/api/v1/styles/${styleId}/update`, requestBody);
    return this.fetchDetail(styleId);
  },
};

export default styleDetailApi;
