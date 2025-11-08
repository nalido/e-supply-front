import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ColumnsType } from 'antd/es/table';
import type { TableRowSelection } from 'antd/es/table/interface';
import {
  Button,
  Card,
  Input,
  Select,
  Space,
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
import { stockingPurchaseInboundService } from '../api/mock';
import type {
  StockingBatchReceivePayload,
  StockingPurchaseListParams,
  StockingPurchaseMeta,
  StockingPurchaseRecord,
  StockingPurchaseStatusFilter,
  StockingStatusUpdatePayload,
} from '../types/stocking-purchase-inbound';

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

const StockingPurchaseInbound = () => {
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

  const handleSearch = () => {
    setAppliedKeyword(keywordInput.trim() || undefined);
    setPage(1);
  };

  const handleReset = () => {
    setKeyword('');
    if (meta) {
      setStatusFilter(meta.defaultStatus);
      if (meta.materialTypeTabs?.length) {
        setMaterialType(meta.materialTypeTabs[0].value);
      }
    } else {
      setStatusFilter('pending');
      setMaterialType('fabric');
    }
    setKeywordInput('');
    setAppliedKeyword(undefined);
    setPage(1);
    setPageSize(DEFAULT_PAGE_SIZE);
    setSelectedRowKeys([]);
  };

  const handleBatchReceive = async () => {
    if (!selectedRowKeys.length) {
      message.warning('请先选择需要收料的采购单');
      return;
    }
    const payload: StockingBatchReceivePayload = {
      ids: selectedRowKeys.map((key) => String(key)),
    };
    try {
      await stockingPurchaseInboundService.batchReceive(payload);
      message.success('已提交批量收料任务');
      setSelectedRowKeys([]);
      void loadList();
    } catch (error) {
      console.error('failed to submit batch receive', error);
      message.error('批量收料失败，请稍后重试');
    }
  };

  const handleStatusUpdate = async (nextStatus: StockingStatusUpdatePayload['status']) => {
    if (!selectedRowKeys.length) {
      message.warning('请先选择需要更新状态的采购单');
      return;
    }
    const payload: StockingStatusUpdatePayload = {
      ids: selectedRowKeys.map((key) => String(key)),
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
        title: '物料名称',
        dataIndex: 'materialName',
        key: 'materialName',
        width: 220,
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
        width: 100,
        render: (value?: string) => value ?? '-',
      },
      {
        title: '克重',
        dataIndex: 'weight',
        key: 'weight',
        width: 100,
        render: (value?: string) => value ?? '-',
      },
      {
        title: '采购日期',
        dataIndex: 'purchaseDate',
        key: 'purchaseDate',
        width: 140,
      },
      {
        title: '供应商',
        dataIndex: 'supplierName',
        key: 'supplierName',
        width: 180,
      },
      {
        title: '供应商型号',
        dataIndex: 'supplierModel',
        key: 'supplierModel',
        width: 140,
        render: (value?: string) => value ?? '-',
      },
      {
        title: '供应商色号',
        dataIndex: 'supplierColorNo',
        key: 'supplierColorNo',
        width: 140,
        render: (value?: string) => value ?? '-',
      },
      {
        title: '空差',
        dataIndex: 'tolerance',
        key: 'tolerance',
        width: 100,
        render: (value?: string) => value ?? '-',
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
        title: '采购数',
        dataIndex: 'orderQty',
        key: 'orderQty',
        align: 'right',
        width: 120,
        render: (value: number, record) => `${formatQuantity(value)} ${record.unit}`,
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
        render: (_value, record) => (
          <Space size={8}>
            <Button size="small" type="link" onClick={() => message.info(`收料 ${record.purchaseOrderNo} (Mock)`)}>
              收料
            </Button>
            <Button size="small" type="link" onClick={() => message.info(`查看收料明细 ${record.purchaseOrderNo} (Mock)`)}>
              收料明细
            </Button>
            <Button size="small" type="link" onClick={() => message.info(`更多操作 ${record.purchaseOrderNo} (Mock)`)}>
              更多
            </Button>
          </Space>
        ),
      },
    ],
    [],
  );

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
        bordered={false}
        loading={metaLoading}
        title="备料采购列表"
        extra={
          <Space size={8} wrap>
            <Button type="primary" icon={<PlusOutlined />}>
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
      </Card>
    </Space>
  );
};

export default StockingPurchaseInbound;
