export type MaterialBasicType = 'fabric' | 'accessory';

export type MaterialUnit = 'kg' | '米' | '件' | '个' | '码' | '张' | '套';

export type MaterialItem = {
  id: string;
  tenantId?: string;
  sku: string;
  name: string;
  materialType: MaterialBasicType;
  imageUrl?: string;
  width?: string;
  grammage?: string;
  tolerance?: string;
  unit: MaterialUnit;
  price?: number;
  colors: string[];
  remarks?: string;
  status?: 'active' | 'inactive';
  updatedAt?: string;
  createdAt?: string;
};

export type MaterialListParams = {
  page: number;
  pageSize: number;
  keyword?: string;
  materialType: MaterialBasicType;
};

export type MaterialDataset = {
  list: MaterialItem[];
  total: number;
};

export type CreateMaterialPayload = {
  name: string;
  sku?: string;
  materialType: MaterialBasicType;
  imageUrl?: string;
  width?: string;
  grammage?: string;
  tolerance?: string;
  unit: MaterialUnit;
  price?: number;
  colors?: string[];
  remarks?: string;
};

export type UpdateMaterialPayload = Partial<CreateMaterialPayload>;
