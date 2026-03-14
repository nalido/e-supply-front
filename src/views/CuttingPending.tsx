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
import { styleDetailApi } from '../api/style-detail';
import type { MaterialStockListItem } from '../types/material-stock';
import type { StyleMaterialData } from '../types/style';
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

type BedRecordModalState = {
  open: boolean;
  task?: CuttingTask;
  submitting: boolean;
};

type MenuClickEvent = Parameters<NonNullable<MenuProps['onClick']>>[0];

type StartMaterialOption = {
  label: string;
  value: number;
  unit?: string;
  availableQty: number;
  isLinked: boolean;
};

const LINKED_FABRIC_TYPE = 'FABRIC';

const buildMaterialOptionsForWarehouse = (
  warehouseId: number,
  stockItems: MaterialStockListItem[],
  styleMaterials: StyleMaterialData[],
): StartMaterialOption[] => {
  const linkedFabricMap = new Map(
    styleMaterials
      .filter((item) => item.materialType === LINKED_FABRIC_TYPE)
      .map((item) => [item.materialId, item]),
  );

  const grouped = stockItems
    .filter((item) => Number(item.warehouseId) === warehouseId && Number(item.availableQty ?? 0) > 0)
    .reduce<Record<string, StartMaterialOption>>((acc, item) => {
      const key = String(item.materialId);
      const current = acc[key];
      const availableQty = Number(item.availableQty ?? 0);
      const isLinked = linkedFabricMap.has(Number(item.materialId));
      const prefix = isLinked ? '推荐 · ' : '';
      if (!current) {
        acc[key] = {
          label: `${prefix}${item.materialCode} / ${item.materialName}（可用 ${availableQty}${item.unit ?? ''}）`,
          value: Number(item.materialId),
          unit: item.unit,
          availableQty,
          isLinked,
        };
        return acc;
      }

      const mergedQty = current.availableQty + availableQty;
      acc[key] = {
        ...current,
        availableQty: mergedQty,
        isLinked: current.isLinked || isLinked,
        label: `${current.isLinked || isLinked ? '推荐 · ' : ''}${item.materialCode} / ${item.materialName}（可用 ${mergedQty}${item.unit ?? ''}）`,
      };
      return acc;
    }, {});

  return Object.values(grouped).sort((a, b) => {
    if (a.isLinked !== b.isLinked) {
      return a.isLinked ? -1 : 1;
    }
    if (a.availableQty !== b.availableQty) {
      return b.availableQty - a.availableQty;
    }
    return a.label.localeCompare(b.label, 'zh-CN');
  });
};

