export type OperationalEfficiencyTimeUnit = 'day' | 'hour';

export type OperationalEfficiencyNodeOption = {
  value: string;
  label: string;
  description?: string;
};

export type OperationalEfficiencyNode = {
  id: string;
  nodeCode: string;
  nodeName: string;
  standardDuration: number;
  timeUnit: OperationalEfficiencyTimeUnit;
  sequence: number;
};

export type OperationalEfficiencyTemplate = {
  id: string;
  name: string;
  isDefault: boolean;
  nodes: OperationalEfficiencyNode[];
  createdAt: string;
  updatedAt: string;
};

export type OperationalEfficiencyListItem = OperationalEfficiencyTemplate & {
  nodeSummary: string;
};

export type OperationalEfficiencyListParams = {
  page: number;
  pageSize: number;
  keyword?: string;
};

export type OperationalEfficiencyListResponse = {
  list: OperationalEfficiencyListItem[];
  total: number;
};

export type OperationalEfficiencyTemplatePayload = {
  name: string;
  isDefault: boolean;
  nodes: Array<{
    nodeCode: string;
    standardDuration: number;
    timeUnit: OperationalEfficiencyTimeUnit;
  }>;
};

export type OperationalEfficiencyMeta = {
  nodeOptions: OperationalEfficiencyNodeOption[];
  timeUnits: Array<{ value: OperationalEfficiencyTimeUnit; label: string }>;
};
