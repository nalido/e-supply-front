import { useCallback, useEffect, useState } from 'react';
import type { ColumnsType } from 'antd/es/table';
import {
  Button,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  message,
} from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import type { Warehouse, WarehouseDataset, WarehouseType } from '../types';
import warehouseApi from '../api/warehouse';

const defaultPageSize = 10;

const warehouseTypeOptions: Array<{ label: string; value: WarehouseType }> = [
  { label: '物料仓', value: 'material' },
  { label: '成品仓', value: 'finished' },
];

type ModalState = {
  open: boolean;
  submitting: boolean;
  editing?: Warehouse;
};

type WarehouseFormValues = {
  name: string;
  type: WarehouseType;
  remarks?: string;
};

const WarehousePage = () => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [total, setTotal] = useState(0);
  const [dataset, setDataset] = useState<WarehouseDataset['list']>([]);
  const [loading, setLoading] = useState(false);
  const [modalState, setModalState] = useState<ModalState>({ open: false, submitting: false });
  const [form] = Form.useForm<WarehouseFormValues>();

  const loadData = useCallback(
    async (targetPage = page, targetPageSize = pageSize) => {
      try {
        setLoading(true);
        const result = await warehouseApi.list({ page: targetPage, pageSize: targetPageSize });
        setDataset(result.list);
        setPage(targetPage);
        setPageSize(targetPageSize);
        setTotal(result.total);
      } catch (error) {
        void error;
        message.error('加载仓库列表失败，请稍后重试');
      } finally {
        setLoading(false);
      }
    },
    [page, pageSize],
  );

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleCreate = () => {
    form.resetFields();
    setModalState({ open: true, submitting: false });
  };

  const handleEdit = (record: Warehouse) => {
    form.resetFields();
    form.setFieldsValue({ name: record.name, type: record.type, remarks: record.remarks });
    setModalState({ open: true, submitting: false, editing: record });
  };

  const handleSubmit = async () => {
    try {
      setModalState((prev) => ({ ...prev, submitting: true }));
      const values = await form.validateFields();
      if (modalState.editing) {
        await warehouseApi.update(modalState.editing.id, values);
        message.success('仓库信息已更新');
      } else {
        await warehouseApi.create(values);
        message.success('已创建仓库');
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
      const success = await warehouseApi.remove(id);
      if (!success) {
        message.warning('删除失败，请刷新后重试');
        return;
      }
      message.success('已删除仓库');
      const hasOnlyOneItem = dataset.length === 1;
      const nextPage = hasOnlyOneItem && page > 1 ? page - 1 : page;
      void loadData(nextPage);
    } catch {
      message.error('删除失败，请稍后重试');
    }
  };

  const columns: ColumnsType<Warehouse> = [
    {
      title: '序号',
      dataIndex: 'index',
      width: 80,
      align: 'center',
      render: (_, __, index) => (page - 1) * pageSize + index + 1,
    },
    {
      title: '名称',
      dataIndex: 'name',
      width: 240,
    },
    {
      title: '仓库类型',
      dataIndex: 'type',
      width: 160,
      render: (type: WarehouseType) => {
        const label = warehouseTypeOptions.find((item) => item.value === type)?.label ?? type;
        const color = type === 'material' ? 'processing' : 'success';
        return <Tag color={color}>{label}</Tag>;
      },
    },
    {
      title: '备注',
      dataIndex: 'remarks',
      ellipsis: true,
      render: (value?: string) => value ?? '-',
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
          <Popconfirm title="确定删除该仓库吗？" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" danger icon={<DeleteOutlined />}> 删除 </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ background: '#fff', padding: 24, borderRadius: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <div />
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          新建
        </Button>
      </div>

      <Table<Warehouse>
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
        onChange={(nextPagination) => {
          const current = nextPagination.current ?? 1;
          const size = nextPagination.pageSize ?? pageSize;
          void loadData(current, size);
        }}
      />

      <Modal
        title={modalState.editing ? '编辑仓库' : '新建仓库'}
        open={modalState.open}
        confirmLoading={modalState.submitting}
        onCancel={() => setModalState({ open: false, submitting: false, editing: undefined })}
        onOk={handleSubmit}
        destroyOnClose
        width={480}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="仓库名称" rules={[{ required: true, message: '请输入仓库名称' }]}>
            <Input maxLength={50} placeholder="请输入仓库名称" />
          </Form.Item>
          <Form.Item name="type" label="仓库类型" rules={[{ required: true, message: '请选择仓库类型' }]}>
            <Select options={warehouseTypeOptions} placeholder="请选择仓库类型" />
          </Form.Item>
          <Form.Item name="remarks" label="备注">
            <Input.TextArea rows={3} maxLength={120} placeholder="可填写容量、用途等信息" showCount />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default WarehousePage;
