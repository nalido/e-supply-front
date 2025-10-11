export type OperationTemplateOperation = {
  id: string;
  name: string;
  price: number;
  remarks?: string;
};

export type OperationTemplate = {
  id: string;
  name: string;
  operations: OperationTemplateOperation[];
  updatedAt: string;
  createdAt: string;
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
  operations: Array<{
    name: string;
    price: number;
    remarks?: string;
  }>;
};

export type UpdateOperationTemplatePayload = SaveOperationTemplatePayload;
