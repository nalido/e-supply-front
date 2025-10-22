import type {
  ProductionComparisonListParams,
  ProductionComparisonListResponse,
  ProductionComparisonRecord,
  ProductionComparisonStage,
} from '../types/order-production-comparison';
import { productStyleOptions } from './product-common';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const stageDefinitions: ProductionComparisonStage[] = [
  { key: 'cutting', name: '裁剪' },
  { key: 'sewing', name: '车缝' },
  { key: 'laserPocketOpening', name: '激光开袋' },
  { key: 'buttoning', name: '打扣' },
  { key: 'inspection', name: '质检' },
  { key: 'packaging', name: '包装' },
];

const stageKeys = stageDefinitions.map((stage) => stage.key);

const progressProfiles: number[][] = [
  [0, 0, 0, 0, 0, 0],
  [0.4, 0.1, 0, 0, 0, 0],
  [0.7, 0.45, 0.1, 0, 0, 0],
  [0.95, 0.75, 0.35, 0.2, 0, 0],
  [1, 0.95, 0.7, 0.45, 0.2, 0],
  [1, 1, 0.85, 0.65, 0.35, 0.1],
  [1, 1, 1, 0.85, 0.55, 0.25],
  [1, 1, 1, 1, 0.85, 0.45],
  [1, 1, 1, 1, 1, 0.75],
  [1, 1, 1, 1, 1, 1],
];

const orderStatuses = ['新单', '生产准备', '生产中', '完工排期', '已完成'];
const materialStatuses = ['未采购', '采购中', '部分到货', '已入仓', '已齐备'];
const customers = ['杭州迈瑞思', '宁波大华', '嘉兴衣珂', '湖州致远', '苏州梵尚', '上海禾沐'];
const merchandisers = ['王莉', '张楠', '陈思', '刘源', '赵婧', '孙诺'];
const units = ['件', '套'];

const baseDate = new Date('2025-03-01T08:00:00.000Z');
const dayMs = 24 * 60 * 60 * 1000;

const makeOrderNumber = (index: number) => `FO${baseDate.getUTCFullYear()}${(baseDate.getUTCMonth() + 1)
  .toString()
  .padStart(2, '0')}${(index + 137).toString().padStart(4, '0')}`;

const dataset: ProductionComparisonRecord[] = Array.from({ length: 64 }).map((_, index) => {
  const style = productStyleOptions[index % productStyleOptions.length];
  const profile = progressProfiles[index % progressProfiles.length];
  const orderQty = 360 + (index % 6) * 80;
  const plannedCutQty = orderQty + Math.round(orderQty * ((index % 3) * 0.05));
  const unit = units[index % units.length];
  const orderDate = new Date(baseDate.getTime() + index * dayMs);
  const expectedDelivery = new Date(orderDate.getTime() + (18 + (index % 5) * 3) * dayMs);

  const progress = stageKeys.reduce<Record<string, number>>((acc, key, stageIndex) => {
    acc[key] = Math.min(orderQty, Math.round(orderQty * profile[stageIndex]));
    return acc;
  }, {});

  const packagingQty = progress.packaging ?? 0;
  const warehousingRatio = Math.min(1, packagingQty / orderQty);
  const warehousingQty = Math.round(orderQty * warehousingRatio * (0.9 + (index % 3) * 0.03));
  const deliveryRatio = [0, 0.35, 0.5, 0.65, 0.8][index % 5];
  const deliveryQty = Math.min(warehousingQty, Math.round(warehousingQty * deliveryRatio));
  const inventoryQty = Math.max(warehousingQty - deliveryQty, 0);

  const cuttingRatio = profile[0];
  const packagingRatio = profile[profile.length - 1];

  const statusIndex = Math.min(orderStatuses.length - 1, Math.floor(packagingRatio * orderStatuses.length));
  const materialIndex = Math.min(materialStatuses.length - 1, Math.floor(cuttingRatio * materialStatuses.length));

  return {
    id: `prod-${index + 1}`,
    imageUrl: style.imageUrl,
    orderNumber: makeOrderNumber(index),
    orderStatus: orderStatuses[statusIndex],
    materialStatus: materialStatuses[materialIndex],
    customer: customers[index % customers.length],
    merchandiser: merchandisers[index % merchandisers.length],
    styleNumber: style.styleNo,
    styleName: style.styleName,
    orderDate: orderDate.toISOString().slice(0, 10),
    expectedDelivery: expectedDelivery.toISOString().slice(0, 10),
    orderQty,
    unit,
    plannedCutQty,
    progress,
    warehousingQty,
    deliveryQty,
    inventoryQty,
  };
});

