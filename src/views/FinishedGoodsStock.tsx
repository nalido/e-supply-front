import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import type { ColumnsType } from 'antd/es/table';
import type { TableRowSelection } from 'antd/es/table/interface';
import type { CheckboxValueType } from 'antd/es/checkbox/Group';
import {
  Button,
  Card,
  Checkbox,
  Col,
  Input,
  Row,
  Select,
  Space,
  Switch,
  Table,
  Typography,
  message,
} from 'antd';
import { DownloadOutlined, ExportOutlined, ProfileOutlined, SwapOutlined } from '@ant-design/icons';
import { finishedGoodsOutboundService, finishedGoodsStockService } from '../api/finished-goods';
import type {
  FinishedGoodsStockGrouping,
  FinishedGoodsStockListParams,
  FinishedGoodsStockMeta,
  FinishedGoodsStockRecord,
} from '../types/finished-goods-stock';
import type { FinishedGoodsOutboundMeta } from '../types/finished-goods-outbound';
import FinishedGoodsDispatchModal from '../components/finished-goods/FinishedGoodsDispatchModal';
import StyleInfo from '../components/common/StyleInfo';
import ListImage from '../components/common/ListImage';

const { Text } = Typography;

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 20, 50];
const FALLBACK_GROUPING: FinishedGoodsStockGrouping[] = ['spec'];

const quantityFormatter = (value: number): string => value.toLocaleString('zh-CN');

const sanitizeGroupingValues = (values?: FinishedGoodsStockGrouping[]): FinishedGoodsStockGrouping[] => {
  if (!values || values.length === 0) {
    return FALLBACK_GROUPING;
  }
  const filtered = values.filter((item) => item !== 'order');
  return filtered.length ? filtered : FALLBACK_GROUPING;
};

