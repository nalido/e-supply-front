import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const appRoot = process.cwd();
const baseUrl = process.env.ESUPPLY_BASE_URL || 'http://127.0.0.1:5173';
const storageState = process.env.ESUPPLY_STORAGE_STATE
  || path.join(appRoot, 'logs/route-sweep-auth-dev.json');
const outputDir = process.env.ESUPPLY_OUTPUT_DIR
  || path.resolve(appRoot, '../docs/e-supply/04-verification/factory-order-style-search-20260827');

fs.mkdirSync(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  storageState: fs.existsSync(storageState) ? storageState : undefined,
  viewport: { width: 1440, height: 1000 },
});
const page = await context.newPage();
const consoleErrors = [];
const failedRequests = [];

page.on('console', (message) => {
  if (message.type() === 'error') {
    consoleErrors.push(message.text());
  }
});
page.on('requestfailed', (request) => {
  failedRequests.push({ url: request.url(), error: request.failure()?.errorText });
});

const result = {
  ok: false,
  baseUrl,
  styleTotal: 0,
  targetStyle: undefined,
  searchKeyword: '',
  searchRequestUrl: '',
  searchResultCount: 0,
  selectedLabel: '',
  screenshots: [],
  consoleErrors,
  failedRequests,
};

try {
  await page.goto(`${baseUrl}/orders/factory`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
  if (/sign-in|accounts|clerk/i.test(page.url())) {
    throw new Error(`登录态失效，当前页面：${page.url()}`);
  }

  const initialResponsePromise = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return url.pathname === '/api/v1/styles' && !url.searchParams.get('keyword');
  }, { timeout: 30_000 });
  await page.getByRole('button', { name: '新建工厂订单' }).click();
  const initialResponse = await initialResponsePromise;
  if (!initialResponse.ok()) {
    throw new Error(`初始款式查询失败：HTTP ${initialResponse.status()}`);
  }
  const initialPayload = await initialResponse.json();
  const initialUrl = new URL(initialResponse.url());
  const tenantId = initialUrl.searchParams.get('tenantId');
  const styleTotal = Number(initialPayload.total ?? 0);
  result.styleTotal = styleTotal;
  if (!tenantId || styleTotal <= 50) {
    throw new Error(`缺少可验证的旧款式样本：tenantId=${tenantId || '空'}，款式总数=${styleTotal}`);
  }

  const token = await page.evaluate(async () => {
    const clerk = window.Clerk;
    return clerk?.session ? clerk.session.getToken() : undefined;
  });
  if (!token) {
    throw new Error('无法取得当前登录会话');
  }

  const lastPage = Math.floor((styleTotal - 1) / 50);
  const oldStylePayload = await page.evaluate(async ({ targetTenantId, targetPage, bearerToken }) => {
    const response = await fetch(
      `/api/v1/styles?tenantId=${encodeURIComponent(targetTenantId)}&page=${targetPage}&size=50`,
      { headers: { Authorization: `Bearer ${bearerToken}` } },
    );
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return response.json();
  }, { targetTenantId: tenantId, targetPage: lastPage, bearerToken: token });
  const targetStyle = oldStylePayload.items?.at(-1);
  if (!targetStyle?.id || !targetStyle.styleNo) {
    throw new Error('最后一页没有可用的旧款式样本');
  }
  const initialIds = new Set((initialPayload.items ?? []).map((item) => Number(item.id)));
  if (initialIds.has(Number(targetStyle.id))) {
    throw new Error(`旧款式样本 ${targetStyle.styleNo} 意外出现在首次 50 条中`);
  }
  result.targetStyle = {
    id: targetStyle.id,
    styleNo: targetStyle.styleNo,
    styleName: targetStyle.styleName,
    lastPage,
  };

  const styleSelect = page.locator('[data-testid="factory-order-create-style-select"]');
  await styleSelect.click();
  const searchInput = styleSelect.locator('input');
  const normalizedStyleNo = String(targetStyle.styleNo).trim();
  const searchKeyword = normalizedStyleNo.length > 3
    ? normalizedStyleNo.slice(1, -1)
    : normalizedStyleNo;
  result.searchKeyword = searchKeyword;

  const searchResponsePromise = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return url.pathname === '/api/v1/styles'
      && url.searchParams.get('keyword') === searchKeyword;
  }, { timeout: 30_000 });
  await searchInput.fill(searchKeyword);
  const searchResponse = await searchResponsePromise;
  result.searchRequestUrl = searchResponse.url().replace(/tenantId=[^&]+/, 'tenantId=<tenant>');
  if (!searchResponse.ok()) {
    throw new Error(`模糊搜索请求失败：HTTP ${searchResponse.status()}`);
  }
  const searchPayload = await searchResponse.json();
  result.searchResultCount = Number(searchPayload.total ?? 0);
  const matchedTarget = (searchPayload.items ?? []).some((item) => Number(item.id) === Number(targetStyle.id));
  if (!matchedTarget) {
    throw new Error(`服务端模糊搜索结果未包含旧款式 ${targetStyle.styleNo}`);
  }

  const targetLabel = `${targetStyle.styleNo} / ${targetStyle.styleName}`;
  const targetOption = page.getByText(targetLabel, { exact: true }).last();
  await targetOption.waitFor({ state: 'visible', timeout: 10_000 });
  const searchScreenshot = path.join(outputDir, 'factory-order-style-search-result.png');
  await page.screenshot({ path: searchScreenshot });
  result.screenshots.push(path.basename(searchScreenshot));

  await targetOption.click();
  const selectedLabel = (await styleSelect.locator('.ant-select-selection-item').first().textContent())?.trim() ?? '';
  result.selectedLabel = selectedLabel;
  if (!selectedLabel.includes(targetStyle.styleNo)) {
    throw new Error(`款式选择未生效，当前显示：${selectedLabel}`);
  }
  const selectedScreenshot = path.join(outputDir, 'factory-order-style-selected.png');
  await page.locator('.ant-modal:visible').screenshot({ path: selectedScreenshot });
  result.screenshots.push(path.basename(selectedScreenshot));

  result.ok = true;
} catch (error) {
  result.error = error instanceof Error ? error.message : String(error);
  const failureScreenshot = path.join(outputDir, 'factory-order-style-search-failure.png');
  await page.screenshot({ path: failureScreenshot, fullPage: true }).catch(() => {});
  result.screenshots.push(path.basename(failureScreenshot));
  process.exitCode = 1;
} finally {
  fs.writeFileSync(path.join(outputDir, 'result.json'), `${JSON.stringify(result, null, 2)}\n`);
  await browser.close();
  console.log(JSON.stringify(result, null, 2));
}
