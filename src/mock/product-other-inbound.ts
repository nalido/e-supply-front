import type {
  FinishedGoodsOtherInboundDailyRecord,
  FinishedGoodsOtherInboundFormPayload,
  FinishedGoodsOtherInboundListParams,
  FinishedGoodsOtherInboundListResponse,
  FinishedGoodsOtherInboundMeta,
  FinishedGoodsOtherInboundRecord,
  FinishedGoodsOtherInboundSummary,
} from '../types/finished-goods-other-inbound';
import {
  fallbackStyleAsset,
  getStyleOptionById,
  otherInboundTypeOptions,
  productProcessors,
  productStyleOptions,
  productWarehouses,
} from './product-common';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const createRandomId = () => `oi-${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 8)}`;

const findWarehouseName = (warehouseId: string): string =>
  productWarehouses.find((warehouse) => warehouse.id === warehouseId)?.name ?? '未分配仓库';

const findProcessorName = (processorId: string): string =>
  productProcessors.find((processor) => processor.id === processorId)?.name ?? '未知加工厂';

const resolveStyleMeta = (styleId: string) => {
  const style = getStyleOptionById(styleId);
  if (!style) {
    return {
      styleNo: 'UNKNOWN',
      styleName: '未登记款式',
      imageUrl: fallbackStyleAsset,
    };
  }
  return {
    styleNo: style.styleNo,
    styleName: style.styleName,
    imageUrl: style.imageUrl,
  };
};

const buildSku = (styleNo: string, color: string, size: string) => `${styleNo}-${color}-${size}`;

const toDateLabel = (value: string) => value.slice(0, 10);

const roundCurrency = (value: number) => Math.round(value * 100) / 100;

