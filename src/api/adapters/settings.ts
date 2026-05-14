import type {
  AuthorizationCodeVerifyResult,
  CompanyBilling,
  CompanyBillingStatus,
  CompanyModuleStatus,
  CompanyOverview,
  TenantSummary,
  RoleItem,
  PermissionTreeNode,
  BackendRoleResponse,
  BackendPermissionModuleDto,
} from '../../types/settings';

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
  billing: CompanyBillingResponse;
};

export type CompanyBillingStatusResponse = 'ACTIVE' | 'TRIAL' | 'EXPIRED' | CompanyBillingStatus;

export type CompanyBillingResponse = {
  status: CompanyBillingStatusResponse;
  plan?: string;
  trialStartedAt?: string;
  trialEndsAt?: string;
  activatedAt?: string;
  trialDaysRemaining?: number;
  upgradeRequired?: boolean;
  activationCodeBound?: boolean;
  upgradeContactWechat?: string;
};

export type AuthorizationCodeVerifyResponse = {
  success: boolean;
  tenantStatus: CompanyBillingStatusResponse;
  message: string;
  billing: CompanyBillingResponse;
};

const normalizeModuleStatus = (status: CompanyModuleStatusResponse): CompanyModuleStatus => {
  if (moduleStatusOrder.includes(status as CompanyModuleStatus)) {
    return status as CompanyModuleStatus;
  }
  const mapped = status?.toLowerCase() as CompanyModuleStatus;
  return moduleStatusOrder.includes(mapped) ? mapped : 'pending';
};

export const normalizeCompanyBillingStatus = (
  status: CompanyBillingStatusResponse | undefined,
): CompanyBillingStatus => {
  if (!status) {
    return 'trial';
  }
  const normalized = status.toLowerCase() as CompanyBillingStatus;
  return normalized === 'active' || normalized === 'trial' || normalized === 'expired'
    ? normalized
    : 'trial';
};

export const adaptCompanyBillingResponse = (payload?: CompanyBillingResponse): CompanyBilling => ({
  status: normalizeCompanyBillingStatus(payload?.status),
  plan: payload?.plan,
  trialStartedAt: payload?.trialStartedAt,
  trialEndsAt: payload?.trialEndsAt,
  activatedAt: payload?.activatedAt,
  trialDaysRemaining: payload?.trialDaysRemaining ?? 0,
  upgradeRequired: Boolean(payload?.upgradeRequired),
  activationCodeBound: Boolean(payload?.activationCodeBound),
  upgradeContactWechat: payload?.upgradeContactWechat,
});

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
  billing: adaptCompanyBillingResponse(payload.billing),
});

export const adaptAuthorizationCodeVerifyResponse = (
  payload: AuthorizationCodeVerifyResponse,
): AuthorizationCodeVerifyResult => ({
  success: payload.success,
  tenantStatus: normalizeCompanyBillingStatus(payload.tenantStatus),
  message: payload.message,
  billing: adaptCompanyBillingResponse(payload.billing),
});

export const adaptRoleResponse = (response: BackendRoleResponse): RoleItem => {
  return {
    id: String(response.id),
    name: response.name,
    description: response.description,
    memberCount: 0, // Backend does not provide this, temporarily set to 0 as per plan
    updatedAt: response.updatedAt, // Assuming backend sends ISO string, frontend can display directly
    permissionIds: response.permissionIds ?? [],
  };
};

export const adaptPermissionTree = (modules: BackendPermissionModuleDto[]): PermissionTreeNode[] => {
  return modules.map(moduleDto => {
    const moduleNode: PermissionTreeNode = {
      key: moduleDto.module, // Use module name as key for the module node
      title: moduleDto.module, // Use module name as title
      children: moduleDto.permissions.map(permissionDto => ({
        key: permissionDto.id, // Use permission ID as key for individual permissions
        title: permissionDto.name, // Use permission name as title
      })),
    };
    return moduleNode;
  });
};
