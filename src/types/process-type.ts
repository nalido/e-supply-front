export type ProcessTypeCategory = '系统' | '自定义';

export type ProcessTypeChargeMode = '计件' | '计时' | '阶段计费';

export type ProcessTypeStatus = 'active' | 'inactive';

export type ProcessType = {
  id: string;
  name: string;
  code: string;
  category: ProcessTypeCategory;
  chargeMode: ProcessTypeChargeMode;
  defaultWage: number;
  unit: string;
  description?: string;
  isDefault?: boolean;
  status: ProcessTypeStatus;
  updatedAt: string;
  createdBy: string;
  steps?: string[];
};

export type ProcessTypeDataset = {
  list: ProcessType[];
  total: number;
};

export type CreateProcessTypePayload = {
  name: string;
  code: string;
  category: ProcessTypeCategory;
  chargeMode: ProcessTypeChargeMode;
  defaultWage: number;
  unit: string;
  description?: string;
  isDefault?: boolean;
  status?: ProcessTypeStatus;
  createdBy: string;
  steps?: string[];
};

export type UpdateProcessTypePayload = Partial<CreateProcessTypePayload>;
