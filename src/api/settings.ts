import type {
  ActionLogEntry,
  ActionLogQuery,
  AvatarUpdatePayload,
  BulkAssignRolePayload,
  CompanyOverview,
  CreateCredentialPayload,
  CreateOrgMemberPayload,
  UpdateOrgMemberPayload,
  CreateRolePayload,
  CreateUserPayload,
  CredentialItem,
  InviteMemberPayload,
  JoinApplication,
  JoinApplicationStatus,
  OrgMember,
  OrgMemberQuery,
  PermissionTreeNode,
  PreferenceGroup,
  PhoneUpdatePayload,
  RoleItem,
  TenantSummary,
  TransferTenantPayload,
  UpdatePreferencePayload,
  UpdateRolePayload,
  UpdateUserPayload,
  UserAccount,
  UserStatus,
  UserListQuery,
  UserProfile,
  // New DTO types
  BackendAuditLogResponse,
  BackendRoleResponse,
  BackendRoleRequest,
  BackendPermissionModuleDto,
  BackendPageResponse,
  BackendUserAccountCreateRequest,
  BackendUserAccountUpdateRequest,
  BackendUserAccountResponse,
} from '../types/settings';
import type { Paginated } from './mock';
import http from './http';
import { apiConfig } from './config';
import {
  adaptCompanyOverviewResponse,
  type CompanyOverviewResponse,
  // New adapter functions
  adaptRoleResponse,
  adaptPermissionTree,
} from './adapters/settings';
import {
  approveJoinApplication,
  bulkAssignRole as mockBulkAssignRole,
  createCredential as mockCreateCredential,
  createOrgMember as mockCreateOrgMember,
  createRole as mockCreateRole,
  createUser as mockCreateUser,
  fetchPermissionTree,
  fetchUserProfile as mockFetchUserProfile,
  inviteCompanyMember as mockInviteCompanyMember,
  listActionLogs as mockListActionLogs,
  listCredentials as mockListCredentials,
  listJoinApplications as mockListJoinApplications,
  listOrgMembers as mockListOrgMembers,
  listPreferenceGroups as mockListPreferenceGroups,
  listRoles as mockListRoles,
  listUsers as mockListUsers,
  removeCredential as mockRemoveCredential,
  removeOrgMember as mockRemoveOrgMember,
  updateOrgMember as mockUpdateOrgMember,
  removeRole as mockRemoveRole,
  removeUser as mockRemoveUser,
  resetUserPassword as mockResetUserPassword,
  rejectJoinApplication,
  switchTenant as mockSwitchTenant,
  transferCompany as mockTransferCompany,
  updatePreference as mockUpdatePreference,
  updateRole as mockUpdateRole,
  updateUser as mockUpdateUser,
  updateUserAvatar as mockUpdateUserAvatar,
  updateUserPhone as mockUpdateUserPhone,
  exportUsers as mockExportUsers,
  fetchCompanyOverview as mockFetchCompanyOverview,
} from '../mock/settings';
import { tenantStore } from '../stores/tenant'; // Import tenantStore

const useMock = apiConfig.useMock;

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

