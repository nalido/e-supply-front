#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.BASE_URL || 'http://115.29.200.124';
const username = process.env.ESUPPLY_ADMIN_EMAIL || process.env.ESUPPLY_ADMIN_USER || 'jambin';
const password = process.env.ESUPPLY_ADMIN_PASSWORD || 'Jambin288416';
const appRoot = process.cwd();
const routerPath = path.join(appRoot, 'src', 'router.tsx');
const ts = new Date().toISOString().replace(/[:.]/g, '').replace('T', '_').slice(0, 15);
const outDir = path.join(appRoot, 'logs', `menu-audit-${ts}`);
const errDir = path.join(outDir, 'errors');
fs.mkdirSync(errDir, { recursive: true });

function routesFromRouter() {
  const txt = fs.readFileSync(routerPath, 'utf8');
  const m = Array.from(txt.matchAll(/path:\s*['\"]([^'\"]+)['\"]/g)).map(x => x[1]);
  return [...new Set(m.map(p => p.startsWith('/') ? p : `/${p}`))]
    .filter(p => p !== '/')
    .filter(p => !p.includes(':'))
    .sort((a,b)=>a.localeCompare(b));
}

function safeName(route) {
  return route.replace(/^\//,'').replace(/[^a-zA-Z0-9_-]+/g,'_') || 'root';
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1600, height: 1100 } });
const page = await context.newPage();

const login = { ok: false, steps: [] };
try {
  await page.goto(`${baseUrl}/welcome`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  login.steps.push(`open ${page.url()}`);
  await page.screenshot({ path: path.join(outDir, '01-welcome.png'), fullPage: true });

  const btn = page.getByRole('button', { name: /登录系统|登录|sign in|login/i }).first();
  await btn.click({ timeout: 10000 });
  await page.waitForTimeout(1500);
  login.steps.push(`after click ${page.url()}`);
  await page.screenshot({ path: path.join(outDir, '02-after-click.png'), fullPage: true });

  const userInput = page.locator('input[name="identifier"], input[type="email"], input[name="username"]').first();
  await userInput.waitFor({ timeout: 30000 });
  await userInput.fill(username);

  const passInput = page.locator('input[name="password"], input[type="password"]').first();
  await passInput.waitFor({ timeout: 30000 });
  await passInput.fill(password);

  const submit = page.getByRole('button', { name: /继续|continue|sign in|登录|下一步/i }).first();
  await submit.click({ timeout: 10000 });

  await page.waitForURL(/\/dashboard\/(workplace|.*)/, { timeout: 30000 });
  login.ok = true;
  login.steps.push(`logged in ${page.url()}`);
  await page.screenshot({ path: path.join(outDir, '03-dashboard.png'), fullPage: true });
} catch (e) {
  login.error = String(e?.message || e);
}

const routes = routesFromRouter();
const results = [];

for (const route of routes) {
  const p = await context.newPage();
  const issues = [];

  p.on('pageerror', e => issues.push({ type: 'pageerror', message: e.message }));
  p.on('console', msg => {
    if (msg.type() === 'error') issues.push({ type: 'console', message: msg.text() });
  });
  p.on('response', r => {
    const u = r.url();
    if (u.includes('/api/') && r.status() >= 400) {
      issues.push({ type: 'api', status: r.status(), url: u });
    }
  });

  let finalUrl = '';
  try {
    const resp = await p.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    finalUrl = p.url();
    if (resp && resp.status() >= 400) issues.push({ type: 'navigation', status: resp.status(), url: finalUrl });
    await p.waitForTimeout(1500);
  } catch (e) {
    finalUrl = p.url();
    issues.push({ type: 'navigation', message: String(e?.message || e), url: finalUrl });
  }

  const hasError = issues.length > 0;
  let shot = '';
  if (hasError) {
    shot = path.join(errDir, `${safeName(route)}.png`);
    await p.screenshot({ path: shot, fullPage: true });
    fs.writeFileSync(path.join(errDir, `${safeName(route)}.html`), await p.content());
  }

  results.push({ route, finalUrl, issues, screenshot: shot || null });
  await p.close();
}

const report = {
  baseUrl,
  generatedAt: new Date().toISOString(),
  login,
  summary: {
    totalRoutes: results.length,
    errorRoutes: results.filter(r => r.issues.length > 0).length,
    okRoutes: results.filter(r => r.issues.length === 0).length,
  },
  results,
};

fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2));

const lines = [];
lines.push(`# 菜单/页面走查报告`);
lines.push(`- 时间: ${report.generatedAt}`);
lines.push(`- 站点: ${baseUrl}`);
lines.push(`- 登录: ${login.ok ? '成功' : '失败'}`);
if (!login.ok && login.error) lines.push(`- 登录错误: ${login.error}`);
lines.push(`- 页面总数: ${report.summary.totalRoutes}`);
lines.push(`- 正常: ${report.summary.okRoutes}`);
lines.push(`- 异常: ${report.summary.errorRoutes}`);
lines.push('');
for (const r of results.filter(x => x.issues.length > 0)) {
  lines.push(`## ${r.route}`);
  lines.push(`- 最终URL: ${r.finalUrl}`);
  for (const i of r.issues) {
    lines.push(`- [${i.type}] ${i.status ?? ''} ${i.url ?? ''} ${i.message ?? ''}`.trim());
  }
  if (r.screenshot) lines.push(`- 截图: ${r.screenshot}`);
  lines.push('');
}
fs.writeFileSync(path.join(outDir, 'report.md'), lines.join('\n'));

console.log(JSON.stringify({ outDir, summary: report.summary, login: report.login }, null, 2));

await context.close();
await browser.close();
