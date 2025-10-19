import type {
  FinishedGoodsPendingReceiptListParams,
  FinishedGoodsPendingReceiptListResponse,
  FinishedGoodsPendingReceiptMeta,
  FinishedGoodsPendingReceiptOrderType,
  FinishedGoodsPendingReceiptOrderTypeOption,
  FinishedGoodsPendingReceiptReceivePayload,
  FinishedGoodsPendingReceiptRecord,
  FinishedGoodsPendingReceiptWarehouse,
} from '../types/finished-goods-pending-receipt';
import { fallbackStyleAsset, productStyleOptions, productWarehouses } from './product-common';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const orderTypeOptions: FinishedGoodsPendingReceiptOrderTypeOption[] = [
  { value: 'production', label: '生产订单' },
  { value: 'outsourcing', label: '外协加工单' },
];

const toWarehouseOption = (warehouse: { id: string; name: string }): FinishedGoodsPendingReceiptWarehouse => ({
  id: warehouse.id,
  name: warehouse.name,
});

const resolveStyleImage = (styleNo: string): string => {
  const match = productStyleOptions.find((item) => item.styleNo === styleNo);
  return match?.imageUrl ?? fallbackStyleAsset;
};

const buildRecord = (
  params: {
    id: string;
    factoryOrderNo: string;
    orderType: FinishedGoodsPendingReceiptOrderType;
    customerName: string;
    styleNo: string;
    styleName: string;
    color: string;
    size: string;
    orderedQty: number;
    producedQty: number;
    receivedQty: number;
  },
): FinishedGoodsPendingReceiptRecord => ({
  ...params,
  imageUrl: resolveStyleImage(params.styleNo),
  orderTypeLabel: orderTypeOptions.find((item) => item.value === params.orderType)?.label ?? '生产订单',
  sku: `${params.styleNo}-${params.color}-${params.size}`,
  pendingQty: Math.max(params.producedQty - params.receivedQty, 0),
});

const baseRecords: FinishedGoodsPendingReceiptRecord[] = [
  buildRecord({
    id: 'pr-20250301-001',
    factoryOrderNo: 'FO-20250301-001',
    orderType: 'production',
    customerName: '杭州琪琳童装',
    styleNo: 'ET0110',
    styleName: '儿童羊羔毛拉链夹克套装',
    color: '黑色',
    size: '120',
    orderedQty: 600,
    producedQty: 520,
    receivedQty: 260,
  }),
  buildRecord({
    id: 'pr-20250301-002',
    factoryOrderNo: 'FO-20250301-001',
    orderType: 'production',
    customerName: '杭州琪琳童装',
    styleNo: 'ET0110',
    styleName: '儿童羊羔毛拉链夹克套装',
    color: '浅灰',
    size: '130',
    orderedQty: 400,
    producedQty: 360,
    receivedQty: 120,
  }),
  buildRecord({
    id: 'pr-20250302-001',
    factoryOrderNo: 'FO-20250302-003',
    orderType: 'production',
    customerName: '苏州晴童坊',
    styleNo: 'ET0193',
    styleName: '儿童书包卫衣',
    color: '白色',
    size: '140',
    orderedQty: 480,
    producedQty: 440,
    receivedQty: 400,
  }),
  buildRecord({
    id: 'pr-20250302-002',
    factoryOrderNo: 'FO-20250302-003',
    orderType: 'production',
    customerName: '苏州晴童坊',
    styleNo: 'ET0193',
    styleName: '儿童书包卫衣',
    color: '黑色',
    size: '150',
    orderedQty: 300,
    producedQty: 280,
    receivedQty: 160,
  }),
  buildRecord({
    id: 'os-20250304-001',
    factoryOrderNo: 'OS-20250304-006',
    orderType: 'outsourcing',
    customerName: '宁波晴川贸易',
    styleNo: 'ET5033',
    styleName: '儿童撞色条纹卫衣卫裤套装',
    color: '湖蓝',
    size: '130',
    orderedQty: 360,
    producedQty: 360,
    receivedQty: 0,
  }),
  buildRecord({
    id: 'os-20250304-002',
    factoryOrderNo: 'OS-20250304-006',
    orderType: 'outsourcing',
    customerName: '宁波晴川贸易',
    styleNo: 'ET5033',
    styleName: '儿童撞色条纹卫衣卫裤套装',
    color: '橘色',
    size: '120',
    orderedQty: 300,
    producedQty: 260,
    receivedQty: 40,
  }),
  buildRecord({
    id: 'os-20250305-001',
    factoryOrderNo: 'OS-20250305-002',
    orderType: 'outsourcing',
    customerName: '湖州森鹿童品',
    styleNo: 'ET0362',
    styleName: '儿童黑色波浪拉链速干短裤',
    color: '黑色',
    size: '140',
    orderedQty: 420,
    producedQty: 420,
    receivedQty: 210,
  }),
  buildRecord({
    id: 'pr-20250306-001',
    factoryOrderNo: 'FO-20250306-005',
    orderType: 'production',
    customerName: '南京优瑞童装',
    styleNo: 'ET0151',
    styleName: '儿童拉链连帽拼色套装',
    color: '粉色',
    size: '130',
    orderedQty: 500,
    producedQty: 410,
    receivedQty: 220,
  }),
  buildRecord({
    id: 'pr-20250306-002',
    factoryOrderNo: 'FO-20250306-005',
    orderType: 'production',
    customerName: '南京优瑞童装',
    styleNo: 'ET0151',
    styleName: '儿童拉链连帽拼色套装',
    color: '藏青',
    size: '140',
    orderedQty: 450,
    producedQty: 360,
    receivedQty: 360,
  }),
];

