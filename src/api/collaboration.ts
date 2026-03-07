import type {
  IncomingOrder,
  IncomingOrderListParams,
  IncomingOrderShipmentPayload,
  IncomingOrderStatus,
  OutsourceMaterialRequestPayload,
  OutsourceOrder,
  OutsourceOrderListParams,
  OutsourceOrderStatus,
  OutsourceReceiptPayload,
} from '../types';
import type { Paginated } from '../types/pagination';
import http from './http';
import { tenantStore } from '../stores/tenant';

type BackendIncomingOrder = {
  id: string;
  orderNo: string;
  clientName: string;
  styleCode: string;
  styleName: string;
  styleImage?: string | null;
  status: string;
  dispatchDate?: string | null;
  deliveryDate?: string | null;
  shippedQuantity: number;
  totalQuantity: number;
  receiptConfirmed: boolean;
  defects: number;
  memo?: string | null;
  logisticsCompany?: string | null;
  trackingNo?: string | null;
  shipmentRemark?: string | null;
  shipmentAt?: string | null;
};

type BackendIncomingOrderListResponse = {
  list: BackendIncomingOrder[];
  total: number;
};

type BackendOutsourceOrder = {
  id: string;
  orderNo: string;
  partnerName: string;
  styleCode: string;
  styleName: string;
  styleImage?: string | null;
  status: string;
  shipDate?: string | null;
  expectedReturnDate?: string | null;
  receivedQuantity: number;
  totalQuantity: number;
  defects: number;
  materialPending?: boolean;
  remark?: string | null;
};

type BackendOutsourceOrderListResponse = {
  list: BackendOutsourceOrder[];
  total: number;
};

type OperationResponse = {
  affected: number;
};

const ensureTenantId = (): string => {
  const tenantId = tenantStore.getTenantId();
  if (!tenantId) {
    throw new Error('未找到企业信息，请重新登录后再试');
  }
  return tenantId;
};

const toBackendPage = (page?: number): number => {
  if (!page || Number.isNaN(page)) {
    return 0;
  }
  return Math.max(page - 1, 0);
};

const incomingStatusToBackend: Record<IncomingOrderStatus, string> = {
  待接单: 'WAITING_ACCEPTANCE',
  生产中: 'IN_PRODUCTION',
  待发货: 'WAITING_SHIPMENT',
  已完结: 'COMPLETED',
  已拒绝: 'REJECTED',
};

const incomingStatusFromBackend: Record<string, IncomingOrderStatus> = {
  WAITING_ACCEPTANCE: '待接单',
  IN_PRODUCTION: '生产中',
  WAITING_SHIPMENT: '待发货',
  COMPLETED: '已完结',
  REJECTED: '已拒绝',
};

const outsourceStatusToBackend: Record<OutsourceOrderStatus, string> = {
  待发出: 'PENDING_DISPATCH',
  已完结: 'COMPLETED',
  已取消: 'CANCELLED',
};

const outsourceStatusFromBackend: Record<string, OutsourceOrderStatus> = {
  PENDING_DISPATCH: '待发出',
  COMPLETED: '已完结',
  SETTLED: '已完结',
  CANCELLED: '已取消',
};

const toBackendIncomingStatus = (status?: IncomingOrderStatus) =>
  status ? incomingStatusToBackend[status] ?? status : undefined;

const fromBackendIncomingStatus = (status?: string): IncomingOrderStatus => {
  if (!status) {
    return '待接单';
  }
  return incomingStatusFromBackend[status] ?? (status as unknown as IncomingOrderStatus);
};

const toBackendOutsourceStatus = (status?: OutsourceOrderStatus) =>
  status ? outsourceStatusToBackend[status] ?? status : undefined;

const fromBackendOutsourceStatus = (status?: string): OutsourceOrderStatus => {
  if (!status) {
    return '已完结';
  }
  return outsourceStatusFromBackend[status] ?? (status as unknown as OutsourceOrderStatus);
};

const adaptIncomingOrder = (item: BackendIncomingOrder): IncomingOrder => ({
  id: item.id,
  orderNo: item.orderNo,
  clientName: item.clientName,
  styleCode: item.styleCode,
  styleName: item.styleName,
  styleImage: item.styleImage ?? '',
  status: fromBackendIncomingStatus(item.status),
  dispatchDate: item.dispatchDate ?? '',
  deliveryDate: item.deliveryDate ?? '',
  shippedQuantity: item.shippedQuantity,
  totalQuantity: item.totalQuantity,
  receiptConfirmed: item.receiptConfirmed,
  defects: item.defects,
  memo: item.memo ?? undefined,
});

const adaptOutsourceOrder = (item: BackendOutsourceOrder): OutsourceOrder => ({
  id: item.id,
  orderNo: item.orderNo,
  partnerName: item.partnerName,
  styleCode: item.styleCode,
  styleName: item.styleName,
  styleImage: item.styleImage ?? '',
  status: fromBackendOutsourceStatus(item.status),
  shipDate: item.shipDate ?? '',
  expectedReturnDate: item.expectedReturnDate ?? '',
  receivedQuantity: item.receivedQuantity,
  totalQuantity: item.totalQuantity,
  defects: item.defects,
  materialPending: item.materialPending,
  remark: item.remark ?? undefined,
});

