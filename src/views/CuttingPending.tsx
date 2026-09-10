import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Card,
  Empty,
  Form,
  Input,
  Modal,
  Pagination,
  Select,
  Skeleton,
  Space,
  Table,
  Typography,
  message,
} from 'antd';
import type { MenuProps } from 'antd';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type {
  CuttingSheetDetail,
  CuttingSheetMaterialCalculation,
  CuttingSheetUnconfiguredItem,
  CuttingSheetMaterialUsage,
  CuttingTask,
  CuttingTaskDataset,
  CuttingTaskMetric,
} from '../types';
import { pieceworkService } from '../api/piecework';
import { factoryOrdersApi } from '../api/factory-orders';
import { settingsApi } from '../api/settings';
import { SearchField } from '../components/page';
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
  calculating: boolean;
  mode: 'create' | 'edit';
  record?: NonNullable<CuttingSheetDetail['bedRecords']>[number];
};

type MenuClickEvent = Parameters<NonNullable<MenuProps['onClick']>>[0];

type MaterialUsageFormValue = {
  calculationKey?: string;
  stockOptionKey?: string;
  warehouseId?: number;
  materialId?: number;
  materialMinimumSpecificationId?: number;
  materialUnit?: string;
  plannedQty?: number;
  actualQty?: number;
};
const DETAIL_MODAL_Z_INDEX = 1000;
const BED_RECORD_MODAL_Z_INDEX = 1100;
const buildSpecKey = (color: string, size: string) => `${color}::${size}`;

