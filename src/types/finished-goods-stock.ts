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
  customerName?: string;
  styleNo?: string;
  styleName?: string;
  color?: string;
  size?: string;
  sku?: string;
  quantity: number;
};

export type FinishedGoodsStockListResponse = {
  list: FinishedGoodsStockRecord[];
  total: number;
  summary: {
    quantityTotal: number;
  };
};
