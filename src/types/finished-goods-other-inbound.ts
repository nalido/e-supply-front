export type FinishedGoodsOtherInboundViewMode = 'spec' | 'date';

export type FinishedGoodsOtherInboundQuery = {
  warehouseId?: string;
  keyword?: string;
  viewMode?: FinishedGoodsOtherInboundViewMode;
};

export type FinishedGoodsOtherInboundListParams = FinishedGoodsOtherInboundQuery & {
  page: number;
  pageSize: number;
};

export type FinishedGoodsOtherInboundRecord = {
  recordType: 'spec';
  id: string;
  warehouseId: string;
  warehouseName: string;
  processorId: string;
  processorName: string;
  styleId: string;
  styleNo: string;
  styleName: string;
  color: string;
  size: string;
  sku: string;
  imageUrl: string;
  inboundQty: number;
  unitPrice: number;
  amount: number;
  receiptAt: string;
  inboundType: string;
  remark?: string;
};

export type FinishedGoodsOtherInboundDailyRecord = {
  recordType: 'date';
  id: string;
  receiptDate: string;
  warehouseId: string;
  warehouseName: string;
  inboundQty: number;
  avgUnitPrice: number;
  amount: number;
  ticketCount: number;
  processorNames: string[];
};

export type FinishedGoodsOtherInboundSummary = {
  inboundQty: number;
  amount: number;
};

export type FinishedGoodsOtherInboundListResponse = {
  viewMode: FinishedGoodsOtherInboundViewMode;
  list: Array<FinishedGoodsOtherInboundRecord | FinishedGoodsOtherInboundDailyRecord>;
  total: number;
  summary: FinishedGoodsOtherInboundSummary;
};

export type FinishedGoodsOtherInboundFormPayload = {
  warehouseId: string;
  processorId: string;
  styleId: string;
  color: string;
  size: string;
  inboundQty: number;
  unitPrice: number;
  receiptAt: string;
  inboundType: string;
  remark?: string;
};

export type FinishedGoodsOtherInboundWarehouse = {
  id: string;
  name: string;
};

export type FinishedGoodsOtherInboundProcessor = {
  id: string;
  name: string;
};

export type FinishedGoodsOtherInboundTypeOption = {
  value: string;
  label: string;
};

export type FinishedGoodsOtherInboundStyleOption = {
  id: string;
  styleNo: string;
  styleName: string;
  imageUrl: string;
  colors: string[];
  sizes: string[];
};

export type FinishedGoodsOtherInboundMeta = {
  warehouses: FinishedGoodsOtherInboundWarehouse[];
  processors: FinishedGoodsOtherInboundProcessor[];
  inboundTypes: FinishedGoodsOtherInboundTypeOption[];
  styles: FinishedGoodsOtherInboundStyleOption[];
};
