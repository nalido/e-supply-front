export type OrderMaterialRequirementType = 'fabric' | 'accessory' | 'packaging';

export type OrderMaterialRequirementListParams = {
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

export type OrderMaterialRequirementListResponse = {
  list: OrderMaterialRequirementListItem[];
  total: number;
};
