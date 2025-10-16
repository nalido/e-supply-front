import type {
  IncomingOrder,
  IncomingOrderListParams,
  IncomingOrderShipmentPayload,
  IncomingOrderStatus,
  OutsourceOrder,
  OutsourceOrderListParams,
  OutsourceOrderStatus,
  OutsourceReceiptPayload,
  OutsourceMaterialRequestPayload,
} from '../types';
import type { Paginated } from '../api/mock';

const MOCK_LATENCY = 240;

const clients = ['鸿铭服饰', '木棉云设计', '悦绣工坊', '杉禾供应链', '梵熙品牌'];

const baseIncomingOrders: IncomingOrder[] = [
  {
    id: 'incoming-202410-001',
    orderNo: 'WX-202410-001',
    clientName: clients[0],
    styleCode: 'ET5308',
    styleName: '时尚拼接连衣裙',
    styleImage: '/assets/images/styles/ET5033.jpg',
    status: '待接单',
    dispatchDate: '2024-10-08',
    deliveryDate: '2024-11-05',
    shippedQuantity: 0,
    totalQuantity: 500,
    receiptConfirmed: false,
    defects: 0,
    memo: '客户要求出货前再次确认辅料配色。',
  },
  {
    id: 'incoming-202410-002',
    orderNo: 'WX-202410-002',
    clientName: clients[1],
    styleCode: 'CT0116',
    styleName: '立领工装夹克',
    styleImage: '/assets/images/styles/ET0110.jpg',
    status: '待接单',
    dispatchDate: '2024-10-09',
    deliveryDate: '2024-10-28',
    shippedQuantity: 0,
    totalQuantity: 320,
    receiptConfirmed: false,
    defects: 0,
  },
  {
    id: 'incoming-202409-015',
    orderNo: 'WX-202409-015',
    clientName: clients[2],
    styleCode: 'ET5031',
    styleName: '儿童撞色条纹卫衣卫裤套装',
    styleImage: '/assets/images/styles/ET5031.jpg',
    status: '生产中',
    dispatchDate: '2024-09-30',
    deliveryDate: '2024-10-25',
    shippedQuantity: 120,
    totalQuantity: 800,
    receiptConfirmed: false,
    defects: 2,
  },
  {
    id: 'incoming-202409-021',
    orderNo: 'WX-202409-021',
    clientName: clients[3],
    styleCode: 'CT0298',
    styleName: '成人迷彩加绒拉链外套',
    styleImage: '/assets/images/styles/CT0010.jpg',
    status: '生产中',
    dispatchDate: '2024-09-18',
    deliveryDate: '2024-10-18',
    shippedQuantity: 0,
    totalQuantity: 600,
    receiptConfirmed: false,
    defects: 1,
    memo: '材质需达到耐水洗4级。',
  },
  {
    id: 'incoming-202409-033',
    orderNo: 'WX-202409-033',
    clientName: clients[1],
    styleCode: 'ET0152',
    styleName: '儿童拼色棒球服套装',
    styleImage: '/assets/images/styles/ET0152.jpg',
    status: '待发货',
    dispatchDate: '2024-09-12',
    deliveryDate: '2024-10-10',
    shippedQuantity: 520,
    totalQuantity: 600,
    receiptConfirmed: false,
    defects: 3,
  },
  {
    id: 'incoming-202409-038',
    orderNo: 'WX-202409-038',
    clientName: clients[4],
    styleCode: 'ET0193',
    styleName: '儿童书包卫衣',
    styleImage: '/assets/images/styles/ET0193.jpg',
    status: '待发货',
    dispatchDate: '2024-09-05',
    deliveryDate: '2024-10-02',
    shippedQuantity: 760,
    totalQuantity: 760,
    receiptConfirmed: false,
    defects: 0,
  },
  {
    id: 'incoming-202409-040',
    orderNo: 'WX-202409-040',
    clientName: clients[0],
    styleCode: 'ET0151',
    styleName: '儿童拉链连帽拼色套装',
    styleImage: '/assets/images/styles/ET0151.jpg',
    status: '已完结',
    dispatchDate: '2024-08-30',
    deliveryDate: '2024-09-25',
    shippedQuantity: 420,
    totalQuantity: 420,
    receiptConfirmed: true,
    defects: 0,
    memo: '客户反馈包装规范，继续保持。',
  },
  {
    id: 'incoming-202409-041',
    orderNo: 'WX-202409-041',
    clientName: clients[2],
    styleCode: 'CT0056',
    styleName: '成人防风夹克',
    styleImage: '/assets/images/styles/ET0362.jpg',
    status: '已完结',
    dispatchDate: '2024-08-28',
    deliveryDate: '2024-09-22',
    shippedQuantity: 300,
    totalQuantity: 300,
    receiptConfirmed: true,
    defects: 1,
  },
  {
    id: 'incoming-202409-042',
    orderNo: 'WX-202409-042',
    clientName: clients[3],
    styleCode: 'ET0070',
    styleName: '儿童拉链卫衣',
    styleImage: '/assets/images/styles/ET0070.jpg',
    status: '已拒绝',
    dispatchDate: '2024-09-15',
    deliveryDate: '2024-10-20',
    shippedQuantity: 0,
    totalQuantity: 900,
    receiptConfirmed: false,
    defects: 0,
    memo: '样衣确认未通过，客户另行安排供应商。',
  },
  {
    id: 'incoming-202409-043',
    orderNo: 'WX-202409-043',
    clientName: clients[4],
    styleCode: 'ET0409',
    styleName: '儿童拼色连帽开衫套装',
    styleImage: '/assets/images/styles/ET0409.jpg',
    status: '生产中',
    dispatchDate: '2024-09-22',
    deliveryDate: '2024-10-18',
    shippedQuantity: 60,
    totalQuantity: 640,
    receiptConfirmed: false,
    defects: 0,
  },
];

