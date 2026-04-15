import axios from 'axios';
import type {
  StyleBomMaterialDraft,
  StyleBomUpdatePayload,
  StyleMaterialData,
} from '../types/style';
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
  async fetch(styleId: string): Promise<StyleMaterialData[]> {
    const tenantId = requireNumericTenantId();
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
