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
import { menuTree } from './menu.config';

// Lazy placeholders for other menus
const Placeholder = (name: string) => () => (
  <div style={{ padding: 24 }}>即将实现：{name}</div>
);

const flattenMenu = (nodes: any[]): any[] =>
  nodes.flatMap((n) => [n, ...(n.children ? flattenMenu(n.children) : [])]);

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
    !n.children,
  )
  .map((n) => ({ path: n.key.replace(/^\//, ''), element: React.createElement(Placeholder(String((n.label?.props?.children || '页面')))) }));

const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: [
      { index: true, element: <Navigate to="/dashboard/workplace" replace /> },
      { path: 'dashboard/workplace', element: <Workplace /> },
      { path: 'sample', element: <SampleDashboard /> },
      { path: 'sample/list', element: <SampleList /> },
      { path: 'sample/follow-template', element: <FollowTemplate /> },
      { path: 'sample/type', element: <SampleType /> },
      { path: 'orders/factory', element: <FactoryOrders /> },
      { path: 'basic/process-type', element: <ProcessTypePage /> },
      ...autoChildren,
      { path: 'pattern', element: React.createElement(Placeholder("打板")) },
      { path: 'orders', element: React.createElement(Placeholder("订单生产")) },
      { path: 'material', element: React.createElement(Placeholder("物料进销存")) },
      { path: 'product', element: React.createElement(Placeholder("成品进销存")) },
      { path: 'piecework', element: React.createElement(Placeholder("车间计件")) },
      { path: 'collab', element: React.createElement(Placeholder("协同中心")) },
      { path: 'settlement', element: React.createElement(Placeholder("对账结算")) },
      { path: 'appstore', element: React.createElement(Placeholder("应用商店")) },
      { path: 'basic', element: React.createElement(Placeholder("基础资料")) },
      { path: 'settings', element: React.createElement(Placeholder("系统设置")) },
      { path: 'guide', element: React.createElement(Placeholder("操作指南")) },
    ],
  },
]);

export default router;
