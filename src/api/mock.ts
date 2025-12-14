// 统一 Mock API 层：所有页面的数据先走这里，后端完成后把对应接口指向真实服务即可
// 结构：每个领域一个命名空间，方法返回 Promise，模拟网络延迟

import type {
  FollowTemplateSummary,
  SampleChartPoint,
  SampleDashboardStats,
  SampleOverdueItem,
  SamplePieDatum,
  SampleTypeItem,
  TemplateNode,
  SampleOrder,
  SampleQueryParams,
  SampleStats,
  SampleStatus,
} from '../types/sample';
import type {
  BulkCostAggregation,
  BulkCostListParams,
  BulkCostListResponse,
} from '../types/bulk-cost-report';
import type {
  FinishedGoodsInventoryAggregation,
  FinishedGoodsInventoryListParams,
  FinishedGoodsInventoryListResponse,
  FinishedGoodsInventoryQueryParams,
} from '../types/finished-goods-inventory';
import type {
  MaterialInventoryAggregation,
  MaterialInventoryListParams,
  MaterialInventoryListResponse,
  MaterialInventoryQueryParams,
} from '../types/material-inventory';
import type {
  FinishedGoodsOtherInboundFormPayload,
  FinishedGoodsOtherInboundListParams,
  FinishedGoodsOtherInboundListResponse,
  FinishedGoodsOtherInboundMeta,
} from '../types/finished-goods-other-inbound';
import type {
  FinishedGoodsOutboundListParams,
  FinishedGoodsOutboundListResponse,
  FinishedGoodsOutboundMeta,
} from '../types/finished-goods-outbound';
import type {
  FinishedGoodsPendingReceiptListParams,
  FinishedGoodsPendingReceiptListResponse,
  FinishedGoodsPendingReceiptMeta,
  FinishedGoodsPendingReceiptReceivePayload,
} from '../types/finished-goods-pending-receipt';
import type {
  FinishedGoodsReceivedListParams,
  FinishedGoodsReceivedListResponse,
  FinishedGoodsReceivedMeta,
  FinishedGoodsReceivedRecord,
  FinishedGoodsReceivedUpdatePayload,
} from '../types/finished-goods-received';
import type {
  FinishedGoodsStockListParams,
  FinishedGoodsStockListResponse,
  FinishedGoodsStockMeta,
} from '../types/finished-goods-stock';
import type {
  OperationalEfficiencyListItem,
  OperationalEfficiencyListParams,
  OperationalEfficiencyListResponse,
  OperationalEfficiencyMeta,
  OperationalEfficiencyTemplatePayload,
} from '../types/operational-efficiency';
import type {
  MaterialStockListParams,
  MaterialStockListResponse,
  MaterialStockMeta,
} from '../types/material-stock';
import type {
  MaterialIssueMeta,
  MaterialIssueListParams,
  MaterialIssueListResponse,
} from '../types/material-issue';
import type {
  MaterialPurchaseReportListParams,
  MaterialPurchaseReportListResponse,
  MaterialPurchaseReportMeta,
} from '../types/material-purchase-report';
import type {
  OrderPurchaseInboundExportParams,
  OrderPurchaseInboundListParams,
  OrderPurchaseInboundListResponse,
  OrderPurchaseInboundMeta,
  OrderPurchaseInboundReceivePayload,
  OrderPurchaseInboundStatusPayload,
} from '../types/order-purchase-inbound';
import type {
  OrderMaterialRequirementListParams,
  OrderMaterialRequirementListResponse,
} from '../types/order-material-requirement-report';
import type {
  OrderShipmentProfitAggregation,
  OrderShipmentProfitListParams,
  OrderShipmentProfitListResponse,
} from '../types/order-shipment-profit-report';
import type {
  ProductionComparisonListParams,
  ProductionComparisonListResponse,
} from '../types/order-production-comparison';
import type {
  OutsourcingCuttingDetailListParams,
  OutsourcingCuttingDetailListResponse,
} from '../types/order-outsourcing-cutting-detail-report';
import type {
  OutsourcingManagementListParams,
  OutsourcingManagementListResponse,
  OutsourcingManagementMeta,
} from '../types/outsourcing-management';
import type {
  OutsourcingProductionReportListParams,
  OutsourcingProductionReportListResponse,
  OutsourcingProductionReportMeta,
  OutsourcingSubcontractorStat,
} from '../types/outsourcing-production-report';
import type {
  OrderTicketLotListParams,
  OrderTicketLotListResponse,
  OrderTicketRecordListParams,
  OrderTicketRecordListResponse,
} from '../types/order-ticket-details-report';
import type {
  OrderProgressDetailsListParams,
  OrderProgressDetailsListResponse,
} from '../types/order-progress-details-report';
import type {
  ProcessProductionDetailParams,
  ProcessProductionDetailResponse,
  ProcessProductionExportParams,
  ProcessProductionLotListParams,
  ProcessProductionLotListResponse,
} from '../types/process-production-comparison-report';
import type {
  QualityControlExportParams,
  QualityControlListParams,
  QualityControlListResponse,
  QualityControlMeta,
} from '../types/quality-control-management';
import type {
  SalaryListParams,
  SalaryListResponse,
  SalaryMeta,
  SalarySettlePayload,
} from '../types/salary-management';
import type {
  SampleCostAggregation,
  SampleCostListParams,
  SampleCostListResponse,
} from '../types/sample-costing-report';
import type {
  SampleOrderAggregation,
  SampleOrderComparisonParams,
  SampleOrderComparisonResponse,
} from '../types/sample-order-comparison-report';
import type {
  StockingBatchReceivePayload,
  StockingPurchaseExportParams,
  StockingPurchaseListParams,
  StockingPurchaseListResponse,
  StockingPurchaseMeta,
  StockingStatusUpdatePayload,
} from '../types/stocking-purchase-inbound';
import type { SampleOrderDetail } from '../types/sample-detail';
import type { PaginatedStyleData, StyleData, StyleListParams } from '../types/style';
import type { SampleCreationMeta, SampleCreationPayload } from '../types/sample-create';
import {
  createSampleOrder,
  fetchSampleOrderDetail,
  fetchSampleOrders,
  fetchSampleStats,
  getPriorityColor,
  getPriorityText,
  getStatusColor,
  getStatusText,
  sampleOptions,
  updateFollowProgressNode,
} from '../mock/sample';
import { fetchBulkCostAggregation, fetchBulkCostList } from '../mock/orders-report';
import {
  createOperationalEfficiencyTemplate,
  fetchOperationalEfficiencyList,
  fetchOperationalEfficiencyMeta,
  removeOperationalEfficiencyTemplate,
  setOperationalEfficiencyDefault,
  updateOperationalEfficiencyTemplate,
} from '../mock/orders-operational-efficiency';
import {
  fetchFinishedGoodsInventoryAggregation,
  fetchFinishedGoodsInventoryList,
} from '../mock/product-report';
import {
  fetchMaterialInventoryAggregation,
  fetchMaterialInventoryList,
} from '../mock/material-report';
import {
  fetchMaterialStockList,
  fetchMaterialStockMeta,
} from '../mock/material-stock';
import { fetchOrderMaterialRequirementList } from '../mock/order-material-requirement-report';
import {
  fetchMaterialPurchaseReportList,
  fetchMaterialPurchaseReportMeta,
} from '../mock/material-purchase-report';
import {
  fetchMaterialIssueList,
  fetchMaterialIssueMeta,
} from '../mock/material-issue';
import {
  exportOrderPurchaseInbound,
  fetchOrderPurchaseInboundList,
  fetchOrderPurchaseInboundMeta,
  submitOrderPurchaseInboundReceive,
  updateOrderPurchaseInboundStatus,
} from '../mock/order-purchase-inbound';
import { fetchOutsourcingCuttingDetailList } from '../mock/order-outsourcing-cutting-detail-report';
import {
  exportProductionComparison,
  fetchProductionComparisonList,
} from '../mock/order-production-comparison';
import {
  exportOrderProgressDetails,
  fetchOrderProgressDetailsList,
} from '../mock/order-progress-details-report';
import {
  exportProcessProductionMatrix,
  fetchProcessProductionDetails,
  fetchProcessProductionLots,
} from '../mock/order-process-production-comparison-report';
import {
  exportQualityControlRecords,
  fetchQualityControlList,
  fetchQualityControlMeta,
} from '../mock/quality-control-management';
import {
  fetchSalaryList,
  fetchSalaryMeta,
  settleSalary,
} from '../mock/salary-management';
import {
  exportSampleCostList,
  fetchSampleCostAggregation,
  fetchSampleCostList,
} from '../mock/sample-costing-report';
import {
  exportSampleOrderComparison,
  fetchSampleOrderAggregation,
  fetchSampleOrderComparisonList,
} from '../mock/sample-order-comparison-report';
import {
  exportStockingPurchaseList,
  fetchStockingPurchaseList,
  fetchStockingPurchaseMeta,
  submitStockingBatchReceive,
  updateStockingPurchaseStatus,
} from '../mock/stocking-purchase-inbound';
import {
  exportOrderTicketDetails,
  fetchOrderTicketLots,
  fetchOrderTicketRecords,
} from '../mock/order-ticket-details-report';
import {
  exportOrderShipmentProfit,
  fetchOrderShipmentProfitAggregation,
  fetchOrderShipmentProfitList,
} from '../mock/order-shipment-profit-report';
import {
  createFinishedGoodsOtherInbound,
  fetchFinishedGoodsOtherInboundList,
  fetchFinishedGoodsOtherInboundMeta,
  removeFinishedGoodsOtherInbound,
  updateFinishedGoodsOtherInbound,
} from '../mock/product-other-inbound';
import {
  fetchFinishedGoodsOutboundList,
  fetchFinishedGoodsOutboundMeta,
} from '../mock/product-outbound';
import {
  fetchFinishedGoodsPendingReceiptList,
  fetchFinishedGoodsPendingReceiptMeta,
  submitFinishedGoodsReceipt,
} from '../mock/product-inbound-pending';
import {
  exportOutsourcingManagement,
  fetchOutsourcingManagementList,
  fetchOutsourcingManagementMeta,
} from '../mock/outsourcing-management';
import {
  exportOutsourcingProductionReport,
  fetchOutsourcingProductionReportList,
  fetchOutsourcingProductionReportMeta,
  fetchOutsourcingSubcontractorStats,
  submitOutsourcingReportPrintTask,
} from '../mock/outsourcing-production-report';
import {
  exportFinishedGoodsReceived,
  fetchFinishedGoodsReceivedList,
  fetchFinishedGoodsReceivedMeta,
  removeFinishedGoodsReceivedRecords,
  updateFinishedGoodsReceivedRecord,
} from '../mock/product-inbound-received';
import {
  fetchFinishedGoodsStockList,
  fetchFinishedGoodsStockMeta,
} from '../mock/product-stock';
import { getSampleCreationMeta } from '../mock/sample-creation';
import {
  createCashierAccount,
  fetchCashierAccountMeta,
  fetchCashierAccounts,
  removeCashierAccount,
  updateCashierAccount,
} from '../mock/settlement-accounts';
import {
  createCustomerReceipt,
  exportCustomerReceiptReport,
  fetchCustomerReceiptList,
  fetchCustomerReceiptMeta,
} from '../mock/settlement-customer-receipts';
import {
  createFactoryPayment,
  exportFactoryPaymentReport,
  fetchFactoryPaymentList,
  fetchFactoryPaymentMeta,
} from '../mock/settlement-factory-payments';
import {
  createSupplierPayment,
  exportSupplierPaymentReport,
  fetchSupplierPaymentList,
  fetchSupplierPaymentMeta,
} from '../mock/settlement-supplier-payments';
import {
  exportCustomerBusinessDetailReport,
  fetchCustomerBusinessDetailList,
  fetchCustomerBusinessDetailMeta,
  fetchCustomerBusinessDetailOverview,
} from '../mock/settlement-report-customer-details';
import {
  exportFactoryBusinessDetailReport,
  fetchFactoryBusinessDetailList,
  fetchFactoryBusinessDetailMeta,
  fetchFactoryBusinessDetailOverview,
} from '../mock/settlement-report-factory-details';
import {
  exportSupplierBusinessDetailReport,
  fetchSupplierBusinessDetailList,
  fetchSupplierBusinessDetailMeta,
  fetchSupplierBusinessDetailOverview,
} from '../mock/settlement-report-supplier-details';
import {
  cancelReconciliation,
  exportReconciliationDetailsReport,
  fetchReconciliationDetailsList,
  fetchReconciliationDetailsMeta,
} from '../mock/settlement-report-reconciliation-details';

