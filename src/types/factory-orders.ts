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
  name: string;
  thumbnail: string;
  customer?: string;
  materialStatus?: string;
  expectedDelivery?: string;
  orderDate?: string;
  quantityLabel: string;
  quantityValue: string;
  tags?: string[];
  actions?: Array<{ key: string; label: string }>;
  progress: FactoryOrderProgress[];
  statusKey: string;
  isCompleted?: boolean;
};

export type FactoryOrderDataset = {
  metrics: FactoryOrderMetric[];
  orders: FactoryOrderItem[];
  table: FactoryOrderTableRow[];
  statusTabs: FactoryOrderStatusSummary[];
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
  customer: string;
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
};
