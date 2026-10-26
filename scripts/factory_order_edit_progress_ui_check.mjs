import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.ESUPPLY_FRONT_BASE_URL || 'http://127.0.0.1:5199';
const orderNo = process.env.ESUPPLY_FACTORY_ORDER_NO || 'PO-20260929-0030';
const outputDir = path.resolve('../docs/e-supply/04-verification/factory-order-progress-refresh-20261026');
fs.mkdirSync(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1520, height: 1050 },
});
const page = await context.newPage();
const browserErrors = [];
const apiErrors = [];
let updatePayload;

const card = {
  id: 161,
  code: orderNo,
  styleCode: 'CT0309',
  name: '订单编辑进度回归验收',
  thumbnail: '',
  materialStatus: 'ALLOCATED',
  expectedDelivery: '2026-10-31',
  orderDate: '2026-09-28',
  quantityLabel: '下单数量',
  quantityValue: '2,230 件',
  orderedQuantity: 2230,
  cuttingCompletedQuantity: 2225,
  sewingCompletedQuantity: 2225,
  deliveredQuantity: 2225,
  statusKey: 'RELEASED',
  completed: false,
  deletable: false,
  progress: [
    { key: 'cutting', label: '裁剪', value: '2,225 / 2,230', percent: 99, status: 'completed' },
    { key: 'sewing', label: '车缝', value: '分配99% / 完成99%', percent: 99, status: 'completed' },
  ],
};

const detail = {
  order: {
    id: 161,
    orderNo,
    styleId: 901,
    totalQuantity: 2230,
    expectedDelivery: '2026-10-31',
    placedAt: '2026-09-28T17:35:12',
    status: 'RELEASED',
    materialStatus: 'ALLOCATED',
    remarks: '进度聚合回归验收',
  },
  lines: [
    { id: 1, color: '藏青', size: 'M', orderedQty: 1115, completedQuantity: 1115, unitPrice: 1.72 },
    { id: 2, color: '灰色', size: 'L', orderedQty: 1115, completedQuantity: 1110, unitPrice: 1.72 },
  ],
};

await page.route('**/api/**', async (route) => {
  const request = route.request();
  const url = new URL(request.url());
  const pathname = url.pathname;
  if (!pathname.startsWith('/api/')) {
    await route.continue();
    return;
  }
  if (/\/api\/v1\/production-orders\/\d+\/update$/.test(pathname)) {
    updatePayload = request.postDataJSON();
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(detail) });
    return;
  }
  let body = {};
  if (pathname === '/api/v1/auth/onboarding/status') {
    body = { linked: true, tenantId: 1, userId: 20, tenantName: '页面验收企业', billing: { status: 'ACTIVE' } };
  } else if (pathname === '/api/v1/settings/company/overview') {
    body = {
      id: '1',
      name: '页面验收企业',
      stats: {},
      modules: [],
      tenants: [{ id: '1', name: '页面验收企业', isCurrent: true }],
      billing: { status: 'ACTIVE' },
    };
  } else if (pathname === '/api/v1/production-orders/summary') {
    body = {
      metrics: [],
      statusTabs: [{ key: 'RELEASED', label: '生产中', styles: 1, orders: 1, quantity: 2230 }],
    };
  } else if (pathname === '/api/v1/production-orders/cards') {
    body = { list: [card], total: 1, page: 0, size: 40 };
  } else if (pathname === '/api/v1/production-orders/161') {
    body = detail;
  } else if (pathname === '/api/v1/production-orders/161/progress') {
    body = [
      {
        id: 1103,
        nodeCode: 'CUTTING',
        nodeName: '裁剪',
        sequenceNo: 4,
        status: 'COMPLETED',
        payloadJson: JSON.stringify({
          orderedQuantity: 2230,
          allocatedQuantity: 2225,
          completedQuantity: 2225,
          completedPercent: 99,
          shortCompletionReason: '单床数',
          allocations: [{
            allocationId: 'cutting-312',
            workOrderId: 312,
            source: 'CUTTING_SHEET_BED',
            items: [
              { color: '藏青', size: 'M', quantity: 1115 },
              { color: '灰色', size: 'L', quantity: 1110 },
            ],
          }],
        }),
      },
      {
        id: 1104,
        nodeCode: 'SEWING',
        nodeName: '车缝',
        sequenceNo: 5,
        status: 'COMPLETED',
        completedAt: '2026-10-25T16:13:52',
        payloadJson: JSON.stringify({
          orderedQuantity: 2230,
          allocatedQuantity: 2225,
          completedQuantity: 2225,
          completedPercent: 99,
          upstreamAvailableQuantity: 2225,
          claimedQuantity: 2225,
          availableToClaimQuantity: 0,
          completionMode: 'UPSTREAM_SHORT_CUT',
          upstreamShortCutReason: '单床数',
          allocations: [
            {
              allocationId: 'sewing-313',
              workOrderId: 313,
              items: [{ color: '藏青', size: 'M', quantity: 1115 }],
            },
            {
              allocationId: 'sewing-314',
              workOrderId: 314,
              items: [{ color: '灰色', size: 'L', quantity: 1110 }],
            },
          ],
        }),
      },
    ];
  } else if (pathname === '/api/v1/styles') {
    body = {
      items: [{
        id: 901,
        tenantId: 1,
        styleNo: 'CT0309',
        styleName: '订单编辑进度回归验收',
        status: 'ACTIVE',
        colors: ['藏青', '灰色'],
        sizes: ['M', 'L'],
      }],
      total: 1,
      page: 0,
      size: 50,
    };
  } else if (pathname === '/api/v1/styles/901') {
    body = {
      id: 901,
      tenantId: 1,
      styleNo: 'CT0309',
      styleName: '订单编辑进度回归验收',
      defaultUnit: '件',
      status: 'ACTIVE',
      variants: [
        { id: 1, color: '藏青', size: 'M', attributes: {} },
        { id: 2, color: '灰色', size: 'L', attributes: {} },
      ],
    };
  } else if (pathname === '/api/v1/styles/901/bom-materials') {
    body = [];
  } else if (pathname === '/api/v1/partners') {
    body = { items: [], total: 0, page: 0, size: 200 };
  } else if (pathname === '/api/v1/sample-orders/meta') {
    body = { merchandisers: [] };
  } else if (pathname === '/api/v1/materials') {
    body = { items: [], total: 0, page: 0, size: 500 };
  }
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
});

