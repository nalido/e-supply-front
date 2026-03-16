import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const baseUrl = process.env.ESUPPLY_BASE_URL || 'http://127.0.0.1:5173';
const email = process.env.ESUPPLY_LOGIN_EMAIL;
const password = process.env.ESUPPLY_LOGIN_PASSWORD;

if (!email || !password) {
  console.error('Missing ESUPPLY_LOGIN_EMAIL or ESUPPLY_LOGIN_PASSWORD');
  process.exit(2);
}

const outDir = path.resolve('logs/sample-detail-click-' + Date.now());
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
});
const context = await browser.newContext({ viewport: { width: 1440, height: 1200 } });
const page = await context.newPage();

const summary = {
  ok: false,
  baseUrl,
  outDir,
  listApi: null,
  detailApi: null,
  clicked: false,
  clickedOrder: null,
  finalUrl: null,
  classification: null,
  note: null,
};

page.on('response', async (response) => {
  const url = response.url();
  if (url.includes('/api/v1/sample-orders') && !url.includes('/stats') && response.request().method() === 'GET') {
    try {
      const json = await response.json();
      if (url.match(/\/api\/v1\/sample-orders\??/)) {
        summary.listApi = {
          url,
          status: response.status(),
          total: json?.total ?? null,
          items: Array.isArray(json?.items)
            ? json.items.slice(0, 5).map((item) => ({ id: item.id, sampleNo: item.sampleNo, styleName: item.styleName }))
            : null,
        };
      } else if (url.match(/\/api\/v1\/sample-orders\/\d+/)) {
        summary.detailApi = {
          url,
          status: response.status(),
        };
      }
    } catch {}
  }
});

async function shot(name) {
  await page.screenshot({ path: path.join(outDir, name), fullPage: true });
}

try {
  await page.goto(`${baseUrl}/welcome`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await shot('01-welcome.png');

  await page.getByRole('button', { name: '登录系统' }).click({ timeout: 30000 });
  await page.waitForTimeout(1500);
  await shot('02-signin-page.png');

  const userInput = page.locator('input[name="identifier"], input[type="email"], input[name="username"], input[name="emailAddress"]').first();
  await userInput.waitFor({ timeout: 30000 });
  await userInput.fill(email);
  await page.getByRole('button', { name: /继续|Continue|Sign in|下一步/i }).first().click();

  const pwdInput = page.locator('input[type="password"]').first();
  await pwdInput.waitFor({ timeout: 30000 });
  await pwdInput.fill(password);
  await page.getByRole('button', { name: /继续|Continue|Sign in|登录/i }).first().click();
  await page.waitForTimeout(8000);
  await shot('03-after-login.png');

  await page.goto(`${baseUrl}/sample/list`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(5000);
  await shot('04-sample-list.png');

  if (page.url().includes('/sign-in') || page.url().includes('/login')) {
    summary.classification = '权限/鉴权问题';
    summary.note = '访问样板单列表时被重定向回登录页';
    summary.finalUrl = page.url();
    await shot('99-auth-issue.png');
    console.log(JSON.stringify(summary, null, 2));
    process.exit(1);
  }

  if (summary.listApi?.status && summary.listApi.status >= 400) {
    summary.classification = summary.listApi.status === 401 || summary.listApi.status === 403 ? '权限/鉴权问题' : '加载失败';
    summary.note = `样板单列表接口返回 ${summary.listApi.status}`;
    summary.finalUrl = page.url();
    await shot('99-list-api-failed.png');
    console.log(JSON.stringify(summary, null, 2));
    process.exit(1);
  }

  const emptyText = page.getByText(/暂无数据|No Data|暂无样板单/).first();
  if ((summary.listApi?.total === 0) || await emptyText.isVisible().catch(() => false)) {
    summary.classification = '列表为空';
    summary.note = '样板单列表没有可点击数据';
    summary.finalUrl = page.url();
    await shot('99-list-empty.png');
    console.log(JSON.stringify(summary, null, 2));
    process.exit(1);
  }

  const listToggle = page.getByText('列表', { exact: true }).last();
  if (await listToggle.isVisible().catch(() => false)) {
    await listToggle.click();
    await page.waitForTimeout(1500);
    await shot('04b-sample-list-table-mode.png');
  }

  const viewButtons = page.locator('tbody tr button').filter({ has: page.locator('.anticon-eye') });
  const tableRows = page.locator('tbody tr');
  const cards = page.locator('.ant-list-items .ant-card');

  if (await viewButtons.count()) {
    const firstRowText = await tableRows.first().innerText().catch(() => '');
    summary.clickedOrder = { source: 'table-view-button', preview: firstRowText.slice(0, 200) };
    await viewButtons.first().click();
    summary.clicked = true;
  } else if (await tableRows.count()) {
    const firstRow = tableRows.first();
    summary.clickedOrder = { source: 'table-row', preview: (await firstRow.innerText()).slice(0, 200) };
    await firstRow.click();
    summary.clicked = true;
  } else if (await cards.count()) {
    const firstCard = cards.first();
    summary.clickedOrder = { source: 'card', preview: ((await firstCard.innerText().catch(() => '')) || '').slice(0, 200) };
    await firstCard.click();
    summary.clicked = true;
  }

  if (!summary.clicked) {
    summary.classification = '加载失败';
    summary.note = '列表页已打开，但未识别到可点击的行/卡片/查看按钮';
    summary.finalUrl = page.url();
    await shot('99-no-click-target.png');
    console.log(JSON.stringify(summary, null, 2));
    process.exit(1);
  }

  await page.waitForTimeout(4000);
  await shot('05-after-click.png');
  summary.finalUrl = page.url();

  if (!page.url().includes('/sample/detail')) {
    summary.classification = '点击跳转本身有问题';
    summary.note = '从列表点击后未进入 /sample/detail';
    await shot('99-click-navigation-failed.png');
    console.log(JSON.stringify(summary, null, 2));
    process.exit(1);
  }

  await page.waitForTimeout(4000);
  await shot('06-sample-detail.png');
  summary.ok = true;
  summary.classification = '已从列表真实点击进入详情';
  summary.note = '列表点击跳转成功，详情页已加载';
  console.log(JSON.stringify(summary, null, 2));
} catch (error) {
  summary.finalUrl = page.url();
  summary.classification = summary.classification || '加载失败';
  summary.note = String(error);
  await shot('98-exception.png').catch(() => {});
  console.log(JSON.stringify(summary, null, 2));
  process.exitCode = 1;
} finally {
  await browser.close();
}
