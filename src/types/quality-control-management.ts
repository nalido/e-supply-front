export type QualityInspectionStatus = 'passed' | 'failed' | 'rework';

export type QualityControlRecord = {
  id: string;
  qcDate: string;
  orderNumber: string;
  styleNumber: string;
  styleName: string;
  processName: string;
  ticketNo: string;
  worker: string;
  inspectedQty: number;
  passedQty: number;
  failedQty: number;
  defectReason?: string;
  disposition: 'accepted' | 'rework' | 'scrap';
  inspector: string;
};

export type QualityControlListParams = {
  page: number;
  pageSize: number;
  keyword?: string;
  status?: QualityInspectionStatus | 'all';
  inspector?: string;
  startDate?: string;
  endDate?: string;
};

export type QualityControlListResponse = {
  list: QualityControlRecord[];
  total: number;
  summary: {
    inspectedQty: number;
    passedQty: number;
    failedQty: number;
    reworkQty: number;
  };
};

export type QualityControlMeta = {
  statusOptions: Array<{ label: string; value: QualityInspectionStatus | 'all' }>;
  inspectorOptions: Array<{ label: string; value: string }>;
  defaultStatus: QualityInspectionStatus | 'all';
};

export type QualityControlExportParams = Omit<QualityControlListParams, 'page' | 'pageSize'>;
