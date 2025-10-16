import type {
  IncomingOrder,
  IncomingOrderListParams,
  IncomingOrderShipmentPayload,
  IncomingOrderStatus,
  OutsourceOrder,
  OutsourceOrderListParams,
  OutsourceOrderStatus,
  OutsourceReceiptPayload,
  OutsourceMaterialRequestPayload,
} from '../types';
import type { Paginated } from './mock';
import {
  acceptIncomingOrder,
  confirmOutsourceReceipt,
  listIncomingOrderClients,
  listIncomingOrders,
  listOutsourceOrders,
  rejectIncomingOrder,
  requestOutsourceMaterial,
  setIncomingOrdersStatus,
  setOutsourceOrdersStatus,
  shipIncomingOrder,
} from '../mock/collaboration';

export const collaborationApi = {
  listIncomingOrders: (params: IncomingOrderListParams): Promise<Paginated<IncomingOrder>> =>
    listIncomingOrders(params),
  acceptIncomingOrder: (orderId: string): Promise<IncomingOrder | undefined> =>
    acceptIncomingOrder(orderId),
  rejectIncomingOrder: (orderId: string, reason?: string): Promise<IncomingOrder | undefined> =>
    rejectIncomingOrder(orderId, reason),
  bulkUpdateStatus: (orderIds: string[], status: IncomingOrderStatus): Promise<IncomingOrder[]> =>
    setIncomingOrdersStatus(orderIds, status),
  shipOrder: (orderId: string, payload: IncomingOrderShipmentPayload): Promise<IncomingOrder | undefined> =>
    shipIncomingOrder(orderId, payload),
  listClients: (): Promise<string[]> => listIncomingOrderClients(),
  listOutsourceOrders: (params: OutsourceOrderListParams): Promise<Paginated<OutsourceOrder>> =>
    listOutsourceOrders(params),
  confirmOutsourceReceipt: (orderIds: string[], payload: OutsourceReceiptPayload): Promise<OutsourceOrder[]> =>
    confirmOutsourceReceipt(orderIds, payload),
  requestOutsourceMaterial: (
    orderId: string,
    payload: OutsourceMaterialRequestPayload,
  ): Promise<OutsourceOrder | undefined> => requestOutsourceMaterial(orderId, payload),
  setOutsourceStatus: (
    orderIds: string[],
    status: OutsourceOrderStatus,
  ): Promise<OutsourceOrder[]> => setOutsourceOrdersStatus(orderIds, status),
};

export default collaborationApi;
