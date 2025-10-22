import type {
  OutsourcingManagementListItem,
  OutsourcingManagementListParams,
  OutsourcingManagementListResponse,
  OutsourcingManagementMeta,
  OutsourcingManagementProcessorOption,
} from '../types/outsourcing-management';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const processors: OutsourcingManagementProcessorOption[] = [
  { id: 'proc-001', name: '黑胡子A组' },
  { id: 'proc-002', name: '黑胡子B组' },
  { id: 'proc-003', name: '宏达制衣' },
  { id: 'proc-004', name: '诚旺服饰' },
  { id: 'proc-005', name: '永春洗水厂' },
];

const tasks: OutsourcingManagementListItem[] = [
  {
    id: 'out-0001',
    status: '待发出',
    outgoingNo: 'OF20251009-001',
    orderNo: '20251009-AX012',
    styleNo: 'AX012',
    styleName: '城市机能外套',
    processorId: 'proc-001',
    processorName: '黑胡子A组',
    processStep: '车缝',
    dispatchedQty: 480,
    receivedQty: 0,
    attritionRate: 0.015,
    unitPrice: 10.5,
    totalCost: 5040,
    dispatchDate: '2025-10-12',
    expectedCompletionDate: '2025-10-19',
  },
  {
    id: 'out-0002',
    status: '已发出',
    outgoingNo: 'OF20251008-003',
    orderNo: '20251008-BH110',
    styleNo: 'BH110',
    styleName: '复古棒球夹克',
    processorId: 'proc-002',
    processorName: '黑胡子B组',
    processStep: '后整',
    dispatchedQty: 360,
    receivedQty: 120,
    attritionRate: 0.02,
    unitPrice: 6.8,
    totalCost: 2448,
    dispatchDate: '2025-10-09',
    expectedCompletionDate: '2025-10-16',
  },
  {
    id: 'out-0003',
    status: '已接收',
    outgoingNo: 'OF20251005-002',
    orderNo: '20251005-CS520',
    styleNo: 'CS520',
    styleName: '轻薄运动卫衣',
    processorId: 'proc-003',
    processorName: '宏达制衣',
    processStep: '车缝',
    dispatchedQty: 520,
    receivedQty: 508,
    attritionRate: 0.008,
    unitPrice: 9.6,
    totalCost: 4992,
    dispatchDate: '2025-10-06',
    expectedCompletionDate: '2025-10-14',
  },
  {
    id: 'out-0004',
    status: '已完成',
    outgoingNo: 'OF20250928-006',
    orderNo: '20250928-JS880',
    styleNo: 'JS880',
    styleName: '热感训练长裤',
    processorId: 'proc-003',
    processorName: '宏达制衣',
    processStep: '锁眼钉扣',
    dispatchedQty: 420,
    receivedQty: 420,
    attritionRate: 0,
    unitPrice: 4.2,
    totalCost: 1764,
    dispatchDate: '2025-09-29',
    expectedCompletionDate: '2025-10-04',
  },
  {
    id: 'out-0005',
    status: '已结算',
    outgoingNo: 'OF20250920-004',
    orderNo: '20250920-LG300',
    styleNo: 'LG300',
    styleName: '骑行防风外套',
    processorId: 'proc-004',
    processorName: '诚旺服饰',
    processStep: '车缝',
    dispatchedQty: 300,
    receivedQty: 298,
    attritionRate: 0.0067,
    unitPrice: 11.2,
    totalCost: 3360,
    dispatchDate: '2025-09-21',
    expectedCompletionDate: '2025-09-30',
  },
  {
    id: 'out-0006',
    status: '已发出',
    outgoingNo: 'OF20251007-001',
    orderNo: '20251007-WX211',
    styleNo: 'WX211',
    styleName: '渐变水洗牛仔裤',
    processorId: 'proc-005',
    processorName: '永春洗水厂',
    processStep: '水洗',
    dispatchedQty: 780,
    receivedQty: 0,
    attritionRate: 0.03,
    unitPrice: 3.5,
    totalCost: 2730,
    dispatchDate: '2025-10-08',
    expectedCompletionDate: '2025-10-18',
  },
  {
    id: 'out-0007',
    status: '已接收',
    outgoingNo: 'OF20251001-005',
    orderNo: '20251001-PT605',
    styleNo: 'PT605',
    styleName: '都市骑行短裤',
    processorId: 'proc-002',
    processorName: '黑胡子B组',
    processStep: '车缝',
    dispatchedQty: 640,
    receivedQty: 635,
    attritionRate: 0.0078,
    unitPrice: 9.1,
    totalCost: 5824,
    dispatchDate: '2025-10-02',
    expectedCompletionDate: '2025-10-12',
  },
  {
    id: 'out-0008',
    status: '待发出',
    outgoingNo: 'OF20251010-002',
    orderNo: '20251010-SK310',
    styleNo: 'SK310',
    styleName: '保暖针织半身裙',
    processorId: 'proc-004',
    processorName: '诚旺服饰',
    processStep: '缝合',
    dispatchedQty: 260,
    receivedQty: 0,
    attritionRate: 0.01,
    unitPrice: 7.5,
    totalCost: 1950,
    dispatchDate: '2025-10-13',
    expectedCompletionDate: '2025-10-20',
  },
  {
    id: 'out-0009',
    status: '已完成',
    outgoingNo: 'OF20250930-003',
    orderNo: '20250930-HS430',
    styleNo: 'HS430',
    styleName: '户外防泼水风衣',
    processorId: 'proc-001',
    processorName: '黑胡子A组',
    processStep: '车缝',
    dispatchedQty: 520,
    receivedQty: 516,
    attritionRate: 0.0077,
    unitPrice: 10.8,
    totalCost: 5616,
    dispatchDate: '2025-10-01',
    expectedCompletionDate: '2025-10-09',
  },
  {
    id: 'out-0010',
    status: '已结算',
    outgoingNo: 'OF20250918-007',
    orderNo: '20250918-SP280',
    styleNo: 'SP280',
    styleName: '都市跑步短袖',
    processorId: 'proc-005',
    processorName: '永春洗水厂',
    processStep: '水洗',
    dispatchedQty: 900,
    receivedQty: 895,
    attritionRate: 0.0056,
    unitPrice: 3.2,
    totalCost: 2880,
    dispatchDate: '2025-09-19',
    expectedCompletionDate: '2025-09-27',
  },
];

