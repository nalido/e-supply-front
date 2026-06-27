import React, { Suspense, lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Spin } from 'antd';
import ProtectedLayout from './layouts/ProtectedLayout';
import ProtectedTenantOutlet from './layouts/ProtectedTenantOutlet';
import { menuTree } from './menu.config';
import type { MenuNode } from './menu.config';
import type { ReactNode, ReactElement } from 'react';

const Workplace = lazy(() => import('./views/Workplace'));
const SampleDashboard = lazy(() => import('./views/SampleDashboard'));
const SampleList = lazy(() => import('./views/SampleList'));
const SampleDetail = lazy(() => import('./views/SampleDetail'));
const FollowTemplate = lazy(() => import('./views/FollowTemplate'));
const SampleType = lazy(() => import('./views/SampleType'));
const SampleCostingReport = lazy(() => import('./views/SampleCostingReport'));
const SampleOrderComparisonReport = lazy(() => import('./views/SampleOrderComparisonReport'));
const FactoryOrders = lazy(() => import('./views/FactoryOrders'));
const CuttingReportPage = lazy(() => import('./views/CuttingReport'));
const CuttingPendingPage = lazy(() => import('./views/CuttingPending'));
const CuttingCompletedPage = lazy(() => import('./views/CuttingCompleted'));
const ProcessTypePage = lazy(() => import('./views/ProcessType'));
const StyleMaterials = lazy(() => import('./views/StyleMaterials'));
const StyleDetail = lazy(() => import('./views/StyleDetail'));
const MaterialArchive = lazy(() => import('./views/MaterialArchive'));
const PartnersPage = lazy(() => import('./views/Partners'));
const OperationTemplatePage = lazy(() => import('./views/OperationTemplate'));
const WarehousePage = lazy(() => import('./views/Warehouse'));
const WorkshopProgress = lazy(() => import('./views/WorkshopProgress'));
const PieceworkDashboard = lazy(() => import('./views/PieceworkDashboard'));
const OperationalEfficiency = lazy(() => import('./views/OperationalEfficiency'));
const IncomingOrders = lazy(() => import('./views/IncomingOrders'));
const OutsourceOrders = lazy(() => import('./views/OutsourceOrders'));
const OutsourcingManagement = lazy(() => import('./views/OutsourcingManagement'));
const OutsourcingProductionReport = lazy(() => import('./views/OutsourcingProductionReport'));
const BulkCostReport = lazy(() => import('./views/BulkCostReport'));
const OrderMaterialRequirementReport = lazy(() => import('./views/OrderMaterialRequirementReport'));
const SalaryManagement = lazy(() => import('./views/SalaryManagement'));
const FinishedGoodsInventoryReport = lazy(() => import('./views/FinishedGoodsInventoryReport'));
const FinishedGoodsOtherInbound = lazy(() => import('./views/FinishedGoodsOtherInbound'));
const FinishedGoodsOutbound = lazy(() => import('./views/FinishedGoodsOutbound'));
const FinishedGoodsPendingReceipt = lazy(() => import('./views/FinishedGoodsPendingReceipt'));
const FinishedGoodsReceived = lazy(() => import('./views/FinishedGoodsReceived'));
const FinishedGoodsStock = lazy(() => import('./views/FinishedGoodsStock'));
const StockingPurchaseInbound = lazy(() => import('./views/StockingPurchaseInbound'));
const OrderProductionComparison = lazy(() => import('./views/OrderProductionComparison'));
const OrderReportAggregation = lazy(() => import('./views/OrderReportAggregation'));
const OrderShipmentProfitReport = lazy(() => import('./views/OrderShipmentProfitReport'));
const MaterialInventoryReport = lazy(() => import('./views/MaterialInventoryReport'));
const MaterialPurchaseReport = lazy(() => import('./views/MaterialPurchaseReport'));
const MaterialIssueDetails = lazy(() => import('./views/MaterialIssueDetails'));
const MaterialStock = lazy(() => import('./views/MaterialStock'));
const SalesStockingSuggestion = lazy(() => import('./views/SalesStockingSuggestion'));
const OrderOutsourcingCuttingDetailReport = lazy(() => import('./views/OrderOutsourcingCuttingDetailReport'));
const SettlementCustomerReceipts = lazy(() => import('./views/SettlementCustomerReceipts'));
const SettlementFactoryPayments = lazy(() => import('./views/SettlementFactoryPayments'));
const SettlementSupplierPayments = lazy(() => import('./views/SettlementSupplierPayments'));
const SettlementCashierAccounts = lazy(() => import('./views/SettlementCashierAccounts'));
const SettlementReportCustomerDetails = lazy(() => import('./views/SettlementReportCustomerDetails'));
const SettlementReportFactoryDetails = lazy(() => import('./views/SettlementReportFactoryDetails'));
const SettlementReportSupplierDetails = lazy(() => import('./views/SettlementReportSupplierDetails'));
const SettlementReportReconciliationDetails = lazy(() => import('./views/SettlementReportReconciliationDetails'));
const QualityControlManagement = lazy(() => import('./views/QualityControlManagement'));
const GlobalDownloadCenter = lazy(() => import('./views/GlobalDownloadCenter'));
const RegisterEnterprise = lazy(() => import('./views/auth/RegisterEnterprise'));
const Welcome = lazy(() => import('./views/auth/Welcome'));
const SignInPage = lazy(() => import('./views/auth/SignInPage'));
const ProfileSettings = lazy(() => import('./views/settings').then((module) => ({ default: module.ProfileSettings })));
const CompanySettings = lazy(() => import('./views/settings').then((module) => ({ default: module.CompanySettings })));
const OrganizationSettings = lazy(() => import('./views/settings').then((module) => ({ default: module.OrganizationSettings })));
const RolesSettings = lazy(() => import('./views/settings').then((module) => ({ default: module.RolesSettings })));
const ActionLogPage = lazy(() => import('./views/settings').then((module) => ({ default: module.ActionLogPage })));
const PreferencesPage = lazy(() => import('./views/settings').then((module) => ({ default: module.PreferencesPage })));
const AIAgentPoC = lazy(() => import('./views/AIAgentPoC'));
const SaleCenterWorkspace = lazy(() => import('./views/sale/SaleCenterWorkspace'));

