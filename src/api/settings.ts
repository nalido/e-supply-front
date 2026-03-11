import type {
  ActionLogEntry,
  ActionLogQuery,
  AvatarUpdatePayload,
  CompanyOverview,
  CreateOrgMemberPayload,
  UpdateOrgMemberPayload,
  CreateRolePayload,
  OrgMember,
  OrgMemberQuery,
  PermissionTreeNode,
  PreferenceGroup,
  PhoneUpdatePayload,
  RoleItem,
  TenantSummary,
  UpdatePreferencePayload,
  UpdateRolePayload,
  UserStatus,
  UserProfile,
  BackendAuditLogResponse,
  BackendRoleResponse,
  BackendRoleRequest,
  BackendPermissionModuleDto,
  BackendPageResponse,
  BackendPreferenceResponse,
  BackendUserAccountCreateRequest,
  BackendUserAccountUpdateRequest,
  BackendUserAccountResponse,
} from '../types/settings';
import type { Paginated } from '../types/pagination';
import http from './http';
import {
  adaptCompanyOverviewResponse,
  type CompanyOverviewResponse,
  // New adapter functions
  adaptRoleResponse,
  adaptPermissionTree,
} from './adapters/settings';
import { preferenceGroupTemplates } from '../constants/preferences';
import { tenantStore } from '../stores/tenant'; // Import tenantStore

type ProfileFetchOptions = {
  userId?: string;
  username?: string;
  email?: string;
  keyword?: string;
};

const normalizeRoleIds = (values?: Array<string | number>): string[] =>
  (values ?? [])
    .map((value) => (value === undefined || value === null ? '' : value.toString()))
    .filter((value): value is string => Boolean(value));

const normalizeUserStatus = (status?: string): UserStatus | undefined => {
  if (!status) {
    return undefined;
  }
  const lowered = status.toLowerCase() as UserStatus;
  if (lowered === 'active' || lowered === 'inactive' || lowered === 'pending') {
    return lowered;
  }
  return undefined;
};

const adaptOrgMemberFromBackend = (item: BackendUserAccountResponse): OrgMember => ({
  id: String(item.id),
  name: item.displayName || item.username || '',
  username: item.username,
  phone: item.phone ?? '',
  email: item.email,
  roleIds: normalizeRoleIds(item.roleIds),
  status: normalizeUserStatus(item.status),
});

const adaptUserProfileFromBackend = (item: BackendUserAccountResponse): UserProfile => ({
  id: String(item.id),
  name: item.displayName || item.username || '',
  username: item.username,
  avatar: item.avatarUrl ?? '',
  phone: item.phone ?? '',
  email: item.email ?? '',
  maskedPassword: '********',
  status: normalizeUserStatus(item.status),
  lastUpdatedAt: item.updatedAt,
  roleIds: normalizeRoleIds(item.roleIds),
});

const adaptAuditLogFromBackend = (item: BackendAuditLogResponse): ActionLogEntry => ({
  id: String(item.id ?? ''),
  module: item.module ?? '',
  action: item.action ?? '',
  documentNo: item.documentNo ?? undefined,
  operatorId: item.operatorId ? String(item.operatorId) : undefined,
  operatorName: item.operatorName ?? '',
  operatedAt: item.createdAt ?? '',
  clientIp: item.clientIp ?? undefined,
  payloadSnapshot: item.payloadSnapshot ?? undefined,
});

const PREFERENCE_OWNER_TYPE = 'TENANT';

const getTenantIdOrThrow = (): string => {
  const tenantId = tenantStore.getTenantId();
  if (!tenantId) {
    throw new Error('Tenant ID is not available.');
  }
  return tenantId;
};

const getParsedTenantIdOrThrow = (): number => {
  const tenantId = Number(getTenantIdOrThrow());
  if (!Number.isFinite(tenantId)) {
    throw new Error('Invalid tenant id');
  }
  return tenantId;
};

const clonePreferenceGroups = (): PreferenceGroup[] =>
  preferenceGroupTemplates.map((group) => ({
    ...group,
    items: group.items.map((item) => ({ ...item })),
  }));

const applyPreferenceValues = (records: BackendPreferenceResponse[]): PreferenceGroup[] => {
  const valueMap = new Map<string, string>();
  records.forEach((record) => {
    if (record.key) {
      valueMap.set(record.key, record.value ?? '');
    }
  });
  return clonePreferenceGroups().map((group) => ({
    ...group,
    items: group.items.map((item) => {
      const raw = valueMap.get(item.key);
      if (item.type === 'switch') {
        const fallback = Boolean(item.value);
        return {
          ...item,
          value: raw === undefined || raw === '' ? fallback : raw === 'true',
        };
      }
      const fallback = typeof item.value === 'string' ? item.value : '';
      return {
        ...item,
        value: raw ?? fallback,
      };
    }),
  }));
};

