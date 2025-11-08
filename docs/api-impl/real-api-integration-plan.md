# 真实接口对接计划（2025-11-08）

## 目标与方法
- 复盘前端现有模块（`src/views` 與 `src/api`）及 Mock 契约，确认页面对数据的期望格式。
- 解析后端 OpenAPI (`http://localhost:8080/v3/api-docs`)，按 tag/模块聚类接口，评估与前端契约的一致性。
- 输出分模块适配度 + 分阶段落地路线，并标记缺口（字段、接口、交互约束）。

> 术语：下文的“阶段”按 mock → 真接口 的落地顺序划分；“适配度”分为：`Ready`（可直接替换，做少量字段映射即可）、`Adjust`（接口存在但需后端补字段/枚举/分页等）、`Blocked`（后端暂缺核心接口）。

---

## 模块适配度明细

### 1. 样衣 & 打版域
| 前端页面 / 服务 | 现有数据点 | 后端接口 | 适配度 | 必要动作 |
| --- | --- | --- | --- | --- |
| `SampleList`, `SampleDetail`, `SampleDashboard`（`sampleService`，`src/views/SampleList.tsx:1-200`） | 需要列表、统计卡片、流程、SKU 矩阵、优先级/状态中文标签 | `/api/v1/sample-orders`, `/api/v1/sample-orders/dashboard`, `/api/v1/sample-orders/{id}` | Adjust | 后端状态/优先级为大写枚举（`PENDING/APPROVED...`、`LOW`），需映射至前端的 `pending/confirmed` 与 `urgent/high`；响应缺少 style/customer 文本字段，需补充或前端额外查 `styleId`、`customerId`。分页是 0-based `page`+`size`，需做转换。|
| `SampleType`, `SampleFollow` | 需要列表 + CRUD；模板节点（`nodes`）包含 `fieldType`, `duration` | `/api/v1/sample-types`, `/api/v1/sample-follow-templates` | Ready | 统一在 axios 层注入 `tenantId`，并把 `node` 返回的 `nodeName/nodeCode` 转换成前端期望字段；删除接口要求 `tenantId` query。|
| `SampleCostingReport`, `SampleOrderComparisonReport` | 多维报表/导出，Mock 走 `src/mock/sample-costing-report.ts` | **缺少**任何 `/sample-cost` 或 `/sample-order-comparison` 相关接口 | Blocked | 需后端补聚合/对比 API；在此之前继续使用 mock 并在页面提示“仅示范数据”。|

### 2. 基础档案（款式/仓库/合作商/工艺）
| 前端页面 | 现有数据点 | 后端接口 | 适配度 | 必要动作 |
| --- | --- | --- | --- | --- |
| `StyleDetail`, `StyleMaterials` | 需要款式详情 + 物料结构 + 图像 | `/api/v1/styles`, `/api/v1/styles/{styleId}` | Adjust | 接口只返回 ID 和基础字段，缺少配色/尺码矩阵；需要确认 `StyleResponse` 是否可扩展或补充 `/variants`。|
| `Partners` | 列表 + 启用禁用、合作类型、联系人 | `/api/v1/partners` | Ready | 响应 `status` 为大写，前端需转译；启停接口为 `PATCH /status`。|
| `Warehouse` | 库存类型（material/finished）、地址、负责人 | `/api/v1/warehouses` | Adjust | 后端 type = `MATERIAL/FINISHED/VIRTUAL`，需映射；响应增加 `status`，前端需展示；创建必须带 `tenantId`。|
| `ProcessType` / `OperationTemplate` | Mock 使用 `operations[]` 带单价 | `/api/v1/process-catalog`（单工序）+ `/api/v1/production/operational-efficiency`（模板） | Adjust | `process-catalog` 没有组合模板概念，需明确：若 OperationTemplate 应该对应 operational-efficiency，则要改 UI 数据结构（nodeCode/timeUnit = `DAY/HOUR`）；若确需“工序 + 单价”集合，需要后端补数组字段。|

### 3. 物料 & 采购域
| 页面 | Mock 需求 | 后端接口 | 适配度 | 缺口 |
| --- | --- | --- | --- | --- |
| `MaterialStock`, `MaterialInventoryReport` (`materialStockService`) | 标签页（面/辅料）、仓库筛选、列表汇总 | `/api/v1/inventory/materials`, `/meta` | Ready | 接口字段与前端类型基本一致，仅 `materialType` / `warehouseId` 需大小写转换。|
| `MaterialIssueDetails` | 出入库明细 + meta | `/api/v1/inventory/material-issues`, `/meta` | Ready | 同上。|
| `OrderPurchaseInbound` | 列表 + 汇总 + meta + “收货/强制完成” | `/api/v1/procurement/order-based`, `/meta`, `/orders/{id}/receive`, `/orders/{id}/status` | Adjust | 后端 `OrderPurchaseRecord` 缺少 `imageUrl`、`documentType` 详情；`receiveOrder` 请求体为 `ProcurementReceiptRequest`，字段名与前端 `items[]` 不同，需要适配；所有查询要求 `tenantId` 与 0-based page。|
| `StockingPurchaseInbound` | 列表 + meta + 批量收货/状态更新 | `/api/v1/procurement/stocking`, `/meta`, `/orders/{orderId}/receive` | Adjust | `StockingPurchaseRecord` 返回字段基本一致，但缺 summary；批量动作需要额外后端接口（当前只有按订单 `POST /receive`）。|
| `MaterialPurchaseReport`, `MaterialIssueReports` | 报表、导出 | **缺少** `/material-purchase-report`、`/material-issue-summary` 接口 | Blocked | 继续 mock，等待后端提供聚合 API。|

