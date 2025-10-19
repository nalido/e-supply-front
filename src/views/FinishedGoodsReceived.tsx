import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ColumnsType } from 'antd/es/table';
import type { TableRowSelection } from 'antd/es/table/interface';
import dayjs from 'dayjs';
import {
  Button,
  Card,
  Col,
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
import { DeleteOutlined, DownloadOutlined, EditOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { finishedGoodsReceivedService } from '../api/mock';
import type {
  FinishedGoodsReceivedDailyAggregation,
  FinishedGoodsReceivedListParams,
  FinishedGoodsReceivedListResponse,
  FinishedGoodsReceivedMeta,
  FinishedGoodsReceivedRecord,
  FinishedGoodsReceivedUpdatePayload,
  FinishedGoodsReceivedViewMode,
} from '../types/finished-goods-received';

const { Text } = Typography;

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 20, 50];
const DATE_TIME_FORMAT = 'YYYY-MM-DD HH:mm';

const quantityFormatter = (value: number): string => value.toLocaleString('zh-CN');

type TableRecord =
  | (FinishedGoodsReceivedRecord & { recordType: 'detail' })
  | (FinishedGoodsReceivedDailyAggregation & { recordType: 'aggregate' });

type ModifyFormValues = {
  warehouseId?: string;
  quantity?: number;
  remark?: string;
};

type ModifyModalState = {
  open: boolean;
  submitting: boolean;
  record?: FinishedGoodsReceivedRecord;
};

const initialListState: FinishedGoodsReceivedListResponse = {
  list: [],
  total: 0,
  summary: { totalQuantity: 0, skuCount: 0, recordCount: 0 },
};

const FinishedGoodsReceived = () => {
  const [meta, setMeta] = useState<FinishedGoodsReceivedMeta | null>(null);
  const [metaLoading, setMetaLoading] = useState(false);
  const [listState, setListState] = useState<FinishedGoodsReceivedListResponse>(initialListState);
  const [tableLoading, setTableLoading] = useState(false);
  const [viewMode, setViewMode] = useState<FinishedGoodsReceivedViewMode>('spec');
  const [warehouseFilter, setWarehouseFilter] = useState<string | undefined>();
  const [orderKeyword, setOrderKeyword] = useState('');
  const [processorKeyword, setProcessorKeyword] = useState('');
  const [appliedOrderKeyword, setAppliedOrderKeyword] = useState<string | undefined>();
  const [appliedProcessorKeyword, setAppliedProcessorKeyword] = useState<string | undefined>();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [selectedRecords, setSelectedRecords] = useState<FinishedGoodsReceivedRecord[]>([]);
  const [modifyModal, setModifyModal] = useState<ModifyModalState>({ open: false, submitting: false });
  const [form] = Form.useForm<ModifyFormValues>();

  useEffect(() => {
    const loadMeta = async () => {
      setMetaLoading(true);
      try {
        const response = await finishedGoodsReceivedService.getMeta();
        setMeta(response);
      } catch (error) {
        console.error('failed to load received meta', error);
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
      const params: FinishedGoodsReceivedListParams = {
        page,
        pageSize,
        viewMode,
        warehouseId: warehouseFilter,
        keywordOrderOrStyle: appliedOrderKeyword,
        keywordProcessor: appliedProcessorKeyword,
      };
      const response = await finishedGoodsReceivedService.getList(params);
      setListState(response);
      if (viewMode === 'spec') {
        const currentMap = new Map(
          (response.list as FinishedGoodsReceivedRecord[]).map((item) => [item.id, item] as const),
        );
        setSelectedRowKeys((prevKeys) => prevKeys.filter((key) => currentMap.has(String(key))));
        setSelectedRecords((prevRecords) => {
          const next: FinishedGoodsReceivedRecord[] = [];
          prevRecords.forEach((record) => {
            const updated = currentMap.get(record.id);
            if (updated) {
              next.push(updated);
            }
          });
          return next;
        });
      } else {
        setSelectedRowKeys([]);
        setSelectedRecords([]);
      }
    } catch (error) {
      console.error('failed to load received list', error);
      message.error('获取已收货列表失败');
    } finally {
      setTableLoading(false);
    }
  }, [appliedOrderKeyword, appliedProcessorKeyword, page, pageSize, viewMode, warehouseFilter]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const handleViewModeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextMode = event.target.value as FinishedGoodsReceivedViewMode;
    setViewMode(nextMode);
    setPage(1);
    setSelectedRowKeys([]);
    setSelectedRecords([]);
  };

  const handleWarehouseChange = (value?: string) => {
    setWarehouseFilter(value);
    setPage(1);
  };

  const handleSearch = () => {
    const nextOrderKeyword = orderKeyword.trim();
    const nextProcessorKeyword = processorKeyword.trim();
    setAppliedOrderKeyword(nextOrderKeyword ? nextOrderKeyword : undefined);
    setAppliedProcessorKeyword(nextProcessorKeyword ? nextProcessorKeyword : undefined);
    setPage(1);
  };

  const handleReset = () => {
    setViewMode('spec');
    setWarehouseFilter(undefined);
    setOrderKeyword('');
    setProcessorKeyword('');
    setAppliedOrderKeyword(undefined);
    setAppliedProcessorKeyword(undefined);
    setSelectedRowKeys([]);
    setSelectedRecords([]);
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
    if (viewMode === 'spec') {
      return (listState.list as FinishedGoodsReceivedRecord[]).map((item) => ({
        ...item,
        recordType: 'detail' as const,
      }));
    }
    return (listState.list as FinishedGoodsReceivedDailyAggregation[]).map((item) => ({
      ...item,
      recordType: 'aggregate' as const,
    }));
  }, [listState.list, viewMode]);

  const detailColumns: ColumnsType<TableRecord> = useMemo(
    () => [
      {
        title: '序号',
        dataIndex: 'index',
        width: 80,
        align: 'center',
        fixed: 'left',
        render: (_value, _record, index) => (page - 1) * pageSize + index + 1,
      },
      {
        title: '图片',
        dataIndex: 'imageUrl',
        width: 96,
        fixed: 'left',
        render: (value: string | undefined, record) =>
          record.recordType === 'detail' ? (
            <img
              src={value}
              alt={record.styleName}
              style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8 }}
            />
          ) : (
            '-'
          ),
      },
      {
        title: '款号',
        dataIndex: 'styleNo',
        width: 120,
        fixed: 'left',
      },
      {
        title: '仓库',
        dataIndex: 'warehouseName',
        width: 140,
      },
      {
        title: '工厂订单',
        dataIndex: 'factoryOrderNo',
        width: 160,
      },
      {
        title: '客户类目',
        dataIndex: 'customerCategory',
        width: 140,
        render: (value: string) => <Tag color="blue">{value}</Tag>,
      },
      {
        title: '款名',
        dataIndex: 'styleName',
        width: 200,
      },
      {
        title: '加工厂',
        dataIndex: 'processorName',
        width: 180,
        render: (value: string | undefined) => value ?? '-',
      },
      {
        title: 'SKU',
        dataIndex: 'sku',
        width: 200,
      },
      {
        title: '数量',
        dataIndex: 'quantity',
        align: 'right',
        width: 120,
        render: (value: number) => quantityFormatter(value),
      },
      {
        title: '收货时间',
        dataIndex: 'receiptDate',
        width: 180,
        render: (value: string) => dayjs(value).format(DATE_TIME_FORMAT),
      },
      {
        title: '备注',
        dataIndex: 'remark',
        ellipsis: true,
        render: (value: string | undefined) => value ?? '-',
      },
    ],
    [page, pageSize],
  );

  const aggregateColumns: ColumnsType<TableRecord> = useMemo(
    () => [
      {
        title: '收货日期',
        dataIndex: 'receiptDate',
        width: 160,
        render: (value: string) => value,
      },
      {
        title: '入库记录数',
        dataIndex: 'recordCount',
        width: 140,
        align: 'right',
      },
      {
        title: 'SKU 数',
        dataIndex: 'skuCount',
        width: 120,
        align: 'right',
      },
      {
        title: '关联仓库',
        dataIndex: 'warehouseCount',
        width: 120,
        align: 'right',
      },
      {
        title: '总数量',
        dataIndex: 'totalQuantity',
        align: 'right',
        render: (value: number) => quantityFormatter(value),
      },
    ],
    [],
  );

  const columns = viewMode === 'spec' ? detailColumns : aggregateColumns;

  const rowSelection: TableRowSelection<TableRecord> | undefined = useMemo(() => {
    if (viewMode !== 'spec') {
      return undefined;
    }
    return {
      fixed: true,
      selectedRowKeys,
      preserveSelectedRowKeys: true,
      onChange: (keys) => {
        setSelectedRowKeys(keys);
        const list = listState.list as FinishedGoodsReceivedRecord[];
        const keySet = new Set(keys.map((key) => String(key)));
        const next = list.filter((item) => keySet.has(item.id));
        setSelectedRecords(next);
      },
      getCheckboxProps: (record) => ({ disabled: record.recordType !== 'detail' }),
    } satisfies TableRowSelection<TableRecord>;
  }, [listState.list, selectedRowKeys, viewMode]);

  const isDetailView = viewMode === 'spec';
  const isModifyDisabled = !isDetailView || selectedRowKeys.length !== 1;
  const isDeleteDisabled = !isDetailView || selectedRowKeys.length === 0;
  const summary = listState.summary;

  const openModifyModal = () => {
    if (isModifyDisabled) {
      return;
    }
    const target = selectedRecords[0];
    if (!target) {
      message.warning('请选择需要修改的入库记录');
      return;
    }
    form.setFieldsValue({
      warehouseId: target.warehouseId,
      quantity: target.quantity,
      remark: target.remark,
    });
    setModifyModal({ open: true, submitting: false, record: target });
  };

  const closeModifyModal = () => {
    setModifyModal((prev) => ({ ...prev, open: false }));
  };

  const handleModifySubmit = async () => {
    if (!modifyModal.record) {
      return;
    }
    try {
      const values = await form.validateFields();
      if (!values.warehouseId) {
        message.warning('请选择仓库');
        return;
      }
      if (!values.quantity || values.quantity <= 0) {
        message.warning('请输入正确的数量');
        return;
      }
      const payload: FinishedGoodsReceivedUpdatePayload = {
        warehouseId: values.warehouseId,
        quantity: Math.floor(values.quantity),
        remark: values.remark?.trim() ? values.remark.trim() : undefined,
      };
      setModifyModal((prev) => ({ ...prev, submitting: true }));
      await finishedGoodsReceivedService.update(modifyModal.record.id, payload);
      message.success('入库记录已更新');
      setModifyModal({ open: false, submitting: false });
      loadList();
    } catch (error) {
      if ((error as { errorFields?: unknown[] } | undefined)?.errorFields) {
        return;
      }
      console.error('failed to update received record', error);
      setModifyModal((prev) => ({ ...prev, submitting: false }));
      message.error('修改失败，请重试');
    }
  };

  const handleDelete = () => {
    if (isDeleteDisabled) {
      return;
    }
    const ids = selectedRowKeys.map((key) => String(key));
    Modal.confirm({
      title: '确认作废所选入库记录？',
      content: '删除后对应成品库存将同步扣减，请确认已完成校对。',
      okText: '确认作废',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await finishedGoodsReceivedService.remove(ids);
          message.success('已作废所选入库记录');
          setSelectedRowKeys([]);
          setSelectedRecords([]);
          loadList();
        } catch (error) {
          console.error('failed to remove received records', error);
          message.error('作废失败，请重试');
        }
      },
    });
  };

  const handleExport = async () => {
    try {
      await finishedGoodsReceivedService.export({
        page: 1,
        pageSize,
        viewMode,
        warehouseId: warehouseFilter,
        keywordOrderOrStyle: appliedOrderKeyword,
        keywordProcessor: appliedProcessorKeyword,
      });
      message.success('导出任务已创建，请前往下载中心查看');
    } catch (error) {
      console.error('failed to export received list', error);
      message.error('导出失败，请稍后再试');
    }
  };

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card bordered={false} loading={metaLoading}>
        <Row gutter={[16, 16]} align="middle" justify="space-between">
          <Col flex="auto">
            <Space wrap size={16}>
              <Button type="primary" icon={<EditOutlined />} disabled={isModifyDisabled} onClick={openModifyModal}>
                修改
              </Button>
              <Button
                danger
                icon={<DeleteOutlined />}
                disabled={isDeleteDisabled}
                onClick={handleDelete}
              >
                删除
              </Button>
              <Button icon={<DownloadOutlined />} onClick={handleExport}>
                导出
              </Button>
              <Radio.Group value={viewMode} onChange={handleViewModeChange} buttonStyle="solid">
                <Radio.Button value="spec">分规格</Radio.Button>
                <Radio.Button value="receiptDate">分收货日期</Radio.Button>
              </Radio.Group>
            </Space>
          </Col>
          <Col>
            <Space size={12} wrap>
              <Select
                allowClear
                placeholder="仓库"
                style={{ width: 160 }}
                value={warehouseFilter}
                options={meta?.warehouses.map((item) => ({ value: item.id, label: item.name }))}
                onChange={handleWarehouseChange}
              />
              <Input
                allowClear
                placeholder="订单/款式"
                style={{ width: 220 }}
                value={orderKeyword}
                onChange={(event) => setOrderKeyword(event.target.value)}
              />
              <Input
                allowClear
                placeholder="加工厂"
                style={{ width: 200 }}
                value={processorKeyword}
                onChange={(event) => setProcessorKeyword(event.target.value)}
              />
              <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
                查询
              </Button>
              <Button icon={<ReloadOutlined />} onClick={handleReset}>
                重置
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <Card bordered={false}>
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Row justify="space-between" align="middle">
            <Col>
              <Space size={24} wrap>
                <Text>
                  入库记录：<Text strong>{summary.recordCount}</Text>
                </Text>
                <Text>
                  SKU 数：<Text strong>{summary.skuCount}</Text>
                </Text>
                <Text>
                  总数量：<Text strong>{quantityFormatter(summary.totalQuantity)}</Text>
                </Text>
              </Space>
            </Col>
          </Row>
          <Table<TableRecord>
            rowKey={(record) => record.id}
            loading={tableLoading}
            dataSource={displayedData}
            columns={columns}
            rowSelection={rowSelection}
            pagination={{
              current: page,
              pageSize,
              total: listState.total,
              showSizeChanger: true,
              pageSizeOptions: PAGE_SIZE_OPTIONS,
              onChange: handleTableChange,
            }}
            scroll={{ x: 1400 }}
          />
        </Space>
      </Card>

      <Modal
        title="修改入库记录"
        open={modifyModal.open}
        onCancel={closeModifyModal}
        onOk={handleModifySubmit}
        confirmLoading={modifyModal.submitting}
        destroyOnClose
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item
            label="仓库"
            name="warehouseId"
            rules={[{ required: true, message: '请选择仓库' }]}
          >
            <Select
              placeholder="选择仓库"
              options={meta?.warehouses.map((item) => ({ value: item.id, label: item.name }))}
            />
          </Form.Item>
          <Form.Item
            label="数量"
            name="quantity"
            rules={[{ required: true, message: '请输入数量' }]}
          >
            <InputNumber min={1} precision={0} style={{ width: '100%' }} placeholder="请输入数量" />
          </Form.Item>
          <Form.Item label="备注" name="remark">
            <Input.TextArea rows={3} maxLength={100} placeholder="可填写修正原因" />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
};

export default FinishedGoodsReceived;
