export type UserProfile = {
  id: string;
  name: string;
  avatar: string;
  phone: string;
  email: string;
  maskedPassword: string;
  position?: string;
  lastUpdatedAt?: string;
};

export type AvatarUpdatePayload = {
  fileName: string;
  fileSize: number;
  fileType: string;
  dataUrl: string;
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
  department: string;
  title?: string;
};

export type OrgMemberQuery = {
  keyword?: string;
  includeChildren?: boolean;
};

export type CreateOrgMemberPayload = {
  name: string;
  phone: string;
  department: string;
  title?: string;
};

export type RoleItem = {
  id: string;
  name: string;
  description?: string;
  memberCount: number;
  updatedAt: string;
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
  moduleName?: string;
  actionName?: string;
  documentNo?: string;
  page?: number;
  pageSize?: number;
};

export type ActionLogEntry = {
  id: string;
  moduleName: string;
  actionName: string;
  documentNo: string;
  operator: string;
  operatedAt: string;
  clientIp: string;
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