export type Paginated<T> = {
  list: T[];
  total: number;
};

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

type DashboardPendingFactoryItem = {
  id: number;
  orderNo: string;
  styleName: string;
  org: string;
  date: string;
  qty: number;
  type: string;
};

type FactoryOrderSummary = {
  id: number;
  orderNo: string;
  customer: string;
  style: string;
  qty: number;
  dueDate: string;
};

type MaterialStockItem = {
  id: number;
  sku: string;
  name: string;
  qty: number;
  warehouse: string;
};

type ProductInboundPendingItem = {
  id: number;
  orderNo: string;
  style: string;
  qty: number;
  status: string;
};

const baseStyleCatalog: StyleData[] = [
  {
    id: 'ET0110',
    styleNo: 'ET0110',
    styleName: '儿童羊羔毛拉链夹克套装',
    image: '/assets/images/styles/ET0110.jpg',
    colors: ['黑色-上衣', '黑色-裤子', '浅灰-上衣', '浅灰-裤子', '藏青-上衣', '藏青-裤子'],
    sizes: ['110', '120', '130', '140', '150', '160'],
    category: '儿童套装',
    status: 'active',
    createTime: '2024-01-15T00:00:00.000Z',
    updateTime: '2024-01-15T00:00:00.000Z',
  },
  {
    id: 'ET0168',
    styleNo: 'ET0168',
    styleName: '儿童条纹工装卫裤',
    image: '/assets/images/styles/ET0168.jpg',
    colors: ['军绿', '藏青', '浅灰'],
    sizes: ['100', '110', '120', '130', '140'],
    category: '儿童裤装',
    status: 'active',
    createTime: '2024-02-01T00:00:00.000Z',
    updateTime: '2024-02-06T00:00:00.000Z',
  },
  {
    id: 'ET0362',
    styleNo: 'ET0362',
    styleName: '儿童黑色波浪拉链速干短裤',
    image: '/assets/images/styles/ET0362.jpg',
    colors: ['黑色'],
    sizes: ['110', '120', '130', '140', '150'],
    category: '儿童裤装',
    status: 'active',
    createTime: '2024-03-08T00:00:00.000Z',
    updateTime: '2024-04-01T00:00:00.000Z',
  },
  {
    id: 'ET0151',
    styleNo: 'ET0151',
    styleName: '儿童拉链连帽拼色套装',
    image: '/assets/images/styles/ET0151.jpg',
    colors: ['粉色', '藏青', '卡其'],
    sizes: ['100', '110', '120', '130', '140', '150'],
    category: '儿童套装',
    status: 'active',
    createTime: '2023-12-22T00:00:00.000Z',
    updateTime: '2024-02-20T00:00:00.000Z',
  },
  {
    id: 'ET0152',
    styleNo: 'ET0152',
    styleName: '儿童拼色棒球服套装',
    image: '/assets/images/styles/ET0152.jpg',
    colors: ['酒红', '藏青', '牛油果'],
    sizes: ['100', '110', '120', '130', '140', '150'],
    category: '儿童套装',
    status: 'active',
    createTime: '2023-12-01T00:00:00.000Z',
    updateTime: '2024-01-10T00:00:00.000Z',
  },
  {
    id: 'ET0193',
    styleNo: 'ET0193',
    styleName: '儿童书包卫衣',
    image: '/assets/images/styles/ET0193.jpg',
    colors: ['白色', '黑色', '浅灰'],
    sizes: ['110', '120', '130', '140', '150', '160'],
    category: '儿童卫衣',
    status: 'active',
    createTime: '2024-01-05T00:00:00.000Z',
    updateTime: '2024-03-02T00:00:00.000Z',
  },
  {
    id: 'ET5031',
    styleNo: 'ET5031',
    styleName: '儿童高领开衫撞色条纹套装',
    image: '/assets/images/styles/ET5031.jpg',
    colors: ['咖色', '墨绿', '藏青'],
    sizes: ['110', '120', '130', '140', '150'],
    category: '儿童套装',
    status: 'inactive',
    createTime: '2024-02-10T00:00:00.000Z',
    updateTime: '2024-03-18T00:00:00.000Z',
  },
  {
    id: 'ET5033',
    styleNo: 'ET5033',
    styleName: '儿童撞色条纹卫衣卫裤套装',
    image: '/assets/images/styles/ET5033.jpg',
    colors: ['橘色', '湖蓝', '黑色'],
    sizes: ['90', '100', '110', '120', '130', '140'],
    category: '儿童套装',
    status: 'active',
    createTime: '2024-02-18T00:00:00.000Z',
    updateTime: '2024-03-28T00:00:00.000Z',
  },
  {
    id: 'ET0409',
    styleNo: 'ET0409',
    styleName: '儿童拼色连帽开衫套装',
    image: '/assets/images/styles/ET0409.jpg',
    colors: ['粉色', '藏青', '黑色'],
    sizes: ['100', '110', '120', '130', '140', '150'],
    category: '儿童套装',
    status: 'active',
    createTime: '2024-03-12T00:00:00.000Z',
    updateTime: '2024-04-05T00:00:00.000Z',
  },
  {
    id: 'CT0010',
    styleNo: 'CT0010',
    styleName: '华夫格长袖衬衫',
    image: '/assets/images/styles/CT0010.jpg',
    colors: ['白色', '浅蓝', '米黄'],
    sizes: ['S', 'M', 'L', 'XL'],
    category: '成人衬衫',
    status: 'active',
    createTime: '2023-11-12T00:00:00.000Z',
    updateTime: '2024-02-01T00:00:00.000Z',
  },
  {
    id: 'ET5300',
    styleNo: 'ET5300',
    styleName: '儿童飞行员羽绒服',
    image: '/assets/images/styles/ET5300.jpg',
    colors: ['军绿', '焦糖', '藏青'],
    sizes: ['100', '110', '120', '130', '140', '150'],
    category: '儿童外套',
    status: 'active',
    createTime: '2023-12-28T00:00:00.000Z',
    updateTime: '2024-02-27T00:00:00.000Z',
  },
  {
    id: 'ET5401',
    styleNo: 'ET5401',
    styleName: '儿童摇粒绒半开襟卫衣',
    image: '/assets/images/styles/ET5401.jpg',
    colors: ['雾霾蓝', '浅卡其'],
    sizes: ['90', '100', '110', '120', '130'],
    category: '儿童卫衣',
    status: 'inactive',
    createTime: '2024-01-22T00:00:00.000Z',
    updateTime: '2024-03-16T00:00:00.000Z',
  },
  {
    id: 'ET5502',
    styleNo: 'ET5502',
    styleName: '儿童宽松束脚运动裤',
    image: '/assets/images/styles/ET5502.jpg',
    colors: ['灰蓝', '黑色'],
    sizes: ['110', '120', '130', '140', '150', '160'],
    category: '儿童裤装',
    status: 'active',
    createTime: '2024-01-30T00:00:00.000Z',
    updateTime: '2024-03-14T00:00:00.000Z',
  },
  {
    id: 'ET5605',
    styleNo: 'ET5605',
    styleName: '儿童撞色拼接风衣',
    image: '/assets/images/styles/ET5605.jpg',
    colors: ['驼色', '藏青'],
    sizes: ['110', '120', '130', '140', '150'],
    category: '儿童外套',
    status: 'active',
    createTime: '2024-02-12T00:00:00.000Z',
    updateTime: '2024-03-22T00:00:00.000Z',
  },
  {
    id: 'ET5201',
    styleNo: 'ET5201',
    styleName: '儿童轻薄羽绒马甲',
    image: '/assets/images/styles/ET5201.jpg',
    colors: ['藏青', '彩蓝', '暖黄'],
    sizes: ['90', '100', '110', '120', '130'],
    category: '儿童外套',
    status: 'inactive',
    createTime: '2023-10-18T00:00:00.000Z',
    updateTime: '2024-01-08T00:00:00.000Z',
  },
  {
    id: 'ET5109',
    styleNo: 'ET5109',
    styleName: '儿童灯芯绒双面穿外套',
    image: '/assets/images/styles/ET5109.jpg',
    colors: ['奶咖', '橘红'],
    sizes: ['100', '110', '120', '130', '140'],
    category: '儿童外套',
    status: 'active',
    createTime: '2023-11-30T00:00:00.000Z',
    updateTime: '2024-02-18T00:00:00.000Z',
  },
  {
    id: 'ET5212',
    styleNo: 'ET5212',
    styleName: '儿童棉服背心套装',
    image: '/assets/images/styles/ET5212.jpg',
    colors: ['黑色', '奶油白'],
    sizes: ['100', '110', '120', '130', '140', '150'],
    category: '儿童套装',
    status: 'active',
    createTime: '2024-02-20T00:00:00.000Z',
    updateTime: '2024-03-30T00:00:00.000Z',
  },
  {
    id: 'ET5308',
    styleNo: 'ET5308',
    styleName: '儿童印花半高领卫衣',
    image: '/assets/images/styles/ET5308.jpg',
    colors: ['雾粉', '奶咖', '烟紫'],
    sizes: ['100', '110', '120', '130', '140', '150'],
    category: '儿童卫衣',
    status: 'active',
    createTime: '2024-01-12T00:00:00.000Z',
    updateTime: '2024-03-12T00:00:00.000Z',
  },
  {
    id: 'ET5406',
    styleNo: 'ET5406',
    styleName: '儿童撞色排扣针织开衫',
    image: '/assets/images/styles/ET5406.jpg',
    colors: ['砖红', '墨绿', '藏青'],
    sizes: ['90', '100', '110', '120', '130', '140'],
    category: '儿童针织',
    status: 'active',
    createTime: '2024-02-05T00:00:00.000Z',
    updateTime: '2024-03-25T00:00:00.000Z',
  },
  {
    id: 'ET5410',
    styleNo: 'ET5410',
    styleName: '儿童圆领提花针织衫',
    image: '/assets/images/styles/ET5410.jpg',
    colors: ['雾霾蓝', '杏色'],
    sizes: ['100', '110', '120', '130', '140', '150'],
    category: '儿童针织',
    status: 'inactive',
    createTime: '2024-01-18T00:00:00.000Z',
    updateTime: '2024-03-08T00:00:00.000Z',
  },
  {
    id: 'ET5315',
    styleNo: 'ET5315',
    styleName: '儿童复古针织马甲',
    image: '/assets/images/styles/ET5315.jpg',
    colors: ['咖色', '墨绿'],
    sizes: ['100', '110', '120', '130', '140'],
    category: '儿童针织',
    status: 'active',
    createTime: '2024-02-25T00:00:00.000Z',
    updateTime: '2024-04-04T00:00:00.000Z',
  },
  {
    id: 'ET5320',
    styleNo: 'ET5320',
    styleName: '儿童印花连帽卫衣',
    image: '/assets/images/styles/ET5320.jpg',
    colors: ['白色', '藏青', '砖红'],
    sizes: ['110', '120', '130', '140', '150'],
    category: '儿童卫衣',
    status: 'active',
    createTime: '2023-11-05T00:00:00.000Z',
    updateTime: '2024-02-05T00:00:00.000Z',
  },
];

