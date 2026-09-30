#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptDir, '..');
const baseUrl = process.env.ESUPPLY_FRONT_BASE_URL || 'http://127.0.0.1:5186';
const bearerToken = process.env.ESUPPLY_BEARER_TOKEN;
const styleKeyword = process.env.ESUPPLY_STYLE_KEYWORD;
const materialNames = (process.env.ESUPPLY_MATERIAL_NAMES || '').split('|').filter(Boolean);
const orderQuantity = Number(process.env.ESUPPLY_ORDER_QUANTITY || '20');
const outputDir = process.env.ESUPPLY_VERIFY_DIR
  || path.resolve(appRoot, '../docs/e-supply/04-verification/factory-order-material-inventory-20260930-multiple');

const ensure = (condition, message) => {
  if (!condition) throw new Error(message);
};

ensure(bearerToken, 'missing ESUPPLY_BEARER_TOKEN');
ensure(styleKeyword, 'missing ESUPPLY_STYLE_KEYWORD');
ensure(materialNames.length === 3, 'ESUPPLY_MATERIAL_NAMES must contain three pipe-separated names');
ensure(Number.isFinite(orderQuantity) && orderQuantity > 0, 'invalid ESUPPLY_ORDER_QUANTITY');
fs.mkdirSync(outputDir, { recursive: true });

const orderNo = `ORDER-WARNING-${Date.now()}`;
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1680, height: 1050 } });
const page = await context.newPage();
const result = {
  passed: false,
  baseUrl,
  orderNo,
  styleKeyword,
  orderQuantity,
  assertions: {},
  consoleErrors: [],
  pageErrors: [],
  failedResponses: [],
};

await page.route('**/api/**', async (route) => {
  await route.continue({
    headers: {
      ...route.request().headers(),
      Authorization: `Bearer ${bearerToken}`,
      'X-Tenant-Id': '1',
    },
  });
});

page.on('console', (message) => {
  if (message.type() === 'error' && !message.text().startsWith('Warning:')) {
    result.consoleErrors.push(message.text());
  }
});
page.on('pageerror', (error) => result.pageErrors.push(String(error)));
page.on('response', (response) => {
  if (response.url().includes('/api/') && response.status() >= 400) {
    const url = new URL(response.url());
    result.failedResponses.push({ status: response.status(), path: `${url.pathname}${url.search}` });
  }
});

