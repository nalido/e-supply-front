import { chromium } from '@playwright/test';
import fs from 'fs';

const baseUrl = 'http://115.29.200.124';
const username = 'jambin';
const password = 'Jambin288416';
const outDir = `/tmp/esupply-login-${Date.now()}`;
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const logs = [];
page.on('console', m => { if (m.type() === 'error') logs.push(`console:${m.text()}`); });

try {
  await page.goto(`${baseUrl}/welcome`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.screenshot({ path: `${outDir}/01-welcome.png`, fullPage: true });

  await page.getByRole('button', { name: '登录系统' }).click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${outDir}/02-after-click-login.png`, fullPage: true });

  const userInput = page.locator('input[name="identifier"], input[type="email"], input[name="username"]').first();
  await userInput.waitFor({ timeout: 30000 });
  await userInput.fill(username);
  await page.getByRole('button', { name: /继续|Continue|Sign in|下一步/i }).first().click();

  const pwdInput = page.locator('input[type="password"]').first();
  await pwdInput.waitFor({ timeout: 30000 });
  await pwdInput.fill(password);
  await page.getByRole('button', { name: /继续|Continue|Sign in|登录/i }).first().click();

  await page.waitForTimeout(5000);
  await page.screenshot({ path: `${outDir}/03-after-submit.png`, fullPage: true });

  const finalUrl = page.url();
  const ok = finalUrl.includes('/dashboard') || finalUrl.includes('/workplace');
  const result = { ok, finalUrl, outDir, logs: logs.slice(0, 20) };
  fs.writeFileSync(`${outDir}/result.json`, JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
} catch (e) {
  const result = { ok: false, error: String(e), outDir, logs: logs.slice(0,20), finalUrl: page.url() };
  fs.writeFileSync(`${outDir}/result.json`, JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = 1;
} finally {
  await browser.close();
}
