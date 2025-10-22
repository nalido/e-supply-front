import { adjustCashierAccountBalance, getCashierAccountOptions } from './settlement-accounts';
import type {
  FactoryPaymentListParams,
  FactoryPaymentListResponse,
  FactoryPaymentMeta,
  FactoryPaymentPayload,
  FactoryPaymentRecord,
  FactoryPaymentSummary,
} from '../types/settlement-factory-payments';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const paginate = <T>(list: T[], page: number, pageSize: number): T[] => {
  const start = (page - 1) * pageSize;
  return list.slice(start, start + pageSize);
};

const paymentMethods = [
  { label: '银行转账', value: 'bank-transfer' },
  { label: '对公电汇', value: 'telegraphic-transfer' },
  { label: '支付宝', value: 'alipay' },
  { label: '现金', value: 'cash' },
];

const initialFactories: FactoryPaymentRecord[] = [
  {
    id: 'factory-001',
    factoryId: 'factory-001',
    factoryName: '嘉兴顺丰制衣厂',
    payableAmount: 286400,
    paidAmount: 214800,
    arrearsAmount: 71600,
    lastPaymentDate: '2025-05-10',
  },
  {
    id: 'factory-002',
    factoryId: 'factory-002',
    factoryName: '苏州智绣工坊',
    payableAmount: 198200,
    paidAmount: 167400,
    arrearsAmount: 30800,
    lastPaymentDate: '2025-04-26',
  },
  {
    id: 'factory-003',
    factoryId: 'factory-003',
    factoryName: '湖州恒辉针织厂',
    payableAmount: 242600,
    paidAmount: 128000,
    arrearsAmount: 114600,
    lastPaymentDate: '2025-03-30',
  },
  {
    id: 'factory-004',
    factoryId: 'factory-004',
    factoryName: '温岭弘盛服饰',
    payableAmount: 156800,
    paidAmount: 124500,
    arrearsAmount: 32300,
    lastPaymentDate: '2025-05-18',
  },
  {
    id: 'factory-005',
    factoryId: 'factory-005',
    factoryName: '台州诚纺外发厂',
    payableAmount: 226400,
    paidAmount: 183200,
    arrearsAmount: 43200,
    lastPaymentDate: '2025-04-12',
  },
];

const store: FactoryPaymentRecord[] = clone(initialFactories);

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

const computeSummary = (records: FactoryPaymentRecord[]): FactoryPaymentSummary =>
  records.reduce(
    (acc, item) => {
      acc.totalPayable += item.payableAmount;
      acc.totalPaid += item.paidAmount;
      acc.totalArrears += item.arrearsAmount;
      return acc;
    },
    { totalPayable: 0, totalPaid: 0, totalArrears: 0 },
  );

export const fetchFactoryPaymentMeta = async (): Promise<FactoryPaymentMeta> => {
  await delay(180);
  const cashierAccounts = await getCashierAccountOptions();
  return {
    factories: store.map((item) => ({ label: item.factoryName, value: item.factoryId })),
    paymentMethods: clone(paymentMethods),
    cashierAccounts,
  };
};

export const fetchFactoryPaymentList = async (
  params: FactoryPaymentListParams,
): Promise<FactoryPaymentListResponse> => {
  await delay(260);
  const keyword = normalize(params.keyword);
  const filtered = store.filter((item) => {
    if (keyword && !item.factoryName.toLowerCase().includes(keyword)) {
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

export const createFactoryPayment = async (
  payload: FactoryPaymentPayload,
): Promise<FactoryPaymentRecord> => {
  await delay(320);
  const amount = Number(payload.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('付款金额必须大于0');
  }
  const record = store.find((item) => item.factoryId === payload.factoryId);
  if (!record) {
    throw new Error('加工厂不存在');
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

export const exportFactoryPaymentReport = async (): Promise<{ fileUrl: string }> => {
  await delay(420);
  return { fileUrl: '/mock/download/factory-payment-report.xlsx' };
};

export const resetFactoryPayments = () => {
  store.splice(0, store.length, ...clone(initialFactories));
};
