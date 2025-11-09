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
} from '../types/settings';
import type { Paginated } from './mock';
import http from './http';
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
} from '../mock/settings';

export const settingsApi = {
  profile: {
    get: (): Promise<UserProfile> => mockFetchUserProfile(),
    updateAvatar: (payload: AvatarUpdatePayload): Promise<UserProfile> => mockUpdateUserAvatar(payload),
    updatePhone: (payload: PhoneUpdatePayload): Promise<UserProfile> => mockUpdateUserPhone(payload),
    resetPassword: (): Promise<boolean> => mockResetUserPassword(),
  },
  company: {
    getOverview: async (): Promise<CompanyOverview> => {
      const response = await http.get<CompanyOverview>('/api/v1/settings/company/overview');
      return response.data;
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
    list: (): Promise<RoleItem[]> => mockListRoles(),
    create: (payload: CreateRolePayload): Promise<RoleItem> => mockCreateRole(payload),
    update: (id: string, payload: UpdateRolePayload): Promise<RoleItem | undefined> => mockUpdateRole(id, payload),
    remove: (id: string): Promise<boolean> => mockRemoveRole(id),
    permissions: (): Promise<PermissionTreeNode[]> => fetchPermissionTree(),
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
