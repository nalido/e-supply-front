import http from './http';
import type {
  ChannelAccount,
  ChannelCredential,
  ChannelProductMapping,
  ChannelShop,
  ChannelSyncLog,
  PageResponse,
  SalesListing,
} from '../types/channel';

export type ChannelAccountQuery = {
  tenantId: number;
  platform?: string;
  status?: string;
  keyword?: string;
  page?: number;
  size?: number;
};

export type ChannelShopQuery = {
  tenantId: number;
  channelAccountId?: number;
  status?: string;
  keyword?: string;
  page?: number;
  size?: number;
};

export type ChannelProductQuery = {
  tenantId: number;
  channelAccountId?: number;
  shopId?: number;
  status?: string;
  keyword?: string;
  page?: number;
  size?: number;
};

export type ChannelSyncLogQuery = {
  tenantId: number;
  platform?: string;
  channelAccountId?: number;
  jobType?: string;
  status?: string;
  page?: number;
  size?: number;
};

export const fetchChannelAccounts = async (params: ChannelAccountQuery) => {
  const { data } = await http.get<PageResponse<ChannelAccount>>('/api/v1/channel/accounts', { params });
  return data;
};

export const createChannelAccount = async (payload: {
  tenantId: number;
  platform: string;
  name: string;
  status?: string;
  region?: string;
}) => {
  const { data } = await http.post<ChannelAccount>('/api/v1/channel/accounts', payload);
  return data;
};

export const updateChannelAccount = async (accountId: number, payload: {
  tenantId: number;
  platform: string;
  name: string;
  status?: string;
  region?: string;
}) => {
  const { data } = await http.post<ChannelAccount>(`/api/v1/channel/accounts/${accountId}/update`, payload);
  return data;
};

export const deleteChannelAccount = async (accountId: number, tenantId: number) => {
  await http.post(`/api/v1/channel/accounts/${accountId}/delete`, null, { params: { tenantId } });
};

export const fetchChannelShops = async (params: ChannelShopQuery) => {
  const { data } = await http.get<PageResponse<ChannelShop>>('/api/v1/channel/shops', { params });
  return data;
};

export const createChannelShop = async (payload: {
  tenantId: number;
  channelAccountId: number;
  shopCode: string;
  shopName: string;
  status?: string;
  region?: string;
  timezone?: string;
}) => {
  const { data } = await http.post<ChannelShop>('/api/v1/channel/shops', payload);
  return data;
};

export const updateChannelShop = async (shopId: number, payload: {
  tenantId: number;
  channelAccountId: number;
  shopCode: string;
  shopName: string;
  status?: string;
  region?: string;
  timezone?: string;
}) => {
  const { data } = await http.post<ChannelShop>(`/api/v1/channel/shops/${shopId}/update`, payload);
  return data;
};

export const deleteChannelShop = async (shopId: number, tenantId: number) => {
  await http.post(`/api/v1/channel/shops/${shopId}/delete`, null, { params: { tenantId } });
};

export const fetchChannelProducts = async (params: ChannelProductQuery) => {
  const { data } = await http.get<PageResponse<ChannelProductMapping>>('/api/v1/channel/products', { params });
  return data;
};

export const createChannelProduct = async (payload: {
  tenantId: number;
  channelAccountId: number;
  shopId?: number;
  platformProductId?: string;
  platformVariantId?: string;
  platformSku: string;
  sku?: string;
  styleId?: number;
  styleVariantId?: number;
  status?: string;
}) => {
  const { data } = await http.post<ChannelProductMapping>('/api/v1/channel/products', payload);
  return data;
};

export const updateChannelProduct = async (mappingId: number, payload: {
  tenantId: number;
  channelAccountId: number;
  shopId?: number;
  platformProductId?: string;
  platformVariantId?: string;
  platformSku: string;
  sku?: string;
  styleId?: number;
  styleVariantId?: number;
  status?: string;
}) => {
  const { data } = await http.post<ChannelProductMapping>(`/api/v1/channel/products/${mappingId}/update`, payload);
  return data;
};

export const deleteChannelProduct = async (mappingId: number, tenantId: number) => {
  await http.post(`/api/v1/channel/products/${mappingId}/delete`, null, { params: { tenantId } });
};

export const fetchChannelSyncLogs = async (params: ChannelSyncLogQuery) => {
  const { data } = await http.get<PageResponse<ChannelSyncLog>>('/api/v1/sales/sync-logs', { params });
  return data;
};

export const fetchChannelCredential = async (params: {
  tenantId: number;
  channelAccountId: number;
  credentialType: string;
}) => {
  const { data } = await http.get<ChannelCredential>('/api/v1/channel/credentials', { params });
  return data;
};

export const upsertChannelCredential = async (payload: {
  tenantId: number;
  channelAccountId: number;
  credentialType: string;
  credentialPayload: string;
  expiresAt?: string;
}) => {
  const { data } = await http.post<ChannelCredential>('/api/v1/channel/credentials', payload);
  return data;
};

export const fetchSalesListings = async (params: {
  tenantId: number;
  channelAccountId?: number;
  status?: string;
  keyword?: string;
  page?: number;
  size?: number;
}) => {
  const { data } = await http.get<PageResponse<SalesListing>>('/api/v1/channel/listings', { params });
  return data;
};

export const createSalesListing = async (payload: {
  tenantId: number;
  channelAccountId: number;
  shopId?: number;
  platform?: 'TEMU';
  listingType?: string;
  sku?: string;
  platformSku?: string;
  productName?: string;
  payloadJson: string;
}) => {
  const { data } = await http.post<SalesListing>('/api/v1/channel/listings', payload);
  return data;
};

export const updateSalesListing = async (listingId: number, payload: {
  tenantId: number;
  channelAccountId?: number;
  shopId?: number;
  listingType?: string;
  sku?: string;
  platformSku?: string;
  productName?: string;
  payloadJson?: string;
  status?: string;
}) => {
  const { data } = await http.post<SalesListing>(`/api/v1/channel/listings/${listingId}/update`, payload);
  return data;
};

export const submitSalesListing = async (listingId: number, payload: { tenantId: number; dryRun?: boolean }) => {
  const { data } = await http.post<SalesListing>(`/api/v1/channel/listings/${listingId}/submit`, payload);
  return data;
};

export const deleteSalesListing = async (listingId: number, tenantId: number) => {
  await http.post(`/api/v1/channel/listings/${listingId}/delete`, null, { params: { tenantId } });
};
