// 统一 Mock API 层：所有页面的数据先走这里，后端完成后把对应接口指向真实服务即可
// 结构：每个领域一个命名空间，方法返回 Promise，模拟网络延迟

import type {
  FollowTemplateSummary,
  SampleChartPoint,
  SampleDashboardStats,
  SampleOverdueItem,
  SamplePieDatum,
  SampleTypeItem,
  TemplateNode,
} from '../types/sample';

export type Paginated<T> = {
  list: T[];
  total: number;
};

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

type DashboardPendingFactoryItem = {
  id: number;
  orderNo: string;
  styleName: string;
  org: string;
  date: string;
  qty: number;
  type: string;
};

type FactoryOrderSummary = {
  id: number;
  orderNo: string;
  customer: string;
  style: string;
  qty: number;
  dueDate: string;
};

type MaterialStockItem = {
  id: number;
  sku: string;
  name: string;
  qty: number;
  warehouse: string;
};

type ProductInboundPendingItem = {
  id: number;
  orderNo: string;
  style: string;
  qty: number;
  status: string;
};

export const dashboard = {
  async overview() {
    await delay(300);
    return {
      newOrders: 332010,
      sampleThisYear: 379,
      inProduction: 820233,
      shipped: 591501,
    };
  },
  async pendingCustomer(): Promise<Paginated<Record<string, never>>> {
    await delay(300);
    return { list: [], total: 0 };
  },
  async pendingFactory(): Promise<Paginated<DashboardPendingFactoryItem>> {
    await delay(300);
    return {
      list: Array.from({ length: 12 }).map((_, i) => ({
        id: i,
        orderNo: `2025${String(i).padStart(6, '0')}`,
        styleName: ['儿童拉毛卫裤X106', '华夫格短裤ET0302', '拼接连帽卫衣ET0036'][i % 3],
        org: ['本厂', '石狮', '刘国华'][i % 3],
        date: new Date(Date.now() + i * 86400000).toISOString().slice(0, 10),
        qty: [60, 150, 375, 624, 1848][i % 5],
        type: ['车缝', '打扣', '激光开袋'][i % 3],
      })),
      total: 12,
    };
  },
};

export const orders = {
  async factory(params: { page: number; pageSize: number }): Promise<Paginated<FactoryOrderSummary>> {
    await delay(300);
    const total = 35;
    const list = Array.from({ length: params.pageSize }).map((_, idx) => {
      const i = (params.page - 1) * params.pageSize + idx;
      return {
        id: i,
        orderNo: `OD${String(1000 + i)}`,
        customer: ['本厂', '睿宗李总', '石狮'][i % 3],
        style: ['ET0036', 'ET0220', 'ET0302'][i % 3],
        qty: [60, 150, 270, 375][i % 4],
        dueDate: new Date(Date.now() + (i % 10) * 86400000).toISOString().slice(0, 10),
      };
    });
    return { list, total };
  },
};

export const materials = {
  async stock(params: { page: number; pageSize: number }): Promise<Paginated<MaterialStockItem>> {
    await delay(300);
    return {
      list: Array.from({ length: params.pageSize }).map((_, i) => ({
        id: i,
        sku: `MAT-${i}`,
        name: ['棉布', '牛仔布', '拉链', '纽扣'][i % 4],
        qty: 1000 - i * 3,
        warehouse: ['一号仓', '二号仓'][i % 2],
      })),
      total: 200,
    };
  },
};

export const products = {
  async inboundPending(params: { page: number; pageSize: number }): Promise<Paginated<ProductInboundPendingItem>> {
    await delay(300);
    return {
      list: Array.from({ length: params.pageSize }).map((_, i) => ({
        id: i,
        orderNo: `SHIP-${i}`,
        style: ['AC011', 'ET0264', 'ET0228'][i % 3],
        qty: [75, 100, 150, 375][i % 4],
        status: '待收货',
      })),
      total: 80,
    };
  },
};

