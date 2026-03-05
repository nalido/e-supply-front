import { useEffect, useState } from 'react';
import { Alert, Button, Card, Form, Input, Space, Typography } from 'antd';
import { useAuth } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import { onboardingApi, type RegisterEnterprisePayload } from '../../api/onboarding';
import { buildFriendlyError } from '../../utils/friendly-error';

const RegisterEnterprise = () => {
  const [form] = Form.useForm<RegisterEnterprisePayload>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { getToken, isLoaded, isSignedIn } = useAuth();

  const onboardingMode: RegisterEnterprisePayload['mode'] = 'CREATE_CLERK';

  useEffect(() => {
    const run = async () => {
      if (!isLoaded || !isSignedIn) {
        return;
      }
      try {
        const status = await onboardingApi.status();
        if (status.linked) {
          navigate('/dashboard/workplace', { replace: true });
        }
      } catch {
        // ignore and stay on onboarding page
      }
    };
    void run();
  }, [isLoaded, isSignedIn, navigate]);

  const submit = async () => {
    setError(null);
    const values = {
      ...(await form.validateFields()),
      mode: onboardingMode,
    } as RegisterEnterprisePayload;
    setLoading(true);
    try {
      await getToken();
      await onboardingApi.registerEnterprise(values);
      navigate('/dashboard/workplace', { replace: true });
      window.location.reload();
    } catch (err) {
      const status =
        typeof err === 'object' && err !== null && 'response' in err
          ? Number((err as { response?: { status?: number } }).response?.status)
          : undefined;
      const backendMessage =
        typeof err === 'object' && err !== null && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      setError(buildFriendlyError(backendMessage, Number.isNaN(status) ? undefined : status).description ?? '创建企业失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#f5f7fa', padding: 24 }}>
      <Card style={{ width: 620, maxWidth: '100%' }}>
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Typography.Title level={3} style={{ margin: 0 }}>企业注册</Typography.Title>
          <Typography.Text type="secondary">当前账号尚未绑定企业，请先完成企业初始化。</Typography.Text>
          {error ? <Alert type="error" message={error} showIcon /> : null}
          <Form form={form} layout="vertical">
            <Form.Item name="tenantName" label="企业名称" rules={[{ required: true, message: '请输入企业名称' }]}>
              <Input maxLength={128} />
            </Form.Item>
            <Typography.Text type="secondary">将创建新的 Clerk 管理员账号。</Typography.Text>
            <Form.Item name="adminUsername" label="管理员用户名" rules={[{ required: true, message: '请输入用户名' }]}>
              <Input maxLength={64} />
            </Form.Item>
            <Form.Item name="adminDisplayName" label="管理员姓名" rules={[{ required: true, message: '请输入姓名' }]}>
              <Input maxLength={128} />
            </Form.Item>
            <Form.Item name="adminEmail" label="管理员邮箱" rules={[{ required: true, type: 'email', message: '请输入有效邮箱' }]}>
              <Input maxLength={128} />
            </Form.Item>
            <Form.Item name="adminPhone" label="管理员手机号">
              <Input maxLength={32} />
            </Form.Item>
            <Form.Item name="clerkPassword" label="Clerk 初始密码" rules={[{ required: true, min: 8, message: '至少 8 位' }]}>
              <Input.Password maxLength={64} />
            </Form.Item>
            <Button type="primary" onClick={() => void submit()} loading={loading}>完成注册并进入系统</Button>
          </Form>
        </Space>
      </Card>
    </div>
  );
};

export default RegisterEnterprise;
