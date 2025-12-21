import type {
  ProcurementReceiptSummary,
  StockingBatchReceivePayload,
  StockingPurchaseExportParams,
  StockingPurchaseListParams,
  StockingPurchaseListResponse,
  StockingPurchaseMeta,
  StockingPurchaseRecord,
  StockingReceivePayload,
  StockingReceiptRecord,
  StockingStatusUpdatePayload,
} from '../types/stocking-purchase-inbound';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const records: StockingPurchaseRecord[] = [
  {
    id: 'stocking-001',
    orderId: 'order-001',
    warehouseId: 'wh-001',
    warehouseName: '原料一库',
    materialType: 'fabric',
    imageUrl: '/assets/images/materials/fabric-01.png',
    status: 'pending',
    statusLabel: '未完成',
    statusTagColor: 'orange',
    purchaseOrderNo: 'BL20240518001',
    materialName: '40S 新疆长绒棉面料',
    materialCategory: '汗布',
    color: '本白',
    width: '185cm',
    weight: '230g',
    purchaseDate: '2025-05-18',
    supplierName: '泉州恒瑞纺织',
    supplierModel: 'HR-40S',
    supplierColorNo: 'HR-40S-BW',
    tolerance: '±3%',
    unitPrice: 32.8,
    unit: '米',
    orderQty: 1200,
    orderAmount: 39360,
    packagingInfo: '24 卷',
    pendingQty: 1200,
    receivedQty: 0,
    remark: '春夏备货批次',
  },
  {
    id: 'stocking-002',
    orderId: 'order-002',
    warehouseId: 'wh-002',
    warehouseName: '原料二库',
    materialType: 'fabric',
    status: 'partial',
    statusLabel: '收料中',
    statusTagColor: 'blue',
    purchaseOrderNo: 'BL20240515002',
    materialName: '75D 弹力雪纺',
    materialCategory: '梭织',
    color: '暮蓝',
    width: '150cm',
    weight: '110g',
    purchaseDate: '2025-05-15',
    supplierName: '石狮锦绣纺织',
    supplierModel: 'SX-75D-MB',
    supplierColorNo: 'MB23-75',
    tolerance: '±2%',
    unitPrice: 18.6,
    unit: '米',
    orderQty: 800,
    orderAmount: 14880,
    packagingInfo: '20 卷',
    pendingQty: 320,
    receivedQty: 480,
    remark: '流行色备库',
  },
  {
    id: 'stocking-003',
    orderId: 'order-003',
    warehouseId: 'wh-001',
    warehouseName: '原料一库',
    materialType: 'fabric',
    status: 'completed',
    statusLabel: '已完成',
    statusTagColor: 'green',
    purchaseOrderNo: 'BL20240512003',
    materialName: '32S 罗纹布',
    materialCategory: '罗纹',
    color: '藏青',
    width: '90cm',
    weight: '320g',
    purchaseDate: '2025-05-12',
    supplierName: '晋江腾飞针织',
    supplierModel: 'TF-RIB-32',
    supplierColorNo: 'TF-NVY-32',
    tolerance: '±3%',
    unitPrice: 26.5,
    unit: '米',
    orderQty: 600,
    orderAmount: 15900,
    packagingInfo: '15 卷',
    pendingQty: 0,
    receivedQty: 600,
  },
  {
    id: 'stocking-004',
    orderId: 'order-004',
    warehouseId: 'wh-003',
    warehouseName: '辅料库',
    materialType: 'accessory',
    status: 'pending',
    statusLabel: '未完成',
    statusTagColor: 'orange',
    purchaseOrderNo: 'BL20240510001',
    materialName: '树脂纽扣 4 孔',
    materialCategory: '纽扣',
    color: '象牙白',
    purchaseDate: '2025-05-10',
    supplierName: '石狮华盛辅料',
    supplierModel: 'HS-AB42',
    unitPrice: 0.35,
    unit: '粒',
    orderQty: 8000,
    orderAmount: 2800,
    packagingInfo: '16 袋',
    pendingQty: 8000,
    receivedQty: 0,
    remark: '基础款备库',
  },
  {
    id: 'stocking-005',
    orderId: 'order-005',
    warehouseId: 'wh-003',
    warehouseName: '辅料库',
    materialType: 'accessory',
    status: 'partial',
    statusLabel: '收料中',
    statusTagColor: 'blue',
    purchaseOrderNo: 'BL20240508006',
    materialName: '5# 尼龙拉链',
    materialCategory: '拉链',
    color: '黑色',
    purchaseDate: '2025-05-08',
    supplierName: 'YKK 中国',
    supplierModel: 'YKK-5N-BK',
    supplierColorNo: '580',
    unitPrice: 1.8,
    unit: '条',
    orderQty: 5000,
    orderAmount: 9000,
    pendingQty: 2200,
    receivedQty: 2800,
  },
  {
    id: 'stocking-006',
    orderId: 'order-006',
    warehouseId: 'wh-003',
    warehouseName: '辅料库',
    materialType: 'accessory',
    status: 'completed',
    statusLabel: '已完成',
    statusTagColor: 'green',
    purchaseOrderNo: 'BL20240505002',
    materialName: '定制吊牌套装',
    materialCategory: '吊牌',
    purchaseDate: '2025-05-05',
    supplierName: '厦门万象印务',
    unitPrice: 0.86,
    unit: '套',
    orderQty: 6000,
    orderAmount: 5160,
    pendingQty: 0,
    receivedQty: 6000,
    remark: '包含吊牌+水洗标+包装袋',
  },
];

