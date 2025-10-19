import type {
  FinishedGoodsInventoryAggregation,
  FinishedGoodsInventoryListItem,
  FinishedGoodsInventoryListParams,
  FinishedGoodsInventoryListResponse,
  FinishedGoodsInventoryQueryParams,
  FinishedGoodsMonthlyFlow,
} from '../types/finished-goods-inventory';
import { fallbackStyleAsset, styleAssetMap } from './product-common';

type MonthlyRecord = {
  date: string;
  inbound: number;
  outbound: number;
};

type InventorySkuRecord = {
  id: string;
  styleNo: string;
  styleName: string;
  color: string;
  size: string;
  unit: string;
  imageKey: string;
  currentStock: number;
  monthly: MonthlyRecord[];
};

const monthSequence = Array.from({ length: 12 }, (_, index) => {
  const base = new Date(2024, 3, 1); // April 2024 as baseline
  const date = new Date(base.getFullYear(), base.getMonth() + index, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
});

const styleAssets = styleAssetMap;
const fallbackStyleImage = fallbackStyleAsset;

const buildMonthlyRecords = (baseInbound: number, baseOutbound: number, amplitude: number, trendStep: number): MonthlyRecord[] =>
  monthSequence.map((date, index) => {
    const seasonal = Math.round(Math.sin((index / (monthSequence.length - 1)) * Math.PI) * amplitude);
    const trend = Math.floor(index / 3) * trendStep;
    const inbound = Math.max(20, baseInbound + seasonal + trend);
    const outbound = Math.max(12, baseOutbound + seasonal + Math.floor(trend * 0.4) - Math.floor(amplitude / 5));
    return {
      date,
      inbound,
      outbound,
    };
  });

const inventorySkus: InventorySkuRecord[] = [
  {
    id: 'ET0110-black-110',
    styleNo: 'ET0110',
    styleName: '儿童羊羔毛拉链夹克套装',
    color: '黑色',
    size: '110',
    unit: '件',
    imageKey: 'ET0110',
    currentStock: 328,
    monthly: buildMonthlyRecords(120, 94, 26, 8),
  },
  {
    id: 'ET0110-gray-120',
    styleNo: 'ET0110',
    styleName: '儿童羊羔毛拉链夹克套装',
    color: '浅灰',
    size: '120',
    unit: '件',
    imageKey: 'ET0110',
    currentStock: 296,
    monthly: buildMonthlyRecords(112, 86, 24, 6),
  },
  {
    id: 'ET0168-green-130',
    styleNo: 'ET0168',
    styleName: '儿童条纹工装卫裤',
    color: '军绿',
    size: '130',
    unit: '件',
    imageKey: 'ET0168',
    currentStock: 254,
    monthly: buildMonthlyRecords(134, 108, 22, 10),
  },
  {
    id: 'ET0151-navy-140',
    styleNo: 'ET0151',
    styleName: '儿童拉链连帽拼色套装',
    color: '藏青',
    size: '140',
    unit: '件',
    imageKey: 'ET0151',
    currentStock: 312,
    monthly: buildMonthlyRecords(128, 102, 25, 9),
  },
  {
    id: 'ET0193-black-150',
    styleNo: 'ET0193',
    styleName: '儿童书包卫衣',
    color: '黑色',
    size: '150',
    unit: '件',
    imageKey: 'ET0193',
    currentStock: 218,
    monthly: buildMonthlyRecords(96, 84, 18, 7),
  },
  {
    id: 'ET5033-orange-120',
    styleNo: 'ET5033',
    styleName: '儿童撞色条纹卫衣卫裤套装',
    color: '橘色',
    size: '120',
    unit: '件',
    imageKey: 'ET5033',
    currentStock: 276,
    monthly: buildMonthlyRecords(104, 88, 20, 8),
  },
  {
    id: 'ET0409-pink-130',
    styleNo: 'ET0409',
    styleName: '儿童拼色连帽开衫套装',
    color: '粉色',
    size: '130',
    unit: '件',
    imageKey: 'ET0409',
    currentStock: 238,
    monthly: buildMonthlyRecords(116, 90, 21, 9),
  },
  {
    id: 'ET5031-brown-110',
    styleNo: 'ET5031',
    styleName: '儿童高领开衫撞色条纹套装',
    color: '咖色',
    size: '110',
    unit: '件',
    imageKey: 'ET5031',
    currentStock: 264,
    monthly: buildMonthlyRecords(118, 92, 23, 8),
  },
];

const getImage = (imageKey: string): string => styleAssets[imageKey] ?? fallbackStyleImage;

const toTimestamp = (value?: string): number | undefined =>
  value ? new Date(value).getTime() : undefined;

const isWithinRange = (date: string, start?: number, end?: number): boolean => {
  const time = new Date(date).getTime();
  if (Number.isNaN(time)) {
    return false;
  }
  if (start && time < start) {
    return false;
  }
  if (end && time > end) {
    return false;
  }
  return true;
};

const matchKeyword = (value: string | undefined, keyword?: string): boolean => {
  if (!keyword) {
    return true;
  }
  const normalized = keyword.trim().toLowerCase();
  if (!normalized) {
    return true;
  }
  return value?.toLowerCase().includes(normalized) ?? false;
};

const filterSkus = (params: FinishedGoodsInventoryQueryParams): InventorySkuRecord[] =>
  inventorySkus.filter((sku) => {
    if (!matchKeyword(sku.styleNo, params.keyword) && !matchKeyword(sku.styleName, params.keyword)) {
      return false;
    }
    return true;
  });

const computeSkuPeriodTotals = (
  sku: InventorySkuRecord,
  startTime?: number,
  endTime?: number,
): { inbound: number; outbound: number } =>
  sku.monthly.reduce(
    (acc, record) => {
      if (isWithinRange(record.date, startTime, endTime)) {
        acc.inbound += record.inbound;
        acc.outbound += record.outbound;
      }
      return acc;
    },
    { inbound: 0, outbound: 0 },
  );

const collectMonthlyFlow = (
  skus: InventorySkuRecord[],
  startTime?: number,
  endTime?: number,
): FinishedGoodsMonthlyFlow[] => {
  const monthMap = new Map<string, { inbound: number; outbound: number }>();

  skus.forEach((sku) => {
    sku.monthly.forEach((record) => {
      if (!isWithinRange(record.date, startTime, endTime)) {
        return;
      }
      const monthKey = record.date.slice(0, 7);
      const current = monthMap.get(monthKey) ?? { inbound: 0, outbound: 0 };
      current.inbound += record.inbound;
      current.outbound += record.outbound;
      monthMap.set(monthKey, current);
    });
  });

  const scopedMonths = monthSequence
    .map((date) => date.slice(0, 7))
    .filter((month) => {
      const sampleDate = `${month}-01`;
      return isWithinRange(sampleDate, startTime, endTime);
    });

  const uniqueMonths = Array.from(new Set([...scopedMonths, ...monthMap.keys()]));

  return uniqueMonths
    .sort((a, b) => (a > b ? 1 : -1))
    .map((month) => {
      const totals = monthMap.get(month) ?? { inbound: 0, outbound: 0 };
      return {
        month,
        inbound: totals.inbound,
        outbound: totals.outbound,
      };
    });
};

const buildComputedList = (
  params: FinishedGoodsInventoryListParams,
): { items: FinishedGoodsInventoryListItem[]; summary: { inbound: number; outbound: number } } => {
  const startTime = toTimestamp(params.startDate);
  const endTime = toTimestamp(params.endDate);
  const filteredSkus = filterSkus(params);

  const computed = filteredSkus.map<FinishedGoodsInventoryListItem>((sku) => {
    const totals = computeSkuPeriodTotals(sku, startTime, endTime);
    return {
      id: sku.id,
      imageUrl: getImage(sku.imageKey),
      styleNo: sku.styleNo,
      styleName: sku.styleName,
      color: sku.color,
      size: sku.size,
      unit: sku.unit,
      inboundQty: totals.inbound,
      outboundQty: totals.outbound,
      currentStock: sku.currentStock,
    };
  });

  const summary = computed.reduce(
    (acc, item) => {
      acc.inbound += item.inboundQty;
      acc.outbound += item.outboundQty;
      return acc;
    },
    { inbound: 0, outbound: 0 },
  );

  return { items: computed, summary };
};

export const queryFinishedGoodsInventoryAggregation = (
  params: FinishedGoodsInventoryQueryParams,
): FinishedGoodsInventoryAggregation => {
  const startTime = toTimestamp(params.startDate);
  const endTime = toTimestamp(params.endDate);
  const skus = filterSkus(params);
  const monthlyFlow = collectMonthlyFlow(skus, startTime, endTime);
  const inboundTotal = monthlyFlow.reduce((acc, month) => acc + month.inbound, 0);
  const outboundTotal = monthlyFlow.reduce((acc, month) => acc + month.outbound, 0);

  return {
    monthlyFlow,
    inboundTotal,
    outboundTotal,
  };
};

export const queryFinishedGoodsInventoryList = (
  params: FinishedGoodsInventoryListParams,
): FinishedGoodsInventoryListResponse => {
  const { page, pageSize } = params;
  const { items, summary } = buildComputedList(params);
  const total = items.length;
  const startIndex = (page - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, total);
  const paginated = items.slice(startIndex, endIndex);

  return {
    list: paginated,
    total,
    summary: {
      inboundTotal: summary.inbound,
      outboundTotal: summary.outbound,
    },
  };
};

export const fetchFinishedGoodsInventoryAggregation = (
  params: FinishedGoodsInventoryQueryParams,
  delay = 260,
): Promise<FinishedGoodsInventoryAggregation> =>
  new Promise((resolve) => {
    const result = queryFinishedGoodsInventoryAggregation(params);
    setTimeout(() => resolve(result), delay);
  });

export const fetchFinishedGoodsInventoryList = (
  params: FinishedGoodsInventoryListParams,
  delay = 300,
): Promise<FinishedGoodsInventoryListResponse> =>
  new Promise((resolve) => {
    const result = queryFinishedGoodsInventoryList(params);
    setTimeout(() => resolve(result), delay);
  });
