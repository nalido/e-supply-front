import dayjs from 'dayjs';
import type {
  SampleFollowProgress,
  SampleOrder,
  SampleQueryParams,
  SampleStats,
  SampleStatus,
} from '../../types/sample';
import type {
  SampleDevelopmentCostItem,
  SampleMaterialItem,
  SampleOrderDetail,
} from '../../types/sample-detail';

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
  styleNo?: string;
  unit?: string;
  unitPrice?: number;
  totalAmount?: number;
  deadline?: string;
  expectedFinishDate?: string;
  sampleTypeName?: string;
  previewImageUrl?: string;
  updatedAt?: string;
  followTemplateId?: number;
  followProgress?: SampleFollowProgressResponse;
};

export type SampleOrderListResponse = {
  items: SampleOrderSummaryResponse[];
  total: number;
  page: number;
  size: number;
};

export type SampleOrderDetailResponse = {
  id: number;
  tenantId: number;
  sampleNo: string;
  sampleTypeId?: number;
  sampleTypeName?: string;
  followTemplateId?: number;
  customerId?: number;
  customerName?: string;
  styleId?: number;
  styleNo?: string;
  styleName?: string;
  quantity?: number;
  unit?: string;
  unitPrice?: number;
  totalAmount?: number;
  priority: SamplePriorityResponse;
  status: SampleStatusResponse;
  deadline?: string;
  expectedFinishDate?: string;
  orderDate?: string;
  slaHours?: number;
  designerId?: number;
  designerName?: string;
  merchandiserId?: number;
  merchandiserName?: string;
  patternMakerId?: number;
  patternMakerName?: string;
  sampleSewerId?: number;
  sampleSewerName?: string;
  patternNo?: string;
  remarks?: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
  skus: Array<{ id?: number; color?: string; size?: string; quantity?: number }>;
  processes: Array<{
    id?: number;
    processCatalogId?: number;
    processCatalogName?: string;
    sequence?: number;
    plannedDurationMinutes?: number;
  }>;
  costs: Array<{ id?: number; costItem: string; amount: number }>;
  attachments: SampleOrderAssetResponse[];
  colorImages: SampleOrderAssetResponse[];
  materials: Array<{
    id?: number;
    materialId?: number;
    materialName?: string;
    materialSku?: string;
    unit?: string;
    imageUrl?: string;
    materialType?: 'FABRIC' | 'ACCESSORY';
    consumption: number;
    lossRate?: number;
    remark?: string;
    unitPrice?: number;
  }>;
  sizeChartImageUrl?: string;
  costTotal?: number;
  followProgress?: SampleFollowProgressResponse;
};

export type SampleFollowProgressResponse = {
  templateId?: number;
  templateName?: string;
  nodes?: SampleFollowProgressNodeResponse[];
};

export type SampleFollowProgressNodeResponse = {
  id?: number;
  templateNodeId?: number;
  nodeName: string;
  fieldType: string;
  sortOrder?: number;
  completed: boolean;
  statusValue?: string;
  completedAt?: string;
};

export type SampleOrderAssetResponse = {
  id?: number;
  assetType: 'ATTACHMENT' | 'COLOR_IMAGE' | 'SIZE_IMAGE';
  name?: string;
  url: string;
  fileType?: string;
  fileSize?: number;
  isMain?: boolean;
  color?: string;
  sortOrder?: number;
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
    styleCode: payload.styleNo ?? (payload.styleId ? `ST-${payload.styleId}` : fallbackText),
    unit: payload.unit ?? fallbackText,
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
    sampleType: payload.sampleTypeName ?? fallbackText,
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
    images: payload.previewImageUrl ? [payload.previewImageUrl] : [],
    colorImages: {},
    sampleTypeName: payload.sampleTypeName,
    styleId: payload.styleId ? String(payload.styleId) : undefined,
    styleNo: payload.styleNo,
    followTemplateId: payload.followTemplateId ? String(payload.followTemplateId) : undefined,
    followProgress: adaptFollowProgress(payload.followProgress),
  } satisfies SampleOrder;
};

const buildQuantityMatrix = (
  skus: SampleOrderDetailResponse['skus'],
): Record<string, Record<string, number>> => {
  const matrix: Record<string, Record<string, number>> = {};
  skus.forEach((sku) => {
    const color = sku.color || '未指定颜色';
    const size = sku.size || '均码';
    if (!matrix[color]) {
      matrix[color] = {};
    }
    matrix[color][size] = (matrix[color][size] || 0) + Number(sku.quantity ?? 0);
  });
  return matrix;
};

const collectUniqueValues = (values: Array<string | undefined>): string[] => {
  return Array.from(new Set(values.filter((item): item is string => Boolean(item))));
};

