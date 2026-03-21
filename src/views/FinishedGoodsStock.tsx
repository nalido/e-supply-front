import { useCallback, useEffect, useMemo, useState, type Key } from 'react';
import {
  Alert,
  Button,
  Card,
  DatePicker,
  Drawer,
  Empty,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs, { type Dayjs } from 'dayjs';
import { finishedGoodsDispatchService, finishedGoodsOutboundService, finishedGoodsStockService } from '../api/finished-goods';
import { FilterBar, PageHeader, PageSection, SearchField, TableToolbar } from '../components/page';
import ListImage from '../components/common/ListImage';
import type {
  FinishedGoodsStockMeta,
  FinishedGoodsStockStyleListParams,
  FinishedGoodsStockStyleMatrixItem,
  FinishedGoodsStockStyleRecord,
} from '../types/finished-goods-stock';
import type { FinishedGoodsDispatchCreatePayload, FinishedGoodsOutboundMeta } from '../types/finished-goods-outbound';

const { Text } = Typography;

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 20, 50];
const ALL_WAREHOUSES = '__all__';

type DispatchFormValues = {
  customerId?: string;
  logisticsProviderId?: string;
  dispatchAt?: Dayjs;
  trackingNo?: string;
  remark?: string;
};

type PendingStyle = FinishedGoodsStockStyleRecord & {
  entryKey: string;
  items: FinishedGoodsStockStyleMatrixItem[];
  quantities: Record<string, number | undefined>;
};

const quantityFormatter = (value: number): string => value.toLocaleString('zh-CN');
const buildStyleEntryKey = (styleId: string, warehouseId: string) => `${warehouseId}-${styleId}`;

const buildMatrixMeta = (items: FinishedGoodsStockStyleMatrixItem[]) => {
  const colors = Array.from(new Set(items.map((item) => item.color || 'N/A')));
  const sizes = Array.from(new Set(items.map((item) => item.size || 'STD')));
  const itemMap = items.reduce<Record<string, FinishedGoodsStockStyleMatrixItem>>((acc, item) => {
    acc[`${item.color}__${item.size}`] = item;
    return acc;
  }, {});
  return { colors, sizes, itemMap };
};

const sumPendingStyleQty = (style: PendingStyle) =>
  Object.values(style.quantities).reduce<number>((sum, value) => sum + (Number(value) || 0), 0);

const sumPendingTotalQty = (styles: PendingStyle[]) => styles.reduce((sum, style) => sum + sumPendingStyleQty(style), 0);

type MatrixTableProps = {
  items: FinishedGoodsStockStyleMatrixItem[];
  quantities?: Record<string, number | undefined>;
  editable?: boolean;
  onQuantityChange?: (styleVariantId: string, value: number | undefined) => void;
};