const incomingOrdersDb = baseIncomingOrders.map((order) => ({ ...order }));

const cloneIncomingOrder = (order: IncomingOrder): IncomingOrder => ({ ...order });

const paginate = <T,>(items: T[], page = 1, pageSize = 10): { list: T[]; total: number } => {
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  return { list: items.slice(start, end), total: items.length };
};

const matchesIncomingKeyword = (order: IncomingOrder, keyword?: string): boolean => {
  if (!keyword) return true;
  const value = keyword.trim().toLowerCase();
  if (!value) return true;
  return [order.orderNo, order.styleCode, order.styleName]
    .filter(Boolean)
    .some((field) => String(field).toLowerCase().includes(value));
};

const matchesClient = (order: IncomingOrder, clientName?: string): boolean => {
  if (!clientName) return true;
  if (clientName === 'ALL') return true;
  return order.clientName === clientName;
};

const matchesIncomingStatus = (order: IncomingOrder, status?: IncomingOrderStatus): boolean => {
  if (!status) return true;
  if (status === '已拒绝') {
    return order.status === '已拒绝';
  }
  return order.status === status;
};

export const listIncomingOrders = async (
  params: IncomingOrderListParams = {},
): Promise<Paginated<IncomingOrder>> =>
  new Promise((resolve) => {
    setTimeout(() => {
      const { page = 1, pageSize = 10, status, clientName, keyword } = params;
      const filtered = incomingOrdersDb
        .filter((order) => matchesIncomingStatus(order, status))
        .filter((order) => matchesClient(order, clientName))
        .filter((order) => matchesIncomingKeyword(order, keyword))
        .map(cloneIncomingOrder);
      const { list, total } = paginate(filtered, page, pageSize);
      resolve({ list, total });
    }, MOCK_LATENCY);
  });

export const setIncomingOrdersStatus = async (
  orderIds: string[],
  nextStatus: IncomingOrderStatus,
): Promise<IncomingOrder[]> =>
  new Promise((resolve) => {
    setTimeout(() => {
      const updated = incomingOrdersDb
        .filter((order) => orderIds.includes(order.id))
        .map((order) => {
          order.status = nextStatus;
          if (nextStatus === '已完结') {
            order.receiptConfirmed = true;
            order.shippedQuantity = order.totalQuantity;
          }
          return cloneIncomingOrder(order);
        });
      resolve(updated);
    }, MOCK_LATENCY);
  });

export const acceptIncomingOrder = async (orderId: string): Promise<IncomingOrder | undefined> =>
  new Promise((resolve) => {
    setTimeout(() => {
      const order = incomingOrdersDb.find((item) => item.id === orderId);
      if (!order) {
        resolve(undefined);
        return;
      }
      order.status = '生产中';
      resolve(cloneIncomingOrder(order));
    }, MOCK_LATENCY);
  });

