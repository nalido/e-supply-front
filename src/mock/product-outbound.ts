import type {
  FinishedGoodsOutboundListParams,
  FinishedGoodsOutboundListResponse,
  FinishedGoodsOutboundMeta,
  FinishedGoodsOutboundRecord,
} from '../types/finished-goods-outbound';
import { productWarehouses, productStyleOptions } from './product-common';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const outboundCustomers = [
  { id: 'cust-tmall', name: '天猫童装旗舰店', tier: 'A' },
  { id: 'cust-jd', name: '京东童装旗舰店', tier: 'A' },
  { id: 'cust-offline-east', name: '华东经销商联盟', tier: 'B' },
  { id: 'cust-crv', name: '华润万家供应链', tier: 'A' },
  { id: 'cust-hn', name: '湖南门店联盟', tier: 'C' },
  { id: 'cust-ningbo', name: '宁波杉杉童装渠道', tier: 'B' },
];

const outboundLogistics = [
  { id: 'log-sf', name: '顺丰速运', serviceLevel: '标准翌日达' },
  { id: 'log-yto', name: '圆通速递', serviceLevel: '电商特惠' },
  { id: 'log-zto', name: '中通快运', serviceLevel: '干线专线' },
  { id: 'log-jtex', name: '极兔速递', serviceLevel: '特惠经济' },
];

const findWarehouseName = (warehouseId: string): string =>
  productWarehouses.find((warehouse) => warehouse.id === warehouseId)?.name ?? '未分配仓库';

const findCustomerName = (customerId: string): string =>
  outboundCustomers.find((customer) => customer.id === customerId)?.name ?? '未知客户';

const findStyleName = (styleNo: string): string =>
  productStyleOptions.find((style) => style.styleNo === styleNo)?.styleName ?? '未登记款式';

