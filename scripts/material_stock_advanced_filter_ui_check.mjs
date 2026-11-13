#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const appRoot = process.cwd();
const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:5174';
const outputDir = process.env.OUT_DIR || path.resolve(
  appRoot,
  '../docs/e-supply/04-verification/material-stock-advanced-filter-20261113',
);
const storageStateCandidates = [
  path.resolve(appRoot, 'logs/route-sweep-auth-dev.json'),
  path.resolve(appRoot, 'logs/route-sweep-auth.json'),
];
const storageState = storageStateCandidates.find((candidate) => fs.existsSync(candidate));

const rows = [
  {
    id: '501',
    materialId: '101',
    materialMinimumSpecificationId: '1001',
    materialMinimumSpecificationLabel: '午夜蓝 · A-13',
    materialMinimumSpecificationColor: '午夜蓝',
    legacySpecification: false,
    imageUrl: null,
    materialCode: 'MAT-FILTER-001',
    materialName: '高级筛选测试织带',
    color: '午夜蓝',
    colorStocks: [],
    specification: 'A-13',
    unit: '卷',
    warehouseId: '71',
    warehouseName: '成品辅料仓',
    stockQty: 11,
    availableQty: 11,
    inTransitQty: 0,
    remark: '重点库存',
  },
  {
    id: '502',
    materialId: '101',
    materialMinimumSpecificationId: '1002',
    materialMinimumSpecificationLabel: '雾灰 · B-27',
    materialMinimumSpecificationColor: '雾灰',
    legacySpecification: false,
    imageUrl: null,
    materialCode: 'MAT-FILTER-001',
    materialName: '高级筛选测试织带',
    color: '雾灰',
    colorStocks: [],
    specification: 'B-27',
    unit: '卷',
    warehouseId: '71',
    warehouseName: '成品辅料仓',
    stockQty: 17,
    availableQty: 15,
    inTransitQty: 2,
    remark: '常规库存',
  },
];

const result = {
  ok: false,
  baseUrl,
  storageState: Boolean(storageState),
  checks: [],
  listRequests: [],
  exportRequests: [],
  screenshots: [],
  consoleErrors: [],
  failedRequests: [],
  failedApiResponses: [],
};

const ensure = (condition, name, detail = undefined) => {
  result.checks.push({ name, ok: Boolean(condition), detail });
  if (!condition) {
    throw new Error(`${name}${detail ? `: ${JSON.stringify(detail)}` : ''}`);
  }
};

const fulfillJson = (route, body, status = 200) => route.fulfill({
  status,
  contentType: 'application/json',
  body: JSON.stringify(body),
});

const filteredRows = (url) => rows.filter((row) => {
  const includes = (value, keyword) => !keyword || String(value || '').toLowerCase().includes(keyword.toLowerCase());
  const numberInRange = (value, minimum, maximum) => (
    (!minimum || Number(value) >= Number(minimum)) && (!maximum || Number(value) <= Number(maximum))
  );
  const keyword = url.searchParams.get('keyword');
  const keywordMatched = !keyword || [
    row.materialCode,
    row.materialName,
    row.color,
    row.specification,
    row.unit,
    row.warehouseName,
    row.remark,
  ].some((value) => includes(value, keyword));
  return keywordMatched
    && includes(row.materialCode, url.searchParams.get('materialCode'))
    && includes(row.materialName, url.searchParams.get('materialName'))
    && includes(row.color, url.searchParams.get('color'))
    && includes(row.specification, url.searchParams.get('specification'))
    && includes(row.unit, url.searchParams.get('unit'))
    && (!url.searchParams.get('warehouseId') || row.warehouseId === url.searchParams.get('warehouseId'))
    && includes(row.remark, url.searchParams.get('remark'))
    && numberInRange(row.stockQty, url.searchParams.get('stockQtyMin'), url.searchParams.get('stockQtyMax'))
    && numberInRange(row.availableQty, url.searchParams.get('availableQtyMin'), url.searchParams.get('availableQtyMax'))
    && numberInRange(row.inTransitQty, url.searchParams.get('inTransitQtyMin'), url.searchParams.get('inTransitQtyMax'));
});

fs.mkdirSync(outputDir, { recursive: true });
for (const name of ['01-desktop-filter-panel.png', '02-desktop-filtered-result.png', '03-mobile-filter-drawer.png', 'result.json', '99-failure.png']) {
  fs.rmSync(path.join(outputDir, name), { force: true });
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  ...(storageState ? { storageState } : {}),
});
const page = await context.newPage();

