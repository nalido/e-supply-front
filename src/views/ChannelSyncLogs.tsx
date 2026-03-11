import { useEffect, useMemo, useState } from 'react';
import { Button, Card, Space, Table, Tag, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useTenant } from '../contexts/tenant';
import { fetchChannelSyncLogs, fetchChannelAccounts } from '../api/channel';
import { pullTemuOrders, syncTemuInventory, syncTemuProducts } from '../api/integration';
import type { ChannelAccount, ChannelSyncLog } from '../types/channel';

const statusColor: Record<string, string> = {
  SUCCESS: 'green',
  FAILED: 'red',
  RUNNING: 'blue',
  PENDING: 'orange',
};

const ChannelSyncLogs = () => {
  const { tenantId } = useTenant();
  const [data, setData] = useState<ChannelSyncLog[]>([]);
  const [accounts, setAccounts] = useState<ChannelAccount[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [logs, accountResp] = await Promise.all([
        fetchChannelSyncLogs({ tenantId: Number(tenantId), page: 1, size: 20 }),
        fetchChannelAccounts({ tenantId: Number(tenantId), page: 1, size: 20 }),
      ]);
      setData(logs.items);
      setAccounts(accountResp.items);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, []);

  const columns = useMemo<ColumnsType<ChannelSyncLog>>(
    () => [
      {
        title: '平台账号',
        dataIndex: 'channelAccountId',
        key: 'channelAccountId',
        render: (value?: number) => accounts.find((item) => item.id === value)?.name || value,
      },
      { title: '任务类型', dataIndex: 'jobType', key: 'jobType' },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        render: (value: string) => <Tag color={statusColor[value] || 'blue'}>{value}</Tag>,
      },
      { title: '开始时间', dataIndex: 'startedAt', key: 'startedAt' },
      { title: '结束时间', dataIndex: 'finishedAt', key: 'finishedAt' },
      { title: '备注', dataIndex: 'message', key: 'message' },
    ],
    [accounts],
  );

  const trigger = async (fn: (payload: { tenantId: number; channelAccountId: number }) => Promise<unknown>) => {
    if (!accounts.length) {
      message.warning('请先创建平台账号');
      return;
    }
    await fn({ tenantId: Number(tenantId), channelAccountId: accounts[0].id });
    message.success('已触发同步');
    void fetchData();
  };

  return (
    <Card
      title="同步日志"
      extra={
        <Space>
          <Button onClick={() => trigger(pullTemuOrders)}>拉取订单</Button>
          <Button onClick={() => trigger(syncTemuProducts)}>同步商品</Button>
          <Button onClick={() => trigger(syncTemuInventory)}>同步库存</Button>
        </Space>
      }
    >
      <Table rowKey="id" columns={columns} dataSource={data} loading={loading} />
    </Card>
  );
};

export default ChannelSyncLogs;
