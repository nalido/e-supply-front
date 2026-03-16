# 样板单 / 款式 / BOM 前端重构记录（2026-03-14）

## 1. 调研结论

- `SampleOrderFormModal.tsx` 之前在一个表单里同时承载样板单字段、款式主数据、SKU、BOM，并通过 `sampleOrderApi.create/update` 把 `styleSyncMode`、`styleUpdateConfirmed`、`materials` 一起提交。
- `StyleDetail.tsx` 之前只读加载 `fetchMaterials(styleId)`，没有 BOM 编辑和保存能力。
- `sample-order.ts` 的 update 与 create 复用同一请求构造器，编辑样板单时仍会带上 BOM 和款式同步字段。
- 方案文档 `/Users/huangjianbing/codes/supply-and-sale/docs/e-supply/sample-style-bom-refactor-plan-20260314.md` 明确要求：
  - 编辑样板单时切断隐式建款/改款/改 BOM。
  - BOM 统一收口到 `styles/{id}/bom-materials`。
  - 创建态保留“快速创建款式并绑定”。

## 2. 实施方案

### 2.1 API 层

- 新增 `src/api/style-bom.ts`
  - `GET /api/v1/styles/{styleId}/bom-materials`
  - `POST /api/v1/styles/{styleId}/bom-materials/update`
  - 对旧接口 `/materials`、`/materials/update` 做 404 fallback，便于前后端过渡。
- `src/types/style.ts` 补齐 BOM draft/update 类型，并给 `StyleMaterialData` 增加 `imageUrl/unitPrice/remark`。
- `src/api/sample-order.ts`
  - 移除 `styleSyncMode`、`styleUpdateConfirmed`、`materials` 的前端请求建模。
  - 为 update 单独使用 `buildUpdateRequest`，避免编辑样板单继续带 BOM 同步字段。

### 2.2 页面改造

- `src/views/StyleDetail.tsx`
  - BOM 区从只读表格改为可编辑卡片。
  - 保存款式资料时，先保存款式主数据，再调用 `styleBomApi.update(...)` 保存 BOM。
  - BOM 选择器复用现有物料选择和编辑交互。
- `src/components/sample/SampleOrderFormModal.tsx`
  - 去掉创建态里“创建新款式 / 更新已有款式”的同步策略 UI。
  - 编辑态样板单主保存不再提交 BOM。
  - 新增“保存关联款式面辅料”按钮，显式通过 `styleBomApi.update(...)` 保存 BOM。
  - 样板单编辑/选择已有款式时，BOM 改为从 `styleBomApi.fetch(...)` 加载。
  - 创建态如果没有 `styleId`，先调用 `styleDetailApi.create(...)` 快速创建款式，再调用 `styleBomApi.update(...)` 保存 BOM，最后创建样板单。
  - 创建态如果已经绑定已有款式，用户一旦修改颜色、尺码、颜色图、尺寸图或 BOM，会自动解除 `styleId`，转为“快速建款”路径，避免误改已有款式。

## 3. 交互变化

- 新建样板单：
  - 仍可选择已有款式。
  - 仍可直接填写款号/款名/颜色/尺码/BOM，保存时会先建款再绑样板单。
  - 不再出现“更新已有款式”选项。
- 编辑样板单：
  - 主保存按钮只保存样板单。
  - BOM 编辑改为点击“保存关联款式面辅料”单独保存。
- 款式资料页：
  - 面辅料可增删改，并与样板单使用同一 BOM 接口。

## 4. 验证

- `npm run build`
  - 通过。
- `npm run lint`
  - 通过，仓库已有 2 个历史 warning，均在 `src/views/FactoryOrders.tsx`，本次改动未新增 lint 问题。
