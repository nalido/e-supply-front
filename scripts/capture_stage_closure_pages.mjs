import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const baseUrl = process.env.ESUPPLY_BASE_URL || 'http://127.0.0.1:5173';
const email = process.env.ESUPPLY_EMAIL || 'admin@huaaosoft.com';
const password = process.env.ESUPPLY_PASSWORD || 'ZsW@5H8Wl^7M44zG';
const outDir = path.resolve('docs/verification/stage-closure-20260315-' + Date.now());
fs.mkdirSync(outDir, { recursive: true });
const executablePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const browser = await chromium.launch({ headless: true, executablePath });
const context = await browser.newContext({ viewport: { width: 1440, height: 1200 } });
const page = await context.newPage();
const findings = [];

page.on('console', (msg) => {
  if (msg.type() === 'error' || msg.type() === 'warning') findings.push({ type: 'console', level: msg.type(), text: msg.text() });
});
page.on('pageerror', (err) => findings.push({ type: 'pageerror', text: String(err) }));

async function login() {
  await page.goto(`${baseUrl}/welcome`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.getByRole('button', { name: /登录系统|登录账号|Sign in/i }).first().click({ timeout: 30000 });
  const userInput = page.locator('input[name="identifier"], input[type="email"], input[name="username"], input[name="emailAddress"]').first();
  await userInput.waitFor({ timeout: 30000 });
  await userInput.fill(email);
  await page.getByRole('button', { name: /继续|Continue|Sign in|下一步/i }).first().click();
  const pwdInput = page.locator('input[type="password"]').first();
  await pwdInput.waitFor({ timeout: 30000 });
  await pwdInput.fill(password);
  await page.getByRole('button', { name: /继续|Continue|Sign in|登录/i }).first().click();
  await page.waitForTimeout(5000);
}

async function capture(name, url, delay = 3000) {
  await page.goto(`${baseUrl}${url}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(delay);
  await page.screenshot({ path: path.join(outDir, `${name}.png`), fullPage: true });
}

try {
  await login();
  await capture('sample-list', '/sample/list');
  await capture('sample-detail', '/sample/detail?id=6');
  await capture('cutting-pending', '/piecework/cutting/pending');
  await capture('settlement-receivable', '/settlement/receivable');
  fs.writeFileSync(path.join(outDir, 'findings.json'), JSON.stringify(findings, null, 2));
  console.log(JSON.stringify({ ok: true, outDir, findingsCount: findings.length }, null, 2));
} catch (error) {
  fs.writeFileSync(path.join(outDir, 'findings.json'), JSON.stringify([{ type: 'fatal', text: String(error) }, ...findings], null, 2));
  console.log(JSON.stringify({ ok: false, outDir, error: String(error), findingsCount: findings.length }, null, 2));
  process.exitCode = 1;
} finally {
  await browser.close();
}
