import type {
  SalaryListParams,
  SalaryListResponse,
  SalaryMeta,
  SalarySettlePayload,
  SalaryTicketListParams,
  SalaryTicketListResponse,
  SalaryTicketRecord,
  SalaryTicketSummary,
  SalaryBatchAdjustPayload,
  SalaryPayslipSendPayload,
  SalaryPayslipSendResult,
  SalaryPayslipRecord,
  SalaryPayslipLogListParams,
  SalaryPayslipLogResponse,
  SalaryPayslipLogRecord,
  SalaryScanStatistics,
  SalaryScanStatisticsParams,
  SalaryTicketDetailParams,
  SalaryTicketDetailResponse,
  SalaryTicketDetailRecord,
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

const employeeLookup = new Map(dataset.map((item) => [item.id, item]));

const ticketDataset: Record<string, SalaryTicketRecord[]> = {
  'emp-001': [
    {
      id: 'ticket-emp001-001',
      ticketNo: 'PW-202405-0001',
      processName: '裁床',
      recordedAt: '2024-05-05T08:30:00.000Z',
      status: 'PENDING',
      quantity: 120,
      pieceRate: 3.8,
      amount: 456,
      workOrderId: 501,
      productionOrderId: 3001,
    },
    {
      id: 'ticket-emp001-002',
      ticketNo: 'PW-202405-0005',
      processName: '裁床',
      recordedAt: '2024-05-03T09:50:00.000Z',
      status: 'SETTLED',
      quantity: 100,
      pieceRate: 3.8,
      amount: 380,
      workOrderId: 501,
      productionOrderId: 3001,
    },
  ],
  'emp-003': [
    {
      id: 'ticket-emp003-001',
      ticketNo: 'PW-202405-0012',
      processName: '车缝A线',
      recordedAt: '2024-05-07T07:25:00.000Z',
      status: 'PENDING',
      quantity: 180,
      pieceRate: 4.2,
      amount: 756,
      workOrderId: 640,
      productionOrderId: 3201,
    },
    {
      id: 'ticket-emp003-002',
      ticketNo: 'PW-202405-0008',
      processName: '锁眼',
      recordedAt: '2024-05-02T11:10:00.000Z',
      status: 'SETTLED',
      quantity: 150,
      pieceRate: 4,
      amount: 600,
      workOrderId: 641,
      productionOrderId: 3201,
    },
  ],
  'emp-005': [
    {
      id: 'ticket-emp005-001',
      ticketNo: 'PW-202405-0020',
      processName: '车缝B线',
      recordedAt: '2024-05-04T09:00:00.000Z',
      status: 'PENDING',
      quantity: 140,
      pieceRate: 4.1,
      amount: 574,
      workOrderId: 710,
      productionOrderId: 3301,
    },
  ],
};

const payslipLogs: SalaryPayslipLogRecord[] = [
  {
    id: 'log-202405-001',
    employeeId: 'emp-001',
    employeeName: '陈海',
    startDate: '2024-05-01',
    endDate: '2024-05-07',
    settledAmount: 6200,
    unsettledAmount: 450,
    adjustmentAmount: 150,
    totalAmount: 6800,
    status: 'SENT',
    message: '钉钉推送成功',
    requestedBy: '1001',
    sentAt: '2024-05-08T09:30:00.000Z',
  },
  {
    id: 'log-202405-002',
    employeeId: 'emp-003',
    employeeName: '张丽',
    startDate: '2024-05-01',
    endDate: '2024-05-07',
    settledAmount: 7100,
    unsettledAmount: 680,
    adjustmentAmount: 0,
    totalAmount: 7780,
    status: 'SENT',
    message: '企微推送成功',
    requestedBy: '1001',
    sentAt: '2024-05-08T09:45:00.000Z',
  },
  {
    id: 'log-202405-003',
    employeeId: 'emp-005',
    employeeName: '苏丽娜',
    startDate: '2024-05-01',
    endDate: '2024-05-07',
    settledAmount: 5300,
    unsettledAmount: 320,
    adjustmentAmount: 0,
    totalAmount: 5620,
    status: 'SENT',
    message: '短信触达成功',
    requestedBy: '1001',
    sentAt: '2024-05-08T10:00:00.000Z',
  },
  {
    id: 'log-202405-004',
    employeeId: 'emp-006',
    employeeName: '黎强',
    startDate: '2024-05-01',
    endDate: '2024-05-07',
    settledAmount: 4500,
    unsettledAmount: 300,
    adjustmentAmount: 80,
    totalAmount: 4880,
    status: 'SENT',
    message: '钉钉推送成功',
    requestedBy: '1002',
    sentAt: '2024-05-08T10:10:00.000Z',
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

const DEFAULT_TICKET_SUMMARY: SalaryTicketSummary = {
  totalQuantity: 0,
  settledAmount: 0,
  unsettledAmount: 0,
  totalAmount: 0,
};

const summariseTickets = (records: SalaryTicketRecord[]): SalaryTicketSummary =>
  records.reduce(
    (
      acc,
      item,
    ) => {
      acc.totalQuantity += item.quantity;
      if (item.status === 'SETTLED') {
        acc.settledAmount += item.amount;
      } else if (item.status === 'PENDING') {
        acc.unsettledAmount += item.amount;
      }
      acc.totalAmount += item.amount;
      return acc;
    },
    { ...DEFAULT_TICKET_SUMMARY },
  );

const filterTickets = (records: SalaryTicketRecord[], params: SalaryTicketListParams) => {
  const status = params.status?.toUpperCase();
  return records.filter((record) => {
    if (status && status !== 'ALL') {
      if (status === 'PENDING' && record.status !== 'PENDING') {
        return false;
      }
      if (status === 'SETTLED' && record.status !== 'SETTLED') {
        return false;
      }
      if (status === 'VOIDED' && record.status !== 'VOIDED') {
        return false;
      }
    }
    if (params.keyword) {
      const keyword = params.keyword.toLowerCase();
      if (!record.ticketNo.toLowerCase().includes(keyword) && !record.processName.toLowerCase().includes(keyword)) {
        return false;
      }
    }
    const timestamp = Date.parse(record.recordedAt);
    if (Number.isFinite(timestamp)) {
      if (params.startDate && timestamp < Date.parse(params.startDate)) {
        return false;
      }
      if (params.endDate && timestamp > Date.parse(params.endDate)) {
        return false;
      }
    }
    return true;
  });
};

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

export const fetchSalaryTickets = async (
  params: SalaryTicketListParams,
): Promise<SalaryTicketListResponse> => {
  await delay(320);
  const records = ticketDataset[params.employeeId] ?? [];
  const filtered = filterTickets(records, params);
  const start = (params.page - 1) * params.pageSize;
  const end = start + params.pageSize;
  const list = filtered.slice(start, end);
  return {
    list,
    total: filtered.length,
    page: params.page,
    pageSize: params.pageSize,
    summary: summariseTickets(filtered),
  };
};

export const fetchSalaryPayslipLogs = async (
  params: SalaryPayslipLogListParams,
): Promise<SalaryPayslipLogResponse> => {
  await delay(220);
  const keyword = params.keyword?.trim().toLowerCase();
  const statusFilter = params.status && params.status !== 'all' ? params.status : undefined;
  const filtered = payslipLogs.filter((log) => {
    if (params.startDate && log.startDate < params.startDate) {
      return false;
    }
    if (params.endDate && log.endDate > params.endDate) {
      return false;
    }
    if (statusFilter && log.status !== statusFilter) {
      return false;
    }
    if (keyword) {
      const target = `${log.employeeName} ${log.employeeId}`.toLowerCase();
      if (!target.includes(keyword)) {
        return false;
      }
    }
    return true;
  });
  const start = (params.page - 1) * params.pageSize;
  const end = start + params.pageSize;
  const list = filtered.slice(start, end);
  return {
    list,
    total: filtered.length,
    page: params.page,
    pageSize: params.pageSize,
  };
};

export const fetchSalaryScanStatistics = async (
  params: SalaryScanStatisticsParams,
): Promise<SalaryScanStatistics> => {
  await delay(220);
  const tickets = filterTicketsByRange(params.startDate, params.endDate);
  const summary = tickets.reduce(
    (
      acc,
      ticket,
    ) => {
      acc.totalTickets += 1;
      acc.totalQuantity += ticket.quantity ?? 0;
      const amount = ticket.amount ?? 0;
      if (ticket.status === 'SETTLED') {
        acc.settledAmount += amount;
      } else {
        acc.unsettledAmount += amount;
      }
      acc.totalAmount += amount;
      return acc;
    },
    {
      totalTickets: 0,
      totalQuantity: 0,
      settledAmount: 0,
      unsettledAmount: 0,
      totalAmount: 0,
    },
  );

  const employeeAggregation = new Map<string, SalaryScanStatistics['topEmployees'][number]>();
  tickets.forEach((ticket) => {
    const employeeId = ticket.workerId ? String(ticket.workerId) : 'unknown';
    const employee = employeeLookup.get(employeeId);
    const agg = employeeAggregation.get(employeeId) ?? {
      employeeId,
      employeeName: employee?.name ?? `工人${employeeId}`,
      department: employee?.department ?? '计件工序',
      ticketCount: 0,
      totalQuantity: 0,
      totalAmount: 0,
      unsettledAmount: 0,
    };
    agg.ticketCount += 1;
    agg.totalQuantity += ticket.quantity ?? 0;
    const amount = ticket.amount ?? 0;
    agg.totalAmount += amount;
    if (ticket.status === 'PENDING') {
      agg.unsettledAmount += amount;
    }
    employeeAggregation.set(employeeId, agg);
  });
  const topEmployees = Array.from(employeeAggregation.values())
    .sort((a, b) => b.totalAmount - a.totalAmount)
    .slice(0, 6);

  const processAggregation = new Map<string, SalaryScanStatistics['topProcesses'][number]>();
  tickets.forEach((ticket) => {
    const key = ticket.processName ?? '计件工序';
    const agg = processAggregation.get(key) ?? {
      processId: ticket.processName,
      processName: key,
      ticketCount: 0,
      totalQuantity: 0,
      totalAmount: 0,
    };
    agg.ticketCount += 1;
    agg.totalQuantity += ticket.quantity ?? 0;
    agg.totalAmount += ticket.amount ?? 0;
    processAggregation.set(key, agg);
  });
  const topProcesses = Array.from(processAggregation.values())
    .sort((a, b) => b.totalAmount - a.totalAmount)
    .slice(0, 6);

  const trendMap = new Map<string, { totalQuantity: number; totalAmount: number }>();
  tickets.forEach((ticket) => {
    const dateKey = ticket.recordedAt ? ticket.recordedAt.slice(0, 10) : '未知';
    const entry = trendMap.get(dateKey) ?? { totalQuantity: 0, totalAmount: 0 };
    entry.totalQuantity += ticket.quantity ?? 0;
    entry.totalAmount += ticket.amount ?? 0;
    trendMap.set(dateKey, entry);
  });
  const trend = Array.from(trendMap.entries())
    .map(([date, value]) => ({ date, totalQuantity: value.totalQuantity, totalAmount: value.totalAmount }))
    .sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''))
    .slice(-14);

  return {
    summary,
    topEmployees,
    topProcesses,
    trend,
  };
};

export const fetchSalaryTicketDetails = async (
  params: SalaryTicketDetailParams,
): Promise<SalaryTicketDetailResponse> => {
  await delay(240);
  const tickets = filterTicketsByRange(params.startDate, params.endDate);
  const grouped = new Map<string, SalaryTicketDetailRecord>();
  tickets.forEach((ticket) => {
    const employeeId = ticket.workerId ? String(ticket.workerId) : 'unknown';
    const employee = employeeLookup.get(employeeId);
    const agg = grouped.get(employeeId) ?? {
      employeeId,
      employeeName: employee?.name ?? `工人${employeeId}`,
      department: employee?.department ?? '计件工序',
      ticketCount: 0,
      totalQuantity: 0,
      settledAmount: 0,
      unsettledAmount: 0,
      totalAmount: 0,
      lastScanAt: undefined,
    };
    agg.ticketCount += 1;
    agg.totalQuantity += ticket.quantity ?? 0;
    const amount = ticket.amount ?? 0;
    agg.totalAmount += amount;
    if (ticket.status === 'SETTLED') {
      agg.settledAmount += amount;
    } else {
      agg.unsettledAmount += amount;
    }
    if (!agg.lastScanAt || (ticket.recordedAt && ticket.recordedAt > agg.lastScanAt)) {
      agg.lastScanAt = ticket.recordedAt;
    }
    grouped.set(employeeId, agg);
  });

  const list = Array.from(grouped.values()).sort((a, b) => b.totalAmount - a.totalAmount);
  const start = (params.page - 1) * params.pageSize;
  const paged = list.slice(start, start + params.pageSize);
  return {
    list: paged,
    total: list.length,
    page: params.page,
    pageSize: params.pageSize,
  };
};

const filterTicketsByRange = (startDate?: string, endDate?: string) => {
  const start = startDate ? Date.parse(startDate) : undefined;
  const end = endDate ? Date.parse(endDate) : undefined;
  return Object.entries(ticketDataset).flatMap(([employeeId, records]) =>
    records.map((record) => ({ ...record, workerId: employeeId })),
  ).filter((ticket) => {
    if (!ticket.recordedAt) {
      return true;
    }
    const timestamp = Date.parse(ticket.recordedAt);
    if (Number.isNaN(timestamp)) {
      return true;
    }
    if (start && timestamp < start) {
      return false;
    }
    if (end && timestamp > end + 24 * 60 * 60 * 1000) {
      return false;
    }
    return true;
  });
};

export const applySalaryAdjustments = async (
  payload: SalaryBatchAdjustPayload,
): Promise<{ success: boolean }> => {
  await delay(200);
  dataset.forEach((record) => {
    if (payload.employeeIds.includes(record.id)) {
      record.otherAmount += payload.adjustment;
      record.totalAmount += payload.adjustment;
    }
  });
  return { success: true };
};

export const sendSalaryPayslips = async (
  payload: SalaryPayslipSendPayload,
): Promise<SalaryPayslipSendResult> => {
  await delay(260);
  const targeted = dataset.filter((record) => payload.employeeIds.includes(record.id));
  const records: SalaryPayslipRecord[] = targeted.map((record) => ({
    employeeId: record.id,
    employeeName: record.name,
    settledAmount: record.settledAmount,
    unsettledAmount: record.unsettledAmount,
    adjustmentAmount: record.otherAmount,
    totalAmount: record.totalAmount,
  }));
  const sentAt = new Date().toISOString();
  targeted.forEach((record) => {
    payslipLogs.unshift({
      id: `log-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      employeeId: record.id,
      employeeName: record.name,
      startDate: payload.startDate ?? meta.defaultRange.start,
      endDate: payload.endDate ?? meta.defaultRange.end,
      settledAmount: record.settledAmount,
      unsettledAmount: record.unsettledAmount,
      adjustmentAmount: record.otherAmount,
      totalAmount: record.totalAmount,
      status: 'SENT',
      message: 'Mock 推送成功',
      requestedBy: '系统',
      sentAt,
    });
  });
  return {
    sentCount: records.length,
    records,
  };
};
