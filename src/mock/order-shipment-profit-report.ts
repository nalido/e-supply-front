import type {
  OrderShipmentProfitAggregation,
  OrderShipmentProfitListParams,
  OrderShipmentProfitListResponse,
  OrderShipmentProfitRecord,
} from '../types/order-shipment-profit-report';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const aggregationDataset: OrderShipmentProfitAggregation = {
  profitTrend: {
    labels: ['2023-12', '2024-01', '2024-02', '2024-03', '2024-04', '2024-05'],
    shipmentAmount: [1450000, 1325000, 1180000, 1535000, 1642000, 1718000],
    totalProfit: [265000, 238600, 198200, 312400, 336800, 358900],
  },
  customerProportion: {
    total: 8850000,
    customers: [
      { name: '杭州锐动体育', value: 1620000 },
      { name: '宁波杉杉服饰', value: 1380000 },
      { name: '广州乐动体育', value: 1125000 },
      { name: '苏州陌上花开', value: 1028000 },
      { name: '成都云杉户外', value: 980000 },
      { name: '厦门耐驰户外', value: 915000 },
      { name: '北京途岳体育', value: 825000 },
    ],
  },
};

const recordsDataset: OrderShipmentProfitRecord[] = [
  {
    id: 'profit-001',
    orderNumber: 'ET0032-202405',
    customer: '杭州锐动体育',
    styleNumber: 'ET0032',
    styleName: '速干跑步T恤',
    shipmentDate: '2024-05-28',
    shippedQty: 3200,
    shipmentAmount: 428800,
    cost: 298200,
    profit: 130600,
    profitMargin: 0.3047,
  },
  {
    id: 'profit-002',
    orderNumber: 'ET1120-202404',
    customer: '宁波杉杉服饰',
    styleNumber: 'ET1120',
    styleName: '商务弹力衬衫',
    shipmentDate: '2024-04-30',
    shippedQty: 1800,
    shipmentAmount: 356400,
    cost: 264320,
    profit: 92080,
    profitMargin: 0.2585,
  },
  {
    id: 'profit-003',
    orderNumber: 'ET2088-202405',
    customer: '广州乐动体育',
    styleNumber: 'ET2088',
    styleName: '拼色篮球背心',
    shipmentDate: '2024-05-22',
    shippedQty: 2400,
    shipmentAmount: 318000,
    cost: 222480,
    profit: 95520,
    profitMargin: 0.3007,
  },
  {
    id: 'profit-004',
    orderNumber: 'ET3051-202404',
    customer: '无锡尚雅童装',
    styleNumber: 'ET3051',
    styleName: '儿童绣花卫衣',
    shipmentDate: '2024-05-08',
    shippedQty: 1500,
    shipmentAmount: 248400,
    cost: 176980,
    profit: 71420,
    profitMargin: 0.2876,
  },
  {
    id: 'profit-005',
    orderNumber: 'ET5201-202405',
    customer: '苏州陌上花开',
    styleNumber: 'ET5201',
    styleName: '气质针织连衣裙',
    shipmentDate: '2024-05-30',
    shippedQty: 900,
    shipmentAmount: 209700,
    cost: 146880,
    profit: 62820,
    profitMargin: 0.2996,
  },
  {
    id: 'profit-006',
    orderNumber: 'ET6015-202403',
    customer: '上海明禾制服',
    styleNumber: 'ET6015',
    styleName: '三防机修工装',
    shipmentDate: '2024-04-18',
    shippedQty: 2600,
    shipmentAmount: 429000,
    cost: 308200,
    profit: 120800,
    profitMargin: 0.2816,
  },
  {
    id: 'profit-007',
    orderNumber: 'ET7090-202404',
    customer: '杭州果壳童装',
    styleNumber: 'ET7090',
    styleName: '亲子户外功能服',
    shipmentDate: '2024-05-18',
    shippedQty: 1200,
    shipmentAmount: 198000,
    cost: 138600,
    profit: 59400,
    profitMargin: 0.3,
  },
  {
    id: 'profit-008',
    orderNumber: 'ET8103-202405',
    customer: '深圳向阳运动',
    styleNumber: 'ET8103',
    styleName: '无缝瑜伽套装',
    shipmentDate: '2024-05-29',
    shippedQty: 2000,
    shipmentAmount: 352000,
    cost: 248960,
    profit: 103040,
    profitMargin: 0.2922,
  },
  {
    id: 'profit-009',
    orderNumber: 'ET9056-202403',
    customer: '成都云杉户外',
    styleNumber: 'ET9056',
    styleName: '轻量冲锋衣',
    shipmentDate: '2024-04-14',
    shippedQty: 2800,
    shipmentAmount: 476000,
    cost: 343840,
    profit: 132160,
    profitMargin: 0.2777,
  },
  {
    id: 'profit-010',
    orderNumber: 'ET1288-202405',
    customer: '佛山凯途运动',
    styleNumber: 'ET1288',
    styleName: '四向弹篮球短裤',
    shipmentDate: '2024-05-26',
    shippedQty: 2100,
    shipmentAmount: 273000,
    cost: 195860,
    profit: 77140,
    profitMargin: 0.2826,
  },
  {
    id: 'profit-011',
    orderNumber: 'ET1486-202403',
    customer: '厦门耐驰户外',
    styleNumber: 'ET1486',
    styleName: '防水登山裤',
    shipmentDate: '2024-04-20',
    shippedQty: 2600,
    shipmentAmount: 442000,
    cost: 313600,
    profit: 128400,
    profitMargin: 0.2905,
  },
  {
    id: 'profit-012',
    orderNumber: 'ET1682-202404',
    customer: '北京途岳体育',
    styleNumber: 'ET1682',
    styleName: '城市轻旅夹克',
    shipmentDate: '2024-05-12',
    shippedQty: 1900,
    shipmentAmount: 304000,
    cost: 213280,
    profit: 90720,
    profitMargin: 0.2984,
  },
];

const matchesKeyword = (value: string, keyword: string) => value.toLowerCase().includes(keyword);

export const fetchOrderShipmentProfitAggregation = async (): Promise<OrderShipmentProfitAggregation> => {
  await delay(480);
  return aggregationDataset;
};

export const fetchOrderShipmentProfitList = async (
  params: OrderShipmentProfitListParams,
): Promise<OrderShipmentProfitListResponse> => {
  await delay(520);
  const { page, pageSize, keyword } = params;

  let filtered = recordsDataset;
  if (keyword?.trim()) {
    const normalized = keyword.trim().toLowerCase();
    filtered = recordsDataset.filter((record) =>
      [
        record.orderNumber,
        record.customer,
        record.styleNumber,
        record.styleName,
      ].some((value) => matchesKeyword(String(value), normalized)),
    );
  }

  const total = filtered.length;
  const start = Math.max(0, (page - 1) * pageSize);
  const end = start + pageSize;
  const sliced = filtered.slice(start, end);

  const summary = filtered.reduce(
    (acc, record) => {
      acc.shipmentAmount += record.shipmentAmount;
      acc.profit += record.profit;
      return acc;
    },
    { shipmentAmount: 0, profit: 0 },
  );

  return {
    list: sliced,
    total,
    summary,
  };
};

export const exportOrderShipmentProfit = async (
  params: OrderShipmentProfitListParams,
): Promise<{ fileUrl: string }> => {
  await delay(700);
  const keywordSegment = params.keyword?.trim() ? `_${params.keyword.trim()}` : '';
  const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
  return {
    fileUrl: `/downloads/order-shipment-profit${keywordSegment}_${timestamp}.xlsx`,
  };
};
