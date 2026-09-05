
# Autonomous execution policy

Do not stop to ask for approval when the next step is implied by the task, PRD, existing critique, or acceptance criteria.

Forbidden stopping phrases:
- "If you agree..."
- "I recommend next..."
- "Shall I continue..."
- "I can do this next..."
- "The next step would be..."

When there is a clear defect, inconsistency, missing requirement, failed test, or mismatch with acceptance criteria, continue working until fixed.

Only stop when:
1. The task is fully completed and verified.
2. A destructive action is required.
3. Required information is impossible to infer.
4. There are multiple mutually exclusive product directions with similar confidence.

If blocked, produce:
- blocker
- what was attempted
- exact missing input
- smallest next action required from user

Otherwise, continue editing, regenerating, testing, or refining.

# Repository Guidelines

## Project Structure
- 这是多仓库工作区，核心仓库：
  - `e-supply-front`：前端（Vite + React）
  - `e-supply-back`：后端（Spring Boot, Java 21）
  - `supply-and-sale-ops`：CI/CD 与部署脚本
- 文档统一放在 `docs/` 与 `supply-and-sale-ops/docs/`。

## Development Commands
- 前端（`e-supply-front`）：
  - 安装依赖：`npm install`
  - 本地开发：`npm run dev`
  - 代码检查：`npm run lint`
  - 构建：`npm run build`
- 后端（`e-supply-back`）：
  - 本地启动（统一入口）：`/Users/jambin/codes/supply-and-sale/e-supply-back/scripts/start_backend_local.sh`
  - 测试：`mvn test`
  - 打包：`mvn clean package`
- 可选本地 MySQL：`docker compose -f local-dev/docker-compose.yml up -d`

## Current Deployment Standard
- 默认部署入口：`supply-and-sale-ops/.github/workflows/deploy-esupply.yml`（GitHub Actions 标准流程）
- 本地脚本：`supply-and-sale-ops/deploy/esupply/deploy_env.sh`（仅兜底）
- 支持模式：
  - `deploy_components=all`（前后端一起）
  - `deploy_components=front`（仅前端）
  - `deploy_components=back`（仅后端）
- 部署流程规范（默认标准）：
  - `supply-and-sale-ops/docs/e-supply/deployment-process-standard-20260306.md`
- 生产/开发环境配置与恢复手册：
  - `supply-and-sale-ops/docs/e-supply/env-config-and-recovery-runbook-20260304.md`
- 强制约束：
  - 除非用户在当前对话中明确要求“直接本地打包/本地脚本部署”，否则一律走 GitHub Actions 标准流程。
  - 触发部署后必须回传 workflow run 链接、关键参数（env/components/source_ref/release_id）和健康检查结果。

## Coding & API Conventions
- 前端优先保证可复用组件和清晰结构。
- 表格内“数值 + 单位”必须呈现为一个完整输入语义：单位使用无边框纯文本后缀或输入框内部后缀，禁止把单位渲染成独立带边框、带底色、类似第二个输入框的控件。Excel 式表格中的输入、下拉、日期、带前缀数字输入（如 `¥`）和带后缀数字输入（如单位）都必须覆盖组件实际生成的普通、affix、group DOM 形态，常态不得残留独立圆角输入框；正常态、禁用态、聚焦态、错误态都必须保持统一单元格视觉，并在新增或修改后做页面截图验收。
- 前端页面文案必须保持业务化、产品化表达；禁止在业务页面展示开发约束、测试限制、调试提示（如“仅手动触发写操作”等）。
- 业务页面禁止出现研发/接口口径文案，包括但不限于：
  - API 字段名或平台原始字段名直接外露，例如 `posting`、`offer_id`、`product_id`、`traceId`；确需展示时必须转成业务可理解名称，如“平台订单”“平台货号”“平台商品ID”“追踪编号”。
  - 实现限制、调用边界、技术保护说明，例如“不执行写接口”“只读接口”“后端分页”“本页只同步主数据”“供后续工作台接入”。
  - 面向开发/测试/调试人员的提示，例如“请提供给开发排查”“测试数据”“调试模式”“mock”“接口返回”。
  - 不自然的内部造词或研发分层词，例如“订单主数据”“商品行身份”“厚列表”；应改成业务对象、业务动作和用户能判断的状态。
