import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Dropdown,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Pagination,
  Select,
  Skeleton,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import type { MenuProps } from 'antd';
import { useNavigate } from 'react-router-dom';
import {
  CalendarOutlined,
  CheckCircleTwoTone,
  ExclamationCircleOutlined,
  MoreOutlined,
  PictureOutlined,
  ScissorOutlined,
  SearchOutlined,
  UserOutlined,
} from '@ant-design/icons';
import type { CuttingSheetDetail, CuttingTask, CuttingTaskDataset, CuttingTaskMetric } from '../types';
import { pieceworkService } from '../api/piecework';
import warehouseApi from '../api/warehouse';
import { settingsApi } from '../api/settings';
import { materialStockService } from '../api/material-inventory';
import '../styles/cutting-pending.css';
import ListImage from '../components/common/ListImage';

const { Text } = Typography;

const initialDataset: CuttingTaskDataset = {
  summary: [],
  list: [],
  total: 0,
  page: 1,
  pageSize: 4,
};

type ColorPreviewState = {
  open: boolean;
  task?: CuttingTask;
};

type DetailModalState = {
  open: boolean;
  task?: CuttingTask;
};

type StartModalState = {
  open: boolean;
  task?: CuttingTask;
  submitting: boolean;
};

type CompleteModalState = {
  open: boolean;
  task?: CuttingTask;
  submitting: boolean;
};

type MenuClickEvent = Parameters<NonNullable<MenuProps['onClick']>>[0];

