import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ColumnsType } from 'antd/es/table';
import { Button, Card, Descriptions, Modal, Select, Space, Table, Tabs, Tag, Typography, message } from 'antd';
import { saleApi } from '../../api/sale';
import type {
  SaleChannelAccount,
  SaleIdempotencyRecordItem,
  SaleRetryCandidateItem,
  SaleSyncLogItem,
} from '../../types/sale';

const SaleSyncLogs = () => {
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<SaleChannelAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>();
  const [syncLogs, setSyncLogs] = useState<SaleSyncLogItem[]>([]);
  const [retryCandidates, setRetryCandidates] = useState<SaleRetryCandidateItem[]>([]);
  const [idempotencyRecords, setIdempotencyRecords] = useState<SaleIdempotencyRecordItem[]>([]);
  const [detailLog, setDetailLog] = useState<SaleSyncLogItem | null>(null);

  const accountOptions = useMemo(
    () => [{ label: '全部账号', value: '' }, ...accounts.map((item) => ({ label: `${item.accountName} (${item.id})`, value: item.id }))],
    [accounts],
  );

  const loadAll = useCallback(async (accountId?: string) => {
    setLoading(true);
    try {
      const [logs, retries, idempotencies] = await Promise.all([
        saleApi.listSyncLogs({ channelAccountId: accountId || undefined }),
        saleApi.listRetryCandidates({ channelAccountId: accountId || undefined }),
        saleApi.listIdempotencyRecords(),
      ]);
      setSyncLogs(logs);
      setRetryCandidates(retries);
      setIdempotencyRecords(idempotencies);
    } catch (error) {
      console.error(error);
      message.error('加载同步治理数据失败');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAccounts = useCallback(async () => {
    try {
      const list = await saleApi.listChannelAccounts();
      setAccounts(list);
      if (selectedAccountId === undefined) {
        setSelectedAccountId('');
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
    void loadAll(selectedAccountId);
  }, [selectedAccountId, loadAll]);

  const handleCopyPayload = useCallback(async (label: string, value?: string | null) => {
    if (!value) {
      message.warning(`暂无${label}`);
      return;
    }
    try {
      await navigator.clipboard.writeText(value);
      message.success(`${label}已复制`);
    } catch (error) {
      console.error(error);
      message.error(`${label}复制失败`);
    }
  }, []);

  const syncLogColumns: ColumnsType<SaleSyncLogItem> = [
    { title: '日志ID', dataIndex: 'id', width: 90 },
    { title: '业务类型', dataIndex: 'bizType', width: 160 },
    { title: '请求ID', dataIndex: 'requestId', width: 220 },
    {
      title: '结果',
      dataIndex: 'success',
      width: 90,
      render: (v: boolean) => <Tag color={v ? 'green' : 'red'}>{v ? 'SUCCESS' : 'FAILED'}</Tag>,
    },
    { title: '错误码', dataIndex: 'errorCode', width: 110 },
    { title: '错误信息', dataIndex: 'errorMessage', ellipsis: true },
    { title: '发生时间', dataIndex: 'occurredAt', width: 190 },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      fixed: 'right',
      render: (_, record) => (
        <Button
          type="link"
          onClick={(event) => {
            event.stopPropagation();
            setDetailLog(record);
          }}
        >
          查看详情
        </Button>
      ),
    },
  ];

  const retryColumns: ColumnsType<SaleRetryCandidateItem> = [
    { title: '来源日志ID', dataIndex: 'syncLogId', width: 100 },
    { title: '业务类型', dataIndex: 'bizType', width: 170 },
    { title: '请求ID', dataIndex: 'requestId', width: 220 },
    { title: '错误码', dataIndex: 'errorCode', width: 110 },
    { title: '错误信息', dataIndex: 'errorMessage', ellipsis: true },
    {
      title: '可重试',
      dataIndex: 'retryable',
      width: 90,
      render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? 'YES' : 'NO'}</Tag>,
    },
    { title: '建议动作', dataIndex: 'retryAction', width: 280 },
    { title: '发生时间', dataIndex: 'occurredAt', width: 190 },
  ];

  const idempotencyColumns: ColumnsType<SaleIdempotencyRecordItem> = [
    { title: '记录ID', dataIndex: 'id', width: 90 },
    { title: '业务类型', dataIndex: 'bizType', width: 170 },
    { title: '幂等键', dataIndex: 'idempotencyKey', width: 320 },
    { title: '业务引用', dataIndex: 'bizRefId', width: 140 },
    { title: '状态', dataIndex: 'status', width: 120 },
    { title: '过期时间', dataIndex: 'expiredAt', width: 190 },
    { title: '更新时间', dataIndex: 'updatedAt', width: 190 },
  ];

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card>
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Typography.Title level={4} style={{ margin: 0 }}>
            同步日志与重试治理
          </Typography.Title>
          <Space>
            <Select
              style={{ width: 320 }}
              options={accountOptions}
              value={selectedAccountId}
              onChange={setSelectedAccountId}
              placeholder="选择渠道账号"
            />
            <Button onClick={() => void loadAll(selectedAccountId)}>刷新</Button>
          </Space>
        </Space>
      </Card>
      <Card loading={loading}>
        <Tabs
          items={[
            {
              key: 'sync-logs',
              label: `同步日志 (${syncLogs.length})`,
              children: (
                <Table<SaleSyncLogItem>
                  rowKey="id"
                  columns={syncLogColumns}
                  dataSource={syncLogs}
                  pagination={false}
                  scroll={{ x: 1420 }}
                  onRow={(record) => ({
                    onClick: () => setDetailLog(record),
                    style: { cursor: 'pointer' },
                  })}
                />
              ),
            },
            {
              key: 'retry',
              label: `重试候选 (${retryCandidates.length})`,
              children: (
                <Table<SaleRetryCandidateItem>
                  rowKey="syncLogId"
                  columns={retryColumns}
                  dataSource={retryCandidates}
                  pagination={false}
                  scroll={{ x: 1400 }}
                />
              ),
            },
            {
              key: 'idempotency',
              label: `幂等记录 (${idempotencyRecords.length})`,
              children: (
                <Table<SaleIdempotencyRecordItem>
                  rowKey="id"
                  columns={idempotencyColumns}
                  dataSource={idempotencyRecords}
                  pagination={false}
                  scroll={{ x: 1300 }}
                />
              ),
            },
          ]}
        />
      </Card>
      <Modal
        title={detailLog ? `同步日志详情 #${detailLog.id}` : '同步日志详情'}
        open={detailLog !== null}
        onCancel={() => setDetailLog(null)}
        footer={null}
        width={960}
        destroyOnClose
      >
        {detailLog ? (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Descriptions column={2} size="small" bordered>
              <Descriptions.Item label="日志ID">{detailLog.id}</Descriptions.Item>
              <Descriptions.Item label="账号ID">{detailLog.channelAccountId ?? '--'}</Descriptions.Item>
              <Descriptions.Item label="业务类型">{detailLog.bizType ?? '--'}</Descriptions.Item>
              <Descriptions.Item label="请求ID">{detailLog.requestId ?? '--'}</Descriptions.Item>
              <Descriptions.Item label="幂等键">{detailLog.idempotencyKey ?? '--'}</Descriptions.Item>
              <Descriptions.Item label="HTTP状态">{detailLog.httpStatus ?? '--'}</Descriptions.Item>
              <Descriptions.Item label="结果">
                <Tag color={detailLog.success ? 'green' : 'red'}>{detailLog.success ? 'SUCCESS' : 'FAILED'}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="错误码">{detailLog.errorCode ?? '--'}</Descriptions.Item>
              <Descriptions.Item label="错误信息" span={2}>
                {detailLog.errorMessage ?? '--'}
              </Descriptions.Item>
              <Descriptions.Item label="发生时间">{detailLog.occurredAt ?? '--'}</Descriptions.Item>
              <Descriptions.Item label="创建时间">{detailLog.createdAt ?? '--'}</Descriptions.Item>
            </Descriptions>
            <Card
              size="small"
              title="请求报文"
              extra={
                <Button type="link" onClick={() => void handleCopyPayload('请求报文', detailLog.requestPayloadJson)}>
                  复制
                </Button>
              }
            >
              <Typography.Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }} code>
                {detailLog.requestPayloadJson ?? '--'}
              </Typography.Paragraph>
            </Card>
            <Card
              size="small"
              title="返回报文"
              extra={
                <Button type="link" onClick={() => void handleCopyPayload('返回报文', detailLog.responsePayloadJson)}>
                  复制
                </Button>
              }
            >
              <Typography.Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }} code>
                {detailLog.responsePayloadJson ?? '--'}
              </Typography.Paragraph>
            </Card>
          </Space>
        ) : null}
      </Modal>
    </Space>
  );
};

export default SaleSyncLogs;
