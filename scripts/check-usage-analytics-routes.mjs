import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

const requiredTrackablePaths = [
  '/',
  '/dashboard',
  '/dashboard/workplace',
  '/sample',
  '/sample/list',
  '/sample/detail',
  '/sample/follow-template',
  '/sample/type',
  '/sample/report/costing',
  '/sample/report/order-compare',
  '/orders/factory',
  '/piecework/orders',
  '/orders/efficiency',
  '/orders/report/profit',
  '/orders/report/cost',
  '/orders/report/material-need',
  '/orders/report/cut-outsource',
  '/orders/outsource',
  '/orders/compare',
  '/product/inbound-other',
  '/product/stock',
  '/product/outbound',
  '/product/report/overview',
  '/product/inbound/pending',
  '/product/inbound/received',
  '/material/stock',
  '/material/sales-stocking-suggestion',
  '/material/purchase-prep',
  '/material/report/overview',
  '/material/report/purchase-inbound-detail',
  '/material/issue',
  '/basic/process-type',
  '/basic/styles',
  '/basic/material',
  '/basic/partners',
  '/basic/operation-template',
  '/basic/warehouse',
  '/foundation/product/detail',
  '/settings/profile',
  '/settings/company',
  '/settings/org',
  '/settings/roles',
  '/settings/preferences',
  '/settings/audit',
  '/settings/usage-analytics',
  '/ai/agent',
  '/piecework/cutting/pending',
  '/piecework/cutting/done',
  '/piecework/cutting/list',
  '/piecework/cutting/create',
  '/piecework/cutting/report',
  '/piecework/progress',
  '/piecework/payroll',
  '/piecework/report',
  '/downloads',
  '/piecework/quality',
  '/piecework/outsource',
  '/piecework',
  '/collab/send-out',
  '/collab/receive-in',
  '/settlement/receivable',
  '/settlement/payable-factory',
  '/settlement/payable-supplier',
  '/settlement/cashier',
  '/settlement/report/customer-detail',
  '/settlement/report/factory-detail',
  '/settlement/report/supplier-detail',
  '/settlement/report/statement-detail',
  '/pattern',
  '/orders',
  '/material',
  '/product',
  '/collab',
  '/settlement',
  '/basic',
  '/ai',
  '/settings',
  '/sale',
  '/sale/workbench',
  '/sale/dashboard',
  '/sale/products/sync',
  '/sale/products/manage',
  '/sale/ozon/listing',
  '/sale/ozon/listing-details',
  '/sale/ozon/inventory',
  '/sale/ozon/promotions',
  '/sale/products/publish',
  '/sale/products/bindings',
  '/sale/orders',
  '/sale/orders/overview',
  '/sale/orders/issues',
  '/sale/fulfillment-workbench/ozon-fbs',
  '/sale/sales-data',
  '/sale/insights/risk',
  '/sale/shops',
  '/sale/governance/sync',
  '/sale/tutorials',
  '/sale/channels/accounts',
  '/sale/channels/mappings',
  '/sale/channels/credentials',
  '/sale/sync-logs',
  '/sale/fulfillments',
  '/sale/fulfillment-workbench/temu-full-managed',
];

const readSource = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const normalizePath = (value) => (value.startsWith('/') ? value : `/${value}`);

const parseMenuPaths = () => {
  const source = readSource('src/menu.config.tsx');
  return [...source.matchAll(/key:\s*'([^']+)'/g)].map((match) => match[1]);
};

const parseExtraRoutePaths = () => {
  const source = readSource('src/components/analytics/usageAnalyticsLabels.tsx');
  const paths = [...source.matchAll(/path:\s*'([^']+)'/g)].map((match) => match[1]);
  const aliases = [...source.matchAll(/aliases:\s*\[([\s\S]*?)\]/g)].flatMap((match) =>
    [...match[1].matchAll(/'([^']+)'/g)].map((aliasMatch) => aliasMatch[1]),
  );
  return [...paths, ...aliases];
};

const trackedPaths = new Set([...parseMenuPaths(), ...parseExtraRoutePaths()].map(normalizePath));
const missingPaths = requiredTrackablePaths.filter((routePath) => !trackedPaths.has(routePath));

if (missingPaths.length) {
  console.error('Usage analytics route coverage failed.');
  console.error(`Covered: ${requiredTrackablePaths.length - missingPaths.length}/${requiredTrackablePaths.length}`);
  missingPaths.forEach((routePath) => console.error(`- ${routePath}`));
  process.exit(1);
}

console.log(`Usage analytics route coverage: ${requiredTrackablePaths.length}/${requiredTrackablePaths.length}`);
