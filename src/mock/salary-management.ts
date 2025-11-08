import type {
  SalaryListParams,
  SalaryListResponse,
  SalaryMeta,
  SalarySettlePayload,
} from '../types/salary-management';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const dataset = [
  {
    id: 'emp-001',
    name: '陈海',
    department: '裁床组',
    settledAmount: 8200,
    unsettledAmount: 1200,
    otherAmount: 350,
    totalAmount: 9750,
    lastSettlementDate: '2024-04-30',
  },
  {
    id: 'emp-002',
    name: '黄敏',
    department: '裁床组',
    settledAmount: 7650,
    unsettledAmount: 0,
    otherAmount: 420,
    totalAmount: 8070,
    lastSettlementDate: '2024-04-30',
  },
  {
    id: 'emp-003',
    name: '张丽',
    department: '车缝A线',
    settledAmount: 9560,
    unsettledAmount: 1850,
    otherAmount: 620,
    totalAmount: 12030,
    lastSettlementDate: '2024-04-28',
  },
  {
    id: 'emp-004',
    name: '吴小妹',
    department: '车缝A线',
    settledAmount: 9020,
    unsettledAmount: 2120,
    otherAmount: 310,
    totalAmount: 11450,
    lastSettlementDate: '2024-04-28',
  },
  {
    id: 'emp-005',
    name: '苏丽娜',
    department: '车缝B线',
    settledAmount: 10360,
    unsettledAmount: 980,
    otherAmount: 480,
    totalAmount: 11820,
    lastSettlementDate: '2024-04-29',
  },
  {
    id: 'emp-006',
    name: '黎强',
    department: '后整组',
    settledAmount: 6880,
    unsettledAmount: 1450,
    otherAmount: 260,
    totalAmount: 8590,
    lastSettlementDate: '2024-04-26',
  },
  {
    id: 'emp-007',
    name: '李琴',
    department: '后整组',
    settledAmount: 7120,
    unsettledAmount: 0,
    otherAmount: 380,
    totalAmount: 7500,
    lastSettlementDate: '2024-04-26',
  },
  {
    id: 'emp-008',
    name: '谢青',
    department: '质检组',
    settledAmount: 6120,
    unsettledAmount: 640,
    otherAmount: 220,
    totalAmount: 6980,
    lastSettlementDate: '2024-04-25',
  },
];

const meta: SalaryMeta = {
  departmentOptions: [
    { label: '全部部门', value: '' },
    { label: '裁床组', value: '裁床组' },
    { label: '车缝A线', value: '车缝A线' },
    { label: '车缝B线', value: '车缝B线' },
    { label: '后整组', value: '后整组' },
    { label: '质检组', value: '质检组' },
  ],
  defaultRange: {
    start: '2024-05-01',
    end: '2024-05-31',
  },
};

const normalizeKeyword = (value?: string) => value?.trim().toLowerCase() ?? '';

const matches = (record: typeof dataset[number], params: SalaryListParams): boolean => {
  if (params.department && params.department !== record.department) {
    return false;
  }
  const keyword = normalizeKeyword(params.keyword);
  if (keyword) {
    if (!record.name.toLowerCase().includes(keyword) && !record.department.toLowerCase().includes(keyword)) {
      return false;
    }
  }
  if (params.startDate || params.endDate) {
    const last = Date.parse(record.lastSettlementDate ?? '');
    if (Number.isFinite(last)) {
      if (params.startDate && last < Date.parse(params.startDate)) {
        return false;
      }
      if (params.endDate && last > Date.parse(params.endDate)) {
        return false;
      }
    }
  }
  return true;
};

const summarise = (records: typeof dataset) =>
  records.reduce(
    (
      acc,
      item,
    ) => {
      acc.settledAmount += item.settledAmount;
      acc.unsettledAmount += item.unsettledAmount;
      acc.otherAmount += item.otherAmount;
      acc.totalAmount += item.totalAmount;
      if (item.unsettledAmount > 0) {
        acc.unsettledCount += 1;
      } else {
        acc.settledCount += 1;
      }
      return acc;
    },
    {
      settledAmount: 0,
      unsettledAmount: 0,
      otherAmount: 0,
      totalAmount: 0,
      settledCount: 0,
      unsettledCount: 0,
    },
  );

export const fetchSalaryMeta = async (): Promise<SalaryMeta> => {
  await delay(160);
  return meta;
};

export const fetchSalaryList = async (
  params: SalaryListParams,
): Promise<SalaryListResponse> => {
  await delay(360);
  const filtered = dataset.filter((record) => matches(record, params));
  const start = (params.page - 1) * params.pageSize;
  const end = start + params.pageSize;
  const list = filtered.slice(start, end);
  return {
    list,
    total: filtered.length,
    summary: summarise(filtered),
  };
};

export const settleSalary = async (_payload: SalarySettlePayload): Promise<{ success: boolean }> => {
  await delay(420);
  void _payload;
  return { success: true };
};
