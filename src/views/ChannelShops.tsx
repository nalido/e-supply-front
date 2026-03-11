import { useEffect, useMemo, useState } from 'react';
import { Button, Card, Form, Input, Modal, Select, Space, Table, Tag, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useTenant } from '../contexts/tenant';
import { createChannelShop, deleteChannelShop, fetchChannelAccounts, fetchChannelShops } from '../api/channel';
import type { ChannelAccount, ChannelShop } from '../types/channel';

const statusColor: Record<string, string> = {
  ACTIVE: 'green',
  INACTIVE: 'red',
};

const ChannelShops = () => {
  const { tenantId } = useTenant();
  const [data, setData] = useState<ChannelShop[]>([]);
  const [accounts, setAccounts] = useState<ChannelAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [shops, accountResp] = await Promise.all([
        fetchChannelShops({ tenantId: Number(tenantId), keyword: keyword || undefined, page: 1, size: 20 }),
        fetchChannelAccounts({ tenantId: Number(tenantId), page: 1, size: 50 }),
      ]);
      setData(shops.items);
      setAccounts(accountResp.items);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, [keyword]);

  const columns = useMemo<ColumnsType<ChannelShop>>(
    () => [
      {
        title: '平台账号',
        dataIndex: 'channelAccountId',
        key: 'channelAccountId',
        render: (value: number) => accounts.find((item) => item.id === value)?.name || value,
      },
      { title: '店铺编码', dataIndex: 'shopCode', key: 'shopCode' },
      { title: '店铺名称', dataIndex: 'shopName', key: 'shopName' },
      { title: '区域', dataIndex: 'region', key: 'region' },
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
              await deleteChannelShop(record.id, Number(tenantId));
              message.success('已删除');
              void fetchData();
            }}
          >
            删除
          </Button>
        ),
      },
    ],
    [accounts, tenantId],
  );

  return (
    <Card
      title="店铺管理"
      extra={
        <Space>
          <Input.Search
            placeholder="搜索店铺"
            allowClear
            onSearch={(value) => setKeyword(value)}
            style={{ width: 220 }}
          />
          <Button type="primary" onClick={() => setOpen(true)}>
            新增店铺
          </Button>
        </Space>
      }
    >
      <Table rowKey="id" columns={columns} dataSource={data} loading={loading} />

      <Modal
        title="新增店铺"
        open={open}
        onCancel={() => setOpen(false)}
        onOk={async () => {
          const values = await form.validateFields();
          await createChannelShop({
            tenantId: Number(tenantId),
            channelAccountId: values.channelAccountId,
            shopCode: values.shopCode,
            shopName: values.shopName,
            status: values.status,
            region: values.region,
            timezone: values.timezone,
          });
          message.success('创建成功');
          form.resetFields();
          setOpen(false);
          void fetchData();
        }}
      >
        <Form form={form} layout="vertical" initialValues={{ status: 'ACTIVE' }}>
          <Form.Item label="平台账号" name="channelAccountId" rules={[{ required: true }]}> 
            <Select
              options={accounts.map((item) => ({ label: item.name, value: item.id }))}
              placeholder="选择平台账号"
            />
          </Form.Item>
          <Form.Item label="店铺编码" name="shopCode" rules={[{ required: true }]}> 
            <Input />
          </Form.Item>
          <Form.Item label="店铺名称" name="shopName" rules={[{ required: true }]}> 
            <Input />
          </Form.Item>
          <Form.Item label="区域" name="region">
            <Input />
          </Form.Item>
          <Form.Item label="时区" name="timezone">
            <Input placeholder="Asia/Shanghai" />
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

export default ChannelShops;
