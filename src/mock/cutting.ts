import type {
  CuttingReportDataset,
  CuttingReportRecord,
  CuttingTask,
  CuttingTaskDataset,
  CuttingTaskMetric,
} from '../types';

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

const completedTasks: CuttingTask[] = [
  {
    id: 'cut-complete-001',
    styleCode: 'ET0032',
    styleName: 'ET0032 儿童羊羔绒卫衣套装',
    orderCode: 'ET0032-20240921',
    orderDate: '2025-09-21',
    orderedQuantity: 480,
    cutQuantity: 486,
    pendingQuantity: -6,
    unit: '件',
    thumbnail: thumbnails[1],
    customer: '鸿铭服饰',
    fabricSummary: '主料：黑色羊羔绒；辅料：罗纹、尼龙拉链',
    remarks: '加裁 6 件以防返修损耗',
    colors: [
      { name: '黑色', image: createColorImage('黑', 0) },
      { name: '卡其', image: createColorImage('卡其', 1) },
    ],
  },
  {
    id: 'cut-complete-002',
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
    remarks: '裁剪完成，等待缝制领料',
    colors: [
      { name: '军绿迷彩', image: createColorImage('迷彩', 5) },
    ],
  },
  {
    id: 'cut-complete-003',
    styleCode: 'ET0297',
    styleName: 'ET0297 男童拼接短袖套装',
    orderCode: 'ET0297-20240918',
    orderDate: '2025-09-18',
    orderedQuantity: 320,
    cutQuantity: 320,
    pendingQuantity: 0,
    unit: '件',
    thumbnail: thumbnails[1],
    customer: '石狮直营',
    fabricSummary: '主料：32S 全棉汗布；辅料：罗纹、彩色印花',
    colors: [
      { name: '藏青', image: createColorImage('藏青', 3) },
      { name: '亮橘', image: createColorImage('橘', 4) },
    ],
  },
  {
    id: 'cut-complete-004',
    styleCode: 'ET0107',
    styleName: 'ET0107 儿童三层棉衣',
    orderCode: 'ET0107-20240910',
    orderDate: '2025-09-10',
    orderedQuantity: 360,
    cutQuantity: 362,
    pendingQuantity: -2,
    unit: '件',
    thumbnail: thumbnails[1],
    customer: '鸿铭服饰',
    fabricSummary: '主料：三层复合棉；辅料：金属拉链、罗纹',
    remarks: '补齐裁片备损 2 件',
    colors: [
      { name: '黑色', image: createColorImage('黑', 0) },
      { name: '米白', image: createColorImage('米白', 1) },
    ],
  },
  {
    id: 'cut-complete-005',
    styleCode: 'CT0056',
    styleName: 'CT0056 成人防风夹克',
    orderCode: 'CT0056-20240905',
    orderDate: '2025-09-05',
    orderedQuantity: 450,
    cutQuantity: 450,
    pendingQuantity: 0,
    unit: '件',
    thumbnail: thumbnails[0],
    customer: '本厂订单',
    fabricSummary: '主料：防水尼龙；辅料：网眼、钮扣',
    remarks: '裁片已转仓成品车间',
    colors: [
      { name: '深蓝', image: createColorImage('蓝', 3) },
      { name: '墨绿', image: createColorImage('绿', 5) },
    ],
  },
  {
    id: 'cut-complete-006',
    styleCode: 'ET5041',
    styleName: 'ET5041 儿童提花绒连帽外套',
    orderCode: 'ET5041-20240922',
    orderDate: '2025-09-22',
    orderedQuantity: 200,
    cutQuantity: 180,
    pendingQuantity: 20,
    unit: '件',
    thumbnail: thumbnails[2],
    customer: '睿宗李总',
    fabricSummary: '主料：提花绒面料；辅料：撞色罗纹',
    remarks: '剩余尺寸待补裁，已排入今日计划',
    colors: [
      { name: '咖色', image: createColorImage('咖', 3) },
      { name: '米灰', image: createColorImage('米灰', 4) },
    ],
  },
];

