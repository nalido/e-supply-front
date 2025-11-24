import type { PaginatedStyleData, StyleData, StyleListParams, StyleStatus } from '../types/style';
import { apiConfig } from './config';
import http from './http';
import { tenantStore } from '../stores/tenant';
import { styles as mockStyles } from './mock';

const useMock = apiConfig.useMock;

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
  colors: Array.isArray(payload.colors) ? payload.colors : [],
  sizes: Array.isArray(payload.sizes) ? payload.sizes : [],
  status: adaptStatus(payload.status),
  defaultUnit: payload.defaultUnit ?? undefined,
  createTime: payload.createdAt ?? undefined,
  updateTime: payload.updatedAt ?? undefined,
});

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

export const stylesApi = {
  async list(params: StyleListParams): Promise<PaginatedStyleData> {
    if (useMock) {
      return mockStyles.list(params);
    }
    const tenantId = ensureTenantId();
    const response = await http.get<BackendPageResponse<BackendStyleSummary>>('/api/v1/styles', {
      params: {
        tenantId,
        keyword: params.keyword,
        page: params.page,
        size: params.pageSize,
      },
    });
    return {
      list: response.data.items.map(adaptStyle),
      total: response.data.total,
      page: response.data.page + 1,
      pageSize: response.data.size,
    };
  },

  async delete(styleId: string): Promise<void> {
    if (useMock) {
      await mockStyles.delete(styleId);
      return;
    }
    const tenantId = ensureTenantId();
    await http.post(`/api/v1/styles/${styleId}/delete`, undefined, {
      params: { tenantId },
    });
  },
};

export default stylesApi;