page.on('pageerror', (error) => result.consoleErrors.push(`pageerror: ${error.message}`));
page.on('console', (message) => {
  if (message.type() === 'error') result.consoleErrors.push(`console: ${message.text()}`);
});
page.on('requestfailed', (request) => {
  result.failedRequests.push(`${request.method()} ${request.url()} ${request.failure()?.errorText || ''}`);
});
page.on('response', (response) => {
  if (response.url().includes('/api/') && response.status() >= 400) {
    result.failedApiResponses.push(`${response.status()} ${response.url()}`);
  }
});

await page.route('**/api/**', async (route) => {
  const request = route.request();
  const url = new URL(request.url());
  if (!url.pathname.startsWith('/api/')) return route.continue();
  if (url.pathname === '/api/v1/auth/onboarding/status') {
    return fulfillJson(route, {
      linked: true,
      tenantId: 1,
      userId: 20,
      tenantName: '本地验收企业',
      username: 'admin',
      billing: { status: 'ACTIVE', upgradeRequired: false },
    });
  }
  if (url.pathname === '/api/v1/settings/company/overview') {
    return fulfillJson(route, {
      id: '1',
      name: '本地验收企业',
      stats: { users: { value: 1, limit: 20 }, storage: { value: 1, limit: 20 } },
      modules: [],
      tenants: [{ id: '1', name: '本地验收企业', current: true }],
      billing: { status: 'ACTIVE', upgradeRequired: false },
    });
  }
  if (url.pathname === '/api/v1/inventory/materials/meta') {
    return fulfillJson(route, {
      materialTabs: [
        { value: 'fabric', label: '面料' },
        { value: 'accessory', label: '辅料/包材' },
      ],
      warehouses: [
        { id: '71', name: '成品辅料仓' },
        { id: '72', name: '备用仓' },
      ],
    });
  }
  if (url.pathname === '/api/v1/inventory/materials/summary') {
    return fulfillJson(route, {
      stockQtyTotal: 28,
      availableQtyTotal: 26,
      inTransitQtyTotal: 2,
      stockAmountTotal: 388,
    });
  }
  if (url.pathname === '/api/v1/inventory/materials' && request.method() === 'GET') {
    const query = Object.fromEntries(url.searchParams.entries());
    result.listRequests.push(query);
    const list = filteredRows(url);
    return fulfillJson(route, { list, total: list.length });
  }
  if (url.pathname === '/api/v1/inventory/materials/export' && request.method() === 'POST') {
    result.exportRequests.push(request.postDataJSON());
    return fulfillJson(route, { fileUrl: '/api/files/material-stock-filter.xlsx', exported: 1 });
  }
  if (url.pathname === '/api/v1/settings/preferences') return fulfillJson(route, []);
  if (url.pathname === '/api/v1/settings/usage-analytics/events') {
    return route.fulfill({ status: 204, body: '' });
  }
  return fulfillJson(route, { items: [], list: [], total: 0, page: 0, size: 20 });
});

