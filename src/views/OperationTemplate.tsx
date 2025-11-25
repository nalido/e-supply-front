import { useCallback, useEffect, useState } from 'react';
import type { ColumnsType } from 'antd/es/table';
import {
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  message,
} from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import type {
  OperationTemplate,
  OperationTemplateDataset,
  OperationTemplateListParams,
  SaveOperationTemplatePayload,
} from '../types';
import operationTemplateApi from '../api/operation-template';
import processTypeApi from '../api/process-type';
import type { ProcessType } from '../types';
import DraggableOperationTable from '../components/DraggableOperationTable';
import type { TemplateOperationItem as OperationListItem } from '../components/DraggableOperationTable';

const defaultPageSize = 10;

type ModalState = {
  open: boolean;
  submitting: boolean;
  editing?: OperationTemplate;
};

type OperationTemplateFormValues = {
  name: string;
  defaultTemplate: boolean;
};

type OperationModalFormValues = {
  processCatalogId?: string;
  unitPrice?: number;
  remarks?: string;
};

type ProcessOption = Pick<ProcessType, 'id' | 'name' | 'code'>;

const mapOperationsToItems = (operations?: OperationTemplate['operations']): OperationListItem[] => {
  if (!operations?.length) {
    return [];
  }
  return [...operations]
    .sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0))
    .map((operation, index) => ({
      id: operation.id ?? `${operation.processCatalog?.id ?? 'operation'}-${index}`,
      processCatalogId: operation.processCatalog?.id,
      processName: operation.processCatalog?.name,
      processCode: operation.processCatalog?.code,
      unitPrice: operation.unitPrice,
      remarks: operation.remarks,
      sortOrder: index + 1,
      sequenceNo: index + 1,
    }));
};

