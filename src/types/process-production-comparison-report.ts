export type ProcessProductionDisplayMode = 'completed' | 'remaining';

export type ProcessProductionLot = {
  id: string;
  orderNumber: string;
  styleNumber: string;
  styleName: string;
  bedNumber: string;
  remark?: string;
  color: string;
  cuttingDate: string;
  quantity: number;
};

export type ProcessProductionLotListParams = {
  page: number;
  pageSize: number;
  keyword?: string;
};

export type ProcessProductionLotListResponse = {
  list: ProcessProductionLot[];
  total: number;
};

export type ProcessProductionStep = {
  key: string;
  name: string;
  targetQuantity: number;
  completedQuantity: number;
  wipQuantity?: number;
  bottleneck?: boolean;
};

export type ProcessProductionSkuCell = {
  processKey: string;
  completed: number;
  remaining: number;
  rework?: number;
};

export type ProcessProductionSkuRecord = {
  id: string;
  ticketNo: string;
  color: string;
  size: string;
  totalQuantity: number;
  processMap: Record<string, ProcessProductionSkuCell>;
};

export type ProcessProductionDetailParams = {
  lotId: string;
  page: number;
  pageSize: number;
  ticketKeyword?: string;
  colorKeyword?: string;
  sizeKeyword?: string;
};

export type ProcessProductionDetailResponse = {
  processes: ProcessProductionStep[];
  list: ProcessProductionSkuRecord[];
  total: number;
  summary: {
    totalSku: number;
    totalQuantity: number;
    totalCompleted: number;
    bottleneckProcessKey?: string;
  };
};

export type ProcessProductionExportParams = {
  lotId: string;
  ticketKeyword?: string;
  colorKeyword?: string;
  sizeKeyword?: string;
  mode?: ProcessProductionDisplayMode;
};
