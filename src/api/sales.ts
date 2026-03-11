import http from './http';
import type {
  SalesOrder,
  SalesOrderDetail,
  SalesOrderStatus,
  SalesFulfillment,
  SalesFulfillmentDetail,
  FulfillmentStatus,
  PageResponse,
} from '../types/sales';

export type SalesOrderQuery = {
  tenantId: number;
  channelAccountId?: number;
  shopId?: number;
  status?: SalesOrderStatus;
  keyword?: string;
  page?: number;
  size?: number;
};

export const fetchSalesOrders = async (params: SalesOrderQuery) => {
  const { data } = await http.get<PageResponse<SalesOrder>>('/api/v1/sales/orders', { params });
  return data;
};

export const fetchSalesOrderDetail = async (orderId: number, tenantId: number) => {
  const { data } = await http.get<SalesOrderDetail>(`/api/v1/sales/orders/${orderId}`, {
    params: { tenantId },
  });
  return data;
};

export const createSalesOrder = async (payload: {
  tenantId: number;
  channelAccountId: number;
  shopId?: number;
  platformOrderId: string;
  orderNo?: string;
  status?: SalesOrderStatus;
  currency?: string;
  totalAmount?: number;
  itemAmount?: number;
  shippingAmount?: number;
  discountAmount?: number;
  buyerName?: string;
  buyerEmail?: string;
  buyerPhone?: string;
  buyerNote?: string;
  orderCreatedAt?: string;
  paidAt?: string;
  lines?: Array<{
    platformLineId: string;
    platformSku?: string;
    sku?: string;
    styleVariantId?: number;
    itemName?: string;
    quantity: number;
    unitPrice?: number;
    amount?: number;
    status?: SalesOrderStatus;
  }>;
}) => {
  const { data } = await http.post<SalesOrder>('/api/v1/sales/orders', payload);
  return data;
};

export const updateSalesOrder = async (orderId: number, payload: {
  tenantId: number;
  status?: SalesOrderStatus;
  orderNo?: string;
  currency?: string;
  totalAmount?: number;
  itemAmount?: number;
  shippingAmount?: number;
  discountAmount?: number;
  buyerName?: string;
  buyerEmail?: string;
  buyerPhone?: string;
  buyerNote?: string;
  orderCreatedAt?: string;
  paidAt?: string;
}) => {
  const { data } = await http.post<SalesOrder>(`/api/v1/sales/orders/${orderId}/update`, payload);
  return data;
};

export const deleteSalesOrder = async (orderId: number, tenantId: number) => {
  await http.post(`/api/v1/sales/orders/${orderId}/delete`, null, { params: { tenantId } });
};

export type FulfillmentQuery = {
  tenantId: number;
  salesOrderId?: number;
  status?: FulfillmentStatus;
  page?: number;
  size?: number;
};

export const fetchFulfillments = async (params: FulfillmentQuery) => {
  const { data } = await http.get<PageResponse<SalesFulfillment>>('/api/v1/sales/fulfillments', { params });
  return data;
};

export const fetchFulfillmentDetail = async (fulfillmentId: number, tenantId: number) => {
  const { data } = await http.get<SalesFulfillmentDetail>(`/api/v1/sales/fulfillments/${fulfillmentId}`, {
    params: { tenantId },
  });
  return data;
};

export const createFulfillment = async (payload: {
  tenantId: number;
  salesOrderId: number;
  fulfillmentNo: string;
  status?: FulfillmentStatus;
  shippedAt?: string;
  carrier?: string;
  trackingNo?: string;
  warehouseId?: number;
  lines?: Array<{ salesOrderLineId: number; quantity: number }>;
}) => {
  const { data } = await http.post<SalesFulfillment>('/api/v1/sales/fulfillments', payload);
  return data;
};

export const updateFulfillment = async (fulfillmentId: number, payload: {
  tenantId: number;
  status?: FulfillmentStatus;
  shippedAt?: string;
  carrier?: string;
  trackingNo?: string;
  warehouseId?: number;
}) => {
  const { data } = await http.post<SalesFulfillment>(
    `/api/v1/sales/fulfillments/${fulfillmentId}/update`,
    payload,
  );
  return data;
};

export const deleteFulfillment = async (fulfillmentId: number, tenantId: number) => {
  await http.post(`/api/v1/sales/fulfillments/${fulfillmentId}/delete`, null, { params: { tenantId } });
};
