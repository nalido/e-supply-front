import { useCallback, useEffect, useState } from 'react';
import type { ColumnsType } from 'antd/es/table';
import type { CheckboxChangeEvent } from 'antd/es/checkbox';
import {
  Button,
  Checkbox,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  message,
} from 'antd';
import { DeleteOutlined, EditOutlined, MailOutlined, PlusOutlined } from '@ant-design/icons';
import type { Partner, PartnerDataset, PartnerType } from '../types';
import partnersApi from '../api/partners';

const defaultPageSize = 10;

const partnerTypeOptions: Array<{ label: string; value: PartnerType }> = [
  { label: '客户', value: 'customer' },
  { label: '供应商', value: 'supplier' },
  { label: '加工厂', value: 'factory' },
  { label: '外协/分包', value: 'subcontractor' },
];

const partnerStatusMap: Record<Partner['status'], { text: string; color: string }> = {
  uninvited: { text: '未邀请', color: 'default' },
  invited: { text: '已邀请', color: 'processing' },
  bound: { text: '已绑定', color: 'success' },
  disabled: { text: '已停用', color: 'default' },
};

type PartnerFilters = {
  keyword: string;
  type?: PartnerType;
  onlyDisabled: boolean;
};

type ModalState = {
  open: boolean;
  submitting: boolean;
  editing?: Partner;
};

type PartnerFormValues = {
  name: string;
  type: PartnerType;
  contact?: string;
  phone?: string;
  address?: string;
  tags?: string[];
  remarks?: string;
  disabled?: boolean;
};

