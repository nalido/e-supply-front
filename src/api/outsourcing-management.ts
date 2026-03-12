import http from './http';
import { tenantStore } from '../stores/tenant';
import type {
  OutsourcingManagementListItem,
  OutsourcingManagementListParams,
  OutsourcingManagementListResponse,
  OutsourcingManagementMeta,
  OutsourcingManagementProcessorOption,
  OutsourcingReceivePayload,
  OutsourcingOrderDetail,
} from '../types/outsourcing-management';
import type { PartnerDataset } from '../types';
import { partnersApi } from './partners';
import processTypeApi from './process-type';
import { materialApi } from './material';

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

type BackendOutsourcingListResponse = {
  list: BackendOutsourcingListItem[];
  total: number;
  summary?: BackendOutsourcingSummary;
};

type BackendOutsourcingListItem = {
  id: number;
  status: string;
  outgoingNo: string;
  orderNo: string;
  styleNo: string;
  styleName: string;
  processorId: number;
  processorName: string;
  processStep: string;
  dispatchedQty: number;
  receivedQty: number;
  unitPrice: number;
  totalCost: number;
  attritionRate: number;
  dispatchDate: string;
  expectedCompletionDate?: string;
};

type BackendOutsourcingSummary = {
  totalOrders: number;
  inProgressOrders: number;
  completedOrders: number;
  dispatchedQty: number;
  goodReceivedQty: number;
};

type BackendOutsourcingWorkOrder = {
  id?: number | string;
  plannedQty?: number;
  completedQty?: number;
  status?: string;
  remark?: string;
};

type BackendOutsourcingProductionOrder = {
  id?: number | string;
  orderNo?: string;
  totalQuantity?: number;
  completedQuantity?: number;
  expectedDelivery?: string;
};

type BackendOutsourcingReceipt = {
  id?: number | string;
  receivedQty?: number;
  defectQty?: number;
  reworkQty?: number;
  goodQty?: number;
  receivedAt?: string;
  remark?: string;
};

type BackendOutsourcingMaterialRequest = {
  id?: number | string;
  materialId?: number | string;
  requestQuantity?: number;
  requestedAt?: string;
  remark?: string;
};

type BackendOutsourcingDetail = {
  id?: number | string;
  status?: string;
  outgoingNo?: string;
  orderNo?: string;
  styleNo?: string;
  styleName?: string;
  processorName?: string;
  processStep?: string;
  dispatchQty?: number;
  receivedQty?: number;
  goodReceivedQty?: number;
  progressPercent?: number;
  attritionRate?: number;
  unitPrice?: number;
  totalCost?: number;
  dispatchDate?: string;
  expectedCompletionDate?: string;
  createdAt?: string;
  updatedAt?: string;
  workOrder?: BackendOutsourcingWorkOrder;
  productionOrder?: BackendOutsourcingProductionOrder;
  receipts?: BackendOutsourcingReceipt[];
  materialRequests?: BackendOutsourcingMaterialRequest[];
};

const adaptRecord = (item: BackendOutsourcingListItem): OutsourcingManagementListItem => ({
  id: String(item.id),
  status: item.status as OutsourcingManagementListItem['status'],
  outgoingNo: item.outgoingNo,
  orderNo: item.orderNo,
  styleNo: item.styleNo,
  styleName: item.styleName,
  processorId: String(item.processorId),
  processorName: item.processorName,
  processStep: item.processStep,
  dispatchedQty: item.dispatchedQty,
  receivedQty: item.receivedQty,
  unitPrice: item.unitPrice,
  totalCost: item.totalCost,
  attritionRate: item.attritionRate,
  dispatchDate: item.dispatchDate,
  expectedCompletionDate: item.expectedCompletionDate,
});

const adaptMetaOptions = (dataset: PartnerDataset): OutsourcingManagementProcessorOption[] =>
  (dataset.list ?? []).map((partner) => ({ id: partner.id, name: partner.name ?? '-' }));

