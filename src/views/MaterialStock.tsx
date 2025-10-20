import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ColumnsType } from 'antd/es/table';
import type { TableRowSelection } from 'antd/es/table/interface';
import { Button, Card, Col, Input, Row, Space, Switch, Table, Tabs, Tag, Typography, message } from 'antd';
import { DownloadOutlined, ProfileOutlined, ShoppingOutlined } from '@ant-design/icons';
import { materialStockService } from '../api/mock';
import type {
  MaterialStockListItem,
  MaterialStockListParams,
  MaterialStockMeta,
  MaterialStockType,
} from '../types/material-stock';

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
  const [materials, setMaterials] = useState<MaterialStockListItem[]>([]);
  const [tableLoading, setTableLoading] = useState(false);
  const [materialType, setMaterialType] = useState<MaterialStockType>('fabric');
  const [onlyInStock, setOnlyInStock] = useState(true);
  const [remarkKeyword, setRemarkKeyword] = useState('');
  const [orderKeyword, setOrderKeyword] = useState('');
  const [appliedRemarkKeyword, setAppliedRemarkKeyword] = useState<string | undefined>(undefined);
  const [appliedOrderKeyword, setAppliedOrderKeyword] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [total, setTotal] = useState(0);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [selectedRows, setSelectedRows] = useState<MaterialStockListItem[]>([]);

  useEffect(() => {
    const loadMeta = async () => {
      try {
        const response = await materialStockService.getMeta();
        setMeta(response);
        if (response.materialTabs?.length) {
          setMaterialType(response.materialTabs[0].value);
        }
      } catch (error) {
        console.error('failed to load material stock meta', error);
        message.error('加载物料库存配置失败');
      }
    };

    loadMeta();
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
    setOnlyInStock(true);
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
    if (!selectedRowKeys.length) {
      return;
    }
    message.success(`已添加 ${selectedRowKeys.length} 个物料到领料单草稿`);
  };

  const handleShowDetails = () => {
    if (selectedRows.length !== 1) {
      return;
    }
    const record = selectedRows[0];
    message.info(`${record.materialName} 的进出明细将在后续版本提供`);
  };

  const handleExport = () => {
    message.success('已生成物料库存导出任务，稍后可在下载中心查看');
  };

  const columns: ColumnsType<MaterialStockListItem> = useMemo(() => [
    {
      title: '物料图片',
      dataIndex: 'imageUrl',
      width: 96,
      render: (value, record) => (
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 8,
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
              alt={record.materialName}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <Tag color="default" bordered={false}>
              暂无图片
            </Tag>
          )}
        </div>
      ),
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

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card bordered={false} bodyStyle={{ padding: 0 }}>
        <Tabs
          items={tabItems.map((tab) => ({ key: tab.value, label: tab.label }))}
          activeKey={materialType}
          onChange={handleTabChange}
        />
        <div style={{ padding: '0 24px 24px' }}>
          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            <Col flex="auto">
              <Space size={12} wrap>
                <Button
                  type="primary"
                  icon={<ShoppingOutlined />}
                  disabled={!selectedRowKeys.length}
                  onClick={handleMaterialRequisition}
                >
                  领料出库
                </Button>
                <Button
                  icon={<ProfileOutlined />}
                  disabled={selectedRows.length !== 1}
                  onClick={handleShowDetails}
                >
                  显示进出明细
                </Button>
                <Button icon={<DownloadOutlined />} onClick={handleExport}>
                  导出Excel
                </Button>
                <Space size={8} align="center">
                  <Switch checked={onlyInStock} onChange={handleOnlyInStockChange} />
                  <Text>仅显示有库存</Text>
                </Space>
              </Space>
            </Col>
          </Row>

          <Card bordered style={{ marginBottom: 16 }}>
            <Row gutter={[16, 16]} align="middle" wrap>
              <Col xs={24} sm={12} md={6}>
                <Input
                  allowClear
                  placeholder="备注"
                  value={remarkKeyword}
                  onChange={(event) => setRemarkKeyword(event.target.value)}
                />
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Input
                  allowClear
                  placeholder="订单/款式"
                  value={orderKeyword}
                  onChange={(event) => setOrderKeyword(event.target.value)}
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

          <Table<MaterialStockListItem>
            rowKey="id"
            loading={tableLoading}
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
            scroll={{ x: 1200 }}
          />
        </div>
      </Card>
    </Space>
  );
};

export default MaterialStock;
