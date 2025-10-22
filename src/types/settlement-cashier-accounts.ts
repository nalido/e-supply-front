export type CashierAccountType = 'bank' | 'alipay' | 'wechat' | 'cash';

export type CashierAccount = {
  id: string;
  name: string;
  type: CashierAccountType;
  accountNumber: string;
  bankName?: string;
  initialBalance: number;
  currentBalance: number;
  remarks?: string;
  transactionCount: number;
  createdAt: string;
  updatedAt: string;
};

export type CashierAccountOption = {
  label: string;
  value: string;
};

export type CashierAccountTypeOption = {
  label: string;
  value: CashierAccountType;
};

export type CashierAccountMeta = {
  accountTypes: CashierAccountTypeOption[];
};

export type CashierAccountListParams = {
  page: number;
  pageSize: number;
  keyword?: string;
  type?: CashierAccountType;
};

export type CashierAccountListResponse = {
  list: CashierAccount[];
  total: number;
};

export type CashierAccountPayload = {
  name: string;
  type: CashierAccountType;
  accountNumber: string;
  bankName?: string;
  initialBalance?: number;
  remarks?: string;
};
