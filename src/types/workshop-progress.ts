export type WorkshopStageKey = 'cutting' | 'sewing' | 'finishing' | 'packaging' | 'warehousing';

export type WorkshopStageStatus = 'not_started' | 'in_progress' | 'completed' | 'delayed';

export type WorkshopStageProgress = {
  key: WorkshopStageKey;
  label: string;
  completed: number;
  total: number;
  status: WorkshopStageStatus;
};

export type WorkshopOrderStatus = 'new' | 'in_progress' | 'delayed' | 'completed';

export type WorkshopProgressOrder = {
  id: string;
  orderNo: string;
  styleNo: string;
  styleName: string;
  customer: string;
  bedNo?: string;
  remark?: string;
  colorSizeSummary: string;
  orderDate: string;
  deliveryDate: string;
  thumbnail: string;
  orderQuantity: number;
  cuttingQuantity: number;
  status: WorkshopOrderStatus;
  statusLabel: string;
  stages: WorkshopStageProgress[];
};

export type WorkshopProgressSummary = {
  totalOrders: number;
  delayedOrders: number;
  completedOrders: number;
  inProductionOrders: number;
};

export type WorkshopProgressDataset = {
  summary: WorkshopProgressSummary;
  orders: WorkshopProgressOrder[];
};
