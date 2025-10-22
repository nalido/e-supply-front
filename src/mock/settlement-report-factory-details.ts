import type {
  FactoryBusinessDetailAggregation,
  FactoryBusinessDetailListParams,
  FactoryBusinessDetailListResponse,
  FactoryBusinessDetailMeta,
  FactoryBusinessDetailRecord,
  FactoryBusinessDetailSummary,
  FactoryBusinessTrendPoint,
} from '../types/settlement-report-factory-details';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const paginate = <T>(list: T[], page: number, pageSize: number): T[] => {
  const start = (page - 1) * pageSize;
  return list.slice(start, start + pageSize);
};

const records: FactoryBusinessDetailRecord[] = [
  {
    id: 'factory-trx-001',
    factoryId: 'factory-001',
    factoryName: '嘉兴顺丰制衣厂',
    businessDate: '2025-05-05',
    documentType: '加工对账单',
    documentNo: 'PO-20250505-003',
    payable: 46800,
    paid: 0,
    cashierAccount: undefined,
  },
  {
    id: 'factory-trx-002',
    factoryId: 'factory-001',
    factoryName: '嘉兴顺丰制衣厂',
    businessDate: '2025-05-10',
    documentType: '付款单',
    documentNo: 'PY-20250510-002',
    payable: 0,
    paid: 32800,
    cashierAccount: '建设银行对公账户',
  },
  {
    id: 'factory-trx-003',
    factoryId: 'factory-002',
    factoryName: '苏州智绣工坊',
    businessDate: '2025-04-12',
    documentType: '加工对账单',
    documentNo: 'PO-20250412-005',
    payable: 36200,
    paid: 0,
    cashierAccount: undefined,
  },
  {
    id: 'factory-trx-004',
    factoryId: 'factory-002',
    factoryName: '苏州智绣工坊',
    businessDate: '2025-04-26',
    documentType: '付款单',
    documentNo: 'PY-20250426-004',
    payable: 0,
    paid: 25800,
    cashierAccount: '招商银行对公账户',
  },
  {
    id: 'factory-trx-005',
    factoryId: 'factory-003',
    factoryName: '湖州恒辉针织厂',
    businessDate: '2025-03-16',
    documentType: '加工对账单',
    documentNo: 'PO-20250316-001',
    payable: 48600,
    paid: 0,
    cashierAccount: undefined,
  },
  {
    id: 'factory-trx-006',
    factoryId: 'factory-003',
    factoryName: '湖州恒辉针织厂',
    businessDate: '2025-03-30',
    documentType: '付款单',
    documentNo: 'PY-20250330-003',
    payable: 0,
    paid: 25800,
    cashierAccount: '建设银行对公账户',
  },
  {
    id: 'factory-trx-007',
    factoryId: 'factory-004',
    factoryName: '温岭弘盛服饰',
    businessDate: '2025-05-18',
    documentType: '付款单',
    documentNo: 'PY-20250518-001',
    payable: 0,
    paid: 22800,
    cashierAccount: '招商银行对公账户',
  },
  {
    id: 'factory-trx-008',
    factoryId: 'factory-004',
    factoryName: '温岭弘盛服饰',
    businessDate: '2025-05-02',
    documentType: '加工对账单',
    documentNo: 'PO-20250502-004',
    payable: 35200,
    paid: 0,
    cashierAccount: undefined,
  },
  {
    id: 'factory-trx-009',
    factoryId: 'factory-005',
    factoryName: '台州诚纺外发厂',
    businessDate: '2025-04-12',
    documentType: '加工对账单',
    documentNo: 'PO-20250412-006',
    payable: 42800,
    paid: 0,
    cashierAccount: undefined,
  },
  {
    id: 'factory-trx-010',
    factoryId: 'factory-005',
    factoryName: '台州诚纺外发厂',
    businessDate: '2025-04-21',
    documentType: '付款单',
    documentNo: 'PY-20250421-002',
    payable: 0,
    paid: 28600,
    cashierAccount: '建设银行对公账户',
  },
];

const factories = Array.from(new Map(records.map((item) => [item.factoryId, item.factoryName])).entries()).map(
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
  params: FactoryBusinessDetailListParams,
): FactoryBusinessDetailRecord[] => {
  return records.filter((item) => {
    if (params.factoryIds?.length && !params.factoryIds.includes(item.factoryId)) {
      return false;
    }
    return isWithinRange(item.businessDate, params.startDate, params.endDate);
  });
};

const computeSummary = (items: FactoryBusinessDetailRecord[]): FactoryBusinessDetailSummary =>
  items.reduce(
    (acc, item) => {
      acc.totalPayable += item.payable;
      acc.totalPaid += item.paid;
      return acc;
    },
    { totalPayable: 0, totalPaid: 0 },
  );

const computeTrend = (
  items: FactoryBusinessDetailRecord[],
): FactoryBusinessTrendPoint[] => {
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

export const fetchFactoryBusinessDetailMeta = async (): Promise<FactoryBusinessDetailMeta> => {
  await delay(160);
  return { factories: clone(factories) };
};

export const fetchFactoryBusinessDetailOverview = async (
  params: FactoryBusinessDetailListParams,
): Promise<FactoryBusinessDetailAggregation> => {
  await delay(260);
  const filtered = filterRecords(params);
  return { trend: computeTrend(filtered) };
};

export const fetchFactoryBusinessDetailList = async (
  params: FactoryBusinessDetailListParams,
): Promise<FactoryBusinessDetailListResponse> => {
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

export const exportFactoryBusinessDetailReport = async (
  params: FactoryBusinessDetailListParams,
): Promise<{ fileUrl: string }> => {
  await delay(400);
  void params;
  return { fileUrl: '/mock/download/factory-business-detail-report.xlsx' };
};
