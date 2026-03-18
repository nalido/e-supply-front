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
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  CalendarOutlined,
  CheckCircleTwoTone,
  ExclamationCircleOutlined,
  MoreOutlined,
  PictureOutlined,
  SearchOutlined,
  ScissorOutlined,
  UserOutlined,
} from '@ant-design/icons';
import type { CuttingSheetDetail, CuttingTask, CuttingTaskDataset, CuttingTaskMetric } from '../types';
import { pieceworkService } from '../api/piecework';
import { factoryOrdersApi } from '../api/factory-orders';
import warehouseApi from '../api/warehouse';
import { settingsApi } from '../api/settings';
import { materialStockService } from '../api/material-inventory';
import { styleDetailApi } from '../api/style-detail';
import { SearchField } from '../components/page';
import type { MaterialStockListItem } from '../types/material-stock';
import type { StyleMaterialData } from '../types/style';
import '../styles/cutting-pending.css';
import ListImage from '../components/common/ListImage';
import CuttingSheetDetailModal from '../components/CuttingSheetDetailModal';
import CuttingBedRecordModal from '../components/CuttingBedRecordModal';

const { Text, Title } = Typography;

const initialDataset: CuttingTaskDataset = {
  summary: [],
  list: [],
  total: 0,
  page: 1,
  pageSize: 4,
};

const OVER_USAGE_REASON_OPTIONS = [
  { label: '排料损耗超预估', value: 'LAY_LOSS' },
  { label: '面料瑕疵 / 换片补裁', value: 'FABRIC_DEFECT' },
  { label: '工艺调整导致追加用量', value: 'PROCESS_ADJUSTMENT' },
  { label: '其它', value: 'OTHER' },
];

const OVER_CUT_REASON_OPTIONS = [
  { label: '补裁返工', value: 'REWORK' },
  { label: '备损预留', value: 'LOSS_RESERVE' },
  { label: '面料瑕疵换片', value: 'DEFECT_REPLACEMENT' },
  { label: '其它', value: 'OTHER' },
];

const getCuttingVarianceSummary = (detail?: CuttingSheetDetail | null, actualQty?: number) => {
  const planQty = Number(detail?.plannedFabricQty ?? 0);
  const normalizedActualQty = Number(actualQty ?? detail?.completeActualFabricQty ?? detail?.startActualFabricQty ?? 0);
  const shouldRecalculate = actualQty !== undefined && actualQty !== null;
  return {
    planQty,
    actualQty: normalizedActualQty,
    overQty: shouldRecalculate
      ? Math.max(normalizedActualQty - planQty, 0)
      : Number(detail?.overUsedFabricQty ?? Math.max(normalizedActualQty - planQty, 0)),
    returnQty: shouldRecalculate
      ? Math.max(planQty - normalizedActualQty, 0)
      : Number(detail?.returnedFabricQty ?? Math.max(planQty - normalizedActualQty, 0)),
  };
};

const sumBedRecordFabricQty = (detail?: CuttingSheetDetail | null) => {
  const bedRecords = detail?.bedRecords ?? [];
  const total = bedRecords.reduce((sum, record) => {
    const qty = Number(record.actualFabricQty);
    return Number.isFinite(qty) ? sum + qty : sum;
  }, 0);
  return bedRecords.length > 0 ? total : undefined;
};

const CUTTING_NODE_CODE = 'CUTTING';
const ORDER_PLACED_NODE_CODE = 'ORDER_PLACED';

