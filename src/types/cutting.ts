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

export type CuttingReportColorDetail = {
  name: string;
  quantity: number;
};

export type CuttingReportSizeDetail = {
  size: string;
  quantity: number;
};

export type CuttingReportRecord = {
  id: string;
  date: string;
  orderCode: string;
  styleCode: string;
  styleName: string;
  orderRemark?: string;
  orderQuantity: number;
  bedNumber: string;
  cuttingRemark?: string;
  colorDetails: CuttingReportColorDetail[];
  sizeDetails: CuttingReportSizeDetail[];
  cuttingQuantity: number;
  ticketQuantity: number;
  cutter: string;
  thumbnail: string;
};

export type CuttingReportSummary = {
  cuttingQuantity: number;
  ticketQuantity: number;
};

export type CuttingReportDataset = {
  list: CuttingReportRecord[];
  total: number;
  summary: CuttingReportSummary;
};
