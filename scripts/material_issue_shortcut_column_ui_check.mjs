import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.ESUPPLY_FRONT_BASE_URL || 'http://127.0.0.1:5177';
const outputDir = path.resolve('../docs/e-supply/04-verification/material-issue-shortcut-column-20260909');
const storageState = path.resolve('logs/route-sweep-auth.json');

if (!fs.existsSync(storageState)) {
  throw new Error('缺少本地页面验收登录态 logs/route-sweep-auth.json');
}

fs.mkdirSync(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1520, height: 900 },
  storageState,
});
const page = await context.newPage();
const errors = [];

page.on('console', (message) => {
  if (message.type() === 'error') errors.push(`console:${message.text()}`);
});
page.on('pageerror', (error) => errors.push(`page:${error.message}`));
page.on('response', (response) => {
  if (response.status() >= 400) errors.push(`http:${response.status()}:${response.url()}`);
});

const fulfillJson = (route, body) => route.fulfill({
  status: 200,
  contentType: 'application/json',
  body: JSON.stringify(body),
});

await page.route('**/api/v1/auth/onboarding/status**', (route) => fulfillJson(route, {
  linked: true,
  tenantId: 1,
  userId: 1,
  tenantName: '页面验收企业',
  username: 'admin',
  billing: { status: 'ACTIVE', upgradeRequired: false },
}));
await page.route('**/api/v1/settings/company/overview**', (route) => fulfillJson(route, {
  id: '1',
  name: '页面验收企业',
  stats: {
    users: { value: 1, limit: 20 },
    storage: { value: 1, limit: 20 },
  },
  modules: [],
  tenants: [{ id: '1', name: '页面验收企业', current: true }],
  billing: { status: 'ACTIVE', upgradeRequired: false },
}));
await page.route('**/api/v1/settings/preferences**', (route) => fulfillJson(route, []));
await page.route('**/api/v1/settings/usage-analytics/events**', (route) => fulfillJson(route, { success: true }));
await page.route('**/api/v1/workshop/reports/downloads**', (route) => fulfillJson(route, {
  list: [],
  total: 0,
  page: 0,
  size: 20,
}));
await page.route('**/api/v1/inventory/material-issues/meta', (route) => fulfillJson(route, {
  tabs: [{ value: 'fabric', label: '面料' }, { value: 'accessory', label: '辅料/包材' }],
  statusOptions: [{ value: 'issued', label: '已出库' }],
}));
await page.route('**/api/v1/inventory/material-issues?**', (route) => fulfillJson(route, {
  list: [{
    id: 'shortcut-row-1',
    workOrderId: '9001',
    cuttingBedId: 'shortcut-bed-1',
    cuttingBedNumber: 'CHP0920-20床',
    poNumber: 'MI-QUICK-001',
    warehouseName: '面辅料一仓',
    materialName: '快捷入口验收面料',
    materialType: 'fabric',
    color: '黑色',
    width: '150cm',
    weight: '220g',
    unit: '米',
    issueQty: 1234,
    unitPrice: 10,
    amount: 12340,
    issueType: '生产领料',
    recipient: '验收用户',
    issueDate: '2026-09-09 16:00:00',
    status: 'issued',
    statusLabel: '已出库',
    remark: '快捷入口列顺序验收',
  }],
  total: 1,
  summary: { issueQtyTotal: 1234, amountTotal: 12340 },
}));
await page.route('**/api/v1/workshop/cutting/sheets/9001?**', (route) => fulfillJson(route, {
  workOrderId: 9001,
  orderCode: 'QUICK-ORDER-001',
  status: 'IN_PROGRESS',
}));
await page.route('**/api/v1/workshop/cutting/pending?**', (route) => fulfillJson(route, {
  summary: [],
  list: [],
  total: 0,
  page: 1,
  pageSize: 20,
}));

const result = {
  passed: false,
  route: '/material/issue',
  assertions: {},
  screenshots: [],
  errors,
};

