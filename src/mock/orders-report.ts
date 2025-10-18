import type {
  BulkCostAggregation,
  BulkCostDetailValue,
  BulkCostListParams,
  BulkCostListResponse,
  BulkCostOrderItem,
} from '../types/bulk-cost-report';

const styleAssets: Record<string, string> = {
  ET0110: '/assets/images/styles/ET0110.jpg',
  ET0151: '/assets/images/styles/ET0151.jpg',
  ET0152: '/assets/images/styles/ET0152.jpg',
  ET0168: '/assets/images/styles/ET0168.jpg',
  ET0193: '/assets/images/styles/ET0193.jpg',
  ET0409: '/assets/images/styles/ET0409.jpg',
  ET5031: '/assets/images/styles/ET5031.jpg',
  ET5201: '/assets/images/styles/ET5201.jpg',
  ET5315: '/assets/images/styles/ET5315.jpg',
  ET5406: '/assets/images/styles/ET5406.jpg',
};

const fallbackStyleImage = '/assets/images/styles/ET0110.jpg';

const toCurrency = (value: number): number => Number(value.toFixed(2));

const composeCosts = (
  quantity: number,
  items: Record<string, BulkCostDetailValue>,
): Record<string, BulkCostDetailValue> => {
  const totals = Object.values(items).reduce<BulkCostDetailValue>((acc, current) => ({
    procurement: acc.procurement + current.procurement,
    production: acc.production + current.production,
  }), { procurement: 0, production: 0 });

  const safeQuantity = quantity > 0 ? quantity : 1;
  const total = {
    procurement: toCurrency(totals.procurement),
    production: toCurrency(totals.production),
  };

  const unit = {
    procurement: toCurrency(total.procurement / safeQuantity),
    production: toCurrency(total.production / safeQuantity),
  };

  return {
    total,
    unit,
    ...items,
  };
};

type OrderConfig = Omit<BulkCostOrderItem, 'imageUrl' | 'costs'> & {
  costItems: Record<string, BulkCostDetailValue>;
};

const createOrder = (config: OrderConfig): BulkCostOrderItem => ({
  ...config,
  imageUrl: styleAssets[config.styleCode] ?? fallbackStyleImage,
  costs: composeCosts(config.calculatedQty, config.costItems),
});

