export type CuttingTaskColor = {
  name: string;
  image: string;
  fabric?: string;
};

export type CuttingTaskActionKey = 'create-sheet' | 'edit' | 'view';

export type CuttingTask = {
  id: string;
  workOrderId?: number;
  workOrderStatus?: 'NOT_STARTED' | 'IN_PROGRESS' | 'PAUSED' | 'COMPLETED' | string;
  bedNumber?: string;
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

export type CuttingSheetCell = {
  size: string;
  orderedQty: number;
  completedQty: number;
  pendingQty: number;
};

export type CuttingSheetColorRow = {
  color: string;
  cells: CuttingSheetCell[];
  orderedSubtotal: number;
  completedSubtotal: number;
  pendingSubtotal: number;
};

export type CuttingSheetDetail = {
  workOrderId: number;
  productionOrderId: number;
  orderCode: string;
  styleCode?: string;
  styleName?: string;
  customer?: string;
  status: string;
  bedNumber?: string;
  cutterId?: number;
  plannedFabricQty?: number;
  warehouseId?: number;
  warehouseName?: string;
  materialId?: number;
  materialCode?: string;
  materialName?: string;
  materialUnit?: string;
  startActualFabricQty?: number;
  completeActualFabricQty?: number;
  startedAt?: string;
  completedAt?: string;
  plannedQty: number;
  completedQty: number;
  sizes: string[];
  rows: CuttingSheetColorRow[];
  bedRecords?: Array<{
    bedNumber: string;
    recordedAt?: string;
    actualFabricQty?: number;
    totalQty: number;
    items: Array<{
      color: string;
      size: string;
      quantity: number;
    }>;
  }>;
  materialDocuments?: Array<{
    documentCategory: 'ISSUE' | 'RETURN' | string;
    documentId: number;
    documentNo: string;
    documentTypeLabel: string;
    quantity: number;
    issuedAt?: string;
    jumpPath?: string;
  }>;
};

export type CuttingTaskDataset = {
  summary: CuttingTaskMetric[];
  list: CuttingTask[];
  total: number;
  page: number;
  pageSize: number;
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
  page: number;
  pageSize: number;
};
