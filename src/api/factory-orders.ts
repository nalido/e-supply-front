import http from './http';
import type {
  FactoryOrderDetailSummary,
  FactoryOrderItem,
  FactoryOrderMetric,
  FactoryOrderProgress,
  FactoryOrderStatusSummary,
  FactoryOrderTableRow,
} from '../types';
import { fromBackendPage, requireNumericTenantId, toBackendPage } from './request-context';

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
  orderIds?: string[];
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

export type FactoryOrderImportRecord = {
  orderNo: string;
  styleId: number;
  merchandiserId?: number;
  factoryId?: number;
  totalQuantity: number;
  unitPrice: number;
  expectedDelivery?: string;
  placedAt?: string;
  status?: string;
  materialStatus?: string;
  completedQuantity?: number;
  remarks?: string;
};

export type FactoryOrderImportResult = {
  created: number;
  updated: number;
  errors?: string[];
  materialWarnings?: FactoryOrderMaterialDetail[];
};

export type FactoryOrderMaterialWarehouse = {
  warehouseId: number;
  warehouseName: string;
  stockQty: number;
  availableQty: number;
  inTransitQty: number;
};

export type FactoryOrderMaterialItem = {
  materialId: number;
  materialMinimumSpecificationId?: number;
  materialCode: string;
  materialName: string;
  imageUrl?: string;
  materialType: 'FABRIC' | 'ACCESSORY';
  unit: string;
  minimumSpecificationLabel?: string;
  expectedQty: number;
  actualQty: number;
  varianceQty: number;
  stockQty: number;
  availableQty: number;
  inTransitQty: number;
  safetyStockQty: number;
  suggestedPurchaseQty: number;
  shortage: boolean;
  warehouses: FactoryOrderMaterialWarehouse[];
};

export type FactoryOrderMaterialDetail = {
  orderId: number;
  orderNo: string;
  fullyConfigured: boolean;
  unconfiguredLineCount: number;
  shortage: boolean;
  items: FactoryOrderMaterialItem[];
};

export type FactoryOrderBatchUpdatePayload = {
  orderIds: string[];
  status?: string;
  materialStatus?: string;
  completedQuantity?: number;
  note?: string;
};

export type FactoryOrderBatchUpdateResult = {
  updated: number;
  failedOrderIds: number[];
};

export type FactoryOrderExportResult = {
  fileUrl?: string;
  exported: number;
};

export type FactoryOrderCostSummary = {
  material: number;
  processing: number;
  outsourcing: number;
  fee: number;
  total: number;
};

export type FactoryOrderCostEntry = {
  entryType: string;
  costCategory: string;
  amount: number;
  sourceDomain?: string;
  sourceId?: number;
  referenceDomain?: string;
  referenceId?: number;
  referenceNo?: string;
  recordedAt?: string;
};

export type FactoryOrderCostDetail = {
  orderId: number;
  orderNo: string;
  totalQuantity: number;
  estimatedCost: FactoryOrderCostSummary;
  actualCost: FactoryOrderCostSummary;
  estimatedUnitCost: FactoryOrderCostSummary;
  actualUnitCost: FactoryOrderCostSummary;
  entries: FactoryOrderCostEntry[];
};

export type FactoryOrderOtherFeePayload = {
  feeName: string;
  amount: number;
  occurredAt?: string;
};

export type FactoryOrderProgressNode = {
  id: number;
  nodeCode: string;
  nodeName: string;
  sequenceNo: number;
  status: string;
  completedAt?: string;
  operatorId?: number;
  payloadJson?: string;
};

export type FactoryOrderDetailLine = {
  id: number;
  color?: string;
  size?: string;
  orderedQty?: number;
  completedQuantity?: number;
  unitPrice?: number;
};

export type FactoryOrderDetail = {
  order?: FactoryOrderDetailSummary;
  lines: FactoryOrderDetailLine[];
};

