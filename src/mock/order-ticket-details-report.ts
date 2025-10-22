import type {
  OrderTicketLot,
  OrderTicketLotListParams,
  OrderTicketLotListResponse,
  OrderTicketRecord,
  OrderTicketRecordListParams,
  OrderTicketRecordListResponse,
  OrderTicketRecordStatus,
} from '../types/order-ticket-details-report';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const STATUS_SEQUENCE: OrderTicketRecordStatus[] = ['pending', 'settled', 'voided'];

const createTicket = (
  seed: {
    ticketNo: string;
    process: string;
    pieceRate: number;
    quantity: number;
    worker: string;
    color: string;
    size: string;
    recordedAt: string;
    statusIndex?: number;
  },
  context: {
    idPrefix: string;
    orderNumber: string;
    styleNumber: string;
    styleName: string;
    bedNumber: string;
  },
): OrderTicketRecord => {
  const amount = Number((seed.pieceRate * seed.quantity).toFixed(2));
  const status = STATUS_SEQUENCE[seed.statusIndex ?? 1] ?? 'settled';
  return {
    id: `${context.idPrefix}-${seed.ticketNo}`,
    ticketNo: seed.ticketNo,
    orderNumber: context.orderNumber,
    styleNumber: context.styleNumber,
    styleName: context.styleName,
    bedNumber: context.bedNumber,
    color: seed.color,
    size: seed.size,
    processName: seed.process,
    pieceRate: seed.pieceRate,
    quantity: seed.quantity,
    amount,
    worker: seed.worker,
    recordedAt: seed.recordedAt,
    status,
  };
};

