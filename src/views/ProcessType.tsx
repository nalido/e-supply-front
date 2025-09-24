import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ColumnsType } from 'antd/es/table';
import type { CheckboxChangeEvent } from 'antd/es/checkbox';
import type { UploadFile, UploadProps } from 'antd/es/upload/interface';
import type {
  CreateProcessTypePayload,
  ProcessType,
  ProcessTypeDataset,
  ProcessTypeStatus,
} from '../types';
import {
  Alert,
  Button,
  Checkbox,
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
  Tooltip,
  Typography,
  Upload,
  message,
} from 'antd';
import {
  DeleteOutlined,
  DownloadOutlined,
  ImportOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import processTypeApi from '../api/process-type';
import '../styles/process-type.css';

const { Text } = Typography;

type ColumnKey = 'chargeMode' | 'defaultWage' | 'description' | 'steps' | 'status' | 'updatedAt';

type ProcessTypeFormValues = Omit<CreateProcessTypePayload, 'status'> & {
  statusBoolean: boolean;
};

type FormModalState = {
  open: boolean;
  submitting: boolean;
  editing?: ProcessType;
};

type ImportModalState = {
  open: boolean;
  uploading: boolean;
  fileList: UploadFile[];
  parsed: CreateProcessTypePayload[];
  error?: string;
};

const statusTag = (status: ProcessTypeStatus) => {
  const color = status === 'active' ? 'success' : 'default';
  const label = status === 'active' ? '启用' : '停用';
  return (
    <Tag color={color} className="process-type-status-tag">
      {label}
    </Tag>
  );
};

const ProcessTypePage = () => {
  const [dataset, setDataset] = useState<ProcessTypeDataset>({ list: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [onlyActive, setOnlyActive] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [visibleColumnKeys, setVisibleColumnKeys] = useState<ColumnKey[]>(['chargeMode', 'defaultWage', 'steps', 'status', 'updatedAt']);
  const [columnModalOpen, setColumnModalOpen] = useState(false);
  const [formModal, setFormModal] = useState<FormModalState>({ open: false, submitting: false });
  const [importModal, setImportModal] = useState<ImportModalState>({ open: false, uploading: false, fileList: [], parsed: [] });
  const [form] = Form.useForm<ProcessTypeFormValues>();

  const loadData = useCallback(() => {
    setLoading(true);
    processTypeApi
      .list()
      .then((data) => {
        setDataset(data);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredList = useMemo(() => {
    const lower = keyword.trim().toLowerCase();
    return dataset.list.filter((item) => {
      if (onlyActive && item.status !== 'active') {
        return false;
      }
      if (!lower) {
        return true;
      }
      return [item.name, item.code, item.createdBy]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(lower));
    });
  }, [dataset.list, keyword, onlyActive]);

  const handleSearch = (value: string) => {
    setKeyword(value.trim());
  };

  const handleResetSelection = () => {
    setSelectedRowKeys([]);
  };

  const handleRefresh = () => {
    loadData();
    message.success('已更新最新的加工类型数据');
  };

  const handleToggleStatus = useCallback(async (record: ProcessType, next: ProcessTypeStatus) => {
    setLoading(true);
    try {
      await processTypeApi.toggleStatus(record.id, next);
      await loadData();
      message.success(`${next === 'active' ? '已启用' : '已停用'}「${record.name}」`);
    } finally {
      setLoading(false);
    }
  }, [loadData]);

  const handleRemove = useCallback(async (record: ProcessType) => {
    setLoading(true);
    try {
      const removed = await processTypeApi.remove(record.id);
      if (removed) {
        await loadData();
        setSelectedRowKeys((prev) => prev.filter((key) => key !== record.id));
        message.success(`已删除「${record.name}」`);
      }
    } finally {
      setLoading(false);
    }
  }, [loadData]);

  const handleBatchStatus = useCallback(async (status: ProcessTypeStatus) => {
    if (selectedRowKeys.length === 0) return;
    setLoading(true);
    try {
      await processTypeApi.batchToggleStatus(selectedRowKeys.map(String), status);
      await loadData();
      message.success(`已批量${status === 'active' ? '启用' : '停用'} ${selectedRowKeys.length} 条记录`);
      handleResetSelection();
    } finally {
      setLoading(false);
    }
  }, [selectedRowKeys, loadData]);

  const handleBatchRemove = useCallback(async () => {
    if (selectedRowKeys.length === 0) return;
    setLoading(true);
    try {
      await processTypeApi.batchRemove(selectedRowKeys.map(String));
      await loadData();
      message.success(`已批量删除 ${selectedRowKeys.length} 条记录`);
      handleResetSelection();
    } finally {
      setLoading(false);
    }
  }, [selectedRowKeys, loadData]);

  const openCreateModal = () => {
    form.resetFields();
    form.setFieldsValue({
      name: '',
      code: '',
      category: '自定义',
      chargeMode: '计件',
      defaultWage: 0,
      unit: '件',
      description: '',
      createdBy: '系统管理员',
      steps: [],
      isDefault: false,
      statusBoolean: true,
    });
    setFormModal({ open: true, submitting: false, editing: undefined });
  };

  const openEditModal = useCallback((record: ProcessType) => {
    form.resetFields();
    form.setFieldsValue({
      name: record.name,
      code: record.code,
      category: record.category,
      chargeMode: record.chargeMode,
      defaultWage: record.defaultWage,
      unit: record.unit,
      description: record.description,
      createdBy: record.createdBy,
      steps: record.steps ?? [],
      isDefault: record.isDefault,
      statusBoolean: record.status === 'active',
    });
    setFormModal({ open: true, submitting: false, editing: record });
  }, [form]);

  const handleSubmitForm = async () => {
    try {
      const values = await form.validateFields<ProcessTypeFormValues>();
      setFormModal((prev) => ({ ...prev, submitting: true }));
      const payload: CreateProcessTypePayload = {
        name: values.name,
        code: values.code,
        category: values.category,
        chargeMode: values.chargeMode,
        defaultWage: values.defaultWage,
        unit: values.unit,
        description: values.description,
        isDefault: values.isDefault,
        status: values.statusBoolean ? 'active' : 'inactive',
        createdBy: values.createdBy,
        steps: values.steps,
      };
      if (formModal.editing) {
        await processTypeApi.update(formModal.editing.id, payload);
        message.success(`已更新「${formModal.editing.name}」`);
      } else {
        await processTypeApi.create(payload);
        message.success('已新建加工类型');
      }
      setFormModal({ open: false, submitting: false, editing: undefined });
      await loadData();
    } catch (error) {
      if ((error as { errorFields?: unknown }).errorFields) {
        setFormModal((prev) => ({ ...prev, submitting: false }));
        return;
      }
      if (error instanceof Error && error.message) {
        message.error(error.message);
      }
      setFormModal((prev) => ({ ...prev, submitting: false }));
    }
  };

  const handleExport = async () => {
    const hide = message.loading('正在导出...');
    try {
      const blob = await processTypeApi.export({ onlyActive });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `process-types-${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      message.success('导出完成');
    } catch (error) {
      if (error instanceof Error && error.message) {
        message.error(error.message);
      } else {
        message.error('导出失败，请稍后重试');
      }
    } finally {
      hide();
    }
  };

  const handleImportFile: UploadProps['beforeUpload'] = (file) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = String(event.target?.result ?? '');
        const data = JSON.parse(text);
        if (!Array.isArray(data)) {
          throw new Error('文件格式错误，请使用 JSON 数组结构');
        }
        const parsed: CreateProcessTypePayload[] = data.map((item) => ({
          name: item.name,
          code: item.code,
          category: item.category,
          chargeMode: item.chargeMode,
          defaultWage: Number(item.defaultWage ?? 0),
          unit: item.unit ?? '件',
          description: item.description,
          isDefault: item.isDefault,
          status: item.status ?? 'active',
          createdBy: item.createdBy ?? '文件导入',
          steps: Array.isArray(item.steps) ? item.steps : [],
        }));
        setImportModal((prev) => ({
          ...prev,
          parsed,
          error: undefined,
          fileList: [
            {
              uid: file.uid,
              name: file.name,
              status: 'done',
            },
          ],
        }));
      } catch (error) {
        setImportModal((prev) => ({
          ...prev,
          parsed: [],
          error: (error instanceof Error && error.message) ? error.message : '无法解析文件内容，请检查格式',
          fileList: [],
        }));
      }
    };
    reader.readAsText(file, 'utf-8');
    return false;
  };

  const handleConfirmImport = async () => {
    if (!importModal.parsed.length) {
      message.warning('请先上传加工类型数据文件');
      return;
    }
    setImportModal((prev) => ({ ...prev, uploading: true }));
    try {
      await processTypeApi.import(importModal.parsed);
      message.success(`成功导入 ${importModal.parsed.length} 条加工类型数据`);
      setImportModal({ open: false, uploading: false, parsed: [], fileList: [] });
      await loadData();
    } catch (error) {
      if (error instanceof Error && error.message) {
        message.error(error.message);
      } else {
        message.error('导入失败，请稍后重试');
      }
      setImportModal((prev) => ({ ...prev, uploading: false }));
    }
  };

  const columnOptions: { label: string; value: ColumnKey }[] = [
    { label: '计费方式', value: 'chargeMode' },
    { label: '默认工资', value: 'defaultWage' },
    { label: '说明', value: 'description' },
    { label: '工序步骤', value: 'steps' },
    { label: '状态', value: 'status' },
    { label: '最近更新时间', value: 'updatedAt' },
  ];

  const columnDefinitions = useMemo<ColumnsType<ProcessType>>(
    () => [
      {
        title: '加工类型',
        dataIndex: 'name',
        key: 'name',
        fixed: 'left',
        render: (value: string, record) => (
          <Space direction="vertical" size={2}>
            <Space size={6} wrap>
              <Text strong>{value}</Text>
              {record.isDefault ? <Tag color="blue">默认</Tag> : null}
              <Tag bordered={false}>{record.category}</Tag>
            </Space>
            <Text type="secondary">编码：{record.code}</Text>
          </Space>
        ),
      },
      {
        title: '计费方式',
        dataIndex: 'chargeMode',
        key: 'chargeMode',
        render: (mode: ProcessType['chargeMode']) => mode,
        width: 120,
      },
      {
        title: '默认工资',
        dataIndex: 'defaultWage',
        key: 'defaultWage',
        width: 140,
        render: (value: number, record) => `${value}${record.unit}`,
      },
      {
        title: '说明',
        dataIndex: 'description',
        key: 'description',
        ellipsis: true,
        render: (text?: string) => text || '—',
      },
      {
        title: '工序步骤',
        dataIndex: 'steps',
        key: 'steps',
        render: (steps?: string[]) => (
          <div className="process-type-tags">
            {steps?.map((step) => (
              <Tag bordered={false} key={step}>
                {step}
              </Tag>
            ))}
          </div>
        ),
      },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        align: 'center',
        width: 120,
        render: (status: ProcessTypeStatus) => statusTag(status),
      },
      {
        title: '最近更新时间',
        dataIndex: 'updatedAt',
        key: 'updatedAt',
        width: 180,
      },
      {
        title: '操作',
        key: 'actions',
        fixed: 'right',
        width: 240,
        render: (_, record) => (
          <Space size={8} wrap>
            <Button size="small" type="link" onClick={() => openEditModal(record)}>
              编辑
            </Button>
            <Button
              size="small"
              type="link"
              onClick={() => handleToggleStatus(record, record.status === 'active' ? 'inactive' : 'active')}
            >
              {record.status === 'active' ? '停用' : '启用'}
            </Button>
            <Popconfirm
              title={`确认删除「${record.name}」?`}
              okText="删除"
              cancelText="取消"
              onConfirm={() => handleRemove(record)}
            >
              <Button size="small" type="link" danger icon={<DeleteOutlined />}>删除</Button>
            </Popconfirm>
          </Space>
        ),
      },
    ],
    [handleRemove, handleToggleStatus, openEditModal],
  );

  const activeColumns = useMemo(
    () =>
      columnDefinitions.filter((column) => {
        if (column.key === 'name' || column.key === 'actions') {
          return true;
        }
        return visibleColumnKeys.includes(column.key as ColumnKey);
      }),
    [columnDefinitions, visibleColumnKeys],
  );

  return (
    <div className="process-type-page">
      <div className="process-type-toolbar">
        <div className="process-type-toolbar-left">
          <Space size={12} wrap>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
              新建加工类型
            </Button>
            <Button icon={<ImportOutlined />} onClick={() => setImportModal({ open: true, uploading: false, parsed: [], fileList: [] })}>
              导入
            </Button>
            <Tooltip title="导出当前筛选列表">
              <Button icon={<DownloadOutlined />} onClick={handleExport}>
                导出
              </Button>
            </Tooltip>
          </Space>
        </div>
        <div className="process-type-toolbar-right">
          <Button icon={<ReloadOutlined />} onClick={handleRefresh}>
            刷新
          </Button>
          <Button icon={<SettingOutlined />} onClick={() => setColumnModalOpen(true)}>
            列设置
          </Button>
        </div>
      </div>

      <div className="process-type-filters">
        <Input.Search
          allowClear
          prefix={<SearchOutlined />}
          placeholder="请输入加工类型名称 / 编码 / 创建人"
          style={{ maxWidth: 360 }}
          onSearch={handleSearch}
          onChange={(event) => setKeyword(event.target.value)}
          value={keyword}
        />
        <Space size={8} align="center">
          <Switch checked={onlyActive} onChange={(checked) => setOnlyActive(checked)} />
          <span>仅显示启用</span>
        </Space>
        <Checkbox
          indeterminate={selectedRowKeys.length > 0 && selectedRowKeys.length < filteredList.length}
          checked={filteredList.length > 0 && selectedRowKeys.length === filteredList.length}
          onChange={(event: CheckboxChangeEvent) => {
            const { checked } = event.target;
            if (checked) {
              setSelectedRowKeys(filteredList.map((item) => item.id));
            } else {
              const visibleSet = new Set(filteredList.map((item) => item.id));
              setSelectedRowKeys((prev) => prev.filter((key) => !visibleSet.has(String(key))));
            }
          }}
        >
          勾选当前列表
        </Checkbox>
      </div>

      <div className="process-type-table-card">
        <div className="process-type-operation-bar">
          <h2>加工类型列表</h2>
          <Space size={8} wrap>
            <Button disabled={selectedRowKeys.length === 0} onClick={() => handleBatchStatus('active')}>
              批量启用
            </Button>
            <Button disabled={selectedRowKeys.length === 0} onClick={() => handleBatchStatus('inactive')}>
              批量停用
            </Button>
            <Popconfirm
              title="确认删除所选加工类型？"
              okText="删除"
              cancelText="取消"
              onConfirm={handleBatchRemove}
              disabled={selectedRowKeys.length === 0}
            >
              <Button disabled={selectedRowKeys.length === 0} danger>
                批量删除
              </Button>
            </Popconfirm>
            {selectedRowKeys.length > 0 ? (
              <Button type="link" onClick={handleResetSelection}>
                清空选择
              </Button>
            ) : null}
          </Space>
        </div>

        <Table<ProcessType>
          rowKey="id"
          loading={loading}
          columns={activeColumns}
          dataSource={filteredList}
          pagination={{ pageSize: 10, showTotal: (total, range) => `${range[0]}-${range[1]} / 共 ${total} 条` }}
          rowSelection={{
            selectedRowKeys,
            onChange: (keys) => setSelectedRowKeys(keys),
          }}
          scroll={{ x: 1120 }}
        />
        <div className="process-type-footnote">
          包含系统预置与自定义加工类型，可通过工具栏进行新建、导入、导出及列显示设置。
        </div>
      </div>

      <Modal
        title={formModal.editing ? '编辑加工类型' : '新建加工类型'}
        open={formModal.open}
        confirmLoading={formModal.submitting}
        onCancel={() => setFormModal({ open: false, submitting: false, editing: undefined })}
        onOk={handleSubmitForm}
        destroyOnHidden
        width={520}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="加工类型名称" rules={[{ required: true, message: '请输入加工类型名称' }]}>
            <Input placeholder="例如：车缝工序" maxLength={40} />
          </Form.Item>
          <Form.Item name="code" label="编码" rules={[{ required: true, message: '请输入编码' }]}>
            <Input placeholder="例如：PROC-SEW" maxLength={40} />
          </Form.Item>
          <Form.Item name="category" label="分类" rules={[{ required: true, message: '请选择分类' }]}> 
            <Select options={[{ value: '系统', label: '系统' }, { value: '自定义', label: '自定义' }]} />
          </Form.Item>
          <Form.Item name="chargeMode" label="计费方式" rules={[{ required: true, message: '请选择计费方式' }]}> 
            <Select
              options={[
                { value: '计件', label: '计件' },
                { value: '计时', label: '计时' },
                { value: '阶段计费', label: '阶段计费' },
              ]}
            />
          </Form.Item>
          <Form.Item label="默认工资">
            <Space.Compact style={{ width: '100%' }}>
              <Form.Item name="defaultWage" noStyle rules={[{ required: true, message: '请输入默认工资' }]}> 
                <InputNumber min={0} step={0.01} style={{ width: '70%' }} placeholder="数值" />
              </Form.Item>
              <Form.Item name="unit" noStyle rules={[{ required: true, message: '请输入单位' }]}>
                <Input style={{ width: '30%' }} placeholder="单位" maxLength={10} />
              </Form.Item>
            </Space.Compact>
          </Form.Item>
          <Form.Item name="description" label="说明">
            <Input.TextArea placeholder="可填写计费说明、适用范围等" maxLength={120} rows={3} showCount />
          </Form.Item>
          <Form.Item name="steps" label="工序步骤">
            <Select mode="tags" placeholder="输入后回车添加步骤" tokenSeparators={[',', '，']} />
          </Form.Item>
          <Form.Item name="createdBy" label="创建人" rules={[{ required: true, message: '请输入创建人' }]}> 
            <Input maxLength={20} />
          </Form.Item>
          <Form.Item name="statusBoolean" label="状态" valuePropName="checked">
            <Switch checkedChildren="启用" unCheckedChildren="停用" />
          </Form.Item>
          <Form.Item name="isDefault" label="标记为默认" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="导入加工类型"
        open={importModal.open}
        confirmLoading={importModal.uploading}
        onCancel={() => setImportModal({ open: false, uploading: false, fileList: [], parsed: [] })}
        onOk={handleConfirmImport}
      >
        <Upload.Dragger
          multiple={false}
          fileList={importModal.fileList}
          beforeUpload={handleImportFile}
          onRemove={() => {
            setImportModal((prev) => ({ ...prev, parsed: [], fileList: [] }));
          }}
          accept="application/json"
        >
          <p className="ant-upload-drag-icon">
            <ImportOutlined />
          </p>
          <p className="ant-upload-text">点击或拖拽 JSON 文件到此区域完成导入</p>
          <p className="ant-upload-hint">文件需为 JSON 数组结构，字段需与系统字段一致</p>
        </Upload.Dragger>
        {importModal.error ? (
          <Alert style={{ marginTop: 16 }} type="error" message={importModal.error} showIcon />
        ) : null}
        {importModal.parsed.length ? (
          <Alert
            style={{ marginTop: 16 }}
            type="success"
            message={`已解析 ${importModal.parsed.length} 条数据`}
            showIcon
          />
        ) : null}
      </Modal>

      <Modal
        title="列设置"
        open={columnModalOpen}
        onCancel={() => setColumnModalOpen(false)}
        onOk={() => setColumnModalOpen(false)}
      >
        <Checkbox.Group
          value={visibleColumnKeys}
          options={columnOptions}
          onChange={(values) => setVisibleColumnKeys(values as ColumnKey[])}
        />
      </Modal>
    </div>
  );
};

export default ProcessTypePage;
