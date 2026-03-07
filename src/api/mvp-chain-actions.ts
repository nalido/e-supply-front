import http from './http';
import { tenantStore } from '../stores/tenant';

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

export type OutsourcingOrderCreatePayload = {
  workOrderId: number;
  subcontractorId: number;
  processCatalogId: number;
  dispatchQty: number;
  unitPrice: number;
  dispatchDate: string;
  expectedReturnDate?: string;
  attritionRate?: number;
  orderNo?: string;
};

export type OutsourcingOrderStatusUpdatePayload = {
  orderId: number;
  status: 'PENDING_DISPATCH' | 'DISPATCHED' | 'RECEIVED' | 'COMPLETED' | 'SETTLED' | 'CANCELLED';
};

export type OutsourcingMaterialRequestPayload = {
  orderId: number;
  materialId?: number;
  requestQuantity: number;
  requestedAt?: string;
  remark?: string;
};

export type PieceworkTicketCreatePayload = {
  workOrderId: number;
  processCatalogId: number;
  workerId: number;
  quantity: number;
  pieceRate: number;
  ticketNo?: string;
  recordedAt?: string;
  remark?: string;
};

export type PieceworkTicketStatusUpdatePayload = {
  ticketId: number;
  status: 'PENDING' | 'SETTLED' | 'VOID';
};

export type ProcurementOrderBasedCreatePayload = {
  supplierId: number;
  warehouseId: number;
  productionOrderId: number;
  orderDate: string;
  lines: Array<{
    materialId: number;
    orderQty: number;
    unit: string;
    unitPrice?: number;
  }>;
};

export type ProcurementReceivePayload = {
  orderId: number;
  warehouseId: number;
  items: Array<{
    lineId: number;
    receiveQty: number;
    warehouseId?: number;
  }>;
  receivedAt?: string;
  remark?: string;
};

export type FinishedGoodsReceiptCreatePayload = {
  productionOrderId: number;
  warehouseId: number;
  items: Array<{
    productionOrderLineId: number;
    styleVariantId: number;
    quantity: number;
    unitPrice?: number;
  }>;
  receiptDate?: string;
  remark?: string;
};

export const mvpChainActionsApi = {
  async createOutsourcingOrder(payload: OutsourcingOrderCreatePayload) {
    const tenantId = ensureTenantId();
    const { data } = await http.post(
      '/api/v1/outsourcing-orders',
      payload,
      { params: { tenantId } },
    );
    return data;
  },

  async updateOutsourcingOrderStatus(payload: OutsourcingOrderStatusUpdatePayload) {
    const tenantId = ensureTenantId();
    const { data } = await http.post(
      `/api/v1/outsourcing-orders/${payload.orderId}/update`,
      { status: payload.status },
      { params: { tenantId } },
    );
    return data;
  },

  async createOutsourcingMaterialRequest(payload: OutsourcingMaterialRequestPayload) {
    const tenantId = ensureTenantId();
    const { data } = await http.post(
      `/api/v1/outsourcing-orders/${payload.orderId}/material-requests`,
      {
        materialId: payload.materialId,
        requestQuantity: payload.requestQuantity,
        requestedAt: payload.requestedAt,
        remark: payload.remark,
      },
      { params: { tenantId } },
    );
    return data;
  },

  async createPieceworkTicket(payload: PieceworkTicketCreatePayload) {
    const tenantId = ensureTenantId();
    const { data } = await http.post(
      '/api/v1/piecework-tickets',
      payload,
      { params: { tenantId } },
    );
    return data;
  },

  async updatePieceworkTicketStatus(payload: PieceworkTicketStatusUpdatePayload) {
    const tenantId = ensureTenantId();
    const { data } = await http.post(
      `/api/v1/piecework-tickets/${payload.ticketId}/update`,
      { status: payload.status },
      { params: { tenantId } },
    );
    return data;
  },

  async createOrderBasedProcurement(payload: ProcurementOrderBasedCreatePayload) {
    const tenantId = ensureTenantId();
    const { data } = await http.post(
      '/api/v1/procurement/orders',
      {
        type: 'ORDER_BASED',
        supplierId: payload.supplierId,
        warehouseId: payload.warehouseId,
        productionOrderId: payload.productionOrderId,
        orderDate: payload.orderDate,
        lines: payload.lines,
      },
      { params: { tenantId } },
    );
    return data;
  },

  async receiveProcurementOrder(payload: ProcurementReceivePayload) {
    const tenantId = ensureTenantId();
    const { data } = await http.post(
      `/api/v1/procurement/orders/${payload.orderId}/receive`,
      {
        warehouseId: payload.warehouseId,
        items: payload.items,
        receivedAt: payload.receivedAt,
        remark: payload.remark,
      },
      { params: { tenantId } },
    );
    return data;
  },

  async createFinishedGoodsReceipt(payload: FinishedGoodsReceiptCreatePayload) {
    const tenantId = ensureTenantId();
    const { data } = await http.post(
      '/api/v1/finished-goods/receipts',
      {
        sourceType: 'PRODUCTION',
        productionOrderId: payload.productionOrderId,
        warehouseId: payload.warehouseId,
        receiptDate: payload.receiptDate,
        remark: payload.remark,
        items: payload.items,
      },
      { params: { tenantId } },
    );
    return data;
  },
};
