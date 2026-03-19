export type FinishedGoodsStockGrouping = 'order' | 'customer' | 'spec';

export type FinishedGoodsStockWarehouse = {
  id: string;
  name: string;
};

export type FinishedGoodsStockMeta = {
  warehouses: FinishedGoodsStockWarehouse[];
  groupingOptions: { label: string; value: FinishedGoodsStockGrouping }[];
  defaultGrouping: FinishedGoodsStockGrouping[];
};

export type FinishedGoodsStockListParams = {
  page: number;
  pageSize: number;
  onlyInStock: boolean;
  warehouseId?: string;
  keywordSku?: string;
  keywordMixed?: string;
  groupBy: FinishedGoodsStockGrouping[];
};

export type FinishedGoodsStockRecord = {
  id: string;
  imageUrl?: string;
  warehouseId: string;
  warehouseName: string;
  factoryOrderNo?: string;
  customerId?: string;
  customerName?: string;
  styleNo?: string;
  styleName?: string;
  color?: string;
  size?: string;
  sku?: string;
  quantity: number;
  availableQuantity: number;
  styleVariantId?: string;
  productionOrderId?: string;
};

export type FinishedGoodsStockListResponse = {
  list: FinishedGoodsStockRecord[];
  total: number;
  summary: {
    quantityTotal: number;
  };
};

export type FinishedGoodsStockStyleListParams = {
  page: number;
  pageSize: number;
  onlyInStock: boolean;
  warehouseId?: string;
  keyword?: string;
};

export type FinishedGoodsStockStyleRecord = {
  styleId: string;
  imageUrl?: string;
  warehouseId: string;
  warehouseName: string;
  styleNo: string;
  styleName: string;
  unit: string;
  quantity: number;
  availableQuantity: number;
  skuCount: number;
};

export type FinishedGoodsStockStyleListResponse = {
  list: FinishedGoodsStockStyleRecord[];
  total: number;
  summary: {
    quantityTotal: number;
  };
};

export type FinishedGoodsStockStyleMatrixItem = {
  styleVariantId: string;
  color: string;
  size: string;
  unit: string;
  unitPrice: number;
  quantity: number;
  availableQuantity: number;
};

export type FinishedGoodsStockStyleMatrixResponse = {
  styleId: string;
  warehouseId: string;
  items: FinishedGoodsStockStyleMatrixItem[];
};
