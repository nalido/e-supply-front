import type { FactoryOrderProgress } from '../../types';

export type ViewMode = 'card' | 'table';
export type OverallStatus = 'all' | 'unfinished' | 'completed';

export type SelectOption = {
  label: string;
  value: number;
  image?: string;
  colors?: string[];
  sizes?: string[];
};

export type ImportRecord = {
  orderNo: string;
  styleId: number;
  merchandiserId?: number;
  factoryId?: number;
  totalQuantity: number;
  expectedDelivery?: string;
  status?: string;
  materialStatus?: string;
  remarks?: string;
};

export type OrderActionSnapshot = {
  orderId: string;
  orderCode: string;
  styleCode?: string;
  styleName?: string;
  expectedDelivery?: string;
  materialStatus?: string;
  orderQuantity?: number;
  productionStage?: string;
  deletable?: boolean;
  deleteBlockedReason?: string;
};

export type CreateQuantityMatrix = Record<string, Record<string, number>>;

export type CreateStyleMaterial = {
  materialId: number;
  materialName: string;
  materialSku: string;
  materialType: 'FABRIC' | 'ACCESSORY' | 'PACKAGING';
  unit: string;
  consumption: number;
  lossRate: number;
};

export type ProgressStatRow = {
  key: string;
  color: string;
  size: string;
  orderedQty: number;
  cuttingQty: number;
  sewingQty: number;
  sewingCompletedQty: number;
};

export type ProgressStatsState = {
  loading: boolean;
  rows: ProgressStatRow[];
};

export type ProgressNodeQuantitySnapshot = {
  cuttingCompletedQty?: number;
  sewingAllocatedQty?: number;
  sewingCompletedQty?: number;
};

export type AllocationQuantityMatrix = Record<string, Record<string, number>>;

export type AllocationHistoryRow = {
  key: string;
  completedAt?: string;
  bedNumber?: string;
  source?: string;
  workOrderId?: number;
  outsourcingOrderId?: number;
  factoryId?: number;
  unitPrice?: number;
  totalQty: number;
  itemSummary: string;
  deletable?: boolean;
  deleteBlockedReason?: string;
  items: Array<{ color: string; size: string; quantity: number }>;
};

export type InOutSummaryRow = {
  key: string;
  color: string;
  size: string;
  totalQty: number;
  pendingQty: number;
  doneQty: number;
};

export type InOutDetailRow = {
  key: string;
  receiptNo: string;
  receiptDate: string;
  warehouseName: string;
  processorName?: string;
  color: string;
  size: string;
  quantity: number;
};

export type CuttingSheetTarget = {
  workOrderId?: number;
  orderCode?: string;
  bedNumber?: string;
};

export type PendingSampleProduceContext = {
  sampleOrderId: string;
  sampleOrderNo?: string;
};

export type ProgressActionModalState = {
  open: boolean;
  submitting: boolean;
  order?: OrderActionSnapshot;
  stage?: FactoryOrderProgress;
};

export type InOutDataState = {
  loading: boolean;
  summaryRows: InOutSummaryRow[];
  detailRows: InOutDetailRow[];
};

export type ImportModalState = {
  open: boolean;
  records: ImportRecord[];
  fileList: import('antd/es/upload/interface').UploadFile[];
  uploading: boolean;
  error?: string;
};
