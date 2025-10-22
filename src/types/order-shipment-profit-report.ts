export type OrderShipmentProfitTrend = {
  labels: string[];
  shipmentAmount: number[];
  totalProfit: number[];
};

export type OrderShipmentProfitCustomerShare = {
  name: string;
  value: number;
};

export type OrderShipmentProfitAggregation = {
  profitTrend: OrderShipmentProfitTrend;
  customerProportion: {
    total: number;
    customers: OrderShipmentProfitCustomerShare[];
  };
};

export type OrderShipmentProfitRecord = {
  id: string;
  orderNumber: string;
  customer: string;
  styleNumber: string;
  styleName: string;
  shipmentDate: string;
  shippedQty: number;
  shipmentAmount: number;
  cost: number;
  profit: number;
  profitMargin: number;
};

export type OrderShipmentProfitListParams = {
  page: number;
  pageSize: number;
  keyword?: string;
};

export type OrderShipmentProfitListResponse = {
  list: OrderShipmentProfitRecord[];
  total: number;
  summary: {
    shipmentAmount: number;
    profit: number;
  };
};
