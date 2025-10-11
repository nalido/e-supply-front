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
  UpdatePreferencePayload,
  UpdateRolePayload,
  UpdateUserPayload,
  TransferTenantPayload,
  UserAccount,
  UserListQuery,
  UserProfile,
} from '../types';
import type { Paginated } from '../api/mock';

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
const wait = (ms = 160) => new Promise((resolve) => setTimeout(resolve, ms));

const profileStore: UserProfile = {
  id: 'user-001',
  name: '张敏',
  avatar: 'https://i.pravatar.cc/160?u=zhangmin',
  phone: '138****1208',
  email: 'zhangmin@huayxt.com',
  maskedPassword: '********',
  position: '系统管理员',
  lastUpdatedAt: '2025-03-18 09:12',
};

const companyOverviewStore: CompanyOverview = {
  id: 'tenant-001',
  name: '杭州衣协同科技有限公司',
  stats: {
    users: { used: 42, total: 60, unit: '人' },
    storage: { used: 168, total: 512, unit: 'GB' },
  },
  modules: [
    { id: 'module-pattern', name: '打板', status: 'active', expireAt: '2025-12-31', highlight: false },
    { id: 'module-orders', name: '订单生产', status: 'active', expireAt: '2025-09-30' },
    { id: 'module-material', name: '物料进销存', status: 'trial', expireAt: '2025-04-30', highlight: true },
    { id: 'module-product', name: '成品进销存', status: 'pending', description: '审批中' },
    { id: 'module-piecework', name: '车间计件', status: 'requested', description: '已申请' },
    { id: 'module-collab', name: '协同中心', status: 'unsubscribed', description: '未购买' },
  ],
  tenants: [
    { id: 'tenant-001', name: '杭州衣协同科技有限公司', logo: '', isCurrent: true },
    { id: 'tenant-002', name: '苏州衣联供应链有限公司', logo: '', isCurrent: false },
    { id: 'tenant-003', name: '宁波衣联生产基地', logo: '', isCurrent: false },
  ],
};

let orgMembersStore: OrgMember[] = [
  { id: 'member-001', name: '李倩', phone: '13856981208', department: '生产部', title: '经理' },
  { id: 'member-002', name: '王磊', phone: '13856984567', department: '生产部', title: '组长' },
  { id: 'member-003', name: '陈晨', phone: '13917890023', department: '质检部', title: '主管' },
  { id: 'member-004', name: '刘洋', phone: '13678903210', department: '采购部', title: '采购专员' },
  { id: 'member-005', name: '赵静', phone: '13756782345', department: '销售部', title: '客户经理' },
  { id: 'member-006', name: '周峰', phone: '13566781234', department: 'IT运维', title: '工程师' },
  { id: 'member-007', name: '韩笑', phone: '13999881239', department: '人力行政', title: 'HRBP' },
  { id: 'member-008', name: '黄莹', phone: '13912349876', department: '财务部', title: '财务主管' },
];

let rolesStore: RoleItem[] = [
  {
    id: 'role-001',
    name: '系统管理员',
    description: '拥有所有模块的管理权限',
    memberCount: 4,
    updatedAt: '2025-03-15 11:36',
  },
  {
    id: 'role-002',
    name: '生产计划',
    description: '负责生产排期与跟进',
    memberCount: 6,
    updatedAt: '2025-03-12 09:42',
  },
  {
    id: 'role-003',
    name: '采购专员',
    description: '物料采购与供应商协同',
    memberCount: 5,
    updatedAt: '2025-03-10 15:18',
  },
  {
    id: 'role-004',
    name: '质检主管',
    description: '负责质检流程与标准维护',
    memberCount: 3,
    updatedAt: '2025-03-08 17:06',
  },
  {
    id: 'role-005',
    name: '车间组长',
    description: '负责车间计件与人员分配',
    memberCount: 8,
    updatedAt: '2025-03-06 13:58',
  },
];

