import { useCallback, useEffect, useMemo, useState } from 'react';
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
  Radio,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { finishedGoodsOtherInboundService } from '../api/mock';
import type {
  FinishedGoodsOtherInboundDailyRecord,
  FinishedGoodsOtherInboundFormPayload,
  FinishedGoodsOtherInboundListResponse,
  FinishedGoodsOtherInboundMeta,
  FinishedGoodsOtherInboundRecord,
  FinishedGoodsOtherInboundViewMode,
} from '../types/finished-goods-other-inbound';

const { Text } = Typography;

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 20, 50];
const DATE_TIME_FORMAT = 'YYYY-MM-DD HH:mm';

const formatQuantity = (value: number): string => value.toLocaleString('zh-CN');
const currencyFormatter = new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY', minimumFractionDigits: 2 });
const formatCurrency = (value: number): string => currencyFormatter.format(value ?? 0);

const buildDefaultFormValues = (meta: FinishedGoodsOtherInboundMeta | null) => {
  const defaultWarehouse = meta?.warehouses[0]?.id;
  const defaultProcessor = meta?.processors[0]?.id;
  const defaultStyle = meta?.styles[0]?.id;
  const styleOption = meta?.styles.find((style) => style.id === defaultStyle);
  return {
    warehouseId: defaultWarehouse,
    processorId: defaultProcessor,
    styleId: defaultStyle,
    color: styleOption?.colors[0],
    size: styleOption?.sizes[0],
    inboundQty: 1,
    unitPrice: 50,
    receiptAt: dayjs(),
    inboundType: meta?.inboundTypes[0]?.value,
    remark: '',
  } satisfies FormValues;
};

type FormValues = {
  warehouseId?: string;
  processorId?: string;
  styleId?: string;
  color?: string;
  size?: string;
  inboundQty?: number;
  unitPrice?: number;
  receiptAt?: Dayjs;
  inboundType?: string;
  remark?: string;
};

type FormModalState = {
  open: boolean;
  submitting: boolean;
  mode: 'create' | 'edit';
  record?: FinishedGoodsOtherInboundRecord;
};

type ListState = {
  list: FinishedGoodsOtherInboundListResponse['list'];
  total: number;
  summary: FinishedGoodsOtherInboundListResponse['summary'];
};

const initialListState: ListState = {
  list: [],
  total: 0,
  summary: { inboundQty: 0, amount: 0 },
};

