import http from './http';

export const pullTemuOrders = async (payload: {
  tenantId: number;
  channelAccountId: number;
  since?: string;
  until?: string;
}) => {
  const { data } = await http.post('/api/v1/integration/temu/orders/pull', payload);
  return data;
};

export const syncTemuProducts = async (payload: {
  tenantId: number;
  channelAccountId: number;
  since?: string;
  until?: string;
}) => {
  const { data } = await http.post('/api/v1/integration/temu/products/sync', payload);
  return data;
};

export const syncTemuInventory = async (payload: {
  tenantId: number;
  channelAccountId: number;
  since?: string;
  until?: string;
}) => {
  const { data } = await http.post('/api/v1/integration/temu/inventory/sync', payload);
  return data;
};