const styleCatalog: StyleData[] = [
  ...baseStyleCatalog,
  ...Array.from({ length: Math.max(130 - baseStyleCatalog.length, 0) }).map((_, index) => {
    const style = baseStyleCatalog[index % baseStyleCatalog.length];
    const suffix = index + 1;
    const baseUpdatedAt = style.updateTime ? new Date(style.updateTime).getTime() : Date.now();
    const cloneStyleNo = `${style.styleNo}-${suffix}`;
    return {
      ...style,
      id: `${style.id}-${suffix}`,
      styleNo: cloneStyleNo,
      styleName: `${style.styleName} ${suffix}`,
      updateTime: new Date(baseUpdatedAt + suffix * 86400000).toISOString(),
    };
  }),
];

export const dashboard = {
  async overview() {
    await delay(300);
    return {
      newOrders: 332010,
      sampleThisYear: 379,
      inProduction: 820233,
      shipped: 591501,
    };
  },
  async pendingCustomer(): Promise<Paginated<Record<string, never>>> {
    await delay(300);
    return { list: [], total: 0 };
  },
  async pendingFactory(): Promise<Paginated<DashboardPendingFactoryItem>> {
    await delay(300);
    return {
      list: Array.from({ length: 12 }).map((_, i) => ({
        id: i,
        orderNo: `2025${String(i).padStart(6, '0')}`,
        styleName: ['儿童拉毛卫裤X106', '华夫格短裤ET0302', '拼接连帽卫衣ET0036'][i % 3],
        org: ['本厂', '石狮', '刘国华'][i % 3],
        date: new Date(Date.now() + i * 86400000).toISOString().slice(0, 10),
        qty: [60, 150, 375, 624, 1848][i % 5],
        type: ['车缝', '打扣', '激光开袋'][i % 3],
      })),
      total: 12,
    };
  },
};