const PartnersPage = () => {
  const [filters, setFilters] = useState<PartnerFilters>({ keyword: '', type: undefined, onlyDisabled: false });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [total, setTotal] = useState(0);
  const [dataset, setDataset] = useState<PartnerDataset['list']>([]);
  const [loading, setLoading] = useState(false);
  const [modalState, setModalState] = useState<ModalState>({ open: false, submitting: false });
  const [form] = Form.useForm<PartnerFormValues>();

  const loadData = useCallback(
    async (targetPage = page, targetPageSize = pageSize, nextFilters = filters) => {
      try {
        setLoading(true);
        const result = await partnersApi.list({
          page: targetPage,
          pageSize: targetPageSize,
          keyword: nextFilters.keyword || undefined,
          type: nextFilters.type,
          onlyDisabled: nextFilters.onlyDisabled || undefined,
        });
        setDataset(result.list);
        setPage(targetPage);
        setPageSize(targetPageSize);
        setTotal(result.total);
      } catch (error) {
        void error;
        message.error('加载往来单位失败，请稍后重试');
      } finally {
        setLoading(false);
      }
    },
    [filters, page, pageSize],
  );

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleSearch = (value: string) => {
    const trimmed = value.trim();
    const nextFilters = { ...filters, keyword: trimmed };
    setFilters(nextFilters);
    void loadData(1, pageSize, nextFilters);
  };

  const handleTypeChange = (value: PartnerType | undefined) => {
    const nextFilters = { ...filters, type: value };
    setFilters(nextFilters);
    void loadData(1, pageSize, nextFilters);
  };

  const handleDisabledChange = (event: CheckboxChangeEvent) => {
    const nextFilters = { ...filters, onlyDisabled: event.target.checked };
    setFilters(nextFilters);
    void loadData(1, pageSize, nextFilters);
  };

  const handleInvite = async (record: Partner) => {
    try {
      const result = await partnersApi.invite(record.id);
      if (!result) {
        message.warning('邀请失败，请稍后再试');
        return;
      }
      const status = partnerStatusMap[result.status];
      message.success(`状态已更新为 ${status.text}`);
      void loadData();
    } catch {
      message.error('邀请失败，请稍后重试');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const success = await partnersApi.remove(id);
      if (!success) {
        message.warning('删除失败，请刷新后重试');
        return;
      }
      message.success('已删除往来单位');
      const hasOnlyOneItem = dataset.length === 1;
      const nextPage = hasOnlyOneItem && page > 1 ? page - 1 : page;
      void loadData(nextPage);
    } catch {
      message.error('删除失败，请稍后重试');
    }
  };

  const handleCreate = () => {
    form.resetFields();
    form.setFieldsValue({ disabled: false });
    setModalState({ open: true, submitting: false });
  };

  const handleEdit = (record: Partner) => {
    form.resetFields();
    form.setFieldsValue({
      name: record.name,
      type: record.type,
      contact: record.contact,
      phone: record.phone,
      address: record.address,
      tags: record.tags,
      remarks: record.remarks,
      disabled: record.status === 'disabled',
    });
    setModalState({ open: true, submitting: false, editing: record });
  };

  const handleSubmit = async () => {
    try {
      setModalState((prev) => ({ ...prev, submitting: true }));
      const values = await form.validateFields();
      const { disabled, ...payload } = values;
      const previousStatus: Partner['status'] = modalState.editing?.status ?? 'uninvited';
      const nextStatus: Partner['status'] = disabled
        ? 'disabled'
        : previousStatus === 'disabled'
          ? 'uninvited'
          : previousStatus;
      if (modalState.editing) {
        await partnersApi.update(modalState.editing.id, { ...payload, status: nextStatus });
        message.success('往来单位已更新');
      } else {
        await partnersApi.create({ ...payload, status: nextStatus });
        message.success('已创建往来单位');
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

  const columns: ColumnsType<Partner> = [
    {
      title: '序号',
      dataIndex: 'index',
      width: 70,
      align: 'center',
      render: (_, __, index) => (page - 1) * pageSize + index + 1,
    },
    {
      title: '名称',
      dataIndex: 'name',
      width: 200,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 120,
      render: (status: Partner['status']) => {
        const meta = partnerStatusMap[status];
        return <Tag color={meta.color}>{meta.text}</Tag>;
      },
    },
    {
      title: '类型',
      dataIndex: 'type',
      width: 120,
      render: (type: PartnerType) => partnerTypeOptions.find((item) => item.value === type)?.label ?? type,
    },
    {
      title: '标签',
      dataIndex: 'tags',
      render: (tags: string[]) =>
        tags?.length ? (
          <Space size={[8, 8]} wrap>
            {tags.map((tag) => (
              <Tag key={tag}>{tag}</Tag>
            ))}
          </Space>
        ) : (
          <span>-</span>
        ),
    },
    {
      title: '联系人',
      dataIndex: 'contact',
      width: 120,
      render: (value?: string) => value ?? '-',
    },
    {
      title: '手机号',
      dataIndex: 'phone',
      width: 140,
      render: (value?: string) => value ?? '-',
    },
    {
      title: '地址',
      dataIndex: 'address',
      ellipsis: true,
      render: (value?: string) => value ?? '-',
    },
    {
      title: '是否停用',
      dataIndex: 'disabled',
      width: 120,
      render: (disabled: boolean) => (disabled ? <Tag color="default">是</Tag> : <Tag color="success">否</Tag>),
    },
    {
      title: '绑定企业',
      dataIndex: 'boundEnterprise',
      width: 180,
      render: (value?: string) => value ?? '-',
    },
    {
      title: '操作',
      dataIndex: 'actions',
      width: 220,
      align: 'center',
      render: (_, record) => (
        <Space size={8}>
          <Button
            type="link"
            size="small"
            icon={<MailOutlined />}
            disabled={record.status === 'bound' || record.status === 'disabled'}
            onClick={() => handleInvite(record)}
          >
            邀请
          </Button>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Popconfirm title="确定删除该往来单位吗？" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />}> 删除 </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ background: '#fff', padding: 24, borderRadius: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, gap: 16 }}>
        <Space size={16} wrap>
          <Input.Search
            allowClear
            placeholder="搜索名称、联系人或手机号"
            style={{ width: 240 }}
            onSearch={handleSearch}
            enterButton
          />
          <Select
            allowClear
            placeholder="全部类型"
            options={partnerTypeOptions}
            style={{ width: 160 }}
            value={filters.type}
            onChange={handleTypeChange}
          />
          <Checkbox checked={filters.onlyDisabled} onChange={handleDisabledChange}>
            仅查看停用
          </Checkbox>
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          新建
        </Button>
      </div>

      <Table<Partner>
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
        title={modalState.editing ? '编辑往来单位' : '新建往来单位'}
        open={modalState.open}
        confirmLoading={modalState.submitting}
        onCancel={() => setModalState({ open: false, submitting: false, editing: undefined })}
        onOk={handleSubmit}
        destroyOnClose
        width={520}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="单位名称" rules={[{ required: true, message: '请输入单位名称' }]}>
            <Input maxLength={50} placeholder="请输入单位名称" />
          </Form.Item>
          <Form.Item name="type" label="单位类型" rules={[{ required: true, message: '请选择单位类型' }]}>
            <Select options={partnerTypeOptions} placeholder="请选择单位类型" />
          </Form.Item>
          <Form.Item name="contact" label="联系人">
            <Input maxLength={20} placeholder="联系人" />
          </Form.Item>
          <Form.Item name="phone" label="手机号" rules={[{ pattern: /^\d{6,20}$/, message: '请输入正确的手机号' }]}>
            <Input maxLength={20} placeholder="手机号" />
          </Form.Item>
          <Form.Item name="address" label="地址">
            <Input maxLength={80} placeholder="地址" />
          </Form.Item>
          <Form.Item name="tags" label="标签">
            <Select mode="tags" placeholder="输入后回车添加标签" tokenSeparators={[',', '，']} />
          </Form.Item>
          <Form.Item name="remarks" label="备注">
            <Input.TextArea maxLength={120} placeholder="备注" rows={3} showCount />
          </Form.Item>
          <Form.Item name="disabled" label="停用该往来单位" valuePropName="checked">
            <Switch checkedChildren="停用" unCheckedChildren="启用" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PartnersPage;
