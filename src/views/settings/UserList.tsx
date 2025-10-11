import { useEffect, useMemo, useState } from 'react';
import type { ColumnsType } from 'antd/es/table';
import {
  Avatar,
  Button,
  Card,
  Drawer,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Tree,
  Typography,
  message,
} from 'antd';
import {
  DeleteOutlined,
  EditOutlined,
  ExportOutlined,
  PlusOutlined,
  SafetyOutlined,
  SearchOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import settingsApi from '../../api/settings';
import type {
  BulkAssignRolePayload,
  CreateUserPayload,
  PermissionTreeNode,
  RoleItem,
  UserAccount,
  UserListQuery,
  UserStatus,
} from '../../types/settings';

const { Text } = Typography;

const statusColorMap: Record<UserStatus, string> = {
  active: 'success',
  inactive: 'default',
  pending: 'warning',
};

const statusLabelMap: Record<UserStatus, string> = {
  active: '启用',
  inactive: '停用',
  pending: '待激活',
};

type UserFormValues = {
  name: string;
  username: string;
  phone: string;
  role: string;
  password?: string;
};

const UserListPage = () => {
  const [form] = Form.useForm<UserListQuery>();
  const [userForm] = Form.useForm<UserFormValues>();
  const [bulkForm] = Form.useForm<BulkAssignRolePayload>();
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [loading, setLoading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [filters, setFilters] = useState<UserListQuery>({ status: 'all' });
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [permissionTree, setPermissionTree] = useState<PermissionTreeNode[]>([]);
  const [permissionDrawerOpen, setPermissionDrawerOpen] = useState(false);
  const [permissionUser, setPermissionUser] = useState<UserAccount | null>(null);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);

  const loadUsers = ({
    page = pagination.current,
    pageSize = pagination.pageSize,
    filters: nextFilters,
  }: {
    page?: number;
    pageSize?: number;
    filters?: UserListQuery;
  } = {}) => {
    const finalFilters = nextFilters ?? filters;
    setLoading(true);
    settingsApi.users
      .list({ ...finalFilters, page, pageSize })
      .then((res) => {
        setUsers(res.list);
        setPagination({ current: page, pageSize, total: res.total });
        if (nextFilters) {
          setFilters(nextFilters);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    settingsApi.roles.list().then(setRoles);
    settingsApi.roles.permissions().then(setPermissionTree);
    loadUsers({ filters });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const statusOptions = useMemo(
    () => [
      { label: '全部', value: 'all' },
      { label: '启用', value: 'active' },
      { label: '停用', value: 'inactive' },
      { label: '待激活', value: 'pending' },
    ],
    [],
  );

  const handleSearch = () => {
    const values = form.getFieldsValue();
    setSelectedRowKeys([]);
    loadUsers({ page: 1, filters: values });
  };

  const handleReset = () => {
    form.resetFields();
    setSelectedRowKeys([]);
    loadUsers({ page: 1, pageSize: 10, filters: { status: 'all' } });
  };

  const handleTableChange = (page: number, pageSize: number) => {
    loadUsers({ page, pageSize });
  };

  const openCreateModal = () => {
    setEditingUser(null);
    userForm.resetFields();
    setUserModalOpen(true);
  };

  const openEditModal = (user: UserAccount) => {
    setEditingUser(user);
    userForm.setFieldsValue({
      name: user.name,
      username: user.username,
      phone: user.phone,
      role: user.role,
    });
    setUserModalOpen(true);
  };

  const submitUser = async () => {
    try {
      const values = await userForm.validateFields();
      if (editingUser) {
        await settingsApi.users.update(editingUser.id, {
          name: values.name,
          username: values.username,
          phone: values.phone,
          role: values.role,
        });
        message.success('用户信息已更新');
      } else {
        const payload: CreateUserPayload = {
          name: values.name,
          username: values.username,
          phone: values.phone,
          role: values.role,
          password: values.password || '123456',
        };
        await settingsApi.users.create(payload);
        message.success('用户已创建');
      }
      setUserModalOpen(false);
      loadUsers({ page: 1 });
    } catch (error) {
      if (error) {
        console.error(error);
      }
    }
  };

  const removeUser = (user: UserAccount) => {
    Modal.confirm({
      title: '删除用户',
      content: `确定要删除用户「${user.name}」吗？`,
      okText: '删除',
      okButtonProps: { danger: true },
      onOk: async () => {
        const success = await settingsApi.users.remove(user.id);
        if (success) {
          message.success('用户已删除');
          loadUsers();
        } else {
          message.error('删除失败');
        }
      },
    });
  };

  const openPermissionDrawer = (user: UserAccount) => {
    setPermissionUser(user);
    setPermissionDrawerOpen(true);
  };

  const openBulkModal = () => {
    if (!selectedRowKeys.length) {
      message.warning('请先选择需要调整的用户');
      return;
    }
    bulkForm.setFieldsValue({ userIds: selectedRowKeys as string[] });
    setBulkModalOpen(true);
  };

  const submitBulkAssign = async () => {
    try {
      const { role } = await bulkForm.validateFields(['role']);
      const payload: BulkAssignRolePayload = {
        userIds: selectedRowKeys as string[],
        role,
      };
      await settingsApi.users.bulkAssignRole(payload);
      message.success('岗位已批量更新');
      setBulkModalOpen(false);
      setSelectedRowKeys([]);
      bulkForm.resetFields();
      loadUsers();
    } catch (error) {
      if (error) {
        console.error(error);
      }
    }
  };

  const exportUsers = async () => {
    try {
      const blob = await settingsApi.users.export();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = '用户列表.csv';
      link.click();
      URL.revokeObjectURL(url);
      message.success('导出成功');
    } catch (error) {
      console.error(error);
      message.error('导出失败');
    }
  };

  const columns: ColumnsType<UserAccount> = [
    {
      title: '头像',
      dataIndex: 'avatar',
      render: (value: string, record) => <Avatar src={value}>{record.name.charAt(0)}</Avatar>,
    },
    { title: '用户名', dataIndex: 'name' },
    { title: '登录账号', dataIndex: 'username' },
    { title: '手机号', dataIndex: 'phone' },
    { title: '岗位', dataIndex: 'role' },
    {
      title: '状态',
      dataIndex: 'status',
      render: (status: UserStatus) => <Tag color={statusColorMap[status]}>{statusLabelMap[status]}</Tag>,
    },
    { title: '创建时间', dataIndex: 'createdAt' },
    {
      title: '操作',
      key: 'action',
      align: 'right',
      render: (_, record) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => openEditModal(record)}>
            编辑
          </Button>
          <Button type="link" icon={<SafetyOutlined />} onClick={() => openPermissionDrawer(record)}>
            权限
          </Button>
          <Button type="link" danger icon={<DeleteOutlined />} onClick={() => removeUser(record)}>
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <Card title="用户管理">
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Space wrap>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
            新建
          </Button>
          <Button icon={<TeamOutlined />} disabled={!selectedRowKeys.length} onClick={openBulkModal}>
            批量设置岗位
          </Button>
          <Button icon={<ExportOutlined />} onClick={exportUsers}>
            导出Excel
          </Button>
        </Space>

        <Form form={form} layout="inline" onFinish={handleSearch}>
          <Form.Item name="keyword" label="用户名/手机号">
            <Input placeholder="输入关键词" allowClear prefix={<SearchOutlined />} />
          </Form.Item>
          <Form.Item name="status" label="状态" initialValue="all">
            <Select style={{ width: 160 }} options={statusOptions} />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                搜索
              </Button>
              <Button onClick={handleReset}>重置</Button>
            </Space>
          </Form.Item>
        </Form>

        <Table<UserAccount>
          rowKey={(record) => record.id}
          loading={loading}
          dataSource={users}
          columns={columns}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            onChange: handleTableChange,
          }}
          rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys }}
        />
      </Space>

      <Modal
        title={editingUser ? '编辑用户' : '新建用户'}
        open={userModalOpen}
        onCancel={() => setUserModalOpen(false)}
        onOk={submitUser}
        destroyOnClose
      >
        <Form form={userForm} layout="vertical">
          <Form.Item
            label="用户名"
            name="name"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input placeholder="请输入用户姓名" />
          </Form.Item>
          <Form.Item
            label="登录账号"
            name="username"
            rules={[{ required: true, message: '请输入登录账号' }]}
          >
            <Input placeholder="请输入登录账号" />
          </Form.Item>
          <Form.Item
            label="手机号"
            name="phone"
            rules={[
              { required: true, message: '请输入手机号' },
              { pattern: /^1\d{10}$/, message: '请输入11位有效手机号' },
            ]}
          >
            <Input placeholder="请输入手机号" maxLength={11} />
          </Form.Item>
          <Form.Item
            label="岗位"
            name="role"
            rules={[{ required: true, message: '请选择岗位' }]}
          >
            <Select placeholder="请选择岗位">
              {roles.map((role) => (
                <Select.Option key={role.id} value={role.name}>
                  {role.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          {!editingUser && (
            <Form.Item
              label="初始化密码"
              name="password"
              rules={[{ required: true, message: '请输入初始密码' }]}
            >
              <Input.Password placeholder="请输入初始密码" />
            </Form.Item>
          )}
        </Form>
      </Modal>

      <Drawer
        title={permissionUser ? `${permissionUser.name} 的权限` : '用户权限'}
        placement="right"
        width={360}
        open={permissionDrawerOpen}
        onClose={() => {
          setPermissionDrawerOpen(false);
          setPermissionUser(null);
        }}
      >
        <Text type="secondary">权限继承当前岗位设置，如需调整请在岗位管理中配置。</Text>
        <div style={{ marginTop: 16 }}>
          <Tree treeData={permissionTree} defaultExpandAll disabled checkable />
        </div>
      </Drawer>

      <Modal
        title="批量设置岗位"
        open={bulkModalOpen}
        onCancel={() => setBulkModalOpen(false)}
        onOk={submitBulkAssign}
        destroyOnClose
      >
        <Form form={bulkForm} layout="vertical">
          <Form.Item
            label="岗位"
            name="role"
            rules={[{ required: true, message: '请选择岗位' }]}
          >
            <Select placeholder="请选择岗位">
              {roles.map((role) => (
                <Select.Option key={role.id} value={role.name}>
                  {role.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default UserListPage;