const permissionTreeStore: PermissionTreeNode[] = [
  {
    key: 'dashboard',
    title: '工作台',
    children: [
      { key: 'dashboard.overview', title: '概览' },
      { key: 'dashboard.todo', title: '待办事项' },
    ],
  },
  {
    key: 'orders',
    title: '订单生产',
    children: [
      { key: 'orders.create', title: '创建订单' },
      { key: 'orders.progress', title: '订单进度' },
      { key: 'orders.approval', title: '订单审批' },
    ],
  },
  {
    key: 'material',
    title: '物料管理',
    children: [
      { key: 'material.stock', title: '库存查询' },
      { key: 'material.io', title: '出入库' },
      { key: 'material.purchase', title: '采购计划' },
    ],
  },
  {
    key: 'settings',
    title: '系统设置',
    children: [
      { key: 'settings.role', title: '岗位管理' },
      { key: 'settings.user', title: '用户管理' },
      { key: 'settings.preference', title: '偏好设置' },
    ],
  },
];

const actionLogStore: ActionLogEntry[] = Array.from({ length: 28 }).map((_, index) => {
  const day = ((index % 9) + 1).toString().padStart(2, '0');
  const hour = (9 + (index % 10)).toString().padStart(2, '0');
  const minute = ((index * 3) % 60).toString().padStart(2, '0');
  return {
    id: `log-${index + 1}`,
    moduleName: ['订单生产', '物料管理', '系统设置', '车间计件'][index % 4],
    actionName: ['新增', '修改', '删除', '导出'][index % 4],
    documentNo: `DOC-${2024030100 + index}`,
    operator: ['张敏', '李倩', '王磊', '陈晨'][index % 4],
    operatedAt: `2025-03-${day} ${hour}:${minute}`,
    clientIp: `192.168.1.${index + 12}`,
  };
});

const preferenceGroupsStore: PreferenceGroup[] = [
  {
    key: 'production',
    title: '生产流程',
    items: [
      { key: 'ordered-production', label: '按顺序生产', type: 'switch', value: true },
      { key: 'scan-by-section', label: '按部位扫菲', type: 'switch', value: false },
      {
        key: 'hide-completed-steps',
        label: '扫菲时自动隐藏已完成工序',
        type: 'switch',
        value: true,
      },
      { key: 'auto-bed-generate', label: '自动生成床次', type: 'switch', value: true },
      {
        key: 'bulk-material-cost-source',
        label: '大货物料成本来源',
        type: 'select',
        value: 'plan',
        options: [
          { label: '按用量计划', value: 'plan' },
          { label: '按实耗记录', value: 'actual' },
        ],
      },
      {
        key: 'bulk-cost-quantity-source',
        label: '大货成本核算数量来源',
        type: 'select',
        value: 'cutting',
        options: [
          { label: '按剪裁数量', value: 'cutting' },
          { label: '按完工数量', value: 'finished' },
        ],
      },
      {
        key: 'bom-auto-purchase-qty',
        label: '物料清单自动设置采购数',
        type: 'switch',
        value: true,
      },
    ],
  },
  {
    key: 'mobile',
    title: '移动端与可见性',
    items: [
      { key: 'hide-app-stat', label: '隐藏APP个人统计模块', type: 'switch', value: false },
      {
        key: 'hide-app-salary-complete',
        label: 'APP薪资明细不显示已结算薪资的单价和金额',
        type: 'switch',
        value: true,
      },
      {
        key: 'notify-quantity-change',
        label: '发送登记数量更改通知',
        type: 'switch',
        value: true,
      },
    ],
  },
  {
    key: 'material',
    title: '物料设置',
    items: [
      { key: 'only-reference-material', label: '仅引用物料档案', type: 'switch', value: false },
      {
        key: 'default-process-type',
        label: '物料自动出仓默认加工类型',
        type: 'select',
        value: '外发加工',
        options: [
          { label: '内加工', value: '内加工' },
          { label: '外发加工', value: '外发加工' },
        ],
      },
      {
        key: 'factory-progress-ref',
        label: '工厂订单百分比进度参照裁剪数量',
        type: 'switch',
        value: true,
      },
      {
        key: 'factory-material-follow',
        label: '工厂订单显示物料跟进节点',
        type: 'switch',
        value: true,
      },
      {
        key: 'material-follow-precut',
        label: '物料跟进节点预裁数取值方式',
        type: 'select',
        value: 'cutting-plan',
        options: [
          { label: '裁剪计划数', value: 'cutting-plan' },
          { label: '仓库发料数', value: 'warehouse-issued' },
        ],
      },
      { key: 'workflow-ordering', label: '按流程下板下订单', type: 'switch', value: false },
    ],
  },
  {
    key: 'workshop',
    title: '车间计件',
    items: [
      {
        key: 'piecework-progress-sync',
        label: '车间扫码完成后同步进度',
        type: 'switch',
        value: true,
      },
      {
        key: 'piecework-auto-close',
        label: '达到计件阈值自动完结',
        type: 'switch',
        value: false,
      },
      {
        key: 'piecework-hide-finished',
        label: '车间端隐藏已完成工序',
        type: 'switch',
        value: true,
      },
    ],
  },
];

