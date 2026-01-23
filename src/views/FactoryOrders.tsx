import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ColumnsType } from 'antd/es/table';
import type { ProgressProps } from 'antd/es/progress';
import type { UploadFile } from 'antd/es/upload/interface';
import type { RcFile } from 'antd/es/upload';
import {
  Alert,
  Button,
  Checkbox,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Pagination,
  Progress,
  Segmented,
  Select,
  Skeleton,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
  Upload,
  message,
} from 'antd';
import {
  DownloadOutlined,
  ImportOutlined,
  InfoCircleOutlined,
  PlusOutlined,
  SearchOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import type { CheckboxChangeEvent } from 'antd/es/checkbox';
import type {
  FactoryOrderItem,
  FactoryOrderMetric,
  FactoryOrderProgress,
  FactoryOrderStatusSummary,
  FactoryOrderTableRow,
} from '../types';
import { factoryOrdersApi } from '../api/factory-orders';
import '../styles/factory-orders.css';
import ListImage from '../components/common/ListImage';

type ViewMode = 'card' | 'table';

const sortOptions = [
  { label: '预计交货（近 → 远）', value: 'delivery-asc' },
  { label: '预计交货（远 → 近）', value: 'delivery-desc' },
  { label: '下单时间（新 → 旧）', value: 'order-desc' },
  { label: '下单时间（旧 → 新）', value: 'order-asc' },
];

const statusColorMap: Record<NonNullable<FactoryOrderProgress['status']>, string> = {
  default: '#d9d9d9',
  success: '#52c41a',
  warning: '#fa8c16',
  danger: '#ff4d4f',
};

const progressStatusLabel: Record<NonNullable<FactoryOrderProgress['status']>, ProgressProps['status']> = {
  default: 'normal',
  success: 'success',
  warning: 'active',
  danger: 'exception',
};

const getMaterialTagColor = (status: string) => {
  if (status.includes('未采购')) return 'volcano';
  if (status.includes('采购中')) return 'orange';
  if (status.includes('已入仓') || status.includes('齐备')) return 'green';
  return 'default';
};

const { Paragraph, Text } = Typography;

type ImportRecord = {
  orderNo: string;
  styleId: number;
  customerId: number;
  merchandiserId?: number;
  factoryId?: number;
  totalQuantity: number;
  expectedDelivery?: string;
  status?: string;
  materialStatus?: string;
  remarks?: string;
};

const statusOptionsList = [
  { label: '待排产', value: 'RELEASED' },
  { label: '生产中', value: 'IN_PROGRESS' },
  { label: '已完工', value: 'COMPLETED' },
  { label: '已取消', value: 'CANCELLED' },
];

const materialStatusOptions = [
  { label: '待齐备', value: 'PENDING' },
  { label: '齐备中', value: 'ALLOCATING' },
  { label: '已齐备', value: 'ALLOCATED' },
  { label: '已发料', value: 'ISSUED' },
];

const FactoryOrders = () => {
  const [metrics, setMetrics] = useState<FactoryOrderMetric[]>([]);
  const [statusTabs, setStatusTabs] = useState<FactoryOrderStatusSummary[]>([]);
  const [cardOrders, setCardOrders] = useState<FactoryOrderItem[]>([]);
  const [cardTotal, setCardTotal] = useState(0);
  const [cardPage, setCardPage] = useState(1);
  const [cardPageSize, setCardPageSize] = useState(6);
  const [tableOrders, setTableOrders] = useState<FactoryOrderTableRow[]>([]);
  const [tableTotal, setTableTotal] = useState(0);
  const [tablePage, setTablePage] = useState(1);
  const [tablePageSize, setTablePageSize] = useState(10);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingCards, setLoadingCards] = useState(false);
  const [loadingTable, setLoadingTable] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [appliedKeyword, setAppliedKeyword] = useState('');
  const [includeCompleted, setIncludeCompleted] = useState(false);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [activeStatus, setActiveStatus] = useState('RELEASED');
  const [sortKey, setSortKey] = useState(sortOptions[0].value);
  const [viewMode, setViewMode] = useState<ViewMode>('card');
  const [reloadFlag, setReloadFlag] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [importModal, setImportModal] = useState<{
    open: boolean;
    records: ImportRecord[];
    fileList: UploadFile[];
    uploading: boolean;
    error?: string;
  }>({ open: false, records: [], fileList: [], uploading: false });
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [statusSubmitting, setStatusSubmitting] = useState(false);
  const [statusForm] = Form.useForm();

  const fetchSummary = useCallback(() => {
    let cancelled = false;
    const loadSummary = async () => {
      setLoadingSummary(true);
      try {
        const data = await factoryOrdersApi.getSummary();
        if (cancelled) {
          return;
        }
        setMetrics(data.metrics);
        setStatusTabs(data.statusTabs);
        if (data.statusTabs.length > 0) {
          setActiveStatus((prev) =>
            data.statusTabs.some((tab) => tab.key === prev) ? prev : data.statusTabs[0].key,
          );
        }
      } catch (err) {
        console.error('failed to fetch factory order summary', err);
        if (!cancelled) {
          message.error('获取工厂订单概览失败，请稍后重试');
        }
      } finally {
        if (!cancelled) {
          setLoadingSummary(false);
        }
      }
    };
    void loadSummary();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const cancel = fetchSummary();
    return cancel;
  }, [fetchSummary, reloadFlag]);

  useEffect(() => {
    let cancelled = false;
    const loadCards = async () => {
      setLoadingCards(true);
      try {
        const response = await factoryOrdersApi.getCards({
          status: activeStatus,
          keyword: appliedKeyword,
          includeCompleted,
          sort: sortKey,
          page: cardPage,
          pageSize: cardPageSize,
        });
        if (cancelled) {
          return;
        }
        setCardOrders(response.list);
        setCardTotal(response.total);
      } catch (err) {
        console.error('failed to fetch factory order cards', err);
        if (!cancelled) {
          message.error('获取工厂订单卡片失败，请稍后重试');
        }
      } finally {
        if (!cancelled) {
          setLoadingCards(false);
        }
      }
    };
    void loadCards();
    return () => {
      cancelled = true;
    };
  }, [activeStatus, appliedKeyword, includeCompleted, sortKey, cardPage, cardPageSize, reloadFlag]);

  useEffect(() => {
    let cancelled = false;
    const loadTable = async () => {
      setLoadingTable(true);
      try {
        const response = await factoryOrdersApi.getTable({
          status: activeStatus,
          keyword: appliedKeyword,
          includeCompleted,
          sort: sortKey,
          page: tablePage,
          pageSize: tablePageSize,
        });
        if (cancelled) {
          return;
        }
        setTableOrders(response.list);
        setTableTotal(response.total);
      } catch (err) {
        console.error('failed to fetch factory order table rows', err);
        if (!cancelled) {
          message.error('获取工厂订单表格失败，请稍后重试');
        }
      } finally {
        if (!cancelled) {
          setLoadingTable(false);
        }
      }
    };
    void loadTable();
    return () => {
      cancelled = true;
    };
  }, [activeStatus, appliedKeyword, includeCompleted, sortKey, tablePage, tablePageSize, reloadFlag]);

  const currentVisibleIds = useMemo(
    () => (viewMode === 'card'
      ? cardOrders.map((order) => order.id)
      : tableOrders.map((record) => record.id)),
    [viewMode, cardOrders, tableOrders],
  );

  const visibleSelectedCount = currentVisibleIds.filter((id) => selectedOrderIds.includes(id)).length;
  const allVisibleSelected = currentVisibleIds.length > 0 && visibleSelectedCount === currentVisibleIds.length;
  const indeterminate = visibleSelectedCount > 0 && visibleSelectedCount < currentVisibleIds.length;

  const resetPagination = useCallback(() => {
    setCardPage(1);
    setTablePage(1);
  }, []);

  const handleSearch = (value: string) => {
    setSearchValue(value);
    setAppliedKeyword(value.trim());
    resetPagination();
  };

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    if (!value) {
      setAppliedKeyword('');
      resetPagination();
    }
  };

  const handleIncludeCompletedChange = (event: CheckboxChangeEvent) => {
    setIncludeCompleted(event.target.checked);
    resetPagination();
  };

  const handleToggleOrder = (orderId: string, checked: boolean) => {
    setSelectedOrderIds((prev) => {
      if (checked) {
        if (prev.includes(orderId)) return prev;
        return [...prev, orderId];
      }
      return prev.filter((id) => id !== orderId);
    });
  };

  const handleToggleVisible = (event: CheckboxChangeEvent) => {
    const { checked } = event.target;
    if (checked) {
      setSelectedOrderIds((prev) => Array.from(new Set([...prev, ...currentVisibleIds])));
      return;
    }
    const visibleSet = new Set(currentVisibleIds);
    setSelectedOrderIds((prev) => prev.filter((id) => !visibleSet.has(id)));
  };

  const triggerReload = () => {
    setReloadFlag((flag) => flag + 1);
  };

  const handleExport = async (selectedOnly: boolean) => {
    if (selectedOnly && selectedOrderIds.length === 0) {
      message.warning('请先勾选需要导出的订单');
      return;
    }
    try {
      setExporting(true);
      const response = await factoryOrdersApi.exportOrders({
        status: activeStatus,
        keyword: appliedKeyword,
        includeCompleted,
        sort: sortKey,
        orderIds: selectedOnly ? selectedOrderIds : undefined,
      });
      if (response.fileUrl) {
        message.success(`已生成导出文件：${response.fileUrl}`);
      } else {
        message.success('已生成导出任务，请稍后在下载中心查看');
      }
    } catch (error) {
      console.error('failed to export factory orders', error);
      message.error('导出失败，请稍后重试');
    } finally {
      setExporting(false);
    }
  };

  const handleOpenImport = () => {
    setImportModal((prev) => ({ ...prev, open: true }));
  };

  const handleCloseImport = () => {
    setImportModal({ open: false, records: [], fileList: [], uploading: false });
  };

  const handleImportBeforeUpload = (file: RcFile) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const content = typeof reader.result === 'string' ? reader.result : '';
        const parsed = JSON.parse(content);
        const normalized: ImportRecord[] = Array.isArray(parsed)
          ? parsed
              .map((item) => ({
                orderNo: String(item.orderNo ?? '').trim(),
                styleId: Number(item.styleId),
                customerId: Number(item.customerId),
                merchandiserId: item.merchandiserId ? Number(item.merchandiserId) : undefined,
                factoryId: item.factoryId ? Number(item.factoryId) : undefined,
                totalQuantity: Number(item.totalQuantity ?? 0),
                expectedDelivery: item.expectedDelivery,
                status: item.status,
                materialStatus: item.materialStatus,
                remarks: item.remarks,
              }))
              .filter((record) => record.orderNo && Number.isFinite(record.styleId) && Number.isFinite(record.customerId) && Number.isFinite(record.totalQuantity) && record.totalQuantity > 0)
          : [];
        if (!normalized.length) {
          throw new Error('文件内容为空或格式不正确');
        }
        setImportModal((prev) => ({
          ...prev,
          records: normalized,
          fileList: [{ uid: file.uid, name: file.name, status: 'done' }],
          error: undefined,
        }));
      } catch (error) {
        const messageText = error instanceof Error ? error.message : '无法解析文件内容';
        setImportModal((prev) => ({ ...prev, error: messageText, records: [], fileList: [] }));
      }
    };
    reader.readAsText(file, 'utf-8');
    return false;
  };

  const handleConfirmImport = async () => {
    if (!importModal.records.length) {
      message.warning('请先上传包含订单数据的 JSON 文件');
      return;
    }
    setImportModal((prev) => ({ ...prev, uploading: true }));
    try {
      const result = await factoryOrdersApi.importOrders({ orders: importModal.records });
      message.success(`导入完成：新增 ${result.created} 条，更新 ${result.updated} 条`);
      handleCloseImport();
      triggerReload();
    } catch (error) {
      console.error('failed to import factory orders', error);
      message.error('导入失败，请稍后重试');
      setImportModal((prev) => ({ ...prev, uploading: false }));
    }
  };

  const handleOpenStatusModal = () => {
    if (!selectedOrderIds.length) {
      message.warning('请先勾选需要设置状态的订单');
      return;
    }
    setStatusModalOpen(true);
  };

  const handleSubmitStatus = async () => {
    try {
      const values = await statusForm.validateFields();
      setStatusSubmitting(true);
      await factoryOrdersApi.batchUpdateStatus({
        orderIds: selectedOrderIds,
        status: values.status,
        materialStatus: values.materialStatus,
        completedQuantity: values.completedQuantity,
        note: values.note,
      });
      message.success('批量更新状态成功');
      setStatusModalOpen(false);
      statusForm.resetFields();
      triggerReload();
    } catch (error) {
      if (error instanceof Error) {
        message.error(error.message);
      } else if (error && typeof error === 'object' && 'errorFields' in error) {
        // 表单校验错误，忽略
      } else {
        console.error('failed to batch update factory order status', error);
        message.error('批量更新状态失败，请稍后重试');
      }
    } finally {
      setStatusSubmitting(false);
    }
  };

  useEffect(() => {
    if (loadingCards || loadingTable) {
      return;
    }
    if (!cardOrders.length && !tableOrders.length) {
      setSelectedOrderIds([]);
      return;
    }
    setSelectedOrderIds((prev) => {
      const validIds = new Set([
        ...cardOrders.map((order) => order.id),
        ...tableOrders.map((record) => record.id),
      ]);
      return prev.filter((id) => validIds.has(id));
    });
  }, [cardOrders, tableOrders, loadingCards, loadingTable]);

  const tabItems = statusTabs.map((tab: FactoryOrderStatusSummary) => ({
    key: tab.key,
    label: (
      <div className="factory-orders-tab-label">
        <div className="title">{tab.label}</div>
        <div className="meta">
          {tab.styles} 款 / {tab.orders} 单 / {tab.quantity.toLocaleString()} 件
        </div>
      </div>
    ),
  }));

  const tableColumns: ColumnsType<FactoryOrderTableRow> = useMemo(() => [
    {
      title: '订单号',
      dataIndex: 'orderCode',
      width: 160,
      fixed: 'left',
      render: (value: string, record) => (
        <Space size={4}>
          <span>{value}</span>
          {record.statusKey === 'overdue' ? <Tag color="volcano">已超期</Tag> : null}
          {record.isCompleted ? <Tag color="green">已完成</Tag> : null}
        </Space>
      ),
    },
    { title: '客户', dataIndex: 'customer', width: 140 },
    { title: '款号', dataIndex: 'styleCode', width: 140 },
    { title: '款名', dataIndex: 'styleName', width: 220, ellipsis: true },
    {
      title: '下单数量',
      dataIndex: 'orderQuantity',
      width: 120,
      align: 'right',
      render: (value: number) => `${value.toLocaleString()} 件`,
    },
    {
      title: '物料状态',
      dataIndex: 'materialStatus',
      width: 140,
      render: (value: string) => <Tag color={getMaterialTagColor(value)}>{value}</Tag>,
    },
    {
      title: '生产进度',
      dataIndex: 'productionPercent',
      width: 200,
      render: (_value: number, record) => (
        <div className="factory-orders-table-progress">
          <Progress percent={record.productionPercent} showInfo={false} size="small" />
          <Text type="secondary" style={{ fontSize: 12 }}>{record.productionStage}</Text>
        </div>
      ),
    },
    { title: '预计交货日期', dataIndex: 'expectedDelivery', width: 160 },
    { title: '跟单员', dataIndex: 'merchandiser', width: 120 },
    {
      title: '操作',
      dataIndex: 'actions',
      fixed: 'right',
      width: 180,
      render: (_value, record) => (
        <Space size={8}>
          <Button
            type="link"
            size="small"
            onClick={() => message.info(`查看大货成本：${record.orderCode}`)}
          >
            大货成本
          </Button>
          <Button
            type="link"
            size="small"
            onClick={() => message.success(`已复制订单：${record.orderCode}`)}
          >
            复制
          </Button>
          <Button
            type="link"
            size="small"
            onClick={() => message.info(`准备打印订单：${record.orderCode}`)}
          >
            打印
          </Button>
        </Space>
      ),
    },
  ], []);

  const rowSelection = useMemo(() => ({
    selectedRowKeys: selectedOrderIds,
    onChange: (keys: React.Key[]) => setSelectedOrderIds(keys.map(String)),
  }), [selectedOrderIds]);

  const renderCardView = () => {
    if (loadingCards && cardOrders.length === 0) {
      return (
        <div className="factory-orders-list">
          {Array.from({ length: cardPageSize }).map((_, index) => (
            <Skeleton key={index} active paragraph={{ rows: 4 }} />
          ))}
        </div>
      );
    }

    if (!loadingCards && cardOrders.length === 0) {
      return <Empty description={appliedKeyword ? '未找到匹配的工厂订单' : '暂无工厂订单'} />;
    }

    return (
      <>
        <div className="factory-orders-list">
          {cardOrders.map((order) => {
            const isChecked = selectedOrderIds.includes(order.id);
            return (
              <article className="factory-order-card" key={order.id}>
                <div className="factory-order-card-header">
                  <div className="factory-order-card-main">
                    <div className="factory-order-checkbox">
                      <Checkbox
                        checked={isChecked}
                        onChange={(event) => handleToggleOrder(order.id, event.target.checked)}
                      />
                    </div>
                    <div className="factory-order-card-info">
                      <ListImage
                        src={order.thumbnail}
                        alt={order.name}
                        wrapperClassName="factory-order-thumbnail"
                        width={null}
                        height={null}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="factory-order-title">{order.name}</div>
                        <Space size={8} wrap>
                          <span className="factory-order-subtitle">订单号：{order.code}</span>
                          {order.customer ? (
                            <span className="factory-order-subtitle">客户：{order.customer}</span>
                          ) : null}
                          {order.expectedDelivery ? (
                            <span className="factory-order-subtitle">预计交货：{order.expectedDelivery}</span>
                          ) : null}
                        </Space>
                        {order.materialStatus ? (
                          <div style={{ marginTop: 4 }}>
                            <Tag color={getMaterialTagColor(order.materialStatus)}>{order.materialStatus}</Tag>
                          </div>
                        ) : null}
                        <div className="factory-order-tags">
                          <Tag color="blue" bordered={false}>
                            {order.quantityLabel}：{order.quantityValue}
                          </Tag>
                          {order.tags?.map((tag) => (
                            <Tag key={`${order.id}-${tag}`} bordered={false}>
                              {tag}
                            </Tag>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="factory-order-actions">
                    <Space size={8} wrap>
                      <Button
                        size="small"
                        type="text"
                        onClick={() => message.info(`查看大货成本：${order.code}`)}
                      >
                        大货成本
                      </Button>
                      <Button
                        size="small"
                        type="text"
                        onClick={() => message.success(`已复制订单：${order.code}`)}
                      >
                        复制
                      </Button>
                      <Button
                        size="small"
                        type="text"
                        onClick={() => message.info(`准备打印订单：${order.code}`)}
                      >
                        打印
                      </Button>
                    </Space>
                  </div>
                </div>

                <div className="factory-order-progress">
                  {order.progress.map((stage) => {
                    const status = stage.status ?? 'default';
                    const wrapClass = ['factory-order-progress-item'];
                    if (stage.muted) {
                      wrapClass.push('factory-order-progress-muted');
                    }
                    const percent = typeof stage.percent === 'number'
                      ? Math.max(0, Math.min(stage.percent, 100))
                      : undefined;
                    return (
                      <div className={wrapClass.join(' ')} key={`${order.id}-${stage.key}`}>
                        <div className="label">
                          <strong>{stage.label}</strong>
                          <span>
                            {[stage.date, stage.value].filter(Boolean).join(' · ')}
                          </span>
                        </div>
                        <div>
                          {typeof percent === 'number' ? (
                            <div style={{ display: 'grid', gap: 6 }}>
                              <Progress
                                percent={percent}
                                status={progressStatusLabel[status]}
                                showInfo={false}
                                strokeColor={statusColorMap[status]}
                                trailColor="#f0f0f0"
                              />
                              <div className="progress-value">{stage.value}</div>
                            </div>
                          ) : (
                            <div className="progress-value">{stage.value}</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </article>
            );
          })}
        </div>
        {cardTotal > cardPageSize ? (
          <div className="factory-orders-pagination">
            <Pagination
              current={cardPage}
              pageSize={cardPageSize}
              total={cardTotal}
              showQuickJumper
              showSizeChanger
              pageSizeOptions={['6', '9', '12']}
              showTotal={(total, range) => `${range[0]}-${range[1]} / 共 ${total} 单`}
              onChange={(page, size) => {
                setCardPage(page);
                if (size) {
                  setCardPageSize(size);
                }
              }}
            />
          </div>
        ) : null}
      </>
    );
  };

  const renderTableView = () => {
    if (!loadingTable && tableOrders.length === 0) {
      return <Empty description={appliedKeyword ? '未找到匹配的工厂订单' : '暂无工厂订单'} />;
    }

    return (
      <Table<FactoryOrderTableRow>
        bordered
        rowKey={(record) => record.id}
        columns={tableColumns}
        dataSource={tableOrders}
        loading={loadingTable}
        rowSelection={rowSelection}
        pagination={{
          current: tablePage,
          pageSize: tablePageSize,
          total: tableTotal,
          showQuickJumper: true,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '40'],
          showTotal: (total, range) => `${range[0]}-${range[1]} / 共 ${total} 单`,
          onChange: (page, size) => {
            setTablePage(page);
            if (size) {
              setTablePageSize(size);
            }
          },
        }}
        scroll={{ x: 1200 }}
      />
    );
  };

  return (
    <div className="factory-orders-page">
      <section className="factory-orders-status-tabs">
        <Tabs
          activeKey={activeStatus}
          items={tabItems}
          onChange={(key) => {
            setActiveStatus(key);
            resetPagination();
          }}
        />
      </section>

      <section className="factory-orders-toolbar">
        <div className="factory-orders-toolbar-left">
          <div className="factory-orders-metrics">
            {loadingSummary && metrics.length === 0 ? (
              <Skeleton active paragraph={{ rows: 2 }} />
            ) : (
              metrics.map((metric: FactoryOrderMetric) => (
                <div
                  key={metric.key}
                  className={`factory-orders-metric-card${metric.tone === 'warning' ? ' warning' : ''}`}
                >
                  <div className="factory-orders-metric-title">{metric.label}</div>
                  <div className="factory-orders-metric-primary">{metric.primaryValue}</div>
                  {metric.secondaryValue ? (
                    <div className="factory-orders-metric-secondary">{metric.secondaryValue}</div>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="factory-orders-toolbar-right">
          <Space size={12} wrap>
            <Button type="primary" icon={<PlusOutlined />}>新建</Button>
            <Button icon={<ImportOutlined />} onClick={handleOpenImport}>导入</Button>
            <Button icon={<DownloadOutlined />} loading={exporting} onClick={() => handleExport(false)}>
              导出
            </Button>
            <Button icon={<DownloadOutlined />} loading={exporting} onClick={() => handleExport(true)}>
              导出所选
            </Button>
            <Button icon={<SettingOutlined />} onClick={handleOpenStatusModal}>设置状态</Button>
          </Space>
        </div>
      </section>

      <section className="factory-orders-control-row">
        <Input.Search
          allowClear
          placeholder="请输入订单号/款号/款名/客户/跟单员"
          enterButton={<SearchOutlined />}
          onSearch={handleSearch}
          onChange={(event) => handleSearchChange(event.target.value)}
          value={searchValue}
        />
        <Checkbox checked={includeCompleted} onChange={handleIncludeCompletedChange}>包含已完成</Checkbox>
        <Select
          className="factory-orders-sort-select"
          options={sortOptions}
          value={sortKey}
          onChange={(value) => {
            setSortKey(value);
            resetPagination();
          }}
        />
        <Segmented
          value={viewMode}
          options={[
            { label: '卡片视图', value: 'card' },
            { label: '表格视图', value: 'table' },
          ]}
          onChange={(value) => setViewMode(value as ViewMode)}
        />
      </section>

      <section className="factory-orders-search-row">
        <Checkbox
          indeterminate={indeterminate}
          checked={allVisibleSelected}
          onChange={handleToggleVisible}
        >
          仅勾选当前视图列表
        </Checkbox>
      </section>

      <div className="factory-orders-legend">
        图例说明：绿色-成功 / 橙色-提醒 / 红色-异常
      </div>

      {viewMode === 'card' ? renderCardView() : renderTableView()}

      {includeCompleted ? (
        <Paragraph style={{ marginTop: 16 }} type="secondary">
          <InfoCircleOutlined style={{ marginRight: 6 }} />
          已展示包含已完工订单的数据，关闭后仅查看「已下发 / 生产中」状态下的记录。
        </Paragraph>
      ) : null}

      <Modal
        open={importModal.open}
        title="导入工厂订单"
        onCancel={handleCloseImport}
        onOk={handleConfirmImport}
        confirmLoading={importModal.uploading}
        destroyOnHidden
        width={720}
      >
        <Upload.Dragger
          accept=".json,application/json"
          multiple={false}
          beforeUpload={handleImportBeforeUpload}
          fileList={importModal.fileList}
          onRemove={() => {
            setImportModal((prev) => ({ ...prev, fileList: [], records: [] }));
            return true;
          }}
        >
          <p className="ant-upload-drag-icon">
            <ImportOutlined />
          </p>
          <p className="ant-upload-text">点击或拖拽 JSON 文件到此处完成导入</p>
          <p className="ant-upload-hint">支持字段：orderNo、styleId、customerId、merchandiserId、factoryId、totalQuantity、expectedDelivery、status、materialStatus、remarks</p>
        </Upload.Dragger>
        {importModal.error ? (
          <Alert type="error" showIcon style={{ marginTop: 16 }} message={importModal.error} />
        ) : null}
        {importModal.records.length ? (
          <Table<ImportRecord>
            style={{ marginTop: 16 }}
            size="small"
            bordered
            rowKey={(record) => record.orderNo}
            dataSource={importModal.records}
            pagination={false}
            columns={[
              { title: '订单号', dataIndex: 'orderNo' },
              { title: '款式 ID', dataIndex: 'styleId' },
              { title: '客户 ID', dataIndex: 'customerId' },
              { title: '数量', dataIndex: 'totalQuantity' },
              { title: '预计交期', dataIndex: 'expectedDelivery' },
              { title: '状态', dataIndex: 'status' },
              { title: '物料状态', dataIndex: 'materialStatus' },
            ]}
          />
        ) : null}
      </Modal>

      <Modal
        open={statusModalOpen}
        title="批量设置状态"
        onCancel={() => setStatusModalOpen(false)}
        onOk={handleSubmitStatus}
        confirmLoading={statusSubmitting}
        destroyOnHidden
      >
        <Form form={statusForm} layout="vertical">
          <Form.Item label="订单状态" name="status">
            <Select allowClear options={statusOptionsList} placeholder="请选择需要设置的订单状态" />
          </Form.Item>
          <Form.Item label="物料状态" name="materialStatus">
            <Select allowClear options={materialStatusOptions} placeholder="请选择物料状态" />
          </Form.Item>
          <Form.Item label="已完成数量" name="completedQuantity">
            <InputNumber min={0} style={{ width: '100%' }} placeholder="填写时将覆盖当前完成数量" />
          </Form.Item>
          <Form.Item label="备注" name="note">
            <Input.TextArea rows={3} placeholder="可选，方便记录操作人" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default FactoryOrders;
