export type FinishedGoodsPendingReceiptOrderType = 'production' | 'outsourcing';

export type FinishedGoodsPendingReceiptGrouping = 'order' | 'spec';

export type FinishedGoodsPendingReceiptFilters = {
  includeCompleted?: boolean;
  orderType?: FinishedGoodsPendingReceiptOrderType;
  keywordOrderOrStyle?: string;
  keywordCustomer?: string;
  keywordSku?: string;
};

export type FinishedGoodsPendingReceiptListParams = FinishedGoodsPendingReceiptFilters & {
  page: number;
  pageSize: number;
};

export type FinishedGoodsPendingReceiptListSummary = {
  orderedQty: number;
  producedQty: number;
  pendingQty: number;
  receivedQty: number;
};

export type FinishedGoodsPendingReceiptRecord = {
  id: string;
  imageUrl: string;
  factoryOrderNo: string;
  orderType: FinishedGoodsPendingReceiptOrderType;
  orderTypeLabel: string;
  customerName: string;
  styleNo: string;
  styleName: string;
  color: string;
  size: string;
  sku: string;
  orderedQty: number;
  producedQty: number;
  pendingQty: number;
  receivedQty: number;
};

export type FinishedGoodsPendingReceiptListResponse = {
  list: FinishedGoodsPendingReceiptRecord[];
  total: number;
  summary: FinishedGoodsPendingReceiptListSummary;
};

export type FinishedGoodsPendingReceiptWarehouse = {
  id: string;
  name: string;
};

export type FinishedGoodsPendingReceiptOrderTypeOption = {
  value: FinishedGoodsPendingReceiptOrderType;
  label: string;
};

export type FinishedGoodsPendingReceiptMeta = {
  warehouses: FinishedGoodsPendingReceiptWarehouse[];
  orderTypes: FinishedGoodsPendingReceiptOrderTypeOption[];
};

export type FinishedGoodsPendingReceiptReceiveItem = {
  id: string;
  receiptQty: number;
};

export type FinishedGoodsPendingReceiptReceivePayload = {
  warehouseId: string;
  items: FinishedGoodsPendingReceiptReceiveItem[];
  remark?: string;
};
