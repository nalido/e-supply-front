# GEMINI.md

## Project Overview

This is a supply chain management dashboard frontend application ("衣协同" - Clothing Collaboration) built with React, TypeScript, Vite, and Ant Design. It's a mock implementation that clones the menu structure and page skeleton of https://yxt.huaaosoft.com/, providing unified Mock APIs that can be smoothly transitioned to real backend services later.

### Key Technologies

*   **Frontend:** React, TypeScript
*   **Build Tool:** Vite
*   **UI Framework:** Ant Design 5.x
*   **Routing:** React Router 7.x
*   **Linting:** ESLint
*   **Styling:** Less

## Building and Running

### Prerequisites

*   Node.js and npm should be installed.

### Installation

To install the dependencies, run the following command:

```bash
npm install
```

### Development

To start the development server, run:

```bash
npm run dev
```

The development server runs on http://localhost:5173.

### Building for Production

To build the application for production, run:

```bash
npm run build
```

This will create a `dist` directory with the production-ready files.

### Linting

To check the code for any linting errors, run:

```bash
npm run lint
```

### Preview

To preview the production build, run:

```bash
npm run preview
```

## Architecture Overview

### Key Architectural Patterns

**Menu-Driven Architecture**: The entire application is driven by a hierarchical menu configuration system:
- `src/menu.config.tsx` defines the complete menu tree with nested structures
- Menu items automatically generate routes using React Router
- Each menu item maps to either a real component or placeholder
- Menu supports up to 3 levels of nesting (main → sub → report centers)

**Mock-First API Strategy**: All data flows through a centralized mock API layer:
- `src/api/mock.ts` provides domain-separated mock services
- Each service returns Promises with simulated network delays
- Standardized response format: `{ list: T[], total: number }` for paginated data
- Mock APIs are designed to be easily replaceable with real backend calls

**Layout System**: Single main layout with Ant Design components:
- `src/layouts/MainLayout.tsx` provides sidebar navigation, breadcrumbs, and content area
- Responsive design with collapsible sidebar
- Breadcrumb generation based on current route

### Directory Structure

*   `src/views`: Contains the main page components.
*   `src/components`: Contains reusable UI components.
*   `src/layouts`: Contains layout components like `MainLayout.tsx`.
*   `src/api`: Contains data fetching logic. Currently, it uses mock data.
*   `src/mock`: Contains mock data used for development.
*   `src/router.tsx`: Defines the application's routes.
*   `src/menu.config.tsx`: Defines the structure of the sidebar menu.
*   `src/styles`: Contains global and component-specific styles.
*   `src/assets`: Contains static assets.
*   `src/types`: Contains TypeScript type definitions.
*   `public`: Contains static assets served by Vite.
*   `dist`: Contains the production build output.

### Business Domain Structure

The application is organized around these business domains:
- **Dashboard/Workplace** (`/dashboard/workplace`): Overview statistics and pending items
- **Sample/Pattern** (`/sample/*`): Sample orders, tracking, templates, and costing reports
- **Orders** (`/orders/*`): Factory orders, outsourced production, and efficiency tracking
- **Material Management** (`/material/*`): Material inventory, purchase, and stock reports
- **Product Management** (`/product/*`): Finished goods inventory and warehousing
- **Workshop Piecework** (`/piecework/*`): Workshop management, cutting, payroll, quality control
- **Collaboration Center** (`/collab/*`): External orders (send-out/receive-in)
- **Settlement** (`/settlement/*`): Customer/supplier payments and financial reports
- **Basic Data** (`/basic/*`): Master data (styles, materials, partners, processes)
- **System Settings** (`/settings/*`): User management, company settings, audit logs

## Development Conventions

### Coding Style

*   Enforce strict TypeScript, prefer `const`, typed props, and explicit guard clauses.
*   Two-space indentation, single quotes, PascalCase components, camelCase hooks/utilities.
*   Co-locate view-specific assets with their view; update navigation strictly through `menu.config.tsx`.
*   Treat ESLint (via `@eslint/js`, `typescript-eslint`, React hooks/refresh plugins) as canonical; resolve warnings before opening PRs.

### Data Fetching

*   Data is currently fetched from mock files in the `src/mock` directory.
*   The data fetching logic is centralized in the `src/api` directory.
*   To switch to a real backend, the functions in `src/api/mock.ts` can be replaced with calls to a real API, while maintaining the same function signatures.

### Testing Guidelines
- No automated tests yet—rely on lint plus manual QA in `npm run dev` or `npm run preview` sessions.
- Future specs should reside in `src/__tests__/` or as `*.test.tsx` beside components using matching names.

### Commit & Pull Request Guidelines
- Use Conventional Commit prefixes (`feat:`, `fix:`, `chore:`) with imperative, scope-aware summaries.
- PRs must state intent, local validation (lint/build/dev), and link to tracking issues or tasks.
- Attach screenshots or GIFs for UI changes; call out new env vars or API interactions, even when mocked.