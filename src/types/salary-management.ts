export type SalaryDepartmentOption = {
  label: string;
  value: string;
};

export type SalarySettlementSummary = {
  settledAmount: number;
  unsettledAmount: number;
  otherAmount: number;
  totalAmount: number;
  settledCount: number;
  unsettledCount: number;
};

export type SalaryEmployeeRecord = {
  id: string;
  name: string;
  department: string;
  settledAmount: number;
  unsettledAmount: number;
  otherAmount: number;
  totalAmount: number;
  lastSettlementDate?: string;
};

export type SalaryListParams = {
  page: number;
  pageSize: number;
  startDate?: string;
  endDate?: string;
  department?: string;
  keyword?: string;
};

export type SalaryListResponse = {
  list: SalaryEmployeeRecord[];
  total: number;
  summary: SalarySettlementSummary;
};

export type SalaryMeta = {
  departmentOptions: SalaryDepartmentOption[];
  defaultRange: {
    start: string;
    end: string;
  };
};

export type SalarySettlePayload = {
  startDate: string;
  endDate: string;
  department?: string;
  employeeIds?: string[];
};

export type SalaryBatchAdjustPayload = {
  startDate: string;
  endDate: string;
  employeeIds: string[];
  adjustment: number;
  reason?: string;
};

export type SalaryPayslipRecord = {
  employeeId: string;
  employeeName: string;
  settledAmount: number;
  unsettledAmount: number;
  adjustmentAmount: number;
  totalAmount: number;
};

export type SalaryPayslipSendPayload = {
  startDate: string;
  endDate: string;
  employeeIds: string[];
};

export type SalaryPayslipSendResult = {
  sentCount: number;
  records: SalaryPayslipRecord[];
};

export type SalaryPayslipStatus = 'SENT' | 'FAILED';

export type SalaryPayslipLogRecord = {
  id: string;
  employeeId: string;
  employeeName: string;
  startDate: string;
  endDate: string;
  settledAmount: number;
  unsettledAmount: number;
  adjustmentAmount: number;
  totalAmount: number;
  status: SalaryPayslipStatus;
  message?: string;
  requestedBy?: string;
  requestedByName?: string;
  sentAt?: string;
};

export type SalaryPayslipLogListParams = {
  startDate?: string;
  endDate?: string;
  status?: SalaryPayslipStatus | 'all';
  keyword?: string;
  page: number;
  pageSize: number;
};

export type SalaryPayslipLogResponse = {
  list: SalaryPayslipLogRecord[];
  total: number;
  page: number;
  pageSize: number;
};

export type SalaryScanStatisticsParams = {
  startDate: string;
  endDate: string;
  department?: string;
  keyword?: string;
};

export type SalaryScanSummary = {
  totalTickets: number;
  totalQuantity: number;
  settledAmount: number;
  unsettledAmount: number;
  totalAmount: number;
};

export type SalaryScanEmployeeRanking = {
  employeeId: string;
  employeeName: string;
  department: string;
  ticketCount: number;
  totalQuantity: number;
  totalAmount: number;
  unsettledAmount: number;
};

export type SalaryScanProcessRanking = {
  processId?: string;
  processName: string;
  ticketCount: number;
  totalQuantity: number;
  totalAmount: number;
};

export type SalaryScanTrendPoint = {
  date?: string;
  totalQuantity: number;
  totalAmount: number;
};

export type SalaryScanStatistics = {
  summary: SalaryScanSummary;
  topEmployees: SalaryScanEmployeeRanking[];
  topProcesses: SalaryScanProcessRanking[];
  trend: SalaryScanTrendPoint[];
};

export type SalaryTicketDetailParams = {
  startDate: string;
  endDate: string;
  department?: string;
  keyword?: string;
  page: number;
  pageSize: number;
};

export type SalaryTicketDetailRecord = {
  employeeId: string;
  employeeName: string;
  department: string;
  ticketCount: number;
  totalQuantity: number;
  settledAmount: number;
  unsettledAmount: number;
  totalAmount: number;
  lastScanAt?: string;
};

export type SalaryTicketDetailResponse = {
  list: SalaryTicketDetailRecord[];
  total: number;
  page: number;
  pageSize: number;
};

export type SalaryTicketRecord = {
  id: string;
  ticketNo: string;
  processName: string;
  recordedAt: string;
  status: 'PENDING' | 'SETTLED' | 'VOIDED';
  quantity: number;
  pieceRate: number;
  amount: number;
  workOrderId?: number;
  productionOrderId?: number;
};

export type SalaryTicketSummary = {
  totalQuantity: number;
  settledAmount: number;
  unsettledAmount: number;
  totalAmount: number;
};

export type SalaryTicketListParams = {
  employeeId: string;
  startDate: string;
  endDate: string;
  page: number;
  pageSize: number;
  status?: 'all' | 'pending' | 'settled' | 'voided';
  keyword?: string;
};

export type SalaryTicketListResponse = {
  list: SalaryTicketRecord[];
  total: number;
  page: number;
  pageSize: number;
  summary: SalaryTicketSummary;
};
