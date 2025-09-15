// 统一 Mock API 层：所有页面的数据先走这里，后端完成后把对应接口指向真实服务即可
// 结构：每个领域一个命名空间，方法返回 Promise，模拟网络延迟

export type Paginated<T> = {
  list: T[];
  total: number;
};

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

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
  async pendingCustomer(): Promise<Paginated<any>> {
    await delay(300);
    return { list: [], total: 0 };
  },
  async pendingFactory(): Promise<Paginated<any>> {
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
  async factory(params: { page: number; pageSize: number }): Promise<Paginated<any>> {
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
  async stock(params: { page: number; pageSize: number }): Promise<Paginated<any>> {
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
  async inboundPending(params: { page: number; pageSize: number }): Promise<Paginated<any>> {
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

// 车间计件、协同中心、对账结算、基础资料、系统设置可按需逐步补充

export default {
  dashboard,
  orders,
  materials,
  products,
};


