export type ProductionComparisonStage = {
  key: string;
  name: string;
};

export type ProductionComparisonProgress = Record<string, number>;

export type ProductionComparisonRecord = {
  id: string;
  imageUrl: string;
  orderNumber: string;
  orderStatus: string;
  materialStatus: string;
  customer: string;
  merchandiser: string;
  styleNumber: string;
  styleName: string;
  orderDate: string;
  expectedDelivery: string;
  orderQty: number;
  unit: string;
  plannedCutQty: number;
  progress: ProductionComparisonProgress;
  warehousingQty: number;
  deliveryQty: number;
  inventoryQty: number;
};

export type ProductionComparisonSummary = {
  orderQty: number;
  plannedCutQty: number;
  progress: ProductionComparisonProgress;
  warehousingQty: number;
  deliveryQty: number;
  inventoryQty: number;
};

export type ProductionComparisonListParams = {
  keyword?: string;
  page: number;
  pageSize: number;
  sortBy?: keyof ProductionComparisonRecord | `progress.${string}`;
  order?: 'ascend' | 'descend';
};

export type ProductionComparisonListResponse = {
  list: ProductionComparisonRecord[];
  total: number;
  summary: ProductionComparisonSummary;
  stages: ProductionComparisonStage[];
};
