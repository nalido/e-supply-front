# 一期前端实现与验证记录：备料入库超计划 & 裁床实际用量超计划（2026-03-16）

## 1. 文档目的
记录 e-supply-front 一期前端改造的调研、实施计划、字段口径对齐、联调约束与本地验证结果，确保“允许但告警 + 原因/备注必填 + 关键口径展示 + traceId 友好报错链路保留”可追溯。

## 2. 所属环境
- 仓库：`e-supply-front`
- 环境：local
- 范围：备料采购入库、裁床待裁/已裁详情

## 3. 调研结论
### 3.1 备料入库现状
- 页面入口：`src/views/StockingPurchaseInbound.tsx`
- 当前单笔/批量收料表单都用 `pendingQty` 做前端上限校验，超计划会被前端直接拦截。
- 列表与收料明细仍以“采购数 / 待收料 / 已收料”为主，未显式区分计划量、累计实收量、超收量、计划待收量。
- 错误提示链路依赖 `src/api/http.ts` 的全局拦截器；traceId 会从响应头/响应体提取并自动拼接到友好错误提示。

### 3.2 裁床实际用量现状
- 页面入口：`src/views/CuttingPending.tsx`，已裁详情：`src/views/CuttingCompleted.tsx`
- 完工弹窗已有计划 vs 实际偏差提示，但只是展示偏差，不要求超用原因/备注，也没有结构化字段提交。
- 详情面板展示“预计用料 / 开裁实用 / 完成实用”，未统一成一期要求的“计划用量 / 实际用量 / 超计划用量 / 节约回退量 / 差异类型”。
- 创建裁床单的超裁限制仍在 `CuttingCreate.tsx`，本次无需放开，符合一期边界。

### 3.3 接口与字段现状
- 备料收料接口：`src/api/procurement.ts -> receive()`
- 裁床完工接口：`src/api/piecework.ts -> completeCuttingSheet()`
- 现有前端类型中尚未声明一期新增口径字段，因此需先扩展 types，再做展示与提交对齐。

## 4. 实施计划
1. 扩展采购与裁床前端类型，兼容一期新增字段。
2. 调整备料入库列表/明细/收料表单：
   - 展示计划量、累计实收量、超收量、计划待收量
   - 超计划时弹出明确告警
   - 超计划时强制填写原因与备注
3. 调整裁床完成弹窗与详情：
   - 展示计划用量、实际用量、超计划用量、节约回退量
   - 超计划时强制填写原因说明
4. 保持全局 `traceId + 友好错误` 拦截链路不改坏。
5. 执行本地构建验证并记录结果。

## 5. 改动说明
### 5.1 备料采购入库
涉及文件：
- `src/types/stocking-purchase-inbound.ts`
- `src/api/procurement.ts`
- `src/views/StockingPurchaseInbound.tsx`

已做改动：
1. 新增并兼容以下字段：
   - 列表/详情：`actualReceivedQty`、`withinPlanReceivedQty`、`overReceivedQty`、`planPendingReceiveQty`
   - 收料明细：`isOverReceipt`、`overReceiptQty`、`overReceiptReasonCode`、`overReceiptReasonText`
   - 提交字段：`overReceiptReasonCode`、`overReceiptReasonText`
2. 列表口径改为显式展示：
   - `计划量`
   - `累计实收量`
   - `超收量`
   - `计划待收量`
3. 单笔收料改为支持超计划输入：
   - 去掉“不能超过待收料”的前端阻断
   - 弹窗根据提交后累计实收量动态计算是否超计划
   - 超计划时使用 `Alert warning` 明确提示超收量
   - 超计划时“超收原因”“原因说明/备注”“业务备注”必填
4. 批量收料逐条增加动态告警与必填校验：
   - 逐条提示提交后累计实收量/超收量
   - 逐条校验超收原因、原因说明、业务备注
5. 收料明细抽屉补充“本次超收量”“计划待收量”“超收原因”展示。
6. 不再在 `pendingQty <= 0` 时禁用“收料”按钮，避免计划已满后无法录入超计划收料。

### 5.2 裁床实际用量
涉及文件：
- `src/types/cutting.ts`
- `src/api/piecework.ts`
- `src/views/CuttingPending.tsx`
- `src/views/CuttingCompleted.tsx`

