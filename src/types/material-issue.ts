export type MaterialIssueType = 'fabric' | 'accessory';
export type MaterialIssueStatus = 'pending' | 'issued' | 'canceled';

export type MaterialIssueTab = {
  label: string;
  value: MaterialIssueType;
};

export type MaterialIssueStatusOption = {
  value: MaterialIssueStatus;
  label: string;
};

export type MaterialIssueRecord = {
  id: string;
  poNumber: string;
  warehouseName: string;
  materialName: string;
  materialType: string;
  imageUrl?: string;
  color?: string;
  width?: string;
  weight?: string;
  unit: string;
  issueQty: number;
  packageInfo?: string;
  dyeLotNo?: string;
  batchNo?: string;
  unitPrice: number;
  amount: number;
  supplierName?: string;
  supplierModel?: string;
  supplierColorNo?: string;
  processorName?: string;
  sourceOrderNo?: string;
  dispatchOrderNo?: string;
  issueType: string;
  recipient: string;
  issueDate: string;
  remark?: string;
  status: MaterialIssueStatus;
  statusLabel: string;
};

export type MaterialIssueListParams = {
  page: number;
  pageSize: number;
  materialType: MaterialIssueType;
  keyword?: string;
};

export type MaterialIssueListResponse = {
  list: MaterialIssueRecord[];
  total: number;
  summary: {
    issueQtyTotal: number;
    amountTotal: number;
  };
};

export type MaterialIssueMeta = {
  tabs: MaterialIssueTab[];
  statusOptions: MaterialIssueStatusOption[];
};

export type MaterialIssueCreateLine = {
  materialId: string;
  quantity: number;
  unit?: string;
};

export type MaterialIssueCreatePayload = {
  warehouseId: string;
  issueType?: string;
  materialType?: MaterialIssueType;
  workOrderId?: string;
  recipientId?: string;
  issuedAt?: string;
  remark?: string;
  lines: MaterialIssueCreateLine[];
};

export type MaterialIssueCreateResponse = {
  issueId: string;
  issueNo: string;
  status: MaterialIssueStatus;
  statusLabel: string;
  lineCount: number;
};

export type MaterialIssueStatusUpdatePayload = {
  lineIds: string[];
  status: MaterialIssueStatus;
};

export type MaterialIssueStatusUpdateResult = {
  success: boolean;
  affectedCount: number;
};
