import axios from 'axios';
import type {
  StyleBomConfiguration,
  StyleBomConfigurationItem,
  StyleBomHandlingMode,
  StyleBomImpactPreview,
  StyleBomLineDraft,
  StyleBomMaterialDraft,
  StyleBomUpdatePayload,
  StyleMaterialData,
} from '../types/style';
import type { MaterialMinimumSpecification } from '../types/material';
import http from './http';
import { requireNumericTenantId } from './request-context';

type BackendStyleBomMaterialResponse = {
  materialId: number;
  materialName: string;
  materialSku?: string;
  materialType?: 'FABRIC' | 'ACCESSORY' | 'PACKAGING';
  unit?: string;
  imageUrl?: string;
  consumption?: number;
  lossRate?: number;
  unitPrice?: number;
  remark?: string;
};

type BackendStyleBomUpdateRequest = {
  tenantId: number;
  materials: Array<{
    materialId: number;
    consumption: number;
    lossRate?: number;
    remark?: string;
  }>;
};

type BackendMinimumSpecification = {
  id?: number;
  code?: string;
  label?: string;
  color?: string;
  specification?: string;
  width?: string;
  grammage?: string;
  active?: boolean;
};

type BackendStyleBomConfigurationItem = {
  id?: number;
  materialId: number;
  materialName?: string;
  materialSku?: string;
  materialType?: 'FABRIC' | 'ACCESSORY' | 'PACKAGING';
  unit?: string;
  imageUrl?: string;
  materialMinimumSpecificationId?: number;
  minimumSpecification?: BackendMinimumSpecification;
  applyToAllColors?: boolean;
  applicableColors?: string[];
  averageConsumption?: number | null;
  sizeConsumptions?: Array<{ size: string; consumption?: number | null }>;
  lossRate?: number;
  remark?: string;
};

type BackendStyleBomConfiguration = {
  bomVersionId?: number;
  revision?: string;
  revisionNumber?: number;
  items?: BackendStyleBomConfigurationItem[];
};

type BackendStyleBomImpactPreview = {
  previewToken: string;
  unissued?: number;
  issued?: number;
  adjustable?: number;
  manualReview?: number;
  locked?: number;
  unissuedOrderCount?: number;
  issuedOrderCount?: number;
  adjustableHistoryCount?: number;
  manualReviewCount?: number;
  lockedCount?: number;
};

type BackendStyleBomUpdateResponse = {
  configuration: BackendStyleBomConfiguration;
  correctionTaskId?: number;
  synchronizedOrderCount?: number;
  idempotentReplay?: boolean;
};

type ConfigurationMaterialRequest = {
  materialId: number;
  materialMinimumSpecificationId: number;
  applyToAllColors: boolean;
  applicableColors: string[];
  averageConsumption: number;
  sizeConsumptions: Array<{ size: string; consumption: number }>;
  lossRate: number;
  remark?: string;
};

const lossRateFractionToPercent = (lossRate?: number): number =>
  Number(lossRate ?? 0) * 100;

const lossRatePercentToFraction = (lossRate?: number): number =>
  Number(lossRate ?? 0) / 100;

if (import.meta.env.DEV) {
  [0, 0.025].forEach((fraction) => {
    const roundTrip = lossRatePercentToFraction(lossRateFractionToPercent(fraction));
    if (Math.abs(roundTrip - fraction) > Number.EPSILON) {
      throw new Error('Style BOM loss rate conversion is not reversible');
    }
  });
}

const adaptBomMaterial = (item: BackendStyleBomMaterialResponse): StyleMaterialData => ({
  materialId: item.materialId,
  materialName: item.materialName,
  materialSku: item.materialSku ?? '',
  materialType: item.materialType ?? 'ACCESSORY',
  unit: item.unit ?? '',
  imageUrl: item.imageUrl ?? undefined,
  consumption: Number(item.consumption ?? 0),
  lossRate: Number(item.lossRate ?? 0),
  unitPrice: item.unitPrice == null ? undefined : Number(item.unitPrice),
  remark: item.remark ?? undefined,
});

const adaptMinimumSpecification = (
  item: BackendMinimumSpecification | undefined,
  fallbackId?: number,
): MaterialMinimumSpecification => ({
  id: item?.id == null ? (fallbackId == null ? undefined : String(fallbackId)) : String(item.id),
  code: item?.code?.trim() || undefined,
  label: item?.label?.trim() || [item?.color, item?.specification, item?.width, item?.grammage].filter(Boolean).join(' · ') || '通用规格',
  color: item?.color?.trim() || undefined,
  specification: item?.specification?.trim() || undefined,
  width: item?.width?.trim() || undefined,
  grammage: item?.grammage?.trim() || undefined,
  active: item?.active !== false,
});

