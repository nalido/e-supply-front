import { useEffect, useMemo, useState } from 'react';
import { Button, Card, Form, Input, Modal, Select, Space, Table, Tag, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useTenant } from '../contexts/tenant';
import { createChannelAccount, deleteChannelAccount, fetchChannelAccounts } from '../api/channel';
import type { ChannelAccount } from '../types/channel';

const statusColor: Record<string, string> = {
  ACTIVE: 'green',
  INACTIVE: 'red',
};

const ChannelAccounts = () => {
  const { tenantId } = useTenant();
  const [data, setData] = useState<ChannelAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetchChannelAccounts({
        tenantId: Number(tenantId),
        keyword: keyword || undefined,
        page: 1,
        size: 20,
      });
      setData(response.items);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, [keyword]);

  const columns = useMemo<ColumnsType<ChannelAccount>>(
    () => [
      { title: '平台', dataIndex: 'platform', key: 'platform' },
      { title: '账号名称', dataIndex: 'name', key: 'name' },
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
              await deleteChannelAccount(record.id, Number(tenantId));
              message.success('已删除');
              void fetchData();
            }}
          >
            删除
          </Button>
        ),
      },
    ],
    [tenantId],
  );

  return (
    <Card
      title="平台账号"
      extra={
        <Space>
          <Input.Search
            placeholder="搜索账号名称"
            allowClear
            onSearch={(value) => setKeyword(value)}
            style={{ width: 220 }}
          />
          <Button type="primary" onClick={() => setOpen(true)}>
            新增账号
          </Button>
        </Space>
      }
    >
      <Table rowKey="id" columns={columns} dataSource={data} loading={loading} />

      <Modal
        title="新增平台账号"
        open={open}
        onCancel={() => setOpen(false)}
        onOk={async () => {
          const values = await form.validateFields();
          await createChannelAccount({
            tenantId: Number(tenantId),
            platform: values.platform,
            name: values.name,
            status: values.status,
            region: values.region,
          });
          message.success('创建成功');
          form.resetFields();
          setOpen(false);
          void fetchData();
        }}
      >
        <Form form={form} layout="vertical" initialValues={{ platform: 'TEMU', status: 'ACTIVE' }}>
          <Form.Item label="平台" name="platform" rules={[{ required: true }]}> 
            <Select options={[{ label: 'Temu', value: 'TEMU' }]} />
          </Form.Item>
          <Form.Item label="账号名称" name="name" rules={[{ required: true }]}> 
            <Input placeholder="如：Temu-官方旗舰" />
          </Form.Item>
          <Form.Item label="区域" name="region">
            <Input placeholder="如：CN" />
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

export default ChannelAccounts;
