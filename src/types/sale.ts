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
  platformCreatedAt?: string | null;
  platformUpdatedAt?: string | null;
  updatedAt?: string | null;
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
