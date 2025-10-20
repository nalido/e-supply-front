import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ColumnsType } from 'antd/es/table';
import {
  Button,
  Card,
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
  Typography,
  message,
} from 'antd';
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  DeleteOutlined,
  EditOutlined,
  MinusCircleOutlined,
  PlusOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { operationalEfficiencyService } from '../api/mock';
import type {
  OperationalEfficiencyListItem,
  OperationalEfficiencyMeta,
  OperationalEfficiencyTemplatePayload,
  OperationalEfficiencyTimeUnit,
} from '../types/operational-efficiency';

const { Text } = Typography;

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 20, 50];
const DEFAULT_DURATION = 1;

const TIME_UNIT_LABEL: Record<OperationalEfficiencyTimeUnit, string> = {
  day: '天',
  hour: '小时',
};

type TemplateFormValues = {
  name?: string;
  isDefault: boolean;
  nodes: Array<{
    nodeCode?: string;
    standardDuration?: number;
    timeUnit?: OperationalEfficiencyTimeUnit;
  }>;
};

type ModalState = {
  open: boolean;
  submitting: boolean;
  mode: 'create' | 'edit';
  editing?: OperationalEfficiencyListItem;
};

const OperationalEfficiency = () => {
  const [meta, setMeta] = useState<OperationalEfficiencyMeta | null>(null);
  const [metaLoading, setMetaLoading] = useState(false);
  const [records, setRecords] = useState<OperationalEfficiencyListItem[]>([]);
  const [tableLoading, setTableLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [total, setTotal] = useState(0);
  const [keyword, setKeyword] = useState('');
  const [appliedKeyword, setAppliedKeyword] = useState<string | undefined>();
  const [modalState, setModalState] = useState<ModalState>({ open: false, submitting: false, mode: 'create' });
  const [defaultUpdatingId, setDefaultUpdatingId] = useState<string | null>(null);
  const [form] = Form.useForm<TemplateFormValues>();

  useEffect(() => {
    const loadMeta = async () => {
      setMetaLoading(true);
      try {
        const response = await operationalEfficiencyService.getMeta();
        setMeta(response);
      } catch (error) {
        console.error('failed to load operational efficiency meta', error);
        message.error('加载节点选项失败');
      } finally {
        setMetaLoading(false);
      }
    };

    loadMeta();
  }, []);

  const loadList = useCallback(async () => {
    setTableLoading(true);
    try {
      const response = await operationalEfficiencyService.getList({
        page,
        pageSize,
        keyword: appliedKeyword,
      });
      setRecords(response.list);
      setTotal(response.total);
    } catch (error) {
      console.error('failed to load operational efficiency list', error);
      message.error('获取作业时效模板列表失败');
    } finally {
      setTableLoading(false);
    }
  }, [appliedKeyword, page, pageSize]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const handleSearch = () => {
    const trimmed = keyword.trim();
    setAppliedKeyword(trimmed ? trimmed : undefined);
    setPage(1);
  };

  const handleReset = () => {
    setKeyword('');
    setAppliedKeyword(undefined);
    setPage(1);
  };

  const handleTableChange = (nextPage: number, nextPageSize?: number) => {
    setPage(nextPage);
    if (nextPageSize && nextPageSize !== pageSize) {
      setPageSize(nextPageSize);
    }
  };

  const closeModal = () => {
    setModalState((prev) => ({ ...prev, open: false, submitting: false, editing: undefined }));
  };

  const ensureNodesInitialized = () => {
    const defaultNodeCode = meta?.nodeOptions[0]?.value;
    const defaultUnit = meta?.timeUnits[0]?.value ?? 'day';
    return [
      {
        nodeCode: defaultNodeCode,
        standardDuration: DEFAULT_DURATION,
        timeUnit: defaultUnit,
      },
    ];
  };

  const handleCreate = () => {
    if (!meta) {
      message.warning('正在加载节点选项，请稍候');
      return;
    }
    form.resetFields();
    form.setFieldsValue({
      name: '',
      isDefault: records.length === 0,
      nodes: ensureNodesInitialized(),
    });
    setModalState({ open: true, submitting: false, mode: 'create' });
  };

  const handleEdit = useCallback((record: OperationalEfficiencyListItem) => {
    form.resetFields();
    form.setFieldsValue({
      name: record.name,
      isDefault: record.isDefault,
      nodes: record.nodes.map((node) => ({
        nodeCode: node.nodeCode,
        standardDuration: node.standardDuration,
        timeUnit: node.timeUnit,
      })),
    });
    setModalState({ open: true, submitting: false, mode: 'edit', editing: record });
  }, [form]);

  const moveNode = (from: number, to: number) => {
    const values = form.getFieldValue('nodes');
    if (!Array.isArray(values) || from === to || to < 0 || to >= values.length) {
      return;
    }
    const nextNodes = [...values];
    const [current] = nextNodes.splice(from, 1);
    nextNodes.splice(to, 0, current);
    form.setFieldsValue({ nodes: nextNodes });
  };

  const buildPayload = (values: TemplateFormValues): OperationalEfficiencyTemplatePayload => ({
    name: values.name?.trim() ?? '',
    isDefault: values.isDefault,
    nodes: (values.nodes ?? []).map((node) => ({
      nodeCode: node.nodeCode ?? '',
      standardDuration: Number(node.standardDuration ?? DEFAULT_DURATION),
      timeUnit: node.timeUnit ?? 'day',
    })),
  });

  const handleSubmit = async () => {
    try {
      setModalState((prev) => ({ ...prev, submitting: true }));
      const values = await form.validateFields();
      const payload = buildPayload(values);
      if (!payload.name) {
        message.warning('请填写模板名称');
        setModalState((prev) => ({ ...prev, submitting: false }));
        return;
      }
      if (!payload.nodes.length) {
        message.warning('请至少配置一个生产节点');
        setModalState((prev) => ({ ...prev, submitting: false }));
        return;
      }
      if (modalState.mode === 'edit' && modalState.editing) {
        await operationalEfficiencyService.update(modalState.editing.id, payload);
        message.success('作业时效模板已更新');
      } else {
        await operationalEfficiencyService.create(payload);
        message.success('作业时效模板已创建');
      }
      closeModal();
      void loadList();
    } catch (error) {
      if ((error as { errorFields?: unknown })?.errorFields) {
        setModalState((prev) => ({ ...prev, submitting: false }));
        return;
      }
      console.error('failed to submit operational efficiency template', error);
      message.error('提交失败，请稍后重试');
      setModalState((prev) => ({ ...prev, submitting: false }));
    }
  };

  const recordCount = records.length;

  const handleDelete = useCallback(
    async (record: OperationalEfficiencyListItem) => {
      try {
        await operationalEfficiencyService.remove(record.id);
        message.success('模板已删除');
        if (recordCount === 1 && page > 1) {
          setPage((prev) => Math.max(prev - 1, 1));
        }
        void loadList();
      } catch (error) {
        console.error('failed to remove operational efficiency template', error);
        message.error('删除失败，请稍后重试');
      }
    },
    [loadList, page, recordCount],
  );

  const handleDefaultChange = useCallback(
    async (record: OperationalEfficiencyListItem, checked: boolean) => {
      if (record.isDefault && !checked) {
        message.info('至少需要保留一个默认模板');
        return;
      }
      if (!checked) {
        return;
      }
      try {
        setDefaultUpdatingId(record.id);
        await operationalEfficiencyService.setDefault(record.id);
        message.success(`已将 ${record.name} 设为默认模板`);
        void loadList();
      } catch (error) {
        console.error('failed to set default operational efficiency template', error);
        message.error('设置默认模板失败');
      } finally {
        setDefaultUpdatingId(null);
      }
    },
    [loadList],
  );

  const columns: ColumnsType<OperationalEfficiencyListItem> = useMemo(() => [
    {
      title: '序号',
      dataIndex: 'index',
      width: 80,
      align: 'center',
      render: (_value, _record, index) => (page - 1) * pageSize + index + 1,
    },
    {
      title: '作业时效名称',
      dataIndex: 'name',
      width: 220,
      ellipsis: true,
    },
    {
      title: '默认',
      dataIndex: 'isDefault',
      width: 120,
      align: 'center',
      render: (_value, record) => (
        <Switch
          checked={record.isDefault}
          loading={defaultUpdatingId === record.id}
          onChange={(checked) => handleDefaultChange(record, checked)}
        />
      ),
    },
    {
      title: '节点信息',
      dataIndex: 'nodeSummary',
      ellipsis: true,
      render: (_value, record) => {
        if (!record.nodes.length) {
          return <Text type="secondary">未配置节点</Text>;
        }
        return (
          <Space size={[4, 4]} wrap>
            {record.nodes.map((node) => (
              <Tag key={node.id} bordered={false} color="blue">
                {`${node.nodeName} · ${node.standardDuration}${TIME_UNIT_LABEL[node.timeUnit]}`}
              </Tag>
            ))}
          </Space>
        );
      },
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
          <Popconfirm
            title="确定删除该模板吗？"
            okText="删除"
            okButtonProps={{ danger: true }}
            onConfirm={() => handleDelete(record)}
            disabled={record.isDefault}
            description={record.isDefault ? '默认模板不可删除' : undefined}
          >
            <Button type="link" danger icon={<DeleteOutlined />} disabled={record.isDefault}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ], [defaultUpdatingId, handleDefaultChange, handleDelete, handleEdit, page, pageSize]);

  return (
    <Card title="作业时效模板" bodyStyle={{ padding: 24 }}>
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <Space size={8} wrap>
            <Input
              allowClear
              placeholder="请输入作业时效名称"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              onPressEnter={handleSearch}
              style={{ width: 260 }}
            />
            <Button icon={<SearchOutlined />} type="primary" onClick={handleSearch}>
              搜索
            </Button>
            <Button onClick={handleReset}>重置</Button>
          </Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate} loading={metaLoading}>
            添加作业时效
          </Button>
        </div>
        <Table<OperationalEfficiencyListItem>
          rowKey="id"
          columns={columns}
          loading={tableLoading}
          dataSource={records}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            pageSizeOptions: PAGE_SIZE_OPTIONS.map(String),
            onChange: handleTableChange,
            showTotal: (value) => `共 ${value} 条`,
          }}
        />
      </Space>
      <Modal
        title={modalState.mode === 'edit' ? '编辑作业时效模板' : '新增作业时效模板'}
        open={modalState.open}
        onCancel={closeModal}
        onOk={handleSubmit}
        confirmLoading={modalState.submitting}
        destroyOnClose
        width={720}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="模板名称"
            name="name"
            rules={[{ required: true, message: '请输入模板名称' }]}
          >
            <Input placeholder="请输入模板名称" maxLength={50} showCount allowClear />
          </Form.Item>
          <Form.Item label="设为默认" name="isDefault" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Divider orientation="left">生产节点配置</Divider>
          <Form.List
            name="nodes"
            rules={[
              {
                validator: async (_rule, value) => {
                  if (!value || !value.length) {
                    return Promise.reject(new Error('请至少添加一个生产节点'));
                  }
                  return Promise.resolve();
                },
              },
            ]}
          >
            {(fields, { add, remove }) => (
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                {fields.map((field, index) => (
                  <div
                    key={field.key}
                    style={{
                      border: '1px solid #f0f0f0',
                      borderRadius: 8,
                      padding: 16,
                      background: '#fafafa',
                    }}
                  >
                    <Space align="baseline" size={16} wrap style={{ width: '100%' }}>
                      <Form.Item
                        {...field}
                        label={index === 0 ? '节点名称' : undefined}
                        name={[field.name, 'nodeCode']}
                        fieldKey={[field.fieldKey ?? field.key, 'nodeCode']}
                        rules={[{ required: true, message: '请选择节点名称' }]}
                      >
                        <Select
                          placeholder="请选择节点"
                          options={meta?.nodeOptions.map((option) => ({
                            value: option.value,
                            label: option.label,
                          }))}
                          style={{ width: 180 }}
                        />
                      </Form.Item>
                      <Form.Item
                        {...field}
                        label={index === 0 ? '标准工时' : undefined}
                        name={[field.name, 'standardDuration']}
                        fieldKey={[field.fieldKey ?? field.key, 'standardDuration']}
                        rules={[{ required: true, message: '请输入标准工时' }]}
                      >
                        <InputNumber min={0.5} step={0.5} precision={1} style={{ width: 120 }} placeholder="工时" />
                      </Form.Item>
                      <Form.Item
                        {...field}
                        label={index === 0 ? '单位' : undefined}
                        name={[field.name, 'timeUnit']}
                        fieldKey={[field.fieldKey ?? field.key, 'timeUnit']}
                        rules={[{ required: true, message: '请选择工时单位' }]}
                      >
                        <Select
                          placeholder="请选择单位"
                          options={meta?.timeUnits.map((option) => ({
                            value: option.value,
                            label: option.label,
                          }))}
                          style={{ width: 120 }}
                        />
                      </Form.Item>
                      <Space size={8} align="center">
                        <Button
                          type="text"
                          icon={<ArrowUpOutlined />}
                          disabled={index === 0}
                          onClick={() => moveNode(index, index - 1)}
                        />
                        <Button
                          type="text"
                          icon={<ArrowDownOutlined />}
                          disabled={index === fields.length - 1}
                          onClick={() => moveNode(index, index + 1)}
                        />
                        <Button
                          type="text"
                          danger
                          icon={<MinusCircleOutlined />}
                          disabled={fields.length === 1}
                          onClick={() => remove(field.name)}
                        />
                      </Space>
                    </Space>
                  </div>
                ))}
                <Button
                  type="dashed"
                  icon={<PlusOutlined />}
                  onClick={() => add({
                    nodeCode: meta?.nodeOptions[0]?.value,
                    standardDuration: DEFAULT_DURATION,
                    timeUnit: meta?.timeUnits[0]?.value ?? 'day',
                  })}
                  block
                >
                  添加生产节点
                </Button>
              </Space>
            )}
          </Form.List>
        </Form>
      </Modal>
    </Card>
  );
};

export default OperationalEfficiency;
