import type {
  FinishedGoodsReceivedDailyAggregation,
  FinishedGoodsReceivedListParams,
  FinishedGoodsReceivedListResponse,
  FinishedGoodsReceivedMeta,
  FinishedGoodsReceivedProcessorOption,
  FinishedGoodsReceivedRecord,
  FinishedGoodsReceivedSummary,
  FinishedGoodsReceivedUpdatePayload,
  FinishedGoodsReceivedWarehouseOption,
} from '../types/finished-goods-received';
import { fallbackStyleAsset, productProcessors, productWarehouses, styleAssetMap } from './product-common';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const toWarehouseOption = (warehouse: { id: string; name: string }): FinishedGoodsReceivedWarehouseOption => ({
  id: warehouse.id,
  name: warehouse.name,
});

const toProcessorOption = (processor: { id: string; name: string }): FinishedGoodsReceivedProcessorOption => ({
  id: processor.id,
  name: processor.name,
});

const getWarehouseName = (warehouseId: string): string =>
  productWarehouses.find((item) => item.id === warehouseId)?.name ?? '杭州成品仓';

const getProcessorName = (processorId?: string): string | undefined =>
  processorId ? productProcessors.find((item) => item.id === processorId)?.name ?? processorId : undefined;

const resolveImage = (styleNo: string): string => styleAssetMap[styleNo] ?? fallbackStyleAsset;

type BuildRecordParams = {
  id: string;
  receiptNo: string;
  receiptDate: string;
  warehouseId: string;
  factoryOrderNo: string;
  customerCategory: string;
  styleNo: string;
  styleName: string;
  processorId?: string;
  color: string;
  size: string;
  quantity: number;
  remark?: string;
};

const buildRecord = (params: BuildRecordParams): FinishedGoodsReceivedRecord => ({
  ...params,
  warehouseName: getWarehouseName(params.warehouseId),
  processorName: getProcessorName(params.processorId),
  sku: `${params.styleNo}-${params.color}-${params.size}`,
  imageUrl: resolveImage(params.styleNo),
});

