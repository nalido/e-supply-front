# 样板单“下大货”弹窗对齐改造记录（2026-03-11）

## 1. 目标
- 将样板单列表中的“下大货”交互改为与“工厂订单创建弹窗”完全一致。
- 保留从样板单进入时的预填能力：仅预填款式信息。

## 2. 调研结论
- `FactoryOrders` 页面已支持通过 URL 参数自动打开创建弹窗并预填款式：
  - `quickCreate=1`
  - `styleId=<id>`
- `SampleList` 之前维护了一套独立的“下大货”弹窗（交货日期 + 颜色尺码行），与工厂订单创建弹窗 UI 不一致。

## 3. 实施方案
- 删除 `SampleList` 自定义“下大货”弹窗及提交逻辑。
- 点击“下大货”时：
  1. 拉取样板单详情以获取 `styleId`；
  2. 若无 `styleId` 则提示错误；
  3. 走确认弹窗后路由到：
     - `/orders/factory?quickCreate=1&styleId=<styleId>&sampleOrderId=<id>&sampleOrderNo=<no>`
- 由 `FactoryOrders` 页面统一承接创建弹窗展示与提交流程。
- 在 `FactoryOrders` 的 quickCreate 场景下，创建工厂订单成功后回写样板单状态为 `PRODUCING`，保持原业务效果。
- 在 `FactoryOrders` 的 quickCreate 场景下，若样式列表项未携带 `colors/sizes`，会按 `styleId` 兜底拉取款式详情并自动回填颜色尺码矩阵。

## 4. 变更文件
- `src/views/SampleList.tsx`
- `src/views/FactoryOrders.tsx`

## 5. 验证
- 执行：`npm run lint`
- 结果：通过（无新增错误；保留既有 warning）。
