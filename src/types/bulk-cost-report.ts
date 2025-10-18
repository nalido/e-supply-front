export type BulkCostTrendDataset = {
  labels: string[];
  productionCost: number[];
  procurementCost: number[];
};

export type BulkCostCustomerSlice = {
  id: string;
  name: string;
  value: number;
};

export interface BulkCostAggregation {
  costTrend: BulkCostTrendDataset;
  customerProportion: {
    total: number;
    customers: BulkCostCustomerSlice[];
  };
}

export interface BulkCostDetailValue {
  procurement: number;
  production: number;
}

export interface BulkCostOrderItem {
  id: string;
  imageUrl: string;
  styleCode: string;
  styleName: string;
  orderNumber: string;
  orderStatus: string;
  customerId: string;
  customerName: string;
  calculatedQty: number;
  receivedQty: number;
  unitPrice: number;
  orderDate: string;
  receiptDate: string;
  costs: Record<string, BulkCostDetailValue>;
}

export interface BulkCostListParams {
  keyword?: string;
  orderStartDate?: string;
  orderEndDate?: string;
  receiptStartDate?: string;
  receiptEndDate?: string;
  customerId?: string;
  page: number;
  pageSize: number;
}

export interface BulkCostListResponse {
  list: BulkCostOrderItem[];
  total: number;
}
