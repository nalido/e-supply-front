/**
 * 样板单状态常量
 */
export const SampleStatus = {
  PENDING: 'pending' as const,
  CONFIRMED: 'confirmed' as const, 
  PRODUCING: 'producing' as const,
  COMPLETED: 'completed' as const,
  CANCELLED: 'cancelled' as const,
} as const;

export type SampleStatus = typeof SampleStatus[keyof typeof SampleStatus];

export interface SampleProcessOption {
  id: string;
  name: string;
  description?: string;
  defaultDuration?: number;
  department?: string;
  tags?: string[];
}

export interface SampleProcessStep extends SampleProcessOption {
  order: number;
  custom?: boolean;
}

export type SampleQuantityMatrix = Record<string, Record<string, number>>;

/**
 * 样板单数据项
 */
export interface SampleOrder {
  id: string;
  orderNo: string; // 样板单号
  styleName: string; // 款式名称
  styleCode: string; // 款式编号
  unit?: string; // 单位
  customer: string; // 客户
  season: string; // 季节
  category: string; // 品类
  fabric: string; // 面料
  color: string; // 颜色
  size: string; // 尺码
  quantity: number; // 数量
  unitPrice: number; // 单价
  totalAmount: number; // 总金额
  status: SampleStatus; // 状态
  priority: 'low' | 'medium' | 'high' | 'urgent'; // 优先级
  sampleType?: string; // 板类
  merchandiser?: string; // 跟单员
  merchandiserId?: string;
  patternMaker?: string; // 纸样师
  patternMakerId?: string;
  patternNo?: string; // 纸样号
  sampleSewer?: string; // 车板师
  sampleSewerId?: string;
  deadline: string; // 交期
  createTime: string; // 创建时间
  updateTime: string; // 更新时间
  designer: string; // 设计师
  description?: string; // 备注
  images?: string[]; // 图片
  remarks?: string; // 备注扩展
  processes?: SampleProcessStep[]; // 加工流程
  skuMatrix?: SampleQuantityMatrix; // SKU 数量矩阵
  colorImages?: Record<string, string | undefined>; // 颜色图片映射
}

/**
 * 样板单查询参数
 */
export interface SampleQueryParams {
  keyword?: string; // 关键词搜索
  status?: SampleStatus; // 状态筛选
  customer?: string; // 客户筛选
  season?: string; // 季节筛选
  category?: string; // 品类筛选
  priority?: string; // 优先级筛选
  startDate?: string; // 开始日期
  endDate?: string; // 结束日期
  page?: number;
  pageSize?: number;
}

/**
 * 样板单统计数据
 */
export interface SampleStats {
  total: number; // 总数
  pending: number; // 待确认
  confirmed: number; // 已确认
  producing: number; // 生产中
  completed: number; // 已完成
  cancelled: number; // 已取消
  thisMonth: number; // 本月新增
  urgent: number; // 紧急
}

export interface SampleDashboardStats {
  thisWeek: number;
  thisMonth: number;
  lastMonth: number;
  thisYear: number;
}

export type TemplateFieldType = 'text' | 'number' | 'date' | 'select' | 'checkbox' | 'file';

export interface TemplateNode {
  id: number;
  sortOrder: number;
  sequenceNo: number;
  nodeName: string;
  fieldType: TemplateFieldType;
  duration: number;
}

export interface FollowTemplateSummary {
  id: number;
  sequenceNo: number;
  name: string;
  isDefault: boolean;
  nodes?: TemplateNode[];
}

export interface SampleTypeItem {
  id: number;
  name: string;
}

export interface SampleChartPoint {
  date: string;
  count: number;
  type: string;
}

export interface SamplePieDatum {
  name: string;
  value: number;
  category: string;
}

export interface SampleOverdueItem {
  image?: string;
  sampleNo: string;
  styleName: string;
  sampleType: string;
  expectedDate: string;
  overdueDays: number;
}
