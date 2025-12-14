import type { SampleFollowProgress, SampleOrder, SampleQueryParams, SampleStats } from '../types/sample';
import type { SampleOrderDetail } from '../types/sample-detail';
import type { SampleCreationMeta, SampleCreationPayload } from '../types/sample-create';
import http from './http';
import { apiConfig } from './config';
import { sampleService } from './mock';
import { tenantStore } from '../stores/tenant';
import {
  adaptSampleOrderSummary,
  adaptSampleOrderDetail,
  buildListQuery,
  buildStatsFromCounters,
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
  customers: Array<{ id: number; name: string }>;
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
  customerId: string;
  styleId: string;
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
  processes: Array<{
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
  customers: (payload.customers ?? []).map((customer) => ({
    id: String(customer.id),
    name: customer.name,
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
  customerId: toNumber(payload.customerId),
  styleId: toNumber(payload.styleId),
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

const toMockCreationPayload = (payload: SampleOrderCreateInput): SampleCreationPayload => {
  const colors = Array.from(new Set(payload.skus?.map((sku) => sku.color || '默认颜色') ?? ['默认颜色']));
  const sizes = Array.from(new Set(payload.skus?.map((sku) => sku.size || '均码') ?? ['均码']));
  const quantityMatrix = colors.reduce<Record<string, Record<string, number>>>((matrix, color) => {
    matrix[color] = sizes.reduce<Record<string, number>>((row, size) => {
      const matchingSku = payload.skus?.find((sku) => (sku.color || '默认颜色') === color && (sku.size || '均码') === size);
      row[size] = matchingSku?.quantity ?? 0;
      return row;
    }, {});
    return matrix;
  }, {});
  return {
    unit: payload.unit || '件',
    followTemplateId: payload.followTemplateId,
    orderNo: payload.sampleNo,
    styleId: payload.styleId,
    customerId: payload.customerId,
    merchandiserId: payload.merchandiserId,
    patternMakerId: payload.patternMakerId,
    sampleSewerId: payload.sampleSewerId,
    patternPrice: payload.unitPrice,
    orderDate: payload.orderDate,
    deliveryDate: payload.deadline,
    remarks: payload.remarks,
    description: payload.description,
    processes: payload.processes?.map((process, index) => ({
      id: String(process.processCatalogId ?? index),
      name: `工序${index + 1}`,
      order: process.sequence ?? index + 1,
      custom: true,
    })) ?? [],
    colors,
    sizes,
    quantityMatrix,
    colorImagesEnabled: (payload.assets ?? []).some((asset) => asset.type === 'COLOR_IMAGE'),
    colorImageMap: (payload.assets ?? [])
      .filter((asset) => asset.type === 'COLOR_IMAGE' && asset.color)
      .reduce<Record<string, string | undefined>>((acc, asset) => {
        if (asset.color) {
          acc[asset.color] = asset.url;
        }
        return acc;
      }, {}),
    attachments: (payload.assets ?? [])
      .filter((asset) => asset.type === 'ATTACHMENT')
      .map((asset, index) => ({
        id: asset.name ?? `att-${index}`,
        url: asset.url,
        isMain: asset.isMain,
        createdAt: new Date().toISOString(),
      })),
  } as SampleCreationPayload;
};

export const sampleOrderApi = {
  async list(params: SampleQueryParams & { page?: number; pageSize?: number }): Promise<SampleOrderListResult> {
    if (apiConfig.useMock) {
      const result = await sampleService.getSampleOrders(params);
      return result;
    }

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
    if (apiConfig.useMock) {
      return sampleService.getSampleStats(params);
    }

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
    if (apiConfig.useMock) {
      return sampleService.getSampleDetail(id);
    }
    const tenantId = ensureTenantId();
    const data = await fetchBackendSampleDetail(tenantId, id);
    return adaptSampleOrderDetail(data);
  },

  async detailRaw(id: string): Promise<SampleOrderDetailResponse> {
    if (apiConfig.useMock) {
      throw new Error('当前处于 Mock 模式，无法获取样板单原始详情');
    }
    const tenantId = ensureTenantId();
    return fetchBackendSampleDetail(tenantId, id);
  },

  async create(payload: SampleOrderCreateInput): Promise<SampleOrderDetail> {
    if (apiConfig.useMock) {
      const response = await sampleService.createSampleOrder(toMockCreationPayload(payload));
      if (!response.success) {
        throw new Error(response.message || '创建失败');
      }
      return sampleService.getSampleDetail(response.order.id);
    }
    const tenantId = ensureTenantId();
    const body = buildCreateRequest(tenantId, payload);
    const { data } = await http.post<SampleOrderDetailResponse>('/api/v1/sample-orders', body);
    return adaptSampleOrderDetail(data);
  },

  async update(id: string, payload: SampleOrderCreateInput): Promise<SampleOrderDetail> {
    if (apiConfig.useMock) {
      throw new Error('Mock 模式暂不支持编辑样板单');
    }
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
    if (apiConfig.useMock) {
      return sampleService.updateFollowProgressNode(orderId, nodeId, payload);
    }
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
    if (apiConfig.useMock) {
      return Promise.resolve();
    }
    const tenantId = ensureTenantId();
    await http.post(`/api/v1/sample-orders/${id}/copy`, undefined, { params: { tenantId } });
  },

  async delete(id: string): Promise<void> {
    if (apiConfig.useMock) {
      return Promise.resolve();
    }
    const tenantId = ensureTenantId();
    await http.post(`/api/v1/sample-orders/${id}/delete`, undefined, { params: { tenantId } });
  },

  async getMeta(): Promise<SampleCreationMeta> {
    if (apiConfig.useMock) {
      return sampleService.getCreationMeta();
    }
    const tenantId = ensureTenantId();
    const { data } = await http.get<SampleOrderMetaResponse>('/api/v1/sample-orders/meta', {
      params: { tenantId },
    });
    return adaptMetaResponse(data);
  },
};

export default sampleOrderApi;