const findCuttingPredecessorBlock = async (productionOrderId?: number) => {
  if (!productionOrderId) {
    return null;
  }
  const nodes = await factoryOrdersApi.getProgress(productionOrderId);
  const cuttingIndex = nodes.findIndex((node) => node.nodeCode === CUTTING_NODE_CODE);
  if (cuttingIndex <= 0) {
    return null;
  }
  return nodes.slice(0, cuttingIndex).find((node) => {
    if (node.nodeCode === ORDER_PLACED_NODE_CODE) {
      return false;
    }
    return String(node.status ?? '').toUpperCase() !== 'COMPLETED';
  }) ?? null;
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

type CompleteReasonModalState = {
  open: boolean;
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
const DETAIL_MODAL_Z_INDEX = 1000;
const BED_RECORD_MODAL_Z_INDEX = 1100;

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
  const [searchParams, setSearchParams] = useSearchParams();
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
  const [completeReasonState, setCompleteReasonState] = useState<CompleteReasonModalState>({ open: false });
  const [bedRecordState, setBedRecordState] = useState<BedRecordModalState>({ open: false, submitting: false });
  const [detailLoading, setDetailLoading] = useState(false);
  const [sheetDetail, setSheetDetail] = useState<CuttingSheetDetail | null>(null);
  const [completeQtyMap, setCompleteQtyMap] = useState<Record<string, number>>({});
  const [bedRecordQtyMap, setBedRecordQtyMap] = useState<Record<string, number>>({});
  const [startForm] = Form.useForm();
  const [completeReasonForm] = Form.useForm();
  const [bedRecordForm] = Form.useForm();
  const [warehouseOptions, setWarehouseOptions] = useState<Array<{ label: string; value: number }>>([]);
  const [materialOptions, setMaterialOptions] = useState<StartMaterialOption[]>([]);
  const [cutterOptions, setCutterOptions] = useState<Array<{ label: string; value: number }>>([]);
  const [linkedStyleMaterials, setLinkedStyleMaterials] = useState<StyleMaterialData[]>([]);
  const [fabricInventoryItems, setFabricInventoryItems] = useState<MaterialStockListItem[]>([]);
  const [warehouseLoading, setWarehouseLoading] = useState(false);
  const [materialLoading, setMaterialLoading] = useState(false);
  const [cutterLoading, setCutterLoading] = useState(false);
  const startWarehouseId = Form.useWatch('warehouseId', startForm);
  const startMaterialId = Form.useWatch('materialId', startForm);
  const startPlannedFabricQty = Form.useWatch('plannedFabricQty', startForm);
  const completeDisplayActualFabricQty =
    sumBedRecordFabricQty(sheetDetail)
    ?? sheetDetail?.completeActualFabricQty
    ?? sheetDetail?.startActualFabricQty;
  const completeVariance = getCuttingVarianceSummary(
    sheetDetail,
    completeDisplayActualFabricQty == null ? undefined : Number(completeDisplayActualFabricQty),
  );
  const completeIsOverPlan = completeVariance.overQty > 0;
  const completeTargetQty = Object.values(completeQtyMap).reduce((sum, qty) => sum + Math.max(0, Math.round(Number(qty) || 0)), 0);
  const completePlannedQty = Number(sheetDetail?.plannedQty ?? completeState.task?.orderedQuantity ?? 0);
  const completeOverCutQty = Math.max(completeTargetQty - completePlannedQty, 0);
  const completeIsOverCut = completeOverCutQty > 0;

  const buildSpecKey = (color: string, size: string) => `${color}::${size}`;
  const selectedStartMaterial =
    materialOptions.find((option) => option.value === Number(startMaterialId));

  const navigateToFactoryOrder = (orderCode?: string) => {
    const normalized = orderCode?.trim();
    if (!normalized) {
      return;
    }
    navigate(`/orders/factory?keyword=${encodeURIComponent(normalized)}`);
  };

  const closeCompleteModal = () => {
    completeReasonForm.resetFields();
    setCompleteQtyMap({});
    setCompleteReasonState({ open: false });
    setCompleteState({ open: false, submitting: false });
  };

  const submitCompleteSheet = async (reasonValues?: {
    usageReasonCode?: string;
    usageRemark?: string;
    overCutReasonCode?: string;
    overCutRemark?: string;
  }) => {
    if (!completeState.task?.workOrderId) {
      return;
    }

    setCompleteState((prev) => ({ ...prev, submitting: true }));
    try {
      await pieceworkService.completeCuttingSheet(completeState.task.workOrderId, {
        usageReasonCode: completeIsOverPlan ? reasonValues?.usageReasonCode : undefined,
        usageRemark: completeIsOverPlan ? reasonValues?.usageRemark : undefined,
        overCutReasonCode: completeIsOverCut ? reasonValues?.overCutReasonCode : undefined,
        overCutRemark: completeIsOverCut ? reasonValues?.overCutRemark : undefined,
      });
      message.success('裁床单已完成，已转入已裁');
      completeReasonForm.resetFields();
      setCompleteReasonState({ open: false });
      setCompleteState({ open: false, submitting: false });
      setCompleteQtyMap({});
      setReloadToken((prev) => prev + 1);
      setDetailState({ open: false });
    } catch (error) {
      console.error('failed to complete cutting sheet', error);
      if (!(error && typeof error === 'object' && 'response' in error)) {
        message.error(error instanceof Error ? error.message : '完成失败');
      }
      setCompleteState((prev) => ({ ...prev, submitting: false }));
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
    let detail: CuttingSheetDetail;
    try {
      detail = await pieceworkService.getCuttingSheetDetail(task.workOrderId);
      const blockedNode = await findCuttingPredecessorBlock(detail.productionOrderId);
      if (blockedNode) {
        message.warning(`请先完成前置节点：${blockedNode.nodeName || blockedNode.nodeCode}`);
        return;
      }
    } catch (error) {
      console.error('failed to validate cutting predecessor progress', error);
      message.error('校验裁剪前置节点失败');
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
      const [warehouseRes, membersRes, fabricInventory] = await Promise.all([
        warehouseApi.list({ page: 1, pageSize: 200, type: 'material', status: 'active' }),
        settingsApi.organization.list({ page: 1, pageSize: 200 }),
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

  useEffect(() => {
    const rawWorkOrderId = Number(searchParams.get('workOrderId') ?? 0);
    const openDetail = searchParams.get('openDetail') === '1';
    if (!openDetail || !Number.isFinite(rawWorkOrderId) || rawWorkOrderId <= 0 || loading) {
      return;
    }
    const targetTask = dataset.list.find((task) => Number(task.workOrderId) === rawWorkOrderId);
    if (!targetTask) {
      return;
    }
    if (detailState.task?.workOrderId === rawWorkOrderId && detailState.open) {
      const next = new URLSearchParams(searchParams);
      next.delete('workOrderId');
      next.delete('openDetail');
      setSearchParams(next, { replace: true });
      return;
    }
    handleViewDetail(targetTask);
    const next = new URLSearchParams(searchParams);
    next.delete('workOrderId');
    next.delete('openDetail');
    setSearchParams(next, { replace: true });
  }, [dataset.list, detailState.open, detailState.task?.workOrderId, loading, searchParams, setSearchParams]);

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
      if (completeIsOverPlan || completeIsOverCut) {
        setCompleteReasonState({ open: true });
        return;
      }
      await submitCompleteSheet();
    } catch (error) {
      console.error('failed to complete cutting sheet', error);
      if (!(error && typeof error === 'object' && 'response' in error)) {
        message.error(error instanceof Error ? error.message : '完成失败');
      }
    }
  };

  const handleSubmitCompleteReason = async () => {
    try {
      const reasonValues = await completeReasonForm.validateFields();
      await submitCompleteSheet(reasonValues);
    } catch (error) {
      if (error && typeof error === 'object' && 'errorFields' in error) {
        return;
      }
      console.error('failed to validate complete reason', error);
      message.error('校验超用/超裁原因失败');
    }
  };

  const openBedRecordModal = async (task: CuttingTask) => {
    if (!task.workOrderId) {
      message.warning('当前任务缺少工单信息，无法录入床次数据');
      return;
    }
    setBedRecordState({ open: true, task, submitting: false });
    bedRecordForm.setFieldsValue({
      bedNumber: undefined,
      actualFabricQty: undefined,
    });
    try {
      const detail = await pieceworkService.getCuttingSheetDetail(task.workOrderId);
      setSheetDetail(detail);
      bedRecordForm.setFieldsValue({
        bedNumber: `BED-${task.orderCode}-${(detail.bedRecords?.length ?? 0) + 1}`,
        actualFabricQty: undefined,
      });
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
    setCompleteReasonState({ open: false });
    completeReasonForm.resetFields();
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
      completeReasonForm.setFieldsValue({
        usageReasonCode: detail.usageReasonCode ?? undefined,
        usageRemark: detail.usageRemark ?? undefined,
        overCutReasonCode: detail.overCutReasonCode ?? undefined,
        overCutRemark: detail.overCutRemark ?? undefined,
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
      <Card style={{ marginBottom: 16 }}>
        <Space direction="vertical" size={6} style={{ width: '100%' }}>
          <Text type="secondary">计件中心 / 裁床 / 待裁</Text>
          <Space align="baseline" wrap>
            <Title level={3} style={{ margin: 0 }}>待裁任务工作台</Title>
            <Text type="secondary">集中处理待裁任务，依次完成开裁、床次录入与裁剪结果登记。</Text>
          </Space>
          <Text type="secondary">支持按任务进度查看裁剪状态与用料执行情况。</Text>
        </Space>
      </Card>
      <section className="cutting-summary-section">
        <Space size={16} wrap>
          {dataset.summary.length > 0 ? dataset.summary.map(renderMetric) : null}
        </Space>
      </section>

      <section className="cutting-toolbar">
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Space wrap size={12} style={{ width: '100%', justifyContent: 'space-between' }}>
            <SearchField
              allowClear
              placeholder="请输入订单号/款名/款号"
              value={keyword}
              onChange={setKeyword}
              onSearch={handleSearch}
              enterButton={<SearchOutlined />}
              style={{ maxWidth: 420, flex: 1 }}
            />
            <Text type="secondary">当前任务数：{dataset.total}，优先处理可直接开裁或已在裁剪中的任务。</Text>
          </Space>
        </Space>
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
                          <span>
                            订单号：
                            <Button
                              type="link"
                              size="small"
                              style={{ paddingInline: 4 }}
                              onClick={() => navigateToFactoryOrder(task.orderCode)}
                            >
                              {task.orderCode}
                            </Button>
                          </span>
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
                            已裁满
                          </Tag>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <div className="cutting-task-actions">
                    <Button
                      size="small"
                      onClick={() => handleViewDetail(task)}
                    >
                      查看详情
                    </Button>
                    {workOrderStatus === 'IN_PROGRESS' ? (
                      <>
                        <Button
                          size="small"
                          type="primary"
                          onClick={() => void openBedRecordModal(task)}
                          disabled={!task.workOrderId}
                          icon={<ScissorOutlined />}
                        >
                          录入床次
                        </Button>
                        <Button
                          size="small"
                          onClick={() => handleViewDetail(task)}
                          disabled={!task.workOrderId}
                          icon={<CheckCircleTwoTone twoToneColor="#52c41a" />}
                        >
                          完成
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="small"
                        type="primary"
                        onClick={() => void openStartModal(task)}
                        disabled={!task.workOrderId}
                        icon={<ScissorOutlined />}
                      >
                        开裁
                      </Button>
                    )}
                    <Button
                      size="small"
                      icon={<PictureOutlined />}
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
                      <Button size="small" icon={<MoreOutlined />}>更多</Button>
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

      <CuttingSheetDetailModal
        open={detailState.open}
        loading={detailLoading}
        task={detailState.task}
        detail={sheetDetail}
        zIndex={bedRecordState.open ? DETAIL_MODAL_Z_INDEX : undefined}
        onClose={() => {
          setDetailState({ open: false });
          setSheetDetail(null);
        }}
        onNavigateToFactoryOrder={navigateToFactoryOrder}
        onNavigate={navigate}
        onComplete={sheetDetail?.status === 'IN_PROGRESS' && detailState.task
          ? () => {
              void openCompleteModal(detailState.task!);
            }
          : undefined}
        onRecordBed={sheetDetail?.status === 'IN_PROGRESS' && detailState.task
          ? () => {
              void openBedRecordModal(detailState.task!);
            }
          : undefined}
        onStart={sheetDetail?.status === 'NOT_STARTED' && detailState.task
          ? () => {
              void openStartModal(detailState.task!, {
                bedNumber: sheetDetail?.bedNumber ?? `BED-${detailState.task?.orderCode ?? ''}`,
                cutterId: sheetDetail?.cutterId,
                plannedFabricQty: sheetDetail?.plannedFabricQty,
              });
            }
          : undefined}
      />

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

      <CuttingBedRecordModal
        open={bedRecordState.open}
        task={bedRecordState.task}
        detail={sheetDetail}
        qtyMap={bedRecordQtyMap}
        form={bedRecordForm}
        submitting={bedRecordState.submitting}
        zIndex={BED_RECORD_MODAL_Z_INDEX}
        onQtyChange={(key, value) => {
          setBedRecordQtyMap((prev) => ({
            ...prev,
            [key]: value,
          }));
        }}
        onCancel={() => {
          bedRecordForm.resetFields();
          setBedRecordQtyMap({});
          setBedRecordState({ open: false, submitting: false });
        }}
        onSubmit={handleSubmitBedRecord}
      />

      <Modal
        open={completeState.open}
        title={completeState.task ? `完成裁床 - ${completeState.task.orderCode}` : '完成裁床'}
        width={1080}
        onCancel={closeCompleteModal}
        onOk={handleSubmitComplete}
        confirmLoading={completeState.submitting}
      >
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
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
              type={completeIsOverPlan || completeIsOverCut ? 'warning' : 'info'}
              showIcon
              style={{ marginBottom: 12 }}
              message={`计划用量：${completeVariance.planQty}${sheetDetail.materialUnit ?? ''} ｜ 实际用量：${completeVariance.actualQty}${sheetDetail.materialUnit ?? ''} ｜ 计划件数：${completePlannedQty} ｜ 本次实裁件数：${completeTargetQty}`}
              description={`${completeIsOverPlan ? `当前完工用量高于计划 ${completeVariance.overQty}${sheetDetail.materialUnit ?? ''}。` : `当前用量差异：+${completeVariance.overQty}${sheetDetail.materialUnit ?? ''} / 回退 ${completeVariance.returnQty}${sheetDetail.materialUnit ?? ''}。`} ${completeIsOverCut ? `当前累计实裁超出计划 ${completeOverCutQty}${completeState.task?.unit ?? '件'}。` : '当前累计实裁未超计划。'}`}
            />
          ) : null}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 12,
            }}
          >
            {[
              {
                label: '实际用量',
                value: completeDisplayActualFabricQty == null ? '-' : `${completeDisplayActualFabricQty}${sheetDetail?.materialUnit ?? ''}`,
                hint: '按已录床次汇总',
              },
              {
                label: '计划用量',
                value: `${completeVariance.planQty}${sheetDetail?.materialUnit ?? ''}`,
                hint: '开裁时配置',
              },
              {
                label: '实裁件数',
                value: `${completeTargetQty}${completeState.task?.unit ?? '件'}`,
                hint: '来自床次记录',
              },
              {
                label: '差异结果',
                value: completeIsOverPlan
                  ? `超用 ${completeVariance.overQty}${sheetDetail?.materialUnit ?? ''}`
                  : completeVariance.returnQty > 0
                    ? `回退 ${completeVariance.returnQty}${sheetDetail?.materialUnit ?? ''}`
                    : '刚好一致',
                hint: completeIsOverCut
                  ? `超裁 ${completeOverCutQty}${completeState.task?.unit ?? '件'}`
                  : '未超裁',
              },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  border: '1px solid #f0f0f0',
                  borderRadius: 12,
                  padding: '14px 16px',
                  background: '#fafafa',
                }}
              >
                <Text type="secondary" style={{ display: 'block', marginBottom: 6 }}>
                  {item.label}
                </Text>
                <Text strong style={{ display: 'block', fontSize: 18, lineHeight: 1.4 }}>
                  {item.value}
                </Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {item.hint}
                </Text>
              </div>
            ))}
          </div>
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
                        <Text strong style={{ fontSize: 16 }}>{completeQtyMap[key] ?? 0}</Text>
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
        </Space>
      </Modal>

      <Modal
        open={completeReasonState.open}
        title="补录超用 / 超裁原因"
        width={720}
        onCancel={() => setCompleteReasonState({ open: false })}
        onOk={handleSubmitCompleteReason}
        confirmLoading={completeState.submitting}
      >
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Alert
            type="warning"
            showIcon
            message="当前完工需要补录原因"
            description={`${completeIsOverPlan ? `实际用量超计划 ${completeVariance.overQty}${sheetDetail?.materialUnit ?? ''}` : ''}${completeIsOverPlan && completeIsOverCut ? '，' : ''}${completeIsOverCut ? `实裁件数超计划 ${completeOverCutQty}${completeState.task?.unit ?? '件'}` : ''}。请填写原因后再提交。`}
          />
          <Form form={completeReasonForm} layout="vertical">
            {completeIsOverPlan ? (
              <>
                <Form.Item
                  label="超用原因"
                  name="usageReasonCode"
                  rules={[{ required: true, message: '请选择超用原因' }]}
                >
                  <Select
                    allowClear
                    options={OVER_USAGE_REASON_OPTIONS}
                    placeholder="请选择超用原因"
                  />
                </Form.Item>
                <Form.Item
                  label="超用备注"
                  name="usageRemark"
                >
                  <Input.TextArea rows={2} placeholder="可选，补充备注" />
                </Form.Item>
              </>
            ) : null}
            {completeIsOverCut ? (
              <>
                <Form.Item
                  label="超裁原因"
                  name="overCutReasonCode"
                  rules={[{ required: true, message: '请选择超裁原因' }]}
                >
                  <Select
                    allowClear
                    options={OVER_CUT_REASON_OPTIONS}
                    placeholder="请选择超裁原因"
                  />
                </Form.Item>
                <Form.Item
                  label="超裁备注"
                  name="overCutRemark"
                >
                  <Input.TextArea rows={2} placeholder="可选，补充备注" />
                </Form.Item>
              </>
            ) : null}
          </Form>
        </Space>
      </Modal>
    </div>
  );
};

export default CuttingPendingPage;
