import { useEffect, useMemo, useState } from 'react';
import { Button, Card, Drawer, Input, Space, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useTenant } from '../contexts/tenant';
import { fetchSalesOrderDetail, fetchSalesOrders } from '../api/sales';
import type { SalesOrder, SalesOrderDetail } from '../types/sales';

const statusColor: Record<string, string> = {
  PENDING: 'orange',
  PAID: 'blue',
  PROCESSING: 'gold',
  SHIPPED: 'green',
  COMPLETED: 'green',
  CANCELED: 'red',
};

const SalesOrders = () => {
  const { tenantId } = useTenant();
  const [data, setData] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [detail, setDetail] = useState<SalesOrderDetail | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetchSalesOrders({
        tenantId: Number(tenantId),
        keyword: keyword || undefined,
        page: 1,
        size: 20,
      });
      setData(response.items);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, [keyword]);

  const columns = useMemo<ColumnsType<SalesOrder>>(
    () => [
      { title: '平台订单号', dataIndex: 'platformOrderId', key: 'platformOrderId' },
      { title: '内部订单号', dataIndex: 'orderNo', key: 'orderNo' },
      { title: '客户', dataIndex: 'buyerName', key: 'buyerName' },
      { title: '金额', dataIndex: 'totalAmount', key: 'totalAmount' },
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
              const detailData = await fetchSalesOrderDetail(record.id, Number(tenantId));
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
      title="销售订单"
      extra={
        <Space>
          <Input.Search
            placeholder="搜索订单号/客户"
            allowClear
            onSearch={(value) => setKeyword(value)}
            style={{ width: 220 }}
          />
        </Space>
      }
    >
      <Table rowKey="id" columns={columns} dataSource={data} loading={loading} />

      <Drawer
        title="订单详情"
        open={!!detail}
        onClose={() => setDetail(null)}
        width={640}
      >
        {detail && (
          <>
            <Card size="small" title="订单信息" style={{ marginBottom: 16 }}>
              <p>平台订单号：{detail.order.platformOrderId}</p>
              <p>内部订单号：{detail.order.orderNo || '-'}</p>
              <p>客户：{detail.order.buyerName || '-'}</p>
              <p>状态：{detail.order.status}</p>
            </Card>
            <Card size="small" title="商品明细">
              <Table
                rowKey="id"
                pagination={false}
                dataSource={detail.lines}
                columns={[
                  { title: '平台行号', dataIndex: 'platformLineId', key: 'platformLineId' },
                  { title: '平台 SKU', dataIndex: 'platformSku', key: 'platformSku' },
                  { title: '数量', dataIndex: 'quantity', key: 'quantity' },
                  { title: '金额', dataIndex: 'amount', key: 'amount' },
                ]}
              />
            </Card>
          </>
        )}
      </Drawer>
    </Card>
  );
};

export default SalesOrders;