const baseOutboundRecords: FinishedGoodsOutboundRecord[] = [
  {
    id: 'out-20250301-001',
    dispatchNoteNo: 'DN20250301001',
    dispatchDate: '2025-03-01',
    customerId: 'cust-tmall',
    customerName: findCustomerName('cust-tmall'),
    warehouseId: 'wh-hz',
    warehouseName: findWarehouseName('wh-hz'),
    orderNo: 'SO20240218001',
    styleNo: 'ET0110',
    styleName: findStyleName('ET0110'),
    color: '黑色',
    size: '130',
    quantity: 120,
    unitPrice: 89,
    amount: 10680,
    logisticsProvider: '顺丰速运',
    trackingNumber: 'SF145678901234',
    status: 'shipped',
  },
  {
    id: 'out-20250301-002',
    dispatchNoteNo: 'DN20250301002',
    dispatchDate: '2025-03-01',
    customerId: 'cust-tmall',
    customerName: findCustomerName('cust-tmall'),
    warehouseId: 'wh-hz',
    warehouseName: findWarehouseName('wh-hz'),
    orderNo: 'SO20240218001',
    styleNo: 'ET0110',
    styleName: findStyleName('ET0110'),
    color: '浅灰',
    size: '130',
    quantity: 96,
    unitPrice: 89,
    amount: 8544,
    logisticsProvider: '顺丰速运',
    trackingNumber: 'SF145678901235',
    status: 'shipped',
  },
  {
    id: 'out-20250302-003',
    dispatchNoteNo: 'DN20250302001',
    dispatchDate: '2025-03-02',
    customerId: 'cust-jd',
    customerName: findCustomerName('cust-jd'),
    warehouseId: 'wh-sz',
    warehouseName: findWarehouseName('wh-sz'),
    orderNo: 'SO20240221008',
    styleNo: 'ET0168',
    styleName: findStyleName('ET0168'),
    color: '军绿',
    size: '140',
    quantity: 150,
    unitPrice: 79,
    amount: 11850,
    logisticsProvider: '中通快运',
    trackingNumber: 'ZTO568902345612',
    status: 'partial',
  },
  {
    id: 'out-20250302-004',
    dispatchNoteNo: 'DN20250302001',
    dispatchDate: '2025-03-02',
    customerId: 'cust-jd',
    customerName: findCustomerName('cust-jd'),
    warehouseId: 'wh-sz',
    warehouseName: findWarehouseName('wh-sz'),
    orderNo: 'SO20240221008',
    styleNo: 'ET0168',
    styleName: findStyleName('ET0168'),
    color: '藏青',
    size: '130',
    quantity: 120,
    unitPrice: 79,
    amount: 9480,
    logisticsProvider: '中通快运',
    trackingNumber: 'ZTO568902345612',
    status: 'partial',
  },
  {
    id: 'out-20250303-005',
    dispatchNoteNo: 'DN20250303001',
    dispatchDate: '2025-03-03',
    customerId: 'cust-crv',
    customerName: findCustomerName('cust-crv'),
    warehouseId: 'wh-hz',
    warehouseName: findWarehouseName('wh-hz'),
    orderNo: 'SO20240226005',
    styleNo: 'ET0151',
    styleName: findStyleName('ET0151'),
    color: '藏青',
    size: '140',
    quantity: 200,
    unitPrice: 92,
    amount: 18400,
    logisticsProvider: '顺丰速运',
    trackingNumber: 'SF145678905678',
    status: 'shipped',
  },
  {
    id: 'out-20250303-006',
    dispatchNoteNo: 'DN20250303002',
    dispatchDate: '2025-03-03',
    customerId: 'cust-crv',
    customerName: findCustomerName('cust-crv'),
    warehouseId: 'wh-hz',
    warehouseName: findWarehouseName('wh-hz'),
    orderNo: 'SO20240226005',
    styleNo: 'ET0151',
    styleName: findStyleName('ET0151'),
    color: '粉色',
    size: '130',
    quantity: 160,
    unitPrice: 92,
    amount: 14720,
    logisticsProvider: '顺丰速运',
    trackingNumber: 'SF145678905679',
    status: 'partial',
  },
  {
    id: 'out-20250304-007',
    dispatchNoteNo: 'DN20250304001',
    dispatchDate: '2025-03-04',
    customerId: 'cust-offline-east',
    customerName: findCustomerName('cust-offline-east'),
    warehouseId: 'wh-cq',
    warehouseName: findWarehouseName('wh-cq'),
    orderNo: 'SO20240228003',
    styleNo: 'ET5033',
    styleName: findStyleName('ET5033'),
    color: '湖蓝',
    size: '130',
    quantity: 80,
    unitPrice: 72,
    amount: 5760,
    logisticsProvider: '圆通速递',
    trackingNumber: 'YTO453219874561',
    status: 'partial',
  },
  {
    id: 'out-20250304-008',
    dispatchNoteNo: 'DN20250304002',
    dispatchDate: '2025-03-04',
    customerId: 'cust-offline-east',
    customerName: findCustomerName('cust-offline-east'),
    warehouseId: 'wh-cq',
    warehouseName: findWarehouseName('wh-cq'),
    orderNo: 'SO20240228003',
    styleNo: 'ET5033',
    styleName: findStyleName('ET5033'),
    color: '黑色',
    size: '120',
    quantity: 64,
    unitPrice: 72,
    amount: 4608,
    logisticsProvider: '圆通速递',
    trackingNumber: 'YTO453219874562',
    status: 'partial',
  },
  {
    id: 'out-20250305-009',
    dispatchNoteNo: 'DN20250305001',
    dispatchDate: '2025-03-05',
    customerId: 'cust-hn',
    customerName: findCustomerName('cust-hn'),
    warehouseId: 'wh-sz',
    warehouseName: findWarehouseName('wh-sz'),
    orderNo: 'SO20240301012',
    styleNo: 'ET0193',
    styleName: findStyleName('ET0193'),
    color: '白色',
    size: '150',
    quantity: 90,
    unitPrice: 68,
    amount: 6120,
    logisticsProvider: '极兔速递',
    trackingNumber: 'JT892376450123',
    status: 'partial',
  },
  {
    id: 'out-20250305-010',
    dispatchNoteNo: 'DN20250305002',
    dispatchDate: '2025-03-05',
    customerId: 'cust-hn',
    customerName: findCustomerName('cust-hn'),
    warehouseId: 'wh-sz',
    warehouseName: findWarehouseName('wh-sz'),
    orderNo: 'SO20240301012',
    styleNo: 'ET0193',
    styleName: findStyleName('ET0193'),
    color: '黑色',
    size: '140',
    quantity: 72,
    unitPrice: 68,
    amount: 4896,
    logisticsProvider: '极兔速递',
    trackingNumber: 'JT892376450124',
    status: 'shipped',
  },
  {
    id: 'out-20250306-011',
    dispatchNoteNo: 'DN20250306001',
    dispatchDate: '2025-03-06',
    customerId: 'cust-ningbo',
    customerName: findCustomerName('cust-ningbo'),
    warehouseId: 'wh-hz',
    warehouseName: findWarehouseName('wh-hz'),
    orderNo: 'SO20240302006',
    styleNo: 'ET5031',
    styleName: findStyleName('ET5031'),
    color: '咖色',
    size: '120',
    quantity: 110,
    unitPrice: 75,
    amount: 8250,
    logisticsProvider: '圆通速递',
    trackingNumber: 'YTO453219874599',
    status: 'partial',
  },
  {
    id: 'out-20250306-012',
    dispatchNoteNo: 'DN20250306002',
    dispatchDate: '2025-03-06',
    customerId: 'cust-ningbo',
    customerName: findCustomerName('cust-ningbo'),
    warehouseId: 'wh-hz',
    warehouseName: findWarehouseName('wh-hz'),
    orderNo: 'SO20240302006',
    styleNo: 'ET5031',
    styleName: findStyleName('ET5031'),
    color: '墨绿',
    size: '130',
    quantity: 96,
    unitPrice: 75,
    amount: 7200,
    logisticsProvider: '圆通速递',
    trackingNumber: 'YTO453219874600',
    status: 'partial',
  },
  {
    id: 'out-20250307-013',
    dispatchNoteNo: 'DN20250307001',
    dispatchDate: '2025-03-07',
    customerId: 'cust-tmall',
    customerName: findCustomerName('cust-tmall'),
    warehouseId: 'wh-hz',
    warehouseName: findWarehouseName('wh-hz'),
    orderNo: 'SO20240303001',
    styleNo: 'ET0409',
    styleName: findStyleName('ET0409'),
    color: '粉色',
    size: '130',
    quantity: 140,
    unitPrice: 95,
    amount: 13300,
    logisticsProvider: '顺丰速运',
    trackingNumber: 'SF145678907531',
    status: 'partial',
  },
  {
    id: 'out-20250307-014',
    dispatchNoteNo: 'DN20250307002',
    dispatchDate: '2025-03-07',
    customerId: 'cust-tmall',
    customerName: findCustomerName('cust-tmall'),
    warehouseId: 'wh-hz',
    warehouseName: findWarehouseName('wh-hz'),
    orderNo: 'SO20240303002',
    styleNo: 'ET0409',
    styleName: findStyleName('ET0409'),
    color: '藏青',
    size: '140',
    quantity: 96,
    unitPrice: 95,
    amount: 9120,
    logisticsProvider: '顺丰速运',
    trackingNumber: 'SF145678907532',
    status: 'shipped',
  },
  {
    id: 'out-20250308-015',
    dispatchNoteNo: 'DN20250308001',
    dispatchDate: '2025-03-08',
    customerId: 'cust-jd',
    customerName: findCustomerName('cust-jd'),
    warehouseId: 'wh-sz',
    warehouseName: findWarehouseName('wh-sz'),
    orderNo: 'SO20240304009',
    styleNo: 'ET0362',
    styleName: findStyleName('ET0362'),
    color: '黑色',
    size: '150',
    quantity: 120,
    unitPrice: 65,
    amount: 7800,
    logisticsProvider: '中通快运',
    trackingNumber: 'ZTO568902349999',
    status: 'partial',
  },
  {
    id: 'out-20250308-016',
    dispatchNoteNo: 'DN20250308002',
    dispatchDate: '2025-03-08',
    customerId: 'cust-jd',
    customerName: findCustomerName('cust-jd'),
    warehouseId: 'wh-sz',
    warehouseName: findWarehouseName('wh-sz'),
    orderNo: 'SO20240304010',
    styleNo: 'ET0362',
    styleName: findStyleName('ET0362'),
    color: '黑色',
    size: '140',
    quantity: 90,
    unitPrice: 65,
    amount: 5850,
    logisticsProvider: '中通快运',
    trackingNumber: 'ZTO568902340000',
    status: 'partial',
  },
];