const receiptStore: Record<string, StockingReceiptRecord[]> = {};

const buildReceiptSummary = (
  orderId: string,
  status: 'pending' | 'partial' | 'completed',
): ProcurementReceiptSummary => ({
  id: `receipt-${orderId}-${Date.now()}`,
  receiptNo: `RC-${orderId}-${Math.floor(Math.random() * 1000)}`,
  receiptStatus: status,
  receiptStatusLabel: status === 'completed' ? '已完成' : status === 'partial' ? '收料中' : '未完成',
  receiptStatusTagColor: status === 'completed' ? 'green' : status === 'partial' ? 'blue' : 'orange',
  orderId,
  orderStatus: status,
  orderStatusLabel: status === 'completed' ? '已完成' : status === 'partial' ? '收料中' : '未完成',
  orderStatusTagColor: status === 'completed' ? 'green' : status === 'partial' ? 'blue' : 'orange',
});

const appendReceiptRecord = (
  orderId: string,
  lineId: string,
  payload: StockingReceivePayload,
) => {
  const timestamp = Date.now();
  const key = `${orderId}-${lineId}`;
  const quantity = payload.items[0]?.receiveQty ?? 0;
  const record: StockingReceiptRecord = {
    id: `receipt-${timestamp}`,
    lineId,
    receiptNo: `RC-${timestamp}`,
    status: 'completed',
    statusLabel: '已完成',
    statusTagColor: 'green',
    receivedAt: payload.receivedAt ?? new Date().toISOString(),
    warehouseName: payload.items[0]?.warehouseId ? `仓库-${payload.items[0]?.warehouseId}` : '原料一库',
    receivedQty: quantity,
    pendingQty: Math.max(0, 0),
    unit: '米',
    batchNo: payload.items[0]?.batchNo,
    remark: payload.remark,
  };
  receiptStore[key] = [record, ...(receiptStore[key] ?? [])];
};

const meta: StockingPurchaseMeta = {
  materialTypeTabs: [
    { value: 'fabric', label: '面料' },
    { value: 'accessory', label: '辅料/包材' },
  ],
  statusOptions: [
    { value: 'all', label: '全部状态' },
    { value: 'pending', label: '未完成' },
    { value: 'completed', label: '已完成' },
  ],
  defaultStatus: 'pending',
};

const normalizeKeyword = (value?: string) => value?.trim().toLowerCase() ?? '';

const matches = (record: StockingPurchaseRecord, params: StockingPurchaseListParams) => {
  if (record.materialType !== params.materialType) {
    return false;
  }
  if (params.status === 'pending') {
    if (!(record.status === 'pending' || record.status === 'partial')) {
      return false;
    }
  }
  if (params.status === 'completed') {
    if (record.status !== 'completed') {
      return false;
    }
  }
  if (params.status === 'all') {
    // pass through
  }
  const keyword = normalizeKeyword(params.keyword);
  if (keyword) {
    const fields = [
      record.purchaseOrderNo,
      record.materialName,
      record.supplierName,
      record.remark,
    ];
    if (!fields.filter(Boolean).some((field) => field!.toLowerCase().includes(keyword))) {
      return false;
    }
  }
  return true;
};

export const fetchStockingPurchaseMeta = async (): Promise<StockingPurchaseMeta> => {
  await delay(160);
  return meta;
};

export const fetchStockingPurchaseList = async (
  params: StockingPurchaseListParams,
): Promise<StockingPurchaseListResponse> => {
  await delay(300);
  const filtered = records.filter((record) => matches(record, params));
  const start = (params.page - 1) * params.pageSize;
  const end = start + params.pageSize;
  return {
    list: filtered.slice(start, end),
    total: filtered.length,
  };
};

export const submitStockingBatchReceive = async (
  _payload: StockingBatchReceivePayload,
): Promise<{ success: boolean }> => {
  await delay(280);
  void _payload;
  return { success: true };
};

export const updateStockingPurchaseStatus = async (
  _payload: StockingStatusUpdatePayload,
): Promise<{ success: boolean }> => {
  await delay(280);
  void _payload;
  return { success: true };
};

export const exportStockingPurchaseList = async (
  _params: StockingPurchaseExportParams,
): Promise<{ fileUrl: string }> => {
  await delay(200);
  void _params;
  return { fileUrl: '/mock/exports/stocking-purchase-inbound.xlsx' };
};

export const submitStockingReceive = async (
  orderId: string,
  payload: StockingReceivePayload,
): Promise<ProcurementReceiptSummary> => {
  await delay(240);
  const lineId = payload.items[0]?.lineId ?? 'unknown';
  appendReceiptRecord(orderId, lineId, payload);
  return buildReceiptSummary(orderId, 'partial');
};

export const fetchStockingReceipts = async (
  params: { orderId: string; lineId?: string },
): Promise<StockingReceiptRecord[]> => {
  await delay(200);
  if (params.lineId) {
    return receiptStore[`${params.orderId}-${params.lineId}`] ?? [];
  }
  return Object.entries(receiptStore)
    .filter(([key]) => key.startsWith(`${params.orderId}-`))
    .flatMap(([, list]) => list);
};
