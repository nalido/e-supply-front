import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Card, Descriptions, Form, Input, Popconfirm, Select, Space, Typography, message } from 'antd';
import { saleApi } from '../../api/sale';
import type { SaleChannelAccount, SaleChannelCredential } from '../../types/sale';
import { publishSaleContextChanged, resolveSaleAccountSelection } from '../../utils/sale-menu-context';

const SaleChannelCredentials = () => {
  const [accounts, setAccounts] = useState<SaleChannelAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>();
  const [detailLoading, setDetailLoading] = useState(false);
  const [credential, setCredential] = useState<SaleChannelCredential | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  const accountOptions = useMemo(
    () => accounts.map((item) => ({ label: `${item.accountName} (${item.id})`, value: item.id })),
    [accounts],
  );

  const loadAccounts = useCallback(async () => {
    try {
      const list = await saleApi.listChannelAccounts();
      setAccounts(list);
      const preferred = resolveSaleAccountSelection(list, selectedAccountId);
      if (preferred?.id !== selectedAccountId) {
        setSelectedAccountId(preferred?.id);
      }
      if (preferred) {
        publishSaleContextChanged({
          accountId: preferred.id,
          sellerType: preferred.sellerType,
        });
      } else {
        publishSaleContextChanged({});
      }
    } catch (error) {
      console.error(error);
      message.error('加载渠道账号失败');
    }
  }, [selectedAccountId]);

  const loadDetail = useCallback(async (accountId: string) => {
    setDetailLoading(true);
    try {
      const detail = await saleApi.getChannelCredentialDetail(accountId);
      setCredential(detail);
    } catch (error) {
      console.error(error);
      message.error('加载凭证详情失败');
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAccounts();
  }, [loadAccounts]);

  useEffect(() => {
    if (!selectedAccountId) {
      return;
    }
    void loadDetail(selectedAccountId);
  }, [selectedAccountId, loadDetail]);

  const handleSave = async () => {
    if (!selectedAccountId) {
      message.warning('请先选择渠道账号');
      return;
    }
    const values = await form.validateFields();
    setSubmitting(true);
    try {
      await saleApi.updateChannelCredential(selectedAccountId, values);
      message.success('凭证保存成功');
      form.resetFields();
      await loadDetail(selectedAccountId);
    } catch (error) {
      console.error(error);
      message.error('凭证保存失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckToken = async () => {
    if (!selectedAccountId) {
      message.warning('请先选择渠道账号');
      return;
    }
    setSubmitting(true);
    try {
      const result = await saleApi.checkToken(selectedAccountId);
      if (result.passed) {
        message.success(`Token 检测通过: ${result.requestId ?? '-'}`);
      } else {
        message.error(`Token 检测失败: ${result.message ?? result.errorCode ?? '-'}`);
      }
      await loadDetail(selectedAccountId);
    } catch (error) {
      console.error(error);
      message.error('Token 检测失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleProbe = async () => {
    if (!selectedAccountId) {
      message.warning('请先选择渠道账号');
      return;
    }
    setSubmitting(true);
    try {
      await saleApi.probeCapabilities(selectedAccountId);
      message.success('能力探测已执行，请到同步日志页查看结果');
      await loadDetail(selectedAccountId);
    } catch (error) {
      console.error(error);
      message.error('能力探测失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card>
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Typography.Title level={4} style={{ margin: 0 }}>
            渠道凭证
          </Typography.Title>
          <Space>
            <Select
              style={{ width: 320 }}
              placeholder="选择渠道账号"
              options={accountOptions}
              value={selectedAccountId}
              onChange={setSelectedAccountId}
              showSearch
              optionFilterProp="label"
            />
            <Button onClick={() => selectedAccountId && void loadDetail(selectedAccountId)}>刷新</Button>
          </Space>
        </Space>
      </Card>

      <Card loading={detailLoading}>
        <Descriptions column={2} size="small" bordered>
          <Descriptions.Item label="账号ID">{credential?.accountId ?? '--'}</Descriptions.Item>
          <Descriptions.Item label="状态">{credential?.status ?? '--'}</Descriptions.Item>
          <Descriptions.Item label="appKey">{credential?.appKeyMasked ?? '--'}</Descriptions.Item>
          <Descriptions.Item label="appSecret">{credential?.appSecretMasked ?? '--'}</Descriptions.Item>
          <Descriptions.Item label="accessToken">{credential?.accessTokenMasked ?? '--'}</Descriptions.Item>
          <Descriptions.Item label="refreshToken">{credential?.refreshTokenMasked ?? '--'}</Descriptions.Item>
          <Descriptions.Item label="过期时间">{credential?.accessTokenExpiresAt ?? '--'}</Descriptions.Item>
          <Descriptions.Item label="最近校验时间">{credential?.lastValidatedAt ?? '--'}</Descriptions.Item>
          <Descriptions.Item label="extraPayload" span={2}>
            <Typography.Text code>{credential?.credentialPayloadJson ?? '--'}</Typography.Text>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card>
        <Form form={form} layout="vertical">
          <Form.Item label="appKey" name="appKey" rules={[{ required: true, message: '请输入 appKey' }]}>
            <Input />
          </Form.Item>
          <Form.Item label="appSecret" name="appSecret" rules={[{ required: true, message: '请输入 appSecret' }]}>
            <Input />
          </Form.Item>
          <Form.Item label="accessToken" name="accessToken">
            <Input />
          </Form.Item>
          <Form.Item label="refreshToken" name="refreshToken">
            <Input />
          </Form.Item>
          <Form.Item label="状态" name="status" initialValue="ACTIVE">
            <Select options={[{ label: 'ACTIVE', value: 'ACTIVE' }, { label: 'INACTIVE', value: 'INACTIVE' }]} />
          </Form.Item>
          <Form.Item label="extraPayload(JSON)" name="extraPayload">
            <Input.TextArea rows={4} placeholder='例如 {"shopId":"xxxx","region":"GLOBAL"}' />
          </Form.Item>
        </Form>
        <Space>
          <Popconfirm title="确认保存凭证？" onConfirm={() => void handleSave()} okText="确认" cancelText="取消">
            <Button type="primary" loading={submitting}>
              保存凭证
            </Button>
          </Popconfirm>
          <Button loading={submitting} onClick={() => void handleCheckToken()}>
            检测 Token
          </Button>
          <Button loading={submitting} onClick={() => void handleProbe()}>
            能力探测
          </Button>
        </Space>
      </Card>
    </Space>
  );
};

export default SaleChannelCredentials;
