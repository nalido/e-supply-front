export type CustomerReceiptRecord = {
  id: string;
  customerId: string;
  customerName: string;
  receivableAmount: number;
  receivedAmount: number;
  arrearsAmount: number;
  lastReceiptDate?: string;
};

export type CustomerReceiptSummary = {
  totalReceivable: number;
  totalReceived: number;
  totalArrears: number;
};

export type CustomerReceiptListParams = {
  page: number;
  pageSize: number;
  keyword?: string;
  startDate?: string;
  endDate?: string;
};

export type CustomerReceiptListResponse = {
  list: CustomerReceiptRecord[];
  total: number;
  summary: CustomerReceiptSummary;
};

export type CustomerReceiptOption = {
  label: string;
  value: string;
};

export type CustomerReceiptMeta = {
  customers: CustomerReceiptOption[];
  paymentMethods: CustomerReceiptOption[];
  cashierAccounts: CustomerReceiptOption[];
};

export type CustomerReceiptPayload = {
  customerId: string;
  amount: number;
  date: string;
  paymentMethod: string;
  cashierAccountId: string;
  remark?: string;
  reference?: string;
};