const CuttingPendingPage = () => {
  const navigate = useNavigate();
  const [dataset, setDataset] = useState<CuttingTaskDataset>(initialDataset);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [appliedKeyword, setAppliedKeyword] = useState('');
  const [page, setPage] = useState(initialDataset.page);
  const [pageSize, setPageSize] = useState(initialDataset.pageSize);
  const [reloadToken, setReloadToken] = useState(0);
  const [previewState, setPreviewState] = useState<ColorPreviewState>({ open: false });
  const [detailState, setDetailState] = useState<DetailModalState>({ open: false });
  const [startState, setStartState] = useState<StartModalState>({ open: false, submitting: false });
  const [completeState, setCompleteState] = useState<CompleteModalState>({ open: false, submitting: false });
  const [detailLoading, setDetailLoading] = useState(false);
  const [sheetDetail, setSheetDetail] = useState<CuttingSheetDetail | null>(null);
  const [completeQtyMap, setCompleteQtyMap] = useState<Record<string, number>>({});
  const [startForm] = Form.useForm();
  const [completeForm] = Form.useForm();
  const [warehouseOptions, setWarehouseOptions] = useState<Array<{ label: string; value: number }>>([]);
  const [materialOptions, setMaterialOptions] = useState<Array<{ label: string; value: number; unit?: string; availableQty: number }>>([]);
  const [cutterOptions, setCutterOptions] = useState<Array<{ label: string; value: number }>>([]);
  const [warehouseLoading, setWarehouseLoading] = useState(false);
  const [materialLoading, setMaterialLoading] = useState(false);
  const [cutterLoading, setCutterLoading] = useState(false);
  const completeActualFabricQty = Form.useWatch('actualFabricQty', completeForm);
  const startWarehouseId = Form.useWatch('warehouseId', startForm);
  const startMaterialId = Form.useWatch('materialId', startForm);
  const startPlannedFabricQty = Form.useWatch('plannedFabricQty', startForm);

  const buildSpecKey = (color: string, size: string) => `${color}::${size}`;
  const selectedStartMaterial =
    materialOptions.find((option) => option.value === Number(startMaterialId));

  const loadMaterialOptionsByWarehouse = async (warehouseId: number) => {
    setMaterialLoading(true);
    try {
      const response = await materialStockService.getList({
      page: 0,
      pageSize: 500,
      materialType: 'fabric',
      onlyInStock: true,
      });
      const grouped = response.list
        .filter((item) => Number(item.warehouseId) === warehouseId && item.availableQty > 0)
        .reduce<Record<string, { label: string; value: number; unit?: string; availableQty: number }>>((acc, item) => {
            const key = String(item.materialId);
            const current = acc[key];
            const availableQty = Number(item.availableQty ?? 0);
            if (!current) {
              acc[key] = {
                label: `${item.materialCode} / ${item.materialName}（可用 ${availableQty}${item.unit ?? ''}）`,
                value: Number(item.materialId),
                unit: item.unit,
                availableQty,
              };
            } else {
              const mergedQty = current.availableQty + availableQty;
              acc[key] = {
                ...current,
                availableQty: mergedQty,
                label: `${item.materialCode} / ${item.materialName}（可用 ${mergedQty}${item.unit ?? ''}）`,
              };
            }
            return acc;
          }, {});
      const nextOptions = Object.values(grouped);
      setMaterialOptions(nextOptions);
      return nextOptions;
    } catch (error) {
      console.error('failed to load material stock options', error);
      setMaterialOptions([]);
      message.error('加载仓库可用面料失败');
      return [];
    } finally {
      setMaterialLoading(false);
    }
  };

  const openStartModal = async (
    task: CuttingTask,
    preset?: {
      bedNumber?: string;
      cutterId?: number;
      plannedFabricQty?: number;
    },
  ) => {
    if (!task.workOrderId) {
      message.warning('当前任务缺少工单信息，无法开裁');
      return;
    }
    startForm.resetFields();
    setMaterialOptions([]);
    setStartState({ open: true, task, submitting: false });
    startForm.setFieldsValue({
      bedNumber: preset?.bedNumber ?? `BED-${task.orderCode}`,
      cutterId: preset?.cutterId,
      plannedFabricQty: preset?.plannedFabricQty,
      warehouseId: undefined,
      materialId: undefined,
      materialUnit: undefined,
    });
    setWarehouseLoading(true);
    setCutterLoading(true);
    try {
      const [warehouseRes, membersRes] = await Promise.all([
        warehouseApi.list({ page: 1, pageSize: 200, type: 'material', status: 'active' }),
        settingsApi.organization.list({ page: 1, pageSize: 200 }),
      ]);
      const warehouses = warehouseRes.list.map((item) => ({ label: item.name, value: Number(item.id) }));
      setWarehouseOptions(warehouses);
      const members = (membersRes.list ?? [])
        .filter((member) => member.status !== 'inactive')
        .map((member) => ({
          label: member.name || member.username || `用户${member.id}`,
          value: Number(member.id),
        }))
        .filter((option) => Number.isFinite(option.value));
      setCutterOptions(members);
      const firstWarehouseId = Number(warehouseRes.list?.[0]?.id);
      if (Number.isFinite(firstWarehouseId) && firstWarehouseId > 0) {
        startForm.setFieldValue('warehouseId', firstWarehouseId);
        await loadMaterialOptionsByWarehouse(firstWarehouseId);
      } else {
        message.warning('未找到可用的物料仓库，请先在基础资料维护仓库');
      }
    } catch (error) {
      console.error('failed to load warehouse/material options', error);
      setWarehouseOptions([]);
      setMaterialOptions([]);
      message.error('加载仓库或面料选项失败');
    } finally {
      setWarehouseLoading(false);
      setCutterLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await pieceworkService.getCuttingPending({
          page,
          pageSize,
          keyword: appliedKeyword,
          includeSummary: page === 1,
        });
        if (!cancelled) {
          setDataset(response);
          if (response.page !== page) {
            setPage(response.page);
          }
          if (response.pageSize !== pageSize) {
            setPageSize(response.pageSize);
          }
        }
      } catch (error) {
        console.error('failed to load pending cutting tasks', error);
        if (!cancelled) {
          message.error('获取待裁数据失败，请稍后重试');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    void fetchData();
    return () => {
      cancelled = true;
    };
  }, [page, pageSize, appliedKeyword, reloadToken]);

  const handleSearch = (value: string) => {
    const trimmed = value.trim();
    setKeyword(trimmed);
    setAppliedKeyword(trimmed);
    setPage(1);
  };

  const handleOpenPreview = (task: CuttingTask) => {
    setPreviewState({ open: true, task });
  };

  const handleViewDetail = (task: CuttingTask) => {
    setDetailState({ open: true, task });
    if (!task.workOrderId) {
      setSheetDetail(null);
      return;
    }
    setDetailLoading(true);
    void pieceworkService.getCuttingSheetDetail(task.workOrderId)
      .then((detail) => setSheetDetail(detail))
      .catch((error) => {
        console.error('failed to load cutting sheet detail', error);
        setSheetDetail(null);
        message.error('获取裁床单详情失败');
      })
      .finally(() => setDetailLoading(false));
  };

  const handleMenuClick = (task: CuttingTask) => (event: MenuClickEvent) => {
    if (event.key === 'start') {
      void openStartModal(task);
      return;
    }
    if (event.key === 'edit') {
      message.success(`已进入编辑流程：${task.orderCode}`);
    }
  };

  const handleSubmitStart = async () => {
    if (!startState.task?.workOrderId) {
      return;
    }
    try {
      const values = await startForm.validateFields();
      const selectedMaterial = materialOptions.find((option) => option.value === values.materialId);
      if (!selectedMaterial) {
        message.warning('请选择仓库内可用的面料');
        return;
      }
      if (Number(values.plannedFabricQty) > selectedMaterial.availableQty) {
        message.warning(`预计用料不能超过当前可用库存（${selectedMaterial.availableQty}）`);
        return;
      }
      setStartState((prev) => ({ ...prev, submitting: true }));
      await pieceworkService.startCuttingSheet(startState.task.workOrderId, {
        bedNumber: values.bedNumber,
        cutterId: values.cutterId,
        plannedFabricQty: values.plannedFabricQty,
        warehouseId: values.warehouseId,
        materialId: values.materialId,
        materialUnit: values.materialUnit
          ?? selectedMaterial.unit,
      });
      message.success('已开裁，状态更新为裁剪中');
      setStartState({ open: false, submitting: false });
      setPage(1);
      setReloadToken((prev) => prev + 1);
      if (detailState.open && detailState.task?.workOrderId === startState.task.workOrderId) {
        handleViewDetail(detailState.task);
      }
    } catch (error) {
      if (error && typeof error === 'object' && 'errorFields' in error) {
        return;
      }
      console.error('failed to start cutting sheet', error);
      message.error('开裁失败');
    } finally {
      setStartState((prev) => ({ ...prev, submitting: false }));
    }
  };

  const handleSubmitComplete = async () => {
    if (!completeState.task?.workOrderId) {
      return;
    }
    try {
      const values = await completeForm.validateFields();
      const items = Object.entries(completeQtyMap)
        .map(([key, quantity]) => {
          const [color, size] = key.split('::');
          return { color, size, quantity: Math.max(0, Math.round(Number(quantity) || 0)) };
        })
        .filter((item) => item.quantity > 0);
      if (items.length === 0) {
        message.warning('请至少填写一个颜色尺码的实裁数量');
        return;
      }
      setCompleteState((prev) => ({ ...prev, submitting: true }));
      await pieceworkService.completeCuttingSheet(completeState.task.workOrderId, {
        actualFabricQty: values.actualFabricQty,
        items,
      });
      message.success('裁床单已完成，已转入已裁');
      setCompleteState({ open: false, submitting: false });
      setCompleteQtyMap({});
      setReloadToken((prev) => prev + 1);
      setDetailState({ open: false });
    } catch (error) {
      if (error && typeof error === 'object' && 'errorFields' in error) {
        return;
      }
      console.error('failed to complete cutting sheet', error);
      message.error('完成失败');
    } finally {
      setCompleteState((prev) => ({ ...prev, submitting: false }));
    }
  };

  const openCompleteModal = async (task: CuttingTask) => {
    if (!task.workOrderId) {
      message.warning('当前任务缺少工单信息，无法完成裁剪');
      return;
    }
    setCompleteState({ open: true, task, submitting: false });
    completeForm.setFieldsValue({ actualFabricQty: undefined });
    try {
      const detail = await pieceworkService.getCuttingSheetDetail(task.workOrderId);
      setSheetDetail(detail);
      const defaultQtyMap: Record<string, number> = {};
      detail.rows.forEach((row) => {
        row.cells.forEach((cell) => {
          defaultQtyMap[buildSpecKey(row.color, cell.size)] = Math.max(0, cell.pendingQty ?? 0);
        });
      });
      setCompleteQtyMap(defaultQtyMap);
      completeForm.setFieldsValue({
        actualFabricQty: detail.completeActualFabricQty ?? detail.startActualFabricQty ?? undefined,
      });
    } catch (error) {
      console.error('failed to load cutting sheet detail for complete', error);
      message.error('获取裁床单详情失败');
    }
  };

  const renderMetric = (metric: CuttingTaskMetric) => (
    <Card
      key={metric.key}
      className={`cutting-metric-card${metric.tone === 'warning' ? ' warning' : ''}`}
    >
      <div className="cutting-metric-label">{metric.label}</div>
      <div className="cutting-metric-value">{metric.value}</div>
      {metric.description ? (
        <div className="cutting-metric-desc">{metric.description}</div>
      ) : null}
    </Card>
  );

  return (
    <div className="cutting-pending-page">
      <section className="cutting-summary-section">
        <Space size={16} wrap>
          {dataset.summary.length > 0 ? dataset.summary.map(renderMetric) : null}
        </Space>
      </section>

      <section className="cutting-toolbar">
        <Input.Search
          allowClear
          placeholder="请输入订单号/款名/款号"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          onSearch={handleSearch}
          enterButton={<SearchOutlined />}
          style={{ maxWidth: 420, flex: 1 }}
        />
      </section>

      {loading ? (
        <div className="cutting-task-list">
          {Array.from({ length: pageSize }).map((_, index) => (
            <Skeleton key={index} active paragraph={{ rows: 4 }} />
          ))}
        </div>
      ) : dataset.list.length === 0 ? (
        <Empty description={appliedKeyword ? '未找到匹配的待裁任务' : '暂无待裁任务'} />
      ) : (
        <div className="cutting-task-list">
          {dataset.list.map((task) => {
            const menuItems: MenuProps['items'] = [
              { key: 'edit', label: '编辑' },
            ];
            const pendingTone = task.pendingQuantity > 0 ? 'cutting-qty-highlight' : '';
            const workOrderStatus = (task.workOrderStatus ?? 'NOT_STARTED').toUpperCase();
            return (
              <article className="cutting-task-card" key={task.workOrderId ?? task.id}>
                <div className="cutting-task-header">
                  <div className="cutting-task-main">
                    <ListImage
                      src={task.thumbnail}
                      alt={task.styleName}
                      wrapperClassName="cutting-task-thumbnail"
                      width={null}
                      height={null}
                      background="#fff"
                    />
                    <div className="cutting-task-info">
                      <div className="cutting-task-title">
                        <Text strong>{task.styleName}</Text>
                        <Tag bordered={false} color="geekblue">{task.styleCode}</Tag>
                      </div>
                      <div className="cutting-task-meta">
                        <Space size={12} wrap>
                          <span>订单号：{task.orderCode}</span>
                          <span>床次：{task.bedNumber || '-'}</span>
                          <span>
                            <CalendarOutlined style={{ marginRight: 4 }} />
                            下单：{task.orderDate}
                          </span>
                          {task.scheduleDate ? (
                            <span>
                              <CheckCircleTwoTone twoToneColor="#52c41a" />
                              <Text type="secondary" style={{ marginLeft: 4 }}>
                                计划排床：{task.scheduleDate}
                              </Text>
                            </span>
                          ) : null}
                          {task.customer ? (
                            <span>
                              <UserOutlined style={{ marginRight: 4 }} />
                              客户：{task.customer}
                            </span>
                          ) : null}
                        </Space>
                      </div>
                      {task.fabricSummary ? (
                        <div className="cutting-task-fabric">{task.fabricSummary}</div>
                      ) : null}
                      <div className="cutting-task-tags">
                        {workOrderStatus === 'IN_PROGRESS' ? (
                          <Tag color="processing" bordered={false}>裁剪中</Tag>
                        ) : null}
                        {workOrderStatus === 'NOT_STARTED' ? (
                          <Tag bordered={false}>未开裁</Tag>
                        ) : null}
                        {task.priorityTag ? (
                          <Tag color="volcano" bordered={false}>
                            <ExclamationCircleOutlined style={{ marginRight: 4 }} />
                            {task.priorityTag}
                          </Tag>
                        ) : null}
                        {task.pendingQuantity <= 0 ? (
                          <Tag color="success" bordered={false}>
                            已完成
                          </Tag>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <div className="cutting-task-actions">
                    <Button
                      type="link"
                      onClick={() => handleViewDetail(task)}
                    >
                      查看详情
                    </Button>
                    {workOrderStatus === 'IN_PROGRESS' ? (
                      <Button
                        type="link"
                        onClick={() => void openCompleteModal(task)}
                        disabled={!task.workOrderId}
                        icon={<CheckCircleTwoTone twoToneColor="#52c41a" />}
                      >
                        裁剪完成
                      </Button>
                    ) : (
                      <Button
                        type="link"
                        onClick={() => void openStartModal(task)}
                        disabled={!task.workOrderId}
                        icon={<ScissorOutlined />}
                      >
                        开裁
                      </Button>
                    )}
                    <Button
                      icon={<PictureOutlined />}
                      type="link"
                      onClick={() => handleOpenPreview(task)}
                    >
                      颜色图
                    </Button>
                    <Dropdown
                      trigger={['click']}
                      menu={{
                        items: menuItems,
                        onClick: handleMenuClick(task),
                      }}
                    >
                      <Button icon={<MoreOutlined />} type="text">更多</Button>
                    </Dropdown>
                  </div>
                </div>
                <div className="cutting-task-quantities">
                  <div>
                    <div className="label">下单数量</div>
                    <div className="value">{task.orderedQuantity.toLocaleString()} {task.unit}</div>
                  </div>
                  <div>
                    <div className="label">已裁数量</div>
                    <div className="value">{task.cutQuantity.toLocaleString()} {task.unit}</div>
                  </div>
                  <div className={pendingTone}>
                    <div className="label">待裁数量</div>
                    <div className="value">{task.pendingQuantity.toLocaleString()} {task.unit}</div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {dataset.total > 0 ? (
        <div className="cutting-pagination-wrap">
          <Pagination
            current={page}
            pageSize={pageSize}
            total={dataset.total}
            showSizeChanger
            showQuickJumper
            pageSizeOptions={[4, 6, 8]}
            showTotal={(total, range) => `${range[0]}-${range[1]} / 共 ${total} 条`}
            onChange={(nextPage, nextSize) => {
              setPage(nextPage);
              setPageSize(nextSize);
            }}
          />
        </div>
      ) : null}

      <Modal
        title={previewState.task ? `${previewState.task.styleName} 颜色图` : '颜色图'}
        open={previewState.open}
        footer={null}
        onCancel={() => setPreviewState({ open: false })}
        width={760}
      >
        {previewState.task ? (
          <div className="cutting-color-grid">
            {previewState.task.colors.map((color) => (
              <div className="cutting-color-item" key={`${previewState.task?.id}-${color.name}`}>
                <ListImage
                  src={color.image}
                  alt={color.name}
                  width="100%"
                  height={180}
                  borderRadius={8}
                  objectFit="contain"
                  background="#fff"
                />
                <Text>{color.name}</Text>
                {color.fabric ? (
                  <Text type="secondary" style={{ display: 'block' }}>{color.fabric}</Text>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
      </Modal>

      <Modal
        title={detailState.task ? `裁床任务详情 - ${detailState.task.orderCode}` : '裁床任务详情'}
        open={detailState.open}
        onCancel={() => {
          setDetailState({ open: false });
          setSheetDetail(null);
        }}
        width={1200}
        footer={(
          <Space>
            {sheetDetail?.status === 'IN_PROGRESS' ? (
              <Button
                type="primary"
                onClick={() => {
                  completeForm.setFieldsValue({ actualFabricQty: sheetDetail.completeActualFabricQty ?? sheetDetail.startActualFabricQty ?? undefined });
                  setCompleteState({ open: true, task: detailState.task, submitting: false });
                }}
              >
                完成
              </Button>
            ) : null}
            {sheetDetail?.status === 'NOT_STARTED' ? (
              <Button
                type="primary"
                onClick={() => {
                  if (!detailState.task) {
                    return;
                  }
                  void openStartModal(detailState.task, {
                    bedNumber: sheetDetail.bedNumber ?? `BED-${detailState.task?.orderCode ?? ''}`,
                    cutterId: sheetDetail.cutterId,
                    plannedFabricQty: sheetDetail.plannedFabricQty,
                  });
                }}
              >
                配布开裁
              </Button>
            ) : null}
            <Button onClick={() => setDetailState({ open: false })}>关闭</Button>
          </Space>
        )}
      >
        {detailLoading ? (
          <Skeleton active paragraph={{ rows: 8 }} />
        ) : detailState.task ? (
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="订单号">{detailState.task.orderCode}</Descriptions.Item>
              <Descriptions.Item label="款号">{detailState.task.styleCode}</Descriptions.Item>
              <Descriptions.Item label="款名">{detailState.task.styleName}</Descriptions.Item>
              <Descriptions.Item label="客户">{detailState.task.customer || '-'}</Descriptions.Item>
              <Descriptions.Item label="下单日期">{detailState.task.orderDate}</Descriptions.Item>
              <Descriptions.Item label="计划排床">{detailState.task.scheduleDate || '-'}</Descriptions.Item>
              <Descriptions.Item label="下单数量">
                {detailState.task.orderedQuantity.toLocaleString()} {detailState.task.unit}
              </Descriptions.Item>
              <Descriptions.Item label="已裁数量">
                {detailState.task.cutQuantity.toLocaleString()} {detailState.task.unit}
              </Descriptions.Item>
              <Descriptions.Item label="待裁数量">
                {detailState.task.pendingQuantity.toLocaleString()} {detailState.task.unit}
              </Descriptions.Item>
              <Descriptions.Item label="面料">{detailState.task.fabricSummary || '-'}</Descriptions.Item>
              <Descriptions.Item label="裁床状态">{sheetDetail?.status ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="床次">{sheetDetail?.bedNumber ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="裁剪人ID">{sheetDetail?.cutterId ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="预计用料">{sheetDetail?.plannedFabricQty ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="开裁实用">{sheetDetail?.startActualFabricQty ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="完成实用">{sheetDetail?.completeActualFabricQty ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="备注" span={2}>{detailState.task.remarks || '-'}</Descriptions.Item>
            </Descriptions>
            {sheetDetail ? (
              <>
                <Table
                  rowKey={(row) => row.color}
                  bordered
                  pagination={false}
                  dataSource={sheetDetail.rows}
                  columns={[
                    { title: '颜色', dataIndex: 'color', width: 120, fixed: 'left' },
                    ...sheetDetail.sizes.map((size) => ({
                      title: size,
                      dataIndex: 'cells',
                      width: 120,
                      render: (_value: unknown, row: CuttingSheetDetail['rows'][number]) => {
                        const cell = row.cells.find((item) => item.size === size);
                        if (!cell) return '0/0';
                        return `${cell.completedQty}/${cell.orderedQty}`;
                      },
                    })),
                    { title: '小计', width: 140, render: (_value: unknown, row: CuttingSheetDetail['rows'][number]) => `${row.completedSubtotal}/${row.orderedSubtotal}` },
                  ]}
                  scroll={{ x: 720 }}
                />
                <Card title="库存单据" size="small">
                  <Table
                    rowKey={(row) => `${row.documentCategory}-${row.documentId}`}
                    bordered
                    pagination={false}
                    dataSource={sheetDetail.materialDocuments ?? []}
                    locale={{ emptyText: '暂无关联领退料单据' }}
                    columns={[
                      { title: '单据类型', dataIndex: 'documentTypeLabel', width: 120 },
                      { title: '单据号', dataIndex: 'documentNo', width: 180 },
                      { title: '数量', dataIndex: 'quantity', width: 120, render: (v: number) => v.toLocaleString() },
                      { title: '时间', dataIndex: 'issuedAt', width: 180, render: (v?: string) => v ?? '-' },
                      {
                        title: '操作',
                        width: 120,
                        render: (_value: unknown, row: NonNullable<CuttingSheetDetail['materialDocuments']>[number]) => (
                          <Button
                            type="link"
                            onClick={() => {
                              if (row.documentCategory === 'ISSUE') {
                                navigate(`/material/issue?keyword=${encodeURIComponent(row.documentNo)}`);
                                return;
                              }
                              navigate(`/material/report/overview?keyword=${encodeURIComponent(sheetDetail.materialCode ?? '')}`);
                            }}
                          >
                            查看并跳转
                          </Button>
                        ),
                      },
                    ]}
                  />
                </Card>
              </>
            ) : null}
          </Space>
        ) : null}
      </Modal>

      <Modal
        open={startState.open}
        title={startState.task ? `配布开裁 - ${startState.task.orderCode}` : '配布开裁'}
        onCancel={() => {
          startForm.resetFields();
          setMaterialOptions([]);
          setStartState({ open: false, submitting: false });
        }}
        onOk={handleSubmitStart}
        confirmLoading={startState.submitting}
        width={640}
      >
        <Form form={startForm} layout="vertical">
          {startState.task ? (
            <Alert
              type="info"
              showIcon
              style={{ marginBottom: 12 }}
              message={`待裁数量：${startState.task.pendingQuantity.toLocaleString()} ${startState.task.unit}`}
              description={`下单 ${startState.task.orderedQuantity.toLocaleString()} ${startState.task.unit}，已裁 ${startState.task.cutQuantity.toLocaleString()} ${startState.task.unit}`}
            />
          ) : null}
          <Form.Item label="床次" name="bedNumber" rules={[{ required: true, message: '请输入床次' }]}>
            <Input maxLength={32} />
          </Form.Item>
          <Form.Item label="裁剪人（可选）" name="cutterId">
            <Select
              allowClear
              loading={cutterLoading}
              showSearch
              optionFilterProp="label"
              options={cutterOptions}
              placeholder="请选择裁剪人"
            />
          </Form.Item>
          <Form.Item label="仓库" name="warehouseId" rules={[{ required: true, message: '请选择仓库' }]}>
            <Select
              loading={warehouseLoading}
              showSearch
              optionFilterProp="label"
              options={warehouseOptions}
              placeholder="请选择仓库"
              onChange={(warehouseId: number) => {
                startForm.setFieldValue('materialId', undefined);
                startForm.setFieldValue('materialUnit', undefined);
                if (Number.isFinite(warehouseId)) {
                  void loadMaterialOptionsByWarehouse(warehouseId);
                }
              }}
            />
          </Form.Item>
          <Form.Item label="面料" name="materialId" rules={[{ required: true, message: '请选择面料物料' }]}>
            <Select
              loading={materialLoading}
              showSearch
              optionFilterProp="label"
              options={materialOptions}
              disabled={!startWarehouseId}
              placeholder={startWarehouseId ? '请选择面料' : '请先选择仓库'}
              onChange={(materialId: number) => {
                const target = materialOptions.find((item) => item.value === materialId);
                if (target?.unit) {
                  startForm.setFieldValue('materialUnit', target.unit);
                }
              }}
            />
          </Form.Item>
          <Form.Item label="物料单位（可选）" name="materialUnit">
            <Input maxLength={16} />
          </Form.Item>
          <Form.Item
            label="面料预计数量"
            name="plannedFabricQty"
            rules={[
              { required: true, message: '请输入预计数量' },
              {
                validator: (_rule, value: number | undefined) => {
                  if (value === undefined || value === null) {
                    return Promise.resolve();
                  }
                  if (value <= 0) {
                    return Promise.reject(new Error('预计数量必须大于 0'));
                  }
                  if (selectedStartMaterial && value > selectedStartMaterial.availableQty) {
                    return Promise.reject(new Error('预计数量不能超过当前可用库存'));
                  }
                  return Promise.resolve();
                },
              },
            ]}
          >
            <InputNumber min={0} precision={2} style={{ width: '100%' }} />
          </Form.Item>
          {startWarehouseId && startMaterialId ? (
            <Alert
              type={
                typeof startPlannedFabricQty === 'number'
                && selectedStartMaterial
                && startPlannedFabricQty > selectedStartMaterial.availableQty
                  ? 'warning'
                  : 'info'
              }
              showIcon
              message={`当前可用库存：${selectedStartMaterial?.availableQty ?? 0}${selectedStartMaterial?.unit ?? ''}`}
              description={
                typeof startPlannedFabricQty === 'number'
                  ? `预计用料：${startPlannedFabricQty}${selectedStartMaterial?.unit ?? ''}`
                  : '请输入预计用料，且不能超过当前可用库存'
              }
            />
          ) : null}
        </Form>
      </Modal>

      <Modal
        open={completeState.open}
        title={completeState.task ? `完成裁床 - ${completeState.task.orderCode}` : '完成裁床'}
        width={1080}
        onCancel={() => {
          completeForm.resetFields();
          setCompleteQtyMap({});
          setCompleteState({ open: false, submitting: false });
        }}
        onOk={handleSubmitComplete}
        confirmLoading={completeState.submitting}
      >
        <Form form={completeForm} layout="vertical">
          {sheetDetail ? (
            <Descriptions bordered size="small" column={1} style={{ marginBottom: 12 }}>
              <Descriptions.Item label="使用面料">
                {sheetDetail.materialCode || sheetDetail.materialName
                  ? `${sheetDetail.materialCode ?? '-'} / ${sheetDetail.materialName ?? '-'}`
                  : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="仓库">{sheetDetail.warehouseName ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="预计用量">
                {sheetDetail.plannedFabricQty ?? '-'}{sheetDetail.materialUnit ?? ''}
              </Descriptions.Item>
            </Descriptions>
          ) : null}
          {typeof sheetDetail?.plannedFabricQty === 'number' ? (
            <Alert
              type={
                typeof completeActualFabricQty === 'number'
                && completeActualFabricQty > sheetDetail.plannedFabricQty
                  ? 'warning'
                  : 'info'
              }
              showIcon
              style={{ marginBottom: 12 }}
              message={`预计用料：${sheetDetail.plannedFabricQty}`}
              description={
                typeof completeActualFabricQty === 'number'
                  ? `当前完成用料：${completeActualFabricQty}，偏差：${(completeActualFabricQty - sheetDetail.plannedFabricQty).toFixed(2)}`
                  : '请输入完成用料，系统将展示与预计用料的偏差'
              }
            />
          ) : null}
          <Form.Item label="面料实际使用数量（完成）" name="actualFabricQty" rules={[{ required: true, message: '请输入完成用料' }]}>
            <InputNumber min={0} precision={2} style={{ width: '100%' }} />
          </Form.Item>
          {sheetDetail ? (
            <Table
              rowKey={(row) => row.color}
              bordered
              pagination={false}
              size="small"
              dataSource={sheetDetail.rows}
              columns={[
                { title: '颜色', dataIndex: 'color', width: 120, fixed: 'left' },
                ...sheetDetail.sizes.map((size) => ({
                  title: size,
                  dataIndex: 'cells',
                  width: 180,
                  render: (_value: unknown, row: CuttingSheetDetail['rows'][number]) => {
                    const cell = row.cells.find((item) => item.size === size);
                    if (!cell) return '-';
                    const key = buildSpecKey(row.color, size);
                    return (
                      <Space direction="vertical" size={4} style={{ width: '100%' }}>
                        <Text type="secondary">下单 {cell.orderedQty}</Text>
                        <InputNumber
                          min={0}
                          precision={0}
                          style={{ width: '100%' }}
                          value={completeQtyMap[key] ?? 0}
                          onChange={(value) => {
                            setCompleteQtyMap((prev) => ({
                              ...prev,
                              [key]: Math.max(0, Math.round(Number(value) || 0)),
                            }));
                          }}
                        />
                      </Space>
                    );
                  },
                })),
                {
                  title: '实裁小计',
                  width: 140,
                  render: (_value: unknown, row: CuttingSheetDetail['rows'][number]) => {
                    const subtotal = row.cells.reduce((sum, cell) => (
                      sum + (completeQtyMap[buildSpecKey(row.color, cell.size)] ?? 0)
                    ), 0);
                    return subtotal;
                  },
                },
              ]}
              scroll={{ x: 900 }}
            />
          ) : null}
        </Form>
      </Modal>
    </div>
  );
};

export default CuttingPendingPage;