export const orders = {
  async factory(params: { page: number; pageSize: number }): Promise<Paginated<FactoryOrderSummary>> {
    await delay(300);
    const total = 35;
    const list = Array.from({ length: params.pageSize }).map((_, idx) => {
      const i = (params.page - 1) * params.pageSize + idx;
      return {
        id: i,
        orderNo: `OD${String(1000 + i)}`,
        customer: ['本厂', '睿宗李总', '石狮'][i % 3],
        style: ['ET0036', 'ET0220', 'ET0302'][i % 3],
        qty: [60, 150, 270, 375][i % 4],
        dueDate: new Date(Date.now() + (i % 10) * 86400000).toISOString().slice(0, 10),
      };
    });
    return { list, total };
  },
};

export const materials = {
  async stock(params: { page: number; pageSize: number }): Promise<Paginated<MaterialStockItem>> {
    await delay(300);
    return {
      list: Array.from({ length: params.pageSize }).map((_, i) => ({
        id: i,
        sku: `MAT-${i}`,
        name: ['棉布', '牛仔布', '拉链', '纽扣'][i % 4],
        qty: 1000 - i * 3,
        warehouse: ['一号仓', '二号仓'][i % 2],
      })),
      total: 200,
    };
  },
};

export const products = {
  async inboundPending(params: { page: number; pageSize: number }): Promise<Paginated<ProductInboundPendingItem>> {
    await delay(300);
    return {
      list: Array.from({ length: params.pageSize }).map((_, i) => ({
        id: i,
        orderNo: `SHIP-${i}`,
        style: ['AC011', 'ET0264', 'ET0228'][i % 3],
        qty: [75, 100, 150, 375][i % 4],
        status: '待收货',
      })),
      total: 80,
    };
  },
};

export const styles = {
  async list(params: StyleListParams): Promise<PaginatedStyleData> {
    await delay(360);
    const { page, pageSize, keyword } = params;
    const safePage = Math.max(page, 1);
    const safeSize = Math.max(pageSize, 1);
    const lowerKeyword = keyword?.trim().toLowerCase();

    const filtered = lowerKeyword
      ? styleCatalog.filter((item) => {
          const candidates = [item.styleNo, item.styleName];
          return candidates.some((value) => value.toLowerCase().includes(lowerKeyword));
        })
      : styleCatalog;

    const start = (safePage - 1) * safeSize;
    const list = filtered.slice(start, start + safeSize);

    return {
      list,
      total: filtered.length,
      page: safePage,
      pageSize: safeSize,
    };
  },

  async delete(styleId: string): Promise<void> {
    await delay(200);
    const index = styleCatalog.findIndex((item) => item.id === styleId);
    if (index >= 0) {
      styleCatalog.splice(index, 1);
    }
  },
};