const lots: Array<OrderTicketLot & { tickets: OrderTicketRecord[] }> = [
  (() => {
    const base = {
      id: 'lot-ET0032-01',
      orderNumber: 'ET0032-202405',
      styleNumber: 'ET0032',
      styleName: '速干跑步T恤',
      bedNumber: '永春236床',
      remark: '客户追加200件电商备货',
      color: '亮橙/铁灰',
      cuttingDate: '2024-05-18',
      quantity: 3180,
    } satisfies OrderTicketLot;

    const tickets = [
      createTicket(
        {
          ticketNo: 'ET0032-236-001',
          process: '车缝主线',
          pieceRate: 2.6,
          quantity: 140,
          worker: '李小敏',
          color: '亮橙',
          size: 'M',
          recordedAt: '2024-05-22 09:32',
        },
        { ...base, idPrefix: 'TK1' },
      ),
      createTicket(
        {
          ticketNo: 'ET0032-236-002',
          process: '车缝主线',
          pieceRate: 2.6,
          quantity: 160,
          worker: '李小敏',
          color: '亮橙',
          size: 'L',
          recordedAt: '2024-05-22 10:18',
        },
        { ...base, idPrefix: 'TK1' },
      ),
      createTicket(
        {
          ticketNo: 'ET0032-236-010',
          process: '锁边',
          pieceRate: 0.9,
          quantity: 180,
          worker: '周国灿',
          color: '亮橙',
          size: 'XL',
          recordedAt: '2024-05-23 13:10',
        },
        { ...base, idPrefix: 'TK1' },
      ),
      createTicket(
        {
          ticketNo: 'ET0032-236-016',
          process: '整烫定型',
          pieceRate: 0.75,
          quantity: 200,
          worker: '陈晓曼',
          color: '铁灰',
          size: 'L',
          recordedAt: '2024-05-24 16:02',
          statusIndex: 0,
        },
        { ...base, idPrefix: 'TK1' },
      ),
      createTicket(
        {
          ticketNo: 'ET0032-236-021',
          process: '包装入袋',
          pieceRate: 0.5,
          quantity: 260,
          worker: '张伟',
          color: '铁灰',
          size: 'XXL',
          recordedAt: '2024-05-25 11:26',
        },
        { ...base, idPrefix: 'TK1' },
      ),
    ];

    return { ...base, tickets };
  })(),
  (() => {
    const base = {
      id: 'lot-ET1120-02',
      orderNumber: 'ET1120-202404',
      styleNumber: 'ET1120',
      styleName: '商务弹力衬衫',
      bedNumber: '江滨102床',
      remark: '白色款加做熨烫',
      color: '白色',
      cuttingDate: '2024-04-25',
      quantity: 1800,
    } satisfies OrderTicketLot;

    const tickets = [
      createTicket(
        {
          ticketNo: 'ET1120-102-003',
          process: '裁线头',
          pieceRate: 0.45,
          quantity: 220,
          worker: '吴春花',
          color: '白色',
          size: '38',
          recordedAt: '2024-04-27 14:10',
        },
        { ...base, idPrefix: 'TK2' },
      ),
      createTicket(
        {
          ticketNo: 'ET1120-102-009',
          process: '车门襟',
          pieceRate: 1.8,
          quantity: 200,
          worker: '李晓丽',
          color: '白色',
          size: '39',
          recordedAt: '2024-04-28 09:55',
        },
        { ...base, idPrefix: 'TK2' },
      ),
      createTicket(
        {
          ticketNo: 'ET1120-102-016',
          process: '锁眼',
          pieceRate: 0.95,
          quantity: 180,
          worker: '唐惠兰',
          color: '白色',
          size: '40',
          recordedAt: '2024-04-28 15:26',
          statusIndex: 0,
        },
        { ...base, idPrefix: 'TK2' },
      ),
      createTicket(
        {
          ticketNo: 'ET1120-102-020',
          process: '熨烫整形',
          pieceRate: 0.85,
          quantity: 260,
          worker: '邵梅',
          color: '白色',
          size: '40',
          recordedAt: '2024-04-29 10:40',
        },
        { ...base, idPrefix: 'TK2' },
      ),
    ];

    return { ...base, tickets };
  })(),
  (() => {
    const base = {
      id: 'lot-ET5201-03',
      orderNumber: 'ET5201-202405',
      styleNumber: 'ET5201',
      styleName: '气质针织连衣裙',
      bedNumber: '云海076床',
      remark: '对色要求严控制偏差 ±2%',
      color: '月牙粉',
      cuttingDate: '2024-05-15',
      quantity: 900,
    } satisfies OrderTicketLot;

    const tickets = [
      createTicket(
        {
          ticketNo: 'ET5201-076-001',
          process: '合肩',
          pieceRate: 1.2,
          quantity: 110,
          worker: '徐梅花',
          color: '月牙粉',
          size: 'S',
          recordedAt: '2024-05-18 08:52',
        },
        { ...base, idPrefix: 'TK3' },
      ),
      createTicket(
        {
          ticketNo: 'ET5201-076-007',
          process: '缝裙摆',
          pieceRate: 1.35,
          quantity: 130,
          worker: '陈燕',
          color: '月牙粉',
          size: 'M',
          recordedAt: '2024-05-18 11:05',
        },
        { ...base, idPrefix: 'TK3' },
      ),
      createTicket(
        {
          ticketNo: 'ET5201-076-011',
          process: '整烫',
          pieceRate: 0.7,
          quantity: 150,
          worker: '宋蔓蔓',
          color: '月牙粉',
          size: 'L',
          recordedAt: '2024-05-19 15:36',
        },
        { ...base, idPrefix: 'TK3' },
      ),
      createTicket(
        {
          ticketNo: 'ET5201-076-015',
          process: '包装',
          pieceRate: 0.55,
          quantity: 160,
          worker: '丁露',
          color: '月牙粉',
          size: 'XL',
          recordedAt: '2024-05-20 09:40',
          statusIndex: 2,
        },
        { ...base, idPrefix: 'TK3' },
      ),
    ];

    return { ...base, tickets };
  })(),
  (() => {
    const base = {
      id: 'lot-ET1389-01',
      orderNumber: 'ET1389-202404',
      styleNumber: 'ET1389',
      styleName: '工装防静电夹克',
      bedNumber: '远山210床',
      remark: '需加贴防静电标识',
      color: '藏蓝',
      cuttingDate: '2024-04-09',
      quantity: 2300,
    } satisfies OrderTicketLot;

    const tickets = [
      createTicket(
        {
          ticketNo: 'ET1389-210-003',
          process: '缝袖',
          pieceRate: 1.5,
          quantity: 200,
          worker: '秦海兰',
          color: '藏蓝',
          size: '170/92A',
          recordedAt: '2024-04-12 13:42',
        },
        { ...base, idPrefix: 'TK4' },
      ),
      createTicket(
        {
          ticketNo: 'ET1389-210-008',
          process: '锁领',
          pieceRate: 1.15,
          quantity: 220,
          worker: '关玉芬',
          color: '藏蓝',
          size: '175/96A',
          recordedAt: '2024-04-13 09:16',
        },
        { ...base, idPrefix: 'TK4' },
      ),
      createTicket(
        {
          ticketNo: 'ET1389-210-012',
          process: '压胶',
          pieceRate: 1.9,
          quantity: 180,
          worker: '杨玲',
          color: '藏蓝',
          size: '180/100A',
          recordedAt: '2024-04-13 16:36',
        },
        { ...base, idPrefix: 'TK4' },
      ),
      createTicket(
        {
          ticketNo: 'ET1389-210-020',
          process: '检测包装',
          pieceRate: 0.8,
          quantity: 240,
          worker: '刘菲',
          color: '藏蓝',
          size: '185/104A',
          recordedAt: '2024-04-14 10:05',
        },
        { ...base, idPrefix: 'TK4' },
      ),
    ];

    return { ...base, tickets };
  })(),
  (() => {
    const base = {
      id: 'lot-ET1882-01',
      orderNumber: 'ET1882-202405',
      styleNumber: 'ET1882',
      styleName: '防晒骑行服',
      bedNumber: '江夏058床',
      remark: '面料易勾丝，注意防护',
      color: '雾霾蓝',
      cuttingDate: '2024-05-21',
      quantity: 1400,
    } satisfies OrderTicketLot;

    const tickets = [
      createTicket(
        {
          ticketNo: 'ET1882-058-004',
          process: '缝体',
          pieceRate: 1.4,
          quantity: 150,
          worker: '罗枫',
          color: '雾霾蓝',
          size: 'S',
          recordedAt: '2024-05-24 09:50',
          statusIndex: 0,
        },
        { ...base, idPrefix: 'TK5' },
      ),
      createTicket(
        {
          ticketNo: 'ET1882-058-008',
          process: '拼帽',
          pieceRate: 1.1,
          quantity: 180,
          worker: '沈露',
          color: '雾霾蓝',
          size: 'M',
          recordedAt: '2024-05-24 12:26',
        },
        { ...base, idPrefix: 'TK5' },
      ),
      createTicket(
        {
          ticketNo: 'ET1882-058-014',
          process: '整烫',
          pieceRate: 0.6,
          quantity: 200,
          worker: '谷颖',
          color: '雾霾蓝',
          size: 'L',
          recordedAt: '2024-05-25 15:02',
        },
        { ...base, idPrefix: 'TK5' },
      ),
      createTicket(
        {
          ticketNo: 'ET1882-058-020',
          process: '质检',
          pieceRate: 0.55,
          quantity: 210,
          worker: '唐巧',
          color: '雾霾蓝',
          size: 'XL',
          recordedAt: '2024-05-26 10:43',
        },
        { ...base, idPrefix: 'TK5' },
      ),
    ];

    return { ...base, tickets };
  })(),
];

