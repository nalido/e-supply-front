export type SaleChannelAccount = {
  id: string;
  platformCode: string;
  accountName: string;
  shopId?: string | null;
  shopName?: string | null;
  regionCode?: string | null;
  gatewayUrl?: string | null;
  sellerType?: string | null;
  orderSyncMode?: string | null;
  orderAutoSyncEnabled?: boolean | null;
  orderAutoSyncIntervalMinutes?: number | null;
  orderAutoSyncPageSize?: number | null;
  orderAutoSyncNextRunAt?: string | null;
  orderAutoSyncLastTriggeredAt?: string | null;
  authorizationType?: string | null;
  status?: string | null;
  remarks?: string | null;
  importBatchNo?: string | null;
  lastSyncAt?: string | null;
  updatedAt?: string | null;
};

export type SaleShopTag = {
  tagId: string;
  tagName: string;
  color?: string | null;
  accountCount?: number | null;
  accountIds?: string[] | null;
};

export type SaleAsyncTask = {
  taskId: string;
  taskType: string;
  taskName?: string | null;
  status?: string | null;
  totalCount?: number | null;
  pendingCount?: number | null;
  runningCount?: number | null;
  successCount?: number | null;
  failedCount?: number | null;
  skippedCount?: number | null;
  productCount?: number | null;
  targetShopCount?: number | null;
  cleanupCount?: number | null;
  progressPercent?: number | null;
  errorMessage?: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  alreadyRunning?: boolean | null;
  message?: string | null;
};

export type SaleAsyncTaskItem = {
  itemId: string;
  taskId: string;
  bizKey?: string | null;
  channelAccountId?: string | null;
  itemName?: string | null;
  status?: string | null;
  attemptCount?: number | null;
  maxAttemptCount?: number | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  requestPayloadJson?: string | null;
  responsePayloadJson?: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;
  updatedAt?: string | null;
};

export type SaleOzonWarehouse = {
  warehouseId: string;
  warehouseName: string;
  status?: string | null;
  rawPayloadJson?: string | null;
};

export type SaleOzonInventoryStock = {
  offerId?: string | null;
  productId?: number | null;
  warehouseId?: number | string | null;
  warehouseName?: string | null;
  present?: number | null;
  reserved?: number | null;
  stock?: number | null;
  stockType?: string | null;
  rawPayloadJson?: string | null;
};

export type SaleProductMapping = {
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
  groupKey?: string | null;
  groupHead?: boolean | null;
  groupRowSpan?: number | null;
  groupSkuCount?: number | null;
  skus?: SaleProductMappingSku[];
};

export type SaleProductMappingSku = {
  id: string;
  platformSkuId?: string | null;
  platformSkuCode?: string | null;
  normalizedColor?: string | null;
  normalizedSize?: string | null;
  normalizedSpecSummary?: string | null;
  normalizedAttributesJson?: string | null;
  platformSnapshotJson?: string | null;
  styleId?: string | null;
  styleNo?: string | null;
  styleName?: string | null;
  styleImageUrl?: string | null;
  styleVariantId?: string | null;
  styleVariantColor?: string | null;
  styleVariantSize?: string | null;
  styleVariantAttributesJson?: string | null;
  warehouseId?: string | null;
  mappingStatus?: string | null;
  lastSyncedAt?: string | null;
  updatedAt?: string | null;
  remark?: string | null;
};

export type SaleOzonPromotion = {
  actionId: string;
  title: string;
  actionType?: string | null;
  dateStart?: string | null;
  dateEnd?: string | null;
  potentialProductsCount?: number | null;
  participatingProductsCount?: number | null;
  participating?: boolean | null;
  rawPayloadJson?: string | null;
};

export type SaleOzonPromotionProduct = {
  offerId?: string | null;
  productId?: number | null;
  platformSpuId?: string | null;
  platformSkcId?: string | null;
  platformSkuId?: string | null;
  name?: string | null;
  imageUrl?: string | null;
  color?: string | null;
  size?: string | null;
  normalizedSpecSummary?: string | null;
  price?: string | number | null;
  actionPrice?: string | number | null;
  maxActionPrice?: string | number | null;
  stock?: number | null;
  minStock?: number | null;
  addMode?: string | null;
  rawPayloadJson?: string | null;
  channelAccountId?: string | number | null;
  mappingId?: string | null;
  mapped?: boolean | null;
  mappingStatus?: string | null;
  styleNo?: string | null;
  styleName?: string | null;
  styleVariantId?: string | null;
  platformSkuCode?: string | null;
  lastSyncedAt?: string | null;
  updatedAt?: string | null;
};

