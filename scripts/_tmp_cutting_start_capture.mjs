import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const baseUrl = 'http://127.0.0.1:5173';
const outDir = path.resolve('logs/cutting-start-capture');
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
const context = await browser.newContext({ viewport: { width: 1440, height: 1280 } });
const page = await context.newPage();

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
  await page.waitForURL(/127\.0\.0\.1:5173\/(dashboard|workplace|sample|foundation|orders|piecework)/, { timeout: 60000 });
}

try {
  await login();
  await page.goto(`${baseUrl}/piecework/cutting/pending`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.getByText('待裁').first().waitFor({ timeout: 30000 }).catch(() => {});
  const startButton = page.getByRole('button', { name: '开裁' }).first();
  await startButton.waitFor({ timeout: 30000 });
  await startButton.click();
  await page.getByRole('dialog').waitFor({ timeout: 30000 });
  await page.screenshot({ path: path.join(outDir, 'cutting-start-modal.png'), fullPage: true });
  const dialog = page.getByRole('dialog');
  const result = {
    url: page.url(),
    linkedCards: await dialog.locator('.cutting-start-linked-card').count(),
    helperText: await dialog.getByText('已优先展示当前款式 BOM 关联的面料').count(),
    recommendedOptions: await dialog.locator('.ant-select-item-option-content').filter({ hasText: '推荐 ·' }).count().catch(() => 0),
  };
  console.log(JSON.stringify({ ok: true, outDir, ...result }, null, 2));
} catch (error) {
  await page.screenshot({ path: path.join(outDir, 'failure.png'), fullPage: true }).catch(() => {});
  console.log(JSON.stringify({ ok: false, error: String(error), outDir, url: page.url() }, null, 2));
  process.exitCode = 1;
} finally {
  await browser.close();
}
