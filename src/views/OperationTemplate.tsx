import { useCallback, useEffect, useState } from 'react';
import type { ColumnsType } from 'antd/es/table';
import {
  Button,
  Divider,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Space,
  Table,
  message,
} from 'antd';
import { DeleteOutlined, EditOutlined, MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import type {
  OperationTemplate,
  OperationTemplateOperation,
  OperationTemplateDataset,
} from '../types';
import operationTemplateApi from '../api/operation-template';

const defaultPageSize = 10;

type ModalState = {
  open: boolean;
  submitting: boolean;
  editing?: OperationTemplate;
};

type OperationTemplateFormValues = {
  name: string;
  operations: Array<{
    name: string;
    price: number;
    remarks?: string;
  }>;
};

const ensureOperations = (operations?: OperationTemplateOperation[]): OperationTemplateFormValues['operations'] =>
  (operations && operations.length
    ? operations.map((item) => ({ name: item.name, price: item.price, remarks: item.remarks }))
    : [{ name: '', price: 0 }]);

const OperationTemplatePage = () => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [total, setTotal] = useState(0);
  const [dataset, setDataset] = useState<OperationTemplateDataset['list']>([]);
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [modalState, setModalState] = useState<ModalState>({ open: false, submitting: false });
  const [form] = Form.useForm<OperationTemplateFormValues>();

  const loadData = useCallback(
    async (targetPage = page, targetPageSize = pageSize, search = keyword) => {
      try {
        setLoading(true);
        const result = await operationTemplateApi.list({
          page: targetPage,
          pageSize: targetPageSize,
          keyword: search || undefined,
        });
        setDataset(result.list);
        setPage(targetPage);
        setPageSize(targetPageSize);
        setTotal(result.total);
      } catch (error) {
        void error;
        message.error('加载工序模板失败，请稍后重试');
      } finally {
        setLoading(false);
      }
    },
    [keyword, page, pageSize],
  );

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleSearch = (value: string) => {
    const trimmed = value.trim();
    setKeyword(trimmed);
    void loadData(1, pageSize, trimmed);
  };

  const handleCreate = () => {
    form.resetFields();
    form.setFieldsValue({ operations: ensureOperations(), name: '' });
    setModalState({ open: true, submitting: false });
  };

  const handleEdit = (record: OperationTemplate) => {
    form.resetFields();
    form.setFieldsValue({ name: record.name, operations: ensureOperations(record.operations) });
    setModalState({ open: true, submitting: false, editing: record });
  };

  const handleSubmit = async () => {
    try {
      setModalState((prev) => ({ ...prev, submitting: true }));
      const values = await form.validateFields();
      if (modalState.editing) {
        await operationTemplateApi.update(modalState.editing.id, values);
        message.success('工序模板已更新');
      } else {
        await operationTemplateApi.create(values);
        message.success('工序模板已创建');
      }
      setModalState({ open: false, submitting: false, editing: undefined });
      void loadData();
    } catch (error) {
      if ((error as { errorFields?: unknown })?.errorFields) {
        setModalState((prev) => ({ ...prev, submitting: false }));
        return;
      }
      message.error('提交失败，请稍后重试');
      setModalState((prev) => ({ ...prev, submitting: false }));
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await operationTemplateApi.remove(id);
      message.success('已删除工序模板');
      const hasOnlyOneItem = dataset.length === 1;
      const nextPage = hasOnlyOneItem && page > 1 ? page - 1 : page;
      void loadData(nextPage);
    } catch {
      message.error('删除失败，请稍后重试');
    }
  };

  const columns: ColumnsType<OperationTemplate> = [
    {
      title: '序号',
      dataIndex: 'index',
      width: 80,
      align: 'center',
      render: (_, __, index) => (page - 1) * pageSize + index + 1,
    },
    {
      title: '模板名称',
      dataIndex: 'name',
      width: 240,
    },
    {
      title: '工序预览',
      dataIndex: 'operations',
      ellipsis: true,
      render: (operations: OperationTemplateOperation[]) =>
        operations
          .map((item) => `${item.name}（¥${item.price.toFixed(2)}）${item.remarks ? ` - ${item.remarks}` : ''}`)
          .join(' / '),
    },
    {
      title: '操作',
      dataIndex: 'actions',
      width: 160,
      align: 'center',
      render: (_, record) => (
        <Space size={8}>
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Popconfirm title="确定删除该模板吗？" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" danger icon={<DeleteOutlined />}> 删除 </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const handleTableChange = (nextPagination: { current?: number; pageSize?: number }) => {
    const current = nextPagination.current ?? 1;
    const size = nextPagination.pageSize ?? pageSize;
    void loadData(current, size);
  };

  return (
    <div style={{ background: '#fff', padding: 24, borderRadius: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, gap: 16 }}>
        <Input.Search
          allowClear
          placeholder="搜索模板名称或工序"
          onSearch={handleSearch}
          style={{ maxWidth: 280 }}
          enterButton
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          新建
        </Button>
      </div>
      <Table<OperationTemplate>
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={dataset}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => `${range[0]}-${range[1]} / 共 ${total} 条`,
        }}
        onChange={(nextPagination) => handleTableChange(nextPagination)}
      />

      <Modal
        title={modalState.editing ? '编辑工序模板' : '新建工序模板'}
        open={modalState.open}
        confirmLoading={modalState.submitting}
        onCancel={() => setModalState({ open: false, submitting: false, editing: undefined })}
        onOk={handleSubmit}
        destroyOnClose
        width={640}
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item
            name="name"
            label="模板名称"
            rules={[{ required: true, message: '请输入模板名称' }]}
          >
            <Input maxLength={40} placeholder="例如：童装标准工序" />
          </Form.Item>
          <Form.List name="operations">
            {(fields, { add, remove }) => (
              <div>
                <Divider orientation="left">工序列表</Divider>
                {fields.map((field, index) => (
                  <Space
                    key={field.key}
                    align="baseline"
                    style={{ width: '100%', marginBottom: 12, display: 'flex' }}
                  >
                    <Form.Item
                      {...field}
                      name={[field.name, 'name']}
                      fieldKey={[field.fieldKey ?? field.key, 'name']}
                      label={index === 0 ? '工序名称' : undefined}
                      rules={[{ required: true, message: '请输入工序名称' }]}
                      style={{ flex: 2 }}
                    >
                      <Input maxLength={30} placeholder="如：裁剪" />
                    </Form.Item>
                    <Form.Item
                      {...field}
                      name={[field.name, 'price']}
                      fieldKey={[field.fieldKey ?? field.key, 'price']}
                      label={index === 0 ? '工价（元）' : undefined}
                      rules={[{ required: true, message: '请输入工价' }]}
                      style={{ flex: 1 }}
                    >
                      <InputNumber min={0} precision={2} step={0.1} style={{ width: '100%' }} placeholder="0.00" />
                    </Form.Item>
                    <Form.Item
                      {...field}
                      name={[field.name, 'remarks']}
                      fieldKey={[field.fieldKey ?? field.key, 'remarks']}
                      label={index === 0 ? '备注' : undefined}
                      style={{ flex: 2 }}
                    >
                      <Input maxLength={60} placeholder="可选" />
                    </Form.Item>
                    {fields.length > 1 ? (
                      <Button
                        type="text"
                        danger
                        icon={<MinusCircleOutlined />}
                        onClick={() => remove(field.name)}
                      />
                    ) : null}
                  </Space>
                ))}
                <Button
                  type="dashed"
                  block
                  icon={<PlusOutlined />}
                  onClick={() => add({ name: '', price: 0 })}
                >
                  添加工序
                </Button>
              </div>
            )}
          </Form.List>
        </Form>
      </Modal>
    </div>
  );
};

export default OperationTemplatePage;
