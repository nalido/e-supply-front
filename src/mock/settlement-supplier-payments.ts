import { adjustCashierAccountBalance, getCashierAccountOptions } from './settlement-accounts';
import type {
  SupplierPaymentListParams,
  SupplierPaymentListResponse,
  SupplierPaymentMeta,
  SupplierPaymentPayload,
  SupplierPaymentRecord,
  SupplierPaymentSummary,
} from '../types/settlement-supplier-payments';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const paginate = <T>(list: T[], page: number, pageSize: number): T[] => {
  const start = (page - 1) * pageSize;
  return list.slice(start, start + pageSize);
};

const paymentMethods = [
  { label: '银行转账', value: 'bank-transfer' },
  { label: '对公电汇', value: 'telegraphic-transfer' },
  { label: '承兑汇票', value: 'bank-acceptance' },
  { label: '支付宝', value: 'alipay' },
];

const initialSuppliers: SupplierPaymentRecord[] = [
  {
    id: 'supplier-001',
    supplierId: 'supplier-001',
    supplierName: '宁波欣源面料商行',
    payableAmount: 386400,
    paidAmount: 298200,
    arrearsAmount: 88200,
    lastPaymentDate: '2025-05-08',
  },
  {
    id: 'supplier-002',
    supplierId: 'supplier-002',
    supplierName: '绍兴亿丰纺织',
    payableAmount: 264800,
    paidAmount: 210000,
    arrearsAmount: 54800,
    lastPaymentDate: '2025-04-29',
  },
  {
    id: 'supplier-003',
    supplierId: 'supplier-003',
    supplierName: '常熟锦盛辅料',
    payableAmount: 156200,
    paidAmount: 143600,
    arrearsAmount: 12600,
    lastPaymentDate: '2025-05-17',
  },
  {
    id: 'supplier-004',
    supplierId: 'supplier-004',
    supplierName: '嘉兴恒顺拉链',
    payableAmount: 122400,
    paidAmount: 86400,
    arrearsAmount: 36000,
    lastPaymentDate: '2025-03-25',
  },
  {
    id: 'supplier-005',
    supplierId: 'supplier-005',
    supplierName: '台州盛阳纽扣厂',
    payableAmount: 98400,
    paidAmount: 75400,
    arrearsAmount: 23000,
    lastPaymentDate: '2025-04-30',
  },
];

const store: SupplierPaymentRecord[] = clone(initialSuppliers);

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

const computeSummary = (records: SupplierPaymentRecord[]): SupplierPaymentSummary =>
  records.reduce(
    (acc, item) => {
      acc.totalPayable += item.payableAmount;
      acc.totalPaid += item.paidAmount;
      acc.totalArrears += item.arrearsAmount;
      return acc;
    },
    { totalPayable: 0, totalPaid: 0, totalArrears: 0 },
  );

export const fetchSupplierPaymentMeta = async (): Promise<SupplierPaymentMeta> => {
  await delay(180);
  const cashierAccounts = await getCashierAccountOptions();
  return {
    suppliers: store.map((item) => ({ label: item.supplierName, value: item.supplierId })),
    paymentMethods: clone(paymentMethods),
    cashierAccounts,
  };
};

export const fetchSupplierPaymentList = async (
  params: SupplierPaymentListParams,
): Promise<SupplierPaymentListResponse> => {
  await delay(260);
  const keyword = normalize(params.keyword);
  const filtered = store.filter((item) => {
    if (keyword && !item.supplierName.toLowerCase().includes(keyword)) {
      return false;
    }
    return isWithinRange(item.lastPaymentDate, params.startDate, params.endDate);
  });
  const summary = computeSummary(filtered);
  const list = paginate(filtered, params.page, params.pageSize).map(clone);
  return {
    list,
    total: filtered.length,
    summary,
  };
};

export const createSupplierPayment = async (
  payload: SupplierPaymentPayload,
): Promise<SupplierPaymentRecord> => {
  await delay(320);
  const amount = Number(payload.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('付款金额必须大于0');
  }
  const record = store.find((item) => item.supplierId === payload.supplierId);
  if (!record) {
    throw new Error('供应商不存在');
  }
  record.paidAmount = Number((record.paidAmount + amount).toFixed(2));
  record.arrearsAmount = Math.max(0, Number((record.payableAmount - record.paidAmount).toFixed(2)));
  record.lastPaymentDate = payload.date;
  const account = await adjustCashierAccountBalance(payload.cashierAccountId, -amount);
  if (!account) {
    throw new Error('付款账户不存在');
  }
  return clone(record);
};

export const exportSupplierPaymentReport = async (): Promise<{ fileUrl: string }> => {
  await delay(420);
  return { fileUrl: '/mock/download/supplier-payment-report.xlsx' };
};

export const resetSupplierPayments = () => {
  store.splice(0, store.length, ...clone(initialSuppliers));
};
