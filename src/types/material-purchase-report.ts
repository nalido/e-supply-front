export type PurchaseDateFilterType = 'purchase' | 'inbound';

export type MaterialPurchaseType = 'preparation' | 'order';

export type SupplierOption = {
  id: string;
  name: string;
};

export type MaterialPurchaseReportQueryParams = {
  documentNo?: string;
  styleKeyword?: string;
  purchaseOrderNo?: string;
  materialKeyword?: string;
  supplierId?: string;
  dateType?: PurchaseDateFilterType;
  startDate?: string;
  endDate?: string;
};

export type MaterialPurchaseReportListParams = MaterialPurchaseReportQueryParams & {
  page: number;
  pageSize: number;
};

export type MaterialPurchaseReportListItem = {
  id: string;
  purchaseType: MaterialPurchaseType;
  purchaseTypeLabel: string;
  purchaseOrderNo: string;
  purchaseTime: string;
  documentNo: string;
  styleNo: string;
  styleName: string;
  supplierName: string;
  supplierModel?: string;
  supplierColor?: string;
  materialType: string;
  materialName: string;
  color?: string;
  specification?: string;
  width?: string;
  weight?: string;
  orderedQty: number;
  unit: string;
  unitPrice: number;
  orderedAmount: number;
  inboundTime?: string;
  inboundQty: number;
  inboundAmount: number;
};

export type MaterialPurchaseReportListResponse = {
  list: MaterialPurchaseReportListItem[];
  total: number;
};

export type MaterialPurchaseReportMeta = {
  suppliers: SupplierOption[];
  purchaseTypes: Array<{ value: MaterialPurchaseType; label: string }>;
};
