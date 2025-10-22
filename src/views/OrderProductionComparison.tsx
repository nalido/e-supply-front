import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ColumnsType, TableProps } from 'antd/es/table';
import { Button, Card, Input, Space, Table, Typography, message } from 'antd';
import { DownloadOutlined, SearchOutlined } from '@ant-design/icons';
import type {
  ProductionComparisonListParams,
  ProductionComparisonRecord,
  ProductionComparisonStage,
  ProductionComparisonSummary,
} from '../types/order-production-comparison';
import { productionComparisonService } from '../api/mock';

const { Text } = Typography;

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 20, 50];

const numberFormatter = new Intl.NumberFormat('zh-CN');

const renderNumber = (value?: number) => numberFormatter.format(value ?? 0);

const OrderProductionComparison = () => {
  const [keyword, setKeyword] = useState('');
  const [appliedKeyword, setAppliedKeyword] = useState<string | undefined>();
  const [records, setRecords] = useState<ProductionComparisonRecord[]>([]);
  const [stages, setStages] = useState<ProductionComparisonStage[]>([]);
  const [summary, setSummary] = useState<ProductionComparisonSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [total, setTotal] = useState(0);
  const [sortState, setSortState] = useState<{
    sortBy?: ProductionComparisonListParams['sortBy'];
    order?: 'ascend' | 'descend';
  }>({});

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const response = await productionComparisonService.getList({
        keyword: appliedKeyword,
        page,
        pageSize,
        sortBy: sortState.sortBy,
        order: sortState.order,
      });
      setRecords(response.list);
      setStages(response.stages);
      setSummary(response.summary);
      setTotal(response.total);
    } catch (error) {
      console.error('failed to load production comparison list', error);
      message.error('获取订单生产对照表失败');
    } finally {
      setLoading(false);
    }
  }, [appliedKeyword, page, pageSize, sortState.order, sortState.sortBy]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const handleSearch = () => {
    const normalized = keyword.trim();
    setAppliedKeyword(normalized || undefined);
    setPage(1);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await productionComparisonService.export({
        keyword: appliedKeyword,
        page,
        pageSize,
        sortBy: sortState.sortBy,
        order: sortState.order,
      });
      message.success('已生成导出任务，请稍后到下载中心查看');
    } catch (error) {
      console.error('failed to export production comparison list', error);
      message.error('导出失败，请稍后重试');
    } finally {
      setExporting(false);
    }
  };

  const handleTableChange: TableProps<ProductionComparisonRecord>['onChange'] = (
    pagination,
    _filters,
    sorter,
  ) => {
    if (pagination) {
      const nextPage = pagination.current ?? 1;
      const nextPageSize = pagination.pageSize ?? pageSize;
      if (nextPageSize !== pageSize) {
        setPageSize(nextPageSize);
        setPage(1);
      } else if (nextPage !== page) {
        setPage(nextPage);
      }
    }

    const normalizedSorter = Array.isArray(sorter) ? sorter[0] : sorter;

    if (normalizedSorter && normalizedSorter.order) {
      const columnKey =
        typeof normalizedSorter.columnKey === 'string'
          ? normalizedSorter.columnKey
          : undefined;

      if (columnKey) {
        if (
          columnKey !== sortState.sortBy ||
          normalizedSorter.order !== sortState.order
        ) {
          setPage(1);
        }
        setSortState({
          sortBy: columnKey as ProductionComparisonListParams['sortBy'],
          order: normalizedSorter.order,
        });
        return;
      }
    }

    if (sortState.sortBy || sortState.order) {
      setPage(1);
    }
    setSortState({ sortBy: undefined, order: undefined });
  };

  const columns: ColumnsType<ProductionComparisonRecord> = useMemo(() => {
    const stageColumns = stages.map((stage) => ({
      title: stage.name,
      dataIndex: ['progress', stage.key],
      key: `progress.${stage.key}`,
      width: 140,
      align: 'right' as const,
      sorter: true,
      sortOrder: sortState.sortBy === `progress.${stage.key}` ? sortState.order : undefined,
      render: (value: number) => renderNumber(value),
    }));

    return [
      {
        title: '序号',
        dataIndex: 'index',
        key: 'index',
        width: 72,
        fixed: 'left' as const,
        align: 'right' as const,
        render: (_value, _record, rowIndex) => (page - 1) * pageSize + rowIndex + 1,
      },
      {
        title: '图片',
        dataIndex: 'imageUrl',
        key: 'imageUrl',
        width: 96,
        fixed: 'left' as const,
        render: (value: string, record) => (
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
                alt={record.styleName}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <Text type="secondary">暂无图片</Text>
            )}
          </div>
        ),
      },
      {
        title: '工厂订单',
        dataIndex: 'orderNumber',
        key: 'orderNumber',
        width: 180,
        fixed: 'left' as const,
        render: (value: string) => <Text strong>{value}</Text>,
      },
      {
        title: '订单状态',
        dataIndex: 'orderStatus',
        key: 'orderStatus',
        width: 140,
      },
      {
        title: '物料状态',
        dataIndex: 'materialStatus',
        key: 'materialStatus',
        width: 140,
      },
      {
        title: '客户',
        dataIndex: 'customer',
        key: 'customer',
        width: 160,
      },
      {
        title: '跟单员',
        dataIndex: 'merchandiser',
        key: 'merchandiser',
        width: 140,
      },
      {
        title: '款号',
        dataIndex: 'styleNumber',
        key: 'styleNumber',
        width: 140,
        render: (value: string) => <Text>{value}</Text>,
      },
      {
        title: '款名',
        dataIndex: 'styleName',
        key: 'styleName',
        width: 200,
        ellipsis: true,
      },
      {
        title: '下单日期',
        dataIndex: 'orderDate',
        key: 'orderDate',
        width: 140,
      },
      {
        title: '预计交货',
        dataIndex: 'expectedDelivery',
        key: 'expectedDelivery',
        width: 140,
      },
      {
        title: '订单数',
        dataIndex: 'orderQty',
        key: 'orderQty',
        width: 120,
        align: 'right' as const,
        sorter: true,
        sortOrder: sortState.sortBy === 'orderQty' ? sortState.order : undefined,
        render: (value: number) => renderNumber(value),
      },
      {
        title: '单位',
        dataIndex: 'unit',
        key: 'unit',
        width: 80,
        align: 'center' as const,
      },
      {
        title: '预裁数',
        dataIndex: 'plannedCutQty',
        key: 'plannedCutQty',
        width: 120,
        align: 'right' as const,
        sorter: true,
        sortOrder: sortState.sortBy === 'plannedCutQty' ? sortState.order : undefined,
        render: (value: number) => renderNumber(value),
      },
      ...stageColumns,
      {
        title: '入库',
        dataIndex: 'warehousingQty',
        key: 'warehousingQty',
        width: 120,
        align: 'right' as const,
        sorter: true,
        sortOrder: sortState.sortBy === 'warehousingQty' ? sortState.order : undefined,
        render: (value: number) => renderNumber(value),
      },
      {
        title: '出库',
        dataIndex: 'deliveryQty',
        key: 'deliveryQty',
        width: 120,
        align: 'right' as const,
        sorter: true,
        sortOrder: sortState.sortBy === 'deliveryQty' ? sortState.order : undefined,
        render: (value: number) => renderNumber(value),
      },
      {
        title: '库存',
        dataIndex: 'inventoryQty',
        key: 'inventoryQty',
        width: 120,
        align: 'right' as const,
        sorter: true,
        sortOrder: sortState.sortBy === 'inventoryQty' ? sortState.order : undefined,
        render: (value: number) => renderNumber(value),
      },
    ];
  }, [page, pageSize, sortState.order, sortState.sortBy, stages]);

  const tableSummary = useMemo(() => {
    if (!summary) {
      return undefined;
    }

    return (
      <Table.Summary fixed>
        <Table.Summary.Row>
          {columns.map((column, columnIndex) => {
            if (columnIndex === 0) {
              return (
                <Table.Summary.Cell key="summary-label" index={0} colSpan={2}>
                  <Text strong>合计</Text>
                </Table.Summary.Cell>
              );
            }

            if (columnIndex === 1) {
              return <Table.Summary.Cell key="summary-image" index={1} colSpan={0} />;
            }

            const key = column.key;
            let value: number | string | null = null;

            if (key === 'orderQty') {
              value = summary.orderQty;
            } else if (key === 'plannedCutQty') {
              value = summary.plannedCutQty;
            } else if (key && key.startsWith('progress.')) {
              const progressKey = key.split('.')[1];
              value = summary.progress[progressKey] ?? 0;
            } else if (key === 'warehousingQty') {
              value = summary.warehousingQty;
            } else if (key === 'deliveryQty') {
              value = summary.deliveryQty;
            } else if (key === 'inventoryQty') {
              value = summary.inventoryQty;
            }

            const display = typeof value === 'number' ? renderNumber(value) : value ?? '';

            return (
              <Table.Summary.Cell key={`summary-${String(key ?? columnIndex)}`} index={columnIndex}>
                <Text>{display}</Text>
              </Table.Summary.Cell>
            );
          })}
        </Table.Summary.Row>
      </Table.Summary>
    );
  }, [columns, summary]);

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card bordered={false}>
        <Space size={12} wrap>
          <Input
            style={{ width: 320 }}
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            onPressEnter={handleSearch}
            allowClear
            prefix={<SearchOutlined />}
            placeholder="请输入订单号/款号/款名/客户"
          />
          <Button type="primary" onClick={handleSearch} loading={loading} icon={<SearchOutlined />}>
            筛选
          </Button>
          <Button onClick={handleExport} icon={<DownloadOutlined />} loading={exporting}>
            导出Excel
          </Button>
        </Space>
      </Card>

      <Card bordered={false}>
        <Table<ProductionComparisonRecord>
          rowKey="id"
          columns={columns}
          dataSource={records}
          loading={loading}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            pageSizeOptions: PAGE_SIZE_OPTIONS.map(String),
            showTotal: (count) => `共 ${count} 条记录`,
          }}
          scroll={{ x: 'max-content' }}
          onChange={handleTableChange}
          summary={() => tableSummary}
        />
      </Card>
    </Space>
  );
};

export default OrderProductionComparison;
