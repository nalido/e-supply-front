export type StyleStatus = 'active' | 'inactive';

export interface StyleData {
  id: string;
  styleNo: string;
  styleName: string;
  image: string;
  colors: string[];
  sizes: string[];
  category: string;
  status: StyleStatus;
  createTime: string;
  updateTime: string;
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
  operationStages: string[];
  processDepartments: string[];
  partOptions: string[];
  specificationOptions: string[];
}

export interface StyleImage {
  id: string;
  filename: string;
  url: string;
  associatedColor?: string;
}

export interface StyleOperation {
  id: string;
  sequence: number;
  operationName: string;
  stage?: string;
  processDepartment?: string;
  parts: string[];
  specificationUnitPrice?: number;
  specificationEnabled: boolean;
  specificationNotes?: string;
  isKeyProcess: boolean;
  processUnitPrice?: number;
}

export interface StyleFormValues {
  styleNumber: string;
  styleName: string;
  unit: string;
  designer?: string;
  designNumber?: string;
  remarks?: string;
  colors: string[];
  sizes: string[];
  colorImagesEnabled: boolean;
}

export type StyleColorImageMap = Record<string, StyleImage | undefined>;

export interface StyleDraft {
  form: StyleFormValues;
  operations: StyleOperation[];
  coverImage?: StyleImage;
  colorImages: StyleColorImageMap;
}

export interface StyleOperationTemplate {
  id: string;
  name: string;
  operations: StyleOperation[];
}