### 4. 生产执行 / 外协 / 车间
| 页面 | 后端接口 | 适配度 | 说明 |
| --- | --- | --- | --- |
| `OperationalEfficiency` | `/api/v1/production/operational-efficiency` + `/meta` | Adjust | Node 的 `timeUnit` 返回 `DAY/HOUR`，需与前端 `day/hour` 对应；`nodeOptions` 仅 value/label，前端若需要 `duration` 默认值需另设。|
| `IncomingOrders`, `FactoryOrders`, `Workplace`, `WorkshopProgress` | `/api/v1/workshop/dashboard`, `/api/v1/production-orders`, `/work-orders` | Adjust | `WorkshopDashboardResponse` 仅包含 summary + stages，不含页面当前用到的采购进度、物料状态，需要后端扩展；`production-orders` 只暴露基本字段，需确认是否能返回 `statusTabs` 数据。|
| `OutsourcingManagement`, `OutsourceOrders`, `OutsourcingProductionReport` | `/api/v1/outsourcing-orders`, `/report` | Adjust | 订单列表具备创建/收货，但报表仅有统计摘要，缺少页面所需的打印任务、分包商产能曲线，需要扩展 `subcontractorStats` 字段或新增接口。|
| `CuttingPending`, `CuttingCompleted`, `CuttingReport` | 仅有 `POST /api/v1/cutting-tasks` | Blocked | 无 `GET` 列表/进度接口，无法替换 mock。|
| `ProcessProductionComparison`, `OrderProgressDetails`, `OrderTicketDetails`, `OrderMaterialRequirementReport`, `BulkCostReport`, `OrderShipmentProfitReport` | 无对应 tag | Blocked | 需后端补接口。|
| `PieceworkDashboard` | `/api/v1/workshop/piecework-dashboard` | Ready | 响应具 dashboard 结构，可直接映射。|

### 5. 仓储/成品域
| 页面 | 后端接口 | 适配度 | 缺口 |
| --- | --- | --- | --- |
| `FinishedGoodsPendingReceipt`, `FinishedGoodsReceived`, `FinishedGoodsOutbound`, `FinishedGoodsStock`, `FinishedGoodsInventoryReport`, `FinishedGoodsOtherInbound` | `/api/v1/finished-goods/*` | Adjust | CRUD 接口齐全，但 `FinishedGoodsReceivedListItem` schema 为空（未定义字段），以及 `inventory/aggregation` 仅返回基础总数，需要补充颜色/尺码分布；部分接口要求 `tenantId` + warehouseId。|
| `Warehouse` (成品默认仓) | `/api/v1/settings/logistics/preferences` | Ready | 仅需在设置页增加调用。|

### 6. 品质 / 薪酬 / 结算 / 设置
| 页面 | 后端接口 | 适配度 | 缺口 |
| --- | --- | --- | --- |
| `QualityControlManagement` | `/api/v1/quality-inspections` | Adjust | 响应只有 ID、数量、处置，缺少 `orderNumber/styleName/processName`；需后端在列表查询 join 出展示字段或前端二次请求。暂无汇总/导出接口。|
| `SalaryManagement` | `/api/v1/payroll-settlements` | Adjust | 响应结构为“结算单 + lines[]”，与前端“按员工聚合 + summary”不一致；需要新增 summary 接口或在列表响应中补 `summary` 字段。|
| `Settlement*`（客户收款、供应商付款、对账报表、现金账户） | 仅 `/api/v1/cash-accounts` | Blocked | 大部分结算报表接口缺失，需要后端提供对应 REST；在此之前页面只能继续 mock。|
| `Settings/UserList/Roles/Preferences` | `/api/v1/settings/users`, `/roles`, `/preferences` | Ready | 需要统一 tenantId + 分页映射；`preferences` delete/upsert 已提供。|
| `Auth` | `/api/v1/auth/login` | Ready | 可替换 login mock，同时实现 token/tenant 注入。|

---

## 分阶段实施路线

