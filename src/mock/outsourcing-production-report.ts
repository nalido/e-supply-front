import type {
  OutsourcingProductionReportListItem,
  OutsourcingProductionReportListParams,
  OutsourcingProductionReportListResponse,
  OutsourcingProductionReportMeta,
  OutsourcingSubcontractorStat,
} from '../types/outsourcing-production-report';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const dataset: OutsourcingProductionReportListItem[] = [
  {
    id: 'opr-001',
    orderInfo: {
      imageUrl: 'https://dummyimage.com/64x64/1890ff/ffffff&text=AX',
      styleName: '城市机能外套',
      orderNumber: '20251009-AX012',
      quantity: 480,
    },
    processType: '车缝',
    processPrice: 10.5,
    subcontractor: '黑胡子A组',
    dispatchDate: '2025-10-12',
    expectedDelivery: '2025-10-19',
    reportedQty: 120,
    shippedQty: 0,
    onTimeReceived: 0,
    overdueReceived: 0,
    totalReceived: 0,
    actualReceived: 0,
    owedQty: 480,
    completionRate: 0,
    reworkQty: 0,
    reworkRate: 0,
    defectQty: 0,
    defectRate: 0,
    orderStatus: '未开始',
  },
  {
    id: 'opr-002',
    orderInfo: {
      imageUrl: 'https://dummyimage.com/64x64/f59a23/ffffff&text=BH',
      styleName: '复古棒球夹克',
      orderNumber: '20251008-BH110',
      quantity: 360,
    },
    processType: '后整',
    processPrice: 6.8,
    subcontractor: '黑胡子B组',
    dispatchDate: '2025-10-09',
    expectedDelivery: '2025-10-16',
    reportedQty: 200,
    shippedQty: 120,
    onTimeReceived: 100,
    overdueReceived: 20,
    totalReceived: 120,
    actualReceived: 118,
    owedQty: 242,
    completionRate: 0.3278,
    reworkQty: 6,
    reworkRate: 0.0508,
    defectQty: 3,
    defectRate: 0.0254,
    orderStatus: '进行中',
  },
  {
    id: 'opr-003',
    orderInfo: {
      imageUrl: 'https://dummyimage.com/64x64/14c9c9/ffffff&text=CS',
      styleName: '轻薄运动卫衣',
      orderNumber: '20251005-CS520',
      quantity: 520,
    },
    processType: '车缝',
    processPrice: 9.6,
    subcontractor: '宏达制衣',
    dispatchDate: '2025-10-06',
    expectedDelivery: '2025-10-14',
    reportedQty: 520,
    shippedQty: 508,
    onTimeReceived: 462,
    overdueReceived: 46,
    totalReceived: 508,
    actualReceived: 508,
    owedQty: 12,
    completionRate: 0.9769,
    reworkQty: 8,
    reworkRate: 0.0157,
    defectQty: 6,
    defectRate: 0.0118,
    orderStatus: '已完成',
  },
  {
    id: 'opr-004',
    orderInfo: {
      imageUrl: 'https://dummyimage.com/64x64/ff7875/ffffff&text=JS',
      styleName: '热感训练长裤',
      orderNumber: '20250928-JS880',
      quantity: 420,
    },
    processType: '锁眼钉扣',
    processPrice: 4.2,
    subcontractor: '宏达制衣',
    dispatchDate: '2025-09-29',
    expectedDelivery: '2025-10-04',
    reportedQty: 420,
    shippedQty: 420,
    onTimeReceived: 420,
    overdueReceived: 0,
    totalReceived: 420,
    actualReceived: 420,
    owedQty: 0,
    completionRate: 1,
    reworkQty: 2,
    reworkRate: 0.0048,
    defectQty: 1,
    defectRate: 0.0024,
    orderStatus: '已完成',
  },
  {
    id: 'opr-005',
    orderInfo: {
      imageUrl: 'https://dummyimage.com/64x64/722ed1/ffffff&text=LG',
      styleName: '骑行防风外套',
      orderNumber: '20250920-LG300',
      quantity: 300,
    },
    processType: '车缝',
    processPrice: 11.2,
    subcontractor: '诚旺服饰',
    dispatchDate: '2025-09-21',
    expectedDelivery: '2025-09-30',
    reportedQty: 300,
    shippedQty: 298,
    onTimeReceived: 260,
    overdueReceived: 38,
    totalReceived: 298,
    actualReceived: 298,
    owedQty: 2,
    completionRate: 0.9933,
    reworkQty: 10,
    reworkRate: 0.0336,
    defectQty: 4,
    defectRate: 0.0134,
    orderStatus: '待结算',
  },
  {
    id: 'opr-006',
    orderInfo: {
      imageUrl: 'https://dummyimage.com/64x64/13c2c2/ffffff&text=WX',
      styleName: '渐变水洗牛仔裤',
      orderNumber: '20251007-WX211',
      quantity: 780,
    },
    processType: '水洗',
    processPrice: 3.5,
    subcontractor: '永春洗水厂',
    dispatchDate: '2025-10-08',
    expectedDelivery: '2025-10-18',
    reportedQty: 360,
    shippedQty: 0,
    onTimeReceived: 0,
    overdueReceived: 0,
    totalReceived: 0,
    actualReceived: 0,
    owedQty: 780,
    completionRate: 0,
    reworkQty: 0,
    reworkRate: 0,
    defectQty: 0,
    defectRate: 0,
    orderStatus: '进行中',
  },
  {
    id: 'opr-007',
    orderInfo: {
      imageUrl: 'https://dummyimage.com/64x64/eb2f96/ffffff&text=PT',
      styleName: '都市骑行短裤',
      orderNumber: '20251001-PT605',
      quantity: 640,
    },
    processType: '车缝',
    processPrice: 9.1,
    subcontractor: '黑胡子B组',
    dispatchDate: '2025-10-02',
    expectedDelivery: '2025-10-12',
    reportedQty: 640,
    shippedQty: 635,
    onTimeReceived: 520,
    overdueReceived: 115,
    totalReceived: 635,
    actualReceived: 630,
    owedQty: 10,
    completionRate: 0.9844,
    reworkQty: 20,
    reworkRate: 0.0317,
    defectQty: 8,
    defectRate: 0.0127,
    orderStatus: '逾期待收',
  },
  {
    id: 'opr-008',
    orderInfo: {
      imageUrl: 'https://dummyimage.com/64x64/597ef7/ffffff&text=SK',
      styleName: '保暖针织半身裙',
      orderNumber: '20251010-SK310',
      quantity: 260,
    },
    processType: '缝合',
    processPrice: 7.5,
    subcontractor: '诚旺服饰',
    dispatchDate: '2025-10-13',
    expectedDelivery: '2025-10-20',
    reportedQty: 0,
    shippedQty: 0,
    onTimeReceived: 0,
    overdueReceived: 0,
    totalReceived: 0,
    actualReceived: 0,
    owedQty: 260,
    completionRate: 0,
    reworkQty: 0,
    reworkRate: 0,
    defectQty: 0,
    defectRate: 0,
    orderStatus: '未开始',
  },
  {
    id: 'opr-009',
    orderInfo: {
      imageUrl: 'https://dummyimage.com/64x64/52c41a/ffffff&text=HS',
      styleName: '户外防泼水风衣',
      orderNumber: '20250930-HS430',
      quantity: 520,
    },
    processType: '车缝',
    processPrice: 10.8,
    subcontractor: '黑胡子A组',
    dispatchDate: '2025-10-01',
    expectedDelivery: '2025-10-09',
    reportedQty: 520,
    shippedQty: 516,
    onTimeReceived: 500,
    overdueReceived: 16,
    totalReceived: 516,
    actualReceived: 516,
    owedQty: 4,
    completionRate: 0.9923,
    reworkQty: 4,
    reworkRate: 0.0078,
    defectQty: 2,
    defectRate: 0.0039,
    orderStatus: '待结算',
  },
];