const bulkCostOrders: BulkCostOrderItem[] = [
  createOrder({
    id: 'bulk-2024-11-01',
    styleCode: 'ET0110',
    styleName: '儿童羊羔毛拉链夹克套装',
    orderNumber: 'ET0110-202411-01',
    orderStatus: '已完成',
    customerId: 'cust-a',
    customerName: '客户A',
    calculatedQty: 1800,
    receivedQty: 1760,
    unitPrice: 52,
    orderDate: '2024-11-12',
    receiptDate: '2024-12-08',
    costItems: {
      fabric: { procurement: 18500, production: 0 },
      accessories: { procurement: 4200, production: 0 },
      sewing: { procurement: 0, production: 20880 },
      finishing: { procurement: 0, production: 3240 },
      inspection: { procurement: 0, production: 1360 },
    },
  }),
  createOrder({
    id: 'bulk-2024-12-01',
    styleCode: 'ET0168',
    styleName: '儿童条纹工装卫裤',
    orderNumber: 'ET0168-202412-12',
    orderStatus: '已完成',
    customerId: 'cust-b',
    customerName: '客户B',
    calculatedQty: 2150,
    receivedQty: 2104,
    unitPrice: 48,
    orderDate: '2024-12-03',
    receiptDate: '2025-01-04',
    costItems: {
      fabric: { procurement: 20120, production: 0 },
      accessories: { procurement: 3860, production: 0 },
      sewing: { procurement: 0, production: 22880 },
      washing: { procurement: 0, production: 4120 },
      packaging: { procurement: 0, production: 1680 },
    },
  }),
  createOrder({
    id: 'bulk-2025-01-01',
    styleCode: 'ET0151',
    styleName: '儿童拉链连帽拼色套装',
    orderNumber: 'ET0151-202501-05',
    orderStatus: '生产中',
    customerId: 'cust-c',
    customerName: '客户C',
    calculatedQty: 2640,
    receivedQty: 0,
    unitPrice: 56,
    orderDate: '2025-01-08',
    receiptDate: '2025-02-10',
    costItems: {
      fabric: { procurement: 25680, production: 0 },
      accessories: { procurement: 6120, production: 0 },
      sewing: { procurement: 0, production: 28640 },
      printing: { procurement: 0, production: 3480 },
      finishing: { procurement: 0, production: 2740 },
    },
  }),
  createOrder({
    id: 'bulk-2025-01-02',
    styleCode: 'ET0409',
    styleName: '儿童拼色连帽开衫套装',
    orderNumber: 'ET0409-202501-18',
    orderStatus: '已完成',
    customerId: 'cust-d',
    customerName: '客户D',
    calculatedQty: 1980,
    receivedQty: 1956,
    unitPrice: 62,
    orderDate: '2025-01-22',
    receiptDate: '2025-02-20',
    costItems: {
      fabric: { procurement: 21240, production: 0 },
      accessories: { procurement: 4860, production: 0 },
      sewing: { procurement: 0, production: 24840 },
      printing: { procurement: 0, production: 3920 },
      inspection: { procurement: 0, production: 1480 },
    },
  }),
  createOrder({
    id: 'bulk-2025-02-01',
    styleCode: 'ET5031',
    styleName: '儿童高领开衫撞色条纹套装',
    orderNumber: 'ET5031-202502-02',
    orderStatus: '已完成',
    customerId: 'cust-a',
    customerName: '客户A',
    calculatedQty: 2276,
    receivedQty: 2276,
    unitPrice: 50,
    orderDate: '2025-02-05',
    receiptDate: '2025-03-02',
    costItems: {
      fabric: { procurement: 20040, production: 0 },
      accessories: { procurement: 5320, production: 0 },
      sewing: { procurement: 0, production: 30280 },
      finishing: { procurement: 0, production: 2860 },
      packaging: { procurement: 0, production: 1560 },
    },
  }),
  createOrder({
    id: 'bulk-2025-02-02',
    styleCode: 'ET0152',
    styleName: '儿童拼色棒球服套装',
    orderNumber: 'ET0152-202502-09',
    orderStatus: '生产中',
    customerId: 'cust-b',
    customerName: '客户B',
    calculatedQty: 1860,
    receivedQty: 940,
    unitPrice: 58,
    orderDate: '2025-02-18',
    receiptDate: '2025-03-22',
    costItems: {
      fabric: { procurement: 17580, production: 0 },
      accessories: { procurement: 3980, production: 0 },
      sewing: { procurement: 0, production: 21920 },
      embroidery: { procurement: 0, production: 3120 },
      finishing: { procurement: 0, production: 1840 },
    },
  }),
  createOrder({
    id: 'bulk-2025-03-01',
    styleCode: 'ET5315',
    styleName: '儿童撞色羽绒背心',
    orderNumber: 'ET5315-202503-06',
    orderStatus: '待核算',
    customerId: 'cust-e',
    customerName: '客户E',
    calculatedQty: 1680,
    receivedQty: 0,
    unitPrice: 72,
    orderDate: '2025-03-10',
    receiptDate: '2025-04-12',
    costItems: {
      fabric: { procurement: 18960, production: 0 },
      accessories: { procurement: 5260, production: 0 },
      sewing: { procurement: 0, production: 23880 },
      downFilling: { procurement: 0, production: 8640 },
      inspection: { procurement: 0, production: 1720 },
    },
  }),
  createOrder({
    id: 'bulk-2025-03-02',
    styleCode: 'ET0193',
    styleName: '儿童书包卫衣',
    orderNumber: 'ET0193-202503-19',
    orderStatus: '已完成',
    customerId: 'cust-c',
    customerName: '客户C',
    calculatedQty: 1520,
    receivedQty: 1508,
    unitPrice: 48,
    orderDate: '2025-03-21',
    receiptDate: '2025-04-15',
    costItems: {
      fabric: { procurement: 14280, production: 0 },
      accessories: { procurement: 3120, production: 0 },
      sewing: { procurement: 0, production: 18160 },
      printing: { procurement: 0, production: 3280 },
      inspection: { procurement: 0, production: 1420 },
    },
  }),
  createOrder({
    id: 'bulk-2025-04-01',
    styleCode: 'ET5201',
    styleName: '儿童拼色速干运动套装',
    orderNumber: 'ET5201-202504-08',
    orderStatus: '生产中',
    customerId: 'cust-f',
    customerName: '客户F',
    calculatedQty: 2040,
    receivedQty: 0,
    unitPrice: 64,
    orderDate: '2025-04-06',
    receiptDate: '2025-05-05',
    costItems: {
      fabric: { procurement: 21480, production: 0 },
      accessories: { procurement: 4860, production: 0 },
      sewing: { procurement: 0, production: 24960 },
      printing: { procurement: 0, production: 3180 },
      finishing: { procurement: 0, production: 1960 },
    },
  }),
  createOrder({
    id: 'bulk-2025-04-02',
    styleCode: 'ET5406',
    styleName: '儿童防泼水连帽外套',
    orderNumber: 'ET5406-202504-15',
    orderStatus: '待核算',
    customerId: 'cust-d',
    customerName: '客户D',
    calculatedQty: 1880,
    receivedQty: 0,
    unitPrice: 68,
    orderDate: '2025-04-18',
    receiptDate: '2025-05-16',
    costItems: {
      fabric: { procurement: 19840, production: 0 },
      accessories: { procurement: 4180, production: 0 },
      sewing: { procurement: 0, production: 22800 },
      seamSealing: { procurement: 0, production: 6120 },
      inspection: { procurement: 0, production: 1680 },
    },
  }),
];