### Phase 0（基础设施 & 风险兜底）
1. **HTTP 客户端建设**：新增 `src/api/http.ts`（axios/fetch），集中处理 baseURL、`tenantId` 注入、`Authorization` header、0-based 分页转换、错误提示。
2. **类型映射层**：在每个领域 API 模块中新增 `adapter`，把后端响应（大写枚举、数值 ID）转换为现有 `src/types` 结构，便于页面平滑过渡。
3. **渐进切换策略**：API 模块暴露 `useMock` feature flag（如 `import.meta.env.VITE_USE_MOCK`），支持逐页灰度验证。

### Phase 1（接口 Ready/低改动模块）
- **样衣核心**：`SampleList/Detail/Type/Follow`、`SampleDashboard`，先落地列表 + CRUD，统计卡缺字段时临时从列表聚合；需要的后端改动：补 style/customer 字段。预计 1 sprint。
- **基础档案 & 设置**：`Partners`, `Warehouse`, `UserList`, `Roles`, `Preferences`, `ProcessCatalog`。集中改写 API 层，验证 tenant 鉴权链路。
- **物料库存 & 成品仓储**：`MaterialStock`, `MaterialIssue`, `FinishedGoods*`（除 Received schema 缺陷外）。并行推动后端补 `FinishedGoodsReceivedListItem` 字段。

### Phase 2（需配合后端补字段/契约的模块）
- **采购入仓**：`OrderPurchaseInbound`, `StockingPurchaseInbound`。等待后端补 `imageUrl`/`documentType`、批量收货接口；前端完成请求体/分页适配。
- **生产执行**：`OperationalEfficiency`, `ProductionOrders`, `WorkshopDashboard`, `OutsourcingManagement`。需要后端提供 status tabs、进度条、打印/导出任务字段。
- **品质 & 薪酬**：后端补 `QualityInspectionResponse` 展示字段、`payroll-settlements` summary/department 过滤；前端再切换。

### Phase 3（后端尚未提供接口的报表/结算模块）
- **统计报表**：`BulkCostReport`, `OrderShipmentProfitReport`, `OrderMaterialRequirementReport`, `OrderProgressDetails`, `OrderTicketDetails`, `ProcessProductionComparison`, `SampleCostingReport`, `SampleOrderComparisonReport` 等。这些页面完全依赖 mock。需在 e-supply-back 中补 `/reports/*` API（聚合 + 导出），定义字段后再排期迁移。
- **结算域**：`SettlementCashierAccounts`, `SettlementCustomerReceipts`, `SettlementFactoryPayments`, `SettlementSupplierPayments`, `SettlementReport*`。目前只有现金账户列表，其他功能需完整 CRUD + 汇总接口。
- **裁剪 & 产能排程**：`CuttingPending/Completed/Report` 缺 GET 端点；需后端给出列表/进度 API，并约定和车间/订单模块的关联键。

---

## 关键缺口 & 协作事项
1. **统一租户 & 分页**：大多数接口要求 `tenantId` 且分页 0-based；需要后端允许 header 注入 tenant，或前端在请求层统一拼 query；对响应应回传 `page/pageSize` 以便校验。
2. **枚举/字典对齐**：后端普遍使用大写（`PENDING`, `LOW`）；需提供字典 API 或在 swagger 中补 `enum` 描述，前端编写 `enumMap`。建议在 `components/schemas` 中新增 `SampleStatusEnum`, `PriorityEnum` 等并沿用。
3. **字段缺失**：
   - `SampleOrderResponse` 缺 `styleName`, `customerName`, `images`, `skuMatrix`。
   - `FinishedGoodsReceivedListItem` schema 未定义；`FinishedGoodsInventoryListItem` 缺 `warehouseType`、`availableQty`。
   - `QualityInspectionResponse` 仅返回 ID，需要补 `orderNo/styleName/processName/worker`。
   - `PayrollSettlementResponse` 缺 `summary`、`departmentName`，难以驱动现有 UI 的统计卡。
4. **批量动作 API**：前端大量场景（批量收货、批量完结、批量打印）需要 `/batch` 接口；目前 swagger 仅零散提供 `POST /{id}/receive`。建议在采购、成品、外协模块增加批量端点或允许 body 携带多条记录。
5. **导出/统计**：几乎所有报表页都存在 `导出为 Excel` 按钮（见 `src/views/OrderShipmentProfitReport.tsx` 等），需后端提供对应流式下载接口或预签名 URL。
6. **认证链路**：只有 `/api/v1/auth/login` 描述，缺少 refresh/logout；在 Phase 0 需明确 token 格式（JWT? session?）与失效处理，避免重复实现。

---

## 建议后续步骤
1. 与后端同步本计划，确认 Phase 1/2 需要补充的字段与接口，形成联调 issue 列表。
2. 先在 `src/api` 新增真实服务模块（如 `src/api/sample-order.ts`）并通过 feature flag 切换，便于逐页验证。
3. 建立 swagger → TypeScript 类型的自动生成（例如 `openapi-typescript`），减少手写接口带来的 drift。
4. 对 Blocked 模块输出单独的 PRD/接口需求文档，确保 e-supply-back 团队能按优先级实现。
