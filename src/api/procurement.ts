import type {
  StockingBatchReceivePayload,
  StockingPurchaseCreatePayload,
  StockingPurchaseListParams,
  StockingPurchaseListResponse,
  StockingPurchaseMeta,
  StockingStatusUpdatePayload,
  StockingPurchaseExportParams,
  ProcurementOrderSummary,
  StockingReceivePayload,
  ProcurementReceiptSummary,
  StockingReceiptRecord,
  StockingReceiptListResponse,
  StockingPurchaseOrderDetail,
} from '../types/stocking-purchase-inbound';
import http from './http';
import { requireTenantId, toBackendPage } from './request-context';

type BackendProcurementOrderSummary = {
  id: string;
  orderNo: string;
  status: string;
  statusLabel: string;
  statusTagColor: string;
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
    const response = await http.get<StockingPurchaseMeta>('/api/v1/procurement/stocking/meta');
    return response.data;
  },

  async getList(params: StockingPurchaseListParams): Promise<StockingPurchaseListResponse> {
    const tenantId = requireTenantId();
    const response = await http.get<StockingPurchaseListResponse>('/api/v1/procurement/stocking', {
      params: {
        tenantId,
        materialType: params.materialType,
        status: params.status,
        keyword: params.keyword,
        page: toBackendPage(params.page),
        size: params.pageSize,
      },
      skipPageNormalization: true,
    });
    return response.data;
  },

  async batchReceive(payload: StockingBatchReceivePayload): Promise<{ success: boolean }> {
    const tenantId = requireTenantId();
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
    const tenantId = requireTenantId();
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
    const tenantId = requireTenantId();
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

  async getOrderDetail(orderId: string): Promise<StockingPurchaseOrderDetail> {
    const tenantId = requireTenantId();
    const response = await http.get<StockingPurchaseOrderDetail>(`/api/v1/procurement/orders/${orderId}`, {
      params: { tenantId },
    });
    return response.data;
  },

  async createOrder(payload: StockingPurchaseCreatePayload): Promise<ProcurementOrderSummary> {
    const tenantId = requireTenantId();
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
          color: line.color,
          size: line.specification,
          unit: line.unit,
          unitPrice: line.unitPrice,
          remark: line.remark,
        })),
      },
      { params: { tenantId } },
    );
    return adaptOrderSummary(response.data);
  },

  async updateOrder(orderId: string, payload: StockingPurchaseCreatePayload): Promise<StockingPurchaseOrderDetail> {
    const tenantId = requireTenantId();
    const response = await http.post<StockingPurchaseOrderDetail>(
      `/api/v1/procurement/orders/${orderId}/update`,
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
          color: line.color,
          size: line.specification,
          unit: line.unit,
          unitPrice: line.unitPrice,
          remark: line.remark,
        })),
      },
      { params: { tenantId } },
    );
    return response.data;
  },

  async receive(
    orderId: string,
    payload: StockingReceivePayload,
  ): Promise<ProcurementReceiptSummary> {
    const tenantId = requireTenantId();
    const response = await http.post<ProcurementReceiptSummary>(
      `/api/v1/procurement/orders/${orderId}/receive`,
      {
        warehouseId: Number(payload.warehouseId),
        receivedAt: payload.receivedAt,
        handlerId: payload.handlerId ? Number(payload.handlerId) : undefined,
        remark: payload.remark,
        items: payload.items.map((item) => ({
          lineId: Number(item.lineId),
          receiveQty: item.receiveQty,
          batchNo: item.batchNo,
          remark: item.remark,
          warehouseId: item.warehouseId ? Number(item.warehouseId) : undefined,
          overReceiptReasonCode: item.overReceiptReasonCode,
          overReceiptReasonText: item.overReceiptReasonText,
        })),
      },
      { params: { tenantId } },
    );
    return response.data;
  },

  async getReceipts(params: { orderId: string; lineId?: string }): Promise<StockingReceiptRecord[]> {
    const tenantId = requireTenantId();
    const response = await http.get<StockingReceiptListResponse>(
      `/api/v1/procurement/stocking/orders/${params.orderId}/receipts`,
      {
        params: {
          tenantId,
          lineId: params.lineId,
        },
      },
    );
    return response.data.list;
  },
};