const FinishedGoodsOtherInbound = () => {
  const [meta, setMeta] = useState<FinishedGoodsOtherInboundMeta | null>(null);
  const [metaLoading, setMetaLoading] = useState(false);
  const [listState, setListState] = useState<ListState>(initialListState);
  const [tableLoading, setTableLoading] = useState(false);
  const [viewMode, setViewMode] = useState<FinishedGoodsOtherInboundViewMode>('spec');
  const [warehouseFilter, setWarehouseFilter] = useState<string | undefined>();
  const [appliedKeyword, setAppliedKeyword] = useState<string | undefined>();
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [selectedRows, setSelectedRows] = useState<FinishedGoodsOtherInboundRecord[]>([]);
  const [formModal, setFormModal] = useState<FormModalState>({ open: false, submitting: false, mode: 'create' });
  const [form] = Form.useForm<FormValues>();

  useEffect(() => {
    const loadMeta = async () => {
      setMetaLoading(true);
      try {
        const response = await finishedGoodsOtherInboundService.getMeta();
        setMeta(response);
        form.setFieldsValue(buildDefaultFormValues(response));
      } catch (error) {
        console.error('failed to fetch other inbound meta', error);
        message.error('加载仓库和款式信息失败');
      } finally {
        setMetaLoading(false);
      }
    };
    loadMeta();
  }, [form]);

  const loadList = useCallback(async () => {
    setTableLoading(true);
    try {
      const response = await finishedGoodsOtherInboundService.getList({
        page,
        pageSize,
        viewMode,
        warehouseId: warehouseFilter,
        keyword: appliedKeyword,
      });
      setListState({ list: response.list, total: response.total, summary: response.summary });
      if (viewMode === 'spec') {
        const currentIds = new Set((response.list as FinishedGoodsOtherInboundRecord[]).map((item) => item.id));
        setSelectedRowKeys((prev) => prev.filter((key) => currentIds.has(String(key))));
        setSelectedRows((prev) => prev.filter((item) => currentIds.has(item.id)));
      } else {
        setSelectedRowKeys([]);
        setSelectedRows([]);
      }
    } catch (error) {
      console.error('failed to fetch other inbound list', error);
      message.error('获取其它入库数据失败');
    } finally {
      setTableLoading(false);
    }
  }, [appliedKeyword, page, pageSize, viewMode, warehouseFilter]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const handleWarehouseChange = (value?: string) => {
    setWarehouseFilter(value);
    setPage(1);
  };

  const handleViewModeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextMode = event.target.value as FinishedGoodsOtherInboundViewMode;
    setViewMode(nextMode);
    setPage(1);
    setSelectedRowKeys([]);
    setSelectedRows([]);
  };

  const handleSearch = () => {
    const trimmed = keyword.trim();
    setAppliedKeyword(trimmed ? trimmed : undefined);
    setPage(1);
  };

  const handleReset = () => {
    setKeyword('');
    setAppliedKeyword(undefined);
    setWarehouseFilter(undefined);
    setViewMode('spec');
    setPage(1);
    setSelectedRowKeys([]);
    setSelectedRows([]);
  };

  useEffect(() => {
    if (!formModal.open) {
      return;
    }
    if (formModal.mode === 'edit' && formModal.record) {
      form.setFieldsValue({
        warehouseId: formModal.record.warehouseId,
        processorId: formModal.record.processorId,
        styleId: formModal.record.styleId,
        color: formModal.record.color,
        size: formModal.record.size,
        inboundQty: formModal.record.inboundQty,
        unitPrice: formModal.record.unitPrice,
        receiptAt: dayjs(formModal.record.receiptAt, DATE_TIME_FORMAT),
        inboundType: formModal.record.inboundType,
        remark: formModal.record.remark,
      });
    } else {
      form.setFieldsValue(buildDefaultFormValues(meta));
    }
  }, [form, formModal, meta]);

  const metaByStyle = useMemo(() => {
    const map = new Map<string, { colors: string[]; sizes: string[] }>();
    meta?.styles.forEach((style) => {
      map.set(style.id, { colors: style.colors, sizes: style.sizes });
    });
    return map;
  }, [meta]);

  const inboundTypeLabels = useMemo(() => {
    const map = new Map<string, string>();
    meta?.inboundTypes.forEach((item) => {
      map.set(item.value, item.label);
    });
    return map;
  }, [meta]);

  const specData = useMemo(
    () => (viewMode === 'spec' ? (listState.list as FinishedGoodsOtherInboundRecord[]) : []),
    [listState.list, viewMode],
  );

  const dateData = useMemo(
    () => (viewMode === 'date' ? (listState.list as FinishedGoodsOtherInboundDailyRecord[]) : []),
    [listState.list, viewMode],
  );

  const totalTickets = useMemo(
    () => (viewMode === 'date' ? dateData.reduce((acc, item) => acc + item.ticketCount, 0) : 0),
    [dateData, viewMode],
  );

  const specColumns: ColumnsType<FinishedGoodsOtherInboundRecord> = useMemo(() => [
    {
      title: '序号',
      dataIndex: 'index',
      width: 72,
      align: 'right',
      render: (_value, _record, index) => (page - 1) * pageSize + index + 1,
    },
    {
      title: '图片',
      dataIndex: 'imageUrl',
      width: 96,
      render: (value: string, record) => (
        <img
          src={value}
          alt={record.styleName}
          style={{ width: 64, height: 64, borderRadius: 8, objectFit: 'cover', background: '#f4f4f5' }}
        />
      ),
    },
    { title: '仓库', dataIndex: 'warehouseName', width: 140 },
    { title: '加工厂', dataIndex: 'processorName', width: 180 },
    { title: '款号', dataIndex: 'styleNo', width: 120 },
    {
      title: 'SKU',
      dataIndex: 'sku',
      width: 200,
      ellipsis: true,
    },
    {
      title: '数量',
      dataIndex: 'inboundQty',
      width: 120,
      align: 'right',
      render: (value: number) => `${formatQuantity(value)} 件`,
    },
    {
      title: '收货时间',
      dataIndex: 'receiptAt',
      width: 180,
    },
    { title: '款名', dataIndex: 'styleName', width: 200, ellipsis: true },
    {
      title: '单价',
      dataIndex: 'unitPrice',
      width: 120,
      align: 'right',
      render: (value: number) => formatCurrency(value),
    },
    {
      title: '入库金额',
      dataIndex: 'amount',
      width: 140,
      align: 'right',
      render: (value: number) => formatCurrency(value),
    },
    {
      title: '入库类型',
      dataIndex: 'inboundType',
      width: 140,
      render: (value: string) => inboundTypeLabels.get(value) ?? value,
    },
    {
      title: '备注',
      dataIndex: 'remark',
      ellipsis: true,
      render: (value?: string) => value ?? '-',
    },
  ], [inboundTypeLabels, page, pageSize]);

  const dateColumns: ColumnsType<FinishedGoodsOtherInboundDailyRecord> = useMemo(() => [
    {
      title: '序号',
      dataIndex: 'index',
      width: 80,
      align: 'right',
      render: (_value, _record, index) => (page - 1) * pageSize + index + 1,
    },
    { title: '收货日期', dataIndex: 'receiptDate', width: 140 },
    { title: '仓库', dataIndex: 'warehouseName', width: 160 },
    {
      title: '加工厂',
      dataIndex: 'processorNames',
      render: (names: string[]) => (
        <Space size={6} wrap>
          {names.map((name) => (
            <Tag key={name} color="blue">
              {name}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: '入库数量',
      dataIndex: 'inboundQty',
      width: 140,
      align: 'right',
      render: (value: number) => `${formatQuantity(value)} 件`,
    },
    {
      title: '平均单价',
      dataIndex: 'avgUnitPrice',
      width: 140,
      align: 'right',
      render: (value: number) => formatCurrency(value),
    },
    {
      title: '入库金额',
      dataIndex: 'amount',
      width: 160,
      align: 'right',
      render: (value: number) => formatCurrency(value),
    },
    {
      title: '单据数',
      dataIndex: 'ticketCount',
      width: 120,
      align: 'right',
      render: (value: number) => formatQuantity(value),
    },
  ], [page, pageSize]);

  const rowSelection: TableRowSelection<FinishedGoodsOtherInboundRecord> | undefined = viewMode === 'spec'
    ? {
        selectedRowKeys,
        onChange: (keys, rows) => {
          setSelectedRowKeys(keys);
          setSelectedRows(rows);
        },
      }
    : undefined;

  const openCreateModal = () => {
    setFormModal({ open: true, submitting: false, mode: 'create' });
  };

  const openEditModal = () => {
    if (selectedRows.length !== 1) {
      return;
    }
    setFormModal({ open: true, submitting: false, mode: 'edit', record: selectedRows[0] });
  };

  const closeFormModal = () => {
    setFormModal({ open: false, submitting: false, mode: 'create', record: undefined });
    form.resetFields();
  };

  const handleSubmitForm = async () => {
    const values = await form.validateFields().catch(() => undefined);
    if (!values || !values.styleId || !values.warehouseId || !values.processorId || !values.color || !values.size || !values.receiptAt || !values.inboundType) {
      return;
    }

    const payload: FinishedGoodsOtherInboundFormPayload = {
      warehouseId: values.warehouseId,
      processorId: values.processorId,
      styleId: values.styleId,
      color: values.color,
      size: values.size,
      inboundQty: Number(values.inboundQty ?? 0),
      unitPrice: Number(values.unitPrice ?? 0),
      receiptAt: values.receiptAt.format(DATE_TIME_FORMAT),
      inboundType: values.inboundType,
      remark: values.remark?.trim() ? values.remark.trim() : undefined,
    };

    setFormModal((prev) => ({ ...prev, submitting: true }));
    try {
      if (formModal.mode === 'edit' && formModal.record) {
        await finishedGoodsOtherInboundService.update(formModal.record.id, payload);
        message.success('已更新入库记录');
      } else {
        await finishedGoodsOtherInboundService.create(payload);
        message.success('已新增入库记录');
      }
      closeFormModal();
      setPage(1);
      loadList();
    } catch (error) {
      console.error('failed to submit other inbound form', error);
      message.error('保存入库记录失败，请稍后重试');
    } finally {
      setFormModal((prev) => ({ ...prev, submitting: false }));
    }
  };

  const handleDelete = () => {
    if (!selectedRowKeys.length) {
      return;
    }
    Modal.confirm({
      title: '删除确认',
      content: `确定删除已选中的 ${selectedRowKeys.length} 条入库记录吗？删除后将同步冲减库存。`,
      okText: '删除',
      okType: 'danger',
      onOk: async () => {
        try {
          const removed = await finishedGoodsOtherInboundService.remove(selectedRowKeys.map(String));
          message.success(`已删除 ${removed} 条记录`);
          const nextTotal = Math.max(listState.total - removed, 0);
          const maxPage = Math.max(1, Math.ceil(nextTotal / pageSize));
          if (page > maxPage) {
            setPage(maxPage);
            setSelectedRowKeys([]);
            setSelectedRows([]);
            return;
          }
          setSelectedRowKeys([]);
          setSelectedRows([]);
          loadList();
        } catch (error) {
          console.error('failed to delete other inbound record', error);
          message.error('删除失败，请稍后重试');
        }
      },
    });
  };

  const onPageChange = (nextPage: number, nextSize?: number) => {
    if (nextSize && nextSize !== pageSize) {
      setPage(1);
      setPageSize(nextSize);
      return;
    }
    setPage(nextPage);
  };

  const summaryContent = (
    <Row gutter={16}>
      <Col xs={12} sm={8} md={6} lg={5}>
        <div>
          <Text type="secondary">入库数量合计</Text>
          <div style={{ fontSize: 18, fontWeight: 600 }}>{`${formatQuantity(listState.summary.inboundQty)} 件`}</div>
        </div>
      </Col>
      <Col xs={12} sm={8} md={6} lg={5}>
        <div>
          <Text type="secondary">入库金额合计</Text>
          <div style={{ fontSize: 18, fontWeight: 600 }}>{formatCurrency(listState.summary.amount)}</div>
        </div>
      </Col>
      {viewMode === 'date' ? (
        <Col xs={12} sm={8} md={6} lg={5}>
          <div>
            <Text type="secondary">单据数量</Text>
            <div style={{ fontSize: 18, fontWeight: 600 }}>{formatQuantity(totalTickets)}</div>
          </div>
        </Col>
      ) : null}
    </Row>
  );

  const renderSummaryRow = () => (
    <Table.Summary fixed>
      <Table.Summary.Row>
        <Table.Summary.Cell index={0} colSpan={viewMode === 'spec' ? 13 : 8}>
          <Space size={24} wrap>
            <Text strong>合计</Text>
            <Text type="secondary">入库数量：{formatQuantity(listState.summary.inboundQty)} 件</Text>
            <Text type="secondary">入库金额：{formatCurrency(listState.summary.amount)}</Text>
            {viewMode === 'date' ? (
              <Text type="secondary">单据数：{formatQuantity(totalTickets)}</Text>
            ) : null}
          </Space>
        </Table.Summary.Cell>
      </Table.Summary.Row>
    </Table.Summary>
  );

  const selectedCount = selectedRowKeys.length;
  const canEdit = viewMode === 'spec' && selectedCount === 1;
  const canDelete = viewMode === 'spec' && selectedCount > 0;

  const styleId = Form.useWatch('styleId', form);
  const styleMeta = styleId ? metaByStyle.get(styleId) : undefined;

  useEffect(() => {
    if (!formModal.open) {
      return;
    }
    if (!styleMeta) {
      return;
    }
    const currentColor = form.getFieldValue('color') as string | undefined;
    const currentSize = form.getFieldValue('size') as string | undefined;
    const nextValues: Partial<FormValues> = {};
    if (styleMeta.colors.length && (!currentColor || !styleMeta.colors.includes(currentColor))) {
      [nextValues.color] = styleMeta.colors;
    }
    if (styleMeta.sizes.length && (!currentSize || !styleMeta.sizes.includes(currentSize))) {
      [nextValues.size] = styleMeta.sizes;
    }
    if (Object.keys(nextValues).length) {
      form.setFieldsValue(nextValues);
    }
  }, [form, formModal.open, styleMeta]);

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card bodyStyle={{ paddingBottom: 8 }}>
        <Space wrap size={12} style={{ width: '100%', justifyContent: 'space-between' }}>
          <Space>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal} loading={metaLoading}>
              新建
            </Button>
            <Button icon={<EditOutlined />} disabled={!canEdit} onClick={openEditModal}>
              修改
            </Button>
            <Button danger icon={<DeleteOutlined />} disabled={!canDelete} onClick={handleDelete}>
              删除
            </Button>
          </Space>
          <Space wrap>
            <Select
              allowClear
              placeholder="按仓库筛选"
              style={{ width: 200 }}
              value={warehouseFilter}
              options={meta?.warehouses.map((warehouse) => ({ label: warehouse.name, value: warehouse.id }))}
              onChange={handleWarehouseChange}
            />
            <Radio.Group value={viewMode} onChange={handleViewModeChange} optionType="button" buttonStyle="solid">
              <Radio.Button value="spec">分规格</Radio.Button>
              <Radio.Button value="date">分收货时间</Radio.Button>
            </Radio.Group>
            <Input
              placeholder="款号"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              style={{ width: 200 }}
              allowClear
              onPressEnter={handleSearch}
            />
            <Space>
              <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
                查询
              </Button>
              <Button icon={<ReloadOutlined />} onClick={handleReset}>
                重置
              </Button>
            </Space>
          </Space>
        </Space>
      </Card>

      <Card title="当前查询概览" extra={<Text type="secondary">共 {formatQuantity(listState.total)} 条记录</Text>}>
        {summaryContent}
      </Card>

      <Card>
        {viewMode === 'spec' ? (
          <Table<FinishedGoodsOtherInboundRecord>
            rowKey="id"
            columns={specColumns}
            dataSource={specData}
            loading={tableLoading}
            pagination={{
              current: page,
              pageSize,
              total: listState.total,
              showQuickJumper: true,
              showSizeChanger: true,
              pageSizeOptions: PAGE_SIZE_OPTIONS.map(String),
              onChange: onPageChange,
              onShowSizeChange: (_current, nextSize) => onPageChange(1, nextSize),
              showTotal: (value) => `共 ${value} 条`,
            }}
            rowSelection={rowSelection}
            scroll={{ x: 1280 }}
            summary={renderSummaryRow}
          />
        ) : (
          <Table<FinishedGoodsOtherInboundDailyRecord>
            rowKey="id"
            columns={dateColumns}
            dataSource={dateData}
            loading={tableLoading}
            pagination={{
              current: page,
              pageSize,
              total: listState.total,
              showQuickJumper: true,
              showSizeChanger: true,
              pageSizeOptions: PAGE_SIZE_OPTIONS.map(String),
              onChange: onPageChange,
              onShowSizeChange: (_current, nextSize) => onPageChange(1, nextSize),
              showTotal: (value) => `共 ${value} 条`,
            }}
            scroll={{ x: 960 }}
            summary={renderSummaryRow}
          />
        )}
      </Card>

      <Modal
        title={formModal.mode === 'create' ? '新建其它入库' : '修改其它入库'}
        open={formModal.open}
        onCancel={closeFormModal}
        onOk={handleSubmitForm}
        confirmLoading={formModal.submitting}
        destroyOnClose
        width={640}
      >
        <Form form={form} layout="vertical" initialValues={buildDefaultFormValues(meta)}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="warehouseId" label="仓库" rules={[{ required: true, message: '请选择仓库' }]}
>
                <Select
                  placeholder="请选择仓库"
                  loading={metaLoading}
                  options={meta?.warehouses.map((warehouse) => ({ label: warehouse.name, value: warehouse.id }))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="processorId" label="加工厂" rules={[{ required: true, message: '请选择加工厂' }]}
>
                <Select
                  placeholder="请选择加工厂"
                  loading={metaLoading}
                  options={meta?.processors.map((processor) => ({ label: processor.name, value: processor.id }))}
                />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="styleId" label="款式" rules={[{ required: true, message: '请选择款式' }]}
>
                <Select
                  placeholder="请选择款式"
                  loading={metaLoading}
                  options={meta?.styles.map((style) => ({ label: `${style.styleNo} / ${style.styleName}`, value: style.id }))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="color" label="颜色" rules={[{ required: true, message: '请选择颜色' }]}
>
                <Select
                  placeholder="请选择颜色"
                  loading={metaLoading}
                  options={(styleMeta?.colors ?? []).map((color) => ({ label: color, value: color }))}
                />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="size" label="尺码" rules={[{ required: true, message: '请选择尺码' }]}
>
                <Select
                  placeholder="请选择尺码"
                  loading={metaLoading}
                  options={(styleMeta?.sizes ?? []).map((size) => ({ label: size, value: size }))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="receiptAt" label="收货时间" rules={[{ required: true, message: '请选择收货时间' }]}
>
                <DatePicker showTime format={DATE_TIME_FORMAT} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="inboundQty"
                label="入库数量"
                rules={[{ required: true, message: '请输入入库数量' }]}
              >
                <InputNumber min={1} precision={0} style={{ width: '100%' }} suffix="件" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="unitPrice"
                label="单价"
                rules={[{ required: true, message: '请输入单价' }]}
              >
                <InputNumber min={0} precision={2} style={{ width: '100%' }} prefix="¥" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="inboundType" label="入库类型" rules={[{ required: true, message: '请选择入库类型' }]}
>
                <Select
                  placeholder="请选择入库类型"
                  loading={metaLoading}
                  options={meta?.inboundTypes.map((item) => ({ label: item.label, value: item.value }))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="remark" label="备注">
                <Input placeholder="备注信息" maxLength={120} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </Space>
  );
};

export default FinishedGoodsOtherInbound;
