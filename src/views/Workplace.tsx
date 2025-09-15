import { Card, Col, Row, Statistic, Table, Typography, Tabs, Empty } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import api from '../api/mock';

type DeliveryRow = {
  id: string;
  orderNo: string;
  styleName: string;
  org: string;
  date: string;
  qty: number;
  type?: string;
};

const columnsFactory = (withType: boolean): ColumnsType<DeliveryRow> => {
  const base: ColumnsType<DeliveryRow> = [
    { title: '工厂订单', dataIndex: 'orderNo', width: 160 },
    { title: '款式资料', dataIndex: 'styleName' },
    { title: '客户/加工厂', dataIndex: 'org', width: 120 },
    { title: '交货日期', dataIndex: 'date', width: 120 },
    { title: '数量', dataIndex: 'qty', width: 100 },
  ];
  return withType ? [...base, { title: '加工类型', dataIndex: 'type', width: 120 }] : base;
};

const dataFactory = (n: number, withType: boolean): DeliveryRow[] =>
  Array.from({ length: n }).map((_, i) => ({
    id: `${i}`,
    orderNo: `2025${String(i).padStart(6, '0')}`,
    styleName: ['儿童拉毛卫裤X106', '华夫格短裤ET0302', '拼接连帽卫衣ET0036'][i % 3],
    org: ['本厂', '石狮', '刘国华'][i % 3],
    date: dayjs().add(i % 10, 'day').format('YYYY-MM-DD'),
    qty: [60, 150, 375, 624, 1848][i % 5],
    type: withType ? ['车缝', '打扣', '激光开袋'][i % 3] : undefined,
  }));

const Workplace = () => {
  // 后续可以接入 SWR/React Query，这里直接调用 mock
  // 统计卡片暂用静态值，表格走 mock
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const data = dataFactory(12, true);
  return (
    <div>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <Card><Statistic title="新单" value={332010} /></Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card><Statistic title="打板（年）" value={379} /></Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card><Statistic title="生产进行（年）" value={820233} /></Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card><Statistic title="已出货（年）" value={591501} /></Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={24}>
          <Card title={<Typography.Title level={5}>7天待交货列表（客户）</Typography.Title>}>
            <Table
              rowKey="id"
              columns={columnsFactory(false)}
              dataSource={[]}
              pagination={{ pageSize: 10 }}
              locale={{ emptyText: <Empty description="无数据" /> }}
            />
          </Card>
        </Col>
        <Col span={24}>
          <Card title={<Typography.Title level={5}>7天待交货列表（加工厂）</Typography.Title>}>
            <Tabs
              items={[
                {
                  key: 'list',
                  label: '列表',
                  children: (
                    <Table rowKey="id" columns={columnsFactory(true)} dataSource={data} pagination={{ pageSize: 10 }} />
                  ),
                },
              ]}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Workplace;


