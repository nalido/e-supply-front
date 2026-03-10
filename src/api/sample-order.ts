import type { SampleFollowProgress, SampleOrder, SampleQueryParams, SampleStats } from '../types/sample';
import type { SampleOrderDetail } from '../types/sample-detail';
import type { SampleCreationMeta } from '../types/sample-create';
import http from './http';
import { tenantStore } from '../stores/tenant';
import {
  adaptSampleOrderSummary,
  adaptSampleOrderDetail,
  buildListQuery,
  buildStatsFromCounters,
  mapStatusToBackend,
  mapPriorityToBackend,
  type SampleOrderDetailResponse,
  type SampleOrderListResponse,
  adaptFollowProgress,
  type SampleFollowProgressResponse,
} from './adapters/sample-order';

export type SampleOrderListResult = {
  list: SampleOrder[];
  total: number;
  page: number;
  pageSize: number;
};

export type SampleOrderExportParams = SampleQueryParams & {
  orderIds?: string[];
};

type ExportResponse = {
  fileUrl: string;
};

type SampleOrderStatsPayload = {
  total: number;
  pending: number;
  approved: number;
  inProduction: number;
  closed: number;
  cancelled: number;
  urgent: number;
  thisMonth: number;
};

type SampleOrderMetaStaffResponse = {
  id: number;
  name: string;
  title?: string;
};

type SampleOrderMetaProcessResponse = {
  id: number;
  name: string;
  description?: string;
  defaultDurationMinutes?: number;
};

type SampleOrderMetaResponse = {
  units: string[];
  sampleTypes: Array<{ id: number; name: string }>;
  followTemplates: Array<{ id: number; name: string; isDefault?: boolean }>;
  merchandisers: SampleOrderMetaStaffResponse[];
  patternMakers: SampleOrderMetaStaffResponse[];
  sampleSewers: SampleOrderMetaStaffResponse[];
  designers: SampleOrderMetaStaffResponse[];
  processLibrary: SampleOrderMetaProcessResponse[];
  defaultProcesses: SampleOrderMetaProcessResponse[];
  colorPresets: string[];
  sizePresets: string[];
};

export type SampleOrderCreateInput = {
  sampleNo: string;
  sampleTypeId?: string;
  followTemplateId?: string;
  styleId?: string;
  styleCode: string;
  styleName: string;
  styleSyncMode?: 'create_new' | 'update_existing' | 'keep_existing';
  styleUpdateConfirmed?: boolean;
  styleVariantId?: string;
  quantity: number;
  unit?: string;
  unitPrice?: number;
  totalAmount?: number;
  priority?: SampleOrder['priority'];
  deadline?: string;
  expectedFinishDate?: string;
  orderDate?: string;
  slaHours?: number;
  designerId?: string;
  merchandiserId?: string;
  patternMakerId?: string;
  patternNo?: string;
  sampleSewerId?: string;
  sourceType?: string;
  remarks?: string;
  description?: string;
  skus: Array<{ color?: string; size?: string; quantity: number }>;
  processes?: Array<{
    processCatalogId: string;
    sequence?: number;
    plannedDurationMinutes?: number;
    departmentId?: string;
  }>;
  costs: Array<{ costItem: string; amount: number }>;
  materials?: Array<{
    materialId: string;
    consumption: number;
    lossRate?: number;
    remark?: string;
  }>;
  assets: Array<{
    type: 'ATTACHMENT' | 'COLOR_IMAGE' | 'SIZE_IMAGE';
    url: string;
    name?: string;
    fileType?: string;
    fileSize?: number;
    isMain?: boolean;
    sortOrder?: number;
    color?: string;
  }>;
};

const ensureTenantId = (): string => {
  const tenantId = tenantStore.getTenantId();
  if (!tenantId) {
    throw new Error('tenantId is not set');
  }
  return tenantId;
};

