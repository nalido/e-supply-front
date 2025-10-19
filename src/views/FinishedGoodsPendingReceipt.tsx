import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ColumnsType } from 'antd/es/table';
import type { TableRowSelection } from 'antd/es/table/interface';
import {
  Button,
  Card,
  Checkbox,
  Col,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import type { CheckboxValueType } from 'antd/es/checkbox/Group';
import { DownloadOutlined, InboxOutlined, SearchOutlined } from '@ant-design/icons';
import { finishedGoodsPendingReceiptService } from '../api/mock';
import type {
  FinishedGoodsPendingReceiptListParams,
  FinishedGoodsPendingReceiptListResponse,
  FinishedGoodsPendingReceiptMeta,
  FinishedGoodsPendingReceiptRecord,
  FinishedGoodsPendingReceiptGrouping,
  FinishedGoodsPendingReceiptReceivePayload,
} from '../types/finished-goods-pending-receipt';

const { Text } = Typography;

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 20, 50];

const quantityFormatter = (value: number): string => value.toLocaleString('zh-CN');

const groupingOptions: { label: string; value: FinishedGoodsPendingReceiptGrouping }[] = [
  { label: '分订单', value: 'order' },
  { label: '分规格', value: 'spec' },
];

type ReceiveFormValues = {
  warehouseId?: string;
  remark?: string;
  items: { id: string; receiptQty?: number }[];
};

type ReceiveModalState = {
  open: boolean;
  submitting: boolean;
};

type ListState = FinishedGoodsPendingReceiptListResponse;

const initialListState: ListState = {
  list: [],
  total: 0,
  summary: { orderedQty: 0, producedQty: 0, pendingQty: 0, receivedQty: 0 },
};

type AggregatedRecord = {
  id: string;
  recordType: 'aggregate';
  factoryOrderNo?: string;
  orderTypeLabel?: string;
  customerName?: string;
  styleNo?: string;
  styleName?: string;
  color?: string;
  size?: string;
  sku?: string;
  orderedQty: number;
  producedQty: number;
  pendingQty: number;
  receivedQty: number;
};

type TableRecord = (FinishedGoodsPendingReceiptRecord & { recordType: 'detail' }) | AggregatedRecord;

