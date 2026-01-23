import type {
  ActionLogEntry,
  ActionLogQuery,
  AvatarUpdatePayload,
  CompanyOverview,
  CreateOrgMemberPayload,
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
  UserProfile,
  UpdateOrgMemberPayload,
} from '../types';
import type { Paginated } from '../types/pagination';
import { preferenceGroupTemplates } from '../constants/preferences';

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
const wait = (ms = 160) => new Promise((resolve) => setTimeout(resolve, ms));
const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

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
  name: '杭州易供云科技有限公司',
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
    { id: 'tenant-001', name: '杭州易供云科技有限公司', logo: '', isCurrent: true },
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
    permissionIds: [
      'dashboard.overview',
      'dashboard.todo',
      'orders.create',
      'orders.progress',
      'orders.approval',
      'material.stock',
      'material.io',
      'material.purchase',
      'settings.role',
      'settings.user',
      'settings.preference',
    ],
  },
  {
    id: 'role-002',
    name: '生产计划',
    description: '负责生产排期与跟进',
    memberCount: 6,
    updatedAt: '2025-03-12 09:42',
    permissionIds: ['orders.create', 'orders.progress', 'dashboard.todo'],
  },
  {
    id: 'role-003',
    name: '采购专员',
    description: '物料采购与供应商协同',
    memberCount: 5,
    updatedAt: '2025-03-10 15:18',
    permissionIds: ['material.purchase', 'material.stock'],
  },
  {
    id: 'role-004',
    name: '质检主管',
    description: '负责质检流程与标准维护',
    memberCount: 3,
    updatedAt: '2025-03-08 17:06',
    permissionIds: ['orders.progress', 'dashboard.overview'],
  },
  {
    id: 'role-005',
    name: '车间组长',
    description: '负责车间计件与人员分配',
    memberCount: 8,
    updatedAt: '2025-03-06 13:58',
    permissionIds: ['dashboard.todo', 'orders.progress'],
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
  const module = ['订单生产', '物料管理', '系统设置', '车间计件'][index % 4];
  const action = ['新增', '修改', '删除', '导出'][index % 4];
  const operatorName = ['张敏', '李倩', '王磊', '陈晨'][index % 4];
  return {
    id: `log-${index + 1}`,
    module,
    action,
    documentNo: `DOC-${2024030100 + index}`,
    operatorId: `op-${(index % 4) + 1}`,
    operatorName,
    operatedAt: `2025-03-${day} ${hour}:${minute}`,
    clientIp: `192.168.1.${index + 12}`,
    payloadSnapshot: JSON.stringify({ module, action, operatorName }),
  };
});

const clonePreferenceGroups = (): PreferenceGroup[] =>
  preferenceGroupTemplates.map((group) => ({
    ...group,
    items: group.items.map((item) => ({ ...item })),
  }));

const preferenceGroupsStore: PreferenceGroup[] = clonePreferenceGroups();

const findTenant = (tenantId: string): TenantSummary | undefined =>
  companyOverviewStore.tenants.find((tenant) => tenant.id === tenantId);

export const fetchUserProfile = async (): Promise<UserProfile> => {
  await wait();
  return clone(profileStore);
};

export const updateUserAvatar = async (payload: AvatarUpdatePayload): Promise<UserProfile> => {
  await wait();
  if (payload.file) {
    profileStore.avatar = await fileToDataUrl(payload.file);
  }
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

export const listOrgMembers = async (query: OrgMemberQuery = {}): Promise<Paginated<OrgMember>> => {
  await wait();
  const { keyword, page = 1, pageSize = 10 } = query;
  let data = orgMembersStore;
  if (keyword) {
    const lower = keyword.toLowerCase();
    data = data.filter(
      (member) => member.name.toLowerCase().includes(lower) || member.phone.includes(keyword),
    );
  }
  const total = data.length;
  const start = (page - 1) * pageSize;
  const list = data.slice(start, start + pageSize);
  return { list: clone(list), total };
};

export const createOrgMember = async (payload: CreateOrgMemberPayload): Promise<OrgMember> => {
  await wait();
  const next: OrgMember = {
    id: `member-${Date.now()}`,
    name: payload.name,
    phone: payload.phone,
    username: payload.username,
    email: payload.email,
    department: payload.department,
    title: payload.title,
    roleIds: payload.roleIds,
    status: payload.status ?? 'active',
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

export const updateOrgMember = async (
  id: string,
  payload: UpdateOrgMemberPayload,
): Promise<OrgMember | undefined> => {
  await wait();
  const index = orgMembersStore.findIndex((member) => member.id === id);
  if (index === -1) {
    return undefined;
  }
  const current = orgMembersStore[index];
  const updated: OrgMember = {
    ...current,
    name: payload.name ?? current.name,
    phone: payload.phone ?? current.phone,
    email: payload.email ?? current.email,
    roleIds: payload.roleIds ?? current.roleIds,
    status: payload.status ?? current.status,
  };
  orgMembersStore[index] = updated;
  return clone(updated);
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
  const { module, action, operatorId, keyword, page = 1, pageSize = 10 } = query;
  let data = actionLogStore;
  if (module) {
    data = data.filter((item) => item.module.includes(module));
  }
  if (action) {
    data = data.filter((item) => item.action.includes(action));
  }
  if (operatorId) {
    data = data.filter((item) => item.operatorId === operatorId);
  }
  if (keyword) {
    const lower = keyword.toLowerCase();
    data = data.filter((item) => {
      const operatorMatch = item.operatorName?.toLowerCase().includes(lower);
      const documentMatch = item.documentNo?.toLowerCase().includes(lower);
      return Boolean(operatorMatch || documentMatch);
    });
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
