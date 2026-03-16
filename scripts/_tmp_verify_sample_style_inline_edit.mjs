import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const envPath = '/Users/huangjianbing/codes/supply-and-sale/e-supply-back/src/main/resources/.env.dev';
const env = {};
for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
  const s = line.trim();
  if (!s || s.startsWith('#') || !s.includes('=')) continue;
  const idx = s.indexOf('=');
  env[s.slice(0, idx)] = s.slice(idx + 1).replace(/^["']|["']$/g, '');
}

const baseUrl = 'http://120.26.174.215';
const username = env.ESUPPLY_ADMIN_EMAIL || env.ESUPPLY_ADMIN_USERNAME || 'jambin';
const password = env.ESUPPLY_ADMIN_PASSWORD;
if (!password) throw new Error('Missing ESUPPLY_ADMIN_PASSWORD');

const outDir = `/Users/huangjianbing/.openclaw/workspace/outbox/sample-style-inline-${Date.now()}`;
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
const page = await context.newPage();
const result = { baseUrl, outDir };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function login() {
  await page.goto(`${baseUrl}/welcome`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(1200);
  const loginBtn = page.getByRole('button', { name: '登录系统' });
  if (await loginBtn.count()) {
    await loginBtn.click().catch(() => {});
    await sleep(1200);
  }
  const userInput = page.locator('input[name="identifier"], input[type="email"], input[name="username"], input[name="emailAddress"]').first();
  await userInput.waitFor({ timeout: 30000 });
  await userInput.fill(username);
  await page.getByRole('button', { name: /继续|Continue|Sign in|下一步/i }).first().click();
  const pwdInput = page.locator('input[type="password"]').first();
  await pwdInput.waitFor({ timeout: 30000 });
  await pwdInput.fill(password);
  await page.getByRole('button', { name: /继续|Continue|Sign in|登录/i }).first().click();
  await page.waitForLoadState('domcontentloaded');
  await sleep(5000);
  await page.screenshot({ path: path.join(outDir, '00-after-login.png'), fullPage: true });
}

try {
  await login();
  await page.goto(`${baseUrl}/sample/list`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(2500);
  await page.screenshot({ path: path.join(outDir, '01-sample-list.png'), fullPage: true });
  const editBtn = page.getByRole('button', { name: /编辑/i }).first();
  await editBtn.waitFor({ timeout: 30000 });
  await editBtn.click();
  await page.getByText('编辑样板单').first().waitFor({ timeout: 30000 });
  await sleep(1500);
  const saveLinkedBtn = page.getByRole('button', { name: '保存关联款式资料' }).first();
  const styleCodeInput = page.locator('input[placeholder="请输入款号"]').first();
  const styleNameInput = page.locator('input[placeholder="请输入款名"]').first();
  result.currentUrl = page.url();
  result.modalVisible = await page.getByText('编辑样板单').count();
  result.hasSaveLinkedStyle = await saveLinkedBtn.count();
  result.styleCodeDisabled = await styleCodeInput.isDisabled();
  result.styleNameDisabled = await styleNameInput.isDisabled();
  await page.screenshot({ path: path.join(outDir, '02-edit-modal.png'), fullPage: true });
  fs.writeFileSync(path.join(outDir, 'result.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  result.error = String(error);
  result.finalUrl = page.url();
  await page.screenshot({ path: path.join(outDir, '99-failure.png'), fullPage: true }).catch(() => {});
  fs.writeFileSync(path.join(outDir, 'result.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = 1;
} finally {
  await browser.close();
}
