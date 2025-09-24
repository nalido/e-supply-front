import type { FactoryOrderDataset, FactoryOrderItem, FactoryOrderMetric, FactoryOrderProgress } from '../types';

type PartialOrder = Pick<FactoryOrderItem, 'id' | 'code' | 'name' | 'customer' | 'expectedDelivery' | 'quantityLabel' | 'quantityValue'> & {
  materialStatus?: string;
  tags?: string[];
  actions?: Array<{ key: string; label: string }>;
  progress: FactoryOrderProgress[];
};

const thumbnails = [
  'https://dummyimage.com/72x72/1677ff/ffffff&text=A',
  'https://dummyimage.com/72x72/13c2c2/ffffff&text=B',
  'https://dummyimage.com/72x72/9254de/ffffff&text=C',
  'https://dummyimage.com/72x72/fa8c16/ffffff&text=D',
];

const baseOrders: PartialOrder[] = [
  {
    id: 'order-202509170005',
    code: '202509170005',
    name: 'ET5025 儿童斜拼拉链套装',
    customer: '本厂',
    expectedDelivery: '2025-09-28',
    materialStatus: '物料已入仓',
    quantityLabel: '下单',
    quantityValue: '960 件',
    tags: ['查看颜色图', '物料清单'],
    progress: [
      { key: 'order', label: '下单', value: '960', date: '2025-09-17', status: 'success' },
      { key: 'material', label: '物料', value: '采购完成', percent: 100, status: 'success' },
      { key: 'cut', label: '裁剪', value: '960', date: '2025-09-22', percent: 88, status: 'warning' },
      { key: 'sew', label: '车缝', value: '正在排产', percent: 24, status: 'warning' },
      { key: 'pack', label: '包装', value: '待启动', percent: 0, status: 'default', muted: true },
    ],
  },
  {
    id: 'order-202509220004',
    code: '202509220004',
    name: 'ET5041 儿童提花绒连帽开衫外套',
    customer: '睿宗李总',
    expectedDelivery: '2025-09-30',
    materialStatus: '物料未采购',
    quantityLabel: '下单',
    quantityValue: '200 件',
    tags: ['物料清单'],
    progress: [
      { key: 'order', label: '下单', value: '200', date: '2025-09-22', status: 'success' },
      { key: 'material', label: '物料', value: '采购中', percent: 12, status: 'warning' },
      { key: 'cut', label: '裁剪', value: '待排产', percent: 0, status: 'default', muted: true },
      { key: 'sew', label: '车缝', value: '未开始', percent: 0, status: 'default', muted: true },
      { key: 'pack', label: '包装', value: '未开始', percent: 0, status: 'default', muted: true },
    ],
  },
  {
    id: 'order-202509040001',
    code: 'CT0056-2-6床',
    name: 'CT0056 成人防风夹克',
    customer: '本厂',
    expectedDelivery: '2025-09-18',
    materialStatus: '物料已入仓',
    quantityLabel: '下单',
    quantityValue: '740 件',
    tags: ['查看颜色图', '物料清单'],
    progress: [
      { key: 'order', label: '下单', value: '740', date: '2025-09-04', status: 'success' },
      { key: 'material', label: '物料', value: '齐备', percent: 100, status: 'success' },
      { key: 'cut', label: '裁剪', value: '774', date: '2025-09-05', percent: 103, status: 'success' },
      { key: 'sew', label: '车缝', value: '765', date: '2025-09-12', percent: 74, status: 'warning' },
      { key: 'pack', label: '包装', value: '待排产', percent: 0, status: 'default', muted: true },
    ],
  },
  {
    id: 'order-202508220032',
    code: 'CT0298-1床',
    name: 'CT0298 成人棉服马甲',
    customer: '石狮',
    expectedDelivery: '2025-09-12',
    materialStatus: '物料已入仓',
    quantityLabel: '下单',
    quantityValue: '580 件',
    tags: ['查看颜色图', '物料清单'],
    progress: [
      { key: 'order', label: '下单', value: '580', date: '2025-08-22', status: 'success' },
      { key: 'material', label: '物料', value: '已入仓', percent: 96, status: 'success' },
      { key: 'cut', label: '裁剪', value: '552', date: '2025-09-10', percent: 95, status: 'success' },
      { key: 'sew', label: '车缝', value: '排产中', percent: 15, status: 'warning' },
      { key: 'pack', label: '包装', value: '待启动', percent: 0, status: 'default', muted: true },
    ],
  },
  {
    id: 'order-202508220048',
    code: 'ET0070-83 84 86-89',
    name: 'ET0070 儿童拉链卫衣',
    customer: '鸿铭服饰',
    expectedDelivery: '2025-09-18',
    materialStatus: '物料已入仓',
    quantityLabel: '下单',
    quantityValue: '1,900 件',
    tags: ['查看颜色图', '物料清单'],
    progress: [
      { key: 'order', label: '下单', value: '1,900', date: '2025-08-22', status: 'success' },
      { key: 'material', label: '物料', value: '齐备', percent: 100, status: 'success' },
      { key: 'cut', label: '裁剪', value: '1,908', date: '2025-09-04', percent: 72, status: 'warning' },
      { key: 'sew', label: '车缝', value: '排产中', percent: 38, status: 'warning' },
      { key: 'pack', label: '包装', value: '未排产', percent: 0, status: 'default', muted: true },
    ],
  },
  {
    id: 'order-202509110033',
    code: 'ET0297-03-04',
    name: '男童拼接休闲短袖套装',
    customer: '石狮',
    expectedDelivery: '2025-09-25',
    materialStatus: '物料未采购',
    quantityLabel: '下单',
    quantityValue: '225 件',
    tags: ['物料清单'],
    progress: [
      { key: 'order', label: '下单', value: '225', date: '2025-09-11', status: 'success' },
      { key: 'material', label: '物料', value: '采购中', percent: 8, status: 'warning' },
      { key: 'cut', label: '裁剪', value: '待排产', percent: 0, status: 'default', muted: true },
      { key: 'sew', label: '车缝', value: '未开始', percent: 0, status: 'default', muted: true },
      { key: 'pack', label: '包装', value: '未开始', percent: 0, status: 'default', muted: true },
    ],
  },
  {
    id: 'order-202509220002',
    code: 'ET0107-鸿铭床位',
    name: 'ET0107 儿童三层棉衣',
    customer: '鸿铭服饰',
    expectedDelivery: '2025-09-29',
    materialStatus: '物料已入仓',
    quantityLabel: '下单',
    quantityValue: '250 件',
    tags: ['物料清单'],
    progress: [
      { key: 'order', label: '下单', value: '250', date: '2025-09-22', status: 'success' },
      { key: 'material', label: '物料', value: '已齐备', percent: 96, status: 'success' },
      { key: 'cut', label: '裁剪', value: '240', date: '2025-09-23', percent: 60, status: 'warning' },
      { key: 'sew', label: '车缝', value: '待启动', percent: 0, status: 'default', muted: true },
      { key: 'pack', label: '包装', value: '待启动', percent: 0, status: 'default', muted: true },
    ],
  },
  {
    id: 'order-202508090002',
    code: 'CT0298-总部',
    name: 'CT0298 成人迷彩加绒拉链外套',
    customer: '总部大货',
    expectedDelivery: '2025-09-15',
    materialStatus: '物料已入仓',
    quantityLabel: '下单',
    quantityValue: '1,240 件',
    tags: ['查看颜色图', '物料清单'],
    progress: [
      { key: 'order', label: '下单', value: '1,240', date: '2025-08-09', status: 'success' },
      { key: 'material', label: '物料', value: '已齐备', percent: 100, status: 'success' },
      { key: 'cut', label: '裁剪', value: '1,118', date: '2025-08-23', percent: 90, status: 'success' },
      { key: 'sew', label: '车缝', value: '889', date: '2025-08-26', percent: 70, status: 'warning' },
      { key: 'pack', label: '包装', value: '待排产', percent: 0, status: 'default', muted: true },
    ],
  },
];

const assignThumbnails = (orders: PartialOrder[]): FactoryOrderItem[] =>
  orders.map((order, index) => ({
    ...order,
    thumbnail: thumbnails[index % thumbnails.length],
  }));

const metrics: FactoryOrderMetric[] = [
  { key: 'all', label: '全部', primaryValue: '58 款', secondaryValue: '84 单 / 219,345 件' },
  { key: 'overdue', label: '已超期', primaryValue: '0 款', secondaryValue: '0 单 / 0 件', tone: 'warning' },
];

const dataset: FactoryOrderDataset = {
  metrics,
  orders: assignThumbnails(baseOrders),
};

export const getFactoryOrdersDataset = (): FactoryOrderDataset => dataset;

export const fetchFactoryOrdersDataset = (delay = 160): Promise<FactoryOrderDataset> =>
  new Promise((resolve) => {
    setTimeout(() => resolve(dataset), delay);
  });
