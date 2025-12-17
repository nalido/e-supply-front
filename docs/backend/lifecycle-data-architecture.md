# 易供云产品生命周期与后端数据模型设计

本文基于现有前端实现（Vite + React + TypeScript）梳理项目全部页面、交互数据模型和 mock 接口结构，提炼业务全景生命周期，分析潜在的数据冗余，并给出遵循行业最佳实践的后端数据库与 API 设计方案。

## 1. 全局业务生命周期

| 阶段 | 业务目标 | 关联前端页面 | 现用核心数据模型 |
| --- | --- | --- | --- |
| 基础资料准备 | 建立可复用的主数据（款式、物料、往来、工艺、仓库等） | `src/views/StyleDetail.tsx`, `StyleMaterials.tsx`, `MaterialArchive.tsx`, `OperationTemplate.tsx`, `ProcessType.tsx`, `Partners.tsx`, `Warehouse.tsx` | `StyleData`, `StyleDraft`, `MaterialItem`, `ProcessType`, `OperationTemplate`, `Partner`, `Warehouse` |
| 样板开发 | 管理样板单生命周期、模板、类型与统计 | `SampleDashboard.tsx`, `SampleList.tsx`, `SampleDetail.tsx`, `SampleFollow.tsx`, `FollowTemplate.tsx`, `SampleType.tsx`, 报表（成本、打板下单对照） | `SampleOrder`, `SampleStats`, `TemplateNode`, `SampleTypeItem`, `SampleCostCard`, `SampleOrderComparisonItem` |
| 订单生产启用 | 将样板转化为大货订单，监控工厂/委外生产进度 | `FactoryOrders.tsx`, `OrderProductionComparison.tsx`, `OperationalEfficiency.tsx`, `OrderProgressDetailsSection.tsx`, `OrderTicketDetailsSection.tsx`, `OperationalEfficiency` 模板 | `FactoryOrderItem`, `FactoryOrderProgress`, `ProductionComparisonRecord`, `OrderProgressDetailsRecord`, `OrderTicketLot`, `OperationalEfficiencyTemplate` |
| 物料供应与备料 | 管控备料采购、库存与出库 | `StockingPurchaseInbound.tsx`, `MaterialStock.tsx`, `MaterialIssueDetails.tsx`, `MaterialInventoryReport.tsx`, `MaterialPurchaseReport.tsx` | `StockingPurchaseRecord`, `MaterialStockListItem`, `MaterialIssueRecord`, `MaterialInventoryListItem` |
| 生产执行（车间） | 裁床、计件、质检、车间进度、薪资 | `CuttingPending.tsx`, `CuttingCompleted.tsx`, `CuttingReport.tsx`, `PieceworkDashboard.tsx`, `WorkshopProgress.tsx`, `ProcessProductionComparisonSection.tsx`, `QualityControlManagement.tsx`, `SalaryManagement.tsx` | `CuttingTask`, `CuttingReportRecord`, `PieceworkDashboardDataset`, `WorkshopProgressOrder`, `ProcessProductionLot`, `OrderTicketRecord`, `QualityControlRecord`, `SalaryEmployeeRecord` |
| 外发协同 | 管理外发订单、外接订单、外协报表 | `OutsourceOrders.tsx`, `IncomingOrders.tsx`, `OutsourcingManagement.tsx`, `OutsourcingProductionReport.tsx`, `OutsourcingManagement` 相关报表 | `OutsourceOrder`, `IncomingOrder`, `OutsourcingManagementListItem`, `OutsourcingProductionReportListItem`, `OutsourcingCuttingDetailRecord` |
| 成品入库与库存 | 收货、其它入库、库存、出库、进销存报表 | `FinishedGoodsPendingReceipt.tsx`, `FinishedGoodsReceived.tsx`, `FinishedGoodsOtherInbound.tsx`, `FinishedGoodsStock.tsx`, `FinishedGoodsPendingReceipt.tsx`, `FinishedGoodsOutbound.tsx`, `FinishedGoodsInventoryReport.tsx` | `FinishedGoodsPendingReceiptRecord`, `FinishedGoodsReceivedRecord`, `FinishedGoodsOtherInboundRecord`, `FinishedGoodsStockRecord`, `FinishedGoodsOutboundRecord`, `FinishedGoodsInventoryListItem` |
| 结算与资金 | 收付款、往来对账、资金账户 | `SettlementCustomerReceipts.tsx`, `SettlementFactoryPayments.tsx`, `SettlementSupplierPayments.tsx`, `SettlementCashierAccounts.tsx`, 各类 Settlement 报表 | `CustomerReceiptRecord`, `FactoryPaymentRecord`, `SupplierPaymentRecord`, `CashierAccount`, `CustomerBusinessDetailRecord`, `ReconciliationDetailsRecord` |
| 运营报表与系统设置 | 工作台、全局统计、偏好、权限、操作日志 | `Workplace.tsx`, `OrderReportAggregation.tsx`, `Settings/*`, `Appstore.tsx`, `Guide.tsx` | `WorkplaceStats`, `CompanyOverview`, `UserAccount`, `ActionLogEntry`, `PreferenceGroup` |

