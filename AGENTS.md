# Repository Guidelines

## Project Structure & Module Organization
- Vite + React + TypeScript dashboard (衣协同) mirroring huaaosoft.com's layouts with Ant Design 5 styling.
- `src/main.tsx` wires locale + theming; `src/router.tsx` consumes `src/menu.config.tsx` to build navigation.
- Domains live under `src/views/`; share composables via `src/components/`, `src/layouts/`, `src/types/`, and mock clients in `src/api/`.
- Mock datasets stay in `src/mock/`; global assets/styles live in `src/assets/` and `src/styles/`; Vite-served static files remain in `public/`; builds output to `dist/`.

## Architecture & Data Flow
- **Menu-driven routing**: menu tree supports three levels; `flattenMenu()` auto-spawns placeholder routes until real screens replace them.
- **Mock-first APIs**: `src/api/mock.ts` returns `{ list: T[], total: number }` payloads with simulated latency so real services can slot in without signature changes.
- **Main layout**: `src/layouts/MainLayout.tsx` owns sidebar, breadcrumbs, and responsiveness—tweak here for global chrome.
- Preserve business copy and structure from https://yxt.huaaosoft.com/ while lifting UI logic into typed React components.

## Build, Test, and Development Commands
- `npm install` syncs dependencies after lockfile updates.
- `npm run dev` serves with hot reload on http://localhost:5173.
- `npm run build` runs `tsc -b` then `vite build` for production bundles.
- `npm run preview` hosts the latest build for acceptance checks.
- `npm run lint` enforces the shared React + TypeScript rule set.

## Coding Style & Naming Conventions
- Enforce strict TypeScript, prefer `const`, typed props, and explicit guard clauses.
- Two-space indentation, single quotes, PascalCase components, camelCase hooks/utilities.
- Co-locate view-specific assets with their view; update navigation strictly through `menu.config.tsx`.
- Treat ESLint (via `@eslint/js`, `typescript-eslint`, React hooks/refresh plugins) as canonical; resolve warnings before opening PRs.

## Testing Guidelines
- No automated tests yet—rely on lint plus manual QA in `npm run dev` or `npm run preview` sessions.
- Future specs should reside in `src/__tests__/` or as `*.test.tsx` beside components using matching names.
- Note new mock scenarios or data contracts in PR descriptions to guide reviewers.

## Commit & Pull Request Guidelines
- Use Conventional Commit prefixes (`feat:`, `fix:`, `chore:`) with imperative, scope-aware summaries.
- PRs must state intent, local validation (lint/build/dev), and link to tracking issues or tasks.
- Attach screenshots or GIFs for UI changes; call out new env vars or API interactions, even when mocked.
- Request review only after local checks pass and lingering TODOs are captured in issues instead of code comments.

## 代码质量要求
- 当用户要求阅读docs/prds下面的prd文档，实现相关功能的时候，注意要符合最佳实践和项目的现有设计，使用sub-agent调研现有代码的实现风格和可复用的组件或者api，mock数据注意分离和复用，合理设计前端需要调用的api。
- 时刻记得组件的复用，不要做重复的工作。
- 时刻记得风格统一，统计页面的各种组件风格要保持一致。 实现之前需要调研下已有类似组件的风格。
- 某个PRD的功能都实现完成后，将该文件名加个"[DONE]"的前缀作为已完成标记。 当用户没有指定PRD文件的时候，不重复实现被标记为完成的PRD。
- 完成一个PRD后，要提交这个PRD设计到的修改。注意不要修改.gitignore文件，不需要提交PRD的修改。

## 指令理解
- 当用户要求实现PRD时，从docs/prds目录下选择一个未完成的PRD文件，在完全理解PRD的设计思想的前提下，进行代码的实现。
- 所有的页面的对应菜单项都已经准备好了，只需要找到对应的菜单页面进行实现即可。