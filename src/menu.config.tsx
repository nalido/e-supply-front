import {
  DashboardOutlined,
  ShoppingCartOutlined,
  ShopOutlined,
  DeploymentUnitOutlined,
  BarChartOutlined,
  SettingOutlined,
  BookOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { Link } from 'react-router-dom';

export type MenuNode = {
  key: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  children?: MenuNode[];
};

type ItemType = NonNullable<MenuProps['items']>[number];

export const menuTree: MenuNode[] = [
  { key: '/dashboard/workplace', icon: <DashboardOutlined />, label: <Link to="/dashboard/workplace">销售总览</Link> },
  {
    key: '/sales',
    icon: <ShoppingCartOutlined />,
    label: '销售中心',
    children: [
      { key: '/sales/orders', label: <Link to="/sales/orders">销售订单</Link> },
      { key: '/sales/fulfillments', label: <Link to="/sales/fulfillments">履约发货</Link> },
      { key: '/sales/refunds', label: <Link to="/sales/refunds">售后退款</Link> },
    ],
  },
  {
    key: '/channel',
    icon: <ShopOutlined />,
    label: '渠道管理',
    children: [
      { key: '/channel/accounts', label: <Link to="/channel/accounts">平台账号</Link> },
      { key: '/channel/credentials', label: <Link to="/channel/credentials">平台凭证</Link> },
      { key: '/channel/shops', label: <Link to="/channel/shops">店铺管理</Link> },
      { key: '/channel/products', label: <Link to="/channel/products">商品映射</Link> },
      { key: '/channel/listings', label: <Link to="/channel/listings">商品上架</Link> },
      { key: '/channel/sync-logs', label: <Link to="/channel/sync-logs">同步日志</Link> },
    ],
  },
  {
    key: '/ops',
    icon: <DeploymentUnitOutlined />,
    label: '履约与库存',
    children: [
      { key: '/ops/inventory', label: <Link to="/ops/inventory">库存同步</Link> },
      { key: '/ops/logistics', label: <Link to="/ops/logistics">物流跟踪</Link> },
    ],
  },
  {
    key: '/reports',
    icon: <BarChartOutlined />,
    label: '报表中心',
    children: [
      { key: '/reports/sales-summary', label: <Link to="/reports/sales-summary">销售概览</Link> },
      { key: '/reports/channel-performance', label: <Link to="/reports/channel-performance">渠道表现</Link> },
    ],
  },
  {
    key: '/settings',
    icon: <SettingOutlined />,
    label: '系统设置',
    children: [
      { key: '/settings/profile', label: <Link to="/settings/profile">个人资料</Link> },
      { key: '/settings/company', label: <Link to="/settings/company">我的企业</Link> },
      { key: '/settings/org', label: <Link to="/settings/org">组织架构</Link> },
      { key: '/settings/roles', label: <Link to="/settings/roles">岗位管理</Link> },
      { key: '/settings/preferences', label: <Link to="/settings/preferences">偏好设置</Link> },
      { key: '/settings/audit', label: <Link to="/settings/audit">操作日志</Link> },
    ],
  },
  { key: '/guide', icon: <BookOutlined />, label: <Link to="/guide">操作指南</Link> },
];

export const toAntdMenuItems = (nodes: MenuNode[]): ItemType[] =>
  nodes.map((node) => {
    const children = node.children ? toAntdMenuItems(node.children) : undefined;
    return {
      key: node.key,
      label: node.label,
      icon: node.icon,
      children,
    } as ItemType;
  });
