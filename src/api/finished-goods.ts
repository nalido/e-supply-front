import type {
  FinishedGoodsStockListParams,
  FinishedGoodsStockListResponse,
  FinishedGoodsStockMeta,
} from '../types/finished-goods-stock';
import type {
  FinishedGoodsPendingReceiptListParams,
  FinishedGoodsPendingReceiptListResponse,
  FinishedGoodsPendingReceiptMeta,
  FinishedGoodsPendingReceiptReceivePayload,
} from '../types/finished-goods-pending-receipt';
import type {
  FinishedGoodsReceivedListParams,
  FinishedGoodsReceivedListResponse,
  FinishedGoodsReceivedMeta,
  FinishedGoodsReceivedUpdatePayload,
} from '../types/finished-goods-received';
import type {
  FinishedGoodsOtherInboundListParams,
  FinishedGoodsOtherInboundListResponse,
  FinishedGoodsOtherInboundMeta,
  FinishedGoodsOtherInboundFormPayload,
} from '../types/finished-goods-other-inbound';
import type {
  FinishedGoodsOutboundListParams,
  FinishedGoodsOutboundListResponse,
  FinishedGoodsOutboundMeta,
  FinishedGoodsDispatchCreatePayload,
  FinishedGoodsDispatchSummary,
  FinishedGoodsDispatchUpdatePayload,
} from '../types/finished-goods-outbound';
import type {
  FinishedGoodsInventoryAggregation,
  FinishedGoodsInventoryListParams,
  FinishedGoodsInventoryListResponse,
  FinishedGoodsInventoryQueryParams,
} from '../types/finished-goods-inventory';
import { apiConfig } from './config';
import http from './http';
import { tenantStore } from '../stores/tenant';
import {
  finishedGoodsStockService as mockFinishedGoodsStockService,
  finishedGoodsPendingReceiptService as mockFinishedGoodsPendingReceiptService,
  finishedGoodsReceivedService as mockFinishedGoodsReceivedService,
  finishedGoodsOtherInboundService as mockFinishedGoodsOtherInboundService,
  finishedGoodsOutboundService as mockFinishedGoodsOutboundService,
  finishedGoodsInventoryReportService as mockFinishedGoodsInventoryReportService,
} from './mock';

const useMock = apiConfig.useMock;

const ensureTenantId = (): string => {
  const tenantId = tenantStore.getTenantId();
  if (!tenantId) {
    throw new Error('未找到企业信息，请重新登录');
  }
  return tenantId;
};

const toNumber = (value?: string): number | undefined => {
  if (!value) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
};

export const finishedGoodsStockService = {
  async getMeta(): Promise<FinishedGoodsStockMeta> {
    if (useMock) {
      return mockFinishedGoodsStockService.getMeta();
    }
    const tenantId = ensureTenantId();
    const { data } = await http.get<FinishedGoodsStockMeta>('/api/v1/finished-goods/stock/meta', {
      params: { tenantId },
    });
    return data;
  },
  async getList(params: FinishedGoodsStockListParams): Promise<FinishedGoodsStockListResponse> {
    if (useMock) {
      return mockFinishedGoodsStockService.getList(params);
    }
    const tenantId = ensureTenantId();
    const { data } = await http.get<FinishedGoodsStockListResponse>('/api/v1/finished-goods/stock', {
      params: {
        tenantId,
        onlyInStock: params.onlyInStock,
        warehouseId: toNumber(params.warehouseId),
        keywordSku: params.keywordSku,
        keywordMixed: params.keywordMixed,
        groupBy: params.groupBy,
        page: params.page,
        pageSize: params.pageSize,
      },
    });
    return data;
  },
};