// 打板相关API
export const sample = {
  async getSampleOrders(params: SampleQueryParams = {}): Promise<{ list: SampleOrder[]; total: number; page: number; pageSize: number; }> {
    return fetchSampleOrders(params);
  },

  async getCreationMeta(): Promise<SampleCreationMeta> {
    await delay(200);
    return getSampleCreationMeta();
  },

  async createSampleOrder(data: SampleCreationPayload): Promise<{ success: boolean; message: string; order: SampleOrder; }> {
    return createSampleOrder(data);
  },

  async searchStyles(params: StyleListParams): Promise<PaginatedStyleData> {
    return styles.list(params);
  },

  async getSampleDetail(id: string): Promise<SampleOrderDetail> {
    return fetchSampleOrderDetail(id);
  },

  async updateFollowProgressNode(
    orderId: string,
    nodeId: string,
    payload: { completed: boolean; statusValue?: string },
  ) {
    return updateFollowProgressNode(orderId, nodeId, payload);
  },

  async getSampleStats(params: SampleQueryParams = {}): Promise<SampleStats> {
    return fetchSampleStats(params);
  },

  getSampleFilterOptions() {
    return sampleOptions;
  },

  getStatusLabel(status: SampleStatus) {
    return getStatusText(status);
  },

  getStatusBadgeColor(status: SampleStatus) {
    return getStatusColor(status);
  },

  getPriorityLabel(priority: SampleOrder['priority']) {
    return getPriorityText(priority);
  },

  getPriorityBadgeColor(priority: SampleOrder['priority']) {
    return getPriorityColor(priority);
  },

  // 跟进模板
  async followTemplates(params: { page: number; pageSize: number }): Promise<Paginated<FollowTemplateSummary>> {
    await delay(300);
    const total = 10;
    
    // 详细的模板数据，包含节点信息
    const templates: Array<Omit<FollowTemplateSummary, 'sequenceNo'> & { sequenceNo?: number; nodes: TemplateNode[] }> = [
      { 
        id: 1, 
        name: '赛乐', 
        isDefault: false,
        sequenceNo: 0,
        nodes: [
          {
            id: 101,
            sortOrder: 1,
            sequenceNo: 1,
            nodeName: '设计确认',
            fieldType: 'text',
            duration: 2
          },
          {
            id: 102,
            sortOrder: 2,
            sequenceNo: 2,
            nodeName: '样板制作',
            fieldType: 'text',
            duration: 8
          },
          {
            id: 103,
            sortOrder: 3,
            sequenceNo: 3,
            nodeName: '尺寸确认',
            fieldType: 'text',
            duration: 1
          },
          {
            id: 104,
            sortOrder: 4,
            sequenceNo: 4,
            nodeName: '工艺审核',
            fieldType: 'boolean',
            duration: 3
          }
        ]
      },
      { 
        id: 2, 
        name: '标准模板', 
        isDefault: true,
        sequenceNo: 0,
        nodes: [
          {
            id: 201,
            sortOrder: 1,
            sequenceNo: 1,
            nodeName: '需求分析',
            fieldType: 'text',
            duration: 1
          },
          {
            id: 202,
            sortOrder: 2,
            sequenceNo: 2,
            nodeName: '设计草图',
            fieldType: 'text',
            duration: 4
          },
          {
            id: 203,
            sortOrder: 3,
            sequenceNo: 3,
            nodeName: '材料选择',
            fieldType: 'boolean',
            duration: 2
          },
          {
            id: 204,
            sortOrder: 4,
            sequenceNo: 4,
            nodeName: '样品制作',
            fieldType: 'text',
            duration: 12
          },
          {
            id: 205,
            sortOrder: 5,
            sequenceNo: 5,
            nodeName: '质量检验',
            fieldType: 'boolean',
            duration: 2
          },
          {
            id: 206,
            sortOrder: 6,
            sequenceNo: 6,
            nodeName: '客户确认',
            fieldType: 'date',
            duration: 1
          }
        ]
      },
      { 
        id: 3, 
        name: '快速跟进', 
        isDefault: false,
        sequenceNo: 0,
        nodes: [
          {
            id: 301,
            sortOrder: 1,
            sequenceNo: 1,
            nodeName: '快速设计',
            fieldType: 'text',
            duration: 1
          },
          {
            id: 302,
            sortOrder: 2,
            sequenceNo: 2,
            nodeName: '简易样品',
            fieldType: 'text',
            duration: 4
          },
          {
            id: 303,
            sortOrder: 3,
            sequenceNo: 3,
            nodeName: '即时确认',
            fieldType: 'boolean',
            duration: 0.5
          }
        ]
      },
      { 
        id: 4, 
        name: '详细跟进', 
        isDefault: false,
        nodes: [
          {
            id: 401,
            sortOrder: 1,
            sequenceNo: 1,
            nodeName: '市场调研',
            fieldType: 'text',
            duration: 4
          },
          {
            id: 402,
            sortOrder: 2,
            sequenceNo: 2,
            nodeName: '概念设计',
            fieldType: 'text',
            duration: 8
          },
          {
            id: 403,
            sortOrder: 3,
            sequenceNo: 3,
            nodeName: '细节设计',
            fieldType: 'text',
            duration: 6
          },
          {
            id: 404,
            sortOrder: 4,
            sequenceNo: 4,
            nodeName: '材料测试',
            fieldType: 'boolean',
            duration: 3
          },
          {
            id: 405,
            sortOrder: 5,
            sequenceNo: 5,
            nodeName: '工艺验证',
            fieldType: 'boolean',
            duration: 4
          },
          {
            id: 406,
            sortOrder: 6,
            sequenceNo: 6,
            nodeName: '样品制作',
            fieldType: 'text',
            duration: 16
          },
          {
            id: 407,
            sortOrder: 7,
            sequenceNo: 7,
            nodeName: '功能测试',
            fieldType: 'text',
            duration: 2
          },
          {
            id: 408,
            sortOrder: 8,
            sequenceNo: 8,
            nodeName: '外观检查',
            fieldType: 'text',
            duration: 1
          },
          {
            id: 409,
            sortOrder: 9,
            sequenceNo: 9,
            nodeName: '最终确认',
            fieldType: 'date',
            duration: 1
          }
        ]
      },
      { 
        id: 5, 
        name: '客户专用', 
        isDefault: false,
        nodes: [
          {
            id: 501,
            sortOrder: 1,
            sequenceNo: 1,
            nodeName: '客户需求确认',
            fieldType: 'text',
            duration: 2
          },
          {
            id: 502,
            sortOrder: 2,
            sequenceNo: 2,
            nodeName: '定制化设计',
            fieldType: 'text',
            duration: 6
          },
          {
            id: 503,
            sortOrder: 3,
            sequenceNo: 3,
            nodeName: '客户审核',
            fieldType: 'boolean',
            duration: 2
          },
          {
            id: 504,
            sortOrder: 4,
            sequenceNo: 4,
            nodeName: '样品寄送',
            fieldType: 'date',
            duration: 0.5
          },
          {
            id: 505,
            sortOrder: 5,
            sequenceNo: 5,
            nodeName: '客户反馈',
            fieldType: 'text',
            duration: 24
          }
        ]
      },
      { 
        id: 6, 
        name: '季节性模板', 
        isDefault: false,
        nodes: [
          {
            id: 601,
            sortOrder: 1,
            sequenceNo: 1,
            nodeName: '季节趋势分析',
            fieldType: 'text',
            duration: 3
          },
          {
            id: 602,
            sortOrder: 2,
            sequenceNo: 2,
            nodeName: '色彩搭配',
            fieldType: 'boolean',
            duration: 2
          },
          {
            id: 603,
            sortOrder: 3,
            sequenceNo: 3,
            nodeName: '面料选择',
            fieldType: 'boolean',
            duration: 1.5
          }
        ]
      },
      { 
        id: 7, 
        name: '质量优先模板', 
        isDefault: false,
        nodes: [
          {
            id: 701,
            sortOrder: 1,
            sequenceNo: 1,
            nodeName: '质量标准制定',
            fieldType: 'text',
            duration: 2
          },
          {
            id: 702,
            sortOrder: 2,
            sequenceNo: 2,
            nodeName: '多轮质检',
            fieldType: 'text',
            duration: 6
          },
          {
            id: 703,
            sortOrder: 3,
            sequenceNo: 3,
            nodeName: '质量报告',
            fieldType: 'text',
            duration: 1
          }
        ]
      },
      { 
        id: 8, 
        name: '成本控制模板', 
        isDefault: false,
        nodes: [
          {
            id: 801,
            sortOrder: 1,
            sequenceNo: 1,
            nodeName: '成本预估',
            fieldType: 'text',
            duration: 1
          },
          {
            id: 802,
            sortOrder: 2,
            sequenceNo: 2,
            nodeName: '材料优化',
            fieldType: 'boolean',
            duration: 3
          },
          {
            id: 803,
            sortOrder: 3,
            sequenceNo: 3,
            nodeName: '工艺简化',
            fieldType: 'text',
            duration: 4
          },
          {
            id: 804,
            sortOrder: 4,
            sequenceNo: 4,
            nodeName: '成本确认',
            fieldType: 'text',
            duration: 0.5
          }
        ]
      }
    ];
    
    const normalizedTemplates: Array<FollowTemplateSummary & { nodes: TemplateNode[] }> = templates.map(
      (template, index) => ({
        ...template,
        sequenceNo: template.sequenceNo && template.sequenceNo > 0 ? template.sequenceNo : index + 1,
      }),
    );
    const startIndex = (params.page - 1) * params.pageSize;
    const endIndex = Math.min(startIndex + params.pageSize, normalizedTemplates.length);
    const list = normalizedTemplates.slice(startIndex, endIndex).map((template, index) => ({
      ...template,
      sequenceNo: startIndex + index + 1,
    }));
    
    return { list, total };
  },
  
  async createFollowTemplate(data: { name: string; isDefault?: boolean }) {
    void data;
    await delay(300);
    return { success: true, message: '创建成功' };
  },
  
  async updateFollowTemplate(id: number, data: { name: string; isDefault?: boolean }) {
    void id;
    void data;
    await delay(300);
    return { success: true, message: '更新成功' };
  },
  
  async deleteFollowTemplate(id: number) {
    void id;
    await delay(300);
    return { success: true, message: '删除成功' };
  },
  
  // 获取跟进模板详情
  async getFollowTemplateById(id: number): Promise<FollowTemplateSummary> {
    await delay(300);
    
    // 返回对应的模板数据（从 followTemplates 中查找）
    const templates: Array<Omit<FollowTemplateSummary, 'sequenceNo'> & { sequenceNo?: number; nodes: TemplateNode[] }> = [
      { 
        id: 1, 
        name: '赛乐', 
        isDefault: false,
        sequenceNo: 0,
        nodes: [
          {
            id: 101,
            sortOrder: 1,
            sequenceNo: 1,
            nodeName: '设计确认',
            fieldType: 'text',
            duration: 2
          },
          {
            id: 102,
            sortOrder: 2,
            sequenceNo: 2,
            nodeName: '样板制作',
            fieldType: 'text',
            duration: 8
          },
          {
            id: 103,
            sortOrder: 3,
            sequenceNo: 3,
            nodeName: '尺寸确认',
            fieldType: 'text',
            duration: 1
          },
          {
            id: 104,
            sortOrder: 4,
            sequenceNo: 4,
            nodeName: '工艺审核',
            fieldType: 'boolean',
            duration: 3
          }
        ]
      },
      { 
        id: 2, 
        name: '标准模板', 
        isDefault: true,
        sequenceNo: 0,
        nodes: [
          {
            id: 201,
            sortOrder: 1,
            sequenceNo: 1,
            nodeName: '需求分析',
            fieldType: 'text',
            duration: 1
          },
          {
            id: 202,
            sortOrder: 2,
            sequenceNo: 2,
            nodeName: '设计草图',
            fieldType: 'text',
            duration: 4
          },
          {
            id: 203,
            sortOrder: 3,
            sequenceNo: 3,
            nodeName: '材料选择',
            fieldType: 'boolean',
            duration: 2
          },
          {
            id: 204,
            sortOrder: 4,
            sequenceNo: 4,
            nodeName: '样品制作',
            fieldType: 'text',
            duration: 12
          },
          {
            id: 205,
            sortOrder: 5,
            sequenceNo: 5,
            nodeName: '质量检验',
            fieldType: 'boolean',
            duration: 2
          },
          {
            id: 206,
            sortOrder: 6,
            sequenceNo: 6,
            nodeName: '客户确认',
            fieldType: 'date',
            duration: 1
          }
        ]
      },
      { 
        id: 3, 
        name: '快速跟进', 
        isDefault: false,
        sequenceNo: 0,
        nodes: [
          {
            id: 301,
            sortOrder: 1,
            sequenceNo: 1,
            nodeName: '快速设计',
            fieldType: 'text',
            duration: 1
          },
          {
            id: 302,
            sortOrder: 2,
            sequenceNo: 2,
            nodeName: '简易样品',
            fieldType: 'text',
            duration: 4
          },
          {
            id: 303,
            sortOrder: 3,
            sequenceNo: 3,
            nodeName: '即时确认',
            fieldType: 'boolean',
            duration: 0.5
          }
        ]
      },
      { 
        id: 4, 
        name: '详细跟进', 
        isDefault: false,
        nodes: [
          {
            id: 401,
            sortOrder: 1,
            sequenceNo: 1,
            nodeName: '市场调研',
            fieldType: 'text',
            duration: 4
          },
          {
            id: 402,
            sortOrder: 2,
            sequenceNo: 2,
            nodeName: '概念设计',
            fieldType: 'text',
            duration: 8
          },
          {
            id: 403,
            sortOrder: 3,
            sequenceNo: 3,
            nodeName: '细节设计',
            fieldType: 'text',
            duration: 6
          },
          {
            id: 404,
            sortOrder: 4,
            sequenceNo: 4,
            nodeName: '材料测试',
            fieldType: 'boolean',
            duration: 3
          },
          {
            id: 405,
            sortOrder: 5,
            sequenceNo: 5,
            nodeName: '工艺验证',
            fieldType: 'boolean',
            duration: 4
          },
          {
            id: 406,
            sortOrder: 6,
            sequenceNo: 6,
            nodeName: '样品制作',
            fieldType: 'text',
            duration: 16
          },
          {
            id: 407,
            sortOrder: 7,
            sequenceNo: 7,
            nodeName: '功能测试',
            fieldType: 'text',
            duration: 2
          },
          {
            id: 408,
            sortOrder: 8,
            sequenceNo: 8,
            nodeName: '外观检查',
            fieldType: 'text',
            duration: 1
          },
          {
            id: 409,
            sortOrder: 9,
            sequenceNo: 9,
            nodeName: '最终确认',
            fieldType: 'date',
            duration: 1
          }
        ]
      },
      { 
        id: 5, 
        name: '客户专用', 
        isDefault: false,
        nodes: [
          {
            id: 501,
            sortOrder: 1,
            sequenceNo: 1,
            nodeName: '客户需求确认',
            fieldType: 'text',
            duration: 2
          },
          {
            id: 502,
            sortOrder: 2,
            sequenceNo: 2,
            nodeName: '定制化设计',
            fieldType: 'text',
            duration: 6
          },
          {
            id: 503,
            sortOrder: 3,
            sequenceNo: 3,
            nodeName: '客户审核',
            fieldType: 'boolean',
            duration: 2
          },
          {
            id: 504,
            sortOrder: 4,
            sequenceNo: 4,
            nodeName: '样品寄送',
            fieldType: 'date',
            duration: 0.5
          },
          {
            id: 505,
            sortOrder: 5,
            sequenceNo: 5,
            nodeName: '客户反馈',
            fieldType: 'text',
            duration: 24
          }
        ]
      },
      { 
        id: 6, 
        name: '季节性模板', 
        isDefault: false,
        nodes: [
          {
            id: 601,
            sortOrder: 1,
            sequenceNo: 1,
            nodeName: '季节趋势分析',
            fieldType: 'text',
            duration: 3
          },
          {
            id: 602,
            sortOrder: 2,
            sequenceNo: 2,
            nodeName: '色彩搭配',
            fieldType: 'boolean',
            duration: 2
          },
          {
            id: 603,
            sortOrder: 3,
            sequenceNo: 3,
            nodeName: '面料选择',
            fieldType: 'boolean',
            duration: 1.5
          }
        ]
      },
      { 
        id: 7, 
        name: '质量优先模板', 
        isDefault: false,
        nodes: [
          {
            id: 701,
            sortOrder: 1,
            sequenceNo: 1,
            nodeName: '质量标准制定',
            fieldType: 'text',
            duration: 2
          },
          {
            id: 702,
            sortOrder: 2,
            sequenceNo: 2,
            nodeName: '多轮质检',
            fieldType: 'text',
            duration: 6
          },
          {
            id: 703,
            sortOrder: 3,
            sequenceNo: 3,
            nodeName: '质量报告',
            fieldType: 'text',
            duration: 1
          }
        ]
      },
      { 
        id: 8, 
        name: '成本控制模板', 
        isDefault: false,
        nodes: [
          {
            id: 801,
            sortOrder: 1,
            sequenceNo: 1,
            nodeName: '成本预估',
            fieldType: 'text',
            duration: 1
          },
          {
            id: 802,
            sortOrder: 2,
            sequenceNo: 2,
            nodeName: '材料优化',
            fieldType: 'boolean',
            duration: 3
          },
          {
            id: 803,
            sortOrder: 3,
            sequenceNo: 3,
            nodeName: '工艺简化',
            fieldType: 'text',
            duration: 4
          },
          {
            id: 804,
            sortOrder: 4,
            sequenceNo: 4,
            nodeName: '成本确认',
            fieldType: 'text',
            duration: 0.5
          }
        ]
      }
    ];
    
    const normalizedTemplates: Array<FollowTemplateSummary & { nodes: TemplateNode[] }> = templates.map(
      (template, index) => ({
        ...template,
        sequenceNo: template.sequenceNo && template.sequenceNo > 0 ? template.sequenceNo : index + 1,
      }),
    );
    const template = normalizedTemplates.find((t) => t.id === id);
    if (!template) {
      throw new Error('模板不存在');
    }
    return template;
  },
  
  // 样板类型
  async sampleTypes(params: { page: number; pageSize: number }): Promise<Paginated<SampleTypeItem>> {
    await delay(300);
    const types = [
      { id: 1, name: '夏季' },
      { id: 2, name: '返单' },
      { id: 3, name: '春季' },
      { id: 4, name: '秋季' },
      { id: 5, name: '冬季' },
      { id: 6, name: '特殊订制' },
    ];

    const startIndex = (params.page - 1) * params.pageSize;
    const endIndex = Math.min(startIndex + params.pageSize, types.length);
    const list = types.slice(startIndex, endIndex);

    return { list, total: types.length };
  },
  
  async createSampleType(data: { name: string }) {
    void data;
    await delay(300);
    return { success: true, message: '创建成功' };
  },
  
  async updateSampleType(id: number, data: { name: string }) {
    void id;
    void data;
    await delay(300);
    return { success: true, message: '更新成功' };
  },
  
  async deleteSampleType(id: number) {
    void id;
    await delay(300);
    return { success: true, message: '删除成功' };
  },
  
  // 打板统计数据
  async getSampleDashboardStats(): Promise<SampleDashboardStats> {
    await delay(300);
    return {
      thisWeek: 7,
      thisMonth: 89,
      lastMonth: 156,
      thisYear: 333,
    };
  },
  
  // 打板对照表图表数据（半年）
  async getSampleChartData(): Promise<SampleChartPoint[]> {
    await delay(300);
    const data: SampleChartPoint[] = [];
    const now = new Date();

    for (let offset = 5; offset >= 0; offset -= 1) {
      const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      const dateKey = date.toISOString().slice(0, 7);

      const season = Math.sin((offset / 5) * Math.PI) * 25;
      const variationA = Math.floor(Math.random() * 18) - 9;
      const variationB = Math.floor(Math.random() * 22) - 11;

      const patternCount = Math.max(25, Math.round(70 + season + variationA));
      const sampleCount = Math.max(15, Math.round(55 - season + variationB));

      data.push({
        date: `${dateKey}-01`,
        count: patternCount,
        type: '打板数量',
      });

      data.push({
        date: `${dateKey}-01`,
        count: sampleCount,
        type: '样板数量',
      });
    }

    return data;
  },
  
  // 打板数量占比饼图数据（年）
  async getSamplePieData(): Promise<SamplePieDatum[]> {
    await delay(300);
    const summary = [
      { category: '纸样师', completed: 2398, pending: 126 },
      { category: '车板师', completed: 2140, pending: 208 },
      { category: '裁床组', completed: 1856, pending: 342 },
    ];

    return summary.flatMap(({ category, completed, pending }) => ([
      { name: '已完成', value: completed, category },
      { name: '未完成', value: pending, category },
    ]));
  },
  
  // 样板超期列表
  async getOverdueSamples(params: { page: number; pageSize: number }): Promise<Paginated<SampleOverdueItem>> {
    await delay(300);
    void params;
    
    // 暂时返回空数据，表示没有超期样板
    return {
      list: [],
      total: 0,
    };
  },
};