export type SaleOzonPromotionEligibilityPreviewRow = {
  rowKey: string;
  channelAccountId: string | number;
  offerId?: string | null;
  productId?: number | null;
  status?: 'PARTICIPATING' | 'CANDIDATE' | 'NOT_CANDIDATE' | 'MISSING_PRODUCT' | 'MISSING_ACTION' | 'MISSING_IDENTITY' | string | null;
  reason?: string | null;
  platformStock?: number | null;
  actionPrice?: string | number | null;
  maxActionPrice?: string | number | null;
  minStock?: number | null;
  addMode?: string | null;
};

export const getSaleSellerTypeLabel = (sellerType?: string | null): string => {
  if (sellerType === 'FULLY_MANAGED') {
    return '全托管';
  }
  if (sellerType === 'SEMI_MANAGED') {
    return '半托管';
  }
  return sellerType || '--';
};

export const getSaleOrderSyncModeLabel = (orderSyncMode?: string | null): string => {
  if (orderSyncMode === 'PURCHASE_ORDER') {
    return '备货单模式';
  }
  if (orderSyncMode === 'ORDER') {
    return '订单模式';
  }
  if (orderSyncMode === 'AUTO') {
    return '自动识别';
  }
  return orderSyncMode || '--';
};

export type SaleOrderSyncResult = {
  channelAccountId: string;
  requestedPage: number;
  requestedPageSize: number;
  processedPages: number;
  syncedCount: number;
  createdCount: number;
  updatedCount: number;
  requestId?: string | null;
  sampleOrderNos?: string[] | null;
};

export type SaleChannelCredential = {
  accountId: string;
  appKeyMasked?: string | null;
  appSecretMasked?: string | null;
  accessTokenMasked?: string | null;
  refreshTokenMasked?: string | null;
  accessTokenExpiresAt?: string | null;
  status?: string | null;
  lastValidatedAt?: string | null;
  credentialPayloadJson?: string | null;
};

export type SaleOrderItem = {
  id: string;
  channelAccountId: string;
  platformOrderNo: string;
  platformParentOrderNo?: string | null;
  platformOrderStatus?: string | null;
  normalizedStatus?: string | null;
  orderAmount?: string | null;
  payAmount?: string | null;
  receiverName?: string | null;
  processingStatus?: string | null;
  processingOwner?: string | null;
  processingNote?: string | null;
  processedAt?: string | null;
  exceptionFlags?: string[] | null;
  platformCreatedAt?: string | null;
  platformUpdatedAt?: string | null;
  updatedAt?: string | null;
  linePreview?: SaleOrderLine[] | null;
};

export type SaleOrderLine = {
  id: string;
  platformLineNo?: string | null;
  platformGoodsId?: string | null;
  platformSkuId?: string | null;
  platformSkuCode?: string | null;
  goodsName?: string | null;
  platformMainImageUrl?: string | null;
  normalizedColor?: string | null;
  normalizedSize?: string | null;
  normalizedSpecSummary?: string | null;
  quantity?: number | null;
  unitPrice?: string | null;
  lineAmount?: string | null;
  refundStatus?: string | null;
  styleVariantId?: string | null;
  mappingStatus?: string | null;
};

export type SaleOrderDetail = {
  id: string;
  channelAccountId: string;
  platformOrderNo: string;
  platformParentOrderNo?: string | null;
  platformOrderStatus?: string | null;
  normalizedStatus?: string | null;
  currencyCode?: string | null;
  orderAmount?: string | null;
  payAmount?: string | null;
  shippingFee?: string | null;
  buyerId?: string | null;
  receiverName?: string | null;
  receiverPhone?: string | null;
  receiverCountry?: string | null;
  receiverState?: string | null;
  receiverCity?: string | null;
  receiverAddress?: string | null;
  receiverZip?: string | null;
  processingStatus?: string | null;
  processingOwner?: string | null;
  processingNote?: string | null;
  processedAt?: string | null;
  exceptionFlags?: string[] | null;
  platformCreatedAt?: string | null;
  platformUpdatedAt?: string | null;
  lastSyncedAt?: string | null;
  lines: SaleOrderLine[];
};

export type SaleFulfillmentLine = {
  id: string;
  saleOrderLineId?: string | null;
  platformOrderNo?: string | null;
  platformSkuId?: string | null;
  quantity?: number | null;
  pushStatus?: string | null;
  lastPushError?: string | null;
};

