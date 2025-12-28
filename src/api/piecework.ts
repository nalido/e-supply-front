import { apiConfig } from './config';
import http from './http';
import { tenantStore } from '../stores/tenant';
import type {
  PieceworkDashboardDataset,
  CuttingTaskDataset,
  CuttingReportDataset,
  WorkshopProgressDataset,
} from '../types';
import type {
  SalaryEmployeeRecord,
  SalaryListParams,
  SalaryListResponse,
  SalaryMeta,
  SalarySettlePayload,
} from '../types/salary-management';
import type {
  QualityControlListParams,
  QualityControlListResponse,
  QualityControlMeta,
  QualityControlRecord,
} from '../types/quality-control-management';
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
import {
  fetchPieceworkDashboardDataset,
  fetchCuttingPendingDataset,
  fetchCuttingCompletedDataset,
  fetchCuttingReportDataset,
  fetchWorkshopProgressDataset,
} from '../mock';
import {
  qualityControlManagementService,
  salaryManagementService,
  orderProgressDetailsReportService,
  orderTicketDetailsReportService,
  processProductionComparisonReportService,
} from './mock';

const useMock = apiConfig.useMock;

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

type CuttingDatasetPayload = Partial<{
  summary: CuttingTaskDataset['summary'];
  list: CuttingTaskDataset['list'];
  total: number;
}>;

type CuttingReportPayload = Partial<{
  list: CuttingReportDataset['list'];
  total: number;
  summary: CuttingReportDataset['summary'];
}>;

type PieceworkDashboardPayload = Partial<PieceworkDashboardDataset>;

type WorkshopProgressPayload = Partial<WorkshopProgressDataset>;

