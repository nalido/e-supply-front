import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ColumnsType } from 'antd/es/table';
import { Button, Card, Select, Space, Table, Tabs, Tag, Typography, message } from 'antd';
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
                  scroll={{ x: 1300 }}
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
    </Space>
  );
};

export default SaleSyncLogs;