const createOperationId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const OperationTemplatePage = () => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [total, setTotal] = useState(0);
  const [dataset, setDataset] = useState<OperationTemplateDataset['list']>([]);
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [modalState, setModalState] = useState<ModalState>({ open: false, submitting: false });
  const [processOptions, setProcessOptions] = useState<ProcessOption[]>([]);
  const [processLoading, setProcessLoading] = useState(false);
  const [form] = Form.useForm<OperationTemplateFormValues>();
  const [operationForm] = Form.useForm<OperationModalFormValues>();
  const [initialFormValues, setInitialFormValues] = useState<OperationTemplateFormValues>({
    name: '',
    defaultTemplate: false,
  });
  const [operationItems, setOperationItems] = useState<OperationListItem[]>([]);
  const [operationModalVisible, setOperationModalVisible] = useState(false);
  const [editingOperation, setEditingOperation] = useState<OperationListItem | null>(null);

  const mergeProcessOptions = useCallback((options: ProcessOption[]) => {
    if (!options.length) {
      return;
    }
    setProcessOptions((prev) => {
      const map = new Map(prev.map((option) => [option.id, option]));
      let changed = false;
      options.forEach((option) => {
        if (!option.id) {
          return;
        }
        const existing = map.get(option.id);
        if (!existing || existing.name !== option.name || existing.code !== option.code) {
          map.set(option.id, option);
          changed = true;
        }
      });
      return changed ? Array.from(map.values()) : prev;
    });
  }, []);

  const ensureCatalogOptionsFromOperations = useCallback(
    (operations?: OperationTemplate['operations']) => {
      if (!operations?.length) {
        return;
      }
      const nextOptions: ProcessOption[] = operations
        .map((operation) => operation.processCatalog)
        .filter((catalog): catalog is NonNullable<typeof catalog> => Boolean(catalog))
        .map((catalog) => ({
          id: catalog.id,
          name: catalog.name ?? '未命名工序',
          code: catalog.code,
        }));
      mergeProcessOptions(nextOptions);
    },
    [mergeProcessOptions],
  );

  const ensureCatalogOptionsFromTemplates = useCallback(
    (templates: OperationTemplate[]) => {
      if (!templates.length) {
        return;
      }
      const operations = templates.flatMap((template) => template.operations ?? []);
      ensureCatalogOptionsFromOperations(operations);
    },
    [ensureCatalogOptionsFromOperations],
  );

  const loadData = useCallback(
    async (params?: Partial<OperationTemplateListParams>) => {
      setLoading(true);
      try {
        const currentPage = params?.page ?? page;
        const currentSize = params?.pageSize ?? pageSize;
        const response = await operationTemplateApi.list({
          page: currentPage,
          pageSize: currentSize,
          keyword: (params?.keyword ?? keyword.trim()) || undefined,
        });
        setDataset(response.list);
        ensureCatalogOptionsFromTemplates(response.list);
        setTotal(response.total);
        setPage(currentPage);
        setPageSize(currentSize);
      } catch (error) {
        console.error('Failed to load operation templates', error);
        message.error('加载工序模板失败，请稍后重试');
      } finally {
        setLoading(false);
      }
    },
    [keyword, page, pageSize, ensureCatalogOptionsFromTemplates],
  );

  const loadProcessOptions = useCallback(async () => {
    setProcessLoading(true);
    try {
      const response = await processTypeApi.hot();
      mergeProcessOptions(response.map((item) => ({ id: item.id, name: item.name, code: item.code })));
    } catch (error) {
      console.error('Failed to load process catalog options', error);
      message.error('获取加工类型选项失败');
    } finally {
      setProcessLoading(false);
    }
  }, [mergeProcessOptions]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    loadProcessOptions();
  }, [loadProcessOptions]);

  useEffect(() => {
    if (!modalState.open) {
      setOperationModalVisible(false);
      setEditingOperation(null);
      operationForm.resetFields();
      return;
    }
    form.setFieldsValue(initialFormValues);
  }, [form, initialFormValues, modalState.open, operationForm]);

  const handleSearch = (value: string) => {
    const trimmed = value.trim();
    setKeyword(trimmed);
    void loadData({ page: 1, keyword: trimmed });
  };

  const handleCreate = () => {
    setInitialFormValues({
      name: '',
      defaultTemplate: false,
    });
    setOperationItems([]);
    setModalState({ open: true, submitting: false });
  };

  const handleEdit = (record: OperationTemplate) => {
    ensureCatalogOptionsFromOperations(record.operations);
    setInitialFormValues({
      name: record.name,
      defaultTemplate: record.defaultTemplate,
    });
    setOperationItems(mapOperationsToItems(record.operations));
    setModalState({ open: true, submitting: false, editing: record });
  };

  const handleSubmit = async () => {
    try {
      setModalState((prev) => ({ ...prev, submitting: true }));
      const values = await form.validateFields();
      const normalizedOperations = (operationItems ?? [])
        .filter((operation) => operation.processCatalogId)
        .map((operation, index) => ({
          processCatalogId: operation.processCatalogId!,
          unitPrice: Number(operation.unitPrice ?? 0),
          remarks: operation.remarks,
          sequence: index + 1,
        }));
      const payload: SaveOperationTemplatePayload = {
        name: values.name,
        defaultTemplate: values.defaultTemplate,
        operations: normalizedOperations,
      };
      if (!payload.operations.length) {
        message.warning('请至少添加一个工序');
        setModalState((prev) => ({ ...prev, submitting: false }));
        return;
      }
      if (modalState.editing) {
        await operationTemplateApi.update(modalState.editing.id, payload);
        message.success('工序模板已更新');
      } else {
        await operationTemplateApi.create(payload);
        message.success('工序模板已创建');
      }
      setModalState({ open: false, submitting: false, editing: undefined });
      loadData();
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
      const success = await operationTemplateApi.remove(id);
      if (!success) {
        message.warning('删除失败，请刷新后重试');
        return;
      }
      message.success('已删除工序模板');
      const nextPage = dataset.length === 1 && page > 1 ? page - 1 : page;
      loadData({ page: nextPage });
    } catch {
      message.error('删除失败，请稍后重试');
    }
  };

  const handleOperationsChange = (items: OperationListItem[]) => {
    setOperationItems(items);
  };

  const handleAddOperationItem = () => {
    setEditingOperation(null);
    operationForm.resetFields();
    setOperationModalVisible(true);
  };

  const handleEditOperationItem = (operation: OperationListItem) => {
    setEditingOperation(operation);
    operationForm.setFieldsValue({
      processCatalogId: operation.processCatalogId,
      unitPrice: operation.unitPrice,
      remarks: operation.remarks,
    });
    setOperationModalVisible(true);
  };

  const handleDeleteOperationItem = (operationId: string) => {
    setOperationItems((prev) => {
      const filtered = prev.filter((operation) => operation.id !== operationId);
      return filtered.map((operation, index) => ({
        ...operation,
        sortOrder: index + 1,
        sequenceNo: index + 1,
      }));
    });
    message.success('删除工序成功');
  };

  const closeOperationModal = () => {
    setOperationModalVisible(false);
    setEditingOperation(null);
    operationForm.resetFields();
  };

  const handleOperationSubmit = async () => {
    try {
      const values = await operationForm.validateFields();
      const option = processOptions.find((item) => item.id === values.processCatalogId);
      if (editingOperation) {
        setOperationItems((prev) =>
          prev.map((operation) =>
            operation.id === editingOperation.id
              ? {
                  ...operation,
                  processCatalogId: values.processCatalogId,
                  processName: option?.name ?? operation.processName,
                  processCode: option?.code ?? operation.processCode,
                  unitPrice: values.unitPrice,
                  remarks: values.remarks,
                }
              : operation,
          ),
        );
        message.success('更新工序成功');
      } else {
        setOperationItems((prev) => {
          const nextIndex = prev.length;
          const newItem: OperationListItem = {
            id: createOperationId(),
            processCatalogId: values.processCatalogId,
            processName: option?.name ?? '未命名工序',
            processCode: option?.code,
            unitPrice: values.unitPrice,
            remarks: values.remarks,
            sortOrder: nextIndex + 1,
            sequenceNo: nextIndex + 1,
          };
          return [...prev, newItem];
        });
        message.success('添加工序成功');
      }
      closeOperationModal();
    } catch {
      // ignore validation errors
    }
  };

  const columns: ColumnsType<OperationTemplate> = [
    {
      title: '序号',
      dataIndex: 'index',
      width: 80,
      align: 'center',
      render: (_value, _record, index) => (page - 1) * pageSize + index + 1,
    },
    {
      title: '模板名称',
      dataIndex: 'name',
      width: 240,
      render: (value: string, record) => (
        <Space>
          <span>{value}</span>
          {record.defaultTemplate ? <Tag color="blue">默认</Tag> : null}
        </Space>
      ),
    },
    {
      title: '工序列表',
      dataIndex: 'operations',
      ellipsis: true,
      render: (operations: OperationTemplate['operations']) =>
        operations?.length ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {operations.map((operation) => (
              <div key={operation.id}>
                <Tag color="processing" style={{ marginRight: 8 }}>
                  {operation.processCatalog?.name ?? '未知工序'}
                </Tag>
                <span style={{ color: '#555' }}>¥{operation.unitPrice?.toFixed(2)}</span>
                {operation.remarks ? <span style={{ marginLeft: 8, color: '#999' }}>{operation.remarks}</span> : null}
              </div>
            ))}
          </div>
        ) : (
          <span>-</span>
        ),
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      width: 180,
      render: (value?: string) => value ?? '-',
    },
    {
      title: '操作',
      dataIndex: 'actions',
      width: 160,
      align: 'center',
      render: (_value, record) => (
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

  return (
    <div style={{ background: '#fff', padding: 24, borderRadius: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, gap: 16 }}>
        <Input.Search
          allowClear
          placeholder="搜索模板名称"
          onSearch={handleSearch}
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
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
          showTotal: (totalValue, range) => `${range[0]}-${range[1]} / 共 ${totalValue} 条`,
        }}
        onChange={(nextPagination) => {
          const current = nextPagination.current ?? 1;
          const size = nextPagination.pageSize ?? pageSize;
          loadData({ page: current, pageSize: size });
        }}
      />

      <Modal
        title={modalState.editing ? '编辑工序模板' : '新建工序模板'}
        open={modalState.open}
        confirmLoading={modalState.submitting}
        onCancel={() => setModalState({ open: false, submitting: false, editing: undefined })}
        onOk={handleSubmit}
        destroyOnHidden
        width={800}
      >
        <Form
          key={modalState.editing ? modalState.editing.id : 'create'}
          form={form}
          layout="vertical"
          preserve={false}
          initialValues={initialFormValues}
        >
          <Form.Item
            name="name"
            label="模板名称"
            rules={[{ required: true, message: '请输入模板名称' }]}
          >
            <Input maxLength={40} placeholder="例如：童装标准工序" />
          </Form.Item>
          <Form.Item name="defaultTemplate" label="设为默认模板" valuePropName="checked">
            <Switch />
          </Form.Item>
          <div style={{ marginTop: 16 }}>
            <div
              style={{
                marginBottom: 16,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span style={{ fontWeight: 500 }}>工序列表</span>
              <Button type="link" icon={<PlusOutlined />} onClick={handleAddOperationItem}>
                添加工序
              </Button>
            </div>
            <DraggableOperationTable
              operations={operationItems}
              onOperationsChange={handleOperationsChange}
              onEditOperation={handleEditOperationItem}
              onDeleteOperation={handleDeleteOperationItem}
            />
          </div>
        </Form>
      </Modal>

      <Modal
        title={editingOperation ? '编辑工序' : '添加工序'}
        open={operationModalVisible}
        onOk={handleOperationSubmit}
        onCancel={closeOperationModal}
        destroyOnHidden
      >
        <Form form={operationForm} layout="vertical">
          <Form.Item
            name="processCatalogId"
            label="工序"
            rules={[{ required: true, message: '请选择工序' }]}
          >
            <Select
              showSearch
              placeholder="选择工序"
              options={processOptions.map((option) => ({
                value: option.id,
                label: option.code ? `${option.name}（${option.code}）` : option.name,
              }))}
              loading={processLoading}
              optionFilterProp="label"
            />
          </Form.Item>
          <Form.Item
            name="unitPrice"
            label="工价（元）"
            rules={[{ required: true, message: '请输入工价' }]}
          >
            <InputNumber min={0} precision={2} step={0.1} style={{ width: '100%' }} placeholder="0.00" />
          </Form.Item>
          <Form.Item name="remarks" label="备注">
            <Input maxLength={60} placeholder="可选" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
export default OperationTemplatePage;
