export type FinishedGoodsReceivedViewMode = 'spec' | 'receiptDate';

export type FinishedGoodsReceivedWarehouseOption = {
  id: string;
  name: string;
};

export type FinishedGoodsReceivedProcessorOption = {
  id: string;
  name: string;
};

export type FinishedGoodsReceivedListParams = {
  page: number;
  pageSize: number;
  viewMode: FinishedGoodsReceivedViewMode;
  warehouseId?: string;
  keywordOrderOrStyle?: string;
  keywordProcessor?: string;
};

export type FinishedGoodsReceivedMeta = {
  warehouses: FinishedGoodsReceivedWarehouseOption[];
  processors: FinishedGoodsReceivedProcessorOption[];
};

export type FinishedGoodsReceivedRecord = {
  id: string;
  receiptNo: string;
  receiptDate: string;
  warehouseId: string;
  warehouseName: string;
  factoryOrderNo: string;
  customerCategory: string;
  styleNo: string;
  styleName: string;
  processorId?: string;
  processorName?: string;
  sku: string;
  color: string;
  size: string;
  quantity: number;
  remark?: string;
  imageUrl?: string;
};

export type FinishedGoodsReceivedDailyAggregation = {
  id: string;
  receiptDate: string;
  recordCount: number;
  skuCount: number;
  warehouseCount: number;
  totalQuantity: number;
};

export type FinishedGoodsReceivedSummary = {
  totalQuantity: number;
  skuCount: number;
  recordCount: number;
};

export type FinishedGoodsReceivedListResponse = {
  list: (FinishedGoodsReceivedRecord | FinishedGoodsReceivedDailyAggregation)[];
  total: number;
  summary: FinishedGoodsReceivedSummary;
};

export type FinishedGoodsReceivedUpdatePayload = {
  warehouseId: string;
  quantity: number;
  remark?: string;
};

export type FinishedGoodsReceivedExportParams = FinishedGoodsReceivedListParams;
