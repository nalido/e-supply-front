import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const envPath = '/Users/huangjianbing/codes/supply-and-sale/e-supply-back/src/main/resources/.env.dev';
const env = {};
for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
  const s = line.trim();
  if (!s || s.startsWith('#') || !s.includes('=')) continue;
  const idx = s.indexOf('=');
  env[s.slice(0, idx)] = s.slice(idx + 1).replace(/^['\"]|['\"]$/g, '');
}

const baseUrl = 'http://120.26.174.215';
const username = env.ESUPPLY_ADMIN_EMAIL || env.ESUPPLY_ADMIN_USERNAME || 'jambin';
const password = env.ESUPPLY_ADMIN_PASSWORD;
if (!password) throw new Error('Missing ESUPPLY_ADMIN_PASSWORD in .env.dev');

const outDir = `/Users/huangjianbing/.openclaw/workspace/outbox/dev-test-${Date.now()}`;
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
const storageStatePath = '/Users/huangjianbing/codes/supply-and-sale/e-supply-front/logs/route-sweep-auth-dev.json';
const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, storageState: fs.existsSync(storageStatePath) ? storageStatePath : undefined });
const page = await context.newPage();
const result = { baseUrl, outDir, login: {}, checks: [] };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function safeText(locator) {
  try { return (await locator.first().innerText()).trim(); } catch { return null; }
}

async function login() {
  await page.goto(`${baseUrl}/welcome`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(1500);
  const loginBtn = page.getByRole('button', { name: '登录系统' });
  if (await loginBtn.count()) {
    await loginBtn.click().catch(() => {});
    await sleep(1500);
  }
  if (/sign-in|accounts|clerk/i.test(page.url()) || await page.locator('input[name="identifier"], input[type="email"], input[name="username"], input[name="emailAddress"]').count()) {
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
  }
  await page.goto(`${baseUrl}/dashboard/workplace`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(2500);
  result.login = { ok: /dashboard|workplace|sample|foundation|orders/i.test(page.url()), url: page.url() };
  await page.screenshot({ path: path.join(outDir, '01-after-login.png'), fullPage: true });
  if (!result.login.ok) throw new Error(`Login failed: ${page.url()}`);
}

async function testStyleMaterialsSync() {
  const item = { name: 'style_material_sync' };
  await page.goto(`${baseUrl}/foundation/product/detail?id=1`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.getByText('关联面辅料').first().waitFor({ timeout: 30000 });
  const cards = page.locator('.style-detail-material-card');
  item.url = page.url();
  item.cardCount = await cards.count();
  item.ok = item.cardCount > 0;
  item.firstMaterial = await safeText(cards.first());
  await page.screenshot({ path: path.join(outDir, '02-style-detail-materials.png'), fullPage: true });
  result.checks.push(item);
}

async function testFactoryOrderAutoMaterials() {
  const item = { name: 'factory_order_auto_materials' };
  await page.goto(`${baseUrl}/orders/factory?quickCreate=1&styleId=1&sampleOrderId=1&sampleOrderNo=SMP-001`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.getByText('新建工厂订单').first().waitFor({ timeout: 30000 });
  await page.getByText('关联面辅料').first().waitFor({ timeout: 30000 });
  const cards = page.locator('.factory-create-material-card');
  item.url = page.url();
  item.cardCount = await cards.count();
  item.emptyHintCount = await page.getByText('当前款式未配置 BOM，暂无可同步的面辅料。').count();
  item.ok = item.cardCount > 0 && item.emptyHintCount === 0;
  item.firstMaterial = await safeText(cards.first());
  await page.screenshot({ path: path.join(outDir, '03-factory-order-materials.png'), fullPage: true });
  result.checks.push(item);
}

async function testSalesPlanning() {
  const item = { name: 'style_sales_planning' };
  await page.goto(`${baseUrl}/orders/report/material-need`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.getByRole('radio', { name: '销量备料建议' }).click();
  await sleep(2500);
  await page.getByText('销量备料建议明细').first().waitFor({ timeout: 30000 });
  const rows = page.locator('.ant-table-tbody tr');
  const rowCount = await rows.count();
  const chips = {
    hasWeeklySales: await page.getByText('周销量').count(),
    hasSuggestedStock: await page.getByText('建议库存').count(),
    hasSuggestedReplenish: await page.getByText('建议补货量').count(),
  };
  item.url = page.url();
  item.rowCount = rowCount;
  item.columns = chips;
  item.ok = rowCount > 0 && chips.hasWeeklySales > 0 && chips.hasSuggestedStock > 0 && chips.hasSuggestedReplenish > 0;
  await page.screenshot({ path: path.join(outDir, '04-sales-planning-report.png'), fullPage: true });
  const moreBtn = page.getByRole('button', { name: '查看更多' }).first();
  if (await moreBtn.count()) {
    await moreBtn.click().catch(() => {});
    await sleep(1000);
    item.drawerVisible = await page.getByText('销量备料建议详情').count();
    await page.screenshot({ path: path.join(outDir, '05-sales-planning-detail.png'), fullPage: true });
  }
  result.checks.push(item);
}

try {
  await login();
  await testStyleMaterialsSync();
  await testFactoryOrderAutoMaterials();
  await testSalesPlanning();
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
