import type { SampleOrder, SampleStats, SampleStatus } from '../types/sample';

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

/**
 * 模拟API：获取样板单列表
 */
export const fetchSampleOrders = async (params: {
  page?: number;
  pageSize?: number;
  keyword?: string;
  status?: SampleStatus;
  customer?: string;
  startDate?: string;
  endDate?: string;
} = {}): Promise<{
  list: SampleOrder[];
  total: number;
  page: number;
  pageSize: number;
}> => {
  // 模拟网络延迟
  await new Promise(resolve => setTimeout(resolve, Math.random() * 800 + 200));
  
  const allOrders = generateSampleOrders(150);
  let filteredOrders = allOrders;
  
  // 关键词搜索
  if (params.keyword) {
    const keyword = params.keyword.toLowerCase();
    filteredOrders = filteredOrders.filter(order => 
      order.orderNo.toLowerCase().includes(keyword) ||
      order.styleName.toLowerCase().includes(keyword) ||
      order.styleCode.toLowerCase().includes(keyword) ||
      order.customer.toLowerCase().includes(keyword)
    );
  }
  
  // 状态筛选
  if (params.status) {
    filteredOrders = filteredOrders.filter(order => order.status === params.status);
  }
  
  // 客户筛选
  if (params.customer) {
    filteredOrders = filteredOrders.filter(order => order.customer === params.customer);
  }

  if (params.startDate || params.endDate) {
    const start = params.startDate ? new Date(params.startDate) : null;
    const end = params.endDate ? new Date(params.endDate) : null;
    filteredOrders = filteredOrders.filter(order => {
      const createdAt = new Date(order.createTime);
      if (start && createdAt < start) {
        return false;
      }
      if (end && createdAt > end) {
        return false;
      }
      return true;
    });
  }
  
  // 分页
  const page = params.page || 1;
  const pageSize = params.pageSize || 20;
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const pageData = filteredOrders.slice(startIndex, endIndex);
  
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
export const fetchSampleStats = async (): Promise<SampleStats> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  const allOrders = generateSampleOrders(150);
  return generateSampleStats(allOrders);
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
