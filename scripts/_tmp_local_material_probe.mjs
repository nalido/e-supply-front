import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const baseUrl = 'http://127.0.0.1:5173';
const outDir = path.resolve('logs/local-material-probe');
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
const page = await context.newPage();
const result = {};

async function login() {
  await page.goto(`${baseUrl}/welcome`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.getByRole('button', { name: '登录系统' }).click();
  const userInput = page.locator('input[name="identifier"], input[type="email"], input[name="username"]').first();
  await userInput.waitFor({ timeout: 30000 });
  await userInput.fill('jambin');
  await page.getByRole('button', { name: /继续|Continue|Sign in|下一步/i }).first().click();
  const pwdInput = page.locator('input[type="password"]').first();
  await pwdInput.waitFor({ timeout: 30000 });
  await pwdInput.fill('Jambin288416');
  await page.getByRole('button', { name: /继续|Continue|Sign in|登录/i }).first().click();
  await page.waitForURL(/127\.0\.0\.1:5173\/(dashboard|workplace|sample|foundation|orders)/, { timeout: 60000 });
}

try {
  await login();
  result.loginUrl = page.url();

  await page.goto(`${baseUrl}/foundation/product/detail?id=1`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.getByText('关联面辅料').first().waitFor({ timeout: 30000 });
  result.styleUrl = page.url();
  result.styleMaterialCards = await page.locator('.style-detail-material-card').count();
  await page.screenshot({ path: path.join(outDir, 'style-detail-materials.png'), fullPage: true });

  await page.goto(`${baseUrl}/orders/factory?quickCreate=1&styleId=1&sampleOrderId=1&sampleOrderNo=SMP-001`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.getByText('新建工厂订单').first().waitFor({ timeout: 30000 });
  await page.getByText('关联面辅料').first().waitFor({ timeout: 30000 });
  result.factoryUrl = page.url();
  result.factoryMaterialCards = await page.locator('.factory-create-material-card').count();
  result.emptyHintVisible = await page.getByText('当前款式未配置 BOM，暂无可同步的面辅料。').count();
  await page.screenshot({ path: path.join(outDir, 'factory-order-create-materials.png'), fullPage: true });

  console.log(JSON.stringify({ ok: true, ...result, outDir }, null, 2));
} catch (error) {
  await page.screenshot({ path: path.join(outDir, 'failure.png'), fullPage: true }).catch(() => {});
  console.log(JSON.stringify({ ok: false, error: String(error), ...result, outDir, finalUrl: page.url() }, null, 2));
  process.exitCode = 1;
} finally {
  await browser.close();
}
