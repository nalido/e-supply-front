import { apiConfig } from './config';
import http from './http';
import { tenantStore } from '../stores/tenant';
import type {
  FactoryOrderItem,
  FactoryOrderMetric,
  FactoryOrderProgress,
  FactoryOrderStatusSummary,
  FactoryOrderTableRow,
} from '../types';
import { fetchFactoryOrdersDataset } from '../mock/factory-orders';

const useMock = apiConfig.useMock;

export type FactoryOrdersQuery = {
  status?: string | string[];
  materialStatus?: string;
  startDelivery?: string;
  endDelivery?: string;
  keyword?: string;
  sort?: string;
  includeCompleted?: boolean;
  page?: number;
  pageSize?: number;
};

export type FactoryOrderSummary = {
  metrics: FactoryOrderMetric[];
  statusTabs: FactoryOrderStatusSummary[];
};

export type FactoryOrderCardPage = {
  list: FactoryOrderItem[];
  total: number;
  page: number;
  pageSize: number;
};

export type FactoryOrderTablePage = {
  list: FactoryOrderTableRow[];
  total: number;
  page: number;
  pageSize: number;
};

type BackendFactoryOrderSummary = {
  metrics?: BackendFactoryOrderMetric[];
  statusTabs?: BackendFactoryOrderStatusTab[];
};

type BackendFactoryOrderCardPage = {
  list?: BackendFactoryOrderCard[];
  total?: number;
  page?: number;
  size?: number;
};

type BackendFactoryOrderTablePage = {
  list?: BackendFactoryOrderTableRow[];
  total?: number;
  page?: number;
  size?: number;
};

type BackendFactoryOrderMetric = FactoryOrderMetric;

type BackendFactoryOrderProgress = {
  key: string;
  label: string;
  value: string;
  date?: string;
  percent?: number;
  status?: string;
  muted?: boolean;
};

type BackendFactoryOrderAction = {
  key: string;
  label: string;
};

type CompletionFlag = {
  completed?: boolean;
  isCompleted?: boolean;
};

type BackendFactoryOrderCard = CompletionFlag & {
  id: number;
  code: string;
  name: string;
  thumbnail: string;
  customer?: string;
  materialStatus?: string;
  expectedDelivery?: string;
  orderDate?: string;
  quantityLabel: string;
  quantityValue: string;
  tags?: string[];
  actions?: BackendFactoryOrderAction[];
  progress: BackendFactoryOrderProgress[];
  statusKey: string;
};

type BackendFactoryOrderTableRow = CompletionFlag & {
  id: number;
  orderCode: string;
  customer: string;
  styleCode: string;
  styleName: string;
  orderQuantity: number;
  materialStatus: string;
  productionStage: string;
  productionPercent: number;
  expectedDelivery: string;
  merchandiser: string;
  statusKey: string;
  orderDate?: string;
};

type BackendFactoryOrderStatusTab = FactoryOrderStatusSummary;

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

const resolveCompletionFlag = (payload: CompletionFlag): boolean => {
  if (typeof payload.completed === 'boolean') {
    return payload.completed;
  }
  if (typeof payload.isCompleted === 'boolean') {
    return payload.isCompleted;
  }
  return false;
};

const normalizeProgressStatus = (status?: string): FactoryOrderProgress['status'] => {
  if (!status) {
    return 'default';
  }
  const value = status.toLowerCase();
  switch (value) {
    case 'completed':
    case 'success':
      return 'success';
    case 'in_progress':
    case 'processing':
      return 'warning';
    case 'delayed':
    case 'danger':
      return 'danger';
    default:
      return 'default';
  }
};

const adaptProgress = (progress: BackendFactoryOrderProgress): FactoryOrderProgress => ({
  key: progress.key,
  label: progress.label,
  value: progress.value,
  date: progress.date,
  percent: progress.percent,
  status: normalizeProgressStatus(progress.status),
  muted: progress.muted,
});

