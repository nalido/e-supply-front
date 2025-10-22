import type {
  ReconciliationDetailsListParams,
  ReconciliationDetailsListResponse,
  ReconciliationDetailsMeta,
  ReconciliationDetailsRecord,
  ReconciliationDetailsSummary,
  ReconciliationPartnerType,
  ReconciliationCancelPayload,
} from '../types/settlement-report-reconciliation-details';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const paginate = <T>(list: T[], page: number, pageSize: number): T[] => {
  const start = (page - 1) * pageSize;
  return list.slice(start, start + pageSize);
};

const records: ReconciliationDetailsRecord[] = [
  {
    id: 'recon-001',
    statementNo: 'ST-20250520-001',
    partnerType: 'customer',
    partnerName: '杭州暖衣童装有限公司',
    documentType: '销售出库单',
    documentNo: 'SO-20250508-001',
    amount: 48600,
    shipmentDate: '2025-05-08',
    reconciliationDate: '2025-05-20',
    status: 'reconciled',
    styleInfo: 'ET5033-童装套装',
  },
  {
    id: 'recon-002',
    statementNo: 'ST-20250520-001',
    partnerType: 'customer',
    partnerName: '杭州暖衣童装有限公司',
    documentType: '收款单',
    documentNo: 'RC-20250512-003',
    amount: -32000,
    shipmentDate: '2025-05-12',
    reconciliationDate: '2025-05-20',
    status: 'reconciled',
    styleInfo: '付款账户：招商银行',
  },
  {
    id: 'recon-003',
    statementNo: 'ST-20250428-002',
    partnerType: 'customer',
    partnerName: '宁波欣源面料商行',
    documentType: '销售出库单',
    documentNo: 'SO-20250418-002',
    amount: 61800,
    shipmentDate: '2025-04-18',
    reconciliationDate: '2025-04-28',
    status: 'reconciled',
    styleInfo: 'ET2088-运动外套',
  },
  {
    id: 'recon-004',
    statementNo: 'ST-20250428-002',
    partnerType: 'customer',
    partnerName: '宁波欣源面料商行',
    documentType: '收款单',
    documentNo: 'RC-20250428-006',
    amount: -42000,
    shipmentDate: '2025-04-28',
    reconciliationDate: '2025-04-28',
    status: 'reconciled',
    styleInfo: '支付宝入账',
  },
  {
    id: 'recon-005',
    statementNo: 'ST-20250330-006',
    partnerType: 'customer',
    partnerName: '成都云杉户外',
    documentType: '销售出库单',
    documentNo: 'SO-20250322-002',
    amount: 96800,
    shipmentDate: '2025-03-22',
    reconciliationDate: undefined,
    status: 'unreconciled',
    styleInfo: 'ET9056-户外冲锋衣',
  },
  {
    id: 'recon-006',
    statementNo: 'ST-20250330-006',
    partnerType: 'customer',
    partnerName: '成都云杉户外',
    documentType: '收款单',
    documentNo: 'RC-20250330-007',
    amount: -54800,
    shipmentDate: '2025-03-30',
    reconciliationDate: '2025-03-30',
    status: 'reconciled',
    styleInfo: '建设银行到账',
  },
  {
    id: 'recon-007',
    statementNo: 'ST-20250510-004',
    partnerType: 'factory',
    partnerName: '嘉兴顺丰制衣厂',
    documentType: '加工对账单',
    documentNo: 'PO-20250505-003',
    amount: 46800,
    shipmentDate: '2025-05-05',
    reconciliationDate: '2025-05-19',
    status: 'reconciled',
    styleInfo: '工单：FO202405-01',
  },
  {
    id: 'recon-008',
    statementNo: 'ST-20250510-004',
    partnerType: 'factory',
    partnerName: '嘉兴顺丰制衣厂',
    documentType: '付款单',
    documentNo: 'PY-20250510-002',
    amount: -32800,
    shipmentDate: '2025-05-10',
    reconciliationDate: '2025-05-19',
    status: 'reconciled',
    styleInfo: '付款账户：建设银行',
  },
  {
    id: 'recon-009',
    statementNo: 'ST-20250426-001',
    partnerType: 'factory',
    partnerName: '苏州智绣工坊',
    documentType: '加工对账单',
    documentNo: 'PO-20250412-005',
    amount: 36200,
    shipmentDate: '2025-04-12',
    reconciliationDate: undefined,
    status: 'unreconciled',
    styleInfo: '工单：FO202404-09',
  },
  {
    id: 'recon-010',
    statementNo: 'ST-20250426-001',
    partnerType: 'factory',
    partnerName: '苏州智绣工坊',
    documentType: '付款单',
    documentNo: 'PY-20250426-004',
    amount: -25800,
    shipmentDate: '2025-04-26',
    reconciliationDate: '2025-04-26',
    status: 'reconciled',
    styleInfo: '付款账户：招商银行',
  },
  {
    id: 'recon-011',
    statementNo: 'ST-20250429-003',
    partnerType: 'supplier',
    partnerName: '绍兴亿丰纺织',
    documentType: '采购入库单',
    documentNo: 'PO-20250412-004',
    amount: 68400,
    shipmentDate: '2025-04-12',
    reconciliationDate: '2025-04-29',
    status: 'reconciled',
    styleInfo: '面料：春夏功能布',
  },
  {
    id: 'recon-012',
    statementNo: 'ST-20250429-003',
    partnerType: 'supplier',
    partnerName: '绍兴亿丰纺织',
    documentType: '付款单',
    documentNo: 'PY-20250429-002',
    amount: -46800,
    shipmentDate: '2025-04-29',
    reconciliationDate: '2025-04-29',
    status: 'reconciled',
    styleInfo: '付款账户：招商银行',
  },
  {
    id: 'recon-013',
    statementNo: 'ST-20250517-002',
    partnerType: 'supplier',
    partnerName: '常熟锦盛辅料',
    documentType: '采购入库单',
    documentNo: 'PO-20250514-001',
    amount: 42800,
    shipmentDate: '2025-05-14',
    reconciliationDate: undefined,
    status: 'unreconciled',
    styleInfo: '辅料：金属拉链',
  },
  {
    id: 'recon-014',
    statementNo: 'ST-20250517-002',
    partnerType: 'supplier',
    partnerName: '常熟锦盛辅料',
    documentType: '付款单',
    documentNo: 'PY-20250517-001',
    amount: -31200,
    shipmentDate: '2025-05-17',
    reconciliationDate: '2025-05-17',
    status: 'reconciled',
    styleInfo: '付款账户：支付宝',
  },
];

