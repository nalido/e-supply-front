import http from './http';
import { tenantStore } from '../stores/tenant';
import type {
  PieceworkDashboardDataset,
  CuttingTaskDataset,
  CuttingSheetDetail,
  CuttingReportDataset,
  WorkshopProgressDataset,
} from '../types';
import type {
  QualityControlCreatePayload,
  QualityControlListParams,
  QualityControlListResponse,
  QualityControlMeta,
  QualityControlRecord,
  QualityExceptionResolvePayload,
  QualityExceptionLog,
  QualityExceptionStatus,
  QualityInspectionStatus,
} from '../types/quality-control-management';
import type {
  SalaryEmployeeRecord,
  SalaryListParams,
  SalaryListResponse,
  SalaryMeta,
  SalarySettlePayload,
  SalaryTicketListParams,
  SalaryTicketListResponse,
  SalaryTicketRecord,
  SalaryTicketSummary,
  SalaryBatchAdjustPayload,
  SalaryPayslipSendPayload,
  SalaryPayslipSendResult,
  SalaryPayslipRecord,
  SalaryPayslipLogListParams,
  SalaryPayslipLogResponse,
  SalaryPayslipLogRecord,
  SalaryScanStatistics,
  SalaryScanStatisticsParams,
  SalaryTicketDetailParams,
  SalaryTicketDetailResponse,
} from '../types/salary-management';
import type {
  OrderProgressDetailsListResponse,
  OrderProgressDetailsListParams,
} from '../types/order-progress-details-report';
import type {
  OrderTicketLotListResponse,
  OrderTicketLotListParams,
  OrderTicketRecordListParams,
  OrderTicketRecordListResponse,
} from '../types/order-ticket-details-report';
import type {
  ProcessProductionListParams,
  ProcessProductionListResponse,
} from '../types/process-production-comparison-report';
import type {
  ReportDownloadListParams,
  ReportDownloadListResponse,
  ReportDownloadRecord,
} from '../types/report-download-log';
import type {
  SequentialProcessExportParams,
  SequentialProcessListParams,
  SequentialProcessListResponse,
} from '../types/sequential-process-report';

const ensureTenantId = (): number => {
  const tenantId = tenantStore.getTenantId();
  if (!tenantId) {
    throw new Error('未找到租户信息，请重新选择企业');
  }
  const parsed = Number(tenantId);
  if (!Number.isFinite(parsed)) {
    throw new Error('租户信息无效，请刷新后重试');
  }
  return parsed;
};

const normalizePage = (page?: number): number => {
  const next = page ?? 1;
  return next <= 0 ? 0 : next - 1;
};

const normalizeKeyword = (value?: string): string | undefined => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

type CuttingDatasetPayload = Partial<{
  summary: CuttingTaskDataset['summary'];
  list: CuttingTaskDataset['list'];
  total: number;
  page: number;
  pageSize: number;
}>;

type CuttingReportPayload = Partial<{
  list: CuttingReportDataset['list'];
  total: number;
  summary: CuttingReportDataset['summary'];
  page: number;
  pageSize: number;
}>;

type PieceworkDashboardPayload = Partial<PieceworkDashboardDataset>;

type WorkshopProgressPayload = Partial<WorkshopProgressDataset>;

type QualityRecordPayload = Partial<{
  id: string | number;
  workOrderId: string | number;
  qcDate: string;
  orderNumber: string;
  styleNumber: string;
  styleName: string;
  processName: string;
  ticketNo: string;
  worker: string;
  inspectedQty: number;
  passedQty: number;
  failedQty: number;
  defectReason: string;
  disposition: QualityControlRecord['disposition'];
  inspector: string;
  inspectorId?: string | number;
  exceptionStatus?: string;
  exceptionNote?: string;
  exceptionHandledBy?: string | number;
  exceptionHandledAt?: string;
}>;

type QualityExceptionLogPayload = Partial<{
  id: string | number;
  status: string;
  note?: string;
  handledBy?: string | number;
  handledByName?: string;
  createdAt?: string;
}>;

type SalaryEmployeeApiRecord = {
  id: string | number;
  name: string;
  department?: string;
  settledAmount?: number | string;
  unsettledAmount?: number | string;
  otherAmount?: number | string;
  totalAmount?: number | string;
  lastSettlementDate?: string;
};

type SalaryListApiResponse = {
  list: SalaryEmployeeApiRecord[];
  total?: number;
  summary?: Partial<SalaryListResponse['summary']>;
};

type SalaryTicketApiRecord = {
  ticketId?: string | number;
  ticketNo?: string;
  processName?: string;
  recordedAt?: string;
  status?: SalaryTicketRecord['status'];
  quantity?: number;
  pieceRate?: number | string;
  amount?: number | string;
  workOrderId?: number;
  productionOrderId?: number;
};

type SalaryTicketApiResponse = {
  list?: SalaryTicketApiRecord[];
  total?: number;
  page?: number;
  size?: number;
  summary?: Partial<SalaryTicketSummary>;
};

type SalaryPayslipApiRecord = {
  employeeId?: string | number;
  employeeName?: string;
  settledAmount?: number | string;
  unsettledAmount?: number | string;
  adjustmentAmount?: number | string;
  totalAmount?: number | string;
};

type SalaryPayslipLogApiRecord = {
  id?: string | number;
  employeeId?: string | number;
  employeeName?: string;
  startDate?: string;
  endDate?: string;
  settledAmount?: number | string;
  unsettledAmount?: number | string;
  adjustmentAmount?: number | string;
  totalAmount?: number | string;
  status?: string;
  message?: string;
  requestedBy?: string | number;
  requestedByName?: string;
  sentAt?: string;
};

