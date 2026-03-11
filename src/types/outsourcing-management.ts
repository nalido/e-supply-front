export type OutsourcingTaskStatus = '待发出' | '已发出' | '已接收' | '已完成' | '已结算' | '已取消';

export interface OutsourcingManagementListItem {
  id: string;
  status: OutsourcingTaskStatus;
  outgoingNo: string;
  orderNo: string;
  styleNo: string;
  styleName: string;
  processorId: string;
  processorName: string;
  processStep: string;
  dispatchedQty: number;
  receivedQty: number;
  attritionRate: number;
  unitPrice: number;
  totalCost: number;
  dispatchDate: string;
  expectedCompletionDate?: string | null;
}

export interface OutsourcingManagementProcessorOption {
  id: string;
  name: string;
}

export interface OutsourcingManagementMeta {
  processors: OutsourcingManagementProcessorOption[];
}

export interface OutsourcingManagementListParams {
  page: number;
  pageSize: number;
  orderNo?: string;
  styleKeyword?: string;
  processorId?: string;
  dispatchDateStart?: string;
  dispatchDateEnd?: string;
  statusKey?: string;
  selectedOrderIds?: string[];
}

export interface OutsourcingManagementListResponse {
  list: OutsourcingManagementListItem[];
  total: number;
  summary?: {
    totalOrders: number;
    inProgressOrders: number;
    completedOrders: number;
    dispatchedQty: number;
    goodReceivedQty: number;
  };
}

export interface OutsourcingReceivePayload {
  orderId: string;
  receivedQty: number;
  defectQty?: number;
  reworkQty?: number;
  receivedAt: string;
  remark?: string;
}

export interface OutsourcingOrderDetail {
  id: string;
  status: OutsourcingTaskStatus;
  outgoingNo: string;
  orderNo: string;
  styleNo: string;
  styleName: string;
  processorName: string;
  processStep: string;
  dispatchQty: number;
  receivedQty: number;
  goodReceivedQty: number;
  progressPercent: number;
  attritionRate: number;
  unitPrice: number;
  totalCost: number;
  dispatchDate?: string;
  expectedCompletionDate?: string;
  createdAt?: string;
  updatedAt?: string;
  workOrder?: OutsourcingWorkOrderSummary;
  productionOrder?: OutsourcingProductionOrderSummary;
  receipts: OutsourcingOrderReceipt[];
  materialRequests: OutsourcingMaterialRequestRecord[];
}

export interface OutsourcingWorkOrderSummary {
  id: string;
  plannedQty: number;
  completedQty: number;
  status?: string;
  remark?: string;
}

export interface OutsourcingProductionOrderSummary {
  id: string;
  orderNo: string;
  totalQuantity: number;
  completedQuantity: number;
  expectedDelivery?: string;
}

export interface OutsourcingOrderReceipt {
  id: string;
  receivedQty: number;
  defectQty: number;
  reworkQty: number;
  goodQty: number;
  receivedAt?: string;
  remark?: string;
}

export interface OutsourcingMaterialRequestRecord {
  id: string;
  materialId?: string;
  requestQuantity: number;
  requestedAt?: string;
  remark?: string;
}
