import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import {
  Button,
  Card,
  Form,
  Input,
  Modal,
  Space,
  Table,
  Tag,
  message,
} from 'antd';
import { DeleteOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons';
import settingsApi from '../../api/settings';
import { apiConfig } from '../../api/config';
import type { CreateOrgMemberPayload, OrgMember } from '../../types/settings';

const OrganizationSettings = () => {
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [activeKeyword, setActiveKeyword] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const latestPageSizeRef = useRef(pagination.pageSize);
  const [rolesMap, setRolesMap] = useState<Record<string, string>>({});
  const allowOrgRemoval = apiConfig.useMock;
  const [createForm] = Form.useForm<CreateOrgMemberPayload>();

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
    settingsApi.roles.list().then((roleList) => {
      const nextMap: Record<string, string> = {};
      roleList.forEach((role) => {
        nextMap[role.id] = role.name;
      });
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

  const handleTableChange = (paginationConfig: TablePaginationConfig) => {
    const nextPage = paginationConfig.current ?? pagination.current;
    const nextPageSize = paginationConfig.pageSize ?? pagination.pageSize;
    fetchMembers(nextPage, nextPageSize);
  };

  const handleRemove = useCallback(
    (member: OrgMember) => {
      if (!allowOrgRemoval) {
        message.warning('请前往「用户管理」页面调整成员');
        return;
      }
      Modal.confirm({
        title: '确认删除',
        content: `确定要删除「${member.name}」吗？`,
        okText: '删除',
        okButtonProps: { danger: true },
        onOk: async () => {
          const success = await settingsApi.organization.remove(member.id);
          if (success) {
            message.success('成员已删除');
            fetchMembers(pagination.current, pagination.pageSize);
          } else {
            message.error('删除失败');
          }
        },
      });
    },
    [allowOrgRemoval, fetchMembers, pagination],
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
          const resolvedTitle =
            record.title || record.roleIds?.map((roleId) => rolesMap[roleId]).find(Boolean);
          return resolvedTitle ? <Tag>{resolvedTitle}</Tag> : <Tag color="default">未设置</Tag>;
        },
      },
      {
        title: '操作',
        key: 'action',
        align: 'right',
        render: (_, record) => (
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleRemove(record)}
            disabled={!allowOrgRemoval}
          >
            删除
          </Button>
        ),
      },
    ],
    [allowOrgRemoval, handleRemove, rolesMap],
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
          }}
          onChange={handleTableChange}
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
    </Card>
  );
};

export default OrganizationSettings;
