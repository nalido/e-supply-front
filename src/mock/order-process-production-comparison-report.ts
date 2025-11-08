import type {
  ProcessProductionDetailParams,
  ProcessProductionDetailResponse,
  ProcessProductionExportParams,
  ProcessProductionLot,
  ProcessProductionLotListParams,
  ProcessProductionLotListResponse,
  ProcessProductionSkuCell,
} from '../types/process-production-comparison-report';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type ProcessDefinition = {
  key: string;
  name: string;
  target: number;
};

type RawSkuRow = {
  id: string;
  ticketNo: string;
  color: string;
  size: string;
  total: number;
  cells: ProcessProductionSkuCell[];
};

type LotDataset = {
  lot: ProcessProductionLot;
  processes: ProcessDefinition[];
  rows: RawSkuRow[];
};

const dataset: LotDataset[] = [
  {
    lot: {
      id: 'lot-et0107-236',
      orderNumber: 'ET0107-202405',
      styleNumber: 'ET0107',
      styleName: '儿童三层棉衣',
      bedNumber: '永春236床',
      remark: '加急排产 · 客户鸿铭',
      color: '深蓝',
      cuttingDate: '2024-05-06 08:30',
      quantity: 480,
    },
    processes: [
      { key: 'cutting', name: '裁剪', target: 480 },
      { key: 'sewing', name: '车缝', target: 480 },
      { key: 'locking', name: '锁眼', target: 480 },
      { key: 'button', name: '钉扣', target: 480 },
      { key: 'pressing', name: '整烫', target: 480 },
      { key: 'packing', name: '包装', target: 480 },
    ],
    rows: [
      {
        id: 'lot-et0107-236-sku-110',
        ticketNo: 'FP20240506001',
        color: '深蓝',
        size: '110',
        total: 80,
        cells: [
          { processKey: 'cutting', completed: 80, remaining: 0 },
          { processKey: 'sewing', completed: 72, remaining: 8 },
          { processKey: 'locking', completed: 46, remaining: 34 },
          { processKey: 'button', completed: 40, remaining: 40 },
          { processKey: 'pressing', completed: 28, remaining: 52 },
          { processKey: 'packing', completed: 20, remaining: 60 },
        ],
      },
      {
        id: 'lot-et0107-236-sku-120',
        ticketNo: 'FP20240506002',
        color: '深蓝',
        size: '120',
        total: 100,
        cells: [
          { processKey: 'cutting', completed: 100, remaining: 0 },
          { processKey: 'sewing', completed: 94, remaining: 6 },
          { processKey: 'locking', completed: 68, remaining: 32 },
          { processKey: 'button', completed: 60, remaining: 40 },
          { processKey: 'pressing', completed: 42, remaining: 58 },
          { processKey: 'packing', completed: 38, remaining: 62 },
        ],
      },
      {
        id: 'lot-et0107-236-sku-130',
        ticketNo: 'FP20240506003',
        color: '深蓝',
        size: '130',
        total: 120,
        cells: [
          { processKey: 'cutting', completed: 120, remaining: 0 },
          { processKey: 'sewing', completed: 112, remaining: 8 },
          { processKey: 'locking', completed: 76, remaining: 44 },
          { processKey: 'button', completed: 64, remaining: 56 },
          { processKey: 'pressing', completed: 50, remaining: 70 },
          { processKey: 'packing', completed: 42, remaining: 78 },
        ],
      },
      {
        id: 'lot-et0107-236-sku-140',
        ticketNo: 'FP20240506004',
        color: '深蓝',
        size: '140',
        total: 100,
        cells: [
          { processKey: 'cutting', completed: 100, remaining: 0 },
          { processKey: 'sewing', completed: 90, remaining: 10 },
          { processKey: 'locking', completed: 62, remaining: 38 },
          { processKey: 'button', completed: 54, remaining: 46 },
          { processKey: 'pressing', completed: 40, remaining: 60 },
          { processKey: 'packing', completed: 34, remaining: 66 },
        ],
      },
      {
        id: 'lot-et0107-236-sku-150',
        ticketNo: 'FP20240506005',
        color: '深蓝',
        size: '150',
        total: 80,
        cells: [
          { processKey: 'cutting', completed: 80, remaining: 0 },
          { processKey: 'sewing', completed: 76, remaining: 4 },
          { processKey: 'locking', completed: 56, remaining: 24 },
          { processKey: 'button', completed: 44, remaining: 36 },
          { processKey: 'pressing', completed: 30, remaining: 50 },
          { processKey: 'packing', completed: 24, remaining: 56 },
        ],
      },
    ],
  },
  {
    lot: {
      id: 'lot-et0297-188',
      orderNumber: 'ET0297-202405',
      styleNumber: 'ET0297',
      styleName: '男童拼接休闲短袖套装',
      bedNumber: '永春188床',
      remark: '带帽款式 · 配套短裤',
      color: '暮蓝/亮橙',
      cuttingDate: '2024-05-04 09:20',
      quantity: 360,
    },
    processes: [
      { key: 'cutting', name: '裁剪', target: 360 },
      { key: 'sewing', name: '车缝', target: 360 },
      { key: 'printing', name: '印花', target: 360 },
      { key: 'pressing', name: '整烫', target: 360 },
      { key: 'packing', name: '包装', target: 360 },
    ],
    rows: [
      {
        id: 'lot-et0297-188-sku-130',
        ticketNo: 'FP20240504011',
        color: '暮蓝/亮橙',
        size: '130',
        total: 90,
        cells: [
          { processKey: 'cutting', completed: 90, remaining: 0 },
          { processKey: 'sewing', completed: 82, remaining: 8 },
          { processKey: 'printing', completed: 46, remaining: 44 },
          { processKey: 'pressing', completed: 30, remaining: 60 },
          { processKey: 'packing', completed: 22, remaining: 68 },
        ],
      },
      {
        id: 'lot-et0297-188-sku-140',
        ticketNo: 'FP20240504012',
        color: '暮蓝/亮橙',
        size: '140',
        total: 90,
        cells: [
          { processKey: 'cutting', completed: 90, remaining: 0 },
          { processKey: 'sewing', completed: 78, remaining: 12 },
          { processKey: 'printing', completed: 54, remaining: 36 },
          { processKey: 'pressing', completed: 34, remaining: 56 },
          { processKey: 'packing', completed: 26, remaining: 64 },
        ],
      },
      {
        id: 'lot-et0297-188-sku-150',
        ticketNo: 'FP20240504013',
        color: '暮蓝/亮橙',
        size: '150',
        total: 90,
        cells: [
          { processKey: 'cutting', completed: 90, remaining: 0 },
          { processKey: 'sewing', completed: 74, remaining: 16 },
          { processKey: 'printing', completed: 50, remaining: 40 },
          { processKey: 'pressing', completed: 32, remaining: 58 },
          { processKey: 'packing', completed: 24, remaining: 66 },
        ],
      },
      {
        id: 'lot-et0297-188-sku-160',
        ticketNo: 'FP20240504014',
        color: '暮蓝/亮橙',
        size: '160',
        total: 90,
        cells: [
          { processKey: 'cutting', completed: 90, remaining: 0 },
          { processKey: 'sewing', completed: 68, remaining: 22 },
          { processKey: 'printing', completed: 46, remaining: 44 },
          { processKey: 'pressing', completed: 28, remaining: 62 },
          { processKey: 'packing', completed: 20, remaining: 70 },
        ],
      },
    ],
  },
  {
    lot: {
      id: 'lot-et5025-101',
      orderNumber: 'ET5025-202404',
      styleNumber: 'ET5025',
      styleName: '儿童斜拼拉链套装',
      bedNumber: '南安101床',
      remark: '常规交期',
      color: '黑/雾白',
      cuttingDate: '2024-04-28 10:10',
      quantity: 540,
    },
    processes: [
      { key: 'cutting', name: '裁剪', target: 540 },
      { key: 'sewing', name: '车缝', target: 540 },
      { key: 'overlock', name: '包缝', target: 540 },
      { key: 'inspection', name: '质检', target: 540 },
      { key: 'pressing', name: '整烫', target: 540 },
      { key: 'packing', name: '包装', target: 540 },
    ],
    rows: [
      {
        id: 'lot-et5025-101-sku-120',
        ticketNo: 'FP20240428021',
        color: '黑/雾白',
        size: '120',
        total: 110,
        cells: [
          { processKey: 'cutting', completed: 110, remaining: 0 },
          { processKey: 'sewing', completed: 98, remaining: 12 },
          { processKey: 'overlock', completed: 92, remaining: 18 },
          { processKey: 'inspection', completed: 88, remaining: 22 },
          { processKey: 'pressing', completed: 82, remaining: 28 },
          { processKey: 'packing', completed: 74, remaining: 36 },
        ],
      },
      {
        id: 'lot-et5025-101-sku-130',
        ticketNo: 'FP20240428022',
        color: '黑/雾白',
        size: '130',
        total: 110,
        cells: [
          { processKey: 'cutting', completed: 110, remaining: 0 },
          { processKey: 'sewing', completed: 102, remaining: 8 },
          { processKey: 'overlock', completed: 94, remaining: 16 },
          { processKey: 'inspection', completed: 90, remaining: 20 },
          { processKey: 'pressing', completed: 84, remaining: 26 },
          { processKey: 'packing', completed: 78, remaining: 32 },
        ],
      },
      {
        id: 'lot-et5025-101-sku-140',
        ticketNo: 'FP20240428023',
        color: '黑/雾白',
        size: '140',
        total: 110,
        cells: [
          { processKey: 'cutting', completed: 110, remaining: 0 },
          { processKey: 'sewing', completed: 96, remaining: 14 },
          { processKey: 'overlock', completed: 88, remaining: 22 },
          { processKey: 'inspection', completed: 82, remaining: 28 },
          { processKey: 'pressing', completed: 78, remaining: 32 },
          { processKey: 'packing', completed: 72, remaining: 38 },
        ],
      },
      {
        id: 'lot-et5025-101-sku-150',
        ticketNo: 'FP20240428024',
        color: '黑/雾白',
        size: '150',
        total: 100,
        cells: [
          { processKey: 'cutting', completed: 100, remaining: 0 },
          { processKey: 'sewing', completed: 92, remaining: 8 },
          { processKey: 'overlock', completed: 84, remaining: 16 },
          { processKey: 'inspection', completed: 80, remaining: 20 },
          { processKey: 'pressing', completed: 76, remaining: 24 },
          { processKey: 'packing', completed: 70, remaining: 30 },
        ],
      },
      {
        id: 'lot-et5025-101-sku-160',
        ticketNo: 'FP20240428025',
        color: '黑/雾白',
        size: '160',
        total: 110,
        cells: [
          { processKey: 'cutting', completed: 110, remaining: 0 },
          { processKey: 'sewing', completed: 104, remaining: 6 },
          { processKey: 'overlock', completed: 96, remaining: 14 },
          { processKey: 'inspection', completed: 92, remaining: 18 },
          { processKey: 'pressing', completed: 84, remaining: 26 },
          { processKey: 'packing', completed: 78, remaining: 32 },
        ],
      },
    ],
  },
];

