import { useEffect, useState } from 'react';
import type { ColumnsType } from 'antd/es/table';
import {
  Alert,
  Button,
  Card,
  Form,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Typography,
  message,
} from 'antd';
import { CopyOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import settingsApi from '../../api/settings';
import type { CreateCredentialPayload, CredentialItem, UserAccount } from '../../types/settings';

const { Text } = Typography;

const CredentialsPage = () => {
  const [credentials, setCredentials] = useState<CredentialItem[]>([]);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm<CreateCredentialPayload>();

  const loadCredentials = () => {
    setLoading(true);
    settingsApi.credentials
      .list()
      .then(setCredentials)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadCredentials();
    settingsApi.users.list({ pageSize: 100 }).then((res) => setUsers(res.list));
  }, []);

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      await settingsApi.credentials.create(values);
      message.success('密钥生成成功');
      setModalOpen(false);
      form.resetFields();
      loadCredentials();
    } catch (error) {
      if (error) {
        console.error(error);
      }
    }
  };

  const handleDelete = async (id: string) => {
    const success = await settingsApi.credentials.remove(id);
    if (success) {
      message.success('密钥已删除');
      loadCredentials();
    } else {
      message.error('删除失败');
    }
  };

  const columns: ColumnsType<CredentialItem> = [
    { title: '关联用户', dataIndex: 'userName' },
    { title: 'SecretId', dataIndex: 'secretId' },
    {
      title: 'SecretKey',
      dataIndex: 'secretKey',
      render: (value: string) => (
        <Text copyable={{ text: value, icon: <CopyOutlined /> }}>
          {value}
        </Text>
      ),
    },
    { title: '创建时间', dataIndex: 'createdAt' },
    {
      title: '操作',
      key: 'action',
      align: 'right',
      render: (_, record) => (
        <Popconfirm title="确认删除该密钥吗？" onConfirm={() => handleDelete(record.id)} okText="删除" okButtonProps={{ danger: true }}>
          <Button type="link" danger icon={<DeleteOutlined />}>删除</Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <Card title="密钥管理">
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Alert
          type="warning"
          showIcon
          message="安全提示：API密钥代表对应用户的身份和权限，请勿上传或分享密钥信息。"
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
          添加
        </Button>
        <Table<CredentialItem>
          rowKey={(record) => record.id}
          loading={loading}
          dataSource={credentials}
          columns={columns}
          pagination={false}
        />
      </Space>

      <Modal
        title="创建密钥"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleCreate}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="关联用户"
            name="userId"
            rules={[{ required: true, message: '请选择关联用户' }]}
          >
            <Select placeholder="请选择用户">
              {users.map((user) => (
                <Select.Option key={user.id} value={user.id}>
                  {user.name}（{user.username}）
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item label="有效期 (天)" name="expiresIn">
            <Select placeholder="请选择有效期">
              <Select.Option value={30}>30</Select.Option>
              <Select.Option value={90}>90</Select.Option>
              <Select.Option value={180}>180</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default CredentialsPage;
