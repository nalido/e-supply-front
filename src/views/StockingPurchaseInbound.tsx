import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ColumnsType } from 'antd/es/table';
import type { TableRowSelection } from 'antd/es/table/interface';
import {
  Button,
  Card,
  DatePicker,
  Descriptions,
  Drawer,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Spin,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from 'antd';
import {
  CloudUploadOutlined,
  DownloadOutlined,
  InboxOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { stockingPurchaseInboundService } from '../api/procurement';
import StockingPurchaseCreateModal from '../components/procurement/StockingPurchaseCreateModal';
import type {
  StockingPurchaseListParams,
  StockingPurchaseMeta,
  StockingPurchaseRecord,
  StockingPurchaseStatusFilter,
  StockingStatusUpdatePayload,
  StockingReceiptRecord,
  StockingReceivePayload,
} from '../types/stocking-purchase-inbound';
import dayjs from 'dayjs';

const { Text } = Typography;

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 20, 50];

const quantityFormatter = new Intl.NumberFormat('zh-CN');
const currencyFormatter = new Intl.NumberFormat('zh-CN', {
  style: 'currency',
  currency: 'CNY',
  minimumFractionDigits: 2,
});

const formatQuantity = (value: number) => quantityFormatter.format(value ?? 0);
const formatCurrency = (value: number) => currencyFormatter.format(value ?? 0);

const statusColorMap: Record<StockingPurchaseRecord['status'], string> = {
  pending: 'orange',
  partial: 'blue',
  completed: 'green',
  void: 'default',
};

type ReceiveFormValues = {
  warehouseId?: string;
  receiveQty?: number;
  receivedAt?: dayjs.Dayjs;
  batchNo?: string;
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

const StockingPurchaseInbound = () => {
  const [receiveForm] = Form.useForm<ReceiveFormValues>();
  const [batchReceiveForm] = Form.useForm<BatchReceiveFormValues>();
  const [meta, setMeta] = useState<StockingPurchaseMeta | null>(null);
  const [metaLoading, setMetaLoading] = useState(false);
  const [materialType, setMaterialType] = useState<'fabric' | 'accessory'>('fabric');
  const [statusFilter, setStatusFilter] = useState<StockingPurchaseStatusFilter>('pending');
  const [keywordInput, setKeywordInput] = useState('');
  const [appliedKeyword, setAppliedKeyword] = useState<string | undefined>(undefined);
  const [records, setRecords] = useState<StockingPurchaseRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [tableLoading, setTableLoading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [createModalOpen, setCreateModalOpen] = useState(false);
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

  useEffect(() => {
    const loadMeta = async () => {
      setMetaLoading(true);
      try {
        const response = await stockingPurchaseInboundService.getMeta();
        setMeta(response);
        setStatusFilter(response.defaultStatus);
        if (response.materialTypeTabs?.length) {
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
  }, []);

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
      setRecords(response.list);
      setTotal(response.total);
      const validIds = new Set(response.list.map((item) => item.id));
      setSelectedRowKeys((prev) => prev.filter((key) => validIds.has(String(key))));
    } catch (error) {
      console.error('failed to load stocking purchase list', error);
      message.error('获取备料采购列表失败');
    } finally {
      setTableLoading(false);
    }
  }, [appliedKeyword, materialType, page, pageSize, statusFilter]);

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
        receiveQty: record.pendingQty > 0 ? record.pendingQty : undefined,
        receivedAt: dayjs(),
        batchNo: undefined,
        remark: undefined,
      });
    },
    [receiveForm],
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
  }, [closeReceiveModal, loadList, receiveForm, receiveModalState.record, setSelectedRowKeys]);

  const closeReceiptDrawer = () => {
    setReceiptDrawerState((prev) => ({ ...prev, open: false }));
  };

  const openReceiptDrawer = useCallback(
    async (record: StockingPurchaseRecord) => {
      if (!record.orderId) {
        message.warning('未找到订单信息，无法查看明细');
        return;
      }
      setReceiptDrawerState({ open: true, loading: true, data: [], record });
      try {
        const list = await stockingPurchaseInboundService.getReceipts({
          orderId: record.orderId,
          lineId: record.id,
        });
        setReceiptDrawerState((prev) => ({ ...prev, data: list, loading: false }));
      } catch (error) {
        console.error('failed to load receipt list', error);
        message.error('加载收料明细失败');
        setReceiptDrawerState((prev) => ({ ...prev, loading: false }));
      }
    },
    [],
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
      setStatusFilter('pending');
      setMaterialType('fabric');
    }
    setAppliedKeyword(undefined);
    setPage(1);
    setPageSize(DEFAULT_PAGE_SIZE);
    setSelectedRowKeys([]);
  };

  const collectSelectedOrderIds = useCallback(() => {
    const mapping = new Map(records.map((record) => [record.id, record.orderId]));
    const uniqueIds = new Set<string>();
    selectedRowKeys.forEach((key) => {
      const orderId = mapping.get(String(key));
      if (orderId) {
        uniqueIds.add(orderId);
      }
    });
    return Array.from(uniqueIds);
  }, [records, selectedRowKeys]);

  const handleBatchReceive = () => {
    if (!selectedRowKeys.length) {
      message.warning('请先选择需要收料的采购单');
      return;
    }
    const selectedRecords = records.filter((record) => selectedRowKeys.includes(record.id));
    if (!selectedRecords.length) {
      message.warning('所选记录已失效，请重新选择');
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
        receiveQty: record.pendingQty > 0 ? record.pendingQty : undefined,
        batchNo: undefined,
        remark: undefined,
      })),
    });
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
      await stockingPurchaseInboundService.setStatus(payload);
      message.success('状态更新成功');
      setSelectedRowKeys([]);
      void loadList();
    } catch (error) {
      console.error('failed to update stocking purchase status', error);
      message.error('状态更新失败，请稍后重试');
    }
  };

  const handleExport = async () => {
    try {
      const params: StockingPurchaseListParams = {
        page: 1,
        pageSize: total || records.length || DEFAULT_PAGE_SIZE,
        materialType,
        status: statusFilter,
        keyword: appliedKeyword,
      };
      const result = await stockingPurchaseInboundService.export(params);
      message.success('导出任务已生成，请稍后在下载中心查看');
      console.info('mock export url', result.fileUrl);
    } catch (error) {
      console.error('failed to export stocking purchase list', error);
      message.error('导出失败，请稍后重试');
    }
  };

  const columns: ColumnsType<StockingPurchaseRecord> = useMemo(
    () => [
      {
        title: '状态',
        dataIndex: 'statusLabel',
        key: 'statusLabel',
        width: 120,
        render: (_value, record) => (
          <Tag color={statusColorMap[record.status]}>{record.statusLabel}</Tag>
        ),
      },
      {
        title: '采购单号',
        dataIndex: 'purchaseOrderNo',
        key: 'purchaseOrderNo',
        width: 160,
        render: (value: string) => <Text strong>{value}</Text>,
      },
      {
        title: '供应商',
        dataIndex: 'supplierName',
        key: 'supplierName',
        width: 180,
      },
      {
        title: '收料仓库',
        dataIndex: 'warehouseName',
        key: 'warehouseName',
        width: 180,
        render: (value?: string) => value ?? '-',
      },
      {
        title: '物料名称',
        dataIndex: 'materialName',
        key: 'materialName',
        width: 240,
        render: (value: string, record) => (
          <Space direction="vertical" size={2}>
            <Text>{value}</Text>
            {record.materialCategory ? (
              <Text type="secondary" style={{ fontSize: 12 }}>
                {record.materialCategory}
              </Text>
            ) : null}
          </Space>
        ),
      },
      {
        title: '采购数',
        dataIndex: 'orderQty',
        key: 'orderQty',
        align: 'right',
        width: 120,
        render: (value: number, record) => `${formatQuantity(value)} ${record.unit}`,
      },
      {
        title: '待收料',
        dataIndex: 'pendingQty',
        key: 'pendingQty',
        align: 'right',
        width: 120,
        render: (value: number, record) => `${formatQuantity(value)} ${record.unit}`,
      },
      {
        title: '已收料',
        dataIndex: 'receivedQty',
        key: 'receivedQty',
        align: 'right',
        width: 120,
        render: (value: number, record) => `${formatQuantity(value)} ${record.unit}`,
      },
      {
        title: '采购日期',
        dataIndex: 'purchaseDate',
        key: 'purchaseDate',
        width: 140,
      },
      {
        title: '采购金额',
        dataIndex: 'orderAmount',
        key: 'orderAmount',
        align: 'right',
        width: 140,
        render: (value: number) => formatCurrency(value),
      },
      {
        title: '采购单价',
        dataIndex: 'unitPrice',
        key: 'unitPrice',
        align: 'right',
        width: 120,
        render: (value?: number) => (value === undefined ? '-' : formatCurrency(value)),
      },
      {
        title: '颜色',
        dataIndex: 'color',
        key: 'color',
        width: 120,
        render: (value?: string) => value ?? '-',
      },
      {
        title: '幅宽',
        dataIndex: 'width',
        key: 'width',
        width: 110,
        render: (value?: string) => value ?? '-',
      },
      {
        title: '克重',
        dataIndex: 'weight',
        key: 'weight',
        width: 110,
        render: (value?: string) => value ?? '-',
      },
      {
        title: '供应商型号',
        dataIndex: 'supplierModel',
        key: 'supplierModel',
        width: 150,
        render: (value?: string) => value ?? '-',
      },
      {
        title: '供应商色号',
        dataIndex: 'supplierColorNo',
        key: 'supplierColorNo',
        width: 150,
        render: (value?: string) => value ?? '-',
      },
      {
        title: '空差',
        dataIndex: 'tolerance',
        key: 'tolerance',
        width: 110,
        render: (value?: string) => value ?? '-',
      },
      {
        title: '备注',
        dataIndex: 'remark',
        key: 'remark',
        width: 200,
        ellipsis: true,
        render: (value?: string) => value ?? '-',
      },
      {
        title: '操作',
        key: 'actions',
        fixed: 'right',
        width: 200,
        render: (_value, record) => {
          const disableReceive = !record.orderId || record.pendingQty <= 0;
          return (
            <Space size={8}>
              <Button size="small" type="link" disabled={disableReceive} onClick={() => openReceiveModal(record)}>
                收料
              </Button>
              <Button size="small" type="link" onClick={() => openReceiptDrawer(record)}>
                收料明细
              </Button>
            </Space>
          );
        },
      },
    ],
    [openReceiptDrawer, openReceiveModal],
  );

  const receiptItemColumns: ColumnsType<StockingReceiptRecord> = useMemo(
    () => [
      {
        title: '收料数量',
        dataIndex: 'receivedQty',
        key: 'receivedQty',
        align: 'right',
        width: 140,
        render: (value: number, record) =>
          `${quantityFormatter.format(value ?? 0)} ${record.unit ?? ''}`,
      },
      {
        title: '待收余额',
        dataIndex: 'pendingQty',
        key: 'pendingQty',
        align: 'right',
        width: 140,
        render: (value: number, record) =>
          `${quantityFormatter.format(value ?? 0)} ${record.unit ?? ''}`,
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

  const selection: TableRowSelection<StockingPurchaseRecord> = useMemo(
    () => ({
      selectedRowKeys,
      onChange: (keys) => setSelectedRowKeys(keys),
      preserveSelectedRowKeys: true,
    }),
    [selectedRowKeys],
  );

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Tabs
        activeKey={materialType}
        onChange={handleTabChange}
        items={(meta?.materialTypeTabs ?? [
          { value: 'fabric', label: '面料' },
          { value: 'accessory', label: '辅料/包材' },
        ]).map((tab) => ({ key: tab.value, label: tab.label }))}
      />

      <Card
        variant="borderless"
        loading={metaLoading}
        title="备料采购列表"
        extra={
          <Space size={8} wrap>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalOpen(true)}>
              备料采购
            </Button>
            <Button icon={<InboxOutlined />} disabled={!selectedRowKeys.length} onClick={handleBatchReceive}>
              批量收料
            </Button>
            <Button
              icon={<SettingOutlined />}
              disabled={!selectedRowKeys.length}
              onClick={() => handleStatusUpdate('completed')}
            >
              设置完成
            </Button>
            <Button
              icon={<SettingOutlined />}
              disabled={!selectedRowKeys.length}
              onClick={() => handleStatusUpdate('void')}
            >
              设置作废
            </Button>
            <Button icon={<CloudUploadOutlined />}>导入</Button>
            <Button icon={<DownloadOutlined />} onClick={handleExport}>
              导出
            </Button>
          </Space>
        }
      >
        <Space size={12} wrap style={{ marginBottom: 16 }}>
          <Select
            value={statusFilter}
            onChange={handleStatusChange}
            options={(meta?.statusOptions ?? [
              { value: 'all', label: '全部状态' },
              { value: 'pending', label: '未完成' },
              { value: 'completed', label: '已完成' },
            ]).map((option) => ({ label: option.label, value: option.value }))}
            style={{ width: 140 }}
          />
            <Input
              allowClear
              value={keywordInput}
              onChange={(event) => setKeywordInput(event.target.value)}
              placeholder="请输入物料/供应商/采购单号"
              prefix={<SearchOutlined />}
              style={{ width: 280 }}
              onPressEnter={handleSearch}
            />
          <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
            查询
          </Button>
          <Button icon={<ReloadOutlined />} onClick={handleReset}>
            重置
          </Button>
        </Space>
       <Table<StockingPurchaseRecord>
         rowKey={(record) => record.id}
         dataSource={records}
         columns={columns}
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
            showTotal: (value: number) => `共 ${value} 条`,
          }}
          rowSelection={selection}
          scroll={{ x: 1400 }}
       />
        <StockingPurchaseCreateModal
          open={createModalOpen}
          materialType={materialType}
          onClose={() => setCreateModalOpen(false)}
          onCreated={(summary) => {
            message.success(`已创建采购单 ${summary.orderNo}`);
            setCreateModalOpen(false);
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
          destroyOnClose
        >
          <Form form={receiveForm} layout="vertical">
            <Form.Item name="warehouseId" hidden rules={[{ required: true, message: '请选择收料仓库' }]}>
              <Input />
            </Form.Item>
            <Form.Item label="收料仓库">
              <Input value={receiveModalState.record?.warehouseName ?? '-'} disabled />
            </Form.Item>
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
                    const pending = receiveModalState.record?.pendingQty ?? 0;
                    if (pending > 0 && value > pending) {
                      return Promise.reject(new Error(`不能超过待收料 ${formatQuantity(pending)}`));
                    }
                    return Promise.resolve();
                  },
                },
              ]}
            >
              <InputNumber min={1} precision={0} style={{ width: '100%' }} />
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
            <Form.Item label="备注" name="remark">
              <Input.TextArea rows={3} placeholder="可填写备注信息" />
            </Form.Item>
          </Form>
        </Modal>
        <Modal
          title="批量收料"
          open={batchReceiveModalState.open}
          onCancel={closeBatchReceiveModal}
          confirmLoading={batchReceiveModalState.submitting}
          onOk={handleBatchReceiveSubmit}
          destroyOnClose
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
                    const pendingQty = record.pendingQty ?? 0;
                    return (
                      <Card key={`${record.id}-${field.key}`} size="small" bordered>
                        <Space direction="vertical" size={8} style={{ width: '100%' }}>
                          <div>
                            <Text strong>{record.purchaseOrderNo}</Text>
                            <Text type="secondary" style={{ marginLeft: 8 }}>
                              {record.materialName}
                            </Text>
                          </div>
                          <Space size={16} wrap style={{ fontSize: 12, color: '#666' }}>
                            <span>待收料：{formatQuantity(pendingQty)} {record.unit}</span>
                            <span>仓库：{record.warehouseName ?? '-'}</span>
                          </Space>
                          <Form.Item name={[field.name, 'lineId']} initialValue={record.id} hidden>
                            <Input />
                          </Form.Item>
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
                                  if (pendingQty > 0 && value > pendingQty) {
                                    return Promise.reject(
                                      new Error(`不能超过待收料 ${formatQuantity(pendingQty)}`),
                                    );
                                  }
                                  return Promise.resolve();
                                },
                              },
                            ]}
                          >
                            <InputNumber min={1} precision={0} style={{ width: '100%' }} />
                          </Form.Item>
                          <Form.Item label="批次号" name={[field.name, 'batchNo']}>
                            <Input placeholder="可填写批次号" />
                          </Form.Item>
                          <Form.Item label="备注" name={[field.name, 'remark']}>
                            <Input.TextArea rows={2} placeholder="可填写备注信息" />
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
                <Card key={header.id} size="small" bordered>
                  <Descriptions
                    size="small"
                    column={1}
                    labelStyle={{ width: 96, fontWeight: 500 }}
                    contentStyle={{ marginLeft: 8 }}
                  >
                    <Descriptions.Item label="收料单号">{header.receiptNo}</Descriptions.Item>
                    <Descriptions.Item label="状态">
                      <Tag color={header.statusTagColor}>{header.statusLabel}</Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="收料时间">{header.receivedAt ?? '-'}</Descriptions.Item>
                    <Descriptions.Item label="收料仓库">{header.warehouseName ?? '-'}</Descriptions.Item>
                  </Descriptions>
                  <Table<StockingReceiptRecord>
                    rowKey={(record) => `${record.id}-${record.lineId}-${record.batchNo ?? 'batch'}`}
                    dataSource={items}
                    columns={receiptItemColumns}
                    pagination={false}
                    size="small"
                    style={{ marginTop: 12 }}
                  />
                </Card>
              ))}
            </Space>
          )}
        </Drawer>
      </Card>
    </Space>
  );
};

export default StockingPurchaseInbound;
