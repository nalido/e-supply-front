import { Card, Col, Row, Statistic, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';

const quickOrders = [
  {
    key: 'ord-1',
    orderNo: 'TS-20260123-001',
    channel: 'Temu',
    amount: 268.0,
    status: '待履约',
  },
  {
    key: 'ord-2',
    orderNo: 'TS-20260123-002',
    channel: 'Temu',
    amount: 199.0,
    status: '发货中',
  },
  {
    key: 'ord-3',
    orderNo: 'TS-20260123-003',
    channel: 'Temu',
    amount: 520.0,
    status: '已完成',
  },
];

const columns: ColumnsType<typeof quickOrders[number]> = [
  { title: '订单号', dataIndex: 'orderNo', key: 'orderNo' },
  { title: '渠道', dataIndex: 'channel', key: 'channel' },
  { title: '金额', dataIndex: 'amount', key: 'amount' },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    render: (value: string) => {
      const color = value === '已完成' ? 'green' : value === '发货中' ? 'blue' : 'orange';
      return <Tag color={color}>{value}</Tag>;
    },
  },
];

const SalesDashboard = () => (
  <Row gutter={[16, 16]}>
    <Col span={24}>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="今日订单" value={128} suffix="单" />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="待履约" value={36} suffix="单" />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="发货中" value={52} suffix="单" />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="订单金额" value={35862} prefix="¥" />
          </Card>
        </Col>
      </Row>
    </Col>
    <Col span={24}>
      <Card title="最新订单">
        <Table columns={columns} dataSource={quickOrders} pagination={false} />
      </Card>
    </Col>
  </Row>
);

export default SalesDashboard;
