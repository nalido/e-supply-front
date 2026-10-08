import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ColumnsType } from 'antd/es/table';
import type { TableRowSelection } from 'antd/es/table/interface';
import {
  Alert,
  App as AntdApp,
  Button,
  Card,
  DatePicker,
  Descriptions,
  Drawer,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Spin,
  Table,
  Tabs,
  Tag,
  Typography,
} from 'antd';
import { useSearchParams } from 'react-router-dom';
import {
  CloudUploadOutlined,
  DownloadOutlined,
  EditOutlined,
  InboxOutlined,
  PlusOutlined,
  ReloadOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { stockingPurchaseInboundService } from '../api/procurement';
import StockingPurchaseCreateModal from '../components/procurement/StockingPurchaseCreateModal';
import StockingPurchaseBatchEditModal from '../components/procurement/StockingPurchaseBatchEditModal';
import type {
  StockingPurchaseListParams,
  StockingPurchaseMeta,
  StockingPurchaseOrderRecord,
  StockingPurchaseRecord,
  StockingPurchaseStatusFilter,
  StockingStatusUpdatePayload,
  StockingCompletionMismatch,
  StockingReceiptRecord,
  StockingReceivePayload,
  StockingPurchaseOrderDetail,
} from '../types/stocking-purchase-inbound';
import dayjs from 'dayjs';
import { BulkActionBar, FilterBar, NumberWithUnitInput, PageHeader, PageSection, SearchField, TableToolbar } from '../components/page';
import ListImage from '../components/common/ListImage';
import '../styles/stocking-purchase-inbound.css';

const { Text } = Typography;

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 20, 50];
const isStockingMaterialType = (value: string | null): value is 'fabric' | 'accessory' =>
  value === 'fabric' || value === 'accessory';

const quantityFormatter = new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 4 });
const currencyFormatter = new Intl.NumberFormat('zh-CN', {
  style: 'currency',
  currency: 'CNY',
  minimumFractionDigits: 2,
});

const formatQuantity = (value: number) => quantityFormatter.format(value ?? 0);
const formatCurrency = (value: number) => currencyFormatter.format(value ?? 0);

const OVER_PLAN_REASON_OPTIONS = [
  { label: '供应商补发 / 尾数补足', value: 'SUPPLIER_EXTRA' },
  { label: '业务确认追加收料', value: 'BUSINESS_CONFIRMED' },
  { label: '到货盘点差异修正', value: 'INVENTORY_ADJUSTMENT' },
  { label: '其它', value: 'OTHER' },
];

const getActualReceivedQty = (record: StockingPurchaseRecord | StockingReceiptRecord) =>
  Number(record.actualReceivedQty ?? record.receivedQty ?? 0);

const getWithinPlanReceivedQty = (record: StockingPurchaseRecord | StockingReceiptRecord, planQty: number) =>
  Number(record.withinPlanReceivedQty ?? Math.min(getActualReceivedQty(record), planQty));

const getOverReceivedQty = (record: StockingPurchaseRecord | StockingReceiptRecord, planQty: number) =>
  Number(record.overReceivedQty ?? Math.max(getActualReceivedQty(record) - planQty, 0));

const getPlanPendingReceiveQty = (record: StockingPurchaseRecord | StockingReceiptRecord, planQty: number) =>
  Number(record.planPendingReceiveQty ?? Math.max(planQty - getWithinPlanReceivedQty(record, planQty), 0));

const statusColorMap: Record<StockingPurchaseRecord['status'], string> = {
  pending: 'orange',
  partial: 'blue',
  completed: 'green',
  forceCompleted: 'purple',
  void: 'default',
};

type ReceiveFormValues = {
  warehouseId?: string;
  receiveQty?: number;
  receivedAt?: dayjs.Dayjs;
  batchNo?: string;
  overReceiptReasonCode?: string;
  remark?: string;
};

type ReceiveModalState = {
  open: boolean;
  submitting: boolean;
  record?: StockingPurchaseRecord;
};

type ReceiptDrawerState = {
  open: boolean;
  loading: boolean;
  data: StockingReceiptRecord[];
  record?: StockingPurchaseRecord;
};

type BatchReceiveItemFormValue = {
  lineId: string;
  receiveQty?: number;
  batchNo?: string;
  overReceiptReasonCode?: string;
  remark?: string;
};

type BatchReceiveFormValues = {
  receivedAt?: dayjs.Dayjs;
  remark?: string;
  items: BatchReceiveItemFormValue[];
};

type BatchReceiveModalState = {
  open: boolean;
  submitting: boolean;
  records: StockingPurchaseRecord[];
};

type StockingCreateDraft = {
  materialCode?: string;
  materialName?: string;
  quantity?: number;
  supplierName?: string;
  remark?: string;
  items?: Array<{
    materialCode?: string;
    materialName?: string;
    quantity?: number;
    supplierName?: string;
  }>;
};

