#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.ESUPPLY_BASE_URL || 'http://127.0.0.1:5173';
const workOrderId = process.env.ESUPPLY_WORK_ORDER_ID;
const outputDir = process.env.ESUPPLY_OUTPUT_DIR || path.resolve(
  process.cwd(),
  '../docs/e-supply/04-verification/cutting-short-completion-20261009',
);
const storageStatePath = process.env.ESUPPLY_STORAGE_STATE || path.resolve(
  process.cwd(),
  'logs/route-sweep-auth-dev.json',
);
const backendEnvPath = process.env.ESUPPLY_BACKEND_ENV || path.resolve(
  process.cwd(),
  '../e-supply-back/src/main/resources/.env',
);
const readDotenv = (filePath) => fs.existsSync(filePath)
  ? Object.fromEntries(fs.readFileSync(filePath, 'utf8').split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#') && line.includes('='))
    .map((line) => {
      const separator = line.indexOf('=');
      return [line.slice(0, separator), line.slice(separator + 1).replace(/^['"]|['"]$/g, '')];
    }))
  : {};
const backendEnv = readDotenv(backendEnvPath);
const username = process.env.ESUPPLY_ADMIN_EMAIL || backendEnv.ESUPPLY_ADMIN_EMAIL;
const password = process.env.ESUPPLY_ADMIN_PASSWORD || backendEnv.ESUPPLY_ADMIN_PASSWORD;

if (!workOrderId) throw new Error('请通过 ESUPPLY_WORK_ORDER_ID 指定已完成裁床单');
fs.mkdirSync(outputDir, { recursive: true });

const result = { ok: false, checks: [], screenshots: [], consoleErrors: [] };
const check = (name, condition) => {
  result.checks.push({ name, ok: Boolean(condition) });
  if (!condition) throw new Error(name);
};

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  storageState: fs.existsSync(storageStatePath) ? storageStatePath : undefined,
});
const page = await context.newPage();
page.on('console', (message) => {
  if (message.type() === 'error') result.consoleErrors.push(message.text());
});

async function ensureLogin() {
  await page.goto(`${baseUrl}/welcome`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForTimeout(1_000);
  const loginButton = page.getByRole('button', { name: /登录系统|登录|Sign in|Login/i }).first();
  if (!await loginButton.count()) {
    await context.storageState({ path: storageStatePath });
    return;
  }
  check('本地验收账号配置存在', Boolean(username && password));
  await loginButton.click();
  const identifier = page.locator('input[name="identifier"], input[type="email"], input[name="username"], input[name="emailAddress"]').first();
  await identifier.waitFor({ state: 'visible', timeout: 30_000 });
  await identifier.fill(username);
  await page.getByRole('button', { name: /继续|Continue|Sign in|下一步|登录/i }).first().click();
  const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
  await passwordInput.waitFor({ state: 'visible', timeout: 30_000 });
  await passwordInput.fill(password);
  await page.getByRole('button', { name: /继续|Continue|Sign in|登录/i }).first().click();
  await page.waitForURL((url) => !/sign-in|accounts|clerk/i.test(url.href), { timeout: 40_000 });
  await context.storageState({ path: storageStatePath });
}

try {
  await ensureLogin();
  await page.goto(
    `${baseUrl}/piecework/cutting/done?workOrderId=${encodeURIComponent(workOrderId)}&openDetail=1`,
    { waitUntil: 'domcontentloaded', timeout: 60_000 },
  );
  await page.getByRole('dialog').waitFor({ state: 'visible', timeout: 30_000 });
  await page.waitForTimeout(300);
  check('已完成裁床单显示补录入口', await page.getByRole('button', { name: '补录床次' }).count() === 1);
  check('已完成床次显示修改入口', await page.getByRole('button', { name: '修改床次' }).count() > 0);
  await page.screenshot({ path: path.join(outputDir, '01-completed-sheet-actions.png'), fullPage: true });
  result.screenshots.push('01-completed-sheet-actions.png');

  await page.getByRole('button', { name: '补录床次' }).click();
  await page.locator('.factory-editable-matrix-table:visible').waitFor({ state: 'visible' });
  await page.waitForTimeout(300);
  check('补录弹窗显示裁剪工价', await page.getByText('裁剪工价（元/件）', { exact: true }).isVisible());
  check('补录弹窗显示颜色尺码矩阵', await page.locator('.factory-editable-matrix-table:visible').count() === 1);
  await page.screenshot({ path: path.join(outputDir, '02-supplement-bed-dialog.png'), fullPage: true });
  result.screenshots.push('02-supplement-bed-dialog.png');
  await page.keyboard.press('Escape');
  await page.locator('.factory-editable-matrix-table:visible').waitFor({ state: 'hidden' });

  await page.getByRole('button', { name: '修改床次' }).first().click();
  await page.locator('.factory-editable-matrix-table:visible').waitFor({ state: 'visible' });
  await page.waitForTimeout(300);
  check('修改弹窗显示库存费用进度联动说明', await page.getByText(/同步调整库存、费用和生产进度/).isVisible());
  check('修改弹窗保留实裁数量', Number(await page.locator('.factory-matrix-cell-input input:visible').first().inputValue()) > 0);
  await page.screenshot({ path: path.join(outputDir, '03-edit-bed-dialog.png'), fullPage: true });
  result.screenshots.push('03-edit-bed-dialog.png');
  result.ok = true;
} catch (error) {
  result.error = String(error);
  await page.screenshot({ path: path.join(outputDir, '99-failure.png'), fullPage: true });
} finally {
  fs.writeFileSync(path.join(outputDir, 'result.json'), `${JSON.stringify(result, null, 2)}\n`);
  await browser.close();
}

console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exitCode = 1;
