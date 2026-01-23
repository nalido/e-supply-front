export type SequentialProcessStageStatus = 'completed' | 'inProgress' | 'pending';

export interface SequentialProcessStage {
  sequence: number;
  processId?: string;
  processName: string;
  quantity: number;
  ticketCount: number;
  workerCount: number;
  progressPercent: number;
  status: SequentialProcessStageStatus;
  firstRecordedAt?: string | null;
}

export interface SequentialProcessRecord {
  id: string;
  orderNumber: string;
  styleNumber: string;
  styleName: string;
  customer?: string;
  plannedQuantity: number;
  totalQuantity: number;
  progressStatus: SequentialProcessStageStatus;
  firstRecordedAt?: string | null;
  lastRecordedAt?: string | null;
  stages: SequentialProcessStage[];
}

export interface SequentialProcessListParams {
  page: number;
  pageSize: number;
  keyword?: string;
  startDate?: string;
  endDate?: string;
  status?: SequentialProcessStageStatus;
}

export interface SequentialProcessListResponse {
  list: SequentialProcessRecord[];
  total: number;
}

export interface SequentialProcessExportParams {
  keyword?: string;
  startDate?: string;
  endDate?: string;
  status?: SequentialProcessStageStatus;
}
