# 工厂订单车缝节点按裁床放量前端调整记录（2026-03-18）

## 调研

- 页面入口集中在 `src/views/FactoryOrders.tsx`。
- 原实现问题：
  - `SEWING` 节点点击依赖前置节点全部完成，导致裁床只有部分完成时无法进入车缝分配。
  - 车缝分配矩阵、剩余量加载和弹窗提示都按“下单总量”做上限，和本次口径不一致。
  - 页面里“分配/剩余/进度百分比”文案混用，容易把百分比误看成数量。
- 后端现状确认：
  - `progress` 节点 `payloadJson` 已包含 `orderedQuantity`、`allocatedQuantity`、`completedQuantity`。
  - 前端可以优先读取：
    - `CUTTING.payloadJson.completedQuantity` 作为裁床累计已完成。
    - `SEWING.payloadJson.allocatedQuantity` 作为车缝累计已领取。
  - 颜色尺码级别的累计数量，当前仍需从节点 `allocations.items` 聚合。
- 风险边界：
  - 卡片页节点只拿到轻量 `progress` 字段，没有完整 `payloadJson`，因此列表节点上展示的百分比仍受后端卡片接口返回影响。

## 方案

- 入口放开：
  - 对 `SEWING` 节点单独放宽前置限制，只要前置 `CUTTING` 节点已有实际完成百分比大于 0，即允许进入统计/领取弹窗。
- 数量口径：
  - 车缝总可新增领取上限 = `裁床累计已完成 - 车缝累计已领取`。
  - 颜色尺码可新增领取上限 = `颜色尺码裁床累计已完成 - 颜色尺码车缝累计已领取`。
  - 若后端累计字段缺失，则回退到前端现有 allocation history 聚合；不使用 `percent` 反推数量。
- 展示口径：
  - 数量类统一使用“裁床累计已完成 / 车缝累计已领取 / 当前剩余可领 / 本次领取”。
  - 进度百分比单独说明“按下单总量计算”，并允许因累计数量超过下单量而显示大于 `100%`。

## 实现

- 新增 `parseProgressNodePayload`，优先从 `payloadJson` 读取累计数量字段。
- `loadProgressStats` 现在会同时缓存：
  - `CUTTING.completedQuantity`
  - `SEWING.allocatedQuantity`
- `SEWING` 节点点击逻辑改为：
  - 若唯一阻塞前置节点是 `CUTTING`，且其完成百分比大于 `0`，允许进入弹窗。
- 车缝领取弹窗调整：
  - “加载剩余数量”改为“加载当前可领”。
  - 矩阵输入上限改为裁床累计已完成减去车缝累计已领取。
  - 提交前新增总量和颜色尺码两层校验，阻止超出当前可放量。
  - 文案从“分配”统一改为“领取”，避免把领取和进度混淆。
- 统计页调整：
  - `CUTTING` 保持“已裁 / 下单量”。
  - `SEWING` 改为“已领取 / 裁床已完成”。
  - 百分比文案显式注明“按下单总量”。

## 验证

- `npm run lint -- --max-warnings=0`：通过。
- `npm run build`：通过。
- 代码级覆盖点：
  - 裁床部分完成时，`SEWING` 节点不再因 `CUTTING` 未完成而禁用。
  - 车缝领取总量和颜色尺码明细都不能超过当前裁床可放量。
  - 裁床追加完成后，重新打开弹窗可读取新的可领数量。
  - 车缝统计矩阵展示“已领取 / 裁床已完成”，不再把数量口径绑定到进度百分比。
  - 车缝进度百分比由累计领取量和下单总量直接计算，可显示超过 `100%`。
- 页面级手测受限：
  - 本次沙箱只能写 `e-supply-front`，无法直接在 `e-supply-back` 仓库内写日志/target 产物，因此本地后端启动脚本无法成功落盘。
  - 已尝试拉起 `/Users/huangjianbing/codes/supply-and-sale/e-supply-back/scripts/start_backend_local.sh`，被沙箱写权限拦截。

## 待同步到总 docs

- 受当前沙箱限制，无法直接写 `/Users/huangjianbing/codes/supply-and-sale/docs/e-supply/...`。
- 需要同步的内容：
  - `TODO.md` 新增一条车缝按裁床放量的前端任务记录。
  - 新增本记录文档，路径建议：`docs/e-supply/06-integration/factory-order-sewing-partial-cutting-front-20260318.md`。
