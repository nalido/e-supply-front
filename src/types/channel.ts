export type ChannelAccount = {
  id: number;
  tenantId: number;
  platform: 'TEMU';
  name: string;
  status: 'ACTIVE' | 'INACTIVE';
  region?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type ChannelShop = {
  id: number;
  tenantId: number;
  channelAccountId: number;
  shopCode: string;
  shopName: string;
  status: 'ACTIVE' | 'INACTIVE';
  region?: string;
  timezone?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type ChannelProductMapping = {
  id: number;
  tenantId: number;
  channelAccountId: number;
  shopId?: number;
  platformProductId?: string;
  platformVariantId?: string;
  platformSku: string;
  sku?: string;
  styleId?: number;
  styleVariantId?: number;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt?: string;
  updatedAt?: string;
};

export type ChannelSyncLog = {
  id: number;
  tenantId: number;
  platform: 'TEMU';
  channelAccountId?: number;
  jobType: 'ORDER_PULL' | 'PRODUCT_SYNC' | 'INVENTORY_SYNC';
  status: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED';
  message?: string;
  startedAt?: string;
  finishedAt?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type ChannelCredential = {
  id: number;
  tenantId: number;
  channelAccountId: number;
  credentialType: string;
  credentialPayload: string;
  expiresAt?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type SalesListing = {
  id: number;
  tenantId: number;
  channelAccountId: number;
  shopId?: number;
  platform: 'TEMU';
  listingType: string;
  sku?: string;
  platformSku?: string;
  productName?: string;
  payloadJson?: string;
  platformProductId?: string;
  status: 'DRAFT' | 'SUBMITTED' | 'PUBLISHED' | 'FAILED' | 'OFFLINE';
  errorMessage?: string;
  lastResponse?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type PageResponse<T> = {
  items: T[];
  total: number;
  page: number;
  size: number;
};
