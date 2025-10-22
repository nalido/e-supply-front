export type SupplierBusinessTrendPoint = {
  month: string;
  payable: number;
  paid: number;
};

export type SupplierBusinessDetailAggregation = {
  trend: SupplierBusinessTrendPoint[];
};

export type SupplierBusinessDetailRecord = {
  id: string;
  supplierId: string;
  supplierName: string;
  businessDate: string;
  documentType: string;
  documentNo: string;
  payable: number;
  paid: number;
  cashierAccount?: string;
};

export type SupplierBusinessDetailSummary = {
  totalPayable: number;
  totalPaid: number;
};

export type SupplierBusinessDetailListParams = {
  page: number;
  pageSize: number;
  supplierIds?: string[];
  startDate?: string;
  endDate?: string;
};

export type SupplierBusinessDetailListResponse = {
  list: SupplierBusinessDetailRecord[];
  total: number;
  summary: SupplierBusinessDetailSummary;
};

export type SupplierBusinessDetailMeta = {
  suppliers: Array<{ label: string; value: string }>;
};
