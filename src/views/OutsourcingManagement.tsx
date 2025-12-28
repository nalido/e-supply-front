import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Key } from 'react';
import type { ColumnsType } from 'antd/es/table';
import type { RangeValue } from 'rc-picker/lib/interface';
import type { Dayjs } from 'dayjs';
import {
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import { DownloadOutlined, SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { outsourcingManagementApi } from '../api/outsourcing-management';
import type {
  OutsourcingManagementListItem,
  OutsourcingManagementListParams,
  OutsourcingManagementListResponse,
  OutsourcingManagementMeta,
  OutsourcingTaskStatus,
} from '../types/outsourcing-management';

const { RangePicker } = DatePicker;
const { Text } = Typography;

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 20, 50];

const STATUS_COLOR_MAP: Record<OutsourcingTaskStatus, string> = {
  待发出: 'default',
  已发出: 'processing',
  已接收: 'warning',
  已完成: 'success',
  已结算: 'blue',
  已取消: 'default',
};

const CURRENCY_FORMATTER = new Intl.NumberFormat('zh-CN', {
  style: 'currency',
  currency: 'CNY',
  minimumFractionDigits: 2,
});
const QUANTITY_FORMATTER = new Intl.NumberFormat('zh-CN');
const PERCENT_FORMATTER = new Intl.NumberFormat('zh-CN', {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const formatCurrency = (value: number): string => CURRENCY_FORMATTER.format(value ?? 0);
const formatQuantity = (value: number): string => QUANTITY_FORMATTER.format(value ?? 0);
const formatPercent = (value: number): string => PERCENT_FORMATTER.format(value ?? 0);

const buildDateParams = (
  range: RangeValue<Dayjs>,
): { dispatchDateStart?: string; dispatchDateEnd?: string } => {
  if (!range || !range[0] || !range[1]) {
    return {};
  }
  return {
    dispatchDateStart: range[0].startOf('day').format('YYYY-MM-DD'),
    dispatchDateEnd: range[1].endOf('day').format('YYYY-MM-DD'),
  };
};

const STATUS_FILTER_OPTIONS = [
  { label: '全部状态', value: '' },
  { label: '待发出', value: 'PENDING_DISPATCH' },
  { label: '已发出', value: 'DISPATCHED' },
  { label: '已接收', value: 'RECEIVED' },
  { label: '已完成', value: 'COMPLETED' },
  { label: '已结算', value: 'SETTLED' },
  { label: '已取消', value: 'CANCELLED' },
];

const OutsourcingManagement = () => {
  const [meta, setMeta] = useState<OutsourcingManagementMeta | null>(null);
  const [metaLoading, setMetaLoading] = useState(false);
  const [records, setRecords] = useState<OutsourcingManagementListItem[]>([]);
  const [tableLoading, setTableLoading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [total, setTotal] = useState(0);
  const [receiveModalState, setReceiveModalState] = useState<{
    visible: boolean;
    record?: OutsourcingManagementListItem;
  }>({ visible: false });
  const [submittingReceive, setSubmittingReceive] = useState(false);
  const [receiveForm] = Form.useForm();

  const [orderNo, setOrderNo] = useState('');
  const [styleKeyword, setStyleKeyword] = useState('');
  const [processorId, setProcessorId] = useState<string | undefined>();
  const [dispatchRange, setDispatchRange] = useState<RangeValue<Dayjs>>(null);
  const [statusKey, setStatusKey] = useState('');

  const [summary, setSummary] = useState({
    totalOrders: 0,
    inProgressOrders: 0,
    completedOrders: 0,
    dispatchedQty: 0,
    goodReceivedQty: 0,
  });

  const [appliedParams, setAppliedParams] = useState<OutsourcingManagementListParams>({
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    statusKey: undefined,
  });

  useEffect(() => {
    const loadMeta = async () => {
      setMetaLoading(true);
      try {
        const response = await outsourcingManagementApi.getMeta();
        setMeta(response);
      } catch (error) {
        console.error('failed to load outsourcing management meta', error);
        message.error('加载加工厂列表失败');
      } finally {
        setMetaLoading(false);
      }
    };

    loadMeta();
  }, []);

  const loadList = useCallback(async () => {
    setTableLoading(true);
    try {
      const response: OutsourcingManagementListResponse =
        await outsourcingManagementApi.getList(appliedParams);
      setRecords(response.list);
      setTotal(response.total);
      setSummary(
        response.summary ?? {
          totalOrders: 0,
          inProgressOrders: 0,
          completedOrders: 0,
          dispatchedQty: 0,
          goodReceivedQty: 0,
        },
      );
    } catch (error) {
      console.error('failed to load outsourcing management list', error);
      message.error('获取外发任务失败');
    } finally {
      setTableLoading(false);
    }
  }, [appliedParams]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const handleSearch = () => {
    const trimmedOrderNo = orderNo.trim();
    const trimmedStyle = styleKeyword.trim();
    const dateParams = buildDateParams(dispatchRange);

    setAppliedParams({
      page: 1,
      pageSize,
      orderNo: trimmedOrderNo || undefined,
      styleKeyword: trimmedStyle || undefined,
      processorId: processorId || undefined,
      statusKey: statusKey || undefined,
      ...dateParams,
    });
    setPage(1);
    setSelectedRowKeys([]);
  };

  const handleReset = () => {
    setOrderNo('');
    setStyleKeyword('');
    setProcessorId(undefined);
    setDispatchRange(null);
    setStatusKey('');
    setAppliedParams({ page: 1, pageSize: DEFAULT_PAGE_SIZE, statusKey: undefined });
    setPage(1);
    setPageSize(DEFAULT_PAGE_SIZE);
    setSelectedRowKeys([]);
  };

  const handlePaginationChange = (nextPage: number, nextPageSize?: number) => {
    const size = nextPageSize ?? pageSize;
    setPage(nextPage);
    setPageSize(size);
    setAppliedParams((prev) => ({ ...prev, page: nextPage, pageSize: size }));
  };

  const handleExport = async () => {
    try {
      await outsourcingManagementApi.export(appliedParams);
      message.success('已生成导出任务，请稍后在下载中心查看');
    } catch (error) {
      console.error('failed to export outsourcing management list', error);
      message.error('导出失败，请稍后重试');
    }
  };

  const handleReceiveSubmit = async () => {
    if (!receiveModalState.record) {
      return;
    }
    try {
      const values = await receiveForm.validateFields();
      setSubmittingReceive(true);
      await outsourcingManagementApi.confirmReceive({
        orderId: receiveModalState.record.id,
        receivedQty: Number(values.receivedQty),
        defectQty: Number(values.defectQty ?? 0),
        reworkQty: Number(values.reworkQty ?? 0),
        receivedAt: values.receivedAt?.format('YYYY-MM-DD') ?? dayjs().format('YYYY-MM-DD'),
        remark: values.remark?.trim() || undefined,
      });
      message.success('已提交接收记录');
      setReceiveModalState({ visible: false });
      receiveForm.resetFields();
      void loadList();
    } catch (error: unknown) {
      if ((error as { errorFields?: unknown })?.errorFields) {
        return;
      }
      console.error('failed to confirm receive', error);
      message.error('确认接收失败，请稍后重试');
    } finally {
      setSubmittingReceive(false);
    }
  };

  const handleReceiveCancel = () => {
    setReceiveModalState({ visible: false });
    receiveForm.resetFields();
  };

  const handleConfirmReceive = useCallback((record: OutsourcingManagementListItem) => {
    setReceiveModalState({ visible: true, record });
    receiveForm.setFieldsValue({
      receivedQty: record.receivedQty || record.dispatchedQty,
      defectQty: 0,
      reworkQty: 0,
      receivedAt: dayjs(),
      remark: '',
    });
  }, [receiveForm]);

  const columns: ColumnsType<OutsourcingManagementListItem> = useMemo(
    () => [
      {
        title: '状态',
        dataIndex: 'status',
        width: 100,
        render: (value: OutsourcingTaskStatus) => (
          <Tag color={STATUS_COLOR_MAP[value] ?? 'default'}>{value}</Tag>
        ),
      },
      {
        title: '外发单号',
        dataIndex: 'outgoingNo',
        width: 170,
      },
      {
        title: '工厂订单号',
        dataIndex: 'orderNo',
        width: 160,
      },
      {
        title: '款号/款名',
        dataIndex: 'styleNo',
        width: 220,
        render: (_: unknown, record) => (
          <Space direction="vertical" size={0}>
            <Text strong>{record.styleNo}</Text>
            <Text type="secondary">{record.styleName}</Text>
          </Space>
        ),
      },
      {
        title: '加工厂',
        dataIndex: 'processorName',
        width: 150,
      },
      {
        title: '加工工序',
        dataIndex: 'processStep',
        width: 120,
      },
      {
        title: '发出数量',
        dataIndex: 'dispatchedQty',
        width: 120,
        align: 'right',
        render: (value: number) => formatQuantity(value),
      },
      {
        title: '接收数量',
        dataIndex: 'receivedQty',
        width: 120,
        align: 'right',
        render: (value: number) => formatQuantity(value),
      },
      {
        title: '损耗率',
        dataIndex: 'attritionRate',
        align: 'right',
        width: 110,
        render: (value: number) => formatPercent(value),
      },
      {
        title: '加工单价',
        dataIndex: 'unitPrice',
        width: 120,
        align: 'right',
        render: (value: number) => formatCurrency(value),
      },
      {
        title: '加工费用',
        dataIndex: 'totalCost',
        width: 130,
        align: 'right',
        render: (value: number) => formatCurrency(value),
      },
      {
        title: '外发日期',
        dataIndex: 'dispatchDate',
        width: 140,
      },
      {
        title: '预计完成',
        dataIndex: 'expectedCompletionDate',
        width: 140,
        render: (value?: string | null) => value ?? '-',
      },
      {
        title: '操作',
        width: 160,
        fixed: 'right',
        render: (_: unknown, record) => (
          <Space>
            <Button type="link" onClick={() => handleConfirmReceive(record)}>
              确认接收
            </Button>
            <Button type="link" onClick={() => message.info(`查看外发单 ${record.outgoingNo}`)}>
              查看
            </Button>
          </Space>
        ),
      },
    ],
    [handleConfirmReceive],
  );

  const summaryItems = useMemo(
    () => [
      { key: 'total', label: '外发订单', value: summary.totalOrders, suffix: ' 单' },
      { key: 'inProgress', label: '进行中', value: summary.inProgressOrders, suffix: ' 单' },
      { key: 'completed', label: '已完成', value: summary.completedOrders, suffix: ' 单' },
      { key: 'dispatched', label: '累计发出', value: summary.dispatchedQty, suffix: ' 件' },
      { key: 'received', label: '良品回收', value: summary.goodReceivedQty, suffix: ' 件' },
    ],
    [summary],
  );

  return (
    <Card title="外发管理">
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Card bordered={false} loading={tableLoading && !records.length}>
          <Space size={24} wrap>
            {summaryItems.map((item) => (
              <div key={item.key} style={{ minWidth: 160 }}>
                <Text type="secondary">{item.label}</Text>
                <div style={{ fontSize: 20, fontWeight: 600 }}>
                  {formatQuantity(item.value)}{item.suffix}
                </div>
              </div>
            ))}
          </Space>
        </Card>

        <Space size={12} wrap>
          <Input
            allowClear
            placeholder="请输入工厂订单号"
            prefix={<SearchOutlined />}
            style={{ width: 220 }}
            value={orderNo}
            onChange={(event) => setOrderNo(event.target.value)}
          />
          <Input
            allowClear
            placeholder="请输入款号/款名"
            style={{ width: 220 }}
            value={styleKeyword}
            onChange={(event) => setStyleKeyword(event.target.value)}
          />
          <Select<string>
            allowClear
            loading={metaLoading}
            placeholder="请选择加工厂"
            style={{ width: 200 }}
            value={processorId}
            onChange={(value) => setProcessorId(value ?? undefined)}
            options={meta?.processors.map((item) => ({ label: item.name, value: item.id })) ?? []}
          />
          <Select
            allowClear
            placeholder="请选择状态"
            style={{ width: 180 }}
            value={statusKey}
            onChange={(value) => setStatusKey(value || '')}
            options={STATUS_FILTER_OPTIONS}
          />
          <RangePicker
            allowClear
            style={{ width: 280 }}
            value={dispatchRange}
            onChange={(value) => setDispatchRange(value)}
          />
          <Space>
            <Button type="primary" onClick={handleSearch}>
              筛选
            </Button>
            <Button onClick={handleReset}>重置</Button>
          </Space>
        </Space>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space direction="vertical" size={0}>
            <Text strong>外发任务列表</Text>
            <Text type="secondary">共 {total} 条记录</Text>
          </Space>
          <Space>
            <Button icon={<DownloadOutlined />} onClick={handleExport}>
              导出Excel
            </Button>
          </Space>
        </div>

        <Table<OutsourcingManagementListItem>
          rowKey="id"
          bordered
          scroll={{ x: 1400 }}
          loading={tableLoading}
          dataSource={records}
          columns={columns}
          rowSelection={{
            selectedRowKeys,
            onChange: (keys) => setSelectedRowKeys(keys),
          }}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            pageSizeOptions: PAGE_SIZE_OPTIONS.map(String),
            onChange: handlePaginationChange,
            showTotal: (value) => `共 ${value} 条`,
          }}
        />
      </Space>

      <Modal
        open={receiveModalState.visible}
        title={receiveModalState.record ? `确认接收 - ${receiveModalState.record.outgoingNo}` : '确认接收'}
        onCancel={handleReceiveCancel}
        onOk={handleReceiveSubmit}
        confirmLoading={submittingReceive}
        destroyOnClose
      >
        <Form layout="vertical" form={receiveForm} preserve={false}>
          <Form.Item
            label="接收数量"
            name="receivedQty"
            rules={[{ required: true, message: '请输入接收数量' }]}
          >
            <InputNumber min={0} precision={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="不良数量" name="defectQty">
            <InputNumber min={0} precision={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="返工数量" name="reworkQty">
            <InputNumber min={0} precision={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            label="接收日期"
            name="receivedAt"
            rules={[{ required: true, message: '请选择接收日期' }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="备注" name="remark">
            <Input.TextArea rows={3} maxLength={200} placeholder="可选" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default OutsourcingManagement;