const resolveAverageConsumption = (item: BackendStyleBomConfigurationItem): number | null => {
  if (item.averageConsumption != null) {
    return Number(item.averageConsumption);
  }
  const values = (item.sizeConsumptions ?? [])
    .map((entry) => entry.consumption)
    .filter((value): value is number => value != null)
    .map(Number);
  if (!values.length || values.some((value) => value !== values[0])) {
    return null;
  }
  return values[0];
};

const adaptConfigurationItem = (item: BackendStyleBomConfigurationItem): StyleBomConfigurationItem => ({
  id: item.id == null ? undefined : String(item.id),
  materialId: String(item.materialId),
  materialName: item.materialName ?? '',
  materialSku: item.materialSku ?? '',
  materialType: item.materialType === 'FABRIC' ? 'fabric' : 'accessory',
  unit: item.unit ?? '',
  imageUrl: item.imageUrl ?? undefined,
  materialMinimumSpecificationId: item.materialMinimumSpecificationId == null ? '' : String(item.materialMinimumSpecificationId),
  minimumSpecification: adaptMinimumSpecification(item.minimumSpecification, item.materialMinimumSpecificationId),
  applyToAllColors: item.applyToAllColors !== false,
  applicableColors: item.applicableColors ?? [],
  averageConsumption: resolveAverageConsumption(item),
  sizeConsumptions: (item.sizeConsumptions ?? []).map((entry) => ({
    size: entry.size,
    consumption: entry.consumption == null ? null : Number(entry.consumption),
  })),
  lossRate: lossRateFractionToPercent(item.lossRate),
  remark: item.remark ?? undefined,
});

const adaptConfiguration = (data: BackendStyleBomConfiguration): StyleBomConfiguration => ({
  bomVersionId: data.bomVersionId == null ? undefined : String(data.bomVersionId),
  revisionCode: data.revision?.trim() || undefined,
  revision: Number(data.revisionNumber ?? 0),
  items: (data.items ?? []).map(adaptConfigurationItem),
});

const buildConfigurationMaterials = (items: StyleBomLineDraft[]): ConfigurationMaterialRequest[] =>
  items.map((item) => ({
    materialId: Number(item.materialId),
    materialMinimumSpecificationId: Number(item.materialMinimumSpecificationId),
    applyToAllColors: item.applyToAllColors,
    applicableColors: item.applyToAllColors ? [] : item.applicableColors,
    averageConsumption: Number(item.averageConsumption),
    sizeConsumptions: item.sizeConsumptions.map((entry) => ({
      size: entry.size,
      consumption: Number(entry.consumption),
    })),
    lossRate: lossRatePercentToFraction(item.lossRate),
    remark: item.remark?.trim() || undefined,
  }));

const buildUpdateRequest = (
  tenantId: number,
  payload: StyleBomUpdatePayload,
): BackendStyleBomUpdateRequest => ({
  tenantId,
  materials: payload.items.map((item) => ({
    materialId: Number(item.materialId),
    consumption: Number(item.consumption ?? 0),
    lossRate: item.lossRate,
    remark: item.remark?.trim() || undefined,
  })),
});

const isNotFound = (error: unknown): boolean =>
  axios.isAxiosError(error) && error.response?.status === 404;

export const buildStyleBomUpdatePayload = (
  items: StyleBomMaterialDraft[],
): StyleBomUpdatePayload => ({
  items: items
    .filter((item) => item.materialId)
    .map((item) => ({
      materialId: item.materialId!,
      consumption: Number(item.consumption ?? 0),
      lossRate: item.lossRate ? item.lossRate / 100 : undefined,
      remark: item.remark,
    })),
});