const toMonth = (value: string): string => value.slice(0, 7);

const compareByOrderDateDesc = (a: BulkCostOrderItem, b: BulkCostOrderItem): number =>
  new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime();

const uniqueMonths = Array.from(new Set(bulkCostOrders.map((order) => toMonth(order.orderDate)))).sort();
const recentMonths = uniqueMonths.slice(-6);

const aggregation: BulkCostAggregation = (() => {
  const productionCost = recentMonths.map((month) =>
    bulkCostOrders
      .filter((order) => toMonth(order.orderDate) === month)
      .reduce((sum, order) => sum + (order.costs.total?.production ?? 0), 0),
  ).map(toCurrency);

  const procurementCost = recentMonths.map((month) =>
    bulkCostOrders
      .filter((order) => toMonth(order.orderDate) === month)
      .reduce((sum, order) => sum + (order.costs.total?.procurement ?? 0), 0),
  ).map(toCurrency);

  const relevantOrders = bulkCostOrders.filter((order) => recentMonths.includes(toMonth(order.orderDate)));
  const customerTotals = new Map<string, { id: string; name: string; value: number }>();

  relevantOrders.forEach((order) => {
    const amount = toCurrency(order.unitPrice * (order.receivedQty || order.calculatedQty));
    const existing = customerTotals.get(order.customerId);
    if (existing) {
      existing.value = toCurrency(existing.value + amount);
      return;
    }
    customerTotals.set(order.customerId, {
      id: order.customerId,
      name: order.customerName,
      value: amount,
    });
  });

  const customers = Array.from(customerTotals.values()).sort((a, b) => b.value - a.value);
  const totalAmount = customers.reduce((sum, customer) => sum + customer.value, 0);

  return {
    costTrend: {
      labels: recentMonths,
      productionCost,
      procurementCost,
    },
    customerProportion: {
      total: toCurrency(totalAmount),
      customers,
    },
  };
})();

const applyListFilters = (params: BulkCostListParams): BulkCostOrderItem[] => {
  const keyword = params.keyword?.trim().toLowerCase() ?? '';
  const orderStart = params.orderStartDate ? new Date(params.orderStartDate).getTime() : undefined;
  const orderEnd = params.orderEndDate ? new Date(params.orderEndDate).getTime() : undefined;
  const receiptStart = params.receiptStartDate ? new Date(params.receiptStartDate).getTime() : undefined;
  const receiptEnd = params.receiptEndDate ? new Date(params.receiptEndDate).getTime() : undefined;

  return bulkCostOrders.filter((order) => {
    if (keyword) {
      const haystack = `${order.orderNumber} ${order.styleCode} ${order.styleName}`.toLowerCase();
      if (!haystack.includes(keyword)) {
        return false;
      }
    }

    if (params.customerId && order.customerId !== params.customerId) {
      return false;
    }

    const orderTime = new Date(order.orderDate).getTime();
    if (orderStart !== undefined && orderTime < orderStart) {
      return false;
    }
    if (orderEnd !== undefined && orderTime > orderEnd) {
      return false;
    }

    const receiptTime = new Date(order.receiptDate).getTime();
    if (receiptStart !== undefined && receiptTime < receiptStart) {
      return false;
    }
    if (receiptEnd !== undefined && receiptTime > receiptEnd) {
      return false;
    }

    return true;
  });
};

const queryBulkCostList = (params: BulkCostListParams): BulkCostListResponse => {
  const page = Math.max(1, params.page || 1);
  const pageSize = Math.max(1, params.pageSize || 10);
  const filtered = applyListFilters(params).sort(compareByOrderDateDesc);
  const start = (page - 1) * pageSize;
  const list = filtered.slice(start, start + pageSize);

  return {
    list,
    total: filtered.length,
  };
};

export const getBulkCostAggregation = (): BulkCostAggregation => aggregation;

export const fetchBulkCostAggregation = (delay = 280): Promise<BulkCostAggregation> =>
  new Promise((resolve) => {
    setTimeout(() => resolve(aggregation), delay);
  });

export const getBulkCostList = (params: BulkCostListParams): BulkCostListResponse =>
  queryBulkCostList(params);

export const fetchBulkCostList = (
  params: BulkCostListParams,
  delay = 320,
): Promise<BulkCostListResponse> =>
  new Promise((resolve) => {
    const result = queryBulkCostList(params);
    setTimeout(() => resolve(result), delay);
  });
