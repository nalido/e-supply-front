import type { CompanyModuleStatus, CompanyOverview, TenantSummary } from '../../types/settings';

const moduleStatusOrder: CompanyModuleStatus[] = [
  'active',
  'trial',
  'expired',
  'pending',
  'requested',
  'unsubscribed',
];

export type CompanyModuleStatusResponse =
  | 'ACTIVE'
  | 'TRIAL'
  | 'EXPIRED'
  | 'PENDING'
  | 'REQUESTED'
  | 'UNSUBSCRIBED'
  | CompanyModuleStatus;

export type CompanyOverviewResponse = {
  id: string;
  name?: string;
  companyName?: string;
  stats: CompanyOverview['stats'];
  modules: Array<{
    id: string;
    name: string;
    status: CompanyModuleStatusResponse;
    expireAt?: string;
    description?: string;
    highlight?: boolean;
  }>;
  tenants: Array<{
    id: string;
    name: string;
    logo?: string;
    isCurrent?: boolean;
    current?: boolean;
  }>;
};

const normalizeModuleStatus = (status: CompanyModuleStatusResponse): CompanyModuleStatus => {
  if (moduleStatusOrder.includes(status as CompanyModuleStatus)) {
    return status as CompanyModuleStatus;
  }
  const mapped = status?.toLowerCase() as CompanyModuleStatus;
  return moduleStatusOrder.includes(mapped) ? mapped : 'pending';
};

const adaptTenant = (tenant: CompanyOverviewResponse['tenants'][number]): TenantSummary => ({
  id: tenant.id,
  name: tenant.name,
  logo: tenant.logo ?? '',
  isCurrent: tenant.isCurrent ?? tenant.current ?? false,
});

export const adaptCompanyOverviewResponse = (payload: CompanyOverviewResponse): CompanyOverview => ({
  id: payload.id,
  name: payload.name ?? payload.companyName ?? '',
  stats: payload.stats,
  modules: (payload.modules ?? []).map((module) => ({
    id: module.id,
    name: module.name,
    status: normalizeModuleStatus(module.status),
    expireAt: module.expireAt,
    description: module.description,
    highlight: module.highlight,
  })),
  tenants: (payload.tenants ?? []).map(adaptTenant),
});
