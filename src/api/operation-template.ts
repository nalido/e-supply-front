import type {
  OperationTemplate,
  OperationTemplateDataset,
  OperationTemplateListParams,
  SaveOperationTemplatePayload,
  UpdateOperationTemplatePayload,
} from '../types';
import http from './http';
import { requireNumericTenantId, toBackendPage } from './request-context';

type BackendChargeMode = 'PIECEWORK' | 'HOURLY' | 'STAGE_BASED';

type BackendOperationTemplateOperation = {
  id: number;
  sequence: number;
  unitPrice: number;
  remarks?: string;
  processCatalogId: number;
  processCode: string;
  processName: string;
  chargeMode?: BackendChargeMode;
  defaultWage?: number;
  unit?: string;
};

type BackendOperationTemplateResponse = {
  id: number;
  tenantId: number;
  name: string;
  defaultTemplate: boolean;
  createdAt?: string;
  updatedAt?: string;
  operations: BackendOperationTemplateOperation[];
};

type BackendPageResponse<T> = {
  items: T[];
  total: number;
  page: number;
  size: number;
};

const adaptChargeMode = (mode?: BackendChargeMode) => {
  if (!mode) {
    return undefined;
  }
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

const adaptTemplate = (item: BackendOperationTemplateResponse): OperationTemplate => ({
  id: String(item.id),
  tenantId: item.tenantId ? String(item.tenantId) : undefined,
  name: item.name,
  defaultTemplate: Boolean(item.defaultTemplate),
  createdAt: item.createdAt,
  updatedAt: item.updatedAt,
  operations: (item.operations ?? []).map((operation) => ({
    id: String(operation.id),
    sequence: operation.sequence,
    unitPrice: Number(operation.unitPrice ?? 0),
    remarks: operation.remarks ?? undefined,
    processCatalog: {
      id: String(operation.processCatalogId),
      code: operation.processCode,
      name: operation.processName,
      chargeMode: adaptChargeMode(operation.chargeMode),
      defaultWage: operation.defaultWage,
      unit: operation.unit,
    },
  })),
});

const buildOperationsPayload = (
  operations: SaveOperationTemplatePayload['operations'],
): Array<Record<string, unknown>> =>
  operations.map((operation, index) => ({
    processCatalogId: Number(operation.processCatalogId),
    unitPrice: operation.unitPrice,
    remarks: operation.remarks,
    sequence: operation.sequence ?? index + 1,
  }));

export const operationTemplateApi = {
  list: async (params: OperationTemplateListParams): Promise<OperationTemplateDataset> => {
    const tenantId = requireNumericTenantId();
    const response = await http.get<BackendPageResponse<BackendOperationTemplateResponse>>(
      '/api/v1/operation-templates',
      {
        params: {
          tenantId,
          keyword: params.keyword,
          page: toBackendPage(params.page),
          size: params.pageSize,
        },
        skipPageNormalization: true,
      },
    );
    return {
      list: response.data.items.map(adaptTemplate),
      total: response.data.total,
    };
  },
  create: async (payload: SaveOperationTemplatePayload): Promise<OperationTemplate> => {
    const tenantId = requireNumericTenantId();
    const response = await http.post<BackendOperationTemplateResponse>('/api/v1/operation-templates', {
      tenantId,
      name: payload.name,
      defaultTemplate: Boolean(payload.defaultTemplate),
      operations: buildOperationsPayload(payload.operations),
    });
    return adaptTemplate(response.data);
  },
  update: async (id: string, payload: UpdateOperationTemplatePayload): Promise<OperationTemplate | undefined> => {
    const tenantId = requireNumericTenantId();
    const response = await http.post<BackendOperationTemplateResponse>(
      `/api/v1/operation-templates/${id}/update`,
      {
        tenantId,
        name: payload.name,
        defaultTemplate: Boolean(payload.defaultTemplate),
        operations: buildOperationsPayload(payload.operations),
      },
    );
    return adaptTemplate(response.data);
  },
  remove: async (id: string): Promise<boolean> => {
    const tenantId = requireNumericTenantId();
    await http.delete(`/api/v1/operation-templates/${id}`, {
      params: { tenantId },
    });
    return true;
  },
};

export default operationTemplateApi;
