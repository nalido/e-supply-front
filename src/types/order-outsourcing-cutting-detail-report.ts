export type OutsourcingCuttingDetailGroupKey =
  | 'factoryOrder'
  | 'status'
  | 'subcontractor'
  | 'sku'
  | 'cuttingDate';

export type OutsourcingCuttingDetailRecord = {
  id: string;
  orderNumber: string;
  status: string;
  subcontractor: string;
  styleNumber: string;
  styleName: string;
  color: string;
  size: string;
  unitPrice: number;
  cuttingDate: string;
  quantity: number;
  amount: number;
};

export type OutsourcingCuttingDetailListParams = {
  groupBy: OutsourcingCuttingDetailGroupKey[];
  page: number;
  pageSize: number;
};

export type OutsourcingCuttingDetailListResponse = {
  list: OutsourcingCuttingDetailRecord[];
  total: number;
  summary: {
    quantity: number;
    amount: number;
  };
};
