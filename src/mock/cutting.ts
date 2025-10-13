import type { CuttingTask, CuttingTaskDataset, CuttingTaskMetric } from '../types';

const thumbnails = [
  'https://dummyimage.com/72x72/1677ff/ffffff&text=CT',
  'https://dummyimage.com/72x72/36cfc9/ffffff&text=ET',
  'https://dummyimage.com/72x72/fa8c16/ffffff&text=LT',
  'https://dummyimage.com/72x72/9254de/ffffff&text=ST',
];

const colorPalette = [
  '#1677ff',
  '#36cfc9',
  '#9254de',
  '#faad14',
  '#f759ab',
  '#49aa19',
];

const createColorImage = (code: string, index: number) =>
  `https://dummyimage.com/120x120/${colorPalette[index % colorPalette.length].replace('#', '')}/ffffff&text=${code}`;

const tasks: CuttingTask[] = [
  {
    id: 'cut-task-001',
    styleCode: 'ET0032',
    styleName: 'ET0032 儿童羊羔绒卫衣套装',
    orderCode: 'ET0032-20240921',
    orderDate: '2025-09-21',
    orderedQuantity: 480,
    cutQuantity: 180,
    pendingQuantity: 300,
    unit: '件',
    thumbnail: thumbnails[1],
    customer: '鸿铭服饰',
    fabricSummary: '主料：黑色羊羔绒；辅料：罗纹、尼龙拉链',
    priorityTag: '今日排产',
    scheduleDate: '2025-09-24',
    colors: [
      { name: '黑色', image: createColorImage('黑', 0) },
      { name: '卡其', image: createColorImage('卡其', 1) },
      { name: '浅灰', image: createColorImage('灰', 2) },
    ],
  },
  {
    id: 'cut-task-002',
    styleCode: 'ET0297',
    styleName: 'ET0297 男童拼接短袖套装',
    orderCode: 'ET0297-20240918',
    orderDate: '2025-09-18',
    orderedQuantity: 320,
    cutQuantity: 140,
    pendingQuantity: 180,
    unit: '件',
    thumbnail: thumbnails[1],
    customer: '石狮直营',
    fabricSummary: '主料：32S 全棉汗布；辅料：罗纹、彩色印花',
    priorityTag: '加急',
    scheduleDate: '2025-09-23',
    colors: [
      { name: '藏青', image: createColorImage('藏青', 3) },
      { name: '亮橘', image: createColorImage('橘', 4) },
    ],
  },
  {
    id: 'cut-task-003',
    styleCode: 'CT0298',
    styleName: 'CT0298 成人迷彩加绒外套',
    orderCode: 'CT0298-20240912',
    orderDate: '2025-09-12',
    orderedQuantity: 580,
    cutQuantity: 580,
    pendingQuantity: 0,
    unit: '件',
    thumbnail: thumbnails[0],
    customer: '总部大货',
    fabricSummary: '主料：军绿迷彩摇粒绒；辅料：黑色尼龙拉链',
    scheduleDate: '2025-09-15',
    colors: [
      { name: '军绿迷彩', image: createColorImage('迷彩', 5) },
    ],
  },
  {
    id: 'cut-task-004',
    styleCode: 'ET0070',
    styleName: 'ET0070 儿童拉链卫衣套装',
    orderCode: 'ET0070-20240908',
    orderDate: '2025-09-08',
    orderedQuantity: 1200,
    cutQuantity: 560,
    pendingQuantity: 640,
    unit: '件',
    thumbnail: thumbnails[1],
    customer: '鸿铭服饰',
    fabricSummary: '主料：双面棉毛圈；辅料：撞色拉链、罗纹',
    scheduleDate: '2025-09-26',
    colors: [
      { name: '藏青', image: createColorImage('藏青', 0) },
      { name: '粉色', image: createColorImage('粉', 4) },
      { name: '黑色', image: createColorImage('黑', 2) },
    ],
  },
  {
    id: 'cut-task-005',
    styleCode: 'CT0056',
    styleName: 'CT0056 成人防风夹克',
    orderCode: 'CT0056-20240905',
    orderDate: '2025-09-05',
    orderedQuantity: 450,
    cutQuantity: 360,
    pendingQuantity: 90,
    unit: '件',
    thumbnail: thumbnails[0],
    customer: '本厂订单',
    fabricSummary: '主料：防水尼龙；辅料：网眼、钮扣',
    scheduleDate: '2025-09-22',
    colors: [
      { name: '深蓝', image: createColorImage('蓝', 3) },
      { name: '墨绿', image: createColorImage('绿', 5) },
    ],
  },
  {
    id: 'cut-task-006',
    styleCode: 'ET0107',
    styleName: 'ET0107 儿童三层棉衣',
    orderCode: 'ET0107-20240910',
    orderDate: '2025-09-10',
    orderedQuantity: 360,
    cutQuantity: 240,
    pendingQuantity: 120,
    unit: '件',
    thumbnail: thumbnails[1],
    customer: '鸿铭服饰',
    fabricSummary: '主料：三层复合棉；辅料：金属拉链、罗纹',
    scheduleDate: '2025-09-25',
    colors: [
      { name: '黑色', image: createColorImage('黑', 0) },
      { name: '米白', image: createColorImage('米白', 1) },
    ],
  },
  {
    id: 'cut-task-007',
    styleCode: 'ET5041',
    styleName: 'ET5041 儿童提花绒连帽外套',
    orderCode: 'ET5041-20240922',
    orderDate: '2025-09-22',
    orderedQuantity: 200,
    cutQuantity: 0,
    pendingQuantity: 200,
    unit: '件',
    thumbnail: thumbnails[2],
    customer: '睿宗李总',
    fabricSummary: '主料：提花绒面料；辅料：撞色罗纹',
    priorityTag: '物料已到仓',
    scheduleDate: '2025-09-27',
    colors: [
      { name: '咖色', image: createColorImage('咖', 3) },
      { name: '米灰', image: createColorImage('米灰', 4) },
    ],
  },
];

const summary: CuttingTaskMetric[] = [
  { key: 'tasks', label: '待裁任务', value: `${tasks.length} 单`, description: '当前需要安排裁剪的工厂订单' },
  { key: 'pending', label: '待裁数量', value: '1,530 件', description: '按订单合计剩余数量', tone: 'warning' },
  { key: 'today', label: '今日需排床', value: '3 单', description: '今日排产或加急任务' },
];

const dataset: CuttingTaskDataset = {
  summary,
  list: tasks,
  total: tasks.length,
};

export const getCuttingPendingDataset = (): CuttingTaskDataset => dataset;

export const fetchCuttingPendingDataset = (delay = 240): Promise<CuttingTaskDataset> =>
  new Promise((resolve) => {
    setTimeout(() => resolve(dataset), delay);
  });
