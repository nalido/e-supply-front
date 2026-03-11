import { useEffect, useMemo, useState } from 'react';
import { Button, Card, Form, Input, Modal, Select, Space, Table, Tag, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useTenant } from '../contexts/tenant';
import {
  createChannelProduct,
  deleteChannelProduct,
  fetchChannelAccounts,
  fetchChannelProducts,
  fetchChannelShops,
} from '../api/channel';
import type { ChannelAccount, ChannelProductMapping, ChannelShop } from '../types/channel';

const statusColor: Record<string, string> = {
  ACTIVE: 'green',
  INACTIVE: 'red',
};

const ChannelProducts = () => {
  const { tenantId } = useTenant();
  const [data, setData] = useState<ChannelProductMapping[]>([]);
  const [accounts, setAccounts] = useState<ChannelAccount[]>([]);
  const [shops, setShops] = useState<ChannelShop[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [products, accountResp, shopResp] = await Promise.all([
        fetchChannelProducts({ tenantId: Number(tenantId), keyword: keyword || undefined, page: 1, size: 20 }),
        fetchChannelAccounts({ tenantId: Number(tenantId), page: 1, size: 50 }),
        fetchChannelShops({ tenantId: Number(tenantId), page: 1, size: 50 }),
      ]);
      setData(products.items);
      setAccounts(accountResp.items);
      setShops(shopResp.items);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, [keyword]);

  const columns = useMemo<ColumnsType<ChannelProductMapping>>(
    () => [
      {
        title: '平台账号',
        dataIndex: 'channelAccountId',
        key: 'channelAccountId',
        render: (value: number) => accounts.find((item) => item.id === value)?.name || value,
      },
      {
        title: '店铺',
        dataIndex: 'shopId',
        key: 'shopId',
        render: (value?: number) => shops.find((item) => item.id === value)?.shopName || value,
      },
      { title: '平台 SKU', dataIndex: 'platformSku', key: 'platformSku' },
      { title: '内部 SKU', dataIndex: 'sku', key: 'sku' },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        render: (value: string) => <Tag color={statusColor[value] || 'blue'}>{value}</Tag>,
      },
      {
        title: '操作',
        key: 'actions',
        render: (_, record) => (
          <Button
            danger
            size="small"
            onClick={async () => {
              await deleteChannelProduct(record.id, Number(tenantId));
              message.success('已删除');
              void fetchData();
            }}
          >
            删除
          </Button>
        ),
      },
    ],
    [accounts, shops, tenantId],
  );

  return (
    <Card
      title="商品映射"
      extra={
        <Space>
          <Input.Search
            placeholder="搜索 SKU"
            allowClear
            onSearch={(value) => setKeyword(value)}
            style={{ width: 220 }}
          />
          <Button type="primary" onClick={() => setOpen(true)}>
            新增映射
          </Button>
        </Space>
      }
    >
      <Table rowKey="id" columns={columns} dataSource={data} loading={loading} />

      <Modal
        title="新增商品映射"
        open={open}
        onCancel={() => setOpen(false)}
        onOk={async () => {
          const values = await form.validateFields();
          await createChannelProduct({
            tenantId: Number(tenantId),
            channelAccountId: values.channelAccountId,
            shopId: values.shopId,
            platformSku: values.platformSku,
            sku: values.sku,
            status: values.status,
          });
          message.success('创建成功');
          form.resetFields();
          setOpen(false);
          void fetchData();
        }}
      >
        <Form form={form} layout="vertical" initialValues={{ status: 'ACTIVE' }}>
          <Form.Item label="平台账号" name="channelAccountId" rules={[{ required: true }]}> 
            <Select options={accounts.map((item) => ({ label: item.name, value: item.id }))} />
          </Form.Item>
          <Form.Item label="店铺" name="shopId"> 
            <Select
              allowClear
              options={shops.map((item) => ({ label: item.shopName, value: item.id }))}
            />
          </Form.Item>
          <Form.Item label="平台 SKU" name="platformSku" rules={[{ required: true }]}> 
            <Input />
          </Form.Item>
          <Form.Item label="内部 SKU" name="sku">
            <Input />
          </Form.Item>
          <Form.Item label="状态" name="status">
            <Select
              options={[
                { label: '启用', value: 'ACTIVE' },
                { label: '停用', value: 'INACTIVE' },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default ChannelProducts;