export const finishedGoodsPendingReceiptService = {
  async getMeta(): Promise<FinishedGoodsPendingReceiptMeta> {
    if (useMock) {
      return mockFinishedGoodsPendingReceiptService.getMeta();
    }
    const tenantId = ensureTenantId();
    const { data } = await http.get<FinishedGoodsPendingReceiptMeta>(
      '/api/v1/finished-goods/pending-receipts/meta',
      { params: { tenantId } },
    );
    return data;
  },
  async getList(params: FinishedGoodsPendingReceiptListParams): Promise<FinishedGoodsPendingReceiptListResponse> {
    if (useMock) {
      return mockFinishedGoodsPendingReceiptService.getList(params);
    }
    const tenantId = ensureTenantId();
    const { data } = await http.get<FinishedGoodsPendingReceiptListResponse>(
      '/api/v1/finished-goods/pending-receipts',
      {
        params: {
          tenantId,
          includeCompleted: params.includeCompleted,
          orderType: params.orderType,
          keywordOrderOrStyle: params.keywordOrderOrStyle,
          keywordCustomer: params.keywordCustomer,
          keywordSku: params.keywordSku,
          page: params.page,
          pageSize: params.pageSize,
        },
      },
    );
    return data;
  },
  async receive(payload: FinishedGoodsPendingReceiptReceivePayload): Promise<boolean> {
    if (useMock) {
      return mockFinishedGoodsPendingReceiptService.receive(payload);
    }
    const tenantId = ensureTenantId();
    const { data } = await http.post<unknown>(
      '/api/v1/finished-goods/pending-receipts/receive',
      {
        warehouseId: toNumber(payload.warehouseId),
        remark: payload.remark,
        items: payload.items.map((item) => ({ id: item.id, receiptQty: item.receiptQty })),
      },
      { params: { tenantId } },
    );
    return Array.isArray(data) ? data.length > 0 : true;
  },
};

export const finishedGoodsReceivedService = {
  async getMeta(): Promise<FinishedGoodsReceivedMeta> {
    if (useMock) {
      return mockFinishedGoodsReceivedService.getMeta();
    }
    const tenantId = ensureTenantId();
    const { data } = await http.get<FinishedGoodsReceivedMeta>('/api/v1/finished-goods/received/meta', {
      params: { tenantId },
    });
    return data;
  },
  async getList(params: FinishedGoodsReceivedListParams): Promise<FinishedGoodsReceivedListResponse> {
    if (useMock) {
      return mockFinishedGoodsReceivedService.getList(params);
    }
    const tenantId = ensureTenantId();
    const { data } = await http.get<FinishedGoodsReceivedListResponse>('/api/v1/finished-goods/received', {
      params: {
        tenantId,
        viewMode: params.viewMode,
        warehouseId: params.warehouseId ? Number(params.warehouseId) : undefined,
        keywordOrderOrStyle: params.keywordOrderOrStyle,
        keywordProcessor: params.keywordProcessor,
        page: params.page,
        pageSize: params.pageSize,
      },
    });
    return data;
  },
  async update(id: string, payload: FinishedGoodsReceivedUpdatePayload): Promise<void> {
    if (useMock) {
      await mockFinishedGoodsReceivedService.update(id, payload);
      return;
    }
    const tenantId = ensureTenantId();
    await http.post(
      `/api/v1/finished-goods/received/${id}/update`,
      {
        warehouseId: Number(payload.warehouseId),
        quantity: payload.quantity,
        remark: payload.remark,
      },
      { params: { tenantId } },
    );
  },
  async remove(ids: string[]): Promise<number> {
    if (useMock) {
      const response = await mockFinishedGoodsReceivedService.remove(ids);
      return response.success ? ids.length : 0;
    }
    const tenantId = ensureTenantId();
    const { data } = await http.post<{ removed: number }>(
      '/api/v1/finished-goods/received/delete',
      { ids },
      { params: { tenantId } },
    );
    return data.removed;
  },
  async export(params: FinishedGoodsReceivedListParams): Promise<void> {
    if (useMock) {
      await mockFinishedGoodsReceivedService.export(params);
      return;
    }
    const tenantId = ensureTenantId();
    await http.post(
      '/api/v1/finished-goods/received/export',
      null,
      {
        params: {
          tenantId,
          viewMode: params.viewMode,
          warehouseId: params.warehouseId ? Number(params.warehouseId) : undefined,
          keywordOrderOrStyle: params.keywordOrderOrStyle,
          keywordProcessor: params.keywordProcessor,
        },
      },
    );
  },
};

