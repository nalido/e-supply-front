export type FinishedGoodsInventoryQueryParams = {
  keyword?: string;
  startDate?: string;
  endDate?: string;
};

export type FinishedGoodsInventoryListParams = FinishedGoodsInventoryQueryParams & {
  page: number;
  pageSize: number;
};

export type FinishedGoodsMonthlyFlow = {
  month: string;
  inbound: number;
  outbound: number;
};

export type FinishedGoodsInventoryAggregation = {
  monthlyFlow: FinishedGoodsMonthlyFlow[];
  inboundTotal: number;
  outboundTotal: number;
};

export type FinishedGoodsInventoryListItem = {
  id: string;
  imageUrl: string;
  styleNo: string;
  styleName: string;
  color: string;
  size: string;
  unit: string;
  inboundQty: number;
  outboundQty: number;
  currentStock: number;
};

export type FinishedGoodsInventoryListSummary = {
  inboundTotal: number;
  outboundTotal: number;
};

export type FinishedGoodsInventoryListResponse = {
  list: FinishedGoodsInventoryListItem[];
  total: number;
  summary: FinishedGoodsInventoryListSummary;
};