try {
  await page.goto(`${baseUrl}/material/stock`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.getByRole('heading', { name: '物料库存' }).waitFor({ state: 'visible', timeout: 30_000 });
  await page.getByText('共 2 条', { exact: true }).waitFor({ state: 'visible', timeout: 20_000 });
  ensure(result.listRequests.length >= 1, '页面通过后端接口加载库存列表');

  await page.getByRole('button', { name: '高级筛选' }).click();
  await page.locator('.material-stock-filter-popover').waitFor({ state: 'visible' });
  ensure(await page.locator('.material-stock-filter-popover').isVisible(), '桌面端使用高级筛选浮层');
  const panelScreenshot = path.join(outputDir, '01-desktop-filter-panel.png');
  await page.locator('.material-stock-filter-popover').screenshot({ path: panelScreenshot });
  result.screenshots.push(panelScreenshot);

  await page.locator('#materialCode').fill('MAT-FILTER');
  await page.locator('#materialName').fill('高级筛选');
  await page.locator('#color').fill('午夜蓝');
  await page.locator('#specification').fill('A-13');
  await page.locator('#unit').fill('卷');
  await page.locator('#warehouseId').click();
  await page.locator('.ant-select-dropdown:visible .ant-select-item-option', { hasText: '成品辅料仓' }).click();
  await page.waitForTimeout(300);
  ensure(await page.locator('.material-stock-advanced-filter:visible').isVisible(), '选择仓库后筛选面板保持打开');
  await page.locator('#stockQtyMin').fill('11');
  await page.locator('#stockQtyMax').fill('11');
  await page.waitForTimeout(100);
  ensure(await page.locator('.material-stock-advanced-filter:visible').isVisible(), '填写库存数量后筛选面板保持打开');
  await page.locator('#availableQtyMin').fill('11');
  await page.locator('#availableQtyMax').fill('11');
  await page.waitForTimeout(100);
  ensure(await page.locator('.material-stock-advanced-filter:visible').isVisible(), '填写可用数量后筛选面板保持打开');
  await page.locator('#inTransitQtyMin').fill('0');
  await page.locator('#inTransitQtyMax').fill('0');
  await page.waitForTimeout(100);
  ensure(await page.locator('.material-stock-advanced-filter:visible').isVisible(), '填写采购在途后筛选面板保持打开');
  await page.locator('#remark').fill('重点');
  await page.waitForTimeout(100);
  ensure(await page.locator('.material-stock-advanced-filter:visible').isVisible(), '填写全部条件后筛选面板保持打开');
  await page.locator('.material-stock-advanced-filter:visible .material-stock-filter-actions .ant-btn-primary').click();

  await page.locator('.material-stock-filter-popover').waitFor({ state: 'hidden' });
  ensure(!await page.locator('.material-stock-filter-popover').isVisible(), '应用筛选后关闭高级筛选浮层');
  await page.getByText('共 1 条', { exact: true }).waitFor({ state: 'visible' });
  const appliedRequest = result.listRequests.at(-1);
  const expectedQuery = {
    materialCode: 'MAT-FILTER',
    materialName: '高级筛选',
    color: '午夜蓝',
    specification: 'A-13',
    unit: '卷',
    warehouseId: '71',
    stockQtyMin: '11',
    stockQtyMax: '11',
    availableQtyMin: '11',
    availableQtyMax: '11',
    inTransitQtyMin: '0',
    inTransitQtyMax: '0',
    remark: '重点',
  };
  ensure(
    Object.entries(expectedQuery).every(([key, value]) => appliedRequest?.[key] === value),
    '全部高级条件传给后端组合查询',
    appliedRequest,
  );
  ensure(await page.getByLabel('已应用筛选条件').isVisible(), '已应用筛选条件以标签展示');
  ensure(await page.getByText('颜色：午夜蓝', { exact: true }).isVisible(), '颜色筛选标签可见');
  ensure(await page.getByText('规格：A-13', { exact: true }).isVisible(), '规格筛选标签可见');
  const resultScreenshot = path.join(outputDir, '02-desktop-filtered-result.png');
  await page.screenshot({ path: resultScreenshot, fullPage: false });
  result.screenshots.push(resultScreenshot);

  await page.getByPlaceholder('搜索编码 / 名称 / 颜色 / 规格').fill('午夜蓝');
  await page.locator('.oc-filter-bar__right button.ant-btn-primary').click();
  await page.waitForTimeout(100);
  ensure(result.listRequests.at(-1)?.keyword === '午夜蓝', '快捷搜索通过 keyword 交给后端');

  await page.getByRole('button', { name: '导出 Excel' }).click();
  await page.waitForTimeout(100);
  const exportRequest = result.exportRequests.at(-1);
  ensure(exportRequest?.color === '午夜蓝' && exportRequest?.specification === 'A-13', '导出复用颜色和规格筛选', exportRequest);
  ensure(exportRequest?.warehouseId === 71 && exportRequest?.warehouseName === '成品辅料仓', '导出记录仓库业务名称', exportRequest);
  ensure(exportRequest?.keyword === '午夜蓝', '导出复用快捷搜索', exportRequest);

  await page.locator('.oc-filter-bar__right button.ant-btn-default').click();
  await page.waitForTimeout(100);
  const resetRequest = result.listRequests.at(-1);
  ensure(!resetRequest?.keyword && !resetRequest?.color && !resetRequest?.specification, '页面重置清空全部筛选', resetRequest);
  ensure(await page.getByText('共 2 条', { exact: true }).isVisible(), '重置后恢复完整列表');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(150);
  await page.getByRole('button', { name: '高级筛选' }).click();
  const drawer = page.locator('.ant-drawer-content-wrapper');
  await drawer.waitFor({ state: 'visible' });
  ensure(await drawer.isVisible(), '窄屏使用底部筛选抽屉');
  const mobileScreenshot = path.join(outputDir, '03-mobile-filter-drawer.png');
  await drawer.screenshot({ path: mobileScreenshot });
  result.screenshots.push(mobileScreenshot);

  ensure(result.consoleErrors.length === 0, '页面无脚本或控制台错误', result.consoleErrors);
  ensure(result.failedRequests.length === 0, '页面无失败请求', result.failedRequests);
  ensure(result.failedApiResponses.length === 0, '页面无失败接口响应', result.failedApiResponses);
  result.ok = true;
} catch (error) {
  result.error = error instanceof Error ? error.stack : String(error);
  await page.screenshot({ path: path.join(outputDir, '99-failure.png'), fullPage: true }).catch(() => {});
} finally {
  fs.writeFileSync(path.join(outputDir, 'result.json'), `${JSON.stringify(result, null, 2)}\n`);
  await browser.close();
}

if (!result.ok) {
  console.error(result.error);
  process.exit(1);
}

console.log(`Material stock advanced filter UI checks passed: ${result.checks.length}`);
