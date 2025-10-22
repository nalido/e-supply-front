import type {
  CashierAccount,
  CashierAccountListParams,
  CashierAccountListResponse,
  CashierAccountMeta,
  CashierAccountOption,
  CashierAccountPayload,
  CashierAccountTypeOption,
} from '../types/settlement-cashier-accounts';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const paginate = <T>(list: T[], page: number, pageSize: number): T[] => {
  const start = (page - 1) * pageSize;
  return list.slice(start, start + pageSize);
};

const accountTypeOptions: CashierAccountTypeOption[] = [
  { label: '银行卡', value: 'bank' },
  { label: '支付宝', value: 'alipay' },
  { label: '微信支付', value: 'wechat' },
  { label: '现金', value: 'cash' },
];

const nowString = () => new Date().toISOString().replace('T', ' ').slice(0, 16);

const initialAccounts: CashierAccount[] = [
  {
    id: 'acct-001',
    name: '招商银行对公账户',
    type: 'bank',
    accountNumber: '6225 8888 8888 0001',
    bankName: '招商银行杭州分行滨江支行',
    initialBalance: 500000,
    currentBalance: 628450.75,
    remarks: '日常大额结算使用',
    transactionCount: 128,
    createdAt: '2023-03-01 09:30',
    updatedAt: '2025-05-21 16:40',
  },
  {
    id: 'acct-002',
    name: '支付宝收款',
    type: 'alipay',
    accountNumber: 'finance@company.com',
    initialBalance: 0,
    currentBalance: 18250.6,
    remarks: '线上零散客户收款',
    transactionCount: 312,
    createdAt: '2023-05-12 11:20',
    updatedAt: '2025-05-22 10:15',
  },
  {
    id: 'acct-003',
    name: '现金备用金',
    type: 'cash',
    accountNumber: 'CASH-001',
    initialBalance: 10000,
    currentBalance: 4500,
    remarks: '少量现金支付备用',
    transactionCount: 46,
    createdAt: '2024-01-05 08:20',
    updatedAt: '2025-05-19 18:05',
  },
  {
    id: 'acct-004',
    name: '建设银行对公账户',
    type: 'bank',
    accountNumber: '4367 6600 1122 0004',
    bankName: '建设银行杭州滨江支行',
    initialBalance: 260000,
    currentBalance: 184320.2,
    remarks: '供应商付款主账户',
    transactionCount: 205,
    createdAt: '2022-11-18 14:10',
    updatedAt: '2025-05-20 09:10',
  },
  {
    id: 'acct-005',
    name: '微信企业收款',
    type: 'wechat',
    accountNumber: 'wxid-company-01',
    initialBalance: 0,
    currentBalance: 32090.32,
    remarks: '展会及零售渠道收款',
    transactionCount: 154,
    createdAt: '2023-10-02 12:00',
    updatedAt: '2025-05-23 15:45',
  },
];

const store: CashierAccount[] = clone(initialAccounts);

const matchesKeyword = (value: string, keyword: string) => value.toLowerCase().includes(keyword);

const normalizeKeyword = (keyword?: string) => keyword?.trim().toLowerCase() ?? '';

export const fetchCashierAccountMeta = async (): Promise<CashierAccountMeta> => {
  await delay(160);
  return {
    accountTypes: clone(accountTypeOptions),
  };
};

export const fetchCashierAccounts = async (
  params: CashierAccountListParams,
): Promise<CashierAccountListResponse> => {
  await delay(220);
  const keyword = normalizeKeyword(params.keyword);
  const filtered = store.filter((item) => {
    if (params.type && item.type !== params.type) {
      return false;
    }
    if (!keyword) {
      return true;
    }
    const candidates = [item.name, item.accountNumber, item.bankName ?? '', item.remarks ?? ''];
    return candidates.some((candidate) => matchesKeyword(candidate.toLowerCase(), keyword));
  });
  const list = paginate(filtered, params.page, params.pageSize).map(clone);
  return {
    list,
    total: filtered.length,
  };
};

export const createCashierAccount = async (
  payload: CashierAccountPayload,
): Promise<CashierAccount> => {
  await delay(260);
  const id = `acct-${Date.now()}`;
  const timestamp = nowString();
  const initialBalance = Number(payload.initialBalance ?? 0);
  const account: CashierAccount = {
    id,
    name: payload.name,
    type: payload.type,
    accountNumber: payload.accountNumber,
    bankName: payload.bankName,
    initialBalance,
    currentBalance: initialBalance,
    remarks: payload.remarks,
    transactionCount: 0,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  store.unshift(account);
  return clone(account);
};

export const updateCashierAccount = async (
  id: string,
  payload: CashierAccountPayload,
): Promise<CashierAccount | undefined> => {
  await delay(240);
  const target = store.find((item) => item.id === id);
  if (!target) {
    return undefined;
  }
  const nextInitial = payload.initialBalance;
  if (typeof nextInitial === 'number' && Number.isFinite(nextInitial)) {
    target.initialBalance = nextInitial;
  }
  target.name = payload.name;
  target.type = payload.type;
  target.accountNumber = payload.accountNumber;
  target.bankName = payload.bankName;
  target.remarks = payload.remarks;
  target.updatedAt = nowString();
  return clone(target);
};

export const removeCashierAccount = async (id: string): Promise<void> => {
  await delay(180);
  const index = store.findIndex((item) => item.id === id);
  if (index === -1) {
    throw new Error('账户不存在');
  }
  if (store[index].transactionCount > 0) {
    throw new Error('该账户已存在交易流水，无法删除');
  }
  store.splice(index, 1);
};

export const getCashierAccountOptions = async (): Promise<CashierAccountOption[]> => {
  await delay(140);
  return store.map((item) => ({ label: item.name, value: item.id }));
};

export const adjustCashierAccountBalance = async (
  id: string,
  delta: number,
): Promise<CashierAccount | undefined> => {
  await delay(120);
  const target = store.find((item) => item.id === id);
  if (!target) {
    return undefined;
  }
  target.currentBalance = Number((target.currentBalance + delta).toFixed(2));
  target.transactionCount += 1;
  target.updatedAt = nowString();
  return clone(target);
};

export const resetCashierAccounts = () => {
  store.splice(0, store.length, ...clone(initialAccounts));
};
