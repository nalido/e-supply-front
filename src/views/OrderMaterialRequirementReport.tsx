import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ColumnsType } from 'antd/es/table';
import {
  Button,
  Card,
  Checkbox,
  Descriptions,
  Drawer,
  Input,
  Radio,
  Space,
  Table,
  Tabs,
  Typography,
  message,
} from 'antd';
import { DownloadOutlined, SearchOutlined } from '@ant-design/icons';
import type {
  OrderMaterialRequirementListItem,
  OrderMaterialRequirementListParams,
  OrderMaterialRequirementMode,
  OrderMaterialRequirementType,
  SalesStockingSuggestionListItem,
  SalesStockingSuggestionListParams,
} from '../types/order-material-requirement-report';
import { orderMaterialRequirementReportService } from '../api/order-material-requirement-report';
import ListImage from '../components/common/ListImage';

const { Text } = Typography;

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 20, 50];

const quantityFormatter = new Intl.NumberFormat('zh-CN', {
  maximumFractionDigits: 2,
});

const percentFormatter = new Intl.NumberFormat('zh-CN', {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const materialTabs = [
  { key: 'fabric', label: '面料' },
  { key: 'accessory', label: '辅料' },
  { key: 'packaging', label: '包材' },
] as const satisfies { key: OrderMaterialRequirementType; label: string }[];

const renderQuantity = (value: number): string => quantityFormatter.format(value ?? 0);

const OrderMaterialRequirementReport = () => {
  const [mode, setMode] = useState<OrderMaterialRequirementMode>('order');
  const [materialType, setMaterialType] = useState<OrderMaterialRequirementType>('fabric');
  const [restockOnly, setRestockOnly] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [appliedKeyword, setAppliedKeyword] = useState<string | undefined>(undefined);
  const [records, setRecords] = useState<OrderMaterialRequirementListItem[]>([]);
  const [salesRecords, setSalesRecords] = useState<SalesStockingSuggestionListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [total, setTotal] = useState(0);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailRecord, setDetailRecord] = useState<SalesStockingSuggestionListItem | null>(null);
  const [orderDetailOpen, setOrderDetailOpen] = useState(false);
  const [orderDetailRecord, setOrderDetailRecord] = useState<OrderMaterialRequirementListItem | null>(null);

  const orderColumns: ColumnsType<OrderMaterialRequirementListItem> = useMemo(() => [
    {
      title: '物料',
      width: 260,
      fixed: 'left',
      render: (_, record) => (
        <Space align="start" size={12}>
          <ListImage src={record.imageUrl} alt={record.name} fallback={<Text type="secondary">暂无图片</Text>} />
          <Space direction="vertical" size={0}>
            <Text strong>{record.name}</Text>
            <Text type="secondary">{record.materialCategory || '--'}</Text>
            <Text type="secondary">供应商：{record.supplier || '--'}</Text>
          </Space>
        </Space>
      ),
    },
    {
      title: '合计需求量',
      dataIndex: 'totalRequiredQty',
      width: 130,
      align: 'right',
      render: (value) => <Text strong>{renderQuantity(value)}</Text>,
    },
    {
      title: '需补料',
      dataIndex: 'restockQty',
      width: 120,
      align: 'right',
      render: (value) => (
        <Text strong type={value > 0 ? 'danger' : 'secondary'}>{renderQuantity(value)}</Text>
      ),
    },
    {
      title: '备料在库',
      dataIndex: 'stockInventoryQty',
      width: 120,
      align: 'right',
      render: (value) => renderQuantity(value),
    },
    {
      title: '备料在途',
      dataIndex: 'stockInTransitQty',
      width: 120,
      align: 'right',
      render: (value) => renderQuantity(value),
    },
    {
      title: '备料采购',
      dataIndex: 'stockPurchaseQty',
      width: 120,
      align: 'right',
      render: (value) => renderQuantity(value),
    },
    {
      title: '详情',
      key: 'detail',
      width: 96,
      fixed: 'right',
      render: (_, record) => (
        <Button
          type="link"
          onClick={() => {
            setOrderDetailRecord(record);
            setOrderDetailOpen(true);
          }}
        >
          查看更多
        </Button>
      ),
    },
  ], []);

  const salesColumns: ColumnsType<SalesStockingSuggestionListItem> = useMemo(() => [
    {
      title: '物料 / 款式',
      width: 260,
      fixed: 'left',
      render: (_, record) => (
        <Space align="start" size={12}>
          <ListImage src={record.imageUrl} alt={record.materialName} fallback={<Text type="secondary">暂无图片</Text>} />
          <Space direction="vertical" size={0}>
            <Text strong>{record.materialName}</Text>
            <Text type="secondary">{record.materialCode}</Text>
            <Text>{record.styleNo ?? '--'}</Text>
            <Text type="secondary">{record.styleName ?? '--'}</Text>
          </Space>
        </Space>
      ),
    },
    {
      title: '周销量',
      dataIndex: 'weeklySales',
      width: 110,
      align: 'right',
      render: (value) => renderQuantity(value),
    },
    {
      title: '覆盖周数',
      dataIndex: 'coverageWeeks',
      width: 100,
      align: 'right',
      render: (value) => `${renderQuantity(value)} 周`,
    },
    {
      title: '建议库存',
      dataIndex: 'suggestedStockQty',
      width: 130,
      align: 'right',
      render: (value, record) => `${renderQuantity(value)} ${record.unit ?? ''}`.trim(),
    },
    {
      title: '当前可得量',
      dataIndex: 'availableQty',
      width: 130,
      align: 'right',
      render: (value, record) => `${renderQuantity(value)} ${record.unit ?? ''}`.trim(),
    },
    {
      title: '建议补货量',
      dataIndex: 'suggestedReplenishQty',
      width: 140,
      align: 'right',
      render: (value, record) => (
        <Text strong type={value > 0 ? 'danger' : 'secondary'}>{`${renderQuantity(value)} ${record.unit ?? ''}`.trim()}</Text>
      ),
    },
    {
      title: '详情',
      key: 'detail',
      width: 96,
      fixed: 'right',
      render: (_, record) => (
        <Button
          type="link"
          onClick={() => {
            setDetailRecord(record);
            setDetailOpen(true);
          }}
        >
          查看更多
        </Button>
      ),
    },
  ], []);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      if (mode === 'order') {
        const params: OrderMaterialRequirementListParams = {
          materialType,
          restockNeeded: restockOnly,
          name: appliedKeyword,
          page,
          pageSize,
        };
        const response = await orderMaterialRequirementReportService.getList(params);
        setRecords(response.list);
        setSalesRecords([]);
        setTotal(response.total);
      } else {
        const params: SalesStockingSuggestionListParams = {
          materialType,
          restockNeeded: restockOnly,
          name: appliedKeyword,
          page,
          pageSize,
        };
        const response = await orderMaterialRequirementReportService.getSalesStockingSuggestions(params);
        setSalesRecords(response.list);
        setRecords([]);
        setTotal(response.total);
      }
    } catch (error) {
      console.error('failed to load material requirement list', error);
      message.error(mode === 'order' ? '获取物料需求报表失败' : '获取销量备料建议失败');
    } finally {
      setLoading(false);
    }
  }, [mode, materialType, restockOnly, appliedKeyword, page, pageSize]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const handleFilter = () => {
    const normalized = keyword.trim();
    setAppliedKeyword(normalized || undefined);
    setPage(1);
  };

  const handleTabChange = (key: string) => {
    setMaterialType(key as OrderMaterialRequirementType);
    setPage(1);
  };

  const handleRestockChange = (checked: boolean) => {
    setRestockOnly(checked);
    setPage(1);
  };

  const handleTableChange = (nextPage: number, nextPageSize?: number) => {
    setPage(nextPage);
    if (nextPageSize && nextPageSize !== pageSize) {
      setPageSize(nextPageSize);
    }
  };

  const handleExport = () => {
    message.success('已生成导出任务，完成后可在下载中心查看');
  };

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card>
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Space style={{ width: '100%', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <Space size={12} wrap>
              <Radio.Group
                value={mode}
                onChange={(event) => {
                  setMode(event.target.value as OrderMaterialRequirementMode);
                  setPage(1);
                }}
                optionType="button"
                buttonStyle="solid"
              >
                <Radio.Button value="order">订单需求</Radio.Button>
                <Radio.Button value="sales">销量备料建议</Radio.Button>
              </Radio.Group>
              <Button icon={<DownloadOutlined />} onClick={handleExport}>
                导出Excel
              </Button>
              <Checkbox checked={restockOnly} onChange={(event) => handleRestockChange(event.target.checked)}>
                {mode === 'order' ? '仅显示需补料数' : '仅显示建议补货量 > 0'}
              </Checkbox>
            </Space>
            <Space size={12} wrap>
              <Input
                allowClear
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                onPressEnter={handleFilter}
                placeholder={mode === 'order' ? '物料名称' : '物料名称 / 款号'}
                prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                style={{ width: 240 }}
              />
              <Button type="primary" onClick={handleFilter}>
                筛选
              </Button>
            </Space>
          </Space>
          <Tabs
            activeKey={materialType}
            onChange={handleTabChange}
            destroyOnHidden
            items={materialTabs.map((item) => ({ key: item.key, label: item.label }))}
          />
        </Space>
      </Card>

      <Card title={mode === 'order' ? '物料需求明细' : '销量备料建议明细'}>
        {mode === 'order' && (
          <div style={{ marginBottom: 12 }}>
            <Text type="secondary">已将关键字段前置：合计需求量、需补料、备料在库、备料在途、备料采购；其余信息可点击“查看更多”。</Text>
          </div>
        )}
        {mode === 'sales' && (
          <div style={{ marginBottom: 12 }}>
            <Space direction="vertical" size={4}>
              <Text type="secondary">根据款式周销量设置、覆盖周期与款式面辅料单耗，推导建议库存和建议补货量。</Text>
              <Text type="secondary">已将关键字段前置：周销量、覆盖周数、建议库存、当前可得量、建议补货量；其余信息可点击“查看更多”。</Text>
            </Space>
          </div>
        )}
        {mode === 'order' ? (
          <>
            <Table<OrderMaterialRequirementListItem>
              rowKey="id"
              columns={orderColumns}
              dataSource={records}
              loading={loading}
              pagination={{
                current: page,
                pageSize,
                total,
                showSizeChanger: true,
                showQuickJumper: true,
                pageSizeOptions: PAGE_SIZE_OPTIONS.map(String),
                onChange: handleTableChange,
                onShowSizeChange: (_current, nextSize) => {
                  setPage(1);
                  setPageSize(nextSize);
                },
                showTotal: (value) => `共 ${value} 条`,
              }}
              scroll={{ x: 980 }}
            />
            <Drawer
              title="订单需求详情"
              width={640}
              open={orderDetailOpen}
              onClose={() => setOrderDetailOpen(false)}
              destroyOnClose
            >
              {orderDetailRecord && (
                <Descriptions column={1} bordered size="small">
                  <Descriptions.Item label="物料名称">{orderDetailRecord.name}</Descriptions.Item>
                  <Descriptions.Item label="供应商">{orderDetailRecord.supplier || '--'}</Descriptions.Item>
                  <Descriptions.Item label="物料类型">{orderDetailRecord.materialCategory || '--'}</Descriptions.Item>
                  <Descriptions.Item label="颜色">{orderDetailRecord.color || '--'}</Descriptions.Item>
                  <Descriptions.Item label="幅宽">{orderDetailRecord.width || '--'}</Descriptions.Item>
                  <Descriptions.Item label="克重">{orderDetailRecord.grammage || '--'}</Descriptions.Item>
                  <Descriptions.Item label="空差">{orderDetailRecord.allowance || '--'}</Descriptions.Item>
                  <Descriptions.Item label="供应商型号">{orderDetailRecord.supplierModel || '--'}</Descriptions.Item>
                  <Descriptions.Item label="供应商色号">{orderDetailRecord.supplierColor || '--'}</Descriptions.Item>
                  <Descriptions.Item label="合计需求量">{renderQuantity(orderDetailRecord.totalRequiredQty)}</Descriptions.Item>
                  <Descriptions.Item label="需补料">
                    <Text strong type={orderDetailRecord.restockQty > 0 ? 'danger' : 'secondary'}>{renderQuantity(orderDetailRecord.restockQty)}</Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="备料在库数量">{renderQuantity(orderDetailRecord.stockInventoryQty)}</Descriptions.Item>
                  <Descriptions.Item label="备料在途数量">{renderQuantity(orderDetailRecord.stockInTransitQty)}</Descriptions.Item>
                  <Descriptions.Item label="备料采购数量">{renderQuantity(orderDetailRecord.stockPurchaseQty)}</Descriptions.Item>
                </Descriptions>
              )}
            </Drawer>
          </>
        ) : (
          <>
            <Table<SalesStockingSuggestionListItem>
              rowKey="id"
              columns={salesColumns}
              dataSource={salesRecords}
              loading={loading}
              pagination={{
                current: page,
                pageSize,
                total,
                showSizeChanger: true,
                showQuickJumper: true,
                pageSizeOptions: PAGE_SIZE_OPTIONS.map(String),
                onChange: handleTableChange,
                onShowSizeChange: (_current, nextSize) => {
                  setPage(1);
                  setPageSize(nextSize);
                },
                showTotal: (value) => `共 ${value} 条`,
              }}
              scroll={{ x: 980 }}
            />
            <Drawer
              title="销量备料建议详情"
              width={640}
              open={detailOpen}
              onClose={() => setDetailOpen(false)}
              destroyOnClose
            >
              {detailRecord && (
                <Space direction="vertical" size={16} style={{ width: '100%' }}>
                  <Descriptions column={1} bordered size="small">
                    <Descriptions.Item label="物料名称">{detailRecord.materialName}</Descriptions.Item>
                    <Descriptions.Item label="物料编号">{detailRecord.materialCode || '--'}</Descriptions.Item>
                    <Descriptions.Item label="款号">{detailRecord.styleNo || '--'}</Descriptions.Item>
                    <Descriptions.Item label="款名">{detailRecord.styleName || '--'}</Descriptions.Item>
                    <Descriptions.Item label="供应商">{detailRecord.supplier || '--'}</Descriptions.Item>
                    <Descriptions.Item label="物料类型">{detailRecord.materialCategory || '--'}</Descriptions.Item>
                    <Descriptions.Item label="颜色">{detailRecord.color || '--'}</Descriptions.Item>
                    <Descriptions.Item label="周销量">{renderQuantity(detailRecord.weeklySales)}</Descriptions.Item>
                    <Descriptions.Item label="销量来源">{detailRecord.weeklySalesSource === 'MANUAL' ? '手工覆盖' : '自动'}</Descriptions.Item>
                    <Descriptions.Item label="统计周期">{detailRecord.salesWeeks == null ? '--' : `${detailRecord.salesWeeks} 周`}</Descriptions.Item>
                    <Descriptions.Item label="覆盖周数">{`${renderQuantity(detailRecord.coverageWeeks)} 周`}</Descriptions.Item>
                    <Descriptions.Item label="单耗">{`${renderQuantity(detailRecord.consumption)} ${detailRecord.unit ?? ''}`.trim()}</Descriptions.Item>
                    <Descriptions.Item label="损耗率">{percentFormatter.format(detailRecord.lossRate ?? 0)}</Descriptions.Item>
                    <Descriptions.Item label="建议库存">{`${renderQuantity(detailRecord.suggestedStockQty)} ${detailRecord.unit ?? ''}`.trim()}</Descriptions.Item>
                    <Descriptions.Item label="当前可得量">{`${renderQuantity(detailRecord.availableQty)} ${detailRecord.unit ?? ''}`.trim()}</Descriptions.Item>
                    <Descriptions.Item label="建议补货量">
                      <Text strong type={detailRecord.suggestedReplenishQty > 0 ? 'danger' : 'secondary'}>
                        {`${renderQuantity(detailRecord.suggestedReplenishQty)} ${detailRecord.unit ?? ''}`.trim()}
                      </Text>
                    </Descriptions.Item>
                  </Descriptions>
                </Space>
              )}
            </Drawer>
          </>
        )}
      </Card>
    </Space>
  );
};

export default OrderMaterialRequirementReport;