const FinishedGoodsStock = () => {
  const [meta, setMeta] = useState<FinishedGoodsStockMeta | null>(null);
  const [metaLoading, setMetaLoading] = useState(false);
  const [records, setRecords] = useState<FinishedGoodsStockRecord[]>([]);
  const [summaryQty, setSummaryQty] = useState(0);
  const [tableLoading, setTableLoading] = useState(false);
  const [onlyInStock, setOnlyInStock] = useState(true);
  const [warehouseId, setWarehouseId] = useState<string | undefined>();
  const [skuKeyword, setSkuKeyword] = useState('');
  const [mixedKeyword, setMixedKeyword] = useState('');
  const [appliedSku, setAppliedSku] = useState<string | undefined>();
  const [appliedMixed, setAppliedMixed] = useState<string | undefined>();
  const [groupBy, setGroupBy] = useState<FinishedGoodsStockGrouping[]>(FALLBACK_GROUPING);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [total, setTotal] = useState(0);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [selectedRows, setSelectedRows] = useState<FinishedGoodsStockRecord[]>([]);
  const [metaInitialized, setMetaInitialized] = useState(false);
  const [outboundMeta, setOutboundMeta] = useState<FinishedGoodsOutboundMeta | null>(null);
  const [dispatchModalOpen, setDispatchModalOpen] = useState(false);
  const [dispatchRecords, setDispatchRecords] = useState<FinishedGoodsStockRecord[]>([]);

  useEffect(() => {
    const loadMeta = async () => {
      setMetaLoading(true);
      try {
        const response = await finishedGoodsStockService.getMeta();
        setMeta(response);
        const defaultGrouping = sanitizeGroupingValues(response.defaultGrouping);
        setGroupBy(defaultGrouping);
      } catch (error) {
        console.error('failed to load finished goods stock meta', error);
        message.error('加载成品库存配置失败');
        setGroupBy(FALLBACK_GROUPING);
      } finally {
        setMetaLoading(false);
        setMetaInitialized(true);
      }
    };

    const loadOutboundMeta = async () => {
      try {
        const response = await finishedGoodsOutboundService.getMeta();
        setOutboundMeta(response);
      } catch (error) {
        console.error('failed to load outbound meta', error);
      }
    };

    loadMeta();
    void loadOutboundMeta();
  }, []);

  const loadList = useCallback(async () => {
    if (!metaInitialized) {
      return;
    }
    setTableLoading(true);
    try {
      const params: FinishedGoodsStockListParams = {
        page,
        pageSize,
        onlyInStock,
        warehouseId,
        keywordSku: appliedSku,
        keywordMixed: appliedMixed,
        groupBy,
      };
      const response = await finishedGoodsStockService.getList(params);
      setRecords(response.list);
      setTotal(response.total);
      setSummaryQty(response.summary.quantityTotal);
      const validKeys = new Set(response.list.map((item) => item.id));
      setSelectedRowKeys((prev) => {
        const next = prev.filter((key) => validKeys.has(String(key)));
        return next.length === prev.length ? prev : next;
      });
      setSelectedRows((prev) => {
        const next = prev.filter((item) => validKeys.has(item.id));
        return next.length === prev.length ? prev : next;
      });
    } catch (error) {
      console.error('failed to load finished goods stock list', error);
      message.error('获取成品库存列表失败');
    } finally {
      setTableLoading(false);
    }
  }, [appliedMixed, appliedSku, groupBy, metaInitialized, onlyInStock, page, pageSize, warehouseId]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const handleOnlyInStockChange = (checked: boolean) => {
    setOnlyInStock(checked);
    setPage(1);
  };

  const handleWarehouseChange = (value?: string) => {
    setWarehouseId(value);
    setPage(1);
  };

  const handleGroupingChange = (values: CheckboxValueType[]) => {
    setGroupBy(sanitizeGroupingValues(values as FinishedGoodsStockGrouping[]));
    setPage(1);
    setSelectedRowKeys([]);
    setSelectedRows([]);
  };

  const handleSearch = () => {
    const sku = skuKeyword.trim();
    const mixed = mixedKeyword.trim();
    setAppliedSku(sku || undefined);
    setAppliedMixed(mixed || undefined);
    setPage(1);
  };

  const handleReset = () => {
    const defaultGrouping = meta?.defaultGrouping?.length
      ? meta.defaultGrouping
      : FALLBACK_GROUPING;
    setOnlyInStock(true);
    setWarehouseId(undefined);
    setSkuKeyword('');
    setMixedKeyword('');
    setAppliedSku(undefined);
    setAppliedMixed(undefined);
    setGroupBy(defaultGrouping);
    setPage(1);
    setPageSize(DEFAULT_PAGE_SIZE);
    setSelectedRowKeys([]);
    setSelectedRows([]);
  };

  const handleTableChange = (nextPage: number, nextPageSize?: number) => {
    setPage(nextPage);
    if (nextPageSize && nextPageSize !== pageSize) {
      setPageSize(nextPageSize);
    }
  };

  const rowSelection: TableRowSelection<FinishedGoodsStockRecord> = useMemo(
    () => ({
      selectedRowKeys,
      onChange: (keys, rows) => {
        setSelectedRowKeys(keys);
        setSelectedRows(rows);
      },
      preserveSelectedRowKeys: true,
    }),
    [selectedRowKeys],
  );

  const columns: ColumnsType<FinishedGoodsStockRecord> = useMemo(() => {
    const includeCustomer = groupBy.includes('customer');
    const includeSpec = groupBy.includes('spec');

    const cols: ColumnsType<FinishedGoodsStockRecord>[number][] = [
      {
        title: '序号',
        dataIndex: 'index',
        width: 64,
        fixed: 'left',
        align: 'right',
        render: (_value, _record, index) => (page - 1) * pageSize + index + 1,
      },
      {
        title: '图片',
        dataIndex: 'imageUrl',
        width: 88,
        fixed: 'left',
        render: (value: string | undefined, record) => (
          <ListImage src={value} alt={record.styleName || record.styleNo} />
        ),
      },
      {
        title: '款式',
        dataIndex: 'styleNo',
        width: 220,
        fixed: 'left',
        render: (_value, record) => (
          <StyleInfo
            styleNo={record.styleNo}
            styleName={record.styleName}
            color={record.color}
            size={record.size}
          />
        ),
      },
    ];

    cols.push({ title: '仓库', dataIndex: 'warehouseName', width: 160 });

    if (includeCustomer) {
      cols.push({
        title: '客户',
        dataIndex: 'customerName',
        width: 200,
        ellipsis: true,
        render: (value?: string) => (value ? value : <Text type="secondary">-</Text>),
      });
    }

    if (includeSpec) {
      cols.push(
        {
          title: '款名',
          dataIndex: 'styleName',
          width: 220,
          ellipsis: true,
          render: (value?: string) => (value ? value : <Text type="secondary">-</Text>),
        },
        { title: '颜色', dataIndex: 'color', width: 120, render: (value?: string) => value ?? '-' },
        { title: '尺码', dataIndex: 'size', width: 92, render: (value?: string) => value ?? '-' },
        { title: 'SKU', dataIndex: 'sku', width: 220 },
      );
    }

    cols.push({
      title: '数量',
      dataIndex: 'quantity',
      width: 120,
      align: 'right',
      render: (_value, record) => (
        <Space direction="vertical" size={0}>
          <Text type={record.quantity > 0 ? undefined : 'secondary'} strong={record.quantity > 0}>
            {quantityFormatter(record.quantity)}
          </Text>
          <Text type="secondary">可用 {quantityFormatter(record.availableQuantity)}</Text>
        </Space>
      ),
    });

    return cols;
  }, [groupBy, page, pageSize]);

  const groupingOptions = useMemo(() => {
    const options =
      meta?.groupingOptions ?? [
        { label: '分客户', value: 'customer' as FinishedGoodsStockGrouping },
        { label: '分规格', value: 'spec' as FinishedGoodsStockGrouping },
      ];
    return options.filter((option) => option.value !== 'order');
  }, [meta]);

  const hasSelection = selectedRowKeys.length > 0;
  const canShowDetails = selectedRowKeys.length === 1;

  const handleOutbound = () => {
    if (!hasSelection) {
      message.warning('请先选择需要出库的库存记录');
      return;
    }
    const invalidSku = selectedRows.find((item) => !item.styleVariantId);
    if (invalidSku) {
      message.error('存在缺少 SKU 的记录，无法出库');
      return;
    }
    const uniqueWarehouse = new Set(selectedRows.map((item) => item.warehouseId));
    if (uniqueWarehouse.size > 1) {
      message.error('仅支持同一仓库的库存批量出库');
      return;
    }
    const uniqueOrders = new Set(selectedRows.map((item) => item.productionOrderId || '__unknown__'));
    if (uniqueOrders.size > 1) {
      message.error('仅支持同一生产订单下的库存批量出库');
      return;
    }
    if (!selectedRows.some((item) => item.availableQuantity > 0)) {
      message.warning('所选记录可用数量为 0，无法出库');
      return;
    }
    setDispatchRecords(selectedRows);
    setDispatchModalOpen(true);
  };

  const handleShowDetails = () => {
    if (!canShowDetails) {
      return;
    }
    const record = selectedRows[0];
    const title = record.sku ?? record.factoryOrderNo ?? record.customerName ?? '库存记录';
    message.info(`${title} 的进出明细将在后续版本提供`);
  };

  const handleAdjustWarehouse = () => {
    if (!hasSelection) {
      return;
    }
    message.success('已提交仓库调整申请，稍后可在任务中心查看');
  };

  const handleExport = () => {
    message.success('已生成成品库存导出任务，请稍后到下载中心查看');
  };

  const handleDispatchModalClose = () => {
    setDispatchModalOpen(false);
    setDispatchRecords([]);
  };

  const handleDispatchSuccess = () => {
    handleDispatchModalClose();
    setSelectedRowKeys([]);
    setSelectedRows([]);
    void loadList();
  };

  return (
    <Fragment>
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Card bordered={false} loading={metaLoading}>
        <Row gutter={[16, 16]} align="middle" wrap>
          <Col flex="auto">
            <Space size={12} wrap>
              <Button
                type="primary"
                icon={<ExportOutlined />}
                disabled={!hasSelection}
                onClick={handleOutbound}
              >
                出库
              </Button>
              <Button icon={<ProfileOutlined />} disabled={!canShowDetails} onClick={handleShowDetails}>
                显示进出明细
              </Button>
              <Button icon={<SwapOutlined />} disabled={!hasSelection} onClick={handleAdjustWarehouse}>
                调整仓库
              </Button>
              <Button icon={<DownloadOutlined />} onClick={handleExport}>
                导出Excel
              </Button>
              <Space size={8} align="center">
                <Switch checked={onlyInStock} onChange={handleOnlyInStockChange} />
                <Text>仅显示有库存</Text>
              </Space>
              <Checkbox.Group
                options={groupingOptions}
                value={groupBy}
                onChange={handleGroupingChange}
              />
            </Space>
          </Col>
        </Row>

        <Card bordered style={{ marginTop: 16 }}>
          <Row gutter={[16, 16]} wrap align="middle">
            <Col xs={24} sm={12} md={6}>
              <Select
                allowClear
                placeholder="仓库"
                style={{ width: '100%' }}
                value={warehouseId}
                onChange={handleWarehouseChange}
                options={meta?.warehouses?.map((item) => ({ label: item.name, value: item.id })) ?? []}
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Input
                allowClear
                placeholder="SKU"
                value={skuKeyword}
                onChange={(event) => setSkuKeyword(event.target.value)}
              />
            </Col>
            <Col xs={24} sm={24} md={12}>
              <Input
                allowClear
                placeholder="订单/款式/客户"
                value={mixedKeyword}
                onChange={(event) => setMixedKeyword(event.target.value)}
              />
            </Col>
            <Col xs={24} sm={24} md={12}>
              <Space size={12} wrap>
                <Button type="primary" onClick={handleSearch}>
                  搜索
                </Button>
                <Button onClick={handleReset}>重置</Button>
              </Space>
            </Col>
          </Row>
        </Card>
      </Card>

        <Card bordered={false}>
          <Table<FinishedGoodsStockRecord>
            rowKey={(record) => record.id}
            loading={tableLoading}
            dataSource={records}
            columns={columns}
            rowSelection={rowSelection}
            pagination={{
              current: page,
              pageSize,
              total,
              showSizeChanger: true,
              pageSizeOptions: PAGE_SIZE_OPTIONS.map(String),
              onChange: handleTableChange,
              showTotal: (value) => `共 ${value} 条`,
            }}
            scroll={{ x: 1200 }}
            footer={() => (
              <div style={{ textAlign: 'right' }}>
                <Text type="secondary">
                  当前筛选合计库存：<Text strong>{quantityFormatter(summaryQty)}</Text>
                </Text>
              </div>
            )}
          />
        </Card>
      </Space>
      <FinishedGoodsDispatchModal
        open={dispatchModalOpen}
        records={dispatchRecords}
        meta={outboundMeta}
        onClose={handleDispatchModalClose}
        onDispatched={handleDispatchSuccess}
      />
    </Fragment>
  );
};

export default FinishedGoodsStock;