export const finishedGoodsOtherInboundService = {
  async getMeta(): Promise<FinishedGoodsOtherInboundMeta> {
    if (useMock) {
      return mockFinishedGoodsOtherInboundService.getMeta();
    }
    const tenantId = ensureTenantId();
    const { data } = await http.get<FinishedGoodsOtherInboundMeta>(
      '/api/v1/finished-goods/other-inbound/meta',
      { params: { tenantId } },
    );
    return data;
  },
  async getList(params: FinishedGoodsOtherInboundListParams): Promise<FinishedGoodsOtherInboundListResponse> {
    if (useMock) {
      return mockFinishedGoodsOtherInboundService.getList(params);
    }
    const tenantId = ensureTenantId();
    const { data } = await http.get<FinishedGoodsOtherInboundListResponse>(
      '/api/v1/finished-goods/other-inbound',
      {
        params: {
          tenantId,
          viewMode: params.viewMode,
          warehouseId: params.warehouseId ? Number(params.warehouseId) : undefined,
          keyword: params.keyword,
          page: params.page,
          pageSize: params.pageSize,
        },
      },
    );
    return data;
  },
  async create(payload: FinishedGoodsOtherInboundFormPayload): Promise<void> {
    if (useMock) {
      await mockFinishedGoodsOtherInboundService.create(payload);
      return;
    }
    const tenantId = ensureTenantId();
    await http.post(
      '/api/v1/finished-goods/other-inbound',
      {
        warehouseId: Number(payload.warehouseId),
        processorId: Number(payload.processorId),
        styleId: Number(payload.styleId),
        color: payload.color,
        size: payload.size,
        inboundQty: payload.inboundQty,
        unitPrice: payload.unitPrice,
        receiptAt: payload.receiptAt,
        inboundType: payload.inboundType,
        remark: payload.remark,
      },
      { params: { tenantId } },
    );
  },
  async update(id: string, payload: FinishedGoodsOtherInboundFormPayload): Promise<void> {
    if (useMock) {
      await mockFinishedGoodsOtherInboundService.update(id, payload);
      return;
    }
    const tenantId = ensureTenantId();
    await http.post(
      `/api/v1/finished-goods/other-inbound/${id}/update`,
      {
        warehouseId: Number(payload.warehouseId),
        processorId: Number(payload.processorId),
        styleId: Number(payload.styleId),
        color: payload.color,
        size: payload.size,
        inboundQty: payload.inboundQty,
        unitPrice: payload.unitPrice,
        receiptAt: payload.receiptAt,
        inboundType: payload.inboundType,
        remark: payload.remark,
      },
      { params: { tenantId } },
    );
  },
  async remove(ids: string[]): Promise<number> {
    if (useMock) {
      return mockFinishedGoodsOtherInboundService.remove(ids);
    }
    const tenantId = ensureTenantId();
    const { data } = await http.post<{ removed: number }>(
      '/api/v1/finished-goods/other-inbound/delete',
      { ids },
      { params: { tenantId } },
    );
    return data.removed;
  },
};

export const finishedGoodsOutboundService = {
  async getMeta(): Promise<FinishedGoodsOutboundMeta> {
    if (useMock) {
      return mockFinishedGoodsOutboundService.getMeta();
    }
    const tenantId = ensureTenantId();
    const { data } = await http.get<FinishedGoodsOutboundMeta>('/api/v1/finished-goods/outbound/meta', {
      params: { tenantId },
    });
    return data;
  },
  async getList(params: FinishedGoodsOutboundListParams): Promise<FinishedGoodsOutboundListResponse> {
    if (useMock) {
      return mockFinishedGoodsOutboundService.getList(params);
    }
    const tenantId = ensureTenantId();
    const { data } = await http.get<FinishedGoodsOutboundListResponse>(
      '/api/v1/finished-goods/outbound',
      {
        params: {
          tenantId,
          showCompletedOrders: params.showCompletedOrders,
          customerId: params.customerId ? Number(params.customerId) : undefined,
          warehouseId: params.warehouseId ? Number(params.warehouseId) : undefined,
          groupBy: params.groupBy,
          keyword: params.keyword,
          page: params.page,
          pageSize: params.pageSize,
        },
      },
    );
    return data;
  },
};

