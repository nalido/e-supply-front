import { Button, Card, Space, Typography } from 'antd';
import { useAuth } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

const Welcome = () => {
  const navigate = useNavigate();
  const { isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      navigate('/dashboard/workplace', { replace: true });
    }
  }, [isLoaded, isSignedIn, navigate]);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: 24,
        background:
          'radial-gradient(1200px 500px at 10% -10%, rgba(24,144,255,0.14), transparent 60%), radial-gradient(900px 400px at 100% 0%, rgba(82,196,26,0.12), transparent 55%), #f5f7fa',
      }}
    >
      <Card
        style={{ width: 760, maxWidth: '100%', borderRadius: 16 }}
        styles={{ body: { padding: 28 } }}
      >
        <Space direction="vertical" size={18} style={{ width: '100%' }}>
          <Typography.Text style={{ color: '#1677ff', fontWeight: 600 }}>eSupply 智能供应协同平台</Typography.Text>
          <Typography.Title level={2} style={{ margin: 0 }}>
            欢迎使用 eSupply
          </Typography.Title>
          <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
            一个面向服装供应链的协同管理系统。支持订单、工序、物料、成品、结算与报表。
          </Typography.Paragraph>

          <div
            style={{
              marginTop: 4,
              padding: '14px 16px',
              borderRadius: 12,
              background: 'linear-gradient(90deg, rgba(22,119,255,0.08), rgba(82,196,26,0.08))',
              border: '1px solid rgba(22,119,255,0.16)',
            }}
          >
            <Typography.Text style={{ fontSize: 13 }}>
              新用户请先注册企业并创建管理员账号；已有账号可直接登录。
            </Typography.Text>
          </div>

          <Space size={12} style={{ marginTop: 6 }}>
            <Button
              type="primary"
              size="large"
              onClick={() => {
                if (isSignedIn) {
                  navigate('/dashboard/workplace');
                  return;
                }
                navigate('/sign-in');
              }}
            >
              登录系统
            </Button>
            <Button size="large" onClick={() => navigate('/onboarding/register-enterprise')}>
              新用户注册
            </Button>
          </Space>
        </Space>
      </Card>
    </div>
  );
};

export default Welcome;
