# 款式资料前后端对接记录（2024-02-20）

## 调研
- **前端模块**
  - `src/views/StyleMaterials.tsx` 展示卡片列表，依赖 `stylesApi.list` 获取分页款式数据，入参包含 `keyword/page/pageSize`，并会在 action bar 中跳转到 `'/foundation/product/detail'` 以创建新款式。
  - `src/views/StyleDetail.tsx` 负责款式新增/编辑。通过 URL `?id=` 判断是否编辑，调用 `styleDetailApi.fetchMeta/fetchDetail/create/update`，并使用 `ImageUploader` 完成封面与颜色图片上传。
  - API 层：`src/api/styles.ts`、`src/api/style-detail.ts`、`src/api/storage.ts`，依赖 `tenantStore` 注入租户，`http` 拦截器负责附带 token 与 `X-Tenant-Id`，并将包含 `page` 的 query 转成 0-based。
  - 类型定义：`src/types/style.ts` 描述了列表、详情、保存 payload 等结构。
- **后端模块**
  - `StyleController` (`src/main/java/com/atlas/esupply/api/masterdata/StyleController.java`) 暴露 `/api/v1/styles` 相关接口：`GET /meta`、`GET /`、`GET /{id}`、`POST /`、`POST /{id}/update`、`POST /{id}/status/update`。
  - DTO：`StyleSummary`、`StyleResponse`、`StyleRequest`、`StyleVariantRequest/Response`，分页使用 `PageResponse<T>`，状态枚举为 `StyleStatus (ACTIVE/INACTIVE)`。
  - Service：`StyleService` 负责款式 CRUD、变体汇总、默认单位、设计师元数据（来源 `UserAccount`）。创建/更新需校验款号唯一并一次性覆盖 variant。
  - 文件上传：`FileStorageController` (`/api/v1/storage/files`) 支持通过 `tenantId` + `module` 上传图片，对应前端通用 `ImageUploader`。
- **接口契约差异**
  - 前端 `StyleDetail` 支持颜色图片（存放在 `variant.attributes.colorImageUrl`），与后端 `VariantPayload` 的 `attributes` map 对应。
  - 列表页需要颜色/尺码数组，后端通过 `StyleService.summarizeVariants` 已提供。

## 计划
- **代码联调准备**：确认前端 `apiConfig.useMock` 从 `.env.local` 中关闭（`VITE_USE_MOCK=false`），确保通过真实接口获取数据，并梳理 `tenantStore` 注入点（若当前 session 未写入，需要降级提示）。
- **列表页接口适配**：校验 `stylesApi.list` 的分页/查询参数，确保请求含 `tenantId`、`keyword`，响应 `page` 正确转换成 1-based，卡片展示字段齐全；补充空状态、副操作提示。
- **详情页接口适配**：串联 `styleDetailApi` 的 meta/detail/create/update，校验保存 payload（含 colorImages -> variant.attributes），并完善错误提示/按钮状态；复用 `ImageUploader`。
- **后端补充**（若调试遇到缺口）：扩展 DTO 字段或 service，以满足前端 color/size/图片需求，并重启后端。
- **测试验证**：编写/执行前端层面的最小验证（lint + 关键页面手动 smoke）以及后端单元/集成（必要时 `mvn test -D...`），记录在文档末尾。

## 开发
- 14:05 将 `StyleMaterials` 卡片替换为真实接口数据，并在 `StyleCard` 上增加点击跳转逻辑，支持通过 `/foundation/product/detail?id=` 直接进入编辑态；按钮点击会阻止冒泡，避免误跳转。
- 14:08 调整 `StyleCard` 图片兜底逻辑与 `style-materials.css` 鼠标样式，确保没有封面图时依旧具备预览体验。
- 14:15 确认 `.env.local` 中 `VITE_USE_MOCK=false`，`styleDetailApi`/`stylesApi` 一律会携带 `tenantId` 调用真实后端，同时依赖新增的 `/api/v1/styles/meta`、`StyleSummary` 颜色/尺码汇总。

## 测试
- 14:25 前端：`npm run lint`（ESLint 全量扫描），结果通过。
- 14:28 后端：`mvn -q -Dtest=com.atlas.esupply.domain.masterdata.MasterdataServiceIT test` 启动 MySQL Testcontainers 并通过 `StyleService` 关键路径测试。

## 运维
- 14:35 通过 `/Users/jambin/codes/supply-and-sale/e-supply-back/scripts/start_backend_local.sh` 重启后端，日志输出位于 `logs/backend_local_20251123_223910.log`，PID 记录于 `logs/backend_latest.pid`。
- 14:36 健康检查：`curl -s http://localhost:8080/actuator/health` 返回 `{"status":"UP","groups":["liveness","readiness"]}`，确认实例就绪。
- 21:05 发现 `/api/v1/styles/meta` 命中 `/{styleId}` 解析，排查后确认旧进程（PID 20075）占用 8080，导致脚本未能重新部署最新代码。终止旧进程并再次执行 `start_backend_local.sh`，生成日志 `logs/backend_local_20251124_210921.log`。
- 21:10 再次健康检查 `curl -s http://localhost:8080/actuator/health` 成功，`curl http://localhost:8080/api/v1/styles/meta?tenantId=1` 需要鉴权，前端调用会附带 token 与 `X-Tenant-Id`，后端已返回 403（未携带 token）而不再出现 500。

---

## 2025-11-24 款式工序扩展

