export type MaterialCategory = 'fabric' | 'accessory';

export type MaterialUnit = 'kg' | '米' | '件' | '个' | '码' | '张' | '套';

export type MaterialItem = {
  id: string;
  name: string;
  category: MaterialCategory;
  categoryPath?: string[];
  imageUrl?: string;
  width?: string;
  grammage?: string;
  tolerance?: string;
  unit: MaterialUnit;
  price?: number;
  colors: string[];
  remarks?: string;
  updatedAt: string;
  createdAt: string;
};

export type MaterialListParams = {
  page: number;
  pageSize: number;
  keyword?: string;
  category: MaterialCategory;
};

export type MaterialDataset = {
  list: MaterialItem[];
  total: number;
};

export type CreateMaterialPayload = {
  name: string;
  category: MaterialCategory;
  categoryPath?: string[];
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
