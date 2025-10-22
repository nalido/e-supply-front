import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ColumnsType } from 'antd/es/table';
import type { RangeValue } from 'rc-picker/lib/interface';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import {
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Select,
  Space,
  Statistic,
  Table,
  Typography,
} from 'antd';
import { DownloadOutlined, PlusOutlined } from '@ant-design/icons';
import type {
  FactoryPaymentListResponse,
  FactoryPaymentMeta,
  FactoryPaymentPayload,
  FactoryPaymentRecord,
} from '../types/settlement-factory-payments';
import { factoryPaymentService } from '../api/mock';

const { RangePicker } = DatePicker;
const { Text } = Typography;

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 20, 50];

const currencyFormatter = new Intl.NumberFormat('zh-CN', {
  style: 'currency',
  currency: 'CNY',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

type PaymentFormValues = Omit<FactoryPaymentPayload, 'date'> & { date?: Dayjs };

const SettlementFactoryPayments = () => {
  const [form] = Form.useForm<PaymentFormValues>();
  const [meta, setMeta] = useState<FactoryPaymentMeta | null>(null);
  const [metaLoading, setMetaLoading] = useState(false);

  const [records, setRecords] = useState<FactoryPaymentRecord[]>([]);
  const [summary, setSummary] = useState<FactoryPaymentListResponse['summary']>({
    totalPayable: 0,
    totalPaid: 0,
    totalArrears: 0,
  });
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [tableLoading, setTableLoading] = useState(false);

  const [keywordInput, setKeywordInput] = useState('');
  const [dateRange, setDateRange] = useState<RangeValue<Dayjs>>(null);
  const [filters, setFilters] = useState<{ keyword?: string; startDate?: string; endDate?: string }>({});

  const [modalOpen, setModalOpen] = useState(false);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [fixedFactoryId, setFixedFactoryId] = useState<string | undefined>(undefined);

  const loadMeta = useCallback(async () => {
    setMetaLoading(true);
    try {
      const response = await factoryPaymentService.getMeta();
      setMeta(response);
    } catch (error) {
      console.error('failed to load factory payment meta', error);
      message.error('加载加工厂与账户配置失败');
    } finally {
      setMetaLoading(false);
    }
  }, []);

  const loadList = useCallback(async () => {
    setTableLoading(true);
    try {
      const response = await factoryPaymentService.getList({
        page,
        pageSize,
        ...filters,
      });
      setRecords(response.list);
      setTotal(response.total);
      setSummary(response.summary);
    } catch (error) {
      console.error('failed to load factory payment list', error);
      message.error('获取加工厂付款列表失败');
    } finally {
      setTableLoading(false);
    }
  }, [filters, page, pageSize]);

  useEffect(() => {
    void loadMeta();
  }, [loadMeta]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const buildFiltersFromInputs = () => {
    const keyword = keywordInput.trim();
    const [start, end] = dateRange ?? [];
    return {
      keyword: keyword || undefined,
      startDate: start?.format('YYYY-MM-DD'),
      endDate: end?.format('YYYY-MM-DD'),
    };
  };

  const handleSearch = () => {
    setFilters(buildFiltersFromInputs());
    setPage(1);
  };

  const handleReset = () => {
    setKeywordInput('');
    setDateRange(null);
    setFilters({});
    setPage(1);
    setPageSize(DEFAULT_PAGE_SIZE);
  };

  const handleTableChange = (nextPage: number, nextPageSize?: number) => {
    if (nextPageSize && nextPageSize !== pageSize) {
      setPageSize(nextPageSize);
      setPage(1);
      return;
    }
    setPage(nextPage);
  };

  const openPaymentModal = useCallback((factoryId?: string) => {
    const defaultDate = dayjs();
    setFixedFactoryId(factoryId);
    form.resetFields();
    form.setFieldsValue({
      factoryId,
      date: defaultDate,
    });
    setModalOpen(true);
  }, [form]);

  const handleModalCancel = () => {
    setModalOpen(false);
    setFixedFactoryId(undefined);
    form.resetFields();
  };

  const handleModalOk = async () => {
    try {
      setModalSubmitting(true);
      const values = await form.validateFields();
      const payload: FactoryPaymentPayload = {
        ...values,
        date: dayjs(values.date ?? dayjs()).format('YYYY-MM-DD'),
      };
      await factoryPaymentService.create(payload);
      message.success('已登记加工厂付款');
      setModalOpen(false);
      setFixedFactoryId(undefined);
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

  const handleExport = async () => {
    try {
      const result = await factoryPaymentService.export({
        page,
        pageSize,
        ...filters,
      });
      message.success('已生成导出任务，请稍后到下载中心查看');
      console.info('mock export url', result.fileUrl);
    } catch (error) {
      console.error('failed to export factory payment report', error);
      message.error('导出失败，请稍后重试');
    }
  };

  const tableColumns: ColumnsType<FactoryPaymentRecord> = useMemo(() => [
    {
      title: '加工厂',
      dataIndex: 'factoryName',
      width: 220,
      ellipsis: true,
    },
    {
      title: '应付金额',
      dataIndex: 'payableAmount',
      align: 'right',
      width: 160,
      render: (value: number) => currencyFormatter.format(value ?? 0),
    },
    {
      title: '已付金额',
      dataIndex: 'paidAmount',
      align: 'right',
      width: 160,
      render: (value: number) => currencyFormatter.format(value ?? 0),
    },
    {
      title: '欠款金额',
      dataIndex: 'arrearsAmount',
      align: 'right',
      width: 160,
      render: (value: number) => (
        <Text type={value > 0 ? 'danger' : undefined}>
          {currencyFormatter.format(value ?? 0)}
        </Text>
      ),
    },
    {
      title: '最后付款日期',
      dataIndex: 'lastPaymentDate',
      width: 160,
    },
    {
      title: '操作',
      dataIndex: 'actions',
      fixed: 'right',
      width: 200,
      render: (_value, record) => (
        <Space size="small">
          <Button type="link" onClick={() => openPaymentModal(record.factoryId)}>
            付款
          </Button>
          <Button
            type="link"
            onClick={() => message.info('加工厂对账单将在真实接口接入后提供')}
          >
            查看对账单
          </Button>
        </Space>
      ),
    },
  ], [openPaymentModal]);

  const factoryOptions = meta?.factories ?? [];
  const paymentMethodOptions = meta?.paymentMethods ?? [];
  const accountOptions = meta?.cashierAccounts ?? [];

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card bordered={false} loading={metaLoading}>
        <Space size={16} style={{ width: '100%', justifyContent: 'space-between' }} wrap>
          <Statistic title="应付合计" value={summary.totalPayable} precision={2} prefix="¥" />
          <Statistic
            title="已付合计"
            value={summary.totalPaid}
            precision={2}
            prefix="¥"
            valueStyle={{ color: '#2563eb' }}
          />
          <Statistic
            title="欠款合计"
            value={summary.totalArrears}
            precision={2}
            prefix="¥"
            valueStyle={{ color: summary.totalArrears > 0 ? '#dc2626' : undefined }}
          />
        </Space>
      </Card>
      <Card bordered={false}>
        <Space style={{ marginBottom: 16 }} wrap>
          <Input
            allowClear
            placeholder="加工厂"
            value={keywordInput}
            onChange={(event) => setKeywordInput(event.target.value)}
            style={{ width: 220 }}
          />
          <RangePicker
            value={dateRange}
            onChange={setDateRange}
            style={{ width: 300 }}
            allowEmpty={[true, true]}
          />
          <Space>
            <Button type="primary" onClick={handleSearch}>
              查询
            </Button>
            <Button onClick={handleReset}>
              重置
            </Button>
          </Space>
          <Space>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => openPaymentModal()}>
              新建付款
            </Button>
            <Button icon={<DownloadOutlined />} onClick={handleExport}>
              导出
            </Button>
          </Space>
        </Space>
        <Table<FactoryPaymentRecord>
          rowKey="id"
          loading={tableLoading}
          columns={tableColumns}
          dataSource={records}
          pagination={{
            current: page,
            pageSize,
            total,
            showTotal: (value) => `共 ${value} 条`,
            showSizeChanger: true,
            pageSizeOptions: PAGE_SIZE_OPTIONS.map(String),
            onChange: handleTableChange,
          }}
        />
      </Card>
      <Modal
        title="登记付款"
        open={modalOpen}
        onCancel={handleModalCancel}
        onOk={handleModalOk}
        confirmLoading={modalSubmitting}
        destroyOnClose
      >
        <Form<PaymentFormValues> form={form} layout="vertical" preserve={false}>
          <Form.Item
            name="factoryId"
            label="加工厂"
            rules={[{ required: true, message: '请选择加工厂' }]}
          >
            <Select
              placeholder="请选择加工厂"
              options={factoryOptions}
              showSearch
              optionFilterProp="label"
              disabled={Boolean(fixedFactoryId)}
            />
          </Form.Item>
          <Form.Item
            name="amount"
            label="付款金额"
            rules={[{ required: true, message: '请输入付款金额' }]}
          >
            <InputNumber
              min={0.01}
              step={0.01}
              precision={2}
              style={{ width: '100%' }}
              placeholder="请输入付款金额"
            />
          </Form.Item>
          <Form.Item
            name="date"
            label="付款日期"
            rules={[{ required: true, message: '请选择付款日期' }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="paymentMethod"
            label="支付方式"
            rules={[{ required: true, message: '请选择支付方式' }]}
          >
            <Select options={paymentMethodOptions} placeholder="请选择" />
          </Form.Item>
          <Form.Item
            name="cashierAccountId"
            label="付款账户"
            rules={[{ required: true, message: '请选择付款账户' }]}
          >
            <Select options={accountOptions} placeholder="请选择" />
          </Form.Item>
          <Form.Item name="reference" label="关联加工单">
            <Input placeholder="可填写加工单号" maxLength={50} />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={3} maxLength={120} placeholder="补充说明" />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
};

export default SettlementFactoryPayments;
