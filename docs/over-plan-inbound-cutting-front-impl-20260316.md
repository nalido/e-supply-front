# 裁床超裁最小前端补充记录（2026-03-16）

## 1. 是否需要前端最小改动
需要，且理由充分：
- 现状只有“超用”提示，没有“超裁原因码 / 原因说明 / 备注”输入。
- 如果只改后端，用户会在完工时被 400 拦截，但页面不知道为什么要补什么字段，属于明显 UI 误导。
- 因此本轮在 `CuttingPending.tsx` / `CuttingCompleted.tsx` 做了最小补充，不扩散到报表页、不改成品待入库页面。

## 2. 本轮前端落地
### 2.1 完工弹窗
新增并区分两套字段：
- 超用：`usageReasonCode` / `usageReasonText` / `usageRemark`
- 超裁：`overCutReasonCode` / `overCutReasonText` / `overCutRemark`

交互规则：
- 实际用量 > 计划用量：必须填写超用三字段。
- 实裁件数 > 计划件数：必须填写超裁三字段。
- Alert 明确提示：**本次将超裁，但不会自动扩张成品待入库。**

### 2.2 详情面板
待裁/已裁详情新增展示：
- 超用备注
- 超裁原因
- 超裁备注

这样验收时可以直接从页面确认结构化留痕是否回显。

## 3. 本地验证
### 3.1 已执行
```bash
cd /Users/huangjianbing/codes/supply-and-sale/e-supply-front
npx tsc -b
```

结果：未能完成全量前端类型校验，原因是仓库已有存量错误：
- `src/components/page/SearchField.tsx(30,3): error TS6133: 'enterButton' is declared but its value is never read.`
- `src/components/page/SearchField.tsx(31,3): error TS6133: 'buttonProps' is declared but its value is never read.`

该阻断与本轮裁床改动无关，但会导致 `npm run build` / `tsc -b` 不能给出绿色结果。

### 3.2 联调时需确认
当后端接口可鉴权调用后，需在页面确认：
1. 超用时三字段必填。
2. 超裁时三字段必填。
3. 详情页能回显超用备注 / 超裁原因 / 超裁备注。
4. 页面文案明确写死“不传导到成品待入库”。