// 打板相关API
export const sample = {
  // 跟进模板
  async followTemplates(params: { page: number; pageSize: number }): Promise<Paginated<FollowTemplateSummary>> {
    await delay(300);
    const total = 10;
    
    // 详细的模板数据，包含节点信息
    const templates: Array<FollowTemplateSummary & { nodes: TemplateNode[] }> = [
      { 
        id: 1, 
        name: '赛乐', 
        isDefault: false,
        sequenceNo: 0,
        nodes: [
          {
            id: 101,
            sortOrder: 1,
            sequenceNo: 1,
            nodeName: '设计确认',
            fieldType: 'text',
            duration: 2
          },
          {
            id: 102,
            sortOrder: 2,
            sequenceNo: 2,
            nodeName: '样板制作',
            fieldType: 'file',
            duration: 8
          },
          {
            id: 103,
            sortOrder: 3,
            sequenceNo: 3,
            nodeName: '尺寸确认',
            fieldType: 'number',
            duration: 1
          },
          {
            id: 104,
            sortOrder: 4,
            sequenceNo: 4,
            nodeName: '工艺审核',
            fieldType: 'select',
            duration: 3
          }
        ]
      },
      { 
        id: 2, 
        name: '标准模板', 
        isDefault: true,
        sequenceNo: 0,
        nodes: [
          {
            id: 201,
            sortOrder: 1,
            sequenceNo: 1,
            nodeName: '需求分析',
            fieldType: 'text',
            duration: 1
          },
          {
            id: 202,
            sortOrder: 2,
            sequenceNo: 2,
            nodeName: '设计草图',
            fieldType: 'file',
            duration: 4
          },
          {
            id: 203,
            sortOrder: 3,
            sequenceNo: 3,
            nodeName: '材料选择',
            fieldType: 'checkbox',
            duration: 2
          },
          {
            id: 204,
            sortOrder: 4,
            sequenceNo: 4,
            nodeName: '样品制作',
            fieldType: 'text',
            duration: 12
          },
          {
            id: 205,
            sortOrder: 5,
            sequenceNo: 5,
            nodeName: '质量检验',
            fieldType: 'select',
            duration: 2
          },
          {
            id: 206,
            sortOrder: 6,
            sequenceNo: 6,
            nodeName: '客户确认',
            fieldType: 'date',
            duration: 1
          }
        ]
      },
      { 
        id: 3, 
        name: '快速跟进', 
        isDefault: false,
        sequenceNo: 0,
        nodes: [
          {
            id: 301,
            sortOrder: 1,
            sequenceNo: 1,
            nodeName: '快速设计',
            fieldType: 'text',
            duration: 1
          },
          {
            id: 302,
            sortOrder: 2,
            sequenceNo: 2,
            nodeName: '简易样品',
            fieldType: 'file',
            duration: 4
          },
          {
            id: 303,
            sortOrder: 3,
            sequenceNo: 3,
            nodeName: '即时确认',
            fieldType: 'select',
            duration: 0.5
          }
        ]
      },
      { 
        id: 4, 
        name: '详细跟进', 
        isDefault: false,
        nodes: [
          {
            id: 401,
            sortOrder: 1,
            sequenceNo: 1,
            nodeName: '市场调研',
            fieldType: 'text',
            duration: 4
          },
          {
            id: 402,
            sortOrder: 2,
            sequenceNo: 2,
            nodeName: '概念设计',
            fieldType: 'file',
            duration: 8
          },
          {
            id: 403,
            sortOrder: 3,
            sequenceNo: 3,
            nodeName: '细节设计',
            fieldType: 'text',
            duration: 6
          },
          {
            id: 404,
            sortOrder: 4,
            sequenceNo: 4,
            nodeName: '材料测试',
            fieldType: 'checkbox',
            duration: 3
          },
          {
            id: 405,
            sortOrder: 5,
            sequenceNo: 5,
            nodeName: '工艺验证',
            fieldType: 'select',
            duration: 4
          },
          {
            id: 406,
            sortOrder: 6,
            sequenceNo: 6,
            nodeName: '样品制作',
            fieldType: 'text',
            duration: 16
          },
          {
            id: 407,
            sortOrder: 7,
            sequenceNo: 7,
            nodeName: '功能测试',
            fieldType: 'number',
            duration: 2
          },
          {
            id: 408,
            sortOrder: 8,
            sequenceNo: 8,
            nodeName: '外观检查',
            fieldType: 'file',
            duration: 1
          },
          {
            id: 409,
            sortOrder: 9,
            sequenceNo: 9,
            nodeName: '最终确认',
            fieldType: 'date',
            duration: 1
          }
        ]
      },
      { 
        id: 5, 
        name: '客户专用', 
        isDefault: false,
        nodes: [
          {
            id: 501,
            sortOrder: 1,
            sequenceNo: 1,
            nodeName: '客户需求确认',
            fieldType: 'text',
            duration: 2
          },
          {
            id: 502,
            sortOrder: 2,
            sequenceNo: 2,
            nodeName: '定制化设计',
            fieldType: 'file',
            duration: 6
          },
          {
            id: 503,
            sortOrder: 3,
            sequenceNo: 3,
            nodeName: '客户审核',
            fieldType: 'select',
            duration: 2
          },
          {
            id: 504,
            sortOrder: 4,
            sequenceNo: 4,
            nodeName: '样品寄送',
            fieldType: 'date',
            duration: 0.5
          },
          {
            id: 505,
            sortOrder: 5,
            sequenceNo: 5,
            nodeName: '客户反馈',
            fieldType: 'text',
            duration: 24
          }
        ]
      },
      { 
        id: 6, 
        name: '季节性模板', 
        isDefault: false,
        nodes: [
          {
            id: 601,
            sortOrder: 1,
            sequenceNo: 1,
            nodeName: '季节趋势分析',
            fieldType: 'text',
            duration: 3
          },
          {
            id: 602,
            sortOrder: 2,
            sequenceNo: 2,
            nodeName: '色彩搭配',
            fieldType: 'checkbox',
            duration: 2
          },
          {
            id: 603,
            sortOrder: 3,
            sequenceNo: 3,
            nodeName: '面料选择',
            fieldType: 'select',
            duration: 1.5
          }
        ]
      },
      { 
        id: 7, 
        name: '质量优先模板', 
        isDefault: false,
        nodes: [
          {
            id: 701,
            sortOrder: 1,
            sequenceNo: 1,
            nodeName: '质量标准制定',
            fieldType: 'text',
            duration: 2
          },
          {
            id: 702,
            sortOrder: 2,
            sequenceNo: 2,
            nodeName: '多轮质检',
            fieldType: 'number',
            duration: 6
          },
          {
            id: 703,
            sortOrder: 3,
            sequenceNo: 3,
            nodeName: '质量报告',
            fieldType: 'file',
            duration: 1
          }
        ]
      },
      { 
        id: 8, 
        name: '成本控制模板', 
        isDefault: false,
        nodes: [
          {
            id: 801,
            sortOrder: 1,
            sequenceNo: 1,
            nodeName: '成本预估',
            fieldType: 'number',
            duration: 1
          },
          {
            id: 802,
            sortOrder: 2,
            sequenceNo: 2,
            nodeName: '材料优化',
            fieldType: 'select',
            duration: 3
          },
          {
            id: 803,
            sortOrder: 3,
            sequenceNo: 3,
            nodeName: '工艺简化',
            fieldType: 'text',
            duration: 4
          },
          {
            id: 804,
            sortOrder: 4,
            sequenceNo: 4,
            nodeName: '成本确认',
            fieldType: 'number',
            duration: 0.5
          }
        ]
      }
    ];
    
    const startIndex = (params.page - 1) * params.pageSize;
    const endIndex = Math.min(startIndex + params.pageSize, templates.length);
    const list = templates.slice(startIndex, endIndex).map((template, index) => ({
      ...template,
      sequenceNo: startIndex + index + 1,
    }));
    
    return { list, total };
  },
  
  async createFollowTemplate(data: { name: string; isDefault?: boolean }) {
    void data;
    await delay(300);
    return { success: true, message: '创建成功' };
  },
  
  async updateFollowTemplate(id: number, data: { name: string; isDefault?: boolean }) {
    void id;
    void data;
    await delay(300);
    return { success: true, message: '更新成功' };
  },
  
  async deleteFollowTemplate(id: number) {
    void id;
    await delay(300);
    return { success: true, message: '删除成功' };
  },
  
  // 获取跟进模板详情
  async getFollowTemplateById(id: number): Promise<FollowTemplateSummary> {
    await delay(300);
    
    // 返回对应的模板数据（从 followTemplates 中查找）
    const templates: Array<FollowTemplateSummary & { nodes: TemplateNode[] }> = [
      { 
        id: 1, 
        name: '赛乐', 
        isDefault: false,
        sequenceNo: 0,
        nodes: [
          {
            id: 101,
            sortOrder: 1,
            sequenceNo: 1,
            nodeName: '设计确认',
            fieldType: 'text',
            duration: 2
          },
          {
            id: 102,
            sortOrder: 2,
            sequenceNo: 2,
            nodeName: '样板制作',
            fieldType: 'file',
            duration: 8
          },
          {
            id: 103,
            sortOrder: 3,
            sequenceNo: 3,
            nodeName: '尺寸确认',
            fieldType: 'number',
            duration: 1
          },
          {
            id: 104,
            sortOrder: 4,
            sequenceNo: 4,
            nodeName: '工艺审核',
            fieldType: 'select',
            duration: 3
          }
        ]
      },
      { 
        id: 2, 
        name: '标准模板', 
        isDefault: true,
        sequenceNo: 0,
        nodes: [
          {
            id: 201,
            sortOrder: 1,
            sequenceNo: 1,
            nodeName: '需求分析',
            fieldType: 'text',
            duration: 1
          },
          {
            id: 202,
            sortOrder: 2,
            sequenceNo: 2,
            nodeName: '设计草图',
            fieldType: 'file',
            duration: 4
          },
          {
            id: 203,
            sortOrder: 3,
            sequenceNo: 3,
            nodeName: '材料选择',
            fieldType: 'checkbox',
            duration: 2
          },
          {
            id: 204,
            sortOrder: 4,
            sequenceNo: 4,
            nodeName: '样品制作',
            fieldType: 'text',
            duration: 12
          },
          {
            id: 205,
            sortOrder: 5,
            sequenceNo: 5,
            nodeName: '质量检验',
            fieldType: 'select',
            duration: 2
          },
          {
            id: 206,
            sortOrder: 6,
            sequenceNo: 6,
            nodeName: '客户确认',
            fieldType: 'date',
            duration: 1
          }
        ]
      },
      { 
        id: 3, 
        name: '快速跟进', 
        isDefault: false,
        sequenceNo: 0,
        nodes: [
          {
            id: 301,
            sortOrder: 1,
            sequenceNo: 1,
            nodeName: '快速设计',
            fieldType: 'text',
            duration: 1
          },
          {
            id: 302,
            sortOrder: 2,
            sequenceNo: 2,
            nodeName: '简易样品',
            fieldType: 'file',
            duration: 4
          },
          {
            id: 303,
            sortOrder: 3,
            sequenceNo: 3,
            nodeName: '即时确认',
            fieldType: 'select',
            duration: 0.5
          }
        ]
      },
      { 
        id: 4, 
        name: '详细跟进', 
        isDefault: false,
        nodes: [
          {
            id: 401,
            sortOrder: 1,
            sequenceNo: 1,
            nodeName: '市场调研',
            fieldType: 'text',
            duration: 4
          },
          {
            id: 402,
            sortOrder: 2,
            sequenceNo: 2,
            nodeName: '概念设计',
            fieldType: 'file',
            duration: 8
          },
          {
            id: 403,
            sortOrder: 3,
            sequenceNo: 3,
            nodeName: '细节设计',
            fieldType: 'text',
            duration: 6
          },
          {
            id: 404,
            sortOrder: 4,
            sequenceNo: 4,
            nodeName: '材料测试',
            fieldType: 'checkbox',
            duration: 3
          },
          {
            id: 405,
            sortOrder: 5,
            sequenceNo: 5,
            nodeName: '工艺验证',
            fieldType: 'select',
            duration: 4
          },
          {
            id: 406,
            sortOrder: 6,
            sequenceNo: 6,
            nodeName: '样品制作',
            fieldType: 'text',
            duration: 16
          },
          {
            id: 407,
            sortOrder: 7,
            sequenceNo: 7,
            nodeName: '功能测试',
            fieldType: 'number',
            duration: 2
          },
          {
            id: 408,
            sortOrder: 8,
            sequenceNo: 8,
            nodeName: '外观检查',
            fieldType: 'file',
            duration: 1
          },
          {
            id: 409,
            sortOrder: 9,
            sequenceNo: 9,
            nodeName: '最终确认',
            fieldType: 'date',
            duration: 1
          }
        ]
      },
      { 
        id: 5, 
        name: '客户专用', 
        isDefault: false,
        nodes: [
          {
            id: 501,
            sortOrder: 1,
            sequenceNo: 1,
            nodeName: '客户需求确认',
            fieldType: 'text',
            duration: 2
          },
          {
            id: 502,
            sortOrder: 2,
            sequenceNo: 2,
            nodeName: '定制化设计',
            fieldType: 'file',
            duration: 6
          },
          {
            id: 503,
            sortOrder: 3,
            sequenceNo: 3,
            nodeName: '客户审核',
            fieldType: 'select',
            duration: 2
          },
          {
            id: 504,
            sortOrder: 4,
            sequenceNo: 4,
            nodeName: '样品寄送',
            fieldType: 'date',
            duration: 0.5
          },
          {
            id: 505,
            sortOrder: 5,
            sequenceNo: 5,
            nodeName: '客户反馈',
            fieldType: 'text',
            duration: 24
          }
        ]
      },
      { 
        id: 6, 
        name: '季节性模板', 
        isDefault: false,
        nodes: [
          {
            id: 601,
            sortOrder: 1,
            sequenceNo: 1,
            nodeName: '季节趋势分析',
            fieldType: 'text',
            duration: 3
          },
          {
            id: 602,
            sortOrder: 2,
            sequenceNo: 2,
            nodeName: '色彩搭配',
            fieldType: 'checkbox',
            duration: 2
          },
          {
            id: 603,
            sortOrder: 3,
            sequenceNo: 3,
            nodeName: '面料选择',
            fieldType: 'select',
            duration: 1.5
          }
        ]
      },
      { 
        id: 7, 
        name: '质量优先模板', 
        isDefault: false,
        nodes: [
          {
            id: 701,
            sortOrder: 1,
            sequenceNo: 1,
            nodeName: '质量标准制定',
            fieldType: 'text',
            duration: 2
          },
          {
            id: 702,
            sortOrder: 2,
            sequenceNo: 2,
            nodeName: '多轮质检',
            fieldType: 'number',
            duration: 6
          },
          {
            id: 703,
            sortOrder: 3,
            sequenceNo: 3,
            nodeName: '质量报告',
            fieldType: 'file',
            duration: 1
          }
        ]
      },
      { 
        id: 8, 
        name: '成本控制模板', 
        isDefault: false,
        nodes: [
          {
            id: 801,
            sortOrder: 1,
            sequenceNo: 1,
            nodeName: '成本预估',
            fieldType: 'number',
            duration: 1
          },
          {
            id: 802,
            sortOrder: 2,
            sequenceNo: 2,
            nodeName: '材料优化',
            fieldType: 'select',
            duration: 3
          },
          {
            id: 803,
            sortOrder: 3,
            sequenceNo: 3,
            nodeName: '工艺简化',
            fieldType: 'text',
            duration: 4
          },
          {
            id: 804,
            sortOrder: 4,
            sequenceNo: 4,
            nodeName: '成本确认',
            fieldType: 'number',
            duration: 0.5
          }
        ]
      }
    ];
    
    const template = templates.find(t => t.id === id);
    
    if (!template) {
      throw new Error('模板不存在');
    }
    
    return template;
  },
  
  // 样板类型
  async sampleTypes(params: { page: number; pageSize: number }): Promise<Paginated<SampleTypeItem>> {
    await delay(300);
    const types = [
      { id: 1, name: '夏季' },
      { id: 2, name: '返单' },
      { id: 3, name: '春季' },
      { id: 4, name: '秋季' },
      { id: 5, name: '冬季' },
      { id: 6, name: '特殊订制' },
    ];

    const startIndex = (params.page - 1) * params.pageSize;
    const endIndex = Math.min(startIndex + params.pageSize, types.length);
    const list = types.slice(startIndex, endIndex);

    return { list, total: types.length };
  },
  
  async createSampleType(data: { name: string }) {
    void data;
    await delay(300);
    return { success: true, message: '创建成功' };
  },
  
  async updateSampleType(id: number, data: { name: string }) {
    void id;
    void data;
    await delay(300);
    return { success: true, message: '更新成功' };
  },
  
  async deleteSampleType(id: number) {
    void id;
    await delay(300);
    return { success: true, message: '删除成功' };
  },
  
  // 打板统计数据
  async getSampleStats(): Promise<SampleDashboardStats> {
    await delay(300);
    return {
      thisWeek: 7,
      thisMonth: 89,
      lastMonth: 156,
      thisYear: 333,
    };
  },
  
  // 打板对照表图表数据（半年）
  async getSampleChartData(): Promise<SampleChartPoint[]> {
    await delay(300);
    const data: SampleChartPoint[] = [];
    const now = new Date();
    
    // 生成半年的数据
    for (let i = 180; i >= 0; i -= 15) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().slice(0, 10);
      
      data.push({
        date: dateStr,
        count: Math.floor(Math.random() * 50) + 20,
        type: '打板数量',
      });
      
      data.push({
        date: dateStr,
        count: Math.floor(Math.random() * 40) + 15,
        type: '样板数量',
      });
    }
    
    return data;
  },
  
  // 打板数量占比饼图数据（年）
  async getSamplePieData(): Promise<SamplePieDatum[]> {
    await delay(300);
    return [
      {
        name: '已完成',
        value: 2398,
        category: '纸样师',
      },
      {
        name: '未完成',
        value: 0,
        category: '纸样师',
      },
      {
        name: '已完成',
        value: 2398,
        category: '车板师',
      },
      {
        name: '未完成',
        value: 0,
        category: '车板师',
      },
    ];
  },
  
  // 样板超期列表
  async getOverdueSamples(params: { page: number; pageSize: number }): Promise<Paginated<SampleOverdueItem>> {
    await delay(300);
    void params;
    
    // 暂时返回空数据，表示没有超期样板
    return {
      list: [],
      total: 0,
    };
  },
};

// 车间计件、协同中心、对账结算、基础资料、系统设置可按需逐步补充

// 为了兼容组件中的命名，添加别名导出
export const sampleService = sample;

export default {
  dashboard,
  orders,
  materials,
  products,
  sample,
};