let usersStore: UserAccount[] = [
  {
    id: 'user-001',
    avatar: 'https://i.pravatar.cc/80?u=user-001',
    name: '张敏',
    username: 'zhangmin',
    phone: '13856981208',
    role: '系统管理员',
    status: 'active',
    createdAt: '2024-06-12 10:25',
  },
  {
    id: 'user-002',
    avatar: 'https://i.pravatar.cc/80?u=user-002',
    name: '李倩',
    username: 'li.qian',
    phone: '13856984567',
    role: '生产计划',
    status: 'active',
    createdAt: '2024-07-02 13:16',
  },
  {
    id: 'user-003',
    avatar: 'https://i.pravatar.cc/80?u=user-003',
    name: '王磊',
    username: 'wanglei',
    phone: '13917890023',
    role: '质检主管',
    status: 'inactive',
    createdAt: '2024-07-28 09:48',
  },
  {
    id: 'user-004',
    avatar: 'https://i.pravatar.cc/80?u=user-004',
    name: '陈晨',
    username: 'chenchen',
    phone: '13678903210',
    role: '采购专员',
    status: 'active',
    createdAt: '2024-08-18 15:02',
  },
  {
    id: 'user-005',
    avatar: 'https://i.pravatar.cc/80?u=user-005',
    name: '赵静',
    username: 'zhaojing',
    phone: '13756782345',
    role: '财务主管',
    status: 'pending',
    createdAt: '2024-11-05 17:24',
  },
];

let joinApplicationsStore: JoinApplication[] = [
  { id: 'apply-001', name: '刘青', phone: '13900001111', status: 'pending', appliedAt: '2025-03-12 09:36' },
  { id: 'apply-002', name: '孙明', phone: '13722223333', status: 'approved', appliedAt: '2025-03-08 14:12', handledAt: '2025-03-08 15:20' },
  { id: 'apply-003', name: '周萍', phone: '13666667777', status: 'rejected', appliedAt: '2025-03-06 10:45', handledAt: '2025-03-06 11:02' },
];

let credentialStore: CredentialItem[] = [
  {
    id: 'cred-001',
    userId: 'user-001',
    userName: '张敏',
    secretId: 'AKID5678XZ',
    secretKey: 'sk-8123-3891-XYZA',
    createdAt: '2025-02-28 09:36',
  },
];

const findTenant = (tenantId: string): TenantSummary | undefined =>
  companyOverviewStore.tenants.find((tenant) => tenant.id === tenantId);

export const fetchUserProfile = async (): Promise<UserProfile> => {
  await wait();
  return clone(profileStore);
};

export const updateUserAvatar = async (payload: AvatarUpdatePayload): Promise<UserProfile> => {
  await wait();
  profileStore.avatar = payload.dataUrl || profileStore.avatar;
  profileStore.lastUpdatedAt = new Date().toISOString().replace('T', ' ').slice(0, 16);
  return clone(profileStore);
};

export const updateUserPhone = async (payload: PhoneUpdatePayload): Promise<UserProfile> => {
  await wait();
  profileStore.phone = payload.phone;
  profileStore.lastUpdatedAt = new Date().toISOString().replace('T', ' ').slice(0, 16);
  return clone(profileStore);
};

export const resetUserPassword = async (): Promise<boolean> => {
  await wait();
  profileStore.maskedPassword = '********';
  profileStore.lastUpdatedAt = new Date().toISOString().replace('T', ' ').slice(0, 16);
  return true;
};

export const fetchCompanyOverview = async (): Promise<CompanyOverview> => {
  await wait();
  return clone(companyOverviewStore);
};

export const inviteCompanyMember = async (payload: InviteMemberPayload): Promise<boolean> => {
  await wait();
  joinApplicationsStore = [
    {
      id: `apply-${Date.now()}`,
      name: payload.remark || `待实名-${payload.phone.slice(-4)}`,
      phone: payload.phone,
      status: 'pending',
      appliedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
    },
    ...joinApplicationsStore,
  ];
  return true;
};

