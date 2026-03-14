export type OrderMaterialRequirementType = 'fabric' | 'accessory' | 'packaging';
export type OrderMaterialRequirementMode = 'order' | 'sales';
export type SalesStockingWeeklySalesSource = 'AUTO' | 'MANUAL';

export type OrderMaterialRequirementListParams = {
  materialType: OrderMaterialRequirementType;
  restockNeeded?: boolean;
  name?: string;
  page: number;
  pageSize: number;
};

export type SalesStockingSuggestionListParams = {
  materialType: OrderMaterialRequirementType;
  restockNeeded?: boolean;
  name?: string;
  page: number;
  pageSize: number;
};

export type OrderMaterialRequirementListItem = {
  id: string;
  imageUrl: string;
  name: string;
  supplier: string;
  materialCategory: string;
  color: string;
  width?: string;
  grammage?: string;
  allowance?: string;
  supplierModel: string;
  supplierColor: string;
  stockPurchaseQty: number;
  stockInventoryQty: number;
  stockInTransitQty: number;
  restockQty: number;
  totalRequiredQty: number;
};

export type SalesStockingSuggestionListItem = {
  id: string;
  imageUrl: string;
  materialName: string;
  materialCode: string;
  supplier: string;
  materialCategory: string;
  color: string;
  width?: string;
  grammage?: string;
  styleNo?: string;
  styleName?: string;
  weeklySales: number;
  weeklySalesSource: SalesStockingWeeklySalesSource;
  salesWeeks?: number;
  coverageWeeks: number;
  consumption: number;
  lossRate: number;
  suggestedStockQty: number;
  availableQty: number;
  suggestedReplenishQty: number;
  unit?: string;
};

export type OrderMaterialRequirementListResponse = {
  list: OrderMaterialRequirementListItem[];
  total: number;
};

export type SalesStockingSuggestionListResponse = {
  list: SalesStockingSuggestionListItem[];
  total: number;
};
