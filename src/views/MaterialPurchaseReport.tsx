import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ColumnsType } from 'antd/es/table';
import type { RangeValue } from 'rc-picker/lib/interface';
import type { Dayjs } from 'dayjs';
import {
  Button,
  Card,
  Checkbox,
  Col,
  DatePicker,
  Input,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import { DownloadOutlined, SearchOutlined } from '@ant-design/icons';
import { materialPurchaseReportService } from '../api/mock';
import type {
  MaterialPurchaseReportListItem,
  MaterialPurchaseReportListParams,
  MaterialPurchaseReportListResponse,
  MaterialPurchaseReportMeta,
  PurchaseDateFilterType,
} from '../types/material-purchase-report';

const { RangePicker } = DatePicker;
const { Text } = Typography;

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 20, 50];

const PURCHASE_TYPE_COLORS: Record<string, string> = {
  备料采购: 'processing',
  按单采购: 'success',
};

const CURRENCY_FORMATTER = new Intl.NumberFormat('zh-CN', {
  style: 'currency',
  currency: 'CNY',
  minimumFractionDigits: 2,
});

const QUANTITY_FORMATTER = new Intl.NumberFormat('zh-CN');

const formatCurrency = (value: number): string => CURRENCY_FORMATTER.format(value ?? 0);
const formatQuantity = (value: number): string => QUANTITY_FORMATTER.format(value ?? 0);

const buildDateParams = (
  dateRange: RangeValue<Dayjs>,
  dateType: PurchaseDateFilterType,
): { startDate?: string; endDate?: string; dateType?: PurchaseDateFilterType } => {
  if (!dateRange || !dateRange[0] || !dateRange[1]) {
    return { dateType };
  }
  return {
    dateType,
    startDate: dateRange[0].startOf('day').format('YYYY-MM-DD'),
    endDate: dateRange[1].endOf('day').format('YYYY-MM-DD'),
  };
};

