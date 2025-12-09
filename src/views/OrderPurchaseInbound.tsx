import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ColumnsType } from 'antd/es/table';
import type { TableRowSelection } from 'antd/es/table/interface';
import dayjs, { type Dayjs } from 'dayjs';
import {
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from 'antd';
import { DownloadOutlined, InboxOutlined, SearchOutlined, SettingOutlined } from '@ant-design/icons';
import { orderPurchaseInboundService } from '../api/mock';
import type {
  OrderPurchaseInboundListParams,
  OrderPurchaseInboundListResponse,
  OrderPurchaseInboundMaterialType,
  OrderPurchaseInboundMeta,
  OrderPurchaseInboundRecord,
  OrderPurchaseInboundStatusFilter,
} from '../types/order-purchase-inbound';

const { Text } = Typography;

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 20, 50];

const quantityFormatter = new Intl.NumberFormat('zh-CN');
const currencyFormatter = new Intl.NumberFormat('zh-CN', {
  style: 'currency',
  currency: 'CNY',
  minimumFractionDigits: 2,
});

const toQuantity = (value: number | undefined) => quantityFormatter.format(value ?? 0);
const toCurrency = (value: number | undefined) =>
  value === undefined ? '-' : currencyFormatter.format(value ?? 0);

const getDefaultSummary = (): OrderPurchaseInboundListResponse['summary'] => ({
  orderQty: 0,
  pendingQty: 0,
  receivedQty: 0,
});

type BatchReceiveFormValues = {
  receiveDate?: Dayjs;
  remark?: string;
  items: { id: string; receiveQty?: number }[];
};

type StatusFormValues = {
  nextStatus?: 'forceCompleted' | 'void';
  reason?: string;
};

type ReceiveContext = {
  records: OrderPurchaseInboundRecord[];
};