const pageFallback = React.createElement(Spin, { size: 'large', tip: '页面加载中...', fullscreen: true });

const createLazyPageElement = (Component: React.ComponentType) =>
  React.createElement(
    Suspense,
    { fallback: pageFallback },
    React.createElement(Component),
  );

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
    n.key !== '/piecework/orders' &&
    n.key !== '/orders/efficiency' &&
    n.key !== '/basic/process-type' &&
    n.key !== '/basic/styles' &&
    n.key !== '/basic/material' &&
    n.key !== '/basic/partners' &&
    n.key !== '/basic/operation-template' &&
    n.key !== '/basic/warehouse' &&
    n.key !== '/settings/profile' &&
    n.key !== '/settings/company' &&
    n.key !== '/settings/org' &&
    n.key !== '/settings/roles' &&
    n.key !== '/settings/audit' &&
    n.key !== '/ai/agent' &&
    n.key !== '/settings/preferences' &&
    n.key !== '/guide' &&
    n.key !== '/piecework/cutting/pending' &&
    n.key !== '/piecework/cutting/done' &&
    n.key !== '/piecework/cutting/report' &&
    n.key !== '/piecework/progress' &&
    n.key !== '/piecework/report' &&
    n.key !== '/piecework/outsource' &&
    n.key !== '/orders/report/profit' &&
    n.key !== '/orders/report/cost' &&
    n.key !== '/orders/report/material-need' &&
    n.key !== '/orders/report/cut-outsource' &&
    n.key !== '/orders/outsource' &&
    n.key !== '/orders/compare' &&
    n.key !== '/product/report/overview' &&
    n.key !== '/product/inbound-other' &&
    n.key !== '/product/stock' &&
    n.key !== '/product/inbound/pending' &&
    n.key !== '/product/inbound/received' &&
    n.key !== '/product/outbound' &&
    n.key !== '/material/stock' &&
    n.key !== '/material/sales-stocking-suggestion' &&
    n.key !== '/material/report/overview' &&
    n.key !== '/material/report/purchase-inbound-detail' &&
    n.key !== '/material/issue' &&
    n.key !== '/collab/send-out' &&
    n.key !== '/collab/receive-in' &&
    n.key !== '/settlement/receivable' &&
    n.key !== '/settlement/payable-factory' &&
    n.key !== '/settlement/payable-supplier' &&
    n.key !== '/settlement/cashier' &&
    n.key !== '/settlement/report/customer-detail' &&
    n.key !== '/settlement/report/factory-detail' &&
    n.key !== '/settlement/report/supplier-detail' &&
    n.key !== '/settlement/report/statement-detail' &&
    !n.children,
  )
  .map((node) => ({
    path: node.key.replace(/^\//, ''),
    element: createPlaceholderElement(extractMenuLabel(node.label)),
  }));

const router = createBrowserRouter([
  {
    path: '/welcome',
    element: createLazyPageElement(Welcome),
  },
  {
    path: '/onboarding/register-enterprise',
    element: createLazyPageElement(RegisterEnterprise),
  },
  {
    path: '/sign-in/*',
    element: createLazyPageElement(SignInPage),
  },
  {
    path: '/',
    element: React.createElement(ProtectedLayout),
    children: [
      { index: true, element: React.createElement(Navigate, { to: '/dashboard/workplace', replace: true }) },
      { path: 'dashboard', element: React.createElement(Navigate, { to: '/dashboard/workplace', replace: true }) },
      { path: 'dashboard/workplace', element: createLazyPageElement(Workplace) },
      { path: 'sample', element: createLazyPageElement(SampleDashboard) },
      { path: 'sample/list', element: createLazyPageElement(SampleList) },
      { path: 'sample/detail', element: createLazyPageElement(SampleDetail) },
      { path: 'sample/follow-template', element: createLazyPageElement(FollowTemplate) },
      { path: 'sample/type', element: createLazyPageElement(SampleType) },
      { path: 'sample/report/costing', element: createLazyPageElement(SampleCostingReport) },
      { path: 'sample/report/order-compare', element: createLazyPageElement(SampleOrderComparisonReport) },
      { path: 'orders/factory', element: createLazyPageElement(FactoryOrders) },
      { path: 'piecework/orders', element: createLazyPageElement(FactoryOrders) },
      { path: 'orders/efficiency', element: createLazyPageElement(OperationalEfficiency) },
      { path: 'orders/report/profit', element: createLazyPageElement(OrderShipmentProfitReport) },
      { path: 'orders/report/cost', element: createLazyPageElement(BulkCostReport) },
      { path: 'orders/report/material-need', element: createLazyPageElement(OrderMaterialRequirementReport) },
      { path: 'orders/report/cut-outsource', element: createLazyPageElement(OrderOutsourcingCuttingDetailReport) },
      { path: 'orders/outsource', element: createLazyPageElement(OutsourcingProductionReport) },
      { path: 'orders/compare', element: createLazyPageElement(OrderProductionComparison) },
      { path: 'product/inbound-other', element: createLazyPageElement(FinishedGoodsOtherInbound) },
      { path: 'product/stock', element: createLazyPageElement(FinishedGoodsStock) },
      { path: 'product/outbound', element: createLazyPageElement(FinishedGoodsOutbound) },
      { path: 'product/report/overview', element: createLazyPageElement(FinishedGoodsInventoryReport) },
      { path: 'product/inbound/pending', element: createLazyPageElement(FinishedGoodsPendingReceipt) },
      { path: 'product/inbound/received', element: createLazyPageElement(FinishedGoodsReceived) },
      { path: 'material/stock', element: createLazyPageElement(MaterialStock) },
      { path: 'material/sales-stocking-suggestion', element: createLazyPageElement(SalesStockingSuggestion) },
      { path: 'material/purchase-prep', element: createLazyPageElement(StockingPurchaseInbound) },
      { path: 'material/report/overview', element: createLazyPageElement(MaterialInventoryReport) },
      { path: 'material/report/purchase-inbound-detail', element: createLazyPageElement(MaterialPurchaseReport) },
      { path: 'material/issue', element: createLazyPageElement(MaterialIssueDetails) },
      { path: 'basic/process-type', element: createLazyPageElement(ProcessTypePage) },
      { path: 'basic/styles', element: createLazyPageElement(StyleMaterials) },
      { path: 'basic/material', element: createLazyPageElement(MaterialArchive) },
      { path: 'basic/partners', element: createLazyPageElement(PartnersPage) },
      { path: 'basic/operation-template', element: createLazyPageElement(OperationTemplatePage) },
      { path: 'basic/warehouse', element: createLazyPageElement(WarehousePage) },
      { path: 'foundation/product/detail', element: createLazyPageElement(StyleDetail) },
      { path: 'settings/profile', element: createLazyPageElement(ProfileSettings) },
      { path: 'settings/company', element: createLazyPageElement(CompanySettings) },
      { path: 'settings/org', element: createLazyPageElement(OrganizationSettings) },
      { path: 'settings/roles', element: createLazyPageElement(RolesSettings) },
      { path: 'settings/preferences', element: createLazyPageElement(PreferencesPage) },
      { path: 'settings/audit', element: createLazyPageElement(ActionLogPage) },
      { path: 'ai/agent', element: createLazyPageElement(AIAgentPoC) },
      { path: 'piecework/cutting/pending', element: createLazyPageElement(CuttingPendingPage) },
      { path: 'piecework/cutting/done', element: createLazyPageElement(CuttingCompletedPage) },
      { path: 'piecework/cutting/list', element: React.createElement(Navigate, { to: '/piecework/cutting/pending', replace: true }) },
      { path: 'piecework/cutting/create', element: React.createElement(Navigate, { to: '/piecework/cutting/pending', replace: true }) },
      { path: 'piecework/cutting/report', element: createLazyPageElement(CuttingReportPage) },
      { path: 'piecework/progress', element: createLazyPageElement(WorkshopProgress) },
      { path: 'piecework/payroll', element: createLazyPageElement(SalaryManagement) },
      { path: 'piecework/report', element: createLazyPageElement(OrderReportAggregation) },
      { path: 'downloads', element: createLazyPageElement(GlobalDownloadCenter) },
      { path: 'piecework/quality', element: createLazyPageElement(QualityControlManagement) },
      { path: 'piecework/outsource', element: createLazyPageElement(OutsourcingManagement) },
      { path: 'piecework', element: createLazyPageElement(PieceworkDashboard) },
      { path: 'collab/send-out', element: createLazyPageElement(OutsourceOrders) },
      { path: 'collab/receive-in', element: createLazyPageElement(IncomingOrders) },
      { path: 'settlement/receivable', element: createLazyPageElement(SettlementCustomerReceipts) },
      { path: 'settlement/payable-factory', element: createLazyPageElement(SettlementFactoryPayments) },
      { path: 'settlement/payable-supplier', element: createLazyPageElement(SettlementSupplierPayments) },
      { path: 'settlement/cashier', element: createLazyPageElement(SettlementCashierAccounts) },
      { path: 'settlement/report/customer-detail', element: createLazyPageElement(SettlementReportCustomerDetails) },
      { path: 'settlement/report/factory-detail', element: createLazyPageElement(SettlementReportFactoryDetails) },
      { path: 'settlement/report/supplier-detail', element: createLazyPageElement(SettlementReportSupplierDetails) },
      { path: 'settlement/report/statement-detail', element: createLazyPageElement(SettlementReportReconciliationDetails) },
      ...autoChildren,
      { path: 'pattern', element: createPlaceholderElement('打板') },
      { path: 'orders', element: createPlaceholderElement('订单生产') },
      { path: 'material', element: createPlaceholderElement('物料进销存') },
      { path: 'product', element: createPlaceholderElement('成品进销存') },
      { path: 'collab', element: createPlaceholderElement('协同中心') },
      { path: 'settlement', element: createPlaceholderElement('对账结算') },
      { path: 'basic', element: createPlaceholderElement('基础资料') },
      { path: 'ai', element: React.createElement(Navigate, { to: '/ai/agent', replace: true }) },
      { path: 'settings', element: React.createElement(Navigate, { to: '/settings/profile', replace: true }) },
    ],
  },
  {
    path: '/sale',
    element: React.createElement(ProtectedTenantOutlet),
    children: [
      { index: true, element: React.createElement(Navigate, { to: '/sale/workbench', replace: true }) },
      { path: 'workbench', element: createLazyPageElement(SaleCenterWorkspace) },
      { path: 'dashboard', element: React.createElement(Navigate, { to: '/sale/workbench', replace: true }) },
      { path: 'products/sync', element: createLazyPageElement(SaleCenterWorkspace) },
      { path: 'products/manage', element: createLazyPageElement(SaleCenterWorkspace) },
      { path: 'ozon/listing', element: createLazyPageElement(SaleCenterWorkspace) },
      { path: 'ozon/listing-details', element: createLazyPageElement(SaleCenterWorkspace) },
      { path: 'ozon/inventory', element: createLazyPageElement(SaleCenterWorkspace) },
      { path: 'ozon/promotions', element: createLazyPageElement(SaleCenterWorkspace) },
      { path: 'products/publish', element: React.createElement(Navigate, { to: '/sale/ozon/listing', replace: true }) },
      { path: 'products/bindings', element: createLazyPageElement(SaleCenterWorkspace) },
      { path: 'orders', element: React.createElement(Navigate, { to: '/sale/orders/issues', replace: true }) },
      { path: 'orders/overview', element: createLazyPageElement(SaleCenterWorkspace) },
      { path: 'orders/issues', element: createLazyPageElement(SaleCenterWorkspace) },
      { path: 'fulfillment-workbench/ozon-fbs', element: createLazyPageElement(SaleCenterWorkspace) },
      { path: 'sales-data', element: createLazyPageElement(SaleCenterWorkspace) },
      { path: 'insights/risk', element: React.createElement(Navigate, { to: '/sale/sales-data', replace: true }) },
      { path: 'shops', element: createLazyPageElement(SaleCenterWorkspace) },
      { path: 'governance/sync', element: createLazyPageElement(SaleCenterWorkspace) },
      { path: 'tutorials', element: createLazyPageElement(SaleCenterWorkspace) },
      { path: 'channels/accounts', element: React.createElement(Navigate, { to: '/sale/shops', replace: true }) },
      { path: 'channels/mappings', element: React.createElement(Navigate, { to: '/sale/products/bindings', replace: true }) },
      { path: 'channels/credentials', element: React.createElement(Navigate, { to: '/sale/shops', replace: true }) },
      { path: 'sync-logs', element: React.createElement(Navigate, { to: '/sale/governance/sync', replace: true }) },
      { path: 'fulfillments', element: React.createElement(Navigate, { to: '/sale/orders/issues', replace: true }) },
      { path: 'fulfillment-workbench/temu-full-managed', element: React.createElement(Navigate, { to: '/sale/orders/issues', replace: true }) },
    ],
  },
]);

export default router;
