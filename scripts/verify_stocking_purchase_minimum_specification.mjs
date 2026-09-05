#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptDir, '..');
const baseUrl = process.env.ESUPPLY_BASE_URL || 'http://127.0.0.1:5176';
const storageState = process.env.ESUPPLY_STORAGE_STATE
  || path.join(appRoot, 'logs/route-sweep-auth.json');
const outputDir = process.env.ESUPPLY_VERIFY_DIR
  || path.resolve(appRoot, '../docs/e-supply/04-verification/stocking-purchase-minimum-specification-20260905');
const materialKeyword = process.env.ESUPPLY_MATERIAL_KEYWORD || 'FAB-1779940868091';
const specificationKeyword = process.env.ESUPPLY_SPECIFICATION_KEYWORD || '藏青';

const ensure = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const loadEnvFile = (filePath) => {
  if (!fs.existsSync(filePath)) {
    return;
  }
  for (const rawLine of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || !line.includes('=')) {
      continue;
    }
    const separator = line.indexOf('=');
    const key = line.slice(0, separator);
    const value = line.slice(separator + 1).replace(/^["']|["']$/g, '');
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
};

const loginIfRequired = async (pageInstance) => {
  await pageInstance.waitForTimeout(1_500);
  const loginButton = pageInstance.getByRole('button', { name: '登录系统' });
  const loginVisible = await loginButton.isVisible().catch(() => false);
  if (!pageInstance.url().includes('/welcome') && !loginVisible) {
    return;
  }
  loadEnvFile(path.resolve(appRoot, '../e-supply-back/src/main/resources/.env'));
  const email = process.env.ESUPPLY_ADMIN_EMAIL;
  const password = process.env.ESUPPLY_ADMIN_PASSWORD;
  ensure(email && password, 'saved login expired and local admin credentials are unavailable');

  await loginButton.click();
  const identifierInput = pageInstance.locator('input[name="identifier"], input[type="email"]').first();
  await identifierInput.waitFor({ timeout: 30_000 });
  await identifierInput.fill(email);
  await pageInstance.getByRole('button', { name: /继续|Continue|Sign in|下一步/i }).first().click();
  const passwordInput = pageInstance.locator('input[type="password"]').first();
  await passwordInput.waitFor({ timeout: 30_000 });
  await passwordInput.fill(password);
  await pageInstance.getByRole('button', { name: /继续|Continue|Sign in|登录/i }).first().click();
  await pageInstance.waitForURL(
    (url) => url.origin === new URL(baseUrl).origin && !url.pathname.includes('/welcome'),
    { timeout: 60_000 },
  );
  await pageInstance.context().storageState({ path: storageState });
};

const openSelectOptions = async (input) => {
  await input.click();
  const listId = await input.getAttribute('aria-controls');
  ensure(listId, 'select input did not expose its option list');
  const dropdown = page.locator(`[id="${listId}"]`)
    .locator('xpath=ancestor::div[contains(@class, "ant-select-dropdown")]')
    .first();
  await dropdown.waitFor({ state: 'visible', timeout: 20_000 });
  const options = dropdown.locator('.ant-select-item-option:not(.ant-select-item-option-disabled)');
  await options.first().waitFor({ timeout: 20_000 });
  return { dropdown, options };
};

fs.mkdirSync(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1840, height: 900 },
  storageState,
});
const page = await context.newPage();
const result = {
  baseUrl,
  materialKeyword,
  specificationKeyword,
  request: null,
  response: null,
  detail: null,
  cleanup: null,
  consoleErrors: [],
  consoleWarnings: [],
  pageErrors: [],
  failedResponses: [],
};

let createRequest;
let createResponse;

page.on('console', (message) => {
  if (message.type() === 'error') {
    if (message.text().startsWith('Warning:')) {
      result.consoleWarnings.push(message.text());
    } else {
      result.consoleErrors.push(message.text());
    }
  }
});
page.on('pageerror', (error) => result.pageErrors.push(String(error)));
page.on('request', (request) => {
  if (request.method() === 'POST' && /\/api\/v1\/procurement\/orders(?:\?|$)/.test(request.url())) {
    createRequest = request;
    result.request = request.postDataJSON();
  }
});
page.on('response', async (response) => {
  if (response.status() >= 400) {
    const url = new URL(response.url());
    result.failedResponses.push({ status: response.status(), path: `${url.pathname}${url.search}` });
  }
  if (response.request() === createRequest) {
    createResponse = response;
    result.response = {
      status: response.status(),
      body: await response.json().catch(() => null),
    };
  }
});