const confirmOutsourceReceiptRequest = (
  tenantId: string,
  orderIds: string[],
  payload: OutsourceReceiptPayload,
) =>
  http.post<OperationResponse>(
    '/api/v1/collaboration/outsource-orders/receipts',
    {
      orderIds,
      receivedQuantity: payload.receivedQuantity,
      defectQuantity: payload.defectQuantity,
      remark: payload.remark,
    },
    { params: { tenantId } },
  );

const setOutsourceStatusRequest = (
  tenantId: string,
  orderIds: string[],
  status: string,
) =>
  http.post<OperationResponse>(
    '/api/v1/collaboration/outsource-orders/status',
    { orderIds, status },
    { params: { tenantId } },
  );

const requestOutsourceMaterialRequest = (
  tenantId: string,
  orderId: string,
  payload: OutsourceMaterialRequestPayload,
) =>
  http.post<OperationResponse>(
    `/api/v1/collaboration/outsource-orders/${orderId}/material-request`,
    {
      requestQuantity: payload.requestQuantity,
      materialRemark: payload.materialRemark,
    },
    { params: { tenantId } },
  );

const acceptIncomingOrderRequest = (tenantId: string, orderId: string) =>
  http.post<OperationResponse>(
    `/api/v1/collaboration/incoming-orders/${orderId}/accept`,
    undefined,
    { params: { tenantId } },
  );

const rejectIncomingOrderRequest = (
  tenantId: string,
  orderId: string,
  reason?: string,
) =>
  http.post<OperationResponse>(
    `/api/v1/collaboration/incoming-orders/${orderId}/reject`,
    { reason },
    { params: { tenantId } },
  );

const shipIncomingOrderRequest = (
  tenantId: string,
  orderId: string,
  payload: IncomingOrderShipmentPayload,
) =>
  http.post<OperationResponse>(
    `/api/v1/collaboration/incoming-orders/${orderId}/ship`,
    payload,
    { params: { tenantId } },
  );

const bulkIncomingStatusRequest = (
  tenantId: string,
  orderIds: string[],
  status: string,
) =>
  http.post<OperationResponse>(
    '/api/v1/collaboration/incoming-orders/status',
    { orderIds, status },
    { params: { tenantId } },
  );

export const collaborationApi = {
  listIncomingOrders: async (params: IncomingOrderListParams): Promise<Paginated<IncomingOrder>> => {
    const tenantId = ensureTenantId();
    const response = await http.get<BackendIncomingOrderListResponse>(
      '/api/v1/collaboration/incoming-orders',
      {
        params: {
          tenantId,
          status: toBackendIncomingStatus(params.status),
          clientName: params.clientName,
          keyword: params.keyword?.trim(),
          page: toBackendPage(params.page),
          size: params.pageSize ?? 10,
        },
      },
    );
    return {
      list: response.data.list.map(adaptIncomingOrder),
      total: response.data.total,
    };
  },
  acceptIncomingOrder: async (orderId: string): Promise<void> => {
    const tenantId = ensureTenantId();
    await acceptIncomingOrderRequest(tenantId, orderId);
  },
  rejectIncomingOrder: async (orderId: string, reason?: string): Promise<void> => {
    const tenantId = ensureTenantId();
    await rejectIncomingOrderRequest(tenantId, orderId, reason);
  },
  bulkUpdateStatus: async (orderIds: string[], status: IncomingOrderStatus): Promise<void> => {
    const tenantId = ensureTenantId();
    await bulkIncomingStatusRequest(tenantId, orderIds, toBackendIncomingStatus(status) as string);
  },
  shipOrder: async (orderId: string, payload: IncomingOrderShipmentPayload): Promise<void> => {
    const tenantId = ensureTenantId();
    await shipIncomingOrderRequest(tenantId, orderId, payload);
  },
  listClients: async (): Promise<string[]> => {
    const tenantId = ensureTenantId();
    const response = await http.get<string[]>(
      '/api/v1/collaboration/incoming-orders/clients',
      { params: { tenantId } },
    );
    return response.data;
  },
  listOutsourceOrders: async (params: OutsourceOrderListParams): Promise<Paginated<OutsourceOrder>> => {
    const tenantId = ensureTenantId();
    const response = await http.get<BackendOutsourceOrderListResponse>(
      '/api/v1/collaboration/outsource-orders',
      {
        params: {
          tenantId,
          status: params.status && params.status !== '全部' ? toBackendOutsourceStatus(params.status) : undefined,
          keyword: params.keyword?.trim(),
          page: toBackendPage(params.page),
          size: params.pageSize ?? 10,
        },
      },
    );
    return {
      list: response.data.list.map(adaptOutsourceOrder),
      total: response.data.total,
    };
  },
  confirmOutsourceReceipt: async (orderIds: string[], payload: OutsourceReceiptPayload): Promise<void> => {
    const tenantId = ensureTenantId();
    await confirmOutsourceReceiptRequest(tenantId, orderIds, payload);
  },
  requestOutsourceMaterial: async (
    orderId: string,
    payload: OutsourceMaterialRequestPayload,
  ): Promise<void> => {
    const tenantId = ensureTenantId();
    await requestOutsourceMaterialRequest(tenantId, orderId, payload);
  },
  setOutsourceStatus: async (
    orderIds: string[],
    status: OutsourceOrderStatus,
  ): Promise<void> => {
    const tenantId = ensureTenantId();
    await setOutsourceStatusRequest(tenantId, orderIds, toBackendOutsourceStatus(status) as string);
  },
};

export default collaborationApi;