const operationalEfficiency = {
  async getMeta(): Promise<OperationalEfficiencyMeta> {
    return fetchOperationalEfficiencyMeta();
  },

  async getList(
    params: OperationalEfficiencyListParams,
  ): Promise<OperationalEfficiencyListResponse> {
    return fetchOperationalEfficiencyList(params);
  },

  async create(
    payload: OperationalEfficiencyTemplatePayload,
  ): Promise<OperationalEfficiencyListItem> {
    return createOperationalEfficiencyTemplate(payload);
  },

  async update(
    id: string,
    payload: OperationalEfficiencyTemplatePayload,
  ): Promise<OperationalEfficiencyListItem> {
    return updateOperationalEfficiencyTemplate(id, payload);
  },

  async remove(id: string): Promise<{ success: boolean }> {
    return removeOperationalEfficiencyTemplate(id);
  },

  async setDefault(id: string): Promise<{ success: boolean }> {
    return setOperationalEfficiencyDefault(id);
  },
};

const materialStock = {
  async getMeta(): Promise<MaterialStockMeta> {
    return fetchMaterialStockMeta();
  },

  async getList(
    params: MaterialStockListParams,
  ): Promise<MaterialStockListResponse> {
    return fetchMaterialStockList(params);
  },
};

const materialPurchaseReport = {
  async getMeta(): Promise<MaterialPurchaseReportMeta> {
    return fetchMaterialPurchaseReportMeta();
  },

  async getList(
    params: MaterialPurchaseReportListParams,
  ): Promise<MaterialPurchaseReportListResponse> {
    return fetchMaterialPurchaseReportList(params);
  },
};