## 2. 前端数据模型与接口现状

### 2.1 主数据（Master Data）

- 款式：`StyleData`, `StyleDraft`, `StyleOperation`（`src/types/style.ts`）。模板与工序列表与 `StyleOperationTemplate` 共享字段。
- 物料：`MaterialItem`、`MaterialDataset`（`src/types/material.ts`），兼容分类与规格。
- 工序/工价：`ProcessType`（`src/types/process-type.ts`）、`OperationTemplate`（`src/types/operation-template.ts`），字段高度相似，可抽象为 Process Catalog。
- 往来单位与仓库：`Partner`, `Warehouse`（`src/types/partners.ts`, `src/types/warehouse.ts`）。
- 系统用户/角色/组织：集中在 `src/types/settings.ts`，覆盖 `UserAccount`, `RoleItem`, `PermissionTreeNode`, `ActionLogEntry` 等。

### 2.2 样板域

- 核心实体 `SampleOrder`、状态 `SampleStatus`、统计 `SampleStats`（`src/types/sample.ts`）。
- 跟进模板 `TemplateNode`、模板汇总 `FollowTemplateSummary`。
- 板类 `SampleTypeItem`、仪表盘点 `SampleDashboardStats`、报表 `SampleCostCard`, `SampleOrderComparisonItem`。
- API 入口集中在 `sampleService`（`src/api/mock.ts`），返回 `{ list, total }` 模式，已有查、增、复制、导出等 stub。

### 2.3 订单生产域

- 工厂订单：`FactoryOrderDataset` 包含卡片 + 列表 + 状态页签（`src/types/factory-orders.ts`）。
- 生产对照表：`ProductionComparisonRecord`、`ProductionComparisonSummary`（`src/types/order-production-comparison.ts`）。
- 进度明细：`OrderProgressDetailsRecord`（`src/types/order-progress-details-report.ts`）。
- 裁床/计件：`CuttingTask`, `CuttingReportRecord`, `OrderTicketLot`, `OrderTicketRecord`（`src/types/cutting.ts`, `src/types/order-ticket-details-report.ts`）。
- 工序效率模板：`OperationalEfficiencyTemplate`（`src/types/operational-efficiency.ts`）。

### 2.4 物料域

- 备料采购：`StockingPurchaseRecord`（`src/types/stocking-purchase-inbound.ts`）。
-（按单采购已下线，仅保留备料采购流程）。
- 库存：`MaterialStockListItem`, `MaterialInventoryListItem`（`src/types/material-stock.ts`, `src/types/material-inventory.ts`）。
- 出库：`MaterialIssueRecord`, 汇总字段统一 `issueQty`, `amount`。

### 2.5 成品域

