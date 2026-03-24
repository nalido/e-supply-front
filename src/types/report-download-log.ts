export type ReportDownloadStatus = 'COMPLETED' | 'FAILED';

export type ReportDownloadType =
  | 'ORDER_PROGRESS'
  | 'TICKET_RECORDS'
  | 'SEQUENTIAL_PROCESSES'
  | 'OUTSOURCING_ORDERS'
  | 'OUTSOURCING_PRODUCTION'
  | 'OUTSOURCING_CUTTING_DETAILS'
  | 'FACTORY_ORDERS'
  | 'CUTTING_REPORT'
  | 'QUALITY_INSPECTIONS'
  | 'SAMPLE_ORDERS'
  | 'SAMPLE_COSTING'
  | 'BULK_COST'
  | 'SHIPMENT_PROFIT'
  | 'MATERIAL_REQUIREMENT'
  | 'CUSTOMER_RECEIPTS'
  | 'SUPPLIER_PAYMENTS'
  | 'FACTORY_PAYMENTS'
  | 'CUSTOMER_BUSINESS_DETAILS'
  | 'SUPPLIER_BUSINESS_DETAILS'
  | 'FACTORY_BUSINESS_DETAILS'
  | 'RECONCILIATION_DETAILS';

export interface ReportDownloadRecord {
  id: string;
  reportType: ReportDownloadType;
  status: ReportDownloadStatus;
  fileUrl?: string;
  filters?: string;
  message?: string;
  requestedBy?: string;
  requestedByName?: string;
  requestedAt?: string;
}

export interface ReportDownloadListParams {
  reportType?: ReportDownloadType | 'ALL';
  status?: ReportDownloadStatus | 'all';
  keyword?: string;
  startDate?: string;
  endDate?: string;
  page: number;
  pageSize: number;
}

export interface ReportDownloadListResponse {
  list: ReportDownloadRecord[];
  total: number;
  page: number;
  pageSize: number;
}