try {
  await page.goto(`${baseUrl}/orders/factory`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.getByTestId('factory-orders-search-input').waitFor({ state: 'visible', timeout: 45_000 });
  await page.getByRole('button', { name: '新建工厂订单' }).click();

  const createModal = page.locator('.ant-modal:visible').filter({ hasText: '新建工厂订单' }).first();
  await createModal.waitFor({ state: 'visible', timeout: 20_000 });
  await createModal.getByTestId('factory-order-create-order-no').fill(orderNo);

  const styleSelect = createModal.getByTestId('factory-order-create-style-select');
  await styleSelect.click();
  const styleInput = styleSelect.locator('input').first();
  await styleInput.fill(styleKeyword);
  await page.waitForTimeout(500);
  const styleOption = page.locator('.ant-select-dropdown:visible .ant-select-item-option')
    .filter({ hasText: styleKeyword })
    .first();
  await styleOption.waitFor({ state: 'visible', timeout: 30_000 });
  await styleOption.click();

  for (const materialName of materialNames) {
    await createModal.getByText(materialName, { exact: true }).waitFor({ state: 'visible', timeout: 30_000 });
  }

  const unitPriceInput = createModal.locator('.ant-form-item')
    .filter({ hasText: '单价（元/件）' })
    .locator('input[role="spinbutton"]')
    .first();
  await unitPriceInput.fill('12');

  const matrix = createModal.getByTestId('factory-order-create-quantity-matrix');
  const quantityInputs = matrix.locator('input[role="spinbutton"]');
  await quantityInputs.first().waitFor({ state: 'visible', timeout: 30_000 });
  ensure(await quantityInputs.count() === 1, `expected one color-size quantity cell, got ${await quantityInputs.count()}`);
  await quantityInputs.first().fill(String(orderQuantity));

  const createResponsePromise = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return response.request().method() === 'POST'
      && url.pathname === '/api/v1/production-orders'
      && response.status() === 201;
  }, { timeout: 45_000 });
  const materialResponsePromise = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return response.request().method() === 'GET'
      && /\/api\/v1\/production-orders\/\d+\/material-details$/.test(url.pathname)
      && response.status() === 200;
  }, { timeout: 45_000 });

  await createModal.getByRole('button', { name: /创\s*建/ }).click();
  const createResponse = await createResponsePromise;
  const createRequest = createResponse.request().postDataJSON();
  const createPayload = await createResponse.json();
  const createdOrder = createPayload.order || createPayload;
  ensure(Number(createdOrder.totalQuantity) === orderQuantity, `created order total quantity mismatch: ${JSON.stringify(createdOrder)}`);
  ensure(
    Array.isArray(createRequest.lines)
      && createRequest.lines.length === 1
      && Number(createRequest.lines[0].quantity) === orderQuantity,
    `create line quantity mismatch: ${JSON.stringify(createRequest.lines)}`,
  );

  const materialResponse = await materialResponsePromise;
  const materialDetail = await materialResponse.json();
  ensure(materialDetail.shortage === true, `created order shortage flag missing: ${JSON.stringify(materialDetail)}`);
  ensure((materialDetail.items || []).length === 3, `created order material row count mismatch: ${JSON.stringify(materialDetail)}`);

  const warningModal = page.locator('.ant-modal:visible').filter({ hasText: `面辅料明细 - ${orderNo}` });
  await warningModal.getByText('面辅料库存不足', { exact: true }).waitFor({ state: 'visible', timeout: 30_000 });
  const expectedRows = [
    { name: materialNames[0], expected: '24 米', available: '8 米', safety: '3 米', suggested: '19 米' },
    { name: materialNames[1], expected: '10 米', available: '4 米', safety: '2 米', suggested: '8 米' },
    { name: materialNames[2], expected: '40 个', available: '15 个', safety: '10 个', suggested: '35 个' },
  ];
  const rows = [];
  for (const expected of expectedRows) {
    const row = warningModal.locator('.ant-table-tbody tr').filter({ hasText: expected.name }).first();
    await row.waitFor({ state: 'visible' });
    const text = await row.innerText();
    for (const value of [expected.expected, expected.available, expected.safety, expected.suggested]) {
      ensure(text.includes(value), `${expected.name} missing ${value}: ${text}`);
    }
    ensure(await row.locator('img').count() > 0, `${expected.name} image missing`);
    rows.push({ ...expected, imageVisible: true });
  }

  result.assertions = {
    createdOrderId: Number(createdOrder.id),
    createdOrderTotalQuantity: Number(createdOrder.totalQuantity),
    createRequestLineQuantity: Number(createRequest.lines[0].quantity),
    materialDetailRequestedAfterCreate: true,
    shortageModalOpenedAutomatically: true,
    formula: '建议采购量 = 预计用量 + 安全库存 - 可用库存',
    rows,
  };
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(outputDir, '07-create-order-shortage-warning.png'), fullPage: true });

  result.failedResponses = result.failedResponses.filter((item) => !item.path.includes('/api/v1/auth/onboarding/status'));
  result.consoleErrors = result.consoleErrors.filter((item) => !item.includes('Failed to load resource: the server responded with a status of 401'));
  ensure(result.consoleErrors.length === 0, `console errors: ${result.consoleErrors.join('\n')}`);
  ensure(result.pageErrors.length === 0, `page errors: ${result.pageErrors.join('\n')}`);
  ensure(result.failedResponses.length === 0, `failed API responses: ${JSON.stringify(result.failedResponses)}`);
  result.passed = true;
  fs.writeFileSync(path.join(outputDir, 'create-warning-ui-result.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  result.error = String(error);
  result.url = page.url();
  result.bodyText = (await page.locator('body').innerText().catch(() => '')).slice(0, 2400);
  await page.screenshot({ path: path.join(outputDir, 'create-warning-ui-failed.png'), fullPage: true }).catch(() => undefined);
  fs.writeFileSync(path.join(outputDir, 'create-warning-ui-result.json'), JSON.stringify(result, null, 2));
  console.error(JSON.stringify(result, null, 2));
  process.exitCode = 1;
} finally {
  await browser.close();
}