const adaptDetail = (payload: BackendOutsourcingDetail): OutsourcingOrderDetail => ({
  id: String(payload.id ?? ''),
  status: payload.status as OutsourcingOrderDetail['status'],
  outgoingNo: payload.outgoingNo ?? '',
  orderNo: payload.orderNo ?? '',
  styleNo: payload.styleNo ?? '',
  styleName: payload.styleName ?? '',
  processorName: payload.processorName ?? '-',
  processStep: payload.processStep ?? '-',
  dispatchQty: Number(payload.dispatchQty ?? 0),
  receivedQty: Number(payload.receivedQty ?? 0),
  goodReceivedQty: Number(payload.goodReceivedQty ?? 0),
  progressPercent: typeof payload.progressPercent === 'number' ? payload.progressPercent : 0,
  attritionRate: Number(payload.attritionRate ?? 0),
  unitPrice: Number(payload.unitPrice ?? 0),
  totalCost: Number(payload.totalCost ?? 0),
  dispatchDate: payload.dispatchDate ?? undefined,
  expectedCompletionDate: payload.expectedCompletionDate ?? undefined,
  createdAt: payload.createdAt ?? undefined,
  updatedAt: payload.updatedAt ?? undefined,
  workOrder: payload.workOrder
    ? {
        id: String(payload.workOrder.id ?? ''),
        plannedQty: Number(payload.workOrder.plannedQty ?? 0),
        completedQty: Number(payload.workOrder.completedQty ?? 0),
        status: payload.workOrder.status ?? undefined,
        remark: payload.workOrder.remark ?? undefined,
      }
    : undefined,
  productionOrder: payload.productionOrder
    ? {
        id: String(payload.productionOrder.id ?? ''),
        orderNo: payload.productionOrder.orderNo ?? '',
        totalQuantity: Number(payload.productionOrder.totalQuantity ?? 0),
        completedQuantity: Number(payload.productionOrder.completedQuantity ?? 0),
        expectedDelivery: payload.productionOrder.expectedDelivery ?? undefined,
      }
    : undefined,
  receipts: Array.isArray(payload.receipts)
    ? payload.receipts.map((item) => ({
        id: String(item.id ?? ''),
        receivedQty: Number(item.receivedQty ?? 0),
        defectQty: Number(item.defectQty ?? 0),
        reworkQty: Number(item.reworkQty ?? 0),
        goodQty: Number(item.goodQty ?? 0),
        receivedAt: item.receivedAt ?? undefined,
        remark: item.remark ?? undefined,
      }))
    : [],
  materialRequests: Array.isArray(payload.materialRequests)
    ? payload.materialRequests.map((item) => ({
        id: String(item.id ?? ''),
        materialId: item.materialId != null ? String(item.materialId) : undefined,
        requestQuantity: Number(item.requestQuantity ?? 0),
        requestedAt: item.requestedAt ?? undefined,
        remark: item.remark ?? undefined,
      }))
    : [],
});

