import dayjs from 'dayjs';
import type { SampleOrder, SampleQueryParams, SampleStats, SampleStatus } from '../../types/sample';

export type SampleStatusResponse = 'PENDING' | 'APPROVED' | 'IN_PRODUCTION' | 'CLOSED' | 'CANCELLED';
export type SamplePriorityResponse = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

const statusToFrontend: Record<SampleStatusResponse, SampleStatus> = {
  PENDING: 'pending',
  APPROVED: 'confirmed',
  IN_PRODUCTION: 'producing',
  CLOSED: 'completed',
  CANCELLED: 'cancelled',
};

const statusToBackend: Record<SampleStatus, SampleStatusResponse> = {
  pending: 'PENDING',
  confirmed: 'APPROVED',
  producing: 'IN_PRODUCTION',
  completed: 'CLOSED',
  cancelled: 'CANCELLED',
};

const priorityToFrontend: Record<SamplePriorityResponse, SampleOrder['priority']> = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent',
};

const priorityToBackend: Record<SampleOrder['priority'], SamplePriorityResponse> = {
  low: 'LOW',
  medium: 'MEDIUM',
  high: 'HIGH',
  urgent: 'URGENT',
};

export type SampleOrderSummaryResponse = {
  id: number;
  sampleNo: string;
  status: SampleStatusResponse;
  priority: SamplePriorityResponse;
  quantity: number;
  customerId?: number;
  customerName?: string;
  styleId?: number;
  styleName?: string;
  unitPrice?: number;
  totalAmount?: number;
  deadline?: string;
  expectedFinishDate?: string;
  approvedAt?: string;
  productionStartedAt?: string;
  updatedAt?: string;
};

export type SampleOrderListResponse = {
  items: SampleOrderSummaryResponse[];
  total: number;
  page: number;
  size: number;
};

export type SampleDashboardCounters = {
  total: number;
  pending: number;
  approved: number;
  inProduction: number;
  closed: number;
  cancelled: number;
};

export const adaptSampleOrderSummary = (payload: SampleOrderSummaryResponse): SampleOrder => {
  const fallbackText = '--';
  const customerLabel = payload.customerName || (payload.customerId ? `客户 #${payload.customerId}` : fallbackText);
  const styleLabel = payload.styleName || (payload.styleId ? `款式 #${payload.styleId}` : fallbackText);

  return {
    id: String(payload.id ?? ''),
    orderNo: payload.sampleNo ?? fallbackText,
    styleName: styleLabel,
    styleCode: payload.styleId ? `ST-${payload.styleId}` : fallbackText,
    unit: fallbackText,
    customer: customerLabel,
    season: fallbackText,
    category: fallbackText,
    fabric: fallbackText,
    color: fallbackText,
    size: fallbackText,
    quantity: payload.quantity ?? 0,
    unitPrice: payload.unitPrice ?? 0,
    totalAmount: payload.totalAmount ?? 0,
    status: statusToFrontend[payload.status] ?? 'pending',
    priority: priorityToFrontend[payload.priority] ?? 'medium',
    sampleType: fallbackText,
    merchandiser: fallbackText,
    merchandiserId: undefined,
    patternMaker: fallbackText,
    patternMakerId: undefined,
    patternNo: undefined,
    sampleSewer: fallbackText,
    sampleSewerId: undefined,
    deadline: payload.deadline ?? '',
    createTime: payload.updatedAt ?? '',
    updateTime: payload.updatedAt ?? '',
    designer: fallbackText,
    description: '',
    remarks: '',
    processes: [],
    skuMatrix: undefined,
    images: [],
    colorImages: {},
  } satisfies SampleOrder;
};

export const mapStatusToBackend = (status?: SampleStatus): SampleStatusResponse | undefined =>
  status ? statusToBackend[status] : undefined;

export const mapPriorityToBackend = (priority?: SampleOrder['priority']): SamplePriorityResponse | undefined =>
  priority ? priorityToBackend[priority] : undefined;

export const buildStatsFromCounters = (
  counters: Pick<SampleDashboardCounters, 'total' | 'pending' | 'approved' | 'inProduction' | 'closed' | 'cancelled'>,
  urgent: number,
  thisMonth: number,
): SampleStats => ({
  total: counters.total,
  pending: counters.pending,
  confirmed: counters.approved,
  producing: counters.inProduction,
  completed: counters.closed,
  cancelled: counters.cancelled,
  urgent,
  thisMonth,
});

export const getCurrentMonthRange = (): { start: string; end: string } => {
  const start = dayjs().startOf('month').format('YYYY-MM-DD');
  const end = dayjs().endOf('month').format('YYYY-MM-DD');
  return { start, end };
};

export const buildListQuery = (params: SampleQueryParams = {}): Record<string, unknown> => {
  const safePriority = params.priority as SampleOrder['priority'] | undefined;
  const query: Record<string, unknown> = {
    keyword: params.keyword,
    status: mapStatusToBackend(params.status),
    priority: mapPriorityToBackend(safePriority),
    startDeadline: params.startDate,
    endDeadline: params.endDate,
    page: params.page,
    size: params.pageSize,
  };

  if (!query.keyword && params.customer) {
    query.keyword = params.customer;
  }

  Object.keys(query).forEach((key) => {
    if (query[key] === undefined || query[key] === null || query[key] === '') {
      delete query[key];
    }
  });

  return query;
};
