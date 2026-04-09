import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
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
import { SearchOutlined } from '@ant-design/icons';
import type {
  CuttingSheetDetail,
  CuttingSheetMaterialUsage,
  CuttingTask,
  CuttingTaskDataset,
  CuttingTaskMetric,
} from '../types';
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
import CuttingTaskCard from '../components/CuttingTaskCard';

const { Text, Title } = Typography;

const initialDataset: CuttingTaskDataset = {
  summary: [],
  list: [],
  total: 0,
  page: 1,
  pageSize: 4,
};

const OVER_CUT_REASON_OPTIONS = [
  { label: '补裁返工', value: 'REWORK' },
  { label: '备损预留', value: 'LOSS_RESERVE' },
  { label: '面料瑕疵换片', value: 'DEFECT_REPLACEMENT' },
  { label: '其它', value: 'OTHER' },
];

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
  materialCode?: string;
  materialName?: string;
  unit?: string;
  availableQty: number;
  warehouseId?: number;
  warehouseName?: string;
  isLinked: boolean;
};

type MaterialUsageFormValue = {
  warehouseId?: number;
  materialId?: number;
  materialUnit?: string;
  plannedQty?: number;
  actualQty?: number;
};

type WarehouseOption = {
  label: string;
  value: number;
};

const LINKED_FABRIC_TYPE = 'FABRIC';
const DETAIL_MODAL_Z_INDEX = 1000;
const BED_RECORD_MODAL_Z_INDEX = 1100;
const buildSpecKey = (color: string, size: string) => `${color}::${size}`;

const getDetailMaterialUsages = (detail?: CuttingSheetDetail | null): CuttingSheetMaterialUsage[] => {
  const usages = detail?.materialUsages?.length ? detail.materialUsages : detail?.fabricUsages ?? [];
  return usages ?? [];
};