export const settingsApi = {
  profile: {
    get: async (options: ProfileFetchOptions = {}): Promise<UserProfile> => {
      if (useMock) {
        return mockFetchUserProfile();
      }
      const tenantId = tenantStore.getTenantId();
      if (!tenantId) {
        throw new Error('Tenant ID is not available.');
      }
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
      if (useMock) {
        return mockUpdateUserAvatar(payload);
      }
      const tenantId = tenantStore.getTenantId();
      if (!tenantId) {
        throw new Error('Tenant ID is not available.');
      }
      const parsedTenantId = Number(tenantId);
      if (!Number.isFinite(parsedTenantId)) {
        throw new Error('Invalid tenant id');
      }
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
      if (useMock) {
        return mockUpdateUserPhone(payload);
      }
      if (!context?.id) {
        throw new Error('User profile is required for updating phone number.');
      }
      const tenantId = tenantStore.getTenantId();
      if (!tenantId) {
        throw new Error('Tenant ID is not available.');
      }
      const parsedTenantId = Number(tenantId);
      if (!Number.isFinite(parsedTenantId)) {
        throw new Error('Invalid tenant id');
      }
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
    resetPassword: (): Promise<boolean> => mockResetUserPassword(),
  },
  company: {
    getOverview: async (): Promise<CompanyOverview> => {
      if (useMock) {
        return mockFetchCompanyOverview();
      }
      const response = await http.get<CompanyOverviewResponse>('/api/v1/settings/company/overview');
      return adaptCompanyOverviewResponse(response.data);
    },
    invite: (payload: InviteMemberPayload): Promise<boolean> => mockInviteCompanyMember(payload),
    transfer: (payload: TransferTenantPayload): Promise<boolean> => mockTransferCompany(payload),
    switchTenant: (tenantId: TenantSummary['id']): Promise<CompanyOverview> => mockSwitchTenant(tenantId),
  },
  organization: {
    list: async (query: OrgMemberQuery = {}): Promise<Paginated<OrgMember>> => {
      if (useMock) {
        return mockListOrgMembers(query);
      }
      const tenantId = tenantStore.getTenantId();
      if (!tenantId) {
        throw new Error('Tenant ID is not available.');
      }
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
      if (useMock) {
        return mockCreateOrgMember(payload);
      }
      const tenantId = tenantStore.getTenantId();
      if (!tenantId) {
        throw new Error('Tenant ID is not available.');
      }
      const parsedTenantId = Number(tenantId);
      if (!Number.isFinite(parsedTenantId)) {
        throw new Error('Invalid tenant id');
      }
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
      if (useMock) {
        const next = await mockUpdateOrgMember(memberId, payload);
        if (!next) {
          throw new Error('成员不存在');
        }
        return next;
      }
      const tenantId = tenantStore.getTenantId();
      if (!tenantId) {
        throw new Error('Tenant ID is not available.');
      }
      const parsedTenantId = Number(tenantId);
      if (!Number.isFinite(parsedTenantId)) {
        throw new Error('Invalid tenant id');
      }
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
      if (useMock) {
        return mockRemoveOrgMember(memberId);
      }
      const tenantId = tenantStore.getTenantId();
      if (!tenantId) {
        throw new Error('Tenant ID is not available.');
      }
      const parsedTenantId = Number(tenantId);
      if (!Number.isFinite(parsedTenantId)) {
        throw new Error('Invalid tenant id');
      }
      await http.post(`/api/v1/settings/users/${memberId}/delete`, { tenantId: parsedTenantId });
      return true;
    },
  },
  roles: {
    list: async (): Promise<RoleItem[]> => {
      if (useMock) {
        return mockListRoles();
      }
      const tenantId = tenantStore.getTenantId();
      if (!tenantId) {
        throw new Error('Tenant ID is not available.');
      }
      const response = await http.get<BackendRoleResponse[]>('/api/v1/settings/roles', {
        params: { tenantId },
      });
      return response.data.map(adaptRoleResponse);
    },
    create: async (payload: CreateRolePayload & { permissionIds?: string[] }): Promise<RoleItem> => {
      if (useMock) {
        return mockCreateRole(payload);
      }
      const tenantId = tenantStore.getTenantId();
      if (!tenantId) {
        throw new Error('Tenant ID is not available.');
      }
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
      if (useMock) {
        return mockUpdateRole(id, payload);
      }
      const tenantId = tenantStore.getTenantId();
      if (!tenantId) {
        throw new Error('Tenant ID is not available.');
      }
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
      if (useMock) {
        return mockRemoveRole(id);
      }
      const tenantId = tenantStore.getTenantId();
      if (!tenantId) {
        throw new Error('Tenant ID is not available.');
      }
      await http.post(`/api/v1/settings/roles/${id}/delete`, null, {
        params: { tenantId },
      });
      return true;
    },
    permissions: async (): Promise<PermissionTreeNode[]> => {
      if (useMock) {
        return fetchPermissionTree();
      }
      const response = await http.get<BackendPermissionModuleDto[]>('/api/v1/settings/permissions');
      return adaptPermissionTree(response.data);
    },
  },
  audit: {
    list: async (query: ActionLogQuery = {}): Promise<Paginated<ActionLogEntry>> => {
      if (useMock) {
        return mockListActionLogs(query);
      }
      const tenantId = tenantStore.getTenantId();
      if (!tenantId) {
        throw new Error('Tenant ID is not available.');
      }
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
    list: (): Promise<PreferenceGroup[]> => mockListPreferenceGroups(),
    update: (payload: UpdatePreferencePayload): Promise<boolean> => mockUpdatePreference(payload),
  },
  users: {
    list: (query?: UserListQuery): Promise<Paginated<UserAccount>> => mockListUsers(query),
    create: (payload: CreateUserPayload): Promise<UserAccount> => mockCreateUser(payload),
    update: (id: string, payload: UpdateUserPayload): Promise<UserAccount | undefined> => mockUpdateUser(id, payload),
    remove: (id: string): Promise<boolean> => mockRemoveUser(id),
    bulkAssignRole: (payload: BulkAssignRolePayload): Promise<number> => mockBulkAssignRole(payload),
    export: (): Promise<Blob> => mockExportUsers(),
  },
  onboarding: {
    list: (query?: { keyword?: string; status?: JoinApplicationStatus | 'all' }): Promise<JoinApplication[]> =>
      mockListJoinApplications(query),
    approve: (id: string): Promise<boolean> => approveJoinApplication(id),
    reject: (id: string): Promise<boolean> => rejectJoinApplication(id),
  },
  credentials: {
    list: (): Promise<CredentialItem[]> => mockListCredentials(),
    create: (payload: CreateCredentialPayload): Promise<CredentialItem> => mockCreateCredential(payload),
    remove: (id: string): Promise<boolean> => mockRemoveCredential(id),
  },
};

export default settingsApi;
