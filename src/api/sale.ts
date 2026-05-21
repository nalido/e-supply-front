import http from './http';
import { tenantStore } from '../stores/tenant';
import type {
  SaleChannelAccount,
  SaleChannelCredential,
  SaleInventoryItem,
  SaleFulfillmentDemandDetail,
  SaleFulfillmentDemandItem,
  SaleFulfillmentDemandStats,
  SaleFulfillmentItem,
  SaleFulfillmentWorkbenchResolveResult,
  SaleIdempotencyRecordItem,
  SaleOrderDetail,
  SaleOrderSyncResult,
  SaleOrderItem,
  SaleProductSyncStatus,
  SaleProductSyncTaskSubmitResponse,
  SaleProductPublishDraftPreview,
  SaleProductPublishBatch,
  SaleProductPublishBatchList,
  SaleProductPublishResponse,
  SaleProductPublishSourceList,
  SaleRetryCandidateItem,
  SaleSalesOverview,
  SaleSalesProductDetail,
  SaleSalesProductList,
  SaleSyncLogItem,
  SaleTemuFullyManagedWorkbenchInitResult,
  SaleTemuFullyManagedWorkbenchSubmitResult,
} from '../types/sale';

type BackendListResponse<T> = {
  list?: T[];
  total?: number;
};

const getTenantIdOrThrow = (): string => {
  const tenantId = tenantStore.getTenantId();
  if (!tenantId) {
    throw new Error('Tenant ID is not available.');
  }
  return tenantId;
};

