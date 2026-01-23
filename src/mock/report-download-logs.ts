import type {
  ReportDownloadListParams,
  ReportDownloadListResponse,
  ReportDownloadRecord,
} from '../types/report-download-log';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const mockLogs: ReportDownloadRecord[] = [
  {
    id: 'log-001',
    reportType: 'ORDER_PROGRESS',
    status: 'COMPLETED',
    fileUrl: '/downloads/order-progress-20251229.csv',
    filters: 'keyword=AX012',
    requestedBy: '1001',
    requestedByName: '系统管理员',
    requestedAt: '2025-12-29T14:55:00Z',
  },
  {
    id: 'log-002',
    reportType: 'TICKET_RECORDS',
    status: 'COMPLETED',
    fileUrl: '/downloads/ticket-records-20251229.csv',
    filters: 'lotId=LOT-001',
    requestedBy: '1001',
    requestedByName: '系统管理员',
    requestedAt: '2025-12-29T14:58:00Z',
  },
  {
    id: 'log-003',
    reportType: 'SEQUENTIAL_PROCESSES',
    status: 'FAILED',
    fileUrl: undefined,
    message: 'No data available',
    filters: 'status=pending',
    requestedBy: '1002',
    requestedByName: '制衣主管',
    requestedAt: '2025-12-28T09:12:00Z',
  },
  {
    id: 'log-004',
    reportType: 'OUTSOURCING_ORDERS',
    status: 'COMPLETED',
    fileUrl: '/downloads/outsourcing-orders-20251228.csv',
    filters: JSON.stringify({ processorId: 'PROC-01', status: 'DISPATCHED' }),
    requestedBy: '1003',
    requestedByName: '外发专员',
    requestedAt: '2025-12-28T10:30:00Z',
  },
  {
    id: 'log-005',
    reportType: 'FACTORY_ORDERS',
    status: 'COMPLETED',
    fileUrl: '/downloads/factory-orders-20251227.csv',
    filters: JSON.stringify({ status: 'delay', merchandiser: '李进' }),
    requestedBy: '1004',
    requestedByName: '计划员',
    requestedAt: '2025-12-27T08:45:00Z',
  },
  {
    id: 'log-006',
    reportType: 'CUTTING_REPORT',
    status: 'COMPLETED',
    fileUrl: '/downloads/cutting-report-20251227.csv',
    filters: JSON.stringify({ startDate: '2025-12-20', endDate: '2025-12-27' }),
    requestedBy: '1002',
    requestedByName: '裁床主管',
    requestedAt: '2025-12-27T09:00:00Z',
  },
  {
    id: 'log-007',
    reportType: 'QUALITY_INSPECTIONS',
    status: 'FAILED',
    fileUrl: undefined,
    message: '未匹配到质检记录',
    filters: JSON.stringify({ inspectorId: '9003', status: 'failed' }),
    requestedBy: '1005',
    requestedByName: '质检经理',
    requestedAt: '2025-12-27T10:15:00Z',
  },
];

export const fetchReportDownloadLogs = async (
  params: ReportDownloadListParams,
): Promise<ReportDownloadListResponse> => {
  await delay(200);
  const normalizedType = params.reportType && params.reportType !== 'ALL' ? params.reportType : undefined;
  const normalizedStatus = params.status && params.status !== 'all' ? params.status : undefined;
  const keyword = params.keyword?.toLowerCase() ?? '';

  const filtered = mockLogs.filter((log) => {
    const matchType = normalizedType ? log.reportType === normalizedType : true;
    const matchStatus = normalizedStatus ? log.status === normalizedStatus : true;
    const matchKeyword = keyword
      ? `${log.fileUrl ?? ''}${log.filters ?? ''}${log.requestedByName ?? ''}`
          .toLowerCase()
          .includes(keyword)
      : true;
    return matchType && matchStatus && matchKeyword;
  });

  const startIndex = Math.max(0, (params.page - 1) * params.pageSize);
  const pageItems = filtered.slice(startIndex, startIndex + params.pageSize);

  return {
    list: pageItems,
    total: filtered.length,
    page: params.page,
    pageSize: params.pageSize,
  };
};
