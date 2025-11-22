export type UserProfile = {
  id: string;
  name: string;
  username?: string;
  avatar: string;
  phone: string;
  email: string;
  maskedPassword: string;
  position?: string;
  status?: UserStatus;
  lastUpdatedAt?: string;
  roleIds?: string[];
  roleNames?: string[];
};

export type AvatarUpdatePayload = {
  userId: string;
  file: File;
};

export type PhoneUpdatePayload = {
  phone: string;
  captcha: string;
};

export type CompanyUsageStat = {
  used: number;
  total: number;
  unit: string;
};

export type CompanyModuleStatus = 'active' | 'trial' | 'expired' | 'pending' | 'requested' | 'unsubscribed';

export type CompanyModule = {
  id: string;
  name: string;
  status: CompanyModuleStatus;
  expireAt?: string;
  description?: string;
  highlight?: boolean;
};

export type TenantSummary = {
  id: string;
  name: string;
  logo?: string;
  isCurrent: boolean;
};

export type CompanyOverview = {
  id: string;
  name: string;
  stats: {
    users: CompanyUsageStat;
    storage: CompanyUsageStat;
  };
  modules: CompanyModule[];
  tenants: TenantSummary[];
};

export type InviteMemberPayload = {
  phone: string;
  roleId: string;
  remark?: string;
};

export type TransferTenantPayload = {
  targetUserId: string;
  verificationCode: string;
};

export type OrgMember = {
  id: string;
  name: string;
  phone: string;
  username?: string;
  email?: string;
  department?: string;
  title?: string;
  roleIds?: string[];
  status?: UserStatus;
};

export type OrgMemberQuery = {
  keyword?: string;
  page?: number;
  pageSize?: number;
};

export type CreateOrgMemberPayload = {
  name: string;
  username: string;
  phone: string;
  email: string;
  password: string;
  department?: string;
  title?: string;
  avatarUrl?: string;
  roleIds?: string[];
  status?: UserStatus;
};

export type UpdateOrgMemberPayload = {
  name: string;
  phone: string;
  email?: string;
  avatarUrl?: string;
  roleIds?: string[];
  status?: UserStatus;
};

export type RoleItem = {
  id: string;
  name: string;
  description?: string;
  memberCount: number;
  updatedAt: string;
  permissionIds?: string[]; // Add permissionIds to RoleItem
};

// Backend DTOs for Role Management
export type BackendRoleResponse = {
  id: string; // Backend uses Long, but frontend typically uses string for IDs
  tenantId: string; // Backend uses Long
  name: string;
  description?: string;
  createdAt: string; // LocalDateTime serialized to string
  updatedAt: string; // LocalDateTime serialized to string
  permissionIds: string[]; // Backend uses List<Long>
};

export type BackendRoleRequest = {
  tenantId: string; // Backend uses Long
  name: string;
  description?: string;
  permissionIds?: string[]; // Backend uses List<Long>, optional
};

export type BackendPermissionDto = {
  id: string; // Backend uses Long
  code: string;
  name: string;
  module: string;
};

export type BackendPermissionModuleDto = {
  module: string; // Corresponds to module name
  permissions: BackendPermissionDto[];
};

export type BackendUserAccountResponse = {
  id: string;
  tenantId: string;
  tenantIds: string[];
  username: string;
  displayName: string;
  phone?: string;
  email?: string;
  avatarUrl?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  roleIds?: Array<string | number>;
};

export type BackendPageResponse<T> = {
  items: T[];
  total: number;
  page: number;
  size: number;
};

export type BackendAuditLogResponse = {
  id: string | number;
  tenantId: string | number;
  module: string;
  action: string;
  documentNo?: string | null;
  operatorId?: string | number | null;
  operatorName?: string | null;
  clientIp?: string | null;
  payloadSnapshot?: string | null;
  createdAt: string;
};

export type BackendUserAccountCreateRequest = {
  tenantId: string | number;
  username: string;
  displayName: string;
  password: string;
  status?: string;
  phone?: string;
  email: string;
  avatarUrl?: string;
  roleIds?: Array<string | number>;
};

export type BackendUserAccountUpdateRequest = {
  tenantId: string | number;
  displayName?: string;
  phone?: string;
  email?: string;
  avatarUrl?: string;
  status?: string;
  roleIds?: Array<string | number>;
};

export type CreateRolePayload = {
  name: string;
  description?: string;
};

export type UpdateRolePayload = {
  name: string;
  description?: string;
};

export type PermissionTreeNode = {
  key: string;
  title: string;
  children?: PermissionTreeNode[];
};

export type ActionLogQuery = {
  module?: string;
  action?: string;
  operatorId?: string;
  keyword?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
};

export type ActionLogEntry = {
  id: string;
  module: string;
  action: string;
  documentNo?: string;
  operatorId?: string;
  operatorName: string;
  operatedAt: string;
  clientIp?: string;
  payloadSnapshot?: string;
  order?: number;
};

export type PreferenceControlType = 'switch' | 'select';

export type PreferenceOption = {
  label: string;
  value: string;
};

export type PreferenceItem = {
  key: string;
  label: string;
  description?: string;
  type: PreferenceControlType;
  value: boolean | string;
  options?: PreferenceOption[];
};

export type PreferenceGroup = {
  key: string;
  title: string;
  items: PreferenceItem[];
};

export type UpdatePreferencePayload = {
  key: string;
  value: boolean | string;
};

export type UserStatus = 'active' | 'inactive' | 'pending';

export type UserAccount = {
  id: string;
  avatar: string;
  name: string;
  username: string;
  phone: string;
  role: string;
  status: UserStatus;
  createdAt: string;
};

export type UserListQuery = {
  keyword?: string;
  status?: UserStatus | 'all';
  page?: number;
  pageSize?: number;
};

export type CreateUserPayload = {
  name: string;
  username: string;
  phone: string;
  role: string;
  password: string;
};

export type UpdateUserPayload = Partial<CreateUserPayload>;

export type JoinApplicationStatus = 'pending' | 'approved' | 'rejected';

export type JoinApplication = {
  id: string;
  name: string;
  phone: string;
  status: JoinApplicationStatus;
  appliedAt: string;
  handledAt?: string;
};

export type CredentialItem = {
  id: string;
  userId: string;
  userName: string;
  secretId: string;
  secretKey: string;
  createdAt: string;
};

export type CreateCredentialPayload = {
  userId: string;
  expiresIn?: number;
};

export type BulkAssignRolePayload = {
  userIds: string[];
  role: string;
};
