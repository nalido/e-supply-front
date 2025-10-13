export type CuttingTaskColor = {
  name: string;
  image: string;
  fabric?: string;
};

export type CuttingTaskActionKey = 'create-sheet' | 'edit' | 'view';

export type CuttingTask = {
  id: string;
  styleCode: string;
  styleName: string;
  orderCode: string;
  orderDate: string;
  orderedQuantity: number;
  cutQuantity: number;
  pendingQuantity: number;
  unit: string;
  thumbnail: string;
  colors: CuttingTaskColor[];
  customer?: string;
  fabricSummary?: string;
  priorityTag?: string;
  remarks?: string;
  scheduleDate?: string;
};

export type CuttingTaskMetric = {
  key: string;
  label: string;
  value: string;
  description?: string;
  tone?: 'default' | 'warning';
};

export type CuttingTaskDataset = {
  summary: CuttingTaskMetric[];
  list: CuttingTask[];
  total: number;
};
