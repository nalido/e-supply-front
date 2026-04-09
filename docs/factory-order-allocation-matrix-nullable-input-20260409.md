# 工厂订单分配弹窗空值输入整理 - 2026-04-09

## 调研

- 变更范围集中在工厂订单页面的分配弹窗：
  - `src/views/FactoryOrders.tsx`
  - `src/views/factory-orders/AllocationCreateModal.tsx`
  - `src/views/factory-orders/types.ts`
- 现状问题：
  - 分配矩阵初始化时默认把所有颜色/尺码单元格写成 `0`，弹窗一打开就呈现满表的 `0`
  - 输入框清空后仍会被归一化成 `0`，无法稳定表达“未填写”
  - 弹窗内提示信息较重，录入时视觉噪音较高

## 方案

- 将分配矩阵的单元格值从 `number` 调整为 `number | null`
- 初始化矩阵时默认使用 `null`，避免空表被预填 `0`
- 输入框变更时保留空值，只有用户输入数字时才做数量归一化
- 精简弹窗顶部和单元格下方说明，保留裁剪录入阶段的核心汇总信息

## 开发记录

- `FactoryOrders.tsx`
  - `handleAllocationMatrixQtyChange` 改为保留 `null`
  - 新建矩阵默认值从 `0` 改为 `null`
- `types.ts`
  - `AllocationQuantityMatrix` 改为 `Record<string, Record<string, number | null>>`
- `AllocationCreateModal.tsx`
  - 移除 `Alert` 和每个单元格下方的辅助说明
  - `InputNumber` 直接绑定 `null`/数字，允许空白态展示
  - 非裁剪阶段继续沿用可领数量上限控制
  - 裁剪阶段顶部仅展示“下单总量 / 已裁 / 本次录入 / 录入后”汇总

## 验证

- 本地前端启动成功：`npm run dev -- --host 127.0.0.1 --port 5173`
- 本地后端启动成功：`scripts/start_backend_local.sh`
- 本地登录后已打开 `http://[::1]:5173/orders/factory`
- 构建验证待执行：
  - `npm run build`

## 结论

- 本次改动的目标是把“未填写”与“填写 0”区分开，并让分配弹窗的录入界面更干净。
- 后续发布时需要重点验收工厂订单中裁剪/车缝分配弹窗的空白输入态和提交结果。