- 待收货/已收货/其它入库：`FinishedGoodsPendingReceiptRecord`, `FinishedGoodsReceivedRecord`, `FinishedGoodsOtherInboundRecord`。
- 库存/出库：`FinishedGoodsStockRecord`, `FinishedGoodsOutboundRecord`。
- 报表：`FinishedGoodsInventoryListItem`, 汇总结构与物料域保持一致。

### 2.6 车间&计件域

- 工单/车间看板：`WorkshopProgressOrder` 与 `WorkshopStageProgress`（`src/types/workshop-progress.ts`）。
- 计件工资：`SalaryEmployeeRecord`, `SalarySettlementSummary`（`src/types/salary-management.ts`）。
- 质检：`QualityControlRecord`, `QualityControlMeta`（`src/types/quality-control-management.ts`）。

### 2.7 外发协同域

- 外接订单 `IncomingOrder`、委外订单 `OutsourceOrder`（`src/types/collaboration.ts`）。
- 委外任务：`OutsourcingManagementListItem`, `OutsourcingProductionReportListItem`, `OutsourcingCuttingDetailRecord`。

### 2.8 结算域

- 资金账户：`CashierAccount`、`CashierAccountPayload`（`src/types/settlement-cashier-accounts.ts`）。
- 往来收付款：`CustomerReceiptRecord`, `FactoryPaymentRecord`, `SupplierPaymentRecord`，结构一致。
- 报表：`CustomerBusinessDetailRecord`, `FactoryBusinessDetailRecord`, `SupplierBusinessDetailRecord`, `ReconciliationDetailsRecord`。

### 2.9 系统&运营

- 工作台：`WorkplaceStats`, `DeliveryItem`（`src/types/workplace.ts`）。
- 设置中心：`CompanyOverview`, `UserAccount`, `PreferenceGroup`, `ActionLogEntry`（`src/types/settings.ts`）。

## 3. 数据冗余与优化机会

1. **跨域共享字段重复**：订单、库存、收发记录普遍包含 `orderNo`、`styleNo`、`styleName`、`color`、`size`、`partnerName` 等字符串字段，易导致信息不同步。
2. **往来对账模型平行复制**：客户/供应商/加工厂支付、报表的类型结构完全一致，可归一为 `PartnerLedger`、`Payable/Receivable` 通用模型。
3. **库存流水缺少统一事件模型**：物料与成品分别定义 `stockQty`, `availableQty`, `inTransitQty` 等字段，但缺乏单一的 `InventoryTransaction` 抽象，导致业务逻辑分散。
4. **工序模板、工价、计件票据字段交叉**：`ProcessType`, `OperationTemplate`, `OrderTicketRecord` 多次定义 `processName/price/unit` 字段，可共享 Process Catalog。
5. **样板到大货缺少显式关联**：`SampleOrder` 未直接关联 `FactoryOrder`，转换链路需通过订单号约定，建议持久化引用。
6. **仓储相关枚举重复**：物料与成品仓库类型区分靠字符串，可通过 `Warehouse.type` + 外键约束统一管理。

## 4. 最佳实践数据库模型设计

> 建议采用 PostgreSQL/MySQL 等关系型数据库 + JSONB 存储可选扩展字段；核心表命名示例遵循 `snake_case`。

### 4.1 租户与主数据

- `tenants`：`id`, `name`, `logo`, `plan`, `status`。
- `users`：`id`, `tenant_id`, `name`, `phone`, `email`, `status`, `avatar_url`, `last_login_at`。
- `roles` / `user_roles` / `permissions`：RBAC 结构，支持模块级粒度。
- `partners`：`id`, `tenant_id`, `type`(`customer|supplier|factory|subcontractor`), `name`, `contact`, `phone`, `address`, `status`, `remarks`。
- `warehouses`：`id`, `tenant_id`, `type`(`material|finished|virtual`), `name`, `manager_id`, `address`。
- `materials`：`id`, `tenant_id`, `sku`, `name`, `category_id`, `unit`, `attributes`(JSON), `status`。
- `material_categories`：树形结构。
- `styles`：`id`, `tenant_id`, `style_no`, `name`, `category_id`, `default_unit`, `designer_id`, `status`。
- `style_variants`：`id`, `style_id`, `color`, `size`, `additional_attrs`。
- `process_catalog`：`id`, `tenant_id`, `code`, `name`, `charge_mode`, `default_wage`, `unit`, `status`。
- `operation_templates`：`id`, `tenant_id`, `name`, `is_default`, `operations`(JSON referencing `process_catalog.id`).

