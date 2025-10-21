import type {
  FinishedGoodsStockListParams,
  FinishedGoodsStockListResponse,
  FinishedGoodsStockMeta,
  FinishedGoodsStockRecord,
} from '../types/finished-goods-stock';
import { productWarehouses, productStyleOptions, styleAssetMap } from './product-common';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const groupingOptions: FinishedGoodsStockMeta['groupingOptions'] = [
  { label: '分订单', value: 'order' },
  { label: '分客户', value: 'customer' },
  { label: '分规格', value: 'spec' },
];

type StylePresentation = { styleName: string; imageUrl?: string };

const styleInfoCache = new Map<string, StylePresentation>();

const getStyleInfo = (styleNo: string): StylePresentation => {
  if (styleInfoCache.has(styleNo)) {
    return styleInfoCache.get(styleNo)!;
  }
  const matched = productStyleOptions.find((style) => style.styleNo === styleNo);
  const presentation: StylePresentation = {
    styleName: matched?.styleName ?? '未知款式',
    imageUrl: styleAssetMap[styleNo],
  };
  styleInfoCache.set(styleNo, presentation);
  return presentation;
};

const infoET0110 = getStyleInfo('ET0110');
const infoET0168 = getStyleInfo('ET0168');
const infoET0151 = getStyleInfo('ET0151');
const infoET0193 = getStyleInfo('ET0193');
const infoET5033 = getStyleInfo('ET5033');
const infoET5031 = getStyleInfo('ET5031');

const stockDataset: FinishedGoodsStockRecord[] = [
  {
    id: 'stock-0001',
    warehouseId: 'wh-hz',
    warehouseName: '杭州成品仓',
    factoryOrderNo: 'FO202402-001',
    customerName: '杭州颂客商贸',
    styleNo: 'ET0110',
    styleName: infoET0110.styleName,
    color: '藏青裤',
    size: '130',
    sku: 'ET0110-藏青-130',
    quantity: 186,
    imageUrl: infoET0110.imageUrl,
  },
  {
    id: 'stock-0002',
    warehouseId: 'wh-hz',
    warehouseName: '杭州成品仓',
    factoryOrderNo: 'FO202402-001',
    customerName: '杭州颂客商贸',
    styleNo: 'ET0110',
    styleName: infoET0110.styleName,
    color: '藏青上衣',
    size: '130',
    sku: 'ET0110-藏青上衣-130',
    quantity: 152,
    imageUrl: infoET0110.imageUrl,
  },
  {
    id: 'stock-0003',
    warehouseId: 'wh-hz',
    warehouseName: '杭州成品仓',
    factoryOrderNo: 'FO202402-004',
    customerName: '苏州意澜童装',
    styleNo: 'ET0168',
    styleName: infoET0168.styleName,
    color: '军绿',
    size: '120',
    sku: 'ET0168-军绿-120',
    quantity: 98,
    imageUrl: infoET0168.imageUrl,
  },
  {
    id: 'stock-0004',
    warehouseId: 'wh-sz',
    warehouseName: '苏州中转仓',
    factoryOrderNo: 'FO202402-004',
    customerName: '苏州意澜童装',
    styleNo: 'ET0168',
    styleName: infoET0168.styleName,
    color: '藏青',
    size: '130',
    sku: 'ET0168-藏青-130',
    quantity: 56,
    imageUrl: infoET0168.imageUrl,
  },
  {
    id: 'stock-0005',
    warehouseId: 'wh-sz',
    warehouseName: '苏州中转仓',
    factoryOrderNo: 'FO202401-012',
    customerName: '南京三叶草童品',
    styleNo: 'ET0151',
    styleName: infoET0151.styleName,
    color: '粉色',
    size: '140',
    sku: 'ET0151-粉色-140',
    quantity: 0,
    imageUrl: infoET0151.imageUrl,
  },
  {
    id: 'stock-0006',
    warehouseId: 'wh-cq',
    warehouseName: '重庆成品仓',
    factoryOrderNo: 'FO202401-045',
    customerName: '重庆蓓尔童装集采',
    styleNo: 'ET0193',
    styleName: infoET0193.styleName,
    color: '黑色',
    size: '150',
    sku: 'ET0193-黑色-150',
    quantity: 72,
    imageUrl: infoET0193.imageUrl,
  },
  {
    id: 'stock-0007',
    warehouseId: 'wh-cq',
    warehouseName: '重庆成品仓',
    factoryOrderNo: 'FO202401-045',
    customerName: '重庆蓓尔童装集采',
    styleNo: 'ET0193',
    styleName: infoET0193.styleName,
    color: '白色',
    size: '140',
    sku: 'ET0193-白色-140',
    quantity: 44,
    imageUrl: infoET0193.imageUrl,
  },
  {
    id: 'stock-0008',
    warehouseId: 'wh-hz',
    warehouseName: '杭州成品仓',
    factoryOrderNo: 'FO202312-022',
    customerName: '杭州颂客商贸',
    styleNo: 'ET5033',
    styleName: infoET5033.styleName,
    color: '橘色',
    size: '120',
    sku: 'ET5033-橘色-120',
    quantity: 128,
    imageUrl: infoET5033.imageUrl,
  },
  {
    id: 'stock-0009',
    warehouseId: 'wh-sz',
    warehouseName: '苏州中转仓',
    factoryOrderNo: 'FO202312-022',
    customerName: '杭州颂客商贸',
    styleNo: 'ET5033',
    styleName: infoET5033.styleName,
    color: '湖蓝',
    size: '130',
    sku: 'ET5033-湖蓝-130',
    quantity: 96,
    imageUrl: infoET5033.imageUrl,
  },
  {
    id: 'stock-0010',
    warehouseId: 'wh-cq',
    warehouseName: '重庆成品仓',
    factoryOrderNo: 'FO202312-030',
    customerName: '成都悠乐童衣',
    styleNo: 'ET5031',
    styleName: infoET5031.styleName,
    color: '咖色',
    size: '130',
    sku: 'ET5031-咖色-130',
    quantity: 68,
    imageUrl: infoET5031.imageUrl,
  },
];

