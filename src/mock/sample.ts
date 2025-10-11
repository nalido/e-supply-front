import type {
  SampleOrder,
  SampleStats,
  SampleStatus,
  SampleQueryParams,
  SampleQuantityMatrix,
} from '../types/sample';
import type {
  SampleAttachment,
  SampleDevelopmentCostItem,
  SampleMaterialItem,
  SampleOrderDetail,
  SampleOtherCostItem,
  SampleProcessItem,
} from '../types/sample-detail';
import type { SampleCreationPayload } from '../types/sample-create';

/**
 * 样本数据
 */
const sampleData = {
  customers: [
    '优衣库', 'ZARA', 'H&M', 'GAP', 'UNIQLO', 
    '森马服饰', '美特斯邦威', '太平鸟', '江南布衣', '拉夏贝尔',
    '波司登', '李宁', '安踏', '特步', '361°'
  ],
  seasons: ['春夏', '秋冬', '春季', '夏季', '秋季', '冬季'],
  categories: [
    'T恤', '衬衫', '连衣裙', '外套', '裤子',
    '裙子', '卫衣', '夹克', '大衣', '毛衣'
  ],
  fabrics: [
    '纯棉', '混纺', '涤纶', '真丝', '羊毛',
    '麻布', '牛仔布', '针织', '雪纺', '呢料'
  ],
  colors: [
    '白色', '黑色', '灰色', '蓝色', '红色',
    '黄色', '绿色', '粉色', '紫色', '橙色'
  ],
  sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  designers: [
    '李设计', '王设计', '张设计', '刘设计', '陈设计',
    '杨设计', '赵设计', '周设计', '吴设计', '徐设计'
  ],
  styleCodes: ['ST', 'DW', 'FW', 'SS', 'AW'],
};

/**
 * 生成随机日期
 */
const generateRandomDate = (daysRange: number = 30): string => {
  const today = new Date();
  const randomDays = Math.floor(Math.random() * daysRange) - daysRange / 2;
  const date = new Date(today.getTime() + randomDays * 24 * 60 * 60 * 1000);
  return date.toISOString().split('T')[0];
};

/**
 * 生成样板单号
 */
const generateOrderNo = (index: number): string => {
  const year = new Date().getFullYear();
  const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
  const day = new Date().getDate().toString().padStart(2, '0');
  const seq = (index + 1).toString().padStart(4, '0');
  return `SP${year}${month}${day}${seq}`;
};

/**
 * 生成样式编码
 */
const generateStyleCode = (): string => {
  const prefix = sampleData.styleCodes[Math.floor(Math.random() * sampleData.styleCodes.length)];
  const year = new Date().getFullYear().toString().slice(-2);
  const seq = Math.floor(Math.random() * 999) + 1;
  return `${prefix}${year}${seq.toString().padStart(3, '0')}`;
};

/**
 * 获取状态的中文名称
 */
export const getStatusText = (status: SampleStatus): string => {
  const statusMap = {
    pending: '待确认',
    confirmed: '已确认', 
    producing: '生产中',
    completed: '已完成',
    cancelled: '已取消',
  };
  return statusMap[status] || status;
};

/**
 * 获取优先级的中文名称
 */
export const getPriorityText = (priority: string): string => {
  const priorityMap = {
    low: '低',
    medium: '中',
    high: '高',
    urgent: '紧急',
  };
  return priorityMap[priority as keyof typeof priorityMap] || priority;
};

/**
 * 获取优先级颜色
 */
export const getPriorityColor = (priority: string): string => {
  const colorMap = {
    low: '#52c41a',
    medium: '#1890ff',
    high: '#faad14',
    urgent: '#f5222d',
  };
  return colorMap[priority as keyof typeof colorMap] || '#d9d9d9';
};

/**
 * 获取状态颜色
 */
export const getStatusColor = (status: SampleStatus): string => {
  const colorMap = {
    pending: '#faad14',
    confirmed: '#1890ff',
    producing: '#722ed1',
    completed: '#52c41a',
    cancelled: '#f5222d',
  };
  return colorMap[status] || '#d9d9d9';
};

/**
 * 生成单个样板单数据
 */
