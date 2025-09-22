import React from 'react';
import { 
  AppstoreOutlined,
  FileTextOutlined,
  ShopOutlined,
  CreditCardOutlined,
  MoneyCollectOutlined,
  ShoppingOutlined,
  UserOutlined,
  IdcardOutlined
} from '@ant-design/icons';
import type { 
  DeliveryItem, 
  QuickAction, 
  WorkplaceStats, 
  Announcement, 
  PaginatedResponse 
} from '../types/workplace';

/**
 * 快速入口配置 - 根据原网站设计
 */
export const quickActions: QuickAction[] = [
  {
    key: 'styles',
    title: '款式',
    icon: React.createElement(AppstoreOutlined),
    color: '#52C41A', // 主色绿
  },
  {
    key: 'sample-orders',
    title: '样板单',
    icon: React.createElement(FileTextOutlined),
    color: '#722ED1', // 紫色
  },
  {
    key: 'factory-orders',
    title: '工厂订单',
    icon: React.createElement(ShopOutlined),
    color: '#52C41A', // 绿色
  },
  {
    key: 'customer-payment',
    title: '客户收款',
    icon: React.createElement(CreditCardOutlined),
    color: '#FA8C16', // 橙色
  },
  {
    key: 'factory-payment',
    title: '加工厂付款',
    icon: React.createElement(MoneyCollectOutlined),
    color: '#1890FF', // 蓝色
  },
  {
    key: 'supplier-payment',
    title: '供应商付款',
    icon: React.createElement(ShoppingOutlined),
    color: '#F5222D', // 红色
  },
  {
    key: 'user-management',
    title: '用户管理',
    icon: React.createElement(UserOutlined),
    color: '#FA8C16', // 橙色
  },
  {
    key: 'job-applications',
    title: '入职申请',
    icon: React.createElement(IdcardOutlined),
    color: '#13C2C2', // 青色
  },
];

/**
 * 工作台统计数据生成器
 */
export const generateWorkplaceStats = (): WorkplaceStats => ({
  newOrders: Math.floor(Math.random() * 20) + 10,
  sampleCount: Math.floor(Math.random() * 15) + 5,
  inProduction: Math.floor(Math.random() * 50) + 20,
  shipped: Math.floor(Math.random() * 100) + 50,
});

/**
 * 生成随机头像URL
 */
const generateAvatarUrl = (): string => {
  const avatarIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const id = avatarIds[Math.floor(Math.random() * avatarIds.length)];
  return `https://i.pravatar.cc/40?img=${id}`;
};

/**
 * 样本数据集
 */
const sampleData = {
  styleNames: [
    '夏季短袖T恤', '春秋长袖衬衫', '冬季羽绒服', '休闲牛仔裤', '商务西装套装',
    '运动连帽衫', '女士连衣裙', '儿童卫衣', '针织毛衣', '户外冲锋衣',
    '时尚外套', '职业套装', '休闲短裤', '运动裤', '睡衣套装'
  ],
  customerOrgs: [
    '上海服装贸易有限公司', '广州时尚集团', '深圳纺织进出口公司', '北京服饰连锁',
    '杭州品牌运营中心', '苏州制衣企业', '武汉服装批发商', '成都时装公司',
    '青岛纺织集团', '宁波贸易公司', '厦门服装设计', '大连制造企业'
  ],
  factoryOrgs: [
    '东莞制衣加工厂', '佛山纺织制造', '惠州服装生产基地', '中山制衣企业',
    '江门加工中心', '珠海制造公司', '汕头纺织厂', '潮州服装厂',
    '河源制衣工厂', '梅州纺织企业', '清远加工厂', '韶关制造基地'
  ],
};

/**
 * 生成随机日期（未来7天内）
 */
const generateRandomDate = (): string => {
  const today = new Date();
  const futureDate = new Date(today.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000);
  return futureDate.toISOString().split('T')[0];
};

/**
 * 生成单个交货数据项
 */
const generateDeliveryItem = (id: number, isCustomer: boolean = true): DeliveryItem => {
  const orgs = isCustomer ? sampleData.customerOrgs : sampleData.factoryOrgs;
  
  return {
    id: `${isCustomer ? 'C' : 'F'}${id.toString().padStart(3, '0')}`,
    orderNo: `${isCustomer ? 'SO' : 'PO'}${(Math.floor(Math.random() * 9000) + 1000)}`,
    styleName: sampleData.styleNames[Math.floor(Math.random() * sampleData.styleNames.length)],
    org: orgs[Math.floor(Math.random() * orgs.length)],
    date: generateRandomDate(),
    qty: Math.floor(Math.random() * 5000) + 100,
    type: isCustomer ? undefined : '外协加工',
    image: generateAvatarUrl(),
  };
};

/**
 * 生成客户版交货列表数据
 */
export const generateCustomerDeliveryList = (count: number = 10): DeliveryItem[] => {
  return Array.from({ length: count }, (_, index) => generateDeliveryItem(index + 1, true));
};

/**
 * 生成加工厂版交货列表数据
 */
export const generateFactoryDeliveryList = (count: number = 10): DeliveryItem[] => {
  return Array.from({ length: count }, (_, index) => generateDeliveryItem(index + 1, false));
};

/**
 * 生成公告数据
 */
export const generateAnnouncements = (count: number = 5): Announcement[] => {
  const announcements = [
    {
      title: '春季新品发布会通知',
      content: '定于下周三召开春季新品发布会，请相关部门做好准备工作。',
      author: '产品部',
    },
    {
      title: '生产计划调整通知',
      content: '由于原材料供应延迟，本月生产计划需要相应调整，具体安排见附件。',
      author: '生产部',
    },
    {
      title: '质量管控要求更新',
      content: '为提升产品质量，现更新质量管控要求，请各部门严格执行。',
      author: '质量部',
    },
    {
      title: '系统维护通知',
      content: '本周六晚上10点至次日凌晨2点进行系统维护，期间系统将暂停服务。',
      author: '技术部',
    },
    {
      title: '月度绩效考核安排',
      content: '本月绩效考核将于月底进行，请各部门提前准备相关材料。',
      author: '人事部',
    },
  ];

  return Array.from({ length: count }, (_, index) => ({
    id: `ANN${(index + 1).toString().padStart(3, '0')}`,
    title: announcements[index % announcements.length].title,
    content: announcements[index % announcements.length].content,
    createTime: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    author: announcements[index % announcements.length].author,
  }));
};

/**
 * 模拟分页数据获取
 */
export const fetchPaginatedData = async <T>(
  dataGenerator: () => T[],
  page: number = 1,
  pageSize: number = 10
): Promise<PaginatedResponse<T>> => {
  // 模拟网络延迟
  await new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 200));
  
  const allData = dataGenerator();
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const pageData = allData.slice(startIndex, endIndex);
  
  return {
    list: pageData,
    total: allData.length,
    page,
    pageSize,
  };
};