const orderPurchaseInbound = {
  async getMeta(): Promise<OrderPurchaseInboundMeta> {
    return fetchOrderPurchaseInboundMeta();
  },

  async getList(
    params: OrderPurchaseInboundListParams,
  ): Promise<OrderPurchaseInboundListResponse> {
    return fetchOrderPurchaseInboundList(params);
  },

  async batchReceive(
    payload: OrderPurchaseInboundReceivePayload,
  ): Promise<{ success: boolean }> {
    return submitOrderPurchaseInboundReceive(payload);
  },

  async updateStatus(
    payload: OrderPurchaseInboundStatusPayload,
  ): Promise<{ success: boolean }> {
    return updateOrderPurchaseInboundStatus(payload);
  },

  async export(
    params: OrderPurchaseInboundExportParams,
  ): Promise<{ url: string }> {
    return exportOrderPurchaseInbound(params);
  },
};

const materialIssue = {
  async getMeta(): Promise<MaterialIssueMeta> {
    return fetchMaterialIssueMeta();
  },

  async getList(
    params: MaterialIssueListParams,
  ): Promise<MaterialIssueListResponse> {
    return fetchMaterialIssueList(params);
  },
};

const finishedGoodsOtherInbound = {
  async getMeta(): Promise<FinishedGoodsOtherInboundMeta> {
    return fetchFinishedGoodsOtherInboundMeta();
  },

  async getList(
    params: FinishedGoodsOtherInboundListParams,
  ): Promise<FinishedGoodsOtherInboundListResponse> {
    return fetchFinishedGoodsOtherInboundList(params);
  },

  async create(payload: FinishedGoodsOtherInboundFormPayload) {
    return createFinishedGoodsOtherInbound(payload);
  },

  async update(id: string, payload: FinishedGoodsOtherInboundFormPayload) {
    return updateFinishedGoodsOtherInbound(id, payload);
  },

  async remove(ids: string[]) {
    return removeFinishedGoodsOtherInbound(ids);
  },
};

const finishedGoodsInventoryReport = {
  async getOverview(
    params: FinishedGoodsInventoryQueryParams = {},
  ): Promise<FinishedGoodsInventoryAggregation> {
    return fetchFinishedGoodsInventoryAggregation(params);
  },

  async getList(
    params: FinishedGoodsInventoryListParams,
  ): Promise<FinishedGoodsInventoryListResponse> {
    return fetchFinishedGoodsInventoryList(params);
  },
};

const materialInventoryReport = {
  async getOverview(
    params: MaterialInventoryQueryParams = {},
  ): Promise<MaterialInventoryAggregation> {
    return fetchMaterialInventoryAggregation(params);
  },

  async getList(
    params: MaterialInventoryListParams,
  ): Promise<MaterialInventoryListResponse> {
    return fetchMaterialInventoryList(params);
  },
};

const orderMaterialRequirementReport = {
  async getList(
    params: OrderMaterialRequirementListParams,
  ): Promise<OrderMaterialRequirementListResponse> {
    return fetchOrderMaterialRequirementList(params);
  },
};

const productionComparison = {
  async getList(
    params: ProductionComparisonListParams,
  ): Promise<ProductionComparisonListResponse> {
    return fetchProductionComparisonList(params);
  },

  async export(
    params: ProductionComparisonListParams,
  ): Promise<{ fileUrl: string }> {
    return exportProductionComparison(params);
  },
};

const processProductionComparisonReport = {
  async getLots(
    params: ProcessProductionLotListParams,
  ): Promise<ProcessProductionLotListResponse> {
    return fetchProcessProductionLots(params);
  },

  async getDetails(
    params: ProcessProductionDetailParams,
  ): Promise<ProcessProductionDetailResponse> {
    return fetchProcessProductionDetails(params);
  },

  async export(
    params: ProcessProductionExportParams,
  ): Promise<{ fileUrl: string }> {
    return exportProcessProductionMatrix(params);
  },
};

const qualityControlManagement = {
  async getMeta(): Promise<QualityControlMeta> {
    return fetchQualityControlMeta();
  },

  async getList(
    params: QualityControlListParams,
  ): Promise<QualityControlListResponse> {
    return fetchQualityControlList(params);
  },

  async export(
    params: QualityControlExportParams,
  ): Promise<{ fileUrl: string }> {
    return exportQualityControlRecords(params);
  },
};

const salaryManagement = {
  async getMeta(): Promise<SalaryMeta> {
    return fetchSalaryMeta();
  },

  async getList(
    params: SalaryListParams,
  ): Promise<SalaryListResponse> {
    return fetchSalaryList(params);
  },

  async settle(
    payload: SalarySettlePayload,
  ): Promise<{ success: boolean }> {
    return settleSalary(payload);
  },
};

const sampleCostingReport = {
  async getAggregation(): Promise<SampleCostAggregation> {
    return fetchSampleCostAggregation();
  },

  async getList(
    params: SampleCostListParams,
  ): Promise<SampleCostListResponse> {
    return fetchSampleCostList(params);
  },

  async export(
    params: SampleCostListParams,
  ): Promise<{ fileUrl: string }> {
    return exportSampleCostList(params);
  },
};

const sampleOrderComparisonReport = {
  async getAggregation(): Promise<SampleOrderAggregation> {
    return fetchSampleOrderAggregation();
  },

  async getList(
    params: SampleOrderComparisonParams,
  ): Promise<SampleOrderComparisonResponse> {
    return fetchSampleOrderComparisonList(params);
  },

  async export(
    params: SampleOrderComparisonParams,
  ): Promise<{ fileUrl: string }> {
    return exportSampleOrderComparison(params);
  },
};

const stockingPurchaseInbound = {
  async getMeta(): Promise<StockingPurchaseMeta> {
    return fetchStockingPurchaseMeta();
  },

  async getList(
    params: StockingPurchaseListParams,
  ): Promise<StockingPurchaseListResponse> {
    return fetchStockingPurchaseList(params);
  },

  async batchReceive(
    payload: StockingBatchReceivePayload,
  ): Promise<{ success: boolean }> {
    return submitStockingBatchReceive(payload);
  },

  async setStatus(
    payload: StockingStatusUpdatePayload,
  ): Promise<{ success: boolean }> {
    return updateStockingPurchaseStatus(payload);
  },

  async export(
    params: StockingPurchaseExportParams,
  ): Promise<{ fileUrl: string }> {
    return exportStockingPurchaseList(params);
  },
};

const orderProgressDetailsReport = {
  async getList(
    params: OrderProgressDetailsListParams,
  ): Promise<OrderProgressDetailsListResponse> {
    return fetchOrderProgressDetailsList(params);
  },

  async export(
    params: OrderProgressDetailsListParams,
  ): Promise<{ fileUrl: string }> {
    return exportOrderProgressDetails(params);
  },
};

const orderTicketDetailsReport = {
  async getLots(
    params: OrderTicketLotListParams,
  ): Promise<OrderTicketLotListResponse> {
    return fetchOrderTicketLots(params);
  },

  async getRecords(
    params: OrderTicketRecordListParams,
  ): Promise<OrderTicketRecordListResponse> {
    return fetchOrderTicketRecords(params);
  },

  async export(
    params: OrderTicketRecordListParams,
  ): Promise<{ fileUrl: string }> {
    return exportOrderTicketDetails(params);
  },
};

const outsourcingCuttingDetailReport = {
  async getList(
    params: OutsourcingCuttingDetailListParams,
  ): Promise<OutsourcingCuttingDetailListResponse> {
    return fetchOutsourcingCuttingDetailList(params);
  },
};

const finishedGoodsOutbound = {
  async getMeta(): Promise<FinishedGoodsOutboundMeta> {
    return fetchFinishedGoodsOutboundMeta();
  },

  async getList(
    params: FinishedGoodsOutboundListParams,
  ): Promise<FinishedGoodsOutboundListResponse> {
    return fetchFinishedGoodsOutboundList(params);
  },
};

