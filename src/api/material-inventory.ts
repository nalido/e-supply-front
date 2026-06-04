import type {
  MaterialInventoryAggregation,
  MaterialInventoryListParams,
  MaterialInventoryListResponse,
  MaterialInventoryQueryParams,
} from '../types/material-inventory';
import type {
  MaterialIssueCreatePayload,
  MaterialIssueCreateResponse,
  MaterialIssueListParams,
  MaterialIssueListResponse,
  MaterialIssueMeta,
  MaterialIssueLineDeletePayload,
  MaterialIssueLineUpdatePayload,
  MaterialIssueStatusUpdatePayload,
  MaterialIssueStatusUpdateResult,
} from '../types/material-issue';
import type {
  MaterialPurchaseReportListParams,
  MaterialPurchaseReportListResponse,
  MaterialPurchaseReportMeta,
} from '../types/material-purchase-report';
import type {
  MaterialMovementListParams,
  MaterialMovementListResponse,
  MaterialStockListParams,
  MaterialStockListResponse,
  MaterialStockMeta,
  MaterialStockListSummary,
} from '../types/material-stock';
import http from './http';
import { requireTenantId, toBackendPage } from './request-context';

const inflightRequests = new Map<string, Promise<unknown>>();

const withInflightDedup = <T>(key: string, factory: () => Promise<T>): Promise<T> => {
  const existing = inflightRequests.get(key);
  if (existing) {
    return existing as Promise<T>;
  }
  const request = factory().finally(() => {
    inflightRequests.delete(key);
  });
  inflightRequests.set(key, request);
  return request;
};

const toBackendMaterialType = (value?: string) => {
  if (!value) {
    return undefined;
  }
  return value === 'accessory' ? 'ACCESSORY' : 'FABRIC';
};

const buildInventoryParams = (
  tenantId: string,
  params: MaterialInventoryQueryParams,
): Record<string, string | number | undefined> => ({
  tenantId,
  keyword: params.keyword,
  type: params.type,
  startDate: params.startDate,
  endDate: params.endDate,
});

export const materialStockService = {
  async getMeta(): Promise<MaterialStockMeta> {
    const tenantId = requireTenantId();
    return withInflightDedup(`material-stock-meta:${tenantId}`, async () => {
      const response = await http.get<MaterialStockMeta>('/api/v1/inventory/materials/meta', {
        params: { tenantId },
      });
      return response.data;
    });
  },

  async getList(params: MaterialStockListParams): Promise<MaterialStockListResponse> {
    const tenantId = requireTenantId();
    const query = {
      tenantId,
      materialType: params.materialType,
      onlyInStock: params.onlyInStock,
      keywordRemark: params.keywordRemark,
      keywordOrderStyle: params.keywordOrderStyle,
      page: toBackendPage(params.page),
      size: params.pageSize,
    };
    return withInflightDedup(`material-stock-list:${JSON.stringify(query)}`, async () => {
      const response = await http.get<MaterialStockListResponse>('/api/v1/inventory/materials', {
        params: query,
        skipPageNormalization: true,
      });
      return response.data;
    });
  },

  async getSummary(): Promise<MaterialStockListSummary> {
    const tenantId = requireTenantId();
    return withInflightDedup(`material-stock-summary:${tenantId}`, async () => {
      const response = await http.get<MaterialStockListSummary>('/api/v1/inventory/materials/summary', {
        params: { tenantId },
      });
      return response.data;
    });
  },

  async getMovements(
    params: MaterialMovementListParams,
  ): Promise<MaterialMovementListResponse> {
    const tenantId = requireTenantId();
    const response = await http.get<MaterialMovementListResponse>(
      `/api/v1/inventory/materials/${params.materialId}/movements`,
      {
        params: {
          tenantId,
          warehouseId: params.warehouseId,
          startDate: params.startDate,
          endDate: params.endDate,
          page: toBackendPage(params.page),
          size: params.pageSize,
        },
        skipPageNormalization: true,
      },
    );
    return response.data;
  },
};

