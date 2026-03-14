# 款式周销量 → 建议面辅料库存 → 补货建议 前端 MVP

> 状态说明（2026-03-14）：该文档描述的“在款式详情配置周销量 + 在订单报表中心查看销量备料建议”已被新方案替代。现行入口为“物料进销存 -> 销量备料建议”实时计算页。

## 改造范围

### 1. 款式详情页 `/basic/styles/detail`
- 在 `StyleDetail.tsx` 新增 **备料参数 / 周销量设置** 卡片。
- 支持读取/保存以下字段：
  - `source`（AUTO / MANUAL）
  - `manualWeeklySales`
  - `autoSalesWeeks`
  - `coverageWeeks`
  - `overrideReason`
- 页面展示：
  - 自动周销量 `autoWeeklySales`
  - 生效周销量 `effectiveWeeklySales`
- 前端保存策略：
  - 继续复用现有 `styles` 保存接口。
  - 将周销量配置写入 `variant.attributes.weeklySalesConfig`，避免新建一套独立保存接口，兼容现有样式资料结构。

### 2. 订单物料需求报表 `/orders/report/material-need`
- 新增模式切换：
  - **订单需求**
  - **销量备料建议**
- 切换到“销量备料建议”时，前端调用新接口：
  - `GET /api/v1/orders/reports/material-stocking-suggestions`
- 展示字段包括：
  - 周销量
  - 来源
  - 统计周期
  - 覆盖周数
  - 单耗
  - 损耗率
  - 建议库存
  - 当前可得量
  - 建议补货量
  - 以及款号/款名、物料编号、供应商等辅助字段

## 类型与 API

### Style 相关
新增 `StyleWeeklySalesConfig`：
- `source`
- `manualWeeklySales`
- `autoSalesWeeks`
- `coverageWeeks`
- `overrideReason`
- `autoWeeklySales`
- `effectiveWeeklySales`

### 物料需求报表相关
新增：
- `OrderMaterialRequirementMode`
- `SalesStockingSuggestionListParams`
- `SalesStockingSuggestionListItem`
- `SalesStockingSuggestionListResponse`

并在 `src/api/order-material-requirement-report.ts` 中新增：
- `getSalesStockingSuggestions()`

## 页面行为说明

### 款式详情页
1. 打开已有款式时：
   - 从款式详情接口读取 `weeklySalesConfig`
   - 自动回填来源、手工周销量、自动回看周数、覆盖周数、覆盖说明
2. AUTO 模式：
   - “手工周销量”禁用
   - 生效周销量优先显示后端返回的 `effectiveWeeklySales`，否则回退显示 `autoWeeklySales`
3. MANUAL 模式：
   - 可输入“手工周销量”
   - 生效周销量即时显示为手工值
4. 保存时：
   - 周销量配置随款式资料一并提交

### 物料需求报表
1. 默认模式为 **订单需求**，保持原有行为。
2. 切换到 **销量备料建议**：
   - 重新请求列表
   - 表格列切换为销量备料口径字段
3. “仅显示需补料数”文案会随模式切换：
   - 订单需求：仅显示需补料数
   - 销量备料建议：仅显示建议补货量 > 0
4. 搜索占位文案也会切换：
   - 订单需求：物料名称
   - 销量备料建议：物料名称 / 款号

## 自测建议

### 款式详情页
- [ ] 打开已有款式，确认“备料参数 / 周销量设置”卡片正常显示
- [ ] AUTO / MANUAL 切换正常
- [ ] MANUAL 下手工周销量可输入，AUTO 下禁用
- [ ] 保存后刷新页面，配置能正确回显
- [ ] 自动周销量/生效周销量统计块显示正常

### 物料需求报表
- [ ] 默认进入“订单需求”模式，原列表可正常展示
- [ ] 切到“销量备料建议”后重新请求数据
- [ ] 面料/辅料/包材 tab 切换正常
- [ ] 仅显示建议补货量 > 0 过滤可用
- [ ] 分页、页大小、搜索条件可正常联动

## 说明
- 这是一个前端 MVP，对样式与现有 API 结构做了最小侵入复用。
- 其中款式周销量配置通过 `variant.attributes.weeklySalesConfig` 透传，便于先跑通页面。
- 销量备料建议列表依赖后端提供 `/api/v1/orders/reports/material-stocking-suggestions`。若后端尚未上线，该模式会提示获取失败，但不会影响“订单需求”模式使用。