type SalaryPayslipLogApiResponse = {
  list?: SalaryPayslipLogApiRecord[];
  total?: number;
  page?: number;
  size?: number;
};

type SalaryScanSummaryPayload = Partial<{
  totalTickets: number;
  totalQuantity: number;
  settledAmount: number | string;
  unsettledAmount: number | string;
  totalAmount: number | string;
}>;

type SalaryScanEmployeePayload = Partial<{
  employeeId: string | number;
  employeeName: string;
  department: string;
  ticketCount: number;
  totalQuantity: number;
  totalAmount: number | string;
  unsettledAmount: number | string;
}>;

type SalaryScanProcessPayload = Partial<{
  processId?: string | number;
  processName?: string;
  ticketCount?: number;
  totalQuantity?: number;
  totalAmount?: number | string;
}>;

type SalaryScanTrendPayload = Partial<{
  date?: string;
  totalQuantity?: number;
  totalAmount?: number | string;
}>;

type SalaryScanStatisticsPayload = {
  summary?: SalaryScanSummaryPayload;
  topEmployees?: SalaryScanEmployeePayload[];
  topProcesses?: SalaryScanProcessPayload[];
  trend?: SalaryScanTrendPayload[];
};

type SalaryTicketDetailApiRecord = Partial<{
  employeeId: string | number;
  employeeName: string;
  department: string;
  ticketCount: number;
  totalQuantity: number;
  settledAmount: number | string;
  unsettledAmount: number | string;
  totalAmount: number | string;
  lastScanAt?: string;
}>;

type SalaryTicketDetailApiResponse = {
  list?: SalaryTicketDetailApiRecord[];
  total?: number;
  page?: number;
  size?: number;
};

type QualityStatusOptionResponse = {
  label: string;
  value: string;
};

type QualityInspectorOptionResponse = {
  id?: string | number;
  name?: string;
};

type CuttingReportExportParams = {
  orderKeyword?: string;
  styleKeyword?: string;
  cutterKeyword?: string;
  remarkKeyword?: string;
  startDate?: string;
  endDate?: string;
};

type CuttingTaskQueryParams = {
  page?: number;
  pageSize?: number;
  keyword?: string;
  includeCompleted?: boolean;
  startDate?: string;
  endDate?: string;
  includeSummary?: boolean;
};

type CuttingTaskCreateItem = {
  workOrderId: number;
  bedNumber: string;
  color?: string;
  size?: string;
  quantity: number;
  cutAt?: string;
  cutterId?: number;
  remark?: string;
};

type CuttingSheetDetailPayload = Partial<{
  workOrderId: number;
  productionOrderId: number;
  styleId: number;
  orderCode: string;
  styleCode: string;
  styleName: string;
  customer: string;
  status: string;
  bedNumber: string;
  cutterId: number;
  plannedFabricQty: number;
  warehouseId: number;
  warehouseName: string;
  materialId: number;
  materialCode: string;
  materialName: string;
  materialUnit: string;
  startActualFabricQty: number;
  completeActualFabricQty: number;
  startedAt: string;
  completedAt: string;
  plannedQty: number;
  completedQty: number;
  sizes: string[];
  rows: Array<{
    color: string;
    cells: Array<{
      size: string;
      orderedQty: number;
      completedQty: number;
      pendingQty: number;
    }>;
    orderedSubtotal: number;
    completedSubtotal: number;
    pendingSubtotal: number;
  }>;
  bedRecords: Array<{
    bedNumber: string;
    recordedAt?: string;
    actualFabricQty?: number;
    totalQty?: number;
    items?: Array<{
      color?: string;
      size?: string;
      quantity?: number;
    }>;
  }>;
  materialDocuments: Array<{
    documentCategory: string;
    documentId: number;
    documentNo: string;
    documentTypeLabel: string;
    quantity: number;
    issuedAt: string;
    jumpPath: string;
  }>;
}>;

type CuttingReportQueryParams = {
  page?: number;
  pageSize?: number;
  orderKeyword?: string;
  styleKeyword?: string;
  cutterKeyword?: string;
  remarkKeyword?: string;
  startDate?: string;
  endDate?: string;
};

type QualityInspectionExportParams = {
  keyword?: string;
  inspectorId?: string;
  workOrderId?: string;
  status?: QualityInspectionStatus | 'all';
  startDate?: string;
  endDate?: string;
};

type TicketRecordExportParams = {
  lotId: string;
  keyword?: string;
};

const adaptCuttingDataset = (payload: CuttingDatasetPayload): CuttingTaskDataset => ({
  summary: payload.summary ?? [],
  list: payload.list ?? [],
  total: payload.total ?? 0,
  page: payload.page ?? 1,
  pageSize: payload.pageSize ?? (payload.list?.length ?? 0),
});

const adaptCuttingReport = (payload: CuttingReportPayload): CuttingReportDataset => ({
  list: payload.list ?? [],
  total: payload.total ?? 0,
  summary: payload.summary ?? { cuttingQuantity: 0, ticketQuantity: 0 },
  page: payload.page ?? 1,
  pageSize: payload.pageSize ?? (payload.list?.length ?? 0),
});

