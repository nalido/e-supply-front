export type FactoryBusinessTrendPoint = {
  month: string;
  payable: number;
  paid: number;
};

export type FactoryBusinessDetailAggregation = {
  trend: FactoryBusinessTrendPoint[];
};

export type FactoryBusinessDetailRecord = {
  id: string;
  factoryId: string;
  factoryName: string;
  businessDate: string;
  documentType: string;
  documentNo: string;
  payable: number;
  paid: number;
  cashierAccount?: string;
};

export type FactoryBusinessDetailSummary = {
  totalPayable: number;
  totalPaid: number;
};

export type FactoryBusinessDetailListParams = {
  page: number;
  pageSize: number;
  factoryIds?: string[];
  startDate?: string;
  endDate?: string;
};

export type FactoryBusinessDetailListResponse = {
  list: FactoryBusinessDetailRecord[];
  total: number;
  summary: FactoryBusinessDetailSummary;
};

export type FactoryBusinessDetailMeta = {
  factories: Array<{ label: string; value: string }>;
};
