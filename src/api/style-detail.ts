import type {
  StyleDetailData,
  StyleDetailSavePayload,
  StyleFormMeta,
  StyleStatus,
} from '../types/style';
import { apiConfig } from './config';
import http from './http';
import { tenantStore } from '../stores/tenant';
import { getStyleDetail, getStyleFormMeta, saveStyleDetail } from '../mock/style-detail';

const useMock = apiConfig.useMock;

type BackendStyleStatus = 'ACTIVE' | 'INACTIVE';
type BackendChargeMode = 'PIECEWORK' | 'HOURLY' | 'STAGE_BASED';

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
  processes?: BackendStyleProcessResponse[];
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
  processes: BackendStyleProcessRequest[];
};

type BackendStyleVariantRequest = {
  color?: string;
  size?: string;
  attributes?: Record<string, unknown> | null;
};

type BackendStyleProcessResponse = {
  id: number;
  sequence?: number;
  unitPrice?: number;
  remarks?: string;
  processCatalogId?: number;
  processCode?: string;
  processName?: string;
  chargeMode?: BackendChargeMode;
  defaultWage?: number;
  unit?: string;
  sourceTemplateId?: number;
};

type BackendStyleProcessRequest = {
  processCatalogId: number;
  unitPrice?: number;
  remarks?: string;
  sequence?: number;
  sourceTemplateId?: number;
};

type BackendMetadataResponse = {
  units?: string[];
  designers?: Array<{ id: number; name: string }>;
};

const adaptStatus = (status: BackendStyleStatus): StyleStatus =>
  status === 'ACTIVE' ? 'active' : 'inactive';

const toBackendStatus = (status: StyleStatus): BackendStyleStatus =>
  status === 'inactive' ? 'INACTIVE' : 'ACTIVE';

const adaptChargeMode = (mode?: BackendChargeMode) => {
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

  payload.variants?.forEach((variant) => {
    if (variant.color) {
      colorsSet.add(variant.color);
      const attrs = variant.attributes ?? {};
      const colorImage = typeof attrs.colorImageUrl === 'string' ? attrs.colorImageUrl : undefined;
      if (colorImage && !colorImages[variant.color]) {
        colorImages[variant.color] = colorImage;
      }
    }
    if (variant.size) {
      sizesSet.add(variant.size);
    }
  });

  const processes = Array.isArray(payload.processes)
    ? payload.processes
        .filter((process) => process.processCatalogId)
        .map((process) => ({
          id: process.id ? String(process.id) : undefined,
          processCatalogId: process.processCatalogId
            ? String(process.processCatalogId)
            : undefined,
          processCode: process.processCode ?? undefined,
          processName: process.processName ?? undefined,
          chargeMode: adaptChargeMode(process.chargeMode),
          defaultWage:
            typeof process.defaultWage === 'number' ? process.defaultWage : undefined,
          unit: process.unit ?? undefined,
          unitPrice:
            typeof process.unitPrice === 'number' ? Number(process.unitPrice) : undefined,
          remarks: process.remarks ?? undefined,
          sequence: process.sequence ?? undefined,
          sourceTemplateId: process.sourceTemplateId
            ? String(process.sourceTemplateId)
            : undefined,
        }))
    : [];

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
    processes,
  };
};

const buildVariants = (payload: StyleDetailSavePayload): BackendStyleVariantRequest[] => {
  const { colors, sizes, colorImages } = payload;
  if (!colors.length || !sizes.length) {
    return [];
  }
  const variants: BackendStyleVariantRequest[] = [];
  colors.forEach((color) => {
    sizes.forEach((size) => {
      const image = colorImages[color];
      variants.push({
        color,
        size,
        attributes: image ? { colorImageUrl: image } : null,
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
  processes: buildProcesses(payload),
});

const buildProcesses = (payload: StyleDetailSavePayload): BackendStyleProcessRequest[] => {
  if (!payload.processes?.length) {
    return [];
  }
  return payload.processes
      .filter((process) => process?.processCatalogId)
      .map((process) => ({
        processCatalogId: Number(process.processCatalogId),
        unitPrice:
          typeof process.unitPrice === 'number' && Number.isFinite(process.unitPrice)
            ? Number(process.unitPrice)
            : 0,
        remarks: process.remarks,
        sequence: process.sequence,
        sourceTemplateId: process.sourceTemplateId
          ? Number(process.sourceTemplateId)
          : undefined,
      }));
};

export const styleDetailApi = {
  async fetchMeta(): Promise<StyleFormMeta> {
    if (useMock) {
      return getStyleFormMeta();
    }
    const tenantId = ensureTenantId();
    const response = await http.get<BackendMetadataResponse>('/api/v1/styles/meta', {
      params: { tenantId },
    });
    return adaptMetadata(response.data);
  },
  async fetchDetail(styleId: string): Promise<StyleDetailData> {
    if (useMock) {
      return getStyleDetail(styleId);
    }
    const tenantId = ensureTenantId();
    const response = await http.get<BackendStyleResponse>(`/api/v1/styles/${styleId}`, {
      params: { tenantId },
    });
    return adaptDetail(response.data);
  },
  async create(payload: StyleDetailSavePayload): Promise<StyleDetailData> {
    if (useMock) {
      return saveStyleDetail(payload);
    }
    const tenantId = ensureTenantId();
    const requestBody = buildRequestBody(payload, tenantId);
    const response = await http.post<BackendStyleResponse>('/api/v1/styles', requestBody);
    return adaptDetail(response.data);
  },
  async update(styleId: string, payload: StyleDetailSavePayload): Promise<StyleDetailData> {
    if (useMock) {
      return saveStyleDetail({ ...payload, styleNo: payload.styleNo || styleId });
    }
    const tenantId = ensureTenantId();
    const requestBody = buildRequestBody(payload, tenantId);
    const response = await http.post<BackendStyleResponse>(`/api/v1/styles/${styleId}/update`, requestBody);
    return adaptDetail(response.data);
  },
};

export default styleDetailApi;
