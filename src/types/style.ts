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
