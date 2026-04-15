import { tenantStore } from '../stores/tenant';

export const requireTenantId = (): string => {
  const tenantId = tenantStore.getTenantId();
  if (!tenantId) {
    throw new Error('未找到租户信息，请重新选择企业');
  }
  return tenantId;
};

export const requireNumericTenantId = (): number => {
  const parsed = Number(requireTenantId());
  if (!Number.isFinite(parsed)) {
    throw new Error('租户信息无效，请刷新后重试');
  }
  return parsed;
};

export const toBackendPage = (page?: number): number => {
  const normalized = Number(page ?? 1);
  if (!Number.isFinite(normalized) || normalized <= 1) {
    return 0;
  }
  return Math.floor(normalized) - 1;
};

export const fromBackendPage = (page?: number): number => {
  if (!Number.isFinite(page)) {
    return 1;
  }
  return Number(page) + 1;
};
