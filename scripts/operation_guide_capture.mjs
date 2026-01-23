#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const baseUrl = process.env.ESUPPLY_BASE_URL || 'http://localhost:5173';
const storageStatePath = process.env.ESUPPLY_STORAGE_STATE || 'logs/route-sweep-auth.json';
const outputDir = process.env.ESUPPLY_GUIDE_DIR || 'public/operation-guide';

const sampleId = process.env.ESUPPLY_SAMPLE_ID || '';
const procurementNo = process.env.ESUPPLY_PROCUREMENT_NO || '';

const executablePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
if (!fs.existsSync(executablePath)) {
  throw new Error(`Chrome not found at ${executablePath}. Install Chrome or set a different path.`);
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptDir, '..');
const absOutputDir = path.resolve(appRoot, outputDir);
fs.mkdirSync(absOutputDir, { recursive: true });

const loadEnvFromFile = (filePath) => {
  if (!fs.existsSync(filePath)) {
    return;
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  content.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) {
      return;
    }
    const [key, ...rest] = trimmed.split('=');
    if (!key || rest.length === 0) {
      return;
    }
    if (!process.env[key]) {
      process.env[key] = rest.join('=').trim();
    }
  });
};

const ensureLoginEnv = () => {
  if (process.env.ESUPPLY_ADMIN_EMAIL && process.env.ESUPPLY_ADMIN_PASSWORD) {
    return;
  }
  const backendEnv = path.resolve(appRoot, '../e-supply-back/src/main/resources/.env');
  loadEnvFromFile(backendEnv);
};

const findStyleImage = () => {
  const stylesDir = path.resolve(appRoot, 'public/assets/images/styles');
  if (!fs.existsSync(stylesDir)) {
    throw new Error(`Style images folder not found: ${stylesDir}`);
  }
  const candidates = fs
    .readdirSync(stylesDir)
    .filter((name) => /\.(png|jpg|jpeg)$/i.test(name));
  if (candidates.length === 0) {
    throw new Error(`No images found in ${stylesDir}`);
  }
  const picked = candidates[Math.floor(Math.random() * candidates.length)];
  return path.join(stylesDir, picked);
};

const resolveStorageState = () => {
  const absPath = path.isAbsolute(storageStatePath)
    ? storageStatePath
    : path.resolve(appRoot, storageStatePath);
  if (!fs.existsSync(absPath)) {
    throw new Error(`storage state not found: ${absPath}`);
  }
  return absPath;
};

const performLogin = async (pageInstance, statePath) => {
  ensureLoginEnv();
  const email = process.env.ESUPPLY_ADMIN_EMAIL;
  const password = process.env.ESUPPLY_ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error('Missing ESUPPLY_ADMIN_EMAIL or ESUPPLY_ADMIN_PASSWORD for login.');
  }
  const emailInput = pageInstance.locator('input[type=\"email\"], input[name=\"identifier\"]');
  if (await emailInput.count()) {
    await emailInput.first().fill(email);
    const continueButton = pageInstance.getByRole('button', { name: /Continue|Sign in|登录/i });
    await continueButton.click();
  }
  const passwordInput = pageInstance.locator('input[type=\"password\"]');
  await passwordInput.waitFor({ timeout: 20000 });
  await passwordInput.fill(password);
  const continueButton = pageInstance.getByRole('button', { name: /Continue|Sign in|登录/i });
  await continueButton.click();
  await pageInstance.waitForTimeout(1200);
  const extraContinue = pageInstance.getByRole('button', { name: /Continue|Sign in|登录/i });
  if (await extraContinue.isVisible().catch(() => false)) {
    await extraContinue.click();
  }
  await pageInstance.waitForURL(/localhost:5173/, { timeout: 60000 });
  await pageInstance.context().storageState({ path: statePath });
};

const ensureAuthenticated = async (pageInstance, statePath) => {
  await pageInstance.goto(`${baseUrl}/dashboard/workplace`, { waitUntil: 'domcontentloaded' });
  await pageInstance.waitForTimeout(1000);
  const loginInput = pageInstance.locator('input[type="email"], input[name="identifier"]');
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const currentUrl = pageInstance.url();
    const loginVisible = await loginInput.first().isVisible().catch(() => false);
    if (currentUrl.includes('clerk') || currentUrl.includes('accounts') || loginVisible) {
      await performLogin(pageInstance, statePath);
      break;
    }
    const shellVisible = await pageInstance.getByText('易供云').first().isVisible().catch(() => false);
    if (shellVisible) {
      break;
    }
    await pageInstance.waitForTimeout(1000);
  }
  await waitForAppShell();
};

const browser = await chromium.launch({ headless: true, executablePath });
const context = await browser.newContext({
  storageState: resolveStorageState(),
  viewport: { width: 1440, height: 900 },
});

