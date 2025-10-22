import type {
  CustomerBusinessDetailAggregation,
  CustomerBusinessDetailListParams,
  CustomerBusinessDetailListResponse,
  CustomerBusinessDetailMeta,
  CustomerBusinessDetailRecord,
  CustomerBusinessDetailSummary,
  CustomerBusinessTrendPoint,
} from '../types/settlement-report-customer-details';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const paginate = <T>(list: T[], page: number, pageSize: number): T[] => {
  const start = (page - 1) * pageSize;
  return list.slice(start, start + pageSize);
};

const records: CustomerBusinessDetailRecord[] = [
  {
    id: 'cust-trx-001',
    customerId: 'cust-001',
    customerName: '杭州暖衣童装有限公司',
    businessDate: '2025-05-08',
    documentType: '销售出库单',
    documentNo: 'SO-20250508-001',
    receivable: 48600,
    received: 0,
    cashierAccount: undefined,
  },
  {
    id: 'cust-trx-002',
    customerId: 'cust-001',
    customerName: '杭州暖衣童装有限公司',
    businessDate: '2025-05-12',
    documentType: '收款单',
    documentNo: 'RC-20250512-003',
    receivable: 0,
    received: 32000,
    cashierAccount: '招商银行对公账户',
  },
  {
    id: 'cust-trx-003',
    customerId: 'cust-002',
    customerName: '宁波欣源面料商行',
    businessDate: '2025-04-18',
    documentType: '销售出库单',
    documentNo: 'SO-20250418-002',
    receivable: 61800,
    received: 0,
    cashierAccount: undefined,
  },
  {
    id: 'cust-trx-004',
    customerId: 'cust-002',
    customerName: '宁波欣源面料商行',
    businessDate: '2025-04-28',
    documentType: '收款单',
    documentNo: 'RC-20250428-006',
    receivable: 0,
    received: 42000,
    cashierAccount: '支付宝收款',
  },
  {
    id: 'cust-trx-005',
    customerId: 'cust-003',
    customerName: '苏州陌上花开',
    businessDate: '2025-05-02',
    documentType: '销售出库单',
    documentNo: 'SO-20250502-008',
    receivable: 82400,
    received: 0,
    cashierAccount: undefined,
  },
  {
    id: 'cust-trx-006',
    customerId: 'cust-003',
    customerName: '苏州陌上花开',
    businessDate: '2025-05-08',
    documentType: '收款单',
    documentNo: 'RC-20250508-004',
    receivable: 0,
    received: 60000,
    cashierAccount: '招商银行对公账户',
  },
  {
    id: 'cust-trx-007',
    customerId: 'cust-004',
    customerName: '成都云杉户外',
    businessDate: '2025-03-22',
    documentType: '销售出库单',
    documentNo: 'SO-20250322-002',
    receivable: 96800,
    received: 0,
    cashierAccount: undefined,
  },
  {
    id: 'cust-trx-008',
    customerId: 'cust-004',
    customerName: '成都云杉户外',
    businessDate: '2025-03-30',
    documentType: '收款单',
    documentNo: 'RC-20250330-007',
    receivable: 0,
    received: 54800,
    cashierAccount: '建设银行对公账户',
  },
  {
    id: 'cust-trx-009',
    customerId: 'cust-005',
    customerName: '广州乐动体育',
    businessDate: '2025-05-15',
    documentType: '收款单',
    documentNo: 'RC-20250515-002',
    receivable: 0,
    received: 32600,
    cashierAccount: '微信企业收款',
  },
  {
    id: 'cust-trx-010',
    customerId: 'cust-005',
    customerName: '广州乐动体育',
    businessDate: '2025-05-01',
    documentType: '销售出库单',
    documentNo: 'SO-20250501-003',
    receivable: 61200,
    received: 0,
    cashierAccount: undefined,
  },
  {
    id: 'cust-trx-011',
    customerId: 'cust-006',
    customerName: '北京途岳体育',
    businessDate: '2025-04-05',
    documentType: '销售出库单',
    documentNo: 'SO-20250405-006',
    receivable: 72800,
    received: 0,
    cashierAccount: undefined,
  },
  {
    id: 'cust-trx-012',
    customerId: 'cust-006',
    customerName: '北京途岳体育',
    businessDate: '2025-04-19',
    documentType: '收款单',
    documentNo: 'RC-20250419-005',
    receivable: 0,
    received: 41800,
    cashierAccount: '招商银行对公账户',
  },
  {
    id: 'cust-trx-013',
    customerId: 'cust-001',
    customerName: '杭州暖衣童装有限公司',
    businessDate: '2025-02-28',
    documentType: '退货单',
    documentNo: 'RT-20250228-001',
    receivable: -5600,
    received: 0,
    cashierAccount: undefined,
  },
  {
    id: 'cust-trx-014',
    customerId: 'cust-003',
    customerName: '苏州陌上花开',
    businessDate: '2025-01-12',
    documentType: '销售出库单',
    documentNo: 'SO-20250112-004',
    receivable: 59400,
    received: 0,
    cashierAccount: undefined,
  },
  {
    id: 'cust-trx-015',
    customerId: 'cust-002',
    customerName: '宁波欣源面料商行',
    businessDate: '2025-01-20',
    documentType: '收款单',
    documentNo: 'RC-20250120-003',
    receivable: 0,
    received: 34800,
    cashierAccount: '支付宝收款',
  },
];

const customers = Array.from(new Map(records.map((item) => [item.customerId, item.customerName])).entries()).map(
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
  params: CustomerBusinessDetailListParams,
): CustomerBusinessDetailRecord[] => {
  return records.filter((item) => {
    if (params.customerIds?.length && !params.customerIds.includes(item.customerId)) {
      return false;
    }
    return isWithinRange(item.businessDate, params.startDate, params.endDate);
  });
};

const computeSummary = (items: CustomerBusinessDetailRecord[]): CustomerBusinessDetailSummary =>
  items.reduce(
    (acc, item) => {
      acc.totalReceivable += item.receivable;
      acc.totalReceived += item.received;
      return acc;
    },
    { totalReceivable: 0, totalReceived: 0 },
  );

const computeTrend = (
  items: CustomerBusinessDetailRecord[],
): CustomerBusinessTrendPoint[] => {
  const bucket = new Map<string, { receivable: number; received: number }>();
  items.forEach((item) => {
    const month = item.businessDate.slice(0, 7);
    const current = bucket.get(month) ?? { receivable: 0, received: 0 };
    current.receivable += item.receivable;
    current.received += item.received;
    bucket.set(month, current);
  });
  return Array.from(bucket.entries())
    .sort(([a], [b]) => (a > b ? 1 : -1))
    .map(([month, value]) => ({ month, receivable: value.receivable, received: value.received }));
};

export const fetchCustomerBusinessDetailMeta = async (): Promise<CustomerBusinessDetailMeta> => {
  await delay(160);
  return { customers: clone(customers) };
};

export const fetchCustomerBusinessDetailOverview = async (
  params: CustomerBusinessDetailListParams,
): Promise<CustomerBusinessDetailAggregation> => {
  await delay(260);
  const filtered = filterRecords(params);
  return { trend: computeTrend(filtered) };
};

export const fetchCustomerBusinessDetailList = async (
  params: CustomerBusinessDetailListParams,
): Promise<CustomerBusinessDetailListResponse> => {
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

export const exportCustomerBusinessDetailReport = async (
  params: CustomerBusinessDetailListParams,
): Promise<{ fileUrl: string }> => {
  await delay(400);
  void params;
  return { fileUrl: '/mock/download/customer-business-detail-report.xlsx' };
};
