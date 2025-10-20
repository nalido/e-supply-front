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
  imageUrl?: string;
  materialCode: string;
  materialName: string;
  color?: string;
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
};

export type MaterialStockListParams = {
  page: number;
  pageSize: number;
  materialType: MaterialStockType;
  onlyInStock?: boolean;
  keywordRemark?: string;
  keywordOrderStyle?: string;
};

export type MaterialStockListResponse = {
  list: MaterialStockListItem[];
  total: number;
  summary: MaterialStockListSummary;
};

export type MaterialStockMeta = {
  materialTabs: MaterialStockTab[];
  warehouses: MaterialStockWarehouse[];
};