const generateSampleOrder = (index: number): SampleOrder => {
  const statuses = [
    'pending', 'confirmed', 'producing', 'completed', 'cancelled'
  ] as const;
  const priorities = ['low', 'medium', 'high', 'urgent'] as const;
  
  const quantity = Math.floor(Math.random() * 50) + 1;
  const unitPrice = Math.floor(Math.random() * 200) + 50;
  const status = statuses[Math.floor(Math.random() * statuses.length)];
  const priority = priorities[Math.floor(Math.random() * priorities.length)];
  
  return {
    id: `sample_${index + 1}`,
    orderNo: generateOrderNo(index),
    styleName: `${sampleData.categories[Math.floor(Math.random() * sampleData.categories.length)]}款式${index + 1}`,
    styleCode: generateStyleCode(),
    customer: sampleData.customers[Math.floor(Math.random() * sampleData.customers.length)],
    season: sampleData.seasons[Math.floor(Math.random() * sampleData.seasons.length)],
    category: sampleData.categories[Math.floor(Math.random() * sampleData.categories.length)],
    fabric: sampleData.fabrics[Math.floor(Math.random() * sampleData.fabrics.length)],
    color: sampleData.colors[Math.floor(Math.random() * sampleData.colors.length)],
    size: sampleData.sizes[Math.floor(Math.random() * sampleData.sizes.length)],
    quantity,
    unitPrice,
    totalAmount: quantity * unitPrice,
    status,
    priority,
    deadline: generateRandomDate(60),
    createTime: generateRandomDate(90),
    updateTime: generateRandomDate(30),
    designer: sampleData.designers[Math.floor(Math.random() * sampleData.designers.length)],
    description: Math.random() > 0.7 ? `这是${sampleData.categories[Math.floor(Math.random() * sampleData.categories.length)]}的样板单备注信息` : undefined,
    images: Math.random() > 0.6 ? [`https://picsum.photos/200/200?random=${index}`] : undefined,
  };
};

/**
 * 生成样板单列表
 */
export const generateSampleOrders = (count: number = 100): SampleOrder[] => {
  return Array.from({ length: count }, (_, index) => generateSampleOrder(index));
};

let cachedSampleOrders: SampleOrder[] | null = null;

const ensureSampleOrders = (): SampleOrder[] => {
  if (!cachedSampleOrders) {
    cachedSampleOrders = generateSampleOrders(180);
  }
  return cachedSampleOrders;
};

export const resetSampleOrdersCache = (): void => {
  cachedSampleOrders = generateSampleOrders(180);
};

/**
 * 生成样板单统计数据
 */
export const generateSampleStats = (orders: SampleOrder[] = []): SampleStats => {
  const total = orders.length;
  const pending = orders.filter(o => o.status === 'pending').length;
  const confirmed = orders.filter(o => o.status === 'confirmed').length;
  const producing = orders.filter(o => o.status === 'producing').length;
  const completed = orders.filter(o => o.status === 'completed').length;
  const cancelled = orders.filter(o => o.status === 'cancelled').length;
  
  // 计算本月新增
  const thisMonthStart = new Date();
  thisMonthStart.setDate(1);
  thisMonthStart.setHours(0, 0, 0, 0);
  const thisMonth = orders.filter(o => new Date(o.createTime) >= thisMonthStart).length;
  
  // 计算紧急数量
  const urgent = orders.filter(o => o.priority === 'urgent').length;
  
  return {
    total,
    pending,
    confirmed,
    producing,
    completed,
    cancelled,
    thisMonth,
    urgent,
  };
};

const applySampleFilters = (orders: SampleOrder[], params: SampleQueryParams = {}): SampleOrder[] => {
  const keyword = params.keyword?.trim().toLowerCase();
  const start = params.startDate ? new Date(params.startDate) : undefined;
  const end = params.endDate ? new Date(params.endDate) : undefined;

  return orders.filter((order) => {
    if (keyword) {
      const haystack = [order.orderNo, order.styleName, order.styleCode, order.customer]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(keyword)) {
        return false;
      }
    }

    if (params.status && order.status !== params.status) {
      return false;
    }

    if (params.customer && order.customer !== params.customer) {
      return false;
    }

    if (params.season && order.season !== params.season) {
      return false;
    }

    if (params.category && order.category !== params.category) {
      return false;
    }

    if (params.priority && order.priority !== params.priority) {
      return false;
    }

    if (start) {
      const createdAt = new Date(order.createTime);
      if (createdAt < start) {
        return false;
      }
    }

    if (end) {
      const createdAt = new Date(order.createTime);
      if (createdAt > end) {
        return false;
      }
    }

    return true;
  });
};