const adaptCuttingSheetDetail = (payload: CuttingSheetDetailPayload): CuttingSheetDetail => ({
  workOrderId: Number(payload.workOrderId ?? 0),
  productionOrderId: Number(payload.productionOrderId ?? 0),
  styleId: Number.isFinite(Number(payload.styleId)) ? Number(payload.styleId) : undefined,
  orderCode: payload.orderCode ?? '',
  styleCode: payload.styleCode,
  styleName: payload.styleName,
  customer: payload.customer,
  status: payload.status ?? 'NOT_STARTED',
  bedNumber: payload.bedNumber,
  cutterId: payload.cutterId,
  plannedFabricQty: payload.plannedFabricQty,
  warehouseId: payload.warehouseId,
  warehouseName: payload.warehouseName,
  materialId: payload.materialId,
  materialCode: payload.materialCode,
  materialName: payload.materialName,
  materialUnit: payload.materialUnit,
  startActualFabricQty: payload.startActualFabricQty,
  completeActualFabricQty: payload.completeActualFabricQty,
  startedAt: payload.startedAt,
  completedAt: payload.completedAt,
  plannedQty: Number(payload.plannedQty ?? 0),
  completedQty: Number(payload.completedQty ?? 0),
  sizes: payload.sizes ?? [],
  rows: (payload.rows ?? []).map((row) => ({
    color: row.color,
    cells: (row.cells ?? []).map((cell) => ({
      size: cell.size,
      orderedQty: Number(cell.orderedQty ?? 0),
      completedQty: Number(cell.completedQty ?? 0),
      pendingQty: Number(cell.pendingQty ?? 0),
    })),
    orderedSubtotal: Number(row.orderedSubtotal ?? 0),
    completedSubtotal: Number(row.completedSubtotal ?? 0),
    pendingSubtotal: Number(row.pendingSubtotal ?? 0),
  })),
  bedRecords: (payload.bedRecords ?? []).map((record) => ({
    bedNumber: record.bedNumber ?? '-',
    recordedAt: record.recordedAt,
    actualFabricQty: Number.isFinite(Number(record.actualFabricQty))
      ? Number(record.actualFabricQty)
      : undefined,
    totalQty: Number(record.totalQty ?? 0),
    items: (record.items ?? []).map((item) => ({
      color: item.color ?? '-',
      size: item.size ?? '-',
      quantity: Number(item.quantity ?? 0),
    })),
  })),
  materialDocuments: (payload.materialDocuments ?? []).map((doc) => ({
    documentCategory: doc.documentCategory ?? 'ISSUE',
    documentId: Number(doc.documentId ?? 0),
    documentNo: doc.documentNo ?? '',
    documentTypeLabel: doc.documentTypeLabel ?? '',
    quantity: Number(doc.quantity ?? 0),
    issuedAt: doc.issuedAt,
    jumpPath: doc.jumpPath,
  })),
});

const adaptDashboard = (payload: PieceworkDashboardPayload): PieceworkDashboardDataset => ({
  metrics: payload.metrics ?? [],
  cuttingTrend: payload.cuttingTrend ?? [],
  capacityComparison: payload.capacityComparison ?? [],
  completionSlices: payload.completionSlices ?? [],
  capacityTrend: payload.capacityTrend ?? [],
  overdueOrders: payload.overdueOrders ?? [],
});

const adaptWorkshopProgress = (
  payload: WorkshopProgressPayload,
  fallbackPage: number,
  fallbackSize: number,
): WorkshopProgressDataset => ({
  summary:
    payload.summary ??
    {
      totalOrders: 0,
      delayedOrders: 0,
      completedOrders: 0,
      inProductionOrders: 0,
    },
  orders: payload.orders ?? [],
  total: payload.total ?? (payload.orders?.length ?? 0),
  page: (payload.page ?? Math.max(fallbackPage - 1, 0)) + 1,
  pageSize: payload.pageSize ?? fallbackSize,
});

const adaptQualityRecord = (payload: QualityRecordPayload): QualityControlRecord => ({
  id: String(payload.id ?? ''),
  workOrderId: payload.workOrderId != null ? String(payload.workOrderId) : '',
  qcDate: payload.qcDate ?? '',
  orderNumber: payload.orderNumber ?? '-',
  styleNumber: payload.styleNumber ?? '-',
  styleName: payload.styleName ?? '-',
  processName: payload.processName ?? '-',
  ticketNo: payload.ticketNo ?? '-',
  worker: payload.worker ?? '-',
  inspectedQty: Number(payload.inspectedQty ?? 0),
  passedQty: Number(payload.passedQty ?? 0),
  failedQty: Number(payload.failedQty ?? 0),
  defectReason: payload.defectReason ?? '',
  disposition: payload.disposition ?? 'accepted',
  inspector: payload.inspector ?? '-',
  inspectorId: payload.inspectorId != null ? String(payload.inspectorId) : undefined,
  exceptionStatus: (payload.exceptionStatus as QualityControlRecord['exceptionStatus']) ?? 'none',
  exceptionNote: payload.exceptionNote ?? undefined,
  exceptionHandledBy: payload.exceptionHandledBy
    ? String(payload.exceptionHandledBy)
    : undefined,
  exceptionHandledAt: payload.exceptionHandledAt ?? undefined,
});

const adaptQualityExceptionLog = (
  payload: QualityExceptionLogPayload,
): QualityExceptionLog => ({
  id: String(payload.id ?? ''),
  status: (payload.status as QualityExceptionStatus) ?? 'pending',
  note: payload.note ?? undefined,
  handledBy: payload.handledBy ? String(payload.handledBy) : undefined,
  handledByName: payload.handledByName ?? undefined,
  createdAt: payload.createdAt ?? undefined,
});