- 若页面确实需要表达能力边界，应使用用户视角的业务结果说明，例如“系统会同步订单、商品明细和发货时限，方便后续集中处理发货”，不要描述底层接口是否写入。
- 禁止对业务列表做前端本地过滤、前端本地搜索，尤其是商品列表、订单列表、活动列表、库存列表这类会受数据量与实时状态影响的页面。
- 列表的搜索、筛选、分页、排序默认由后端负责；前端只负责透传查询条件与展示后端返回结果。仅静态枚举展示、纯前端临时草稿数据，才允许在组件内做本地过滤。
- 后端优先复用现有领域对象与服务，避免冗余设计。
- 后端 list 接口：除非明确说明，默认按更新时间倒序。
- 后端接口约束：仅使用 `GET`、`POST`；更新与删除使用 `../update`、`../delete` 风格的 `POST`。
- 不要使用权限定类名，不要定义内部类。

## Testing Rules
- 集成测试统一放在 `e-supply-back/scripts`，使用 Python 执行。
- 不要新增 Java 集成测试用例。
- 测试账号与 JWT 生成参考：`docs/测试账号信息.md` 与 `scripts/account_api_tests.py`。
- 每次修改完代码后，必须在本地运行与本次改动范围直接相关的集成测试用例，并在开发文档中记录测试命令与结果；不得仅以单元测试、代码检查或构建通过替代集成测试。若现有集成测试未覆盖本次改动，应先补充或扩展 `e-supply-back/scripts` 下的 Python 集成测试，再在本地运行验证。

## Process Rules
- 严格遵循：调研 -> 计划 -> 开发 -> 测试。
- 先调研现有实现和数据结构，再改代码。
- 开发过程与结论要记录到 `docs/`（包含调研、计划、进度、验证结果）。
- 完成开发并自测通过后，不要自动提交代码。
- 任务执行完成且自测通过后，保持服务运行，不要主动关闭。
- 自测不仅要自测接口、功能，还要测试改动地方的UI和交互是否合理，是否优秀。
- 使用codex 自身的todo tasks来跟进推进一次完整的任务执行，避免陷入没必要的中断。



## Repo & Security Notes
- 前后端是两个独立 Git 仓库，提交必须分别处理。
- 不要提交密钥、密码、`.env` 等敏感信息。
- 当前前端已移除 mock 层；不要恢复 `src/mock` 或 `src/api/mock.ts`。

## Project Skills
- `wechat-chat-md-organizer`：用于微信聊天记录 md 整理。将聊天文本中的 `[Photo]` 按图片目录顺序替换为图片 Markdown 链接，并保持其他聊天文本不变。
- 项目内技能路径：`/Users/jambin/codes/supply-and-sale/.codex/skills/wechat-chat-md-organizer/SKILL.md`
- 默认规则：图片目录与聊天 md 同名（去掉 `.md`）。


## GitHub Project 同步规则
- 本项目统一使用 GitHub Project：`eSupplyAndSale`
- Project 链接：`https://github.com/users/nalido/projects/1`
- 该 Project 为 `nalido` 账号级 Project，不归属单一仓库；用于统一跟进：
  - `e-supply-front`
  - `e-supply-back`
  - `supply-and-sale-ops`
- 后续任务跟进默认同步到这个 Project，不再另建新的任务看板。
- `docs/e-supply/01-todo/TODO.md` 是任务总表，新增任务或状态变化时，需同步更新 GitHub Project。
- 当前状态统一使用以下英文值：
  - `Todo`
  - `In Progress`
  - `Done`
  - `Canceled`
- 状态映射约定：
  - `OPEN` -> `Todo`
  - `DOING` -> `In Progress`
  - `DONE` -> `Done`
  - `作废` -> `Canceled`
- 如果任务已在 TODO 总表中登记，则 GitHub Project 卡片标题优先使用：`<ID> | <问题>`
- GitHub Project 卡片正文至少保留：`ID`、`状态`、`优先级`、`模块`、`问题`、`结论 / 下一步`、`关联文档`

## temu 技术文档
temu技术文档已经被备份到本地，在目录docs/external-backups中，后续如果需要你查询技术文档，就去这里查找。