const baseRecords: FinishedGoodsReceivedRecord[] = [
  buildRecord({
    id: 'rec-20250301-001',
    receiptNo: 'RC-20250301-001',
    receiptDate: '2025-03-01T09:25:00.000Z',
    warehouseId: 'wh-hz',
    factoryOrderNo: 'FO-20250301-001',
    customerCategory: '直营客户',
    styleNo: 'ET0110',
    styleName: '儿童羊羔毛拉链夹克套装',
    processorId: 'proc-01',
    color: '黑色',
    size: '120',
    quantity: 260,
    remark: '首批收货，外箱完好',
  }),
  buildRecord({
    id: 'rec-20250301-002',
    receiptNo: 'RC-20250301-002',
    receiptDate: '2025-03-01T10:05:00.000Z',
    warehouseId: 'wh-hz',
    factoryOrderNo: 'FO-20250301-002',
    customerCategory: '分销客户',
    styleNo: 'ET0110',
    styleName: '儿童羊羔毛拉链夹克套装',
    processorId: 'proc-01',
    color: '浅灰',
    size: '130',
    quantity: 180,
  }),
  buildRecord({
    id: 'rec-20250302-001',
    receiptNo: 'RC-20250302-001',
    receiptDate: '2025-03-02T08:45:00.000Z',
    warehouseId: 'wh-sz',
    factoryOrderNo: 'FO-20250301-003',
    customerCategory: '直营客户',
    styleNo: 'ET0168',
    styleName: '儿童条纹工装卫裤',
    processorId: 'proc-02',
    color: '军绿',
    size: '130',
    quantity: 220,
    remark: '与质检单匹配',
  }),
  buildRecord({
    id: 'rec-20250302-002',
    receiptNo: 'RC-20250302-002',
    receiptDate: '2025-03-02T14:10:00.000Z',
    warehouseId: 'wh-sz',
    factoryOrderNo: 'FO-20250301-003',
    customerCategory: '直营客户',
    styleNo: 'ET0168',
    styleName: '儿童条纹工装卫裤',
    processorId: 'proc-02',
    color: '藏青',
    size: '140',
    quantity: 200,
  }),
  buildRecord({
    id: 'rec-20250303-001',
    receiptNo: 'RC-20250303-001',
    receiptDate: '2025-03-03T09:05:00.000Z',
    warehouseId: 'wh-hz',
    factoryOrderNo: 'OS-20250302-006',
    customerCategory: '代工回收',
    styleNo: 'ET5033',
    styleName: '儿童撞色条纹卫衣卫裤套装',
    processorId: 'proc-03',
    color: '湖蓝',
    size: '130',
    quantity: 160,
    remark: '外协加工首批',
  }),
  buildRecord({
    id: 'rec-20250303-002',
    receiptNo: 'RC-20250303-002',
    receiptDate: '2025-03-03T11:20:00.000Z',
    warehouseId: 'wh-cq',
    factoryOrderNo: 'FO-20250302-004',
    customerCategory: '直营客户',
    styleNo: 'ET0193',
    styleName: '儿童书包卫衣',
    processorId: 'proc-02',
    color: '白色',
    size: '150',
    quantity: 180,
  }),
  buildRecord({
    id: 'rec-20250304-001',
    receiptNo: 'RC-20250304-001',
    receiptDate: '2025-03-04T08:30:00.000Z',
    warehouseId: 'wh-hz',
    factoryOrderNo: 'FO-20250303-005',
    customerCategory: '分销客户',
    styleNo: 'ET0151',
    styleName: '儿童拉链连帽拼色套装',
    processorId: 'proc-01',
    color: '粉色',
    size: '130',
    quantity: 210,
  }),
  buildRecord({
    id: 'rec-20250304-002',
    receiptNo: 'RC-20250304-002',
    receiptDate: '2025-03-04T15:10:00.000Z',
    warehouseId: 'wh-hz',
    factoryOrderNo: 'FO-20250303-005',
    customerCategory: '直营客户',
    styleNo: 'ET0151',
    styleName: '儿童拉链连帽拼色套装',
    processorId: 'proc-01',
    color: '藏青',
    size: '140',
    quantity: 190,
  }),
  buildRecord({
    id: 'rec-20250305-001',
    receiptNo: 'RC-20250305-001',
    receiptDate: '2025-03-05T09:40:00.000Z',
    warehouseId: 'wh-cq',
    factoryOrderNo: 'FO-20250302-004',
    customerCategory: '直营客户',
    styleNo: 'ET0193',
    styleName: '儿童书包卫衣',
    processorId: 'proc-02',
    color: '黑色',
    size: '140',
    quantity: 170,
    remark: '补齐尾单',
  }),
  buildRecord({
    id: 'rec-20250305-002',
    receiptNo: 'RC-20250305-002',
    receiptDate: '2025-03-05T16:05:00.000Z',
    warehouseId: 'wh-sz',
    factoryOrderNo: 'OS-20250302-006',
    customerCategory: '代工回收',
    styleNo: 'ET5033',
    styleName: '儿童撞色条纹卫衣卫裤套装',
    processorId: 'proc-03',
    color: '橘色',
    size: '120',
    quantity: 150,
  }),
];

let workingRecords: FinishedGoodsReceivedRecord[] = baseRecords.map((item) => ({ ...item }));

const cloneRecord = (record: FinishedGoodsReceivedRecord): FinishedGoodsReceivedRecord => ({ ...record });

const applyFilters = (
  record: FinishedGoodsReceivedRecord,
  params: FinishedGoodsReceivedListParams,
): boolean => {
  if (params.warehouseId && record.warehouseId !== params.warehouseId) {
    return false;
  }

  const orderKeyword = params.keywordOrderOrStyle?.trim().toLowerCase();
  if (orderKeyword) {
    const target = [record.factoryOrderNo, record.styleNo, record.styleName].join(' ').toLowerCase();
    if (!target.includes(orderKeyword)) {
      return false;
    }
  }

  const processorKeyword = params.keywordProcessor?.trim().toLowerCase();
  if (processorKeyword) {
    const processorTarget = [record.processorName, record.processorId].filter(Boolean).join(' ').toLowerCase();
    if (!processorTarget.includes(processorKeyword)) {
      return false;
    }
  }

  return true;
};

