# e-supply-front

前端应用，基于 React + TypeScript + Vite + Ant Design，当前默认对接真实后端接口，不再使用 mock 层。

## 开发命令

```bash
npm install
npm run dev
npm run lint
npm run build
npm run route:sweep
```

## 当前架构
- `src/api/`：按业务域拆分的真实接口封装，统一复用 `src/api/http.ts`
- `src/api/http.ts`：axios 客户端，请求头注入认证 token、租户信息，并统一处理错误提示
- `src/views/`：页面级视图
- `src/components/`：可复用组件
- `src/layouts/`：登录保护和主布局
- `src/providers/` / `src/stores/`：租户上下文与本地状态管理
- `src/types/`：前端类型定义
- `src/router.tsx` / `src/menu.config.tsx`：路由与菜单配置

## 接口与环境变量
- 默认 API 基地址来自 `VITE_API_BASE_URL`
- Clerk 登录依赖 `VITE_CLERK_PUBLISHABLE_KEY`
- 请求默认通过 `Authorization` 和 `X-Tenant-Id` 传递鉴权与租户信息

## 开发说明
- 新页面优先复用已有 API 模块、类型定义和通用组件
- 后端接口约定以 `GET` / `POST` 为主，更新与删除遵循 `../update`、`../delete` 风格
- 不要重新引入前端 mock 层

## 验证建议
- 提交前至少执行 `npm run lint`
- 若修改了路由或菜单，额外执行 `npm run route:sweep`
- 若修改了构建相关内容，再执行 `npm run build`