const buildSummary = (records: ProductionComparisonRecord[]) => {
  const initialProgress = stageKeys.reduce<Record<string, number>>((acc, key) => {
    acc[key] = 0;
    return acc;
  }, {});

  return records.reduce(
    (acc, record) => {
      acc.orderQty += record.orderQty;
      acc.plannedCutQty += record.plannedCutQty;
      stageKeys.forEach((key) => {
        acc.progress[key] += record.progress[key] ?? 0;
      });
      acc.warehousingQty += record.warehousingQty;
      acc.deliveryQty += record.deliveryQty;
      acc.inventoryQty += record.inventoryQty;
      return acc;
    },
    {
      orderQty: 0,
      plannedCutQty: 0,
      progress: initialProgress,
      warehousingQty: 0,
      deliveryQty: 0,
      inventoryQty: 0,
    },
  );
};

const matchesKeyword = (record: ProductionComparisonRecord, keyword: string) => {
  const normalized = keyword.trim().toLowerCase();
  if (!normalized) {
    return true;
  }
  return [
    record.orderNumber,
    record.styleNumber,
    record.styleName,
    record.customer,
    record.merchandiser,
  ]
    .join('|')
    .toLowerCase()
    .includes(normalized);
};

const sortRecords = (
  records: ProductionComparisonRecord[],
  sortBy?: ProductionComparisonListParams['sortBy'],
  order?: ProductionComparisonListParams['order'],
) => {
  if (!sortBy || !order) {
    return records;
  }

  const modifier = order === 'ascend' ? 1 : -1;

  return [...records].sort((a, b) => {
    const [primary, secondary] = sortBy.split('.');

    const getValue = (record: ProductionComparisonRecord) => {
      if (secondary && primary === 'progress') {
        return record.progress[secondary] ?? 0;
      }
      return (record as Record<string, unknown>)[sortBy] ?? 0;
    };

    const valueA = getValue(a);
    const valueB = getValue(b);

    if (typeof valueA === 'number' && typeof valueB === 'number') {
      return (valueA - valueB) * modifier;
    }

    const strA = String(valueA);
    const strB = String(valueB);
    return strA.localeCompare(strB, 'zh-CN') * modifier;
  });
};

export const fetchProductionComparisonList = async (
  params: ProductionComparisonListParams,
): Promise<ProductionComparisonListResponse> => {
  await delay(320);

  const { keyword, page, pageSize, sortBy, order } = params;

  const filtered = dataset.filter((record) => (keyword ? matchesKeyword(record, keyword) : true));
  const sorted = sortRecords(filtered, sortBy, order);

  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const paged = sorted.slice(start, end);

  const summary = buildSummary(filtered);

  return {
    list: paged,
    total: filtered.length,
    summary,
    stages: stageDefinitions,
  };
};

export const exportProductionComparison = async (
  params: ProductionComparisonListParams,
): Promise<{ fileUrl: string }> => {
  await delay(800);
  const keywordSegment = params.keyword?.trim() ? `_${params.keyword.trim()}` : '';
  const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
  return {
    fileUrl: `/downloads/production-comparison${keywordSegment || ''}_${timestamp}.xlsx`,
  };
};