export const saleApi = {
  async listChannelAccounts(): Promise<SaleChannelAccount[]> {
    const tenantId = getTenantIdOrThrow();
    const response = await http.get<BackendListResponse<SaleChannelAccount>>('/api/v1/channel/accounts', {
      params: { tenantId },
    });
    return response.data.list ?? [];
  },

  async getChannelCredentialDetail(accountId: string): Promise<SaleChannelCredential> {
    const tenantId = getTenantIdOrThrow();
    const response = await http.get<SaleChannelCredential>(`/api/v1/channel/credentials/${accountId}`, {
      params: { tenantId },
    });
    return response.data;
  },

  async createChannelAccount(payload: {
    platformCode: string;
    accountName: string;
    shopId?: string;
    shopName?: string;
    regionCode?: string;
    gatewayUrl?: string;
    sellerType?: string;
    orderSyncMode?: string;
    orderAutoSyncEnabled?: boolean;
    orderAutoSyncIntervalMinutes?: number;
    orderAutoSyncPageSize?: number;
    authorizationType?: string;
    remarks?: string;
  }): Promise<SaleChannelAccount> {
    const tenantId = getTenantIdOrThrow();
    const response = await http.post<SaleChannelAccount>('/api/v1/channel/accounts', payload, {
      params: { tenantId },
    });
    return response.data;
  },

  async updateChannelAccount(
    accountId: string,
    payload: {
      accountName?: string;
      shopId?: string;
      shopName?: string;
      regionCode?: string;
      gatewayUrl?: string;
      sellerType?: string;
      orderSyncMode?: string;
      orderAutoSyncEnabled?: boolean;
      orderAutoSyncIntervalMinutes?: number;
      orderAutoSyncPageSize?: number;
      authorizationType?: string;
      status?: string;
      remarks?: string;
    },
  ): Promise<SaleChannelAccount> {
    const tenantId = getTenantIdOrThrow();
    const response = await http.post<SaleChannelAccount>(`/api/v1/channel/accounts/${accountId}/update`, payload, {
      params: { tenantId },
    });
    return response.data;
  },

  async deleteChannelAccount(accountId: string): Promise<SaleChannelAccount> {
    const tenantId = getTenantIdOrThrow();
    const response = await http.post<SaleChannelAccount>(`/api/v1/channel/accounts/${accountId}/delete`, {}, {
      params: { tenantId },
    });
    return response.data;
  },

  async updateChannelCredential(
    accountId: string,
    payload: {
      appKey: string;
      appSecret: string;
      accessToken?: string;
      refreshToken?: string;
      status?: string;
      extraPayload?: Record<string, unknown> | string;
    },
  ): Promise<SaleChannelCredential> {
    const tenantId = getTenantIdOrThrow();
    const normalizedPayload = { ...payload } as {
      appKey: string;
      appSecret: string;
      accessToken?: string;
      refreshToken?: string;
      status?: string;
      extraPayload?: Record<string, unknown>;
    };
    const rawExtraPayload = (payload as { extraPayload?: unknown }).extraPayload;
    if (typeof rawExtraPayload === 'string') {
      const text = rawExtraPayload.trim();
      normalizedPayload.extraPayload = text ? (JSON.parse(text) as Record<string, unknown>) : undefined;
    }
    const response = await http.post<SaleChannelCredential>(
      `/api/v1/channel/credentials/${accountId}/update`,
      normalizedPayload,
      {
        params: { tenantId },
      },
    );
    return response.data;
  },

  async checkToken(
    accountId: string,
  ): Promise<{ passed: boolean; message?: string; requestId?: string; errorCode?: string }> {
    const tenantId = getTenantIdOrThrow();
    const response = await http.post<{ passed: boolean; message?: string; requestId?: string; errorCode?: string }>(
      `/api/v1/channel/credentials/${accountId}/check-token`,
      {},
      {
        params: { tenantId },
      },
    );
    return response.data;
  },

  async probeCapabilities(accountId: string): Promise<unknown> {
    const tenantId = getTenantIdOrThrow();
    const response = await http.post<unknown>(`/api/v1/channel/credentials/${accountId}/probe-capabilities`, {}, {
      params: { tenantId },
    });
    return response.data;
  },

  async listOrders(channelAccountId?: string): Promise<SaleOrderItem[]> {
    const tenantId = getTenantIdOrThrow();
    const response = await http.get<BackendListResponse<SaleOrderItem>>('/api/v1/sale/orders', {
      params: { tenantId, channelAccountId: channelAccountId || undefined },
    });
    return response.data.list ?? [];
  },

  async getOrderDetail(orderId: string): Promise<SaleOrderDetail> {
    const tenantId = getTenantIdOrThrow();
    const response = await http.get<SaleOrderDetail>(`/api/v1/sale/orders/${orderId}`, {
      params: { tenantId },
    });
    return response.data;
  },

  async updateOrderProcessing(
    orderId: string,
    payload: {
      processingStatus?: string;
      processingOwner?: string;
      processingNote?: string;
      exceptionFlags?: string[];
    },
  ): Promise<SaleOrderDetail> {
    const tenantId = getTenantIdOrThrow();
    const response = await http.post<SaleOrderDetail>(`/api/v1/sale/orders/${orderId}/processing/update`, payload, {
      params: { tenantId },
    });
    return response.data;
  },

  async syncProducts(payload: {
    channelAccountId: number;
    page?: number;
    pageSize?: number;
    upsertOnlyUnmapped?: boolean;
  }): Promise<SaleProductSyncTaskSubmitResponse> {
    const tenantId = getTenantIdOrThrow();
    const response = await http.post<SaleProductSyncTaskSubmitResponse>('/api/v1/sale/products/sync', payload, {
      params: { tenantId },
    });
    return response.data;
  },

  async getProductSyncStatus(channelAccountId: string): Promise<SaleProductSyncStatus> {
    const tenantId = getTenantIdOrThrow();
    const response = await http.get<SaleProductSyncStatus>('/api/v1/sale/products/sync-status', {
      params: { tenantId, channelAccountId },
    });
    return response.data;
  },

  async cancelProductSync(taskId: string): Promise<{
    taskId: string;
    status?: string | null;
    startedAt?: string | null;
    finishedAt?: string | null;
    processedCount?: number | null;
    successCount?: number | null;
    failedCount?: number | null;
    errorMessage?: string | null;
    remark?: string | null;
    updatedAt?: string | null;
  }> {
    const tenantId = getTenantIdOrThrow();
    const response = await http.post(`/api/v1/sale/products/sync/${taskId}/cancel`, {}, {
      params: { tenantId },
    });
    return response.data;
  },

  async listProductPublishSources(payload: {
    channelAccountId: number;
    limit?: number;
    keyword?: string;
  }): Promise<SaleProductPublishSourceList> {
    const tenantId = getTenantIdOrThrow();
    const response = await http.post<SaleProductPublishSourceList>('/api/v1/sale/products/publish-source/list', payload, {
      params: { tenantId },
    });
    return response.data;
  },

  async buildProductPublishDraftFromSource(payload: {
    channelAccountId: number;
    sourceOfferId?: string;
    sourceProductId?: number;
    targetOfferId?: string;
    namePrefix?: string;
  }): Promise<SaleProductPublishDraftPreview> {
    const tenantId = getTenantIdOrThrow();
    const response = await http.post<SaleProductPublishDraftPreview>('/api/v1/sale/products/publish-draft/from-source', payload, {
      params: { tenantId },
    });
    return response.data;
  },

  async publishProducts(payload: {
    channelAccountId: number;
    items: Record<string, unknown>[];
  }): Promise<SaleProductPublishResponse> {
    const tenantId = getTenantIdOrThrow();
    const response = await http.post<SaleProductPublishResponse>('/api/v1/sale/products/publish', payload, {
      params: { tenantId },
    });
    return response.data;
  },

  async queryProductPublishTask(payload: {
    channelAccountId: number;
    taskId: number;
  }): Promise<SaleProductPublishResponse> {
    const tenantId = getTenantIdOrThrow();
    const response = await http.post<SaleProductPublishResponse>('/api/v1/sale/products/publish-task/query', payload, {
      params: { tenantId },
    });
    return response.data;
  },

  async deletePublishedProducts(payload: {
    channelAccountId: number;
    offerIds: string[];
  }): Promise<SaleProductPublishResponse> {
    const tenantId = getTenantIdOrThrow();
    const response = await http.post<SaleProductPublishResponse>('/api/v1/sale/products/publish/delete', payload, {
      params: { tenantId },
    });
    return response.data;
  },

  async createProductPublishBatchFromSources(payload: {
    channelAccountId: number;
    batchName?: string;
    offerPrefix?: string;
    namePrefix?: string;
    sources: Array<{ sourceProductId?: number; sourceOfferId?: string }>;
  }): Promise<SaleProductPublishBatch> {
    const tenantId = getTenantIdOrThrow();
    const response = await http.post<SaleProductPublishBatch>(
      '/api/v1/sale/product-listings/batches/create-from-sources',
      payload,
      { params: { tenantId } },
    );
    return response.data;
  },

  async createProductPublishBatchFromReference(payload: {
    channelAccountId: number;
    batchName?: string;
    offerPrefix?: string;
    referenceOfferId?: string;
    referenceProductId?: number;
    products: Array<{
      localStyleId: number;
      targetOfferId?: string;
      name?: string;
      price?: string;
      currencyCode?: string;
      primaryImageUrl?: string;
      images?: string[];
    }>;
  }): Promise<SaleProductPublishBatch> {
    const tenantId = getTenantIdOrThrow();
    const response = await http.post<SaleProductPublishBatch>(
      '/api/v1/sale/product-listings/batches/create-from-reference',
      payload,
      { params: { tenantId } },
    );
    return response.data;
  },

  async listProductPublishBatches(channelAccountId: number): Promise<SaleProductPublishBatchList> {
    const tenantId = getTenantIdOrThrow();
    const response = await http.get<SaleProductPublishBatchList>('/api/v1/sale/product-listings/batches', {
      params: { tenantId, channelAccountId },
    });
    return response.data;
  },

  async getProductPublishBatch(batchId: string | number): Promise<SaleProductPublishBatch> {
    const tenantId = getTenantIdOrThrow();
    const response = await http.get<SaleProductPublishBatch>(`/api/v1/sale/product-listings/batches/${batchId}`, {
      params: { tenantId },
    });
    return response.data;
  },

  async validateProductPublishBatch(batchId: string | number): Promise<SaleProductPublishBatch> {
    const tenantId = getTenantIdOrThrow();
    const response = await http.post<SaleProductPublishBatch>(
      `/api/v1/sale/product-listings/batches/${batchId}/validate`,
      {},
      { params: { tenantId } },
    );
    return response.data;
  },

  async updateProductPublishDraft(
    batchId: string | number,
    itemId: string | number,
    payload: { item: Record<string, unknown> },
  ): Promise<SaleProductPublishBatch> {
    const tenantId = getTenantIdOrThrow();
    const response = await http.post<SaleProductPublishBatch>(
      `/api/v1/sale/product-listings/batches/${batchId}/items/${itemId}/draft/update`,
      payload,
      { params: { tenantId } },
    );
    return response.data;
  },

  async submitProductPublishBatch(batchId: string | number): Promise<SaleProductPublishBatch> {
    const tenantId = getTenantIdOrThrow();
    const response = await http.post<SaleProductPublishBatch>(
      `/api/v1/sale/product-listings/batches/${batchId}/submit`,
      {},
      { params: { tenantId } },
    );
    return response.data;
  },

  async queryProductPublishBatchTask(batchId: string | number): Promise<SaleProductPublishBatch> {
    const tenantId = getTenantIdOrThrow();
    const response = await http.post<SaleProductPublishBatch>(
      `/api/v1/sale/product-listings/batches/${batchId}/task/query`,
      {},
      { params: { tenantId } },
    );
    return response.data;
  },

  async deleteProductPublishBatchProducts(batchId: string | number): Promise<SaleProductPublishBatch> {
    const tenantId = getTenantIdOrThrow();
    const response = await http.post<SaleProductPublishBatch>(
      `/api/v1/sale/product-listings/batches/${batchId}/products/delete`,
      {},
      { params: { tenantId } },
    );
    return response.data;
  },

  async listProductMappings(params?: {
    channelAccountId?: string;
    mappingStatus?: string;
  }): Promise<
    Array<{
      id: string;
      channelAccountId: string;
      platformSpuId?: string;
      platformSkcId?: string;
      platformSkuId: string;
      platformSkuCode?: string;
      platformProductName?: string;
      platformMainImageUrl?: string;
      platformCategoryId?: string;
      platformCategoryPath?: string;
      platformStatus?: string;
      normalizedColor?: string;
      normalizedSize?: string;
      normalizedSpecSummary?: string;
      normalizedAttributesJson?: string;
      platformSnapshotJson?: string;
      styleId?: string;
      styleNo?: string;
      styleName?: string;
      styleImageUrl?: string;
      styleVariantId?: string;
      styleVariantColor?: string;
      styleVariantSize?: string;
      styleVariantAttributesJson?: string;
      warehouseId?: string;
      mappingStatus?: string;
      lastSyncedAt?: string;
      updatedAt?: string;
      remark?: string;
    }>
  > {
    const tenantId = getTenantIdOrThrow();
    const response = await http.get<
      BackendListResponse<{
        id: string;
        channelAccountId: string;
        platformSpuId?: string;
        platformSkcId?: string;
        platformSkuId: string;
        platformSkuCode?: string;
        platformProductName?: string;
        platformMainImageUrl?: string;
        platformCategoryId?: string;
        platformCategoryPath?: string;
        platformStatus?: string;
        normalizedColor?: string;
        normalizedSize?: string;
        normalizedSpecSummary?: string;
        normalizedAttributesJson?: string;
        platformSnapshotJson?: string;
        styleId?: string;
        styleNo?: string;
        styleName?: string;
        styleImageUrl?: string;
        styleVariantId?: string;
        styleVariantColor?: string;
        styleVariantSize?: string;
        styleVariantAttributesJson?: string;
        warehouseId?: string;
        mappingStatus?: string;
        lastSyncedAt?: string;
        updatedAt?: string;
        remark?: string;
      }>
    >('/api/v1/sale/product-mappings', {
      params: { tenantId, ...params },
    });
    return response.data.list ?? [];
  },

  async generateProductMappingDrafts(payload: {
    channelAccountId: number;
  }): Promise<{ channelAccountId: string; generatedCount: number; pendingCount: number }> {
    const tenantId = getTenantIdOrThrow();
    const response = await http.post<{ channelAccountId: string; generatedCount: number; pendingCount: number }>(
      '/api/v1/sale/product-mappings/drafts/generate',
      payload,
      {
        params: { tenantId },
      },
    );
    return response.data;
  },

  async listProductMappingDrafts(channelAccountId: string): Promise<
    Array<{
      id: string;
      productMappingId: string;
      channelAccountId: string;
      platformSkuId: string;
      candidateStyleId?: string;
      candidateStyleNo?: string;
      candidateStyleName?: string;
      candidateStyleImageUrl?: string;
      candidateVariantId?: string;
      candidateColor?: string;
      candidateSize?: string;
      candidateAttributesJson?: string;
      matchSource?: string;
      matchReason?: string;
      confidence?: string;
      draftStatus?: string;
      reviewNote?: string;
      reviewedAt?: string;
      updatedAt?: string;
    }>
  > {
    const tenantId = getTenantIdOrThrow();
    const response = await http.get<
      BackendListResponse<{
        id: string;
        productMappingId: string;
        channelAccountId: string;
        platformSkuId: string;
        candidateStyleId?: string;
        candidateStyleNo?: string;
        candidateStyleName?: string;
        candidateStyleImageUrl?: string;
        candidateVariantId?: string;
        candidateColor?: string;
        candidateSize?: string;
        candidateAttributesJson?: string;
        matchSource?: string;
        matchReason?: string;
        confidence?: string;
        draftStatus?: string;
        reviewNote?: string;
        reviewedAt?: string;
        updatedAt?: string;
      }>
    >('/api/v1/sale/product-mapping-drafts', {
      params: { tenantId, channelAccountId },
    });
    return response.data.list ?? [];
  },

  async approveProductMappingDraft(draftId: string): Promise<unknown> {
    const tenantId = getTenantIdOrThrow();
    const response = await http.post<unknown>(`/api/v1/sale/product-mapping-drafts/${draftId}/approve`, {}, {
      params: { tenantId },
    });
    return response.data;
  },

  async rejectProductMappingDraft(draftId: string): Promise<unknown> {
    const tenantId = getTenantIdOrThrow();
    const response = await http.post<unknown>(`/api/v1/sale/product-mapping-drafts/${draftId}/reject`, {}, {
      params: { tenantId },
    });
    return response.data;
  },

  async createProductMapping(payload: {
    channelAccountId: number;
    platformSpuId?: string;
    platformSkuId: string;
    platformSkuCode?: string;
    styleId?: number;
    styleVariantId?: number;
    warehouseId?: number;
    mappingStatus?: string;
    remark?: string;
  }): Promise<unknown> {
    const tenantId = getTenantIdOrThrow();
    const response = await http.post<unknown>('/api/v1/sale/product-mappings', payload, {
      params: { tenantId },
    });
    return response.data;
  },

  async updateProductMapping(
    mappingId: string,
    payload: {
      styleId?: number;
      styleVariantId?: number;
      warehouseId?: number;
      mappingStatus?: string;
      remark?: string;
    },
  ): Promise<unknown> {
    const tenantId = getTenantIdOrThrow();
    const response = await http.post<unknown>(`/api/v1/sale/product-mappings/${mappingId}/update`, payload, {
      params: { tenantId },
    });
    return response.data;
  },

  async deleteProductMapping(mappingId: string): Promise<unknown> {
    const tenantId = getTenantIdOrThrow();
    const response = await http.post<unknown>(`/api/v1/sale/product-mappings/${mappingId}/delete`, {}, {
      params: { tenantId },
    });
    return response.data;
  },

  async syncOrders(payload: { channelAccountId: number; page?: number; pageSize?: number; continuous?: boolean }): Promise<SaleOrderSyncResult> {
    const tenantId = getTenantIdOrThrow();
    const response = await http.post<SaleOrderSyncResult>('/api/v1/sale/orders/sync', payload, {
      params: { tenantId },
    });
    return response.data;
  },

  async syncFulfillmentDemands(payload: {
    channelAccountId: number;
    page?: number;
    pageSize?: number;
  }): Promise<{
    channelAccountId: string;
    page: number;
    pageSize: number;
    syncedCount: number;
    createdCount: number;
    updatedCount: number;
    requestId?: string | null;
  }> {
    const tenantId = getTenantIdOrThrow();
    const response = await http.post('/api/v1/sale/fulfillment-demands/sync', payload, {
      params: { tenantId },
    });
    return response.data;
  },

  async listFulfillmentDemands(channelAccountId?: string): Promise<SaleFulfillmentDemandItem[]> {
    const tenantId = getTenantIdOrThrow();
    const response = await http.get<BackendListResponse<SaleFulfillmentDemandItem>>('/api/v1/sale/fulfillment-demands', {
      params: { tenantId, channelAccountId: channelAccountId || undefined },
    });
    return response.data.list ?? [];
  },

  async getFulfillmentDemandStats(channelAccountId?: string): Promise<SaleFulfillmentDemandStats> {
    const tenantId = getTenantIdOrThrow();
    const response = await http.get<SaleFulfillmentDemandStats>('/api/v1/sale/fulfillment-demands/stats', {
      params: { tenantId, channelAccountId: channelAccountId || undefined },
    });
    return response.data;
  },

  async getFulfillmentDemandDetail(demandId: string): Promise<SaleFulfillmentDemandDetail> {
    const tenantId = getTenantIdOrThrow();
    const response = await http.get<SaleFulfillmentDemandDetail>(`/api/v1/sale/fulfillment-demands/${demandId}`, {
      params: { tenantId },
    });
    return response.data;
  },

  async resolveFulfillmentWorkbench(payload: {
    channelAccountId: number;
    demandIds: number[];
  }): Promise<SaleFulfillmentWorkbenchResolveResult> {
    const tenantId = getTenantIdOrThrow();
    const response = await http.post<SaleFulfillmentWorkbenchResolveResult>(
      '/api/v1/sale/fulfillment-workbenches/resolve',
      payload,
      {
        params: { tenantId },
      },
    );
    return response.data;
  },

  async initTemuFullyManagedWorkbench(payload: {
    channelAccountId: number;
    demandIds: number[];
  }): Promise<SaleTemuFullyManagedWorkbenchInitResult> {
    const tenantId = getTenantIdOrThrow();
    const response = await http.post<SaleTemuFullyManagedWorkbenchInitResult>(
      '/api/v1/sale/fulfillment-workbenches/temu-full-managed/init',
      payload,
      {
        params: { tenantId },
      },
    );
    return response.data;
  },

  async submitTemuFullyManagedWorkbench(
    workbenchId: string,
    payload: {
      sellerAddressId: number;
      deliveryAddressType: number;
      trackingNo?: string;
      carrierCode?: string;
      carrierName?: string;
      deliveryMethod: number;
      predictPackageVolume?: number;
      predictTotalPackageWeight?: number;
      totalPackageNum?: number;
      expressPackageNum?: number;
      pickupMethod?: number;
      packagePlans?: Array<{
        demandId: string;
        bizDocNo: string;
        packageInfos: Array<{
          packageDetails: Array<{
            productSkuId: string;
            skuNum: number;
          }>;
        }>;
      }>;
      selfDeliveryInfo?: Record<string, unknown>;
      thirdPartyDeliveryInfo?: Record<string, unknown>;
      thirdPartyExpressDeliveryInfoVO?: Record<string, unknown>;
    },
  ): Promise<SaleTemuFullyManagedWorkbenchSubmitResult> {
    const tenantId = getTenantIdOrThrow();
    const response = await http.post<SaleTemuFullyManagedWorkbenchSubmitResult>(
      `/api/v1/sale/fulfillment-workbenches/${workbenchId}/temu-full-managed/submit`,
      payload,
      {
        params: { tenantId },
      },
    );
    return response.data;
  },

  async listFulfillments(channelAccountId?: string): Promise<SaleFulfillmentItem[]> {
    const tenantId = getTenantIdOrThrow();
    const response = await http.get<BackendListResponse<SaleFulfillmentItem>>('/api/v1/sale/fulfillments', {
      params: { tenantId, channelAccountId: channelAccountId || undefined },
    });
    return response.data.list ?? [];
  },

  async listInventories(channelAccountId: string, page = 1, pageSize = 100): Promise<SaleInventoryItem[]> {
    const tenantId = getTenantIdOrThrow();
    const response = await http.get<BackendListResponse<SaleInventoryItem>>(
      '/api/v1/sale/inventories',
      {
        params: { tenantId, channelAccountId, page, pageSize },
        skipPageNormalization: true,
        suppressGlobalError: true,
      } as never,
    );
    return response.data.list ?? [];
  },

  async getSalesOverview(days = 30): Promise<SaleSalesOverview> {
    const tenantId = getTenantIdOrThrow();
    const response = await http.get<SaleSalesOverview>('/api/v1/sale/sales-data/overview', {
      params: { tenantId, days },
    });
    return response.data;
  },

  async listSalesProducts(params?: {
    days?: number;
    keyword?: string;
    sortBy?: string;
    page?: number;
    pageSize?: number;
  }): Promise<SaleSalesProductList> {
    const tenantId = getTenantIdOrThrow();
    const response = await http.get<SaleSalesProductList>('/api/v1/sale/sales-data/products', {
      params: { tenantId, ...params },
    });
    return response.data;
  },

  async getSalesProductDetail(styleId: string, days = 30): Promise<SaleSalesProductDetail> {
    const tenantId = getTenantIdOrThrow();
    const response = await http.get<SaleSalesProductDetail>(`/api/v1/sale/sales-data/products/${styleId}`, {
      params: { tenantId, days },
    });
    return response.data;
  },

  async createFulfillment(payload: {
    channelAccountId?: number;
    saleOrderId: number;
    dispatchId?: number;
    trackingNo?: string;
    carrierCode?: string;
    carrierName?: string;
    idempotencyKey?: string;
  }): Promise<SaleFulfillmentItem> {
    const tenantId = getTenantIdOrThrow();
    const response = await http.post<SaleFulfillmentItem>('/api/v1/sale/fulfillments', payload, {
      params: { tenantId },
    });
    return response.data;
  },

  async pushFulfillment(
    fulfillmentId: string,
    payload?: {
      trackingNo?: string;
      carrierCode?: string;
      carrierName?: string;
      deliveryMethod?: number;
      shipOrderNo?: string;
      sendAddressId?: number;
      subWarehouseId?: number;
      receiveAddressInfo?: Record<string, unknown>;
      createExtra?: Record<string, unknown>;
      selfDeliveryInfo?: Record<string, unknown>;
      thirdPartyDeliveryInfo?: Record<string, unknown>;
      thirdPartyExpressDeliveryInfoVO?: Record<string, unknown>;
    },
  ): Promise<unknown> {
    const tenantId = getTenantIdOrThrow();
    const response = await http.post<unknown>(`/api/v1/sale/fulfillments/${fulfillmentId}/push`, payload ?? {}, {
      params: { tenantId },
    });
    return response.data;
  },

  async listSyncLogs(params?: {
    channelAccountId?: string;
    bizType?: string;
    success?: boolean;
  }): Promise<SaleSyncLogItem[]> {
    const tenantId = getTenantIdOrThrow();
    const response = await http.get<BackendListResponse<SaleSyncLogItem>>('/api/v1/sale/sync-logs', {
      params: { tenantId, ...params },
    });
    return response.data.list ?? [];
  },

  async listRetryCandidates(params?: {
    channelAccountId?: string;
    bizType?: string;
  }): Promise<SaleRetryCandidateItem[]> {
    const tenantId = getTenantIdOrThrow();
    const response = await http.get<BackendListResponse<SaleRetryCandidateItem>>(
      '/api/v1/sale/sync-logs/retry-candidates',
      {
        params: { tenantId, ...params },
      },
    );
    return response.data.list ?? [];
  },

  async listIdempotencyRecords(params?: {
    bizType?: string;
    status?: string;
    idempotencyKey?: string;
  }): Promise<SaleIdempotencyRecordItem[]> {
    const tenantId = getTenantIdOrThrow();
    const response = await http.get<BackendListResponse<SaleIdempotencyRecordItem>>(
      '/api/v1/sale/idempotency-records',
      {
        params: { tenantId, ...params },
      },
    );
    return response.data.list ?? [];
  },
};
