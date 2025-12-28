export type ProcessProductionStage = {
  key: string;
  completed: number;
};

export type ProcessProductionRecord = {
  orderNumber: string;
  styleNumber: string;
  styleName: string;
  orderQuantity: number;
  stages: ProcessProductionStage[];
};

export type ProcessProductionListParams = {
  page: number;
  pageSize: number;
  keyword?: string;
  startDate?: string;
  endDate?: string;
};

export type ProcessProductionListResponse = {
  list: ProcessProductionRecord[];
  total: number;
  inventoryQuantity: number;
};
