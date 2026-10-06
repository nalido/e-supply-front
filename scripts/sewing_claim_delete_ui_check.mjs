import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.ESUPPLY_FRONT_BASE_URL || 'http://127.0.0.1:5190';
const orderNo = process.env.ESUPPLY_SEWING_DELETE_ORDER_NO;
const backendEnvPath = path.resolve('../e-supply-back/src/main/resources/.env');
const outputDir = path.resolve('../docs/e-supply/04-verification/sewing-claim-delete-20261006');
const storageStateCandidates = [
  path.resolve('logs/route-sweep-auth-dev.json'),
  path.resolve('logs/route-sweep-auth.json'),
];
const storageState = storageStateCandidates.find((candidate) => fs.existsSync(candidate));

if (!orderNo) throw new Error('请提供 ESUPPLY_SEWING_DELETE_ORDER_NO');
fs.mkdirSync(outputDir, { recursive: true });

const localEnv = {};
for (const line of fs.readFileSync(backendEnvPath, 'utf8').split(/\r?\n/)) {
  const normalized = line.trim();
  if (!normalized || normalized.startsWith('#') || !normalized.includes('=')) continue;
  const separator = normalized.indexOf('=');
  localEnv[normalized.slice(0, separator)] = normalized.slice(separator + 1).replace(/^["']|["']$/g, '');
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1520, height: 1050 }, storageState });
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
  await page.waitForTimeout(2_000);
  if (await page.locator('[data-testid="factory-orders-search-input"]').count()) return;
  const loginButton = page.getByRole('button', { name: '登录系统' });
  await loginButton.waitFor({ state: 'visible', timeout: 30_000 });
  await loginButton.click();
  const identifier = page.locator('input[name="identifier"], input[type="email"], input[name="username"]').first();
  await identifier.waitFor({ timeout: 30_000 });
  await identifier.fill(localEnv.ESUPPLY_ADMIN_EMAIL);
  await page.getByRole('button', { name: /继续|Continue|Sign in|下一步/i }).first().click();
  const passwordInput = page.locator('input[type="password"]').first();
  await passwordInput.waitFor({ timeout: 30_000 });
  await passwordInput.fill(localEnv.ESUPPLY_ADMIN_PASSWORD);
  await page.getByRole('button', { name: /继续|Continue|Sign in|登录/i }).first().click();
  await page.waitForTimeout(3_000);
  await page.goto(`${baseUrl}/piecework/orders`, { waitUntil: 'networkidle', timeout: 60_000 });
  await page.locator('[data-testid="factory-orders-search-input"]').waitFor({ timeout: 30_000 });
};

const result = { passed: false, baseUrl, orderNo, assertions: {}, screenshots: [], browserErrors, apiErrors };

try {
  await ensureSignedIn();
  await page.evaluate(() => localStorage.setItem('factory-orders-view-mode', 'card'));
  await page.goto(`${baseUrl}/piecework/orders`, { waitUntil: 'networkidle', timeout: 60_000 });
  const search = page.locator('[data-testid="factory-orders-search-input"]');
  await search.fill(orderNo);
  await search.press('Enter');
  const card = page.locator('.factory-order-card-shell').filter({ hasText: orderNo }).first();
  await card.waitFor({ state: 'visible', timeout: 30_000 });
  await card.getByText('车缝', { exact: true }).click();

  const progressModal = page.locator('.ant-modal:visible').last();
  await progressModal.getByText('领取记录', { exact: true }).click();
  await progressModal.getByText('暂无领取记录', { exact: true }).waitFor({ timeout: 30_000 });

  const deleteButtonCount = await progressModal.getByRole('button', { name: '删除', exact: true }).count();
  const editButtonCount = await progressModal.getByRole('button', { name: '修改时间', exact: true }).count();
  if (deleteButtonCount !== 0 || editButtonCount !== 0) {
    throw new Error(`领取记录为空时仍渲染了操作按钮：delete=${deleteButtonCount}, edit=${editButtonCount}`);
  }
  result.assertions.emptyAllocationIsNotRenderedAsGhost = true;
  result.assertions.deleteButtonCount = deleteButtonCount;
  result.assertions.editButtonCount = editButtonCount;

  const screenshotPath = path.join(outputDir, 'sewing-claim-empty-after-delete.png');
  await progressModal.screenshot({ path: screenshotPath });
  result.screenshots.push(path.basename(screenshotPath));

  result.apiErrors = apiErrors.filter((item) => !item.includes('/api/v1/auth/onboarding/status'));
  result.browserErrors = browserErrors.filter((item) => (
    !item.includes('Failed to load resource: the server responded with a status of 401')
    && !item.includes('Instance created by `useForm` is not connected')
    && !item.includes('[antd: message] Static function can not consume context')
  ));
  result.passed = result.apiErrors.length === 0 && result.browserErrors.length === 0;
  if (!result.passed) throw new Error('页面存在未忽略的接口或控制台错误');
} catch (error) {
  result.error = error instanceof Error ? error.message : String(error);
  result.url = page.url();
  const failurePath = path.join(outputDir, 'sewing-claim-delete-ui-failed.png');
  await page.screenshot({ path: failurePath, fullPage: true }).catch(() => {});
  result.screenshots.push(path.basename(failurePath));
  process.exitCode = 1;
} finally {
  fs.writeFileSync(path.join(outputDir, 'ui-result.json'), `${JSON.stringify(result, null, 2)}\n`);
  await browser.close();
  console.log(JSON.stringify(result, null, 2));
}