const processTypes = Array.from(new Set(dataset.map((item) => item.processType)));
const orderStatuses = ['未开始', '进行中', '已完成', '逾期待收', '待结算'] as const;

const matchesKeyword = (value: string, keyword: string) =>
  value.toLowerCase().includes(keyword.toLowerCase());

const sortByField = (
  list: OutsourcingProductionReportListItem[],
  field: 'owedQty' | 'completionRate' | 'defectRate',
  order: 'ascend' | 'descend',
) => {
  const sorted = [...list].sort((a, b) => {
    const compare = a[field] - b[field];
    return order === 'ascend' ? compare : -compare;
  });
  return sorted;
};

export const fetchOutsourcingProductionReportMeta = async (): Promise<OutsourcingProductionReportMeta> => {
  await delay(200);
  return {
    processTypes,
    orderStatuses: [...orderStatuses],
  };
};

export const fetchOutsourcingProductionReportList = async (
  params: OutsourcingProductionReportListParams,
): Promise<OutsourcingProductionReportListResponse> => {
  await delay(340);
  const {
    subcontractorName,
    keyword,
    processType,
    orderStatus,
    sortBy,
    order,
    page,
    pageSize,
  } = params;

  let filtered = dataset.filter((item) => {
    const matchSubcontractor = subcontractorName ? item.subcontractor === subcontractorName : true;
    const matchKeyword = keyword
      ? matchesKeyword(item.orderInfo.orderNumber, keyword) ||
        matchesKeyword(item.orderInfo.styleName, keyword)
      : true;
    const matchProcessType = processType ? item.processType === processType : true;
    const matchStatus = orderStatus && orderStatus !== '全部' ? item.orderStatus === orderStatus : true;
    return matchSubcontractor && matchKeyword && matchProcessType && matchStatus;
  });

  if (sortBy && order) {
    filtered = sortByField(filtered, sortBy, order);
  }

  const start = (page - 1) * pageSize;
  const end = start + pageSize;

  return {
    list: filtered.slice(start, end),
    total: filtered.length,
  };
};

export const fetchOutsourcingSubcontractorStats = async (): Promise<OutsourcingSubcontractorStat[]> => {
  await delay(180);
  const statsMap = new Map<string, number>();
  dataset.forEach((item) => {
    const current = statsMap.get(item.subcontractor) ?? 0;
    statsMap.set(item.subcontractor, current + item.owedQty);
  });

  return Array.from(statsMap.entries()).map(([name, owed]) => ({ name, wip: owed }));
};

export const exportOutsourcingProductionReport = async (
  params: OutsourcingProductionReportListParams,
): Promise<{ fileUrl: string }> => {
  await delay(420);
  console.info('mock export outsourcing production report with params', params);
  return { fileUrl: '/mock/outsourcing-production-report.xlsx' };
};

export const submitOutsourcingReportPrintTask = async (ids: string[]): Promise<{ success: boolean }> => {
  await delay(240);
  console.info('mock print outsourcing production report with ids', ids);
  return { success: true };
};