const sumMatrixQuantity = (matrix?: SampleQuantityMatrix): number | undefined => {
  if (!matrix) {
    return undefined;
  }

  return Object.values(matrix).reduce((total, sizeRow) => {
    const rowTotal = Object.values(sizeRow).reduce((sum, value) => sum + Number(value || 0), 0);
    return total + rowTotal;
  }, 0);
};

export const createSampleOrder = async (
  data: SampleCreationPayload,
): Promise<{ success: boolean; message: string; order: SampleOrder; }> => {
  await new Promise((resolve) => setTimeout(resolve, 400));

  const orders = ensureSampleOrders();
  const newId = `sample_${orders.length + 1}`;
  const newOrderNo = generateOrderNo(orders.length);

  const matrixQuantity = sumMatrixQuantity(data.quantityMatrix);
  const quantity = data.quantity ?? matrixQuantity ?? 1;
  const unitPrice = data.unitPrice ?? data.patternPrice ?? 0;
  const colors = data.colors && data.colors.length > 0 ? data.colors : [data.color || sampleData.colors[0]];
  const sizes = data.sizes && data.sizes.length > 0 ? data.sizes : [data.size || sampleData.sizes[0]];
  const primaryColor = colors[0];
  const primarySize = sizes[0];

  const attachments = data.attachments ?? [];
  const sortedAttachments = [...attachments].sort((a, b) => {
    if (a.isMain && !b.isMain) {
      return -1;
    }
    if (!a.isMain && b.isMain) {
      return 1;
    }
    return 0;
  });
  const imageList = sortedAttachments.map((item) => item.url).filter(Boolean) as string[];

  const deliveryDate = data.deliveryDate ?? data.deadline ?? generateRandomDate(30);
  const orderDate = data.orderDate ?? new Date().toISOString();
  const customerName = data.customer || data.customerName || sampleData.customers[0];

  const quantityMatrix = data.quantityMatrix && Object.keys(data.quantityMatrix).length > 0
    ? data.quantityMatrix
    : undefined;

  const newOrder: SampleOrder = {
    id: newId,
    orderNo: data.orderNo || newOrderNo,
    styleName: data.styleName || '未命名款式',
    styleCode: data.styleCode || generateStyleCode(),
    unit: data.unit,
    customer: customerName,
    season: data.season || sampleData.seasons[0],
    category: data.category || sampleData.categories[0],
    fabric: data.fabric || sampleData.fabrics[0],
    color: primaryColor,
    size: primarySize,
    quantity,
    unitPrice,
    totalAmount: quantity * unitPrice,
    status: 'pending',
    priority: data.priority || 'medium',
    deadline: deliveryDate,
    createTime: orderDate,
    updateTime: new Date().toISOString(),
    designer: data.designer || sampleData.designers[0],
    description: data.description,
    images: imageList.length > 0 ? imageList : data.images,
    sampleType: data.sampleType,
    merchandiser: data.merchandiser,
    merchandiserId: data.merchandiserId,
    patternMaker: data.patternMaker,
    patternMakerId: data.patternMakerId,
    patternNo: data.patternNo,
    sampleSewer: data.sampleSewer,
    sampleSewerId: data.sampleSewerId,
    remarks: data.remarks,
    processes: data.processes,
    skuMatrix: quantityMatrix,
    colorImages: data.colorImageMap,
  };

  orders.unshift(newOrder);

  return { success: true, message: '创建成功', order: newOrder };
};

/**
 * 模拟API：获取样板单列表
 */
export const fetchSampleOrders = async (params: SampleQueryParams = {}): Promise<{
  list: SampleOrder[];
  total: number;
  page: number;
  pageSize: number;
}> => {
  await new Promise((resolve) => setTimeout(resolve, Math.random() * 800 + 200));

  const filteredOrders = applySampleFilters(ensureSampleOrders(), params);
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 20;
  const startIndex = Math.max(0, (page - 1) * pageSize);
  const pageData = filteredOrders.slice(startIndex, startIndex + pageSize);

  return {
    list: pageData,
    total: filteredOrders.length,
    page,
    pageSize,
  };
};

/**
 * 模拟API：获取样板单统计
 */
export const fetchSampleStats = async (params: SampleQueryParams = {}): Promise<SampleStats> => {
  await new Promise((resolve) => setTimeout(resolve, 220));
  const filteredOrders = applySampleFilters(ensureSampleOrders(), params);
  return generateSampleStats(filteredOrders);
};

