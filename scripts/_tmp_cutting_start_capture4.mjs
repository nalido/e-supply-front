import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
const baseUrl = 'http://127.0.0.1:5173';
const outDir = path.resolve('logs/cutting-start-capture4');
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
  await page.waitForURL(/dashboard|workplace|orders|piecework/, { timeout: 60000 });
  await page.waitForTimeout(3000);
}
try {
  await login();
  console.log('afterLogin', page.url());
  await page.goto(`${baseUrl}/piecework/cutting/pending`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(6000);
  await page.screenshot({ path: path.join(outDir, 'pending-page.png'), fullPage: true });
  console.log('afterGoto', page.url());
  const startButton = page.getByRole('button', { name: '开裁' }).first();
  await startButton.click({ timeout: 30000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(outDir, 'start-modal.png'), fullPage: true });
  console.log(JSON.stringify({ok:true,url:page.url()}, null, 2));
} catch (error) {
  await page.screenshot({ path: path.join(outDir, 'failure.png'), fullPage: true }).catch(() => {});
  console.log(JSON.stringify({ok:false,error:String(error),url:page.url()}, null, 2));
  process.exitCode = 1;
} finally {
  await browser.close();
}
