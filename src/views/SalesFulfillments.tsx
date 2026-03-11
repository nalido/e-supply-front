import { useEffect, useMemo, useState } from 'react';
import { Button, Card, Drawer, Space, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useTenant } from '../contexts/tenant';
import { fetchFulfillmentDetail, fetchFulfillments } from '../api/sales';
import type { SalesFulfillment, SalesFulfillmentDetail } from '../types/sales';

const statusColor: Record<string, string> = {
  PENDING: 'orange',
  SHIPPED: 'blue',
  DELIVERED: 'green',
  CANCELED: 'red',
};

const SalesFulfillments = () => {
  const { tenantId } = useTenant();
  const [data, setData] = useState<SalesFulfillment[]>([]);
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<SalesFulfillmentDetail | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetchFulfillments({ tenantId: Number(tenantId), page: 1, size: 20 });
      setData(response.items);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, []);

  const columns = useMemo<ColumnsType<SalesFulfillment>>(
    () => [
      { title: '履约单号', dataIndex: 'fulfillmentNo', key: 'fulfillmentNo' },
      { title: '订单 ID', dataIndex: 'salesOrderId', key: 'salesOrderId' },
      { title: '物流商', dataIndex: 'carrier', key: 'carrier' },
      { title: '运单号', dataIndex: 'trackingNo', key: 'trackingNo' },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        render: (value: string) => <Tag color={statusColor[value] || 'blue'}>{value}</Tag>,
      },
      {
        title: '操作',
        key: 'actions',
        render: (_, record) => (
          <Button
            size="small"
            onClick={async () => {
              const detailData = await fetchFulfillmentDetail(record.id, Number(tenantId));
              setDetail(detailData);
            }}
          >
            详情
          </Button>
        ),
      },
    ],
    [tenantId],
  );

  return (
    <Card
      title="履约发货"
      extra={
        <Space>
          <Button onClick={() => fetchData()}>刷新</Button>
        </Space>
      }
    >
      <Table rowKey="id" columns={columns} dataSource={data} loading={loading} />

      <Drawer
        title="履约详情"
        open={!!detail}
        onClose={() => setDetail(null)}
        width={640}
      >
        {detail && (
          <>
            <Card size="small" title="履约信息" style={{ marginBottom: 16 }}>
              <p>履约单号：{detail.fulfillment.fulfillmentNo}</p>
              <p>状态：{detail.fulfillment.status}</p>
              <p>物流商：{detail.fulfillment.carrier || '-'}</p>
              <p>运单号：{detail.fulfillment.trackingNo || '-'}</p>
            </Card>
            <Card size="small" title="履约明细">
              <Table
                rowKey="id"
                pagination={false}
                dataSource={detail.lines}
                columns={[
                  { title: '订单行 ID', dataIndex: 'salesOrderLineId', key: 'salesOrderLineId' },
                  { title: '数量', dataIndex: 'quantity', key: 'quantity' },
                ]}
              />
            </Card>
          </>
        )}
      </Drawer>
    </Card>
  );
};

export default SalesFulfillments;
