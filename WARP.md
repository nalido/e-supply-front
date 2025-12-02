# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

This is a supply chain management dashboard frontend application ("易供云" - Clothing Collaboration) built with React + TypeScript + Vite + Ant Design. It's currently a mock implementation that clones a target site's menu structure and page skeleton, providing unified Mock APIs that can be smoothly transitioned to real backend services later.

## Common Development Commands

### Setup and Development
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linter
npm run lint
```

### Development Server
The development server runs on Vite's default port (typically `http://localhost:5173`). Hot module replacement is enabled for rapid development.

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

```
src/
├── api/           # Mock API layer (domain-separated services)
├── layouts/       # Layout components (MainLayout.tsx)
├── views/         # Page components (currently only Workplace.tsx)
├── styles/        # Global styles
├── assets/        # Static assets
├── menu.config.tsx # Menu hierarchy and navigation config
├── router.tsx      # React Router configuration
└── App.tsx        # Root component
```

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

### Component Generation Pattern

The router automatically generates placeholder components for all menu items:
- Uses `flattenMenu()` to extract all leaf menu items
- Creates placeholder components with Chinese labels
- Real components replace placeholders as features are implemented

### Mock API Design Principles

Each domain service in `src/api/mock.ts`:
- Uses async/await with artificial delays to simulate network calls
- Returns typed responses with consistent structure
- Supports pagination with `{ page, pageSize }` parameters
- Uses realistic sample data with Chinese business terms

## Transitioning to Real Backend

When backend services become available:
1. Replace implementations in `src/api/mock.ts` or create `src/api/real.ts`
2. Maintain the same function signatures and return types
3. Keep the `Promise<Paginated<T>>` pattern for list endpoints
4. Preserve the delay behavior during development if needed

## Key Files to Understand

- **`src/menu.config.tsx`**: Complete navigation structure - modify here to add/remove menu items
- **`src/api/mock.ts`**: All data sources - update here to change mock data or add new endpoints  
- **`src/layouts/MainLayout.tsx`**: Main application shell - customize layout, branding, or navigation behavior
- **`src/router.tsx`**: Route definitions and placeholder generation logic
- **`src/views/Workplace.tsx`**: Example of how to build pages with Ant Design components and mock APIs

## Technology Stack Notes

- **Vite**: Fast development server with HMR, minimal configuration needed
- **Ant Design 5.x**: UI component library with built-in theming
- **React Router 7.x**: Client-side routing with data loading capabilities  
- **TypeScript**: Strict typing enabled, focus on type safety for mock APIs
- **ESLint**: Configured with React Hooks and TypeScript rules
- **Less**: Supported for custom Ant Design theme customization

## 本地开发和原始网站信息

- 本地启动路径为：http://localhost:5173/， 我会在别的终端启动它，不需要你再启动。如果发现前端没有在启动，提醒我即可
