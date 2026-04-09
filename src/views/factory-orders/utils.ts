import type { FactoryOrderProgress } from '../../types';
import type { FactoryOrderProgressNode } from '../../api/factory-orders';
import type { CreateQuantityMatrix, OverallStatus } from './types';

export const VIEW_MODE_STORAGE_KEY = 'factory-orders-view-mode';

export const sortOptions = [
  { label: '更新时间（新 → 旧）', value: 'order-desc' },
  { label: '更新时间（旧 → 新）', value: 'order-asc' },
  { label: '预计交货（近 → 远）', value: 'delivery-asc' },
  { label: '预计交货（远 → 近）', value: 'delivery-desc' },
];

export const overallStatusOptions = [
  { label: '全部', value: 'all' },
  { label: '未完成', value: 'unfinished' },
  { label: '已完成', value: 'completed' },
];

export const statusQueryMap: Record<OverallStatus, string[]> = {
  all: ['DRAFT', 'RELEASED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
  unfinished: ['DRAFT', 'RELEASED', 'IN_PROGRESS'],
  completed: ['COMPLETED', 'CANCELLED'],
};

export const statusTabDefaults: Array<{ key: string; label: string }> = [
  { key: 'DRAFT', label: '草稿' },
  { key: 'RELEASED', label: '已下发' },
  { key: 'IN_PROGRESS', label: '生产中' },
  { key: 'COMPLETED', label: '已完工' },
  { key: 'CANCELLED', label: '已取消' },
];

export const materialStatusOptions = [
  { label: '待齐备', value: 'PENDING' },
  { label: '齐备中', value: 'ALLOCATING' },
  { label: '已齐备（已发料）', value: 'ALLOCATED' },
];

const materialStatusLabelMap = new Map(
  materialStatusOptions.map((option) => [option.value, option.label]),
);

export const hiddenOrderStatusTags = new Set(['DRAFT', 'RELEASED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']);

export const progressNodeCodeMap: Record<string, string> = {
  order_placed: 'ORDER_PLACED',
  fabric_arrived: 'FABRIC_ARRIVED',
  accessory_arrived: 'ACCESSORY_ARRIVED',
  cutting: 'CUTTING',
  sewing: 'SEWING',
  inbound: 'INBOUND',
  completed: 'COMPLETED',
};

export const CUTTING_SHEET_START_SOURCE = 'CUTTING_SHEET_START';

export const getMaterialTagColor = (status: string) => {
  if (status.includes('未采购')) return 'volcano';
  if (status.includes('采购中')) return 'orange';
  if (status.includes('已入仓') || status.includes('齐备')) return 'green';
  return 'default';
};

export const resolveOverallCompleted = (isCompleted?: boolean, statusKey?: string) =>
  Boolean(isCompleted || statusKey === 'COMPLETED' || statusKey === 'CANCELLED');

export const getOverallStatusMeta = (isCompleted?: boolean, statusKey?: string) =>
  resolveOverallCompleted(isCompleted, statusKey)
    ? { label: '已完成', color: '#52c41a' }
    : { label: '未完成', color: '#1890ff' };

export const getMaterialStatusLabel = (value?: string) => {
  if (!value) {
    return '-';
  }
  return materialStatusLabelMap.get(value) ?? value;
};

export const normalizeProgressLabel = (stage: FactoryOrderProgress): string => {
  if (stage.key === 'accessory_arrived') {
    return '辅料是否到货';
  }
  if (stage.key === 'fabric_arrived') {
    return '面料是否到货';
  }
  return stage.label;
};

export const parseAllocationCompletionValue = (value?: string, fallbackPercent?: number) => {
  if (!value) {
    return typeof fallbackPercent === 'number'
      ? { allocatedPercent: 0, completedPercent: fallbackPercent }
      : null;
  }
  const matched = value.match(/分配\s*(\d+)%\s*\/\s*完成\s*(\d+)%/);
  if (!matched) {
    return typeof fallbackPercent === 'number'
      ? { allocatedPercent: 0, completedPercent: fallbackPercent }
      : null;
  }
  return {
    allocatedPercent: Number(matched[1] ?? 0),
    completedPercent: typeof fallbackPercent === 'number' ? fallbackPercent : Number(matched[2] ?? 0),
  };
};

export const resolveProgressStageState = (stage: FactoryOrderProgress) => {
  const status = String(stage.status ?? 'default').toLowerCase();
  const isPercentStage = stage.key === 'cutting' || stage.key === 'sewing';
  const fallbackPercent =
    isPercentStage && typeof stage.percent === 'number' ? Math.max(0, Math.round(stage.percent)) : undefined;
  const breakdown = parseAllocationCompletionValue(stage.value, fallbackPercent);
  const isOrderPlaced = stage.key === 'order_placed';
  const isOvercut = status === 'danger';
  const isPartial =
    !isOvercut && (status === 'warning' || (typeof stage.value === 'string' && stage.value.includes('部分完成')));
  const isCompleted =
    isOrderPlaced
    || (isOvercut && (breakdown?.completedPercent ?? 0) >= 100)
    || status === 'success'
    || status === 'completed'
    || (typeof stage.value === 'string' && stage.value.includes('已完成'));
  const isInProgress = !isCompleted && (isPartial || isOvercut);
  const progressStateClass = isOvercut ? 'overcut' : isCompleted ? 'completed' : isPartial ? 'partial' : 'pending';
  return {
    breakdown,
    isCompleted,
    isInProgress,
    isOrderPlaced,
    isOvercut,
    isPartial,
    progressStateClass,
  };
};

export const normalizeTagValues = (values?: string[]) =>
  Array.from(new Set((values ?? []).map((value) => String(value ?? '').trim()).filter(Boolean)));

export const normalizeQtyValue = (value?: number | null) => {
  const parsed = Number(value ?? 0);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 0;
  }
  return Math.floor(parsed);
};

export const normalizeNonNegativeNumber = (value: unknown): number | undefined => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return undefined;
  }
  return parsed;
};

export const parseProgressNodePayload = (node?: FactoryOrderProgressNode) => {
  if (!node?.payloadJson) {
    return {};
  }
  try {
    const payload = JSON.parse(node.payloadJson) as {
      orderedQuantity?: unknown;
      allocatedQuantity?: unknown;
      completedQuantity?: unknown;
    };
    return {
      orderedQuantity: normalizeNonNegativeNumber(payload.orderedQuantity),
      allocatedQuantity: normalizeNonNegativeNumber(payload.allocatedQuantity),
      completedQuantity: normalizeNonNegativeNumber(payload.completedQuantity),
    };
  } catch {
    return {};
  }
};

export const formatProgressPercent = (current: number, total: number) => {
  if (!(total > 0) || !(current >= 0)) {
    return '0%';
  }
  return `${Math.round((current * 100) / total)}%`;
};

export const buildCreateMatrix = (
  colors: string[],
  sizes: string[],
  prev?: CreateQuantityMatrix,
): CreateQuantityMatrix =>
  colors.reduce<CreateQuantityMatrix>((matrix, color) => {
    matrix[color] = sizes.reduce<Record<string, number | null>>((row, size) => {
      row[size] = prev?.[color]?.[size] == null ? null : normalizeQtyValue(prev[color]?.[size]);
      return row;
    }, {});
    return matrix;
  }, {});

export const resolveOverallStatusParam = (statusParam?: string | null, keyword?: string | null): OverallStatus => {
  if (statusParam === 'all' || statusParam === 'unfinished' || statusParam === 'completed') {
    return statusParam;
  }
  if (String(keyword ?? '').trim()) {
    return 'all';
  }
  return 'unfinished';
};
