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
  inboundQty: number;
  outboundQty: number;
};

export type MaterialInboundRatioItem = {
  materialType: string;
  amount: number;
};

export type MaterialInventoryAggregation = {
  trend: MaterialInventoryTrendPoint[];
  inboundTotal: number;
  outboundTotal: number;
  ratio: MaterialInboundRatioItem[];
  ratioTotal: number;
};

export type MaterialInventoryListItem = {
  id: string;
  imageUrl: string;
  materialType: string;
  materialName: string;
  color: string;
  spec: string;
  unit: string;
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
