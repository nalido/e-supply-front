import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ColumnsType } from 'antd/es/table';
import type { TableRowSelection } from 'antd/es/table/interface';
import { App as AntdApp, Button, Space, Switch, Table, Tabs, Tag, Typography } from 'antd';
import { DownloadOutlined, ProfileOutlined, ShoppingOutlined } from '@ant-design/icons';
import { materialStockService } from '../api/material-inventory';
import type {
  MaterialStockListItem,
  MaterialStockListParams,
  MaterialStockAdvancedFilters,
  MaterialStockMeta,
  MaterialStockType,
} from '../types/material-stock';
import MaterialMovementsModal from '../components/material/MaterialMovementsModal';
import MaterialIssueModal from '../components/material/MaterialIssueModal';
import MaterialStockAdvancedFilter from '../components/material/MaterialStockAdvancedFilter';
import ListImage from '../components/common/ListImage';
import { FilterBar, PageHeader, PageSection, SearchField, TableToolbar } from '../components/page';
import { Link, useSearchParams } from 'react-router-dom';
import { wasGlobalErrorShown } from '../utils/http-error';

const { Text } = Typography;

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 20, 50];
const currencyFormatter = new Intl.NumberFormat('zh-CN', {
  style: 'currency',
  currency: 'CNY',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const DEFAULT_TABS: MaterialStockMeta['materialTabs'] = [
  { value: 'fabric', label: '面料' },
  { value: 'accessory', label: '辅料/包材' },
];

const formatQuantity = (value: number): string => value.toLocaleString('zh-CN');
const formatCurrency = (value: number): string => currencyFormatter.format(value ?? 0);
const MATERIAL_TYPES: MaterialStockType[] = ['fabric', 'accessory'];
const normalizeMaterialStockRows = (items: MaterialStockListItem[]): MaterialStockListItem[] =>
  items.map((item) => ({
    ...item,
    color: item.materialMinimumSpecificationColor || item.color,
    specification: item.specification || item.materialMinimumSpecificationLabel,
  }));

const sortTabs = (tabs?: MaterialStockMeta['materialTabs']): MaterialStockMeta['materialTabs'] => {
  const source = tabs?.length ? tabs : DEFAULT_TABS;
  const order = new Map(MATERIAL_TYPES.map((value, index) => [value, index]));
  return [...source].sort((left, right) => {
    const leftOrder = order.get(left.value) ?? Number.MAX_SAFE_INTEGER;
    const rightOrder = order.get(right.value) ?? Number.MAX_SAFE_INTEGER;
    return leftOrder - rightOrder;
  });
};

const MaterialStock = () => {
  const { message } = AntdApp.useApp();
  const [searchParams] = useSearchParams();
  const initialKeyword = searchParams.get('keyword')?.trim() ?? '';
  const [meta, setMeta] = useState<MaterialStockMeta | null>(null);
  const [metaLoading, setMetaLoading] = useState(false);
  const [materials, setMaterials] = useState<MaterialStockListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState({
    stockQtyTotal: 0,
    availableQtyTotal: 0,
    inTransitQtyTotal: 0,
    stockAmountTotal: 0,
  });
  const [tableLoading, setTableLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [materialType, setMaterialType] = useState<MaterialStockType>('fabric');
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [keyword, setKeyword] = useState(initialKeyword);
  const [appliedKeyword, setAppliedKeyword] = useState<string | undefined>(initialKeyword || undefined);
  const [advancedFilters, setAdvancedFilters] = useState<MaterialStockAdvancedFilters>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [selectedRows, setSelectedRows] = useState<MaterialStockListItem[]>([]);
  const [movementModalOpen, setMovementModalOpen] = useState(false);
  const [movementMaterial, setMovementMaterial] = useState<MaterialStockListItem | null>(null);
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [issueMaterials, setIssueMaterials] = useState<MaterialStockListItem[]>([]);

  const handleMovementModalClose = () => {
    setMovementModalOpen(false);
    setMovementMaterial(null);
  };

  const handleIssueModalClose = () => {
    setIssueModalOpen(false);
    setIssueMaterials([]);
  };

  useEffect(() => {
    const loadMeta = async () => {
      setMetaLoading(true);
      try {
        const response = await materialStockService.getMeta();
        const sortedTabs = sortTabs(response.materialTabs);
        setMeta({ ...response, materialTabs: sortedTabs });
        if (sortedTabs.length) {
          setMaterialType(sortedTabs[0].value);
        }
      } catch (error) {
        console.error('failed to load material stock meta', error);
        message.error('加载物料库存配置失败');
      } finally {
        setMetaLoading(false);
      }
    };

    void loadMeta();
  }, [message]);

  useEffect(() => {
    if (!meta?.materialTabs?.length) {
      return;
    }
    if (!meta.materialTabs.some((tab) => tab.value === materialType)) {
      setMaterialType(meta.materialTabs[0].value);
    }
  }, [materialType, meta]);

  const loadList = useCallback(async () => {
    setTableLoading(true);
    try {
      const params: MaterialStockListParams = {
        page,
        pageSize,
        materialType,
        onlyInStock,
        keyword: appliedKeyword,
        ...advancedFilters,
      };
      const response = await materialStockService.getList(params);
      const displayList = normalizeMaterialStockRows(response.list);
      setMaterials(displayList);
      setTotal(response.total);
      const validIds = new Set(displayList.map((item) => item.id));
      setSelectedRowKeys((prev) => prev.filter((key) => validIds.has(String(key))));
      setSelectedRows((prev) => prev.filter((item) => validIds.has(item.id)));
    } catch (error) {
      console.error('failed to load material stock list', error);
      message.error('获取物料库存列表失败');
    } finally {
      setTableLoading(false);
    }
  }, [page, pageSize, materialType, onlyInStock, appliedKeyword, advancedFilters, message]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const loadSummary = useCallback(async () => {
    try {
      const response = await materialStockService.getSummary();
      setSummary(response);
    } catch (error) {
      console.error('failed to load material stock summary', error);
      message.error('获取物料库存汇总失败');
    }
  }, [message]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  const handleTabChange = (value: string) => {
    setMaterialType(value as MaterialStockType);
    setPage(1);
    setSelectedRowKeys([]);
    setSelectedRows([]);
  };

  const handleOnlyInStockChange = (checked: boolean) => {
    setOnlyInStock(checked);
    setPage(1);
  };

  const handleSearch = () => {
    const normalized = keyword.trim();
    setAppliedKeyword(normalized || undefined);
    setPage(1);
  };

  const handleAdvancedFilterApply = (filters: MaterialStockAdvancedFilters) => {
    setAdvancedFilters(filters);
    setPage(1);
    setSelectedRowKeys([]);
    setSelectedRows([]);
  };

  const handleAdvancedFilterReset = () => {
    setAdvancedFilters({});
    setPage(1);
    setSelectedRowKeys([]);
    setSelectedRows([]);
  };

  const handleReset = () => {
    setKeyword('');
    setAppliedKeyword(undefined);
    setAdvancedFilters({});
    setOnlyInStock(false);
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

  const selection: TableRowSelection<MaterialStockListItem> = useMemo(
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

  const handleMaterialRequisition = () => {
    if (!selectedRows.length) {
      message.warning('请先勾选需要出库的物料');
      return;
    }
    const warehouseIds = new Set(selectedRows.map((item) => item.warehouseId));
    if (warehouseIds.size > 1) {
      message.error('暂仅支持同一仓库的物料同时出库');
      return;
    }
    setIssueMaterials(selectedRows);
    setIssueModalOpen(true);
  };

  const handleShowDetails = () => {
    if (selectedRows.length !== 1) {
      return;
    }
    const record = selectedRows[0];
    setMovementMaterial(record);
    setMovementModalOpen(true);
  };

  const showMovementDetails = useCallback((record: MaterialStockListItem) => {
    setMovementMaterial(record);
    setMovementModalOpen(true);
  }, []);

  const handleExport = async () => {
    setExporting(true);
    try {
      const result = await materialStockService.export({
        materialType,
        onlyInStock,
        keyword: appliedKeyword,
        ...advancedFilters,
        warehouseName: meta?.warehouses.find(
          (warehouse) => warehouse.id === advancedFilters.warehouseId,
        )?.name,
      });
      message.success(`已生成物料库存 Excel，共 ${result.exported} 条，请到下载中心查看`);
    } catch (error) {
      console.error('failed to export material stocks', error);
      if (!wasGlobalErrorShown(error)) {
        message.error('物料库存导出失败，请稍后重试');
      }
    } finally {
      setExporting(false);
    }
  };

  const columns: ColumnsType<MaterialStockListItem> = useMemo(() => [
    {
      title: '物料图片',
      dataIndex: 'imageUrl',
      width: 96,
      render: (value, record) => <ListImage src={value} alt={record.materialName} />,
    },
    {
      title: '物料编码',
      dataIndex: 'materialCode',
      width: 140,
    },
    {
      title: '物料名称',
      dataIndex: 'materialName',
      width: 200,
      ellipsis: true,
    },
    {
      title: '颜色',
      dataIndex: 'color',
      width: 120,
      render: (value?: string) => value || <Text type="secondary">-</Text>,
    },
    {
      title: '规格',
      dataIndex: 'specification',
      width: 180,
      ellipsis: true,
      render: (value?: string) => value || <Text type="secondary">-</Text>,
    },
    {
      title: '单位',
      dataIndex: 'unit',
      width: 80,
      align: 'center',
    },
    {
      title: '仓库',
      dataIndex: 'warehouseName',
      width: 140,
    },
    {
      title: '库存数量',
      dataIndex: 'stockQty',
      width: 140,
      align: 'right',
      render: (value: number, record) => (
        <Button type="link" size="small" onClick={() => showMovementDetails(record)}>
          {formatQuantity(value)}
        </Button>
      ),
    },
    {
      title: '可用数量',
      dataIndex: 'availableQty',
      width: 140,
      align: 'right',
      render: (value: number, record) => (
        <Button type="link" size="small" onClick={() => showMovementDetails(record)}>
          {formatQuantity(value)}
        </Button>
      ),
    },
    {
      title: '采购在途',
      dataIndex: 'inTransitQty',
      width: 140,
      align: 'right',
      render: (value: number, record) => (
        <Link to={`/material/purchase-prep?keyword=${encodeURIComponent(record.materialName)}`}>
          {formatQuantity(value)}
        </Link>
      ),
    },
    {
      title: '备注',
      dataIndex: 'remark',
      ellipsis: true,
      render: (value?: string) => value || <Text type="secondary">无备注</Text>,
    },
    {
      title: '操作',
      key: 'actions',
      width: 100,
      fixed: 'right',
      render: (_, record) => (
        <Button type="link" size="small" onClick={() => showMovementDetails(record)}>
          查看流水
        </Button>
      ),
    },
  ], [showMovementDetails]);

  const tabItems = useMemo(() => sortTabs(meta?.materialTabs), [meta]);
  const summaryItems = useMemo(
    () => [
      { label: '库存总数', value: `${formatQuantity(summary.stockQtyTotal)}` },
      { label: '可用总数', value: `${formatQuantity(summary.availableQtyTotal)}` },
      { label: '采购在途', value: `${formatQuantity(summary.inTransitQtyTotal)}` },
      { label: '库存金额', value: formatCurrency(summary.stockAmountTotal) },
    ],
    [summary.availableQtyTotal, summary.inTransitQtyTotal, summary.stockAmountTotal, summary.stockQtyTotal],
  );

  const appliedFilterTags = useMemo(() => {
    const tags: Array<{
      key: string;
      label: string;
      fields: Array<keyof MaterialStockAdvancedFilters>;
    }> = [];
    const appendText = (
      field: keyof MaterialStockAdvancedFilters,
      label: string,
    ) => {
      const value = advancedFilters[field];
      if (typeof value === 'string' && value) {
        tags.push({ key: field, label: `${label}：${value}`, fields: [field] });
      }
    };
    const appendRange = (
      key: string,
      label: string,
      minimumField: keyof MaterialStockAdvancedFilters,
      maximumField: keyof MaterialStockAdvancedFilters,
    ) => {
      const minimum = advancedFilters[minimumField];
      const maximum = advancedFilters[maximumField];
      if (typeof minimum === 'number' || typeof maximum === 'number') {
        tags.push({
          key,
          label: `${label}：${typeof minimum === 'number' ? minimum : '不限'} ～ ${typeof maximum === 'number' ? maximum : '不限'}`,
          fields: [minimumField, maximumField],
        });
      }
    };

    appendText('materialCode', '物料编码');
    appendText('materialName', '物料名称');
    appendText('color', '颜色');
    appendText('specification', '规格');
    appendText('unit', '单位');
    if (advancedFilters.warehouseId) {
      const warehouse = meta?.warehouses.find((item) => item.id === advancedFilters.warehouseId);
      tags.push({
        key: 'warehouseId',
        label: `仓库：${warehouse?.name ?? advancedFilters.warehouseId}`,
        fields: ['warehouseId'],
      });
    }
    appendRange('stockQty', '库存数量', 'stockQtyMin', 'stockQtyMax');
    appendRange('availableQty', '可用数量', 'availableQtyMin', 'availableQtyMax');
    appendRange('inTransitQty', '采购在途', 'inTransitQtyMin', 'inTransitQtyMax');
    appendText('remark', '备注');
    return tags;
  }, [advancedFilters, meta?.warehouses]);

  const handleRemoveAdvancedFilter = (fields: Array<keyof MaterialStockAdvancedFilters>) => {
    setAdvancedFilters((current) => {
      const next = { ...current };
      fields.forEach((field) => delete next[field]);
      return next;
    });
    setPage(1);
    setSelectedRowKeys([]);
    setSelectedRows([]);
  };

  const hasSelection = selectedRowKeys.length > 0;
  const canShowDetails = selectedRows.length === 1;

  return (
    <div className="oc-page">
      <PageHeader
        className="oc-page-header--compact"
        title="物料库存"
        subtitle="以库存、可用量和在途量为核心，支持快速筛选、批量领料和明细追踪。"
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

      <PageSection className="oc-page-section--compact" title="库存看板" description="切换物料类型后把汇总、筛选与批量动作压到同一视区，减少来回滚动。">
        <div className="oc-section-stack-tight">
          <Tabs
            items={tabItems.map((tab) => ({ key: tab.value, label: tab.label }))}
            activeKey={materialType}
            onChange={handleTabChange}
          />

          <FilterBar
            left={
              <>
                <Space size={8} align="center">
                  <Switch checked={onlyInStock} onChange={handleOnlyInStockChange} />
                  <Text>仅显示有库存</Text>
                </Space>
                <SearchField
                  allowClear
                  placeholder="搜索编码 / 名称 / 颜色 / 规格"
                  value={keyword}
                  onChange={setKeyword}
                  onPressEnter={handleSearch}
                  style={{ width: 300 }}
                />
                <MaterialStockAdvancedFilter
                  value={advancedFilters}
                  warehouses={meta?.warehouses ?? []}
                  onApply={handleAdvancedFilterApply}
                  onReset={handleAdvancedFilterReset}
                />
              </>
            }
            right={
              <div className="oc-toolbar-cluster oc-toolbar-cluster--end">
                <Button type="primary" onClick={handleSearch}>搜索</Button>
                <Button onClick={handleReset}>重置</Button>
              </div>
            }
          />

          {appliedFilterTags.length > 0 ? (
            <div className="material-stock-filter-tags" aria-label="已应用筛选条件">
              <Text type="secondary">已筛选</Text>
              {appliedFilterTags.map((filter) => (
                <Tag
                  key={filter.key}
                  closable
                  onClose={() => handleRemoveAdvancedFilter(filter.fields)}
                >
                  {filter.label}
                </Tag>
              ))}
              <Button type="link" size="small" onClick={handleAdvancedFilterReset}>清除全部</Button>
            </div>
          ) : null}

          <TableToolbar
            left={
              <div className="oc-toolbar-cluster">
                <Button type="primary" icon={<ShoppingOutlined />} disabled={!hasSelection} onClick={handleMaterialRequisition}>领料出库</Button>
                <Button icon={<ProfileOutlined />} disabled={!canShowDetails} onClick={handleShowDetails}>进出明细</Button>
              </div>
            }
            right={<Button icon={<DownloadOutlined />} loading={exporting} onClick={() => void handleExport()}>导出 Excel</Button>}
          />
        </div>

        <div style={{ marginTop: 16 }}>
          <Table<MaterialStockListItem>
            rowKey="id"
            loading={tableLoading || metaLoading}
            dataSource={materials}
            columns={columns}
            rowSelection={selection}
            pagination={{
              current: page,
              pageSize,
              total,
              showSizeChanger: true,
              pageSizeOptions: PAGE_SIZE_OPTIONS.map(String),
              onChange: handleTableChange,
              showTotal: (value) => `共 ${value} 条`,
            }}
            scroll={{ x: 'max-content' }}
          />
        </div>
        <MaterialMovementsModal
          open={movementModalOpen}
          material={movementMaterial}
          onClose={handleMovementModalClose}
        />
        <MaterialIssueModal
          open={issueModalOpen}
          materials={issueMaterials}
          materialType={materialType}
          onClose={handleIssueModalClose}
          onIssued={() => {
            handleIssueModalClose();
            void loadList();
          }}
        />
      </PageSection>
    </div>
  );
};

export default MaterialStock;
