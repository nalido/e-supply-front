import { Card, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';

const data = [
  { key: 'temu', channel: 'Temu', orders: 1200, revenue: 89200, fulfillment: '98%' },
  { key: 'tiktok', channel: 'TikTok', orders: 0, revenue: 0, fulfillment: '-' },
];

type ChannelRow = typeof data[number];

const columns: ColumnsType<ChannelRow> = [
  { title: '渠道', dataIndex: 'channel', key: 'channel' },
  { title: '订单量', dataIndex: 'orders', key: 'orders' },
  { title: '销售额', dataIndex: 'revenue', key: 'revenue' },
  {
    title: '履约率',
    dataIndex: 'fulfillment',
    key: 'fulfillment',
    render: (value: string) => <Tag color={value === '-' ? 'default' : 'green'}>{value}</Tag>,
  },
];

const ChannelPerformanceReport = () => (
  <Card title="渠道表现">
    <Table columns={columns} dataSource={data} pagination={false} />
  </Card>
);

export default ChannelPerformanceReport;
