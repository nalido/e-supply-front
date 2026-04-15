import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ColumnsType } from 'antd/es/table';
import { Button, Card, Form, InputNumber, Popconfirm, Space, Table, Tag, Typography, message } from 'antd';
import { saleApi } from '../../api/sale';
import SaleChannelAccountSelect from '../../components/sale/SaleChannelAccountSelect';
import { getSaleChannelAccountDisplayName } from '../../components/sale/sale-channel-account-helper';
import type { SaleChannelAccount, SaleOrderItem } from '../../types/sale';
import { resolveSaleOrderMenuLabel } from '../../utils/sale-menu-context';

const SaleOrders = () => {
  const controlSize = 'large' as const;
  const controlBorderRadius = 12;
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [accounts, setAccounts] = useState<SaleChannelAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [orders, setOrders] = useState<SaleOrderItem[]>([]);
  const [syncForm] = Form.useForm();

  const selectedAccount = useMemo(
    () => accounts.find((item) => item.id === selectedAccountId),
    [accounts, selectedAccountId],
  );
  const accountMap = useMemo(() => new Map(accounts.map((item) => [item.id, item])), [accounts]);
  const orderMenuLabel = useMemo(
    () => (selectedAccount ? resolveSaleOrderMenuLabel(selectedAccount.sellerType) : '订单 / 备货单总览'),
    [selectedAccount],
  );
  const orderEntityLabel = orderMenuLabel.includes('备货') ? '备货单' : '订单';

  const loadData = useCallback(async (accountId?: string) => {
    setLoading(true);
    try {
      const list = await saleApi.listOrders(accountId);
      setOrders(list);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAccounts = useCallback(async () => {
    try {
      const list = await saleApi.listChannelAccounts();
      setAccounts(list);
    } catch (error) {
      console.error(error);
    }
  }, []);

  useEffect(() => {
    void loadAccounts();
  }, [loadAccounts]);

  useEffect(() => {
    void loadData(selectedAccountId);
  }, [selectedAccountId, loadData]);

  const columns: ColumnsType<SaleOrderItem> = [
    { title: '订单ID', dataIndex: 'id', width: 90 },
    {
      title: '店铺',
      dataIndex: 'channelAccountId',
      width: 220,
      render: (value: string) => getSaleChannelAccountDisplayName(accountMap.get(String(value))),
    },
    { title: `平台${orderEntityLabel}号`, dataIndex: 'platformOrderNo', width: 180 },
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
      message.warning('请先选择具体店铺后再执行同步');
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
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card>
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <div>
            <Typography.Title level={4} style={{ margin: 0 }}>
              {orderMenuLabel}
            </Typography.Title>
            <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
              这里聚焦平台原始{orderEntityLabel}的同步、状态和金额信息，不承载发货动作；待发货处理统一放在“待发货 / 发货工作台”。
            </Typography.Paragraph>
          </div>
        </Space>
      </Card>
      <Card>
        <Form form={syncForm} layout="vertical" initialValues={{ page: 1, pageSize: 20 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              gap: 16,
              flexWrap: 'wrap',
            }}
          >
            <Space size={16} wrap align="end">
              <Form.Item label="店铺" style={{ marginBottom: 0 }}>
                <SaleChannelAccountSelect
                  accounts={accounts}
                  allowAll
                  value={selectedAccountId}
                  onChange={setSelectedAccountId}
                  allLabel="全部店铺"
                  placeholder="筛选店铺"
                  size={controlSize}
                  width={320}
                />
              </Form.Item>
              <Form.Item label="页码" name="page" style={{ marginBottom: 0 }}>
                <InputNumber min={1} size={controlSize} style={{ width: 96, borderRadius: controlBorderRadius }} />
              </Form.Item>
              <Form.Item label="每页" name="pageSize" style={{ marginBottom: 0 }}>
                <InputNumber min={1} max={100} size={controlSize} style={{ width: 108, borderRadius: controlBorderRadius }} />
              </Form.Item>
            </Space>
            <Space size={12} wrap>
              <Popconfirm title={`确认同步${orderEntityLabel}到本地？`} onConfirm={() => void handleSync()} okText="确认" cancelText="取消">
                <Button type="primary" size={controlSize} style={{ borderRadius: controlBorderRadius }} loading={syncing} disabled={!selectedAccountId}>
                  {`同步${orderEntityLabel}`}
                </Button>
              </Popconfirm>
              <Button size={controlSize} style={{ borderRadius: controlBorderRadius }} onClick={() => void loadData(selectedAccountId)}>
                刷新
              </Button>
            </Space>
          </div>
          <Typography.Text type="secondary" style={{ display: 'block', marginTop: 12 }}>
            {!selectedAccountId
              ? `默认展示全部店铺的${orderEntityLabel}数据；执行同步前请先选择具体店铺。`
              : `当前按指定店铺展示${orderEntityLabel}主数据，用于核对状态、金额与平台更新时间。`}
          </Typography.Text>
        </Form>
      </Card>
      <Card>
        <Table<SaleOrderItem>
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={orders}
          pagination={false}
          scroll={{ x: 1440 }}
        />
      </Card>
    </Space>
  );
};

export default SaleOrders;
