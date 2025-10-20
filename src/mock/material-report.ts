import type {
  MaterialInboundRatioItem,
  MaterialInventoryAggregation,
  MaterialInventoryListItem,
  MaterialInventoryListParams,
  MaterialInventoryListResponse,
  MaterialInventoryListSummary,
  MaterialInventoryQueryParams,
  MaterialInventoryTrendPoint,
} from '../types/material-inventory';

const monthSequence = ['2024-03', '2024-04', '2024-05', '2024-06', '2024-07', '2024-08'];

type MaterialMonthlyRecord = {
  month: string;
  inboundQty: number;
  issuedQty: number;
  returnQty: number;
  otherOutboundQty: number;
};

type MaterialRecord = {
  id: string;
  materialName: string;
  materialType: string;
  color: string;
  spec: string;
  unit: string;
  unitPrice: number;
  currentStock: number;
  image: string;
  monthly: MaterialMonthlyRecord[];
};

const createThumbnail = (label: string, color: string): string => {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='72' height='72' viewBox='0 0 72 72' fill='none'><rect width='72' height='72' rx='12' fill='${color}'/><text x='50%' y='52%' dominant-baseline='middle' text-anchor='middle' font-family='"PingFang SC", "Microsoft YaHei", sans-serif' font-size='26' fill='white'>${label}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
};

const buildMonthlyRecords = (
  baseInbound: number,
  baseIssued: number,
  baseReturn: number,
  baseOther: number,
  amplitude: number,
): MaterialMonthlyRecord[] =>
  monthSequence.map((month, index) => {
    const progress = monthSequence.length > 1 ? index / (monthSequence.length - 1) : 0;
    const seasonal = Math.round(Math.sin(progress * Math.PI) * amplitude);
    const inboundQty = Math.max(0, baseInbound + seasonal + index * 3);
    const issuedQty = Math.max(0, baseIssued + Math.round(seasonal * 0.7));
    const returnQty = Math.max(0, baseReturn + (index % 2 === 0 ? 4 : 0));
    const otherOutboundQty = Math.max(0, baseOther + (index % 3) * 5);
    return {
      month,
      inboundQty,
      issuedQty,
      returnQty,
      otherOutboundQty,
    };
  });

const materialThumbnails = {
  cotton: createThumbnail('棉', '#818cf8'),
  chiffon: createThumbnail('纱', '#38bdf8'),
  zipper: createThumbnail('链', '#fb923c'),
  button: createThumbnail('扣', '#facc15'),
  carton: createThumbnail('箱', '#94a3b8'),
  lining: createThumbnail('衬', '#34d399'),
};

const materials: MaterialRecord[] = [
  {
    id: 'MAT-COTTON-40S',
    materialName: '40S全棉汗布',
    materialType: '面料',
    color: '本白',
    spec: '185cm|220g',
    unit: '米',
    unitPrice: 18.5,
    currentStock: 5820,
    image: materialThumbnails.cotton,
    monthly: buildMonthlyRecords(760, 706, 68, 36, 52),
  },
  {
    id: 'MAT-COTTON-DENIM',
    materialName: '12oz弹力牛仔布',
    materialType: '面料',
    color: '深蓝',
    spec: '150cm|390g',
    unit: '米',
    unitPrice: 27.6,
    currentStock: 4125,
    image: materialThumbnails.cotton,
    monthly: buildMonthlyRecords(540, 498, 42, 28, 36),
  },
  {
    id: 'MAT-CHIFFON-01',
    materialName: '75D雪纺',
    materialType: '面料',
    color: '杏色',
    spec: '150cm|110g',
    unit: '米',
    unitPrice: 12.4,
    currentStock: 3680,
    image: materialThumbnails.chiffon,
    monthly: buildMonthlyRecords(620, 588, 54, 30, 44),
  },
  {
    id: 'MAT-ZIPPER-N5',
    materialName: '尼龙N5码拉链',
    materialType: '辅料',
    color: '黑色',
    spec: '60cm|定制头',
    unit: '条',
    unitPrice: 3.2,
    currentStock: 12800,
    image: materialThumbnails.zipper,
    monthly: buildMonthlyRecords(940, 876, 92, 58, 62),
  },
  {
    id: 'MAT-BUTTON-LOGO',
    materialName: '定制LOGO树脂扣',
    materialType: '辅料',
    color: '烟灰',
    spec: 'φ18mm|四眼',
    unit: '粒',
    unitPrice: 0.62,
    currentStock: 95400,
    image: materialThumbnails.button,
    monthly: buildMonthlyRecords(11800, 11060, 620, 420, 1680),
  },
  {
    id: 'MAT-CARTON-01',
    materialName: '五层瓦楞外箱',
    materialType: '包材',
    color: '牛皮色',
    spec: '62×46×38cm',
    unit: '个',
    unitPrice: 4.8,
    currentStock: 3280,
    image: materialThumbnails.carton,
    monthly: buildMonthlyRecords(420, 384, 18, 22, 24),
  },
  {
    id: 'MAT-LINING-INTER',
    materialName: '粘合衬胶点衬布',
    materialType: '辅料',
    color: '白色',
    spec: '112cm|30g',
    unit: '米',
    unitPrice: 5.6,
    currentStock: 6120,
    image: materialThumbnails.lining,
    monthly: buildMonthlyRecords(780, 732, 64, 34, 40),
  },
];

