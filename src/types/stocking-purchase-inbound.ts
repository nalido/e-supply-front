export type StockingMaterialType = 'fabric' | 'accessory';

export type StockingPurchaseStatus = 'pending' | 'partial' | 'completed' | 'void';

export type StockingPurchaseStatusFilter = 'pending' | 'completed' | 'all';

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
};

export type StockingReceiptListResponse = {
  list: StockingReceiptRecord[];
};
