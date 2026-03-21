export type MaterialInventoryQueryParams = {
  keyword?: string;
  type?: string;
  startDate?: string;
  endDate?: string;
};

export type MaterialInventoryListParams = MaterialInventoryQueryParams & {
  page: number;
  pageSize: number;
};

export type MaterialInventoryTrendPoint = {
  month: string;
  inboundAmount: number;
  outboundAmount: number;
};

export type MaterialInboundRatioItem = {
  materialType: string;
  amount: number;
};

export type MaterialInventoryAggregation = {
  trend: MaterialInventoryTrendPoint[];
  inboundAmountTotal: number;
  outboundAmountTotal: number;
  ratio: MaterialInboundRatioItem[];
  ratioTotal: number;
};

export type MaterialInventoryListItem = {
  id: string;
  transactionDate: string;
  direction: string;
  movementType: string;
  movementLabel: string;
  documentNo: string;
  imageUrl: string;
  materialType: string;
  materialName: string;
  warehouseName: string;
  color: string;
  spec: string;
  unit: string;
  quantity: number;
  inboundQty: number;
  issuedQty: number;
  returnQty: number;
  otherOutboundQty: number;
  currentStock: number;
};

export type MaterialInventoryListSummary = {
  inboundQtyTotal: number;
  issuedQtyTotal: number;
  returnQtyTotal: number;
  otherOutboundQtyTotal: number;
};

export type MaterialInventoryListResponse = {
  list: MaterialInventoryListItem[];
  total: number;
  summary: MaterialInventoryListSummary;
};