export const rejectIncomingOrder = async (
  orderId: string,
  reason?: string,
): Promise<IncomingOrder | undefined> =>
  new Promise((resolve) => {
    setTimeout(() => {
      const order = incomingOrdersDb.find((item) => item.id === orderId);
      if (!order) {
        resolve(undefined);
        return;
      }
      order.status = '已拒绝';
      if (reason) {
        order.memo = reason;
      }
      order.shippedQuantity = 0;
      order.receiptConfirmed = false;
      resolve(cloneIncomingOrder(order));
    }, MOCK_LATENCY);
  });

export const shipIncomingOrder = async (
  orderId: string,
  payload: IncomingOrderShipmentPayload,
): Promise<IncomingOrder | undefined> =>
  new Promise((resolve) => {
    setTimeout(() => {
      const order = incomingOrdersDb.find((item) => item.id === orderId);
      if (!order) {
        resolve(undefined);
        return;
      }
      const quantity = Math.max(0, Number.isFinite(payload.quantity) ? payload.quantity : 0);
      const maxQuantity = Math.max(order.totalQuantity - order.shippedQuantity, 0);
      const actual = Math.min(quantity, maxQuantity);
      order.shippedQuantity += actual;
      if (order.status === '待接单') {
        order.status = '生产中';
      }
      if (order.status === '生产中' && order.shippedQuantity > 0) {
        order.status = '待发货';
      }
      if (order.shippedQuantity >= order.totalQuantity && order.receiptConfirmed) {
        order.status = '已完结';
      }
      resolve(cloneIncomingOrder(order));
    }, MOCK_LATENCY);
  });

export const incomingOrderClients = [...new Set(incomingOrdersDb.map((order) => order.clientName))];

export const listIncomingOrderClients = async (): Promise<string[]> =>
  new Promise((resolve) => {
    setTimeout(() => {
      resolve([...incomingOrderClients]);
    }, Math.min(MOCK_LATENCY, 180));
  });

const baseOutsourceOrders: OutsourceOrder[] = [
  {
    id: 'outsource-202410-001',
    orderNo: 'WO-202410-001',
    partnerName: '星辰裁缝厂',
    styleCode: 'ET0193',
    styleName: '儿童纯色连帽卫衣',
    styleImage: '/assets/images/styles/ET0193.jpg',
    status: '已完结',
    shipDate: '2024-10-08',
    expectedReturnDate: '2024-10-22',
    receivedQuantity: 480,
    totalQuantity: 480,
    defects: 6,
    remark: '批次A需优先回货。',
  },
  {
    id: 'outsource-202410-002',
    orderNo: 'WO-202410-002',
    partnerName: '南洋制衣',
    styleCode: 'CT0056',
    styleName: '成人防风夹克',
    styleImage: '/assets/images/styles/CT0010.jpg',
    status: '已完结',
    shipDate: '2024-10-10',
    expectedReturnDate: '2024-10-28',
    receivedQuantity: 600,
    totalQuantity: 600,
    defects: 4,
    remark: '次品已返工处理完毕。',
  },
  {
    id: 'outsource-202409-020',
    orderNo: 'WO-202409-020',
    partnerName: '梵熙品牌合作厂',
    styleCode: 'ET0409',
    styleName: '儿童拼色连帽开衫套装',
    styleImage: '/assets/images/styles/ET0409.jpg',
    status: '已完结',
    shipDate: '2024-09-20',
    expectedReturnDate: '2024-10-12',
    receivedQuantity: 500,
    totalQuantity: 500,
    defects: 6,
  },
  {
    id: 'outsource-202409-031',
    orderNo: 'WO-202409-031',
    partnerName: '杉禾供应链',
    styleCode: 'ET5031',
    styleName: '儿童撞色条纹卫衣卫裤套装',
    styleImage: '/assets/images/styles/ET5031.jpg',
    status: '已完结',
    shipDate: '2024-09-28',
    expectedReturnDate: '2024-10-18',
    receivedQuantity: 640,
    totalQuantity: 640,
    defects: 2,
  },
  {
    id: 'outsource-202409-035',
    orderNo: 'WO-202409-035',
    partnerName: '木棉云设计协作厂',
    styleCode: 'ET0151',
    styleName: '儿童拉链连帽拼色套装',
    styleImage: '/assets/images/styles/ET0151.jpg',
    status: '已完结',
    shipDate: '2024-09-05',
    expectedReturnDate: '2024-09-25',
    receivedQuantity: 520,
    totalQuantity: 520,
    defects: 1,
    remark: '成品已入库。',
  },
  {
    id: 'outsource-202409-036',
    orderNo: 'WO-202409-036',
    partnerName: '鸿铭服饰代工厂',
    styleCode: 'ET0152',
    styleName: '儿童拼色棒球服套装',
    styleImage: '/assets/images/styles/ET0152.jpg',
    status: '已取消',
    shipDate: '2024-09-02',
    expectedReturnDate: '2024-09-29',
    receivedQuantity: 0,
    totalQuantity: 480,
    defects: 0,
    remark: '客户取消，已通知对方停止生产。',
  },
];