### 4.2 样板开发

- `sample_orders`：`id`, `tenant_id`, `sample_no`, `customer_id`, `style_id`, `style_variant_id`, `quantity`, `unit_price`, `total_amount`, `priority`, `status`, `deadline`, `designer_id`, `merchandiser_id`, `pattern_maker_id`, `remarks`, `created_at`, `updated_at`。
- `sample_processes`：`id`, `sample_order_id`, `process_catalog_id`, `sequence`, `planned_duration`, `department_id`。
- `sample_follow_logs`：`id`, `sample_order_id`, `user_id`, `status`, `note`, `logged_at`。
- `sample_types`：`id`, `tenant_id`, `name`, `description`。
- `sample_costs`：`id`, `sample_order_id`, `cost_item`, `amount`。
- `sample_metrics`：物化视图或定时写入的统计表，用于仪表盘。

### 4.3 大货订单与生产

- `sales_orders` / `sales_order_lines`（若存在客户订单）。
- `production_orders`：`id`, `tenant_id`, `order_no`, `customer_id`, `style_id`, `expected_delivery`, `status`, `source_sample_order_id`, `remarks`。
- `production_order_lines`：`id`, `production_order_id`, `style_variant_id`, `ordered_qty`, `unit_price`, `bom_version_id`。
- `production_process_routes`：`id`, `production_order_id`, `operation_template_id`, `status`。
- `work_orders`：`id`, `production_order_line_id`, `process_catalog_id`, `planned_qty`, `completed_qty`, `status`, `start_at`, `end_at`, `is_outsourced`, `subcontractor_id`。
- `work_order_events`：记录进度（裁床、缝制等），支持趋势报表。
- `cutting_tickets`：`id`, `work_order_id`, `bed_no`, `color`, `size`, `ticket_qty`, `cutter_id`, `cut_at`。
- `piecework_tickets`：`id`, `work_order_id`, `ticket_no`, `process_catalog_id`, `worker_id`, `quantity`, `piece_rate`, `amount`, `status`, `recorded_at`。
- `operational_efficiency_templates`：持久化标准工时（引用 `process_catalog`）。

### 4.4 物料与采购

- `boms` / `bom_items`：`style_id` + `material_id` + `consumption`。
- `material_requirements`：依据工单展开的物料需求，字段 `production_order_line_id`, `material_id`, `required_qty`, `allocated_qty`, `status`。
- `procurement_orders`：`id`, `tenant_id`, `order_no`, `type`(`stocking|order_based`), `supplier_id`, `status`, `order_date`, `expected_arrival`, `total_amount`。
- `procurement_order_lines`：`procurement_order_id`, `material_id`, `color`, `width`, `weight`, `unit`, `order_qty`, `unit_price`, `batches`(JSON)。
- `material_receipts`：`id`, `procurement_order_id`, `warehouse_id`, `received_at`, `handler_id`, `status`。
- `material_receipt_lines`：`material_receipt_id`, `material_id`, `received_qty`, `pending_qty`, `remark`。
- `material_issues`：`id`, `warehouse_id`, `work_order_id`(可选), `issue_type`, `recipient_id`, `issued_at`。
- `material_issue_lines`：`material_issue_id`, `material_id`, `quantity`, `unit_price`, `amount`, `source_order_no`。
- `inventory_transactions`：统一库存流水，字段 `id`, `tenant_id`, `warehouse_id`, `material_id?`, `style_variant_id?`, `quantity`, `unit_cost`, `direction`(`in|out|adjust`), `transaction_type`(`procurement_receipt`, `production_issue`, `finished_receipt`, `shipment`, `inventory_adjustment`...), `related_document_type`, `related_document_id`, `occurred_at`。
- `inventory_balances`：物化视图或日终快照，用于 `MaterialStock`、`FinishedGoodsStock` 页面。
- `inventory_reservations`：锁定待出库/待入库数量，对应前端 `pendingQty`/`inTransitQty`。

