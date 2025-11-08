import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ColumnsType, TableProps } from 'antd/es/table';
import type { TableRowSelection } from 'antd/es/table/interface';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import {
  Button,
  Card,
  DatePicker,
  Empty,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tabs,
  Typography,
  message,
} from 'antd';
import { DownloadOutlined, FormOutlined, InteractionOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { salaryManagementService } from '../api/mock';
import type {
  SalaryEmployeeRecord,
  SalaryListParams,
  SalaryMeta,
  SalarySettlePayload,
} from '../types/salary-management';

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

const formatCurrency = (value?: number) => currencyFormatter.format(value ?? 0);

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

const createFilterParams = (
  params: AppliedFilters,
  page: number,
  pageSize: number,
): SalaryListParams => ({
  page,
  pageSize,
  ...params,
});

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

  useEffect(() => {
    const loadMeta = async () => {
      setMetaLoading(true);
      try {
        const response = await salaryManagementService.getMeta();
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
      const response = await salaryManagementService.getList(params);
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
          <Button
            type="link"
            onClick={() => message.info(`查看 ${record.name} 的计件明细（Mock）`)}
          >
            详情
          </Button>
        ),
      },
    ],
    [page, pageSize],
  );

  const selection: TableRowSelection<SalaryEmployeeRecord> = useMemo(
    () => ({
      selectedRowKeys,
      onChange: (keys) => setSelectedRowKeys(keys),
      preserveSelectedRowKeys: true,
    }),
    [selectedRowKeys],
  );

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
          await salaryManagementService.settle(payload);
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
    message.info('工资条功能正在建设中，敬请期待');
  };

  const handleBatchAdjust = () => {
    if (!selectedRowKeys.length) {
      message.warning('请先选择需要调整的员工');
      return;
    }
    message.info(`已选择 ${selectedRowKeys.length} 名员工，模拟批量调整弹窗`);
  };

  const handleSalaryItems = () => {
    message.info('薪资条目配置将在接入正式接口时开放');
  };

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
      <Card bordered={false} loading={metaLoading && !records.length}>
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
        bordered={false}
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
            <Button icon={<SearchOutlined />} onClick={handleSalaryItems}>
              薪资条目
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

  const placeholderCard = (title: string) => (
    <Card bordered={false} style={{ minHeight: 240, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Empty description={`${title}功能正在设计中`} />
    </Card>
  );

  return (
    <Tabs
      activeKey={activeTab}
      onChange={(key) => setActiveTab(key)}
      items={[
        { key: 'settlement', label: '薪资结算', children: settlementContent },
        { key: 'payslip', label: '工资条', children: placeholderCard('工资条') },
        { key: 'statistics', label: '扫菲统计', children: placeholderCard('扫菲统计') },
        { key: 'details', label: '员工计菲明细表', children: placeholderCard('员工计菲明细表') },
      ]}
    />
  );
};

export default SalaryManagement;
