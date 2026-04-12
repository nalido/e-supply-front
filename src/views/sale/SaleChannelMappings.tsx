import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ColumnsType } from 'antd/es/table';
import { Button, Card, Form, Input, InputNumber, Popconfirm, Select, Space, Table, Tag, Typography, message } from 'antd';
import { saleApi } from '../../api/sale';
import type { SaleChannelAccount } from '../../types/sale';

type MappingRow = {
  id: string;
  channelAccountId: string;
  platformSpuId?: string;
  platformSkuId: string;
  platformSkuCode?: string;
  styleId?: string;
  styleVariantId?: string;
  warehouseId?: string;
  mappingStatus?: string;
  lastSyncedAt?: string;
  updatedAt?: string;
};

const SaleChannelMappings = () => {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [accounts, setAccounts] = useState<SaleChannelAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>();
  const [rows, setRows] = useState<MappingRow[]>([]);
  const [syncForm] = Form.useForm();
  const [createForm] = Form.useForm();
  const [updateForm] = Form.useForm();

  const accountOptions = useMemo(
    () => accounts.map((item) => ({ label: `${item.accountName} (${item.id})`, value: item.id })),
    [accounts],
  );

  const loadRows = useCallback(async (accountId?: string) => {
    setLoading(true);
    try {
      const list = await saleApi.listProductMappings({ channelAccountId: accountId || undefined });
      setRows(list);
    } catch (error) {
      console.error(error);
      message.error('加载商品映射失败');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAccounts = useCallback(async () => {
    try {
      const list = await saleApi.listChannelAccounts();
      setAccounts(list);
      if (!selectedAccountId && list[0]) {
        setSelectedAccountId(list[0].id);
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
    void loadRows(selectedAccountId);
  }, [selectedAccountId, loadRows]);

  const columns: ColumnsType<MappingRow> = [
    { title: '映射ID', dataIndex: 'id', width: 90 },
    { title: '平台SPU', dataIndex: 'platformSpuId', width: 130 },
    { title: '平台SKU', dataIndex: 'platformSkuId', width: 160 },
    { title: 'SKU编码', dataIndex: 'platformSkuCode', width: 140 },
    { title: 'styleId', dataIndex: 'styleId', width: 100 },
    { title: 'variantId', dataIndex: 'styleVariantId', width: 120 },
    {
      title: '状态',
      dataIndex: 'mappingStatus',
      width: 120,
      render: (value) => <Tag>{value ?? '--'}</Tag>,
    },
    { title: '更新时间', dataIndex: 'updatedAt', width: 180 },
  ];

  const handleSync = async () => {
    if (!selectedAccountId) {
      message.warning('请先选择渠道账号');
      return;
    }
    const values = await syncForm.validateFields();
    setSubmitting(true);
    try {
      await saleApi.syncProducts({
        channelAccountId: Number(selectedAccountId),
        page: values.page,
        pageSize: values.pageSize,
      });
      message.success('商品同步请求已提交');
      await loadRows(selectedAccountId);
    } catch (error) {
      console.error(error);
      message.error('商品同步失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreate = async () => {
    if (!selectedAccountId) {
      message.warning('请先选择渠道账号');
      return;
    }
    const values = await createForm.validateFields();
    setSubmitting(true);
    try {
      await saleApi.createProductMapping({
        channelAccountId: Number(selectedAccountId),
        platformSpuId: values.platformSpuId,
        platformSkuId: values.platformSkuId,
        platformSkuCode: values.platformSkuCode,
        styleId: values.styleId,
        styleVariantId: values.styleVariantId,
        warehouseId: values.warehouseId,
        mappingStatus: values.mappingStatus,
        remark: values.remark,
      });
      message.success('映射创建请求已提交');
      createForm.resetFields();
      await loadRows(selectedAccountId);
    } catch (error) {
      console.error(error);
      message.error('映射创建失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    const values = await updateForm.validateFields();
    setSubmitting(true);
    try {
      await saleApi.updateProductMapping(String(values.mappingId), {
        styleId: values.styleId,
        styleVariantId: values.styleVariantId,
        warehouseId: values.warehouseId,
        mappingStatus: values.mappingStatus,
        remark: values.remark,
      });
      message.success('映射更新请求已提交');
      updateForm.resetFields();
      await loadRows(selectedAccountId);
    } catch (error) {
      console.error(error);
      message.error('映射更新失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card>
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Typography.Title level={4} style={{ margin: 0 }}>
            商品映射
          </Typography.Title>
          <Space>
            <Select
              style={{ width: 320 }}
              options={accountOptions}
              value={selectedAccountId}
              onChange={setSelectedAccountId}
              placeholder="选择渠道账号"
            />
            <Button onClick={() => void loadRows(selectedAccountId)}>刷新</Button>
          </Space>
        </Space>
      </Card>
      <Card title="同步商品">
        <Form form={syncForm} layout="inline" initialValues={{ page: 1, pageSize: 20 }}>
          <Form.Item label="页码" name="page">
            <InputNumber min={1} />
          </Form.Item>
          <Form.Item label="每页" name="pageSize">
            <InputNumber min={1} max={100} />
          </Form.Item>
          <Form.Item>
            <Popconfirm title="确认同步商品到本地映射池？" onConfirm={() => void handleSync()} okText="确认" cancelText="取消">
              <Button type="primary" loading={submitting}>
                同步商品
              </Button>
            </Popconfirm>
          </Form.Item>
        </Form>
      </Card>
      <Card title="创建映射">
        <Form form={createForm} layout="inline">
          <Form.Item label="平台SPU" name="platformSpuId">
            <Input />
          </Form.Item>
          <Form.Item label="平台SKU" name="platformSkuId" rules={[{ required: true, message: '必填' }]}>
            <Input />
          </Form.Item>
          <Form.Item label="SKU编码" name="platformSkuCode">
            <Input />
          </Form.Item>
          <Form.Item label="styleId" name="styleId">
            <InputNumber min={1} />
          </Form.Item>
          <Form.Item label="variantId" name="styleVariantId">
            <InputNumber min={1} />
          </Form.Item>
          <Form.Item label="warehouseId" name="warehouseId">
            <InputNumber min={1} />
          </Form.Item>
          <Form.Item label="状态" name="mappingStatus">
            <Select
              style={{ width: 140 }}
              options={[
                { label: 'UNMAPPED', value: 'UNMAPPED' },
                { label: 'ACTIVE', value: 'ACTIVE' },
                { label: 'DISABLED', value: 'DISABLED' },
                { label: 'CONFLICT', value: 'CONFLICT' },
              ]}
            />
          </Form.Item>
          <Form.Item label="备注" name="remark">
            <Input />
          </Form.Item>
          <Form.Item>
            <Popconfirm title="确认创建映射？" onConfirm={() => void handleCreate()} okText="确认" cancelText="取消">
              <Button loading={submitting}>创建映射</Button>
            </Popconfirm>
          </Form.Item>
        </Form>
      </Card>
      <Card title="更新映射">
        <Form form={updateForm} layout="inline">
          <Form.Item label="映射ID" name="mappingId" rules={[{ required: true, message: '必填' }]}>
            <InputNumber min={1} />
          </Form.Item>
          <Form.Item label="styleId" name="styleId">
            <InputNumber min={1} />
          </Form.Item>
          <Form.Item label="variantId" name="styleVariantId">
            <InputNumber min={1} />
          </Form.Item>
          <Form.Item label="warehouseId" name="warehouseId">
            <InputNumber min={1} />
          </Form.Item>
          <Form.Item label="状态" name="mappingStatus">
            <Select
              style={{ width: 140 }}
              options={[
                { label: 'UNMAPPED', value: 'UNMAPPED' },
                { label: 'ACTIVE', value: 'ACTIVE' },
                { label: 'DISABLED', value: 'DISABLED' },
                { label: 'CONFLICT', value: 'CONFLICT' },
              ]}
            />
          </Form.Item>
          <Form.Item label="备注" name="remark">
            <Input />
          </Form.Item>
          <Form.Item>
            <Popconfirm title="确认更新映射？" onConfirm={() => void handleUpdate()} okText="确认" cancelText="取消">
              <Button loading={submitting}>更新映射</Button>
            </Popconfirm>
          </Form.Item>
        </Form>
      </Card>
      <Card>
        <Table<MappingRow>
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={rows}
          pagination={false}
          scroll={{ x: 1300 }}
        />
      </Card>
    </Space>
  );
};

export default SaleChannelMappings;