const matchesKeyword = (value: string, keyword: string) =>
  value.toLowerCase().includes(keyword.toLowerCase());

export const fetchOutsourcingManagementMeta = async (): Promise<OutsourcingManagementMeta> => {
  await delay(180);
  return { processors };
};

export const fetchOutsourcingManagementList = async (
  params: OutsourcingManagementListParams,
): Promise<OutsourcingManagementListResponse> => {
  await delay(260);
  const { orderNo, styleKeyword, processorId, dispatchDateStart, dispatchDateEnd, page, pageSize } = params;

  const filtered = tasks.filter((task) => {
    const matchOrder = orderNo ? matchesKeyword(task.orderNo, orderNo) : true;
    const matchStyle = styleKeyword
      ? matchesKeyword(task.styleNo, styleKeyword) || matchesKeyword(task.styleName, styleKeyword)
      : true;
    const matchProcessor = processorId ? task.processorId === processorId : true;
    const matchDateStart = dispatchDateStart ? task.dispatchDate >= dispatchDateStart : true;
    const matchDateEnd = dispatchDateEnd ? task.dispatchDate <= dispatchDateEnd : true;
    return matchOrder && matchStyle && matchProcessor && matchDateStart && matchDateEnd;
  });

  const start = (page - 1) * pageSize;
  const end = start + pageSize;

  return {
    list: filtered.slice(start, end),
    total: filtered.length,
  };
};

export const exportOutsourcingManagement = async (
  params: OutsourcingManagementListParams,
): Promise<{ fileUrl: string }> => {
  await delay(320);
  console.info('mock export outsourcing management with params', params);
  return { fileUrl: '/mock/outsourcing-management.xlsx' };
};