const baseMockRecords: FinishedGoodsOtherInboundRecord[] = [
  {
    recordType: 'spec',
    id: 'oi-20250301-001',
    warehouseId: 'wh-hz',
    warehouseName: findWarehouseName('wh-hz'),
    processorId: 'proc-01',
    processorName: findProcessorName('proc-01'),
    styleId: 'ET0110',
    ...resolveStyleMeta('ET0110'),
    color: '黑色',
    size: '120',
    sku: buildSku('ET0110', '黑色', '120'),
    imageUrl: resolveStyleMeta('ET0110').imageUrl,
    inboundQty: 120,
    unitPrice: 56,
    amount: 6720,
    receiptAt: '2025-03-01 09:35',
    inboundType: 'customer-return',
    remark: '旗舰店退货批次',
  },
  {
    recordType: 'spec',
    id: 'oi-20250302-002',
    warehouseId: 'wh-hz',
    warehouseName: findWarehouseName('wh-hz'),
    processorId: 'proc-02',
    processorName: findProcessorName('proc-02'),
    styleId: 'ET0168',
    ...resolveStyleMeta('ET0168'),
    color: '军绿',
    size: '130',
    sku: buildSku('ET0168', '军绿', '130'),
    imageUrl: resolveStyleMeta('ET0168').imageUrl,
    inboundQty: 80,
    unitPrice: 52,
    amount: 4160,
    receiptAt: '2025-03-02 14:12',
    inboundType: 'inventory-surplus',
    remark: '月度盘点差异调整',
  },
  {
    recordType: 'spec',
    id: 'oi-20250303-003',
    warehouseId: 'wh-sz',
    warehouseName: findWarehouseName('wh-sz'),
    processorId: 'proc-03',
    processorName: findProcessorName('proc-03'),
    styleId: 'ET0151',
    ...resolveStyleMeta('ET0151'),
    color: '粉色',
    size: '130',
    sku: buildSku('ET0151', '粉色', '130'),
    imageUrl: resolveStyleMeta('ET0151').imageUrl,
    inboundQty: 95,
    unitPrice: 58,
    amount: 5510,
    receiptAt: '2025-03-03 10:05',
    inboundType: 'sample-inbound',
    remark: '春季订货会样衣回仓',
  },
  {
    recordType: 'spec',
    id: 'oi-20250305-004',
    warehouseId: 'wh-hz',
    warehouseName: findWarehouseName('wh-hz'),
    processorId: 'proc-01',
    processorName: findProcessorName('proc-01'),
    styleId: 'ET0193',
    ...resolveStyleMeta('ET0193'),
    color: '白色',
    size: '140',
    sku: buildSku('ET0193', '白色', '140'),
    imageUrl: resolveStyleMeta('ET0193').imageUrl,
    inboundQty: 60,
    unitPrice: 49,
    amount: 2940,
    receiptAt: '2025-03-05 16:22',
    inboundType: 'customer-return',
    remark: '华东代理退回库存',
  },
  {
    recordType: 'spec',
    id: 'oi-20250306-005',
    warehouseId: 'wh-cq',
    warehouseName: findWarehouseName('wh-cq'),
    processorId: 'proc-02',
    processorName: findProcessorName('proc-02'),
    styleId: 'ET5033',
    ...resolveStyleMeta('ET5033'),
    color: '橘色',
    size: '120',
    sku: buildSku('ET5033', '橘色', '120'),
    imageUrl: resolveStyleMeta('ET5033').imageUrl,
    inboundQty: 70,
    unitPrice: 61,
    amount: 4270,
    receiptAt: '2025-03-06 11:48',
    inboundType: 'initial-stock',
    remark: '新仓启用期初导入',
  },
  {
    recordType: 'spec',
    id: 'oi-20250308-006',
    warehouseId: 'wh-sz',
    warehouseName: findWarehouseName('wh-sz'),
    processorId: 'proc-03',
    processorName: findProcessorName('proc-03'),
    styleId: 'ET0409',
    ...resolveStyleMeta('ET0409'),
    color: '藏青',
    size: '140',
    sku: buildSku('ET0409', '藏青', '140'),
    imageUrl: resolveStyleMeta('ET0409').imageUrl,
    inboundQty: 88,
    unitPrice: 63,
    amount: 5544,
    receiptAt: '2025-03-08 09:26',
    inboundType: 'inventory-surplus',
    remark: '华南仓盘盈调拨',
  },
  {
    recordType: 'spec',
    id: 'oi-20250310-007',
    warehouseId: 'wh-hz',
    warehouseName: findWarehouseName('wh-hz'),
    processorId: 'proc-01',
    processorName: findProcessorName('proc-01'),
    styleId: 'ET5031',
    ...resolveStyleMeta('ET5031'),
    color: '咖色',
    size: '130',
    sku: buildSku('ET5031', '咖色', '130'),
    imageUrl: resolveStyleMeta('ET5031').imageUrl,
    inboundQty: 54,
    unitPrice: 59,
    amount: 3186,
    receiptAt: '2025-03-10 15:18',
    inboundType: 'sample-inbound',
    remark: '直播间样衣回收',
  },
  {
    recordType: 'spec',
    id: 'oi-20250311-008',
    warehouseId: 'wh-cq',
    warehouseName: findWarehouseName('wh-cq'),
    processorId: 'proc-02',
    processorName: findProcessorName('proc-02'),
    styleId: 'ET0362',
    ...resolveStyleMeta('ET0362'),
    color: '黑色',
    size: '140',
    sku: buildSku('ET0362', '黑色', '140'),
    imageUrl: resolveStyleMeta('ET0362').imageUrl,
    inboundQty: 48,
    unitPrice: 46,
    amount: 2208,
    receiptAt: '2025-03-11 13:05',
    inboundType: 'adjustment',
    remark: '补录外协入库',
  },
];

let records = [...baseMockRecords];

const filterRecords = (params: FinishedGoodsOtherInboundListParams): FinishedGoodsOtherInboundRecord[] => {
  const keyword = params.keyword?.trim().toLowerCase();
  return records
    .filter((record) => {
      if (params.warehouseId && record.warehouseId !== params.warehouseId) {
        return false;
      }
      if (keyword) {
        const matchesStyleNo = record.styleNo.toLowerCase().includes(keyword);
        const matchesStyleName = record.styleName.toLowerCase().includes(keyword);
        const matchesSku = record.sku.toLowerCase().includes(keyword);
        if (!matchesStyleNo && !matchesStyleName && !matchesSku) {
          return false;
        }
      }
      return true;
    })
    .sort((a, b) => (a.receiptAt > b.receiptAt ? -1 : 1));
};

const paginate = <T,>(list: T[], page: number, pageSize: number): T[] => {
  const start = (page - 1) * pageSize;
  return list.slice(start, start + pageSize);
};

const computeSummary = (list: FinishedGoodsOtherInboundRecord[]): FinishedGoodsOtherInboundSummary =>
  list.reduce(
    (acc, record) => {
      acc.inboundQty += record.inboundQty;
      acc.amount += record.amount;
      return acc;
    },
    { inboundQty: 0, amount: 0 },
  );

