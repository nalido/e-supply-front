# Ozon 渠道款式一期前端契约

## 页面模型

- 销售中心使用独立的渠道款档，Ozon 名称、图片、类目、颜色、尺码和平台身份不写入工厂主档。
- 一个工厂款式可以关联多个渠道款档；渠道款档按平台、店铺独立。
- 关联分为三级：渠道 SPU 对应工厂款式、渠道 SKC 对应工厂 SKC、渠道 SKU 对应工厂 SKU。
- Ozon 卖家货号作为自动匹配工厂 SKU 的首要依据，颜色和尺码组合为第二匹配依据。
- 平台差异通过 `platformCode` 和 `platformExtension` 扩展，公共关联结构不绑定 Ozon 字段，为后续 Temu 接入保留稳定契约。
- Ozon 跨店铺铺货只提交源渠道商品身份和目标店铺范围，由后端从源渠道快照生成草稿；前端不提交工厂款名、工厂图片或工厂规格覆盖源渠道资料。

## 当前兼容契约

一期页面继续兼容 `/api/v1/sale/style-compatibility` 现有返回：

- `platformStyleId` 暂作为 Ozon SPU 展示兜底。
- `platformSkuCode` 暂作为卖家货号展示兜底。
- `colorGroups[].groupId` 仅作为前端行键；没有 Ozon SKC 时页面明确显示“待平台补齐”，不会把颜色文本伪装成平台 SKC。
- 唯一工厂款式候选自动选中；加载工厂规格后，前端按卖家货号完全一致、颜色尺码完全一致的顺序预填 SKU 关联。

## 后端需补充的字段

治理清单与明细需逐步补齐以下可选字段，旧字段可在迁移期并存：

### 渠道款式

- `platformCode`：一期固定 `OZON`，以后可为 `TEMU` 等。
- `channelStyleId`：系统内渠道款档身份。
- `platformSpuId`：平台 SPU 身份，不与渠道款号或工厂款号混用。

### 渠道 SKC

- `channelSkcId`
- `platformSkcId`
- `sellerSkcCode`
- `factorySkcId`
- `factorySkcNo`
- `mappingStatus`

### 渠道 SKU

- `channelSkuId`
- `platformSkuId`
- `sellerSkuCode`：Ozon 对应卖家货号。
- `factoryVariantId`
- `factorySkuNo`
- `matchSource`：`SELLER_SKU_EXACT`、`COLOR_SIZE_EXACT` 或 `MANUAL`。
- `confidence`

### 渠道款档

`ChannelStyleProfile` 需补充：

- `platformCode`
- `channelStyleId`
- `platformSpuId`
- `platformStyleNo`
- `sellerStyleCode`
- `skcs[]`
- `platformExtension`

其中 `skcs[].skus[]` 使用上述公共三级结构。Ozon 原始字段存入 Ozon 扩展数据；Temu 后续接入时新增 Temu 扩展数据，不修改工厂关联字段。

## 交互验收口径

- 1440×900：治理清单至少可见 6 行，详情使用抽屉，不挤压主列表。
- 1024 宽度：主页面单列，整页无横向滚动；SKU 表仅允许表格区域内部横向滚动。
- 有且仅有一个工厂款式候选时默认选中，不要求用户重复选择。
- 渠道款档未关联工厂款式时仍可独立查看；生产关联只作为联动状态展示。

## 2026-08-22 前端静态验收

- 治理表格可视区域为 492px，行高 68px，设计容量为 7 行以上。
- 1100px 及以下启用单列筛选、单列对照区和单列 SKC 关系区；表格横向内容限制在表格内部滚动。
- 唯一款式候选、唯一卖家货号候选和唯一颜色尺码候选才允许自动选中，存在歧义时保留人工确认。
- 治理抽屉覆盖 SPU、SKC、SKU、卖家货号以及工厂款、工厂 SKC、工厂 SKU。
- 商品管理在未关联工厂款时仍会先打开渠道款档；已关联时额外读取工厂款式详情，显示工厂 SKU 和 SKC 业务编号。
- 渠道主图加载失败时显示稳定占位，不留下破图。
- 跨店铺铺货前端仅保留渠道源商品复制请求，未保留提交工厂款名或工厂图片的入口。
- `npm run lint` 为 0 error（仓库既有 10 条 warning），`npm run build` 通过，`git diff --check` 通过。
- 浏览器运行时当前未发现可用实例，因此 1440×900 与 1024 的真实截图和控制台/网络检查仍需在浏览器实例恢复后补验。