const buildBedItemsFromQtyMap = (qtyMap: Record<string, number | null>) => Object.entries(qtyMap)
  .map(([key, quantity]) => {
    const [color, size] = key.split('::');
    return { color, size, quantity: Math.max(0, Math.round(Number(quantity) || 0)) };
  })
  .filter((item) => item.quantity > 0);

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
  const [completeState, setCompleteState] = useState<CompleteModalState>({ open: false, submitting: false });
  const [completeReasonState, setCompleteReasonState] = useState<CompleteReasonModalState>({ open: false });
  const [bedRecordState, setBedRecordState] = useState<BedRecordModalState>({
    open: false,
    submitting: false,
    calculating: false,
    mode: 'create',
  });
  const [detailLoading, setDetailLoading] = useState(false);
  const [sheetDetail, setSheetDetail] = useState<CuttingSheetDetail | null>(null);
  const [deletingBedKey, setDeletingBedKey] = useState<string | null>(null);
  const [completeQtyMap, setCompleteQtyMap] = useState<Record<string, number>>({});
  const [bedRecordQtyMap, setBedRecordQtyMap] = useState<Record<string, number | null>>({});
  const [completeReasonForm] = Form.useForm();
  const [bedRecordForm] = Form.useForm();
  const [cutterOptions, setCutterOptions] = useState<Array<{ label: string; value: number }>>([]);
  const [bedMaterialCalculations, setBedMaterialCalculations] = useState<CuttingSheetMaterialCalculation[]>([]);
  const [bedUnconfiguredItems, setBedUnconfiguredItems] = useState<CuttingSheetUnconfiguredItem[]>([]);
  const bedMaterialCalculationRequestRef = useRef(0);
  const bedMaterialWarningKeyRef = useRef('');
  const [cutterLoading, setCutterLoading] = useState(false);
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

  const navigateToFactoryOrder = (orderCode?: string) => {
    const normalized = orderCode?.trim();
    if (!normalized) {
      return;
    }
    navigate(`/orders/factory?keyword=${encodeURIComponent(normalized)}&status=all`);
  };

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

  const loadCutterOptions = async () => {
    setCutterLoading(true);
    try {
      const membersRes = await settingsApi.organization.list({ page: 1, pageSize: 200 });
      const members = (membersRes.list ?? [])
        .filter((member) => member.status !== 'inactive')
        .map((member) => ({
          label: member.name || member.username || `用户${member.id}`,
          value: Number(member.id),
        }))
        .filter((option) => Number.isFinite(option.value));
      setCutterOptions(members);
    } catch (error) {
      console.error('failed to load cutting member options', error);
      message.error('加载裁剪人选项失败');
    } finally {
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
    if (event.key === 'edit') {
      message.success(`已进入编辑流程：${task.orderCode}`);
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
    try {
      const detail = await pieceworkService.getCuttingSheetDetail(task.workOrderId);
      const blockedNode = await findCuttingPredecessorBlock(detail.productionOrderId);
      if (blockedNode) {
        message.warning(`请先完成前置节点：${blockedNode.nodeName || blockedNode.nodeCode}`);
        return;
      }
      setBedRecordQtyMap({});
      setBedRecordState({ open: true, task, submitting: false, calculating: false, mode: 'create' });
      setBedMaterialCalculations([]);
      setBedUnconfiguredItems([]);
      bedMaterialWarningKeyRef.current = '';
      setSheetDetail(detail);
      bedRecordForm.setFieldsValue({
        bedNumber: `BED-${task.orderCode}-${(detail.bedRecords?.length ?? 0) + 1}`,
        cutterId: undefined,
        startedAt: detail.startedAt ? undefined : dayjs(),
        materialUsages: [],
      });
      void loadCutterOptions();
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

  const buildBedItems = () => buildBedItemsFromQtyMap(bedRecordQtyMap);

  const setCalculatedMaterialFormValues = useCallback((
    calculations: CuttingSheetMaterialCalculation[],
    existingUsages: CuttingSheetMaterialUsage[] = [],
    preserveCurrentValues = false,
  ) => {
    const currentValues = preserveCurrentValues
      ? (bedRecordForm.getFieldValue('materialUsages') ?? []) as MaterialUsageFormValue[]
      : [];
    const currentByCalculationKey = new Map(
      currentValues
        .filter((usage) => usage?.calculationKey)
        .map((usage) => [usage.calculationKey as string, usage]),
    );
    bedRecordForm.setFieldValue('materialUsages', calculations.map((material) => {
      const current = currentByCalculationKey.get(material.calculationKey);
      const existing = existingUsages.find((usage) => usage.calculationKey === material.calculationKey);
      const matchedOption = material.stockOptions.find((option) => (
        Number(option.warehouseId) === Number(existing?.warehouseId)
        && Number(option.materialMinimumSpecificationId ?? 0) === Number(existing?.materialMinimumSpecificationId ?? 0)
      ));
      const currentOption = material.stockOptions.find((option) => (
        `${option.warehouseId}::${Number(option.materialMinimumSpecificationId) || 0}` === current?.stockOptionKey
      ));
      const defaultOption = currentOption
        ?? (existing ? matchedOption : material.stockOptions.length === 1 ? material.stockOptions[0] : undefined);
      return {
        calculationKey: material.calculationKey,
        stockOptionKey: defaultOption
          ? `${defaultOption.warehouseId}::${Number(defaultOption.materialMinimumSpecificationId) || 0}`
          : undefined,
        actualQty: current?.actualQty ?? existing?.actualQty,
      };
    }));
  }, [bedRecordForm]);

  useEffect(() => {
    if (!bedRecordState.open || bedRecordState.mode !== 'create' || !bedRecordState.task?.workOrderId) {
      return undefined;
    }
    const workOrderId = bedRecordState.task.workOrderId;
    const requestId = bedMaterialCalculationRequestRef.current + 1;
    bedMaterialCalculationRequestRef.current = requestId;
    const items = buildBedItemsFromQtyMap(bedRecordQtyMap);
    if (items.length === 0) {
      setBedMaterialCalculations([]);
      setBedUnconfiguredItems([]);
      bedRecordForm.setFieldValue('materialUsages', []);
      setBedRecordState((prev) => ({ ...prev, calculating: false }));
      return undefined;
    }

    setBedRecordState((prev) => ({ ...prev, calculating: true }));
    const timer = window.setTimeout(() => {
      void pieceworkService.calculateCuttingSheetBedMaterials(
        workOrderId,
        items,
      ).then((result) => {
        if (bedMaterialCalculationRequestRef.current !== requestId) return;
        setBedMaterialCalculations(result.materials);
        setBedUnconfiguredItems(result.unconfiguredItems);
        setCalculatedMaterialFormValues(result.materials, [], true);
        const warningKey = result.unconfiguredItems
          .map((item) => `${item.color}/${item.size}`)
          .sort()
          .join('|');
        if (warningKey && warningKey !== bedMaterialWarningKeyRef.current) {
          message.warning('部分颜色尺码未配置面辅料用量，本床仍可保存，后续可在物料库存中手工领料出库');
        }
        bedMaterialWarningKeyRef.current = warningKey;
      }).catch((error) => {
        if (bedMaterialCalculationRequestRef.current !== requestId) return;
        console.error('failed to calculate cutting bed materials', error);
        setBedMaterialCalculations([]);
        setBedUnconfiguredItems([]);
        bedRecordForm.setFieldValue('materialUsages', []);
        message.error(error instanceof Error ? error.message : '计算面辅料失败');
      }).finally(() => {
        if (bedMaterialCalculationRequestRef.current === requestId) {
          setBedRecordState((prev) => ({ ...prev, calculating: false }));
        }
      });
    }, 300);

    return () => {
      window.clearTimeout(timer);
      if (bedMaterialCalculationRequestRef.current === requestId) {
        bedMaterialCalculationRequestRef.current += 1;
      }
    };
  }, [bedRecordForm, bedRecordQtyMap, bedRecordState.mode, bedRecordState.open, bedRecordState.task?.workOrderId, setCalculatedMaterialFormValues]);

  const openEditBedMaterialUsage = async (
    record: NonNullable<CuttingSheetDetail['bedRecords']>[number],
  ) => {
    if (!detailState.task?.workOrderId || !record.bedId) return;
    if (!record.materialUsageEditable) {
      message.info('该床次为历史记录，不纳入本次用量调整范围');
      return;
    }
    setBedRecordState({
      open: true,
      task: detailState.task,
      submitting: false,
      calculating: true,
      mode: 'edit',
      record,
    });
    bedRecordForm.setFieldsValue({ bedNumber: record.bedNumber, materialUsages: [] });
    try {
      const result = await pieceworkService.calculateCuttingSheetBedMaterials(
        detailState.task.workOrderId,
        record.items.filter((item) => Number(item.quantity) > 0),
      );
      setBedMaterialCalculations(result.materials);
      setBedUnconfiguredItems(result.unconfiguredItems);
      setCalculatedMaterialFormValues(result.materials, record.materialUsages ?? record.fabricUsages ?? []);
    } catch (error) {
      console.error('failed to load cutting bed material usages', error);
      message.error(error instanceof Error ? error.message : '加载床次用量失败');
      setBedRecordState((prev) => ({ ...prev, open: false }));
    } finally {
      setBedRecordState((prev) => ({ ...prev, calculating: false }));
    }
  };

  const handleSubmitBedRecord = async () => {
    if (!bedRecordState.task?.workOrderId) {
      return;
    }
    try {
      const values = await bedRecordForm.validateFields();
      const items = buildBedItems();
      if (bedRecordState.mode === 'create' && items.length === 0) {
        message.warning('请至少填写一个颜色尺码的裁剪数量');
        return;
      }
      const formUsages = (values.materialUsages ?? []) as MaterialUsageFormValue[];
      const materialUsages = bedMaterialCalculations.map((material, index) => {
        const formUsage = formUsages[index] ?? {};
        const option = material.stockOptions.find((candidate) => (
          `${candidate.warehouseId}::${Number(candidate.materialMinimumSpecificationId) || 0}` === formUsage.stockOptionKey
        ));
        return {
          calculationKey: material.calculationKey,
          materialType: material.materialType,
          applicableColors: material.applicableColors,
          warehouseId: option?.warehouseId,
          materialId: material.materialId,
          materialMinimumSpecificationId: option?.materialMinimumSpecificationId
            ?? material.materialMinimumSpecificationId,
          materialUnit: material.materialUnit,
          plannedQty: material.plannedQty,
          actualQty: Number(formUsage.actualQty),
        };
      });
      setBedRecordState((prev) => ({ ...prev, submitting: true }));
      if (bedRecordState.mode === 'edit' && bedRecordState.record?.bedId) {
        await pieceworkService.updateCuttingSheetBedMaterialUsage(bedRecordState.task.workOrderId, {
          bedId: bedRecordState.record.bedId,
          materialUsages,
        });
        message.success('床次用量与库存已同步调整');
      } else {
        await pieceworkService.recordCuttingSheetBed(bedRecordState.task.workOrderId, {
          bedNumber: values.bedNumber,
          cutterId: values.cutterId,
          startedAt: values.startedAt
            ? values.startedAt.format('YYYY-MM-DDTHH:mm:ss')
            : undefined,
          materialUsages,
          fabricUsages: materialUsages,
          items,
        });
        message.success(bedUnconfiguredItems.length
          ? '床次裁剪数据已录入；未配置用量的规格未自动出库，可后续手工领料'
          : '床次裁剪数据已录入，库存已按实际用量出库');
      }
      setBedRecordState({ open: false, submitting: false, calculating: false, mode: 'create' });
      bedRecordForm.resetFields();
      setBedRecordQtyMap({});
      setBedMaterialCalculations([]);
      setBedUnconfiguredItems([]);
      setReloadToken((prev) => prev + 1);
      if (detailState.task?.workOrderId === bedRecordState.task.workOrderId) {
        handleViewDetail(detailState.task);
      }
    } catch (error) {
      if (error && typeof error === 'object' && 'errorFields' in error) {
        return;
      }
      console.error('failed to record cutting bed data', error);
      message.error(bedRecordState.mode === 'edit' ? '调整床次用量失败' : '录入床次裁剪数据失败');
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
        onUpdateStartedAt={detailState.task?.workOrderId && sheetDetail?.startedAt
          ? async (startedAt) => {
              try {
                await pieceworkService.updateCuttingSheetStartTime(detailState.task!.workOrderId!, startedAt);
                message.success('裁剪开始时间已修改');
                setReloadToken((prev) => prev + 1);
                await handleViewDetail(detailState.task!);
              } catch (error) {
                console.error('failed to update cutting start time', error);
                message.error(error instanceof Error ? error.message : '修改裁剪开始时间失败');
                throw error;
              }
            }
          : undefined}
        onDeleteBed={handleDeleteBed}
        onEditBedMaterialUsage={(record) => void openEditBedMaterialUsage(record)}
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

      <CuttingBedRecordModal
        open={bedRecordState.open}
        mode={bedRecordState.mode}
        task={bedRecordState.task}
        detail={sheetDetail}
        qtyMap={bedRecordQtyMap}
        form={bedRecordForm}
        submitting={bedRecordState.submitting}
        calculating={bedRecordState.calculating}
        calculations={bedMaterialCalculations}
        unconfiguredItems={bedUnconfiguredItems}
        existingUsages={bedRecordState.record?.materialUsages ?? bedRecordState.record?.fabricUsages}
        cutterOptions={cutterOptions}
        cutterLoading={cutterLoading}
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
          setBedMaterialCalculations([]);
          setBedUnconfiguredItems([]);
          bedMaterialWarningKeyRef.current = '';
          setBedRecordState({ open: false, submitting: false, calculating: false, mode: 'create' });
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
