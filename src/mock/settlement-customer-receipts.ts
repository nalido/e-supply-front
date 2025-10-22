import { adjustCashierAccountBalance, getCashierAccountOptions } from './settlement-accounts';
import type {
  CustomerReceiptListParams,
  CustomerReceiptListResponse,
  CustomerReceiptMeta,
  CustomerReceiptPayload,
  CustomerReceiptRecord,
  CustomerReceiptSummary,
} from '../types/settlement-customer-receipts';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const paginate = <T>(list: T[], page: number, pageSize: number): T[] => {
  const start = (page - 1) * pageSize;
  return list.slice(start, start + pageSize);
};

const paymentMethods = [
  { label: '银行转账', value: 'bank-transfer' },
  { label: '支付宝', value: 'alipay' },
  { label: '微信支付', value: 'wechat-pay' },
  { label: '现金', value: 'cash' },
];

const initialCustomers: CustomerReceiptRecord[] = [
  {
    id: 'cust-001',
    customerId: 'cust-001',
    customerName: '杭州暖衣童装有限公司',
    receivableAmount: 328000,
    receivedAmount: 276000,
    arrearsAmount: 52000,
    lastReceiptDate: '2025-05-12',
  },
  {
    id: 'cust-002',
    customerId: 'cust-002',
    customerName: '宁波欣源面料商行',
    receivableAmount: 185400,
    receivedAmount: 146800,
    arrearsAmount: 38600,
    lastReceiptDate: '2025-04-28',
  },
  {
    id: 'cust-003',
    customerId: 'cust-003',
    customerName: '苏州陌上花开',
    receivableAmount: 264500,
    receivedAmount: 252300,
    arrearsAmount: 12200,
    lastReceiptDate: '2025-05-08',
  },
  {
    id: 'cust-004',
    customerId: 'cust-004',
    customerName: '成都云杉户外',
    receivableAmount: 312800,
    receivedAmount: 198400,
    arrearsAmount: 114400,
    lastReceiptDate: '2025-03-30',
  },
  {
    id: 'cust-005',
    customerId: 'cust-005',
    customerName: '广州乐动体育',
    receivableAmount: 228600,
    receivedAmount: 214100,
    arrearsAmount: 14500,
    lastReceiptDate: '2025-05-15',
  },
  {
    id: 'cust-006',
    customerId: 'cust-006',
    customerName: '北京途岳体育',
    receivableAmount: 196200,
    receivedAmount: 158800,
    arrearsAmount: 37400,
    lastReceiptDate: '2025-04-19',
  },
];

const store: CustomerReceiptRecord[] = clone(initialCustomers);

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

const computeSummary = (records: CustomerReceiptRecord[]): CustomerReceiptSummary =>
  records.reduce(
    (acc, item) => {
      acc.totalReceivable += item.receivableAmount;
      acc.totalReceived += item.receivedAmount;
      acc.totalArrears += item.arrearsAmount;
      return acc;
    },
    { totalReceivable: 0, totalReceived: 0, totalArrears: 0 },
  );

export const fetchCustomerReceiptMeta = async (): Promise<CustomerReceiptMeta> => {
  await delay(180);
  const cashierAccounts = await getCashierAccountOptions();
  return {
    customers: store.map((item) => ({ label: item.customerName, value: item.customerId })),
    paymentMethods: clone(paymentMethods),
    cashierAccounts,
  };
};

export const fetchCustomerReceiptList = async (
  params: CustomerReceiptListParams,
): Promise<CustomerReceiptListResponse> => {
  await delay(260);
  const keyword = normalize(params.keyword);
  const filtered = store.filter((item) => {
    if (keyword && !item.customerName.toLowerCase().includes(keyword)) {
      return false;
    }
    return isWithinRange(item.lastReceiptDate, params.startDate, params.endDate);
  });
  const summary = computeSummary(filtered);
  const list = paginate(filtered, params.page, params.pageSize).map(clone);
  return {
    list,
    total: filtered.length,
    summary,
  };
};

export const createCustomerReceipt = async (
  payload: CustomerReceiptPayload,
): Promise<CustomerReceiptRecord> => {
  await delay(320);
  const amount = Number(payload.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('收款金额必须大于0');
  }
  let record = store.find((item) => item.customerId === payload.customerId);
  if (!record) {
    record = {
      id: payload.customerId,
      customerId: payload.customerId,
      customerName: payload.customerId,
      receivableAmount: amount,
      receivedAmount: amount,
      arrearsAmount: 0,
      lastReceiptDate: payload.date,
    };
    store.push(record);
  } else {
    record.receivedAmount = Number((record.receivedAmount + amount).toFixed(2));
    record.arrearsAmount = Math.max(0, Number((record.receivableAmount - record.receivedAmount).toFixed(2)));
    record.lastReceiptDate = payload.date;
  }
  const account = await adjustCashierAccountBalance(payload.cashierAccountId, amount);
  if (!account) {
    throw new Error('收款账户不存在');
  }
  return clone(record);
};

export const exportCustomerReceiptReport = async (): Promise<{ fileUrl: string }> => {
  await delay(400);
  return { fileUrl: '/mock/download/customer-receipt-report.xlsx' };
};

export const resetCustomerReceipts = () => {
  store.splice(0, store.length, ...clone(initialCustomers));
};
