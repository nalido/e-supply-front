import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ColumnsType } from 'antd/es/table';
import {
  Button,
  Card,
  Form,
  Input,
  Modal,
  Space,
  Switch,
  Table,
  Tag,
  message,
} from 'antd';
import { DeleteOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons';
import settingsApi from '../../api/settings';
import type { CreateOrgMemberPayload, OrgMember, OrgMemberQuery } from '../../types/settings';

const OrganizationSettings = () => {
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [includeChildren, setIncludeChildren] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createForm] = Form.useForm<CreateOrgMemberPayload>();

  const fetchMembers = useCallback((query: OrgMemberQuery = {}) => {
    setLoading(true);
    settingsApi.organization
      .list(query)
      .then(setMembers)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleSearch = () => {
    fetchMembers({ keyword, includeChildren });
  };

  const handleReset = () => {
    setKeyword('');
    setIncludeChildren(false);
    fetchMembers();
  };

  const handleRemove = useCallback(
    (member: OrgMember) => {
      Modal.confirm({
        title: '确认删除',
        content: `确定要删除「${member.name}」吗？`,
        okText: '删除',
        okButtonProps: { danger: true },
        onOk: async () => {
          const success = await settingsApi.organization.remove(member.id);
          if (success) {
            message.success('成员已删除');
            fetchMembers({ keyword, includeChildren });
          } else {
            message.error('删除失败');
          }
        },
      });
    },
    [fetchMembers, includeChildren, keyword],
  );

  const submitCreate = async () => {
    try {
      const values = await createForm.validateFields();
      await settingsApi.organization.create(values);
      message.success('成员已添加');
      setCreateModalOpen(false);
      createForm.resetFields();
      fetchMembers({ keyword, includeChildren });
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
        title: '所属部门',
        dataIndex: 'department',
      },
      {
        title: '岗位',
        dataIndex: 'title',
        render: (value?: string) => (value ? <Tag>{value}</Tag> : <Tag color="default">未设置</Tag>),
      },
      {
        title: '操作',
        key: 'action',
        align: 'right',
        render: (_, record) => (
          <Button type="link" danger icon={<DeleteOutlined />} onClick={() => handleRemove(record)}>
            删除
          </Button>
        ),
      },
    ],
    [handleRemove],
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
          <Space>
            <Switch checked={includeChildren} onChange={setIncludeChildren} />
            <span>包含下级成员</span>
          </Space>
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
          pagination={{ pageSize: 8 }}
        />
      </Space>

      <Modal
        title="添加成员"
        open={createModalOpen}
        onCancel={() => setCreateModalOpen(false)}
        onOk={submitCreate}
        destroyOnClose
      >
        <Form form={createForm} layout="vertical">
          <Form.Item
            label="姓名"
            name="name"
            rules={[{ required: true, message: '请输入姓名' }]}
          >
            <Input placeholder="请输入成员姓名" />
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
            label="所属部门"
            name="department"
            rules={[{ required: true, message: '请输入所属部门' }]}
          >
            <Input placeholder="如：生产部" />
          </Form.Item>
          <Form.Item label="岗位" name="title">
            <Input placeholder="如：经理" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default OrganizationSettings;