const buildMaterialStockKey = (warehouseId?: number, materialId?: number) => `${Number(warehouseId) || 0}::${Number(materialId) || 0}`;
const buildPendingQtyMapFromDetail = (detail?: CuttingSheetDetail | null): Record<string, number> => {
  if (!detail) {
    return {};
  }
  return detail.rows.reduce<Record<string, number>>((acc, row) => {
    row.cells.forEach((cell) => {
      acc[buildSpecKey(row.color, cell.size)] = Math.max(0, Math.round(Number(cell.pendingQty) || 0));
    });
    return acc;
  }, {});
};

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
          materialCode: item.materialCode,
          materialName: item.materialName,
          unit: item.unit,
          availableQty,
          warehouseId: Number(item.warehouseId),
          warehouseName: item.warehouseName,
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
  const initialSearchKeyword = searchParams.get('keyword')?.trim() ?? '';
  const [dataset, setDataset] = useState<CuttingTaskDataset>(initialDataset);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState(initialSearchKeyword);
  const [appliedKeyword, setAppliedKeyword] = useState(initialSearchKeyword);
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
  const [deletingBedKey, setDeletingBedKey] = useState<string | null>(null);
  const [completeQtyMap, setCompleteQtyMap] = useState<Record<string, number>>({});
  const [bedRecordQtyMap, setBedRecordQtyMap] = useState<Record<string, number | null>>({});
  const [startForm] = Form.useForm();
  const [completeReasonForm] = Form.useForm();
  const [bedRecordForm] = Form.useForm();
  const [materialOptions, setMaterialOptions] = useState<StartMaterialOption[]>([]);
  const [materialWarehouseOptions, setMaterialWarehouseOptions] = useState<WarehouseOption[]>([]);
  const [cutterOptions, setCutterOptions] = useState<Array<{ label: string; value: number }>>([]);
  const [linkedStyleMaterials, setLinkedStyleMaterials] = useState<StyleMaterialData[]>([]);
  const [fabricInventoryItems, setFabricInventoryItems] = useState<MaterialStockListItem[]>([]);
  const [warehouseLoading, setWarehouseLoading] = useState(false);
  const [materialLoading, setMaterialLoading] = useState(false);
  const [cutterLoading, setCutterLoading] = useState(false);
  const startMaterialUsageValues = Form.useWatch('materialUsages', startForm) as MaterialUsageFormValue[] | undefined;
  const completeOverCutSpecs = (sheetDetail?.rows ?? []).reduce<Array<{
    color: string;
    size: string;
    orderedQty: number;
    actualQty: number;
    overQty: number;
  }>>((acc, row) => {
    row.cells.forEach((cell) => {
      const key = buildSpecKey(row.color, cell.size);
      const actualQty = Math.max(0, Math.round(Number(completeQtyMap[key] ?? 0)));
      const orderedQty = Math.max(0, Number(cell.orderedQty ?? 0));
      const overQty = Math.max(actualQty - orderedQty, 0);
      if (overQty > 0) {
        acc.push({
          color: row.color,
          size: cell.size,
          orderedQty,
          actualQty,
          overQty,
        });
      }
    });
    return acc;
  }, []);
  const completeOverCutQty = completeOverCutSpecs.reduce((sum, item) => sum + item.overQty, 0);
  const completeIsOverCut = completeOverCutSpecs.length > 0;
  const bedMaterialStockAvailabilityMap = fabricInventoryItems.reduce<Record<string, number>>((acc, item) => {
    const key = buildMaterialStockKey(Number(item.warehouseId), Number(item.materialId));
    acc[key] = (acc[key] ?? 0) + Number(item.availableQty ?? 0);
    return acc;
  }, {});

  const navigateToFactoryOrder = (orderCode?: string) => {
    const normalized = orderCode?.trim();
    if (!normalized) {
      return;
    }
    navigate(`/orders/factory?keyword=${encodeURIComponent(normalized)}&status=all`);
  };

  const normalizeMaterialUsagePayload = (values?: MaterialUsageFormValue[]) => (values ?? [])
    .map((item) => {
      const option = materialOptions.find((candidate) => candidate.value === Number(item.materialId));
      const warehouse = materialWarehouseOptions.find((candidate) => candidate.value === Number(item.warehouseId));
      return {
        warehouseId: Number.isFinite(Number(item.warehouseId)) ? Number(item.warehouseId) : option?.warehouseId,
        warehouseName: warehouse?.label ?? option?.warehouseName,
        materialId: Number.isFinite(Number(item.materialId)) ? Number(item.materialId) : undefined,
        materialCode: option?.materialCode,
        materialName: option?.materialName,
        materialUnit: item.materialUnit ?? option?.unit,
        plannedQty: item.plannedQty == null ? undefined : Number(item.plannedQty),
        actualQty: item.actualQty == null ? undefined : Number(item.actualQty),
      };
    })
    .filter((item) => item.materialId || Number(item.plannedQty ?? item.actualQty ?? 0) > 0);

  const closeCompleteModal = () => {
    completeReasonForm.resetFields();
    setCompleteQtyMap({});
    setCompleteReasonState({ open: false });
    setCompleteState({ open: false, submitting: false });
  };

  const submitCompleteSheet = async (reasonValues?: {
    overCutReasonCode?: string;
    overCutRemark?: string;
  }) => {
    if (!completeState.task?.workOrderId) {
      return;
    }

    setCompleteState((prev) => ({ ...prev, submitting: true }));
    try {
      await pieceworkService.completeCuttingSheet(completeState.task.workOrderId, {
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
    setMaterialWarehouseOptions([]);
    setLinkedStyleMaterials([]);
    setFabricInventoryItems([]);
    setStartState({ open: true, task, submitting: false });
    startForm.setFieldsValue({
      bedNumber: preset?.bedNumber ?? `BED-${task.orderCode}`,
      cutterId: preset?.cutterId,
      materialUsages: [],
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
      setMaterialWarehouseOptions(warehouses);
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
        const nextOptions = buildMaterialOptionsForWarehouse(
          Number(recommendedWarehouseId),
          fabricInventory.list ?? [],
          styleMaterials,
        );
        setMaterialOptions(nextOptions);
        const preferredOption = nextOptions.find((item) => item.isLinked) ?? (nextOptions.length === 1 ? nextOptions[0] : undefined);
        if (preferredOption && preset?.plannedFabricQty) {
          startForm.setFieldValue('materialUsages', [{
            warehouseId: preferredOption.warehouseId,
            materialId: preferredOption.value,
            materialUnit: preferredOption.unit,
            plannedQty: preset.plannedFabricQty,
          }]);
        }
      } else {
        message.warning('未找到可用的物料仓库，请先在基础资料维护仓库');
      }
    } catch (error) {
      console.error('failed to load warehouse/material options', error);
      setMaterialOptions([]);
      setMaterialWarehouseOptions([]);
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

  const loadSheetDetail = useCallback(async (task: CuttingTask, options?: { silent?: boolean }) => {
    if (!task.workOrderId) {
      setSheetDetail(null);
      return null;
    }
    setDetailLoading(true);
    try {
      const detail = await pieceworkService.getCuttingSheetDetail(task.workOrderId);
      setSheetDetail(detail);
      return detail;
    } catch (error) {
      console.error('failed to load cutting sheet detail', error);
      setSheetDetail(null);
      if (!options?.silent) {
        message.error('获取裁床单详情失败');
      }
      return null;
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const handleViewDetail = useCallback((task: CuttingTask) => {
    setDetailState({ open: true, task });
    void loadSheetDetail(task);
  }, [loadSheetDetail]);

  const handleDeleteBed = async (record: NonNullable<CuttingSheetDetail['bedRecords']>[number]) => {
    if (!detailState.task?.workOrderId) {
      message.warning('当前裁床单缺少工单信息，无法删除床次');
      return;
    }
    if (!record.bedId) {
      message.warning('该床次缺少床次标识，暂时无法删除');
      return;
    }
    const deleteKey = record.bedId;
    setDeletingBedKey(deleteKey);
    try {
      await pieceworkService.deleteCuttingSheetBed(detailState.task.workOrderId, {
        bedId: record.bedId,
      });
      message.success('床次已删除');
      setReloadToken((prev) => prev + 1);
      await loadSheetDetail(detailState.task, { silent: true });
    } catch (error) {
      console.error('failed to delete cutting bed', error);
      message.error(error instanceof Error ? error.message : '删除床次失败');
    } finally {
      setDeletingBedKey(null);
    }
  };

  useEffect(() => {
    const nextKeyword = searchParams.get('keyword')?.trim() ?? '';
    setKeyword((current) => (current === nextKeyword ? current : nextKeyword));
    setAppliedKeyword((current) => (current === nextKeyword ? current : nextKeyword));
    setPage((current) => (current === 1 ? current : 1));
  }, [searchParams]);

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
  }, [dataset.list, detailState.open, detailState.task?.workOrderId, handleViewDetail, loading, searchParams, setSearchParams]);

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
      const materialUsages = normalizeMaterialUsagePayload(values.materialUsages);
      for (const usage of materialUsages) {
        const selectedMaterial = materialOptions.find((option) => option.value === usage.materialId);
        if (selectedMaterial && Number(usage.plannedQty ?? 0) > selectedMaterial.availableQty) {
          message.warning(`物料 ${selectedMaterial.materialCode ?? selectedMaterial.label} 的预计用量不能超过可用库存（${selectedMaterial.availableQty}）`);
          return;
        }
      }
      setStartState((prev) => ({ ...prev, submitting: true }));
      await pieceworkService.startCuttingSheet(startState.task.workOrderId, {
        bedNumber: values.bedNumber,
        cutterId: values.cutterId,
        plannedFabricQty: materialUsages.length === 1 ? materialUsages[0].plannedQty : undefined,
        warehouseId: materialUsages.length === 1 ? materialUsages[0].warehouseId : undefined,
        materialId: materialUsages.length === 1 ? materialUsages[0].materialId : undefined,
        materialUnit: materialUsages.length === 1 ? materialUsages[0].materialUnit : undefined,
        materialUsages: materialUsages.map((item) => ({ ...item, plannedQty: item.plannedQty })),
        fabricUsages: materialUsages.map((item) => ({ ...item, plannedQty: item.plannedQty })),
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
      if (completeIsOverCut) {
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
      batchWarehouseId: undefined,
      materialUsages: [],
    });
    try {
      const [detail, warehouseRes, fabricInventory] = await Promise.all([
        pieceworkService.getCuttingSheetDetail(task.workOrderId),
        warehouseApi.list({ page: 1, pageSize: 200, type: 'material', status: 'active' }),
        materialStockService.getList({
          page: 0,
          pageSize: 500,
          materialType: 'fabric',
          onlyInStock: true,
        }),
      ]);
      const warehouses = warehouseRes.list.map((item) => ({ label: item.name, value: Number(item.id) }));
      setMaterialWarehouseOptions(warehouses);
      setFabricInventoryItems(fabricInventory.list ?? []);
      let nextDetail = detail;
      let nextMaterialUsages = getDetailMaterialUsages(detail);
      if (nextMaterialUsages.length === 0 && detail.styleId != null) {
        try {
          const styleMaterials = await styleDetailApi.fetchMaterials(String(detail.styleId));
          nextMaterialUsages = styleMaterials
            .filter((item) => item.materialType === LINKED_FABRIC_TYPE)
            .map((item) => {
              const matchedStock = (fabricInventory.list ?? [])
                .filter((stock) => Number(stock.materialId) === item.materialId && Number(stock.availableQty ?? 0) > 0)
                .sort((a, b) => Number(b.availableQty ?? 0) - Number(a.availableQty ?? 0))[0];
              return {
                imageUrl: item.imageUrl,
                warehouseId: matchedStock ? Number(matchedStock.warehouseId) : undefined,
                warehouseName: matchedStock?.warehouseName,
                materialId: item.materialId,
                materialCode: item.materialSku,
                materialName: item.materialName,
                materialUnit: item.unit,
              };
            });
          if (nextMaterialUsages.length > 0) {
            nextDetail = {
              ...detail,
              materialUsages: nextMaterialUsages,
              fabricUsages: nextMaterialUsages,
            };
          }
        } catch (styleError) {
          console.error('failed to load style materials for bed record', styleError);
        }
      }
      setSheetDetail(nextDetail);
      bedRecordForm.setFieldsValue({
        bedNumber: `BED-${task.orderCode}-${(detail.bedRecords?.length ?? 0) + 1}`,
        batchWarehouseId: undefined,
        materialUsages: nextMaterialUsages.map((item) => ({
          warehouseId: item.warehouseId,
          materialId: item.materialId,
          materialUnit: item.materialUnit,
          actualQty: undefined,
        })),
      });
      const initialQtyMap: Record<string, number | null> = {};
      detail.rows.forEach((row) => {
        row.cells.forEach((cell) => {
          initialQtyMap[buildSpecKey(row.color, cell.size)] = null;
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
      const materialUsages = normalizeMaterialUsagePayload(values.materialUsages).map((item) => ({
        ...item,
        actualQty: item.actualQty,
      }));
      const positiveMaterialUsages = materialUsages.filter((item) => Number(item.actualQty ?? 0) > 0);
      if (positiveMaterialUsages.length === 0) {
        message.warning('请填写床次面料用量');
        return;
      }
      const invalidUsage = positiveMaterialUsages.find((item) => !item.materialId || !item.warehouseId);
      if (invalidUsage) {
        message.warning('请为已填写用量的面料补全库存仓位');
        return;
      }
      setBedRecordState((prev) => ({ ...prev, submitting: true }));
      await pieceworkService.recordCuttingSheetBed(bedRecordState.task.workOrderId, {
        bedNumber: values.bedNumber,
        actualFabricQty: positiveMaterialUsages.length === 1 ? positiveMaterialUsages[0].actualQty : undefined,
        materialUsages: positiveMaterialUsages,
        fabricUsages: positiveMaterialUsages,
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
        <div className="cutting-task-list" data-testid="cutting-pending-task-list">
          {dataset.list.map((task) => {
            const menuItems: MenuProps['items'] = [
              { key: 'edit', label: '编辑' },
            ];
            return (
              <CuttingTaskCard
                key={task.workOrderId ?? task.id}
                task={task}
                onViewDetail={handleViewDetail}
                onPreview={handleOpenPreview}
                onNavigateToFactoryOrder={navigateToFactoryOrder}
                onRecordBed={(nextTask) => void openBedRecordModal(nextTask)}
                onComplete={(nextTask) => void openCompleteModal(nextTask)}
                menuItems={menuItems}
                onMenuClick={handleMenuClick(task)}
                showMoreButton
                testIdPrefix="cutting-task"
              />
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
          setDeletingBedKey(null);
        }}
        onNavigateToFactoryOrder={navigateToFactoryOrder}
        onNavigate={navigate}
        onDeleteBed={handleDeleteBed}
        deletingBedKey={deletingBedKey}
        onComplete={sheetDetail?.status === 'IN_PROGRESS' && detailState.task
          ? () => {
              void openCompleteModal(detailState.task!);
            }
          : undefined}
        onRecordBed={((sheetDetail?.status === 'IN_PROGRESS' || sheetDetail?.status === 'NOT_STARTED') && detailState.task)
          ? () => {
              void openBedRecordModal(detailState.task!);
            }
          : undefined}
      />

      <Modal
        open={startState.open}
        title={startState.task ? `配布开裁 - ${startState.task.orderCode}` : '配布开裁'}
        data-testid="cutting-start-modal"
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
            <Input maxLength={32} data-testid="cutting-start-bed-number" />
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
          <Form.List name="materialUsages">
            {(fields, { add, remove }) => (
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text strong>面料预计用量（可选，支持多个面料）</Text>
                  <Button onClick={() => add({})} loading={materialLoading || warehouseLoading} data-testid="cutting-start-add-material-usage">新增面料</Button>
                </div>
                {fields.length === 0 ? (
                  <Alert type="info" showIcon message="当前开裁改为纯开始，面料用量可稍后补录；如已知计划用量，可在此先录多个面料。" />
                ) : null}
                {fields.map((field, index) => {
                  const row = startMaterialUsageValues?.[index];
                  const selectedMaterial = materialOptions.find((option) => option.value === Number(row?.materialId));
                  return (
                    <Card
                      key={field.key}
                      size="small"
                      title={`面料 ${index + 1}`}
                      extra={<Button type="link" danger onClick={() => remove(field.name)}>删除</Button>}
                    >
                      <Space direction="vertical" size={12} style={{ width: '100%' }}>
                        <Form.Item name={[field.name, 'materialId']} label="面料">
                          <Select
                            loading={materialLoading}
                            showSearch
                            optionFilterProp="label"
                            options={materialOptions}
                            placeholder="请选择面料"
                            notFoundContent="暂无可用面料"
                            onChange={(materialId: number) => {
                              const target = materialOptions.find((item) => item.value === materialId);
                              startForm.setFieldValue(['materialUsages', field.name, 'warehouseId'], target?.warehouseId);
                              startForm.setFieldValue(['materialUsages', field.name, 'materialUnit'], target?.unit);
                            }}
                          />
                        </Form.Item>
                        <Form.Item name={[field.name, 'materialUnit']} label="单位">
                          <Input maxLength={16} />
                        </Form.Item>
                        <Form.Item name={[field.name, 'plannedQty']} label="预计用量">
                          <InputNumber min={0} precision={2} style={{ width: '100%' }} placeholder="可选" />
                        </Form.Item>
                        {selectedMaterial ? (
                          <Text type="secondary">
                            当前可用库存：{selectedMaterial.availableQty}{selectedMaterial.unit ?? ''}
                          </Text>
                        ) : null}
                      </Space>
                    </Card>
                  );
                })}
                {fields.length > 0 ? (
                  <Text type="secondary" className="cutting-start-helper">
                    {materialOptions.some((item) => item.isLinked)
                      ? '已优先展示当前款式 BOM 关联面料；可录入多个面料预计用量，也兼容旧单面料接口。'
                      : '当前未匹配到 BOM 关联面料，显示全部可用面料；不填写也可直接开裁。'}
                  </Text>
                ) : null}
              </Space>
            )}
          </Form.List>
        </Form>
      </Modal>

      <CuttingBedRecordModal
        open={bedRecordState.open}
        task={bedRecordState.task}
        detail={sheetDetail}
        qtyMap={bedRecordQtyMap}
        form={bedRecordForm}
        submitting={bedRecordState.submitting}
        stockAvailabilityMap={bedMaterialStockAvailabilityMap}
        warehouseOptions={materialWarehouseOptions}
        zIndex={BED_RECORD_MODAL_Z_INDEX}
        onQtyChange={(key, value) => {
          setBedRecordQtyMap((prev) => {
            if (value == null) {
              return {
                ...prev,
                [key]: null,
              };
            }
            return {
              ...prev,
              [key]: value,
            };
          });
        }}
        onFillPendingQty={() => {
          setBedRecordQtyMap(buildPendingQtyMapFromDetail(sheetDetail));
        }}
        onCancel={() => {
          bedRecordForm.resetFields();
          setBedRecordQtyMap({});
          setMaterialWarehouseOptions([]);
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
          {completeIsOverCut ? (
            <Alert
              type="warning"
              showIcon
              style={{ marginBottom: 12 }}
              message={`存在颜色尺码超裁，共超出 ${completeOverCutQty}${completeState.task?.unit ?? '件'}`}
              description={`超裁明细：${completeOverCutSpecs.map((item) => `${item.color}/${item.size} 超出 ${item.overQty}${completeState.task?.unit ?? '件'}`).join('；')}。提交完成前需要补录超裁原因。`}
            />
          ) : null}
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
            message="当前完工需要补录超裁原因"
            description={`超裁明细：${completeOverCutSpecs.map((item) => `${item.color}/${item.size} 超出 ${item.overQty}${completeState.task?.unit ?? '件'}`).join('；')}。请填写原因后再提交。`}
          />
          <Form form={completeReasonForm} layout="vertical">
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
