import http from './http';
import type { Paginated } from '../types/pagination';
import { requireNumericTenantId, requireTenantId, toBackendPage } from './request-context';
import type {
  FollowTemplateSummary,
  FollowTemplatePayload,
  TemplateNode,
  TemplateFieldType,
  SampleTypeItem,
} from '../types/sample';
import { TemplateFieldTypes } from '../types/sample';

type BackendPageResponse<T> = {
  items?: T[];
  total?: number;
  page?: number;
  size?: number;
};

interface BackendFollowTemplateNode {
  id?: number;
  sortOrder?: number;
  sequenceNo?: number;
  nodeName?: string;
  fieldType?: string;
  duration?: number;
}

interface BackendFollowTemplateResponse {
  id: number;
  name: string;
  description?: string;
  isDefault?: boolean;
  sequenceNo?: number;
  nodes?: BackendFollowTemplateNode[];
}

interface BackendSampleTypeResponse {
  id: number;
  name: string;
  description?: string;
}

const normalizeNodeOrder = (nodes?: TemplateNode[]): TemplateNode[] => {
  if (!nodes?.length) {
    return [];
  }
  return nodes.map((node, index) => {
    const baseOrder = node.sortOrder ?? node.sequenceNo ?? index + 1;
    return {
      ...node,
      sortOrder: baseOrder,
      sequenceNo: node.sequenceNo ?? baseOrder,
    };
  });
};

const isValidFieldType = (value: unknown): value is TemplateFieldType =>
  TemplateFieldTypes.includes(value as TemplateFieldType);

const normalizeFieldType = (value?: string | null): TemplateFieldType =>
  value && isValidFieldType(value) ? value : 'text';

const adaptNodeFromBackend = (
  node: BackendFollowTemplateNode,
  index: number,
): TemplateNode => ({
  id: Number(node.id ?? index + 1),
  sortOrder: node.sortOrder ?? node.sequenceNo ?? index + 1,
  sequenceNo: node.sequenceNo ?? node.sortOrder ?? index + 1,
  nodeName: node.nodeName ?? `节点${index + 1}`,
  fieldType: normalizeFieldType(node.fieldType),
  duration: typeof node.duration === 'number' ? node.duration : Number(node.duration ?? 0),
});

const adaptFollowTemplate = (item: BackendFollowTemplateResponse): FollowTemplateSummary => ({
  id: Number(item.id),
  name: item.name,
  sequenceNo: item.sequenceNo ?? 0,
  isDefault: Boolean(item.isDefault),
  nodes: item.nodes?.length
    ? item.nodes.map((node, index) => adaptNodeFromBackend(node, index))
    : undefined,
});

const buildFollowTemplateRequestBody = (
  tenantId: number,
  payload: FollowTemplatePayload,
) => {
  const normalizedNodes = normalizeNodeOrder(payload.nodes);
  return {
    tenantId,
    name: payload.name,
    description: payload.description ?? '',
    isDefault: Boolean(payload.isDefault),
    sequenceNo: payload.sequenceNo,
    nodes: normalizedNodes.map((node, index) => ({
      id: node.id ?? index + 1,
      sortOrder: node.sortOrder ?? index + 1,
      sequenceNo: node.sequenceNo ?? node.sortOrder ?? index + 1,
      nodeName: node.nodeName,
      fieldType: normalizeFieldType(node.fieldType),
      duration: Number.isFinite(node.duration) ? node.duration : 0,
    })),
  };
};

const adaptSampleTypeList = (items?: BackendSampleTypeResponse[]): SampleTypeItem[] =>
  (items ?? []).map((item, index) => ({
    id: Number(item.id),
    name: item.name ?? `类型${index + 1}`,
  }));

const paginateArray = <T>(items: T[], page: number, pageSize: number): Paginated<T> => {
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const safeSize = Number.isFinite(pageSize) && pageSize > 0 ? Math.floor(pageSize) : 10;
  const start = (safePage - 1) * safeSize;
  return {
    list: items.slice(start, start + safeSize),
    total: items.length,
  };
};

export const sampleSettingsApi = {
  followTemplates: {
    async list(params: { page: number; pageSize: number; keyword?: string }): Promise<Paginated<FollowTemplateSummary>> {
      const tenantId = requireTenantId();
      const { data } = await http.get<BackendPageResponse<BackendFollowTemplateResponse>>(
        '/api/v1/sample-follow-templates',
        {
          params: {
            tenantId,
            page: toBackendPage(params.page),
            size: params.pageSize,
            keyword: params.keyword,
          },
          skipPageNormalization: true,
        },
      );
      const normalizedItems = (data?.items ?? []).map(adaptFollowTemplate);
      return {
        list: normalizedItems,
        total: Number(data?.total ?? normalizedItems.length ?? 0),
      };
    },
    async create(payload: FollowTemplatePayload): Promise<void> {
      const tenantId = requireNumericTenantId();
      const body = buildFollowTemplateRequestBody(tenantId, payload);
      await http.post('/api/v1/sample-follow-templates', body);
    },
    async update(id: number, payload: FollowTemplatePayload): Promise<void> {
      const tenantId = requireNumericTenantId();
      const body = buildFollowTemplateRequestBody(tenantId, payload);
      await http.post(`/api/v1/sample-follow-templates/${id}/update`, body);
    },
    async delete(id: number): Promise<void> {
      const tenantId = requireTenantId();
      await http.post(`/api/v1/sample-follow-templates/${id}/delete`, null, {
        params: { tenantId },
      });
    },
  },
  sampleTypes: {
    async list(params: { page: number; pageSize: number }): Promise<Paginated<SampleTypeItem>> {
      const tenantId = requireTenantId();
      const { data } = await http.get<BackendSampleTypeResponse[]>(
        '/api/v1/sample-types',
        {
          params: { tenantId },
        },
      );
      const normalized = adaptSampleTypeList(data);
      return paginateArray(normalized, params.page, params.pageSize);
    },
    async create(payload: { name: string }): Promise<void> {
      const tenantId = requireNumericTenantId();
      await http.post('/api/v1/sample-types', {
        tenantId,
        name: payload.name,
        description: '',
      });
    },
    async update(id: number, payload: { name: string }): Promise<void> {
      const tenantId = requireNumericTenantId();
      await http.post(`/api/v1/sample-types/${id}/update`, {
        tenantId,
        name: payload.name,
        description: '',
      });
    },
    async delete(id: number): Promise<void> {
      const tenantId = requireTenantId();
      await http.post(`/api/v1/sample-types/${id}/delete`, null, {
        params: { tenantId },
      });
    },
  },
};

export type SampleSettingsApi = typeof sampleSettingsApi;