const numberFormatter = new Intl.NumberFormat('zh-CN');
const completedCutQuantity = completedTasks.reduce((sum, task) => sum + task.cutQuantity, 0);
const overCutOrders = completedTasks.filter((task) => task.pendingQuantity < 0).length;

const completedSummary: CuttingTaskMetric[] = [
  { key: 'orders', label: '已裁订单', value: `${completedTasks.length} 单`, description: '已进入裁剪收尾或完成的订单' },
  { key: 'cut-total', label: '已裁总数', value: `${numberFormatter.format(completedCutQuantity)} 件`, description: '按订单合计裁剪完成数量' },
  {
    key: 'over-cut',
    label: '超裁提醒',
    value: `${overCutOrders} 单`,
    description: '待裁数量为负数的订单',
    tone: overCutOrders > 0 ? 'warning' : 'default',
  },
];

const completedDataset: CuttingTaskDataset = {
  summary: completedSummary,
  list: completedTasks,
  total: completedTasks.length,
};

export const getCuttingCompletedDataset = (): CuttingTaskDataset => completedDataset;

export const fetchCuttingCompletedDataset = (delay = 240): Promise<CuttingTaskDataset> =>
  new Promise((resolve) => {
    setTimeout(() => resolve(completedDataset), delay);
  });

