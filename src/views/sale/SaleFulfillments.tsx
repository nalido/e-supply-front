import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ColumnsType } from 'antd/es/table';
import { Button, Card, Form, Input, InputNumber, Popconfirm, Select, Space, Table, Tag, Typography, message } from 'antd';
import { saleApi } from '../../api/sale';
import type { SaleChannelAccount, SaleFulfillmentItem } from '../../types/sale';
import { publishSaleContextChanged, resolveSaleAccountSelection } from '../../utils/sale-menu-context';

const SaleFulfillments = () => {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [accounts, setAccounts] = useState<SaleChannelAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>();
  const [fulfillments, setFulfillments] = useState<SaleFulfillmentItem[]>([]);
  const [createForm] = Form.useForm();
  const [pushForm] = Form.useForm();

  const accountOptions = useMemo(
    () => accounts.map((item) => ({ label: `${item.accountName} (${item.id})`, value: item.id })),
    [accounts],
  );

  const loadData = useCallback(async (accountId?: string) => {
    setLoading(true);
    try {
      const list = await saleApi.listFulfillments(accountId);
      setFulfillments(list);
    } catch (error) {
      console.error(error);
      message.error('加载履约单失败');
    } finally {
      setLoading(false);
    }
  }, []);

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

  useEffect(() => {
    void loadAccounts();
  }, [loadAccounts]);

  useEffect(() => {
    void loadData(selectedAccountId);
  }, [selectedAccountId, loadData]);

  const columns: ColumnsType<SaleFulfillmentItem> = [
    { title: '履约ID', dataIndex: 'id', width: 90 },
    { title: '履约单号', dataIndex: 'fulfillmentNo', width: 170 },
    { title: '销售单ID', dataIndex: 'saleOrderId', width: 110 },
    {
      title: '状态',
      dataIndex: 'status',
      width: 120,
      render: (value) => <Tag>{value ?? '--'}</Tag>,
    },
    {
      title: '推送状态',
      dataIndex: 'pushStatus',
      width: 120,
      render: (value) => <Tag color={value === 'SUCCESS' ? 'green' : value === 'FAILED' ? 'red' : 'default'}>{value ?? '--'}</Tag>,
    },
    { title: '运单号', dataIndex: 'trackingNo', width: 160 },
    { title: '物流公司', dataIndex: 'carrierName', width: 160 },
    { title: '错误', dataIndex: 'lastPushError', ellipsis: true },
  ];

  const handleCreate = async () => {
    const values = await createForm.validateFields();
    setSubmitting(true);
    try {
      await saleApi.createFulfillment({
        channelAccountId: selectedAccountId ? Number(selectedAccountId) : undefined,
        saleOrderId: Number(values.saleOrderId),
        dispatchId: values.dispatchId ? Number(values.dispatchId) : undefined,
        trackingNo: values.trackingNo,
        carrierCode: values.carrierCode,
        carrierName: values.carrierName,
        idempotencyKey: values.idempotencyKey,
      });
      message.success('履约单创建请求已提交');
      createForm.resetFields();
      await loadData(selectedAccountId);
    } catch (error) {
      console.error(error);
      message.error('创建履约单失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePush = async () => {
    const values = await pushForm.validateFields();
    setSubmitting(true);
    try {
      await saleApi.pushFulfillment(String(values.fulfillmentId), {
        trackingNo: values.trackingNo,
        carrierCode: values.carrierCode,
        carrierName: values.carrierName,
        deliveryMethod: values.deliveryMethod,
      });
      message.success('履约推送请求已提交');
      pushForm.resetFields();
      await loadData(selectedAccountId);
    } catch (error) {
      console.error(error);
      message.error('履约推送失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card>
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Typography.Title level={4} style={{ margin: 0 }}>
            履约与发货
          </Typography.Title>
          <Space>
            <Select
              style={{ width: 320 }}
              options={accountOptions}
              value={selectedAccountId}
              onChange={setSelectedAccountId}
              placeholder="选择渠道账号"
            />
            <Button onClick={() => void loadData(selectedAccountId)}>刷新</Button>
          </Space>
        </Space>
      </Card>
      <Card title="创建履约单">
        <Form form={createForm} layout="inline">
          <Form.Item label="销售单ID" name="saleOrderId" rules={[{ required: true, message: '必填' }]}>
            <InputNumber min={1} />
          </Form.Item>
          <Form.Item label="Dispatch ID" name="dispatchId">
            <InputNumber min={1} />
          </Form.Item>
          <Form.Item label="运单号" name="trackingNo">
            <Input />
          </Form.Item>
          <Form.Item label="物流编码" name="carrierCode">
            <Input />
          </Form.Item>
          <Form.Item label="物流公司" name="carrierName">
            <Input />
          </Form.Item>
          <Form.Item label="幂等键" name="idempotencyKey">
            <Input />
          </Form.Item>
          <Form.Item>
            <Popconfirm title="确认创建履约单？" onConfirm={() => void handleCreate()} okText="确认" cancelText="取消">
              <Button type="primary" loading={submitting}>
                创建履约单
              </Button>
            </Popconfirm>
          </Form.Item>
        </Form>
      </Card>
      <Card title="推送履约单">
        <Form form={pushForm} layout="inline">
          <Form.Item label="履约ID" name="fulfillmentId" rules={[{ required: true, message: '必填' }]}>
            <InputNumber min={1} />
          </Form.Item>
          <Form.Item label="运单号" name="trackingNo">
            <Input />
          </Form.Item>
          <Form.Item label="物流编码" name="carrierCode">
            <Input />
          </Form.Item>
          <Form.Item label="物流公司" name="carrierName">
            <Input />
          </Form.Item>
          <Form.Item label="配送方式" name="deliveryMethod">
            <InputNumber min={1} max={3} />
          </Form.Item>
          <Form.Item>
            <Popconfirm title="确认推送履约？" onConfirm={() => void handlePush()} okText="确认" cancelText="取消">
              <Button loading={submitting}>推送履约</Button>
            </Popconfirm>
          </Form.Item>
        </Form>
      </Card>
      <Card>
        <Table<SaleFulfillmentItem>
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={fulfillments}
          pagination={false}
          scroll={{ x: 1300 }}
        />
      </Card>
    </Space>
  );
};

export default SaleFulfillments;
