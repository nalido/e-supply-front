import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ColumnsType } from 'antd/es/table';
import type { TableRowSelection } from 'antd/es/table/interface';
import { Button, Space, Switch, Table, Tabs, Typography, message } from 'antd';
import { DownloadOutlined, ProfileOutlined, ShoppingOutlined } from '@ant-design/icons';
import { materialStockService } from '../api/material-inventory';
import type {
  MaterialStockListItem,
  MaterialStockListParams,
  MaterialStockListResponse,
  MaterialStockMeta,
  MaterialStockType,
} from '../types/material-stock';
import MaterialMovementsModal from '../components/material/MaterialMovementsModal';
import MaterialIssueModal from '../components/material/MaterialIssueModal';
import ListImage from '../components/common/ListImage';
import { FilterBar, PageHeader, PageSection, SearchField, TableToolbar } from '../components/page';

const { Text } = Typography;

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 20, 50];

const DEFAULT_TABS: MaterialStockMeta['materialTabs'] = [
  { value: 'fabric', label: '面料' },
  { value: 'accessory', label: '辅料/包材' },
];

const formatQuantity = (value: number): string => value.toLocaleString('zh-CN');

const MaterialStock = () => {
  const [meta, setMeta] = useState<MaterialStockMeta | null>(null);
  const [metaLoading, setMetaLoading] = useState(false);
  const [materials, setMaterials] = useState<MaterialStockListItem[]>([]);
  const [summary, setSummary] = useState<MaterialStockListResponse['summary']>({
    stockQtyTotal: 0,
    availableQtyTotal: 0,
    inTransitQtyTotal: 0,
  });
  const [tableLoading, setTableLoading] = useState(false);
  const [materialType, setMaterialType] = useState<MaterialStockType>('fabric');
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [remarkKeyword, setRemarkKeyword] = useState('');
  const [orderKeyword, setOrderKeyword] = useState('');
  const [appliedRemarkKeyword, setAppliedRemarkKeyword] = useState<string | undefined>(undefined);
  const [appliedOrderKeyword, setAppliedOrderKeyword] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [total, setTotal] = useState(0);
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
        setMeta(response);
        if (response.materialTabs?.length) {
          setMaterialType(response.materialTabs[0].value);
        }
      } catch (error) {
        console.error('failed to load material stock meta', error);
        message.error('加载物料库存配置失败');
      } finally {
        setMetaLoading(false);
      }
    };

    void loadMeta();
  }, []);

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
        keywordRemark: appliedRemarkKeyword,
        keywordOrderStyle: appliedOrderKeyword,
      };
      const response = await materialStockService.getList(params);
      setMaterials(response.list);
      setTotal(response.total);
      setSummary(response.summary);
      const validIds = new Set(response.list.map((item) => item.id));
      setSelectedRowKeys((prev) => prev.filter((key) => validIds.has(String(key))));
      setSelectedRows((prev) => prev.filter((item) => validIds.has(item.id)));
    } catch (error) {
      console.error('failed to load material stock list', error);
      message.error('获取物料库存列表失败');
    } finally {
      setTableLoading(false);
    }
  }, [page, pageSize, materialType, onlyInStock, appliedRemarkKeyword, appliedOrderKeyword]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

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
    const remark = remarkKeyword.trim();
    const order = orderKeyword.trim();
    setAppliedRemarkKeyword(remark || undefined);
    setAppliedOrderKeyword(order || undefined);
    setPage(1);
  };

  const handleReset = () => {
    setRemarkKeyword('');
    setOrderKeyword('');
    setAppliedRemarkKeyword(undefined);
    setAppliedOrderKeyword(undefined);
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

  const handleExport = () => {
    message.success('已生成物料库存导出任务，稍后可在下载中心查看');
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
      render: (value: number) => formatQuantity(value),
    },
    {
      title: '可用数量',
      dataIndex: 'availableQty',
      width: 140,
      align: 'right',
      render: (value: number) => formatQuantity(value),
    },
    {
      title: '采购在途',
      dataIndex: 'inTransitQty',
      width: 140,
      align: 'right',
      render: (value: number) => formatQuantity(value),
    },
    {
      title: '备注',
      dataIndex: 'remark',
      ellipsis: true,
      render: (value?: string) => value || <Text type="secondary">无备注</Text>,
    },
  ], []);

  const tabItems = useMemo(() => (meta?.materialTabs?.length ? meta.materialTabs : DEFAULT_TABS), [meta]);

  const summaryItems = useMemo(
    () => [
      { label: '库存总数', value: `${formatQuantity(summary.stockQtyTotal)}` },
      { label: '可用总数', value: `${formatQuantity(summary.availableQtyTotal)}` },
      { label: '采购在途', value: `${formatQuantity(summary.inTransitQtyTotal)}` },
    ],
    [summary.availableQtyTotal, summary.inTransitQtyTotal, summary.stockQtyTotal],
  );

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
                <SearchField allowClear placeholder="备注关键词" value={remarkKeyword} onChange={setRemarkKeyword} onPressEnter={handleSearch} style={{ width: 220 }} />
                <SearchField allowClear placeholder="订单 / 款式" value={orderKeyword} onChange={setOrderKeyword} onPressEnter={handleSearch} style={{ width: 220 }} />
              </>
            }
            right={
              <div className="oc-toolbar-cluster oc-toolbar-cluster--end">
                <Button type="primary" onClick={handleSearch}>搜索</Button>
                <Button onClick={handleReset}>重置</Button>
              </div>
            }
          />

          <TableToolbar
            left={
              <div className="oc-toolbar-cluster">
                <Button type="primary" icon={<ShoppingOutlined />} disabled={!hasSelection} onClick={handleMaterialRequisition}>领料出库</Button>
                <Button icon={<ProfileOutlined />} disabled={!canShowDetails} onClick={handleShowDetails}>进出明细</Button>
              </div>
            }
            right={<Button icon={<DownloadOutlined />} onClick={handleExport}>导出 Excel</Button>}
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
