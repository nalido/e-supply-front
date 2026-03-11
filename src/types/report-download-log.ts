export type ReportDownloadStatus = 'COMPLETED' | 'FAILED';

export type ReportDownloadType =
  | 'ORDER_PROGRESS'
  | 'TICKET_RECORDS'
  | 'SEQUENTIAL_PROCESSES'
  | 'OUTSOURCING_ORDERS'
  | 'FACTORY_ORDERS'
  | 'CUTTING_REPORT'
  | 'QUALITY_INSPECTIONS';

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
