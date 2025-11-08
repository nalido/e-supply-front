export type SampleOrderTrend = {
  labels: string[];
  sampleQuantity: number[];
  styleCount: number[];
};

export type SampleRoleProportionSlice = {
  name: string;
  value: number;
};

export type SampleOrderAggregation = {
  trend: SampleOrderTrend;
  proportion: {
    total: number;
    roles: SampleRoleProportionSlice[];
  };
};

export type SampleOrderComparisonItem = {
  id: string;
  imageUrl?: string;
  styleNumber: string;
  styleName: string;
  sampledTimes: number;
  sampledQuantity: number;
  orderedTimes: number;
  orderedQuantity: number;
};

export type SampleOrderComparisonParams = {
  styleName?: string;
  page: number;
  pageSize: number;
  sortBy?: 'sampledTimes' | 'sampledQuantity' | 'orderedTimes' | 'orderedQuantity';
  order?: 'asc' | 'desc';
};

export type SampleOrderComparisonResponse = {
  list: SampleOrderComparisonItem[];
  total: number;
};
