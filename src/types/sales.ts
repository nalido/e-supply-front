export type SalesOrderStatus = 'PENDING' | 'PAID' | 'PROCESSING' | 'SHIPPED' | 'COMPLETED' | 'CANCELED';

export type SalesOrder = {
  id: number;
  tenantId: number;
  channelAccountId: number;
  shopId?: number;
  platformOrderId: string;
  orderNo?: string;
  status: SalesOrderStatus;
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
  createdAt?: string;
  updatedAt?: string;
};

export type SalesOrderLine = {
  id: number;
  salesOrderId: number;
  platformLineId: string;
  platformSku?: string;
  sku?: string;
  styleVariantId?: number;
  itemName?: string;
  quantity: number;
  unitPrice?: number;
  amount?: number;
  status: SalesOrderStatus;
  createdAt?: string;
  updatedAt?: string;
};

export type SalesOrderDetail = {
  order: SalesOrder;
  lines: SalesOrderLine[];
};

export type FulfillmentStatus = 'PENDING' | 'SHIPPED' | 'DELIVERED' | 'CANCELED';

export type SalesFulfillment = {
  id: number;
  tenantId: number;
  salesOrderId: number;
  fulfillmentNo: string;
  status: FulfillmentStatus;
  shippedAt?: string;
  carrier?: string;
  trackingNo?: string;
  warehouseId?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type SalesFulfillmentLine = {
  id: number;
  salesFulfillmentId: number;
  salesOrderLineId: number;
  quantity: number;
  createdAt?: string;
  updatedAt?: string;
};

export type SalesFulfillmentDetail = {
  fulfillment: SalesFulfillment;
  lines: SalesFulfillmentLine[];
};

export type PageResponse<T> = {
  items: T[];
  total: number;
  page: number;
  size: number;
};
