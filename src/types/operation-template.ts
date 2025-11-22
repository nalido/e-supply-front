import type { ProcessType } from './process-type';

export type OperationTemplateOperation = {
  id: string;
  sequence: number;
  unitPrice: number;
  remarks?: string;
  processCatalog: {
    id: string;
    code: string;
    name: string;
    chargeMode?: ProcessType['chargeMode'];
    defaultWage?: number;
    unit?: string;
  };
};

export type OperationTemplate = {
  id: string;
  tenantId?: string;
  name: string;
  defaultTemplate: boolean;
  operations: OperationTemplateOperation[];
  updatedAt?: string;
  createdAt?: string;
};

export type OperationTemplateListParams = {
  page: number;
  pageSize: number;
  keyword?: string;
};

export type OperationTemplateDataset = {
  list: OperationTemplate[];
  total: number;
};

export type SaveOperationTemplatePayload = {
  name: string;
  defaultTemplate?: boolean;
  operations: Array<{
    processCatalogId: string;
    unitPrice: number;
    remarks?: string;
    sequence?: number;
  }>;
};

export type UpdateOperationTemplatePayload = SaveOperationTemplatePayload;
