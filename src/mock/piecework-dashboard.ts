import type {
  PieceworkCapacityComparisonPoint,
  PieceworkCapacityTrendPoint,
  PieceworkCompletionSlice,
  PieceworkCuttingTrendPoint,
  PieceworkDashboardDataset,
  PieceworkMetric,
  PieceworkOverdueOrder,
} from '../types';

const metrics: PieceworkMetric[] = [
  {
    key: 'yearOrders',
    title: '本年订单',
    orderCount: 268,
    quantity: 186300,
    quantityUnit: '件',
    description: '同比增长 12.4%',
    trendPercent: 12.4,
    trendDirection: 'up',
  },
  {
    key: 'monthOrders',
    title: '本月订单',
    orderCount: 32,
    quantity: 21460,
    quantityUnit: '件',
    description: '环比 +8.3%',
    trendPercent: 8.3,
    trendDirection: 'up',
  },
  {
    key: 'monthCutting',
    title: '本月已裁',
    orderCount: 26,
    quantity: 17340,
    quantityUnit: '件',
    description: '较上月 +2,180 件',
    trendPercent: 14.4,
    trendDirection: 'up',
  },
  {
    key: 'monthProduced',
    title: '本月生产',
    orderCount: 21,
    quantity: 15280,
    quantityUnit: '件',
    description: '完成率 82.6%',
    trendPercent: -3.1,
    trendDirection: 'down',
  },
];

const cuttingTrend: PieceworkCuttingTrendPoint[] = [
  { month: '2024-04', quantity: 12800 },
  { month: '2024-05', quantity: 14260 },
  { month: '2024-06', quantity: 15680 },
  { month: '2024-07', quantity: 14950 },
  { month: '2024-08', quantity: 16840 },
  { month: '2024-09', quantity: 17340 },
];

const capacityComparison: PieceworkCapacityComparisonPoint[] = [
  { month: '1月', category: '本年', quantity: 16800 },
  { month: '1月', category: '去年', quantity: 15360 },
  { month: '2月', category: '本年', quantity: 14220 },
  { month: '2月', category: '去年', quantity: 13640 },
  { month: '3月', category: '本年', quantity: 17400 },
  { month: '3月', category: '去年', quantity: 16280 },
  { month: '4月', category: '本年', quantity: 18320 },
  { month: '4月', category: '去年', quantity: 17560 },
  { month: '5月', category: '本年', quantity: 19040 },
  { month: '5月', category: '去年', quantity: 18220 },
  { month: '6月', category: '本年', quantity: 20160 },
  { month: '6月', category: '去年', quantity: 18740 },
  { month: '7月', category: '本年', quantity: 19420 },
  { month: '7月', category: '去年', quantity: 18180 },
  { month: '8月', category: '本年', quantity: 20510 },
  { month: '8月', category: '去年', quantity: 19240 },
  { month: '9月', category: '本年', quantity: 21240 },
  { month: '9月', category: '去年', quantity: 19800 },
];

const completionSlices: PieceworkCompletionSlice[] = [
  { key: 'completed', label: '已完成', orders: 152 },
  { key: 'in_progress', label: '进行中', orders: 41 },
];