export const outsourcingManagementApi = {
  async getMeta(): Promise<OutsourcingManagementMeta> {
    const response = await partnersApi.list({
      page: 0,
      pageSize: 200,
      type: 'subcontractor',
    });
    return { processors: adaptMetaOptions(response) };
  },

  async getList(
      params: OutsourcingManagementListParams,
    ): Promise<OutsourcingManagementListResponse> {
    const tenantId = ensureTenantId();
    const { data } = await http.get<BackendOutsourcingListResponse>('/api/v1/outsourcing-orders', {
      params: {
        tenantId,
        status: params.statusKey,
        processorId: params.processorId,
        orderKeyword: params.orderNo?.trim() || undefined,
        styleKeyword: params.styleKeyword?.trim() || undefined,
        dispatchStart: params.dispatchDateStart,
        dispatchEnd: params.dispatchDateEnd,
        page: params.page ? params.page - 1 : 0,
        size: params.pageSize ?? 10,
      },
    });
    return {
      list: (data.list ?? []).map(adaptRecord),
      total: data.total ?? 0,
      summary: data.summary,
    };
  },

  async confirmReceive(payload: OutsourcingReceivePayload): Promise<void> {
    const tenantId = ensureTenantId();
    await http.post(
      `/api/v1/outsourcing-orders/${Number(payload.orderId)}/receipts`,
      {
        receivedQty: payload.receivedQty,
        defectQty: payload.defectQty ?? 0,
        reworkQty: payload.reworkQty ?? 0,
        receivedAt: payload.receivedAt,
        remark: payload.remark,
      },
      { params: { tenantId } },
    );
  },

  async export(params: OutsourcingManagementListParams): Promise<{ fileUrl: string }> {
    const tenantId = ensureTenantId();
    const orderIds = params.selectedOrderIds
      ?.map((value) => {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : undefined;
      })
      .filter((value): value is number => typeof value === 'number');
    const response = await http.post<{ fileUrl: string }>(
      '/api/v1/outsourcing-orders/export',
      {
        orderKeyword: params.orderNo?.trim() || undefined,
        styleKeyword: params.styleKeyword?.trim() || undefined,
        processorId: params.processorId ? Number(params.processorId) : undefined,
        dispatchStart: params.dispatchDateStart,
        dispatchEnd: params.dispatchDateEnd,
        status: params.statusKey && params.statusKey.length > 0 ? params.statusKey : undefined,
        orderIds: orderIds && orderIds.length > 0 ? orderIds : undefined,
      },
      { params: { tenantId } },
    );
    return response.data;
  },

  async getDetail(orderId: string): Promise<OutsourcingOrderDetail> {
    const tenantId = ensureTenantId();
    const parsedId = Number(orderId);
    if (!Number.isFinite(parsedId)) {
      throw new Error('Invalid outsourcing order id');
    }
    const { data } = await http.get(`/api/v1/outsourcing-orders/${parsedId}`, {
      params: { tenantId },
    });
    return adaptDetail(data);
  },

  async listProductionOrderOptions(keyword?: string): Promise<Array<{ id: string; label: string }>> {
    const tenantId = ensureTenantId();
    const { data } = await http.get('/api/v1/production-orders/table', {
      params: {
        tenantId,
        keyword: keyword?.trim() || undefined,
        page: 0,
        size: 50,
      },
    });
    const list = Array.isArray(data?.list) ? data.list : [];
    return list.map((item: Record<string, unknown>) => ({
      id: String(item.id ?? ''),
      label: String(item.orderCode ?? item.orderNo ?? `订单#${item.id ?? '-'}`),
    })).filter((item: { id: string; label: string }) => item.id && item.label);
  },

  async listWorkOrderOptions(productionOrderId: string): Promise<Array<{ id: string; label: string }>> {
    const tenantId = ensureTenantId();
    const parsed = Number(productionOrderId);
    if (!Number.isFinite(parsed)) {
      return [];
    }
    const { data } = await http.get('/api/v1/production/work-orders', {
      params: {
        tenantId,
        productionOrderId: parsed,
      },
    });
    const list = Array.isArray(data) ? data : [];
    return list.map((item: Record<string, unknown>) => ({
      id: String(item.id ?? ''),
      label: `工单#${item.id ?? '-'} / 状态:${item.status ?? '-'} / 计划:${item.plannedQty ?? 0}`,
    })).filter((item) => item.id);
  },

  async listProcessOptions(keyword?: string): Promise<Array<{ id: string; label: string }>> {
    const data = await processTypeApi.list({
      page: 1,
      pageSize: 200,
      keyword: keyword?.trim() || undefined,
      status: 'active',
    });
    return data.list.map((item) => ({
      id: item.id,
      label: `${item.code} / ${item.name}`,
    }));
  },

  async listMaterialOptions(keyword?: string): Promise<Array<{ id: string; label: string }>> {
    const [fabric, accessory] = await Promise.all([
      materialApi.list({ page: 1, pageSize: 100, materialType: 'fabric', keyword }),
      materialApi.list({ page: 1, pageSize: 100, materialType: 'accessory', keyword }),
    ]);
    const merged = [...fabric.list, ...accessory.list];
    return merged.map((item) => ({
      id: item.id,
      label: `${item.sku} / ${item.name}`,
    }));
  },

  async createOrder(payload: {
    workOrderId: string;
    subcontractorId: string;
    processCatalogId: string;
    dispatchQty: number;
    unitPrice: number;
    dispatchDate: string;
    expectedReturnDate?: string;
    attritionRate?: number;
    orderNo?: string;
  }): Promise<void> {
    const tenantId = ensureTenantId();
    await http.post(
      '/api/v1/outsourcing-orders',
      {
        workOrderId: Number(payload.workOrderId),
        subcontractorId: Number(payload.subcontractorId),
        processCatalogId: Number(payload.processCatalogId),
        dispatchQty: payload.dispatchQty,
        unitPrice: payload.unitPrice,
        dispatchDate: payload.dispatchDate,
        expectedReturnDate: payload.expectedReturnDate,
        attritionRate: payload.attritionRate,
        orderNo: payload.orderNo?.trim() || undefined,
      },
      { params: { tenantId } },
    );
  },

  async updateStatus(orderId: string, status: string): Promise<void> {
    const tenantId = ensureTenantId();
    await http.post(
      `/api/v1/outsourcing-orders/${Number(orderId)}/update`,
      { status },
      { params: { tenantId } },
    );
  },

  async createMaterialRequest(payload: {
    orderId: string;
    materialId?: string;
    requestQuantity: number;
    requestedAt?: string;
    remark?: string;
  }): Promise<void> {
    const tenantId = ensureTenantId();
    await http.post(
      `/api/v1/outsourcing-orders/${Number(payload.orderId)}/material-requests`,
      {
        materialId: payload.materialId ? Number(payload.materialId) : undefined,
        requestQuantity: payload.requestQuantity,
        requestedAt: payload.requestedAt,
        remark: payload.remark?.trim() || undefined,
      },
      { params: { tenantId } },
    );
  },
};
