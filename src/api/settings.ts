import type {
  ActionLogEntry,
  ActionLogQuery,
  AvatarUpdatePayload,
  BulkAssignRolePayload,
  CompanyOverview,
  CreateCredentialPayload,
  CreateOrgMemberPayload,
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
  UserListQuery,
  UserProfile,
  // New DTO types
  BackendRoleResponse,
  BackendRoleRequest,
  BackendPermissionModuleDto,
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

export const settingsApi = {
  profile: {
    get: (): Promise<UserProfile> => mockFetchUserProfile(),
    updateAvatar: (payload: AvatarUpdatePayload): Promise<UserProfile> => mockUpdateUserAvatar(payload),
    updatePhone: (payload: PhoneUpdatePayload): Promise<UserProfile> => mockUpdateUserPhone(payload),
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
    list: (query?: OrgMemberQuery): Promise<OrgMember[]> => mockListOrgMembers(query),
    create: (payload: CreateOrgMemberPayload): Promise<OrgMember> => mockCreateOrgMember(payload),
    remove: (memberId: string): Promise<boolean> => mockRemoveOrgMember(memberId),
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
    list: (query?: ActionLogQuery): Promise<Paginated<ActionLogEntry>> => mockListActionLogs(query),
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
