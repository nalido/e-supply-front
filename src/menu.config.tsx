import {
  AppstoreOutlined,
  DashboardOutlined,
  SettingOutlined,
  TeamOutlined,
  ShoppingCartOutlined,
  DeploymentUnitOutlined,
  DatabaseOutlined,
  BuildOutlined,
  BookOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';

type ItemType = NonNullable<MenuProps['items']>[number];
import { Link } from 'react-router-dom';

export type MenuNode = {
  key: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  children?: MenuNode[];
};

export const menuTree: MenuNode[] = [
  { key: '/dashboard/workplace', icon: <DashboardOutlined />, label: <Link to="/dashboard/workplace">工作台</Link> },
  {
    key: '/sample',
    icon: <BuildOutlined />,
    label: '打板',
    children: [
      { key: '/sample/overview', label: <Link to="/sample">打板汇总</Link> },
      { key: '/sample/list', label: <Link to="/sample/list">样板单</Link> },
      { key: '/sample/follow', label: <Link to="/sample/follow">样板跟进</Link> },
      { key: '/sample/follow-template', label: <Link to="/sample/follow-template">跟进模板</Link> },
      { key: '/sample/type', label: <Link to="/sample/type">样板类型</Link> },
      {
        key: '/sample/report',
        label: '报表中心',
        children: [
          { key: '/sample/report/order-compare', label: <Link to="/sample/report/order-compare">打板下单对照表</Link> },
          { key: '/sample/report/costing', label: <Link to="/sample/report/costing">成本核价表</Link> },
        ],
      },
    ],
  },
  {
    key: '/orders',
    icon: <ShoppingCartOutlined />,
    label: '订单生产',
    children: [
      { key: '/orders/factory', label: <Link to="/orders/factory">工厂订单</Link> },
      { key: '/orders/outsource', label: <Link to="/orders/outsource">委外生产表</Link> },
      { key: '/orders/compare', label: <Link to="/orders/compare">订单生产对照表</Link> },
      { key: '/orders/efficiency', label: <Link to="/orders/efficiency">作业时效</Link> },
      {
        key: '/orders/report',
        label: '报表中心',
        children: [
          { key: '/orders/report/profit', label: <Link to="/orders/report/profit">订单出货利润</Link> },
          { key: '/orders/report/cost', label: <Link to="/orders/report/cost">大货成本报表</Link> },
          { key: '/orders/report/material-need', label: <Link to="/orders/report/material-need">订单物料需求报表</Link> },
          { key: '/orders/report/cut-outsource', label: <Link to="/orders/report/cut-outsource">订单外发裁剪明细表</Link> },
        ],
      },
    ],
  },
  {
    key: '/material',
    icon: <DatabaseOutlined />,
    label: '物料进销存',
    children: [
      { key: '/material/stock', label: <Link to="/material/stock">物料库存</Link> },
      { key: '/material/purchase-prep', label: <Link to="/material/purchase-prep">备料采购入库</Link> },
      { key: '/material/purchase-order', label: <Link to="/material/purchase-order">按单采购入库</Link> },
      { key: '/material/issue', label: <Link to="/material/issue">领料出库明细</Link> },
      {
        key: '/material/report',
        label: '报表中心',
        children: [
          { key: '/material/report/overview', label: <Link to="/material/report/overview">物料进销存报表</Link> },
          { key: '/material/report/purchase-inbound-detail', label: <Link to="/material/report/purchase-inbound-detail">物料采购入库明细表</Link> },
        ],
      },
    ],
  },
  {
    key: '/product',
    icon: <AppstoreOutlined />,
    label: '成品进销存',
    children: [
      { key: '/product/stock', label: <Link to="/product/stock">成品库存</Link> },
      {
        key: '/product/inbound',
        label: '成品入库',
        children: [
          { key: '/product/inbound/pending', label: <Link to="/product/inbound/pending">待收货</Link> },
          { key: '/product/inbound/received', label: <Link to="/product/inbound/received">已收货</Link> },
        ],
      },
      { key: '/product/inbound-other', label: <Link to="/product/inbound-other">其它入库</Link> },
      { key: '/product/outbound', label: <Link to="/product/outbound">出库明细</Link> },
      {
        key: '/product/report',
        label: '报表中心',
        children: [
          { key: '/product/report/overview', label: <Link to="/product/report/overview">成品进销存报表</Link> },
        ],
      },
    ],
  },
  {
    key: '/piecework',
    icon: <DeploymentUnitOutlined />,
    label: '车间计件',
    children: [
      { key: '/piecework/orders', label: <Link to="/piecework/orders">工厂订单</Link> },
      {
        key: '/piecework/cutting',
        label: '裁床单',
        children: [
          { key: '/piecework/cutting/pending', label: <Link to="/piecework/cutting/pending">待裁</Link> },
          { key: '/piecework/cutting/done', label: <Link to="/piecework/cutting/done">已裁</Link> },
          { key: '/piecework/cutting/report', label: <Link to="/piecework/cutting/report">裁床报表</Link> },
        ],
      },
      { key: '/piecework/progress', label: <Link to="/piecework/progress">车间进度</Link> },
      { key: '/piecework/payroll', label: <Link to="/piecework/payroll">薪资管理</Link> },
      { key: '/piecework/outsource', label: <Link to="/piecework/outsource">外发管理</Link> },
      { key: '/piecework/quality', label: <Link to="/piecework/quality">质检管理</Link> },
      { key: '/piecework/report', label: <Link to="/piecework/report">报表中心</Link> },
    ],
  },
  {
    key: '/collab',
    icon: <TeamOutlined />,
    label: '协同中心',
    children: [
      { key: '/collab/send-out', label: <Link to="/collab/send-out">外发订单</Link> },
      { key: '/collab/receive-in', label: <Link to="/collab/receive-in">外接订单</Link> },
    ],
  },
  {
    key: '/settlement',
    icon: <AppstoreOutlined />,
    label: '对账结算',
    children: [
      { key: '/settlement/receivable', label: <Link to="/settlement/receivable">客户收款</Link> },
      { key: '/settlement/payable-factory', label: <Link to="/settlement/payable-factory">加工厂付款</Link> },
      { key: '/settlement/payable-supplier', label: <Link to="/settlement/payable-supplier">供应商付款</Link> },
      { key: '/settlement/cashier', label: <Link to="/settlement/cashier">出纳账户</Link> },
      {
        key: '/settlement/report',
        label: '报表中心',
        children: [
          { key: '/settlement/report/customer-detail', label: <Link to="/settlement/report/customer-detail">客户业务明细表</Link> },
          { key: '/settlement/report/factory-detail', label: <Link to="/settlement/report/factory-detail">加工厂业务明细表</Link> },
          { key: '/settlement/report/supplier-detail', label: <Link to="/settlement/report/supplier-detail">供应商业务明细表</Link> },
          { key: '/settlement/report/statement-detail', label: <Link to="/settlement/report/statement-detail">对账明细表</Link> },
        ],
      },
    ],
  },
  { key: '/appstore', icon: <AppstoreOutlined />, label: <Link to="/appstore">应用商店</Link> },
  {
    key: '/basic',
    icon: <AppstoreOutlined />,
    label: '基础资料',
    children: [
      { key: '/basic/style', label: <Link to="/basic/style">款式资料</Link> },
      { key: '/basic/material', label: <Link to="/basic/material">物料档案</Link> },
      { key: '/basic/partners', label: <Link to="/basic/partners">往来单位</Link> },
      { key: '/basic/process-type', label: <Link to="/basic/process-type">加工类型</Link> },
      { key: '/basic/operation-template', label: <Link to="/basic/operation-template">工序模板</Link> },
      { key: '/basic/warehouse', label: <Link to="/basic/warehouse">仓库</Link> },
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
      {
        key: '/settings/user',
        label: '用户管理',
        children: [
          { key: '/settings/user/users', label: <Link to="/settings/user/users">用户管理</Link> },
          { key: '/settings/user/onboarding', label: <Link to="/settings/user/onboarding">入职申请</Link> },
          { key: '/settings/user/keys', label: <Link to="/settings/user/keys">密钥管理</Link> },
        ],
      },
      { key: '/settings/preferences', label: <Link to="/settings/preferences">偏好设置</Link> },
      { key: '/settings/audit', label: <Link to="/settings/audit">操作日志</Link> },
    ],
  },
  { key: '/guide', icon: <BookOutlined />, label: <Link to="/guide">操作指南</Link> },
];

export const toAntdMenuItems = (nodes: MenuNode[]): ItemType[] =>
  nodes.map((n) => ({ key: n.key, label: n.label, icon: n.icon, children: n.children ? (toAntdMenuItems(n.children) as any) : undefined }));


