import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import ProtectedLayout from './layouts/ProtectedLayout';
import SalesDashboard from './views/SalesDashboard';
import SalesOrders from './views/SalesOrders';
import SalesFulfillments from './views/SalesFulfillments';
import SalesRefunds from './views/SalesRefunds';
import ChannelAccounts from './views/ChannelAccounts';
import ChannelCredentials from './views/ChannelCredentials';
import ChannelShops from './views/ChannelShops';
import ChannelProducts from './views/ChannelProducts';
import ChannelListings from './views/ChannelListings';
import ChannelSyncLogs from './views/ChannelSyncLogs';
import OpsInventory from './views/OpsInventory';
import OpsLogistics from './views/OpsLogistics';
import SalesSummaryReport from './views/reports/SalesSummaryReport';
import ChannelPerformanceReport from './views/reports/ChannelPerformanceReport';
import OperationGuide from './views/OperationGuide';
import GuideSectionPage from './views/guide/GuideSectionPage';
import {
  ActionLogPage,
  CompanySettings,
  OrganizationSettings,
  PreferencesPage,
  ProfileSettings,
  RolesSettings,
} from './views/settings';
import { menuTree } from './menu.config';
import type { MenuNode } from './menu.config';
import type { ReactNode, ReactElement } from 'react';

const createPlaceholderElement = (name: string): ReactElement =>
  React.createElement('div', { style: { padding: 24 } }, `即将实现：${name}`);

const flattenMenu = (nodes: MenuNode[]): MenuNode[] =>
  nodes.flatMap((node) => [node, ...(node.children ? flattenMenu(node.children) : [])]);

const extractMenuLabel = (label: ReactNode): string => {
  if (typeof label === 'string') {
    return label;
  }
  if (React.isValidElement(label)) {
    const { children } = label.props;
    if (typeof children === 'string') {
      return children;
    }
  }
  return '页面';
};

const autoChildren = flattenMenu(menuTree)
  .filter((n) =>
    n.key &&
    n.key !== '/dashboard/workplace' &&
    n.key !== '/sales/orders' &&
    n.key !== '/sales/fulfillments' &&
    n.key !== '/sales/refunds' &&
    n.key !== '/channel/accounts' &&
    n.key !== '/channel/credentials' &&
    n.key !== '/channel/shops' &&
    n.key !== '/channel/products' &&
    n.key !== '/channel/sync-logs' &&
    n.key !== '/ops/inventory' &&
    n.key !== '/ops/logistics' &&
    n.key !== '/reports/sales-summary' &&
    n.key !== '/reports/channel-performance' &&
    n.key !== '/settings/profile' &&
    n.key !== '/settings/company' &&
    n.key !== '/settings/org' &&
    n.key !== '/settings/roles' &&
    n.key !== '/settings/audit' &&
    n.key !== '/settings/preferences' &&
    n.key !== '/guide' &&
    !n.children,
  )
  .map((node) => ({
    path: node.key.replace(/^\//, ''),
    element: createPlaceholderElement(extractMenuLabel(node.label)),
  }));

const router = createBrowserRouter([
  {
    path: '/',
    element: React.createElement(ProtectedLayout),
    children: [
      { index: true, element: React.createElement(Navigate, { to: '/dashboard/workplace', replace: true }) },
      { path: 'dashboard/workplace', element: React.createElement(SalesDashboard) },
      { path: 'sales/orders', element: React.createElement(SalesOrders) },
      { path: 'sales/fulfillments', element: React.createElement(SalesFulfillments) },
      { path: 'sales/refunds', element: React.createElement(SalesRefunds) },
      { path: 'channel/accounts', element: React.createElement(ChannelAccounts) },
      { path: 'channel/credentials', element: React.createElement(ChannelCredentials) },
      { path: 'channel/shops', element: React.createElement(ChannelShops) },
      { path: 'channel/products', element: React.createElement(ChannelProducts) },
      { path: 'channel/listings', element: React.createElement(ChannelListings) },
      { path: 'channel/sync-logs', element: React.createElement(ChannelSyncLogs) },
      { path: 'ops/inventory', element: React.createElement(OpsInventory) },
      { path: 'ops/logistics', element: React.createElement(OpsLogistics) },
      { path: 'reports/sales-summary', element: React.createElement(SalesSummaryReport) },
      { path: 'reports/channel-performance', element: React.createElement(ChannelPerformanceReport) },
      { path: 'settings/profile', element: React.createElement(ProfileSettings) },
      { path: 'settings/company', element: React.createElement(CompanySettings) },
      { path: 'settings/org', element: React.createElement(OrganizationSettings) },
      { path: 'settings/roles', element: React.createElement(RolesSettings) },
      { path: 'settings/preferences', element: React.createElement(PreferencesPage) },
      { path: 'settings/audit', element: React.createElement(ActionLogPage) },
      { path: 'guide', element: React.createElement(OperationGuide) },
      { path: 'guide/:sectionId', element: React.createElement(GuideSectionPage) },
      ...autoChildren,
    ],
  },
]);

export default router;
