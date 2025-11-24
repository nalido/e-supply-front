import { useCallback, useEffect, useState } from 'react';
import { CSS } from '@dnd-kit/utilities';
import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import type { ColumnsType } from 'antd/es/table';
import {
  Button,
  Divider,
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
import { DeleteOutlined, EditOutlined, HolderOutlined, MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import type { FormListFieldData } from 'antd/es/form/FormList';
import type {
  OperationTemplate,
  OperationTemplateDataset,
  OperationTemplateListParams,
  SaveOperationTemplatePayload,
} from '../types';
import operationTemplateApi from '../api/operation-template';
import processTypeApi from '../api/process-type';
import type { ProcessType } from '../types';

const defaultPageSize = 10;

type ModalState = {
  open: boolean;
  submitting: boolean;
  editing?: OperationTemplate;
};

type OperationTemplateFormValues = {
  name: string;
  defaultTemplate: boolean;
  operations: Array<{
    processCatalogId?: string;
    unitPrice?: number;
    remarks?: string;
  }>;
};

const ensureOperations = (template?: OperationTemplate): OperationTemplateFormValues['operations'] => {
  if (!template || !template.operations?.length) {
    return [{ processCatalogId: undefined, unitPrice: undefined, remarks: undefined }];
  }
  return [...template.operations]
    .sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0))
    .map((operation) => ({
      processCatalogId: operation.processCatalog?.id,
      unitPrice: operation.unitPrice,
      remarks: operation.remarks,
    }));
};

type ProcessOption = Pick<ProcessType, 'id' | 'name' | 'code'>;

const operationGridTemplate = '60px 2.2fr 1fr 1.6fr 28px';

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
  const [initialFormValues, setInitialFormValues] = useState<OperationTemplateFormValues>({
    name: '',
    defaultTemplate: false,
    operations: ensureOperations(),
  });
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

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
      return;
    }
    form.setFieldsValue(initialFormValues);
  }, [form, initialFormValues, modalState.open]);

  const handleSearch = (value: string) => {
    const trimmed = value.trim();
    setKeyword(trimmed);
    void loadData({ page: 1, keyword: trimmed });
  };

  const handleCreate = () => {
    setInitialFormValues({
      name: '',
      defaultTemplate: false,
      operations: ensureOperations(),
    });
    setModalState({ open: true, submitting: false });
  };

  const handleEdit = (record: OperationTemplate) => {
    ensureCatalogOptionsFromOperations(record.operations);
    setInitialFormValues({
      name: record.name,
      defaultTemplate: record.defaultTemplate,
      operations: ensureOperations(record),
    });
    setModalState({ open: true, submitting: false, editing: record });
  };

  const handleSubmit = async () => {
    try {
      setModalState((prev) => ({ ...prev, submitting: true }));
      const values = await form.validateFields();
      const payload: SaveOperationTemplatePayload = {
        name: values.name,
        defaultTemplate: values.defaultTemplate,
        operations: (values.operations ?? [])
          .filter((operation) => operation.processCatalogId)
          .map((operation, index) => ({
            processCatalogId: operation.processCatalogId!,
            unitPrice: Number(operation.unitPrice ?? 0),
            remarks: operation.remarks,
            sequence: index + 1,
          })),
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
        width={640}
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
          <Form.List name="operations">
            {(fields, { add, remove, move }) => {
              const handleDragEnd = (event: DragEndEvent) => {
                if (!event.over || event.active.id === event.over.id) {
                  return;
                }
                const activeIndex = fields.findIndex((field) => field.key === event.active.id);
                const overIndex = fields.findIndex((field) => field.key === event.over?.id);
                if (activeIndex === -1 || overIndex === -1) {
                  return;
                }
                move(activeIndex, overIndex);
              };

              return (
                <div>
                  <Divider orientation="left">工序列表</Divider>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: operationGridTemplate,
                      gap: 12,
                      padding: '0 16px',
                      fontSize: 13,
                      color: '#8c8c8c',
                      marginBottom: 8,
                    }}
                  >
                    <span style={{ paddingLeft: 4 }}>顺序</span>
                    <span>工序</span>
                    <span>工价（元）</span>
                    <span>备注</span>
                    <span />
                  </div>
                  <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
                    <SortableContext items={fields.map((field) => field.key)} strategy={verticalListSortingStrategy}>
                      {fields.map((field, index) => (
                        <SortableOperationItem
                          key={field.key}
                          field={field}
                          index={index}
                          processOptions={processOptions}
                          processLoading={processLoading}
                          remove={remove}
                          canRemove={fields.length > 1}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                  <Button
                    type="dashed"
                    block
                    icon={<PlusOutlined />}
                    onClick={() => add({ processCatalogId: undefined, unitPrice: undefined })}
                  >
                    添加工序
                  </Button>
                </div>
              );
            }}
          </Form.List>
        </Form>
      </Modal>
    </div>
  );
};

type SortableOperationItemProps = {
  field: FormListFieldData;
  index: number;
  processOptions: ProcessOption[];
  processLoading: boolean;
  remove: (index: number) => void;
  canRemove: boolean;
};

const SortableOperationItem = ({
  field,
  index,
  processOptions,
  processLoading,
  remove,
  canRemove,
}: SortableOperationItemProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: field.key });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  } as const;

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        marginBottom: 12,
        border: '1px solid #f0f0f0',
        borderRadius: 10,
        background: isDragging ? '#f6faff' : '#fff',
        padding: '14px 16px',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: operationGridTemplate,
          alignItems: 'center',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#595959' }}>
          <span style={{ fontWeight: 600, minWidth: 16, textAlign: 'right' }}>{index + 1}</span>
          <div
            style={{ cursor: 'grab', color: '#bfbfbf', lineHeight: '20px' }}
            aria-label="拖拽调整顺序"
            {...attributes}
            {...listeners}
          >
            <HolderOutlined />
          </div>
        </div>
        <Form.Item
          name={[field.name, 'processCatalogId']}
          fieldKey={[field.fieldKey ?? field.key, 'processCatalogId']}
          rules={[{ required: true, message: '请选择工序' }]}
          style={{ marginBottom: 0 }}
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
          name={[field.name, 'unitPrice']}
          fieldKey={[field.fieldKey ?? field.key, 'unitPrice']}
          rules={[{ required: true, message: '请输入工价' }]}
          style={{ marginBottom: 0 }}
        >
          <InputNumber min={0} precision={2} step={0.1} style={{ width: '100%' }} placeholder="0.00" />
        </Form.Item>
        <Form.Item
          name={[field.name, 'remarks']}
          fieldKey={[field.fieldKey ?? field.key, 'remarks']}
          style={{ marginBottom: 0 }}
        >
          <Input maxLength={60} placeholder="可选" />
        </Form.Item>
        {canRemove ? (
          <Button type="text" danger icon={<MinusCircleOutlined />} onClick={() => remove(field.name)} />
        ) : null}
      </div>
    </div>
  );
};

export default OperationTemplatePage;
