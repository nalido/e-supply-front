import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ColumnsType } from 'antd/es/table';
import { Button, Card, Col, Form, InputNumber, Row, Space, Statistic, Table, Tag, Typography, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { saleApi } from '../../api/sale';
import SaleChannelAccountSelect from '../../components/sale/SaleChannelAccountSelect';
import { getSaleChannelAccountDisplayName } from '../../components/sale/sale-channel-account-helper';
import type { SaleChannelAccount, SaleFulfillmentDemandItem, SaleFulfillmentDemandStats } from '../../types/sale';

const SaleFulfillments = () => {
  const controlSize = 'large' as const;
  const controlBorderRadius = 12;
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [accounts, setAccounts] = useState<SaleChannelAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [demands, setDemands] = useState<SaleFulfillmentDemandItem[]>([]);
  const [stats, setStats] = useState<SaleFulfillmentDemandStats>({ total: 0, readyCount: 0, urgentCount: 0, overdueCount: 0 });
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [syncForm] = Form.useForm();

  const selectedAccount = useMemo(
    () => accounts.find((item) => item.id === selectedAccountId),
    [accounts, selectedAccountId],
  );
  const accountMap = useMemo(() => new Map(accounts.map((item) => [item.id, item])), [accounts]);
  const fullManagedEnabled = selectedAccount?.platformCode === 'TEMU' && selectedAccount?.sellerType === 'FULLY_MANAGED';

  const loadData = useCallback(async (accountId?: string) => {
    setLoading(true);
    try {
      const [list, statsResponse] = await Promise.all([
        saleApi.listFulfillmentDemands(accountId),
        saleApi.getFulfillmentDemandStats(accountId),
      ]);
      setDemands(list);
      setStats(statsResponse);
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

  useEffect(() => {
    setSelectedRowKeys([]);
  }, [selectedAccountId]);

  const columns: ColumnsType<SaleFulfillmentDemandItem> = [
    { title: '备货单号', dataIndex: 'bizDocNo', width: 180 },
    {
      title: '店铺',
      dataIndex: 'channelAccountId',
      width: 220,
      render: (value: string) => getSaleChannelAccountDisplayName(accountMap.get(String(value))),
    },
    {
      title: '状态',
      dataIndex: 'normalizedStatus',
      width: 140,
      render: (value) => <Tag color={value === 'READY_TO_SHIP' ? 'blue' : value === 'SHIPPED' ? 'green' : 'default'}>{value ?? '--'}</Tag>,
    },
    { title: '平台状态', dataIndex: 'externalStatus', width: 120 },
    { title: '收件人', dataIndex: 'receiverName', width: 120 },
    { title: '国家', dataIndex: 'receiverCountry', width: 100 },
    { title: 'SKU 行数', dataIndex: 'itemCount', width: 100 },
    { title: '数量', dataIndex: 'quantity', width: 100 },
    { title: '最晚时限', dataIndex: 'deadlineAt', width: 180 },
    { title: '仓提示', dataIndex: 'warehouseHint', width: 180 },
    { title: '同步时间', dataIndex: 'lastSyncedAt', width: 180 },
  ];

  const handleSync = async () => {
    if (!selectedAccountId) {
      message.warning('请先选择具体店铺后再执行同步');
      return;
    }
    const values = await syncForm.validateFields();
    setSyncing(true);
    try {
      await saleApi.syncFulfillmentDemands({
        channelAccountId: Number(selectedAccountId),
        page: values.page,
        pageSize: values.pageSize,
      });
      message.success('待履约单据同步完成');
      await loadData(selectedAccountId);
    } catch (error) {
      console.error(error);
    } finally {
      setSyncing(false);
    }
  };

  const handleOpenWorkbench = async () => {
    if (!selectedAccountId) {
      message.warning('请先选择具体店铺');
      return;
    }
    if (!selectedRowKeys.length) {
      message.warning('请至少选择一条待履约单据');
      return;
    }
    try {
      const resolved = await saleApi.resolveFulfillmentWorkbench({
        channelAccountId: Number(selectedAccountId),
        demandIds: selectedRowKeys.map((item) => Number(item)),
      });
      const query = new URLSearchParams({
        accountId: selectedAccountId,
        demandIds: resolved.sourceIds.join(','),
      });
      navigate(`${resolved.pageRoute}?${query.toString()}`);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card>
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <div>
            <Typography.Title level={4} style={{ margin: 0 }}>
              待发货工作台
            </Typography.Title>
            <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
              这里聚焦待发货单据、时限、仓提示和发货执行；订单主数据查看与对账请回到“订单 / 备货单”。
            </Typography.Paragraph>
          </div>
        </Space>
      </Card>
      <Row gutter={16}>
        <Col span={6}>
          <Card><Statistic title="单据总数" value={stats.total} /></Card>
        </Col>
        <Col span={6}>
          <Card><Statistic title="待发货" value={stats.readyCount} /></Card>
        </Col>
        <Col span={6}>
          <Card><Statistic title="急采" value={stats.urgentCount} /></Card>
        </Col>
        <Col span={6}>
          <Card><Statistic title="已逾期" value={stats.overdueCount} /></Card>
        </Col>
      </Row>
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
              <Button
                type="primary"
                size={controlSize}
                style={{ borderRadius: controlBorderRadius }}
                loading={syncing}
                onClick={() => void handleSync()}
                disabled={!selectedAccountId || !fullManagedEnabled}
              >
                同步待履约单据
              </Button>
              <Button
                size={controlSize}
                style={{ borderRadius: controlBorderRadius }}
                onClick={() => void handleOpenWorkbench()}
                disabled={!selectedAccountId || !fullManagedEnabled || !selectedRowKeys.length}
              >
                批量发货
              </Button>
              <Button size={controlSize} style={{ borderRadius: controlBorderRadius }} onClick={() => void loadData(selectedAccountId)}>
                刷新
              </Button>
            </Space>
          </div>
          <Typography.Text type="secondary" style={{ display: 'block', marginTop: 12 }}>
            {!selectedAccountId
              ? '默认展示全部店铺的待发货数据；同步和发货前请先选择具体店铺。'
              : !fullManagedEnabled
                ? '当前仅 Temu 全托店铺开放新发货工作台。'
                : '选择具体店铺后可执行待发货同步，并对当前筛选结果进入发货处理。'}
          </Typography.Text>
        </Form>
      </Card>
      <Card>
        <Table<SaleFulfillmentDemandItem>
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={demands}
          pagination={false}
          rowSelection={{
            selectedRowKeys,
            onChange: (keys) => setSelectedRowKeys(keys.map(String)),
            getCheckboxProps: (record) => ({
              disabled: record.normalizedStatus !== 'READY_TO_SHIP' || !fullManagedEnabled || !selectedAccountId,
            }),
          }}
          scroll={{ x: 1620 }}
        />
      </Card>
    </Space>
  );
};

export default SaleFulfillments;
