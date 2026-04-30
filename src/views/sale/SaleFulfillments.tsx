import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ColumnsType } from 'antd/es/table';
import { Button, Card, Col, Descriptions, Drawer, Form, InputNumber, Row, Space, Statistic, Table, Tag, Typography, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { saleApi } from '../../api/sale';
import SaleChannelAccountSelect from '../../components/sale/SaleChannelAccountSelect';
import { getSaleChannelAccountDisplayName } from '../../components/sale/sale-channel-account-helper';
import type {
  SaleChannelAccount,
  SaleFulfillmentDemandDetail,
  SaleFulfillmentDemandItem,
  SaleFulfillmentDemandLine,
  SaleFulfillmentDemandLinePreview,
  SaleFulfillmentDemandStats,
} from '../../types/sale';

const renderLineTagSummary = (line: SaleFulfillmentDemandLinePreview | SaleFulfillmentDemandLine) => {
  const tags = [line.color, line.size].filter(Boolean);
  if (tags.length) {
    return tags.join(' / ');
  }
  return line.specSummary || '--';
};

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
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<SaleFulfillmentDemandDetail>();
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
    {
      title: '备货单',
      dataIndex: 'bizDocNo',
      width: 220,
      render: (value, record) => (
        <Space direction="vertical" size={4}>
          <Typography.Text strong>{value}</Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {record.parentBizDocNo ? `母单：${record.parentBizDocNo}` : getSaleChannelAccountDisplayName(accountMap.get(String(record.channelAccountId)))}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: '商品与规格',
      dataIndex: 'linePreview',
      width: 460,
      render: (_, record) => (
        <Space direction="vertical" size={6} style={{ width: '100%' }}>
          {(record.linePreview ?? []).length ? (
            (record.linePreview ?? []).map((line, index) => (
              <div key={`${record.id}-${line.platformSkuId ?? index}`}>
                <Typography.Text strong>{line.goodsName || '未识别商品名'}</Typography.Text>
                <Space size={6} wrap style={{ marginLeft: 8 }}>
                  <Tag>{renderLineTagSummary(line)}</Tag>
                  <Typography.Text type="secondary">数量 {line.quantity ?? 0}</Typography.Text>
                  {line.platformSkuCode ? <Typography.Text type="secondary">商家 SKU {line.platformSkuCode}</Typography.Text> : null}
                </Space>
              </div>
            ))
          ) : (
            <Typography.Text type="secondary">{record.goodsSummary || '--'}</Typography.Text>
          )}
          {record.itemCount && record.itemCount > (record.linePreview?.length ?? 0) ? (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              另有 {record.itemCount - (record.linePreview?.length ?? 0)} 行未展开
            </Typography.Text>
          ) : null}
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'normalizedStatus',
      width: 140,
      render: (value, record) => (
        <Space size={4} wrap>
          <Tag color={value === 'READY_TO_SHIP' ? 'blue' : value === 'SHIPPED' ? 'green' : 'default'}>{value ?? '--'}</Tag>
          {record.urgent ? <Tag color="red">急采</Tag> : null}
        </Space>
      ),
    },
    { title: '平台状态', dataIndex: 'externalStatus', width: 120 },
    { title: '收件人', dataIndex: 'receiverName', width: 120 },
    { title: '国家', dataIndex: 'receiverCountry', width: 100 },
    { title: 'SKU 行数', dataIndex: 'itemCount', width: 100 },
    { title: '数量', dataIndex: 'quantity', width: 100 },
    { title: '要求发货时限', dataIndex: 'deadlineAt', width: 180 },
    { title: '仓提示', dataIndex: 'warehouseHint', width: 180 },
    { title: '同步时间', dataIndex: 'lastSyncedAt', width: 180 },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      fixed: 'right',
      render: (_, record) => (
        <Button type="link" onClick={() => void handleOpenDetail(record.id)}>
          查看明细
        </Button>
      ),
    },
  ];

  const lineColumns: ColumnsType<SaleFulfillmentDemandLine> = [
    {
      title: '商品',
      dataIndex: 'goodsName',
      width: 280,
      render: (value, record) => (
        <Space direction="vertical" size={2}>
          <Typography.Text strong>{value || '--'}</Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {record.platformSkuCode ? `商家 SKU：${record.platformSkuCode}` : record.platformSkuId ? `平台 SKU：${record.platformSkuId}` : '--'}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: '颜色/尺码',
      width: 220,
      render: (_, record) => (
        <Space size={4} wrap>
          {record.color ? <Tag color="blue">{record.color}</Tag> : null}
          {record.size ? <Tag color="purple">{record.size}</Tag> : null}
          <Typography.Text>{record.specSummary || '--'}</Typography.Text>
        </Space>
      ),
    },
    { title: '平台 SKU', dataIndex: 'platformSkuId', width: 160 },
    { title: '数量', dataIndex: 'quantity', width: 100 },
    { title: '金额', dataIndex: 'lineAmount', width: 120 },
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

  const handleOpenDetail = async (demandId: string) => {
    setDetailOpen(true);
    setDetailLoading(true);
    try {
      const response = await saleApi.getFulfillmentDemandDetail(demandId);
      setDetail(response);
    } catch (error) {
      console.error(error);
      message.error('加载备货单明细失败');
    } finally {
      setDetailLoading(false);
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
              这里聚焦待发货备货单、商品明细、要求发货时限、仓提示和发货执行。
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
          scroll={{ x: 1980 }}
        />
      </Card>
      <Drawer
        title={detail ? `备货单明细 · ${detail.bizDocNo}` : '备货单明细'}
        width={960}
        open={detailOpen}
        onClose={() => {
          setDetailOpen(false);
          setDetail(undefined);
        }}
        destroyOnClose
      >
        <Card loading={detailLoading} bordered={false}>
          <Descriptions column={3} size="small">
            <Descriptions.Item label="备货单号">{detail?.bizDocNo ?? '--'}</Descriptions.Item>
            <Descriptions.Item label="状态">{detail?.normalizedStatus ?? '--'}</Descriptions.Item>
            <Descriptions.Item label="平台状态">{detail?.externalStatus ?? '--'}</Descriptions.Item>
            <Descriptions.Item label="商品概览">{detail?.goodsSummary ?? '--'}</Descriptions.Item>
            <Descriptions.Item label="总数量">{detail?.quantity ?? '--'}</Descriptions.Item>
            <Descriptions.Item label="SKU 行数">{detail?.itemCount ?? '--'}</Descriptions.Item>
            <Descriptions.Item label="要求发货时限">{detail?.deadlineAt ?? '--'}</Descriptions.Item>
            <Descriptions.Item label="仓提示">{detail?.warehouseHint ?? '--'}</Descriptions.Item>
            <Descriptions.Item label="收件人">{detail?.receiverName ?? '--'}</Descriptions.Item>
          </Descriptions>
          <Table<SaleFulfillmentDemandLine>
            style={{ marginTop: 16 }}
            rowKey="id"
            columns={lineColumns}
            dataSource={detail?.lines ?? []}
            loading={detailLoading}
            pagination={false}
            scroll={{ x: 900 }}
          />
        </Card>
      </Drawer>
    </Space>
  );
};

export default SaleFulfillments;