const partnersByType: Record<ReconciliationPartnerType, Array<{ label: string; value: string }>> = {
  customer: [],
  factory: [],
  supplier: [],
};

records.forEach((item) => {
  const bucket = partnersByType[item.partnerType];
  if (!bucket.some((option) => option.value === item.partnerName)) {
    bucket.push({ label: item.partnerName, value: item.partnerName });
  }
});

const normalize = (value?: string) => value?.trim().toLowerCase() ?? '';

const isWithinRange = (value: string | undefined, start?: string, end?: string) => {
  if (!value) {
    return true;
  }
  if (start && value < start) {
    return false;
  }
  if (end && value > end) {
    return false;
  }
  return true;
};

const filterRecords = (
  params: ReconciliationDetailsListParams,
): ReconciliationDetailsRecord[] => {
  const keyword = normalize(params.keyword);
  const orderNo = normalize(params.orderNo);
  const styleKeyword = normalize(params.styleKeyword);
  const statementKeyword = normalize(params.statementNo);

  return records.filter((item) => {
    if (params.partnerType && item.partnerType !== params.partnerType) {
      return false;
    }
    if (params.status && item.status !== params.status) {
      return false;
    }
    if (keyword) {
      const combined = `${item.partnerName} ${item.statementNo} ${item.documentNo}`.toLowerCase();
      if (!combined.includes(keyword)) {
        return false;
      }
    }
    if (orderNo && !item.documentNo.toLowerCase().includes(orderNo)) {
      return false;
    }
    if (styleKeyword) {
      const source = item.styleInfo?.toLowerCase() ?? '';
      if (!source.includes(styleKeyword)) {
        return false;
      }
    }
    if (statementKeyword && !item.statementNo.toLowerCase().includes(statementKeyword)) {
      return false;
    }
    if (!isWithinRange(item.shipmentDate, params.shipmentDateStart, params.shipmentDateEnd)) {
      return false;
    }
    if (!isWithinRange(item.reconciliationDate, params.reconciliationDateStart, params.reconciliationDateEnd)) {
      return false;
    }
    return true;
  });
};

const computeSummary = (items: ReconciliationDetailsRecord[]): ReconciliationDetailsSummary =>
  items.reduce(
    (acc, item) => {
      acc.totalAmount += item.amount;
      if (item.status === 'reconciled') {
        acc.reconciledCount += 1;
      }
      return acc;
    },
    { totalAmount: 0, reconciledCount: 0 },
  );

export const fetchReconciliationDetailsMeta = async (): Promise<ReconciliationDetailsMeta> => {
  await delay(140);
  return clone(partnersByType);
};

export const fetchReconciliationDetailsList = async (
  params: ReconciliationDetailsListParams,
): Promise<ReconciliationDetailsListResponse> => {
  await delay(320);
  const filtered = filterRecords(params);
  const summary = computeSummary(filtered);
  const list = paginate(filtered, params.page, params.pageSize).map(clone);
  return {
    list,
    total: filtered.length,
    summary,
  };
};

export const cancelReconciliation = async (
  payload: ReconciliationCancelPayload,
): Promise<ReconciliationDetailsRecord[]> => {
  await delay(280);
  const updated: ReconciliationDetailsRecord[] = [];
  payload.ids.forEach((id) => {
    const target = records.find((item) => item.id === id);
    if (!target || target.status !== 'reconciled') {
      return;
    }
    target.status = 'unreconciled';
    target.reconciliationDate = undefined;
    updated.push(clone(target));
  });
  return updated;
};

export const exportReconciliationDetailsReport = async (
  params: ReconciliationDetailsListParams,
): Promise<{ fileUrl: string }> => {
  await delay(420);
  void params;
  return { fileUrl: '/mock/download/reconciliation-details-report.xlsx' };
};