const finishedGoodsPendingReceipt = {
  async getMeta(): Promise<FinishedGoodsPendingReceiptMeta> {
    return fetchFinishedGoodsPendingReceiptMeta();
  },

  async getList(
    params: FinishedGoodsPendingReceiptListParams,
  ): Promise<FinishedGoodsPendingReceiptListResponse> {
    return fetchFinishedGoodsPendingReceiptList(params);
  },

  async receive(
    payload: FinishedGoodsPendingReceiptReceivePayload,
  ): Promise<{ success: boolean }> {
    return submitFinishedGoodsReceipt(payload);
  },
};

const finishedGoodsReceived = {
  async getMeta(): Promise<FinishedGoodsReceivedMeta> {
    return fetchFinishedGoodsReceivedMeta();
  },

  async getList(
    params: FinishedGoodsReceivedListParams,
  ): Promise<FinishedGoodsReceivedListResponse> {
    return fetchFinishedGoodsReceivedList(params);
  },

  async update(
    id: string,
    payload: FinishedGoodsReceivedUpdatePayload,
  ): Promise<FinishedGoodsReceivedRecord> {
    return updateFinishedGoodsReceivedRecord(id, payload);
  },

  async remove(ids: string[]): Promise<{ success: boolean }> {
    return removeFinishedGoodsReceivedRecords(ids);
  },

  async export(
    params: FinishedGoodsReceivedListParams,
  ): Promise<{ url: string }> {
    return exportFinishedGoodsReceived(params);
  },
};

const finishedGoodsStock = {
  async getMeta(): Promise<FinishedGoodsStockMeta> {
    return fetchFinishedGoodsStockMeta();
  },

  async getList(
    params: FinishedGoodsStockListParams,
  ): Promise<FinishedGoodsStockListResponse> {
    return fetchFinishedGoodsStockList(params);
  },
};

const bulkCostReport = {
  async getAggregation(): Promise<BulkCostAggregation> {
    return fetchBulkCostAggregation();
  },

  async getList(params: BulkCostListParams): Promise<BulkCostListResponse> {
    return fetchBulkCostList(params);
  },
};

const orderShipmentProfitReport = {
  async getAggregation(): Promise<OrderShipmentProfitAggregation> {
    return fetchOrderShipmentProfitAggregation();
  },

  async getList(
    params: OrderShipmentProfitListParams,
  ): Promise<OrderShipmentProfitListResponse> {
    return fetchOrderShipmentProfitList(params);
  },

  async export(
    params: OrderShipmentProfitListParams,
  ): Promise<{ fileUrl: string }> {
    return exportOrderShipmentProfit(params);
  },
};

const outsourcingManagement = {
  async getMeta(): Promise<OutsourcingManagementMeta> {
    return fetchOutsourcingManagementMeta();
  },

  async getList(
    params: OutsourcingManagementListParams,
  ): Promise<OutsourcingManagementListResponse> {
    return fetchOutsourcingManagementList(params);
  },

  async export(
    params: OutsourcingManagementListParams,
  ): Promise<{ fileUrl: string }> {
    return exportOutsourcingManagement(params);
  },
};

const outsourcingProductionReport = {
  async getMeta(): Promise<OutsourcingProductionReportMeta> {
    return fetchOutsourcingProductionReportMeta();
  },

  async getSubcontractorStats(): Promise<OutsourcingSubcontractorStat[]> {
    return fetchOutsourcingSubcontractorStats();
  },

  async getList(
    params: OutsourcingProductionReportListParams,
  ): Promise<OutsourcingProductionReportListResponse> {
    return fetchOutsourcingProductionReportList(params);
  },

  async export(
    params: OutsourcingProductionReportListParams,
  ): Promise<{ fileUrl: string }> {
    return exportOutsourcingProductionReport(params);
  },

  async print(ids: string[]): Promise<{ success: boolean }> {
    return submitOutsourcingReportPrintTask(ids);
  },
};

// 车间计件、协同中心、对账结算、基础资料、系统设置可按需逐步补充

// 为了兼容组件中的命名，添加别名导出
export const sampleService = sample;
export const operationalEfficiencyService = operationalEfficiency;
export const materialStockService = materialStock;
export const materialPurchaseReportService = materialPurchaseReport;
export const orderPurchaseInboundService = orderPurchaseInbound;
export const materialIssueService = materialIssue;
export const finishedGoodsOtherInboundService = finishedGoodsOtherInbound;
export const finishedGoodsInventoryReportService = finishedGoodsInventoryReport;
export const finishedGoodsOutboundService = finishedGoodsOutbound;
export const finishedGoodsPendingReceiptService = finishedGoodsPendingReceipt;
export const finishedGoodsReceivedService = finishedGoodsReceived;
export const finishedGoodsStockService = finishedGoodsStock;
export const bulkCostReportService = bulkCostReport;
export const orderShipmentProfitReportService = orderShipmentProfitReport;
export const materialInventoryReportService = materialInventoryReport;
export const orderMaterialRequirementReportService = orderMaterialRequirementReport;
export const productionComparisonService = productionComparison;
export const processProductionComparisonReportService = processProductionComparisonReport;
export const qualityControlManagementService = qualityControlManagement;
export const salaryManagementService = salaryManagement;
export const sampleCostingReportService = sampleCostingReport;
export const sampleOrderComparisonReportService = sampleOrderComparisonReport;
export const stockingPurchaseInboundService = stockingPurchaseInbound;
export const orderProgressDetailsReportService = orderProgressDetailsReport;
export const orderTicketDetailsReportService = orderTicketDetailsReport;
export const outsourcingCuttingDetailReportService = outsourcingCuttingDetailReport;
export const outsourcingManagementService = outsourcingManagement;
export const outsourcingProductionReportService = outsourcingProductionReport;
export const cashierAccountService = {
  getMeta: fetchCashierAccountMeta,
  getList: fetchCashierAccounts,
  create: createCashierAccount,
  update: updateCashierAccount,
  remove: removeCashierAccount,
};
export const customerReceiptService = {
  getMeta: fetchCustomerReceiptMeta,
  getList: fetchCustomerReceiptList,
  create: createCustomerReceipt,
  export: exportCustomerReceiptReport,
};
export const factoryPaymentService = {
  getMeta: fetchFactoryPaymentMeta,
  getList: fetchFactoryPaymentList,
  create: createFactoryPayment,
  export: exportFactoryPaymentReport,
};
export const supplierPaymentService = {
  getMeta: fetchSupplierPaymentMeta,
  getList: fetchSupplierPaymentList,
  create: createSupplierPayment,
  export: exportSupplierPaymentReport,
};
export const customerBusinessDetailReportService = {
  getMeta: fetchCustomerBusinessDetailMeta,
  getOverview: fetchCustomerBusinessDetailOverview,
  getList: fetchCustomerBusinessDetailList,
  export: exportCustomerBusinessDetailReport,
};
export const factoryBusinessDetailReportService = {
  getMeta: fetchFactoryBusinessDetailMeta,
  getOverview: fetchFactoryBusinessDetailOverview,
  getList: fetchFactoryBusinessDetailList,
  export: exportFactoryBusinessDetailReport,
};
export const supplierBusinessDetailReportService = {
  getMeta: fetchSupplierBusinessDetailMeta,
  getOverview: fetchSupplierBusinessDetailOverview,
  getList: fetchSupplierBusinessDetailList,
  export: exportSupplierBusinessDetailReport,
};
export const reconciliationDetailsReportService = {
  getMeta: fetchReconciliationDetailsMeta,
  getList: fetchReconciliationDetailsList,
  cancel: cancelReconciliation,
  export: exportReconciliationDetailsReport,
};

export default {
  dashboard,
  orders,
  materials,
  products,
  sample,
  operationalEfficiency,
  materialStock,
  materialPurchaseReport,
  orderPurchaseInbound,
  materialIssue,
  finishedGoodsOtherInbound,
  finishedGoodsInventoryReport,
  materialInventoryReport,
  finishedGoodsOutbound,
  finishedGoodsPendingReceipt,
  finishedGoodsReceived,
  finishedGoodsStock,
  bulkCostReport,
  orderShipmentProfitReport,
  orderMaterialRequirementReport,
  orderProgressDetailsReport,
  orderTicketDetailsReport,
  productionComparison,
  outsourcingCuttingDetailReport,
  outsourcingManagement,
  outsourcingProductionReport,
};
