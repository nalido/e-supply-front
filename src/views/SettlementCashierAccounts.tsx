import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ColumnsType } from 'antd/es/table';
import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import type {
  CashierAccount,
  CashierAccountPayload,
  CashierAccountType,
  CashierAccountTypeOption,
} from '../types/settlement-cashier-accounts';
import { cashierAccountService } from '../api/mock';

const { Text } = Typography;

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 20, 50];

const currencyFormatter = new Intl.NumberFormat('zh-CN', {
  style: 'currency',
  currency: 'CNY',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const typeBadgeColor: Record<CashierAccountType, string> = {
  bank: 'processing',
  alipay: 'blue',
  wechat: 'green',
  cash: 'gold',
};

const SettlementCashierAccounts = () => {
  const [form] = Form.useForm<CashierAccountPayload>();
  const [metaLoading, setMetaLoading] = useState(false);
  const [accountTypes, setAccountTypes] = useState<CashierAccountTypeOption[]>([]);

  const [records, setRecords] = useState<CashierAccount[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [tableLoading, setTableLoading] = useState(false);

  const [keywordInput, setKeywordInput] = useState('');
  const [appliedKeyword, setAppliedKeyword] = useState<string | undefined>(undefined);
  const [typeFilter, setTypeFilter] = useState<CashierAccountType | undefined>();

  const [modalOpen, setModalOpen] = useState(false);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [editing, setEditing] = useState<CashierAccount | null>(null);

  const accountTypeMap = useMemo(() => {
    const map = new Map<CashierAccountType, string>();
    accountTypes.forEach((option) => {
      map.set(option.value, option.label);
    });
    return map;
  }, [accountTypes]);

  const loadMeta = useCallback(async () => {
    setMetaLoading(true);
    try {
      const response = await cashierAccountService.getMeta();
      setAccountTypes(response.accountTypes ?? []);
    } catch (error) {
      console.error('failed to load cashier account meta', error);
      message.error('加载账户类型配置失败');
    } finally {
      setMetaLoading(false);
    }
  }, []);

  const loadList = useCallback(async () => {
    setTableLoading(true);
    try {
      const response = await cashierAccountService.getList({
        page,
        pageSize,
        keyword: appliedKeyword,
        type: typeFilter,
      });
      setRecords(response.list);
      setTotal(response.total);
    } catch (error) {
      console.error('failed to load cashier accounts', error);
      message.error('获取出纳账户列表失败');
    } finally {
      setTableLoading(false);
    }
  }, [appliedKeyword, page, pageSize, typeFilter]);

  useEffect(() => {
    void loadMeta();
  }, [loadMeta]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const handleSearch = () => {
    const normalized = keywordInput.trim();
    setAppliedKeyword(normalized || undefined);
    setPage(1);
  };

  const handleResetFilters = () => {
    setKeywordInput('');
    setAppliedKeyword(undefined);
    setTypeFilter(undefined);
    setPage(1);
    setPageSize(DEFAULT_PAGE_SIZE);
  };

  const handleTypeChange = (value: CashierAccountType | undefined) => {
    setTypeFilter(value);
    setPage(1);
  };

  const handleTableChange = (
    nextPage: number,
    nextPageSize?: number,
  ) => {
    if (nextPageSize && nextPageSize !== pageSize) {
      setPageSize(nextPageSize);
      setPage(1);
      return;
    }
    setPage(nextPage);
  };

  const openCreateModal = useCallback(() => {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  }, [form]);

  const openEditModal = useCallback((record: CashierAccount) => {
    setEditing(record);
    form.setFieldsValue({
      name: record.name,
      type: record.type,
      accountNumber: record.accountNumber,
      bankName: record.bankName,
      initialBalance: record.initialBalance,
      remarks: record.remarks,
    });
    setModalOpen(true);
  }, [form]);

  const handleRemove = useCallback((record: CashierAccount) => {
    Modal.confirm({
      title: `确认删除账户「${record.name}」吗？`,
      content: '仅未产生交易流水的账户可以删除。',
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await cashierAccountService.remove(record.id);
          message.success('已删除出纳账户');
          void loadList();
        } catch (error) {
          const description =
            (error as { message?: string })?.message ?? '删除失败，请稍后重试';
          message.error(description);
        }
      },
    });
  }, [loadList]);

  const handleModalOk = async () => {
    try {
      setModalSubmitting(true);
      const values = await form.validateFields();
      if (editing) {
        await cashierAccountService.update(editing.id, values);
        message.success('账户信息已更新');
      } else {
        await cashierAccountService.create(values);
        message.success('已创建出纳账户');
      }
      setModalOpen(false);
      setEditing(null);
      form.resetFields();
      void loadList();
    } catch (error) {
      if ((error as { errorFields?: unknown })?.errorFields) {
        setModalSubmitting(false);
        return;
      }
      const description =
        (error as { message?: string })?.message ?? '提交失败，请稍后重试';
      message.error(description);
      setModalSubmitting(false);
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleModalCancel = () => {
    setModalOpen(false);
    setEditing(null);
    form.resetFields();
  };

  const tableColumns: ColumnsType<CashierAccount> = useMemo(() => [
    {
      title: '序号',
      dataIndex: 'id',
      width: 80,
      render: (_value, _record, index) => ((page - 1) * pageSize + index + 1).toString(),
    },
    {
      title: '名称',
      dataIndex: 'name',
      ellipsis: true,
      width: 200,
    },
    {
      title: '账户类型',
      dataIndex: 'type',
      width: 120,
      render: (value: CashierAccountType) => (
        <Tag color={typeBadgeColor[value]}>{accountTypeMap.get(value) ?? value}</Tag>
      ),
    },
    {
      title: '账号',
      dataIndex: 'accountNumber',
      width: 200,
      ellipsis: true,
    },
    {
      title: '开户行',
      dataIndex: 'bankName',
      width: 220,
      ellipsis: true,
    },
    {
      title: '初始余额',
      dataIndex: 'initialBalance',
      align: 'right',
      width: 140,
      render: (value: number) => currencyFormatter.format(value ?? 0),
    },
    {
      title: '当前余额',
      dataIndex: 'currentBalance',
      align: 'right',
      width: 140,
      render: (value: number) => (
        <Text strong>{currencyFormatter.format(value ?? 0)}</Text>
      ),
    },
    {
      title: '备注',
      dataIndex: 'remarks',
      ellipsis: true,
    },
    {
      title: '操作',
      dataIndex: 'actions',
      fixed: 'right',
      width: 210,
      render: (_value, record) => (
        <Space size="small">
          <Button type="link" onClick={() => openEditModal(record)}>
            编辑
          </Button>
          <Button
            type="link"
            danger
            onClick={() => handleRemove(record)}
          >
            删除
          </Button>
          <Button
            type="link"
            onClick={() => message.info('流水明细将在真实接口接入后开放')}
          >
            查看流水
          </Button>
        </Space>
      ),
    },
  ], [accountTypeMap, handleRemove, openEditModal, page, pageSize]);

  const selectedType = Form.useWatch('type', form);

  return (
    <Card bordered={false} loading={metaLoading} title="出纳账户">
      <Space style={{ marginBottom: 16 }} wrap>
        <Input
          allowClear
          placeholder="搜索名称或账号"
          value={keywordInput}
          onChange={(event) => setKeywordInput(event.target.value)}
          style={{ width: 220 }}
        />
        <Select<CashierAccountType | undefined>
          allowClear
          placeholder="账户类型"
          value={typeFilter}
          onChange={handleTypeChange}
          options={accountTypes}
          style={{ width: 160 }}
        />
        <Space>
          <Button type="primary" onClick={handleSearch}>
            查询
          </Button>
          <Button onClick={handleResetFilters}>
            重置
          </Button>
        </Space>
        <Button type="primary" onClick={openCreateModal}>
          新建
        </Button>
      </Space>
      <Table<CashierAccount>
        rowKey="id"
        scroll={{ x: 960 }}
        loading={tableLoading}
        columns={tableColumns}
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
      <Modal
        title={editing ? '编辑账户' : '新建账户'}
        open={modalOpen}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        confirmLoading={modalSubmitting}
        destroyOnClose
      >
        <Form<CashierAccountPayload> form={form} layout="vertical" preserve={false}>
          <Form.Item
            name="name"
            label="账户名称"
            rules={[{ required: true, message: '请输入账户名称' }]}
          >
            <Input placeholder="如：招商银行对公账户" maxLength={40} />
          </Form.Item>
          <Form.Item
            name="type"
            label="账户类型"
            rules={[{ required: true, message: '请选择账户类型' }]}
          >
            <Select<CashierAccountType>
              placeholder="请选择"
              options={accountTypes}
            />
          </Form.Item>
          <Form.Item
            name="accountNumber"
            label="账号"
            rules={[{ required: true, message: '请输入账号' }]}
          >
            <Input placeholder="请输入账号" maxLength={64} />
          </Form.Item>
          {selectedType === 'bank' ? (
            <Form.Item
              name="bankName"
              label="开户行"
              rules={[{ required: true, message: '请输入开户行信息' }]}
            >
              <Input placeholder="请输入开户行" maxLength={80} />
            </Form.Item>
          ) : null}
          <Form.Item name="initialBalance" label="初始余额">
            <InputNumber
              min={0}
              step={0.01}
              precision={2}
              style={{ width: '100%' }}
              placeholder="默认为0.00"
            />
          </Form.Item>
          <Form.Item name="remarks" label="备注">
            <Input.TextArea rows={3} maxLength={120} placeholder="可记录使用场景或说明" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default SettlementCashierAccounts;
