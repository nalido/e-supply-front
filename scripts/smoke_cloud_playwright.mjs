import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = 'http://115.29.200.124';
const envPath = '/workspace/supply-and-sale/e-supply-back/src/main/resources/.env';
const outDir = `/tmp/esupply-smoke-${Date.now()}`;
fs.mkdirSync(outDir, { recursive: true });

const env = {};
for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
  const s = line.trim();
  if (!s || s.startsWith('#') || !s.includes('=')) continue;
  const idx = s.indexOf('=');
  env[s.slice(0, idx)] = s.slice(idx + 1).replace(/^['\"]|['\"]$/g, '');
}

const email = env.ESUPPLY_ADMIN_EMAIL;
const password = env.ESUPPLY_ADMIN_PASSWORD;
if (!email || !password) throw new Error('Missing ESUPPLY_ADMIN_EMAIL or ESUPPLY_ADMIN_PASSWORD');

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const result = { baseUrl, outDir, login: { ok: false }, checks: [] };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function loginIfNeeded() {
  await page.goto(`${baseUrl}/dashboard/workplace`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(1200);
  const maybeEmail = page.locator('input[type="email"], input[name="identifier"], input[name="emailAddress"]');
  if (await maybeEmail.count()) {
    await maybeEmail.first().fill(email);
    const continueBtn = page.getByRole('button', { name: /Continue|Sign in|登录/i }).first();
    if (await continueBtn.isVisible().catch(() => false)) await continueBtn.click();
    const pwdInput = page.locator('input[type="password"]').first();
    await pwdInput.waitFor({ timeout: 30000 });
    await pwdInput.fill(password);
    const submitBtn = page.getByRole('button', { name: /Continue|Sign in|登录/i }).first();
    await submitBtn.click();
    await page.waitForLoadState('domcontentloaded');
    await sleep(2500);
  }
  const url = page.url();
  const loggedIn = !/clerk|sign-in|accounts/.test(url);
  result.login = { ok: loggedIn, url };
  await page.screenshot({ path: path.join(outDir, '01-after-login.png'), fullPage: true });
  if (!loggedIn) throw new Error(`Login not completed, current url: ${url}`);
}

async function checkRoute(route, name) {
  const errors = [];
  const onConsole = msg => { if (msg.type() === 'error') errors.push(`console:${msg.text()}`); };
  const onResp = resp => {
    const u = resp.url();
    const st = resp.status();
    if (u.includes('/api/') && st >= 400) errors.push(`api:${st}:${u}`);
  };
  page.on('console', onConsole);
  page.on('response', onResp);
  let ok = true;
  let status = null;
  let finalUrl = '';
  try {
    const resp = await page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    status = resp ? resp.status() : null;
    finalUrl = page.url();
    if (status && status >= 400) ok = false;
    if (/clerk|sign-in|accounts/.test(finalUrl)) ok = false;
    await sleep(1500);
    await page.screenshot({ path: path.join(outDir, `${name}.png`), fullPage: true });
  } catch (e) {
    ok = false;
    errors.push(`nav:${e.message}`);
  } finally {
    page.off('console', onConsole);
    page.off('response', onResp);
  }
  result.checks.push({ route, name, ok, status, finalUrl, errors: errors.slice(0, 10) });
}

try {
  await loginIfNeeded();
  await checkRoute('/dashboard/workplace', '02-dashboard');
  await checkRoute('/sample/list', '03-sample-list');
  await checkRoute('/order-report/aggregation', '04-order-report');
  await checkRoute('/foundation/product/list', '05-style-list');
} finally {
  fs.writeFileSync(path.join(outDir, 'result.json'), JSON.stringify(result, null, 2));
  await browser.close();
}

const failed = result.checks.filter(c => !c.ok || c.errors.length);
console.log(JSON.stringify({ login: result.login, totalChecks: result.checks.length, failedCount: failed.length, outDir, failed }, null, 2));