export const settingsApi = {
  profile: {
    get: async (options: ProfileFetchOptions = {}): Promise<UserProfile> => {
      const tenantId = getTenantIdOrThrow();
      if (options.userId) {
        const response = await http.get<BackendUserAccountResponse>(
          `/api/v1/settings/users/${options.userId}`,
          { params: { tenantId } },
        );
        return adaptUserProfileFromBackend(response.data);
      }
      const keyword = options.keyword ?? options.username ?? options.email;
      if (!keyword) {
        throw new Error('无法确定当前用户标识');
      }
      const response = await http.get<BackendPageResponse<BackendUserAccountResponse>>(
        '/api/v1/settings/users',
        {
          params: {
            tenantId,
            keyword,
            page: 1,
            size: 20,
          },
        },
      );
      const items = response.data.items ?? [];
      if (!items.length) {
        throw new Error('未找到当前用户信息');
      }
      const normalizedUsername = options.username?.toLowerCase();
      const normalizedEmail = options.email?.toLowerCase();
      const matched =
        items.find((item) => normalizedUsername && item.username?.toLowerCase() === normalizedUsername) ||
        items.find((item) => normalizedEmail && item.email?.toLowerCase() === normalizedEmail) ||
        items[0];
      return adaptUserProfileFromBackend(matched);
    },
    updateAvatar: async (payload: AvatarUpdatePayload): Promise<UserProfile> => {
      const parsedTenantId = getParsedTenantIdOrThrow();
      const formData = new FormData();
      formData.append('file', payload.file);
      const response = await http.post<BackendUserAccountResponse>(
        `/api/v1/settings/users/${payload.userId}/avatar`,
        formData,
        {
          params: { tenantId: parsedTenantId },
          headers: { 'Content-Type': 'multipart/form-data' },
        },
      );
      return adaptUserProfileFromBackend(response.data);
    },
    updatePhone: async (payload: PhoneUpdatePayload, context?: UserProfile): Promise<UserProfile> => {
      if (!context?.id) {
        throw new Error('User profile is required for updating phone number.');
      }
      const parsedTenantId = getParsedTenantIdOrThrow();
      const requestBody: BackendUserAccountUpdateRequest = {
        tenantId: parsedTenantId,
        displayName: context.name,
        phone: payload.phone,
        email: context.email,
        avatarUrl: context.avatar,
        status: context.status ? context.status.toUpperCase() : undefined,
      };
      const response = await http.post<BackendUserAccountResponse>(
        `/api/v1/settings/users/${context.id}/update`,
        requestBody,
      );
      return adaptUserProfileFromBackend(response.data);
    },
  },
  company: {
    getOverview: async (): Promise<CompanyOverview> => {
      const response = await http.get<CompanyOverviewResponse>('/api/v1/settings/company/overview');
      return adaptCompanyOverviewResponse(response.data);
    },
    switchTenant: async (tenantId: TenantSummary['id']): Promise<CompanyOverview> => {
      if (!tenantId) {
        throw new Error('目标企业无效');
      }
      const response = await http.post<CompanyOverviewResponse>(
        `/api/v1/settings/company/tenants/${tenantId}:switch`,
      );
      return adaptCompanyOverviewResponse(response.data);
    },
  },
  organization: {
    list: async (query: OrgMemberQuery = {}): Promise<Paginated<OrgMember>> => {
      const tenantId = getTenantIdOrThrow();
      const page = query.page ?? 1;
      const pageSize = query.pageSize ?? 10;
      const response = await http.get<BackendPageResponse<BackendUserAccountResponse>>(
        '/api/v1/settings/users',
        {
          params: {
            tenantId,
            keyword: query.keyword,
            page,
            size: pageSize,
          },
        },
      );
      return {
        list: (response.data.items ?? []).map(adaptOrgMemberFromBackend),
        total: response.data.total ?? 0,
      };
    },
    create: async (payload: CreateOrgMemberPayload): Promise<OrgMember> => {
      const parsedTenantId = getParsedTenantIdOrThrow();
      const roleIds = (payload.roleIds ?? [])
        .map((roleId) => Number(roleId))
        .filter((roleId) => Number.isFinite(roleId) && roleId > 0);
      const requestBody: BackendUserAccountCreateRequest = {
        tenantId: parsedTenantId,
        username: payload.username,
        displayName: payload.name,
        password: payload.password,
        status: (payload.status ?? 'pending').toUpperCase(),
        phone: payload.phone,
        email: payload.email,
        avatarUrl: payload.avatarUrl,
        roleIds: roleIds.length ? roleIds : undefined,
      };
      const response = await http.post<BackendUserAccountResponse>('/api/v1/settings/users', requestBody);
      return adaptOrgMemberFromBackend(response.data);
    },
    update: async (memberId: string, payload: UpdateOrgMemberPayload): Promise<OrgMember> => {
      const parsedTenantId = getParsedTenantIdOrThrow();
      const roleIds = (payload.roleIds ?? [])
        .map((roleId) => Number(roleId))
        .filter((roleId) => Number.isFinite(roleId) && roleId > 0);
      const requestBody: BackendUserAccountUpdateRequest = {
        tenantId: parsedTenantId,
        displayName: payload.name,
        phone: payload.phone,
        email: payload.email,
        avatarUrl: payload.avatarUrl,
        status: payload.status ? payload.status.toUpperCase() : undefined,
        roleIds: roleIds.length ? roleIds : undefined,
      };
      const response = await http.post<BackendUserAccountResponse>(
        `/api/v1/settings/users/${memberId}/update`,
        requestBody,
      );
      return adaptOrgMemberFromBackend(response.data);
    },
    remove: async (memberId: string): Promise<boolean> => {
      const parsedTenantId = getParsedTenantIdOrThrow();
      await http.post(`/api/v1/settings/users/${memberId}/delete`, { tenantId: parsedTenantId });
      return true;
    },
  },
  roles: {
    list: async (): Promise<RoleItem[]> => {
      const tenantId = getTenantIdOrThrow();
      const response = await http.get<BackendRoleResponse[]>('/api/v1/settings/roles', {
        params: { tenantId },
      });
      return response.data.map(adaptRoleResponse);
    },
    create: async (payload: CreateRolePayload & { permissionIds?: string[] }): Promise<RoleItem> => {
      const tenantId = getTenantIdOrThrow();
      const requestBody: BackendRoleRequest = {
        tenantId,
        name: payload.name,
        description: payload.description,
        permissionIds: payload.permissionIds,
      };
      const response = await http.post<BackendRoleResponse>('/api/v1/settings/roles', requestBody);
      return adaptRoleResponse(response.data);
    },
    update: async (id: string, payload: UpdateRolePayload & { permissionIds?: string[] }): Promise<RoleItem | undefined> => {
      const tenantId = getTenantIdOrThrow();
      const requestBody: BackendRoleRequest = {
        tenantId,
        name: payload.name,
        description: payload.description,
        permissionIds: payload.permissionIds,
      };
      const response = await http.post<BackendRoleResponse>(`/api/v1/settings/roles/${id}/update`, requestBody);
      return adaptRoleResponse(response.data);
    },
    remove: async (id: string): Promise<boolean> => {
      const tenantId = getTenantIdOrThrow();
      await http.post(`/api/v1/settings/roles/${id}/delete`, null, {
        params: { tenantId },
      });
      return true;
    },
    permissions: async (): Promise<PermissionTreeNode[]> => {
      const response = await http.get<BackendPermissionModuleDto[]>('/api/v1/settings/permissions');
      return adaptPermissionTree(response.data);
    },
  },
  audit: {
    list: async (query: ActionLogQuery = {}): Promise<Paginated<ActionLogEntry>> => {
      const tenantId = getTenantIdOrThrow();
      const pageIndex = Math.max(0, (query.page ?? 1) - 1);
      const pageSize = query.pageSize ?? 10;
      const response = await http.get<BackendPageResponse<BackendAuditLogResponse>>(
        '/api/v1/settings/audit-logs',
        {
          params: {
            tenantId,
            module: query.module,
            action: query.action,
            operatorId: query.operatorId,
            keyword: query.keyword,
            from: query.from,
            to: query.to,
            page: pageIndex,
            size: pageSize,
          },
        },
      );
      return {
        list: (response.data.items ?? []).map(adaptAuditLogFromBackend),
        total: response.data.total ?? 0,
      };
    },
  },
  preferences: {
    list: async (): Promise<PreferenceGroup[]> => {
      const tenantId = getParsedTenantIdOrThrow();
      const response = await http.get<BackendPreferenceResponse[]>(
        '/api/v1/settings/preferences',
        {
          params: {
            tenantId,
            ownerType: PREFERENCE_OWNER_TYPE,
            ownerId: tenantId,
          },
        },
      );
      const records = Array.isArray(response.data) ? response.data : [];
      return applyPreferenceValues(records);
    },
    update: async (payload: UpdatePreferencePayload): Promise<boolean> => {
      const tenantId = getParsedTenantIdOrThrow();
      const normalizedValue =
        typeof payload.value === 'boolean' ? (payload.value ? 'true' : 'false') : `${payload.value ?? ''}`;
      await http.post('/api/v1/settings/preferences', {
        tenantId,
        ownerType: PREFERENCE_OWNER_TYPE,
        ownerId: tenantId,
        key: payload.key,
        value: normalizedValue,
      });
      return true;
    },
  },
};

export default settingsApi;
