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
  CustomerReceiptListResponse,
  CustomerReceiptMeta,
  CustomerReceiptPayload,
  CustomerReceiptRecord,
} from '../types/settlement-customer-receipts';
import { customerReceiptService } from '../api/mock';

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

type ReceiptFormValues = Omit<CustomerReceiptPayload, 'date'> & { date?: Dayjs };

const SettlementCustomerReceipts = () => {
  const [form] = Form.useForm<ReceiptFormValues>();
  const [meta, setMeta] = useState<CustomerReceiptMeta | null>(null);
  const [metaLoading, setMetaLoading] = useState(false);

  const [records, setRecords] = useState<CustomerReceiptRecord[]>([]);
  const [summary, setSummary] = useState<CustomerReceiptListResponse['summary']>({
    totalReceivable: 0,
    totalReceived: 0,
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
  const [fixedCustomerId, setFixedCustomerId] = useState<string | undefined>(undefined);

  const loadMeta = useCallback(async () => {
    setMetaLoading(true);
    try {
      const response = await customerReceiptService.getMeta();
      setMeta(response);
    } catch (error) {
      console.error('failed to load customer receipt meta', error);
      message.error('加载客户与账户配置失败');
    } finally {
      setMetaLoading(false);
    }
  }, []);

  const loadList = useCallback(async () => {
    setTableLoading(true);
    try {
      const response = await customerReceiptService.getList({
        page,
        pageSize,
        ...filters,
      });
      setRecords(response.list);
      setTotal(response.total);
      setSummary(response.summary);
    } catch (error) {
      console.error('failed to load customer receipt list', error);
      message.error('获取客户收款列表失败');
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

  const openReceiptModal = useCallback((customerId?: string) => {
    const defaultDate = dayjs();
    setFixedCustomerId(customerId);
    form.resetFields();
    form.setFieldsValue({
      customerId,
      date: defaultDate,
    });
    setModalOpen(true);
  }, [form]);

  const handleModalCancel = () => {
    setModalOpen(false);
    setFixedCustomerId(undefined);
    form.resetFields();
  };

  const handleModalOk = async () => {
    try {
      setModalSubmitting(true);
      const values = await form.validateFields();
      const payload: CustomerReceiptPayload = {
        ...values,
        date: dayjs(values.date ?? dayjs()).format('YYYY-MM-DD'),
      };
      await customerReceiptService.create(payload);
      message.success('已登记客户收款');
      setModalOpen(false);
      setFixedCustomerId(undefined);
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
      const result = await customerReceiptService.export({
        page,
        pageSize,
        ...filters,
      });
      message.success('已生成导出任务，请稍后到下载中心查看');
      console.info('mock export url', result.fileUrl);
    } catch (error) {
      console.error('failed to export customer receipt report', error);
      message.error('导出失败，请稍后重试');
    }
  };

  const tableColumns: ColumnsType<CustomerReceiptRecord> = useMemo(() => [
    {
      title: '客户',
      dataIndex: 'customerName',
      width: 220,
      ellipsis: true,
    },
    {
      title: '应收金额',
      dataIndex: 'receivableAmount',
      align: 'right',
      width: 160,
      render: (value: number) => currencyFormatter.format(value ?? 0),
    },
    {
      title: '已收金额',
      dataIndex: 'receivedAmount',
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
      title: '最后收款日期',
      dataIndex: 'lastReceiptDate',
      width: 160,
    },
    {
      title: '操作',
      dataIndex: 'actions',
      fixed: 'right',
      width: 200,
      render: (_value, record) => (
        <Space size="small">
          <Button type="link" onClick={() => openReceiptModal(record.customerId)}>
            收款
          </Button>
          <Button
            type="link"
            onClick={() => message.info('客户对账单详情将在真实接口接入后提供')}
          >
            查看对账单
          </Button>
        </Space>
      ),
    },
  ], [openReceiptModal]);

  const customerOptions = meta?.customers ?? [];
  const paymentMethodOptions = meta?.paymentMethods ?? [];
  const accountOptions = meta?.cashierAccounts ?? [];

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card bordered={false} loading={metaLoading}>
        <Space size={16} style={{ width: '100%', justifyContent: 'space-between' }} wrap>
          <Statistic
            title="应收合计"
            value={summary.totalReceivable}
            precision={2}
            prefix="¥"
          />
          <Statistic
            title="已收合计"
            value={summary.totalReceived}
            precision={2}
            prefix="¥"
            valueStyle={{ color: '#16a34a' }}
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
            placeholder="客户"
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
            <Button type="primary" icon={<PlusOutlined />} onClick={() => openReceiptModal()}>
              新建收款
            </Button>
            <Button icon={<DownloadOutlined />} onClick={handleExport}>
              导出
            </Button>
          </Space>
        </Space>
        <Table<CustomerReceiptRecord>
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
        title="登记收款"
        open={modalOpen}
        onCancel={handleModalCancel}
        onOk={handleModalOk}
        confirmLoading={modalSubmitting}
        destroyOnClose
      >
        <Form<CustomerReceiptPayload> form={form} layout="vertical" preserve={false}>
          <Form.Item
            name="customerId"
            label="客户"
            rules={[{ required: true, message: '请选择客户' }]}
          >
            <Select
              placeholder="请选择客户"
              options={customerOptions}
              showSearch
              optionFilterProp="label"
              disabled={Boolean(fixedCustomerId)}
            />
          </Form.Item>
          <Form.Item
            name="amount"
            label="收款金额"
            rules={[{ required: true, message: '请输入收款金额' }]}
          >
            <InputNumber
              min={0.01}
              step={0.01}
              precision={2}
              style={{ width: '100%' }}
              placeholder="请输入收款金额"
            />
          </Form.Item>
          <Form.Item
            name="date"
            label="收款日期"
            rules={[{ required: true, message: '请选择收款日期' }]}
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
            label="收款账户"
            rules={[{ required: true, message: '请选择收款账户' }]}
          >
            <Select options={accountOptions} placeholder="请选择" />
          </Form.Item>
          <Form.Item name="reference" label="关联单据">
            <Input placeholder="可填写订单号/发票号" maxLength={50} />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={3} maxLength={120} placeholder="补充说明" />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
};

export default SettlementCustomerReceipts;
