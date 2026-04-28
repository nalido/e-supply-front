import { chromium } from 'playwright';

const baseUrl = process.env.ESUPPLY_BASE_URL || 'http://127.0.0.1:4173';
const username = process.env.ESUPPLY_E2E_USERNAME || 'admin@huaaosoft.com';
const password = process.env.ESUPPLY_E2E_PASSWORD || 'Test@2027';

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function login(page) {
  await page.goto(`${baseUrl}/welcome`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.getByRole('button', { name: '登录系统' }).click();

  const identifierInput = page
    .locator('input[name="identifier"], input[type="email"], input[name="username"], input[name="emailAddress"]')
    .first();
  await identifierInput.waitFor({ timeout: 30000 });
  await identifierInput.fill(username);
  await page.getByRole('button', { name: /继续|Continue|Sign in|下一步/i }).first().click();

  const passwordInput = page.locator('input[type="password"]').first();
  await passwordInput.waitFor({ timeout: 30000 });
  await passwordInput.fill(password);
  await page.getByRole('button', { name: /继续|Continue|Sign in|登录/i }).first().click();

  await page.waitForURL(/dashboard|workplace/, { timeout: 60000 });
}

const attachErrorCollectors = (page, bucket) => {
  page.on('pageerror', (error) => {
    bucket.push(`pageerror: ${error.message}`);
  });
  page.on('console', (message) => {
    if (message.type() === 'error') {
      bucket.push(`console: ${message.text()}`);
    }
  });
};

async function verifyRoute(page, route, headingText) {
  await page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForURL(new RegExp(`${route.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`), { timeout: 30000 });
  await page.locator('h2.scw-page-title').getByText(headingText, { exact: true }).waitFor({ timeout: 30000 });
  await sleep(1500);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const mainErrors = [];
  const saleErrors = [];
  attachErrorCollectors(page, mainErrors);

  const results = [];

  try {
    await login(page);

    const popupPromise = page.waitForEvent('popup');
    await page.locator('a[href="/sale/workbench"]').click();
    const salePage = await popupPromise;
    attachErrorCollectors(salePage, saleErrors);
    await salePage.waitForLoadState('domcontentloaded');
    await salePage.getByRole('heading', { name: '今日工作台' }).waitFor({ timeout: 30000 });
    results.push('销售中心新标签页入口可打开');

    await verifyRoute(salePage, '/sale/workbench', '今日工作台');
    await salePage.getByText('今日经营异常度').waitFor({ timeout: 10000 });
    results.push('今日工作台可访问并展示摘要指标');

    await verifyRoute(salePage, '/sale/products/sync', '商品同步');
    await salePage.getByTestId('product-sync-start').waitFor({ timeout: 10000 });
    results.push('商品同步页可访问并展示任务操作区');

    await verifyRoute(salePage, '/sale/products/bindings', '商品绑定');
    const bindingList = salePage.locator('[data-testid="binding-list"]');
    await bindingList.waitFor({ timeout: 10000 });
    const bindingScrollable = await bindingList.evaluate((node) => {
      const element = node;
      const styles = window.getComputedStyle(element);
      return element.scrollHeight > element.clientHeight || styles.overflowY === 'auto' || styles.overflowY === 'scroll';
    });
    assert(bindingScrollable, '商品绑定列表区域不可滚动');
    results.push('商品绑定列表可滚动');

    const bindingCardCount = await salePage.locator('[data-testid="binding-card"]').count();
    assert(bindingCardCount > 0, '商品绑定页没有可用于手工绑定的测试数据');
    await salePage.locator('[data-testid="binding-card"]').first().click();
    await salePage.getByText('商品绑定详情').waitFor({ timeout: 10000 });

    const styleSelect = salePage.locator('.ant-drawer .ant-select').nth(0);
    await styleSelect.click();
    await salePage.keyboard.type('123', { delay: 40 });
    await sleep(1200);
    const filteredStyleOptions = await salePage.locator('.ant-select-dropdown .ant-select-item-option').count();
    assert(filteredStyleOptions > 0, '手工绑定搜索款式后没有返回结果');
    await salePage.keyboard.press('ArrowDown');
    await salePage.keyboard.press('Enter');
    await sleep(1000);
    results.push('商品绑定手工搜索款式可输入并返回结果');

    const variantSelect = salePage.locator('.ant-drawer .ant-select').nth(1);
    await variantSelect.click();
    await sleep(800);
    const variantOptions = await salePage.locator('.ant-select-dropdown .ant-select-item-option').count();
    assert(variantOptions > 0, '手工绑定未返回可选规格');
    await salePage.keyboard.press('ArrowDown');
    await salePage.keyboard.press('Enter');
    await sleep(500);
    await salePage.getByTestId('binding-submit').click();
    await salePage.locator('.ant-message-notice').waitFor({ timeout: 10000 });
    await sleep(1000);
    results.push('商品绑定手工绑定可提交并返回成功反馈');

    await verifyRoute(salePage, '/sale/orders/issues', '问题订单');
    const issueList = salePage.locator('[data-testid="issue-list"]');
    await issueList.waitFor({ timeout: 10000 });
    const issueCardCount = await salePage.locator('.scw-issue-card').count();
    if (issueCardCount > 0) {
      await salePage.getByTestId('issue-handle-button').first().click();
      await salePage.getByText('问题订单处理').waitFor({ timeout: 10000 });
      await salePage.getByRole('button', { name: '去商品绑定' }).click();
      results.push('问题订单页存在可处理订单且抽屉可打开');
    } else {
      await salePage.getByText('当前筛选条件下没有问题订单').waitFor({ timeout: 10000 });
      results.push('问题订单页空态正常');
    }

    await verifyRoute(salePage, '/sale/insights/risk', '经营数据总览');
    await salePage.getByText('风险影响榜').waitFor({ timeout: 10000 });
    results.push('经营数据总览页可访问并展示风险榜');

    await verifyRoute(salePage, '/sale/shops', '店铺管理');
    await salePage.getByTestId('shop-create-button').click();
    const shopDialog = salePage.getByRole('dialog');
    await shopDialog.getByText('新建店铺', { exact: true }).waitFor({ timeout: 10000 });
    await salePage.getByTestId('shop-drawer-save').click();
    await shopDialog.getByText('请输入店铺名称').waitFor({ timeout: 10000 });
    await salePage.getByTestId('shop-drawer-cancel').click();
    results.push('店铺管理页表单可打开并触发必填校验');

    await verifyRoute(salePage, '/sale/governance/sync', '同步任务与日志');
    const detailButtons = salePage.getByTestId('governance-detail-button');
    if (await detailButtons.count()) {
      await detailButtons.first().click();
      await salePage.getByText('任务详情').waitFor({ timeout: 10000 });
      await salePage.keyboard.press('Escape');
      results.push('治理页任务详情抽屉可打开');
    } else {
      results.push('治理页可访问');
    }

    await sleep(1500);
    assert(mainErrors.length === 0, `主系统页面存在控制台错误: ${mainErrors.join(' | ')}`);
    assert(saleErrors.length === 0, `销售中心页面存在控制台错误: ${saleErrors.join(' | ')}`);

    console.log(JSON.stringify({ ok: true, results }, null, 2));
  } catch (error) {
    console.error(JSON.stringify({ ok: false, error: String(error), mainErrors, saleErrors, results }, null, 2));
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

await main();
