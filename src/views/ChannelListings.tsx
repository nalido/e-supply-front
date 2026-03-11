import { useEffect, useMemo, useState } from 'react';
import { Button, Card, Form, Input, Modal, Select, Space, Table, Tag, Tooltip, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useTenant } from '../contexts/tenant';
import {
  createSalesListing,
  deleteSalesListing,
  fetchChannelAccounts,
  fetchSalesListings,
  submitSalesListing,
  updateSalesListing,
} from '../api/channel';
import type { ChannelAccount, SalesListing } from '../types/channel';

const statusColor: Record<string, string> = {
  DRAFT: 'default',
  SUBMITTED: 'blue',
  PUBLISHED: 'green',
  FAILED: 'red',
  OFFLINE: 'orange',
};

const templatePayload = JSON.stringify(
  {
    bindSiteIds: [1],
    productName: 'Kids Hoodie',
    productPropertyReqs: [
      {
        pid: 0,
        templatePid: 0,
        vid: 0,
        propName: 'Material',
        propValue: 'Cotton',
        refPid: 0,
        valueUnit: '',
      },
    ],
    skcList: [
      {
        skcName: 'Kids Hoodie',
        skcCode: 'KIDS-HOODIE',
        carouselImageUrls: ['https://example.com/hoodie-3x4.jpg'],
        skuList: [
          {
            sku: 'KIDS-HOODIE-BLUE-120',
            price: 19.9,
            stock: 100,
            skuImage: 'https://example.com/hoodie-1x1.jpg',
          },
        ],
      },
    ],
  },
  null,
  2,
);

