export type FactoryPaymentRecord = {
  id: string;
  factoryId: string;
  factoryName: string;
  payableAmount: number;
  paidAmount: number;
  arrearsAmount: number;
  lastPaymentDate?: string;
};

export type FactoryPaymentSummary = {
  totalPayable: number;
  totalPaid: number;
  totalArrears: number;
};

export type FactoryPaymentListParams = {
  page: number;
  pageSize: number;
  keyword?: string;
  startDate?: string;
  endDate?: string;
};

export type FactoryPaymentListResponse = {
  list: FactoryPaymentRecord[];
  total: number;
  summary: FactoryPaymentSummary;
};

export type FactoryPaymentOption = {
  label: string;
  value: string;
};

export type FactoryPaymentMeta = {
  factories: FactoryPaymentOption[];
  paymentMethods: FactoryPaymentOption[];
  cashierAccounts: FactoryPaymentOption[];
};

export type FactoryPaymentPayload = {
  factoryId: string;
  amount: number;
  date: string;
  paymentMethod: string;
  cashierAccountId: string;
  remark?: string;
  reference?: string;
};
