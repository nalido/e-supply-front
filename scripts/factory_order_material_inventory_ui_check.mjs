#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptDir, '..');
const baseUrl = process.env.ESUPPLY_FRONT_BASE_URL || 'http://127.0.0.1:5185';
const orderNo = process.env.ESUPPLY_ORDER_NO;
const materialName = process.env.ESUPPLY_MATERIAL_NAME;
const multiOrderNo = process.env.ESUPPLY_MULTI_ORDER_NO;
const multiMaterialNames = (process.env.ESUPPLY_MULTI_MATERIAL_NAMES || '').split('|').filter(Boolean);
const expectedAvailableQty = process.env.ESUPPLY_AVAILABLE_QTY || '8';
const expectedSuggestedQty = process.env.ESUPPLY_SUGGESTED_QTY || '7';
const expectedAvailableLabel = Number(expectedAvailableQty).toLocaleString('zh-CN', {
  maximumFractionDigits: 4,
});
const expectedSuggestedLabel = Number(expectedSuggestedQty).toLocaleString('zh-CN', {
  maximumFractionDigits: 4,
});
const bearerToken = process.env.ESUPPLY_BEARER_TOKEN;
const outputDir = process.env.ESUPPLY_VERIFY_DIR
  || path.resolve(appRoot, '../docs/e-supply/04-verification/factory-order-material-inventory-20260929');
const backendEnvPath = path.resolve(appRoot, '../e-supply-back/src/main/resources/.env');

const ensure = (condition, message) => {
  if (!condition) throw new Error(message);
};

const loadEnvFile = (filePath) => {
  if (!fs.existsSync(filePath)) return;
  for (const rawLine of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || !line.includes('=')) continue;
    const separator = line.indexOf('=');
    const key = line.slice(0, separator);
    const value = line.slice(separator + 1).replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = value;
  }
};

ensure(orderNo, 'missing ESUPPLY_ORDER_NO');
ensure(materialName, 'missing ESUPPLY_MATERIAL_NAME');
ensure(multiOrderNo, 'missing ESUPPLY_MULTI_ORDER_NO');
ensure(multiMaterialNames.length === 3, 'ESUPPLY_MULTI_MATERIAL_NAMES must contain three pipe-separated names');
fs.mkdirSync(outputDir, { recursive: true });
loadEnvFile(backendEnvPath);

const browser = await chromium.launch({ headless: true });
const contextOptions = { viewport: { width: 1680, height: 1050 } };
const context = await browser.newContext(contextOptions);
const page = await context.newPage();
const result = {
  passed: false,
  baseUrl,
  orderNo,
  materialName,
  assertions: {},
  consoleErrors: [],
  pageErrors: [],
  failedResponses: [],
};
let authenticated = Boolean(bearerToken);

if (bearerToken) {
  await page.route('**/api/**', async (route) => {
    await route.continue({
      headers: {
        ...route.request().headers(),
        Authorization: `Bearer ${bearerToken}`,
        'X-Tenant-Id': '1',
      },
    });
  });
}

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

const loginIfRequired = async (readyLocator) => {
  const loginButton = page.getByRole('button', { name: '登录系统' });
  if (authenticated) {
    await readyLocator.waitFor({ state: 'visible', timeout: 45_000 });
    return;
  }
  await loginButton.waitFor({ state: 'visible', timeout: 60_000 });
  const email = process.env.ESUPPLY_ADMIN_EMAIL;
  const password = process.env.ESUPPLY_ADMIN_PASSWORD;
  ensure(email && password, 'missing local browser acceptance account');
  await loginButton.click();
  const identifier = page.locator('input[name="identifier"], input[type="email"], input[name="username"]').first();
  await identifier.waitFor({ timeout: 30_000 });
  await identifier.fill(email);
  await page.getByRole('button', { name: /继续|Continue|Sign in|下一步/i }).first().click();
  const passwordInput = page.locator('input[type="password"]').first();
  await passwordInput.waitFor({ timeout: 30_000 });
  await passwordInput.fill(password);
  await page.getByRole('button', { name: /继续|Continue|Sign in|登录/i }).first().click();
  await page.waitForURL(
    (url) => url.origin === new URL(baseUrl).origin && !url.pathname.includes('/welcome'),
    { timeout: 60_000 },
  );
  authenticated = true;
};