const MaterialPurchaseReport = () => {
  const [meta, setMeta] = useState<MaterialPurchaseReportMeta | null>(null);
  const [metaLoading, setMetaLoading] = useState(false);
  const [records, setRecords] = useState<MaterialPurchaseReportListItem[]>([]);
  const [tableLoading, setTableLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [total, setTotal] = useState(0);

  const [documentNo, setDocumentNo] = useState('');
  const [styleKeyword, setStyleKeyword] = useState('');
  const [purchaseOrderNo, setPurchaseOrderNo] = useState('');
  const [materialKeyword, setMaterialKeyword] = useState('');
  const [supplierId, setSupplierId] = useState<string | undefined>();
  const [dateRange, setDateRange] = useState<RangeValue<Dayjs>>(null);
  const [filterByInbound, setFilterByInbound] = useState(true);

  const [appliedParams, setAppliedParams] = useState<MaterialPurchaseReportListParams>({
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    dateType: 'inbound',
  });

  useEffect(() => {
    const loadMeta = async () => {
      setMetaLoading(true);
      try {
        const response = await materialPurchaseReportService.getMeta();
        setMeta(response);
      } catch (error) {
        console.error('failed to load purchase report meta', error);
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
      const response: MaterialPurchaseReportListResponse =
        await materialPurchaseReportService.getList(appliedParams);
      setRecords(response.list);
      setTotal(response.total);
    } catch (error) {
      console.error('failed to load purchase report list', error);
      message.error('获取物料采购入库明细失败');
    } finally {
      setTableLoading(false);
    }
  }, [appliedParams]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const handleSearch = () => {
    const trimmedDocument = documentNo.trim();
    const trimmedStyle = styleKeyword.trim();
    const trimmedOrder = purchaseOrderNo.trim();
    const trimmedMaterial = materialKeyword.trim();
    const dateType: PurchaseDateFilterType = filterByInbound ? 'inbound' : 'purchase';
    const dateParams = buildDateParams(dateRange, dateType);

    setAppliedParams({
      page: 1,
      pageSize,
      documentNo: trimmedDocument || undefined,
      styleKeyword: trimmedStyle || undefined,
      purchaseOrderNo: trimmedOrder || undefined,
      materialKeyword: trimmedMaterial || undefined,
      supplierId: supplierId || undefined,
      ...dateParams,
    });
    setPage(1);
  };

  const handleReset = () => {
    setDocumentNo('');
    setStyleKeyword('');
    setPurchaseOrderNo('');
    setMaterialKeyword('');
    setSupplierId(undefined);
    setDateRange(null);
    setFilterByInbound(true);
    setPage(1);
    setPageSize(DEFAULT_PAGE_SIZE);
    setAppliedParams({ page: 1, pageSize: DEFAULT_PAGE_SIZE, dateType: 'inbound' });
  };

  const handleTableChange = (nextPage: number, nextPageSize?: number) => {
    const committedPageSize = nextPageSize ?? pageSize;
    setPage(nextPage);
    setPageSize(committedPageSize);
    setAppliedParams((prev) => ({ ...prev, page: nextPage, pageSize: committedPageSize }));
  };

  const handleExport = () => {
    message.success('已生成导出任务，请稍后在下载中心查看');
  };

  const columns: ColumnsType<MaterialPurchaseReportListItem> = useMemo(() => [
    {
      title: '采购类型',
      dataIndex: 'purchaseTypeLabel',
      width: 120,
      render: (value: string) => <Tag color={PURCHASE_TYPE_COLORS[value] ?? 'blue'}>{value}</Tag>,
    },
    {
      title: '采购单号',
      dataIndex: 'purchaseOrderNo',
      width: 160,
    },
    {
      title: '采购时间',
      dataIndex: 'purchaseTime',
      width: 180,
    },
    {
      title: '单据号',
      dataIndex: 'documentNo',
      width: 160,
    },
    {
      title: '款号',
      dataIndex: 'styleNo',
      width: 120,
    },
    {
      title: '款名',
      dataIndex: 'styleName',
      width: 200,
      ellipsis: true,
    },
    {
      title: '供应商',
      dataIndex: 'supplierName',
      width: 160,
    },
    {
      title: '供应商型号',
      dataIndex: 'supplierModel',
      width: 140,
      render: (value?: string) => value || <Text type="secondary">-</Text>,
    },
    {
      title: '供应商色号',
      dataIndex: 'supplierColor',
      width: 140,
      render: (value?: string) => value || <Text type="secondary">-</Text>,
    },
    {
      title: '物料类型',
      dataIndex: 'materialType',
      width: 120,
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
      title: '幅宽',
      dataIndex: 'width',
      width: 110,
      render: (value?: string) => value || <Text type="secondary">-</Text>,
    },
    {
      title: '克重',
      dataIndex: 'weight',
      width: 110,
      render: (value?: string) => value || <Text type="secondary">-</Text>,
    },
    {
      title: '采购数',
      dataIndex: 'orderedQty',
      width: 120,
      align: 'right',
      render: (value: number) => formatQuantity(value),
    },
    {
      title: '采购单位',
      dataIndex: 'unit',
      width: 100,
      align: 'center',
    },
    {
      title: '采购单价',
      dataIndex: 'unitPrice',
      width: 140,
      align: 'right',
      render: (value: number) => formatCurrency(value),
    },
    {
      title: '采购金额',
      dataIndex: 'orderedAmount',
      width: 160,
      align: 'right',
      render: (value: number) => formatCurrency(value),
    },
    {
      title: '入库时间',
      dataIndex: 'inboundTime',
      width: 180,
      render: (value?: string) => value || <Text type="secondary">-</Text>,
    },
    {
      title: '入库数',
      dataIndex: 'inboundQty',
      width: 120,
      align: 'right',
      render: (value: number) => formatQuantity(value),
    },
    {
      title: '入库金额',
      dataIndex: 'inboundAmount',
      width: 160,
      align: 'right',
      render: (value: number) => formatCurrency(value),
    },
  ], []);

  const supplierOptions = useMemo(
    () =>
      meta?.suppliers.map((supplier) => ({
        label: supplier.name,
        value: supplier.id,
      })) ?? [],
    [meta?.suppliers],
  );

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card title="物料采购入库明细表" bordered={false}>
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Row gutter={[16, 16]} wrap>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Input
                allowClear
                value={documentNo}
                onChange={(event) => setDocumentNo(event.target.value)}
                placeholder="单据号"
              />
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Input
                allowClear
                value={styleKeyword}
                onChange={(event) => setStyleKeyword(event.target.value)}
                placeholder="款号/款名"
              />
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Input
                allowClear
                value={purchaseOrderNo}
                onChange={(event) => setPurchaseOrderNo(event.target.value)}
                placeholder="采购单号"
              />
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Input
                allowClear
                value={materialKeyword}
                onChange={(event) => setMaterialKeyword(event.target.value)}
                placeholder="物料名称/编码"
              />
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Select
                allowClear
                showSearch
                placeholder="供应商"
                value={supplierId}
                onChange={(value) => setSupplierId(value)}
                options={supplierOptions}
                loading={metaLoading}
                optionFilterProp="label"
              />
            </Col>
            <Col xs={24} sm={12} md={8} lg={8}>
              <Space direction="vertical" size={4} style={{ width: '100%' }}>
                <RangePicker
                  allowClear
                  style={{ width: '100%' }}
                  value={dateRange}
                  onChange={(value) => setDateRange(value)}
                  placeholder={['开始日期', '结束日期']}
                />
                <Checkbox
                  checked={filterByInbound}
                  onChange={(event) => setFilterByInbound(event.target.checked)}
                >
                  按入库时间
                </Checkbox>
              </Space>
            </Col>
          </Row>
          <Space size={12}>
            <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
              搜索
            </Button>
            <Button onClick={handleReset}>重置</Button>
            <Button icon={<DownloadOutlined />} onClick={handleExport}>
              导出Excel
            </Button>
          </Space>
        </Space>
      </Card>

      <Card bordered={false}>
        <Table<MaterialPurchaseReportListItem>
          rowKey="id"
          loading={tableLoading}
          dataSource={records}
          columns={columns}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            pageSizeOptions: PAGE_SIZE_OPTIONS.map(String),
            onChange: handleTableChange,
            showTotal: (value) => `共 ${value} 条`,
          }}
          scroll={{ x: 1800 }}
        />
      </Card>
    </Space>
  );
};

export default MaterialPurchaseReport;
