import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ColumnsType } from 'antd/es/table';
import { Button, Card, Form, InputNumber, Popconfirm, Select, Space, Table, Tag, Typography, message } from 'antd';
import { saleApi } from '../../api/sale';
import type { SaleChannelAccount, SaleOrderItem } from '../../types/sale';

const SaleOrders = () => {
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [accounts, setAccounts] = useState<SaleChannelAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>();
  const [orders, setOrders] = useState<SaleOrderItem[]>([]);
  const [syncForm] = Form.useForm();

  const accountOptions = useMemo(
    () => accounts.map((item) => ({ label: `${item.accountName} (${item.id})`, value: item.id })),
    [accounts],
  );
  const selectedAccount = useMemo(
    () => accounts.find((item) => item.id === selectedAccountId),
    [accounts, selectedAccountId],
  );

  const loadData = useCallback(async (accountId?: string) => {
    setLoading(true);
    try {
      const list = await saleApi.listOrders(accountId);
      setOrders(list);
    } catch (error) {
      console.error(error);
      message.error('加载销售订单失败');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAccounts = useCallback(async () => {
    try {
      const list = await saleApi.listChannelAccounts();
      setAccounts(list);
      if (!selectedAccountId && list[0]) {
        setSelectedAccountId(list[0].id);
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

  const columns: ColumnsType<SaleOrderItem> = [
    { title: '订单ID', dataIndex: 'id', width: 90 },
    { title: '平台订单号', dataIndex: 'platformOrderNo', width: 180 },
    { title: '父单号', dataIndex: 'platformParentOrderNo', width: 180 },
    {
      title: '状态',
      dataIndex: 'normalizedStatus',
      width: 140,
      render: (value) => <Tag>{value ?? '--'}</Tag>,
    },
    { title: '金额', dataIndex: 'orderAmount', width: 120 },
    { title: '实付', dataIndex: 'payAmount', width: 120 },
    { title: '收件人', dataIndex: 'receiverName', width: 140 },
    { title: '更新时间', dataIndex: 'platformUpdatedAt', width: 180 },
  ];

  const handleSync = async () => {
    if (!selectedAccountId) {
      message.warning('请先选择渠道账号');
      return;
    }
    const values = await syncForm.validateFields();
    setSyncing(true);
    try {
      await saleApi.syncOrders({
        channelAccountId: Number(selectedAccountId),
        page: values.page,
        pageSize: values.pageSize,
      });
      message.success('订单同步请求已提交');
      await loadData(selectedAccountId);
    } catch (error) {
      console.error(error);
      message.error('订单同步失败');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card>
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Typography.Title level={4} style={{ margin: 0 }}>
            销售订单
          </Typography.Title>
          <Space>
            <Select
              style={{ width: 320 }}
              options={accountOptions}
              value={selectedAccountId}
              onChange={setSelectedAccountId}
              placeholder="选择渠道账号"
            />
            <Tag color={selectedAccount?.sellerType === 'FULLY_MANAGED' ? 'blue' : selectedAccount?.sellerType === 'SEMI_MANAGED' ? 'green' : 'default'}>
              {selectedAccount?.sellerType === 'FULLY_MANAGED'
                ? '当前店铺：全托'
                : selectedAccount?.sellerType === 'SEMI_MANAGED'
                  ? '当前店铺：半托'
                  : `当前店铺：${selectedAccount?.sellerType ?? '--'}`}
            </Tag>
            <Button onClick={() => void loadData(selectedAccountId)}>刷新</Button>
          </Space>
        </Space>
      </Card>
      <Card>
        <Form form={syncForm} layout="inline" initialValues={{ page: 1, pageSize: 20 }}>
          <Form.Item label="页码" name="page">
            <InputNumber min={1} />
          </Form.Item>
          <Form.Item label="每页" name="pageSize">
            <InputNumber min={1} max={100} />
          </Form.Item>
          <Form.Item>
            <Popconfirm title="确认同步订单到本地？" onConfirm={() => void handleSync()} okText="确认" cancelText="取消">
              <Button type="primary" loading={syncing}>
                同步订单
              </Button>
            </Popconfirm>
          </Form.Item>
        </Form>
      </Card>
      <Card>
        <Table<SaleOrderItem>
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={orders}
          pagination={false}
          scroll={{ x: 1200 }}
        />
      </Card>
    </Space>
  );
};

export default SaleOrders;