const summarize = (records: FinishedGoodsStockRecord[]) =>
  records.reduce(
    (acc, item) => {
      acc.quantityTotal += item.quantity;
      return acc;
    },
    { quantityTotal: 0 },
  );

export const fetchFinishedGoodsStockMeta = async (): Promise<FinishedGoodsStockMeta> => {
  await delay(180);
  return {
    warehouses: productWarehouses,
    groupingOptions,
    defaultGrouping: groupingOptions.map((option) => option.value),
  };
};

export const fetchFinishedGoodsStockList = async (
  params: FinishedGoodsStockListParams,
): Promise<FinishedGoodsStockListResponse> => {
  await delay(260);
  let filtered = stockDataset;

  if (params.onlyInStock) {
    filtered = filtered.filter((item) => item.quantity > 0);
  }

  if (params.warehouseId) {
    filtered = filtered.filter((item) => item.warehouseId === params.warehouseId);
  }

  if (params.keywordSku) {
    const keyword = params.keywordSku.trim().toLowerCase();
    if (keyword) {
      filtered = filtered.filter((item) => {
        const haystack = `${item.sku} ${item.styleNo}`.toLowerCase();
        return haystack.includes(keyword);
      });
    }
  }

  if (params.keywordMixed) {
    const keyword = params.keywordMixed.trim().toLowerCase();
    if (keyword) {
      filtered = filtered.filter((item) => {
        const haystack = `${item.factoryOrderNo} ${item.styleNo} ${item.styleName} ${item.customerName}`.toLowerCase();
        return haystack.includes(keyword);
      });
    }
  }

  const includeOrder = params.groupBy.includes('order');
  const includeCustomer = params.groupBy.includes('customer');
  const includeSpec = params.groupBy.includes('spec');

  const aggregateMap = new Map<string, FinishedGoodsStockRecord>();

  filtered.forEach((item) => {
    const keyParts = [
      item.warehouseId,
      includeOrder ? item.factoryOrderNo ?? '*' : '*',
      includeCustomer ? item.customerName ?? '*' : '*',
      includeSpec ? item.sku ?? '*' : '*',
    ];
    const key = keyParts.join('|');
    const existing = aggregateMap.get(key);
    if (existing) {
      existing.quantity += item.quantity;
      return;
    }

    aggregateMap.set(key, {
      id: includeOrder && includeCustomer && includeSpec ? item.id : `agg-${key}`,
      warehouseId: item.warehouseId,
      warehouseName: item.warehouseName,
      factoryOrderNo: includeOrder ? item.factoryOrderNo : undefined,
      customerName: includeCustomer ? item.customerName : undefined,
      styleNo: includeSpec ? item.styleNo : undefined,
      styleName: includeSpec ? item.styleName : undefined,
      color: includeSpec ? item.color : undefined,
      size: includeSpec ? item.size : undefined,
      sku: includeSpec ? item.sku : undefined,
      imageUrl: includeSpec ? item.imageUrl : undefined,
      quantity: item.quantity,
    });
  });

  const aggregated = Array.from(aggregateMap.values());

  const safePage = Math.max(1, params.page);
  const safeSize = Math.max(1, params.pageSize);
  const start = (safePage - 1) * safeSize;
  const list = aggregated.slice(start, start + safeSize);
  return {
    list,
    total: aggregated.length,
    summary: summarize(filtered),
  };
};