type QualityRecordPayload = Partial<{
  id: string | number;
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

type QualityInspectionExportParams = {
  keyword?: string;
  inspectorId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
};

type TicketRecordExportParams = {
  lotId: string;
  keyword?: string;
};

type MockProcessLot = {
  orderNumber: string;
  styleNumber: string;
  styleName: string;
  quantity: number;
};

const adaptCuttingDataset = (payload: CuttingDatasetPayload): CuttingTaskDataset => ({
  summary: payload.summary ?? [],
  list: payload.list ?? [],
  total: payload.total ?? 0,
});

const adaptCuttingReport = (payload: CuttingReportPayload): CuttingReportDataset => ({
  list: payload.list ?? [],
  total: payload.total ?? 0,
  summary: payload.summary ?? { cuttingQuantity: 0, ticketQuantity: 0 },
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
  pageSize: payload.size ?? fallbackSize,
});

const adaptQualityRecord = (payload: QualityRecordPayload): QualityControlRecord => ({
  id: String(payload.id ?? ''),
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
});

export const pieceworkService = {
  async getDashboard(): Promise<PieceworkDashboardDataset> {
    if (useMock) {
      return fetchPieceworkDashboardDataset();
    }
    const tenantId = ensureTenantId();
    const { data } = await http.get('/api/v1/workshop/piecework-dashboard', {
      params: { tenantId },
    });
    return adaptDashboard(data);
  },

  async getCuttingPending(): Promise<CuttingTaskDataset> {
    if (useMock) {
      return fetchCuttingPendingDataset();
    }
    const tenantId = ensureTenantId();
    const { data } = await http.get('/api/v1/workshop/cutting/pending', {
      params: { tenantId },
    });
    return adaptCuttingDataset(data);
  },

  async getCuttingCompleted(): Promise<CuttingTaskDataset> {
    if (useMock) {
      return fetchCuttingCompletedDataset();
    }
    const tenantId = ensureTenantId();
    const { data } = await http.get('/api/v1/workshop/cutting/completed', {
      params: { tenantId },
    });
    return adaptCuttingDataset(data);
  },

  async getCuttingReport(): Promise<CuttingReportDataset> {
    if (useMock) {
      return fetchCuttingReportDataset();
    }
    const tenantId = ensureTenantId();
    const { data } = await http.get('/api/v1/workshop/cutting/report', {
      params: { tenantId },
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
    if (useMock) {
      return fetchWorkshopProgressDataset();
    }
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
    if (useMock) {
      return salaryManagementService.getMeta();
    }
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
    if (useMock) {
      return salaryManagementService.getList(params);
    }
    const tenantId = ensureTenantId();
    const { startDate, endDate, page, pageSize, department, keyword } = params;
    const { data } = await http.get<SalaryListApiResponse>('/api/v1/workshop/payroll/overview/employees', {
      params: {
        tenantId,
        startDate,
        endDate,
        department,
        keyword,
        page,
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

  async settlePayroll(payload: SalarySettlePayload): Promise<void> {
    if (useMock) {
      await salaryManagementService.settle(payload);
      return;
    }
    const tenantId = ensureTenantId();
    await http.post('/api/v1/workshop/payroll/overview/settle', payload, {
      params: { tenantId },
    });
  },

  async getQualityList(params: QualityControlListParams): Promise<QualityControlListResponse> {
    if (useMock) {
      return qualityControlManagementService.getList(params);
    }
    const tenantId = ensureTenantId();
    const { page, pageSize, startDate, endDate, keyword, inspector, status } = params;
    const { data } = await http.get('/api/v1/quality-inspections', {
      params: {
        tenantId,
        startDate,
        endDate,
        keyword,
        status,
        inspectorId: inspector,
        page,
        size: pageSize,
      },
    });
    return {
      list: (data.list ?? []).map(adaptQualityRecord),
      total: data.total ?? 0,
      summary: data.summary ?? { inspectedQty: 0, passedQty: 0, failedQty: 0, reworkQty: 0 },
    };
  },

  async getQualityMeta(): Promise<QualityControlMeta> {
    if (useMock) {
      return qualityControlManagementService.getMeta();
    }
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
    if (useMock) {
      return orderProgressDetailsReportService.getList(params);
    }
    const tenantId = ensureTenantId();
    const { page, pageSize, orderDateStart, orderDateEnd, keyword } = params;
    const { data } = await http.get('/api/v1/workshop/reports/order-progress', {
      params: {
        tenantId,
        startDate: orderDateStart,
        endDate: orderDateEnd,
        keyword,
        page,
        size: pageSize,
      },
    });
    return { list: data.list ?? [], total: data.total ?? 0 };
  },

  async getTicketLots(params: OrderTicketLotListParams): Promise<OrderTicketLotListResponse> {
    if (useMock) {
      return orderTicketDetailsReportService.getLots(params);
    }
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
    if (useMock) {
      return orderTicketDetailsReportService.getRecords(params);
    }
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
    if (useMock) {
      const mockLots = await processProductionComparisonReportService.getLots({
        page: params.page,
        pageSize: params.pageSize,
        keyword: params.keyword,
      });
      const list = mockLots.list.map((lot: MockProcessLot) => ({
        orderNumber: lot.orderNumber,
        styleNumber: lot.styleNumber,
        styleName: lot.styleName,
        orderQuantity: lot.quantity,
        stages: [],
      }));
      return { list, total: list.length, inventoryQuantity: 0 };
    }
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

  async exportCuttingReport(
    params: CuttingReportExportParams,
  ): Promise<{ fileUrl: string }> {
    if (useMock) {
      return { fileUrl: '' };
    }
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
    if (useMock) {
      return { fileUrl: '' };
    }
    const tenantId = ensureTenantId();
    const response = await http.post<{ fileUrl: string }>(
      '/api/v1/quality-inspections/export',
      {
        keyword: params.keyword,
        inspectorId: params.inspectorId ? Number(params.inspectorId) : undefined,
        status: params.status,
        startDate: params.startDate,
        endDate: params.endDate,
      },
      { params: { tenantId } },
    );
    return response.data;
  },

  async exportTicketRecords(
    params: TicketRecordExportParams,
  ): Promise<{ fileUrl: string }> {
    if (useMock) {
      return { fileUrl: '' };
    }
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
