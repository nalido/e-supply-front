import type {
  OrderPurchaseInboundExportParams,
  OrderPurchaseInboundListParams,
  OrderPurchaseInboundListResponse,
  OrderPurchaseInboundMeta,
  OrderPurchaseInboundRecord,
  OrderPurchaseInboundStatusFilter,
  OrderPurchaseInboundStatusPayload,
  OrderPurchaseInboundReceivePayload,
} from '../types/order-purchase-inbound';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const statusLabels: Record<OrderPurchaseInboundRecord['status'], { label: string; color: string }> = {
  pending: { label: '未收料', color: 'warning' },
  partial: { label: '部分收料', color: 'processing' },
  completed: { label: '已完成', color: 'success' },
  forceCompleted: { label: '强制完成', color: 'magenta' },
  void: { label: '已作废', color: 'default' },
};

const records: OrderPurchaseInboundRecord[] = [
  {
    id: 'opi-20250301-001',
    materialType: 'fabric',
    imageUrl: '/assets/images/materials/fabric-nylon.jpg',
    status: 'partial',
    statusLabel: statusLabels.partial.label,
    statusTagColor: statusLabels.partial.color,
    purchaseOrderNo: 'PO-ET0362-001',
    materialName: '高弹锦纶经编网布',
    materialCategory: '面料',
    color: '黑色',
    width: '150cm',
    weight: '220g/m²',
    purchaseTime: '2025-03-03 09:18',
    supplierName: '锦绣面料行',
    supplierModel: 'JX-ET0362',
    unitPrice: 39.5,
    orderQty: 2400,
    unit: '米',
    packagingInfo: '40米/捆 × 60捆',
    pendingQty: 600,
    receivedQty: 1800,
    documentType: '工厂订单',
    factoryOrderNo: 'FO-ET0362-202503',
    factoryOrderName: 'ET0362 童装速干短裤',
    styleNo: 'ET0362',
    styleName: '童装速干短裤',
    remark: '剩余部分预计3月8日到货',
    lastReceiveTime: '2025-03-05 17:30',
  },
  {
    id: 'opi-20250302-002',
    materialType: 'fabric',
    imageUrl: '/assets/images/materials/fabric-cotton.jpg',
    status: 'pending',
    statusLabel: statusLabels.pending.label,
    statusTagColor: statusLabels.pending.color,
    purchaseOrderNo: 'PO-ET5031-004',
    materialName: '全棉提花双面布',
    materialCategory: '面料',
    color: '咖色',
    width: '160cm',
    weight: '260g/m²',
    purchaseTime: '2025-03-04 14:42',
    supplierName: '兴盛纺织',
    supplierModel: 'XS-5031',
    unitPrice: 45.2,
    orderQty: 1800,
    unit: '米',
    packagingInfo: '45米/卷 × 40卷',
    pendingQty: 1800,
    receivedQty: 0,
    documentType: '工厂订单',
    factoryOrderNo: 'FO-ET5031-202503',
    factoryOrderName: 'ET5031 条纹套装',
    styleNo: 'ET5031',
    styleName: '儿童开衫条纹套装',
    remark: '供应商反馈需追加定金确认染色',
  },
  {
    id: 'opi-20250302-003',
    materialType: 'fabric',
    imageUrl: '/assets/images/materials/fabric-denim.jpg',
    status: 'completed',
    statusLabel: statusLabels.completed.label,
    statusTagColor: statusLabels.completed.color,
    purchaseOrderNo: 'PO-ET0151-006',
    materialName: '磨毛弹力牛仔',
    materialCategory: '面料',
    color: '烟灰',
    width: '150cm',
    weight: '320g/m²',
    purchaseTime: '2025-03-02 10:08',
    supplierName: '锦绣面料行',
    unitPrice: 42.6,
    orderQty: 2000,
    unit: '米',
    packagingInfo: '50米/卷 × 40卷',
    pendingQty: 0,
    receivedQty: 2000,
    documentType: '工厂订单',
    factoryOrderNo: 'FO-ET0151-202502',
    factoryOrderName: 'ET0151 拼色连帽套装',
    styleNo: 'ET0151',
    styleName: '拼色连帽套装',
    lastReceiveTime: '2025-03-05 10:20',
  },
  {
    id: 'opi-20250303-004',
    materialType: 'fabric',
    imageUrl: '/assets/images/materials/fabric-nylon.jpg',
    status: 'forceCompleted',
    statusLabel: statusLabels.forceCompleted.label,
    statusTagColor: statusLabels.forceCompleted.color,
    purchaseOrderNo: 'PO-ET0110-002',
    materialName: '32S全棉罗纹',
    materialCategory: '面料',
    color: '奶白',
    width: '180cm',
    weight: '180g/m²',
    purchaseTime: '2025-03-01 08:50',
    supplierName: '兴盛纺织',
    supplierModel: 'XS-A2025',
    unitPrice: 26.8,
    orderQty: 5200,
    unit: '米',
    packagingInfo: '65米/筒 × 80筒',
    pendingQty: 200,
    receivedQty: 5000,
    documentType: '工厂订单',
    factoryOrderNo: 'FO-ET0110-202503',
    factoryOrderName: 'ET0110 羊羔毛夹克',
    styleNo: 'ET0110',
    styleName: '羊羔毛拉链夹克',
    remark: '剩余采购已取消，由库存调拨补齐',
    lastReceiveTime: '2025-03-06 19:00',
  },
  {
    id: 'opi-20250304-005',
    materialType: 'fabric',
    imageUrl: '/assets/images/materials/fabric-nylon.jpg',
    status: 'void',
    statusLabel: statusLabels.void.label,
    statusTagColor: statusLabels.void.color,
    purchaseOrderNo: 'PO-ET5033-003',
    materialName: '罗纹松紧带',
    materialCategory: '面料',
    color: '橘白',
    width: '5cm',
    purchaseTime: '2025-03-06 15:30',
    supplierName: '宏兴辅料',
    supplierModel: 'HX-STRIPE',
    unitPrice: 18.6,
    orderQty: 0,
    unit: '卷',
    packagingInfo: '10卷/箱',
    pendingQty: 0,
    receivedQty: 0,
    documentType: '工厂订单',
    factoryOrderNo: 'FO-ET5033-202503',
    factoryOrderName: 'ET5033 撞色卫衣套装',
    styleNo: 'ET5033',
    styleName: '撞色卫衣套装',
    remark: '订单取消，入库作废',
  },
  {
    id: 'opi-20250305-006',
    materialType: 'accessory',
    imageUrl: '/assets/images/materials/zipper.jpg',
    status: 'partial',
    statusLabel: statusLabels.partial.label,
    statusTagColor: statusLabels.partial.color,
    purchaseOrderNo: 'PO-ACC-ET0151-001',
    materialName: 'YKK树脂拉链5#',
    materialCategory: '辅料/包材',
    color: '本白',
    purchaseTime: '2025-03-05 13:26',
    supplierName: '宏兴辅料',
    supplierModel: 'HX-ZIP-5',
    unitPrice: 2.2,
    orderQty: 3200,
    unit: '个',
    packagingInfo: '100个/袋 × 32袋',
    pendingQty: 800,
    receivedQty: 2400,
    documentType: '工厂订单',
    factoryOrderNo: 'FO-ET0151-202502',
    factoryOrderName: 'ET0151 拼色连帽套装',
    styleNo: 'ET0151',
    styleName: '拼色连帽套装',
    lastReceiveTime: '2025-03-07 11:40',
  },
  {
    id: 'opi-20250305-007',
    materialType: 'accessory',
    imageUrl: '/assets/images/materials/packaging-box.jpg',
    status: 'completed',
    statusLabel: statusLabels.completed.label,
    statusTagColor: statusLabels.completed.color,
    purchaseOrderNo: 'PO-ACC-ET0151-002',
    materialName: '童装手提礼盒',
    materialCategory: '辅料/包材',
    color: '暖白',
    purchaseTime: '2025-03-06 09:18',
    supplierName: '博雅包装',
    unitPrice: 5.8,
    orderQty: 2200,
    unit: '个',
    packagingInfo: '20个/箱 × 110箱',
    pendingQty: 0,
    receivedQty: 2200,
    documentType: '工厂订单',
    factoryOrderNo: 'FO-ET0151-202502',
    factoryOrderName: 'ET0151 拼色连帽套装',
    styleNo: 'ET0151',
    styleName: '拼色连帽套装',
    lastReceiveTime: '2025-03-08 16:05',
  },
  {
    id: 'opi-20250306-008',
    materialType: 'accessory',
    imageUrl: '/assets/images/materials/button.jpg',
    status: 'pending',
    statusLabel: statusLabels.pending.label,
    statusTagColor: statusLabels.pending.color,
    purchaseOrderNo: 'PO-ACC-ET5031-003',
    materialName: '合金四合扣17mm',
    materialCategory: '辅料/包材',
    color: '枪黑',
    purchaseTime: '2025-03-07 15:42',
    supplierName: '宏兴辅料',
    unitPrice: 0.36,
    orderQty: 4800,
    unit: '套',
    packagingInfo: '200套/盒 × 24盒',
    pendingQty: 4800,
    receivedQty: 0,
    documentType: '工厂订单',
    factoryOrderNo: 'FO-ET5031-202503',
    factoryOrderName: 'ET5031 条纹套装',
    styleNo: 'ET5031',
    styleName: '儿童开衫条纹套装',
  },
];