const calculateSummary = (records: FinishedGoodsReceivedRecord[]): FinishedGoodsReceivedSummary => {
  const totalQuantity = records.reduce((sum, item) => sum + item.quantity, 0);
  const skuCount = new Set(records.map((item) => item.sku)).size;
  return {
    totalQuantity,
    skuCount,
    recordCount: records.length,
  };
};

const groupByReceiptDate = (
  records: FinishedGoodsReceivedRecord[],
): FinishedGoodsReceivedDailyAggregation[] => {
  const groupMap = new Map<
    string,
    {
      id: string;
      receiptDate: string;
      recordCount: number;
      totalQuantity: number;
      skuSet: Set<string>;
      warehouseSet: Set<string>;
    }
  >();

  records.forEach((record) => {
    const dateKey = record.receiptDate.slice(0, 10);
    const next = groupMap.get(dateKey) ?? {
      id: dateKey,
      receiptDate: dateKey,
      recordCount: 0,
      totalQuantity: 0,
      skuSet: new Set<string>(),
      warehouseSet: new Set<string>(),
    };
    next.recordCount += 1;
    next.totalQuantity += record.quantity;
    next.skuSet.add(record.sku);
    next.warehouseSet.add(record.warehouseId);
    groupMap.set(dateKey, next);
  });

  return Array.from(groupMap.values())
    .map((item) => ({
      id: item.id,
      receiptDate: item.receiptDate,
      recordCount: item.recordCount,
      totalQuantity: item.totalQuantity,
      skuCount: item.skuSet.size,
      warehouseCount: item.warehouseSet.size,
    }))
    .sort((a, b) => (a.receiptDate < b.receiptDate ? 1 : -1));
};

export const fetchFinishedGoodsReceivedMeta = async (): Promise<FinishedGoodsReceivedMeta> => {
  await delay(260);
  return {
    warehouses: productWarehouses.map(toWarehouseOption),
    processors: productProcessors.map(toProcessorOption),
  };
};

export const fetchFinishedGoodsReceivedList = async (
  params: FinishedGoodsReceivedListParams,
): Promise<FinishedGoodsReceivedListResponse> => {
  await delay(320);
  const filtered = workingRecords.filter((record) => applyFilters(record, params)).sort((a, b) =>
    a.receiptDate < b.receiptDate ? 1 : -1,
  );
  const summary = calculateSummary(filtered);

  if (params.viewMode === 'receiptDate') {
    const aggregations = groupByReceiptDate(filtered);
    const start = (params.page - 1) * params.pageSize;
    const end = start + params.pageSize;
    return {
      list: aggregations.slice(start, end),
      total: aggregations.length,
      summary,
    };
  }

  const start = (params.page - 1) * params.pageSize;
  const end = start + params.pageSize;
  return {
    list: filtered.slice(start, end).map(cloneRecord),
    total: filtered.length,
    summary,
  };
};

export const updateFinishedGoodsReceivedRecord = async (
  id: string,
  payload: FinishedGoodsReceivedUpdatePayload,
): Promise<FinishedGoodsReceivedRecord> => {
  await delay(280);
  const match = workingRecords.find((item) => item.id === id);
  if (!match) {
    throw new Error('RECORD_NOT_FOUND');
  }
  match.warehouseId = payload.warehouseId;
  match.warehouseName = getWarehouseName(payload.warehouseId);
  match.quantity = payload.quantity;
  match.remark = payload.remark;
  return cloneRecord(match);
};

export const removeFinishedGoodsReceivedRecords = async (ids: string[]): Promise<{ success: boolean }> => {
  await delay(280);
  workingRecords = workingRecords.filter((item) => !ids.includes(item.id));
  return { success: true };
};

export const exportFinishedGoodsReceived = async (
  params: FinishedGoodsReceivedListParams,
): Promise<{ url: string }> => {
  await delay(200);
  void params;
  return {
    url: '/downloads/finished-goods-received.xlsx',
  };
};

export const resetFinishedGoodsReceivedMock = () => {
  workingRecords = baseRecords.map((item) => ({ ...item }));
};
