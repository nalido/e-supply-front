import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Key } from 'react';
import type { ColumnsType } from 'antd/es/table';
import type { RangeValue } from 'rc-picker/lib/interface';
import type { Dayjs } from 'dayjs';
import {
  Button,
  Card,
  Descriptions,
  Drawer,
  Empty,
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
  Progress,
  Spin,
  message,
} from 'antd';
import { DownloadOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { outsourcingManagementApi } from '../api/outsourcing-management';
import type {
  OutsourcingManagementListItem,
  OutsourcingManagementListParams,
  OutsourcingManagementListResponse,
  OutsourcingManagementMeta,
  OutsourcingOrderDetail,
  OutsourcingOrderReceipt,
  OutsourcingMaterialRequestRecord,
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
const formatDateTime = (value?: string): string =>
  value ? dayjs(value).format('YYYY-MM-DD HH:mm') : '-';

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

const STATUS_UPDATE_OPTIONS = STATUS_FILTER_OPTIONS.filter((item) => item.value).map((item) => ({
  label: item.label,
  value: item.value,
}));

type OutsourcingCreateForm = {
  productionOrderId: string;
  workOrderId: string;
  subcontractorId: string;
  processCatalogId: string;
  dispatchQty: number;
  unitPrice: number;
  attritionRate?: number;
  orderNo?: string;
  dispatchDate: Dayjs;
  expectedReturnDate?: Dayjs;
};

type OutsourcingStatusForm = {
  orderId: string;
  status: string;
};

type OutsourcingMaterialForm = {
  orderId: string;
  materialId?: string;
  requestQuantity: number;
  requestedAt?: Dayjs;
  remark?: string;
};

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
  const [exporting, setExporting] = useState(false);
  const [receiveForm] = Form.useForm();
  const [createForm] = Form.useForm<OutsourcingCreateForm>();
  const [statusForm] = Form.useForm<OutsourcingStatusForm>();
  const [materialForm] = Form.useForm<OutsourcingMaterialForm>();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [statusSubmitting, setStatusSubmitting] = useState(false);
  const [materialModalOpen, setMaterialModalOpen] = useState(false);
  const [materialSubmitting, setMaterialSubmitting] = useState(false);
  const [statusTargetOrder, setStatusTargetOrder] = useState<OutsourcingManagementListItem | null>(null);
  const [materialTargetOrder, setMaterialTargetOrder] = useState<OutsourcingManagementListItem | null>(null);
  const [productionOptions, setProductionOptions] = useState<Array<{ id: string; label: string }>>([]);
  const [workOrderOptions, setWorkOrderOptions] = useState<Array<{ id: string; label: string }>>([]);
  const [processOptions, setProcessOptions] = useState<Array<{ id: string; label: string }>>([]);
  const [materialOptions, setMaterialOptions] = useState<Array<{ id: string; label: string }>>([]);

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
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [orderDetail, setOrderDetail] = useState<OutsourcingOrderDetail | null>(null);

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

  const loadCreateOptions = useCallback(async () => {
    try {
      const [production, processes] = await Promise.all([
        outsourcingManagementApi.listProductionOrderOptions(),
        outsourcingManagementApi.listProcessOptions(),
      ]);
      setProductionOptions(production);
      setProcessOptions(processes);
      if (production.length > 0) {
        const productionOrderId = production[0].id;
        const workOrders = await outsourcingManagementApi.listWorkOrderOptions(productionOrderId);
        setWorkOrderOptions(workOrders);
        createForm.setFieldValue('productionOrderId', productionOrderId);
        createForm.setFieldValue('workOrderId', workOrders[0]?.id);
      } else {
        setWorkOrderOptions([]);
      }
      createForm.setFieldValue('subcontractorId', meta?.processors?.[0]?.id);
      createForm.setFieldValue('processCatalogId', processes[0]?.id);
    } catch (error) {
      console.error('failed to load outsource create options', error);
      message.error('加载外发创建选项失败');
    }
  }, [createForm, meta?.processors]);

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

  const performExport = async (selectedOnly: boolean) => {
    try {
      setExporting(true);
      const exportParams = selectedOnly
        ? { ...appliedParams, selectedOrderIds: selectedRowKeys.map((key) => String(key)) }
        : appliedParams;
      const result = await outsourcingManagementApi.export(exportParams);
      if (result.fileUrl) {
        message.success(`已生成导出文件：${result.fileUrl}`);
      } else {
        message.success('已生成导出任务，请稍后在下载中心查看');
      }
    } catch (error) {
      console.error('failed to export outsourcing management list', error);
      message.error('导出失败，请稍后重试');
    } finally {
      setExporting(false);
    }
  };

  const handleExportAll = () => {
    void performExport(false);
  };

  const handleExportSelected = () => {
    if (!selectedRowKeys.length) {
      message.warning('请先勾选需要导出的外发单');
      return;
    }
    void performExport(true);
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

  const handleViewDetail = useCallback(async (record: OutsourcingManagementListItem) => {
    setDetailDrawerOpen(true);
    setDetailLoading(true);
    try {
      const detailData = await outsourcingManagementApi.getDetail(record.id);
      setOrderDetail(detailData);
    } catch (error) {
      console.error('failed to load outsourcing detail', error);
      message.error('加载外发单详情失败');
      setDetailDrawerOpen(false);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const handleDetailClose = () => {
    setDetailDrawerOpen(false);
    setOrderDetail(null);
  };

  const handleOpenCreateModal = () => {
    setCreateModalOpen(true);
    createForm.resetFields();
    createForm.setFieldsValue({
      dispatchQty: 10,
      unitPrice: 1,
      attritionRate: 0,
      dispatchDate: dayjs(),
      expectedReturnDate: dayjs().add(7, 'day'),
    });
    void loadCreateOptions();
  };

  const handleProductionChange = async (productionOrderId: string) => {
    createForm.setFieldValue('productionOrderId', productionOrderId);
    createForm.setFieldValue('workOrderId', undefined);
    const options = await outsourcingManagementApi.listWorkOrderOptions(productionOrderId);
    setWorkOrderOptions(options);
    if (options.length > 0) {
      createForm.setFieldValue('workOrderId', options[0].id);
    }
  };

  const handleCreateSubmit = async () => {
    try {
      const values = await createForm.validateFields();
      setCreateSubmitting(true);
      await outsourcingManagementApi.createOrder({
        workOrderId: values.workOrderId,
        subcontractorId: values.subcontractorId,
        processCatalogId: values.processCatalogId,
        dispatchQty: Number(values.dispatchQty),
        unitPrice: Number(values.unitPrice),
        attritionRate: values.attritionRate == null ? undefined : Number(values.attritionRate),
        orderNo: values.orderNo?.trim() || undefined,
        dispatchDate: values.dispatchDate.format('YYYY-MM-DD'),
        expectedReturnDate: values.expectedReturnDate?.format('YYYY-MM-DD'),
      });
      message.success('外发订单创建成功');
      setCreateModalOpen(false);
      createForm.resetFields();
      void loadList();
    } catch (error: unknown) {
      if ((error as { errorFields?: unknown })?.errorFields) {
        return;
      }
      console.error('failed to create outsourcing order', error);
      message.error('外发订单创建失败');
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleOpenStatusModal = useCallback((record: OutsourcingManagementListItem) => {
    setStatusTargetOrder(record);
    statusForm.setFieldsValue({ orderId: record.id, status: 'DISPATCHED' });
    setStatusModalOpen(true);
  }, [statusForm]);

  const handleStatusSubmit = async () => {
    try {
      const values = await statusForm.validateFields();
      setStatusSubmitting(true);
      await outsourcingManagementApi.updateStatus(values.orderId, values.status);
      message.success('外发状态更新成功');
      setStatusModalOpen(false);
      setStatusTargetOrder(null);
      void loadList();
    } catch (error: unknown) {
      if ((error as { errorFields?: unknown })?.errorFields) {
        return;
      }
      console.error('failed to update outsourcing status', error);
      message.error('外发状态更新失败');
    } finally {
      setStatusSubmitting(false);
    }
  };

  const handleOpenMaterialModal = useCallback(async (record: OutsourcingManagementListItem) => {
    setMaterialTargetOrder(record);
    materialForm.setFieldsValue({
      orderId: record.id,
      requestQuantity: 1,
      requestedAt: dayjs(),
      materialId: undefined,
      remark: '',
    });
    try {
      const options = await outsourcingManagementApi.listMaterialOptions();
      setMaterialOptions(options);
    } catch (error) {
      console.error('failed to load material options', error);
      message.error('加载物料选项失败');
    }
    setMaterialModalOpen(true);
  }, [materialForm]);

  const handleMaterialSubmit = async () => {
    try {
      const values = await materialForm.validateFields();
      setMaterialSubmitting(true);
      await outsourcingManagementApi.createMaterialRequest({
        orderId: values.orderId,
        materialId: values.materialId,
        requestQuantity: Number(values.requestQuantity),
        requestedAt: values.requestedAt?.format('YYYY-MM-DDTHH:mm:ss'),
        remark: values.remark,
      });
      message.success('补料申请已提交');
      setMaterialModalOpen(false);
      setMaterialTargetOrder(null);
      void loadList();
    } catch (error: unknown) {
      if ((error as { errorFields?: unknown })?.errorFields) {
        return;
      }
      console.error('failed to create outsource material request', error);
      message.error('补料申请失败');
    } finally {
      setMaterialSubmitting(false);
    }
  };

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
        width: 250,
        fixed: 'right',
        render: (_: unknown, record) => (
          <Space>
            <Button type="link" onClick={() => handleConfirmReceive(record)}>
              确认接收
            </Button>
            <Button type="link" onClick={() => handleOpenStatusModal(record)}>
              更新状态
            </Button>
            <Button type="link" onClick={() => handleOpenMaterialModal(record)}>
              补料申请
            </Button>
            <Button type="link" onClick={() => handleViewDetail(record)}>
              查看
            </Button>
          </Space>
        ),
      },
    ],
    [handleConfirmReceive, handleOpenMaterialModal, handleOpenStatusModal, handleViewDetail],
  );

  const receiptColumns = useMemo<ColumnsType<OutsourcingOrderReceipt>>(
    () => [
      {
        title: '接收时间',
        dataIndex: 'receivedAt',
        key: 'receivedAt',
        render: (value?: string) => formatDateTime(value),
      },
      {
        title: '接收数量',
        dataIndex: 'receivedQty',
        key: 'receivedQty',
        align: 'right',
        render: (value: number) => formatQuantity(value),
      },
      {
        title: '良品',
        dataIndex: 'goodQty',
        key: 'goodQty',
        align: 'right',
        render: (value: number) => formatQuantity(value),
      },
      {
        title: '次品',
        dataIndex: 'defectQty',
        key: 'defectQty',
        align: 'right',
        render: (value: number) => formatQuantity(value),
      },
      {
        title: '返工',
        dataIndex: 'reworkQty',
        key: 'reworkQty',
        align: 'right',
        render: (value: number) => formatQuantity(value),
      },
      { title: '备注', dataIndex: 'remark', key: 'remark', render: (value?: string) => value || '-' },
    ],
    [],
  );

  const materialRequestColumns = useMemo<ColumnsType<OutsourcingMaterialRequestRecord>>(
    () => [
      {
        title: '申请时间',
        dataIndex: 'requestedAt',
        key: 'requestedAt',
        render: (value?: string) => formatDateTime(value),
      },
      {
        title: '物料ID',
        dataIndex: 'materialId',
        key: 'materialId',
        render: (value?: string) => value ?? '-',
      },
      {
        title: '数量',
        dataIndex: 'requestQuantity',
        key: 'requestQuantity',
        align: 'right',
        render: (value: number) => formatQuantity(value),
      },
      { title: '备注', dataIndex: 'remark', key: 'remark', render: (value?: string) => value || '-' },
    ],
    [],
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
    <>
      <Card title="外发管理">
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Card variant="borderless" loading={tableLoading && !records.length}>
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
            <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreateModal}>
              新建外发单
            </Button>
            <Button icon={<DownloadOutlined />} onClick={handleExportAll} loading={exporting}>
              导出全部
            </Button>
            <Button
              onClick={handleExportSelected}
              disabled={!selectedRowKeys.length}
              loading={exporting}
            >
              导出所选
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
      </Card>

      <Drawer
        title={orderDetail ? `外发单 ${orderDetail.outgoingNo}` : '外发单详情'}
        width={780}
        open={detailDrawerOpen}
        onClose={handleDetailClose}
        destroyOnHidden
        maskClosable
      >
        <Spin spinning={detailLoading}>
          {orderDetail ? (
            <Space direction="vertical" size={16} style={{ width: '100%' }}>
              <Card variant="borderless">
                <Descriptions column={2} size="small" bordered>
                  <Descriptions.Item label="工厂订单">{orderDetail.orderNo}</Descriptions.Item>
                  <Descriptions.Item label="外发单号">{orderDetail.outgoingNo}</Descriptions.Item>
                  <Descriptions.Item label="加工厂">{orderDetail.processorName}</Descriptions.Item>
                  <Descriptions.Item label="工序">{orderDetail.processStep}</Descriptions.Item>
                  <Descriptions.Item label="发出数量" span={2}>
                    {formatQuantity(orderDetail.dispatchQty)} 件
                  </Descriptions.Item>
                  <Descriptions.Item label="接收数量" span={2}>
                    {formatQuantity(orderDetail.receivedQty)} 件
                  </Descriptions.Item>
                  <Descriptions.Item label="良品数量" span={2}>
                    {formatQuantity(orderDetail.goodReceivedQty)} 件
                  </Descriptions.Item>
                  <Descriptions.Item label="单价">{formatCurrency(orderDetail.unitPrice)}</Descriptions.Item>
                  <Descriptions.Item label="加工费用">{formatCurrency(orderDetail.totalCost)}</Descriptions.Item>
                  <Descriptions.Item label="外发日期">{orderDetail.dispatchDate ?? '-'}</Descriptions.Item>
                  <Descriptions.Item label="预计完成" span={1}>
                    {orderDetail.expectedCompletionDate ?? '-'}
                  </Descriptions.Item>
                </Descriptions>
                <div style={{ marginTop: 16 }}>
                  <Text type="secondary">完成进度</Text>
                  <Progress
                    percent={Math.min(100, Number(orderDetail.progressPercent?.toFixed(1) ?? 0))}
                    status="active"
                  />
                </div>
              </Card>

              {orderDetail.workOrder ? (
                <Descriptions title="工单信息" bordered size="small" column={2}>
                  <Descriptions.Item label="工单号">{orderDetail.workOrder.id}</Descriptions.Item>
                  <Descriptions.Item label="工单状态">{orderDetail.workOrder.status ?? '-'}</Descriptions.Item>
                  <Descriptions.Item label="计划数量">{formatQuantity(orderDetail.workOrder.plannedQty)} 件</Descriptions.Item>
                  <Descriptions.Item label="完工数量">{formatQuantity(orderDetail.workOrder.completedQty)} 件</Descriptions.Item>
                  <Descriptions.Item label="备注" span={2}>
                    {orderDetail.workOrder.remark || '-'}
                  </Descriptions.Item>
                </Descriptions>
              ) : null}

              {orderDetail.productionOrder ? (
                <Descriptions title="生产订单" bordered size="small" column={2}>
                  <Descriptions.Item label="订单号">{orderDetail.productionOrder.orderNo}</Descriptions.Item>
                  <Descriptions.Item label="预计交期">
                    {orderDetail.productionOrder.expectedDelivery || '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="总数量">{formatQuantity(orderDetail.productionOrder.totalQuantity)} 件</Descriptions.Item>
                  <Descriptions.Item label="完成数量">{formatQuantity(orderDetail.productionOrder.completedQuantity)} 件</Descriptions.Item>
                </Descriptions>
              ) : null}

              <Card title="接收记录" variant="borderless">
                <Table<OutsourcingOrderReceipt>
                  rowKey={(record) => record.id}
                  dataSource={orderDetail.receipts}
                  columns={receiptColumns}
                  pagination={false}
                  size="small"
                />
              </Card>

              <Card title="补料记录" variant="borderless">
                <Table<OutsourcingMaterialRequestRecord>
                  rowKey={(record) => record.id}
                  dataSource={orderDetail.materialRequests}
                  columns={materialRequestColumns}
                  pagination={false}
                  size="small"
                />
              </Card>
            </Space>
          ) : (
            <Empty description="请选择外发单" />
          )}
        </Spin>
      </Drawer>

      <Modal
        open={receiveModalState.visible}
        title={receiveModalState.record ? `确认接收 - ${receiveModalState.record.outgoingNo}` : '确认接收'}
        onCancel={handleReceiveCancel}
        onOk={handleReceiveSubmit}
        confirmLoading={submittingReceive}
        destroyOnHidden
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

      <Modal
        open={createModalOpen}
        title="新建外发单"
        onCancel={() => {
          setCreateModalOpen(false);
          createForm.resetFields();
        }}
        onOk={handleCreateSubmit}
        confirmLoading={createSubmitting}
        destroyOnHidden
        width={640}
      >
        <Form layout="vertical" form={createForm} preserve={false}>
          <Form.Item
            label="生产单"
            name="productionOrderId"
            rules={[{ required: true, message: '请选择生产单' }]}
          >
            <Select
              showSearch
              optionFilterProp="label"
              options={productionOptions.map((item) => ({ label: item.label, value: item.id }))}
              onChange={(value) => {
                void handleProductionChange(value);
              }}
            />
          </Form.Item>
          <Form.Item
            label="工单"
            name="workOrderId"
            rules={[{ required: true, message: '请选择工单' }]}
          >
            <Select
              showSearch
              optionFilterProp="label"
              options={workOrderOptions.map((item) => ({ label: item.label, value: item.id }))}
            />
          </Form.Item>
          <Form.Item
            label="加工厂"
            name="subcontractorId"
            rules={[{ required: true, message: '请选择加工厂' }]}
          >
            <Select
              showSearch
              optionFilterProp="label"
              options={(meta?.processors ?? []).map((item) => ({ label: item.name, value: item.id }))}
            />
          </Form.Item>
          <Form.Item
            label="工序类型"
            name="processCatalogId"
            rules={[{ required: true, message: '请选择工序类型' }]}
          >
            <Select
              showSearch
              optionFilterProp="label"
              options={processOptions.map((item) => ({ label: item.label, value: item.id }))}
            />
          </Form.Item>
          <Space size={12} style={{ width: '100%' }}>
            <Form.Item
              label="外发数量"
              name="dispatchQty"
              rules={[{ required: true, message: '请输入外发数量' }]}
              style={{ flex: 1 }}
            >
              <InputNumber min={1} precision={0} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item
              label="加工单价"
              name="unitPrice"
              rules={[{ required: true, message: '请输入加工单价' }]}
              style={{ flex: 1 }}
            >
              <InputNumber min={0} precision={2} style={{ width: '100%' }} />
            </Form.Item>
          </Space>
          <Space size={12} style={{ width: '100%' }}>
            <Form.Item label="损耗率" name="attritionRate" style={{ flex: 1 }}>
              <InputNumber min={0} max={1} step={0.01} precision={4} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item label="外发单号(可选)" name="orderNo" style={{ flex: 1 }}>
              <Input maxLength={64} />
            </Form.Item>
          </Space>
          <Space size={12} style={{ width: '100%' }}>
            <Form.Item
              label="外发日期"
              name="dispatchDate"
              rules={[{ required: true, message: '请选择外发日期' }]}
              style={{ flex: 1 }}
            >
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item label="预计回货日期" name="expectedReturnDate" style={{ flex: 1 }}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Space>
        </Form>
      </Modal>

      <Modal
        open={statusModalOpen}
        title={statusTargetOrder ? `更新状态 - ${statusTargetOrder.outgoingNo}` : '更新状态'}
        onCancel={() => {
          setStatusModalOpen(false);
          setStatusTargetOrder(null);
          statusForm.resetFields();
        }}
        onOk={handleStatusSubmit}
        confirmLoading={statusSubmitting}
        destroyOnHidden
      >
        <Form layout="vertical" form={statusForm} preserve={false}>
          <Form.Item name="orderId" hidden>
            <Input />
          </Form.Item>
          <Form.Item
            label="目标状态"
            name="status"
            rules={[{ required: true, message: '请选择状态' }]}
          >
            <Select
              options={STATUS_UPDATE_OPTIONS}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={materialModalOpen}
        title={materialTargetOrder ? `补料申请 - ${materialTargetOrder.outgoingNo}` : '补料申请'}
        onCancel={() => {
          setMaterialModalOpen(false);
          setMaterialTargetOrder(null);
          materialForm.resetFields();
        }}
        onOk={handleMaterialSubmit}
        confirmLoading={materialSubmitting}
        destroyOnHidden
      >
        <Form layout="vertical" form={materialForm} preserve={false}>
          <Form.Item name="orderId" hidden>
            <Input />
          </Form.Item>
          <Form.Item label="物料" name="materialId">
            <Select
              showSearch
              allowClear
              optionFilterProp="label"
              options={materialOptions.map((item) => ({ label: item.label, value: item.id }))}
              placeholder="可选，不选时由后端兜底"
            />
          </Form.Item>
          <Form.Item
            label="申请数量"
            name="requestQuantity"
            rules={[{ required: true, message: '请输入申请数量' }]}
          >
            <InputNumber min={1} precision={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="申请时间" name="requestedAt">
            <DatePicker showTime style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="备注" name="remark">
            <Input.TextArea rows={3} maxLength={200} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default OutsourcingManagement;
