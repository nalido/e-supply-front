import type { ColumnsType } from 'antd/es/table';
import { Avatar, Badge, Button, Card, Col, Row, Space, Statistic, Table, Tag, Typography, message } from 'antd';
import { SwapOutlined } from '@ant-design/icons';
import settingsApi from '../../api/settings';
import type { CompanyModule, CompanyModuleStatus, TenantSummary } from '../../types/settings';
import { useTenant } from '../../contexts/tenant';

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
    <Card key={module.id} variant="outlined" hoverable>
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
  const { overview, refresh } = useTenant();

  const handleSwitchTenant = async (tenant: TenantSummary) => {
    try {
      await settingsApi.company.switchTenant(tenant.id);
      await refresh();
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

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card title="当前企业">
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Text strong style={{ fontSize: 16 }}>
            {overview.name}
          </Text>
          <Row gutter={16}>
            <Col span={6}>
              <Card variant="borderless" style={{ background: '#f6ffed' }}>
                <Statistic title="用户数" value={`${overview.stats.users.used}/${overview.stats.users.total} ${overview.stats.users.unit}`} />
              </Card>
            </Col>
            <Col span={6}>
              <Card variant="borderless" style={{ background: '#e6f4ff' }}>
                <Statistic title="存储空间" value={`${overview.stats.storage.used}/${overview.stats.storage.total} ${overview.stats.storage.unit}`} />
              </Card>
            </Col>
          </Row>
        </Space>
      </Card>

      <Card title="功能模块" variant="borderless">
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

      <Card title="我可以访问的企业" variant="borderless">
        <Table<TenantSummary>
          columns={tenantColumns}
          dataSource={overview.tenants}
          rowKey={(record) => record.id}
          pagination={false}
        />
      </Card>
    </Space>
  );
};

export default CompanySettings;
