import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ColumnsType } from 'antd/es/table';
import type { RangeValue } from 'rc-picker/lib/interface';
import type { Dayjs } from 'dayjs';
import {
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  message,
  Modal,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd';
import { DownloadOutlined, RedoOutlined, SearchOutlined } from '@ant-design/icons';
import type {
  ReconciliationDetailsListParams,
  ReconciliationDetailsMeta,
  ReconciliationDetailsRecord,
  ReconciliationPartnerType,
  ReconciliationStatus,
} from '../types/settlement-report-reconciliation-details';
import { reconciliationDetailsReportService } from '../api/mock';

const { RangePicker } = DatePicker;
const { Link, Text } = Typography;

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 20, 50];

const currencyFormatter = new Intl.NumberFormat('zh-CN', {
  style: 'currency',
  currency: 'CNY',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

type AppliedFilters = Omit<ReconciliationDetailsListParams, 'page' | 'pageSize'>;

const statusTextMap: Record<ReconciliationStatus, { text: string; color: string }> = {
  reconciled: { text: '已对账', color: 'success' },
  unreconciled: { text: '未对账', color: 'default' },
};

const partnerTypeOptions: Array<{ label: string; value: ReconciliationPartnerType }> = [
  { label: '客户', value: 'customer' },
  { label: '加工厂', value: 'factory' },
  { label: '供应商', value: 'supplier' },
];

const statusOptions: Array<{ label: string; value: ReconciliationStatus }> = [
  { label: '已对账', value: 'reconciled' },
  { label: '未对账', value: 'unreconciled' },
];

const buildRangeParams = (range: RangeValue<Dayjs>, startKey: string, endKey: string) => {
  const [start, end] = range ?? [];
  return {
    [startKey]: start?.format('YYYY-MM-DD'),
    [endKey]: end?.format('YYYY-MM-DD'),
  };
};

const SettlementReportReconciliationDetails = () => {
  const [meta, setMeta] = useState<ReconciliationDetailsMeta | null>(null);
  const [metaLoading, setMetaLoading] = useState(false);

  const [records, setRecords] = useState<ReconciliationDetailsRecord[]>([]);
  const [summary, setSummary] = useState({ totalAmount: 0, reconciledCount: 0 });
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [tableLoading, setTableLoading] = useState(false);

  const [partnerType, setPartnerType] = useState<ReconciliationPartnerType | undefined>(undefined);
  const [status, setStatus] = useState<ReconciliationStatus | undefined>(undefined);
  const [partnerKeyword, setPartnerKeyword] = useState('');
  const [orderNo, setOrderNo] = useState('');
  const [styleKeyword, setStyleKeyword] = useState('');
  const [statementNo, setStatementNo] = useState('');
  const [shipmentRange, setShipmentRange] = useState<RangeValue<Dayjs>>(null);
  const [reconciliationRange, setReconciliationRange] = useState<RangeValue<Dayjs>>(null);
  const [appliedFilters, setAppliedFilters] = useState<AppliedFilters>({});

  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  const loadMeta = useCallback(async () => {
    setMetaLoading(true);
    try {
      const response = await reconciliationDetailsReportService.getMeta();
      setMeta(response);
    } catch (error) {
      console.error('failed to load reconciliation meta', error);
      message.error('加载往来单位配置失败');
    } finally {
      setMetaLoading(false);
    }
  }, []);

  const loadList = useCallback(async () => {
    setTableLoading(true);
    try {
      const response = await reconciliationDetailsReportService.getList({
        page,
        pageSize,
        ...appliedFilters,
      });
      setRecords(response.list);
      setTotal(response.total);
      setSummary(response.summary);
      setSelectedRowKeys((prev) => prev.filter((key) => response.list.some((item) => item.id === key)));
    } catch (error) {
      console.error('failed to load reconciliation list', error);
      message.error('获取对账明细失败');
    } finally {
      setTableLoading(false);
    }
  }, [appliedFilters, page, pageSize]);

  useEffect(() => {
    void loadMeta();
  }, [loadMeta]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const buildFilters = (): AppliedFilters => ({
    partnerType,
    status,
    keyword: partnerKeyword.trim() || undefined,
    orderNo: orderNo.trim() || undefined,
    styleKeyword: styleKeyword.trim() || undefined,
    statementNo: statementNo.trim() || undefined,
    ...buildRangeParams(shipmentRange, 'shipmentDateStart', 'shipmentDateEnd'),
    ...buildRangeParams(reconciliationRange, 'reconciliationDateStart', 'reconciliationDateEnd'),
  });

  const handleSearch = () => {
    setAppliedFilters(buildFilters());
    setPage(1);
  };

  const handleReset = () => {
    setPartnerType(undefined);
    setStatus(undefined);
    setPartnerKeyword('');
    setOrderNo('');
    setStyleKeyword('');
    setStatementNo('');
    setShipmentRange(null);
    setReconciliationRange(null);
    setAppliedFilters({});
    setPage(1);
    setPageSize(DEFAULT_PAGE_SIZE);
    setSelectedRowKeys([]);
  };

  const handleTableChange = (nextPage: number, nextPageSize?: number) => {
    if (nextPageSize && nextPageSize !== pageSize) {
      setPageSize(nextPageSize);
      setPage(1);
      return;
    }
    setPage(nextPage);
  };

  const handleExport = async () => {
    try {
      const result = await reconciliationDetailsReportService.export({
        page,
        pageSize,
        ...appliedFilters,
      });
      message.success('已生成导出任务，请稍后到下载中心查看');
      console.info('mock export url', result.fileUrl);
    } catch (error) {
      console.error('failed to export reconciliation report', error);
      message.error('导出失败，请稍后重试');
    }
  };

  const handleCancelReconciliation = () => {
    if (!selectedRowKeys.length) {
      return;
    }
    Modal.confirm({
      title: `确定要撤销选中的 ${selectedRowKeys.length} 条对账记录吗？`,
      content: '撤销后相关业务单据将恢复为未对账状态。',
      okText: '撤销对账',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await reconciliationDetailsReportService.cancel({ ids: selectedRowKeys.map(String) });
          message.success('已撤销选中的对账记录');
          setSelectedRowKeys([]);
          void loadList();
        } catch (error) {
          console.error('failed to cancel reconciliation', error);
          message.error('撤销失败，请稍后重试');
        }
      },
    });
  };

  const tableColumns: ColumnsType<ReconciliationDetailsRecord> = useMemo(() => [
    {
      title: '对账单号',
      dataIndex: 'statementNo',
      width: 200,
      render: (value: string) => <Link>{value}</Link>,
    },
    {
      title: '往来单位',
      dataIndex: 'partnerName',
      width: 220,
      ellipsis: true,
    },
    {
      title: '单据类型',
      dataIndex: 'documentType',
      width: 140,
    },
    {
      title: '单据号',
      dataIndex: 'documentNo',
      width: 200,
      render: (value: string) => <Link>{value}</Link>,
    },
    {
      title: '金额',
      dataIndex: 'amount',
      align: 'right',
      width: 140,
      render: (value: number) => currencyFormatter.format(value ?? 0),
    },
    {
      title: '发货日期',
      dataIndex: 'shipmentDate',
      width: 140,
      render: (value?: string) => value ?? '-',
    },
    {
      title: '对账日期',
      dataIndex: 'reconciliationDate',
      width: 140,
      render: (value?: string) => value ?? '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 120,
      render: (value: ReconciliationStatus) => {
        const info = statusTextMap[value];
        return <Tag color={info.color}>{info.text}</Tag>;
      },
    },
    {
      title: '操作',
      dataIndex: 'actions',
      fixed: 'right',
      width: 160,
      render: (_value, record) => (
        <Space size="small">
          <Button
            type="link"
            onClick={() => message.info(`将打开对账单 ${record.statementNo} 的详情`)}
          >
            查看
          </Button>
        </Space>
      ),
    },
  ], []);

  const partnerPlaceholder = useMemo(() => {
    switch (partnerType) {
      case 'customer':
        return '输入客户名称';
      case 'factory':
        return '输入加工厂名称';
      case 'supplier':
        return '输入供应商名称';
      default:
        return '输入往来单位名称';
    }
  }, [partnerType]);

  const partnerNameHints = useMemo(() => {
    if (!partnerType || !meta) {
      return [];
    }
    return meta[partnerType] ?? [];
  }, [meta, partnerType]);

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card bordered={false}>
        <Space size={16} wrap>
          <Statistic title="金额合计" value={summary.totalAmount} precision={2} prefix="¥" />
          <Statistic title="已对账条数" value={summary.reconciledCount} />
        </Space>
      </Card>
      <Card bordered={false} loading={metaLoading}>
        <Form layout="inline">
          <Space align="start" size={16} wrap style={{ width: '100%' }}>
            <Form.Item label="往来单位类型" style={{ minWidth: 240 }}>
              <Select
                allowClear
                placeholder="请选择"
                options={partnerTypeOptions}
                value={partnerType}
                onChange={(value) => setPartnerType(value ?? undefined)}
              />
            </Form.Item>
            <Form.Item label="对账状态" style={{ minWidth: 240 }}>
              <Select
                allowClear
                placeholder="请选择"
                options={statusOptions}
                value={status}
                onChange={(value) => setStatus(value ?? undefined)}
              />
            </Form.Item>
            <Form.Item label="伙伴名称" style={{ minWidth: 280 }}>
              <Input
                allowClear
                placeholder={partnerPlaceholder}
                value={partnerKeyword}
                onChange={(event) => setPartnerKeyword(event.target.value)}
                list="partner-name-hints"
              />
              <datalist id="partner-name-hints">
                {partnerNameHints.map((option) => (
                  <option key={option.value} value={option.label} />
                ))}
              </datalist>
            </Form.Item>
            <Form.Item label="工厂订单号" style={{ minWidth: 240 }}>
              <Input
                allowClear
                placeholder="请输入工厂订单号"
                value={orderNo}
                onChange={(event) => setOrderNo(event.target.value)}
              />
            </Form.Item>
            <Form.Item label="款号/款名" style={{ minWidth: 240 }}>
              <Input
                allowClear
                placeholder="支持模糊搜索"
                value={styleKeyword}
                onChange={(event) => setStyleKeyword(event.target.value)}
              />
            </Form.Item>
            <Form.Item label="对账单号" style={{ minWidth: 240 }}>
              <Input
                allowClear
                placeholder="请输入对账单号"
                value={statementNo}
                onChange={(event) => setStatementNo(event.target.value)}
              />
            </Form.Item>
            <Form.Item label="发货日期" style={{ minWidth: 280 }}>
              <RangePicker value={shipmentRange} onChange={setShipmentRange} allowEmpty={[true, true]} />
            </Form.Item>
            <Form.Item label="对账日期" style={{ minWidth: 280 }}>
              <RangePicker value={reconciliationRange} onChange={setReconciliationRange} allowEmpty={[true, true]} />
            </Form.Item>
            <Form.Item>
              <Space>
                <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
                  搜索
                </Button>
                <Button icon={<RedoOutlined />} onClick={handleReset}>
                  重置
                </Button>
                <Button icon={<DownloadOutlined />} onClick={handleExport}>
                  导出Excel
                </Button>
              </Space>
            </Form.Item>
          </Space>
        </Form>
      </Card>
      <Card bordered={false}>
        <Space style={{ marginBottom: 16 }}>
          <Button
            danger
            disabled={!selectedRowKeys.length}
            onClick={handleCancelReconciliation}
          >
            撤销对账
          </Button>
          <Text type="secondary">仅已对账的记录可撤销</Text>
        </Space>
        <Table<ReconciliationDetailsRecord>
          rowKey="id"
          loading={tableLoading}
          columns={tableColumns}
          dataSource={records}
          rowSelection={{
            selectedRowKeys,
            onChange: (keys) => setSelectedRowKeys(keys),
            getCheckboxProps: (record) => ({ disabled: record.status !== 'reconciled' }),
          }}
          pagination={{
            current: page,
            pageSize,
            total,
            showTotal: (value) => `共 ${value} 条，金额合计 ${currencyFormatter.format(summary.totalAmount)}`,
            showSizeChanger: true,
            pageSizeOptions: PAGE_SIZE_OPTIONS.map(String),
            onChange: handleTableChange,
          }}
          scroll={{ x: 1100 }}
        />
      </Card>
    </Space>
  );
};

export default SettlementReportReconciliationDetails;
