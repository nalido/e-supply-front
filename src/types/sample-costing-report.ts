export type SampleCostTrendPoint = {
  month: string;
  developmentCost: number;
  sampleCost: number;
};

export type SampleCostTrend = {
  labels: string[];
  developmentCost: number[];
  sampleCost: number[];
};

export type SampleCostTypeSlice = {
  name: string;
  value: number;
};

export type SampleCostAggregation = {
  trend: SampleCostTrend;
  typeComparison: {
    total: number;
    types: SampleCostTypeSlice[];
  };
};

export type SampleCostCard = {
  id: string;
  imageUrl?: string;
  styleNumber: string;
  styleName: string;
  sampleOrderNo: string;
  quantity: number;
  developmentCost: number;
  completionDate: string;
  unitCost: number;
  costBreakdown: Array<{ item: string; cost: number }>;
};

export type SampleCostListParams = {
  keyword?: string;
  startDate?: string;
  endDate?: string;
  page: number;
  pageSize: number;
};

export type SampleCostListResponse = {
  list: SampleCostCard[];
  total: number;
};
