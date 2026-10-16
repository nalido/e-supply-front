import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.ESUPPLY_FRONT_BASE_URL || 'http://127.0.0.1:5188';
const outputDir = path.resolve(
  process.env.ESUPPLY_UI_OUTPUT_DIR
    || '../docs/e-supply/04-verification/cutting-task-sorting-20261016',
);

fs.mkdirSync(outputDir, { recursive: true });

const sortLabels = [
  '下单时间（新 → 旧）',
  '下单时间（旧 → 新）',
  '更新时间（新 → 旧）',
  '更新时间（旧 → 新）',
];

const task = {
  id: 'cutting-sort-ui-task',
  workOrderId: 91001,
  workOrderStatus: 'NOT_STARTED',
  styleCode: 'SORT-001',
  styleName: '裁床排序验收款',
  orderCode: 'SORT-20261016-001',
  orderDate: '2026-10-16',
  orderedQuantity: 120,
  cutQuantity: 0,
  pendingQuantity: 120,
  unit: '件',
  thumbnail: '',
  customer: '页面验收客户',
  colors: [{ name: '黑色', image: '' }],
};

const completedTask = {
  ...task,
  id: 'cutting-sort-ui-completed-task',
  workOrderId: 91002,
  workOrderStatus: 'COMPLETED',
  orderCode: 'SORT-20261016-002',
  cutQuantity: 120,
  pendingQuantity: 0,
};

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1520, height: 980 } });
const page = await context.newPage();
const errors = [];
const pendingUrls = [];
const completedUrls = [];

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
await page.route('**/api/v1/workshop/cutting/pending?**', (route) => {
  pendingUrls.push(route.request().url());
  return fulfillJson(route, {
    summary: [{ key: 'pending', label: '待裁订单', value: '1 单' }],
    list: [task],
    total: 1,
    page: 1,
    pageSize: 4,
  });
});
await page.route('**/api/v1/workshop/cutting/completed?**', (route) => {
  completedUrls.push(route.request().url());
  return fulfillJson(route, {
    summary: [{ key: 'completed', label: '已裁订单', value: '1 单' }],
    list: [completedTask],
    total: 1,
    page: 1,
    pageSize: 6,
  });
});

const result = {
  passed: false,
  routes: ['/piecework/cutting/pending', '/piecework/cutting/done'],
  assertions: {},
  requestUrls: { pending: pendingUrls, completed: completedUrls },
  screenshots: [],
  errors,
};

const waitForRequestSort = async (urls, expectedSort) => {
  const deadline = Date.now() + 10_000;
  while (!urls.some((url) => new URL(url).searchParams.get('sort') === expectedSort)) {
    if (Date.now() >= deadline) {
      throw new Error(`未捕获 sort=${expectedSort} 的请求：${JSON.stringify(urls)}`);
    }
    await page.waitForTimeout(100);
  }
};

const assertSortControl = async (testId, expectedLabel) => {
  const select = page.getByTestId(testId);
  await select.waitFor({ timeout: 30_000 });
  const currentLabel = (await select.locator('.ant-select-selection-item').textContent())?.trim();
  if (currentLabel !== expectedLabel) {
    throw new Error(`${testId} 默认值错误：${currentLabel}`);
  }
  await select.locator('.ant-select-selector').click();
  await page.getByText(sortLabels[3], { exact: true }).waitFor({ timeout: 10_000 });
  const optionLabels = await page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option-content').allTextContents();
  const normalizedLabels = optionLabels.map((label) => label.trim());
  if (JSON.stringify(normalizedLabels) !== JSON.stringify(sortLabels)) {
    throw new Error(`${testId} 选项错误：${JSON.stringify(normalizedLabels)}`);
  }
  await page.keyboard.press('Escape');
  return normalizedLabels;
};

try {
  await page.goto(`${baseUrl}/piecework/cutting/pending`, {
    waitUntil: 'domcontentloaded',
    timeout: 60_000,
  });
  await page.getByText(task.styleName).waitFor({ timeout: 30_000 });
  await waitForRequestSort(pendingUrls, 'placed-desc');
  result.assertions.pendingDefault = await assertSortControl(
    'cutting-pending-sort',
    sortLabels[0],
  );

  await page.getByTestId('cutting-pending-sort').locator('.ant-select-selector').click();
  await page.getByText(sortLabels[3], { exact: true }).click();
  await waitForRequestSort(pendingUrls, 'updated-asc');
  result.assertions.pendingUpdatedAsc = true;
  const pendingScreenshot = path.join(outputDir, 'pending-sort-desktop.png');
  await page.screenshot({ path: pendingScreenshot, fullPage: true });
  result.screenshots.push(pendingScreenshot);

  await page.goto(`${baseUrl}/piecework/cutting/done`, {
    waitUntil: 'domcontentloaded',
    timeout: 60_000,
  });
  await page.getByText(completedTask.styleName).waitFor({ timeout: 30_000 });
  await waitForRequestSort(completedUrls, 'placed-desc');
  result.assertions.completedDefault = await assertSortControl(
    'cutting-completed-sort',
    sortLabels[0],
  );

  await page.getByTestId('cutting-completed-sort').locator('.ant-select-selector').click();
  await page.getByText(sortLabels[1], { exact: true }).click();
  await waitForRequestSort(completedUrls, 'placed-asc');
  result.assertions.completedPlacedAsc = true;
  const completedScreenshot = path.join(outputDir, 'completed-sort-desktop.png');
  await page.screenshot({ path: completedScreenshot, fullPage: true });
  result.screenshots.push(completedScreenshot);

  await page.setViewportSize({ width: 1280, height: 844 });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByTestId('cutting-completed-sort').waitFor({ timeout: 30_000 });
  const compactBox = await page.getByTestId('cutting-completed-sort').boundingBox();
  if (!compactBox || compactBox.x < 0 || compactBox.x + compactBox.width > 1280) {
    throw new Error(`紧凑桌面宽度下排序控件溢出：${JSON.stringify(compactBox)}`);
  }
  result.assertions.completedCompactDesktopVisible = true;
  const compactScreenshot = path.join(outputDir, 'completed-sort-compact.png');
  await page.screenshot({ path: compactScreenshot, fullPage: true });
  result.screenshots.push(compactScreenshot);

  if (errors.length > 0) {
    throw new Error(`页面错误：${errors.join(' | ')}`);
  }

  result.passed = true;
} catch (error) {
  result.failure = error instanceof Error ? error.stack ?? error.message : String(error);
  const failureScreenshot = path.join(outputDir, 'failure.png');
  await page.screenshot({ path: failureScreenshot, fullPage: true }).catch(() => {});
  result.screenshots.push(failureScreenshot);
  process.exitCode = 1;
} finally {
  fs.writeFileSync(path.join(outputDir, 'result.json'), `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify(result, null, 2));
  await browser.close();
}