try {
  await page.goto(`${baseUrl}/material/purchase-prep`, {
    waitUntil: 'domcontentloaded',
    timeout: 60_000,
  });
  await loginIfRequired(page);
  if (!page.url().includes('/material/purchase-prep')) {
    await page.goto(`${baseUrl}/material/purchase-prep`, { waitUntil: 'domcontentloaded' });
  }
  const createButton = page.locator('button').filter({ hasText: '备料采购' }).first();
  await createButton.waitFor({ timeout: 45_000 });
  await createButton.click();
  await page.getByText('创建备料采购单', { exact: true }).waitFor({ timeout: 20_000 });

  const modal = page.locator('.ant-modal:visible');
  const supplierSelect = modal.locator('.ant-form-item').filter({ hasText: '供应商' }).locator('.ant-select').first();
  const supplierInput = supplierSelect.locator('input');
  const { dropdown: supplierDropdown, options: supplierOptions } = await openSelectOptions(supplierInput);
  await supplierOptions.first().waitFor({ timeout: 10_000 });
  await supplierInput.press('ArrowDown');
  await supplierInput.press('Enter');
  await supplierDropdown.waitFor({ state: 'hidden', timeout: 10_000 });
  await supplierSelect.locator('.ant-select-selection-item').waitFor({ timeout: 10_000 });

  const materialInput = page.getByText('搜索物料名称/编号', { exact: true })
    .locator('xpath=..')
    .locator('input');
  const { dropdown: materialDropdown, options: visibleMaterialOptions } = await openSelectOptions(materialInput);
  const materialLabels = await visibleMaterialOptions.allInnerTexts();
  const selectedMaterialLabel = materialLabels.find((label) => label.includes(materialKeyword)) ?? materialLabels[0];
  ensure(selectedMaterialLabel, 'no material was available for verification');
  result.materialLabels = materialLabels;
  result.selectedMaterial = selectedMaterialLabel;
  const materialOption = visibleMaterialOptions.filter({ hasText: selectedMaterialLabel }).first();
  await materialOption.waitFor({ timeout: 20_000 });
  await materialOption.click({ force: true });
  await page.waitForTimeout(500);
  if (await materialDropdown.isVisible().catch(() => false)) {
    await page.keyboard.press('Escape');
  }

  await modal.getByRole('button', { name: '创建采购单', exact: true }).click();
  await page.locator('.ant-message-notice').filter({ hasText: '最小规格' }).waitFor({ timeout: 10_000 });
  const invalidSpecificationSelect = modal.locator('.ant-select-status-error');
  await invalidSpecificationSelect.waitFor({ timeout: 10_000 });
  await page.screenshot({ path: path.join(outputDir, '00-minimum-specification-required.png'), fullPage: true });

  const specificationInput = page.getByText('请选择最小规格', { exact: true })
    .locator('xpath=..')
    .locator('input');
  const { dropdown: specificationDropdown, options: visibleSpecificationOptions } = await openSelectOptions(specificationInput);
  const specificationLabels = await visibleSpecificationOptions.allInnerTexts();
  const selectedSpecificationKeyword = specificationLabels.find((label) => label.includes(specificationKeyword))
    ?? specificationLabels[0];
  ensure(specificationLabels.length > 1, `expected multiple minimum specifications, got ${specificationLabels.length}`);
  ensure(selectedSpecificationKeyword, 'no enabled minimum specification was available');
  result.specificationOptionCount = specificationLabels.length;
  result.specificationLabels = specificationLabels;
  result.selectedSpecification = selectedSpecificationKeyword;
  await page.screenshot({ path: path.join(outputDir, '01-minimum-specification-options.png'), fullPage: true });
  await visibleSpecificationOptions.filter({ hasText: selectedSpecificationKeyword }).first().click({ force: true });
  await page.waitForTimeout(500);
  if (await specificationDropdown.isVisible().catch(() => false)) {
    await page.keyboard.press('Escape');
  }

  const materialRow = page.locator('.stocking-purchase-entry-table .ant-table-tbody tr')
    .filter({ hasText: selectedSpecificationKeyword })
    .first();
  const numberInputs = materialRow.locator('input[role="spinbutton"]');
  await numberInputs.nth(0).fill('27');
  await numberInputs.nth(1).fill('15.7');
  await page.screenshot({ path: path.join(outputDir, '02-selected-minimum-specification.png'), fullPage: true });

  const createResponsePromise = page.waitForResponse(
    (response) => response.request().method() === 'POST'
      && /\/api\/v1\/procurement\/orders(?:\?|$)/.test(response.url()),
    { timeout: 30_000 },
  );
  await modal.getByRole('button', { name: '创建采购单', exact: true }).click();
  await createResponsePromise;
  await modal.waitFor({ state: 'hidden', timeout: 30_000 });
  await page.waitForTimeout(500);

  ensure(createRequest, 'create order request was not captured');
  ensure(createResponse, 'create order response was not captured');
  ensure(result.response?.status >= 200 && result.response.status < 300, `create order failed: HTTP ${result.response?.status}`);
  const line = result.request?.lines?.[0];
  ensure(line, 'create order request did not contain a line');
  ensure(line.materialMinimumSpecificationId, 'minimum specification ID was not submitted');
  ensure(!Object.hasOwn(line, 'materialId'), 'materialId should be omitted when minimum specification ID is submitted');

  const orderId = result.response?.body?.orderId ?? result.response?.body?.id;
  const tenantId = new URL(createRequest.url()).searchParams.get('tenantId');
  const authorization = createRequest.headers().authorization;
  if (orderId && tenantId && authorization) {
    const detailResponse = await context.request.get(
      `${baseUrl}/api/v1/procurement/orders/${orderId}?tenantId=${tenantId}`,
      { headers: { Authorization: authorization } },
    );
    const detailBody = await detailResponse.json().catch(() => null);
    const persistedLine = detailBody?.lines?.[0];
    result.detail = {
      status: detailResponse.status(),
      materialId: persistedLine?.materialId,
      materialMinimumSpecificationId: persistedLine?.materialMinimumSpecificationId,
    };
    ensure(detailResponse.ok(), `failed to load verification order ${orderId}`);
    ensure(persistedLine?.materialId, 'backend did not derive and persist materialId');
    ensure(
      String(persistedLine?.materialMinimumSpecificationId) === String(line.materialMinimumSpecificationId),
      'backend did not persist the selected minimum specification ID',
    );

    const extraCleanupOrderIds = (process.env.ESUPPLY_EXTRA_CLEANUP_ORDER_IDS ?? '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
      .map(Number)
      .filter(Number.isFinite);
    const cleanupOrderIds = [Number(orderId), ...extraCleanupOrderIds];
    const cleanupResponse = await context.request.post(
      `${baseUrl}/api/v1/procurement/stocking/status/update?tenantId=${tenantId}`,
      {
        headers: { Authorization: authorization },
        data: { orderIds: cleanupOrderIds, status: 'void' },
      },
    );
    result.cleanup = { orderIds: cleanupOrderIds, status: cleanupResponse.status(), ok: cleanupResponse.ok() };
    ensure(cleanupResponse.ok(), `failed to void verification orders ${cleanupOrderIds.join(', ')}`);
  } else {
    result.cleanup = { skipped: true, reason: 'missing order ID, tenant ID, or authorization header' };
  }

  await page.screenshot({ path: path.join(outputDir, '03-create-success.png'), fullPage: true });

  await page.reload({ waitUntil: 'domcontentloaded' });
  const completedOrderRow = page.locator('.ant-table-tbody tr').filter({ hasText: 'PO-202405-001' }).first();
  await completedOrderRow.waitFor({ timeout: 30_000 });
  await completedOrderRow.getByRole('button', { name: '编辑', exact: true }).click();
  await page.getByText('编辑备料采购单', { exact: true }).waitFor({ timeout: 20_000 });
  const disabledEditModal = page.locator('.ant-modal:visible');
  const disabledTableSelects = disabledEditModal.locator('.stocking-purchase-entry-table .ant-select-disabled');
  await disabledTableSelects.nth(1).waitFor({ timeout: 20_000 });
  await page.screenshot({ path: path.join(outputDir, '04-disabled-minimum-specification.png'), fullPage: true });
  ensure(result.consoleErrors.length === 0, `browser console errors: ${result.consoleErrors.join('; ')}`);
  ensure(result.pageErrors.length === 0, `browser page errors: ${result.pageErrors.join('; ')}`);
  ensure(result.failedResponses.length === 0, `failed browser responses: ${JSON.stringify(result.failedResponses)}`);
} catch (error) {
  result.error = String(error);
  result.finalUrl = page.url();
  await page.screenshot({ path: path.join(outputDir, '99-failure.png'), fullPage: true }).catch(() => {});
  process.exitCode = 1;
} finally {
  fs.writeFileSync(path.join(outputDir, 'result.json'), `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify(result, null, 2));
  await browser.close();
}
