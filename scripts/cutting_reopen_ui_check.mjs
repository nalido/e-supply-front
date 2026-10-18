#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.ESUPPLY_BASE_URL || 'http://127.0.0.1:5173';
const workOrderId = process.env.ESUPPLY_WORK_ORDER_ID;
const outputDir = process.env.ESUPPLY_OUTPUT_DIR || path.resolve(
  process.cwd(),
  '../docs/e-supply/04-verification/cutting-reopen-20261018',
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
  await page.waitForFunction(() => window.Clerk?.loaded, { timeout: 30000 });
  await page.waitForTimeout(1000);
  if (await page.evaluate(() => Boolean(window.Clerk?.session))) {
    await context.storageState({path:storageStatePath});
    return;
  }
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
 await page.waitForFunction(() => window.Clerk?.session);
 const token = await page.evaluate(() => window.Clerk.session.getToken());
 fs.writeFileSync('/tmp/esupply-cutting-reopen-token', token, {mode:0o600});
 const api = async (method, suffix, body) => {
   const response = await context.request.fetch('http://127.0.0.1:8080/api/v1/' + suffix, {
     method, headers: {Authorization: `Bearer ${token}`, 'X-Tenant-Id': '1'},
     params: {tenantId: 1}, ...(body ? {data: body} : {}),
   }).catch(() => { throw new Error(`API connection failed: ${suffix}`); });
   if (!response.ok()) throw new Error(`API ${response.status()} ${suffix}: ${await response.text()}`);
   return response.status() === 204 ? null : response.json();
 };
 const orderId = process.env.ESUPPLY_ORDER_ID;
 if (!orderId) throw new Error('ESUPPLY_ORDER_ID required');
 const detail = await api('GET', `production-orders/${orderId}`);
 const code = (detail.order || detail).orderNo;
 for (const node of ['FABRIC_ARRIVED', 'ACCESSORY_ARRIVED']) {
   await api('POST', `production-orders/${orderId}/progress/${node}/complete`, {payload:{arrivedAt:new Date().toISOString()}});
 }
 await page.goto(`${baseUrl}/orders/factory?keyword=${encodeURIComponent(code)}`, {waitUntil:'domcontentloaded'});
 await page.getByText(code, {exact:true}).first().waitFor({timeout:30000});
 await page.locator('.factory-order-progress-node').filter({hasText:'裁剪'}).first().click();
 await page.getByRole('button', {name:'退回未完成',exact:true}).waitFor();
 await page.getByRole('button', {name:'退回未完成',exact:true}).click();
 const dialog = page.getByRole('dialog').filter({hasText:'退回裁剪为未完成'});
 await dialog.getByRole('button', {name:'确认退回'}).click();
 await dialog.getByText('请填写退回原因', {exact:true}).waitFor();
 check('退回原因必填', true);
 await dialog.locator('textarea').fill('页面验收：误操作完成后退回核对床次');
 await page.screenshot({path:path.join(outputDir,'01-reopen-reason.png'),fullPage:true});
 await dialog.getByRole('button', {name:/取\s*消/}).click();
 const unchanged = await api('GET', `production-orders/${orderId}/progress`);
 check('取消退回保持完成状态', unchanged.find(n=>n.nodeCode==='CUTTING').status==='COMPLETED');
 await page.getByRole('button', {name:'退回未完成',exact:true}).click();
 await dialog.locator('textarea').fill('页面验收：误操作完成后退回核对床次');
 await dialog.getByRole('button', {name:'确认退回'}).click();
 await dialog.waitFor({state:'hidden'});
 const reopened = await api('GET', `production-orders/${orderId}/progress`);
 check('确认后真实接口恢复未完成', reopened.find(n=>n.nodeCode==='CUTTING').status==='PENDING');
 await page.locator('.factory-order-progress-node').filter({hasText:'裁剪'}).first().getByText(/进行中/).waitFor();
 await page.screenshot({path:path.join(outputDir,'02-reopened-card.png'),fullPage:true});
 check('退回后卡片显示进行中', true);
 await page.locator('.factory-order-progress-node').filter({hasText:'裁剪'}).first().click();
 await page.getByRole('tab',{name:'裁剪数据'}).click();
 await page.getByRole('button',{name:'前往裁床单'}).waitFor();
 check('未完成节点不再显示退回按钮', await page.getByRole('button',{name:'退回未完成',exact:true}).count()===0);
 check('保留裁床单修改入口', true);
 await page.goto(`${baseUrl}/settings/audit`,{waitUntil:'domcontentloaded'});
 await page.getByRole('row').filter({hasText:'裁剪退回未完成'}).first().waitFor();
 await page.getByRole('row').filter({hasText:'裁剪退回未完成'}).first().getByRole('button',{name:'查看'}).click();
 await page.getByText('页面验收：误操作完成后退回核对床次',{exact:true}).waitFor();
 check('操作日志显示退回原因和状态变化', await page.getByText('已完成 → 未完成',{exact:true}).isVisible());
 await page.waitForTimeout(300);
 await page.screenshot({path:path.join(outputDir,'03-reopen-audit.png'),fullPage:true});
 result.ok=true;
 console.log(JSON.stringify(result.checks));
} catch (error) {
 await page.screenshot({path:path.join(outputDir,'failure.png'),fullPage:true});
 console.log('Page:', await page.locator('body').innerText().then(t=>t.slice(0,3000)));
 throw new Error(error instanceof Error ? error.message.split('Call log:')[0] : 'UI verification failed');
} finally {
 result.screenshots = ['01-reopen-reason.png', '02-reopened-card.png', '03-reopen-audit.png'];
 fs.writeFileSync(path.join(outputDir,'ui-result.json'),JSON.stringify(result,null,2));
 await browser.close();
}
