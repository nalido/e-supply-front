export type StockingMaterialType = 'fabric' | 'accessory';

export type StockingPurchaseStatus = 'pending' | 'partial' | 'completed' | 'void';

export type StockingPurchaseEditableScope = 'full' | 'remark_only';

export type StockingPurchaseStatusFilter = 'pending' | 'completed' | 'void' | 'all';

export type StockingPurchaseStatusOption = {
  value: StockingPurchaseStatusFilter;
  label: string;
};

export type StockingPurchaseRecord = {
  id: string;
  orderId: string;
  warehouseId?: string;
  warehouseName?: string;
  materialType: StockingMaterialType;
  imageUrl?: string;
  status: StockingPurchaseStatus;
  statusLabel: string;
  statusTagColor: string;
  purchaseOrderNo: string;
  materialName: string;
  materialCategory?: string;
  color?: string;
  specification?: string;
  width?: string;
  weight?: string;
  purchaseDate: string;
  supplierName: string;
  supplierModel?: string;
  supplierColorNo?: string;
  tolerance?: string;
  unitPrice?: number;
  unit: string;
  orderQty: number;
  orderAmount: number;
  packagingInfo?: string;
  pendingQty: number;
  receivedQty: number;
  actualReceivedQty?: number;
  withinPlanReceivedQty?: number;
  overReceivedQty?: number;
  planPendingReceiveQty?: number;
  remark?: string;
};

export type StockingPurchaseListParams = {
  page: number;
  pageSize: number;
  materialType: StockingMaterialType;
  status?: StockingPurchaseStatusFilter;
  keyword?: string;
};

export type StockingPurchaseListResponse = {
  list: StockingPurchaseRecord[];
  total: number;
};

export type StockingPurchaseMeta = {
  materialTypeTabs: { value: StockingMaterialType; label: string }[];
  statusOptions: StockingPurchaseStatusOption[];
  defaultStatus: StockingPurchaseStatusFilter;
};

export type StockingBatchReceivePayload = {
  orderIds: string[];
};

export type StockingStatusUpdatePayload = {
  orderIds: string[];
  status: Extract<StockingPurchaseStatus, 'completed' | 'void'>;
};

export type StockingPurchaseExportParams = StockingPurchaseListParams;

export type StockingPurchaseCreateLine = {
  materialId: string;
  quantity: number;
  unit: string;
  unitPrice?: number;
  color?: string;
  specification?: string;
  remark?: string;
};

export type StockingPurchaseCreatePayload = {
  supplierId: string;
  warehouseId: string;
  orderDate: string;
  expectedArrival?: string;
  remark?: string;
  lines: StockingPurchaseCreateLine[];
};

export type ProcurementOrderSummary = {
  id: string;
  orderNo: string;
  status: string;
  statusLabel: string;
  statusTagColor: string;
};

export type StockingPurchaseOrderLineDetail = {
  lineId: string;
  materialId: string;
  materialCode?: string;
  materialName: string;
  unit: string;
  quantity: number;
  unitPrice?: number;
  color?: string;
  specification?: string;
  remark?: string;
};

export type StockingPurchaseOrderDetail = {
  id: string;
  orderNo: string;
  status: string;
  statusLabel: string;
  statusTagColor: string;
  materialType?: StockingMaterialType;
  supplierId?: string;
  supplierName?: string;
  warehouseId?: string;
  warehouseName?: string;
  orderDate?: string;
  expectedArrival?: string;
  remark?: string;
  editableScope: StockingPurchaseEditableScope;
  lines: StockingPurchaseOrderLineDetail[];
};

export type ProcurementReceiptSummary = {
  id: string;
  receiptNo: string;
  receiptStatus: string;
  receiptStatusLabel: string;
  receiptStatusTagColor: string;
  orderId: string;
  orderStatus: string;
  orderStatusLabel: string;
  orderStatusTagColor: string;
};

export type StockingReceiveItemPayload = {
  lineId: string;
  receiveQty: number;
  batchNo?: string;
  remark?: string;
  warehouseId?: string;
  overReceiptReasonCode?: string;
  overReceiptReasonText?: string;
};

export type StockingReceivePayload = {
  warehouseId: string;
  receivedAt?: string;
  remark?: string;
  handlerId?: string;
  items: StockingReceiveItemPayload[];
};

export type StockingReceiptRecord = {
  id: string;
  lineId: string;
  receiptNo: string;
  status: string;
  statusLabel: string;
  statusTagColor: string;
  receivedAt?: string;
  warehouseName?: string;
  receivedQty: number;
  pendingQty: number;
  unit?: string;
  batchNo?: string;
  remark?: string;
  planQty?: number;
  actualReceivedQty?: number;
  withinPlanReceivedQty?: number;
  overReceivedQty?: number;
  planPendingReceiveQty?: number;
  isOverReceipt?: boolean;
  overReceiptQty?: number;
  overReceiptReasonCode?: string;
  overReceiptReasonText?: string;
};

export type StockingReceiptListResponse = {
  list: StockingReceiptRecord[];
};