export const styleBomApi = {
  async fetchConfiguration(styleId: string): Promise<StyleBomConfiguration> {
    const tenantId = requireNumericTenantId();
    const response = await http.get<BackendStyleBomConfiguration>(
      `/api/v1/styles/${styleId}/bom-configuration`,
      { params: { tenantId } },
    );
    return adaptConfiguration(response.data);
  },

  async previewImpact(
    styleId: string,
    params: {
      baseBomVersionId?: string;
      items: StyleBomLineDraft[];
      historyStart?: string;
      historyEnd?: string;
      candidateColors?: string[];
      candidateSizes?: string[];
    },
  ): Promise<StyleBomImpactPreview> {
    const tenantId = requireNumericTenantId();
    const response = await http.post<BackendStyleBomImpactPreview>(
      `/api/v1/styles/${styleId}/bom-configuration/impact-preview`,
      {
        tenantId,
        baseBomVersionId: params.baseBomVersionId ? Number(params.baseBomVersionId) : undefined,
        items: buildConfigurationMaterials(params.items),
        historyStart: params.historyStart,
        historyEnd: params.historyEnd,
        candidateColors: params.candidateColors,
        candidateSizes: params.candidateSizes,
      },
    );
    return {
      previewToken: response.data.previewToken,
      unissuedOrderCount: Number(response.data.unissuedOrderCount ?? response.data.unissued ?? 0),
      issuedOrderCount: Number(response.data.issuedOrderCount ?? response.data.issued ?? 0),
      adjustableHistoryCount: Number(response.data.adjustableHistoryCount ?? response.data.adjustable ?? 0),
      manualReviewCount: Number(response.data.manualReviewCount ?? response.data.manualReview ?? 0),
      lockedCount: Number(response.data.lockedCount ?? response.data.locked ?? 0),
    };
  },

  async updateConfiguration(
    styleId: string,
    params: {
      baseBomVersionId?: string;
      previewToken: string;
      handlingMode: StyleBomHandlingMode;
      historyStart?: string;
      historyEnd?: string;
      idempotencyKey: string;
      items: StyleBomLineDraft[];
      candidateColors: string[];
      candidateSizes: string[];
    },
  ): Promise<{
    configuration: StyleBomConfiguration;
    correctionTaskId?: string;
    synchronizedOrderCount: number;
    idempotentReplay: boolean;
  }> {
    const tenantId = requireNumericTenantId();
    const response = await http.post<BackendStyleBomUpdateResponse>(`/api/v1/styles/${styleId}/bom-configuration/update`, {
      tenantId,
      baseBomVersionId: params.baseBomVersionId ? Number(params.baseBomVersionId) : undefined,
      previewToken: params.previewToken,
      handlingMode: params.handlingMode,
      historyStart: params.historyStart,
      historyEnd: params.historyEnd,
      idempotencyKey: params.idempotencyKey,
      items: buildConfigurationMaterials(params.items),
      candidateColors: params.candidateColors,
      candidateSizes: params.candidateSizes,
    });
    return {
      configuration: adaptConfiguration(response.data.configuration),
      correctionTaskId: response.data.correctionTaskId == null ? undefined : String(response.data.correctionTaskId),
      synchronizedOrderCount: Number(response.data.synchronizedOrderCount ?? 0),
      idempotentReplay: response.data.idempotentReplay === true,
    };
  },

  async fetch(styleId: string): Promise<StyleMaterialData[]> {
    const tenantId = requireNumericTenantId();
    try {
      const configuration = await this.fetchConfiguration(styleId);
      return configuration.items.map((item) => ({
        bomItemId: item.id,
        materialId: Number(item.materialId),
        materialName: item.materialName,
        materialSku: item.materialSku,
        materialType: item.materialType === 'fabric' ? 'FABRIC' : 'ACCESSORY',
        unit: item.unit,
        imageUrl: item.imageUrl,
        consumption: item.averageConsumption ?? item.sizeConsumptions[0]?.consumption ?? 0,
        lossRate: item.lossRate / 100,
        remark: item.remark,
        minimumSpecificationLabel: item.minimumSpecification.label,
        applyToAllColors: item.applyToAllColors,
        applicableColors: item.applicableColors,
        sizeConsumptions: item.sizeConsumptions,
      }));
    } catch (configurationError) {
      if (!isNotFound(configurationError)) {
        throw configurationError;
      }
    }
    try {
      const response = await http.get<BackendStyleBomMaterialResponse[]>(
        `/api/v1/styles/${styleId}/bom-materials`,
        { params: { tenantId } },
      );
      return (response.data ?? []).map(adaptBomMaterial);
    } catch (error) {
      if (!isNotFound(error)) {
        throw error;
      }
      const response = await http.get<BackendStyleBomMaterialResponse[]>(
        `/api/v1/styles/${styleId}/materials`,
        { params: { tenantId } },
      );
      return (response.data ?? []).map(adaptBomMaterial);
    }
  },

  async update(styleId: string, payload: StyleBomUpdatePayload): Promise<StyleMaterialData[]> {
    const tenantId = requireNumericTenantId();
    const requestBody = buildUpdateRequest(tenantId, payload);
    try {
      await http.post(`/api/v1/styles/${styleId}/bom-materials/update`, requestBody);
    } catch (error) {
      if (!isNotFound(error)) {
        throw error;
      }
      await http.post(`/api/v1/styles/${styleId}/materials/update`, requestBody);
    }
    return this.fetch(styleId);
  },
};

export default styleBomApi;