const matchesKeyword = (value: string, keyword: string) => value.toLowerCase().includes(keyword);

export const fetchOrderTicketLots = async (
  params: OrderTicketLotListParams,
): Promise<OrderTicketLotListResponse> => {
  await delay(400);
  const { page, pageSize, keyword } = params;
  let filtered = lots as OrderTicketLot[];

  if (keyword?.trim()) {
    const normalized = keyword.trim().toLowerCase();
    filtered = lots.filter((lot) =>
      [
        lot.orderNumber,
        lot.styleNumber,
        lot.styleName,
        lot.bedNumber,
        lot.remark ?? '',
        lot.color,
      ].some((field) => matchesKeyword(String(field), normalized)),
    );
  }

  const total = filtered.length;
  const start = Math.max(0, (page - 1) * pageSize);
  const end = start + pageSize;

  return {
    list: filtered.slice(start, end),
    total,
  };
};

export const fetchOrderTicketRecords = async (
  params: OrderTicketRecordListParams,
): Promise<OrderTicketRecordListResponse> => {
  await delay(420);
  const { lotId, keyword, page, pageSize } = params;
  if (!lotId) {
    return {
      list: [],
      total: 0,
      summary: { quantity: 0, amount: 0 },
    };
  }

  const lot = lots.find((item) => item.id === lotId);
  if (!lot) {
    return {
      list: [],
      total: 0,
      summary: { quantity: 0, amount: 0 },
    };
  }

  let records = lot.tickets;
  if (keyword?.trim()) {
    const normalized = keyword.trim().toLowerCase();
    records = records.filter((record) =>
      [
        record.ticketNo,
        record.worker,
        record.processName,
        record.color,
        record.size,
        record.status,
      ].some((field) => matchesKeyword(String(field), normalized)),
    );
  }

  const total = records.length;
  const start = Math.max(0, (page - 1) * pageSize);
  const end = start + pageSize;
  const paged = records.slice(start, end);

  const summary = records.reduce(
    (acc, record) => {
      acc.quantity += record.quantity;
      acc.amount += record.amount;
      return acc;
    },
    { quantity: 0, amount: 0 },
  );

  return {
    list: paged,
    total,
    summary,
  };
};

export const exportOrderTicketDetails = async (
  params: OrderTicketRecordListParams,
): Promise<{ fileUrl: string }> => {
  await delay(700);
  const lotSegment = params.lotId ? `_${params.lotId}` : '';
  const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
  return {
    fileUrl: `/downloads/order-ticket-details${lotSegment}_${timestamp}.xlsx`,
  };
};
