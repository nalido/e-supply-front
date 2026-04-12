import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ColumnsType } from 'antd/es/table';
import { Button, Card, Form, Input, Modal, Select, Space, Table, Tag, Typography, message } from 'antd';
import { saleApi } from '../../api/sale';
import type { SaleChannelAccount } from '../../types/sale';

const SELLER_TYPE_OPTIONS = [
  { label: '全托管', value: 'FULLY_MANAGED' },
  { label: '半托管', value: 'SEMI_MANAGED' },
];

const ORDER_SYNC_MODE_OPTIONS = [
  { label: '自动(AUTO)', value: 'AUTO' },
  { label: '订单模式(ORDER)', value: 'ORDER' },
  { label: '备货单模式(PURCHASE_ORDER)', value: 'PURCHASE_ORDER' },
];

const SaleChannelAccounts = () => {
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<SaleChannelAccount[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editing, setEditing] = useState<SaleChannelAccount | null>(null);
  const [form] = Form.useForm();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const list = await saleApi.listChannelAccounts();
      setAccounts(list);
    } catch (error) {
      console.error(error);
      message.error('加载渠道账号失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const columns: ColumnsType<SaleChannelAccount> = useMemo(
    () => [
      { title: '账号ID', dataIndex: 'id', width: 90 },
      { title: '平台', dataIndex: 'platformCode', width: 90 },
      { title: '账号名称', dataIndex: 'accountName', width: 160 },
      { title: '店铺ID', dataIndex: 'shopId', width: 130 },
      { title: '店铺名', dataIndex: 'shopName', width: 180 },
      { title: '店铺类型', dataIndex: 'sellerType', width: 120 },
      { title: '同步策略', dataIndex: 'orderSyncMode', width: 210 },
      { title: '网关', dataIndex: 'gatewayUrl', ellipsis: true },
      {
        title: '状态',
        dataIndex: 'status',
        width: 100,
        render: (value: string | null | undefined) => <Tag color={value === 'ACTIVE' ? 'green' : 'default'}>{value ?? '--'}</Tag>,
      },
      {
        title: '操作',
        key: 'actions',
        width: 90,
        fixed: 'right',
        render: (_, record) => (
          <Button
            type="link"
            onClick={() => {
              setEditing(record);
              form.setFieldsValue({
                accountName: record.accountName,
                shopId: record.shopId,
                shopName: record.shopName,
                regionCode: record.regionCode,
                gatewayUrl: record.gatewayUrl,
                sellerType: record.sellerType,
                orderSyncMode: record.orderSyncMode ?? 'AUTO',
                authorizationType: record.authorizationType,
                remarks: record.remarks,
              });
              setModalOpen(true);
            }}
          >
            编辑
          </Button>
        ),
      },
    ],
    [form],
  );

  const handleSubmit = async () => {
    const values = await form.validateFields();
    setSubmitting(true);
    try {
      if (editing) {
        await saleApi.updateChannelAccount(editing.id, values);
      } else {
        await saleApi.createChannelAccount({
          platformCode: 'TEMU',
          ...values,
        });
      }
      message.success(editing ? '账号已更新' : '账号已创建');
      setModalOpen(false);
      setEditing(null);
      form.resetFields();
      await loadData();
    } catch (error) {
      console.error(error);
      message.error(editing ? '更新失败' : '创建失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card>
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Typography.Title level={4} style={{ margin: 0 }}>
            渠道账号
          </Typography.Title>
          <Space>
            <Button onClick={() => void loadData()}>刷新</Button>
            <Button
              type="primary"
              onClick={() => {
                setEditing(null);
                form.resetFields();
                form.setFieldValue('sellerType', 'FULLY_MANAGED');
                form.setFieldValue('orderSyncMode', 'AUTO');
                form.setFieldValue('authorizationType', 'TOKEN');
                setModalOpen(true);
              }}
            >
              新建账号
            </Button>
          </Space>
        </Space>
      </Card>
      <Card>
        <Table<SaleChannelAccount>
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={accounts}
          pagination={false}
          scroll={{ x: 1280 }}
        />
      </Card>
      <Modal
        title={editing ? `编辑账号 #${editing.id}` : '新建渠道账号'}
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          setEditing(null);
          form.resetFields();
        }}
        onOk={() => void handleSubmit()}
        okButtonProps={{ loading: submitting }}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item label="账号名称" name="accountName" rules={[{ required: true, message: '请输入账号名称' }]}>
            <Input />
          </Form.Item>
          <Form.Item label="店铺ID" name="shopId">
            <Input />
          </Form.Item>
          <Form.Item label="店铺名称" name="shopName">
            <Input />
          </Form.Item>
          <Form.Item label="Region" name="regionCode">
            <Input />
          </Form.Item>
          <Form.Item label="Gateway" name="gatewayUrl">
            <Input />
          </Form.Item>
          <Form.Item label="店铺类型" name="sellerType">
            <Select options={SELLER_TYPE_OPTIONS} allowClear />
          </Form.Item>
          <Form.Item label="订单同步策略" name="orderSyncMode" initialValue="AUTO">
            <Select options={ORDER_SYNC_MODE_OPTIONS} />
          </Form.Item>
          <Form.Item label="授权类型" name="authorizationType">
            <Input placeholder="TOKEN" />
          </Form.Item>
          <Form.Item label="备注" name="remarks">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
};

export default SaleChannelAccounts;
