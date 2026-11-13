export type MaterialStockType = 'fabric' | 'accessory';

export type MaterialStockTab = {
  label: string;
  value: MaterialStockType;
};

export type MaterialStockWarehouse = {
  id: string;
  name: string;
};

export type MaterialStockListItem = {
  id: string;
  materialId: string;
  materialMinimumSpecificationId?: string;
  materialMinimumSpecificationLabel?: string;
  materialMinimumSpecificationColor?: string;
  legacySpecification: boolean;
  imageUrl?: string;
  materialCode: string;
  materialName: string;
  color?: string;
  colorStocks: Array<{
    color: string;
    quantity: number;
  }>;
  specification?: string;
  unit: string;
  warehouseId: string;
  warehouseName: string;
  stockQty: number;
  availableQty: number;
  inTransitQty: number;
  remark?: string;
};

export type MaterialStockListSummary = {
  stockQtyTotal: number;
  availableQtyTotal: number;
  inTransitQtyTotal: number;
  stockAmountTotal: number;
};

export type MaterialStockAdvancedFilters = {
  materialCode?: string;
  materialName?: string;
  color?: string;
  specification?: string;
  unit?: string;
  warehouseId?: string;
  stockQtyMin?: number;
  stockQtyMax?: number;
  availableQtyMin?: number;
  availableQtyMax?: number;
  inTransitQtyMin?: number;
  inTransitQtyMax?: number;
  remark?: string;
};

export type MaterialStockListParams = MaterialStockAdvancedFilters & {
  page: number;
  pageSize: number;
  materialType: MaterialStockType;
  onlyInStock?: boolean;
  keyword?: string;
};

export type MaterialStockExportParams = Omit<MaterialStockListParams, 'page' | 'pageSize'> & {
  warehouseName?: string;
};

export type MaterialStockListResponse = {
  list: MaterialStockListItem[];
  total: number;
};

export type MaterialStockExportResponse = {
  fileUrl: string;
  exported: number;
};

export type MaterialStockMeta = {
  materialTabs: MaterialStockTab[];
  warehouses: MaterialStockWarehouse[];
};

export type MaterialIssueSpecificationOption = {
  id: string;
  label?: string;
  color?: string;
  specification?: string;
  width?: string;
  grammage?: string;
};

export type MaterialMovementDirection = 'in' | 'out' | 'adjust';

export type MaterialMovementRecord = {
  id: string;
  direction: MaterialMovementDirection;
  directionLabel: string;
  movementType: string;
  movementLabel: string;
  documentType?: string;
  documentId?: string;
  documentNo?: string;
  workOrderId?: string;
  productionOrderNo?: string;
  quantity: number;
  balanceAfter: number;
  unit: string;
  warehouseName?: string;
  counterpart?: string;
  occurredAt?: string;
  remark?: string;
};

export type MaterialMovementListParams = {
  materialId: string;
  materialMinimumSpecificationId?: string;
  warehouseId?: string;
  startDate?: string;
  endDate?: string;
  page: number;
  pageSize: number;
};

export type MaterialMovementSummary = {
  stockQty: number;
  availableQty: number;
  inTransitQty: number;
  openingQty: number;
  inboundQty: number;
  outboundQty: number;
  closingQty: number;
};

export type MaterialMovementListResponse = {
  list: MaterialMovementRecord[];
  total: number;
  summary: MaterialMovementSummary;
};
