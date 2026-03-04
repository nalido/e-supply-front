import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ColumnsType, TableProps } from 'antd/es/table';
import type { TableRowSelection } from 'antd/es/table/interface';
import dayjs, { type Dayjs } from 'dayjs';
import {
  Button,
  Card,
  Drawer,
  DatePicker,
  Empty,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from 'antd';
import { DownloadOutlined, FormOutlined, InteractionOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { pieceworkService } from '../api/piecework';
import type {
  SalaryEmployeeRecord,
  SalaryListParams,
  SalaryMeta,
  SalarySettlePayload,
  SalaryTicketListParams,
  SalaryTicketRecord,
  SalaryTicketSummary,
  SalaryPayslipRecord,
  SalaryPayslipSendResult,
  SalaryPayslipLogRecord,
  SalaryPayslipStatus,
  SalaryScanStatistics,
  SalaryTicketDetailRecord,
} from '../types/salary-management';

const { RangePicker } = DatePicker;
const { Text } = Typography;

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 20, 50];
const DETAIL_PAGE_SIZE_OPTIONS = [10, 20, 30];

const currencyFormatter = new Intl.NumberFormat('zh-CN', {
  style: 'currency',
  currency: 'CNY',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const formatCurrency = (value?: number) => currencyFormatter.format(value ?? 0);

const quantityFormatter = new Intl.NumberFormat('zh-CN');

const formatQuantity = (value?: number) => quantityFormatter.format(Math.max(0, Math.round(value ?? 0)));

const DEFAULT_TICKET_SUMMARY: SalaryTicketSummary = {
  totalQuantity: 0,
  settledAmount: 0,
  unsettledAmount: 0,
  totalAmount: 0,
};

const ticketStatusColorMap: Record<SalaryTicketRecord['status'], string> = {
  PENDING: 'orange',
  SETTLED: 'green',
  VOIDED: 'red',
};

const ticketStatusLabelMap: Record<SalaryTicketRecord['status'], string> = {
  PENDING: '待结算',
  SETTLED: '已结算',
  VOIDED: '已作废',
};

const payslipStatusMap: Record<SalaryPayslipStatus, { label: string; color: string }> = {
  SENT: { label: '已发送', color: 'green' },
  FAILED: { label: '失败', color: 'red' },
};

const createDefaultRange = (meta?: SalaryMeta): [Dayjs | null, Dayjs | null] => {
  if (!meta) {
    return [null, null];
  }
  return [dayjs(meta.defaultRange.start), dayjs(meta.defaultRange.end)];
};

type AppliedFilters = {
  startDate?: string;
  endDate?: string;
  department?: string;
  keyword?: string;
};

type TicketStatusFilter = 'all' | 'pending' | 'settled' | 'voided';

const createFilterParams = (
  params: AppliedFilters,
  page: number,
  pageSize: number,
): SalaryListParams => ({
  page,
  pageSize,
  ...params,
});

const ticketStatusOptions: Array<{ label: string; value: TicketStatusFilter }> = [
  { label: '全部状态', value: 'all' },
  { label: '待结算', value: 'pending' },
  { label: '已结算', value: 'settled' },
  { label: '作废', value: 'voided' },
];

const payslipStatusOptions: Array<{ label: string; value: SalaryPayslipStatus | 'all' }> = [
  { label: '全部状态', value: 'all' },
  { label: '已发送', value: 'SENT' },
  { label: '失败', value: 'FAILED' },
];

const SalaryManagement = () => {
  const [activeTab, setActiveTab] = useState('settlement');
  const [meta, setMeta] = useState<SalaryMeta | null>(null);
  const [metaLoading, setMetaLoading] = useState(false);
  const [records, setRecords] = useState<SalaryEmployeeRecord[]>([]);
  const [summary, setSummary] = useState({
    settledAmount: 0,
    unsettledAmount: 0,
    otherAmount: 0,
    totalAmount: 0,
    settledCount: 0,
    unsettledCount: 0,
  });
  const [tableLoading, setTableLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [total, setTotal] = useState(0);
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([null, null]);
  const [department, setDepartment] = useState('');
  const [keyword, setKeyword] = useState('');
  const [appliedFilters, setAppliedFilters] = useState<AppliedFilters>({});
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [detailEmployee, setDetailEmployee] = useState<SalaryEmployeeRecord | null>(null);
  const [ticketRecords, setTicketRecords] = useState<SalaryTicketRecord[]>([]);
  const [ticketSummary, setTicketSummary] = useState<SalaryTicketSummary>(DEFAULT_TICKET_SUMMARY);
  const [ticketPage, setTicketPage] = useState(1);
  const [ticketPageSize, setTicketPageSize] = useState(DETAIL_PAGE_SIZE_OPTIONS[0]);
  const [ticketTotal, setTicketTotal] = useState(0);
  const [ticketStatus, setTicketStatus] = useState<TicketStatusFilter>('all');
  const [ticketKeywordInput, setTicketKeywordInput] = useState('');
  const [ticketKeyword, setTicketKeyword] = useState('');
  const [ticketLoading, setTicketLoading] = useState(false);
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [adjustAmount, setAdjustAmount] = useState(0);
  const [adjustReason, setAdjustReason] = useState('');
  const [adjustSubmitting, setAdjustSubmitting] = useState(false);
  const [payslipModalOpen, setPayslipModalOpen] = useState(false);
  const [payslipSubmitting, setPayslipSubmitting] = useState(false);
  const [payslipResult, setPayslipResult] = useState<SalaryPayslipSendResult | null>(null);
  const [logRecords, setLogRecords] = useState<SalaryPayslipLogRecord[]>([]);
  const [logTotal, setLogTotal] = useState(0);
  const [logPage, setLogPage] = useState(1);
  const [logPageSize, setLogPageSize] = useState(10);
  const [logLoading, setLogLoading] = useState(false);
  const [logStatus, setLogStatus] = useState<SalaryPayslipStatus | 'all'>('all');
  const [logKeyword, setLogKeyword] = useState('');
  const [logDateRange, setLogDateRange] = useState<[Dayjs | null, Dayjs | null]>([null, null]);
  const [logFilters, setLogFilters] = useState<{ startDate?: string; endDate?: string; status?: SalaryPayslipStatus | 'all'; keyword?: string }>({
    status: 'all',
  });
  const [scanStats, setScanStats] = useState<SalaryScanStatistics | null>(null);
  const [scanStatsLoading, setScanStatsLoading] = useState(false);
  const [detailRecords, setDetailRecords] = useState<SalaryTicketDetailRecord[]>([]);
  const [detailTotal, setDetailTotal] = useState(0);
  const [detailPage, setDetailPage] = useState(1);
  const [detailPageSize, setDetailPageSize] = useState(10);
  const [detailKeywordInput, setDetailKeywordInput] = useState('');
  const [detailKeyword, setDetailKeyword] = useState('');
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    const loadMeta = async () => {
      setMetaLoading(true);
      try {
        const response = await pieceworkService.getSalaryMeta();
        setMeta(response);
        const initialRange = createDefaultRange(response);
        setDateRange(initialRange);
        setAppliedFilters({
          startDate: response.defaultRange.start,
          endDate: response.defaultRange.end,
        });
      } catch (error) {
        console.error('failed to load salary meta', error);
        message.error('加载薪资配置失败');
      } finally {
        setMetaLoading(false);
      }
    };

    void loadMeta();
  }, []);

  const loadList = useCallback(async () => {
    setTableLoading(true);
    try {
      const params = createFilterParams(appliedFilters, page, pageSize);
      const response = await pieceworkService.getSalaryList(params);
      setRecords(response.list);
      setTotal(response.total);
      setSummary(response.summary);
      setSelectedRowKeys((prev) =>
        prev.filter((key) => response.list.some((record) => record.id === key)),
      );
    } catch (error) {
      console.error('failed to load salary list', error);
      message.error('获取薪资结算列表失败');
    } finally {
      setTableLoading(false);
    }
  }, [appliedFilters, page, pageSize]);

  useEffect(() => {
    if (!appliedFilters.startDate || !appliedFilters.endDate) {
      return;
    }
    void loadList();
  }, [loadList, appliedFilters.startDate, appliedFilters.endDate]);

  const handleSearch = () => {
    const [start, end] = dateRange;
    if (!start || !end) {
      message.warning('请选择结算周期');
      return;
    }
    setAppliedFilters({
      startDate: start.format('YYYY-MM-DD'),
      endDate: end.format('YYYY-MM-DD'),
      department: department || undefined,
      keyword: keyword.trim() || undefined,
    });
    setPage(1);
  };

  const handleReset = () => {
    const range = createDefaultRange(meta ?? undefined);
    setDateRange(range);
    setDepartment('');
    setKeyword('');
    setSelectedRowKeys([]);
    if (meta) {
      setAppliedFilters({
        startDate: meta.defaultRange.start,
        endDate: meta.defaultRange.end,
      });
    } else {
      setAppliedFilters({});
    }
    setPage(1);
    setPageSize(DEFAULT_PAGE_SIZE);
  };

  const handleLogSearch = () => {
    const [start, end] = logDateRange;
    setLogFilters({
      startDate: start ? start.format('YYYY-MM-DD') : undefined,
      endDate: end ? end.format('YYYY-MM-DD') : undefined,
      status: logStatus,
      keyword: logKeyword.trim() || undefined,
    });
    setLogPage(1);
  };

  const handleLogReset = () => {
    setLogDateRange([null, null]);
    setLogStatus('all');
    setLogKeyword('');
    setLogFilters({ status: 'all' });
    setLogPage(1);
    setLogPageSize(DEFAULT_PAGE_SIZE);
  };

  const handleDetailSearch = () => {
    setDetailKeyword(detailKeywordInput.trim());
    setDetailPage(1);
  };

  const handleDetailReset = () => {
    setDetailKeywordInput('');
    setDetailKeyword('');
    setDetailPage(1);
  };

  const loadTicketList = useCallback(async () => {
    if (!detailDrawerOpen || !detailEmployee) {
      return;
    }
    if (!appliedFilters.startDate || !appliedFilters.endDate) {
      message.warning('请先选择结算周期');
      return;
    }
    const params: SalaryTicketListParams = {
      employeeId: detailEmployee.id,
      startDate: appliedFilters.startDate,
      endDate: appliedFilters.endDate,
      page: ticketPage,
      pageSize: ticketPageSize,
      status: ticketStatus,
      keyword: ticketKeyword || undefined,
    };
    setTicketLoading(true);
    try {
      const response = await pieceworkService.getSalaryTickets(params);
      setTicketRecords(response.list);
      setTicketTotal(response.total);
      setTicketSummary(response.summary ?? DEFAULT_TICKET_SUMMARY);
      if (response.page && response.page !== ticketPage) {
        setTicketPage(response.page);
      }
      if (response.pageSize && response.pageSize !== ticketPageSize) {
        setTicketPageSize(response.pageSize);
      }
    } catch (error) {
      console.error('failed to load salary ticket details', error);
      message.error('加载计件明细失败');
    } finally {
      setTicketLoading(false);
    }
  }, [
    appliedFilters.endDate,
    appliedFilters.startDate,
    detailDrawerOpen,
    detailEmployee,
    ticketKeyword,
    ticketPage,
    ticketPageSize,
    ticketStatus,
  ]);

  const loadPayslipLogs = useCallback(async () => {
    setLogLoading(true);
    try {
      const response = await pieceworkService.getPayslipLogs({
        startDate: logFilters.startDate,
        endDate: logFilters.endDate,
        status: logFilters.status,
        keyword: logFilters.keyword,
        page: logPage,
        pageSize: logPageSize,
      });
      setLogRecords(response.list);
      setLogTotal(response.total);
      if (response.page && response.page !== logPage) {
        setLogPage(response.page);
      }
      if (response.pageSize && response.pageSize !== logPageSize) {
        setLogPageSize(response.pageSize);
      }
    } catch (error) {
      console.error('failed to load payslip logs', error);
      message.error('加载工资条记录失败');
    } finally {
      setLogLoading(false);
    }
  }, [
    logFilters.endDate,
    logFilters.keyword,
    logFilters.startDate,
    logFilters.status,
    logPage,
    logPageSize,
  ]);

  useEffect(() => {
    void loadPayslipLogs();
  }, [loadPayslipLogs]);

  const loadScanStatistics = useCallback(async () => {
    if (!appliedFilters.startDate || !appliedFilters.endDate) {
      return;
    }
    setScanStatsLoading(true);
    try {
      const stats = await pieceworkService.getPayrollScanStatistics({
        startDate: appliedFilters.startDate,
        endDate: appliedFilters.endDate,
        department: appliedFilters.department,
        keyword: appliedFilters.keyword,
      });
      setScanStats(stats);
    } catch (error) {
      console.error('failed to load scan statistics', error);
      message.error('加载扫菲统计失败');
    } finally {
      setScanStatsLoading(false);
    }
  }, [appliedFilters.department, appliedFilters.endDate, appliedFilters.keyword, appliedFilters.startDate]);

  const loadTicketDetails = useCallback(
    async (pageValue: number, sizeValue: number, keywordValue: string) => {
      if (!appliedFilters.startDate || !appliedFilters.endDate) {
        return;
      }
      setDetailLoading(true);
      try {
        const response = await pieceworkService.getPayrollTicketDetails({
          startDate: appliedFilters.startDate,
          endDate: appliedFilters.endDate,
          department: appliedFilters.department,
          keyword: keywordValue,
          page: pageValue,
          pageSize: sizeValue,
        });
        setDetailRecords(response.list);
        setDetailTotal(response.total);
        setDetailPage(response.page);
        setDetailPageSize(response.pageSize);
      } catch (error) {
        console.error('failed to load payroll ticket details', error);
        message.error('加载计菲明细失败');
      } finally {
        setDetailLoading(false);
      }
    },
    [appliedFilters.department, appliedFilters.endDate, appliedFilters.startDate],
  );

  useEffect(() => {
    if (!detailDrawerOpen) {
      return;
    }
    void loadTicketList();
  }, [detailDrawerOpen, loadTicketList]);

  useEffect(() => {
    if (detailDrawerOpen) {
      return;
    }
    setDetailEmployee(null);
    setTicketRecords([]);
    setTicketSummary(DEFAULT_TICKET_SUMMARY);
    setTicketTotal(0);
    setTicketPage(1);
    setTicketPageSize(DETAIL_PAGE_SIZE_OPTIONS[0]);
    setTicketStatus('all');
    setTicketKeyword('');
    setTicketKeywordInput('');
    setTicketLoading(false);
  }, [detailDrawerOpen]);

  useEffect(() => {
    if (activeTab === 'statistics') {
      void loadScanStatistics();
    }
  }, [activeTab, loadScanStatistics]);

  useEffect(() => {
    if (activeTab === 'details') {
      void loadTicketDetails(detailPage, detailPageSize, detailKeyword);
    }
  }, [activeTab, detailKeyword, detailPage, detailPageSize, loadTicketDetails]);

  useEffect(() => {
    if (activeTab === 'details') {
      setDetailPage(1);
    }
  }, [activeTab, appliedFilters]);

  const pagination = useMemo<TableProps<SalaryEmployeeRecord>['pagination']>(
    () => ({
      current: page,
      pageSize,
      total,
      showSizeChanger: true,
      pageSizeOptions: PAGE_SIZE_OPTIONS,
      showTotal: (value: number) => `共 ${value} 条`,
    }),
    [page, pageSize, total],
  );

  const detailPagination = useMemo<TableProps<SalaryTicketDetailRecord>['pagination']>(
    () => ({
      current: detailPage,
      pageSize: detailPageSize,
      total: detailTotal,
      showSizeChanger: true,
      pageSizeOptions: PAGE_SIZE_OPTIONS,
      showTotal: (value: number) => `共 ${value} 人`,
    }),
    [detailPage, detailPageSize, detailTotal],
  );

  const handleTableChange: TableProps<SalaryEmployeeRecord>['onChange'] = (paginationConfig) => {
    if (!paginationConfig) {
      return;
    }
    const nextPage = paginationConfig.current ?? 1;
    const nextSize = paginationConfig.pageSize ?? pageSize;
    if (nextSize !== pageSize) {
      setPageSize(nextSize);
      setPage(1);
    } else if (nextPage !== page) {
      setPage(nextPage);
    }
  };

  const handleDetailTableChange: TableProps<SalaryTicketDetailRecord>['onChange'] = (paginationConfig) => {
    if (!paginationConfig) {
      return;
    }
    const nextPage = paginationConfig.current ?? 1;
    const nextSize = paginationConfig.pageSize ?? detailPageSize;
    if (nextSize !== detailPageSize) {
      setDetailPageSize(nextSize);
      setDetailPage(1);
    } else if (nextPage !== detailPage) {
      setDetailPage(nextPage);
    }
  };

  const logPagination = useMemo<TableProps<SalaryPayslipLogRecord>['pagination']>(
    () => ({
      current: logPage,
      pageSize: logPageSize,
      total: logTotal,
      showSizeChanger: true,
      pageSizeOptions: PAGE_SIZE_OPTIONS,
      showTotal: (value: number) => `共 ${value} 条`,
    }),
    [logPage, logPageSize, logTotal],
  );

  const handleLogTableChange: TableProps<SalaryPayslipLogRecord>['onChange'] = (paginationConfig) => {
    if (!paginationConfig) {
      return;
    }
    const nextPage = paginationConfig.current ?? logPage;
    const nextSize = paginationConfig.pageSize ?? logPageSize;
    if (nextSize !== logPageSize) {
      setLogPageSize(nextSize);
      setLogPage(1);
    } else if (nextPage !== logPage) {
      setLogPage(nextPage);
    }
  };

  const handleOpenDetail = useCallback(
    (record: SalaryEmployeeRecord) => {
      if (!appliedFilters.startDate || !appliedFilters.endDate) {
        message.warning('请先选择结算周期');
        return;
      }
      setDetailEmployee(record);
      setTicketPage(1);
      setTicketPageSize(DETAIL_PAGE_SIZE_OPTIONS[0]);
      setTicketStatus('all');
      setTicketKeyword('');
      setTicketKeywordInput('');
      setDetailDrawerOpen(true);
    },
    [appliedFilters.endDate, appliedFilters.startDate],
  );

  const columns: ColumnsType<SalaryEmployeeRecord> = useMemo(
    () => [
      {
        title: '序号',
        key: 'index',
        width: 80,
        align: 'right',
        render: (_value, _record, index) => (page - 1) * pageSize + index + 1,
      },
      {
        title: '姓名',
        dataIndex: 'name',
        key: 'name',
        width: 140,
        render: (value: string, record) => (
          <Space direction="vertical" size={4}>
            <Text strong>{value}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>{record.department}</Text>
          </Space>
        ),
      },
      {
        title: '已结算',
        dataIndex: 'settledAmount',
        key: 'settledAmount',
        align: 'right',
        width: 140,
        render: (value: number) => formatCurrency(value),
      },
      {
        title: '未结算',
        dataIndex: 'unsettledAmount',
        key: 'unsettledAmount',
        align: 'right',
        width: 140,
        render: (value: number) => formatCurrency(value),
      },
      {
        title: '其他',
        dataIndex: 'otherAmount',
        key: 'otherAmount',
        align: 'right',
        width: 140,
        render: (value: number) => formatCurrency(value),
      },
      {
        title: '总金额',
        dataIndex: 'totalAmount',
        key: 'totalAmount',
        align: 'right',
        width: 160,
        render: (value: number) => formatCurrency(value),
      },
      {
        title: '最近结算',
        dataIndex: 'lastSettlementDate',
        key: 'lastSettlementDate',
        width: 140,
        render: (value?: string) => value ?? '-',
      },
      {
        title: '操作',
        key: 'actions',
        fixed: 'right',
        width: 120,
        render: (_value, record) => (
          <Button type="link" onClick={() => handleOpenDetail(record)}>
            详情
          </Button>
        ),
      },
    ],
    [page, pageSize, handleOpenDetail],
  );

  const selection: TableRowSelection<SalaryEmployeeRecord> = useMemo(
    () => ({
      selectedRowKeys,
      onChange: (keys) => setSelectedRowKeys(keys),
      preserveSelectedRowKeys: true,
    }),
    [selectedRowKeys],
  );

  const handleTicketSearch = () => {
    setTicketKeyword(ticketKeywordInput.trim());
    setTicketPage(1);
  };

  const handleSettle = () => {
    const [start, end] = dateRange;
    if (!start || !end) {
      message.warning('请选择结算周期');
      return;
    }
    const payload: SalarySettlePayload = {
      startDate: start.format('YYYY-MM-DD'),
      endDate: end.format('YYYY-MM-DD'),
      department: department || undefined,
      employeeIds: selectedRowKeys.length ? selectedRowKeys.map((key) => String(key)) : undefined,
    };

    Modal.confirm({
      title: '确认结算',
      content: selectedRowKeys.length
        ? `将对 ${selectedRowKeys.length} 名员工执行结算，是否继续？`
        : '将对当前筛选范围内的员工执行结算，是否继续？',
      okText: '确认结算',
      cancelText: '取消',
      onOk: async () => {
        try {
          await pieceworkService.settlePayroll(payload);
          message.success('结算操作已完成');
          setSelectedRowKeys([]);
          void loadList();
        } catch (error) {
          console.error('failed to settle salary', error);
          message.error('结算失败，请稍后重试');
        }
      },
    });
  };

  const handlePayslip = () => {
    if (!selectedRowKeys.length) {
      message.warning('请先选择需要发送工资条的员工');
      return;
    }
    if (!appliedFilters.startDate || !appliedFilters.endDate) {
      message.warning('请先完成周期查询');
      return;
    }
    setPayslipResult(null);
    setPayslipModalOpen(true);
  };

  const handleBatchAdjust = () => {
    if (!selectedRowKeys.length) {
      message.warning('请先选择需要调整的员工');
      return;
    }
    if (!appliedFilters.startDate || !appliedFilters.endDate) {
      message.warning('请先完成周期查询');
      return;
    }
    setAdjustAmount(0);
    setAdjustReason('');
    setAdjustModalOpen(true);
  };

  const handleConfirmAdjust = async () => {
    if (!appliedFilters.startDate || !appliedFilters.endDate) {
      message.warning('请选择结算周期');
      return;
    }
    if (!selectedRowKeys.length) {
      message.warning('请先选择需要调整的员工');
      return;
    }
    if (!adjustAmount) {
      message.warning('请输入非零调整金额');
      return;
    }
    setAdjustSubmitting(true);
    try {
      await pieceworkService.batchAdjustSalary({
        startDate: appliedFilters.startDate,
        endDate: appliedFilters.endDate,
        employeeIds: selectedRowKeys.map((key) => String(key)),
        adjustment: adjustAmount,
        reason: adjustReason.trim() || undefined,
      });
      message.success('批量调整已提交');
      setAdjustModalOpen(false);
      setAdjustAmount(0);
      setAdjustReason('');
      void loadList();
    } catch (error) {
      console.error('failed to adjust salary', error);
      message.error('批量调整失败，请稍后重试');
    } finally {
      setAdjustSubmitting(false);
    }
  };

  const handleSendPayslip = async () => {
    if (!appliedFilters.startDate || !appliedFilters.endDate) {
      message.warning('请选择结算周期');
      return;
    }
    if (!selectedRowKeys.length) {
      message.warning('请先选择需要发送的员工');
      return;
    }
    setPayslipSubmitting(true);
    try {
      const result = await pieceworkService.sendPayslips({
        startDate: appliedFilters.startDate,
        endDate: appliedFilters.endDate,
        employeeIds: selectedRowKeys.map((key) => String(key)),
      });
      setPayslipResult(result);
      message.success(`已生成 ${result.sentCount} 份工资条`);
      void loadPayslipLogs();
    } catch (error) {
      console.error('failed to send payslips', error);
      message.error('工资条发送失败，请稍后重试');
    } finally {
      setPayslipSubmitting(false);
    }
  };

  const handleTicketStatusChange = (value: TicketStatusFilter) => {
    setTicketStatus(value);
    setTicketPage(1);
  };

  const ticketPagination = useMemo<TableProps<SalaryTicketRecord>['pagination']>(
    () => ({
      current: ticketPage,
      pageSize: ticketPageSize,
      total: ticketTotal,
      showSizeChanger: true,
      pageSizeOptions: DETAIL_PAGE_SIZE_OPTIONS,
      showTotal: (value: number) => `共 ${value} 条`,
    }),
    [ticketPage, ticketPageSize, ticketTotal],
  );

  const handleTicketTableChange: TableProps<SalaryTicketRecord>['onChange'] = (paginationConfig) => {
    if (!paginationConfig) {
      return;
    }
    const nextPage = paginationConfig.current ?? 1;
    const nextSize = paginationConfig.pageSize ?? ticketPageSize;
    if (nextSize !== ticketPageSize) {
      setTicketPageSize(nextSize);
      setTicketPage(1);
    } else if (nextPage !== ticketPage) {
      setTicketPage(nextPage);
    }
  };

  const ticketColumns: ColumnsType<SalaryTicketRecord> = useMemo(
    () => [
      {
        title: '序号',
        key: 'index',
        width: 80,
        align: 'right',
        render: (_value, _record, index) => (ticketPage - 1) * ticketPageSize + index + 1,
      },
      {
        title: '菲票号',
        dataIndex: 'ticketNo',
        key: 'ticketNo',
        width: 160,
      },
      {
        title: '工序',
        dataIndex: 'processName',
        key: 'processName',
        width: 160,
      },
      {
        title: '记录时间',
        dataIndex: 'recordedAt',
        key: 'recordedAt',
        width: 180,
        render: (value?: string) => (value ? dayjs(value).format('YYYY-MM-DD HH:mm') : '-'),
      },
      {
        title: '数量',
        dataIndex: 'quantity',
        key: 'quantity',
        width: 120,
        align: 'right',
        render: (value: number) => formatQuantity(value),
      },
      {
        title: '单价',
        dataIndex: 'pieceRate',
        key: 'pieceRate',
        width: 120,
        align: 'right',
        render: (value: number) => formatCurrency(value),
      },
      {
        title: '金额',
        dataIndex: 'amount',
        key: 'amount',
        width: 140,
        align: 'right',
        render: (value: number) => formatCurrency(value),
      },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        width: 120,
        render: (value: SalaryTicketRecord['status']) => (
          <Tag color={ticketStatusColorMap[value] ?? 'default'}>{ticketStatusLabelMap[value] ?? value}</Tag>
        ),
      },
      {
        title: '工单',
        key: 'workOrder',
        width: 160,
        render: (_value, record) => (record.workOrderId ? `WO-${record.workOrderId}` : '-'),
      },
    ],
    [ticketPage, ticketPageSize],
  );

  const payslipColumns: ColumnsType<SalaryPayslipRecord> = useMemo(
    () => [
      {
        title: '员工',
        dataIndex: 'employeeName',
        key: 'employeeName',
        width: 160,
      },
      {
        title: '已结算',
        dataIndex: 'settledAmount',
        key: 'settledAmount',
        width: 120,
        align: 'right',
        render: (value: number) => formatCurrency(value),
      },
      {
        title: '待结算',
        dataIndex: 'unsettledAmount',
        key: 'unsettledAmount',
        width: 120,
        align: 'right',
        render: (value: number) => formatCurrency(value),
      },
      {
        title: '调整金额',
        dataIndex: 'adjustmentAmount',
        key: 'adjustmentAmount',
        width: 120,
        align: 'right',
        render: (value: number) => formatCurrency(value),
      },
      {
        title: '合计',
        dataIndex: 'totalAmount',
        key: 'totalAmount',
        width: 140,
        align: 'right',
        render: (value: number) => formatCurrency(value),
      },
    ],
    [],
  );

  const payslipLogColumns: ColumnsType<SalaryPayslipLogRecord> = useMemo(
    () => [
      {
        title: '员工',
        dataIndex: 'employeeName',
        key: 'employeeName',
        width: 160,
        render: (value: string, record) => (
          <Space direction="vertical" size={2}>
            <Text strong>{value}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>{record.employeeId}</Text>
          </Space>
        ),
      },
      {
        title: '周期',
        key: 'period',
        width: 220,
        render: (_value, record) => `${record.startDate} ~ ${record.endDate}`,
      },
      {
        title: '已结算',
        dataIndex: 'settledAmount',
        key: 'settledAmount',
        width: 120,
        align: 'right',
        render: (value: number) => formatCurrency(value),
      },
      {
        title: '未结算',
        dataIndex: 'unsettledAmount',
        key: 'unsettledAmount',
        width: 120,
        align: 'right',
        render: (value: number) => formatCurrency(value),
      },
      {
        title: '调整',
        dataIndex: 'adjustmentAmount',
        key: 'adjustmentAmount',
        width: 120,
        align: 'right',
        render: (value: number) => formatCurrency(value),
      },
      {
        title: '合计',
        dataIndex: 'totalAmount',
        key: 'totalAmount',
        width: 140,
        align: 'right',
        render: (value: number) => formatCurrency(value),
      },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        width: 110,
        render: (value: SalaryPayslipStatus) => {
          const metaStatus = payslipStatusMap[value];
          return <Tag color={metaStatus?.color}>{metaStatus?.label ?? value}</Tag>;
        },
      },
      {
        title: '发送人',
        dataIndex: 'requestedByName',
        key: 'requestedByName',
        width: 140,
        render: (_value: string | undefined, record) => record.requestedByName || record.requestedBy || '-',
      },
      {
        title: '发送时间',
        dataIndex: 'sentAt',
        key: 'sentAt',
        width: 200,
        render: (value?: string) => (value ? dayjs(value).format('YYYY-MM-DD HH:mm') : '-'),
      },
      {
        title: '备注',
        dataIndex: 'message',
        key: 'message',
        render: (value?: string) => value || '-',
      },
    ],
    [],
  );

  const scanEmployeeColumns: ColumnsType<SalaryScanStatistics['topEmployees'][number]> = useMemo(
    () => [
      { title: '员工', dataIndex: 'employeeName', key: 'employeeName', width: 160 },
      { title: '部门', dataIndex: 'department', key: 'department', width: 140 },
      { title: '扫菲次数', dataIndex: 'ticketCount', key: 'ticketCount', width: 120, align: 'right' },
      {
        title: '扫菲数量',
        dataIndex: 'totalQuantity',
        key: 'totalQuantity',
        width: 120,
        align: 'right',
        render: (value: number) => formatQuantity(value),
      },
      {
        title: '计菲金额',
        dataIndex: 'totalAmount',
        key: 'totalAmount',
        width: 140,
        align: 'right',
        render: (value: number) => formatCurrency(value),
      },
      {
        title: '待结算',
        dataIndex: 'unsettledAmount',
        key: 'unsettledAmount',
        width: 140,
        align: 'right',
        render: (value: number) => formatCurrency(value),
      },
    ],
    [],
  );

  const scanProcessColumns: ColumnsType<SalaryScanStatistics['topProcesses'][number]> = useMemo(
    () => [
      { title: '工序', dataIndex: 'processName', key: 'processName', width: 200 },
      { title: '扫菲次数', dataIndex: 'ticketCount', key: 'ticketCount', width: 120, align: 'right' },
      { title: '扫菲数量', dataIndex: 'totalQuantity', key: 'totalQuantity', width: 140, align: 'right' },
      {
        title: '计菲金额',
        dataIndex: 'totalAmount',
        key: 'totalAmount',
        width: 160,
        align: 'right',
        render: (value: number) => formatCurrency(value),
      },
    ],
    [],
  );

  const scanTrendColumns: ColumnsType<SalaryScanStatistics['trend'][number]> = useMemo(
    () => [
      { title: '日期', dataIndex: 'date', key: 'date', width: 160 },
      { title: '扫菲数量', dataIndex: 'totalQuantity', key: 'totalQuantity', width: 140, align: 'right' },
      {
        title: '计菲金额',
        dataIndex: 'totalAmount',
        key: 'totalAmount',
        width: 160,
        align: 'right',
        render: (value: number) => formatCurrency(value),
      },
    ],
    [],
  );

  const ticketDetailColumns: ColumnsType<SalaryTicketDetailRecord> = useMemo(
    () => [
      { title: '员工', dataIndex: 'employeeName', key: 'employeeName', width: 180 },
      { title: '部门', dataIndex: 'department', key: 'department', width: 140 },
      { title: '扫菲次数', dataIndex: 'ticketCount', key: 'ticketCount', width: 120, align: 'right' },
      {
        title: '扫菲数量',
        dataIndex: 'totalQuantity',
        key: 'totalQuantity',
        width: 140,
        align: 'right',
        render: (value: number) => formatQuantity(value),
      },
      {
        title: '已结算',
        dataIndex: 'settledAmount',
        key: 'settledAmount',
        width: 140,
        align: 'right',
        render: (value: number) => formatCurrency(value),
      },
      {
        title: '待结算',
        dataIndex: 'unsettledAmount',
        key: 'unsettledAmount',
        width: 140,
        align: 'right',
        render: (value: number) => formatCurrency(value),
      },
      {
        title: '合计',
        dataIndex: 'totalAmount',
        key: 'totalAmount',
        width: 160,
        align: 'right',
        render: (value: number) => formatCurrency(value),
      },
      {
        title: '最近扫菲',
        dataIndex: 'lastScanAt',
        key: 'lastScanAt',
        width: 200,
        render: (value?: string) => (value ? dayjs(value).format('YYYY-MM-DD HH:mm') : '-'),
      },
    ],
    [],
  );

  const departmentOptions = meta?.departmentOptions ?? [
    { label: '全部部门', value: '' },
    { label: '裁床组', value: '裁床组' },
    { label: '车缝A线', value: '车缝A线' },
    { label: '车缝B线', value: '车缝B线' },
    { label: '后整组', value: '后整组' },
    { label: '质检组', value: '质检组' },
  ];

  const settlementContent = (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card variant="borderless" loading={metaLoading && !records.length}>
        <Space size={32} wrap>
          <Space direction="vertical" size={4}>
            <Text type="secondary">已结算</Text>
            <Text strong style={{ fontSize: 18 }}>{formatCurrency(summary.settledAmount)}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {summary.settledCount} 人
            </Text>
          </Space>
          <Space direction="vertical" size={4}>
            <Text type="secondary">未结算</Text>
            <Text strong style={{ fontSize: 18, color: '#fa8c16' }}>{formatCurrency(summary.unsettledAmount)}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {summary.unsettledCount} 人
            </Text>
          </Space>
          <Space direction="vertical" size={4}>
            <Text type="secondary">其他</Text>
            <Text strong style={{ fontSize: 18 }}>{formatCurrency(summary.otherAmount)}</Text>
          </Space>
          <Space direction="vertical" size={4}>
            <Text type="secondary">总金额</Text>
            <Text strong style={{ fontSize: 18 }}>{formatCurrency(summary.totalAmount)}</Text>
          </Space>
        </Space>
      </Card>

      <Card
        variant="borderless"
        title="薪资结算"
        extra={
          <Space size={8} wrap>
            <Button type="primary" icon={<InteractionOutlined />} onClick={handleSettle}>
              结算
            </Button>
            <Button icon={<DownloadOutlined />} onClick={handlePayslip}>
              工资条
            </Button>
            <Button icon={<FormOutlined />} onClick={handleBatchAdjust}>
              批量修改
            </Button>
          </Space>
        }
      >
        <Space size={12} wrap style={{ marginBottom: 16 }}>
          <RangePicker
            value={dateRange}
            onChange={(values) => {
              if (!values) {
                setDateRange([null, null]);
              } else {
                setDateRange([values[0], values[1]] as [Dayjs | null, Dayjs | null]);
              }
            }}
            style={{ width: 280 }}
            allowClear={false}
          />
          <Select
            value={department}
            onChange={(value) => setDepartment(value)}
            options={departmentOptions}
            style={{ width: 160 }}
          />
          <Input
            allowClear
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="姓名搜索"
            style={{ width: 200 }}
            onPressEnter={handleSearch}
          />
          <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
            查询
          </Button>
          <Button icon={<ReloadOutlined />} onClick={handleReset}>
            重置
          </Button>
        </Space>
        <Table<SalaryEmployeeRecord>
          rowKey={(record) => record.id}
          dataSource={records}
          columns={columns}
          loading={tableLoading}
          pagination={pagination}
          onChange={handleTableChange}
          rowSelection={selection}
          scroll={{ x: 980 }}
        />
      </Card>
    </Space>
  );

  const payslipHistoryContent = (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card
        variant="borderless"
        title="工资条推送记录"
        extra={
          <Button
            type="primary"
            onClick={handlePayslip}
            disabled={!selectedRowKeys.length || !appliedFilters.startDate || !appliedFilters.endDate}
          >
            发送工资条
          </Button>
        }
      >
        <Space size={12} wrap style={{ marginBottom: 16 }}>
          <RangePicker
            value={logDateRange}
            onChange={(values) => {
              if (!values) {
                setLogDateRange([null, null]);
              } else {
                setLogDateRange([values[0], values[1]] as [Dayjs | null, Dayjs | null]);
              }
            }}
            style={{ width: 280 }}
            placeholder={[ '开始日期', '结束日期' ]}
          />
          <Select
            value={logStatus}
            onChange={(value) => setLogStatus(value)}
            options={payslipStatusOptions}
            style={{ width: 160 }}
          />
          <Input
            allowClear
            value={logKeyword}
            onChange={(event) => setLogKeyword(event.target.value)}
            placeholder="员工/工号关键词"
            style={{ width: 220 }}
            onPressEnter={handleLogSearch}
          />
          <Button type="primary" icon={<SearchOutlined />} onClick={handleLogSearch}>
            查询
          </Button>
          <Button icon={<ReloadOutlined />} onClick={handleLogReset}>
            重置
          </Button>
        </Space>
        <Table<SalaryPayslipLogRecord>
          rowKey={(record) => record.id}
          dataSource={logRecords}
          columns={payslipLogColumns}
          loading={logLoading}
          pagination={logPagination}
          onChange={handleLogTableChange}
          scroll={{ x: 960 }}
        />
      </Card>
    </Space>
  );

  const scanStatisticsContent = (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card variant="borderless" loading={scanStatsLoading && !scanStats}>
        {scanStats ? (
          <Space size={32} wrap>
            <Space direction="vertical" size={4}>
              <Text type="secondary">扫菲次数</Text>
              <Text strong style={{ fontSize: 18 }}>{scanStats.summary.totalTickets}</Text>
            </Space>
            <Space direction="vertical" size={4}>
              <Text type="secondary">扫菲数量</Text>
              <Text strong style={{ fontSize: 18 }}>{formatQuantity(scanStats.summary.totalQuantity)}</Text>
            </Space>
            <Space direction="vertical" size={4}>
              <Text type="secondary">计菲金额</Text>
              <Text strong style={{ fontSize: 18 }}>{formatCurrency(scanStats.summary.totalAmount)}</Text>
            </Space>
            <Space direction="vertical" size={4}>
              <Text type="secondary">待结算</Text>
              <Text strong style={{ fontSize: 18, color: '#fa8c16' }}>{formatCurrency(scanStats.summary.unsettledAmount)}</Text>
            </Space>
          </Space>
        ) : (
          <Empty description="暂无统计数据" />
        )}
      </Card>
      <Space size={16} style={{ width: '100%' }} wrap>
        <Card title="员工扫菲TOP" variant="borderless" style={{ flex: 1, minWidth: 360 }}>
          <Table
            rowKey={(record) => record.employeeId}
            dataSource={scanStats?.topEmployees ?? []}
            columns={scanEmployeeColumns}
            pagination={false}
            loading={scanStatsLoading}
            size="small"
          />
        </Card>
        <Card title="工序扫菲TOP" variant="borderless" style={{ flex: 1, minWidth: 360 }}>
          <Table
            rowKey={(record, index) => `${record.processName}-${index}`}
            dataSource={scanStats?.topProcesses ?? []}
            columns={scanProcessColumns}
            pagination={false}
            loading={scanStatsLoading}
            size="small"
          />
        </Card>
      </Space>
      <Card title="扫菲趋势" variant="borderless">
        <Table
          rowKey={(record, index) => `${record.date}-${index}`}
          dataSource={scanStats?.trend ?? []}
          columns={scanTrendColumns}
          pagination={false}
          loading={scanStatsLoading}
          size="small"
        />
      </Card>
    </Space>
  );

  const ticketDetailsContent = (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card
        variant="borderless"
        title="员工计菲明细"
        extra={
          <Space size={8} wrap>
            <Input
              allowClear
              value={detailKeywordInput}
              onChange={(event) => setDetailKeywordInput(event.target.value)}
              placeholder="员工/工号关键词"
              style={{ width: 240 }}
              onPressEnter={handleDetailSearch}
            />
            <Button type="primary" icon={<SearchOutlined />} onClick={handleDetailSearch}>
              查询
            </Button>
            <Button icon={<ReloadOutlined />} onClick={handleDetailReset}>
              重置
            </Button>
          </Space>
        }
      >
        <Table<SalaryTicketDetailRecord>
          rowKey={(record) => record.employeeId}
          dataSource={detailRecords}
          columns={ticketDetailColumns}
          loading={detailLoading}
          pagination={detailPagination}
          onChange={handleDetailTableChange}
          scroll={{ x: 960 }}
        />
      </Card>
    </Space>
  );

  return (
    <>
      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key)}
        items={[
          { key: 'settlement', label: '薪资结算', children: settlementContent },
          { key: 'payslip', label: '工资条记录', children: payslipHistoryContent },
          { key: 'statistics', label: '扫菲统计', children: scanStatisticsContent },
          { key: 'details', label: '员工计菲明细表', children: ticketDetailsContent },
        ]}
      />

      <Drawer
        title={detailEmployee ? `${detailEmployee.name} 的计件明细` : '计件明细'}
        width={860}
        destroyOnHidden={false}
        maskClosable
        open={detailDrawerOpen}
        onClose={() => setDetailDrawerOpen(false)}
      >
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Card variant="borderless">
            <Space size={32} wrap>
              <Space direction="vertical" size={4}>
                <Text type="secondary">计件数量</Text>
                <Text strong style={{ fontSize: 18 }}>{formatQuantity(ticketSummary.totalQuantity)}</Text>
              </Space>
              <Space direction="vertical" size={4}>
                <Text type="secondary">待结算</Text>
                <Text strong style={{ fontSize: 18, color: '#fa8c16' }}>{formatCurrency(ticketSummary.unsettledAmount)}</Text>
              </Space>
              <Space direction="vertical" size={4}>
                <Text type="secondary">已结算</Text>
                <Text strong style={{ fontSize: 18 }}>{formatCurrency(ticketSummary.settledAmount)}</Text>
              </Space>
              <Space direction="vertical" size={4}>
                <Text type="secondary">总金额</Text>
                <Text strong style={{ fontSize: 18 }}>{formatCurrency(ticketSummary.totalAmount)}</Text>
              </Space>
            </Space>
          </Card>

          <Card
            variant="borderless"
            title="计件记录"
            extra={
              <Space size={8} wrap>
                <Select
                  value={ticketStatus}
                  onChange={handleTicketStatusChange}
                  options={ticketStatusOptions}
                  style={{ width: 140 }}
                />
                <Input
                  allowClear
                  value={ticketKeywordInput}
                  onChange={(event) => setTicketKeywordInput(event.target.value)}
                  placeholder="菲票/工序关键词"
                  style={{ width: 220 }}
                  onPressEnter={handleTicketSearch}
                />
                <Button type="primary" icon={<SearchOutlined />} onClick={handleTicketSearch}>
                  筛选
                </Button>
              </Space>
            }
          >
            <Table<SalaryTicketRecord>
              rowKey={(record) => record.id}
              dataSource={ticketRecords}
              columns={ticketColumns}
              loading={ticketLoading}
              pagination={ticketPagination}
              onChange={handleTicketTableChange}
              scroll={{ x: 900 }}
            />
          </Card>
        </Space>
      </Drawer>

      <Modal
        title="批量调整"
        open={adjustModalOpen}
        onCancel={() => setAdjustModalOpen(false)}
        onOk={handleConfirmAdjust}
        okText="提交调整"
        confirmLoading={adjustSubmitting}
      >
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Text>
            当前选中 {selectedRowKeys.length} 名员工，调整将在 {appliedFilters.startDate ?? '-'} 至 {appliedFilters.endDate ?? '-'}
            的结算周期内生效。
          </Text>
          <InputNumber
            style={{ width: '100%' }}
            value={adjustAmount}
            prefix="¥"
            step={50}
            onChange={(value) => setAdjustAmount(typeof value === 'number' ? value : 0)}
          />
          <Input.TextArea
            rows={3}
            allowClear
            value={adjustReason}
            onChange={(event) => setAdjustReason(event.target.value)}
            placeholder="请输入调整原因（选填）"
          />
        </Space>
      </Modal>

      <Modal
        title="发送工资条"
        open={payslipModalOpen}
        onCancel={() => {
          setPayslipModalOpen(false);
          setPayslipResult(null);
        }}
        onOk={handleSendPayslip}
        okText="发送"
        confirmLoading={payslipSubmitting}
        width={760}
      >
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Text>
            将向 {selectedRowKeys.length} 名员工发送 {appliedFilters.startDate ?? '-'} 至 {appliedFilters.endDate ?? '-'} 的工资条。
          </Text>
          {payslipResult && payslipResult.records.length ? (
            <Table<SalaryPayslipRecord>
              rowKey={(record) => record.employeeId}
              dataSource={payslipResult.records}
              columns={payslipColumns}
              pagination={false}
              size="small"
              scroll={{ x: 520 }}
            />
          ) : (
            <Text type="secondary">点击“发送”后将展示本次工资条的明细。</Text>
          )}
        </Space>
      </Modal>
    </>
  );
};

export default SalaryManagement;