const FinishedGoodsPendingReceipt = () => {
  const [meta, setMeta] = useState<FinishedGoodsPendingReceiptMeta | null>(null);
  const [metaLoading, setMetaLoading] = useState(false);
  const [listState, setListState] = useState<ListState>(initialListState);
  const [tableLoading, setTableLoading] = useState(false);
  const [includeCompleted, setIncludeCompleted] = useState(false);
  const [orderTypeFilter, setOrderTypeFilter] = useState<string | undefined>();
  const [groupBy, setGroupBy] = useState<FinishedGoodsPendingReceiptGrouping[]>([]);
  const [orderKeyword, setOrderKeyword] = useState('');
  const [customerKeyword, setCustomerKeyword] = useState('');
  const [skuKeyword, setSkuKeyword] = useState('');
  const [appliedOrderKeyword, setAppliedOrderKeyword] = useState<string | undefined>();
  const [appliedCustomerKeyword, setAppliedCustomerKeyword] = useState<string | undefined>();
  const [appliedSkuKeyword, setAppliedSkuKeyword] = useState<string | undefined>();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [selectedRows, setSelectedRows] = useState<FinishedGoodsPendingReceiptRecord[]>([]);
  const [receiveModalState, setReceiveModalState] = useState<ReceiveModalState>({ open: false, submitting: false });
  const [form] = Form.useForm<ReceiveFormValues>();

  useEffect(() => {
    const loadMeta = async () => {
      setMetaLoading(true);
      try {
        const response = await finishedGoodsPendingReceiptService.getMeta();
        setMeta(response);
      } catch (error) {
        console.error('failed to load pending receipt meta', error);
        message.error('加载筛选项失败');
      } finally {
        setMetaLoading(false);
      }
    };

    loadMeta();
  }, []);

  const loadList = useCallback(async () => {
    setTableLoading(true);
    try {
      const params: FinishedGoodsPendingReceiptListParams = {
        page,
        pageSize,
        includeCompleted,
        orderType: orderTypeFilter,
        keywordOrderOrStyle: appliedOrderKeyword,
        keywordCustomer: appliedCustomerKeyword,
        keywordSku: appliedSkuKeyword,
      };
      const response = await finishedGoodsPendingReceiptService.getList(params);
      setListState(response);
      const validIds = new Set(response.list.map((item) => item.id));
      setSelectedRowKeys((prev) => prev.filter((key) => validIds.has(String(key))));
      setSelectedRows((prev) => prev.filter((item) => validIds.has(item.id)));
    } catch (error) {
      console.error('failed to load pending receipt list', error);
      message.error('获取待收货列表失败');
    } finally {
      setTableLoading(false);
    }
  }, [appliedCustomerKeyword, appliedOrderKeyword, appliedSkuKeyword, includeCompleted, orderTypeFilter, page, pageSize]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const handleIncludeCompletedChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setIncludeCompleted(event.target.checked);
    setPage(1);
  };

  const handleOrderTypeChange = (value?: string) => {
    setOrderTypeFilter(value);
    setPage(1);
  };

  const handleGroupingChange = (values: CheckboxValueType[]) => {
    setGroupBy(values as FinishedGoodsPendingReceiptGrouping[]);
    setSelectedRowKeys([]);
    setSelectedRows([]);
  };

  const handleSearch = () => {
    const nextOrderKeyword = orderKeyword.trim();
    const nextCustomerKeyword = customerKeyword.trim();
    const nextSkuKeyword = skuKeyword.trim();
    setAppliedOrderKeyword(nextOrderKeyword ? nextOrderKeyword : undefined);
    setAppliedCustomerKeyword(nextCustomerKeyword ? nextCustomerKeyword : undefined);
    setAppliedSkuKeyword(nextSkuKeyword ? nextSkuKeyword : undefined);
    setPage(1);
  };

  const handleReset = () => {
    setIncludeCompleted(false);
    setOrderTypeFilter(undefined);
    setGroupBy([]);
    setOrderKeyword('');
    setCustomerKeyword('');
    setSkuKeyword('');
    setAppliedOrderKeyword(undefined);
    setAppliedCustomerKeyword(undefined);
    setAppliedSkuKeyword(undefined);
    setSelectedRowKeys([]);
    setSelectedRows([]);
    setPage(1);
    setPageSize(DEFAULT_PAGE_SIZE);
  };

  const handleTableChange = (nextPage: number, nextPageSize?: number) => {
    setPage(nextPage);
    if (nextPageSize && nextPageSize !== pageSize) {
      setPageSize(nextPageSize);
    }
  };

  const displayedData: TableRecord[] = useMemo(() => {
    if (!groupBy.length) {
      return listState.list.map((item) => ({ ...item, recordType: 'detail' }));
    }

    const aggregateMap = new Map<string, AggregatedRecord>();

    listState.list.forEach((record) => {
      const mapKey = groupBy
        .map((group) => (group === 'order' ? record.factoryOrderNo : record.sku))
        .join('|');
      const existing = aggregateMap.get(mapKey);
      if (existing) {
        existing.orderedQty += record.orderedQty;
        existing.producedQty += record.producedQty;
        existing.pendingQty += record.pendingQty;
        existing.receivedQty += record.receivedQty;
        return;
      }
      aggregateMap.set(mapKey, {
        id: `agg-${mapKey}`,
        recordType: 'aggregate',
        factoryOrderNo: groupBy.includes('order') ? record.factoryOrderNo : undefined,
        orderTypeLabel: groupBy.includes('order') ? record.orderTypeLabel : undefined,
        customerName: groupBy.includes('order') ? record.customerName : undefined,
        styleNo: groupBy.includes('spec') ? record.styleNo : undefined,
        styleName: groupBy.includes('spec') ? record.styleName : undefined,
        color: groupBy.includes('spec') ? record.color : undefined,
        size: groupBy.includes('spec') ? record.size : undefined,
        sku: groupBy.includes('spec') ? record.sku : undefined,
        orderedQty: record.orderedQty,
        producedQty: record.producedQty,
        pendingQty: record.pendingQty,
        receivedQty: record.receivedQty,
      });
    });

    return Array.from(aggregateMap.values());
  }, [groupBy, listState.list]);

  const columns: ColumnsType<TableRecord> = useMemo(() => {
    const indexColumn: ColumnsType<TableRecord>[number] = {
      title: '序号',
      dataIndex: 'index',
      width: 56,
      align: 'right',
      render: (_value, _record, index) => (page - 1) * pageSize + index + 1,
      fixed: 'left',
    };

    const orderedColumn: ColumnsType<TableRecord>[number] = {
      title: '下单数',
      dataIndex: 'orderedQty',
      width: 88,
      align: 'right',
      render: (value: number) => quantityFormatter(value),
    };

    const producedColumn: ColumnsType<TableRecord>[number] = {
      title: '生产数',
      dataIndex: 'producedQty',
      width: 88,
      align: 'right',
      render: (value: number) => quantityFormatter(value),
    };

    const pendingColumn: ColumnsType<TableRecord>[number] = {
      title: '待收货',
      dataIndex: 'pendingQty',
      width: 96,
      align: 'right',
      render: (value: number) => (
        <Tag color={value > 0 ? 'gold' : 'default'}>{quantityFormatter(value)}</Tag>
      ),
    };

    const receivedColumn: ColumnsType<TableRecord>[number] = {
      title: '已收货',
      dataIndex: 'receivedQty',
      width: 88,
      align: 'right',
      render: (value: number) => quantityFormatter(value),
    };

    if (groupBy.length) {
      const groupColumns: ColumnsType<TableRecord>[number][] = [];
      if (groupBy.includes('order')) {
        groupColumns.push({
          title: '工厂订单',
          dataIndex: 'factoryOrderNo',
          width: 168,
          fixed: 'left',
          render: (value: string, record) => (
            <Space direction="vertical" size={0}>
              <Text>{value}</Text>
              {record.orderTypeLabel ? <Tag color="blue">{record.orderTypeLabel}</Tag> : null}
              {record.customerName ? <Text type="secondary">{record.customerName}</Text> : null}
            </Space>
          ),
        });
      }
      if (groupBy.includes('spec')) {
        groupColumns.push(
          {
            title: '款号/款名',
            dataIndex: 'styleNo',
            width: 184,
            render: (_value: string, record) => (
              <Space direction="vertical" size={0}>
                <Text>{record.styleNo}</Text>
                {record.styleName ? <Text type="secondary">{record.styleName}</Text> : null}
              </Space>
            ),
          },
          { title: '颜色', dataIndex: 'color', width: 92 },
          { title: '尺码', dataIndex: 'size', width: 88 },
          { title: 'SKU', dataIndex: 'sku', width: 184 },
        );
      }
      return [indexColumn, ...groupColumns, orderedColumn, producedColumn, pendingColumn, receivedColumn];
    }

    const detailColumns: ColumnsType<TableRecord>[number][] = [
      {
        title: '图片',
        dataIndex: 'imageUrl',
        width: 80,
        fixed: 'left',
        render: (value: string, record) => (
          <img
            src={value}
            alt={record.styleName}
            style={{ width: 64, height: 64, borderRadius: 8, objectFit: 'cover', background: '#f3f4f6' }}
          />
        ),
      },
      {
        title: '工厂订单',
        dataIndex: 'factoryOrderNo',
        width: 168,
        fixed: 'left',
        render: (value: string, record) => (
          <Space direction="vertical" size={0}>
            <Text>{value}</Text>
            <Tag color="blue">{record.orderTypeLabel}</Tag>
          </Space>
        ),
      },
      { title: '客户', dataIndex: 'customerName', width: 188, ellipsis: true },
      { title: '款号', dataIndex: 'styleNo', width: 112 },
      { title: '款名', dataIndex: 'styleName', width: 188, ellipsis: true },
      { title: '颜色', dataIndex: 'color', width: 92 },
      { title: '尺码', dataIndex: 'size', width: 88 },
      { title: 'SKU', dataIndex: 'sku', width: 184 },
      orderedColumn,
      producedColumn,
      pendingColumn,
      receivedColumn,
    ];

    return [indexColumn, ...detailColumns];
  }, [groupBy, page, pageSize]);

  const tableSummary = useMemo(() => listState.summary, [listState.summary]);
  const summaryLeadingSpan = useMemo(() => {
    if (groupBy.length) {
      let span = 1;
      if (groupBy.includes('order')) {
        span += 1;
      }
      if (groupBy.includes('spec')) {
        span += 4;
      }
      return span;
    }
    return 9;
  }, [groupBy]);

  const isReceiveDisabled = groupBy.length > 0 || selectedRowKeys.length === 0;

  const rowSelection: TableRowSelection<TableRecord> | undefined = groupBy.length
    ? undefined
    : {
        selectedRowKeys,
        onChange: (keys, rows) => {
          setSelectedRowKeys(keys);
          const detailRows = rows.filter(
            (record): record is FinishedGoodsPendingReceiptRecord & { recordType: 'detail' } =>
              (record as TableRecord).recordType === 'detail',
          );
          const sanitized = detailRows.map((item) => {
            const { recordType, ...rest } = item;
            void recordType;
            return rest;
          });
          setSelectedRows(sanitized);
        },
        preserveSelectedRowKeys: true,
      };

  const openReceiveModal = () => {
    if (!selectedRows.length) {
      message.warning('请选择待收货的记录');
      return;
    }
    const defaultWarehouse = form.getFieldValue('warehouseId') ?? meta?.warehouses?.[0]?.id;
    form.setFieldsValue({
      warehouseId: defaultWarehouse,
      remark: undefined,
      items: selectedRows.map((item) => ({ id: item.id, receiptQty: item.pendingQty })),
    });
    setReceiveModalState({ open: true, submitting: false });
  };

  const closeReceiveModal = () => {
    setReceiveModalState((prev) => ({ ...prev, open: false }));
  };

  const handleReceiveSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (!values.warehouseId) {
        message.warning('请选择入库仓库');
        return;
      }
      const payload: FinishedGoodsPendingReceiptReceivePayload = {
        warehouseId: values.warehouseId,
        remark: values.remark,
        items: values.items
          .filter((item) => item.receiptQty && item.receiptQty > 0)
          .map((item) => ({ id: item.id, receiptQty: Math.floor(item.receiptQty ?? 0) })),
      };
      if (!payload.items.length) {
        message.warning('请填写本次收货数量');
        return;
      }
      setReceiveModalState((prev) => ({ ...prev, submitting: true }));
      await finishedGoodsPendingReceiptService.receive(payload);
      message.success('成品收货成功');
      setReceiveModalState({ open: false, submitting: false });
      setSelectedRowKeys([]);
      setSelectedRows([]);
      loadList();
    } catch (error) {
      if ((error as { errorFields?: unknown[] } | undefined)?.errorFields) {
        return;
      }
      console.error('failed to submit receipt', error);
      setReceiveModalState((prev) => ({ ...prev, submitting: false }));
    }
  };

  const handleExport = () => {
    message.success('已生成待收货列表导出任务，请稍后到下载中心查看');
  };

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card bordered={false} loading={metaLoading}>
        <Row gutter={[16, 16]} align="middle" justify="space-between">
          <Col flex="auto">
            <Space wrap size={16}>
              <Button type="primary" disabled={isReceiveDisabled} icon={<InboxOutlined />} onClick={openReceiveModal}>
                收货
              </Button>
              <Button icon={<DownloadOutlined />} onClick={handleExport}>
                导出
              </Button>
              <Checkbox checked={includeCompleted} onChange={handleIncludeCompletedChange}>
                包含已完成
              </Checkbox>
              <Checkbox.Group
                options={groupingOptions}
                value={groupBy}
                onChange={handleGroupingChange}
              />
            </Space>
          </Col>
          <Col>
            <Space size={12}>
              <Select
                allowClear
                placeholder="订单类型"
                style={{ width: 160 }}
                value={orderTypeFilter}
                options={meta?.orderTypes?.map((item) => ({ value: item.value, label: item.label }))}
                onChange={handleOrderTypeChange}
              />
              <Input
                allowClear
                placeholder="订单/款式"
                value={orderKeyword}
                onChange={(event) => setOrderKeyword(event.target.value)}
                style={{ width: 200 }}
              />
              <Input
                allowClear
                placeholder="客户名称"
                value={customerKeyword}
                onChange={(event) => setCustomerKeyword(event.target.value)}
                style={{ width: 200 }}
              />
              <Input
                allowClear
                placeholder="SKU"
                value={skuKeyword}
                onChange={(event) => setSkuKeyword(event.target.value)}
                style={{ width: 200 }}
              />
              <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
                查询
              </Button>
              <Button onClick={handleReset}>重置</Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <Card bordered={false}>
        <Table<TableRecord>
          rowKey={(record) => record.id}
          loading={tableLoading}
          dataSource={displayedData}
          columns={columns}
          pagination={{
            current: page,
            pageSize,
            total: listState.total,
            pageSizeOptions: PAGE_SIZE_OPTIONS,
            showSizeChanger: true,
            onChange: handleTableChange,
          }}
          rowSelection={rowSelection}
          scroll={{ x: 1200 }}
          summary={() => (
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={summaryLeadingSpan}>
                <Text strong>合计</Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={1} align="right">
                {quantityFormatter(tableSummary.orderedQty)}
              </Table.Summary.Cell>
              <Table.Summary.Cell index={2} align="right">
                {quantityFormatter(tableSummary.producedQty)}
              </Table.Summary.Cell>
              <Table.Summary.Cell index={3} align="right">
                {quantityFormatter(tableSummary.pendingQty)}
              </Table.Summary.Cell>
              <Table.Summary.Cell index={4} align="right">
                {quantityFormatter(tableSummary.receivedQty)}
              </Table.Summary.Cell>
            </Table.Summary.Row>
          )}
        />
      </Card>

      <Modal
        title="成品收货"
        open={receiveModalState.open}
        onCancel={closeReceiveModal}
        onOk={handleReceiveSubmit}
        confirmLoading={receiveModalState.submitting}
        destroyOnClose
        width={720}
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="入库仓库"
                name="warehouseId"
                rules={[{ required: true, message: '请选择入库仓库' }]}
              >
                <Select
                  placeholder="选择仓库"
                  options={meta?.warehouses?.map((item) => ({ value: item.id, label: item.name }))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="备注" name="remark">
                <Input placeholder="可填写收货批次或送货人" maxLength={60} />
              </Form.Item>
            </Col>
          </Row>

          <Form.List name="items">
            {(fields) => (
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                {fields.length === 0 ? (
                  <Text type="secondary">请在列表中选择待收货记录</Text>
                ) : null}
                {fields.map((field) => {
                  const index = Number(field.name);
                  const record = selectedRows[index];
                  return (
                    <Card key={field.key} size="small">
                      <Form.Item name={[field.name, 'id']} hidden>
                        <Input type="hidden" />
                      </Form.Item>
                      <Space direction="vertical" size={4} style={{ width: '100%' }}>
                        <Text strong>
                          {record?.styleNo} {record?.styleName}
                        </Text>
                        <Text type="secondary">
                          {record?.factoryOrderNo} · {record?.color} · {record?.size}
                        </Text>
                        <Row gutter={16}>
                          <Col span={12}>
                            <Text type="secondary">待收货：{quantityFormatter(record?.pendingQty ?? 0)}</Text>
                          </Col>
                          <Col span={12} style={{ textAlign: 'right' }}>
                            <Form.Item
                              label="本次收货数量"
                              name={[field.name, 'receiptQty']}
                              rules={[{ required: true, message: '请输入收货数量' }]}
                            >
                              <InputNumber
                                min={0}
                                max={record?.pendingQty ?? undefined}
                                precision={0}
                                placeholder="数量"
                                style={{ width: '100%' }}
                              />
                            </Form.Item>
                          </Col>
                        </Row>
                      </Space>
                    </Card>
                  );
                })}
              </Space>
            )}
          </Form.List>
        </Form>
      </Modal>
    </Space>
  );
};

export default FinishedGoodsPendingReceipt;