export const finishedGoodsDispatchService = {
  async create(payload: FinishedGoodsDispatchCreatePayload): Promise<FinishedGoodsDispatchSummary> {
    if (useMock) {
      return mockFinishedGoodsOutboundService.createDispatch(payload);
    }
    const tenantId = ensureTenantId();
    const requestBody: Record<string, unknown> = {
      warehouseId: Number(payload.warehouseId),
      productionOrderId: payload.productionOrderId ? Number(payload.productionOrderId) : undefined,
      logisticsProviderId: payload.logisticsProviderId ? Number(payload.logisticsProviderId) : undefined,
      dispatchAt: payload.dispatchAt,
      remark: payload.remark,
      transferReference: payload.trackingNo,
      items: payload.items.map((item) => ({
        styleVariantId: Number(item.styleVariantId),
        quantity: Math.floor(item.quantity),
        unitPrice: item.unitPrice,
        trackingNo: payload.trackingNo,
      })),
    };
    if (payload.customerId) {
      requestBody.customerId = Number(payload.customerId);
    }
    const { data } = await http.post<FinishedGoodsDispatchSummary>(
      '/api/v1/finished-goods/dispatches',
      requestBody,
      { params: { tenantId } },
    );
    return data;
  },
  async update(id: string, payload: FinishedGoodsDispatchUpdatePayload): Promise<void> {
    if (useMock) {
      await mockFinishedGoodsOutboundService.updateDispatch(id, payload);
      return;
    }
    const tenantId = ensureTenantId();
    await http.post(
      `/api/v1/finished-goods/dispatches/${id}/update`,
      {
        status: payload.status ? payload.status.toUpperCase() : undefined,
        logisticsProviderId: payload.logisticsProviderId ? Number(payload.logisticsProviderId) : undefined,
        trackingNo: payload.trackingNo,
        dispatchAt: payload.dispatchAt,
        remark: payload.remark,
      },
      { params: { tenantId } },
    );
  },
  async remove(ids: string[]): Promise<number> {
    if (useMock) {
      const result = await mockFinishedGoodsOutboundService.removeDispatches(ids);
      return result.removed;
    }
    const tenantId = ensureTenantId();
    const { data } = await http.post<{ removed: number }>(
      '/api/v1/finished-goods/dispatches/delete',
      { ids },
      { params: { tenantId } },
    );
    return data.removed;
  },
};

export const finishedGoodsInventoryReportService = {
  async getOverview(params: FinishedGoodsInventoryQueryParams = {}): Promise<FinishedGoodsInventoryAggregation> {
    if (useMock) {
      return mockFinishedGoodsInventoryReportService.getOverview(params);
    }
    const tenantId = ensureTenantId();
    const { data } = await http.get<FinishedGoodsInventoryAggregation>(
      '/api/v1/finished-goods/inventory/aggregation',
      { params: { tenantId, ...params } },
    );
    return data;
  },
  async getList(params: FinishedGoodsInventoryListParams): Promise<FinishedGoodsInventoryListResponse> {
    if (useMock) {
      return mockFinishedGoodsInventoryReportService.getList(params);
    }
    const tenantId = ensureTenantId();
    const { data } = await http.get<FinishedGoodsInventoryListResponse>(
      '/api/v1/finished-goods/inventory',
      {
        params: {
          tenantId,
          startDate: params.startDate,
          endDate: params.endDate,
          keyword: params.keyword,
          page: params.page,
          pageSize: params.pageSize,
        },
      },
    );
    return data;
  },
};
