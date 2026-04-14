import { Button, Card, Space, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';

type OnboardingStatusErrorProps = {
  description?: string;
};

const OnboardingStatusError = ({ description }: OnboardingStatusErrorProps) => {
  const navigate = useNavigate();

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: 24,
        background:
          'radial-gradient(1000px 420px at 10% -10%, rgba(250,173,20,0.16), transparent 60%), radial-gradient(900px 420px at 100% 0%, rgba(255,120,117,0.14), transparent 55%), #fff7e6',
      }}
    >
      <Card style={{ width: 680, maxWidth: '100%', borderRadius: 16 }} styles={{ body: { padding: 28 } }}>
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Typography.Title level={3} style={{ margin: 0 }}>
            系统连接异常
          </Typography.Title>
          <Typography.Paragraph style={{ margin: 0 }}>
            当前无法获取企业绑定状态，暂时不能进入系统页面。请确认后端服务已启动，再刷新页面重试。
          </Typography.Paragraph>
          <div
            style={{
              borderRadius: 12,
              padding: '14px 16px',
              background: 'rgba(255,255,255,0.82)',
              border: '1px solid rgba(250,173,20,0.28)',
            }}
          >
            <Typography.Text style={{ whiteSpace: 'pre-wrap' }}>
              {description?.trim() || '状态检查接口调用失败，请稍后重试。'}
            </Typography.Text>
          </div>
          <Space size={12}>
            <Button type="primary" size="large" onClick={() => window.location.reload()}>
              刷新重试
            </Button>
            <Button size="large" onClick={() => navigate('/welcome', { replace: true })}>
              返回欢迎页
            </Button>
          </Space>
        </Space>
      </Card>
    </div>
  );
};

export default OnboardingStatusError;
