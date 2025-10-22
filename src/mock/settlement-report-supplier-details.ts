import type {
  SupplierBusinessDetailAggregation,
  SupplierBusinessDetailListParams,
  SupplierBusinessDetailListResponse,
  SupplierBusinessDetailMeta,
  SupplierBusinessDetailRecord,
  SupplierBusinessDetailSummary,
  SupplierBusinessTrendPoint,
} from '../types/settlement-report-supplier-details';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const paginate = <T>(list: T[], page: number, pageSize: number): T[] => {
  const start = (page - 1) * pageSize;
  return list.slice(start, start + pageSize);
};

const records: SupplierBusinessDetailRecord[] = [
  {
    id: 'supplier-trx-001',
    supplierId: 'supplier-001',
    supplierName: '宁波欣源面料商行',
    businessDate: '2025-05-03',
    documentType: '采购入库单',
    documentNo: 'PO-20250503-002',
    payable: 54600,
    paid: 0,
    cashierAccount: undefined,
  },
  {
    id: 'supplier-trx-002',
    supplierId: 'supplier-001',
    supplierName: '宁波欣源面料商行',
    businessDate: '2025-05-08',
    documentType: '付款单',
    documentNo: 'PY-20250508-003',
    payable: 0,
    paid: 38600,
    cashierAccount: '建设银行对公账户',
  },
  {
    id: 'supplier-trx-003',
    supplierId: 'supplier-002',
    supplierName: '绍兴亿丰纺织',
    businessDate: '2025-04-12',
    documentType: '采购入库单',
    documentNo: 'PO-20250412-004',
    payable: 68400,
    paid: 0,
    cashierAccount: undefined,
  },
  {
    id: 'supplier-trx-004',
    supplierId: 'supplier-002',
    supplierName: '绍兴亿丰纺织',
    businessDate: '2025-04-29',
    documentType: '付款单',
    documentNo: 'PY-20250429-002',
    payable: 0,
    paid: 46800,
    cashierAccount: '招商银行对公账户',
  },
  {
    id: 'supplier-trx-005',
    supplierId: 'supplier-003',
    supplierName: '常熟锦盛辅料',
    businessDate: '2025-05-14',
    documentType: '采购入库单',
    documentNo: 'PO-20250514-001',
    payable: 42800,
    paid: 0,
    cashierAccount: undefined,
  },
  {
    id: 'supplier-trx-006',
    supplierId: 'supplier-003',
    supplierName: '常熟锦盛辅料',
    businessDate: '2025-05-17',
    documentType: '付款单',
    documentNo: 'PY-20250517-001',
    payable: 0,
    paid: 31200,
    cashierAccount: '支付宝收款',
  },
  {
    id: 'supplier-trx-007',
    supplierId: 'supplier-004',
    supplierName: '嘉兴恒顺拉链',
    businessDate: '2025-03-10',
    documentType: '采购入库单',
    documentNo: 'PO-20250310-006',
    payable: 38800,
    paid: 0,
    cashierAccount: undefined,
  },
  {
    id: 'supplier-trx-008',
    supplierId: 'supplier-004',
    supplierName: '嘉兴恒顺拉链',
    businessDate: '2025-03-25',
    documentType: '付款单',
    documentNo: 'PY-20250325-004',
    payable: 0,
    paid: 22800,
    cashierAccount: '招商银行对公账户',
  },
  {
    id: 'supplier-trx-009',
    supplierId: 'supplier-005',
    supplierName: '台州盛阳纽扣厂',
    businessDate: '2025-04-15',
    documentType: '采购入库单',
    documentNo: 'PO-20250415-001',
    payable: 28400,
    paid: 0,
    cashierAccount: undefined,
  },
  {
    id: 'supplier-trx-010',
    supplierId: 'supplier-005',
    supplierName: '台州盛阳纽扣厂',
    businessDate: '2025-04-30',
    documentType: '付款单',
    documentNo: 'PY-20250430-002',
    payable: 0,
    paid: 21400,
    cashierAccount: '建设银行对公账户',
  },
];

const suppliers = Array.from(new Map(records.map((item) => [item.supplierId, item.supplierName])).entries()).map(
  ([value, label]) => ({ value, label }),
);

const isWithinRange = (value: string, start?: string, end?: string) => {
  if (start && value < start) {
    return false;
  }
  if (end && value > end) {
    return false;
  }
  return true;
};

const filterRecords = (
  params: SupplierBusinessDetailListParams,
): SupplierBusinessDetailRecord[] => {
  return records.filter((item) => {
    if (params.supplierIds?.length && !params.supplierIds.includes(item.supplierId)) {
      return false;
    }
    return isWithinRange(item.businessDate, params.startDate, params.endDate);
  });
};

const computeSummary = (items: SupplierBusinessDetailRecord[]): SupplierBusinessDetailSummary =>
  items.reduce(
    (acc, item) => {
      acc.totalPayable += item.payable;
      acc.totalPaid += item.paid;
      return acc;
    },
    { totalPayable: 0, totalPaid: 0 },
  );

const computeTrend = (
  items: SupplierBusinessDetailRecord[],
): SupplierBusinessTrendPoint[] => {
  const bucket = new Map<string, { payable: number; paid: number }>();
  items.forEach((item) => {
    const month = item.businessDate.slice(0, 7);
    const current = bucket.get(month) ?? { payable: 0, paid: 0 };
    current.payable += item.payable;
    current.paid += item.paid;
    bucket.set(month, current);
  });
  return Array.from(bucket.entries())
    .sort(([a], [b]) => (a > b ? 1 : -1))
    .map(([month, value]) => ({ month, payable: value.payable, paid: value.paid }));
};

export const fetchSupplierBusinessDetailMeta = async (): Promise<SupplierBusinessDetailMeta> => {
  await delay(160);
  return { suppliers: clone(suppliers) };
};

export const fetchSupplierBusinessDetailOverview = async (
  params: SupplierBusinessDetailListParams,
): Promise<SupplierBusinessDetailAggregation> => {
  await delay(260);
  const filtered = filterRecords(params);
  return { trend: computeTrend(filtered) };
};

export const fetchSupplierBusinessDetailList = async (
  params: SupplierBusinessDetailListParams,
): Promise<SupplierBusinessDetailListResponse> => {
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

export const exportSupplierBusinessDetailReport = async (
  params: SupplierBusinessDetailListParams,
): Promise<{ fileUrl: string }> => {
  await delay(400);
  void params;
  return { fileUrl: '/mock/download/supplier-business-detail-report.xlsx' };
};