type BackendFactoryOrderDetailSummary = {
  id?: number;
  orderNo?: string;
  styleId?: number;
  totalQuantity?: number;
  expectedDelivery?: string;
  placedAt?: string;
  status?: string;
  materialStatus?: string;
  merchandiserId?: number;
  factoryId?: number;
  remarks?: string;
};

type BackendFactoryOrderDetailLine = {
  id?: number;
  color?: string;
  size?: string;
  orderedQty?: number;
  completedQty?: number;
  completedQuantity?: number;
  unitPrice?: string | number;
};

type BackendFactoryOrderDetail = {
  order?: BackendFactoryOrderDetailSummary;
  lines?: BackendFactoryOrderDetailLine[];
};

type BackendFactoryOrderMaterialWarehouse = Partial<FactoryOrderMaterialWarehouse> & {
  stockQty?: number | string;
  availableQty?: number | string;
  inTransitQty?: number | string;
};

type BackendFactoryOrderMaterialItem = Omit<Partial<FactoryOrderMaterialItem>, 'warehouses'> & {
  expectedQty?: number | string;
  actualQty?: number | string;
  varianceQty?: number | string;
  stockQty?: number | string;
  availableQty?: number | string;
  inTransitQty?: number | string;
  safetyStockQty?: number | string;
  suggestedPurchaseQty?: number | string;
  warehouses?: BackendFactoryOrderMaterialWarehouse[];
};

type BackendFactoryOrderMaterialDetail = Omit<Partial<FactoryOrderMaterialDetail>, 'items'> & {
  items?: BackendFactoryOrderMaterialItem[];
};

export type FactoryOrderCreatePayload = {
  orderNo?: string;
  sourceSampleOrderId?: string | number;
  styleId: number;
  totalQuantity?: number;
  unitPrice?: number;
  expectedDelivery?: string;
  placedAt?: string;
  status?: string;
  materialStatus?: string;
  merchandiserId?: number;
  factoryId?: number;
  remarks?: string;
  lines?: Array<{
    color?: string;
    size?: string;
    quantity: number;
    unitPrice?: number;
  }>;
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
  styleCode?: string;
  name: string;
  thumbnail: string;
  materialStatus?: string;
  expectedDelivery?: string;
  cuttingDate?: string;
  firstDeliveryDate?: string;
  orderDate?: string;
  quantityLabel: string;
  quantityValue: string;
  orderedQuantity?: number;
  cuttingCompletedQuantity?: number;
  sewingCompletedQuantity?: number;
  deliveredQuantity?: number;
  tags?: string[];
  actions?: BackendFactoryOrderAction[];
  progress: BackendFactoryOrderProgress[];
  statusKey: string;
  deletable?: boolean;
  deleteBlockedReason?: string;
};

type BackendFactoryOrderTableRow = CompletionFlag & {
  id: number;
  orderCode: string;
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
  deletable?: boolean;
  deleteBlockedReason?: string;
};

type BackendFactoryOrderStatusTab = FactoryOrderStatusSummary;

type BackendFactoryOrderCostSummary = {
  material?: string | number;
  processing?: string | number;
  outsourcing?: string | number;
  fee?: string | number;
  total?: string | number;
};

type BackendFactoryOrderCostEntry = {
  entryType?: string;
  costCategory?: string;
  amount?: string | number;
  sourceDomain?: string;
  sourceId?: number;
  referenceDomain?: string;
  referenceId?: number;
  referenceNo?: string;
  recordedAt?: string;
};

type BackendFactoryOrderCostDetail = {
  orderId?: number;
  orderNo?: string;
  totalQuantity?: number;
  estimatedCost?: BackendFactoryOrderCostSummary;
  actualCost?: BackendFactoryOrderCostSummary;
  estimatedUnitCost?: BackendFactoryOrderCostSummary;
  actualUnitCost?: BackendFactoryOrderCostSummary;
  entries?: BackendFactoryOrderCostEntry[];
};

