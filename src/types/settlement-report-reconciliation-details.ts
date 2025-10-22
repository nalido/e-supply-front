export type ReconciliationPartnerType = 'customer' | 'factory' | 'supplier';

export type ReconciliationStatus = 'reconciled' | 'unreconciled';

export type ReconciliationDetailsRecord = {
  id: string;
  statementNo: string;
  partnerType: ReconciliationPartnerType;
  partnerName: string;
  documentType: string;
  documentNo: string;
  amount: number;
  reconciliationDate?: string;
  shipmentDate?: string;
  status: ReconciliationStatus;
  styleInfo?: string;
};

export type ReconciliationDetailsSummary = {
  totalAmount: number;
  reconciledCount: number;
};

export type ReconciliationDetailsListParams = {
  page: number;
  pageSize: number;
  partnerType?: ReconciliationPartnerType;
  status?: ReconciliationStatus;
  keyword?: string;
  orderNo?: string;
  styleKeyword?: string;
  statementNo?: string;
  shipmentDateStart?: string;
  shipmentDateEnd?: string;
  reconciliationDateStart?: string;
  reconciliationDateEnd?: string;
};

export type ReconciliationDetailsListResponse = {
  list: ReconciliationDetailsRecord[];
  total: number;
  summary: ReconciliationDetailsSummary;
};

export type ReconciliationDetailsMeta = {
  customers: Array<{ label: string; value: string }>;
  factories: Array<{ label: string; value: string }>;
  suppliers: Array<{ label: string; value: string }>;
};

export type ReconciliationCancelPayload = {
  ids: string[];
};