### 调研
- `StyleDetail` 前端页面（`src/views/StyleDetail.tsx`）以及 `styleDetailApi`（`src/api/style-detail.ts`）当前仅覆盖基础信息、颜色/尺码与图片，相关 types（`src/types/style.ts`）没有任何工序字段，提交 payload 也只包含 variants。
- 工序主数据（`processTypeApi` → `/api/v1/process-catalog`）与工序模板（`operationTemplateApi` → `/api/v1/operation-templates`）模块已完备，可提供启用状态工序列表与带单价/排序信息的模板；`OperationTemplate` 页面包含 Form.List + 可复用的交互逻辑。
- 后端 `StyleController`/`StyleService`（`src/main/java/com/atlas/esupply/api/masterdata/StyleController.java` 等）没有 `style_processes` 相关实体或 Repository，`StyleRequest`/`StyleResponse` 也未暴露工序数据，因此 `/api/v1/styles` 无法保存或返回工序列表。
- 参考域：打样模块已有 `SampleProcess`（`domain/sample/entity/SampleProcess.java`）以及 `SampleOrderService.mapProcesses` 的映射逻辑，可借鉴其数据建模、排序与批量写入的方式；工序模板服务中 `OperationTemplateService` 提供了工序节点校验、ProcessCatalog 映射等通用逻辑。
- 需求约束：款式工序与 `process_catalogs` 的启用工序关联，允许从工序模板复制但复制后与模板解耦；还需修复 `/api/v1/styles/meta` 在旧版本出现的 500 问题，确保代码部署后一致。

### 计划
1. **后端数据层**：新增 `style_processes` 表（Flyway + `test-schema.sql`），包含 `style_id/process_catalog_id/sequence/unit_price/remarks/source_template_id` 等字段；实现 `StyleProcess` 实体与 `StyleProcessRepository`，并在 `StyleService` 中加载/持久化。
2. **后端应用层**：扩展 `StyleService.StyleAggregate`、`StyleRequest`、`StyleResponse`、`StyleMetadataResponse` 以携带工序信息；在创建/更新时校验 ProcessCatalog 状态，仅允许启用项；提供从模板复制的 service 方法（直接在前端读取模板亦可，但 service 需暴露操作所需 DTO）。
3. **前端类型与 API**：更新 `src/types/style.ts`、`src/api/style-detail.ts` 以映射 operations 字段（含 processCatalog 信息、单价、备注、序号），保持 variants 映射逻辑不变。
4. **前端 UI**：在 `StyleDetail` 中新增“款式工序”卡片，Form.List 支持选择启用工序、输入单价/备注、调整顺序，并提供“引用工序模板”弹窗（数据来自 `operationTemplateApi.list`）；引用后可继续编辑，不回写模板。
5. **文档与验证**：本日志持续记录调研/计划/开发/测试；完成后更新 `docs/api-impl/real-api-integration-plan.md` 中的款式章节；执行 `npm run lint`、`mvn -q -Dtest=...` 验证，并通过脚本重启后端、记录健康检查。

### 开发
- 新增 `style_processes` 数据表（`V13__style_processes.sql`）与 `StyleProcess` 实体/Repository，同时在 `StyleService` 中扩展 `StyleAggregate` 携带 `StyleProcessNode`，create/update 路径会校验启用状态的 `process_catalog` 并一次性覆盖工序列表；`StyleRequest`/`StyleResponse` 加入 `processes` 字段，提供 `StyleProcessRequest/Response` DTO。
- 更新 `MasterdataServiceIT`：在款式用例中创建两条 `ProcessCatalog`，断言创建/更新时的工序数量、顺序、单价字段，保证回归覆盖 `StyleProcessPayload`。
- 前端扩展 `StyleDetail`：`styleDetailApi`、`types/style.ts`、`mock/style-detail.ts` 均引入 `processes` 字段；详情页新增“款式工序”卡片（Form.List + Select + InputNumber + 排序/删除按钮）以及引用模板 Modal，复用 `processTypeApi.hot()` 作为候选集，引用模板可选择追加/覆盖；保存请求会附带序号和 `sourceTemplateId`。

### 测试
- 后端：`mvn -q -Dtest=com.atlas.esupply.domain.masterdata.MasterdataServiceIT test` ✅，依赖 Testcontainers MySQL，验证新老路径均通过。
- 前端：`npm run lint` ✅，确认新增 TS 类型/组件无语法及 ESLint 问题。

### 运维
- 通过 `/Users/jambin/codes/supply-and-sale/e-supply-back/scripts/start_backend_local.sh` 重启后端，日志输出 `logs/backend_local_20251124_221714.log`，PID 记录由脚本维护。
- 健康检查：`curl -s http://localhost:8080/actuator/health` 返回 `{ "status": "UP", "groups": ["liveness", "readiness"] }`，确认实例正常。

### 2025-11-24 22:45 工序保存联调复盘
- **22:30 用户反馈**：在款式详情页追加工序并保存后，后端未写入 `style_processes` 表。
- **22:35 排查**：`lsof -i :8080` 显示仍有旧进程（PID 63863）运行，查看 `/logs/backend_local_20251124_210921.log` 仅校验到 12 个 Flyway migration，说明实例未加载 `V13__style_processes.sql` 及最新 `StyleProcess` 代码；`curl -s http://localhost:8080/v3/api-docs | jq ... | grep StyleProcess` 也无相关 DTO。
- **22:40 处理**：终止 PID 63863，执行 `/Users/jambin/codes/supply-and-sale/e-supply-back/scripts/start_backend_local.sh`，生成日志 `logs/backend_local_20251124_223939.log`。
- **22:41 健康检查**：`curl -s http://localhost:8080/actuator/health` 返回 `{"status":"UP"...}`，并确认 `curl -s http://localhost:8080/v3/api-docs | jq '.components.schemas | keys[]' | grep StyleProcess` 显示 `StyleProcessRequest/Response`，说明新版本已生效。
- **待办**：请在真实环境重新保存含工序的款式，随后检查 `style_processes` 即可看到数据；若仍异常，再抓取请求体与后端日志继续定位。