const statusFilters: Record<OrderPurchaseInboundStatusFilter, OrderPurchaseInboundRecord['status'][] | null> = {
  unfinished: ['pending', 'partial'],
  completed: ['completed'],
  forceCompleted: ['forceCompleted'],
  void: ['void'],
};

const defaultMeta: OrderPurchaseInboundMeta = {
  statusOptions: [
    { value: 'unfinished', label: '未完成' },
    { value: 'completed', label: '已完成' },
    { value: 'forceCompleted', label: '强制完成' },
    { value: 'void', label: '作废' },
  ],
  defaultStatus: 'unfinished',
  materialTypeTabs: [
    { value: 'fabric', label: '面料' },
    { value: 'accessory', label: '辅料/包材' },
  ],
};

const filterByKeyword = (record: OrderPurchaseInboundRecord, keyword?: string) => {
  if (!keyword) {
    return true;
  }
  const lower = keyword.trim().toLowerCase();
  if (!lower) {
    return true;
  }
  const fields = [
    record.materialName,
    record.supplierName,
    record.factoryOrderNo,
    record.factoryOrderName,
    record.styleNo,
    record.styleName,
    record.purchaseOrderNo,
  ]
    .filter(Boolean)
    .map((field) => String(field).toLowerCase());
  return fields.some((field) => field.includes(lower));
};

