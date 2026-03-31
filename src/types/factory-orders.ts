export type FactoryOrderMetric = {
  key: string;
  label: string;
  primaryValue: string;
  secondaryValue?: string;
  tone?: 'default' | 'warning';
};

export type FactoryOrderProgress = {
  key: string;
  label: string;
  value: string;
  date?: string;
  percent?: number;
  status?: 'default' | 'success' | 'warning' | 'danger';
  muted?: boolean;
};

export type FactoryOrderItem = {
  id: string;
  code: string;
  styleCode?: string;
  name: string;
  thumbnail: string;
  materialStatus?: string;
  expectedDelivery?: string;
  cuttingDate?: string;
  firstDeliveryDate?: string;
  orderDate?: string;
  quantityLabel: string;
  quantityValue: string;
  orderedQuantity?: number;
  cuttingCompletedQuantity?: number;
  sewingCompletedQuantity?: number;
  deliveredQuantity?: number;
  tags?: string[];
  actions?: Array<{ key: string; label: string }>;
  progress: FactoryOrderProgress[];
  statusKey: string;
  isCompleted?: boolean;
  deletable?: boolean;
  deleteBlockedReason?: string;
};

export type FactoryOrderDataset = {
  metrics: FactoryOrderMetric[];
  orders: FactoryOrderItem[];
  table: FactoryOrderTableRow[];
  statusTabs: FactoryOrderStatusSummary[];
};

export type FactoryOrderDetailSummary = {
  id: string;
  orderNo: string;
  styleId?: number;
  totalQuantity?: number;
  expectedDelivery?: string;
  status?: string;
  materialStatus?: string;
  merchandiserId?: number;
  factoryId?: number;
  remarks?: string;
};

export type FactoryOrderStatusSummary = {
  key: string;
  label: string;
  styles: number;
  orders: number;
  quantity: number;
};

export type FactoryOrderTableRow = {
  id: string;
  orderCode: string;
  styleCode: string;
  styleName: string;
  orderQuantity: number;
  materialStatus: string;
  productionStage: string;
  productionPercent: number;
  expectedDelivery: string;
  merchandiser: string;
  statusKey: string;
  isCompleted?: boolean;
  orderDate?: string;
  deletable?: boolean;
  deleteBlockedReason?: string;
};