export const adaptSampleOrderDetail = (payload: SampleOrderDetailResponse): SampleOrderDetail => {
  const colors = collectUniqueValues(payload.skus?.map((sku) => sku.color) ?? []);
  const sizes = collectUniqueValues(payload.skus?.map((sku) => sku.size) ?? []);
  const quantityMatrix = buildQuantityMatrix(payload.skus ?? []);
  const attachments = (payload.attachments ?? []).map((asset) => ({
    id: String(asset.id ?? asset.url),
    name: asset.name || '附件',
    type: asset.fileType || 'image',
    size: asset.fileSize ? `${Math.round(asset.fileSize / 1024)}KB` : '',
    url: asset.url,
    updatedAt: payload.updatedAt || '',
  }));
  const processItems = (payload.processes ?? []).map((process, index) => ({
    id: String(process.id ?? index),
    name: process.processCatalogName || `工序${index + 1}`,
    sequence: process.sequence ?? index + 1,
    laborPrice: 0,
    standardTime: process.plannedDurationMinutes ?? undefined,
  }));
  const otherCosts = (payload.costs ?? []).map((cost, index) => ({
    id: String(cost.id ?? index),
    costType: cost.costItem,
    developmentCost: Number(cost.amount ?? 0),
    quotedUnitCost: Number(cost.amount ?? 0),
  }));
  const materialItems = (payload.materials ?? []).map((item, index) => {
    const consumption = Number(item.consumption ?? 0);
    const unitPrice = Number(item.unitPrice ?? 0);
    const cost = Number((consumption * unitPrice).toFixed(2));
    const category = item.materialType === 'FABRIC' ? 'fabric' : 'trim';
    return {
      id: String(item.id ?? `${item.materialId ?? index}`),
      materialId: item.materialId ? String(item.materialId) : undefined,
      category,
      name: item.materialName ?? `物料${index + 1}`,
      code: item.materialSku ?? '--',
      unit: item.unit ?? '件',
      consumption,
      unitPrice,
      cost,
      lossRate: Number(item.lossRate ?? 0),
      supplier: undefined,
      image: item.imageUrl,
      remark: item.remark,
    } satisfies SampleMaterialItem;
  });
  const bom = {
    fabrics: materialItems.filter((item) => item.category === 'fabric'),
    trims: materialItems.filter((item) => item.category !== 'fabric'),
  };
  const costTotal = Number(payload.costTotal ?? 0);
  const totalAmount = Number(payload.totalAmount ?? 0);
  const lineArtImage = attachments.find((asset) => asset.id === attachments[0]?.id && payload.attachments?.[0]?.isMain)?.url
    || payload.attachments?.find((asset) => asset.isMain)?.url
    || attachments[0]?.url;
  const sizeChartImage = payload.sizeChartImageUrl ?? undefined;
  const fabricCost = bom.fabrics.reduce((sum, item) => sum + item.cost, 0);
  const trimCost = bom.trims.reduce((sum, item) => sum + item.cost, 0);

  const materialDevelopmentDetails = [
    fabricCost > 0
      ? {
          id: 'fabric-cost',
          name: '面料成本',
          amount: fabricCost,
        }
      : null,
    trimCost > 0
      ? {
          id: 'trim-cost',
          name: '辅料成本',
          amount: trimCost,
        }
      : null,
  ].filter((item): item is SampleDevelopmentCostItem => Boolean(item));

  const otherDevelopmentDetails: SampleDevelopmentCostItem[] = otherCosts.map((item) => ({
    id: item.id,
    name: item.costType,
    amount: item.developmentCost,
  }));

  const developmentFeeDetails = [...materialDevelopmentDetails, ...otherDevelopmentDetails];
  const developmentFee = developmentFeeDetails.reduce((sum, item) => sum + item.amount, 0);

  return {
    id: String(payload.id),
    styleNo: payload.styleNo || '--',
    sampleNo: payload.sampleNo,
    followTemplateId: payload.followTemplateId ? String(payload.followTemplateId) : undefined,
    followProgress: adaptFollowProgress(payload.followProgress),
    merchandiser: payload.merchandiserName,
    patternMaker: payload.patternMakerName,
    patternPrice: Number(payload.unitPrice ?? 0),
    styleName: payload.styleName || '--',
    patternType: payload.sampleTypeName,
    patternDate: payload.orderDate || payload.createdAt || '',
    paperPatternNo: payload.patternNo,
    remarks: payload.remarks,
    unit: payload.unit || '件',
    customer: payload.customerName,
    estimatedDeliveryDate: payload.deadline,
    sampleSewer: payload.sampleSewerName,
    processingTypes: processItems.map((item) => item.name),
    lineArtImage,
    colors,
    sizes,
    quantityMatrix,
    bom,
    processes: processItems,
    sizeChartImage,
    otherCosts,
    attachments,
    cost: {
      totalQuotedPrice: totalAmount,
      developmentFee,
      breakdown: {
        fabric: fabricCost,
        trims: trimCost,
        packaging: 0,
        processing: costTotal,
      },
      developmentFeeDetails,
    },
  };
};

export const adaptFollowProgress = (
  payload?: SampleFollowProgressResponse,
): SampleFollowProgress | undefined => {
  if (!payload) {
    return undefined;
  }
  const nodes = (payload.nodes ?? []).map((node) => ({
    id: node.id ? String(node.id) : undefined,
    templateNodeId: node.templateNodeId ? String(node.templateNodeId) : undefined,
    nodeName: node.nodeName,
    fieldType: node.fieldType ?? 'text',
    sortOrder: node.sortOrder,
    completed: Boolean(node.completed),
    statusValue: node.statusValue ?? undefined,
    completedAt: node.completedAt,
  }));
  return {
    templateId: payload.templateId ? String(payload.templateId) : undefined,
    templateName: payload.templateName,
    nodes,
  };
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