const toSummary = (list: OrderPurchaseInboundRecord[]) =>
  list.reduce(
    (acc, item) => {
      acc.orderQty += item.orderQty;
      acc.receivedQty += item.receivedQty;
      acc.pendingQty += item.pendingQty;
      return acc;
    },
    { orderQty: 0, receivedQty: 0, pendingQty: 0 },
  );

export const fetchOrderPurchaseInboundMeta = async (): Promise<OrderPurchaseInboundMeta> => {
  await delay(160);
  return defaultMeta;
};

export const fetchOrderPurchaseInboundList = async (
  params: OrderPurchaseInboundListParams,
): Promise<OrderPurchaseInboundListResponse> => {
  await delay(240);
  const { materialType, statusFilter, keyword, hideZero, page, pageSize } = params;
  const targetStatuses = statusFilter ? statusFilters[statusFilter] : null;
  const filtered = records.filter((record) => {
    if (record.materialType !== materialType) {
      return false;
    }
    if (hideZero && record.orderQty === 0) {
      return false;
    }
    if (targetStatuses && !targetStatuses.includes(record.status)) {
      return false;
    }
    return filterByKeyword(record, keyword);
  });

  const safePage = Math.max(1, page);
  const safeSize = Math.max(1, pageSize);
  const start = (safePage - 1) * safeSize;
  const list = filtered.slice(start, start + safeSize);
  return {
    list,
    total: filtered.length,
    summary: toSummary(filtered),
  };
};

export const submitOrderPurchaseInboundReceive = async (
  payload: OrderPurchaseInboundReceivePayload,
): Promise<{ success: boolean }> => {
  console.log('mock receive payload', payload);
  await delay(260);
  return { success: true };
};

export const updateOrderPurchaseInboundStatus = async (
  payload: OrderPurchaseInboundStatusPayload,
): Promise<{ success: boolean }> => {
  console.log('mock status payload', payload);
  await delay(220);
  return { success: true };
};

export const exportOrderPurchaseInbound = async (
  params: OrderPurchaseInboundExportParams,
): Promise<{ url: string }> => {
  console.log('mock export params', params);
  await delay(200);
  return { url: `/download/order-purchase-inbound-${Date.now()}.xlsx` };
};
