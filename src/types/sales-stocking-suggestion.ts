export type SalesStockingMaterialType = 'fabric' | 'accessory' | 'packaging';
export type SalesStockingWeeklySalesMode = 'AUTO' | 'MANUAL';

export type SalesStockingStyleInput = {
  styleId: string;
  weeklySalesMode: SalesStockingWeeklySalesMode;
  manualWeeklySales?: number;
};

export type SalesStockingSuggestionQueryParams = {
  materialType?: SalesStockingMaterialType;
  coverageWeeks: number;
  autoSalesWeeks: number;
  restockNeeded?: boolean;
  keyword?: string;
  styles: SalesStockingStyleInput[];
};

export type SalesStockingSuggestionStyle = {
  styleId: string;
  styleNo: string;
  styleName: string;
  weeklySalesMode: SalesStockingWeeklySalesMode;
  manualWeeklySales: number;
  autoWeeklySales: number;
  effectiveWeeklySales: number;
  bomMaterialCount: number;
  note?: string;
};

export type SalesStockingSuggestionStyleContribution = {
  styleId: string;
  styleNo: string;
  styleName: string;
  weeklySalesMode: SalesStockingWeeklySalesMode;
  weeklySalesQty: number;
  bomConsumption: number;
  lossRate: number;
  suggestedStockQty: number;
};

export type SalesStockingSuggestionMaterial = {
  materialId: string;
  materialCode: string;
  materialName: string;
  materialType?: SalesStockingMaterialType;
  unit?: string;
  imageUrl?: string;
  supplier?: string;
  suggestedStockQty: number;
  stockInventoryQty: number;
  suggestedReplenishQty: number;
  styleContributions: SalesStockingSuggestionStyleContribution[];
};

export type SalesStockingSuggestionSummary = {
  selectedStyleCount: number;
  materialCount: number;
  totalSuggestedStockQty: number;
  totalSuggestedReplenishQty: number;
};

export type SalesStockingSuggestionQueryResult = {
  coverageWeeks: number;
  autoSalesWeeks: number;
  styles: SalesStockingSuggestionStyle[];
  materials: SalesStockingSuggestionMaterial[];
  summary: SalesStockingSuggestionSummary;
};