const toTimestamp = (value?: string): number | undefined => {
  if (!value) {
    return undefined;
  }
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? undefined : time;
};

const monthToTimestamp = (month: string): number => new Date(`${month}-01T00:00:00`).getTime();

const isWithinRange = (month: string, start?: number, end?: number): boolean => {
  const time = monthToTimestamp(month);
  if (start && time < start) {
    return false;
  }
  if (end && time > end) {
    return false;
  }
  return true;
};

const normalizeKeyword = (keyword?: string): string | undefined => {
  if (!keyword) {
    return undefined;
  }
  const trimmed = keyword.trim().toLowerCase();
  return trimmed || undefined;
};

const filterMaterials = (params: MaterialInventoryQueryParams): MaterialRecord[] => {
  const normalizedKeyword = normalizeKeyword(params.keyword);
  return materials.filter((item) => {
    if (params.type && item.materialType !== params.type) {
      return false;
    }
    if (!normalizedKeyword) {
      return true;
    }
    const target = `${item.materialName}${item.color}${item.spec}`.toLowerCase();
    return target.includes(normalizedKeyword);
  });
};

type RecordTotals = {
  inboundQty: number;
  issuedQty: number;
  returnQty: number;
  otherOutboundQty: number;
};

const computeTotals = (
  record: MaterialRecord,
  startTime?: number,
  endTime?: number,
): RecordTotals =>
  record.monthly.reduce<RecordTotals>((acc, monthly) => {
    if (!isWithinRange(monthly.month, startTime, endTime)) {
      return acc;
    }
    acc.inboundQty += monthly.inboundQty;
    acc.issuedQty += monthly.issuedQty;
    acc.returnQty += monthly.returnQty;
    acc.otherOutboundQty += monthly.otherOutboundQty;
    return acc;
  }, {
    inboundQty: 0,
    issuedQty: 0,
    returnQty: 0,
    otherOutboundQty: 0,
  });

const collectTrend = (
  records: MaterialRecord[],
  startTime?: number,
  endTime?: number,
): MaterialInventoryTrendPoint[] => {
  const monthsInRange = monthSequence.filter((month) => isWithinRange(month, startTime, endTime));
  const months = monthsInRange.length ? monthsInRange : monthSequence;
  return months.map((month) => {
    let inboundTotal = 0;
    let outboundTotal = 0;
    records.forEach((record) => {
      const monthly = record.monthly.find((item) => item.month === month);
      if (!monthly) {
        return;
      }
      inboundTotal += monthly.inboundQty + monthly.returnQty;
      outboundTotal += monthly.issuedQty + monthly.otherOutboundQty;
    });
    return {
      month,
      inboundQty: inboundTotal,
      outboundQty: outboundTotal,
    };
  });
};