const adaptSalaryScanStatistics = (payload: SalaryScanStatisticsPayload): SalaryScanStatistics => ({
  summary: {
    totalTickets: Number(payload.summary?.totalTickets ?? 0),
    totalQuantity: Number(payload.summary?.totalQuantity ?? 0),
    settledAmount: Number(payload.summary?.settledAmount ?? 0),
    unsettledAmount: Number(payload.summary?.unsettledAmount ?? 0),
    totalAmount: Number(payload.summary?.totalAmount ?? 0),
  },
  topEmployees: (payload.topEmployees ?? []).map((item) => ({
    employeeId: String(item.employeeId ?? ''),
    employeeName: item.employeeName ?? '-',
    department: item.department ?? '计件工序',
    ticketCount: Number(item.ticketCount ?? 0),
    totalQuantity: Number(item.totalQuantity ?? 0),
    totalAmount: Number(item.totalAmount ?? 0),
    unsettledAmount: Number(item.unsettledAmount ?? 0),
  })),
  topProcesses: (payload.topProcesses ?? []).map((item) => ({
    processId: item.processId ? String(item.processId) : undefined,
    processName: item.processName ?? '计件工序',
    ticketCount: Number(item.ticketCount ?? 0),
    totalQuantity: Number(item.totalQuantity ?? 0),
    totalAmount: Number(item.totalAmount ?? 0),
  })),
  trend: (payload.trend ?? []).map((item) => ({
    date: item.date,
    totalQuantity: Number(item.totalQuantity ?? 0),
    totalAmount: Number(item.totalAmount ?? 0),
  })),
});

const adaptSalaryTicketDetailRecord = (
  payload: SalaryTicketDetailApiRecord,
): SalaryTicketDetailResponse['list'][number] => ({
  employeeId: String(payload.employeeId ?? ''),
  employeeName: payload.employeeName ?? '-',
  department: payload.department ?? '计件工序',
  ticketCount: Number(payload.ticketCount ?? 0),
  totalQuantity: Number(payload.totalQuantity ?? 0),
  settledAmount: Number(payload.settledAmount ?? 0),
  unsettledAmount: Number(payload.unsettledAmount ?? 0),
  totalAmount: Number(payload.totalAmount ?? 0),
  lastScanAt: payload.lastScanAt ?? undefined,
});

const adaptSalaryTicketRecord = (payload: SalaryTicketApiRecord): SalaryTicketRecord => ({
  id: String(payload.ticketId ?? payload.ticketNo ?? ''),
  ticketNo: payload.ticketNo ?? '-',
  processName: payload.processName ?? '-',
  recordedAt: payload.recordedAt ?? '',
  status: payload.status ?? 'PENDING',
  quantity: Number(payload.quantity ?? 0),
  pieceRate: Number(payload.pieceRate ?? 0),
  amount: Number(payload.amount ?? 0),
  workOrderId: payload.workOrderId ?? undefined,
  productionOrderId: payload.productionOrderId ?? undefined,
});

