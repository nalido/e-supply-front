import http from './http';
import { tenantStore } from '../stores/tenant';
import type {
  OperationalEfficiencyListParams,
  OperationalEfficiencyListResponse,
  OperationalEfficiencyListItem,
  OperationalEfficiencyMeta,
  OperationalEfficiencyTemplatePayload,
  OperationalEfficiencyNode,
} from '../types/operational-efficiency';

const ensureTenantId = (): number => {
  const tenantId = tenantStore.getTenantId();
  if (!tenantId) {
    throw new Error('未获取到企业信息，请重新登录');
  }
  return Number(tenantId);
};

type BackendNode = {
  id?: number;
  nodeCode?: string;
  nodeName?: string;
  standardDuration?: number;
  timeUnit?: string;
  sequence?: number;
};

type BackendTemplate = {
  id?: number;
  name?: string;
  isDefault?: boolean;
  createdAt?: string;
  updatedAt?: string;
  nodes?: BackendNode[];
};

type BackendListResponse = {
  list: BackendTemplate[];
  total: number;
};

type BackendMeta = OperationalEfficiencyMeta;

const adaptNode = (node: BackendNode): OperationalEfficiencyNode => ({
  id: node.id ? String(node.id) : crypto.randomUUID(),
  nodeCode: node.nodeCode ?? '',
  nodeName: node.nodeName ?? '',
  standardDuration: node.standardDuration ?? 0,
  timeUnit: (node.timeUnit as OperationalEfficiencyNode['timeUnit']) ?? 'day',
  sequence: node.sequence ?? 0,
});

const adaptTemplate = (template: BackendTemplate): OperationalEfficiencyListItem => {
  const nodes = (template.nodes ?? []).map(adaptNode);
  const nodeSummary = nodes.map((node) => node.nodeName).join(' / ');
  return {
    id: template.id ? String(template.id) : crypto.randomUUID(),
    name: template.name ?? '',
    isDefault: Boolean(template.isDefault),
    createdAt: template.createdAt ?? '',
    updatedAt: template.updatedAt ?? '',
    nodes,
    nodeSummary,
  };
};

const buildPayload = (payload: OperationalEfficiencyTemplatePayload) => ({
  name: payload.name,
  isDefault: payload.isDefault,
  nodes: payload.nodes.map((node) => ({
    nodeCode: node.nodeCode,
    standardDuration: node.standardDuration,
    timeUnit: node.timeUnit.toUpperCase(),
  })),
});

export const operationalEfficiencyService = {
  async getMeta(): Promise<OperationalEfficiencyMeta> {
    const response = await http.get<BackendMeta>('/api/v1/production/operational-efficiency/meta');
    return response.data;
  },

  async getList(params: OperationalEfficiencyListParams): Promise<OperationalEfficiencyListResponse> {
    const tenantId = ensureTenantId();
    const response = await http.get<BackendListResponse>(
      '/api/v1/production/operational-efficiency',
      {
        params: {
          tenantId,
          keyword: params.keyword,
          page: params.page - 1,
          size: params.pageSize,
        },
      },
    );
    return {
      list: response.data.list.map(adaptTemplate),
      total: response.data.total ?? 0,
    };
  },

  async create(payload: OperationalEfficiencyTemplatePayload) {
    const tenantId = ensureTenantId();
    await http.post('/api/v1/production/operational-efficiency', {
      tenantId,
      ...buildPayload(payload),
    });
  },

  async update(id: string, payload: OperationalEfficiencyTemplatePayload) {
    const tenantId = ensureTenantId();
    await http.post(`/api/v1/production/operational-efficiency/${id}/update`, {
      tenantId,
      ...buildPayload(payload),
    });
  },

  async remove(id: string) {
    const tenantId = ensureTenantId();
    await http.post(`/api/v1/production/operational-efficiency/${id}/delete`, null, {
      params: { tenantId },
    });
  },

  async setDefault(id: string) {
    const tenantId = ensureTenantId();
    await http.post(`/api/v1/production/operational-efficiency/${id}/default`, null, {
      params: { tenantId },
    });
  },
};
