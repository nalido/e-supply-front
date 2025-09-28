import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Workplace from './views/Workplace';
import SampleDashboard from './views/SampleDashboard';
import SampleList from './views/SampleList';
import FollowTemplate from './views/FollowTemplate';
import SampleType from './views/SampleType';
import FactoryOrders from './views/FactoryOrders';
import ProcessTypePage from './views/ProcessType';
import StyleMaterials from './views/StyleMaterials';
import StyleDetail from './views/StyleDetail';
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
    n.key !== '/sample' &&
    n.key !== '/sample/list' &&
    n.key !== '/sample/follow-template' &&
    n.key !== '/sample/type' &&
    n.key !== '/orders/factory' &&
    n.key !== '/basic/process-type' &&
    n.key !== '/basic/styles' &&
    !n.children,
  )
  .map((node) => ({
    path: node.key.replace(/^\//, ''),
    element: createPlaceholderElement(extractMenuLabel(node.label)),
  }));

const router = createBrowserRouter([
  {
    path: '/',
    element: React.createElement(MainLayout),
    children: [
      { index: true, element: React.createElement(Navigate, { to: '/dashboard/workplace', replace: true }) },
      { path: 'dashboard/workplace', element: React.createElement(Workplace) },
      { path: 'sample', element: React.createElement(SampleDashboard) },
      { path: 'sample/list', element: React.createElement(SampleList) },
      { path: 'sample/follow-template', element: React.createElement(FollowTemplate) },
      { path: 'sample/type', element: React.createElement(SampleType) },
      { path: 'orders/factory', element: React.createElement(FactoryOrders) },
      { path: 'basic/process-type', element: React.createElement(ProcessTypePage) },
      { path: 'basic/styles', element: React.createElement(StyleMaterials) },
      { path: 'foundation/product/detail', element: React.createElement(StyleDetail) },
      ...autoChildren,
      { path: 'pattern', element: createPlaceholderElement('打板') },
      { path: 'orders', element: createPlaceholderElement('订单生产') },
      { path: 'material', element: createPlaceholderElement('物料进销存') },
      { path: 'product', element: createPlaceholderElement('成品进销存') },
      { path: 'piecework', element: createPlaceholderElement('车间计件') },
      { path: 'collab', element: createPlaceholderElement('协同中心') },
      { path: 'settlement', element: createPlaceholderElement('对账结算') },
      { path: 'appstore', element: createPlaceholderElement('应用商店') },
      { path: 'basic', element: createPlaceholderElement('基础资料') },
      { path: 'settings', element: createPlaceholderElement('系统设置') },
      { path: 'guide', element: createPlaceholderElement('操作指南') },
    ],
  },
]);

export default router;