let workingRecords: FinishedGoodsPendingReceiptRecord[] = baseRecords.map((item) => ({ ...item }));

const cloneRecord = (record: FinishedGoodsPendingReceiptRecord): FinishedGoodsPendingReceiptRecord => ({ ...record });

const applySearchFilter = (
  record: FinishedGoodsPendingReceiptRecord,
  params: FinishedGoodsPendingReceiptListParams,
): boolean => {
  const orderKeyword = params.keywordOrderOrStyle?.trim().toLowerCase();
  if (orderKeyword) {
    const target = [record.factoryOrderNo, record.styleNo, record.styleName].join(' ').toLowerCase();
    if (!target.includes(orderKeyword)) {
      return false;
    }
  }

  const customerKeyword = params.keywordCustomer?.trim().toLowerCase();
  if (customerKeyword) {
    if (!record.customerName.toLowerCase().includes(customerKeyword)) {
      return false;
    }
  }

  const skuKeyword = params.keywordSku?.trim().toLowerCase();
  if (skuKeyword) {
    if (!record.sku.toLowerCase().includes(skuKeyword)) {
      return false;
    }
  }

  if (params.orderType && record.orderType !== params.orderType) {
    return false;
  }

  if (!params.includeCompleted && record.pendingQty <= 0) {
    return false;
  }

  return true;
};

const summarize = (records: FinishedGoodsPendingReceiptRecord[]) =>
  records.reduce(
    (
      acc,
      record,
    ) => {
      acc.orderedQty += record.orderedQty;
      acc.producedQty += record.producedQty;
      acc.pendingQty += record.pendingQty;
      acc.receivedQty += record.receivedQty;
      return acc;
    },
    {
      orderedQty: 0,
      producedQty: 0,
      pendingQty: 0,
      receivedQty: 0,
    },
  );

export const fetchFinishedGoodsPendingReceiptMeta = async (): Promise<FinishedGoodsPendingReceiptMeta> => {
  await delay(240);
  return {
    warehouses: productWarehouses.map(toWarehouseOption),
    orderTypes: orderTypeOptions,
  };
};

export const fetchFinishedGoodsPendingReceiptList = async (
  params: FinishedGoodsPendingReceiptListParams,
): Promise<FinishedGoodsPendingReceiptListResponse> => {
  await delay(320);
  const filtered = workingRecords.filter((record) => applySearchFilter(record, params));
  const total = filtered.length;
  const pageStart = (params.page - 1) * params.pageSize;
  const pageData = filtered.slice(pageStart, pageStart + params.pageSize).map(cloneRecord);
  const summary = summarize(filtered);
  return { list: pageData, total, summary };
};

export const submitFinishedGoodsReceipt = async (
  payload: FinishedGoodsPendingReceiptReceivePayload,
): Promise<{ success: boolean }> => {
  await delay(360);
  payload.items.forEach((item) => {
    const target = workingRecords.find((record) => record.id === item.id);
    if (!target) {
      return;
    }
    const nextReceived = Math.min(target.producedQty, target.receivedQty + Math.max(item.receiptQty, 0));
    target.receivedQty = nextReceived;
    target.pendingQty = Math.max(target.producedQty - nextReceived, 0);
  });
  return { success: true };
};

export const resetFinishedGoodsPendingReceiptDataset = () => {
  workingRecords = baseRecords.map((item) => ({ ...item }));
};
