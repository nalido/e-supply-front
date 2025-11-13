# 真实接口对接计划（2025-11-08）

## 目标与方法
- 复盘前端现有模块（`src/views` 與 `src/api`）及 Mock 契约，确认页面对数据的期望格式。
- 解析后端 OpenAPI (`http://localhost:8080/v3/api-docs`)，按 tag/模块聚类接口，评估与前端契约的一致性。
- 后端源代码目录为`/Users/jambin/codes/supply-and-sale/e-supply-back`。
- 按照页面进行渐进式替换真实接口的开发。每次用户提出对接某个页面时，首先你要列出前端岗位管理页面中用到的所有接口，然后查询后端接口文档和源代码调研后端现有接口是否支持和与前端契约一致。然后记录在这个文档中，以便于进度跟进。

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
1. **HTTP 客户端建设**（✅ 已完成）：`src/api/http.ts` 已落地 axios 实例，除原先的 baseURL/鉴权/租户注入外，新增 page→0-based 转换与统一错误提示。
2. **类型映射层**（🔄 进行中）：`src/api/adapters/settings.ts` 已提供 `CompanyOverview` 映射示例，下一步推广到其他领域类型。
3. **渐进切换策略**（🔄 进行中）：新增 `src/api/config.ts` 读取 `VITE_USE_MOCK`，`settingsApi.company.getOverview` 支持按 flag 切换真实接口；剩余模块的灰度开关待对接真实接口时渐进替换。

## 页面任务追踪

### 岗位管理（Settings → `/settings/roles`）

#### 前端依赖概览
- 入口 `src/views/settings/Roles.tsx`，依赖 `settingsApi.roles.*`（`list/create/update/remove/permissions`）。
- 期望的 `RoleItem` 字段：`{ id: string; name: string; description?: string; memberCount: number; updatedAt: string }`，其中 `memberCount` 用于表格 Tag，`updatedAt` 直接渲染字符串。
- 交互：搜索（前端过滤）、新建/编辑（名称 + 描述）、删除（`Modal.confirm`），以及“权限”抽屉需要一棵 `PermissionTreeNode[]`（`{ key; title; children? }`）。

#### 后端接口调研（`/Users/jambin/codes/supply-and-sale/e-supply-back`）
| 功能 | API & 契约 | 状态 | 备注 |
| --- | --- | --- | --- |
| 列表 | `GET /api/v1/settings/roles?tenantId={id}&keyword=` → `RoleResponse[]`，含 `id/tenantId/name/description/createdAt/updatedAt` | Ready（需适配） | 需在 axios 请求中自动注入 `tenantId`，`updatedAt` 转 ISO 字符串；响应无 `memberCount` 字段，前端需临时回退为 `0` 或基于用户列表本地聚合。|
| 详情 | `GET /api/v1/settings/roles/{roleId}?tenantId={id}` | Ready | 前端当前未使用，可用于编辑弹窗回显 + 权限列表。|
| 新建 | `POST /api/v1/settings/roles`，Body = `RoleRequest{ tenantId, name, description, permissionIds? }` | Ready（需灰度） | 允许 `permissionIds` 为空；需要从 `tenantStore` 注入租户。|
| 更新 | `PUT /api/v1/settings/roles/{roleId}`，Body 同上 | Ready | 同上。|
| 删除 | **缺失** | Blocked | 没有 `DELETE /roles/{id}`，无法支撑前端“删除”操作。需与后端确认是否允许软删或禁止删除。|
| 权限树 | **缺失** | Blocked | 仅有角色绑定的 `permissionIds` 列表，无 `GET /permissions/tree` 等端点，前端 `Tree` 只能继续使用 mock。需要补权限枚举接口，最好包含 `moduleKey/moduleName/action[]`。|

#### Phase 1 新任务（岗位管理）
1. 在 `settingsApi.roles` 内接入真实接口：沿用 `http` 客户端 + `apiConfig.useMock` 灰度，新增 `adaptRoleResponse()` 将 `RoleResponse` → `RoleItem`，并临时填充 `memberCount`（`response.memberCount ?? 0`）。
2. `Roles.tsx` 中的 CRUD 调用切换至新的 API 层，确保 `fetchRoles` 根据 `VITE_USE_MOCK` 自动兜底；keyword 仍使用前端过滤，后续可透传为 query。
3. 权限抽屉：在真实接口缺席前保持 mock 并在 UI 提示“权限树数据为演示”，同时记录对后端的接口需求（树形结构 + label/route 元信息）。
4. 发起后端需求：补充 `DELETE /api/v1/settings/roles/{roleId}` 及 `GET /api/v1/settings/permissions/tree`，并评估角色被成员引用时的约束（返回 409 + 提示）。
5. （可选）`memberCount` 如需真实值，需新增 `/settings/users/count-by-role` 或在角色列表响应中追加 `memberCount` 字段。该缺口在联调前同步给后端，便于一次性调整。