const OrderPurchaseInbound = () => {
  const [meta, setMeta] = useState<OrderPurchaseInboundMeta | null>(null);
  const [metaLoading, setMetaLoading] = useState(false);
  const [materialType, setMaterialType] = useState<OrderPurchaseInboundMaterialType>('fabric');
  const [statusFilter, setStatusFilter] = useState<OrderPurchaseInboundStatusFilter | undefined>();
  const [keywordInput, setKeywordInput] = useState('');
  const [appliedKeyword, setAppliedKeyword] = useState<string | undefined>();
  const [hideZero, setHideZero] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [listState, setListState] = useState<OrderPurchaseInboundListResponse>({
    list: [],
    total: 0,
    summary: getDefaultSummary(),
  });
  const [tableLoading, setTableLoading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [selectedRows, setSelectedRows] = useState<OrderPurchaseInboundRecord[]>([]);
  const [receiveModalOpen, setReceiveModalOpen] = useState(false);
  const [receiveSubmitting, setReceiveSubmitting] = useState(false);
  const [receiveContext, setReceiveContext] = useState<ReceiveContext | null>(null);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [statusSubmitting, setStatusSubmitting] = useState(false);
  const [receiveForm] = Form.useForm<BatchReceiveFormValues>();
  const [statusForm] = Form.useForm<StatusFormValues>();
  const paramsRef = useRef<OrderPurchaseInboundListParams | null>(null);

  useEffect(() => {
    const loadMeta = async () => {
      setMetaLoading(true);
      try {
        const response = await orderPurchaseInboundService.getMeta();
        setMeta(response);
        setStatusFilter((prev) => prev ?? response.defaultStatus);
        if (response.materialTypeTabs?.length) {
          const firstTab = response.materialTypeTabs[0]?.value;
          setMaterialType((prev) => (prev ? prev : firstTab));
        }
      } catch (error) {
        console.error('failed to load order purchase inbound meta', error);
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
      const params: OrderPurchaseInboundListParams = {
        page,
        pageSize,
        materialType,
        statusFilter,
        keyword: appliedKeyword,
        hideZero,
      };
      paramsRef.current = params;
      const response = await orderPurchaseInboundService.getList(params);
      setListState(response);
      const validIds = new Set(response.list.map((item) => item.id));
      setSelectedRowKeys((prev) => prev.filter((key) => validIds.has(String(key))));
      setSelectedRows((prev) => prev.filter((item) => validIds.has(item.id)));
    } catch (error) {
      console.error('failed to load order purchase inbound list', error);
      message.error('获取按单采购列表失败');
    } finally {
      setTableLoading(false);
    }
  }, [appliedKeyword, hideZero, materialType, page, pageSize, statusFilter]);

  useEffect(() => {
    if (!statusFilter) {
      return;
    }
    void loadList();
  }, [loadList, statusFilter]);

  const handleMaterialTypeChange = (value: string) => {
    setMaterialType(value as OrderPurchaseInboundMaterialType);
    setPage(1);
    setSelectedRowKeys([]);
    setSelectedRows([]);
  };

  const handleStatusChange = (value?: OrderPurchaseInboundStatusFilter) => {
    setStatusFilter(value);
    setPage(1);
    setSelectedRowKeys([]);
    setSelectedRows([]);
  };

  const handleSwitchChange = (checked: boolean) => {
    setHideZero(checked);
    setPage(1);
  };

  const handleSearch = () => {
    const trimmed = keywordInput.trim();
    setAppliedKeyword(trimmed ? trimmed : undefined);
    setPage(1);
  };

  const handleReset = () => {
    setKeywordInput('');
    setAppliedKeyword(undefined);
    setHideZero(false);
    setPage(1);
    setPageSize(DEFAULT_PAGE_SIZE);
    setSelectedRowKeys([]);
    setSelectedRows([]);
    if (meta) {
      setStatusFilter(meta.defaultStatus);
      if (meta.materialTypeTabs?.[0]) {
        setMaterialType(meta.materialTypeTabs[0].value);
      }
    } else {
      setStatusFilter('unfinished');
      setMaterialType('fabric');
    }
  };

  const handleTableChange = (nextPage: number, nextPageSize?: number) => {
    const mergedPageSize = nextPageSize ?? pageSize;
    setPage(nextPage);
    if (mergedPageSize !== pageSize) {
      setPageSize(mergedPageSize);
    }
  };

  const openReceiveModal = useCallback((records: OrderPurchaseInboundRecord[]) => {
    if (!records.length) {
      message.warning('请选择至少一条可收料的记录');
      return;
    }
    setReceiveContext({ records });
    receiveForm.setFieldsValue({
      receiveDate: dayjs(),
      remark: undefined,
      items: records.map((record) => ({ id: record.id, receiveQty: record.pendingQty })),
    });
    setReceiveModalOpen(true);
  }, [receiveForm]);

  const handleBatchReceive = useCallback(() => {
    const receivable = selectedRows.filter((row) => row.pendingQty > 0 && (row.status === 'pending' || row.status === 'partial'));
    if (!receivable.length) {
      message.warning('请选择待收料或部分收料的记录');
      return;
    }
    openReceiveModal(receivable);
  }, [openReceiveModal, selectedRows]);

  const handleSingleReceive = useCallback((record: OrderPurchaseInboundRecord) => {
    if (record.pendingQty <= 0 || ['completed', 'forceCompleted', 'void'].includes(record.status)) {
      message.info('该采购单无需收料');
      return;
    }
    openReceiveModal([record]);
  }, [openReceiveModal]);

  const handleReceiveSubmit = useCallback(async () => {
    try {
      const values = await receiveForm.validateFields();
      if (!receiveContext) {
        return;
      }
      const payload = {
        receiveDate: values.receiveDate ? values.receiveDate.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
        items: values.items
          .filter((item) => item.receiveQty && item.receiveQty > 0)
          .map((item) => ({ id: item.id, receiveQty: item.receiveQty ?? 0, remark: values.remark?.trim() || undefined })),
        handler: undefined,
      };
      if (!payload.items.length) {
        message.warning('请输入本次收料数量');
        return;
      }
      setReceiveSubmitting(true);
      await orderPurchaseInboundService.batchReceive(payload);
      message.success('已记录收料');
      setReceiveModalOpen(false);
      setReceiveContext(null);
      setSelectedRowKeys([]);
      setSelectedRows([]);
      void loadList();
    } catch (error) {
      if (error) {
        console.error('failed to submit receive', error);
      }
    } finally {
      setReceiveSubmitting(false);
    }
  }, [loadList, receiveContext, receiveForm]);

  const handleStatusModalOpen = useCallback(() => {
    if (!selectedRows.length) {
      message.warning('请先选择采购单');
      return;
    }
    statusForm.setFieldsValue({ nextStatus: 'forceCompleted', reason: undefined });
    setStatusModalOpen(true);
  }, [selectedRows, statusForm]);

  const handleStatusSubmit = useCallback(async () => {
    try {
      const values = await statusForm.validateFields();
      if (!values.nextStatus) {
        message.warning('请选择要变更的状态');
        return;
      }
      setStatusSubmitting(true);
      await orderPurchaseInboundService.updateStatus({
        ids: selectedRows.map((item) => item.id),
        nextStatus: values.nextStatus,
        reason: values.reason?.trim() || undefined,
      });
      message.success('状态更新成功');
      setStatusModalOpen(false);
      setSelectedRowKeys([]);
      setSelectedRows([]);
      void loadList();
    } catch (error) {
      if (error) {
        console.error('failed to update status', error);
      }
    } finally {
      setStatusSubmitting(false);
    }
  }, [loadList, selectedRows, statusForm]);

  const handleExport = useCallback(async () => {
    try {
      const params = paramsRef.current ?? {
        page: 1,
        pageSize: DEFAULT_PAGE_SIZE,
        materialType,
        statusFilter,
        keyword: appliedKeyword,
        hideZero,
      };
      await orderPurchaseInboundService.export(params);
      message.success('已创建导出任务，请稍后在下载中心查看');
    } catch (error) {
      console.error('failed to export order purchase inbound list', error);
      message.error('导出失败，请稍后再试');
    }
  }, [appliedKeyword, hideZero, materialType, statusFilter]);

  const handleViewDetails = useCallback((record: OrderPurchaseInboundRecord) => {
    Modal.info({
      title: '采购单详情',
      width: 520,
      content: (
        <Space direction="vertical" size={8} style={{ width: '100%' }}>
          <Text type="secondary">采购单号：{record.purchaseOrderNo}</Text>
          <Text type="secondary">工厂订单：{record.factoryOrderNo}</Text>
          <Text type="secondary">物料：{record.materialName}</Text>
          <Text type="secondary">供应商：{record.supplierName}</Text>
          <Text type="secondary">采购数量：{toQuantity(record.orderQty)} {record.unit}</Text>
          <Text type="secondary">已收：{toQuantity(record.receivedQty)} / 待收：{toQuantity(record.pendingQty)}</Text>
          {record.remark ? <Text type="secondary">备注：{record.remark}</Text> : null}
        </Space>
      ),
    });
  }, []);

  const columns: ColumnsType<OrderPurchaseInboundRecord> = useMemo(
    () => [
      {
        title: '序号',
        dataIndex: 'index',
        width: 70,
        render: (_, __, index) => (page - 1) * pageSize + index + 1,
        fixed: 'left',
      },
      {
        title: '图片',
        dataIndex: 'imageUrl',
        width: 90,
        render: (value: string | undefined) =>
          value ? (
            <img
              alt="material"
              src={value}
              style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 4 }}
            />
          ) : (
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 4,
                backgroundColor: '#f5f5f5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#999',
              }}
            >
              无图
            </div>
          ),
      },
      {
        title: '状态',
        dataIndex: 'statusLabel',
        width: 110,
        render: (value: string, record) => <Tag color={record.statusTagColor}>{value}</Tag>,
      },
      {
        title: '采购单号',
        dataIndex: 'purchaseOrderNo',
        width: 160,
      },
      {
        title: '物料名称',
        dataIndex: 'materialName',
        width: 200,
        render: (value: string, record) => (
          <Space direction="vertical" size={0}>
            <Text strong>{value}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.materialCategory}
            </Text>
          </Space>
        ),
      },
      {
        title: '颜色',
        dataIndex: 'color',
        width: 120,
      },
      {
        title: '幅宽',
        dataIndex: 'width',
        width: 110,
      },
      {
        title: '克重',
        dataIndex: 'weight',
        width: 110,
      },
      {
        title: '采购时间',
        dataIndex: 'purchaseTime',
        width: 170,
      },
      {
        title: '供应商',
        dataIndex: 'supplierName',
        width: 160,
      },
      {
        title: '供应商型号',
        dataIndex: 'supplierModel',
        width: 150,
      },
      {
        title: '采购单价',
        dataIndex: 'unitPrice',
        width: 130,
        render: (value: number | undefined) => (value !== undefined ? toCurrency(value) : '-'),
      },
      {
        title: '采购数',
        dataIndex: 'orderQty',
        width: 120,
        render: (value: number, record) => `${toQuantity(value)} ${record.unit}`,
      },
      {
        title: '包装数',
        dataIndex: 'packagingInfo',
        width: 140,
      },
      {
        title: '待收料',
        dataIndex: 'pendingQty',
        width: 120,
        render: (value: number, record) => `${toQuantity(value)} ${record.unit}`,
      },
      {
        title: '已收料',
        dataIndex: 'receivedQty',
        width: 120,
        render: (value: number, record) => `${toQuantity(value)} ${record.unit}`,
      },
      {
        title: '单据类型',
        dataIndex: 'documentType',
        width: 140,
      },
      {
        title: '工厂订单',
        dataIndex: 'factoryOrderNo',
        width: 200,
        render: (value: string, record) => (
          <Space direction="vertical" size={0}>
            <Text>{value}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.factoryOrderName}
            </Text>
          </Space>
        ),
      },
      {
        title: '操作',
        dataIndex: 'actions',
        width: 140,
        fixed: 'right',
        render: (_, record) => (
          <Space size={0} split={<span style={{ color: '#ddd' }}>|</span>}>
            <Button
              type="link"
              size="small"
              onClick={() => handleSingleReceive(record)}
              disabled={record.pendingQty <= 0 || ['completed', 'forceCompleted', 'void'].includes(record.status)}
            >
              收料
            </Button>
            <Button type="link" size="small" onClick={() => handleViewDetails(record)}>
              详细
            </Button>
          </Space>
        ),
      },
    ],
    [handleSingleReceive, handleViewDetails, page, pageSize],
  );

  const rowSelection: TableRowSelection<OrderPurchaseInboundRecord> = useMemo(
    () => ({
      selectedRowKeys,
      onChange: (keys, rows) => {
        setSelectedRowKeys(keys);
        setSelectedRows(rows);
      },
      getCheckboxProps: (record) => ({
        disabled: ['completed', 'forceCompleted', 'void'].includes(record.status),
      }),
    }),
    [selectedRowKeys],
  );

  const tabItems = useMemo(() => {
    if (!meta) {
      return [
        { key: 'fabric', label: '面料' },
        { key: 'accessory', label: '辅料/包材' },
      ];
    }
    return meta.materialTypeTabs.map((tab) => ({ key: tab.value, label: tab.label }));
  }, [meta]);

  const summaryItems = useMemo(
    () => [
      { label: '采购总数', value: `${toQuantity(listState.summary.orderQty)}` },
      { label: '已收料', value: `${toQuantity(listState.summary.receivedQty)}` },
      { label: '待收料', value: `${toQuantity(listState.summary.pendingQty)}` },
    ],
    [listState.summary],
  );

  const hasSelection = selectedRows.length > 0;
  const hasReceivableSelection = selectedRows.some(
    (row) => row.pendingQty > 0 && (row.status === 'pending' || row.status === 'partial'),
  );

  return (
    <Card title="按单采购入库" bordered={false} loading={metaLoading}>
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Space direction="vertical" style={{ width: '100%' }} size={12}>
          <Tabs
            activeKey={materialType}
            onChange={handleMaterialTypeChange}
            items={tabItems}
          />
          <Row gutter={16} align="middle">
            <Col xs={24} sm={12} md={8} lg={6}>
              <Space align="center">
                <Switch checked={hideZero} onChange={handleSwitchChange} />
                <Text>不显示采购数为0的记录</Text>
              </Space>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Select
                value={statusFilter}
                onChange={(value) => handleStatusChange(value)}
                allowClear={false}
                options={meta?.statusOptions ?? [
                  { value: 'unfinished', label: '未完成' },
                  { value: 'completed', label: '已完成' },
                  { value: 'forceCompleted', label: '强制完成' },
                  { value: 'void', label: '作废' },
                ]}
                style={{ width: '100%' }}
                placeholder="选择状态"
              />
            </Col>
            <Col xs={24} md={8} lg={8}>
              <Input
                value={keywordInput}
                onChange={(event) => setKeywordInput(event.target.value)}
                placeholder="请输入物料/供应商/工厂订单/款式/采购单号"
                suffix={<SearchOutlined style={{ color: '#999' }} />}
                allowClear
              />
            </Col>
            <Col xs={24} md={12} lg={4}>
              <Space>
                <Button type="primary" onClick={handleSearch} icon={<SearchOutlined />}>查询</Button>
                <Button onClick={handleReset}>重置</Button>
              </Space>
            </Col>
          </Row>
        </Space>

        <Space align="center" style={{ width: '100%', justifyContent: 'space-between' }}>
          <Space>
            <Button
              type="primary"
              icon={<InboxOutlined />}
              disabled={!hasReceivableSelection}
              onClick={handleBatchReceive}
            >
              批量收料
            </Button>
            <Button
              icon={<SettingOutlined />}
              disabled={!hasSelection}
              onClick={handleStatusModalOpen}
            >
              设置状态
            </Button>
          </Space>
          <Button icon={<DownloadOutlined />} onClick={handleExport}>
            导出Excel
          </Button>
        </Space>

        <Space size={24} style={{ width: '100%' }}>
          {summaryItems.map((item) => (
            <Text key={item.label} type="secondary">
              {item.label}：<Text strong>{item.value}</Text>
            </Text>
          ))}
        </Space>

        <Table<OrderPurchaseInboundRecord>
          rowKey="id"
          dataSource={listState.list}
          columns={columns}
          loading={tableLoading}
          pagination={{
            current: page,
            pageSize,
            total: listState.total,
            showSizeChanger: true,
            pageSizeOptions: PAGE_SIZE_OPTIONS.map(String),
            onChange: handleTableChange,
          }}
          rowSelection={rowSelection}
          scroll={{ x: 1600 }}
        />
      </Space>

      <Modal
        title={receiveContext && receiveContext.records.length > 1 ? '批量收料' : '收料'}
        open={receiveModalOpen}
        onCancel={() => {
          setReceiveModalOpen(false);
          setReceiveContext(null);
          receiveForm.resetFields();
        }}
        onOk={handleReceiveSubmit}
        confirmLoading={receiveSubmitting}
        destroyOnClose
        width={640}
      >
        <Form form={receiveForm} layout="vertical" preserve={false}>
          <Form.Item
            name="receiveDate"
            label="收料日期"
            rules={[{ required: true, message: '请选择收料日期' }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={3} maxLength={200} placeholder="可记录到货情况或质检备注" showCount />
          </Form.Item>
          {receiveContext?.records.map((record, index) => (
            <Card
              key={record.id}
              size="small"
              style={{ marginBottom: 12, borderColor: '#f0f0f0' }}
              title={
                <Space direction="vertical" size={0}>
                  <Text strong>{record.materialName}</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {record.purchaseOrderNo} · 待收 {toQuantity(record.pendingQty)} {record.unit}
                  </Text>
                </Space>
              }
            >
              <Form.Item name={['items', index, 'id']} initialValue={record.id} hidden>
                <Input />
              </Form.Item>
              <Form.Item
                name={['items', index, 'receiveQty']}
                label="本次收料数量"
                rules={[{ required: true, message: '请输入收料数量' }]}
              >
                <InputNumber
                  min={0}
                  max={record.pendingQty}
                  precision={2}
                  addonAfter={record.unit}
                  style={{ width: '100%' }}
                  placeholder="请输入数量"
                />
              </Form.Item>
            </Card>
          ))}
        </Form>
      </Modal>

      <Modal
        title="设置状态"
        open={statusModalOpen}
        onCancel={() => {
          setStatusModalOpen(false);
          statusForm.resetFields();
        }}
        onOk={handleStatusSubmit}
        confirmLoading={statusSubmitting}
        destroyOnClose
        width={480}
      >
        <Form form={statusForm} layout="vertical" preserve={false}>
          <Form.Item
            name="nextStatus"
            label="目标状态"
            rules={[{ required: true, message: '请选择状态' }]}
          >
            <Select
              options={[
                { value: 'forceCompleted', label: '强制完成' },
                { value: 'void', label: '作废' },
              ]}
            />
          </Form.Item>
          <Form.Item name="reason" label="备注">
            <Input.TextArea rows={3} maxLength={200} placeholder="请填写状态变更原因" showCount />
          </Form.Item>
          <Text type="secondary">将作用于 {selectedRows.length} 条采购单。</Text>
        </Form>
      </Modal>
    </Card>
  );
};

export default OrderPurchaseInbound;