const matchesKeyword = (record: FinishedGoodsOutboundRecord, keyword: string): boolean => {
  const lower = keyword.toLowerCase();
  return (
    record.dispatchNoteNo.toLowerCase().includes(lower) ||
    record.orderNo.toLowerCase().includes(lower) ||
    record.styleNo.toLowerCase().includes(lower) ||
    record.styleName.toLowerCase().includes(lower)
  );
};

const filterRecords = (params: FinishedGoodsOutboundListParams) => {
  const { customerId, warehouseId, keyword, showCompletedOrders } = params;
  return baseOutboundRecords.filter((record) => {
    if (customerId && record.customerId !== customerId) {
      return false;
    }
    if (warehouseId && record.warehouseId !== warehouseId) {
      return false;
    }
    if (!showCompletedOrders && record.status === 'shipped') {
      return false;
    }
    if (keyword && !matchesKeyword(record, keyword)) {
      return false;
    }
    return true;
  });
};

export const fetchFinishedGoodsOutboundMeta = async (): Promise<FinishedGoodsOutboundMeta> => {
  await delay(200);
  return {
    warehouses: productWarehouses,
    customers: outboundCustomers,
    logistics: outboundLogistics,
  };
};

export const fetchFinishedGoodsOutboundList = async (
  params: FinishedGoodsOutboundListParams,
): Promise<FinishedGoodsOutboundListResponse> => {
  await delay(260);
  const filtered = filterRecords(params);
  const { page, pageSize } = params;
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const list = filtered.slice(start, end);

  const summary = filtered.reduce(
    (acc, record) => {
      acc.quantity += record.quantity;
      acc.amount += record.amount;
      return acc;
    },
    { quantity: 0, amount: 0 },
  );

  return {
    list,
    total: filtered.length,
    summary,
  };
};