const gotoApp = async (route) => {
  const readyLocator = route === '/basic/material'
    ? page.getByPlaceholder('名称')
    : page.getByTestId('factory-orders-search-input');
  await page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await loginIfRequired(readyLocator);
  if (new URL(page.url()).pathname !== route) {
    await page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await loginIfRequired(readyLocator);
    if (new URL(page.url()).pathname !== route) {
      await page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    }
  }
};

try {
  await gotoApp('/basic/material');
  const materialSearch = page.getByPlaceholder('名称');
  await materialSearch.waitFor({ timeout: 45_000 });
  await materialSearch.fill(materialName);
  await materialSearch.press('Enter');
  const materialRow = page.locator('.material-table .ant-table-tbody tr').filter({ hasText: materialName }).first();
  await materialRow.waitFor({ timeout: 30_000 });
  await materialRow.getByRole('button', { name: '编辑' }).click();
  const materialModal = page.locator('.ant-modal:visible').filter({ hasText: '编辑物料' });
  await materialModal.getByRole('columnheader', { name: '安全库存' }).waitFor({ timeout: 20_000 });
  const safetyInput = materialModal.locator('input[role="spinbutton"]').last();
  ensure(Number(await safetyInput.inputValue()) === 5, `unexpected safety stock value: ${await safetyInput.inputValue()}`);
  const safetyWrapper = safetyInput.locator('xpath=ancestor::*[contains(@class,"ant-input-number")][1]');
  const safetyStyle = await safetyWrapper.evaluate((element) => {
    const style = getComputedStyle(element);
    return { borderRadius: style.borderRadius, backgroundColor: style.backgroundColor };
  });
  result.assertions.desktopSafetyStock = {
    visible: true,
    value: await safetyInput.inputValue(),
    unitVisible: await materialModal.getByText('米', { exact: true }).count() > 0,
    style: safetyStyle,
  };
  await page.screenshot({ path: path.join(outputDir, '01-material-safety-stock-desktop.png'), fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  const mobileSafetyLabel = materialModal.getByText('安全库存', { exact: true }).last();
  await mobileSafetyLabel.waitFor();
  await materialModal.locator('.material-specification-card').first().waitFor({ timeout: 10_000 });
  result.assertions.mobileSafetyStock = {
    cardVisible: await materialModal.locator('.material-specification-card').count() > 0,
    unitVisible: await materialModal.getByText('米', { exact: true }).count() > 0,
  };
  ensure(result.assertions.mobileSafetyStock.cardVisible, 'mobile specification card did not render');
  await mobileSafetyLabel.scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(outputDir, '02-material-safety-stock-mobile.png'), fullPage: true });
  await materialModal.getByRole('button', { name: 'Cancel' }).click().catch(async () => {
    await page.keyboard.press('Escape');
  });

  await page.setViewportSize({ width: 1680, height: 1050 });
  await page.evaluate(() => localStorage.setItem('factory-orders-view-mode', 'card'));
  await gotoApp('/orders/factory');
  const orderSearch = page.getByTestId('factory-orders-search-input');
  await orderSearch.waitFor({ timeout: 45_000 });
  await orderSearch.fill(orderNo);
  await orderSearch.press('Enter');
  const orderCard = page.locator('.factory-order-card-shell').filter({ hasText: orderNo }).first();
  await orderCard.waitFor({ timeout: 30_000 });
  const cardButtons = await orderCard.locator('button').allInnerTexts();
  const cardMaterialIndex = cardButtons.findIndex((text) => text.includes('面辅料明细'));
  const cardCostIndex = cardButtons.findIndex((text) => text.includes('大货成本'));
  ensure(cardMaterialIndex >= 0 && cardMaterialIndex < cardCostIndex, `card button order is wrong: ${cardButtons}`);
  result.assertions.cardButtonOrder = cardButtons;
  await orderCard.getByRole('button', { name: '面辅料明细' }).click();

  const detailModal = page.locator('.ant-modal:visible').filter({ hasText: `面辅料明细 - ${orderNo}` });
  await detailModal.getByText('面辅料库存不足', { exact: true }).waitFor({ timeout: 30_000 });
  const detailHeaders = (await detailModal.locator('.ant-table-thead').first().getByRole('columnheader').allInnerTexts())
    .map((value) => value.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  const availableStockIndex = detailHeaders.indexOf('可用库存');
  const expectedUsageIndex = detailHeaders.indexOf('预计使用');
  ensure(
    availableStockIndex >= 0 && availableStockIndex + 1 === expectedUsageIndex,
    `available stock should be immediately before expected usage: ${JSON.stringify(detailHeaders)}`,
  );
  const detailRow = detailModal.locator('.ant-table-tbody tr').filter({ hasText: materialName }).first();
  await detailRow.waitFor();
  const detailCells = (await detailRow.locator('td').allInnerTexts())
    .map((value) => value.replace(/\s+/g, ' ').trim());
  const expectedQuantityCells = [
    `${expectedAvailableLabel} 米`,
    '10 米',
    '0 米',
    '-10 米',
    `${expectedAvailableLabel} 米`,
    '0 米',
    '5 米',
    `${expectedSuggestedLabel} 米`,
  ];
  ensure(
    detailCells.length >= expectedQuantityCells.length
      && expectedQuantityCells.every((value, index) => detailCells.at(index - expectedQuantityCells.length) === value),
    `material quantity columns mismatch: ${JSON.stringify(detailCells)}`,
  );
  await detailRow.locator('.ant-table-row-expand-icon').click();
  const detailImage = detailRow.locator('img').first();
  await detailImage.waitFor({ state: 'visible' });
  ensure((await detailImage.getAttribute('src'))?.startsWith('data:image/svg+xml,'), 'material image was not rendered');
  await detailModal.getByText(/ORDER-MATERIAL-.*-物料仓/).waitFor();
  result.assertions.materialDetail = {
    columnOrder: detailHeaders,
    expectedUsage: '10 米',
    actualUsage: '0 米',
    availableStock: `${expectedAvailableLabel} 米`,
    safetyStock: '5 米',
    suggestedPurchase: `${expectedSuggestedLabel} 米`,
    imageVisible: true,
    warehouseExpanded: true,
  };
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(outputDir, '03-factory-order-material-detail.png'), fullPage: true });

  await detailModal.getByRole('button', { name: '创建面料采购单' }).click();
  const purchaseModal = page.locator('.ant-modal:visible').filter({ hasText: '创建备料采购单' });
  const purchaseRow = purchaseModal.locator('.stocking-purchase-entry-table .ant-table-tbody tr')
    .filter({ hasText: materialName })
    .first();
  await purchaseRow.waitFor({ timeout: 30_000 });
  const purchaseText = await purchaseRow.innerText();
  ensure(purchaseText.includes('藏青 / 150cm / 180g'), `purchase specification was not prefilled: ${purchaseText}`);
  const quantityInput = purchaseRow.locator('input[role="spinbutton"]').first();
  ensure(Number(await quantityInput.inputValue()) === Number(expectedSuggestedQty), `purchase quantity was not prefilled: ${await quantityInput.inputValue()}`);
  const remarkValue = await purchaseModal.locator('textarea').first().inputValue();
  ensure(remarkValue.includes(orderNo), `purchase remark did not preserve order number: ${remarkValue}`);
  result.assertions.purchasePrefill = {
    material: materialName,
    minimumSpecification: '藏青 / 150cm / 180g',
    quantity: await quantityInput.inputValue(),
    remark: remarkValue,
  };
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(outputDir, '04-purchase-prefill.png'), fullPage: true });
  await purchaseModal.getByRole('button', { name: /取\s*消/ }).click();
  await purchaseModal.waitFor({ state: 'hidden', timeout: 10_000 });
  if (await detailModal.isVisible().catch(() => false)) {
    await page.keyboard.press('Escape');
    await detailModal.waitFor({ state: 'hidden', timeout: 10_000 });
  }

  await page.getByText('列表', { exact: true }).click();
  const orderTableRow = page.locator('.factory-orders-content .ant-table-tbody tr').filter({ hasText: orderNo }).first();
  await orderTableRow.waitFor({ timeout: 20_000 });
  const tableButtons = await orderTableRow.locator('button').allInnerTexts();
  const tableMaterialIndex = tableButtons.findIndex((text) => text.includes('面辅料明细'));
  const tableCostIndex = tableButtons.findIndex((text) => text.includes('大货成本'));
  ensure(tableMaterialIndex >= 0 && tableMaterialIndex < tableCostIndex, `table button order is wrong: ${tableButtons}`);
  result.assertions.tableButtonOrder = tableButtons;
  await page.screenshot({ path: path.join(outputDir, '05-factory-order-table-action.png'), fullPage: true });

  await orderSearch.fill(multiOrderNo);
  await orderSearch.press('Enter');
  const multiOrderRow = page.locator('.factory-orders-content .ant-table-tbody tr').filter({ hasText: multiOrderNo }).first();
  await multiOrderRow.waitFor({ timeout: 30_000 });
  await multiOrderRow.getByRole('button', { name: '面辅料明细' }).click();
  const multiDetailModal = page.locator('.ant-modal:visible').filter({ hasText: `面辅料明细 - ${multiOrderNo}` });
  await multiDetailModal.getByText('面辅料库存不足', { exact: true }).waitFor({ timeout: 30_000 });
  const rowResults = [];
  for (const name of multiMaterialNames) {
    const row = multiDetailModal.locator('.ant-table-tbody tr').filter({ hasText: name }).first();
    await row.waitFor({ state: 'visible' });
    const image = row.locator('img').first();
    await image.waitFor({ state: 'visible' });
    ensure((await image.getAttribute('src'))?.startsWith('data:image/svg+xml,'), `material image missing for ${name}`);
    rowResults.push({ name, text: await row.innerText(), imageVisible: true });
  }
  ensure(rowResults[0].text.includes('12 米') && rowResults[0].text.includes('7 米'), `first fabric quantities wrong: ${rowResults[0].text}`);
  ensure(rowResults[1].text.includes('5 米') && rowResults[1].text.includes('3 米'), `second fabric quantities wrong: ${rowResults[1].text}`);
  ensure(rowResults[2].text.includes('20 个') && rowResults[2].text.includes('15 个'), `accessory quantities wrong: ${rowResults[2].text}`);
  const typeLabels = await multiDetailModal.locator('.ant-table-tbody > tr .ant-tag').allInnerTexts();
  ensure(typeLabels.filter((label) => label === '面料').length === 2, `expected two fabric rows: ${typeLabels}`);
  ensure(typeLabels.filter((label) => label === '辅料').length === 1, `expected one accessory row: ${typeLabels}`);
  result.assertions.multiMaterialDetail = {
    orderNo: multiOrderNo,
    rowCount: rowResults.length,
    imageCount: rowResults.filter((row) => row.imageVisible).length,
    materialNames: multiMaterialNames,
    typeLabels,
  };
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(outputDir, '06-factory-order-multiple-materials.png'), fullPage: true });

  const relevantFailedResponses = result.failedResponses.filter((item) => (
    !item.path.includes('/api/v1/auth/onboarding/status')
  ));
  result.failedResponses = relevantFailedResponses;
  result.consoleErrors = result.consoleErrors.filter((item) => (
    !item.includes('Failed to load resource: the server responded with a status of 401')
  ));
  ensure(!result.consoleErrors.length, `console errors: ${result.consoleErrors.join('\n')}`);
  ensure(!result.pageErrors.length, `page errors: ${result.pageErrors.join('\n')}`);
  ensure(!result.failedResponses.length, `failed API responses: ${JSON.stringify(result.failedResponses)}`);
  result.passed = true;
  fs.writeFileSync(path.join(outputDir, 'ui-result.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  result.error = String(error);
  result.url = page.url();
  result.bodyText = (await page.locator('body').innerText().catch(() => '')).slice(0, 2000);
  await page.screenshot({ path: path.join(outputDir, 'ui-failed.png'), fullPage: true }).catch(() => undefined);
  fs.writeFileSync(path.join(outputDir, 'ui-result.json'), JSON.stringify(result, null, 2));
  console.error(JSON.stringify(result, null, 2));
  process.exitCode = 1;
} finally {
  await browser.close();
}
