export type ProcessTypeChargeMode = 'piecework' | 'hourly' | 'stage';

export type ProcessTypeStatus = 'active' | 'inactive';

export type ProcessType = {
  id: string;
  tenantId?: string;
  name: string;
  code: string;
  chargeMode: ProcessTypeChargeMode;
  defaultWage: number;
  unit: string;
  description?: string;
  status: ProcessTypeStatus;
  createdAt?: string;
  updatedAt?: string;
};

export type ProcessTypeDataset = {
  list: ProcessType[];
  total: number;
};

export type ProcessTypeListParams = {
  page: number;
  pageSize: number;
  keyword?: string;
  status?: ProcessTypeStatus;
};

export type CreateProcessTypePayload = {
  name: string;
  code: string;
  chargeMode: ProcessTypeChargeMode;
  defaultWage: number;
  unit: string;
  description?: string;
  status?: ProcessTypeStatus;
};

export type UpdateProcessTypePayload = CreateProcessTypePayload;
