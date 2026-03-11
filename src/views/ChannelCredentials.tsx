import { useEffect, useMemo, useState } from 'react';
import { Button, Card, Form, Input, Select, Switch, message } from 'antd';
import { useTenant } from '../contexts/tenant';
import { fetchChannelAccounts, fetchChannelCredential, upsertChannelCredential } from '../api/channel';
import type { ChannelAccount } from '../types/channel';

const DEFAULT_PAYLOAD = {
  appKey: '',
  appSecret: '',
  accessToken: '',
  gatewayUrl: '',
  partnerType: 'SELF_DEVELOPED',
  authorizationType: 'MANUAL',
  sellerType: 'LOCAL',
  sellerRegion: 'US',
  redirectUri: '',
  productListType: '',
  productItemsField: 'pageItems',
  productSkuField: 'sellerSku',
  productPlatformSkuField: 'platformSku',
  inventoryQueryType: '',
  inventoryItemsField: 'pageItems',
  webhookSecret: '',
  webhookValidateSign: false,
};

const ChannelCredentials = () => {
  const { tenantId } = useTenant();
  const [accounts, setAccounts] = useState<ChannelAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [form] = Form.useForm();

  const accountOptions = useMemo(
    () => accounts.map((item) => ({ label: item.name, value: item.id })),
    [accounts],
  );

  const loadAccounts = async () => {
    const response = await fetchChannelAccounts({ tenantId: Number(tenantId), page: 1, size: 50 });
    setAccounts(response.items);
    if (!selectedAccountId && response.items.length) {
      setSelectedAccountId(response.items[0].id);
    }
  };

  const loadCredential = async (accountId: number) => {
    try {
      const data = await fetchChannelCredential({
        tenantId: Number(tenantId),
        channelAccountId: accountId,
        credentialType: 'TEMU_APP',
      });
      const payload = data.credentialPayload ? JSON.parse(data.credentialPayload) : {};
      form.setFieldsValue({
        ...DEFAULT_PAYLOAD,
        ...payload,
      });
    } catch (error) {
      form.setFieldsValue(DEFAULT_PAYLOAD);
    }
  };

  useEffect(() => {
    void loadAccounts();
  }, []);

  useEffect(() => {
    if (selectedAccountId) {
      void loadCredential(selectedAccountId);
    }
  }, [selectedAccountId]);

  const handleSave = async () => {
    if (!selectedAccountId) {
      message.warning('请先选择平台账号');
      return;
    }
    const values = await form.validateFields();
    await upsertChannelCredential({
      tenantId: Number(tenantId),
      channelAccountId: selectedAccountId,
      credentialType: 'TEMU_APP',
      credentialPayload: JSON.stringify(values),
    });
    message.success('凭证已保存');
  };

  return (
    <Card
      title="平台凭证"
      extra={
        <Select
          style={{ width: 240 }}
          placeholder="选择平台账号"
          options={accountOptions}
          value={selectedAccountId || undefined}
          onChange={(value) => setSelectedAccountId(value)}
        />
      }
    >
      <Form form={form} layout="vertical" initialValues={DEFAULT_PAYLOAD}>
        <Form.Item label="App Key" name="appKey" rules={[{ required: true }]}> 
          <Input />
        </Form.Item>
        <Form.Item label="App Secret" name="appSecret" rules={[{ required: true }]}> 
          <Input.Password />
        </Form.Item>
        <Form.Item label="Access Token" name="accessToken">
          <Input.Password />
        </Form.Item>
        <Form.Item label="Gateway URL" name="gatewayUrl" rules={[{ required: true }]}> 
          <Input placeholder="https://openapi-b-us.temu.com" />
        </Form.Item>
        <Form.Item label="合作类型" name="partnerType">
          <Select
            options={[
              { label: '自研系统', value: 'SELF_DEVELOPED' },
              { label: 'ISV 服务商', value: 'ISV' },
            ]}
          />
        </Form.Item>
        <Form.Item label="授权方式" name="authorizationType">
          <Select
            options={[
              { label: '手动授权（Seller Center）', value: 'MANUAL' },
              { label: '回调授权（推荐）', value: 'CALLBACK' },
              { label: '应用内授权（规划）', value: 'IN_APP' },
            ]}
          />
        </Form.Item>
        <Form.Item label="卖家类型" name="sellerType">
          <Select
            options={[
              { label: '本地卖家', value: 'LOCAL' },
              { label: '跨境卖家', value: 'CROSSBORDER' },
            ]}
          />
        </Form.Item>
        <Form.Item label="站点区域" name="sellerRegion">
          <Select
            options={[
              { label: 'US', value: 'US' },
              { label: 'EU', value: 'EU' },
            ]}
          />
        </Form.Item>
        <Form.Item label="回调地址" name="redirectUri">
          <Input placeholder="https://your-domain.com/integration/temu/callback" />
        </Form.Item>

        <Form.Item label="商品列表 type" name="productListType">
          <Input placeholder="如：bg.local.goods.sku.list.query" />
        </Form.Item>
        <Form.Item label="商品列表 items 字段" name="productItemsField">
          <Input />
        </Form.Item>
        <Form.Item label="商品 SKU 字段" name="productSkuField">
          <Input />
        </Form.Item>
        <Form.Item label="平台 SKU 字段" name="productPlatformSkuField">
          <Input />
        </Form.Item>

        <Form.Item label="库存查询 type" name="inventoryQueryType">
          <Input placeholder="如：bg.inventory.stock.list.get" />
        </Form.Item>
        <Form.Item label="库存 items 字段" name="inventoryItemsField">
          <Input />
        </Form.Item>

        <Form.Item label="Webhook Secret" name="webhookSecret">
          <Input.Password />
        </Form.Item>
        <Form.Item label="Webhook 签名校验" name="webhookValidateSign" valuePropName="checked">
          <Switch />
        </Form.Item>

        <Form.Item>
          <Button type="primary" onClick={handleSave}>
            保存
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default ChannelCredentials;