// 导出选项数据，用于筛选器
export const sampleOptions = {
  customers: sampleData.customers,
  seasons: sampleData.seasons,
  categories: sampleData.categories,
  fabrics: sampleData.fabrics,
  colors: sampleData.colors,
  sizes: sampleData.sizes,
  designers: sampleData.designers,
};

const buildQuantityMatrix = (colors: string[], sizes: string[]): Record<string, Record<string, number>> => {
  const baseMatrix: number[][] = [
    [2, 2, 1, 1, 0],
    [1, 1, 2, 1, 1],
    [0, 1, 1, 1, 1],
  ];

  return colors.reduce<Record<string, Record<string, number>>>((acc, color, colorIndex) => {
    const matrixRow = baseMatrix[colorIndex % baseMatrix.length];
    acc[color] = sizes.reduce<Record<string, number>>((rowAcc, size, sizeIndex) => {
      rowAcc[size] = matrixRow[sizeIndex % matrixRow.length];
      return rowAcc;
    }, {} as Record<string, number>);
    return acc;
  }, {});
};

const sumMaterialCost = (items: SampleMaterialItem[], category?: SampleMaterialItem['category']): number => {
  return items
    .filter((item) => (category ? item.category === category : true))
    .reduce((total, item) => total + item.cost, 0);
};

