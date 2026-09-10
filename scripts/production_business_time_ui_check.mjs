import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.ESUPPLY_FRONT_BASE_URL || 'http://127.0.0.1:5184';
const activeOrderNo = process.env.ESUPPLY_TIME_ACTIVE_ORDER_NO;
const unstartedOrderNo = process.env.ESUPPLY_TIME_UNSTARTED_ORDER_NO;
const backendEnvPath = path.resolve('../e-supply-back/src/main/resources/.env');
const outputDir = path.resolve('../docs/e-supply/04-verification/production-business-time-20260910');
const storageStateCandidates = [
  path.resolve('logs/route-sweep-auth-dev.json'),
  path.resolve('logs/route-sweep-auth.json'),
];
const storageState = storageStateCandidates.find((candidate) => fs.existsSync(candidate));

if (!activeOrderNo || !unstartedOrderNo) {
  throw new Error('请提供 ESUPPLY_TIME_ACTIVE_ORDER_NO 和 ESUPPLY_TIME_UNSTARTED_ORDER_NO');
}
fs.mkdirSync(outputDir, { recursive: true });

const localEnv = {};
for (const line of fs.readFileSync(backendEnvPath, 'utf8').split(/\r?\n/)) {
  const normalized = line.trim();
  if (!normalized || normalized.startsWith('#') || !normalized.includes('=')) continue;
  const separator = normalized.indexOf('=');
  localEnv[normalized.slice(0, separator)] = normalized.slice(separator + 1).replace(/^["']|["']$/g, '');
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1520, height: 1050 },
  storageState,
});
const page = await context.newPage();
const browserErrors = [];
const apiErrors = [];

page.on('console', (message) => {
  if (message.type() === 'error') browserErrors.push(message.text());
});
page.on('pageerror', (error) => browserErrors.push(error.message));
page.on('response', (response) => {
  if (response.url().includes('/api/') && response.status() >= 400) {
    apiErrors.push(`${response.status()}:${response.url()}`);
  }
});

