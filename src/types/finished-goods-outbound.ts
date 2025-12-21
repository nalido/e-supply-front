export type FinishedGoodsOutboundGrouping =
  | 'warehouse'
  | 'dispatch'
  | 'customer'
  | 'order'
  | 'color'
  | 'size'
  | 'style';

export type FinishedGoodsOutboundFilters = {
  groupBy: FinishedGoodsOutboundGrouping[];
  showCompletedOrders?: boolean;
  customerId?: string;
  warehouseId?: string;
  keyword?: string;
};

export type FinishedGoodsOutboundListParams = FinishedGoodsOutboundFilters & {
  page: number;
  pageSize: number;
};

export type FinishedGoodsOutboundWarehouse = {
  id: string;
  name: string;
};

export type FinishedGoodsOutboundCustomer = {
  id: string;
  name: string;
  tier?: 'A' | 'B' | 'C';
};

export type FinishedGoodsOutboundLogisticsProvider = {
  id: string;
  name: string;
  serviceLevel?: string;
};

export type FinishedGoodsOutboundMeta = {
  warehouses: FinishedGoodsOutboundWarehouse[];
  customers: FinishedGoodsOutboundCustomer[];
  logistics: FinishedGoodsOutboundLogisticsProvider[];
};

export type FinishedGoodsOutboundRecord = {
  id: string;
  dispatchId: string;
  dispatchNoteNo: string;
  dispatchDate: string;
  customerId: string;
  customerName: string;
  warehouseId: string;
  warehouseName: string;
  orderNo: string;
  styleNo: string;
  styleName: string;
  imageUrl?: string;
  color: string;
  size: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  logisticsProviderId?: string;
  logisticsProvider: string;
  trackingNumber: string;
  status: 'draft' | 'partial' | 'shipped' | 'cancelled';
};

export type FinishedGoodsOutboundListSummary = {
  quantity: number;
  amount: number;
};

export type FinishedGoodsOutboundListResponse = {
  list: FinishedGoodsOutboundRecord[];
  total: number;
  summary: FinishedGoodsOutboundListSummary;
};

export type FinishedGoodsDispatchLinePayload = {
  styleVariantId: string;
  quantity: number;
  unitPrice: number;
};

export type FinishedGoodsDispatchCreatePayload = {
  warehouseId: string;
  customerId?: string;
  productionOrderId?: string;
  logisticsProviderId?: string;
  dispatchAt?: string;
  trackingNo?: string;
  remark?: string;
  items: FinishedGoodsDispatchLinePayload[];
};

export type FinishedGoodsDispatchUpdatePayload = {
  status?: FinishedGoodsOutboundRecord['status'];
  logisticsProviderId?: string;
  trackingNo?: string;
  dispatchAt?: string;
  remark?: string;
};

export type FinishedGoodsDispatchSummary = {
  id: string;
  dispatchNo: string;
  status: string;
  statusLabel: string;
  statusTagColor: string;
  warehouseId: string;
  warehouseName: string;
};