const normalizeMaterialStatus = (value?: string): string | undefined => {
  if (!value) {
    return undefined;
  }
  if (value === 'ISSUED') {
    return 'ALLOCATED';
  }
  return value;
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
    case 'warning':
    case 'partial':
      return 'warning';
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
  styleCode: card.styleCode,
  name: card.name,
  thumbnail: card.thumbnail,
  materialStatus: card.materialStatus,
  expectedDelivery: card.expectedDelivery,
  cuttingDate: card.cuttingDate,
  firstDeliveryDate: card.firstDeliveryDate,
  orderDate: card.orderDate,
  quantityLabel: card.quantityLabel,
  quantityValue: card.quantityValue,
  orderedQuantity: card.orderedQuantity,
  cuttingCompletedQuantity: card.cuttingCompletedQuantity,
  sewingCompletedQuantity: card.sewingCompletedQuantity,
  deliveredQuantity: card.deliveredQuantity,
  tags: card.tags ?? [],
  actions: card.actions ?? [],
  progress: (card.progress ?? []).map(adaptProgress),
  statusKey: card.statusKey,
  isCompleted: resolveCompletionFlag(card),
  deletable: card.deletable,
  deleteBlockedReason: card.deleteBlockedReason,
});

const adaptTableRow = (row: BackendFactoryOrderTableRow): FactoryOrderTableRow => ({
  id: String(row.id),
  orderCode: row.orderCode,
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
  deletable: row.deletable,
  deleteBlockedReason: row.deleteBlockedReason,
});

const adaptSummary = (payload: BackendFactoryOrderSummary): FactoryOrderSummary => ({
  metrics: payload.metrics ?? [],
  statusTabs: payload.statusTabs ?? [],
});

const parseAmount = (value?: string | number): number => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const adaptCostSummary = (payload?: BackendFactoryOrderCostSummary): FactoryOrderCostSummary => ({
  material: parseAmount(payload?.material),
  processing: parseAmount(payload?.processing),
  outsourcing: parseAmount(payload?.outsourcing),
  fee: parseAmount(payload?.fee),
  total: parseAmount(payload?.total),
});

const adaptCostDetail = (payload: BackendFactoryOrderCostDetail): FactoryOrderCostDetail => ({
  orderId: payload.orderId ?? 0,
  orderNo: payload.orderNo ?? '',
  totalQuantity: payload.totalQuantity ?? 0,
  estimatedCost: adaptCostSummary(payload.estimatedCost),
  actualCost: adaptCostSummary(payload.actualCost),
  estimatedUnitCost: adaptCostSummary(payload.estimatedUnitCost),
  actualUnitCost: adaptCostSummary(payload.actualUnitCost),
  entries: (payload.entries ?? []).map((entry) => ({
    entryType: entry.entryType ?? '',
    costCategory: entry.costCategory ?? '',
    amount: parseAmount(entry.amount),
    sourceDomain: entry.sourceDomain,
    sourceId: entry.sourceId,
    referenceDomain: entry.referenceDomain,
    referenceId: entry.referenceId,
    referenceNo: entry.referenceNo,
    recordedAt: entry.recordedAt,
  })),
});

const adaptCardPage = (payload: BackendFactoryOrderCardPage): FactoryOrderCardPage => ({
  list: (payload.list ?? []).map(adaptCard),
  total: payload.total ?? payload.list?.length ?? 0,
  page: fromBackendPage(payload.page),
  pageSize: payload.size ?? (payload.list?.length ?? 0),
});

const adaptTablePage = (payload: BackendFactoryOrderTablePage): FactoryOrderTablePage => ({
  list: (payload.list ?? []).map(adaptTableRow),
  total: payload.total ?? payload.list?.length ?? 0,
  page: fromBackendPage(payload.page),
  pageSize: payload.size ?? (payload.list?.length ?? 0),
});

