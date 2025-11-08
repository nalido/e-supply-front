export type StockingMaterialType = 'fabric' | 'accessory';

export type StockingPurchaseStatus = 'pending' | 'partial' | 'completed' | 'void';

export type StockingPurchaseStatusFilter = 'pending' | 'completed' | 'all';

export type StockingPurchaseStatusOption = {
  value: StockingPurchaseStatusFilter;
  label: string;
};

export type StockingPurchaseRecord = {
  id: string;
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
  ids: string[];
};

export type StockingStatusUpdatePayload = {
  ids: string[];
  status: Extract<StockingPurchaseStatus, 'completed' | 'void'>;
};

export type StockingPurchaseExportParams = StockingPurchaseListParams;
