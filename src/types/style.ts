import type { MaterialBasicType } from './material';

export type StyleStatus = 'active' | 'inactive';

export interface StyleData {
  id: string;
  styleNo: string;
  styleName: string;
  image?: string;
  colors: string[];
  sizes: string[];
  category?: string;
  status: StyleStatus;
  defaultUnit?: string;
  createTime?: string;
  updateTime?: string;
}

export interface StyleListParams {
  page: number;
  pageSize: number;
  keyword?: string;
}

export interface PaginatedStyleData {
  list: StyleData[];
  total: number;
  page: number;
  pageSize: number;
}

export interface StyleFormMeta {
  units: string[];
  designers: Array<{ id: string; name: string }>;
}

export type StyleColorImageMap = Record<string, string | undefined>;

export interface StyleMaterialData {
  materialId: number;
  materialName: string;
  materialSku: string;
  materialType: 'FABRIC' | 'ACCESSORY' | 'PACKAGING';
  unit: string;
  consumption: number;
  lossRate: number;
  imageUrl?: string;
  unitPrice?: number;
  remark?: string;
}

export interface StyleBomMaterialDraft {
  uid: string;
  materialId?: string;
  materialType: MaterialBasicType;
  name: string;
  sku: string;
  unit: string;
  imageUrl?: string;
  consumption: number;
  lossRate: number;
  unitPrice?: number;
  remark?: string;
}

export interface StyleDetailData {
  id?: string;
  styleNo: string;
  styleName: string;
  status: StyleStatus;
  defaultUnit?: string;
  designerId?: string;
  remarks?: string;
  coverImageUrl?: string;
  colors: string[];
  sizes: string[];
  colorImages: StyleColorImageMap;
  sizeChartImageUrl?: string;
  materials?: StyleMaterialData[];
}

export interface StyleDetailSavePayload {
  styleNo: string;
  styleName: string;
  status: StyleStatus;
  defaultUnit?: string;
  designerId?: string;
  remarks?: string;
  coverImageUrl?: string;
  sizeChartImageUrl?: string;
  colors: string[];
  sizes: string[];
  colorImages: StyleColorImageMap;
}

export interface StyleBomUpdatePayload {
  items: Array<{
    materialId: string;
    consumption: number;
    lossRate?: number;
    remark?: string;
  }>;
}
