import type { PaginatedStyleData, StyleData, StyleListParams, StyleStatus } from '../types/style';
import http from './http';
import { fromBackendPage, requireNumericTenantId, toBackendPage } from './request-context';
import { sortColorValues, sortSizeValues } from '../utils/spec';

type BackendStyleStatus = 'ACTIVE' | 'INACTIVE';

type BackendStyleSummary = {
  id: number;
  tenantId: number;
  styleNo: string;
  styleName: string;
  status: BackendStyleStatus;
  defaultUnit?: string;
  coverImageUrl?: string;
  colors?: string[];
  sizes?: string[];
  createdAt?: string;
  updatedAt?: string;
};

type BackendPageResponse<T> = {
  items: T[];
  total: number;
  page: number;
  size: number;
};

const adaptStatus = (status: BackendStyleStatus): StyleStatus =>
  status === 'ACTIVE' ? 'active' : 'inactive';

const adaptStyle = (payload: BackendStyleSummary): StyleData => ({
  id: String(payload.id),
  styleNo: payload.styleNo,
  styleName: payload.styleName,
  image: payload.coverImageUrl ?? undefined,
  colors: sortColorValues(Array.isArray(payload.colors) ? payload.colors : []),
  sizes: sortSizeValues(Array.isArray(payload.sizes) ? payload.sizes : []),
  status: adaptStatus(payload.status),
  defaultUnit: payload.defaultUnit ?? undefined,
  createTime: payload.createdAt ?? undefined,
  updateTime: payload.updatedAt ?? undefined,
});

export const stylesApi = {
  async list(params: StyleListParams): Promise<PaginatedStyleData> {
    const tenantId = requireNumericTenantId();
    const response = await http.get<BackendPageResponse<BackendStyleSummary>>('/api/v1/styles', {
      params: {
        tenantId,
        keyword: params.keyword,
        page: toBackendPage(params.page),
        size: params.pageSize,
      },
      skipPageNormalization: true,
    });
    return {
      list: response.data.items.map(adaptStyle),
      total: response.data.total,
      page: fromBackendPage(response.data.page),
      pageSize: response.data.size,
    };
  },

  async delete(styleId: string): Promise<void> {
    const tenantId = requireNumericTenantId();
    await http.post(`/api/v1/styles/${styleId}/delete`, undefined, {
      params: { tenantId },
    });
  },
};

export default stylesApi;