export type SaleFulfillmentItem = {
  id: string;
  channelAccountId: string;
  saleOrderId: string;
  dispatchId?: string | null;
  fulfillmentNo: string;
  status?: string | null;
  pushStatus?: string | null;
  trackingNo?: string | null;
  carrierCode?: string | null;
  carrierName?: string | null;
  pushRequestId?: string | null;
  pushedAt?: string | null;
  lastPushError?: string | null;
  idempotencyKey?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  lines?: SaleFulfillmentLine[];
};

export type SaleFulfillmentDemandItem = {
  id: string;
  channelAccountId: string;
  platformCode: string;
  sellerType?: string | null;
  bizDocType: string;
  bizDocNo: string;
  parentBizDocNo?: string | null;
  externalStatus?: string | null;
  normalizedStatus?: string | null;
  strategyCode?: string | null;
  receiverName?: string | null;
  receiverCountry?: string | null;
  currencyCode?: string | null;
  itemCount?: number | null;
  quantity?: number | null;
  amount?: string | null;
  deadlineAt?: string | null;
  warehouseHint?: string | null;
  urgent: boolean;
  goodsSummary?: string | null;
  linePreview?: SaleFulfillmentDemandLinePreview[] | null;
  lastSyncedAt?: string | null;
  updatedAt?: string | null;
};

export type SaleFulfillmentDemandLinePreview = {
  platformSkuId?: string | null;
  platformSkuCode?: string | null;
  goodsName?: string | null;
  specSummary?: string | null;
  color?: string | null;
  size?: string | null;
  quantity?: number | null;
};

export type SaleFulfillmentDemandLine = {
  id: string;
  platformLineNo?: string | null;
  platformGoodsId?: string | null;
  platformSkuId?: string | null;
  platformSkuCode?: string | null;
  goodsName?: string | null;
  specSummary?: string | null;
  color?: string | null;
  size?: string | null;
  quantity?: number | null;
  lineAmount?: string | null;
};

export type SaleFulfillmentDemandDetail = SaleFulfillmentDemandItem & {
  lines: SaleFulfillmentDemandLine[];
};

export type SaleFulfillmentDemandStats = {
  total: number;
  readyCount: number;
  urgentCount: number;
  overdueCount: number;
};

export type SaleFulfillmentWorkbenchResolveResult = {
  strategyCode: string;
  pageRoute: string;
  allowBatch: boolean;
  sourceType: string;
  title?: string | null;
  description?: string | null;
  sourceIds: string[];
};

export type SaleTemuSellerAddress = {
  id: string;
  label: string;
  provinceName?: string | null;
  cityName?: string | null;
  districtName?: string | null;
  addressDetail?: string | null;
  isDefault: boolean;
};

export type SaleTemuReceiveAddressGroup = {
  subWarehouseId: string;
  subWarehouseName?: string | null;
  receiveAddressInfoJson: string;
};

export type SaleTemuLogisticsVendor = {
  expressCompanyId: string;
  expressCompanyName: string;
};

export type SaleTemuDeliveryAddressTypeOption = {
  value: number;
  label: string;
};

export type SaleTemuPackageDetail = {
  productSkuId: string;
  platformSkuCode?: string | null;
  goodsName?: string | null;
  quantity?: number | null;
};

export type SaleTemuPackageInfo = {
  packageKey: string;
  packageDetails: SaleTemuPackageDetail[];
};

export type SaleTemuPackagePlan = {
  demandId: string;
  bizDocNo: string;
  totalQuantity?: number | null;
  detailItems: SaleTemuPackageDetail[];
  packageInfos: SaleTemuPackageInfo[];
};

export type SaleTemuFullyManagedWorkbenchInitResult = {
  workbenchId: string;
  strategyCode: string;
  demands: SaleFulfillmentDemandItem[];
  packagePlans: SaleTemuPackagePlan[];
  sellerAddresses: SaleTemuSellerAddress[];
  receiveAddressGroups: SaleTemuReceiveAddressGroup[];
  thirdPartyVendors: SaleTemuLogisticsVendor[];
  deliveryAddressTypeOptions: SaleTemuDeliveryAddressTypeOption[];
};

export type SaleTemuPrintAsset = {
  assetType: string;
  refNo?: string | null;
  dataKey?: string | null;
  printUrl?: string | null;
};

