import type {
  StockingBatchReceivePayload,
  StockingPurchaseCreatePayload,
  StockingPurchaseListParams,
  StockingPurchaseListResponse,
  StockingPurchaseMeta,
  StockingStatusUpdatePayload,
  StockingPurchaseExportParams,
  ProcurementOrderSummary,
} from '../types/stocking-purchase-inbound';
import { apiConfig } from './config';
import http from './http';
import { tenantStore } from '../stores/tenant';
import { stockingPurchaseInboundService as mockStockingService } from './mock';

const useMock = apiConfig.useMock;

type BackendProcurementOrderSummary = {
  id: string;
  orderNo: string;
  status: string;
  statusLabel: string;
  statusTagColor: string;
};

const ensureTenantId = (): string => {
  const tenantId = tenantStore.getTenantId();
  if (!tenantId) {
    throw new Error('未找到企业信息，请重新选择');
  }
  return tenantId;
};

const adaptOrderSummary = (data: BackendProcurementOrderSummary): ProcurementOrderSummary => ({
  id: data.id,
  orderNo: data.orderNo,
  status: data.status,
  statusLabel: data.statusLabel,
  statusTagColor: data.statusTagColor,
});

export const stockingPurchaseInboundService = {
  async getMeta(): Promise<StockingPurchaseMeta> {
    if (useMock) {
      return mockStockingService.getMeta();
    }
    const response = await http.get<StockingPurchaseMeta>('/api/v1/procurement/stocking/meta');
    return response.data;
  },

  async getList(params: StockingPurchaseListParams): Promise<StockingPurchaseListResponse> {
    if (useMock) {
      return mockStockingService.getList(params);
    }
    const tenantId = ensureTenantId();
    const response = await http.get<StockingPurchaseListResponse>('/api/v1/procurement/stocking', {
      params: {
        tenantId,
        materialType: params.materialType,
        status: params.status,
        keyword: params.keyword,
        page: params.page,
        size: params.pageSize,
      },
    });
    return response.data;
  },

  async batchReceive(payload: StockingBatchReceivePayload): Promise<{ success: boolean }> {
    if (useMock) {
      return mockStockingService.batchReceive(payload);
    }
    const tenantId = ensureTenantId();
    const orderIds = payload.orderIds
      .map((id) => Number(id))
      .filter((value) => !Number.isNaN(value));
    const response = await http.post<{ success: boolean; processedCount?: number }>(
      '/api/v1/procurement/stocking/receive',
      { orderIds },
      { params: { tenantId } },
    );
    return response.data;
  },

  async setStatus(payload: StockingStatusUpdatePayload): Promise<{ success: boolean }> {
    if (useMock) {
      return mockStockingService.setStatus(payload);
    }
    const tenantId = ensureTenantId();
    const orderIds = payload.orderIds
      .map((id) => Number(id))
      .filter((value) => !Number.isNaN(value));
    const response = await http.post<{ success: boolean }>(
      '/api/v1/procurement/stocking/status/update',
      {
        orderIds,
        status: payload.status,
      },
      { params: { tenantId } },
    );
    return response.data;
  },

  async export(params: StockingPurchaseExportParams): Promise<{ fileUrl: string }> {
    if (useMock) {
      return mockStockingService.export(params);
    }
    const tenantId = ensureTenantId();
    const response = await http.post<{ fileUrl: string }>(
      '/api/v1/procurement/stocking/export',
      {
        materialType: params.materialType,
        status: params.status,
        keyword: params.keyword,
      },
      { params: { tenantId } },
    );
    return response.data;
  },

  async createOrder(payload: StockingPurchaseCreatePayload): Promise<ProcurementOrderSummary> {
    if (useMock) {
      return mockStockingService.createOrder(payload);
    }
    const tenantId = ensureTenantId();
    const response = await http.post<BackendProcurementOrderSummary>(
      '/api/v1/procurement/orders',
      {
        type: 'STOCKING',
        supplierId: Number(payload.supplierId),
        warehouseId: Number(payload.warehouseId),
        orderDate: payload.orderDate,
        expectedArrival: payload.expectedArrival,
        remarks: payload.remark,
        lines: payload.lines.map((line) => ({
          materialId: Number(line.materialId),
          orderQty: line.quantity,
          unit: line.unit,
        })),
      },
      { params: { tenantId } },
    );
    return adaptOrderSummary(response.data);
  },
};
