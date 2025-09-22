import type { ReactNode } from 'react';

/**
 * 交货列表数据项
 */
export interface DeliveryItem {
  id: string;
  orderNo: string;
  styleName: string;
  org: string;
  date: string;
  qty: number;
  type?: string;
  image?: string;
}

/**
 * 快速入口配置项
 */
export interface QuickAction {
  key: string;
  title: string;
  icon: ReactNode;
  color?: string;
  count?: number;
  onClick?: () => void;
}

/**
 * 工作台统计数据
 */
export interface WorkplaceStats {
  newOrders: number;
  sampleCount: number;
  inProduction: number;
  shipped: number;
}

/**
 * 分页查询参数
 */
export interface PaginationParams {
  page: number;
  pageSize: number;
}

/**
 * 分页响应数据
 */
export interface PaginatedResponse<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * 公告数据
 */
export interface Announcement {
  id: string;
  title: string;
  content: string;
  createTime: string;
  author: string;
}