export const materialIssueService = {
  async getMeta(): Promise<MaterialIssueMeta> {
    const response = await http.get<MaterialIssueMeta>('/api/v1/inventory/material-issues/meta');
    return response.data;
  },

  async getList(params: MaterialIssueListParams): Promise<MaterialIssueListResponse> {
    const tenantId = requireTenantId();
    const response = await http.get<MaterialIssueListResponse>('/api/v1/inventory/material-issues', {
      params: {
        tenantId,
        materialType: params.materialType,
        keyword: params.keyword,
        page: toBackendPage(params.page),
        size: params.pageSize,
      },
    });
    return response.data;
  },

  async createIssue(payload: MaterialIssueCreatePayload): Promise<MaterialIssueCreateResponse> {
    const tenantId = requireTenantId();
    const response = await http.post<MaterialIssueCreateResponse>(
      '/api/v1/inventory/material-issues',
      {
        warehouseId: Number(payload.warehouseId),
        issueType: payload.issueType ?? 'production',
        materialType: toBackendMaterialType(payload.materialType),
        workOrderId: payload.workOrderId ? Number(payload.workOrderId) : undefined,
        recipientId: payload.recipientId ? Number(payload.recipientId) : undefined,
        issuedAt: payload.issuedAt,
        remark: payload.remark,
        lines: payload.lines.map((line) => ({
          materialId: Number(line.materialId),
          quantity: line.quantity,
          unit: line.unit,
          color: line.color,
          specification: line.specification,
          unitPrice: line.unitPrice,
        })),
      },
      { params: { tenantId } },
    );
    return response.data;
  },

  async updateStatus(
    payload: MaterialIssueStatusUpdatePayload,
  ): Promise<MaterialIssueStatusUpdateResult> {
    const tenantId = requireTenantId();
    const response = await http.post<MaterialIssueStatusUpdateResult>(
      '/api/v1/inventory/material-issues/status/update',
      {
        lineIds: payload.lineIds.map((id) => Number(id)),
        status: payload.status,
      },
      { params: { tenantId } },
    );
    return response.data;
  },

  async updateLine(lineId: string, payload: MaterialIssueLineUpdatePayload): Promise<MaterialIssueStatusUpdateResult> {
    const tenantId = requireTenantId();
    const response = await http.post<MaterialIssueStatusUpdateResult>(
      `/api/v1/inventory/material-issues/${lineId}/update`,
      { quantity: payload.quantity },
      { params: { tenantId } },
    );
    return response.data;
  },

  async deleteLines(payload: MaterialIssueLineDeletePayload): Promise<MaterialIssueStatusUpdateResult> {
    const tenantId = requireTenantId();
    const response = await http.post<MaterialIssueStatusUpdateResult>(
      '/api/v1/inventory/material-issues/delete',
      { lineIds: payload.lineIds.map((id) => Number(id)) },
      { params: { tenantId } },
    );
    return response.data;
  },
};

export const materialInventoryReportService = {
  async getOverview(params: MaterialInventoryQueryParams = {}): Promise<MaterialInventoryAggregation> {
    const tenantId = requireTenantId();
    const response = await http.get<MaterialInventoryAggregation>(
      '/api/v1/inventory/materials/report/overview',
      { params: buildInventoryParams(tenantId, params) },
    );
    return response.data;
  },

  async getList(params: MaterialInventoryListParams): Promise<MaterialInventoryListResponse> {
    const tenantId = requireTenantId();
    const response = await http.get<MaterialInventoryListResponse>('/api/v1/inventory/materials/report', {
      params: {
        ...buildInventoryParams(tenantId, params),
        page: toBackendPage(params.page),
        size: params.pageSize,
      },
    });
    return response.data;
  },
};

export const materialPurchaseReportService = {
  async getMeta(): Promise<MaterialPurchaseReportMeta> {
    const tenantId = requireTenantId();
    const response = await http.get<MaterialPurchaseReportMeta>(
      '/api/v1/inventory/materials/purchase-report/meta',
      { params: { tenantId } },
    );
    return response.data;
  },

  async getList(
    params: MaterialPurchaseReportListParams,
  ): Promise<MaterialPurchaseReportListResponse> {
    const tenantId = requireTenantId();
    const response = await http.get<MaterialPurchaseReportListResponse>(
      '/api/v1/inventory/materials/purchase-report',
      {
        params: {
          tenantId,
          purchaseOrderNo: params.purchaseOrderNo,
          materialKeyword: params.materialKeyword,
          styleKeyword: params.styleKeyword,
          documentNo: params.documentNo,
          supplierId: params.supplierId ? Number(params.supplierId) : undefined,
          dateType: params.dateType,
          startDate: params.startDate,
          endDate: params.endDate,
          page: toBackendPage(params.page),
          size: params.pageSize,
        },
        skipPageNormalization: true,
      },
    );
    return response.data;
  },
};