const adaptDetailLine = (line: BackendFactoryOrderDetailLine): FactoryOrderDetailLine => ({
  id: line.id ?? 0,
  color: line.color,
  size: line.size,
  orderedQty: line.orderedQty ?? 0,
  completedQuantity: line.completedQuantity ?? line.completedQty ?? 0,
  unitPrice: line.unitPrice === undefined || line.unitPrice === null ? undefined : parseAmount(line.unitPrice),
});

const adaptDetail = (payload: BackendFactoryOrderDetail): FactoryOrderDetail => ({
  order: payload.order
    ? {
        id: String(payload.order.id ?? ''),
        orderNo: payload.order.orderNo ?? '',
        styleId: payload.order.styleId,
        totalQuantity: payload.order.totalQuantity,
        expectedDelivery: payload.order.expectedDelivery,
        placedAt: payload.order.placedAt,
        status: payload.order.status,
        materialStatus: payload.order.materialStatus,
        merchandiserId: payload.order.merchandiserId,
        factoryId: payload.order.factoryId,
        remarks: payload.order.remarks,
      }
    : undefined,
  lines: (payload.lines ?? []).map(adaptDetailLine),
});

const adaptMaterialDetail = (
  payload: BackendFactoryOrderMaterialDetail,
): FactoryOrderMaterialDetail => ({
  orderId: Number(payload.orderId ?? 0),
  orderNo: payload.orderNo ?? '',
  fullyConfigured: payload.fullyConfigured === true,
  unconfiguredLineCount: Number(payload.unconfiguredLineCount ?? 0),
  shortage: payload.shortage === true,
  items: (payload.items ?? []).map((item) => ({
    materialId: Number(item.materialId ?? 0),
    materialMinimumSpecificationId: item.materialMinimumSpecificationId == null
      ? undefined
      : Number(item.materialMinimumSpecificationId),
    materialCode: item.materialCode ?? '',
    materialName: item.materialName ?? '',
    imageUrl: item.imageUrl ?? undefined,
    materialType: item.materialType === 'ACCESSORY' ? 'ACCESSORY' : 'FABRIC',
    unit: item.unit ?? '',
    minimumSpecificationLabel: item.minimumSpecificationLabel,
    expectedQty: parseAmount(item.expectedQty),
    actualQty: parseAmount(item.actualQty),
    varianceQty: parseAmount(item.varianceQty),
    stockQty: parseAmount(item.stockQty),
    availableQty: parseAmount(item.availableQty),
    inTransitQty: parseAmount(item.inTransitQty),
    safetyStockQty: parseAmount(item.safetyStockQty),
    suggestedPurchaseQty: parseAmount(item.suggestedPurchaseQty),
    shortage: item.shortage === true,
    warehouses: (item.warehouses ?? []).map((warehouse) => ({
      warehouseId: Number(warehouse.warehouseId ?? 0),
      warehouseName: warehouse.warehouseName ?? '',
      stockQty: parseAmount(warehouse.stockQty),
      availableQty: parseAmount(warehouse.availableQty),
      inTransitQty: parseAmount(warehouse.inTransitQty),
    })),
  })),
});

const buildQueryParams = (params?: FactoryOrdersQuery) => {
  if (!params) {
    return {};
  }
  return {
    status: params.status,
    materialStatus: normalizeMaterialStatus(params.materialStatus),
    startDelivery: params.startDelivery,
    endDelivery: params.endDelivery,
    keyword: params.keyword?.trim() || undefined,
    sort: params.sort,
    includeCompleted: params.includeCompleted,
    page: toBackendPage(params.page),
    size: params.pageSize ?? 40,
  };
};

