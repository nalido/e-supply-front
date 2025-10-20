export type MaterialIssueType = 'fabric' | 'accessory';

export type MaterialIssueTab = {
  label: string;
  value: MaterialIssueType;
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
};