已做改动：
1. 新增并兼容以下字段：
   - `overUsedFabricQty`
   - `returnedFabricQty`
   - `fabricUsageVarianceType`
   - `usageReasonCode`
   - `usageReasonText`
2. 完工提交接口新增可选字段：
   - `usageReasonCode`
   - `usageReasonText`
3. 完工弹窗升级为一期口径提示：
   - 显示计划用量、实际用量、超计划用量/回退量
   - 明确提示“本次不放开超裁件数，只处理实际用量差异”
   - 实际用量超计划时，原因选择与原因说明必填
4. 待裁/已裁详情描述统一为：
   - 计划用量
   - 实际用量
   - 超计划用量
   - 节约回退量
   - 差异类型
   - 超用原因

### 5.3 traceId 与友好错误链路
- `src/api/http.ts` 未改动。
- 页面仍使用原有请求封装，后端异常时应继续由全局错误总线展示友好文案，并附带 traceId。
- 本轮补充 `src/utils/friendly-error.ts`：
  - 为“库存不足，无法领料”增加专属标题映射：`库存不足，无法完成本次领料`
  - 描述补充处理建议：`请先补充库存或调整本次实际用量后再试。`
  - 为“超收必须填写原因编码、原因说明和备注”补充更贴近页面字段的中文提示

## 6. 字段口径对齐说明
### 6.1 备料入库
| 前端展示/提交 | 一期字段 | 说明 |
| --- | --- | --- |
| 计划量 | `orderQty` | 采购单行计划基线 |
| 累计实收量 | `actualReceivedQty`（兼容回退到 `receivedQty`） | 实际执行口径 |
| 超收量 | `overReceivedQty` | 超计划部分 |
| 计划待收量 | `planPendingReceiveQty` | 按计划完成度展示 |
| 超收原因 | `overReceiptReasonCode` | 结构化原因编码 |
| 原因说明 | `overReceiptReasonText` | 补充说明 |

### 6.2 裁床实际用量
| 前端展示/提交 | 一期字段 | 说明 |
| --- | --- | --- |
| 计划用量 | `plannedFabricQty` | 开裁计划基线 |
| 实际用量 | `actualFabricQty` / `completeActualFabricQty` | 完工实际消耗 |
| 超计划用量 | `overUsedFabricQty` | 超计划差异 |
| 节约回退量 | `returnedFabricQty` | 小于计划时的回退差异 |
| 差异类型 | `fabricUsageVarianceType` | `NORMAL/OVER/UNDER` |
| 超用原因 | `usageReasonCode` / `usageReasonText` | 一期审计字段 |

## 7. 验证结果
### 7.1 本地验证
- 执行命令：`npm run build`
- 结果：通过（`tsc -b && vite build` 成功）
- 备注：Vite 仍提示主包 chunk 体积偏大，但属于既有构建告警，不是本次改动引入的阻断问题。

### 7.2 关键手工检查点
1. 备料收料弹窗输入超过计划待收量时，不再被前端硬拦截。
2. 超计划时出现黄色告警，且原因/说明/备注不填不能提交。
3. 批量收料逐条可看到计划量、累计实收量、计划待收量与超收告警。
4. 裁床完工录入实际用量 > 计划用量时，必须填写超用原因与说明。
5. 待裁详情与已裁详情能看到计划用量 / 实际用量 / 超计划用量 / 节约回退量。
6. 请求失败时仍走全局友好错误与 traceId 提示链路。

## 8. 仍需后端配合的点
1. 确认并落地超收原因、超用原因的正式枚举值；当前前端使用了占位枚举，需与后端统一。
2. 收料列表、收料明细、裁床详情接口需稳定返回新增字段，避免只能靠前端 fallback 推导。
3. 若后端对超计划原因/备注有长度、必填、枚举校验，需同步接口契约文档。
4. 若裁床报表页也要展示新增口径，后端报表接口需补充字段后再联调前端列表。

## 9. 风险与未解决问题
1. 当前原因枚举为前端暂定值，若后端枚举不一致会导致提交失败或审计值不统一。
2. 部分旧数据接口尚未返回新增结构化字段时，页面会使用 fallback 推导，仅适用于展示，不适合作为审计最终口径。
3. 本次未改裁床报表列表页；若业务要求“列表/详情”中的列表必须覆盖报表页，还需单独补一轮联调。