export const transferCompany = async (payload: TransferTenantPayload): Promise<boolean> => {
  await wait();
  void payload;
  return true;
};

export const switchTenant = async (tenantId: string): Promise<CompanyOverview> => {
  await wait();
  const target = findTenant(tenantId);
  if (!target) {
    return clone(companyOverviewStore);
  }
  companyOverviewStore.tenants = companyOverviewStore.tenants.map((tenant) => ({
    ...tenant,
    isCurrent: tenant.id === tenantId,
  }));
  companyOverviewStore.name = target.name;
  return clone(companyOverviewStore);
};

export const listOrgMembers = async (query: OrgMemberQuery = {}): Promise<OrgMember[]> => {
  await wait();
  const { keyword } = query;
  if (!keyword) {
    return clone(orgMembersStore);
  }
  const lower = keyword.toLowerCase();
  return clone(
    orgMembersStore.filter(
      (member) => member.name.toLowerCase().includes(lower) || member.phone.includes(keyword),
    ),
  );
};

export const createOrgMember = async (payload: CreateOrgMemberPayload): Promise<OrgMember> => {
  await wait();
  const next: OrgMember = {
    id: `member-${Date.now()}`,
    ...payload,
  };
  orgMembersStore = [next, ...orgMembersStore];
  return clone(next);
};

export const removeOrgMember = async (id: string): Promise<boolean> => {
  await wait();
  const before = orgMembersStore.length;
  orgMembersStore = orgMembersStore.filter((member) => member.id !== id);
  return before !== orgMembersStore.length;
};

export const listRoles = async (): Promise<RoleItem[]> => {
  await wait();
  return clone(rolesStore);
};

export const createRole = async (payload: CreateRolePayload): Promise<RoleItem> => {
  await wait();
  const next: RoleItem = {
    id: `role-${Date.now()}`,
    memberCount: 0,
    updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
    ...payload,
  };
  rolesStore = [next, ...rolesStore];
  return clone(next);
};

export const updateRole = async (id: string, payload: UpdateRolePayload): Promise<RoleItem | undefined> => {
  await wait();
  const index = rolesStore.findIndex((role) => role.id === id);
  if (index === -1) {
    return undefined;
  }
  const updated: RoleItem = {
    ...rolesStore[index],
    ...payload,
    updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
  };
  rolesStore[index] = updated;
  return clone(updated);
};

export const removeRole = async (id: string): Promise<boolean> => {
  await wait();
  const before = rolesStore.length;
  rolesStore = rolesStore.filter((role) => role.id !== id);
  return before !== rolesStore.length;
};

export const fetchPermissionTree = async (): Promise<PermissionTreeNode[]> => {
  await wait();
  return clone(permissionTreeStore);
};

export const listActionLogs = async (query: ActionLogQuery = {}): Promise<Paginated<ActionLogEntry>> => {
  await wait();
  const { moduleName, actionName, documentNo, page = 1, pageSize = 10 } = query;
  let data = actionLogStore;
  if (moduleName) {
    data = data.filter((item) => item.moduleName.includes(moduleName));
  }
  if (actionName) {
    data = data.filter((item) => item.actionName.includes(actionName));
  }
  if (documentNo) {
    data = data.filter((item) => item.documentNo.includes(documentNo));
  }
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const rows = data.slice(start, end).map((item, index) => ({ ...item, order: start + index + 1 }));
  return {
    list: clone(rows),
    total: data.length,
  };
};

export const listPreferenceGroups = async (): Promise<PreferenceGroup[]> => {
  await wait();
  return clone(preferenceGroupsStore);
};

export const updatePreference = async (payload: UpdatePreferencePayload): Promise<boolean> => {
  await wait();
  const group = preferenceGroupsStore.find((item) => item.items.some((pref) => pref.key === payload.key));
  if (!group) {
    return false;
  }
  group.items = group.items.map((pref) =>
    pref.key === payload.key
      ? {
          ...pref,
          value: payload.value,
        }
      : pref,
  );
  return true;
};

const filterUsers = (query: UserListQuery): UserAccount[] => {
  const { keyword, status } = query;
  let data = usersStore;
  if (keyword) {
    const lower = keyword.toLowerCase();
    data = data.filter(
      (user) =>
        user.name.toLowerCase().includes(lower) ||
        user.username.toLowerCase().includes(lower) ||
        user.phone.includes(keyword),
    );
  }
  if (status && status !== 'all') {
    data = data.filter((user) => user.status === status);
  }
  return data;
};