const reportRecords: CuttingReportRecord[] = [
  {
    id: 'cut-report-001',
    date: '2025-09-22',
    orderCode: 'ET0032-20240921',
    styleCode: 'ET0032',
    styleName: '儿童羊羔绒卫衣套装',
    orderRemark: '香港电商旗舰店加单 80 件',
    orderQuantity: 480,
    bedNumber: '1 床',
    cuttingRemark: '尺码齐全，注意袖口压线',
    colorDetails: [
      { name: '黑色', quantity: 120 },
      { name: '卡其', quantity: 80 },
    ],
    sizeDetails: [
      { size: '110', quantity: 60 },
      { size: '120', quantity: 70 },
      { size: '130', quantity: 70 },
    ],
    cuttingQuantity: 200,
    ticketQuantity: 195,
    cutter: '张三',
    thumbnail: thumbnails[1],
  },
  {
    id: 'cut-report-002',
    date: '2025-09-22',
    orderCode: 'ET0032-20240921',
    styleCode: 'ET0032',
    styleName: '儿童羊羔绒卫衣套装',
    orderRemark: '香港电商旗舰店加单 80 件',
    orderQuantity: 480,
    bedNumber: '2 床',
    cuttingRemark: '加裁 6 件备用',
    colorDetails: [
      { name: '黑色', quantity: 140 },
      { name: '卡其', quantity: 90 },
    ],
    sizeDetails: [
      { size: '140', quantity: 80 },
      { size: '150', quantity: 90 },
      { size: '160', quantity: 60 },
    ],
    cuttingQuantity: 230,
    ticketQuantity: 228,
    cutter: '王丽',
    thumbnail: thumbnails[1],
  },
  {
    id: 'cut-report-003',
    date: '2025-09-21',
    orderCode: 'CT0298-20240912',
    styleCode: 'CT0298',
    styleName: '成人迷彩加绒外套',
    orderRemark: '加绒厚款注意配套里料',
    orderQuantity: 580,
    bedNumber: '3 床',
    cuttingRemark: '领口模板升级版',
    colorDetails: [{ name: '军绿迷彩', quantity: 190 }],
    sizeDetails: [
      { size: 'M', quantity: 60 },
      { size: 'L', quantity: 80 },
      { size: 'XL', quantity: 50 },
    ],
    cuttingQuantity: 190,
    ticketQuantity: 188,
    cutter: '张三',
    thumbnail: thumbnails[0],
  },
  {
    id: 'cut-report-004',
    date: '2025-09-21',
    orderCode: 'CT0298-20240912',
    styleCode: 'CT0298',
    styleName: '成人迷彩加绒外套',
    orderRemark: '加绒厚款注意配套里料',
    orderQuantity: 580,
    bedNumber: '4 床',
    cuttingRemark: '齐色套裁',
    colorDetails: [{ name: '军绿迷彩', quantity: 180 }],
    sizeDetails: [
      { size: 'S', quantity: 40 },
      { size: 'M', quantity: 70 },
      { size: 'L', quantity: 70 },
    ],
    cuttingQuantity: 180,
    ticketQuantity: 179,
    cutter: '李强',
    thumbnail: thumbnails[0],
  },
  {
    id: 'cut-report-005',
    date: '2025-09-20',
    orderCode: 'ET0297-20240918',
    styleCode: 'ET0297',
    styleName: '男童拼接短袖套装',
    orderRemark: '分尺码批次交付',
    orderQuantity: 320,
    bedNumber: '1 床',
    cuttingRemark: '裙摆多裁 5 件备损',
    colorDetails: [
      { name: '藏青', quantity: 70 },
      { name: '亮橘', quantity: 60 },
    ],
    sizeDetails: [
      { size: '110', quantity: 40 },
      { size: '120', quantity: 45 },
      { size: '130', quantity: 45 },
    ],
    cuttingQuantity: 130,
    ticketQuantity: 128,
    cutter: '王丽',
    thumbnail: thumbnails[1],
  },
  {
    id: 'cut-report-006',
    date: '2025-09-20',
    orderCode: 'ET0297-20240918',
    styleCode: 'ET0297',
    styleName: '男童拼接短袖套装',
    orderRemark: '分尺码批次交付',
    orderQuantity: 320,
    bedNumber: '2 床',
    cuttingRemark: '加急交付批次',
    colorDetails: [
      { name: '藏青', quantity: 90 },
      { name: '亮橘', quantity: 90 },
    ],
    sizeDetails: [
      { size: '140', quantity: 60 },
      { size: '150', quantity: 70 },
      { size: '160', quantity: 50 },
    ],
    cuttingQuantity: 180,
    ticketQuantity: 178,
    cutter: '赵敏',
    thumbnail: thumbnails[1],
  },
  {
    id: 'cut-report-007',
    date: '2025-09-19',
    orderCode: 'CT0056-20240905',
    styleCode: 'CT0056',
    styleName: '成人防风夹克',
    orderRemark: '客户要求附带吊牌打印信息',
    orderQuantity: 450,
    bedNumber: '5 床',
    cuttingRemark: '内里防滑加固',
    colorDetails: [
      { name: '深蓝', quantity: 100 },
      { name: '墨绿', quantity: 90 },
    ],
    sizeDetails: [
      { size: 'L', quantity: 80 },
      { size: 'XL', quantity: 70 },
      { size: 'XXL', quantity: 40 },
    ],
    cuttingQuantity: 190,
    ticketQuantity: 188,
    cutter: '李强',
    thumbnail: thumbnails[0],
  },
  {
    id: 'cut-report-008',
    date: '2025-09-19',
    orderCode: 'ET0107-20240910',
    styleCode: 'ET0107',
    styleName: '儿童三层棉衣',
    orderRemark: '外贸客户抽检 10%',
    orderQuantity: 360,
    bedNumber: '3 床',
    cuttingRemark: '每码头布复尺',
    colorDetails: [
      { name: '黑色', quantity: 90 },
      { name: '米白', quantity: 80 },
    ],
    sizeDetails: [
      { size: '120', quantity: 50 },
      { size: '130', quantity: 60 },
      { size: '140', quantity: 60 },
    ],
    cuttingQuantity: 170,
    ticketQuantity: 168,
    cutter: '赵敏',
    thumbnail: thumbnails[1],
  },
];

const reportSummary = reportRecords.reduce(
  (acc, record) => {
    acc.cuttingQuantity += record.cuttingQuantity;
    acc.ticketQuantity += record.ticketQuantity;
    return acc;
  },
  { cuttingQuantity: 0, ticketQuantity: 0 },
);

const cuttingReportDataset: CuttingReportDataset = {
  list: reportRecords,
  total: reportRecords.length,
  summary: reportSummary,
};

export const getCuttingReportDataset = (): CuttingReportDataset => cuttingReportDataset;

export const fetchCuttingReportDataset = (delay = 260): Promise<CuttingReportDataset> =>
  new Promise((resolve) => {
    setTimeout(() => resolve(cuttingReportDataset), delay);
  });