const outsourceOrdersDb = baseOutsourceOrders.map((order) => ({ ...order }));

const cloneOutsourceOrder = (order: OutsourceOrder): OutsourceOrder => ({ ...order });

const matchesOutsourceStatus = (order: OutsourceOrder, status?: OutsourceOrderStatus | '全部'): boolean => {
  if (!status || status === '全部') return true;
  return order.status === status;
};

const matchesOutsourceKeyword = (order: OutsourceOrder, keyword?: string): boolean => {
  if (!keyword) return true;
  const value = keyword.trim().toLowerCase();
  if (!value) return true;
  return [order.orderNo, order.styleCode, order.styleName]
    .filter(Boolean)
    .some((field) => String(field).toLowerCase().includes(value));
};

export const listOutsourceOrders = async (
  params: OutsourceOrderListParams = {},
): Promise<Paginated<OutsourceOrder>> =>
  new Promise((resolve) => {
    setTimeout(() => {
      const { page = 1, pageSize = 10, status, keyword } = params;
      const filtered = outsourceOrdersDb
        .filter((order) => matchesOutsourceStatus(order, status))
        .filter((order) => matchesOutsourceKeyword(order, keyword))
        .map(cloneOutsourceOrder);
      const { list, total } = paginate(filtered, page, pageSize);
      resolve({ list, total });
    }, MOCK_LATENCY);
  });

export const confirmOutsourceReceipt = async (
  orderIds: string[],
  payload: OutsourceReceiptPayload,
): Promise<OutsourceOrder[]> =>
  new Promise((resolve) => {
    setTimeout(() => {
      const { receivedQuantity, defectQuantity = 0, remark } = payload;
      const updated = outsourceOrdersDb
        .filter((order) => orderIds.includes(order.id))
        .map((order) => {
          order.receivedQuantity = Math.min(order.receivedQuantity + receivedQuantity, order.totalQuantity);
          order.defects = Math.max(order.defects + defectQuantity, 0);
          if (order.status !== '已取消' && order.receivedQuantity >= order.totalQuantity) {
            order.status = '已完结';
          }
          if (remark) {
            order.remark = remark;
          }
          return cloneOutsourceOrder(order);
        });
      resolve(updated);
    }, MOCK_LATENCY);
  });

export const requestOutsourceMaterial = async (
  orderId: string,
  payload: OutsourceMaterialRequestPayload,
): Promise<OutsourceOrder | undefined> =>
  new Promise((resolve) => {
    setTimeout(() => {
      const order = outsourceOrdersDb.find((item) => item.id === orderId);
      if (!order) {
        resolve(undefined);
        return;
      }
      order.materialPending = true;
      if (payload.materialRemark) {
        order.remark = payload.materialRemark;
      }
      resolve(cloneOutsourceOrder(order));
    }, MOCK_LATENCY);
  });

export const setOutsourceOrdersStatus = async (
  orderIds: string[],
  status: OutsourceOrderStatus,
): Promise<OutsourceOrder[]> =>
  new Promise((resolve) => {
    setTimeout(() => {
      const updated = outsourceOrdersDb
        .filter((order) => orderIds.includes(order.id))
        .map((order) => {
          order.status = status;
          if (status === '已完结') {
            order.receivedQuantity = order.totalQuantity;
          }
          return cloneOutsourceOrder(order);
        });
      resolve(updated);
    }, MOCK_LATENCY);
  });