const StockingPurchaseInbound = () => {
  const { message, modal } = AntdApp.useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const [receiveForm] = Form.useForm<ReceiveFormValues>();
  const [batchReceiveForm] = Form.useForm<BatchReceiveFormValues>();
  const [meta, setMeta] = useState<StockingPurchaseMeta | null>(null);
  const [metaLoading, setMetaLoading] = useState(false);
  const [materialType, setMaterialType] = useState<'fabric' | 'accessory'>('fabric');
  const [statusFilter, setStatusFilter] = useState<StockingPurchaseStatusFilter>('all');
  const [keywordInput, setKeywordInput] = useState('');
  const [appliedKeyword, setAppliedKeyword] = useState<string | undefined>(undefined);

  useEffect(() => {
    const keyword = searchParams.get('keyword')?.trim();
    if (keyword) {
      setKeywordInput(keyword);
      setAppliedKeyword(keyword);
    }
  }, [searchParams]);
  const [orders, setOrders] = useState<StockingPurchaseOrderRecord[]>([]);
  const [expandedRowKeys, setExpandedRowKeys] = useState<React.Key[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [tableLoading, setTableLoading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [createModalOpen, setCreateModalOpen] = useState(searchParams.get('openCreate') === 'true');
  const [editingOrder, setEditingOrder] = useState<StockingPurchaseOrderDetail | null>(null);
  const [batchEditOpen, setBatchEditOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [receiveModalState, setReceiveModalState] = useState<ReceiveModalState>({
    open: false,
    submitting: false,
  });
  const [receiptDrawerState, setReceiptDrawerState] = useState<ReceiptDrawerState>({
    open: false,
    loading: false,
    data: [],
  });
  const [batchReceiveModalState, setBatchReceiveModalState] = useState<BatchReceiveModalState>({
    open: false,
    submitting: false,
    records: [],
  });
  const receiveQtyWatch = Form.useWatch('receiveQty', receiveForm);
  const batchItemsWatch = Form.useWatch('items', batchReceiveForm);

  const receivePlanQty = receiveModalState.record?.orderQty ?? 0;
  const receiveActualBeforeQty = receiveModalState.record
    ? getActualReceivedQty(receiveModalState.record)
    : 0;
  const receiveActualAfterQty = receiveActualBeforeQty + Number(receiveQtyWatch ?? 0);
  const receiveOverAfterQty = Math.max(receiveActualAfterQty - receivePlanQty, 0);
  const receiveIsOverPlan = Boolean(receiveModalState.record) && receiveOverAfterQty > 0;

  const createDraft = useMemo(() => {
    if (searchParams.get('openCreate') !== 'true') {
      return undefined;
    }
    const prefillKey = searchParams.get('prefillKey');
    if (prefillKey) {
      try {
        const raw = window.sessionStorage.getItem(prefillKey);
        if (raw) {
          const parsed = JSON.parse(raw) as StockingCreateDraft;
          return parsed;
        }
      } catch (error) {
        console.error('failed to parse stocking create prefill', error);
      }
    }
    return {
      materialCode: searchParams.get('materialCode') ?? undefined,
      materialName: searchParams.get('materialName') ?? undefined,
      quantity: Number(searchParams.get('quantity') ?? '0'),
      supplierName: searchParams.get('supplierName') ?? undefined,
      remark: searchParams.get('remark') ?? undefined,
    } as StockingCreateDraft;
  }, [searchParams]);

  useEffect(() => {
    const loadMeta = async () => {
      setMetaLoading(true);
      try {
        const response = await stockingPurchaseInboundService.getMeta();
        setMeta(response);
        setStatusFilter(response.defaultStatus);
        const materialTypeParam = searchParams.get('materialType');
        if (isStockingMaterialType(materialTypeParam)) {
          setMaterialType(materialTypeParam);
        } else if (response.materialTypeTabs?.length) {
          setMaterialType(response.materialTypeTabs[0].value);
        }
      } catch (error) {
        console.error('failed to load stocking purchase meta', error);
        message.error('加载筛选项失败');
      } finally {
        setMetaLoading(false);
      }
    };

    void loadMeta();
  }, [message, searchParams]);

  useEffect(() => {
    const nextOpen = searchParams.get('openCreate') === 'true';
    setCreateModalOpen(nextOpen);
  }, [searchParams]);

  const loadList = useCallback(async () => {
    setTableLoading(true);
    try {
      const params: StockingPurchaseListParams = {
        page,
        pageSize,
        materialType,
        status: statusFilter,
        keyword: appliedKeyword,
      };
      const response = await stockingPurchaseInboundService.getList(params);
      setOrders(response.list);
      setTotal(response.total);
      const validIds = new Set(response.list.map((item) => item.id));
      setSelectedRowKeys((prev) => prev.filter((key) => validIds.has(String(key))));
      setExpandedRowKeys((prev) => {
        const retained = prev.filter((key) => validIds.has(String(key)));
        return retained.length ? retained : (response.list[0] ? [response.list[0].id] : []);
      });
    } catch (error) {
      console.error('failed to load stocking purchase list', error);
      message.error('获取备料采购列表失败');
    } finally {
      setTableLoading(false);
    }
  }, [appliedKeyword, materialType, message, page, pageSize, statusFilter]);

  useEffect(() => {
    void loadList();
  }, [loadList]);


  const handleTabChange = (value: string) => {
    setMaterialType(value as 'fabric' | 'accessory');
    setPage(1);
    setSelectedRowKeys([]);
  };

  const handleStatusChange = (value: StockingPurchaseStatusFilter) => {
    setStatusFilter(value);
    setPage(1);
    setSelectedRowKeys([]);
  };

  const closeReceiveModal = useCallback(() => {
    setReceiveModalState({ open: false, submitting: false });
    receiveForm.resetFields();
  }, [receiveForm]);

  const openEditModal = useCallback(async (record: StockingPurchaseRecord) => {
    if (!record.orderId) {
      message.warning('未找到订单信息，无法编辑');
      return;
    }
    setEditLoading(true);
    try {
      const detail = await stockingPurchaseInboundService.getOrderDetail(record.orderId);
      setEditingOrder({
        ...detail,
        supplierName: record.supplierName,
        warehouseName: record.warehouseName,
      });
      setCreateModalOpen(true);
    } catch (error) {
      console.error('failed to load stocking order detail', error);
      message.error('加载采购单详情失败');
    } finally {
      setEditLoading(false);
    }
  }, [message]);

  const openReceiveModal = useCallback(
    async (record: StockingPurchaseRecord) => {
      if (!record.orderId) {
        message.warning('未找到订单信息，无法收料');
        return;
      }
      if (!record.warehouseId) {
        message.error('该采购单未指定收料仓库，无法执行');
        return;
      }
      setReceiveModalState({ open: true, submitting: false, record });
      receiveForm.setFieldsValue({
        warehouseId: record.warehouseId,
        receiveQty: record.planPendingReceiveQty && record.planPendingReceiveQty > 0
          ? record.planPendingReceiveQty
          : (record.pendingQty > 0 ? record.pendingQty : undefined),
        receivedAt: dayjs(),
        batchNo: undefined,
        overReceiptReasonCode: undefined,
        remark: undefined,
      });
    },
    [message, receiveForm],
  );

  const handleReceiveSubmit = useCallback(async () => {
    const record = receiveModalState.record;
    if (!record || !record.orderId) {
      message.warning('未选择收料记录');
      return;
    }
    try {
      const values = await receiveForm.validateFields();
      if (!values.warehouseId) {
        message.warning('请选择收料仓库');
        return;
      }
      const payload: StockingReceivePayload = {
        warehouseId: values.warehouseId,
        receivedAt: values.receivedAt ? values.receivedAt.format('YYYY-MM-DDTHH:mm:ss') : undefined,
        remark: values.remark,
        items: [
          {
            lineId: record.id,
            receiveQty: values.receiveQty ?? 0,
            batchNo: values.batchNo,
            remark: values.remark,
            overReceiptReasonCode: values.overReceiptReasonCode,
          },
        ],
      };
      setReceiveModalState((prev) => ({ ...prev, submitting: true }));
      await stockingPurchaseInboundService.receive(record.orderId, payload);
      message.success('收料完成');
      closeReceiveModal();
      setSelectedRowKeys([]);
      void loadList();
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'errorFields' in error) {
        return;
      }
      console.error('failed to receive stocking order', error);
      message.error('收料失败，请稍后重试');
    } finally {
      setReceiveModalState((prev) => ({ ...prev, submitting: false }));
    }
  }, [closeReceiveModal, loadList, message, receiveForm, receiveModalState.record, setSelectedRowKeys]);

  const closeReceiptDrawer = () => {
    setReceiptDrawerState((prev) => ({ ...prev, open: false }));
  };

  const openReceiptDrawer = useCallback(
    async (record: StockingPurchaseRecord, includeAllLines = false) => {
      if (!record.orderId) {
        message.warning('未找到订单信息，无法查看明细');
        return;
      }
      setReceiptDrawerState({ open: true, loading: true, data: [], record });
      try {
        const list = await stockingPurchaseInboundService.getReceipts({
          orderId: record.orderId,
          lineId: includeAllLines ? undefined : record.id,
        });
        setReceiptDrawerState((prev) => ({ ...prev, data: list, loading: false }));
      } catch (error) {
        console.error('failed to load receipt list', error);
        message.error('加载收料明细失败');
        setReceiptDrawerState((prev) => ({ ...prev, loading: false }));
      }
    },
    [message],
  );

  const handleSearch = () => {
    setAppliedKeyword(keywordInput.trim() || undefined);
    setPage(1);
  };

  const handleReset = () => {
    setKeywordInput('');
    if (meta) {
      setStatusFilter(meta.defaultStatus);
      if (meta.materialTypeTabs?.length) {
        setMaterialType(meta.materialTypeTabs[0].value);
      }
    } else {
      setStatusFilter('all');
      setMaterialType('fabric');
    }
    setAppliedKeyword(undefined);
    setPage(1);
    setPageSize(DEFAULT_PAGE_SIZE);
    setSelectedRowKeys([]);
  };

  const collectSelectedOrderIds = useCallback(() => {
    const validIds = new Set(orders.map((order) => order.id));
    return selectedRowKeys.map(String).filter((orderId) => validIds.has(orderId));
  }, [orders, selectedRowKeys]);

  const handleBatchEdit = () => {
    const selectedOrders = orders.filter((order) => selectedRowKeys.includes(order.id));
    if (!selectedOrders.length) {
      message.warning('请先选择需要修改的备料采购单');
      return;
    }
    const locked = selectedOrders.find(
      (order) => order.status === 'completed' || order.status === 'forceCompleted' || order.status === 'void',
    );
    if (locked) {
      message.warning(`采购单 ${locked.purchaseOrderNo} 已完成或已作废，不能参与批量修改`);
      return;
    }
    setBatchEditOpen(true);
  };

  const openBatchReceiveForOrders = (selectedOrders: StockingPurchaseOrderRecord[]) => {
    const selectedRecords = selectedOrders
      .filter((order) => order.status !== 'forceCompleted' && order.status !== 'void')
      .flatMap((order) => order.lines)
      .filter((record) => getPlanPendingReceiveQty(record, record.orderQty) > 0);
    if (!selectedRecords.length) {
      message.warning('所选采购单没有可收料的明细');
      return;
    }
    const missingOrder = selectedRecords.find((record) => !record.orderId);
    if (missingOrder) {
      message.warning(`采购单 ${missingOrder.purchaseOrderNo} 缺少订单信息，无法批量收料`);
      return;
    }
    const missingWarehouse = selectedRecords.find((record) => !record.warehouseId);
    if (missingWarehouse) {
      message.error(`采购单 ${missingWarehouse.purchaseOrderNo} 未指定收料仓库，无法批量收料`);
      return;
    }
    setBatchReceiveModalState({ open: true, submitting: false, records: selectedRecords });
    batchReceiveForm.setFieldsValue({
      receivedAt: dayjs(),
      remark: undefined,
      items: selectedRecords.map((record) => ({
        lineId: record.id,
        receiveQty: getPlanPendingReceiveQty(record, record.orderQty) > 0
          ? getPlanPendingReceiveQty(record, record.orderQty)
          : undefined,
        batchNo: undefined,
        overReceiptReasonCode: undefined,
        remark: undefined,
      })),
    });
  };

  const handleBatchReceive = () => {
    if (!selectedRowKeys.length) {
      message.warning('请先选择需要收料的采购单');
      return;
    }
    const selectedOrders = orders.filter((order) => selectedRowKeys.includes(order.id));
    if (!selectedOrders.length) {
      message.warning('所选采购单已失效，请重新选择');
      return;
    }
    openBatchReceiveForOrders(selectedOrders);
  };

  const closeBatchReceiveModal = useCallback(() => {
    setBatchReceiveModalState({ open: false, submitting: false, records: [] });
    batchReceiveForm.resetFields();
  }, [batchReceiveForm]);

  const handleBatchReceiveSubmit = useCallback(async () => {
    if (!batchReceiveModalState.records.length) {
      message.warning('没有可收料的记录');
      return;
    }
    try {
      const values = await batchReceiveForm.validateFields();
      const lineEntries = (values.items ?? []).filter((item) => Boolean(item.lineId));
      const lineMap = new Map(lineEntries.map((item) => [item.lineId as string, item]));
      const grouped = new Map<
        string,
        { warehouseId: string; items: StockingReceivePayload['items'] }
      >();
      batchReceiveModalState.records.forEach((record) => {
        const input = lineMap.get(record.id);
        if (!input || input.receiveQty === undefined || input.receiveQty === null) {
          return;
        }
        if (!record.orderId || !record.warehouseId) {
          return;
        }
        if (!grouped.has(record.orderId)) {
          grouped.set(record.orderId, { warehouseId: record.warehouseId, items: [] });
        }
        grouped.get(record.orderId)!.items.push({
          lineId: record.id,
          receiveQty: input.receiveQty,
          batchNo: input.batchNo,
          remark: input.remark,
          overReceiptReasonCode: input.overReceiptReasonCode,
        });
      });
      if (!grouped.size) {
        message.warning('请填写收料数量');
        return;
      }
      setBatchReceiveModalState((prev) => ({ ...prev, submitting: true }));
      for (const [orderId, group] of grouped.entries()) {
        const payload: StockingReceivePayload = {
          warehouseId: group.warehouseId,
          receivedAt: values.receivedAt
            ? values.receivedAt.format('YYYY-MM-DDTHH:mm:ss')
            : undefined,
          remark: values.remark,
          items: group.items,
        };
        await stockingPurchaseInboundService.receive(orderId, payload);
      }
      message.success('批量收料完成');
      closeBatchReceiveModal();
      setSelectedRowKeys([]);
      void loadList();
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'errorFields' in error) {
        return;
      }
      console.error('failed to submit batch receive', error);
      message.error('批量收料失败，请稍后重试');
    } finally {
      setBatchReceiveModalState((prev) => ({ ...prev, submitting: false }));
    }
  }, [
    batchReceiveForm,
    batchReceiveModalState.records,
    closeBatchReceiveModal,
    loadList,
    message,
  ]);

  const handleStatusUpdate = async (nextStatus: StockingStatusUpdatePayload['status']) => {
    if (!selectedRowKeys.length) {
      message.warning('请先选择需要更新状态的采购单');
      return;
    }
    const orderIds = collectSelectedOrderIds();
    if (!orderIds.length) {
      message.warning('所选行对应的采购单已失效，请重新选择');
      return;
    }
    const payload: StockingStatusUpdatePayload = {
      orderIds,
      status: nextStatus,
    };
    try {
      setStatusUpdating(true);
      const result = await stockingPurchaseInboundService.setStatus(payload);
      if (nextStatus === 'completed' && result.confirmationRequired) {
        const mismatchLines = result.mismatchLines ?? [];
        modal.confirm({
          title: '实收数量与采购数量不一致',
          width: 820,
          content: (
            <div className="oc-section-stack-tight">
              <Alert
                type="warning"
                showIcon
                message="所选采购单仍有未收齐或超收的物料"
                description="请先核对并完成收料。若仍要手工完成，系统只更新采购单状态，不会改写实收数量或库存。"
              />
              <Table<StockingCompletionMismatch>
                rowKey={(record) => `${record.orderId}-${record.lineId}`}
                size="small"
                pagination={false}
                dataSource={mismatchLines}
                scroll={{ y: 320 }}
                columns={[
                  { title: '采购单', dataIndex: 'orderNo', width: 150 },
                  {
                    title: '物料 / 规格',
                    key: 'material',
                    render: (_, record) => (
                      <Space direction="vertical" size={0}>
                        <Text>{record.materialName}</Text>
                        <Text type="secondary">
                          {[record.color, record.specification].filter(Boolean).join(' · ') || '未指定规格'}
                        </Text>
                      </Space>
                    ),
                  },
                  {
                    title: '采购数量',
                    dataIndex: 'orderedQty',
                    align: 'right',
                    width: 110,
                    render: (value, record) => `${formatQuantity(Number(value))}${record.unit ?? ''}`,
                  },
                  {
                    title: '实际收料',
                    dataIndex: 'actualReceivedQty',
                    align: 'right',
                    width: 110,
                    render: (value, record) => `${formatQuantity(Number(value))}${record.unit ?? ''}`,
                  },
                  {
                    title: '差异',
                    dataIndex: 'differenceQty',
                    align: 'right',
                    width: 110,
                    render: (value, record) => (
                      <Text type="danger">
                        {record.differenceType === 'SHORTAGE' ? '少收' : '超收'}{' '}
                        {formatQuantity(Number(value))}{record.unit ?? ''}
                      </Text>
                    ),
                  },
                ]}
              />
            </div>
          ),
          okText: '仍要完成',
          okButtonProps: { danger: true },
          cancelText: '返回收料',
          onOk: async () => {
            try {
              await stockingPurchaseInboundService.setStatus({
                ...payload,
                confirmQuantityMismatch: true,
              });
              message.success('采购单已手工完成，实收数量和库存保持不变');
              setSelectedRowKeys([]);
              await loadList();
            } catch (error) {
              console.error('failed to confirm stocking purchase completion', error);
              message.error('手工完成失败，请重新核对后再试');
              throw error;
            }
          },
        });
        return;
      }
      message.success('状态更新成功');
      setSelectedRowKeys([]);
      void loadList();
    } catch (error) {
      console.error('failed to update stocking purchase status', error);
      message.error('状态更新失败，请稍后重试');
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleExport = async () => {
    try {
      const params: StockingPurchaseListParams = {
        page: 1,
        pageSize: total || orders.length || DEFAULT_PAGE_SIZE,
        materialType,
        status: statusFilter,
        keyword: appliedKeyword,
      };
      const result = await stockingPurchaseInboundService.export(params);
      message.success('导出任务已生成，请稍后在下载中心查看');
      console.info('export url', result.fileUrl);
    } catch (error) {
      console.error('failed to export stocking purchase list', error);
      message.error('导出失败，请稍后重试');
    }
  };

  const orderColumns: ColumnsType<StockingPurchaseOrderRecord> = [
    {
      title: '采购单',
      dataIndex: 'purchaseOrderNo',
      key: 'purchaseOrderNo',
      width: 190,
      render: (value: string, order) => (
        <Space direction="vertical" size={2}>
          <Button
            type="link"
            size="small"
            className="stocking-order-link"
            onClick={() => { setKeywordInput(value); setAppliedKeyword(value); setPage(1); }}
          >
            {value}
          </Button>
          <Text type="secondary" className="stocking-order-meta">{order.purchaseDate || '未填写采购日期'} · {order.lineCount} 项明细</Text>
        </Space>
      ),
    },
    { title: '供应商', dataIndex: 'supplierName', key: 'supplierName', width: 145, ellipsis: true, render: (value?: string) => value || '-' },
    { title: '收料仓库', dataIndex: 'warehouseName', key: 'warehouseName', width: 145, ellipsis: true, render: (value?: string) => value || '-' },
    {
      title: '收料进度',
      key: 'receiptProgress',
      width: 150,
      render: (_, order) => (
        <Space direction="vertical" size={2}>
          <Text strong>{order.completedLineCount}/{order.lineCount} 项已收完</Text>
          <Text type="secondary" className="stocking-order-meta">{order.receivedLineCount} 项已有实收</Text>
        </Space>
      ),
    },
    { title: '采购金额', dataIndex: 'totalAmount', key: 'totalAmount', width: 110, align: 'right', render: (value: number) => formatCurrency(value) },
    {
      title: '整单状态',
      dataIndex: 'statusLabel',
      key: 'statusLabel',
      width: 100,
      render: (_, order) => <Tag color={statusColorMap[order.status]}>{order.statusLabel}</Tag>,
    },
    { title: '整单备注', dataIndex: 'remark', key: 'remark', width: 130, ellipsis: true, render: (value?: string) => value || '-' },
    {
      title: '整单操作',
      key: 'actions',
      width: 210,
      render: (_, order) => {
        const firstLine = order.lines[0];
        const disableReceive = order.status === 'forceCompleted' || order.status === 'void' || order.completedLineCount >= order.lineCount;
        return (
          <Space size={4}>
            <Button size="small" type="link" loading={editLoading && editingOrder?.id === order.id} disabled={!firstLine} onClick={() => firstLine && openEditModal(firstLine)}>编辑</Button>
            <Button size="small" type="link" disabled={disableReceive} onClick={() => openBatchReceiveForOrders([order])}>整单收料</Button>
            <Button size="small" type="link" disabled={!firstLine} onClick={() => firstLine && openReceiptDrawer(firstLine, true)}>收料记录</Button>
          </Space>
        );
      },
    },
  ];

  const lineColumns: ColumnsType<StockingPurchaseRecord> = [
    {
      title: '物料 / 规格',
      dataIndex: 'materialName',
      key: 'materialName',
      width: 250,
      render: (value: string, record) => {
        const specParts = materialType === 'fabric'
          ? [record.color, record.width, record.weight].filter(Boolean)
          : [record.color, record.specification].filter(Boolean);
        return (
          <Space size={10} align="start">
            <ListImage src={record.imageUrl} alt={value} width={40} height={40} borderRadius={6} fallbackText="无图" />
            <Space direction="vertical" size={1}>
              <Text strong>{value}</Text>
              <Text type="secondary" className="stocking-order-meta">
                {[record.materialCategory, ...specParts].filter(Boolean).join(' · ') || '未填写规格'}
              </Text>
            </Space>
          </Space>
        );
      },
    },
    { title: '采购量', dataIndex: 'orderQty', key: 'orderQty', width: 90, align: 'right', render: (value: number, record) => `${formatQuantity(value)} ${record.unit}` },
    { title: '累计实收', key: 'actualReceivedQty', width: 100, align: 'right', render: (_, record) => `${formatQuantity(getActualReceivedQty(record))} ${record.unit}` },
    { title: '计划待收', key: 'planPendingReceiveQty', width: 100, align: 'right', render: (_, record) => `${formatQuantity(getPlanPendingReceiveQty(record, record.orderQty))} ${record.unit}` },
    {
      title: '超收量',
      key: 'overReceivedQty',
      width: 90,
      align: 'right',
      render: (_, record) => {
        const overQty = getOverReceivedQty(record, record.orderQty);
        return overQty > 0 ? <Text type="warning">{formatQuantity(overQty)} {record.unit}</Text> : `0 ${record.unit}`;
      },
    },
    {
      title: '明细状态',
      dataIndex: 'statusLabel',
      key: 'statusLabel',
      width: 100,
      render: (_, record) => <Tag color={statusColorMap[record.status]}>{record.statusLabel}</Tag>,
    },
    { title: '单价', dataIndex: 'unitPrice', key: 'unitPrice', width: 90, align: 'right', render: (value?: number) => value === undefined ? '-' : formatCurrency(value) },
    { title: '金额', dataIndex: 'orderAmount', key: 'orderAmount', width: 100, align: 'right', render: (value: number) => formatCurrency(value) },
    { title: '明细备注', dataIndex: 'remark', key: 'remark', width: 120, ellipsis: true, render: (value?: string) => value || '-' },
    {
      title: '明细操作',
      key: 'actions',
      width: 140,
      render: (_, record) => {
        const disableReceive = record.orderStatus === 'forceCompleted' || record.orderStatus === 'void' || getPlanPendingReceiveQty(record, record.orderQty) <= 0;
        return (
          <Space size={2}>
            <Button size="small" type="link" disabled={disableReceive} onClick={() => openReceiveModal(record)}>本行收料</Button>
            <Button size="small" type="link" onClick={() => openReceiptDrawer(record)}>收料记录</Button>
          </Space>
        );
      },
    },
  ];

  const receiptItemColumns: ColumnsType<StockingReceiptRecord> = useMemo(
    () => [
      {
        title: '本次收料量',
        dataIndex: 'receivedQty',
        key: 'receivedQty',
        align: 'right',
        width: 120,
        render: (value: number, record) => `${quantityFormatter.format(value ?? 0)} ${record.unit ?? ''}`,
      },
      {
        title: '本次超收量',
        dataIndex: 'overReceiptQty',
        key: 'overReceiptQty',
        align: 'right',
        width: 120,
        render: (value: number | undefined, record) => {
          const overQty = Number(value ?? (record.isOverReceipt ? Math.max((record.receivedQty ?? 0) - (record.pendingQty ?? 0), 0) : 0));
          return overQty > 0 ? <Text type="warning">{quantityFormatter.format(overQty)} {record.unit ?? ''}</Text> : `0 ${record.unit ?? ''}`;
        },
      },
      {
        title: '计划待收量',
        dataIndex: 'planPendingReceiveQty',
        key: 'planPendingReceiveQty',
        align: 'right',
        width: 132,
        render: (value: number | undefined, record) => `${quantityFormatter.format(value ?? record.pendingQty ?? 0)} ${record.unit ?? ''}`,
      },
      {
        title: '超收原因',
        dataIndex: 'overReceiptReasonCode',
        key: 'overReceiptReasonCode',
        width: 180,
        render: (value?: string) => value ?? '-',
      },
      {
        title: '批次号',
        dataIndex: 'batchNo',
        key: 'batchNo',
        width: 160,
        render: (value?: string) => value ?? '-',
      },
      {
        title: '备注',
        dataIndex: 'remark',
        key: 'remark',
        ellipsis: true,
        render: (value?: string) => value ?? '-',
      },
    ],
    [],
  );

  const groupedReceipts = useMemo(() => {
    const map = new Map<string, { header: StockingReceiptRecord; items: StockingReceiptRecord[] }>();
    receiptDrawerState.data.forEach((record) => {
      if (!map.has(record.id)) {
        map.set(record.id, { header: record, items: [] });
      }
      map.get(record.id)!.items.push(record);
    });
    return Array.from(map.values());
  }, [receiptDrawerState.data]);

  const selection: TableRowSelection<StockingPurchaseOrderRecord> = useMemo(
    () => ({
      selectedRowKeys,
      onChange: (keys) => setSelectedRowKeys(keys),
      preserveSelectedRowKeys: true,
    }),
    [selectedRowKeys],
  );

  return (
    <div className="oc-page">
      <PageHeader
        className="oc-page-header--compact"
        title="备料采购入库"
        extra={metaLoading ? <Text type="secondary">筛选项加载中…</Text> : null}
        subtitle="按采购单查看整单进度，展开后逐项核对收料状态。"
        stats={
          <div className="oc-summary-strip">
            <div className="oc-summary-chip"><div className="oc-summary-chip__label">当前类型</div><div className="oc-summary-chip__value">{materialType === 'fabric' ? '面料' : '辅料/包材'}</div></div>
            <div className="oc-summary-chip"><div className="oc-summary-chip__label">当前状态</div><div className="oc-summary-chip__value">{(meta?.statusOptions ?? []).find((item) => item.value === statusFilter)?.label ?? statusFilter}</div></div>
            <div className="oc-summary-chip"><div className="oc-summary-chip__label">采购单数</div><div className="oc-summary-chip__value">{total}</div></div>
          </div>
        }
      />
      <PageSection className="oc-page-section--compact">
        <div className="oc-section-stack-tight">
          <Tabs
            activeKey={materialType}
            onChange={handleTabChange}
            items={(meta?.materialTypeTabs ?? [
              { value: 'fabric', label: '面料' },
              { value: 'accessory', label: '辅料/包材' },
            ]).map((tab) => ({ key: tab.value, label: tab.label }))}
          />
          <FilterBar
            left={
              <>
                <Select
                  value={statusFilter}
                  onChange={handleStatusChange}
                  options={(meta?.statusOptions ?? [
                    { value: 'all', label: '全部状态' },
                    { value: 'pending', label: '未完成' },
                    { value: 'completed', label: '已完成' },
                    { value: 'void', label: '已作废' },
                  ]).map((option) => ({ label: option.label, value: option.value }))}
                  style={{ width: 140 }}
                />
                <SearchField value={keywordInput} onChange={setKeywordInput} onPressEnter={handleSearch} placeholder="请输入物料/供应商/采购单号" className="oc-toolbar-block--grow" />
              </>
            }
            right={<Button icon={<ReloadOutlined />} onClick={handleReset}>重置</Button>}
          />
          <TableToolbar
            left={
              <div className="oc-toolbar-cluster">
                <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalOpen(true)}>备料采购</Button>
                <Button icon={<EditOutlined />} disabled={!selectedRowKeys.length} onClick={handleBatchEdit}>批量修改</Button>
                <Button icon={<InboxOutlined />} disabled={!selectedRowKeys.length} onClick={handleBatchReceive}>批量收料</Button>
                <Button icon={<SettingOutlined />} loading={statusUpdating} disabled={!selectedRowKeys.length} onClick={() => handleStatusUpdate('completed')}>设置完成</Button>
                <Button icon={<SettingOutlined />} disabled={statusUpdating || !selectedRowKeys.length} onClick={() => handleStatusUpdate('void')}>设置作废</Button>
              </div>
            }
            right={
              <div className="oc-toolbar-cluster oc-toolbar-cluster--end">
                <Button icon={<CloudUploadOutlined />}>导入</Button>
                <Button icon={<DownloadOutlined />} onClick={handleExport}>导出</Button>
              </div>
            }
          />
          {selectedRowKeys.length > 0 ? (
            <BulkActionBar
              selectionText={<Text>已选择 {selectedRowKeys.length} 张采购单</Text>}
              actions={<Button icon={<InboxOutlined />} onClick={handleBatchReceive}>批量收料</Button>}
            />
          ) : null}
       <Table<StockingPurchaseOrderRecord>
         className="stocking-order-table"
         rowKey={(record) => record.id}
         dataSource={orders}
         columns={orderColumns}
         loading={tableLoading}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            pageSizeOptions: PAGE_SIZE_OPTIONS,
            onChange: (nextPage, nextSize) => {
              setPage(nextPage);
              if (nextSize && nextSize !== pageSize) {
                setPageSize(nextSize);
              }
            },
            showTotal: (value: number) => `共 ${value} 张采购单`,
          }}
          rowSelection={selection}
          expandable={{
            expandedRowKeys,
            onExpandedRowsChange: (keys) => setExpandedRowKeys([...keys]),
            rowExpandable: (order) => order.lines.length > 0,
            expandedRowRender: (order) => (
              <div className="stocking-line-panel">
                <div className="stocking-line-panel__header">
                  <Text strong>采购明细</Text>
                  <Text type="secondary">整单状态与每条物料的收料状态分别显示</Text>
                </div>
                <Table<StockingPurchaseRecord>
                  rowKey={(record) => record.id}
                  dataSource={order.lines}
                  columns={lineColumns}
                  pagination={false}
                  size="small"
                  scroll={{ x: 1180 }}
                />
              </div>
            ),
          }}
          scroll={{ x: 1260 }}
       />
        <StockingPurchaseCreateModal
          open={createModalOpen}
          materialType={materialType}
          mode={editingOrder ? 'edit' : 'create'}
          initialDraft={editingOrder ? undefined : createDraft}
          initialOrder={editingOrder ?? undefined}
          onClose={() => {
            setCreateModalOpen(false);
            setEditingOrder(null);
            if (searchParams.get('openCreate') === 'true') {
              const next = new URLSearchParams(searchParams);
              const prefillKey = next.get('prefillKey');
              if (prefillKey) {
                window.sessionStorage.removeItem(prefillKey);
              }
              next.delete('openCreate');
              next.delete('materialType');
              next.delete('materialCode');
              next.delete('materialName');
              next.delete('quantity');
              next.delete('supplierName');
              next.delete('remark');
              next.delete('prefillKey');
              setSearchParams(next, { replace: true });
            }
          }}
          onCreated={(summary) => {
            message.success(`已创建采购单 ${summary.orderNo}`);
            setCreateModalOpen(false);
            setEditingOrder(null);
            setSelectedRowKeys([]);
            if (searchParams.get('openCreate') === 'true') {
              const next = new URLSearchParams(searchParams);
              const prefillKey = next.get('prefillKey');
              if (prefillKey) {
                window.sessionStorage.removeItem(prefillKey);
              }
              next.delete('openCreate');
              next.delete('materialType');
              next.delete('materialCode');
              next.delete('materialName');
              next.delete('quantity');
              next.delete('supplierName');
              next.delete('remark');
              next.delete('prefillKey');
              setSearchParams(next, { replace: true });
            }
            void loadList();
          }}
          onUpdated={(detail) => {
            message.success(`已更新采购单 ${detail.orderNo}`);
            setEditingOrder(null);
            setCreateModalOpen(false);
            void loadList();
          }}
        />
        <StockingPurchaseBatchEditModal
          open={batchEditOpen}
          orderIds={collectSelectedOrderIds()}
          lineIds={orders
            .filter((order) => selectedRowKeys.includes(order.id))
            .flatMap((order) => order.lines.map((line) => line.id))}
          materialType={materialType}
          onClose={() => setBatchEditOpen(false)}
          onSaved={() => {
            setBatchEditOpen(false);
            setSelectedRowKeys([]);
            void loadList();
          }}
        />
        <Modal
          title={`收料 - ${receiveModalState.record?.purchaseOrderNo ?? ''}`}
          open={receiveModalState.open}
          onCancel={closeReceiveModal}
          confirmLoading={receiveModalState.submitting}
          onOk={handleReceiveSubmit}
          destroyOnHidden
        >
          <Form form={receiveForm} layout="vertical">
            <Form.Item name="warehouseId" hidden rules={[{ required: true, message: '请选择收料仓库' }]}>
              <Input />
            </Form.Item>
            <Form.Item label="收料仓库">
              <Input value={receiveModalState.record?.warehouseName ?? '-'} disabled />
            </Form.Item>
            {receiveModalState.record ? (
              <Alert
                showIcon
                type={receiveIsOverPlan ? 'warning' : 'info'}
                style={{ marginBottom: 12 }}
                message={`计划量：${formatQuantity(receivePlanQty)} ${receiveModalState.record.unit} ｜ 当前累计实收：${formatQuantity(receiveActualBeforeQty)} ${receiveModalState.record.unit}`}
                description={receiveIsOverPlan
                  ? `本次提交后累计实收将变为 ${formatQuantity(receiveActualAfterQty)} ${receiveModalState.record.unit}，超收 ${formatQuantity(receiveOverAfterQty)} ${receiveModalState.record.unit}。超计划录入时，超收原因必选，业务备注必填。`
                  : `计划待收量：${formatQuantity(getPlanPendingReceiveQty(receiveModalState.record, receivePlanQty))} ${receiveModalState.record.unit}。一期支持超计划录入，但会做显式告警与审计。`}
              />
            ) : null}
            <Form.Item
              label="收料数量"
              name="receiveQty"
              rules={[
                { required: true, message: '请输入收料数量' },
                {
                  validator: (_rule, value) => {
                    if (value === undefined || value === null) {
                      return Promise.resolve();
                    }
                    if (value <= 0) {
                      return Promise.reject(new Error('收料数量需大于 0'));
                    }
                    return Promise.resolve();
                  },
                },
              ]}
            >
              <NumberWithUnitInput min={1} precision={0} style={{ width: '100%' }} unit={receiveModalState.record?.unit} />
            </Form.Item>
            <Form.Item
              label="收料时间"
              name="receivedAt"
              rules={[{ required: true, message: '请选择收料时间' }]}
            >
              <DatePicker showTime style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item label="批次号" name="batchNo">
              <Input placeholder="可填写批次号" />
            </Form.Item>
            <Form.Item
              label="超收原因"
              name="overReceiptReasonCode"
              rules={[{
                validator: (_rule, value) => {
                  if (!receiveIsOverPlan || value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('超计划收料时必须选择超收原因'));
                },
              }]}
            >
              <Select allowClear options={OVER_PLAN_REASON_OPTIONS} placeholder="超计划收料时必选" />
            </Form.Item>
            <Form.Item
              label="业务备注"
              name="remark"
              rules={[{
                validator: (_rule, value) => {
                  if (!receiveIsOverPlan || (typeof value === 'string' && value.trim())) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('超计划收料时必须填写备注'));
                },
              }]}
            >
              <Input.TextArea rows={3} placeholder="超计划收料时必填，可补充批次、沟通人、处理说明" />
            </Form.Item>
          </Form>
        </Modal>
        <Modal
          title="批量收料"
          open={batchReceiveModalState.open}
          onCancel={closeBatchReceiveModal}
          confirmLoading={batchReceiveModalState.submitting}
          onOk={handleBatchReceiveSubmit}
          destroyOnHidden
          width={760}
        >
          <Form form={batchReceiveForm} layout="vertical">
            <Form.Item
              label="收料时间"
              name="receivedAt"
              rules={[{ required: true, message: '请选择收料时间' }]}
            >
              <DatePicker showTime style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item label="备注" name="remark">
              <Input.TextArea rows={3} placeholder="可填写本次收料备注" />
            </Form.Item>
            <Form.List name="items">
              {(fields) => (
                <Space
                  direction="vertical"
                  size={16}
                  style={{ width: '100%', maxHeight: 420, overflowY: 'auto' }}
                >
                  {fields.map((field) => {
                    const record = batchReceiveModalState.records[field.name];
                    if (!record) {
                      return null;
                    }
                    return (
                      <Card key={`${record.id}-${field.key}`} size="small" variant="outlined">
                        <Space direction="vertical" size={8} style={{ width: '100%' }}>
                          <div>
                            <Text strong>{record.purchaseOrderNo}</Text>
                            <Text type="secondary" style={{ marginLeft: 8 }}>
                              {record.materialName}
                            </Text>
                          </div>
                          <Space size={16} wrap style={{ fontSize: 12, color: '#666' }}>
                            <span>计划量：{formatQuantity(record.orderQty)} {record.unit}</span>
                            <span>累计实收：{formatQuantity(getActualReceivedQty(record))} {record.unit}</span>
                            <span>计划待收：{formatQuantity(getPlanPendingReceiveQty(record, record.orderQty))} {record.unit}</span>
                            <span>仓库：{record.warehouseName ?? '-'}</span>
                          </Space>
                          <Form.Item name={[field.name, 'lineId']} initialValue={record.id} hidden>
                            <Input />
                          </Form.Item>
                          <Alert
                            showIcon
                            type={(() => {
                              const currentQty = Number(batchItemsWatch?.[field.name]?.receiveQty ?? 0);
                              const nextActualQty = getActualReceivedQty(record) + currentQty;
                              return nextActualQty > record.orderQty ? 'warning' : 'info';
                            })()}
                            message={(() => {
                              const currentQty = Number(batchItemsWatch?.[field.name]?.receiveQty ?? 0);
                              const nextActualQty = getActualReceivedQty(record) + currentQty;
                              const overQty = Math.max(nextActualQty - record.orderQty, 0);
                              return overQty > 0
                                ? `提交后累计实收 ${formatQuantity(nextActualQty)} ${record.unit}，超收 ${formatQuantity(overQty)} ${record.unit}`
                                : `本次按计划口径收料，提交后累计实收 ${formatQuantity(nextActualQty)} ${record.unit}`;
                            })()}
                            description="批量场景下，如本条发生超计划收料，仍需逐条选择超收原因并填写业务备注。"
                          />
                          <Form.Item
                            label="收料数量"
                            name={[field.name, 'receiveQty']}
                            rules={[
                              { required: true, message: '请输入收料数量' },
                              {
                                validator: (_rule, value) => {
                                  if (value === undefined || value === null) {
                                    return Promise.resolve();
                                  }
                                  if (value <= 0) {
                                    return Promise.reject(new Error('收料数量需大于 0'));
                                  }
                                  return Promise.resolve();
                                },
                              },
                            ]}
                          >
                            <NumberWithUnitInput min={1} precision={0} style={{ width: '100%' }} unit={record.unit} />
                          </Form.Item>
                          <Form.Item label="批次号" name={[field.name, 'batchNo']}>
                            <Input placeholder="可填写批次号" />
                          </Form.Item>
                          <Form.Item
                            label="超收原因"
                            name={[field.name, 'overReceiptReasonCode']}
                            rules={[{
                              validator: (_rule, value) => {
                                const currentQty = Number(batchItemsWatch?.[field.name]?.receiveQty ?? 0);
                                const nextActualQty = getActualReceivedQty(record) + currentQty;
                                if (nextActualQty <= record.orderQty || value) {
                                  return Promise.resolve();
                                }
                                return Promise.reject(new Error('超计划收料时必须选择超收原因'));
                              },
                            }]}
                          >
                            <Select allowClear options={OVER_PLAN_REASON_OPTIONS} placeholder="超计划收料时必选" />
                          </Form.Item>
                          <Form.Item
                            label="业务备注"
                            name={[field.name, 'remark']}
                            rules={[{
                              validator: (_rule, value) => {
                                const currentQty = Number(batchItemsWatch?.[field.name]?.receiveQty ?? 0);
                                const nextActualQty = getActualReceivedQty(record) + currentQty;
                                if (nextActualQty <= record.orderQty || (typeof value === 'string' && value.trim())) {
                                  return Promise.resolve();
                                }
                                return Promise.reject(new Error('超计划收料时必须填写备注'));
                              },
                            }]}
                          >
                            <Input.TextArea rows={2} placeholder="超计划收料时必填" />
                          </Form.Item>
                        </Space>
                      </Card>
                    );
                  })}
                </Space>
              )}
            </Form.List>
          </Form>
        </Modal>
        <Drawer
          title={`收料明细 - ${receiptDrawerState.record?.purchaseOrderNo ?? ''}`}
          placement="right"
          width={560}
          open={receiptDrawerState.open}
          onClose={closeReceiptDrawer}
        >
          {receiptDrawerState.loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
              <Spin />
            </div>
          ) : !groupedReceipts.length ? (
            <div style={{ padding: 24, textAlign: 'center', color: '#999' }}>暂无收料记录</div>
          ) : (
            <Space direction="vertical" size={16} style={{ width: '100%' }}>
              {groupedReceipts.map(({ header, items }) => (
                <Card key={header.id} size="small" variant="outlined">
                  <Descriptions
                    size="small"
                    column={1}
                    labelStyle={{ width: 96, fontWeight: 500 }}
                    contentStyle={{ marginLeft: 8 }}
                  >
                    <Descriptions.Item label="收料单号">{header.receiptNo}</Descriptions.Item>
                    <Descriptions.Item label="收料时间">{header.receivedAt ?? '-'}</Descriptions.Item>
                    <Descriptions.Item label="收料仓库">{header.warehouseName ?? '-'}</Descriptions.Item>
                  </Descriptions>
                  <Table<StockingReceiptRecord>
                    rowKey={(record) => `${record.id}-${record.lineId}-${record.batchNo ?? 'batch'}`}
                    dataSource={items}
                    columns={receiptItemColumns}
                    pagination={false}
                    size="small"
                    scroll={{ x: 'max-content' }}
                    style={{ marginTop: 12 }}
                  />
                </Card>
              ))}
            </Space>
          )}
        </Drawer>
        </div>
      </PageSection>
    </div>
  );
};

export default StockingPurchaseInbound;
