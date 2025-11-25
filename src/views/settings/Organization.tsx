import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ColumnsType } from 'antd/es/table';
import {
  Button,
  Card,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  message,
} from 'antd';
import { DeleteOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons';
import settingsApi from '../../api/settings';
import type { CreateOrgMemberPayload, OrgMember, RoleItem, UpdateOrgMemberPayload } from '../../types/settings';

const userStatusOptions = [
  { label: '启用', value: 'active' },
  { label: '停用', value: 'inactive' },
  { label: '待激活', value: 'pending' },
] as const;

const OrganizationSettings = () => {
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [activeKeyword, setActiveKeyword] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const latestPageSizeRef = useRef(pagination.pageSize);
  const [rolesMap, setRolesMap] = useState<Record<string, string>>({});
  const [roleList, setRoleList] = useState<RoleItem[]>([]);
  const [createForm] = Form.useForm<CreateOrgMemberPayload>();
  const [editForm] = Form.useForm<UpdateOrgMemberPayload>();
  const [editingMember, setEditingMember] = useState<OrgMember | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);

  const fetchMembers = useCallback(
    (page: number, pageSize: number) => {
      setLoading(true);
      settingsApi.organization
        .list({ keyword: activeKeyword, page, pageSize })
        .then((response) => {
          setMembers(response.list);
          setPagination((prev) => ({ ...prev, current: page, pageSize, total: response.total }));
        })
        .finally(() => setLoading(false));
    },
    [activeKeyword],
  );

  useEffect(() => {
    latestPageSizeRef.current = pagination.pageSize;
  }, [pagination.pageSize]);

  useEffect(() => {
    settingsApi.roles.list().then((list) => {
      const normalizedList = list.map((role) => ({ ...role, id: String(role.id) }));
      const nextMap: Record<string, string> = {};
      normalizedList.forEach((role) => {
        nextMap[role.id] = role.name;
      });
      setRoleList(normalizedList);
      setRolesMap(nextMap);
    });
  }, []);

  useEffect(() => {
    fetchMembers(1, latestPageSizeRef.current);
  }, [fetchMembers]);

  const handleSearch = () => {
    const trimmed = keyword.trim();
    setKeyword(trimmed);
    if (trimmed === activeKeyword) {
      fetchMembers(1, pagination.pageSize);
      return;
    }
    setActiveKeyword(trimmed);
  };

  const handleReset = () => {
    setKeyword('');
    if (!activeKeyword) {
      fetchMembers(1, pagination.pageSize);
      return;
    }
    setActiveKeyword('');
  };

  const handlePaginationChange = useCallback(
    (page: number, pageSize?: number) => {
      const resolvedPageSize = pageSize ?? pagination.pageSize;
      fetchMembers(page, resolvedPageSize);
    },
    [fetchMembers, pagination.pageSize],
  );

  const handleRemove = useCallback(
    (member: OrgMember) => {
      Modal.confirm({
        title: '确认删除',
        content: `确定要删除「${member.name}」吗？`,
        okText: '删除',
        okButtonProps: { danger: true },
        onOk: async () => {
          try {
            const success = await settingsApi.organization.remove(member.id);
            if (!success) {
              message.error('删除失败');
              throw new Error('删除失败');
            }
            message.success('成员已删除');
            fetchMembers(pagination.current, pagination.pageSize);
          } catch (error) {
            console.error(error);
            throw error;
          }
        },
      });
    },
    [fetchMembers, pagination],
  );

  const submitCreate = async () => {
    try {
      const values = await createForm.validateFields();
      await settingsApi.organization.create(values);
      message.success('成员已添加');
      setCreateModalOpen(false);
      createForm.resetFields();
      fetchMembers(1, pagination.pageSize);
    } catch (error) {
      if (error) {
        console.error(error);
      }
    }
  };

  const handleEdit = useCallback(
    (member: OrgMember) => {
      setEditingMember(member);
      setEditModalOpen(true);
      editForm.setFieldsValue({
        name: member.name,
        phone: member.phone,
        email: member.email ?? '',
        roleIds: member.roleIds ?? [],
        status: member.status ?? 'active',
      });
    },
    [editForm],
  );

  const closeEditModal = useCallback(() => {
    setEditModalOpen(false);
    setEditingMember(null);
    editForm.resetFields();
  }, [editForm]);

  const submitEdit = async () => {
    if (!editingMember) {
      return;
    }
    try {
      const values = await editForm.validateFields();
      setEditSubmitting(true);
      await settingsApi.organization.update(editingMember.id, values);
      message.success('成员信息已更新');
      closeEditModal();
      fetchMembers(pagination.current, pagination.pageSize);
    } catch (error) {
      if (error) {
        console.error(error);
      }
    } finally {
      setEditSubmitting(false);
    }
  };

  const columns: ColumnsType<OrgMember> = useMemo(
    () => [
      {
        title: '姓名',
        dataIndex: 'name',
      },
      {
        title: '手机号码',
        dataIndex: 'phone',
      },
      {
        title: '岗位',
        key: 'title',
        render: (_, record) => {
          const roleTags = (record.roleIds ?? [])
            .map((roleId) => String(roleId))
            .filter((roleId, index, array): roleId is string => Boolean(roleId) && array.indexOf(roleId) === index)
            .map((roleId) => ({ roleId, roleName: rolesMap[roleId] }))
            .filter((item): item is { roleId: string; roleName: string } => Boolean(item.roleName));
          if (roleTags.length) {
            return (
              <Space size={[4, 4]} wrap>
                {roleTags.map((role) => (
                  <Tag key={`${record.id}-${role.roleId}`}>{role.roleName}</Tag>
                ))}
              </Space>
            );
          }
          if (record.title) {
            return <Tag>{record.title}</Tag>;
          }
          return <Tag color="default">未设置</Tag>;
        },
      },
      {
        title: '操作',
        key: 'action',
        align: 'right',
        render: (_, record) => (
          <Space size={8}>
            <Button type="link" onClick={() => handleEdit(record)}>
              编辑
            </Button>
            <Button type="link" danger icon={<DeleteOutlined />} onClick={() => handleRemove(record)}>
              删除
            </Button>
          </Space>
        ),
      },
    ],
    [handleEdit, handleRemove, rolesMap],
  );

  const roleOptions = useMemo(
    () => roleList.map((role) => ({ label: role.name, value: String(role.id) })),
    [roleList],
  );

  return (
    <Card title="组织架构">
      <Space direction="vertical" style={{ width: '100%' }} size={16}>
        <Space wrap>
          <Input
            placeholder="姓名/手机号码"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            allowClear
            style={{ width: 240 }}
          />
          <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
            搜索
          </Button>
          <Button onClick={handleReset}>重置</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalOpen(true)}>
            添加
          </Button>
        </Space>

        <Table<OrgMember>
          loading={loading}
          dataSource={members}
          columns={columns}
          rowKey={(record) => record.id}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 人`,
            onChange: handlePaginationChange,
            onShowSizeChange: handlePaginationChange,
          }}
        />
      </Space>

      <Modal
        title="添加成员"
        open={createModalOpen}
        onCancel={() => setCreateModalOpen(false)}
        onOk={submitCreate}
        destroyOnClose
      >
        <Form form={createForm} layout="vertical" initialValues={{ password: '123456' }}>
          <Form.Item
            label="姓名"
            name="name"
            rules={[{ required: true, message: '请输入姓名' }]}
          >
            <Input placeholder="请输入成员姓名" />
          </Form.Item>
          <Form.Item
            label="登录账号"
            name="username"
            rules={[{ required: true, message: '请输入登录账号' }]}
          >
            <Input placeholder="请输入账号，如员工编号" maxLength={64} />
          </Form.Item>
          <Form.Item
            label="手机号码"
            name="phone"
            rules={[
              { required: true, message: '请输入手机号码' },
              { pattern: /^1\d{10}$/, message: '请输入11位有效手机号' },
            ]}
          >
            <Input placeholder="请输入手机号码" maxLength={11} />
          </Form.Item>
          <Form.Item
            label="邮箱"
            name="email"
            rules={[
              { required: true, message: '请输入邮箱地址' },
              { type: 'email', message: '请输入有效邮箱' },
            ]}
          >
            <Input placeholder="请输入邮箱，如 user@example.com" />
          </Form.Item>
          <Form.Item
            label="岗位"
            name="roleIds"
            rules={[{ required: true, message: '请选择岗位' }]}
          >
            <Select
              mode="multiple"
              placeholder="请选择岗位"
              options={roleOptions}
              optionFilterProp="label"
              maxTagCount="responsive"
            />
          </Form.Item>
          <Form.Item
            label="初始密码"
            name="password"
            rules={[
              { required: true, message: '请输入初始密码' },
              { min: 6, message: '密码至少6位' },
            ]}
          >
            <Input.Password placeholder="请输入至少6位密码" autoComplete="new-password" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={editingMember ? `编辑成员：${editingMember.name}` : '编辑成员'}
        open={editModalOpen}
        onCancel={closeEditModal}
        onOk={submitEdit}
        confirmLoading={editSubmitting}
        destroyOnClose
      >
        <Form form={editForm} layout="vertical">
          <Form.Item label="姓名" name="name" rules={[{ required: true, message: '请输入姓名' }]}>
            <Input placeholder="请输入姓名" />
          </Form.Item>
          <Form.Item
            label="手机号码"
            name="phone"
            rules={[
              { required: true, message: '请输入手机号码' },
              { pattern: /^1\d{10}$/, message: '请输入11位有效手机号' },
            ]}
          >
            <Input placeholder="请输入手机号码" maxLength={11} />
          </Form.Item>
          <Form.Item
            label="邮箱"
            name="email"
            rules={[
              { required: true, message: '请输入邮箱地址' },
              { type: 'email', message: '请输入有效邮箱' },
            ]}
          >
            <Input placeholder="请输入邮箱，如 user@example.com" />
          </Form.Item>
          <Form.Item
            label="岗位"
            name="roleIds"
            rules={[{ required: true, message: '请选择岗位' }]}
          >
            <Select
              mode="multiple"
              placeholder="请选择岗位"
              options={roleOptions}
              optionFilterProp="label"
              maxTagCount="responsive"
            />
          </Form.Item>
          <Form.Item label="状态" name="status" rules={[{ required: true, message: '请选择状态' }]}>
            <Select options={userStatusOptions} placeholder="请选择账号状态" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default OrganizationSettings;