### 4.5 成品入库与出货

- `finished_goods_receipts`：`id`, `tenant_id`, `receipt_no`, `production_order_id`, `source_type`(`production|outsourcing|other`), `warehouse_id`, `processor_id`, `received_at`, `status`。
- `finished_goods_receipt_lines`：`receipt_id`, `style_variant_id`, `sku_code`, `quantity`, `unit_price`, `amount`, `remark`。
- `finished_goods_dispatches`：`id`, `dispatch_no`, `customer_id`, `warehouse_id`, `logistics_provider_id`, `dispatch_at`, `status`。
- `finished_goods_dispatch_lines`：`dispatch_id`, `style_variant_id`, `order_line_id`, `quantity`, `unit_price`, `amount`, `tracking_no`。
- `logistics_providers`：按需扩展。

### 4.6 外发协同

- `outsourcing_orders`：`id`, `tenant_id`, `order_no`, `subcontractor_id`, `production_order_id`, `process_catalog_id`, `dispatch_qty`, `unit_price`, `dispatch_at`, `expected_return_at`, `status`, `attrition_rate`。
- `outsourcing_receipts`：`outsourcing_order_id`, `received_qty`, `defect_qty`, `rework_qty`, `received_at`。
- `outsourcing_material_requests`：回料申请。
- `incoming_orders`（外接单 business）结构类似 `outsourcing_orders` 但 partner 类型为客户。

### 4.7 车间、质检、薪资

- `workshop_progress_snapshots`：用于渲染 `WorkshopProgress`，每日写入各工序完成度。
- `quality_inspections`：`id`, `work_order_id`, `inspector_id`, `qc_date`, `inspected_qty`, `passed_qty`, `failed_qty`, `defect_reason`, `disposition`。
- `payroll_settlements`：`id`, `tenant_id`, `start_date`, `end_date`, `department_id`, `status`, `settled_amount`, `created_by`。
- `payroll_settlement_lines`：关联 `piecework_tickets` / `adjustments`。
- `piecework_adjustments`：批量调薪记录。

### 4.8 结算与财务

- `cash_accounts`：`id`, `tenant_id`, `account_type`, `account_no`, `bank_name`, `initial_balance`, `current_balance`。
- `receivables` / `payables`：`id`, `tenant_id`, `partner_id`, `document_type`, `document_id`, `currency`, `amount`, `due_at`, `status`。
- `receipts` / `payments`：对应收付款单，引用 `cash_accounts`。
- `settlements`：对账单（客户/供应商/加工厂），支持多单汇总。
- `settlement_lines`：`settlement_id`, `document_type`, `document_id`, `amount`, `status`。
- `reconciliations`：存储对账明细及状态变更。

### 4.9 日志与审计

- `audit_logs`：`id`, `tenant_id`, `module`, `action`, `document_no`, `user_id`, `client_ip`, `payload_snapshot`, `created_at`。
- `preferences`：用户级别或租户级别个性化设置。

## 5. 推荐 API 设计

所有接口遵循 `/api/v1/{domain}`，统一返回 `{ data, meta }` 或 `{ list, total, meta }`。关键列表支持 `page`, `pageSize`, `sortBy`, `order`, `filter[...]` 约定。

### 5.1 主数据

| Method | Path | 描述 | 请求体/参数 | 响应 |
| --- | --- | --- | --- | --- |
| GET | `/api/v1/styles` | 列表 & 搜索 | `page,pageSize,keyword,status,category` | `{ list: Style[], total }` |
| POST | `/api/v1/styles` | 新增款式 | `StyleDraft` | `{ id }` |
| GET | `/api/v1/materials` | 物料主数据 | `category,keyword,page` | `{ list, total }` |
| POST | `/api/v1/operation-templates` | 保存工序模板 | `operations[]` | 模板详情 |
| GET | `/api/v1/partners` | 往来单位 | `type,status,keyword,page` | `{ list, total }` |

