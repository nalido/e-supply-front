import type { ProcessTypeChargeMode } from './process-type';

export type StyleStatus = 'active' | 'inactive';

export type StyleProcessItem = {
  id?: string;
  processCatalogId: string;
  processCode?: string;
  processName?: string;
  chargeMode?: ProcessTypeChargeMode;
  defaultWage?: number;
  unit?: string;
  unitPrice?: number;
  remarks?: string;
  sequence?: number;
  sourceTemplateId?: string;
};

export type StyleProcessPayload = Pick<
  StyleProcessItem,
  'processCatalogId' | 'unitPrice' | 'remarks' | 'sequence' | 'sourceTemplateId'
>;

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
  processes: StyleProcessItem[];
}

export interface StyleDetailSavePayload {
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
  processes: StyleProcessPayload[];
}