export type SaleTemuFullyManagedWorkbenchSubmitResult = {
  workbenchId: string;
  success: boolean;
  status?: string | null;
  requestId?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  deliveryOrderNos?: string[] | null;
  printAssets?: SaleTemuPrintAsset[] | null;
};

export type SaleInventoryItem = {
  channelAccountId: string;
  platformSpuId?: string | null;
  platformSkcId?: string | null;
  platformSkuId: string;
  platformSkuCode?: string | null;
  goodsName?: string | null;
  availableSaleDays?: number | null;
  availableSaleDaysFromInventory?: number | null;
  lackQuantity?: number | null;
  lastSevenDaysSaleVolume?: number | null;
  warehouseInventoryNum?: number | null;
  waitDeliveryInventoryNum?: number | null;
  waitReceiveNum?: number | null;
  unavailableWarehouseInventoryNum?: number | null;
  styleVariantId?: string | null;
  mappingStatus?: string | null;
  rawPayloadJson?: string | null;
};

export type SaleSalesMetric = {
  key: string;
  label: string;
  value: number;
  unit?: string | null;
  description?: string | null;
};

export type SaleSalesTrendPoint = {
  date: string;
  totalSalesVolume: number;
  mappedSalesVolume: number;
  unmappedSalesVolume: number;
};

export type SaleSalesTopProduct = {
  styleId: string;
  styleNo?: string | null;
  styleName?: string | null;
  styleImageUrl?: string | null;
  salesVolume: number;
  previousSalesVolume: number;
  shopCount: number;
  topShopName?: string | null;
  topShopContributionRate: number;
  growthRate: number;
};

export type SaleSalesUnmappedItem = {
  channelAccountId?: string | null;
  shopName?: string | null;
  platformSkuId: string;
  platformSkuCode?: string | null;
  platformProductName?: string | null;
  platformMainImageUrl?: string | null;
  normalizedColor?: string | null;
  normalizedSize?: string | null;
  salesVolume: number;
  last7DaysVolume: number;
  last30DaysVolume: number;
  impactScore: number;
};

export type SaleSalesOverview = {
  days: number;
  metrics: SaleSalesMetric[];
  trendPoints: SaleSalesTrendPoint[];
  topGrowthProducts: SaleSalesTopProduct[];
  topUnmappedItems: SaleSalesUnmappedItem[];
};

export type SaleSalesProductItem = {
  styleId: string;
  styleNo?: string | null;
  styleName?: string | null;
  styleImageUrl?: string | null;
  salesVolume: number;
  previousSalesVolume: number;
  growthRate: number;
  shopCount: number;
  mappedSkuCount: number;
  topShopName?: string | null;
  topShopSalesVolume: number;
  topShopContributionRate: number;
  hotVariantSummaries: string[];
  tags: string[];
  trendPoints: SaleSalesTrendPoint[];
};

export type SaleSalesProductList = {
  list: SaleSalesProductItem[];
  total: number;
  page: number;
  pageSize: number;
};

export type SaleSalesVariantBreakdown = {
  styleVariantId?: string | null;
  color?: string | null;
  size?: string | null;
  specSummary?: string | null;
  salesVolume: number;
  shopCount: number;
  topShopName?: string | null;
};

export type SaleSalesShopContribution = {
  channelAccountId?: string | null;
  shopName?: string | null;
  salesVolume: number;
  contributionRate: number;
  topVariantSummary?: string | null;
};

export type SaleSalesSkuDetail = {
  channelAccountId?: string | null;
  shopName?: string | null;
  platformSkuId: string;
  platformSkuCode?: string | null;
  platformProductName?: string | null;
  localVariantSummary?: string | null;
  salesVolume: number;
  shopCoverage: number;
};

export type SaleSalesProductDetail = {
  days: number;
  styleId: string;
  styleNo?: string | null;
  styleName?: string | null;
  styleImageUrl?: string | null;
  salesVolume: number;
  previousSalesVolume: number;
  growthRate: number;
  shopCount: number;
  topShopName?: string | null;
  topShopSalesVolume: number;
  topShopContributionRate: number;
  trendPoints: SaleSalesTrendPoint[];
  colorBreakdown: SaleSalesVariantBreakdown[];
  sizeBreakdown: SaleSalesVariantBreakdown[];
  variantBreakdown: SaleSalesVariantBreakdown[];
  shopBreakdown: SaleSalesShopContribution[];
  skuDetails: SaleSalesSkuDetail[];
};