const adaptMetaResponse = (payload: SampleOrderMetaResponse): SampleCreationMeta => ({
  units: payload.units ?? [],
  sampleTypes: (payload.sampleTypes ?? []).map((item) => ({
    id: String(item.id),
    name: item.name,
  })),
  followTemplates: (payload.followTemplates ?? []).map((item) => ({
    id: String(item.id),
    name: item.name,
    isDefault: Boolean(item.isDefault),
  })),
  merchandisers: (payload.merchandisers ?? []).map((staff) => ({
    id: String(staff.id),
    name: staff.name,
    title: staff.title,
  })),
  patternMakers: (payload.patternMakers ?? []).map((staff) => ({
    id: String(staff.id),
    name: staff.name,
    title: staff.title,
  })),
  sampleSewers: (payload.sampleSewers ?? []).map((staff) => ({
    id: String(staff.id),
    name: staff.name,
    title: staff.title,
  })),
  designers: (payload.designers ?? []).map((staff) => ({
    id: String(staff.id),
    name: staff.name,
    title: staff.title,
  })),
  processLibrary: (payload.processLibrary ?? []).map((process) => ({
    id: String(process.id),
    name: process.name,
    description: process.description,
    defaultDuration: process.defaultDurationMinutes,
  })),
  defaultProcesses: (payload.defaultProcesses ?? []).map((process, index) => ({
    id: String(process.id ?? index),
    name: process.name,
    order: index + 1,
    defaultDuration: process.defaultDurationMinutes,
  })),
  colorPresets: payload.colorPresets ?? [],
  sizePresets: payload.sizePresets ?? [],
});

const toNumber = (value?: string | number): number | undefined => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const buildCreateRequest = (tenantId: string, payload: SampleOrderCreateInput) => ({
  tenantId: Number(tenantId),
  sampleNo: payload.sampleNo,
  sampleTypeId: toNumber(payload.sampleTypeId),
  followTemplateId: toNumber(payload.followTemplateId),
  styleId: toNumber(payload.styleId),
  styleCode: payload.styleCode,
  styleName: payload.styleName,
  styleSyncMode: payload.styleSyncMode,
  styleUpdateConfirmed: payload.styleUpdateConfirmed,
  styleVariantId: toNumber(payload.styleVariantId),
  quantity: payload.quantity,
  unit: payload.unit,
  unitPrice: payload.unitPrice,
  totalAmount: payload.totalAmount,
  priority: payload.priority ? mapPriorityToBackend(payload.priority) : undefined,
  deadline: payload.deadline,
  expectedFinishDate: payload.expectedFinishDate,
  orderDate: payload.orderDate,
  slaHours: payload.slaHours,
  designerId: toNumber(payload.designerId),
  merchandiserId: toNumber(payload.merchandiserId),
  patternMakerId: toNumber(payload.patternMakerId),
  patternNo: payload.patternNo,
  sampleSewerId: toNumber(payload.sampleSewerId),
  sourceType: payload.sourceType,
  remarks: payload.remarks,
  description: payload.description,
  skus: payload.skus?.map((sku) => ({
    color: sku.color,
    size: sku.size,
    quantity: sku.quantity,
  })),
  processes: payload.processes?.map((process) => ({
    processCatalogId: toNumber(process.processCatalogId),
    sequence: process.sequence,
    plannedDurationMinutes: process.plannedDurationMinutes,
    departmentId: toNumber(process.departmentId),
  })),
  costs: payload.costs?.map((cost) => ({ costItem: cost.costItem, amount: cost.amount })),
  materials: payload.materials?.map((material) => ({
    materialId: toNumber(material.materialId),
    consumption: material.consumption,
    lossRate: material.lossRate,
    remark: material.remark,
  })),
  assets: payload.assets?.map((asset, index) => ({
    name: asset.name,
    url: asset.url,
    fileType: asset.fileType,
    fileSize: asset.fileSize,
    isMain: asset.isMain ?? false,
    sortOrder: asset.sortOrder ?? index,
    color: asset.color,
    assetType: asset.type,
  })),
});

const fetchBackendSampleDetail = async (
  tenantId: string,
  id: string,
): Promise<SampleOrderDetailResponse> => {
  const { data } = await http.get<SampleOrderDetailResponse>(`/api/v1/sample-orders/${id}`,
    { params: { tenantId } },
  );
  return data;
};

