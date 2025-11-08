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
  employeeIds: string[];
  adjustment: number;
  reason?: string;
};