const capacityTrend: PieceworkCapacityTrendPoint[] = [
  { date: '09-01', type: '计划产能', value: 820 },
  { date: '09-01', type: '实际订单', value: 760 },
  { date: '09-02', type: '计划产能', value: 840 },
  { date: '09-02', type: '实际订单', value: 810 },
  { date: '09-03', type: '计划产能', value: 860 },
  { date: '09-03', type: '实际订单', value: 846 },
  { date: '09-04', type: '计划产能', value: 880 },
  { date: '09-04', type: '实际订单', value: 904 },
  { date: '09-05', type: '计划产能', value: 900 },
  { date: '09-05', type: '实际订单', value: 948 },
  { date: '09-06', type: '计划产能', value: 920 },
  { date: '09-06', type: '实际订单', value: 910 },
  { date: '09-07', type: '计划产能', value: 920 },
  { date: '09-07', type: '实际订单', value: 860 },
  { date: '09-08', type: '计划产能', value: 940 },
  { date: '09-08', type: '实际订单', value: 912 },
  { date: '09-09', type: '计划产能', value: 940 },
  { date: '09-09', type: '实际订单', value: 936 },
  { date: '09-10', type: '计划产能', value: 960 },
  { date: '09-10', type: '实际订单', value: 984 },
  { date: '09-11', type: '计划产能', value: 980 },
  { date: '09-11', type: '实际订单', value: 991 },
  { date: '09-12', type: '计划产能', value: 980 },
  { date: '09-12', type: '实际订单', value: 942 },
  { date: '09-13', type: '计划产能', value: 960 },
  { date: '09-13', type: '实际订单', value: 918 },
  { date: '09-14', type: '计划产能', value: 940 },
  { date: '09-14', type: '实际订单', value: 902 },
  { date: '09-15', type: '计划产能', value: 940 },
  { date: '09-15', type: '实际订单', value: 955 },
];

const overdueOrders: PieceworkOverdueOrder[] = [
  {
    id: 'overdue-ct0056',
    orderNo: 'CT0056-2-6',
    customer: '本厂',
    styleNo: 'CT0056',
    styleName: '成人防风夹克',
    expectedDelivery: '2024-09-12',
    orderQuantity: 740,
    cuttingQuantity: 612,
    completionRate: 0.71,
    thumbnail: 'https://dummyimage.com/72x72/1677ff/ffffff&text=CT',
  },
  {
    id: 'overdue-et5025',
    orderNo: '202409170005',
    customer: '鸿铭服饰',
    styleNo: 'ET5025',
    styleName: '童装拉链套装',
    expectedDelivery: '2024-09-18',
    orderQuantity: 960,
    cuttingQuantity: 720,
    completionRate: 0.56,
    thumbnail: 'https://dummyimage.com/72x72/fa8c16/ffffff&text=ET',
  },
  {
    id: 'overdue-et0070',
    orderNo: 'ET0070-83/89',
    customer: '睿宗李总',
    styleNo: 'ET0070',
    styleName: '童装连帽卫衣',
    expectedDelivery: '2024-09-10',
    orderQuantity: 1900,
    cuttingQuantity: 1608,
    completionRate: 0.62,
    thumbnail: 'https://dummyimage.com/72x72/13c2c2/ffffff&text=ET',
  },
  {
    id: 'overdue-et0151',
    orderNo: 'ET0151-9床',
    customer: '石狮',
    styleNo: 'ET0151',
    styleName: '儿童拼色套装',
    expectedDelivery: '2024-09-08',
    orderQuantity: 480,
    cuttingQuantity: 360,
    completionRate: 0.58,
    thumbnail: 'https://dummyimage.com/72x72/9254de/ffffff&text=ET',
  },
  {
    id: 'overdue-et0107',
    orderNo: 'ET0107-鸿铭',
    customer: '鸿铭服饰',
    styleNo: 'ET0107',
    styleName: '儿童三层棉衣',
    expectedDelivery: '2024-09-09',
    orderQuantity: 250,
    cuttingQuantity: 210,
    completionRate: 0.46,
    thumbnail: 'https://dummyimage.com/72x72/ff7875/ffffff&text=ET',
  },
];

const dataset: PieceworkDashboardDataset = {
  metrics,
  cuttingTrend,
  capacityComparison,
  completionSlices,
  capacityTrend,
  overdueOrders,
};

export const getPieceworkDashboardDataset = (): PieceworkDashboardDataset => dataset;

export const fetchPieceworkDashboardDataset = (delay = 220): Promise<PieceworkDashboardDataset> =>
  new Promise((resolve) => {
    setTimeout(() => resolve(dataset), delay);
  });