const MatrixTable = ({ items, quantities, editable = false, onQuantityChange }: MatrixTableProps) => {
  if (!items.length) {
    return <Text type="secondary">暂无颜色尺码库存数据</Text>;
  }

  const { colors, sizes, itemMap } = buildMatrixMeta(items);

  return (
    <div className="factory-create-matrix-wrap finished-goods-stock-matrix-wrap">
      <table className="factory-create-matrix-table finished-goods-stock-matrix-table">
        <thead>
          <tr>
            <th>颜色</th>
            {sizes.map((size) => (
              <th key={`head-${size}`}>{size}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {colors.map((color) => (
            <tr key={`row-${color}`}>
              <th scope="row">{color}</th>
              {sizes.map((size) => {
                const item = itemMap[`${color}__${size}`];
                if (!item) {
                  return (
                    <td key={`${color}-${size}`} className="is-empty">
                      -
                    </td>
                  );
                }
                return (
                  <td key={`${color}-${size}`} className={editable ? 'is-editable' : 'is-number'}>
                    {editable ? (
                      <InputNumber
                        min={0}
                        max={item.availableQuantity}
                        precision={0}
                        controls={false}
                        value={quantities?.[item.styleVariantId]}
                        onChange={(value) => {
                          const normalized = Math.max(0, Math.round(Number(value) || 0));
                          onQuantityChange?.(
                            item.styleVariantId,
                            Number.isFinite(Number(value)) ? Math.min(normalized, item.availableQuantity) : undefined,
                          );
                        }}
                        style={{ width: '100%' }}
                        placeholder={`可用 ${quantityFormatter(item.availableQuantity)}`}
                      />
                    ) : (
                      <Tooltip title={`可用 ${quantityFormatter(item.availableQuantity)} ${item.unit}`}>
                        <span className="finished-goods-stock-matrix-value">{quantityFormatter(item.availableQuantity)}</span>
                      </Tooltip>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const FinishedGoodsStock = () => {
  const [meta, setMeta] = useState<FinishedGoodsStockMeta | null>(null);
  const [outboundMeta, setOutboundMeta] = useState<FinishedGoodsOutboundMeta | null>(null);
  const [metaLoading, setMetaLoading] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [onlyInStock, setOnlyInStock] = useState(true);
  const [warehouseId, setWarehouseId] = useState<string>();
  const [keyword, setKeyword] = useState('');
  const [appliedKeyword, setAppliedKeyword] = useState<string>();
  const [styles, setStyles] = useState<FinishedGoodsStockStyleRecord[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [total, setTotal] = useState(0);
  const [expandAllRows, setExpandAllRows] = useState(false);
  const [expandedRowKeys, setExpandedRowKeys] = useState<Key[]>([]);
  const [matrixCache, setMatrixCache] = useState<Record<string, FinishedGoodsStockStyleMatrixItem[]>>({});
  const [pendingStyles, setPendingStyles] = useState<PendingStyle[]>([]);
  const [dispatchForm] = Form.useForm<DispatchFormValues>();

  useEffect(() => {
    const loadMeta = async () => {
      setMetaLoading(true);
      try {
        const [stockMeta, outboundMetaResponse] = await Promise.all([
          finishedGoodsStockService.getMeta(),
          finishedGoodsOutboundService.getMeta(),
        ]);
        setMeta(stockMeta);
        setOutboundMeta(outboundMetaResponse);
      } catch (error) {
        console.error('failed to load finished goods stock meta', error);
        message.error('加载成品库存配置失败');
      } finally {
        setMetaLoading(false);
      }
    };

    void loadMeta();
    dispatchForm.setFieldsValue({ dispatchAt: dayjs() });
  }, [dispatchForm]);

  const loadStyleList = useCallback(async () => {
    setListLoading(true);
    try {
      const params: FinishedGoodsStockStyleListParams = {
        page,
        pageSize,
        onlyInStock,
        warehouseId,
        keyword: appliedKeyword,
      };
      const response = await finishedGoodsStockService.getStyleList(params);
      setStyles(response.list);
      setTotal(response.total);
    } catch (error) {
      console.error('failed to load finished goods stock styles', error);
      message.error('获取成品库存款式列表失败');
    } finally {
      setListLoading(false);
    }
  }, [appliedKeyword, onlyInStock, page, pageSize, warehouseId]);

  useEffect(() => {
    void loadStyleList();
  }, [loadStyleList]);

  const ensureStyleMatrix = useCallback(
    async (style: FinishedGoodsStockStyleRecord) => {
      const entryKey = buildStyleEntryKey(style.styleId, style.warehouseId);
      if (matrixCache[entryKey]) {
        return matrixCache[entryKey];
      }
      const response = await finishedGoodsStockService.getStyleMatrix(style.styleId, style.warehouseId);
      setMatrixCache((prev) => ({ ...prev, [entryKey]: response.items }));
      return response.items;
    },
    [matrixCache],
  );

  useEffect(() => {
    if (!expandAllRows) {
      return;
    }
    if (!styles.length) {
      setExpandedRowKeys([]);
      return;
    }

    const currentPageKeys = styles.map((style) => buildStyleEntryKey(style.styleId, style.warehouseId));
    setExpandedRowKeys(currentPageKeys);

    const loadAllMatrices = async () => {
      try {
        await Promise.all(styles.map((style) => ensureStyleMatrix(style)));
      } catch (error) {
        console.error('failed to load all stock style matrices', error);
        message.error('加载全部颜色尺码库存矩阵失败');
      }
    };

    void loadAllMatrices();
  }, [ensureStyleMatrix, expandAllRows, styles]);

  const handleSearch = () => {
    setAppliedKeyword(keyword.trim() || undefined);
    setPage(1);
  };

  const handleReset = () => {
    setKeyword('');
    setAppliedKeyword(undefined);
    setOnlyInStock(true);
    setWarehouseId(undefined);
    setExpandAllRows(false);
    setPage(1);
    setPageSize(DEFAULT_PAGE_SIZE);
    setExpandedRowKeys([]);
  };

  const handleWarehouseChange = (value?: string) => {
    if (pendingStyles.length > 0 && value !== warehouseId) {
      setPendingStyles([]);
      message.info('切换仓库后已清空待出货列表');
    }
    setWarehouseId(value);
    setExpandAllRows(false);
    setPage(1);
    setExpandedRowKeys([]);
  };

  const handleExpand = async (expanded: boolean, record: FinishedGoodsStockStyleRecord) => {
    const entryKey = buildStyleEntryKey(record.styleId, record.warehouseId);
    if (expanded) {
      try {
        await ensureStyleMatrix(record);
        setExpandedRowKeys((prev) => Array.from(new Set([...prev, entryKey])));
      } catch (error) {
        console.error('failed to load stock style matrix', error);
        message.error('加载颜色尺码库存矩阵失败');
      }
      return;
    }
    setExpandedRowKeys((prev) => prev.filter((key) => key !== entryKey));
  };

  const handleAddPendingStyle = useCallback(
    async (style: FinishedGoodsStockStyleRecord) => {
      const entryKey = buildStyleEntryKey(style.styleId, style.warehouseId);
      if (pendingStyles.some((item) => item.entryKey === entryKey)) {
        message.info('该款式已在待出货列表中');
        return;
      }
      if (pendingStyles.length > 0 && pendingStyles[0].warehouseId !== style.warehouseId) {
        message.warning(`一次出货操作仅支持同一仓库，当前待出货列表仓库为「${pendingStyles[0].warehouseName}」`);
        return;
      }
      try {
        const items = await ensureStyleMatrix(style);
        const quantities = items.reduce<Record<string, number | undefined>>((acc, item) => {
          acc[item.styleVariantId] = undefined;
          return acc;
        }, {});
        setPendingStyles((prev) => [...prev, { ...style, entryKey, items, quantities }]);
        message.success(`已添加 ${style.styleNo}（${style.warehouseName}）到待出货列表`);
      } catch (error) {
        console.error('failed to add pending style', error);
        message.error('添加待出货款式失败');
      }
    },
    [ensureStyleMatrix, pendingStyles],
  );

  const handleRemovePendingStyle = useCallback((entryKey: string) => {
    setPendingStyles((prev) => prev.filter((item) => item.entryKey !== entryKey));
  }, []);

  const handlePendingQtyChange = useCallback((styleId: string, styleVariantId: string, value: number | undefined) => {
    setPendingStyles((prev) =>
      prev.map((style) =>
        style.styleId === styleId
          ? {
              ...style,
              quantities: {
                ...style.quantities,
                [styleVariantId]: value,
              },
            }
          : style,
      ),
    );
  }, []);

  const selectedStyleCount = pendingStyles.length;
  const totalPendingQty = useMemo(() => sumPendingTotalQty(pendingStyles), [pendingStyles]);
  const lockedWarehouseName = pendingStyles[0]?.warehouseName;

  const handleSubmitDispatch = async () => {
    const dispatchWarehouseId = pendingStyles[0]?.warehouseId;
    const dispatchWarehouseName = pendingStyles[0]?.warehouseName;
    if (!dispatchWarehouseId) {
      message.warning('请先添加待出货款式');
      return;
    }
    if (pendingStyles.some((style) => style.warehouseId !== dispatchWarehouseId)) {
      message.error('一次出货操作仅支持同一仓库');
      return;
    }
    const items = pendingStyles.flatMap((style) =>
      style.items
        .map((item) => ({
          item,
          quantity: style.quantities[item.styleVariantId],
        }))
        .filter((entry) => (entry.quantity ?? 0) > 0)
        .map((entry) => ({
          styleVariantId: entry.item.styleVariantId,
          quantity: entry.quantity!,
          unitPrice: entry.item.unitPrice ?? 0,
        })),
    );
    if (!items.length) {
      message.warning('请在待出货列表中至少填写一个大于 0 的出货数量');
      return;
    }
    const exceeded = pendingStyles
      .flatMap((style) =>
        style.items.map((item) => ({
          styleNo: style.styleNo,
          color: item.color,
          size: item.size,
          quantity: style.quantities[item.styleVariantId] ?? 0,
          availableQuantity: item.availableQuantity,
          unit: item.unit,
        })),
      )
      .find((entry) => entry.quantity > entry.availableQuantity);
    if (exceeded) {
      message.error(`${exceeded.styleNo} ${exceeded.color}/${exceeded.size} 的出货数量超过可用库存（${exceeded.unit}）`);
      return;
    }

    try {
      const values = await dispatchForm.validateFields();
      const payload: FinishedGoodsDispatchCreatePayload = {
        warehouseId: dispatchWarehouseId,
        customerId: values.customerId,
        logisticsProviderId: values.logisticsProviderId,
        dispatchAt: values.dispatchAt ? values.dispatchAt.toISOString() : undefined,
        trackingNo: values.trackingNo?.trim() || undefined,
        remark: values.remark?.trim() || undefined,
        items,
      };
      setSubmitting(true);
      const result = await finishedGoodsDispatchService.create(payload);
      message.success(`已创建出库单 ${result.dispatchNo}`);
      setPendingStyles([]);
      setDrawerOpen(false);
      dispatchForm.setFieldsValue({
        customerId: undefined,
        logisticsProviderId: undefined,
        dispatchAt: dayjs(),
        trackingNo: undefined,
        remark: undefined,
      });
      void loadStyleList();
    } catch (error) {
      if ((error as { errorFields?: unknown[] } | undefined)?.errorFields) {
        return;
      }
      console.error('failed to dispatch finished goods', error);
      message.error(dispatchWarehouseName ? `确认出货失败：${dispatchWarehouseName}` : '确认出货失败');
    } finally {
      setSubmitting(false);
    }
  };

  const columns: ColumnsType<FinishedGoodsStockStyleRecord> = useMemo(
    () => [
      {
        title: '图片',
        dataIndex: 'imageUrl',
        width: 84,
        render: (value: string | undefined, record) => <ListImage src={value} alt={record.styleName} />,
      },
      {
        title: '款式',
        dataIndex: 'styleNo',
        width: 260,
        render: (_value, record) => (
          <Space direction="vertical" size={2} className="finished-goods-stock-style-cell">
            <Text strong>{record.styleNo}</Text>
            <Text type="secondary">{record.styleName}</Text>
          </Space>
        ),
      },
      {
        title: '仓库',
        dataIndex: 'warehouseName',
        width: 132,
        render: (value: string) => <span className="finished-goods-stock-warehouse-cell">{value}</span>,
      },
      {
        title: 'SKU',
        dataIndex: 'skuCount',
        width: 92,
        align: 'right',
        render: (value: number) => <span className="finished-goods-stock-sku-cell">{quantityFormatter(value)}</span>,
      },
      {
        title: '可用库存',
        dataIndex: 'availableQuantity',
        width: 168,
        align: 'right',
        render: (value: number, record) => (
          <div className="finished-goods-stock-available-cell">
            <span className="finished-goods-stock-available-cell__value">{quantityFormatter(value)}</span>
            <span className="finished-goods-stock-available-cell__unit">{record.unit}</span>
          </div>
        ),
      },
      {
        title: '总库存',
        dataIndex: 'quantity',
        width: 132,
        align: 'right',
        render: (value: number, record) => <span className="finished-goods-stock-total-cell">{quantityFormatter(value)} {record.unit}</span>,
      },
      {
        title: '操作',
        key: 'action',
        width: 160,
        fixed: 'right',
        render: (_value, record) => {
          const entryKey = buildStyleEntryKey(record.styleId, record.warehouseId);
          return pendingStyles.some((item) => item.entryKey === entryKey) ? (
            <Button
              onClick={(event) => {
                event.stopPropagation();
                handleRemovePendingStyle(entryKey);
              }}
            >
              移出
            </Button>
          ) : pendingStyles.length > 0 && pendingStyles[0].warehouseId !== record.warehouseId ? (
            <Button disabled>仓库不一致</Button>
          ) : (
            <Button
              type="link"
              onClick={(event) => {
                event.stopPropagation();
                void handleAddPendingStyle(record);
              }}
            >
              加入待出货
            </Button>
          );
        },
      },
    ],
    [handleAddPendingStyle, handleRemovePendingStyle, pendingStyles],
  );

  const summaryItems = useMemo(
    () => [
      { label: '匹配款式', value: quantityFormatter(total) },
      { label: '展开款式', value: quantityFormatter(expandedRowKeys.length) },
      { label: '当前仓库', value: warehouseId ? (meta?.warehouses.find((item) => item.id === warehouseId)?.name ?? '—') : '全部' },
    ],
    [expandedRowKeys.length, meta?.warehouses, total, warehouseId],
  );

  return (
    <div className="oc-page">
      <PageHeader
        className="oc-page-header--compact"
        title="成品库存"
        subtitle=""
        stats={
          <div className="oc-summary-strip">
            {summaryItems.map((item) => (
              <div key={item.label} className="oc-summary-chip">
                <div className="oc-summary-chip__label">{item.label}</div>
                <div className="oc-summary-chip__value">{item.value}</div>
              </div>
            ))}
          </div>
        }
      />

      <PageSection className="oc-page-section--compact" title="库存列表">
        <div className="oc-section-stack-tight">
          <FilterBar
            left={
              <>
                <Select
                  allowClear
                  style={{ width: 180 }}
                  value={warehouseId ?? ALL_WAREHOUSES}
                  onChange={(value) => handleWarehouseChange(value === ALL_WAREHOUSES ? undefined : value)}
                  options={[
                    { label: '全部仓库', value: ALL_WAREHOUSES },
                    ...(meta?.warehouses.map((item) => ({ label: item.name, value: item.id })) ?? []),
                  ]}
                  placeholder="全部仓库"
                />
                <SearchField
                  allowClear
                  placeholder="搜索款号或款名"
                  value={keyword}
                  onChange={setKeyword}
                  onPressEnter={handleSearch}
                  style={{ width: 260 }}
                />
                <Space size={8} align="center">
                  <Switch
                    checked={onlyInStock}
                    onChange={(checked) => {
                      setOnlyInStock(checked);
                      setPage(1);
                    }}
                  />
                  <Text>仅显示有库存</Text>
                </Space>
                <Space size={8} align="center">
                  <Switch
                    checked={expandAllRows}
                    onChange={(checked) => {
                      setExpandAllRows(checked);
                      if (!checked) {
                        setExpandedRowKeys([]);
                      }
                    }}
                  />
                  <Text>全展开</Text>
                </Space>
              </>
            }
            right={
              <div className="oc-toolbar-cluster oc-toolbar-cluster--end">
                <Button type="primary" onClick={handleSearch}>查询</Button>
                <Button onClick={handleReset}>重置</Button>
              </div>
            }
          />

          <TableToolbar
            left={
              <div className="oc-inline-meta">
                <div className="oc-inline-meta__item">列表共 <span className="oc-inline-meta__value">{quantityFormatter(total)}</span> 款</div>
                <div className="oc-inline-meta__item">已展开 <span className="oc-inline-meta__value">{quantityFormatter(expandedRowKeys.length)}</span> 款</div>
              </div>
            }
            right={
              <div className="finished-goods-stock-toolbar-actions">
                <Button onClick={() => setDrawerOpen(true)}>待出货{selectedStyleCount > 0 ? ` ${quantityFormatter(selectedStyleCount)} 款` : ''}</Button>
              </div>
            }
          />

          <div className="finished-goods-stock-panel">
            <Table<FinishedGoodsStockStyleRecord>
              size="small"
              rowKey={(record) => buildStyleEntryKey(record.styleId, record.warehouseId)}
              loading={listLoading || metaLoading}
              columns={columns}
              dataSource={styles}
              expandable={{
                expandedRowKeys,
                expandRowByClick: true,
                onExpand: (expanded, record) => void handleExpand(expanded, record),
                expandedRowRender: (record) => {
                  const entryKey = buildStyleEntryKey(record.styleId, record.warehouseId);
                  return (
                    <div className="finished-goods-stock-expanded-block">
                      <MatrixTable items={matrixCache[entryKey] ?? []} />
                    </div>
                  );
                },
              }}
              pagination={{
                current: page,
                pageSize,
                total,
                showSizeChanger: true,
                pageSizeOptions: PAGE_SIZE_OPTIONS.map(String),
                onChange: (nextPage, nextPageSize) => {
                  setPage(nextPage);
                  if (nextPageSize !== pageSize) {
                    setPageSize(nextPageSize);
                  }
                },
                showTotal: (value) => `共 ${value} 条`,
              }}
            />
          </div>
        </div>
      </PageSection>

      <Drawer
        title={`待出货${selectedStyleCount > 0 ? `（${quantityFormatter(selectedStyleCount)}）` : ''}`}
        placement="right"
        width="50vw"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        destroyOnClose={false}
        className="finished-goods-stock-drawer"
      >
        <div className="finished-goods-stock-pending-wrap">
          {!pendingStyles.length ? (
            <div className="finished-goods-stock-empty-state">
              <Empty description="暂无待出货款式" />
            </div>
          ) : (
            <>
              <Alert type="info" showIcon message={`仓库：${lockedWarehouseName || '-'}  ·  已选 ${selectedStyleCount} 款`} />
              <div className="finished-goods-stock-pending-list">
                {pendingStyles.map((style) => (
                  <Card
                    key={style.entryKey}
                    size="small"
                    className="finished-goods-stock-pending-card"
                    title={
                      <Space size={12} wrap>
                        <Text strong>{style.styleNo}</Text>
                        <Text type="secondary">{style.styleName}</Text>
                        <Tag>{style.warehouseName}</Tag>
                        <Tag>{style.skuCount} 个 SKU</Tag>
                        <Tag color="gold">已填 {quantityFormatter(sumPendingStyleQty(style))} {style.unit}</Tag>
                      </Space>
                    }
                    extra={<Button onClick={() => handleRemovePendingStyle(style.entryKey)}>移除</Button>}
                  >
                    <MatrixTable
                      items={style.items}
                      quantities={style.quantities}
                      editable
                      onQuantityChange={(styleVariantId, value) => handlePendingQtyChange(style.styleId, styleVariantId, value)}
                    />
                  </Card>
                ))}
              </div>
            </>
          )}

          <Card size="small" title="出货信息">
            <Form<DispatchFormValues> form={dispatchForm} layout="vertical">
              <div className="finished-goods-stock-form-grid">
                <Form.Item label="客户（可选）" name="customerId" style={{ marginBottom: 0 }}>
                  <Select
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    placeholder="选择客户"
                    options={outboundMeta?.customers.map((item) => ({ label: item.name, value: item.id })) ?? []}
                  />
                </Form.Item>
                <Form.Item label="物流公司" name="logisticsProviderId" style={{ marginBottom: 0 }}>
                  <Select
                    allowClear
                    placeholder="选择物流公司"
                    options={outboundMeta?.logistics.map((item) => ({ label: item.name, value: item.id })) ?? []}
                  />
                </Form.Item>
                <Form.Item label="出货时间" name="dispatchAt" style={{ marginBottom: 0 }}>
                  <DatePicker showTime style={{ width: '100%' }} format="YYYY-MM-DD HH:mm" />
                </Form.Item>
                <Form.Item label="物流单号" name="trackingNo" style={{ marginBottom: 0 }}>
                  <Input allowClear placeholder="填写物流单号" />
                </Form.Item>
                <Form.Item label="备注" name="remark" style={{ marginBottom: 0, gridColumn: '1 / -1' }}>
                  <Input.TextArea rows={2} placeholder="填写备注" />
                </Form.Item>
              </div>
            </Form>
          </Card>

          <Card size="small" title="提交确认">
            <div className="finished-goods-stock-submit-bar">
              <div className="finished-goods-stock-submit-meta">
                <span>款式 {quantityFormatter(selectedStyleCount)} 款</span>
                <span>数量 {quantityFormatter(totalPendingQty)}</span>
              </div>
              <Button type="primary" loading={submitting} disabled={!pendingStyles.length} onClick={() => void handleSubmitDispatch()}>
                确定出货
              </Button>
            </div>
          </Card>
        </div>
      </Drawer>
    </div>
  );
};

export default FinishedGoodsStock;
