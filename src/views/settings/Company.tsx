import { useMemo, useState } from 'react';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  Col,
  Input,
  Row,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import { LockOutlined, SwapOutlined, WechatOutlined } from '@ant-design/icons';
import settingsApi from '../../api/settings';
import type { CompanyBilling, CompanyModule, CompanyModuleStatus, TenantSummary } from '../../types/settings';
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

const buildBillingAlert = (billing: CompanyBilling) => {
  if (billing.status === 'active') {
    return {
      type: 'success' as const,
      message: '当前企业已完成正式授权',
      description: billing.activatedAt
        ? `正式版生效时间：${dayjs(billing.activatedAt).format('YYYY-MM-DD HH:mm')}`
        : '当前账号可正常使用系统全部功能。',
    };
  }

  if (billing.status === 'expired') {
    return {
      type: 'error' as const,
      message: '7 天试用已到期',
      description: '核心业务写操作已限制，请线下付款后输入授权码完成转正式。',
    };
  }

  return {
    type: 'info' as const,
    message: `试用中，还剩 ${billing.trialDaysRemaining} 天`,
    description: billing.trialEndsAt
      ? `试用截止时间：${dayjs(billing.trialEndsAt).format('YYYY-MM-DD HH:mm')}。建议提前联系管理员获取授权码。`
      : '当前企业处于试用期。',
  };
};

const CompanySettings = () => {
  const { overview, refresh } = useTenant();
  const [authorizationCode, setAuthorizationCode] = useState('');
  const [verifying, setVerifying] = useState(false);

  const billingAlert = useMemo(() => buildBillingAlert(overview.billing), [overview.billing]);

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

  const handleVerifyAuthorizationCode = async () => {
    const normalizedCode = authorizationCode.trim();
    if (!normalizedCode) {
      message.warning('请输入授权码');
      return;
    }
    setVerifying(true);
    try {
      const result = await settingsApi.company.verifyAuthorizationCode(normalizedCode);
      message.success(result.message || '授权成功');
      setAuthorizationCode('');
      await refresh();
    } catch (error) {
      console.error(error);
      message.error('授权码验证失败，请检查后重试');
    } finally {
      setVerifying(false);
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
      <Alert
        showIcon
        type={billingAlert.type}
        message={billingAlert.message}
        description={billingAlert.description}
      />

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

      <Card
        title="试用与转正式"
        extra={
          overview.billing.status === 'active' ? (
            <Tag color="success">正式版</Tag>
          ) : overview.billing.status === 'expired' ? (
            <Tag color="error">待授权</Tag>
          ) : (
            <Tag color="processing">试用中</Tag>
          )
        }
      >
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Row gutter={[16, 16]}>
            <Col xs={24} md={8}>
              <Card variant="borderless" style={{ background: '#fff7e6' }}>
                <Statistic title="试用剩余" value={overview.billing.trialDaysRemaining} suffix="天" />
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card variant="borderless" style={{ background: '#f6ffed' }}>
                <Statistic
                  title="当前状态"
                  value={
                    overview.billing.status === 'active'
                      ? '正式版'
                      : overview.billing.status === 'expired'
                        ? '已到期'
                        : '试用中'
                  }
                />
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card variant="borderless" style={{ background: '#e6f4ff' }}>
                <Statistic title="当前套餐" value={overview.billing.plan || '--'} />
              </Card>
            </Col>
          </Row>

          <Card
            size="small"
            title="线下付款与授权"
            styles={{ body: { background: '#fafafa' } }}
          >
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              <Space align="center" size={8}>
                <WechatOutlined style={{ color: '#07c160' }} />
                <Text>付款后请联系管理员获取授权码</Text>
              </Space>
              <Text copyable={overview.billing.upgradeContactWechat ? { text: overview.billing.upgradeContactWechat } : false}>
                微信：{overview.billing.upgradeContactWechat || '暂未配置，请联系管理员'}
              </Text>
              <Text type="secondary">
                同一授权码首次验证后会绑定到当前企业，后续只能由该企业重复使用，不能跨企业白嫖。
              </Text>
              <Space.Compact style={{ width: '100%' }}>
                <Input
                  value={authorizationCode}
                  onChange={(event) => setAuthorizationCode(event.target.value.toUpperCase())}
                  prefix={<LockOutlined />}
                  placeholder="请输入线下付款后收到的授权码"
                  maxLength={64}
                  onPressEnter={() => void handleVerifyAuthorizationCode()}
                />
                <Button
                  type="primary"
                  loading={verifying}
                  onClick={() => void handleVerifyAuthorizationCode()}
                >
                  验证并转正式
                </Button>
              </Space.Compact>
            </Space>
          </Card>
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