const aggregateByDate = (
  list: FinishedGoodsOtherInboundRecord[],
): FinishedGoodsOtherInboundDailyRecord[] => {
  const map = new Map<string, FinishedGoodsOtherInboundDailyRecord>();

  list.forEach((record) => {
    const receiptDate = toDateLabel(record.receiptAt);
    const key = `${receiptDate}-${record.warehouseId}`;
    const existing = map.get(key);
    if (existing) {
      existing.inboundQty += record.inboundQty;
      existing.amount += record.amount;
      existing.ticketCount += 1;
      if (!existing.processorNames.includes(record.processorName)) {
        existing.processorNames.push(record.processorName);
      }
    } else {
      map.set(key, {
        recordType: 'date',
        id: key,
        receiptDate,
        warehouseId: record.warehouseId,
        warehouseName: record.warehouseName,
        inboundQty: record.inboundQty,
        amount: record.amount,
        avgUnitPrice: 0,
        ticketCount: 1,
        processorNames: [record.processorName],
      });
    }
  });

  return Array.from(map.values())
    .map((item) => ({
      ...item,
      inboundQty: Math.round(item.inboundQty),
      amount: roundCurrency(item.amount),
      avgUnitPrice: item.inboundQty > 0 ? roundCurrency(item.amount / item.inboundQty) : 0,
    }))
    .sort((a, b) => (a.receiptDate > b.receiptDate ? -1 : 1));
};

export const fetchFinishedGoodsOtherInboundMeta = async (): Promise<FinishedGoodsOtherInboundMeta> => {
  await delay(200);
  return {
    warehouses: productWarehouses,
    processors: productProcessors,
    inboundTypes: otherInboundTypeOptions,
    styles: productStyleOptions,
  };
};

export const fetchFinishedGoodsOtherInboundList = async (
  params: FinishedGoodsOtherInboundListParams,
): Promise<FinishedGoodsOtherInboundListResponse> => {
  await delay(260);
  const filtered = filterRecords(params);
  const summary = computeSummary(filtered);

  if (params.viewMode === 'date') {
    const aggregated = aggregateByDate(filtered);
    const paged = paginate(aggregated, params.page, params.pageSize).map((item) => ({
      ...item,
      amount: roundCurrency(item.amount),
    }));
    return {
      viewMode: 'date',
      list: paged,
      total: aggregated.length,
      summary,
    };
  }

  const paged = paginate(filtered, params.page, params.pageSize);
  return {
    viewMode: 'spec',
    list: paged,
    total: filtered.length,
    summary,
  };
};

const mapPayloadToRecord = (
  id: string,
  payload: FinishedGoodsOtherInboundFormPayload,
): FinishedGoodsOtherInboundRecord => {
  const warehouseName = findWarehouseName(payload.warehouseId);
  const processorName = findProcessorName(payload.processorId);
  const styleMeta = resolveStyleMeta(payload.styleId);
  const sku = buildSku(styleMeta.styleNo, payload.color, payload.size);
  const unitPrice = roundCurrency(payload.unitPrice);
  const inboundQty = Math.round(payload.inboundQty);
  const amount = roundCurrency(unitPrice * inboundQty);

  return {
    recordType: 'spec',
    id,
    warehouseId: payload.warehouseId,
    warehouseName,
    processorId: payload.processorId,
    processorName,
    styleId: payload.styleId,
    styleNo: styleMeta.styleNo,
    styleName: styleMeta.styleName,
    color: payload.color,
    size: payload.size,
    sku,
    imageUrl: styleMeta.imageUrl,
    inboundQty,
    unitPrice,
    amount,
    receiptAt: payload.receiptAt,
    inboundType: payload.inboundType,
    remark: payload.remark,
  };
};

export const createFinishedGoodsOtherInbound = async (
  payload: FinishedGoodsOtherInboundFormPayload,
): Promise<FinishedGoodsOtherInboundRecord> => {
  await delay(220);
  const record = mapPayloadToRecord(createRandomId(), payload);
  records = [record, ...records];
  return record;
};

export const updateFinishedGoodsOtherInbound = async (
  id: string,
  payload: FinishedGoodsOtherInboundFormPayload,
): Promise<FinishedGoodsOtherInboundRecord> => {
  await delay(220);
  const index = records.findIndex((item) => item.id === id);
  if (index === -1) {
    throw new Error('记录不存在');
  }
  const updated = mapPayloadToRecord(id, payload);
  records = [
    ...records.slice(0, index),
    updated,
    ...records.slice(index + 1),
  ];
  return updated;
};

export const removeFinishedGoodsOtherInbound = async (ids: string[]): Promise<number> => {
  await delay(180);
  const before = records.length;
  records = records.filter((record) => !ids.includes(record.id));
  return before - records.length;
};
