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
- 后端优先复用现有领域对象与服务，避免冗余设计。
- 后端 list 接口：除非明确说明，默认按更新时间倒序。
- 后端接口约束：仅使用 `GET`、`POST`；更新与删除使用 `../update`、`../delete` 风格的 `POST`。
- 不要使用权限定类名，不要定义内部类。

## Testing Rules
- 集成测试统一放在 `e-supply-back/scripts`，使用 Python 执行。
- 不要新增 Java 集成测试用例。
- 测试账号与 JWT 生成参考：`docs/测试账号信息.md` 与 `scripts/account_api_tests.py`。

## Process Rules
- 严格遵循：调研 -> 计划 -> 开发 -> 测试。
- 先调研现有实现和数据结构，再改代码。
- 开发过程与结论要记录到 `docs/`（包含调研、计划、进度、验证结果）。
- 完成开发并自测通过后，不要自动提交代码。
- 任务执行完成且自测通过后，保持服务运行，不要主动关闭。

## Repo & Security Notes
- 前后端是两个独立 Git 仓库，提交必须分别处理。
- 不要提交密钥、密码、`.env` 等敏感信息。
- 当前前端已移除 mock 层；不要恢复 `src/mock` 或 `src/api/mock.ts`。
