export type QualityInspectionStatus = 'passed' | 'failed' | 'rework';

export type QualityExceptionStatus = 'none' | 'pending' | 'resolved';

export type QualityControlRecord = {
  id: string;
  workOrderId: string;
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
  inspectorId?: string;
  exceptionStatus?: QualityExceptionStatus;
  exceptionNote?: string;
  exceptionHandledBy?: string;
  exceptionHandledAt?: string;
};

export type QualityDisposition = 'accepted' | 'rework' | 'scrap';

export type QualityControlListParams = {
  page: number;
  pageSize: number;
  keyword?: string;
  workOrderId?: string;
  status?: QualityInspectionStatus | 'all';
  inspectorId?: string;
  startDate?: string;
  endDate?: string;
};

export type QualityControlListResponse = {
  list: QualityControlRecord[];
  total: number;
  page: number;
  pageSize: number;
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

export type QualityControlCreatePayload = {
  workOrderId: string;
  inspectorId: string;
  qcDate: string;
  inspectedQty: number;
  passedQty: number;
  failedQty: number;
  defectReason?: string;
  disposition: QualityDisposition;
};

export type QualityExceptionResolvePayload = {
  note?: string;
};

export type QualityExceptionLog = {
  id: string;
  status: QualityExceptionStatus;
  note?: string;
  handledBy?: string;
  handledByName?: string;
  createdAt?: string;
};
