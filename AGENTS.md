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