export const factoryOrdersApi = {
  async getSummary(): Promise<FactoryOrderSummary> {
    const tenantId = requireNumericTenantId();
    const { data } = await http.get<BackendFactoryOrderSummary>('/api/v1/production-orders/summary', {
      params: { tenantId },
    });
    return adaptSummary(data);
  },

  async getCards(params?: FactoryOrdersQuery): Promise<FactoryOrderCardPage> {
    const tenantId = requireNumericTenantId();
    const query = buildQueryParams(params);
    const { data } = await http.get<BackendFactoryOrderCardPage>('/api/v1/production-orders/cards', {
      params: {
        tenantId,
        ...query,
      },
      skipPageNormalization: true,
    });
    return adaptCardPage(data);
  },

  async getTable(params?: FactoryOrdersQuery): Promise<FactoryOrderTablePage> {
    const tenantId = requireNumericTenantId();
    const query = buildQueryParams(params);
    const { data } = await http.get<BackendFactoryOrderTablePage>('/api/v1/production-orders/table', {
      params: {
        tenantId,
        ...query,
      },
      skipPageNormalization: true,
    });
    return adaptTablePage(data);
  },

  async getCostDetail(orderId: string | number): Promise<FactoryOrderCostDetail> {
    const tenantId = requireNumericTenantId();
    const { data } = await http.get<BackendFactoryOrderCostDetail>(`/api/v1/production-orders/${orderId}/cost-detail`, {
      params: { tenantId },
    });
    return adaptCostDetail(data);
  },

  async getMaterialDetail(orderId: string | number): Promise<FactoryOrderMaterialDetail> {
    const tenantId = requireNumericTenantId();
    const { data } = await http.get<BackendFactoryOrderMaterialDetail>(
      `/api/v1/production-orders/${orderId}/material-details`,
      { params: { tenantId } },
    );
    return adaptMaterialDetail(data ?? {});
  },

  async createOtherFee(orderId: string | number, payload: FactoryOrderOtherFeePayload): Promise<FactoryOrderCostDetail> {
    const tenantId = requireNumericTenantId();
    const { data } = await http.post<BackendFactoryOrderCostDetail>(
      `/api/v1/production-orders/${orderId}/costs/other-fee`,
      payload,
      { params: { tenantId } },
    );
    return adaptCostDetail(data);
  },

  async getProgress(orderId: string | number): Promise<FactoryOrderProgressNode[]> {
    const tenantId = requireNumericTenantId();
    const { data } = await http.get<FactoryOrderProgressNode[]>(
      `/api/v1/production-orders/${orderId}/progress`,
      { params: { tenantId } },
    );
    return data ?? [];
  },

  async getDetail(orderId: string | number): Promise<FactoryOrderDetail> {
    const tenantId = requireNumericTenantId();
    const { data } = await http.get<BackendFactoryOrderDetail>(
      `/api/v1/production-orders/${orderId}`,
      { params: { tenantId } },
    );
    return adaptDetail(data ?? {});
  },

  async completeProgress(
    orderId: string | number,
    nodeCode: string,
    payload?: {
      completedAt?: string;
      operatorId?: number;
      payload?: Record<string, unknown>;
    },
  ): Promise<FactoryOrderProgressNode[]> {
    const tenantId = requireNumericTenantId();
    const body = payload
      ? {
          completedAt: payload.completedAt,
          operatorId: payload.operatorId,
          payload: payload.payload,
        }
      : {};
    const { data } = await http.post<FactoryOrderProgressNode[]>(
      `/api/v1/production-orders/${orderId}/progress/${nodeCode}/complete`,
      body,
      { params: { tenantId } },
    );
    return data ?? [];
  },

  async deleteCuttingRecord(
    orderId: string | number,
    payload: {
      bedId?: string;
      bedNumber?: string;
      source?: string;
      workOrderId?: number;
      completedAt?: string;
      items?: Array<{ color?: string; size?: string; quantity: number }>;
    },
  ): Promise<void> {
    const tenantId = requireNumericTenantId();
    await http.post(
      `/api/v1/production-orders/${orderId}/progress/cutting-records/delete`,
      payload,
      { params: { tenantId } },
    );
  },

  async deleteSewingRecord(
    orderId: string | number,
    payload: {
      allocationId?: string;
      workOrderId?: number;
      outsourcingOrderId?: number;
      completedAt?: string;
      items?: Array<{ color?: string; size?: string; quantity: number }>;
    },
  ): Promise<void> {
    const tenantId = requireNumericTenantId();
    await http.post(
      `/api/v1/production-orders/${orderId}/progress/sewing-records/delete`,
      payload,
      { params: { tenantId } },
    );
  },

  async updateSewingRecordTime(
    orderId: string | number,
    payload: {
      allocationId?: string;
      workOrderId?: number;
      outsourcingOrderId?: number;
      completedAt?: string;
      newCompletedAt: string;
      items?: Array<{ color?: string; size?: string; quantity: number }>;
    },
  ): Promise<void> {
    const tenantId = requireNumericTenantId();
    await http.post(
      `/api/v1/production-orders/${orderId}/progress/sewing-records/time/update`,
      payload,
      { params: { tenantId } },
    );
  },

  async importOrders(payload: { orders: FactoryOrderImportRecord[] }): Promise<FactoryOrderImportResult> {
    const tenantId = requireNumericTenantId();
    const requestBody = {
      tenantId,
      orders: payload.orders.map((order) => ({
        orderNo: order.orderNo,
        styleId: Number(order.styleId),
        merchandiserId: order.merchandiserId ? Number(order.merchandiserId) : undefined,
        factoryId: order.factoryId ? Number(order.factoryId) : undefined,
        totalQuantity: Number(order.totalQuantity),
        unitPrice: Number(order.unitPrice),
        expectedDelivery: order.expectedDelivery,
        placedAt: order.placedAt,
        status: order.status,
        materialStatus: normalizeMaterialStatus(order.materialStatus),
        completedQuantity: order.completedQuantity,
        remarks: order.remarks,
      })),
    };
    const { data } = await http.post<{
      created?: number;
      updated?: number;
      errors?: string[];
      materialWarnings?: BackendFactoryOrderMaterialDetail[];
    }>('/api/v1/production-orders/import', requestBody);
    return {
      created: Number(data.created ?? 0),
      updated: Number(data.updated ?? 0),
      errors: data.errors ?? [],
      materialWarnings: (data.materialWarnings ?? []).map(adaptMaterialDetail),
    };
  },

  async batchUpdateStatus(payload: FactoryOrderBatchUpdatePayload): Promise<FactoryOrderBatchUpdateResult> {
    const tenantId = requireNumericTenantId();
    const body = {
      tenantId,
      orderIds: payload.orderIds.map((id) => Number(id)),
      status: payload.status,
      materialStatus: normalizeMaterialStatus(payload.materialStatus),
      completedQuantity: payload.completedQuantity,
      note: payload.note,
    };
    const { data } = await http.post<FactoryOrderBatchUpdateResult>(
      '/api/v1/production-orders/status/batch-update',
      body,
    );
    return data;
  },

  async exportOrders(params: FactoryOrdersQuery): Promise<FactoryOrderExportResult> {
    const tenantId = requireNumericTenantId();
    const body = {
      tenantId,
      statuses: params.status ? (Array.isArray(params.status) ? params.status : [params.status]) : undefined,
      keyword: params.keyword,
      includeCompleted: params.includeCompleted,
      sort: params.sort,
      orderIds: params.orderIds?.map((id) => Number(id)),
      maxRows: params.pageSize ?? 1000,
    };
    const { data } = await http.post<FactoryOrderExportResult>('/api/v1/production-orders/export', body);
    return data;
  },

  async createOrder(payload: FactoryOrderCreatePayload): Promise<FactoryOrderDetail> {
    const tenantId = requireNumericTenantId();
    const normalizedLines = (payload.lines ?? [])
      .map((line) => ({
        color: line.color?.trim() || undefined,
        size: line.size?.trim() || undefined,
        quantity: Number(line.quantity),
        unitPrice:
          typeof line.unitPrice === 'number' && Number.isFinite(line.unitPrice)
            ? Number(line.unitPrice)
            : typeof payload.unitPrice === 'number' && Number.isFinite(payload.unitPrice)
              ? Number(payload.unitPrice)
              : undefined,
      }))
      .filter((line) => Number.isFinite(line.quantity) && line.quantity > 0);

    const fallbackQuantity = Number(payload.totalQuantity ?? 0);
    const fallbackUnitPrice =
      typeof payload.unitPrice === 'number' && Number.isFinite(payload.unitPrice)
        ? Number(payload.unitPrice)
        : undefined;

    const { data } = await http.post<BackendFactoryOrderDetail>('/api/v1/production-orders', {
      tenantId,
      orderNo: payload.orderNo?.trim() || undefined,
      sourceSampleOrderId: payload.sourceSampleOrderId ? Number(payload.sourceSampleOrderId) : undefined,
      styleId: Number(payload.styleId),
      expectedDelivery: payload.expectedDelivery,
      placedAt: payload.placedAt,
      status: payload.status,
      materialStatus: normalizeMaterialStatus(payload.materialStatus),
      completedQuantity: 0,
      merchandiserId: payload.merchandiserId ? Number(payload.merchandiserId) : undefined,
      factoryId: payload.factoryId ? Number(payload.factoryId) : undefined,
      remarks: payload.remarks,
      lines: normalizedLines.length
        ? normalizedLines
        : [
            {
              quantity: fallbackQuantity,
              unitPrice: fallbackUnitPrice,
            },
      ],
    });
    return adaptDetail(data ?? {});
  },

  async updateOrder(orderId: string | number, payload: FactoryOrderCreatePayload): Promise<FactoryOrderDetail> {
    const tenantId = requireNumericTenantId();
    const normalizedLines = (payload.lines ?? [])
      .map((line) => ({
        color: line.color?.trim() || undefined,
        size: line.size?.trim() || undefined,
        quantity: Number(line.quantity),
        unitPrice:
          typeof line.unitPrice === 'number' && Number.isFinite(line.unitPrice)
            ? Number(line.unitPrice)
            : typeof payload.unitPrice === 'number' && Number.isFinite(payload.unitPrice)
              ? Number(payload.unitPrice)
              : undefined,
      }))
      .filter((line) => Number.isFinite(line.quantity) && line.quantity > 0);

    const fallbackQuantity = Number(payload.totalQuantity ?? 0);
    const fallbackUnitPrice =
      typeof payload.unitPrice === 'number' && Number.isFinite(payload.unitPrice)
        ? Number(payload.unitPrice)
        : undefined;

    const { data } = await http.post<BackendFactoryOrderDetail>(`/api/v1/production-orders/${orderId}/update`, {
      tenantId,
      orderNo: payload.orderNo?.trim() || undefined,
      sourceSampleOrderId: payload.sourceSampleOrderId ? Number(payload.sourceSampleOrderId) : undefined,
      styleId: Number(payload.styleId),
      expectedDelivery: payload.expectedDelivery,
      placedAt: payload.placedAt,
      status: payload.status,
      materialStatus: normalizeMaterialStatus(payload.materialStatus),
      completedQuantity: 0,
      merchandiserId: payload.merchandiserId ? Number(payload.merchandiserId) : undefined,
      factoryId: payload.factoryId ? Number(payload.factoryId) : undefined,
      remarks: payload.remarks,
      lines: normalizedLines.length
        ? normalizedLines
        : [
            {
              quantity: Number.isFinite(fallbackQuantity) && fallbackQuantity > 0 ? fallbackQuantity : 0,
              unitPrice: fallbackUnitPrice,
            },
          ],
    });
    return adaptDetail(data ?? {});
  },

  async deleteOrder(orderId: string | number): Promise<void> {
    const tenantId = requireNumericTenantId();
    await http.post(`/api/v1/production-orders/${orderId}/delete`, null, {
      params: { tenantId },
    });
  },
};
