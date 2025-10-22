export type SupplierPaymentRecord = {
  id: string;
  supplierId: string;
  supplierName: string;
  payableAmount: number;
  paidAmount: number;
  arrearsAmount: number;
  lastPaymentDate?: string;
};

export type SupplierPaymentSummary = {
  totalPayable: number;
  totalPaid: number;
  totalArrears: number;
};

export type SupplierPaymentListParams = {
  page: number;
  pageSize: number;
  keyword?: string;
  startDate?: string;
  endDate?: string;
};

export type SupplierPaymentListResponse = {
  list: SupplierPaymentRecord[];
  total: number;
  summary: SupplierPaymentSummary;
};

export type SupplierPaymentOption = {
  label: string;
  value: string;
};

export type SupplierPaymentMeta = {
  suppliers: SupplierPaymentOption[];
  paymentMethods: SupplierPaymentOption[];
  cashierAccounts: SupplierPaymentOption[];
};

export type SupplierPaymentPayload = {
  supplierId: string;
  amount: number;
  date: string;
  paymentMethod: string;
  cashierAccountId: string;
  remark?: string;
  reference?: string;
};