export type SaleSyncLogItem = {
  id: string;
  channelAccountId?: string | null;
  taskId?: string | null;
  bizType?: string | null;
  direction?: string | null;
  requestId?: string | null;
  idempotencyKey?: string | null;
  httpStatus?: number | null;
  success: boolean;
  errorCode?: string | null;
  errorMessage?: string | null;
  requestPayloadJson?: string | null;
  responsePayloadJson?: string | null;
  occurredAt?: string | null;
  createdAt?: string | null;
};

export type SaleRetryCandidateItem = {
  syncLogId: string;
  channelAccountId?: string | null;
  bizType?: string | null;
  requestId?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  requestPayloadJson?: string | null;
  responsePayloadJson?: string | null;
  retryable: boolean;
  retryAction: string;
  occurredAt?: string | null;
};

export type SaleIdempotencyRecordItem = {
  id: string;
  bizType?: string | null;
  idempotencyKey?: string | null;
  bizRefId?: string | null;
  status?: string | null;
  responseSnapshotJson?: string | null;
  expiredAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type SaleSyncTaskSummary = {
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
};

export type SaleProductSyncTaskSubmitResponse = {
  channelAccountId: string;
  taskId: string;
  status?: string | null;
  alreadyRunning: boolean;
  message?: string | null;
};

export type SaleProductSyncStatus = {
  channelAccountId: string;
  currentTask?: SaleSyncTaskSummary | null;
  latestFinishedTask?: SaleSyncTaskSummary | null;
};

export type SaleProductPublishSourceProduct = {
  productId?: string | number | null;
  offerId?: string | null;
  name?: string | null;
  imageUrl?: string | null;
  visibility?: string | null;
  raw?: Record<string, unknown> | null;
};

export type SaleProductPublishSourceList = {
  list: SaleProductPublishSourceProduct[];
  total?: number | null;
  requestId?: string | null;
  nextLastId?: string | null;
  hasMore?: boolean | null;
};

export type SaleProductPublishDraftPreview = {
  sourceProductId?: string | number | null;
  sourceOfferId?: string | null;
  targetOfferId?: string | null;
  name?: string | null;
  imageUrl?: string | null;
  attributeCount?: number | null;
  imageCount?: number | null;
  item: Record<string, unknown>;
};

export type SaleProductPublishResponse = {
  success: boolean;
  requestId?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  raw?: Record<string, unknown> | null;
};

export type SaleProductPublishValidationIssue = {
  field?: string | null;
  severity?: string | null;
  message?: string | null;
};

export type SaleProductPublishItem = {
  itemId: string | number;
  localStyleId?: string | number | null;
  localStyleNo?: string | null;
  referenceProductId?: string | number | null;
  referenceOfferId?: string | null;
  sourceProductId?: string | number | null;
  sourceOfferId?: string | null;
  targetProductId?: string | number | null;
  targetOfferId?: string | null;
  productName?: string | null;
  imageUrl?: string | null;
  categoryId?: string | null;
  attributeCount?: number | null;
  imageCount?: number | null;
  price?: string | null;
  currencyCode?: string | null;
  validationStatus?: string | null;
  validationIssueCount?: number | null;
  validationIssues?: SaleProductPublishValidationIssue[] | null;
  publishStatus?: string | null;
  platformStatus?: string | null;
  platformErrors?: Array<Record<string, unknown>> | null;
  cleanupStatus?: string | null;
  cleanupMessage?: string | null;
  item?: Record<string, unknown> | null;
};

export type SaleProductPublishBatch = {
  batchId: string | number;
  channelAccountId: string | number;
  channelAccountName?: string | null;
  platformCode?: string | null;
  batchNo?: string | null;
  batchName?: string | null;
  mode?: string | null;
  sourceType?: string | null;
  sourceChannelAccountId?: string | number | null;
  targetChannelAccountIds?: Array<string | number> | null;
  targetTagIds?: Array<string | number> | null;
  targetTagNames?: string[] | null;
  offerPrefix?: string | null;
  publishMode?: string | null;
  status?: string | null;
  totalCount?: number | null;
  readyCount?: number | null;
  blockedCount?: number | null;
  submittedCount?: number | null;
  successCount?: number | null;
  failedCount?: number | null;
  cleanedCount?: number | null;
  taskId?: string | number | null;
  requestId?: string | null;
  lastError?: string | null;
  submittedAt?: string | null;
  lastPolledAt?: string | null;
  cleanedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  items?: SaleProductPublishItem[] | null;
};

export type SaleProductPublishBatchList = {
  list: SaleProductPublishBatch[];
  total?: number | null;
};