page.on('console', (message) => {
  if (message.type() === 'error') browserErrors.push(message.text());
});
page.on('pageerror', (error) => browserErrors.push(error.message));
page.on('response', (response) => {
  if (response.url().includes('/api/') && response.status() >= 400) {
    apiErrors.push(`${response.status()}:${response.url()}`);
  }
});

const result = {
  passed: false,
  baseUrl,
  orderNo,
  assertions: {},
  screenshots: [],
  browserErrors,
  apiErrors,
};

try {
  await page.goto(`${baseUrl}/piecework/orders`, { waitUntil: 'networkidle', timeout: 60_000 });
  const search = page.getByTestId('factory-orders-search-input');
  await search.waitFor({ state: 'visible', timeout: 30_000 });
  await page.evaluate(() => localStorage.setItem('factory-orders-view-mode', 'card'));
  await page.reload({ waitUntil: 'networkidle' });
  await search.fill(orderNo);
  await search.press('Enter');

  const orderCard = page.locator('.factory-order-card-shell').filter({ hasText: orderNo }).first();
  await orderCard.waitFor({ state: 'visible', timeout: 30_000 });
  await orderCard.getByText('99%', { exact: true }).first().waitFor({ state: 'visible' });
  const cardScreenshot = path.join(outputDir, 'factory-order-card.png');
  await orderCard.screenshot({ path: cardScreenshot });
  result.screenshots.push(path.basename(cardScreenshot));
  result.assertions.incompleteProgressDoesNotShow100Percent = true;

  const sewingStep = orderCard.locator('.factory-order-progress-step').filter({ hasText: '车缝' }).first();
  await sewingStep.locator('.factory-order-progress-node').click();
  const progressModal = page.locator('.ant-modal:visible').filter({ hasText: '执行节点：车缝' }).last();
  await progressModal.waitFor({ state: 'visible', timeout: 30_000 });
  await progressModal.getByText('车缝已随上游短裁完成', { exact: true }).waitFor({ state: 'visible' });
  await progressModal.getByText(/短裁原因：单床数/).waitFor({ state: 'visible' });
  const progressScreenshot = path.join(outputDir, 'factory-order-sewing-short-cut-completed.png');
  await progressModal.screenshot({ path: progressScreenshot });
  result.screenshots.push(path.basename(progressScreenshot));
  result.assertions.sewingCompletionInheritsShortCutReason = true;
  await progressModal.getByText('关 闭', { exact: true }).click();

  await orderCard.getByText('编辑', { exact: true }).click();
  const modal = page.locator('.ant-modal:visible').filter({ hasText: `编辑工厂订单 - ${orderNo}` }).last();
  await modal.waitFor({ state: 'visible', timeout: 30_000 });
  await modal.getByText('保 存', { exact: true }).waitFor({ state: 'visible' });
  const modalScreenshot = path.join(outputDir, 'factory-order-edit-modal.png');
  await modal.screenshot({ path: modalScreenshot });
  result.screenshots.push(path.basename(modalScreenshot));

  await modal.getByText('保 存', { exact: true }).click();
  await page.waitForFunction(() => document.body.textContent?.includes('工厂订单'), null, { timeout: 10_000 });
  for (let attempt = 0; attempt < 40 && !updatePayload; attempt += 1) {
    await page.waitForTimeout(100);
  }
  if (!updatePayload) throw new Error('未捕获到工厂订单更新请求');
  if (Object.hasOwn(updatePayload, 'completedQuantity')) {
    throw new Error(`编辑请求不应提交完成数量：${updatePayload.completedQuantity}`);
  }
  if (!Array.isArray(updatePayload.lines) || !updatePayload.lines.length) {
    throw new Error('编辑请求缺少订单明细');
  }
  result.assertions.updatePayloadOmitsCompletedQuantity = true;
  result.assertions.lineCount = updatePayload.lines.length;
  result.browserErrors = browserErrors.filter((item) => (
    !item.includes('[antd: message] Static function can not consume context')
    && !item.includes('Instance created by `useForm` is not connected to any Form element')
  ));
  result.passed = result.browserErrors.length === 0 && apiErrors.length === 0;
  if (!result.passed) throw new Error('页面存在未忽略的接口或控制台错误');
} catch (error) {
  result.error = error instanceof Error ? error.message : String(error);
  result.url = page.url();
  result.bodyText = (await page.locator('body').innerText().catch(() => '')).slice(0, 2000);
  const failureScreenshot = path.join(outputDir, 'factory-order-edit-ui-failed.png');
  await page.screenshot({ path: failureScreenshot, fullPage: true }).catch(() => {});
  result.screenshots.push(path.basename(failureScreenshot));
  process.exitCode = 1;
} finally {
  await browser.close();
  fs.writeFileSync(
    path.join(outputDir, 'result.json'),
    `${JSON.stringify(result, null, 2)}\n`,
    'utf8',
  );
}

console.log(JSON.stringify(result, null, 2));
