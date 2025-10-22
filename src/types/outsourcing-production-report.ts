export type OutsourcingOrderStatus = '未开始' | '进行中' | '已完成' | '逾期待收' | '待结算';

export interface OutsourcingProductionOrderInfo {
  imageUrl?: string;
  styleName: string;
  orderNumber: string;
  quantity: number;
}

export interface OutsourcingProductionReportListItem {
  id: string;
  orderInfo: OutsourcingProductionOrderInfo;
  processType: string;
  processPrice: number;
  subcontractor: string;
  dispatchDate: string;
  expectedDelivery: string | null;
  reportedQty: number;
  shippedQty: number;
  onTimeReceived: number;
  overdueReceived: number;
  totalReceived: number;
  actualReceived: number;
  owedQty: number;
  completionRate: number;
  reworkQty: number;
  reworkRate: number;
  defectQty: number;
  defectRate: number;
  orderStatus: OutsourcingOrderStatus;
}

export interface OutsourcingProductionReportListParams {
  page: number;
  pageSize: number;
  subcontractorName?: string;
  keyword?: string;
  processType?: string;
  orderStatus?: OutsourcingOrderStatus | '全部';
  sortBy?: 'owedQty' | 'completionRate' | 'defectRate';
  order?: 'ascend' | 'descend';
}

export interface OutsourcingProductionReportListResponse {
  list: OutsourcingProductionReportListItem[];
  total: number;
}

export interface OutsourcingProductionReportMeta {
  processTypes: string[];
  orderStatuses: OutsourcingOrderStatus[];
}

export interface OutsourcingSubcontractorStat {
  name: string;
  wip: number;
}