const pickRecommendedWarehouseId = (
  warehouses: Array<{ label: string; value: number }>,
  stockItems: MaterialStockListItem[],
  styleMaterials: StyleMaterialData[],
): number | undefined => {
  const linkedFabricIds = new Set(
    styleMaterials.filter((item) => item.materialType === LINKED_FABRIC_TYPE).map((item) => item.materialId),
  );
  if (linkedFabricIds.size === 0) {
    return warehouses[0]?.value;
  }

  const warehouseScore = new Map<number, { matched: number; availableQty: number }>();
  stockItems.forEach((item) => {
    const warehouseId = Number(item.warehouseId);
    const materialId = Number(item.materialId);
    const availableQty = Number(item.availableQty ?? 0);
    if (!Number.isFinite(warehouseId) || availableQty <= 0 || !linkedFabricIds.has(materialId)) {
      return;
    }
    const current = warehouseScore.get(warehouseId) ?? { matched: 0, availableQty: 0 };
    warehouseScore.set(warehouseId, {
      matched: current.matched + 1,
      availableQty: current.availableQty + availableQty,
    });
  });

  return warehouses
    .map((warehouse) => ({
      value: warehouse.value,
      matched: warehouseScore.get(warehouse.value)?.matched ?? 0,
      availableQty: warehouseScore.get(warehouse.value)?.availableQty ?? 0,
    }))
    .sort((a, b) => {
      if (a.matched !== b.matched) {
        return b.matched - a.matched;
      }
      if (a.availableQty !== b.availableQty) {
        return b.availableQty - a.availableQty;
      }
      return 0;
    })[0]?.value;
};

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
  const [bedRecordState, setBedRecordState] = useState<BedRecordModalState>({ open: false, submitting: false });
  const [detailLoading, setDetailLoading] = useState(false);
  const [sheetDetail, setSheetDetail] = useState<CuttingSheetDetail | null>(null);
  const [completeQtyMap, setCompleteQtyMap] = useState<Record<string, number>>({});
  const [bedRecordQtyMap, setBedRecordQtyMap] = useState<Record<string, number>>({});
  const [startForm] = Form.useForm();
  const [completeForm] = Form.useForm();
  const [bedRecordForm] = Form.useForm();
  const [warehouseOptions, setWarehouseOptions] = useState<Array<{ label: string; value: number }>>([]);
  const [materialOptions, setMaterialOptions] = useState<StartMaterialOption[]>([]);
  const [cutterOptions, setCutterOptions] = useState<Array<{ label: string; value: number }>>([]);
  const [linkedStyleMaterials, setLinkedStyleMaterials] = useState<StyleMaterialData[]>([]);
  const [fabricInventoryItems, setFabricInventoryItems] = useState<MaterialStockListItem[]>([]);
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
    setLinkedStyleMaterials([]);
    setFabricInventoryItems([]);
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
    setMaterialLoading(true);
    try {
      const [warehouseRes, membersRes, detail, fabricInventory] = await Promise.all([
        warehouseApi.list({ page: 1, pageSize: 200, type: 'material', status: 'active' }),
        settingsApi.organization.list({ page: 1, pageSize: 200 }),
        pieceworkService.getCuttingSheetDetail(task.workOrderId),
        materialStockService.getList({
          page: 0,
          pageSize: 500,
          materialType: 'fabric',
          onlyInStock: true,
        }),
      ]);
      const warehouses = warehouseRes.list.map((item) => ({ label: item.name, value: Number(item.id) }));
      setWarehouseOptions(warehouses);
      setFabricInventoryItems(fabricInventory.list ?? []);
      const members = (membersRes.list ?? [])
        .filter((member) => member.status !== 'inactive')
        .map((member) => ({
          label: member.name || member.username || `用户${member.id}`,
          value: Number(member.id),
        }))
        .filter((option) => Number.isFinite(option.value));
      setCutterOptions(members);
      const styleMaterials =
        detail.styleId != null ? await styleDetailApi.fetchMaterials(String(detail.styleId)) : [];
      setLinkedStyleMaterials(styleMaterials);
      const recommendedWarehouseId = pickRecommendedWarehouseId(warehouses, fabricInventory.list ?? [], styleMaterials);
      if (Number.isFinite(recommendedWarehouseId) && Number(recommendedWarehouseId) > 0) {
        startForm.setFieldValue('warehouseId', recommendedWarehouseId);
        const nextOptions = buildMaterialOptionsForWarehouse(
          Number(recommendedWarehouseId),
          fabricInventory.list ?? [],
          styleMaterials,
        );
        setMaterialOptions(nextOptions);
        const linkedOptions = nextOptions.filter((item) => item.isLinked);
        const preferredOption =
          linkedOptions.length === 1 ? linkedOptions[0] : nextOptions.length === 1 ? nextOptions[0] : undefined;
        if (preferredOption) {
          startForm.setFieldsValue({
            materialId: preferredOption.value,
            materialUnit: preferredOption.unit,
          });
        }
      } else {
        message.warning('未找到可用的物料仓库，请先在基础资料维护仓库');
      }
    } catch (error) {
      console.error('failed to load warehouse/material options', error);
      setWarehouseOptions([]);
      setMaterialOptions([]);
      setLinkedStyleMaterials([]);
      setFabricInventoryItems([]);
      message.error('加载仓库或面料选项失败');
    } finally {
      setWarehouseLoading(false);
      setCutterLoading(false);
      setMaterialLoading(false);
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

  const openBedRecordModal = async (task: CuttingTask) => {
    if (!task.workOrderId) {
      message.warning('当前任务缺少工单信息，无法录入床次数据');
      return;
    }
    setBedRecordState({ open: true, task, submitting: false });
    bedRecordForm.setFieldsValue({
      bedNumber: `BED-${task.orderCode}-${(sheetDetail?.bedRecords?.length ?? 0) + 1}`,
      actualFabricQty: undefined,
    });
    try {
      const detail = await pieceworkService.getCuttingSheetDetail(task.workOrderId);
      setSheetDetail(detail);
      const initialQtyMap: Record<string, number> = {};
      detail.rows.forEach((row) => {
        row.cells.forEach((cell) => {
          initialQtyMap[buildSpecKey(row.color, cell.size)] = 0;
        });
      });
      setBedRecordQtyMap(initialQtyMap);
    } catch (error) {
      console.error('failed to load cutting sheet detail for bed record', error);
      message.error('获取裁床单详情失败');
    }
  };

  const handleSubmitBedRecord = async () => {
    if (!bedRecordState.task?.workOrderId) {
      return;
    }
    try {
      const values = await bedRecordForm.validateFields();
      const items = Object.entries(bedRecordQtyMap)
        .map(([key, quantity]) => {
          const [color, size] = key.split('::');
          return { color, size, quantity: Math.max(0, Math.round(Number(quantity) || 0)) };
        })
        .filter((item) => item.quantity > 0);
      if (items.length === 0) {
        message.warning('请至少填写一个颜色尺码的裁剪数量');
        return;
      }
      setBedRecordState((prev) => ({ ...prev, submitting: true }));
      await pieceworkService.recordCuttingSheetBed(bedRecordState.task.workOrderId, {
        bedNumber: values.bedNumber,
        actualFabricQty: Number(values.actualFabricQty),
        items,
      });
      message.success('床次裁剪数据已录入');
      setBedRecordState({ open: false, submitting: false });
      bedRecordForm.resetFields();
      setBedRecordQtyMap({});
      setReloadToken((prev) => prev + 1);
      if (detailState.task?.workOrderId === bedRecordState.task.workOrderId) {
        handleViewDetail(detailState.task);
      }
    } catch (error) {
      if (error && typeof error === 'object' && 'errorFields' in error) {
        return;
      }
      console.error('failed to record cutting bed data', error);
      message.error('录入床次裁剪数据失败');
    } finally {
      setBedRecordState((prev) => ({ ...prev, submitting: false }));
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
      const bedRecordMap = (detail.bedRecords ?? []).reduce<Record<string, number>>((acc, record) => {
        (record.items ?? []).forEach((item) => {
          const key = buildSpecKey(item.color, item.size);
          acc[key] = (acc[key] ?? 0) + Math.max(0, Number(item.quantity ?? 0));
        });
        return acc;
      }, {});
      detail.rows.forEach((row) => {
        row.cells.forEach((cell) => {
          const key = buildSpecKey(row.color, cell.size);
          const fromBeds = bedRecordMap[key];
          defaultQtyMap[key] = Number.isFinite(fromBeds)
            ? Math.max(0, Math.round(Number(fromBeds)))
            : Math.max(0, Number(cell.completedQty ?? 0));
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
                  if (!detailState.task) {
                    return;
                  }
                  void openCompleteModal(detailState.task);
                }}
              >
                完成
              </Button>
            ) : null}
            {sheetDetail?.status === 'IN_PROGRESS' ? (
              <Button
                onClick={() => {
                  if (!detailState.task) {
                    return;
                  }
                  void openBedRecordModal(detailState.task);
                }}
              >
                手动录入床次
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
                <Card title="床次信息" size="small">
                  {sheetDetail.bedRecords && sheetDetail.bedRecords.length > 0 ? (
                    <Space direction="vertical" size={12} style={{ width: '100%' }}>
                      {sheetDetail.bedRecords.map((record, index) => {
                        const recordMatrix = record.items.reduce<Record<string, Record<string, number>>>((matrix, item) => {
                          if (!matrix[item.color]) {
                            matrix[item.color] = {};
                          }
                          matrix[item.color][item.size] = (matrix[item.color][item.size] ?? 0) + item.quantity;
                          return matrix;
                        }, {});
                        const matrixColors = Array.from(new Set([
                          ...sheetDetail.rows.map((row) => row.color),
                          ...record.items.map((item) => item.color),
                        ]));
                        const matrixSizes = Array.from(new Set([
                          ...sheetDetail.sizes,
                          ...record.items.map((item) => item.size),
                        ]));
                        return (
                          <Card
                            key={`${record.bedNumber}-${record.recordedAt ?? index}`}
                            size="small"
                            title={`床次 ${record.bedNumber}（${record.totalQty} 件）`}
                            extra={<Text type="secondary">{record.recordedAt ?? '-'}</Text>}
                          >
                            <div style={{ marginBottom: 8 }}>
                              <Text type="secondary">
                                床次实用：
                                {typeof record.actualFabricQty === 'number'
                                  ? `${record.actualFabricQty}${sheetDetail.materialUnit ?? ''}`
                                  : '-'}
                              </Text>
                            </div>
                            <div className="factory-create-matrix-wrap">
                              <table className="factory-create-matrix-table">
                                <thead>
                                  <tr>
                                    <th>颜色</th>
                                    {matrixSizes.map((size) => (
                                      <th key={`${record.bedNumber}-head-${size}`}>{size}</th>
                                    ))}
                                    <th>小计</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {matrixColors.map((color) => {
                                    const rowTotal = matrixSizes.reduce((sum, size) => sum + (recordMatrix[color]?.[size] ?? 0), 0);
                                    return (
                                      <tr key={`${record.bedNumber}-row-${color}`}>
                                        <td>{color}</td>
                                        {matrixSizes.map((size) => (
                                          <td key={`${record.bedNumber}-${color}-${size}`}>{recordMatrix[color]?.[size] ?? 0}</td>
                                        ))}
                                        <td>{rowTotal}</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </Card>
                        );
                      })}
                    </Space>
                  ) : (
                    <Text type="secondary">暂无床次裁剪数据</Text>
                  )}
                </Card>
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
          setLinkedStyleMaterials([]);
          setFabricInventoryItems([]);
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
          <Form.Item label="款式关联面辅料">
            {linkedStyleMaterials.length === 0 ? (
              <Text type="secondary">当前款式未关联 BOM 面辅料，开裁时只能手动选择面料。</Text>
            ) : (
              <div className="cutting-start-linked-materials">
                {linkedStyleMaterials.map((item) => {
                  const stockSummary = fabricInventoryItems
                    .filter((stock) => Number(stock.materialId) === item.materialId)
                    .reduce(
                      (acc, stock) => ({
                        availableQty: acc.availableQty + Number(stock.availableQty ?? 0),
                        warehouseCount: acc.warehouseCount + (Number(stock.availableQty ?? 0) > 0 ? 1 : 0),
                      }),
                      { availableQty: 0, warehouseCount: 0 },
                    );
                  const isFabric = item.materialType === LINKED_FABRIC_TYPE;
                  const hasStock = isFabric ? stockSummary.availableQty > 0 : true;
                  return (
                    <div key={`${item.materialId}-${item.materialType}`} className="cutting-start-linked-card">
                      <div className="cutting-start-linked-top">
                        <Tag color={isFabric ? 'blue' : item.materialType === 'ACCESSORY' ? 'purple' : 'default'}>
                          {isFabric ? '面料' : item.materialType === 'ACCESSORY' ? '辅料' : '包装'}
                        </Tag>
                        <Text type="secondary">{item.materialSku || '未配置编码'}</Text>
                      </div>
                      <div className="cutting-start-linked-name">{item.materialName}</div>
                      <div className="cutting-start-linked-meta">
                        单耗 {item.consumption || 0}
                        {item.unit || '件'}
                        {item.lossRate ? ` · 损耗 ${(item.lossRate * 100).toFixed(1)}%` : ''}
                      </div>
                      {isFabric ? (
                        <div className="cutting-start-linked-stock">
                          <Tag color={hasStock ? 'success' : 'warning'}>
                            {hasStock
                              ? `库存已匹配 · ${stockSummary.warehouseCount} 仓可用 ${stockSummary.availableQty}${item.unit || ''}`
                              : '库存未匹配'}
                          </Tag>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </Form.Item>
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
                  const nextOptions = buildMaterialOptionsForWarehouse(warehouseId, fabricInventoryItems, linkedStyleMaterials);
                  setMaterialOptions(nextOptions);
                  const linkedOptions = nextOptions.filter((item) => item.isLinked);
                  if (linkedOptions.length === 1) {
                    startForm.setFieldsValue({
                      materialId: linkedOptions[0].value,
                      materialUnit: linkedOptions[0].unit,
                    });
                  }
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
              notFoundContent={startWarehouseId ? '该仓暂无可用面料' : '请先选择仓库'}
              onChange={(materialId: number) => {
                const target = materialOptions.find((item) => item.value === materialId);
                if (target?.unit) {
                  startForm.setFieldValue('materialUnit', target.unit);
                }
              }}
            />
          </Form.Item>
          {startWarehouseId ? (
            <Text type="secondary" className="cutting-start-helper">
              {materialOptions.some((item) => item.isLinked)
                ? '已优先展示当前款式 BOM 关联的面料；如需替换，也可选择同仓其他可用面料。'
                : '当前仓未匹配到 BOM 关联面料，下面显示的是该仓全部可用面料。'}
            </Text>
          ) : null}
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
        open={bedRecordState.open}
        title={bedRecordState.task ? `手动录入床次 - ${bedRecordState.task.orderCode}` : '手动录入床次'}
        width={1080}
        onCancel={() => {
          bedRecordForm.resetFields();
          setBedRecordQtyMap({});
          setBedRecordState({ open: false, submitting: false });
        }}
        onOk={handleSubmitBedRecord}
        confirmLoading={bedRecordState.submitting}
      >
        <Form form={bedRecordForm} layout="vertical">
          <Form.Item label="床次编号" name="bedNumber" rules={[{ required: true, message: '请输入床次编号' }]}>
            <Input maxLength={32} />
          </Form.Item>
          <Form.Item
            label={`当前床次实际用料${sheetDetail?.materialUnit ? `（${sheetDetail.materialUnit}）` : ''}`}
            name="actualFabricQty"
            rules={[
              { required: true, message: '请输入当前床次实际用料' },
              {
                validator: (_rule, value: number | undefined) => {
                  if (value === undefined || value === null) {
                    return Promise.resolve();
                  }
                  if (Number(value) <= 0) {
                    return Promise.reject(new Error('当前床次实际用料必须大于 0'));
                  }
                  return Promise.resolve();
                },
              },
            ]}
          >
            <InputNumber min={0} precision={2} style={{ width: '100%' }} />
          </Form.Item>
          {sheetDetail?.rows?.length ? (
            <div className="factory-create-matrix-wrap">
              <table className="factory-create-matrix-table">
                <thead>
                  <tr>
                    <th>颜色 \\ 尺码</th>
                    {sheetDetail.sizes.map((size) => (
                      <th key={`bed-record-head-${size}`}>{size}</th>
                    ))}
                    <th>小计</th>
                  </tr>
                </thead>
                <tbody>
                  {sheetDetail.rows.map((row) => (
                    <tr key={`bed-record-row-${row.color}`}>
                      <td>{row.color}</td>
                      {sheetDetail.sizes.map((size) => {
                        const key = buildSpecKey(row.color, size);
                        const value = bedRecordQtyMap[key] ?? 0;
                        return (
                          <td key={`bed-record-${row.color}-${size}`}>
                            <InputNumber
                              min={0}
                              precision={0}
                              controls={false}
                              value={value}
                              onChange={(nextValue) => {
                                const qty = Math.max(0, Math.round(Number(nextValue) || 0));
                                setBedRecordQtyMap((prev) => ({
                                  ...prev,
                                  [key]: qty,
                                }));
                              }}
                              style={{ width: '100%' }}
                              placeholder="填写实裁数量"
                            />
                          </td>
                        );
                      })}
                      <td>
                        {sheetDetail.sizes.reduce((sum, size) => sum + (bedRecordQtyMap[buildSpecKey(row.color, size)] ?? 0), 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Text type="secondary">暂无可录入的颜色尺码数据</Text>
          )}
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