const normalizeKeyword = (value?: string): string => (value ? value.trim().toLowerCase() : '');

const matchLotKeyword = (lot: ProcessProductionLot, keyword: string): boolean => {
  if (!keyword) return true;
  const target = keyword.toLowerCase();
  return [
    lot.orderNumber,
    lot.styleNumber,
    lot.styleName,
    lot.bedNumber,
    lot.remark,
    lot.color,
  ]
    .filter(Boolean)
    .some((field) => String(field).toLowerCase().includes(target));
};

const matchSkuKeyword = (row: RawSkuRow, params: ProcessProductionDetailParams): boolean => {
  const ticketKeyword = normalizeKeyword(params.ticketKeyword);
  const colorKeyword = normalizeKeyword(params.colorKeyword);
  const sizeKeyword = normalizeKeyword(params.sizeKeyword);

  if (ticketKeyword && !row.ticketNo.toLowerCase().includes(ticketKeyword)) {
    return false;
  }
  if (colorKeyword && !row.color.toLowerCase().includes(colorKeyword)) {
    return false;
  }
  if (sizeKeyword && !row.size.toLowerCase().includes(sizeKeyword)) {
    return false;
  }
  return true;
};

const buildProcessSummary = (rows: RawSkuRow[], processes: ProcessDefinition[]) => {
  const summary = new Map<string, { completed: number; remaining: number }>();
  rows.forEach((row) => {
    row.cells.forEach((cell) => {
      const current = summary.get(cell.processKey) ?? { completed: 0, remaining: 0 };
      summary.set(cell.processKey, {
        completed: current.completed + cell.completed,
        remaining: current.remaining + cell.remaining,
      });
    });
  });

  return processes.map((process) => {
    const aggregate = summary.get(process.key) ?? { completed: 0, remaining: 0 };
    const completedQuantity = aggregate.completed;
    const remainingQuantity = aggregate.remaining;
    const ratio = process.target ? completedQuantity / process.target : 0;
    return {
      key: process.key,
      name: process.name,
      targetQuantity: process.target,
      completedQuantity,
      wipQuantity: Math.max(process.target - completedQuantity - remainingQuantity, 0),
      ratio,
    };
  });
};

