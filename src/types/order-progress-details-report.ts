export type OrderProgressStatus = 'new' | 'inProgress' | 'delayed' | 'completed';

export type OrderProgressCategoryKey =
  | 'cutting'
  | 'sewing'
  | 'finishing'
  | 'quality'
  | 'packaging'
  | 'storage';

export type OrderProgressCategory = {
  key: OrderProgressCategoryKey;
  name: string;
  completedQty: number;
  totalQty: number;
  onSchedule: boolean;
  bottleneck?: boolean;
};

export type OrderProgressDetailsRecord = {
  id: string;
  orderNumber: string;
  customer: string;
  orderDate: string;
  styleNumber: string;
  styleName: string;
  orderQuantity: number;
  cuttingDate?: string;
  actualCutQuantity?: number;
  dispatchDate?: string;
  deliveryDate?: string;
  totalProcessPrice?: number;
  orderStatus: OrderProgressStatus;
  progressPercent: number;
  progressTrend?: 'up' | 'down' | 'flat';
  categorySummary: OrderProgressCategory[];
};

export type OrderProgressDetailsListParams = {
  page: number;
  pageSize: number;
  keyword?: string;
  orderDateStart?: string;
  orderDateEnd?: string;
};

export type OrderProgressDetailsListResponse = {
  list: OrderProgressDetailsRecord[];
  total: number;
};