export const listUsers = async (query: UserListQuery = {}): Promise<Paginated<UserAccount>> => {
  await wait();
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 10;
  const filtered = filterUsers(query);
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  return {
    list: clone(filtered.slice(start, end)),
    total: filtered.length,
  };
};

export const createUser = async (payload: CreateUserPayload): Promise<UserAccount> => {
  await wait();
  const next: UserAccount = {
    id: `user-${Date.now()}`,
    avatar: `https://i.pravatar.cc/80?u=${payload.username}`,
    status: 'active',
    createdAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
    ...payload,
  };
  usersStore = [next, ...usersStore];
  return clone(next);
};

export const updateUser = async (id: string, payload: UpdateUserPayload): Promise<UserAccount | undefined> => {
  await wait();
  const index = usersStore.findIndex((user) => user.id === id);
  if (index === -1) {
    return undefined;
  }
  const updated: UserAccount = {
    ...usersStore[index],
    ...payload,
  };
  usersStore[index] = updated;
  return clone(updated);
};

export const removeUser = async (id: string): Promise<boolean> => {
  await wait();
  const before = usersStore.length;
  usersStore = usersStore.filter((user) => user.id !== id);
  return before !== usersStore.length;
};

export const bulkAssignRole = async (payload: BulkAssignRolePayload): Promise<number> => {
  await wait();
  let affected = 0;
  usersStore = usersStore.map((user) => {
    if (payload.userIds.includes(user.id)) {
      affected += 1;
      return {
        ...user,
        role: payload.role,
      };
    }
    return user;
  });
  return affected;
};

export const exportUsers = async (): Promise<Blob> => {
  await wait();
  const header = '用户名,登录账号,手机号,岗位,状态,创建时间\n';
  const rows = usersStore
    .map((user) => `${user.name},${user.username},${user.phone},${user.role},${user.status},${user.createdAt}`)
    .join('\n');
  return new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
};

export const listJoinApplications = async (
  query: Partial<{ keyword: string; status: JoinApplicationStatus | 'all' }> = {},
): Promise<JoinApplication[]> => {
  await wait();
  const { keyword, status } = query;
  let data = joinApplicationsStore;
  if (keyword) {
    const lower = keyword.toLowerCase();
    data = data.filter(
      (item) => item.name.toLowerCase().includes(lower) || item.phone.includes(keyword),
    );
  }
  if (status && status !== 'all') {
    data = data.filter((item) => item.status === status);
  }
  return clone(data);
};

export const approveJoinApplication = async (id: string): Promise<boolean> => {
  await wait();
  const target = joinApplicationsStore.find((item) => item.id === id);
  if (!target || target.status !== 'pending') {
    return false;
  }
  target.status = 'approved';
  target.handledAt = new Date().toISOString().replace('T', ' ').slice(0, 16);
  return true;
};

export const rejectJoinApplication = async (id: string): Promise<boolean> => {
  await wait();
  const target = joinApplicationsStore.find((item) => item.id === id);
  if (!target || target.status !== 'pending') {
    return false;
  }
  target.status = 'rejected';
  target.handledAt = new Date().toISOString().replace('T', ' ').slice(0, 16);
  return true;
};

export const listCredentials = async (): Promise<CredentialItem[]> => {
  await wait();
  return clone(credentialStore);
};

const randomString = (length: number) => {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < length; i += 1) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
};

export const createCredential = async (payload: CreateCredentialPayload): Promise<CredentialItem> => {
  await wait();
  const user = usersStore.find((item) => item.id === payload.userId);
  const next: CredentialItem = {
    id: `cred-${Date.now()}`,
    userId: payload.userId,
    userName: user?.name ?? '未知用户',
    secretId: `AKID${randomString(8)}`,
    secretKey: `sk-${randomString(4)}-${randomString(4)}-${randomString(4)}`,
    createdAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
  };
  credentialStore = [next, ...credentialStore];
  return clone(next);
};

export const removeCredential = async (id: string): Promise<boolean> => {
  await wait();
  const before = credentialStore.length;
  credentialStore = credentialStore.filter((item) => item.id !== id);
  return before !== credentialStore.length;
};
