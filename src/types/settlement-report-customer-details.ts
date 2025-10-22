export type CustomerBusinessTrendPoint = {
  month: string;
  receivable: number;
  received: number;
};

export type CustomerBusinessDetailAggregation = {
  trend: CustomerBusinessTrendPoint[];
};

export type CustomerBusinessDetailRecord = {
  id: string;
  customerId: string;
  customerName: string;
  businessDate: string;
  documentType: string;
  documentNo: string;
  receivable: number;
  received: number;
  cashierAccount?: string;
};

export type CustomerBusinessDetailSummary = {
  totalReceivable: number;
  totalReceived: number;
};

export type CustomerBusinessDetailListParams = {
  page: number;
  pageSize: number;
  customerIds?: string[];
  startDate?: string;
  endDate?: string;
};

export type CustomerBusinessDetailListResponse = {
  list: CustomerBusinessDetailRecord[];
  total: number;
  summary: CustomerBusinessDetailSummary;
};

export type CustomerBusinessDetailMeta = {
  customers: Array<{ label: string; value: string }>;
};