export const sampleOrderApi = {
  async list(params: SampleQueryParams & { page?: number; pageSize?: number }): Promise<SampleOrderListResult> {
    const tenantId = ensureTenantId();
    const query = buildListQuery(params);
    const { data } = await http.get<SampleOrderListResponse>('/api/v1/sample-orders', {
      params: {
        tenantId,
        ...query,
      },
    });

    const pageZero = typeof data.page === 'number' ? data.page : 0;
    const size = typeof data.size === 'number' ? data.size : params.pageSize ?? 20;

    return {
      list: (data.items ?? []).map(adaptSampleOrderSummary),
      total: Number(data.total ?? 0),
      page: pageZero + 1,
      pageSize: size,
    };
  },

  async getStats(params: SampleQueryParams = {}): Promise<SampleStats> {
    const tenantId = ensureTenantId();
    const query = buildListQuery({ ...params, status: undefined });
    const { data } = await http.get<SampleOrderStatsPayload>('/api/v1/sample-orders/stats', {
      params: { tenantId, ...query },
    });

    return buildStatsFromCounters(
      {
        total: data.total,
        pending: data.pending,
        approved: data.approved,
        inProduction: data.inProduction,
        closed: data.closed,
        cancelled: data.cancelled,
      },
      data.urgent,
      data.thisMonth,
    );
  },

  async detail(id: string): Promise<SampleOrderDetail> {
    const tenantId = ensureTenantId();
    const data = await fetchBackendSampleDetail(tenantId, id);
    return adaptSampleOrderDetail(data);
  },

  async detailRaw(id: string): Promise<SampleOrderDetailResponse> {
    const tenantId = ensureTenantId();
    return fetchBackendSampleDetail(tenantId, id);
  },

  async create(payload: SampleOrderCreateInput): Promise<SampleOrderDetail> {
    const tenantId = ensureTenantId();
    const body = buildCreateRequest(tenantId, payload);
    const { data } = await http.post<SampleOrderDetailResponse>('/api/v1/sample-orders', body);
    return adaptSampleOrderDetail(data);
  },

  async update(id: string, payload: SampleOrderCreateInput): Promise<SampleOrderDetail> {
    const tenantId = ensureTenantId();
    const body = buildCreateRequest(tenantId, payload);
    const { data } = await http.post<SampleOrderDetailResponse>(`/api/v1/sample-orders/${id}/update`, body);
    return adaptSampleOrderDetail(data);
  },

  async updateFollowProgressNode(
    orderId: string,
    nodeId: string,
    payload: { completed: boolean; statusValue?: string },
  ): Promise<SampleFollowProgress | undefined> {
    const tenantId = ensureTenantId();
    const { data } = await http.post<SampleFollowProgressResponse>(
      `/api/v1/sample-orders/${orderId}/follow-progress/${nodeId}/update`,
      {
        tenantId: Number(tenantId),
        completed: payload.completed,
        statusValue: payload.statusValue,
      },
    );
    return adaptFollowProgress(data);
  },

  async copy(id: string): Promise<void> {
    const tenantId = ensureTenantId();
    await http.post(`/api/v1/sample-orders/${id}/copy`, undefined, { params: { tenantId } });
  },

  async delete(id: string): Promise<void> {
    const tenantId = ensureTenantId();
    await http.post(`/api/v1/sample-orders/${id}/delete`, undefined, { params: { tenantId } });
  },

  async updateStatus(id: string, status: SampleOrder['status'], note?: string): Promise<void> {
    const tenantId = ensureTenantId();
    await http.post(
      `/api/v1/sample-orders/${id}/status/update`,
      {
        status: mapStatusToBackend(status),
        note,
      },
      { params: { tenantId } },
    );
  },

  async getMeta(): Promise<SampleCreationMeta> {
    const tenantId = ensureTenantId();
    const { data } = await http.get<SampleOrderMetaResponse>('/api/v1/sample-orders/meta', {
      params: { tenantId },
    });
    return adaptMetaResponse(data);
  },

  async exportList(params: SampleOrderExportParams): Promise<ExportResponse> {
    const tenantId = ensureTenantId();
    const response = await http.post<ExportResponse>(
      '/api/v1/sample-orders/export',
      {
        status: mapStatusToBackend(params.status),
        priority: params.priority ? mapPriorityToBackend(params.priority) : undefined,
        startDeadline: params.startDate,
        endDeadline: params.endDate,
        keyword: params.keyword,
        orderIds: params.orderIds
          ?.map((value) => {
            const parsed = Number(value);
            return Number.isFinite(parsed) ? parsed : undefined;
          })
          .filter((value): value is number => typeof value === 'number'),
      },
      { params: { tenantId } },
    );
    return response.data;
  },
};

export default sampleOrderApi;
