import { createBrowserRouter, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Workplace from './views/Workplace';
import { menuTree } from './menu.config';

// Lazy placeholders for other menus
const Placeholder = (name: string) => () => (
  <div style={{ padding: 24 }}>即将实现：{name}</div>
);

const flattenMenu = (nodes: any[]): any[] =>
  nodes.flatMap((n) => [n, ...(n.children ? flattenMenu(n.children) : [])]);

const autoChildren = flattenMenu(menuTree)
  .filter((n) => n.key && n.key !== '/dashboard/workplace' && !n.children)
  .map((n) => ({ path: n.key.replace(/^\//, ''), element: <Placeholder name={String((n.label?.props?.children || '页面'))} /> }));

const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: [
      { index: true, element: <Navigate to="/dashboard/workplace" replace /> },
      { path: 'dashboard/workplace', element: <Workplace /> },
      ...autoChildren,
      { path: 'pattern', element: <Placeholder name="打板" /> },
      { path: 'orders', element: <Placeholder name="订单生产" /> },
      { path: 'material', element: <Placeholder name="物料进销存" /> },
      { path: 'product', element: <Placeholder name="成品进销存" /> },
      { path: 'piecework', element: <Placeholder name="车间计件" /> },
      { path: 'collab', element: <Placeholder name="协同中心" /> },
      { path: 'settlement', element: <Placeholder name="对账结算" /> },
      { path: 'appstore', element: <Placeholder name="应用商店" /> },
      { path: 'basic', element: <Placeholder name="基础资料" /> },
      { path: 'settings', element: <Placeholder name="系统设置" /> },
      { path: 'guide', element: <Placeholder name="操作指南" /> },
    ],
  },
]);

export default router;


