import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ColumnsType } from 'antd/es/table';
import {
  Button,
  Card,
  Checkbox,
  Descriptions,
  Drawer,
  Input,
  Space,
  Table,
  Tabs,
  Typography,
  message,
} from 'antd';
import { DownloadOutlined, SearchOutlined } from '@ant-design/icons';
import { useSearchParams } from 'react-router-dom';
import type {
  OrderMaterialRequirementListItem,
  OrderMaterialRequirementListParams,
  OrderMaterialRequirementType,
} from '../types/order-material-requirement-report';
import { orderMaterialRequirementReportService } from '../api/order-material-requirement-report';
import ListImage from '../components/common/ListImage';

const { Text } = Typography;

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 20, 50];

const quantityFormatter = new Intl.NumberFormat('zh-CN', {
  maximumFractionDigits: 2,
});

const materialTabs = [
  { key: 'fabric', label: '面料' },
  { key: 'accessory', label: '辅料' },
  { key: 'packaging', label: '包材' },
] as const satisfies { key: OrderMaterialRequirementType; label: string }[];

const renderQuantity = (value: number): string => quantityFormatter.format(value ?? 0);

const isValidMaterialType = (value: string | null): value is OrderMaterialRequirementType =>
  value === 'fabric' || value === 'accessory' || value === 'packaging';

const OrderMaterialRequirementReport = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const materialTypeParam = searchParams.get('materialType');
  const initialMaterialType: OrderMaterialRequirementType = isValidMaterialType(materialTypeParam)
    ? materialTypeParam
    : 'fabric';
  const initialKeyword = searchParams.get('keyword')?.trim() ?? '';
  const [materialType, setMaterialType] = useState<OrderMaterialRequirementType>(initialMaterialType);
  const [restockOnly, setRestockOnly] = useState(searchParams.get('restockOnly') === 'true');
  const [keyword, setKeyword] = useState(initialKeyword);
  const [appliedKeyword, setAppliedKeyword] = useState<string | undefined>(initialKeyword || undefined);
  const [records, setRecords] = useState<OrderMaterialRequirementListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const initialPage = Number(searchParams.get('page') ?? '1');
  const initialPageSize = Number(searchParams.get('pageSize') ?? String(DEFAULT_PAGE_SIZE));
  const [page, setPage] = useState(Number.isFinite(initialPage) && initialPage > 0 ? initialPage : 1);
  const [pageSize, setPageSize] = useState(
    Number.isFinite(initialPageSize) && initialPageSize > 0 ? initialPageSize : DEFAULT_PAGE_SIZE,
  );
  const [total, setTotal] = useState(0);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailRecord, setDetailRecord] = useState<OrderMaterialRequirementListItem | null>(null);

  useEffect(() => {
    const nextParams = new URLSearchParams();
    nextParams.set('materialType', materialType);
    nextParams.set('page', String(page));
    nextParams.set('pageSize', String(pageSize));
    if (restockOnly) {
      nextParams.set('restockOnly', 'true');
    }
    if (appliedKeyword) {
      nextParams.set('keyword', appliedKeyword);
    }
    setSearchParams(nextParams, { replace: true });
  }, [appliedKeyword, materialType, page, pageSize, restockOnly, setSearchParams]);

  const columns: ColumnsType<OrderMaterialRequirementListItem> = useMemo(() => [
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
      const params: OrderMaterialRequirementListParams = {
        materialType,
        restockNeeded: restockOnly,
        name: appliedKeyword,
        page,
        pageSize,
      };
      const response = await orderMaterialRequirementReportService.getList(params);
      setRecords(response.list);
      setTotal(response.total);
    } catch (error) {
      console.error('failed to load material requirement list', error);
      message.error('获取物料需求报表失败');
    } finally {
      setLoading(false);
    }
  }, [materialType, restockOnly, appliedKeyword, page, pageSize]);

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
              <Button icon={<DownloadOutlined />} onClick={handleExport}>
                导出Excel
              </Button>
              <Checkbox checked={restockOnly} onChange={(event) => handleRestockChange(event.target.checked)}>
                仅显示需补料数
              </Checkbox>
            </Space>
            <Space size={12} wrap>
              <Input
                allowClear
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                onPressEnter={handleFilter}
                placeholder="物料名称"
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

      <Card title="物料需求明细">
        <div style={{ marginBottom: 12 }}>
          <Text type="secondary">已将关键字段前置：合计需求量、需补料、备料在库、备料在途、备料采购；其余信息可点击“查看更多”。</Text>
        </div>
        <Table<OrderMaterialRequirementListItem>
          rowKey="id"
          columns={columns}
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
          open={detailOpen}
          onClose={() => setDetailOpen(false)}
          destroyOnClose
        >
          {detailRecord && (
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="物料名称">{detailRecord.name}</Descriptions.Item>
              <Descriptions.Item label="供应商">{detailRecord.supplier || '--'}</Descriptions.Item>
              <Descriptions.Item label="物料类型">{detailRecord.materialCategory || '--'}</Descriptions.Item>
              <Descriptions.Item label="颜色">{detailRecord.color || '--'}</Descriptions.Item>
              <Descriptions.Item label="幅宽">{detailRecord.width || '--'}</Descriptions.Item>
              <Descriptions.Item label="克重">{detailRecord.grammage || '--'}</Descriptions.Item>
              <Descriptions.Item label="空差">{detailRecord.allowance || '--'}</Descriptions.Item>
              <Descriptions.Item label="供应商型号">{detailRecord.supplierModel || '--'}</Descriptions.Item>
              <Descriptions.Item label="供应商色号">{detailRecord.supplierColor || '--'}</Descriptions.Item>
              <Descriptions.Item label="合计需求量">{renderQuantity(detailRecord.totalRequiredQty)}</Descriptions.Item>
              <Descriptions.Item label="需补料">
                <Text strong type={detailRecord.restockQty > 0 ? 'danger' : 'secondary'}>{renderQuantity(detailRecord.restockQty)}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="备料在库数量">{renderQuantity(detailRecord.stockInventoryQty)}</Descriptions.Item>
              <Descriptions.Item label="备料在途数量">{renderQuantity(detailRecord.stockInTransitQty)}</Descriptions.Item>
              <Descriptions.Item label="备料采购数量">{renderQuantity(detailRecord.stockPurchaseQty)}</Descriptions.Item>
            </Descriptions>
          )}
        </Drawer>
      </Card>
    </Space>
  );
};

export default OrderMaterialRequirementReport;
