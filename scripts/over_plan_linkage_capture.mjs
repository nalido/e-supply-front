#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const appRoot = '/Users/huangjianbing/codes/supply-and-sale/e-supply-front';
const baseUrl = 'http://127.0.0.1:5173';
const statePath = path.join(appRoot, 'logs/route-sweep-auth.json');
const outDir = path.join(appRoot, 'logs/over-plan-linkage-20260316');
const executablePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const email = 'admin@huaaosoft.com';
const password = 'ZsW@5H8Wl^7M44zG';

fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true, executablePath });
const context = await browser.newContext({
  storageState: fs.existsSync(statePath) ? statePath : undefined,
  viewport: { width: 1440, height: 960 },
});
const page = await context.newPage();

async function ensureLogin(target = '/dashboard/workplace') {
  await page.goto(`${baseUrl}${target}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  const needsLogin = page.url().includes('clerk') || await page.locator('input[type="email"], input[name="identifier"]').first().isVisible().catch(() => false);
  if (!needsLogin) return;
  const emailInput = page.locator('input[type="email"], input[name="identifier"]').first();
  await emailInput.fill(email);
  await page.getByRole('button', { name: /Continue|Sign in|登录/i }).click();
  await page.locator('input[type="password"]').first().fill(password);
  await page.getByRole('button', { name: /Continue|Sign in|登录/i }).click();
  await page.waitForURL(/127\.0\.0\.1:5173|localhost:5173/, { timeout: 60000 });
  await context.storageState({ path: statePath });
}

async function shot(name) {
  await page.screenshot({ path: path.join(outDir, name), fullPage: true });
}

async function searchKeyword(keyword) {
  const input = page.locator('input[placeholder*="搜索"], input[placeholder*="采购单号"], input[placeholder*="订单号"], input[placeholder*="关键字"]').first();
  await input.fill(keyword);
  await input.press('Enter');
  await page.waitForTimeout(1200);
}

await ensureLogin();

// 1+2 超收成功 / 缺原因备注失败
await page.goto(`${baseUrl}/material/purchase-prep`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1500);
const allTab = page.getByText('全部状态').first();
if (await allTab.isVisible().catch(() => false)) {
  await allTab.click();
  await page.waitForTimeout(800);
}
await searchKeyword('PO-202603-0003');
await page.getByRole('button', { name: '收料' }).first().click();
await page.waitForTimeout(800);
await page.locator('input[role="spinbutton"]').first().fill('55');
await shot('01-stocking-missing-reason-validation.png');
await page.getByRole('button', { name: '确定' }).click();
await page.waitForTimeout(800);
await shot('02-stocking-missing-reason-after-submit.png');
await page.locator('.ant-select').first().click();
await page.getByText('业务确认追加收料').click();
await page.locator('textarea').first().fill('供应商补足色差损耗，多送 5 米');
await page.locator('textarea').nth(1).fill('UI 联调确认：超收成功');
await shot('03-stocking-over-receipt-filled.png');
await page.getByRole('button', { name: '确定' }).click();
await page.waitForTimeout(1800);
await shot('04-stocking-over-receipt-success-list.png');
await page.getByRole('button', { name: '收料明细' }).first().click();
await page.waitForTimeout(1200);
await shot('05-stocking-over-receipt-receipts.png');
await page.keyboard.press('Escape');

// 3 裁床超用成功
await page.goto(`${baseUrl}/piecework/cutting/done`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1500);
await searchKeyword('CUT-OC0316A');
await shot('06-cutting-over-usage-success-list.png');
await page.getByRole('button', { name: /详情|查看/i }).first().click().catch(() => {});
await page.waitForTimeout(1000);
await shot('07-cutting-over-usage-success-detail.png');
await page.keyboard.press('Escape').catch(() => {});

// 4 裁床超用库存不足失败
await page.goto(`${baseUrl}/piecework/cutting/pending`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1500);
await searchKeyword('CUT-OC0316B');
await shot('08-cutting-insufficient-before-complete.png');
await page.getByRole('button', { name: '完工' }).first().click();
await page.waitForTimeout(1000);
const qtyInputs = page.locator('input[role="spinbutton"]');
await qtyInputs.first().fill('40');
await page.locator('.ant-select').first().click();
await page.getByText('排版/损耗超预期').click().catch(async () => {
  await page.getByText(/损耗|排版/).first().click();
});
await page.locator('textarea').first().fill('测试库存不足失败回滚');
await shot('09-cutting-insufficient-submit.png');
await page.getByRole('button', { name: '确定' }).click();
await page.waitForTimeout(1800);
await shot('10-cutting-insufficient-error-alert.png');

await browser.close();
console.log(outDir);