const ensureSignedIn = async () => {
  await page.goto(`${baseUrl}/piecework/orders`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForTimeout(1_000);
  const loginButton = page.getByRole('button', { name: '登录系统' });
  if (!page.url().includes('/welcome') && await loginButton.count() === 0) return;
  if (!localEnv.ESUPPLY_ADMIN_EMAIL || !localEnv.ESUPPLY_ADMIN_PASSWORD) {
    throw new Error('缺少本地页面验收账号配置');
  }
  await loginButton.click();
  const identifier = page.locator('input[name="identifier"], input[type="email"], input[name="username"]').first();
  await identifier.waitFor({ timeout: 30_000 });
  await identifier.fill(localEnv.ESUPPLY_ADMIN_EMAIL);
  await page.getByRole('button', { name: /继续|Continue|Sign in|下一步/i }).first().click();
  const passwordInput = page.locator('input[type="password"]').first();
  await passwordInput.waitFor({ timeout: 30_000 });
  await passwordInput.fill(localEnv.ESUPPLY_ADMIN_PASSWORD);
  await page.getByRole('button', { name: /继续|Continue|Sign in|登录/i }).first().click();
  await page.waitForURL((url) => !/sign-in|accounts\.dev|clerk/.test(url.toString()), { timeout: 60_000 });
  await page.waitForTimeout(1_000);
};

const dateInput = (testId) => page.locator(`[data-testid="${testId}"] input, input[data-testid="${testId}"]`).first();

const fillDateTime = async (input, value) => {
  await input.click();
  await input.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A');
  await input.fill(value);
  await input.press('Enter');
};

const assertCurrentDefault = async (input, label) => {
  const value = await input.inputValue();
  const timestamp = new Date(value.replace(' ', 'T')).getTime();
  if (!value || Number.isNaN(timestamp) || Math.abs(Date.now() - timestamp) > 5 * 60 * 1000) {
    throw new Error(`${label}未默认当前时间：${value || '空'}`);
  }
  return value;
};

const searchFactoryOrder = async (orderNo) => {
  const search = page.locator('[data-testid="factory-orders-search-input"]');
  await search.fill(orderNo);
  await search.press('Enter');
  const card = page.locator('.factory-order-card-shell').filter({ hasText: orderNo }).first();
  await card.waitFor({ state: 'visible', timeout: 30_000 });
  return card;
};

const result = {
  passed: false,
  baseUrl,
  activeOrderNo,
  unstartedOrderNo,
  assertions: {},
  screenshots: [],
  browserErrors,
  apiErrors,
};

try {
  await ensureSignedIn();
  await page.evaluate(() => localStorage.setItem('factory-orders-view-mode', 'card'));
  await page.goto(`${baseUrl}/piecework/orders`, { waitUntil: 'networkidle', timeout: 60_000 });

  await page.getByRole('button', { name: '新建工厂订单' }).click();
  const orderTimeInput = dateInput('factory-order-placed-at');
  await orderTimeInput.waitFor({ state: 'visible', timeout: 30_000 });
  result.assertions.factoryOrderDefault = await assertCurrentDefault(orderTimeInput, '下单时间');
  await fillDateTime(orderTimeInput, '2026-08-01 07:06:05');
  if (await orderTimeInput.inputValue() !== '2026-08-01 07:06:05') {
    throw new Error('下单时间无法自定义');
  }
  const createOrderModal = page.locator('.ant-modal:visible').filter({ hasText: '新建工厂订单' }).last();
  const orderScreenshot = path.join(outputDir, 'factory-order-placed-at.png');
  await createOrderModal.screenshot({ path: orderScreenshot });
  result.screenshots.push(path.basename(orderScreenshot));
  await createOrderModal.locator('.ant-modal-close').click();

  await page.goto(`${baseUrl}/piecework/cutting/pending?keyword=${encodeURIComponent(unstartedOrderNo)}`, {
    waitUntil: 'networkidle',
    timeout: 60_000,
  });
  await page.locator(`[data-testid="cutting-task-record-bed-${unstartedOrderNo}"]`).click();
  const cuttingCreateInput = dateInput('cutting-started-at');
  await cuttingCreateInput.waitFor({ state: 'visible', timeout: 30_000 });
  result.assertions.cuttingDefault = await assertCurrentDefault(cuttingCreateInput, '裁剪开始时间');
  await fillDateTime(cuttingCreateInput, '2026-08-02 06:05:04');
  if (await cuttingCreateInput.inputValue() !== '2026-08-02 06:05:04') {
    throw new Error('首床裁剪开始时间无法自定义');
  }
  const cuttingCreateScreenshot = path.join(outputDir, 'cutting-start-default-and-custom.png');
  await page.locator('.ant-modal:visible').last().screenshot({ path: cuttingCreateScreenshot });
  result.screenshots.push(path.basename(cuttingCreateScreenshot));
  await page.locator('.ant-modal:visible').last().locator('.ant-modal-close').click();

  await page.goto(`${baseUrl}/piecework/cutting/pending?keyword=${encodeURIComponent(activeOrderNo)}`, {
    waitUntil: 'networkidle',
    timeout: 60_000,
  });
  await page.locator(`[data-testid="cutting-task-detail-${activeOrderNo}"]`).click();
  const cuttingDetailModal = page.locator('.ant-modal:visible').last();
  await cuttingDetailModal.getByText('裁剪开始时间', { exact: true }).waitFor({ timeout: 30_000 });
  await cuttingDetailModal.getByRole('button', { name: '修改', exact: true }).click();
  const cuttingEditInput = dateInput('cutting-start-time-edit');
  await cuttingEditInput.waitFor({ state: 'visible' });
  await fillDateTime(cuttingEditInput, '2026-08-02 07:45:00');
  await page.locator('[data-testid="cutting-start-time-save"]:visible').click();
  await page.getByText('裁剪开始时间已修改', { exact: true }).waitFor({ timeout: 30_000 });
  await cuttingDetailModal.getByText('2026-08-02 07:45:00', { exact: true }).waitFor({ timeout: 30_000 });
  result.assertions.cuttingUpdated = '2026-08-02 07:45:00';
  const cuttingEditScreenshot = path.join(outputDir, 'cutting-start-time-edited.png');
  await cuttingDetailModal.screenshot({ path: cuttingEditScreenshot });
  result.screenshots.push(path.basename(cuttingEditScreenshot));
  await cuttingDetailModal.locator('.ant-modal-close').click();

  await page.goto(`${baseUrl}/piecework/orders`, { waitUntil: 'networkidle', timeout: 60_000 });
  const activeCard = await searchFactoryOrder(activeOrderNo);
  await activeCard.getByText('车缝', { exact: true }).click();
  const progressModal = page.locator('.ant-modal:visible').last();
  await progressModal.getByText('领取记录', { exact: true }).click();
  await progressModal.getByRole('button', { name: '修改时间', exact: true }).first().waitFor({ timeout: 30_000 });

  await progressModal.getByRole('button', { name: '新建领取', exact: true }).click();
  const sewingCreateInput = dateInput('factory-allocation-completed-at');
  await sewingCreateInput.waitFor({ state: 'visible' });
  result.assertions.sewingDefault = await assertCurrentDefault(sewingCreateInput, '车缝领料时间');
  await fillDateTime(sewingCreateInput, '2026-08-03 07:30:00');
  if (await sewingCreateInput.inputValue() !== '2026-08-03 07:30:00') {
    throw new Error('新建车缝领取时间无法自定义');
  }
  const sewingCreateScreenshot = path.join(outputDir, 'sewing-claim-default-and-custom.png');
  await page.locator('.ant-modal:visible').last().screenshot({ path: sewingCreateScreenshot });
  result.screenshots.push(path.basename(sewingCreateScreenshot));
  await page.locator('.ant-modal:visible').last().locator('.ant-modal-close').click();

  await progressModal.getByRole('button', { name: '修改时间', exact: true }).first().click();
  const sewingEditInput = dateInput('sewing-claim-time-edit');
  await sewingEditInput.waitFor({ state: 'visible' });
  await fillDateTime(sewingEditInput, '2026-08-03 08:30:00');
  const sewingEditModal = page.locator('.ant-modal:visible').last();
  await sewingEditModal.locator('.ant-modal-footer .ant-btn-primary').click();
  await page.getByText('车缝领料时间已修改', { exact: true }).waitFor({ timeout: 30_000 });
  await progressModal.getByText(/领取时间：2026-08-03 08:30:00/).waitFor({ timeout: 30_000 });
  result.assertions.sewingUpdated = '2026-08-03 08:30:00';
  const sewingEditScreenshot = path.join(outputDir, 'sewing-claim-time-edited.png');
  await progressModal.screenshot({ path: sewingEditScreenshot });
  result.screenshots.push(path.basename(sewingEditScreenshot));

  const relevantApiErrors = apiErrors.filter((item) => !item.includes('/api/v1/auth/onboarding/status'));
  const relevantBrowserErrors = browserErrors.filter((item) => (
    !item.includes('Failed to load resource: the server responded with a status of 401')
    && !item.includes('Instance created by `useForm` is not connected')
    && !item.includes('[antd: message] Static function can not consume context')
  ));
  result.apiErrors = relevantApiErrors;
  result.browserErrors = relevantBrowserErrors;
  result.passed = relevantApiErrors.length === 0 && relevantBrowserErrors.length === 0;
  if (!result.passed) throw new Error('页面存在未忽略的接口或控制台错误');
} catch (error) {
  result.error = error instanceof Error ? error.message : String(error);
  result.url = page.url();
  const failureScreenshot = path.join(outputDir, 'production-business-time-ui-failed.png');
  await page.screenshot({ path: failureScreenshot, fullPage: true }).catch(() => {});
  result.screenshots.push(path.basename(failureScreenshot));
  process.exitCode = 1;
} finally {
  fs.writeFileSync(path.join(outputDir, 'ui-result.json'), `${JSON.stringify(result, null, 2)}\n`);
  await browser.close();
  console.log(JSON.stringify(result, null, 2));
}
