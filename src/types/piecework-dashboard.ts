export type PieceworkMetricTrend = 'up' | 'down' | 'flat';

export type PieceworkMetric = {
  key: string;
  title: string;
  orderCount: number;
  quantity: number;
  quantityUnit?: string;
  description?: string;
  trendPercent?: number;
  trendDirection?: PieceworkMetricTrend;
};

export type PieceworkCuttingTrendPoint = {
  month: string;
  quantity: number;
};

export type PieceworkCapacityComparisonPoint = {
  month: string;
  category: '本年' | '去年';
  quantity: number;
};

export type PieceworkCompletionSlice = {
  key: 'completed' | 'in_progress';
  label: string;
  orders: number;
};

export type PieceworkCapacityTrendPoint = {
  date: string;
  type: '计划产能' | '实际订单';
  value: number;
};

export type PieceworkOverdueOrder = {
  id: string;
  orderNo: string;
  customer: string;
  styleNo: string;
  styleName: string;
  expectedDelivery: string;
  orderQuantity: number;
  cuttingQuantity: number;
  completionRate: number;
  thumbnail: string;
};

export type PieceworkDashboardDataset = {
  metrics: PieceworkMetric[];
  cuttingTrend: PieceworkCuttingTrendPoint[];
  capacityComparison: PieceworkCapacityComparisonPoint[];
  completionSlices: PieceworkCompletionSlice[];
  capacityTrend: PieceworkCapacityTrendPoint[];
  overdueOrders: PieceworkOverdueOrder[];
};
