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
} from '../types/material-stock';
import { apiConfig } from './config';
import http from './http';
import { tenantStore } from '../stores/tenant';
import {
  materialStockService as mockMaterialStockService,
  materialIssueService as mockMaterialIssueService,
  materialInventoryReportService as mockInventoryReportService,
  materialPurchaseReportService as mockPurchaseReportService,
} from './mock';

const useMock = apiConfig.useMock;

const ensureTenantId = (): string => {
  const tenantId = tenantStore.getTenantId();
  if (!tenantId) {
    throw new Error('未找到企业信息，请重新选择');
  }
  return tenantId;
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
    if (useMock) {
      return mockMaterialStockService.getMeta();
    }
    const tenantId = ensureTenantId();
    const response = await http.get<MaterialStockMeta>('/api/v1/inventory/materials/meta', {
      params: { tenantId },
    });
    return response.data;
  },

  async getList(params: MaterialStockListParams): Promise<MaterialStockListResponse> {
    if (useMock) {
      return mockMaterialStockService.getList(params);
    }
    const tenantId = ensureTenantId();
    const response = await http.get<MaterialStockListResponse>('/api/v1/inventory/materials', {
      params: {
        tenantId,
        materialType: params.materialType,
        onlyInStock: params.onlyInStock,
        keywordRemark: params.keywordRemark,
        keywordOrderStyle: params.keywordOrderStyle,
        page: params.page,
        size: params.pageSize,
      },
    });
    return response.data;
  },

  async getMovements(
    params: MaterialMovementListParams,
  ): Promise<MaterialMovementListResponse> {
    if (useMock) {
      return mockMaterialStockService.getMovements(params);
    }
    const tenantId = ensureTenantId();
    const response = await http.get<MaterialMovementListResponse>(
      `/api/v1/inventory/materials/${params.materialId}/movements`,
      {
        params: {
          tenantId,
          warehouseId: params.warehouseId,
          startDate: params.startDate,
          endDate: params.endDate,
          page: params.page,
          size: params.pageSize,
        },
      },
    );
    return response.data;
  },
};

export const materialIssueService = {
  async getMeta(): Promise<MaterialIssueMeta> {
    if (useMock) {
      return mockMaterialIssueService.getMeta();
    }
    const response = await http.get<MaterialIssueMeta>('/api/v1/inventory/material-issues/meta');
    return response.data;
  },

  async getList(params: MaterialIssueListParams): Promise<MaterialIssueListResponse> {
    if (useMock) {
      return mockMaterialIssueService.getList(params);
    }
    const tenantId = ensureTenantId();
    const response = await http.get<MaterialIssueListResponse>('/api/v1/inventory/material-issues', {
      params: {
        tenantId,
        materialType: params.materialType,
        keyword: params.keyword,
        page: params.page,
        size: params.pageSize,
      },
    });
    return response.data;
  },

  async createIssue(payload: MaterialIssueCreatePayload): Promise<MaterialIssueCreateResponse> {
    if (useMock) {
      return mockMaterialIssueService.createIssue(payload);
    }
    const tenantId = ensureTenantId();
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
        })),
      },
      { params: { tenantId } },
    );
    return response.data;
  },

  async updateStatus(
    payload: MaterialIssueStatusUpdatePayload,
  ): Promise<MaterialIssueStatusUpdateResult> {
    if (useMock) {
      return mockMaterialIssueService.updateStatus(payload);
    }
    const tenantId = ensureTenantId();
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
};

export const materialInventoryReportService = {
  async getOverview(params: MaterialInventoryQueryParams = {}): Promise<MaterialInventoryAggregation> {
    if (useMock) {
      return mockInventoryReportService.getOverview(params);
    }
    const tenantId = ensureTenantId();
    const response = await http.get<MaterialInventoryAggregation>(
      '/api/v1/inventory/materials/report/overview',
      { params: buildInventoryParams(tenantId, params) },
    );
    return response.data;
  },

  async getList(params: MaterialInventoryListParams): Promise<MaterialInventoryListResponse> {
    if (useMock) {
      return mockInventoryReportService.getList(params);
    }
    const tenantId = ensureTenantId();
    const response = await http.get<MaterialInventoryListResponse>('/api/v1/inventory/materials/report', {
      params: {
        ...buildInventoryParams(tenantId, params),
        page: params.page,
        size: params.pageSize,
      },
    });
    return response.data;
  },
};

export const materialPurchaseReportService = {
  async getMeta(): Promise<MaterialPurchaseReportMeta> {
    if (useMock) {
      return mockPurchaseReportService.getMeta();
    }
    const tenantId = ensureTenantId();
    const response = await http.get<MaterialPurchaseReportMeta>(
      '/api/v1/inventory/materials/purchase-report/meta',
      { params: { tenantId } },
    );
    return response.data;
  },

  async getList(
    params: MaterialPurchaseReportListParams,
  ): Promise<MaterialPurchaseReportListResponse> {
    if (useMock) {
      return mockPurchaseReportService.getList(params);
    }
    const tenantId = ensureTenantId();
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
          page: params.page,
          size: params.pageSize,
        },
      },
    );
    return response.data;
  },
};