const ChannelListings = () => {
  const { tenantId } = useTenant();
  const [data, setData] = useState<SalesListing[]>([]);
  const [accounts, setAccounts] = useState<ChannelAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<string | undefined>();
  const [accountId, setAccountId] = useState<number | undefined>();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SalesListing | null>(null);
  const [form] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [listings, accountResp] = await Promise.all([
        fetchSalesListings({
          tenantId: Number(tenantId),
          keyword: keyword || undefined,
          status,
          channelAccountId: accountId,
          page: 0,
          size: 20,
        }),
        fetchChannelAccounts({ tenantId: Number(tenantId), page: 1, size: 50 }),
      ]);
      setData(listings.items);
      setAccounts(accountResp.items);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, [keyword, status, accountId]);

  const columns = useMemo<ColumnsType<SalesListing>>(
    () => [
      {
        title: '平台账号',
        dataIndex: 'channelAccountId',
        key: 'channelAccountId',
        render: (value: number) => accounts.find((item) => item.id === value)?.name || value,
      },
      { title: '商品名称', dataIndex: 'productName', key: 'productName' },
      { title: '内部 SKU', dataIndex: 'sku', key: 'sku' },
      { title: '平台 SKU', dataIndex: 'platformSku', key: 'platformSku' },
      { title: '平台商品ID', dataIndex: 'platformProductId', key: 'platformProductId' },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        render: (value: string) => <Tag color={statusColor[value] || 'blue'}>{value}</Tag>,
      },
      {
        title: '异常',
        dataIndex: 'errorMessage',
        key: 'errorMessage',
        render: (value?: string) =>
          value ? (
            <Tooltip title={value}>
              <span style={{ color: '#cf1322' }}>查看</span>
            </Tooltip>
          ) : (
            '-'
          ),
      },
      {
        title: '操作',
        key: 'actions',
        render: (_, record) => (
          <Space>
            <Button
              size="small"
              onClick={() => {
                setEditing(record);
                form.setFieldsValue({
                  ...record,
                  payloadJson: record.payloadJson || '',
                });
                setOpen(true);
              }}
            >
              编辑
            </Button>
            <Button
              size="small"
              onClick={async () => {
                await submitSalesListing(record.id, { tenantId: Number(tenantId), dryRun: true });
                message.success('已模拟提交');
                void fetchData();
              }}
            >
              模拟提交
            </Button>
            <Button
              size="small"
              type="primary"
              onClick={async () => {
                await submitSalesListing(record.id, { tenantId: Number(tenantId), dryRun: false });
                message.success('已提交到平台');
                void fetchData();
              }}
            >
              提交
            </Button>
            <Button
              danger
              size="small"
              onClick={async () => {
                await deleteSalesListing(record.id, Number(tenantId));
                message.success('已删除');
                void fetchData();
              }}
            >
              删除
            </Button>
          </Space>
        ),
      },
    ],
    [accounts, tenantId],
  );

  return (
    <Card
      title="商品上架"
      extra={
        <Space>
          <Input.Search
            placeholder="搜索名称/SKU"
            allowClear
            onSearch={(value) => setKeyword(value)}
            style={{ width: 200 }}
          />
          <Select
            placeholder="状态"
            allowClear
            style={{ width: 160 }}
            value={status}
            onChange={(value) => setStatus(value)}
            options={[
              { label: '草稿', value: 'DRAFT' },
              { label: '已提交', value: 'SUBMITTED' },
              { label: '已发布', value: 'PUBLISHED' },
              { label: '失败', value: 'FAILED' },
              { label: '下架', value: 'OFFLINE' },
            ]}
          />
          <Select
            placeholder="平台账号"
            allowClear
            style={{ width: 200 }}
            value={accountId}
            onChange={(value) => setAccountId(value)}
            options={accounts.map((item) => ({ label: item.name, value: item.id }))}
          />
          <Button
            type="primary"
            onClick={() => {
              setEditing(null);
              form.resetFields();
              form.setFieldsValue({
                platform: 'TEMU',
                listingType: 'bg.glo.goods.add',
                payloadJson: templatePayload,
              });
              setOpen(true);
            }}
          >
            新增上架
          </Button>
        </Space>
      }
    >
      <Table rowKey="id" columns={columns} dataSource={data} loading={loading} />

      <Modal
        title={editing ? '编辑上架' : '新增上架'}
        open={open}
        onCancel={() => setOpen(false)}
        width={720}
        onOk={async () => {
          const values = await form.validateFields();
          const payload = {
            tenantId: Number(tenantId),
            channelAccountId: values.channelAccountId,
            shopId: values.shopId,
            platform: values.platform,
            listingType: values.listingType,
            sku: values.sku,
            platformSku: values.platformSku,
            productName: values.productName,
            payloadJson: values.payloadJson,
          };
          if (editing) {
            await updateSalesListing(editing.id, payload);
            message.success('已更新');
          } else {
            await createSalesListing(payload);
            message.success('已创建');
          }
          setOpen(false);
          void fetchData();
        }}
      >
        <Form form={form} layout="vertical">
          <Form.Item label="平台账号" name="channelAccountId" rules={[{ required: true }]}> 
            <Select options={accounts.map((item) => ({ label: item.name, value: item.id }))} />
          </Form.Item>
          <Form.Item label="平台" name="platform" rules={[{ required: true }]}> 
            <Select options={[{ label: 'TEMU', value: 'TEMU' }]} />
          </Form.Item>
          <Form.Item label="接口类型" name="listingType" rules={[{ required: true }]}> 
            <Input placeholder="bg.glo.goods.add" />
          </Form.Item>
          <Form.Item label="商品名称" name="productName">
            <Input />
          </Form.Item>
          <Form.Item label="内部 SKU" name="sku">
            <Input />
          </Form.Item>
          <Form.Item label="平台 SKU" name="platformSku">
            <Input />
          </Form.Item>
          <Form.Item label="上架 Payload(JSON)" name="payloadJson" rules={[{ required: true }]}> 
            <Input.TextArea rows={10} />
          </Form.Item>
          <div style={{ color: '#8c8c8c', fontSize: 12 }}>
            Temu 上架字段较多，请按文档补齐 payload。服饰类目图片需满足 3:4 比例要求。
          </div>
        </Form>
      </Modal>
    </Card>
  );
};

export default ChannelListings;