const buildSampleDetail = (order: SampleOrder): SampleOrderDetail => {
  const colors = ['海蓝', '深灰', '咖啡'];
  const sizes = ['90', '100', '110', '120', '130'];
  const quantityMatrix = buildQuantityMatrix(colors, sizes);

  const fabrics: SampleMaterialItem[] = [
    {
      id: 'fabric-1',
      category: 'fabric',
      name: '高密抓绒面料',
      code: 'FAB-2301',
      unit: '米',
      consumption: 1.6,
      unitPrice: 32,
      cost: 51.2,
      lossRate: 0.05,
      supplier: '杭州华奥纺织',
      image: 'https://dummyimage.com/80x80/4164d9/ffffff&text=FAB',
      remark: '内层抓绒保暖，需预缩处理',
    },
    {
      id: 'fabric-2',
      category: 'fabric',
      name: '色织罗纹',
      code: 'FAB-1289',
      unit: '米',
      consumption: 0.45,
      unitPrice: 18,
      cost: 8.1,
      lossRate: 0.03,
      supplier: '宁波云锦针织',
      image: 'https://dummyimage.com/80x80/4f6fec/ffffff&text=RIB',
      remark: '下摆及袖口罗纹',
    },
  ];

  const trims: SampleMaterialItem[] = [
    {
      id: 'trim-1',
      category: 'trim',
      name: '5 号树脂拉链',
      code: 'TRM-5508',
      unit: '条',
      consumption: 1,
      unitPrice: 3.8,
      cost: 3.8,
      supplier: '温州吉祥拉链',
      image: 'https://dummyimage.com/80x80/1b4ed4/ffffff&text=ZIP',
      remark: '定制 logo 拉头',
    },
    {
      id: 'trim-2',
      category: 'trim',
      name: '安全反光条',
      code: 'TRM-6221',
      unit: '米',
      consumption: 0.3,
      unitPrice: 12,
      cost: 3.6,
      supplier: '苏州光启材料',
      image: 'https://dummyimage.com/80x80/2a5fee/ffffff&text=RF',
      remark: '帽沿装饰',
    },
    {
      id: 'trim-3',
      category: 'trim',
      name: '定制吊牌',
      code: 'PKG-1056',
      unit: '个',
      consumption: 1,
      unitPrice: 1.3,
      cost: 1.3,
      supplier: '义乌森品印刷',
      image: 'https://dummyimage.com/80x80/3155da/ffffff&text=TAG',
      remark: '四色印刷',
    },
    {
      id: 'pkg-1',
      category: 'packaging',
      name: '加厚自封袋',
      code: 'PKG-2001',
      unit: '个',
      consumption: 1,
      unitPrice: 0.8,
      cost: 0.8,
      supplier: '嘉兴清新包装',
      image: 'https://dummyimage.com/80x80/4460e0/ffffff&text=BAG',
      remark: '成品出货包装',
    },
    {
      id: 'pkg-2',
      category: 'packaging',
      name: 'A3 纸箱',
      code: 'PKG-3320',
      unit: '个',
      consumption: 0.2,
      unitPrice: 12,
      cost: 2.4,
      supplier: '上海飞扬纸业',
      image: 'https://dummyimage.com/80x80/5270f0/ffffff&text=BOX',
      remark: '用于打板寄送',
    },
  ];

  const processes: SampleProcessItem[] = [
    { id: 'proc-1', sequence: 1, name: '版前裁剪', laborPrice: 21.5, standardTime: 1.2 },
    { id: 'proc-2', sequence: 2, name: '车缝组合', laborPrice: 38.5, standardTime: 2.5 },
    { id: 'proc-3', sequence: 3, name: '激光开袋', laborPrice: 16.4, standardTime: 0.8 },
    { id: 'proc-4', sequence: 4, name: '后整检验', laborPrice: 12.8, standardTime: 0.6 },
  ];

  const otherCosts: SampleOtherCostItem[] = [
    {
      id: 'cost-1',
      costType: '打板资料费',
      developmentCost: 120,
      quotedUnitCost: 8.5,
      remark: '包含纸样打印与装订',
    },
    {
      id: 'cost-2',
      costType: '物流快递',
      developmentCost: 45,
      quotedUnitCost: 3.2,
      remark: '寄板至客户，顺丰隔日达',
    },
  ];

  const attachments: SampleAttachment[] = [
    {
      id: 'att-1',
      name: '线稿图.pdf',
      type: 'pdf',
      size: '1.2MB',
      url: 'https://example.com/files/sample-line-drawing.pdf',
      updatedAt: '2025-08-13 10:20',
    },
    {
      id: 'att-2',
      name: '工序分解表.xlsx',
      type: 'xlsx',
      size: '680KB',
      url: 'https://example.com/files/process-breakdown.xlsx',
      updatedAt: '2025-08-13 10:32',
    },
    {
      id: 'att-3',
      name: '试穿反馈.docx',
      type: 'docx',
      size: '420KB',
      url: 'https://example.com/files/fitting-feedback.docx',
      updatedAt: '2025-08-14 09:05',
    },
  ];

  const developmentFeeDetails: SampleDevelopmentCostItem[] = [
    { id: 'dev-1', name: '纸样制作', amount: 120, remark: '含两轮修版' },
    { id: 'dev-2', name: '试衣调整', amount: 95, remark: '安排模特试穿与反馈' },
    { id: 'dev-3', name: '资料整理', amount: 50, remark: '档案整理与归档' },
  ];

  const fabricCost = sumMaterialCost(fabrics, 'fabric');
  const trimCost = sumMaterialCost(trims, 'trim');
  const packagingCost = sumMaterialCost(trims, 'packaging');
  const processingCost = processes.reduce((sum, item) => sum + item.laborPrice, 0);
  const developmentFee = developmentFeeDetails.reduce((sum, item) => sum + item.amount, 0);
  const totalQuotedPrice = parseFloat((fabricCost + trimCost + packagingCost + processingCost).toFixed(2));

  return {
    id: order.id,
    styleNo: order.styleCode,
    sampleNo: order.orderNo,
    merchandiser: '赵雨晴',
    patternMaker: '陈纸样',
    patternPrice: 0,
    styleName: order.styleName,
    patternType: '原板',
    patternDate: order.createTime.slice(0, 10),
    paperPatternNo: `PN-${order.styleCode.slice(-4)}`,
    remarks: order.description ?? '首次客户打板，重点关注帽型立体度与袖肥调整。',
    unit: '件',
    customer: order.customer,
    estimatedDeliveryDate: order.deadline,
    sampleSewer: '李车板',
    processingTypes: ['裁剪', '车缝', '激光开袋'],
    lineArtImage: 'https://dummyimage.com/320x360/eff2ff/1f3b73&text=Line+Art',
    colors,
    sizes,
    quantityMatrix,
    bom: {
      fabrics,
      trims,
    },
    processes,
    sizeChartImage: 'https://dummyimage.com/720x420/f7f9ff/4f6fbf&text=Size+Chart',
    otherCosts,
    attachments,
    cost: {
      totalQuotedPrice,
      developmentFee,
      breakdown: {
        fabric: parseFloat(fabricCost.toFixed(2)),
        trims: parseFloat(trimCost.toFixed(2)),
        packaging: parseFloat(packagingCost.toFixed(2)),
        processing: parseFloat(processingCost.toFixed(2)),
      },
      developmentFeeDetails,
    },
  };
};

export const fetchSampleOrderDetail = async (id: string): Promise<SampleOrderDetail> => {
  await new Promise((resolve) => setTimeout(resolve, 260));
  const target = ensureSampleOrders().find((item) => item.id === id) ?? ensureSampleOrders()[0];
  return buildSampleDetail(target);
};
