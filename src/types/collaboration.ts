export type IncomingOrderStatus = '待接单' | '生产中' | '待发货' | '已完结' | '已拒绝';

export type IncomingOrder = {
  id: string;
  orderNo: string;
  clientName: string;
  styleCode: string;
  styleName: string;
  styleImage: string;
  status: IncomingOrderStatus;
  dispatchDate: string;
  deliveryDate: string;
  shippedQuantity: number;
  totalQuantity: number;
  receiptConfirmed: boolean;
  defects: number;
  memo?: string;
};

export type IncomingOrderListParams = {
  status?: IncomingOrderStatus;
  clientName?: string;
  keyword?: string;
  page?: number;
  pageSize?: number;
};

export type IncomingOrderShipmentPayload = {
  quantity: number;
  logisticsCompany?: string;
  trackingNo?: string;
  remark?: string;
};

export type OutsourceOrderStatus = '已完结' | '已取消';

export type OutsourceOrder = {
  id: string;
  orderNo: string;
  partnerName: string;
  styleCode: string;
  styleName: string;
  styleImage: string;
  status: OutsourceOrderStatus;
  shipDate: string;
  expectedReturnDate: string;
  receivedQuantity: number;
  totalQuantity: number;
  defects: number;
  materialPending?: boolean;
  remark?: string;
};

export type OutsourceOrderListParams = {
  status?: OutsourceOrderStatus | '全部';
  keyword?: string;
  page?: number;
  pageSize?: number;
};

export type OutsourceReceiptPayload = {
  receivedQuantity: number;
  defectQuantity?: number;
  remark?: string;
};

export type OutsourceMaterialRequestPayload = {
  requestQuantity: number;
  materialRemark?: string;
};