const page = await context.newPage();

const waitForAppShell = async () => {
  await page.locator('#root').waitFor({ timeout: 20000 });
  await page.getByText('易供云').first().waitFor({ timeout: 20000 });
};

const waitAndShot = async (route, filename, action) => {
  await page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded' });
  if (page.url().includes('clerk') || page.url().includes('accounts')) {
    await performLogin(page, resolveStorageState());
    await page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded' });
  }
  await waitForAppShell();
  await page.waitForTimeout(800);
  if (action) {
    await action();
    await page.waitForTimeout(800);
  }
  const target = path.join(absOutputDir, filename);
  await page.screenshot({ path: target, fullPage: true });
  console.log(`Saved ${target}`);
};

const createStyleWithImage = async () => {
  await page.goto(`${baseUrl}/basic/styles`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  if (page.url().includes('clerk') || page.url().includes('accounts')) {
    await performLogin(page, resolveStorageState());
    await page.goto(`${baseUrl}/basic/styles`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);
  }
  await page.getByText('款式资料').waitFor({ timeout: 10000 });
  await page.getByRole('button', { name: '新建' }).click();
  await page.waitForURL(/foundation\/product\/detail/, { timeout: 15000 });
  await page.waitForTimeout(800);
  const timestamp = Date.now();
  await page.getByPlaceholder('例如 STY-2024-001').waitFor({ timeout: 10000 });
  await page.getByPlaceholder('例如 STY-2024-001').fill(`STY-${timestamp}`);
  await page.getByPlaceholder('请输入款式名称').fill(`自动款式-${timestamp}`);
  const colorSelect = page.locator('.ant-form-item:has(label:has-text("颜色")) .ant-select');
  await colorSelect.click();
  await page.locator('.ant-form-item:has(label:has-text("颜色")) .ant-select input').fill('黑');
  await page.keyboard.press('Enter');
  const sizeSelect = page.locator('.ant-form-item:has(label:has-text("尺码")) .ant-select');
  await sizeSelect.click();
  await page.locator('.ant-form-item:has(label:has-text("尺码")) .ant-select input').fill('M');
  await page.keyboard.press('Enter');
  await page.getByText('状态').click();
  await page.getByText('启用', { exact: true }).click();
  const imagePath = findStyleImage();
  const uploadInput = page.locator('.style-detail-cover-item input[type=\"file\"]');
  await uploadInput.setInputFiles(imagePath);
  await page.locator('.style-detail-cover-item .ant-upload-list-item-done').first().waitFor({ timeout: 10000 });
  const saveButton = page.locator('button:has-text("保存")').first();
  await saveButton.waitFor({ timeout: 20000, state: 'attached' });
  await saveButton.scrollIntoViewIfNeeded();
  await saveButton.click({ force: true });
  await page.getByText('款式资料已创建').waitFor({ timeout: 10000 });
  await page.getByRole('button', { name: '返回列表' }).click();
  await page.waitForTimeout(800);
};

await ensureAuthenticated(page, resolveStorageState());
await waitAndShot('/dashboard/workplace', '01-dashboard-workplace.png');
if (!process.env.ESUPPLY_SKIP_STYLE_CREATE) {
  await createStyleWithImage();
}

await waitAndShot('/sample/list', '02-sample-list.png', async () => {
  const cardToggle = page.getByRole('radio', { name: /卡片/ });
  if (await cardToggle.isVisible().catch(() => false)) {
    await cardToggle.click();
  }
  const listCards = page.locator('.ant-list .ant-card').filter({ hasText: '样板单号' });
  const confirmedCard = listCards.filter({ hasText: '已确认' }).first();
  const targetCard = (await confirmedCard.count()) ? confirmedCard : listCards.first();
  const bulkButton = targetCard.getByRole('button', { name: '下大货' });
  if (await bulkButton.isVisible().catch(() => false)) {
    await bulkButton.click();
    const confirmButton = page.getByRole('button', { name: '确认' });
    if (await confirmButton.isVisible().catch(() => false)) {
      await confirmButton.click();
      await page.getByText('已进入大货生产').waitFor({ timeout: 10000 }).catch(() => {});
      await targetCard.getByText('生产中').waitFor({ timeout: 8000 }).catch(() => {});
    }
  }
  await page.getByText('生产中').first().waitFor({ timeout: 5000 }).catch(() => {});
});
await waitAndShot('/sample/list', '03-sample-create-modal.png', async () => {
  const button = page.getByRole('button', { name: /新建样板单/ });
  await button.click();
});
if (sampleId) {
  await waitAndShot(`/sample/detail?id=${sampleId}`, '04-sample-detail.png');
}
await waitAndShot('/sample/follow-template', '05-sample-follow-template.png');
await waitAndShot('/sample/type', '06-sample-type.png');
await waitAndShot('/sample/report/order-compare', '07-sample-order-compare.png');
await waitAndShot('/sample/report/costing', '08-sample-costing-report.png');

await waitAndShot('/orders/factory', '09-orders-factory.png');
await waitAndShot('/orders/outsource', '10-orders-outsource.png');
await waitAndShot('/orders/compare', '11-orders-compare.png');
await waitAndShot('/orders/efficiency', '12-orders-efficiency.png');
await waitAndShot('/orders/report/profit', '13-orders-report-profit.png');
await waitAndShot('/orders/report/cost', '14-orders-report-cost.png');
await waitAndShot('/orders/report/material-need', '15-orders-report-material-need.png');
await waitAndShot('/orders/report/cut-outsource', '16-orders-report-cut-outsource.png');

await waitAndShot('/material/stock', '17-material-stock.png');
await waitAndShot('/material/purchase-prep', '18-material-purchase-prep.png', async () => {
  if (procurementNo) {
    const searchInput = page.getByPlaceholder('请输入物料/供应商/采购单号');
    await searchInput.fill(procurementNo);
    const searchButton = page.getByRole('button', { name: /查询/ });
    await searchButton.click();
  }
});
await waitAndShot('/material/purchase-prep', '19-material-purchase-create.png', async () => {
  const button = page.getByRole('button', { name: /备料采购/ });
  await button.click();
});
await waitAndShot('/material/issue', '20-material-issue.png');
await waitAndShot('/material/report/overview', '21-material-report-overview.png');
await waitAndShot('/material/report/purchase-inbound-detail', '22-material-report-purchase-inbound.png');

await waitAndShot('/product/stock', '23-product-stock.png');
await waitAndShot('/product/inbound/pending', '24-product-inbound-pending.png');
await waitAndShot('/product/inbound/received', '25-product-inbound-received.png');
await waitAndShot('/product/inbound-other', '26-product-inbound-other.png');
await waitAndShot('/product/outbound', '27-product-outbound.png');
await waitAndShot('/product/report/overview', '28-product-report-overview.png');

await waitAndShot('/piecework/orders', '29-piecework-orders.png');
await waitAndShot('/piecework/cutting/pending', '30-piecework-cutting-pending.png');
await waitAndShot('/piecework/cutting/done', '31-piecework-cutting-done.png');
await waitAndShot('/piecework/cutting/report', '32-piecework-cutting-report.png');
await waitAndShot('/piecework/progress', '33-piecework-progress.png');
await waitAndShot('/piecework/payroll', '34-piecework-payroll.png');
await waitAndShot('/piecework/outsource', '35-piecework-outsource.png');
await waitAndShot('/piecework/quality', '36-piecework-quality.png');
await waitAndShot('/piecework/report', '37-piecework-report.png');

await waitAndShot('/collab/send-out', '38-collab-send-out.png');
await waitAndShot('/collab/receive-in', '39-collab-receive-in.png');

await waitAndShot('/settlement/receivable', '40-settlement-receivable.png', async () => {
  const button = page.getByRole('button', { name: /新增|收款/ });
  await button.first().click();
});
await waitAndShot('/settlement/payable-factory', '41-settlement-payable-factory.png', async () => {
  const button = page.getByRole('button', { name: /新增|付款/ });
  await button.first().click();
});
await waitAndShot('/settlement/payable-supplier', '42-settlement-payable-supplier.png', async () => {
  const button = page.getByRole('button', { name: /新增|付款/ });
  await button.first().click();
});
await waitAndShot('/settlement/cashier', '43-settlement-cashier.png');
await waitAndShot('/settlement/report/customer-detail', '44-settlement-report-customer.png');
await waitAndShot('/settlement/report/factory-detail', '45-settlement-report-factory.png');
await waitAndShot('/settlement/report/supplier-detail', '46-settlement-report-supplier.png');
await waitAndShot('/settlement/report/statement-detail', '47-settlement-report-statement.png');

await waitAndShot('/basic/styles', '48-basic-styles.png');
await waitAndShot('/basic/material', '49-basic-material.png');
await waitAndShot('/basic/partners', '50-basic-partners.png');
await waitAndShot('/basic/process-type', '51-basic-process-type.png');
await waitAndShot('/basic/operation-template', '52-basic-operation-template.png');
await waitAndShot('/basic/warehouse', '53-basic-warehouse.png');

await waitAndShot('/settings/profile', '54-settings-profile.png');
await waitAndShot('/settings/company', '55-settings-company.png');
await waitAndShot('/settings/org', '56-settings-org.png');
await waitAndShot('/settings/roles', '57-settings-roles.png');
await waitAndShot('/settings/preferences', '58-settings-preferences.png');
await waitAndShot('/settings/audit', '59-settings-audit.png');

await browser.close();