export const fetchProcessProductionLots = async (
  params: ProcessProductionLotListParams,
): Promise<ProcessProductionLotListResponse> => {
  await delay(320);
  const keyword = normalizeKeyword(params.keyword);
  const records = dataset.map((item) => item.lot).filter((lot) => matchLotKeyword(lot, keyword));
  const start = (params.page - 1) * params.pageSize;
  const end = start + params.pageSize;
  const list = records.slice(start, end);
  return {
    list,
    total: records.length,
  };
};

export const fetchProcessProductionDetails = async (
  params: ProcessProductionDetailParams,
): Promise<ProcessProductionDetailResponse> => {
  await delay(380);
  const entry = dataset.find((item) => item.lot.id === params.lotId);
  if (!entry) {
    throw new Error('lot not found');
  }
  const filteredRows = entry.rows.filter((row) => matchSkuKeyword(row, params));
  const start = (params.page - 1) * params.pageSize;
  const end = start + params.pageSize;
  const pagedRows = filteredRows.slice(start, end);

  const processSummary = buildProcessSummary(entry.rows, entry.processes);

  let bottleneckKey: string | undefined;
  let lowestRatio = Number.POSITIVE_INFINITY;
  processSummary.forEach((process) => {
    if (process.targetQuantity <= 0) {
      return;
    }
    if (process.ratio < lowestRatio) {
      lowestRatio = process.ratio;
      bottleneckKey = process.key;
    }
  });

  const processes = processSummary.map((process) => ({
    key: process.key,
    name: process.name,
    targetQuantity: process.targetQuantity,
    completedQuantity: process.completedQuantity,
    wipQuantity: process.wipQuantity,
    bottleneck: process.key === bottleneckKey,
  }));

  const list = pagedRows.map((row) => ({
    id: row.id,
    ticketNo: row.ticketNo,
    color: row.color,
    size: row.size,
    totalQuantity: row.total,
    processMap: row.cells.reduce<Record<string, ProcessProductionSkuCell>>((acc, cell) => {
      acc[cell.processKey] = cell;
      return acc;
    }, {}),
  }));

  const totalQuantity = entry.rows.reduce((sum, row) => sum + row.total, 0);
  const totalCompleted = entry.rows.reduce((sum, row) => {
    const packingCell = row.cells.find((cell) => cell.processKey === 'packing') ?? row.cells.at(-1);
    return sum + (packingCell?.completed ?? 0);
  }, 0);

  return {
    processes,
    list,
    total: filteredRows.length,
    summary: {
      totalSku: entry.rows.length,
      totalQuantity,
      totalCompleted,
      bottleneckProcessKey: bottleneckKey,
    },
  };
};

export const exportProcessProductionMatrix = async (
  _params: ProcessProductionExportParams,
): Promise<{ fileUrl: string }> => {
  await delay(260);
  void _params;
  return {
    fileUrl: '/mock/exports/process-production-matrix.xlsx',
  };
};
