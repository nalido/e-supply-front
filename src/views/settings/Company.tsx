import { useEffect, useState } from 'react';
import type { ColumnsType } from 'antd/es/table';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Form,
  Input,
  Modal,
  Row,
  Col,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import { EditOutlined, PlusOutlined, SendOutlined, SwapOutlined } from '@ant-design/icons';
import settingsApi from '../../api/settings';
import type {
  CompanyModule,
  CompanyModuleStatus,
  CompanyOverview,
  InviteMemberPayload,
  RoleItem,
  TenantSummary,
  TransferTenantPayload,
  UserAccount,
} from '../../types/settings';

const { Text } = Typography;

const moduleStatusMap: Record<CompanyModuleStatus, { text: string; color: string }> = {
  active: { text: '已开通', color: 'success' },
  trial: { text: '试用中', color: 'processing' },
  expired: { text: '已过期', color: 'error' },
  pending: { text: '待激活', color: 'warning' },
  requested: { text: '已申请', color: 'gold' },
  unsubscribed: { text: '未购买', color: 'default' },
};

const renderModuleCard = (module: CompanyModule) => {
  const status = moduleStatusMap[module.status];
  return (
    <Card key={module.id} bordered hoverable>
      <Space direction="vertical" size={8} style={{ width: '100%' }}>
        <Space align="center">
          <Text strong>{module.name}</Text>
          <Tag color={status.color}>{status.text}</Tag>
        </Space>
        {module.expireAt && (
          <Text type="secondary" style={{ fontSize: 12 }}>
            到期时间：{module.expireAt}
          </Text>
        )}
        {module.description && (
          <Text type="secondary" style={{ fontSize: 12 }}>
            {module.description}
          </Text>
        )}
      </Space>
    </Card>
  );
};

