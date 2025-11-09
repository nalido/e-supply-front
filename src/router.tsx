import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import ProtectedLayout from './layouts/ProtectedLayout';
import Workplace from './views/Workplace';
import SampleDashboard from './views/SampleDashboard';
import SampleList from './views/SampleList';
import SampleDetail from './views/SampleDetail';
import SampleFollow from './views/SampleFollow';
import FollowTemplate from './views/FollowTemplate';
import SampleType from './views/SampleType';
import SampleCostingReport from './views/SampleCostingReport';
import SampleOrderComparisonReport from './views/SampleOrderComparisonReport';
import FactoryOrders from './views/FactoryOrders';
import CuttingPendingPage from './views/CuttingPending';
import CuttingCompletedPage from './views/CuttingCompleted';
import CuttingReportPage from './views/CuttingReport';
import ProcessTypePage from './views/ProcessType';
import StyleMaterials from './views/StyleMaterials';
import StyleDetail from './views/StyleDetail';
import MaterialArchive from './views/MaterialArchive';
import PartnersPage from './views/Partners';
import OperationTemplatePage from './views/OperationTemplate';
import WarehousePage from './views/Warehouse';
import WorkshopProgress from './views/WorkshopProgress';
import PieceworkDashboard from './views/PieceworkDashboard';
import OperationalEfficiency from './views/OperationalEfficiency';
import IncomingOrders from './views/IncomingOrders';
import OutsourceOrders from './views/OutsourceOrders';
import OutsourcingManagement from './views/OutsourcingManagement';
import OutsourcingProductionReport from './views/OutsourcingProductionReport';
import BulkCostReport from './views/BulkCostReport';
import OrderMaterialRequirementReport from './views/OrderMaterialRequirementReport';
import SalaryManagement from './views/SalaryManagement';
import FinishedGoodsInventoryReport from './views/FinishedGoodsInventoryReport';
import FinishedGoodsOtherInbound from './views/FinishedGoodsOtherInbound';
import FinishedGoodsOutbound from './views/FinishedGoodsOutbound';
import FinishedGoodsPendingReceipt from './views/FinishedGoodsPendingReceipt';
import FinishedGoodsReceived from './views/FinishedGoodsReceived';
import FinishedGoodsStock from './views/FinishedGoodsStock';
import StockingPurchaseInbound from './views/StockingPurchaseInbound';
import OrderProductionComparison from './views/OrderProductionComparison';
import OrderReportAggregation from './views/OrderReportAggregation';
import OrderShipmentProfitReport from './views/OrderShipmentProfitReport';
import MaterialInventoryReport from './views/MaterialInventoryReport';
import MaterialPurchaseReport from './views/MaterialPurchaseReport';
import MaterialIssueDetails from './views/MaterialIssueDetails';
import MaterialStock from './views/MaterialStock';
import OrderPurchaseInbound from './views/OrderPurchaseInbound';
import OrderOutsourcingCuttingDetailReport from './views/OrderOutsourcingCuttingDetailReport';
import SettlementCustomerReceipts from './views/SettlementCustomerReceipts';
import SettlementFactoryPayments from './views/SettlementFactoryPayments';
import SettlementSupplierPayments from './views/SettlementSupplierPayments';
import SettlementCashierAccounts from './views/SettlementCashierAccounts';
import SettlementReportCustomerDetails from './views/SettlementReportCustomerDetails';
import SettlementReportFactoryDetails from './views/SettlementReportFactoryDetails';
import SettlementReportSupplierDetails from './views/SettlementReportSupplierDetails';
import SettlementReportReconciliationDetails from './views/SettlementReportReconciliationDetails';
import QualityControlManagement from './views/QualityControlManagement';
import {
  ActionLogPage,
  CompanySettings,
  CredentialsPage,
  JoinApplicationsPage,
  OrganizationSettings,
  PreferencesPage,
  ProfileSettings,
  RolesSettings,
  UserListPage,
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
    n.key !== '/sample' &&
    n.key !== '/sample/list' &&
    n.key !== '/sample/follow' &&
    n.key !== '/sample/follow-template' &&
    n.key !== '/sample/type' &&
    n.key !== '/orders/factory' &&
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
    n.key !== '/settings/preferences' &&
    n.key !== '/settings/user/users' &&
    n.key !== '/settings/user/onboarding' &&
    n.key !== '/settings/user/keys' &&
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
    n.key !== '/material/purchase-order' &&
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
    path: '/',
    element: React.createElement(ProtectedLayout),
    children: [
      { index: true, element: React.createElement(Navigate, { to: '/dashboard/workplace', replace: true }) },
      { path: 'dashboard/workplace', element: React.createElement(Workplace) },
      { path: 'sample', element: React.createElement(SampleDashboard) },
      { path: 'sample/list', element: React.createElement(SampleList) },
      { path: 'sample/detail', element: React.createElement(SampleDetail) },
      { path: 'sample/follow', element: React.createElement(SampleFollow) },
      { path: 'sample/follow-template', element: React.createElement(FollowTemplate) },
      { path: 'sample/type', element: React.createElement(SampleType) },
      { path: 'sample/report/costing', element: React.createElement(SampleCostingReport) },
      { path: 'sample/report/order-compare', element: React.createElement(SampleOrderComparisonReport) },
      { path: 'orders/factory', element: React.createElement(FactoryOrders) },
      { path: 'orders/efficiency', element: React.createElement(OperationalEfficiency) },
      { path: 'orders/report/profit', element: React.createElement(OrderShipmentProfitReport) },
      { path: 'orders/report/cost', element: React.createElement(BulkCostReport) },
      { path: 'orders/report/material-need', element: React.createElement(OrderMaterialRequirementReport) },
      { path: 'orders/report/cut-outsource', element: React.createElement(OrderOutsourcingCuttingDetailReport) },
      { path: 'orders/outsource', element: React.createElement(OutsourcingProductionReport) },
      { path: 'orders/compare', element: React.createElement(OrderProductionComparison) },
      { path: 'product/inbound-other', element: React.createElement(FinishedGoodsOtherInbound) },
      { path: 'product/stock', element: React.createElement(FinishedGoodsStock) },
      { path: 'product/outbound', element: React.createElement(FinishedGoodsOutbound) },
      { path: 'product/report/overview', element: React.createElement(FinishedGoodsInventoryReport) },
      { path: 'product/inbound/pending', element: React.createElement(FinishedGoodsPendingReceipt) },
      { path: 'product/inbound/received', element: React.createElement(FinishedGoodsReceived) },
      { path: 'material/stock', element: React.createElement(MaterialStock) },
      { path: 'material/purchase-order', element: React.createElement(OrderPurchaseInbound) },
      { path: 'material/purchase-prep', element: React.createElement(StockingPurchaseInbound) },
      { path: 'material/report/overview', element: React.createElement(MaterialInventoryReport) },
      { path: 'material/report/purchase-inbound-detail', element: React.createElement(MaterialPurchaseReport) },
      { path: 'material/issue', element: React.createElement(MaterialIssueDetails) },
      { path: 'basic/process-type', element: React.createElement(ProcessTypePage) },
      { path: 'basic/styles', element: React.createElement(StyleMaterials) },
      { path: 'basic/material', element: React.createElement(MaterialArchive) },
      { path: 'basic/partners', element: React.createElement(PartnersPage) },
      { path: 'basic/operation-template', element: React.createElement(OperationTemplatePage) },
      { path: 'basic/warehouse', element: React.createElement(WarehousePage) },
      { path: 'foundation/product/detail', element: React.createElement(StyleDetail) },
      { path: 'settings/profile', element: React.createElement(ProfileSettings) },
      { path: 'settings/company', element: React.createElement(CompanySettings) },
      { path: 'settings/org', element: React.createElement(OrganizationSettings) },
      { path: 'settings/roles', element: React.createElement(RolesSettings) },
      { path: 'settings/preferences', element: React.createElement(PreferencesPage) },
      { path: 'settings/audit', element: React.createElement(ActionLogPage) },
      { path: 'settings/user/users', element: React.createElement(UserListPage) },
      { path: 'settings/user/onboarding', element: React.createElement(JoinApplicationsPage) },
      { path: 'settings/user/keys', element: React.createElement(CredentialsPage) },
      { path: 'piecework/cutting/pending', element: React.createElement(CuttingPendingPage) },
      { path: 'piecework/cutting/done', element: React.createElement(CuttingCompletedPage) },
      { path: 'piecework/cutting/report', element: React.createElement(CuttingReportPage) },
      { path: 'piecework/progress', element: React.createElement(WorkshopProgress) },
      { path: 'piecework/payroll', element: React.createElement(SalaryManagement) },
      { path: 'piecework/report', element: React.createElement(OrderReportAggregation) },
      { path: 'piecework/quality', element: React.createElement(QualityControlManagement) },
      { path: 'piecework/outsource', element: React.createElement(OutsourcingManagement) },
      { path: 'piecework', element: React.createElement(PieceworkDashboard) },
      { path: 'collab/send-out', element: React.createElement(OutsourceOrders) },
      { path: 'collab/receive-in', element: React.createElement(IncomingOrders) },
      { path: 'settlement/receivable', element: React.createElement(SettlementCustomerReceipts) },
      { path: 'settlement/payable-factory', element: React.createElement(SettlementFactoryPayments) },
      { path: 'settlement/payable-supplier', element: React.createElement(SettlementSupplierPayments) },
      { path: 'settlement/cashier', element: React.createElement(SettlementCashierAccounts) },
      { path: 'settlement/report/customer-detail', element: React.createElement(SettlementReportCustomerDetails) },
      { path: 'settlement/report/factory-detail', element: React.createElement(SettlementReportFactoryDetails) },
      { path: 'settlement/report/supplier-detail', element: React.createElement(SettlementReportSupplierDetails) },
      { path: 'settlement/report/statement-detail', element: React.createElement(SettlementReportReconciliationDetails) },
      ...autoChildren,
      { path: 'pattern', element: createPlaceholderElement('打板') },
      { path: 'orders', element: createPlaceholderElement('订单生产') },
      { path: 'material', element: createPlaceholderElement('物料进销存') },
      { path: 'product', element: createPlaceholderElement('成品进销存') },
      { path: 'collab', element: createPlaceholderElement('协同中心') },
      { path: 'settlement', element: createPlaceholderElement('对账结算') },
      { path: 'appstore', element: createPlaceholderElement('应用商店') },
      { path: 'basic', element: createPlaceholderElement('基础资料') },
      { path: 'settings', element: React.createElement(Navigate, { to: '/settings/profile', replace: true }) },
      { path: 'guide', element: createPlaceholderElement('操作指南') },
    ],
  },
]);

export default router;