export const pieceworkService = {
  async getDashboard(): Promise<PieceworkDashboardDataset> {
    const tenantId = ensureTenantId();
    const { data } = await http.get('/api/v1/workshop/piecework-dashboard', {
      params: { tenantId },
    });
    return adaptDashboard(data);
  },

  async getCuttingPending(params?: CuttingTaskQueryParams): Promise<CuttingTaskDataset> {
    const tenantId = ensureTenantId();
    const { data } = await http.get('/api/v1/workshop/cutting/pending', {
      params: {
        tenantId,
        keyword: normalizeKeyword(params?.keyword),
        includeCompleted: params?.includeCompleted,
        page: normalizePage(params?.page),
        size: params?.pageSize ?? 10,
        startDate: params?.startDate,
        endDate: params?.endDate,
        includeSummary: params?.includeSummary,
      },
    });
    return adaptCuttingDataset(data);
  },

  async createCuttingTasks(tasks: CuttingTaskCreateItem[]): Promise<void> {
    const tenantId = ensureTenantId();
    await http.post(
      '/api/v1/cutting-tasks',
      {
        tasks: tasks.map((task) => ({
          workOrderId: task.workOrderId,
          bedNumber: task.bedNumber,
          color: task.color,
          size: task.size,
          quantity: task.quantity,
          cutAt: task.cutAt,
          cutterId: task.cutterId,
          remark: task.remark,
        })),
      },
      { params: { tenantId } },
    );
  },

  async getCuttingCompleted(params?: CuttingTaskQueryParams): Promise<CuttingTaskDataset> {
    const tenantId = ensureTenantId();
    const { data } = await http.get('/api/v1/workshop/cutting/completed', {
      params: {
        tenantId,
        keyword: normalizeKeyword(params?.keyword),
        page: normalizePage(params?.page),
        size: params?.pageSize ?? 10,
        startDate: params?.startDate,
        endDate: params?.endDate,
        includeSummary: params?.includeSummary,
      },
    });
    return adaptCuttingDataset(data);
  },

  async getCuttingSheetDetail(workOrderId: number): Promise<CuttingSheetDetail> {
    const tenantId = ensureTenantId();
    const { data } = await http.get(`/api/v1/workshop/cutting/sheets/${workOrderId}`, {
      params: { tenantId },
    });
    return adaptCuttingSheetDetail(data);
  },

  async startCuttingSheet(
    workOrderId: number,
    payload: {
      bedNumber: string;
      cutterId?: number;
      plannedFabricQty: number;
      actualFabricQty?: number;
      warehouseId?: number;
      materialId?: number;
      materialUnit?: string;
    },
  ): Promise<void> {
    const tenantId = ensureTenantId();
    await http.post(`/api/v1/workshop/cutting/sheets/${workOrderId}/start`, payload, {
      params: { tenantId },
    });
  },

  async completeCuttingSheet(
    workOrderId: number,
    payload: {
      actualFabricQty: number;
      items?: Array<{ color: string; size: string; quantity: number }>;
    },
  ): Promise<void> {
    const tenantId = ensureTenantId();
    await http.post(`/api/v1/workshop/cutting/sheets/${workOrderId}/complete`, payload, {
      params: { tenantId },
    });
  },

  async recordCuttingSheetBed(
    workOrderId: number,
    payload: {
      bedNumber: string;
      actualFabricQty: number;
      items: Array<{ color: string; size: string; quantity: number }>;
    },
  ): Promise<void> {
    const tenantId = ensureTenantId();
    await http.post(`/api/v1/workshop/cutting/sheets/${workOrderId}/beds`, payload, {
      params: { tenantId },
    });
  },

  async getCuttingReport(params?: CuttingReportQueryParams): Promise<CuttingReportDataset> {
    const tenantId = ensureTenantId();
    const { data } = await http.get('/api/v1/workshop/cutting/report', {
      params: {
        tenantId,
        orderKeyword: normalizeKeyword(params?.orderKeyword),
        styleKeyword: normalizeKeyword(params?.styleKeyword),
        cutterKeyword: normalizeKeyword(params?.cutterKeyword),
        remarkKeyword: normalizeKeyword(params?.remarkKeyword),
        startDate: params?.startDate,
        endDate: params?.endDate,
        page: normalizePage(params?.page),
        size: params?.pageSize ?? 10,
      },
    });
    return adaptCuttingReport(data);
  },

  async getWorkshopProgress(params?: {
    page?: number;
    pageSize?: number;
    keyword?: string;
    includeCompleted?: boolean;
    includeSummary?: boolean;
  }): Promise<WorkshopProgressDataset> {
    const tenantId = ensureTenantId();
    const page = params?.page ?? 1;
    const pageSize = params?.pageSize ?? 10;
    const keyword = params?.keyword?.trim();
    const includeCompleted = params?.includeCompleted ?? false;
    const includeSummary = params?.includeSummary ?? true;
    const { data } = await http.get<WorkshopProgressPayload>('/api/v1/workshop/dashboard', {
      params: {
        tenantId,
        page,
        size: pageSize,
        keyword: keyword || undefined,
        includeCompleted: includeCompleted || undefined,
      },
    });
    let summaryPayload: WorkshopProgressDataset['summary'] | undefined;
    if (includeSummary) {
      const { data: summary } = await http.get<WorkshopProgressDataset['summary']>(
        '/api/v1/workshop/dashboard/summary',
        {
          params: {
            tenantId,
            keyword: keyword || undefined,
            includeCompleted: includeCompleted || undefined,
          },
        },
      );
      summaryPayload = summary;
    }
    const mergedPayload: WorkshopProgressPayload = summaryPayload
      ? { ...data, summary: summaryPayload }
      : data;
    return adaptWorkshopProgress(mergedPayload, page, pageSize);
  },

  async getSalaryMeta(): Promise<SalaryMeta> {
    const tenantId = ensureTenantId();
    const { data } = await http.get('/api/v1/workshop/payroll/overview/meta', {
      params: { tenantId },
    });
    return {
      departmentOptions: data.departments ?? [],
      defaultRange: { start: data.defaultStart, end: data.defaultEnd },
    } as SalaryMeta;
  },

  async getSalaryList(params: SalaryListParams): Promise<SalaryListResponse> {
    const tenantId = ensureTenantId();
    const { startDate, endDate, page, pageSize, department, keyword } = params;
    const normalizedPage = normalizePage(page);
    const { data } = await http.get<SalaryListApiResponse>('/api/v1/workshop/payroll/overview/employees', {
      params: {
        tenantId,
        startDate,
        endDate,
        department,
        keyword,
        page: normalizedPage,
        size: pageSize,
      },
    });
    const records: SalaryEmployeeRecord[] = (data.list ?? []).map((item) => ({
      id: String(item.id),
      name: item.name,
      department: item.department ?? '计件工序',
      settledAmount: Number(item.settledAmount),
      unsettledAmount: Number(item.unsettledAmount),
      otherAmount: Number(item.otherAmount),
      totalAmount: Number(item.totalAmount),
      lastSettlementDate: item.lastSettlementDate,
    }));
    return {
      list: records,
      total: data.total ?? 0,
      summary: {
        settledAmount: Number(data.summary?.settledAmount ?? 0),
        unsettledAmount: Number(data.summary?.unsettledAmount ?? 0),
        otherAmount: Number(data.summary?.otherAmount ?? 0),
        totalAmount: Number(data.summary?.totalAmount ?? 0),
        settledCount: Number(data.summary?.settledCount ?? 0),
        unsettledCount: Number(data.summary?.unsettledCount ?? 0),
      },
    };
  },

  async getSalaryTickets(params: SalaryTicketListParams): Promise<SalaryTicketListResponse> {
    const tenantId = ensureTenantId();
    const { employeeId, startDate, endDate, page, pageSize, status, keyword } = params;
    const normalizedStatus = !status || status === 'all' ? undefined : status;
    const { data } = await http.get<SalaryTicketApiResponse>(
      `/api/v1/workshop/payroll/overview/employees/${employeeId}/tickets`,
      {
        params: {
          tenantId,
          startDate,
          endDate,
          status: normalizedStatus,
          keyword: keyword?.trim() || undefined,
          page: normalizePage(page),
          size: pageSize,
        },
      },
    );
    const list = (data.list ?? []).map(adaptSalaryTicketRecord);
    const summary: SalaryTicketSummary = {
      totalQuantity: Number(data.summary?.totalQuantity ?? 0),
      settledAmount: Number(data.summary?.settledAmount ?? 0),
      unsettledAmount: Number(data.summary?.unsettledAmount ?? 0),
      totalAmount: Number(data.summary?.totalAmount ?? 0),
    };
    return {
      list,
      total: data.total ?? 0,
      page: (data.page ?? 0) + 1,
      pageSize: data.size ?? pageSize,
      summary,
    };
  },

  async getPayrollScanStatistics(
    params: SalaryScanStatisticsParams,
  ): Promise<SalaryScanStatistics> {
    const tenantId = ensureTenantId();
    const { data } = await http.get<SalaryScanStatisticsPayload>(
      '/api/v1/workshop/payroll/overview/scan-statistics',
      {
        params: {
          tenantId,
          startDate: params.startDate,
          endDate: params.endDate,
          department: params.department?.trim() || undefined,
          keyword: params.keyword?.trim() || undefined,
        },
      },
    );
    return adaptSalaryScanStatistics(data ?? {});
  },

  async getPayrollTicketDetails(
    params: SalaryTicketDetailParams,
  ): Promise<SalaryTicketDetailResponse> {
    const tenantId = ensureTenantId();
    const { data } = await http.get<SalaryTicketDetailApiResponse>(
      '/api/v1/workshop/payroll/overview/tickets/detail',
      {
        params: {
          tenantId,
          startDate: params.startDate,
          endDate: params.endDate,
          department: params.department?.trim() || undefined,
          keyword: params.keyword?.trim() || undefined,
          page: normalizePage(params.page),
          size: params.pageSize,
        },
      },
    );
    const list = (data.list ?? []).map(adaptSalaryTicketDetailRecord);
    return {
      list,
      total: data.total ?? 0,
      page: (data.page ?? 0) + 1,
      pageSize: data.size ?? params.pageSize,
    };
  },

  async settlePayroll(payload: SalarySettlePayload): Promise<void> {
    const tenantId = ensureTenantId();
    await http.post('/api/v1/workshop/payroll/overview/settle', payload, {
      params: { tenantId },
    });
  },

  async batchAdjustSalary(payload: SalaryBatchAdjustPayload): Promise<void> {
    const tenantId = ensureTenantId();
    await http.post('/api/v1/workshop/payroll/overview/adjustments', payload, {
      params: { tenantId },
    });
  },

  async sendPayslips(payload: SalaryPayslipSendPayload): Promise<SalaryPayslipSendResult> {
    const tenantId = ensureTenantId();
    const { data } = await http.post('/api/v1/workshop/payroll/overview/payslips/send', payload, {
      params: { tenantId },
    });
    const records: SalaryPayslipRecord[] = (data.records ?? []).map((item: SalaryPayslipApiRecord) => ({
      employeeId: String(item.employeeId),
      employeeName: item.employeeName,
      settledAmount: Number(item.settledAmount ?? 0),
      unsettledAmount: Number(item.unsettledAmount ?? 0),
      adjustmentAmount: Number(item.adjustmentAmount ?? 0),
      totalAmount: Number(item.totalAmount ?? 0),
    }));
    return {
      sentCount: Number(data.sentCount ?? records.length),
      records,
    };
  },

  async getPayslipLogs(
    params: SalaryPayslipLogListParams,
  ): Promise<SalaryPayslipLogResponse> {
    const tenantId = ensureTenantId();
    const { data } = await http.get<SalaryPayslipLogApiResponse>(
      '/api/v1/workshop/payroll/overview/payslips',
      {
        params: {
          tenantId,
          startDate: params.startDate,
          endDate: params.endDate,
          status: params.status && params.status !== 'all' ? params.status : undefined,
          keyword: params.keyword?.trim() || undefined,
          page: normalizePage(params.page),
          size: params.pageSize,
        },
      },
    );
    const list: SalaryPayslipLogRecord[] = (data.list ?? []).map((item: SalaryPayslipLogApiRecord) => ({
      id: String(item.id ?? ''),
      employeeId: String(item.employeeId ?? ''),
      employeeName: item.employeeName ?? '-',
      startDate: item.startDate ?? '',
      endDate: item.endDate ?? '',
      settledAmount: Number(item.settledAmount ?? 0),
      unsettledAmount: Number(item.unsettledAmount ?? 0),
      adjustmentAmount: Number(item.adjustmentAmount ?? 0),
      totalAmount: Number(item.totalAmount ?? 0),
      status: (item.status ?? 'SENT') as SalaryPayslipLogRecord['status'],
      message: item.message ?? undefined,
      requestedBy: item.requestedBy ? String(item.requestedBy) : undefined,
      requestedByName: item.requestedByName ?? undefined,
      sentAt: item.sentAt ?? undefined,
    }));
    return {
      list,
      total: data.total ?? 0,
      page: (data.page ?? 0) + 1,
      pageSize: data.size ?? params.pageSize,
    };
  },

  async getQualityList(params: QualityControlListParams): Promise<QualityControlListResponse> {
    const tenantId = ensureTenantId();
    const { page, pageSize, startDate, endDate, keyword, inspectorId, status, workOrderId } = params;
    const normalizedPage = normalizePage(page);
    const normalizedWorkOrderId = workOrderId ? Number(workOrderId) : undefined;
    const normalizedInspectorId = inspectorId ? Number(inspectorId) : undefined;
    const normalizedStatus = status && status !== 'all' ? status : undefined;
    const { data } = await http.get('/api/v1/quality-inspections', {
      params: {
        tenantId,
        startDate,
        endDate,
        keyword,
        status: normalizedStatus,
        workOrderId: Number.isFinite(normalizedWorkOrderId) ? normalizedWorkOrderId : undefined,
        inspectorId: Number.isFinite(normalizedInspectorId) ? normalizedInspectorId : undefined,
        page: normalizedPage,
        size: pageSize,
      },
    });
    return {
      list: (data.list ?? []).map(adaptQualityRecord),
      total: data.total ?? 0,
      page: (data.page ?? 0) + 1,
      pageSize: data.size ?? pageSize,
      summary: data.summary ?? { inspectedQty: 0, passedQty: 0, failedQty: 0, reworkQty: 0 },
    };
  },

  async getQualityMeta(): Promise<QualityControlMeta> {
    const tenantId = ensureTenantId();
    const { data } = await http.get<{
      statusOptions?: QualityStatusOptionResponse[];
      inspectorOptions?: QualityInspectorOptionResponse[];
      defaultStatus?: QualityControlMeta['defaultStatus'];
    }>('/api/v1/quality-inspections/meta', {
      params: { tenantId },
    });
    const statusOptions = (data.statusOptions ?? []).map((option) => ({
      label: option.label,
      value: option.value,
    }));
    const inspectorOptions = (data.inspectorOptions ?? []).map((option) => ({
      label: option.name,
      value: option.id ? String(option.id) : '',
    }));
    return {
      statusOptions,
      inspectorOptions,
      defaultStatus: data.defaultStatus ?? 'all',
    } as QualityControlMeta;
  },

  async getOrderProgress(params: OrderProgressDetailsListParams): Promise<OrderProgressDetailsListResponse> {
    const tenantId = ensureTenantId();
    const { page, pageSize, orderDateStart, orderDateEnd, keyword } = params;
    const { data } = await http.get('/api/v1/workshop/reports/order-progress', {
      params: {
        tenantId,
        startDate: orderDateStart,
        endDate: orderDateEnd,
        keyword: normalizeKeyword(keyword),
        page: normalizePage(page),
        size: pageSize,
      },
    });
    return { list: data.list ?? [], total: data.total ?? 0 };
  },

  async exportOrderProgress(
    params: Pick<OrderProgressDetailsListParams, 'orderDateStart' | 'orderDateEnd' | 'keyword'> & { maxRows?: number },
  ): Promise<{ fileUrl: string }> {
    const tenantId = ensureTenantId();
    const response = await http.post<{ fileUrl: string }>(
      '/api/v1/workshop/reports/order-progress/export',
      {
        startDate: params.orderDateStart,
        endDate: params.orderDateEnd,
        keyword: normalizeKeyword(params.keyword),
        maxRows: params.maxRows,
      },
      { params: { tenantId } },
    );
    return response.data;
  },

  async getTicketLots(params: OrderTicketLotListParams): Promise<OrderTicketLotListResponse> {
    const tenantId = ensureTenantId();
    const { data } = await http.get('/api/v1/workshop/reports/ticket-lots', {
      params: {
        tenantId,
        keyword: params.keyword,
        page: params.page,
        size: params.pageSize,
      },
    });
    return { list: data.list ?? [], total: data.total ?? 0 };
  },

  async getTicketRecords(params: OrderTicketRecordListParams): Promise<OrderTicketRecordListResponse> {
    const tenantId = ensureTenantId();
    const { data } = await http.get('/api/v1/workshop/reports/ticket-records', {
      params: { tenantId, lotId: params.lotId },
    });
    return {
      list: data.list ?? [],
      total: data.total ?? 0,
      summary: data.summary ?? { quantity: 0, amount: 0 },
    };
  },

  async getProcessComparison(params: ProcessProductionListParams): Promise<ProcessProductionListResponse> {
    const tenantId = ensureTenantId();
    const { data } = await http.get('/api/v1/workshop/reports/process-comparison', {
      params: {
        tenantId,
        startDate: params.startDate,
        endDate: params.endDate,
        keyword: params.keyword,
        page: params.page,
        size: params.pageSize,
      },
    });
    return {
      list: data.list ?? [],
      total: data.total ?? 0,
      inventoryQuantity: data.inventoryQuantity ?? 0,
    };
  },

  async getSequentialProcesses(
    params: SequentialProcessListParams,
  ): Promise<SequentialProcessListResponse> {
    const tenantId = ensureTenantId();
    const { data } = await http.get('/api/v1/workshop/reports/sequential-processes', {
      params: {
        tenantId,
        startDate: params.startDate,
        endDate: params.endDate,
        keyword: params.keyword,
        status: params.status,
        page: normalizePage(params.page),
        size: params.pageSize,
      },
    });
    return {
      list: data.list ?? [],
      total: data.total ?? 0,
    };
  },

  async exportSequentialProcesses(
    params: SequentialProcessExportParams,
  ): Promise<{ fileUrl: string }> {
    const tenantId = ensureTenantId();
    const response = await http.post<{ fileUrl: string }>(
      '/api/v1/workshop/reports/sequential-processes/export',
      {
        keyword: normalizeKeyword(params.keyword),
        startDate: params.startDate,
        endDate: params.endDate,
        status: params.status,
      },
      { params: { tenantId } },
    );
    return response.data;
  },

  async getReportDownloads(
    params: ReportDownloadListParams,
  ): Promise<ReportDownloadListResponse> {
    const tenantId = ensureTenantId();
    const { data } = await http.get('/api/v1/workshop/reports/downloads', {
      params: {
        tenantId,
        reportType: params.reportType && params.reportType !== 'ALL' ? params.reportType : undefined,
        status: params.status && params.status !== 'all' ? params.status : undefined,
        keyword: params.keyword?.trim() || undefined,
        startDate: params.startDate,
        endDate: params.endDate,
        page: normalizePage(params.page),
        size: params.pageSize,
      },
    });
    const list: ReportDownloadRecord[] = (data.list ?? []).map((item: Record<string, unknown>) => ({
      id: item.id != null ? String(item.id) : '',
      reportType: (item.reportType ?? 'ORDER_PROGRESS') as ReportDownloadRecord['reportType'],
      status: (item.status ?? 'COMPLETED') as ReportDownloadRecord['status'],
      fileUrl: typeof item.fileUrl === 'string' ? item.fileUrl : undefined,
      filters: typeof item.filters === 'string' ? item.filters : undefined,
      message: typeof item.message === 'string' ? item.message : undefined,
      requestedBy: item.requestedBy != null ? String(item.requestedBy) : undefined,
      requestedByName: typeof item.requestedByName === 'string' ? item.requestedByName : undefined,
      requestedAt: typeof item.requestedAt === 'string' ? item.requestedAt : undefined,
    }));
    return {
      list,
      total: data.total ?? 0,
      page: (data.page ?? 0) + 1,
      pageSize: data.size ?? params.pageSize,
    };
  },

  async exportCuttingReport(
    params: CuttingReportExportParams,
  ): Promise<{ fileUrl: string }> {
    const tenantId = ensureTenantId();
    const response = await http.post<{ fileUrl: string }>(
      '/api/v1/workshop/cutting/report/export',
      params,
      { params: { tenantId } },
    );
    return response.data;
  },

  async exportQualityInspections(
    params: QualityInspectionExportParams,
  ): Promise<{ fileUrl: string }> {
    const tenantId = ensureTenantId();
    const normalizedStatus = params.status && params.status !== 'all' ? params.status : undefined;
    const normalizedWorkOrderId = params.workOrderId ? Number(params.workOrderId) : undefined;
    const response = await http.post<{ fileUrl: string }>(
      '/api/v1/quality-inspections/export',
      {
        keyword: params.keyword,
        inspectorId: params.inspectorId ? Number(params.inspectorId) : undefined,
        workOrderId: Number.isFinite(normalizedWorkOrderId) ? normalizedWorkOrderId : undefined,
        status: normalizedStatus,
        startDate: params.startDate,
        endDate: params.endDate,
      },
      { params: { tenantId } },
    );
    return response.data;
  },

  async createQualityInspection(payload: QualityControlCreatePayload): Promise<void> {
    const tenantId = ensureTenantId();
    await http.post(
      '/api/v1/quality-inspections',
      {
        workOrderId: Number(payload.workOrderId),
        inspectorId: Number(payload.inspectorId),
        qcDate: payload.qcDate,
        inspectedQty: payload.inspectedQty,
        passedQty: payload.passedQty,
        failedQty: payload.failedQty,
        defectReason: payload.defectReason,
        disposition: payload.disposition?.toUpperCase(),
      },
      { params: { tenantId } },
    );
  },

  async getQualityDetail(inspectionId: string): Promise<QualityControlRecord> {
    const tenantId = ensureTenantId();
    const { data } = await http.get(`/api/v1/quality-inspections/${inspectionId}`, {
      params: { tenantId },
    });
    return adaptQualityRecord(data);
  },

  async resolveQualityException(
    inspectionId: string,
    payload: QualityExceptionResolvePayload,
  ): Promise<QualityControlRecord> {
    const tenantId = ensureTenantId();
    const { data } = await http.post(
      `/api/v1/quality-inspections/${inspectionId}/resolve`,
      { note: payload.note },
      { params: { tenantId } },
    );
    return adaptQualityRecord(data);
  },

  async getQualityExceptionLogs(inspectionId: string): Promise<QualityExceptionLog[]> {
    const tenantId = ensureTenantId();
    const { data } = await http.get(`/api/v1/quality-inspections/${inspectionId}/logs`, {
      params: { tenantId },
    });
    const list = Array.isArray(data) ? data : [];
    return list.map((item: QualityExceptionLogPayload) => adaptQualityExceptionLog(item));
  },

  async exportTicketRecords(
    params: TicketRecordExportParams,
  ): Promise<{ fileUrl: string }> {
    const tenantId = ensureTenantId();
    const response = await http.post<{ fileUrl: string }>(
      '/api/v1/workshop/reports/ticket-records/export',
      {
        lotId: Number(params.lotId),
        keyword: params.keyword,
      },
      { params: { tenantId } },
    );
    return response.data;
  },
};