const CompanySettings = () => {
  const [overview, setOverview] = useState<CompanyOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [inviteForm] = Form.useForm<InviteMemberPayload>();
  const [transferForm] = Form.useForm<TransferTenantPayload>();
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [userOptions, setUserOptions] = useState<UserAccount[]>([]);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [transferLoading, setTransferLoading] = useState(false);

  useEffect(() => {
    settingsApi.company
      .getOverview()
      .then(setOverview)
      .finally(() => setLoading(false));
    settingsApi.roles.list().then(setRoles);
    settingsApi.users.list({ pageSize: 50 }).then((res) => setUserOptions(res.list));
  }, []);

  const handleInvite = async () => {
    try {
      const values = await inviteForm.validateFields();
      setInviteLoading(true);
      await settingsApi.company.invite(values);
      setInviteModalOpen(false);
      message.success('邀请已发送');
      inviteForm.resetFields();
    } catch (error) {
      if (error) {
        console.error(error);
      }
    } finally {
      setInviteLoading(false);
    }
  };

  const handleTransfer = async () => {
    try {
      const values = await transferForm.validateFields();
      setTransferLoading(true);
      await settingsApi.company.transfer(values);
      message.success('已提交企业转让申请');
      setTransferModalOpen(false);
      transferForm.resetFields();
    } catch (error) {
      if (error) {
        console.error(error);
      }
    } finally {
      setTransferLoading(false);
    }
  };

  const handleSwitchTenant = async (tenant: TenantSummary) => {
    try {
      const data = await settingsApi.company.switchTenant(tenant.id);
      setOverview(data);
      message.success(`已切换至 ${tenant.name}`);
    } catch (error) {
      console.error(error);
      message.error('切换失败');
    }
  };

  const tenantColumns: ColumnsType<TenantSummary> = [
    {
      title: '企业',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record) => (
        <Space>
          <Avatar style={{ backgroundColor: '#1677ff' }}>{name.charAt(0)}</Avatar>
          <div>
            <Text>{name}</Text>
            {record.isCurrent && (
              <Badge status="processing" text="当前企业" style={{ marginLeft: 8 }} />
            )}
          </div>
        </Space>
      ),
    },
    {
      title: '操作',
      key: 'action',
      align: 'right',
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<SwapOutlined />}
            disabled={record.isCurrent}
            onClick={() => handleSwitchTenant(record)}
          >
            切换
          </Button>
        </Space>
      ),
    },
  ];

  if (!overview) {
    return <Card loading={loading} />;
  }

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card
        title="当前企业"
        extra={
          <Space>
            <Button icon={<PlusOutlined />} type="primary" onClick={() => setInviteModalOpen(true)}>
              邀请员工加入企业
            </Button>
            <Button icon={<EditOutlined />} onClick={() => setTransferModalOpen(true)}>
              转让企业
            </Button>
          </Space>
        }
      >
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Text strong style={{ fontSize: 16 }}>
            {overview.name}
          </Text>
          <Row gutter={16}>
            <Col span={6}>
              <Card bordered={false} style={{ background: '#f6ffed' }}>
                <Statistic title="用户数" value={`${overview.stats.users.used}/${overview.stats.users.total} ${overview.stats.users.unit}`} />
              </Card>
            </Col>
            <Col span={6}>
              <Card bordered={false} style={{ background: '#e6f4ff' }}>
                <Statistic title="存储空间" value={`${overview.stats.storage.used}/${overview.stats.storage.total} ${overview.stats.storage.unit}`} />
              </Card>
            </Col>
          </Row>
        </Space>
      </Card>

      <Card title="功能模块" bordered={false} loading={loading}>
        <Row gutter={[16, 16]}>
          {overview.modules.map((item) => {
            const card = renderModuleCard(item);
            return (
              <Col key={item.id} xs={24} sm={12} md={8} lg={6}>
                {item.highlight ? <Badge.Ribbon text="推荐" color="red">{card}</Badge.Ribbon> : card}
              </Col>
            );
          })}
        </Row>
      </Card>

      <Card title="我可以访问的企业" bordered={false}>
        <Table<TenantSummary>
          columns={tenantColumns}
          dataSource={overview.tenants}
          rowKey={(record) => record.id}
          pagination={false}
        />
      </Card>

      <Modal
        title="邀请员工加入"
        open={inviteModalOpen}
        onCancel={() => setInviteModalOpen(false)}
        onOk={handleInvite}
        confirmLoading={inviteLoading}
        destroyOnClose
      >
        <Form form={inviteForm} layout="vertical">
          <Form.Item
            label="手机号"
            name="phone"
            rules={[
              { required: true, message: '请输入员工手机号' },
              { pattern: /^1\d{10}$/, message: '请输入11位手机号' },
            ]}
          >
            <Input placeholder="用于发送邀请短信" maxLength={11} />
          </Form.Item>
          <Form.Item
            label="岗位"
            name="roleId"
            rules={[{ required: true, message: '请选择岗位' }]}
          >
            <Select placeholder="请选择岗位">
              {roles.map((role) => (
                <Select.Option key={role.id} value={role.id}>
                  {role.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item label="备注" name="remark">
            <Input.TextArea placeholder="可注明邀请说明" rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="转让企业"
        open={transferModalOpen}
        onCancel={() => setTransferModalOpen(false)}
        onOk={handleTransfer}
        confirmLoading={transferLoading}
        destroyOnClose
      >
        <Form form={transferForm} layout="vertical">
          <Form.Item
            label="接收人"
            name="targetUserId"
            rules={[{ required: true, message: '请选择接收人' }]}
          >
            <Select placeholder="请选择接收人">
              {userOptions.map((user) => (
                <Select.Option key={user.id} value={user.id}>
                  <Space>
                    <Avatar size="small" src={user.avatar}>
                      {user.name.charAt(0)}
                    </Avatar>
                    <Text>{user.name}</Text>
                    <Tooltip title={user.phone}>
                      <Text type="secondary">{user.phone}</Text>
                    </Tooltip>
                  </Space>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            label="验证码"
            name="verificationCode"
            rules={[{ required: true, message: '请输入短信验证码' }]}
          >
            <Input placeholder="请输入短信验证码" suffix={<SendOutlined />} />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
};

export default CompanySettings;