const collectRatio = (
  records: MaterialRecord[],
  startTime?: number,
  endTime?: number,
): { items: MaterialInboundRatioItem[]; total: number } => {
  const ratioMap = new Map<string, number>();
  records.forEach((record) => {
    const totals = computeTotals(record, startTime, endTime);
    const inboundAmount = (totals.inboundQty + totals.returnQty) * record.unitPrice;
    ratioMap.set(record.materialType, (ratioMap.get(record.materialType) ?? 0) + inboundAmount);
  });
  const items = Array.from(ratioMap.entries()).map(([materialType, amount]) => ({
    materialType,
    amount,
  }));
  const total = items.reduce((sum, item) => sum + item.amount, 0);
  return { items, total };
};

const queryMaterialInventoryAggregation = (
  params: MaterialInventoryQueryParams,
): MaterialInventoryAggregation => {
  const filtered = filterMaterials(params);
  const startTime = toTimestamp(params.startDate);
  const endTime = toTimestamp(params.endDate);
  const trend = collectTrend(filtered, startTime, endTime);
  const inboundTotal = trend.reduce((sum, point) => sum + point.inboundQty, 0);
  const outboundTotal = trend.reduce((sum, point) => sum + point.outboundQty, 0);
  const ratio = collectRatio(filtered, startTime, endTime);
  return {
    trend,
    inboundTotal,
    outboundTotal,
    ratio: ratio.items,
    ratioTotal: ratio.total,
  };
};

const queryMaterialInventoryList = (
  params: MaterialInventoryListParams,
): MaterialInventoryListResponse => {
  const filtered = filterMaterials(params);
  const startTime = toTimestamp(params.startDate);
  const endTime = toTimestamp(params.endDate);

  const aggregated = filtered.map<MaterialInventoryListItem>((record) => {
    const totals = computeTotals(record, startTime, endTime);
    return {
      id: record.id,
      imageUrl: record.image,
      materialType: record.materialType,
      materialName: record.materialName,
      color: record.color,
      spec: record.spec,
      unit: record.unit,
      inboundQty: totals.inboundQty,
      issuedQty: totals.issuedQty,
      returnQty: totals.returnQty,
      otherOutboundQty: totals.otherOutboundQty,
      currentStock: record.currentStock,
    };
  });

  const filteredAggregated = aggregated.filter((item) =>
    item.inboundQty || item.issuedQty || item.returnQty || item.otherOutboundQty || item.currentStock,
  );

  const summary = filteredAggregated.reduce<MaterialInventoryListSummary>((acc, item) => {
    acc.inboundQtyTotal += item.inboundQty;
    acc.issuedQtyTotal += item.issuedQty;
    acc.returnQtyTotal += item.returnQty;
    acc.otherOutboundQtyTotal += item.otherOutboundQty;
    return acc;
  }, {
    inboundQtyTotal: 0,
    issuedQtyTotal: 0,
    returnQtyTotal: 0,
    otherOutboundQtyTotal: 0,
  });

  const sorted = [...filteredAggregated].sort((a, b) => {
    const aInbound = a.inboundQty + a.returnQty;
    const bInbound = b.inboundQty + b.returnQty;
    if (bInbound !== aInbound) {
      return bInbound - aInbound;
    }
    return b.currentStock - a.currentStock;
  });

  const { page, pageSize } = params;
  const startIndex = Math.max(0, (page - 1) * pageSize);
  const list = sorted.slice(startIndex, startIndex + pageSize);

  return {
    list,
    total: sorted.length,
    summary,
  };
};

export const fetchMaterialInventoryAggregation = (
  params: MaterialInventoryQueryParams = {},
  delay = 280,
): Promise<MaterialInventoryAggregation> =>
  new Promise((resolve) => {
    const result = queryMaterialInventoryAggregation(params);
    setTimeout(() => resolve(result), delay);
  });

export const fetchMaterialInventoryList = (
  params: MaterialInventoryListParams,
  delay = 320,
): Promise<MaterialInventoryListResponse> =>
  new Promise((resolve) => {
    const result = queryMaterialInventoryList(params);
    setTimeout(() => resolve(result), delay);
  });
