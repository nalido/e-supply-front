import type { AiClientAction } from './client-actions';

type RouteIntent = {
  keywords: string[];
  path: string;
  label: string;
};

const ROUTE_INTENTS: RouteIntent[] = [
  { keywords: ['物料档案', '物料资料', '物料管理'], path: '/basic/material', label: '物料档案' },
  { keywords: ['加工类型', '工序类型'], path: '/basic/process-type', label: '加工类型' },
  { keywords: ['订单生产', '工厂订单', '生产订单'], path: '/orders/factory', label: '订单生产' },
  { keywords: ['下载中心'], path: '/downloads', label: '下载中心' },
  { keywords: ['角色权限', '权限管理', '角色管理'], path: '/settings/roles', label: '角色权限' },
  { keywords: ['组织设置', '成员管理'], path: '/settings/org', label: '组织设置' },
  { keywords: ['工作台', '首页'], path: '/dashboard/workplace', label: '工作台' },
];

const NAV_TRIGGERS = ['跳转', '打开', '前往', '进入'];

export const planRouteIntent = (input: string): { action: AiClientAction; markdown: string } | null => {
  const text = input.trim();
  if (!text) {
    return null;
  }
  const isNavIntent =
    NAV_TRIGGERS.some((word) => text.startsWith(word))
    || /^(请|帮我)?(打开|跳转|前往|进入)/.test(text);
  if (!isNavIntent) {
    return null;
  }
  const matched = ROUTE_INTENTS.find((item) => item.keywords.some((k) => text.includes(k)));
  if (!matched) {
    return null;
  }
  return {
    action: {
      type: 'navigate',
      path: matched.path,
      reason: `匹配到页面：${matched.label}`,
    },
    markdown: `正在为你打开 **${matched.label}** 页面...`,
  };
};
