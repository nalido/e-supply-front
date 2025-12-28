import { apiConfig } from './config';
import http from './http';
import { tenantStore } from '../stores/tenant';
import type {
  OutsourcingManagementListItem,
  OutsourcingManagementListParams,
  OutsourcingManagementListResponse,
  OutsourcingManagementMeta,
  OutsourcingManagementProcessorOption,
  OutsourcingReceivePayload,
} from '../types/outsourcing-management';
import { outsourcingManagementService } from './mock';
import type { PartnerDataset } from '../types';
import { partnersApi } from './partners';

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

export const outsourcingManagementApi = {
  async getMeta(): Promise<OutsourcingManagementMeta> {
    if (useMock) {
      return outsourcingManagementService.getMeta();
    }
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
    if (useMock) {
      return outsourcingManagementService.getList(params);
    }
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
    if (useMock) {
      return;
    }
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
    if (useMock) {
      return outsourcingManagementService.export(params);
    }
    // 导出接口尚未开放，保持与 Mock 行为一致
    return { fileUrl: '' };
  },
};