### 5.2 样板

| Method | Path | 描述 |
| --- | --- | --- |
| GET | `/api/v1/sample-orders` | 支持状态、客户、时间段过滤；返回 `SampleOrder` + 统计 `meta.stats` |
| POST | `/api/v1/sample-orders` | 创建样板单（含流程、SKU 矩阵） |
| PATCH | `/api/v1/sample-orders/{id}` | 更新基础信息、状态流转 |
| POST | `/api/v1/sample-orders/{id}/follow-ups` | 记录跟进 |
| GET | `/api/v1/sample-orders/{id}/costing` | 成本拆解 |
| GET | `/api/v1/sample-dashboard` | 返回仪表盘 `SampleDashboardStats`、趋势图 |
| GET | `/api/v1/sample-types` / POST | 维护样板分类 |

### 5.3 订单与生产

| Method | Path | 描述 |
| --- | --- | --- |
| POST | `/api/v1/production-orders` | 从样板/销售订单生成大货订单 |
| GET | `/api/v1/production-orders` | 列表 + 状态 + 进度条（含 `includeCompleted`） |
| GET | `/api/v1/production-orders/{id}` | 详情，关联 `production_order_lines`, `work_orders` |
| POST | `/api/v1/work-orders` | 拆分工序工单（内部/委外） |
| PATCH | `/api/v1/work-orders/{id}` | 更新进度、完工数、状态 |
| POST | `/api/v1/cutting-tickets` | 创建裁床票 |
| GET | `/api/v1/work-orders/{id}/progress` | 返回工序完成率、瓶颈 |
| GET | `/api/v1/order-progress-report` | 聚合报表（分页） |

### 5.4 物料与库存

| Method | Path | 描述 |
| --- | --- | --- |
| POST | `/api/v1/procurement-orders` | 新建采购单（支持类型） |
| PATCH | `/api/v1/procurement-orders/{id}` | 状态流转（提交、作废、完成） |
| POST | `/api/v1/procurement-orders/{id}/receipts` | 批次收料 |
| POST | `/api/v1/material-issues` | 领料出库/退料 |
| GET | `/api/v1/inventory/materials` | 物料库存（支持仓库、仅在库、关键词） |
| GET | `/api/v1/inventory/materials/movements` | 库存流水明细 |
| GET | `/api/v1/material-requirements` | MRP 汇总，支持 `restockNeeded` |
| GET | `/api/v1/inventory/materials/report` | 入库/出库趋势与比例 |

### 5.5 成品

| Method | Path | 描述 |
| --- | --- | --- |
| POST | `/api/v1/finished-goods-receipts` | 批量收货（生产/委外/其它） |
| PATCH | `/api/v1/finished-goods-receipts/{id}` | 修改仓库、备注或数量（审批流程可选） |
| GET | `/api/v1/inventory/finished-goods` | 成品库存（支持分组、仓库） |
| POST | `/api/v1/finished-goods-dispatches` | 出库发货 |
| GET | `/api/v1/finished-goods/inventory-report` | 进销存报表 |

### 5.6 外发协同

| Method | Path | 描述 |
| --- | --- | --- |
| POST | `/api/v1/outsourcing-orders` | 创建委外任务，并锁定工单数量 |
| PATCH | `/api/v1/outsourcing-orders/{id}` | 更新状态（发出/收回/结算） |
| POST | `/api/v1/outsourcing-orders/{id}/receipts` | 回厂收货 |
| POST | `/api/v1/outsourcing-orders/{id}/material-requests` | 委外补料申请 |
| GET | `/api/v1/outsourcing/orders` | 列表 + 统计 |
| GET | `/api/v1/outsourcing/report` | 逾期、完工率、欠料、缺陷等指标 |

