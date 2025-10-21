export type OrderPurchaseInboundMaterialType = 'fabric' | 'accessory';

export type OrderPurchaseInboundStatus =
  | 'pending'
  | 'partial'
  | 'completed'
  | 'forceCompleted'
  | 'void';

export type OrderPurchaseInboundStatusFilter =
  | 'unfinished'
  | 'completed'
  | 'forceCompleted'
  | 'void';

export type OrderPurchaseInboundStatusOption = {
  value: OrderPurchaseInboundStatusFilter;
  label: string;
};

export type OrderPurchaseInboundRecord = {
  id: string;
  materialType: OrderPurchaseInboundMaterialType;
  imageUrl?: string;
  status: OrderPurchaseInboundStatus;
  statusLabel: string;
  statusTagColor: string;
  purchaseOrderNo: string;
  materialName: string;
  materialCategory: string;
  color?: string;
  width?: string;
  weight?: string;
  purchaseTime: string;
  supplierName: string;
  supplierModel?: string;
  unitPrice?: number;
  orderQty: number;
  unit: string;
  packagingInfo?: string;
  pendingQty: number;
  receivedQty: number;
  documentType: string;
  factoryOrderNo: string;
  factoryOrderName: string;
  styleNo?: string;
  styleName?: string;
  remark?: string;
  lastReceiveTime?: string;
};

export type OrderPurchaseInboundListSummary = {
  orderQty: number;
  receivedQty: number;
  pendingQty: number;
};

export type OrderPurchaseInboundListParams = {
  page: number;
  pageSize: number;
  materialType: OrderPurchaseInboundMaterialType;
  statusFilter?: OrderPurchaseInboundStatusFilter;
  keyword?: string;
  hideZero?: boolean;
};

export type OrderPurchaseInboundListResponse = {
  list: OrderPurchaseInboundRecord[];
  total: number;
  summary: OrderPurchaseInboundListSummary;
};

export type OrderPurchaseInboundMeta = {
  statusOptions: OrderPurchaseInboundStatusOption[];
  defaultStatus: OrderPurchaseInboundStatusFilter;
  materialTypeTabs: { value: OrderPurchaseInboundMaterialType; label: string }[];
};

export type OrderPurchaseInboundReceiveItem = {
  id: string;
  receiveQty: number;
  warehouseId?: string;
  remark?: string;
};

export type OrderPurchaseInboundReceivePayload = {
  receiveDate: string;
  handler?: string;
  items: OrderPurchaseInboundReceiveItem[];
};

export type OrderPurchaseInboundStatusPayload = {
  ids: string[];
  nextStatus: Extract<OrderPurchaseInboundStatus, 'forceCompleted' | 'void'>;
  reason?: string;
};

export type OrderPurchaseInboundExportParams = OrderPurchaseInboundListParams;