try {
  await page.goto(`${baseUrl}/material/issue`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  const shortcutLink = page.getByRole('button', { name: '查看裁床单' });
  await shortcutLink.waitFor({ timeout: 30_000 });

  const headerTexts = (await page.locator('.ant-table-thead th').allTextContents())
    .map((text) => text.trim())
    .filter(Boolean);
  const tableBox = await page.locator('.ant-table-container').boundingBox();
  const shortcutBox = await shortcutLink.boundingBox();
  const summarySpanTotal = await page.locator('.ant-table-summary td').evaluateAll((cells) => (
    cells.reduce((total, cell) => total + Number(cell.getAttribute('colspan') || 1), 0)
  ));
  const headerColumnTotal = await page.locator('.ant-table-thead th').count();
  const summaryAlignment = await page.locator('.ant-table-container').evaluate((container) => {
    const headers = Array.from(container.querySelectorAll('.ant-table-thead th'));
    const summaryCells = Array.from(container.querySelectorAll('.ant-table-summary td'));
    const centerX = (element) => {
      const box = element?.getBoundingClientRect();
      return box ? box.left + box.width / 2 : Number.NaN;
    };
    const quantityHeader = headers.find((cell) => cell.textContent?.trim() === '领料数量');
    const amountHeader = headers.find((cell) => cell.textContent?.trim() === '金额');
    const quantitySummary = summaryCells.find((cell) => cell.textContent?.trim() === '1,234');
    const amountSummary = summaryCells.find((cell) => cell.textContent?.trim() === '12,340.00');
    return {
      quantity: Math.abs(centerX(quantityHeader) - centerX(quantitySummary)) < 1,
      amount: Math.abs(centerX(amountHeader) - centerX(amountSummary)) < 1,
    };
  });

  result.assertions.sequenceRemainsFirstDataColumn = headerTexts[0] === '序号';
  result.assertions.shortcutIsLastDataColumn = headerTexts.at(-1) === '裁床单 / 床次';
  result.assertions.shortcutIsFixedRight = await page.getByRole('columnheader', { name: '裁床单 / 床次' })
    .evaluate((header) => header.classList.contains('ant-table-cell-fix-right'));
  result.assertions.remarkIsNotFixed = await page.getByRole('columnheader', { name: '备注' })
    .evaluate((header) => !header.classList.contains('ant-table-cell-fix-right'));
  result.assertions.shortcutVisibleWithoutHorizontalScroll = Boolean(
    tableBox
      && shortcutBox
      && shortcutBox.x >= tableBox.x
      && shortcutBox.x + shortcutBox.width <= tableBox.x + tableBox.width,
  );
  result.assertions.bedNumberVisible = await page.getByText('床次：CHP0920-20床', { exact: true }).isVisible();
  result.assertions.summaryCoversAllColumns = summarySpanTotal === headerColumnTotal;
  result.assertions.summaryValuesAligned = summaryAlignment.quantity && summaryAlignment.amount;

  const initialScreenshotPath = path.join(outputDir, '01-cutting-shortcut-fixed-right.png');
  await page.screenshot({ path: initialScreenshotPath, fullPage: true });
  result.screenshots.push(initialScreenshotPath);

  const horizontalScroller = page.locator('.ant-table-content').first();
  await horizontalScroller.evaluate((element) => {
    element.scrollLeft = element.scrollWidth;
  });
  await page.waitForTimeout(100);
  const scrolledShortcutBox = await shortcutLink.boundingBox();
  result.assertions.shortcutStaysVisibleAfterHorizontalScroll = Boolean(
    tableBox
      && scrolledShortcutBox
      && scrolledShortcutBox.x >= tableBox.x
      && scrolledShortcutBox.x + scrolledShortcutBox.width <= tableBox.x + tableBox.width,
  );
  const scrolledScreenshotPath = path.join(outputDir, '02-cutting-shortcut-fixed-while-scrolled.png');
  await page.screenshot({ path: scrolledScreenshotPath, fullPage: true });
  result.screenshots.push(scrolledScreenshotPath);

  await shortcutLink.click();
  await page.waitForURL((url) => (
    url.pathname === '/piecework/cutting/pending'
      && url.searchParams.get('keyword') === 'QUICK-ORDER-001'
      && url.searchParams.get('workOrderId') === '9001'
      && url.searchParams.get('openDetail') === '1'
  ), { timeout: 10_000 });
  result.assertions.shortcutOpensLinkedCuttingSheet = true;

  const relevantErrors = errors.filter((item) => (
    !item.includes('Static function can not consume context')
    && !item.includes('`index` parameter of `rowKey` function is deprecated')
  ));
  result.errors = relevantErrors;
  result.passed = Object.values(result.assertions).every(Boolean) && relevantErrors.length === 0;
} catch (error) {
  result.error = String(error);
  result.url = page.url();
  result.bodyText = (await page.locator('body').innerText().catch(() => '')).slice(0, 1500);
  await page.screenshot({ path: path.join(outputDir, 'failed.png'), fullPage: true });
} finally {
  if (result.passed) fs.rmSync(path.join(outputDir, 'failed.png'), { force: true });
  fs.writeFileSync(path.join(outputDir, 'ui-result.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
  await browser.close();
}

if (!result.passed) process.exitCode = 1;
