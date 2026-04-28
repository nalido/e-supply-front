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
  authorizationType?: string | null;
  status?: string | null;
  remarks?: string | null;
  updatedAt?: string | null;
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