const adaptCard = (card: BackendFactoryOrderCard): FactoryOrderItem => ({
  id: String(card.id),
  code: card.code,
  name: card.name,
  thumbnail: card.thumbnail,
  customer: card.customer,
  materialStatus: card.materialStatus,
  expectedDelivery: card.expectedDelivery,
  orderDate: card.orderDate,
  quantityLabel: card.quantityLabel,
  quantityValue: card.quantityValue,
  tags: card.tags ?? [],
  actions: card.actions ?? [],
  progress: (card.progress ?? []).map(adaptProgress),
  statusKey: card.statusKey,
  isCompleted: resolveCompletionFlag(card),
});

const adaptTableRow = (row: BackendFactoryOrderTableRow): FactoryOrderTableRow => ({
  id: String(row.id),
  orderCode: row.orderCode,
  customer: row.customer,
  styleCode: row.styleCode,
  styleName: row.styleName,
  orderQuantity: row.orderQuantity,
  materialStatus: row.materialStatus,
  productionStage: row.productionStage,
  productionPercent: row.productionPercent,
  expectedDelivery: row.expectedDelivery,
  merchandiser: row.merchandiser,
  statusKey: row.statusKey,
  isCompleted: resolveCompletionFlag(row),
  orderDate: row.orderDate,
});

const adaptSummary = (payload: BackendFactoryOrderSummary): FactoryOrderSummary => ({
  metrics: payload.metrics ?? [],
  statusTabs: payload.statusTabs ?? [],
});

const adaptCardPage = (payload: BackendFactoryOrderCardPage): FactoryOrderCardPage => ({
  list: (payload.list ?? []).map(adaptCard),
  total: payload.total ?? payload.list?.length ?? 0,
  page: (payload.page ?? 0) + 1,
  pageSize: payload.size ?? (payload.list?.length ?? 0),
});

const adaptTablePage = (payload: BackendFactoryOrderTablePage): FactoryOrderTablePage => ({
  list: (payload.list ?? []).map(adaptTableRow),
  total: payload.total ?? payload.list?.length ?? 0,
  page: (payload.page ?? 0) + 1,
  pageSize: payload.size ?? (payload.list?.length ?? 0),
});

const buildQueryParams = (params?: FactoryOrdersQuery) => {
  if (!params) {
    return {};
  }
  return {
    status: params.status,
    materialStatus: params.materialStatus,
    startDelivery: params.startDelivery,
    endDelivery: params.endDelivery,
    keyword: params.keyword?.trim() || undefined,
    sort: params.sort,
    includeCompleted: params.includeCompleted,
    page: params.page ?? 1,
    size: params.pageSize ?? 40,
  };
};

export const factoryOrdersApi = {
  async getSummary(): Promise<FactoryOrderSummary> {
    if (useMock) {
      const dataset = await fetchFactoryOrdersDataset();
      return {
        metrics: dataset.metrics,
        statusTabs: dataset.statusTabs,
      };
    }
    const tenantId = ensureTenantId();
    const { data } = await http.get<BackendFactoryOrderSummary>('/api/v1/production-orders/summary', {
      params: { tenantId },
    });
    return adaptSummary(data);
  },

  async getCards(params?: FactoryOrdersQuery): Promise<FactoryOrderCardPage> {
    if (useMock) {
      const dataset = await fetchFactoryOrdersDataset();
      const page = params?.page ?? 1;
      const pageSize = params?.pageSize ?? (dataset.orders.length || 1);
      return {
        list: dataset.orders,
        total: dataset.orders.length,
        page,
        pageSize,
      };
    }
    const tenantId = ensureTenantId();
    const query = buildQueryParams(params);
    const { data } = await http.get<BackendFactoryOrderCardPage>('/api/v1/production-orders/cards', {
      params: {
        tenantId,
        ...query,
      },
    });
    return adaptCardPage(data);
  },

  async getTable(params?: FactoryOrdersQuery): Promise<FactoryOrderTablePage> {
    if (useMock) {
      const dataset = await fetchFactoryOrdersDataset();
      const page = params?.page ?? 1;
      const pageSize = params?.pageSize ?? (dataset.table.length || 1);
      return {
        list: dataset.table,
        total: dataset.table.length,
        page,
        pageSize,
      };
    }
    const tenantId = ensureTenantId();
    const query = buildQueryParams(params);
    const { data } = await http.get<BackendFactoryOrderTablePage>('/api/v1/production-orders/table', {
      params: {
        tenantId,
        ...query,
      },
    });
    return adaptTablePage(data);
  },
};
