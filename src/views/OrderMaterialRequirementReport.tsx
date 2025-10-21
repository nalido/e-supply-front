import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ColumnsType } from 'antd/es/table';
import {
  Button,
  Card,
  Checkbox,
  Input,
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
  OrderMaterialRequirementType,
} from '../types/order-material-requirement-report';
import { orderMaterialRequirementReportService } from '../api/mock';

const { Text } = Typography;

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 20, 50];

const quantityFormatter = new Intl.NumberFormat('zh-CN');

const materialTabs = [
  { key: 'fabric', label: '面料' },
  { key: 'accessory', label: '辅料' },
  { key: 'packaging', label: '包材' },
] as const satisfies { key: OrderMaterialRequirementType; label: string }[];

const renderQuantity = (value: number): string => quantityFormatter.format(value ?? 0);

const OrderMaterialRequirementReport = () => {
  const [materialType, setMaterialType] = useState<OrderMaterialRequirementType>('fabric');
  const [restockOnly, setRestockOnly] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [appliedKeyword, setAppliedKeyword] = useState<string | undefined>(undefined);
  const [records, setRecords] = useState<OrderMaterialRequirementListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [total, setTotal] = useState(0);

  const columns: ColumnsType<OrderMaterialRequirementListItem> = useMemo(() => [
    {
      title: '图片',
      dataIndex: 'imageUrl',
      width: 96,
      fixed: 'left',
      render: (value, record) => (
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 10,
            overflow: 'hidden',
            background: '#f4f4f5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {value ? (
            <img
              src={value}
              alt={record.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <Text type="secondary">暂无图片</Text>
          )}
        </div>
      ),
    },
    {
      title: '物料名称',
      dataIndex: 'name',
      width: 200,
      fixed: 'left',
      ellipsis: true,
      render: (value) => <Text strong>{value}</Text>,
    },
    {
      title: '供应商',
      dataIndex: 'supplier',
      width: 160,
      ellipsis: true,
    },
    {
      title: '物料类型',
      dataIndex: 'materialCategory',
      width: 140,
    },
    {
      title: '颜色',
      dataIndex: 'color',
      width: 120,
    },
    {
      title: '幅宽',
      dataIndex: 'width',
      width: 100,
      render: (value) => value ?? '--',
    },
    {
      title: '克重',
      dataIndex: 'grammage',
      width: 100,
      render: (value) => value ?? '--',
    },
    {
      title: '空差',
      dataIndex: 'allowance',
      width: 100,
      render: (value) => value ?? '--',
    },
    {
      title: '供应商型号',
      dataIndex: 'supplierModel',
      width: 140,
      ellipsis: true,
    },
    {
      title: '供应商色号',
      dataIndex: 'supplierColor',
      width: 140,
      ellipsis: true,
    },
    {
      title: '备料采购数量',
      dataIndex: 'stockPurchaseQty',
      width: 140,
      align: 'right',
      render: (value) => renderQuantity(value),
    },
    {
      title: '备料在库数量',
      dataIndex: 'stockInventoryQty',
      width: 140,
      align: 'right',
      render: (value) => renderQuantity(value),
    },
    {
      title: '备料在途数量',
      dataIndex: 'stockInTransitQty',
      width: 140,
      align: 'right',
      render: (value) => renderQuantity(value),
    },
    {
      title: '需补料',
      dataIndex: 'restockQty',
      width: 140,
      align: 'right',
      render: (value) => (
        <Text type={value > 0 ? 'danger' : 'secondary'}>{renderQuantity(value)}</Text>
      ),
    },
    {
      title: '合计需求量',
      dataIndex: 'totalRequiredQty',
      width: 140,
      align: 'right',
      render: (value) => renderQuantity(value),
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
          <Space
            style={{ width: '100%', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}
          >
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
            destroyInactiveTabPane
            items={materialTabs.map((item) => ({ key: item.key, label: item.label }))}
          />
        </Space>
      </Card>

      <Card title="物料需求明细">
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
          scroll={{ x: 1600 }}
        />
      </Card>
    </Space>
  );
};

export default OrderMaterialRequirementReport;