### 5.7 车间与质检

| Method | Path | 描述 |
| --- | --- | --- |
| GET | `/api/v1/workshop/dashboard` | 车间概览（在制、延期、完工） |
| POST | `/api/v1/piecework-tickets` | 计件录入 |
| PATCH | `/api/v1/piecework-tickets/{id}` | 作废/结算 |
| GET | `/api/v1/quality-inspections` | 质检记录列表/筛选 |
| POST | `/api/v1/quality-inspections` | 新增质检 |
| POST | `/api/v1/payroll-settlements` | 生成计件工资结算 |

### 5.8 结算与资金

| Method | Path | 描述 |
| --- | --- | --- |
| GET | `/api/v1/cash-accounts` | 资金账户列表 |
| POST | `/api/v1/cash-accounts` | 新增账户 |
| GET | `/api/v1/receivables` / `/payables` | 应收/应付余额表 |
| POST | `/api/v1/receipts` / `/payments` | 登记收付款 |
| POST | `/api/v1/settlements` | 创建对账单（支持多类型 partner） |
| PATCH | `/api/v1/settlements/{id}/status` | 确认、撤销 |
| GET | `/api/v1/settlements/report` | 按客户/供应商/加工厂业务明细 |

### 5.9 系统与审计

- `/api/v1/settings/profile`, `/api/v1/settings/company`, `/api/v1/settings/users`, `/api/v1/settings/roles`, `/api/v1/settings/audit-logs` 等按模块划分。
- 所有写操作记录 `audit_logs`，与前端操作日志页面 (`src/views/settings/ActionLog.tsx`) 对齐。

## 6. 数据流与事件链路

1. **款式/物料准备 → 样板单**：选择 `style_variants` + `process_catalog` 模板，形成 `sample_orders`；完成后可复用 BOM。
2. **样板确认 → 生产订单**：`production_orders.source_sample_order_id` 存档，复制流程模板、消耗定额。
3. **MRP 展开 → 采购**：`material_requirements` 迭代生成 `procurement_orders`（备料/按单）；收货写入 `inventory_transactions`。
4. **生产执行 → 工序/计件/质检**：`work_orders` → `piecework_tickets` 与 `quality_inspections`；完工事件触发 `finished_goods_receipts`。
5. **入库 → 出货 → 结算**：`finished_goods_receipts` 与 `finished_goods_dispatches` 均写库存流水；生成 `receivables`/`payables`；与 `receipts`/`payments` 关联后进入对账。
6. **外发/协同**：委外工单走 `outsourcing_orders`，实收量同步 `finished_goods_receipts` 与 `inventory_transactions`；费用进入 `payables`。
7. **运营统计**：基于上述实体构建物化视图/OLAP（或借助 BI），支撑前端报表（打板、成本、利润、进销存）。

## 7. 实施建议

- **领域驱动分层**：划分模块（Master Data、Sample、Production、Inventory、Settlement、Settings），微服务或领域上下文隔离，防止模型耦合。
- **统一编号规则**：所有业务单据集中使用 `documents` 序列表维护，确保跨模块查询方便。
- **事件驱动**：关键状态变更（样板确认、工单完工、收发货、结算完成） emit domain event，用于刷新统计与通知。
- **审计与并发**：针对库存、收付款、薪资等关键操作引入悲观/乐观锁、版本号；保留完整 `audit_logs`。
- **报表性能**：以 `inventory_transactions`、`piecework_tickets`, `receivables/payables` 为事实表，构建数据仓库或物化视图；前端需要的 `summary` 字段应通过 SQL 聚合而非重复存储。
- **API 与权限**：结合 `ActionLog` 与 `PermissionTreeNode`，在后端实现细粒度权限控制（按模块 + 操作 + 数据范围）。

---

该设计将现有前端数据结构统一映射到后端规范化模型，减少重复字段维护，确保样板→生产→库存→结算的全链路闭环数据一致性，并为未来引入真实服务与扩展 BI 能力奠定基础。
