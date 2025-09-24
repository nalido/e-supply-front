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
  quantityLabel: string;
  quantityValue: string;
  tags?: string[];
  actions?: Array<{ key: string; label: string }>;
  progress: FactoryOrderProgress[];
};

export type FactoryOrderDataset = {
  metrics: FactoryOrderMetric[];
  orders: FactoryOrderItem[];
};
