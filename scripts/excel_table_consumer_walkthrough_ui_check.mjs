#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:5177';
const outDir = process.env.OUT_DIR || path.resolve(
  process.cwd(),
  '../docs/e-supply/04-verification/excel-table-component-20261116',
);
const storageState = [
  path.resolve(process.cwd(), 'logs/route-sweep-auth-dev.json'),
  path.resolve(process.cwd(), 'logs/route-sweep-auth.json'),
].find((candidate) => fs.existsSync(candidate));

fs.mkdirSync(outDir, { recursive: true });

const result = {
  ok: false,
  baseUrl,
  checks: [],
  screenshots: [],
  ignoredExternalProbeFailures: [],
};

const check = (name, condition, detail) => {
  result.checks.push({ name, ok: Boolean(condition), detail });
  if (!condition) throw new Error(`${name}${detail ? `: ${JSON.stringify(detail)}` : ''}`);
};

const screenshot = async (page, name) => {
  const target = path.join(outDir, name);
  await page.screenshot({ path: target, fullPage: true });
  result.screenshots.push(target);
};

const collectPageDiagnostics = (page) => {
  const consoleErrors = [];
  const failedResponses = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('response', (response) => {
    if (response.status() >= 400) failedResponses.push(`${response.status()} ${response.url()}`);
  });
  return { consoleErrors, failedResponses };
};

const styleOf = (locator) => locator.evaluate((element) => {
  const style = window.getComputedStyle(element);
  return {
    borderRadius: style.borderRadius,
    borderTopWidth: style.borderTopWidth,
    boxShadow: style.boxShadow,
  };
});

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  storageState,
  viewport: { width: 1700, height: 1050 },
});

try {
  {
    const page = await context.newPage();
    const diagnostics = collectPageDiagnostics(page);
    await page.goto(`${baseUrl}/foundation/product/detail?id=562`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);
    const grid = page.locator('.style-code-matrix.oc-excel-interaction-scope');
    await grid.waitFor({ timeout: 15000 });
    const inputs = grid.locator('input:not([disabled])');
    check('款号编码矩阵实际页面接入 ExcelGrid', await grid.count() === 1);
    check('款号编码矩阵实际页面存在可编辑单元格', await inputs.count() >= 2, { count: await inputs.count() });
    const first = inputs.first();
    const original = await first.inputValue();
    await first.click();
    const selection = await first.evaluate((element) => ({
      start: element.selectionStart,
      end: element.selectionEnd,
      length: element.value.length,
    }));
    check('款号编码矩阵聚焦自动全选', selection.start === 0 && selection.end === selection.length, selection);
    await first.fill(`${original}-UI`);
    await first.press('ArrowRight');
    check('款号编码矩阵方向键移动到相邻单元格', await page.evaluate(() => Boolean(document.activeElement?.closest('.style-code-matrix__table'))));
    await screenshot(page, 'style-code-matrix.png');
    check('款号编码矩阵无控制台错误', diagnostics.consoleErrors.length === 0, diagnostics.consoleErrors);
    check('款号编码矩阵无失败请求', diagnostics.failedResponses.length === 0, diagnostics.failedResponses);
    await page.close();
  }

  {
    const page = await context.newPage();
    const diagnostics = collectPageDiagnostics(page);
    await page.goto(`${baseUrl}/orders/factory`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5500);
    await page.getByRole('button', { name: /新建/ }).first().click();
    const modal = page.locator('.ant-modal').filter({ hasText: '新建工厂订单' }).last();
    await modal.locator('.ant-select').first().click();
    await page.locator('.ant-select-dropdown:visible .ant-select-item-option:not(.ant-select-item-option-disabled)').first().click();
    await page.waitForTimeout(1800);
    const grid = modal.locator('.oc-excel-interaction-scope');
    const inputs = grid.locator('input:not([disabled])');
    check('工厂订单创建矩阵实际弹窗接入 ExcelGrid', await grid.count() === 1);
    check('工厂订单创建矩阵带出颜色尺码输入格', await inputs.count() >= 4, { count: await inputs.count() });
    await inputs.first().fill('7');
    await inputs.first().press('ArrowRight');
    check('工厂订单创建矩阵方向键移动有效', await page.evaluate(() => Boolean(document.activeElement?.closest('.factory-create-matrix-table'))));
    await screenshot(page, 'factory-order-create-matrix.png');
    check('工厂订单创建矩阵无控制台错误', diagnostics.consoleErrors.length === 0, diagnostics.consoleErrors);
    check('工厂订单创建矩阵无失败请求', diagnostics.failedResponses.length === 0, diagnostics.failedResponses);
    await page.close();
  }

  {
    const page = await context.newPage();
    const diagnostics = collectPageDiagnostics(page);
    await page.goto(`${baseUrl}/material/purchase-prep`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3500);
    await page.evaluate(async () => {
      const container = document.createElement('div');
      container.id = 'excel-consumer-verification-harness';
      document.body.appendChild(container);
      const fixture = await import('/scripts/fixtures/ExcelConsumerVerificationHarness.tsx');
      window.__excelConsumerCleanup = fixture.mountExcelConsumerVerificationHarness(container, 'batch-edit');
    });
    const table = page.locator('.stocking-purchase-batch-edit__table');
    await table.locator('.oc-excel-cell-text-input').first().waitFor();
    const rows = table.locator('tbody tr:not(.ant-table-measure-row)');
    check('备料采购批量编辑实际组件接入 ExcelTable', await table.locator('xpath=ancestor::*[contains(@class,"oc-excel-interaction-scope")]').count() === 1);
    check('备料采购批量编辑读取真实订单明细', await rows.count() === 1, { count: await rows.count() });
    check('批量编辑覆盖下拉、日期、group 数字和文本控件',
      await table.locator('.oc-excel-cell-select').count() === 4
      && await table.locator('.oc-excel-cell-picker').count() === 2
      && await table.locator('.ant-input-number-group-wrapper.oc-excel-cell-input').count() === 1
      && await table.locator('.oc-excel-cell-text-input').count() === 2);
    const textInput = table.locator('.oc-excel-cell-text-input').first();
    await textInput.click();
    const selection = await textInput.evaluate((element) => ({
      start: element.selectionStart,
      end: element.selectionEnd,
      length: element.value.length,
    }));
    check('批量编辑可编辑备注聚焦自动全选', selection.start === 0 && selection.end === selection.length, selection);
    await textInput.press('ArrowRight');
    check('批量编辑方向键跳过禁用控件并移动到整单备注',
      await page.evaluate(() => document.activeElement?.value === '裁床最小规格集成测试入库'));
    const pickerStyle = await styleOf(table.locator('.oc-excel-cell-picker').first());
    const textStyle = await styleOf(table.locator('.oc-excel-cell-text-input').first());
    check('批量编辑日期和文本控件无独立圆角', pickerStyle.borderRadius === '0px' && textStyle.borderRadius === '0px', { pickerStyle, textStyle });
    await screenshot(page, 'stocking-purchase-batch-edit.png');
    await page.evaluate(() => {
      window.__excelConsumerCleanup?.();
      document.getElementById('excel-consumer-verification-harness')?.remove();
    });
    check('备料采购批量编辑无控制台错误', diagnostics.consoleErrors.length === 0, diagnostics.consoleErrors);
    check('备料采购批量编辑无失败请求', diagnostics.failedResponses.length === 0, diagnostics.failedResponses);

    await page.evaluate(async () => {
      const container = document.createElement('div');
      container.id = 'excel-consumer-verification-harness';
      document.body.appendChild(container);
      const fixture = await import('/scripts/fixtures/ExcelConsumerVerificationHarness.tsx');
      window.__excelConsumerCleanup = fixture.mountExcelConsumerVerificationHarness(container, 'allocation');
    });
    const allocationModal = page.locator('.ant-modal').filter({ hasText: '新建车缝领取' }).last();
    const allocationGrid = allocationModal.locator('.oc-excel-interaction-scope');
    const allocationInputs = allocationGrid.locator('input:not([disabled])');
    await allocationInputs.first().waitFor();
    check('工厂订单领取矩阵实际组件接入 ExcelGrid', await allocationGrid.count() === 1);
    check('工厂订单领取矩阵渲染完整 2×3 输入格', await allocationInputs.count() === 6, { count: await allocationInputs.count() });
    await allocationInputs.first().fill('5');
    await allocationInputs.first().press('ArrowRight');
    check('工厂订单领取矩阵方向键移动有效', await page.evaluate(() => Boolean(document.activeElement?.closest('.factory-create-matrix-table'))));
    await allocationModal.getByRole('button', { name: '加载当前可领' }).click();
    check('工厂订单领取矩阵批量加载可领数量有效', await allocationInputs.first().inputValue() === '10');
    await screenshot(page, 'factory-allocation-matrix.png');
    await page.close();
  }

  {
    const page = await context.newPage();
    const diagnostics = collectPageDiagnostics(page);
    const source = { productId: 90001, offerId: 'UI-OZON-SOURCE-01', name: 'Ozon UI 验收来源商品' };
    const batch = {
      batchId: 99001,
      channelAccountId: 1,
      sourceChannelAccountId: 1,
      batchNo: 'UI-BATCH-99001',
      batchName: 'Ozon UI 验收草稿',
      status: 'DRAFT',
      totalCount: 2,
      readyCount: 2,
      blockedCount: 0,
      items: [1, 2].map((index) => ({
        itemId: 99000 + index,
        sourceOfferId: `UI-SOURCE-${index}`,
        targetOfferId: `UI-TARGET-${index}`,
        productName: `Ozon UI 验收商品 ${index}`,
        price: String(99 + index),
        currencyCode: 'RUB',
        validationStatus: 'READY',
        publishStatus: 'DRAFT',
        validationIssues: [],
        item: {
          name: `Ozon UI 验收商品 ${index}`,
          offer_id: `UI-TARGET-${index}`,
          price: String(99 + index),
          currency_code: 'RUB',
          attributes: [],
        },
      })),
    };
    await page.route('**/api/v1/sale/products/publish-source/list*', (route) => route.fulfill({ json: { list: [source], total: 1, hasMore: false } }));
    await page.route('**/api/v1/sale/product-listings/batches/create-from-sources*', (route) => route.fulfill({ json: batch }));
    await page.goto(`${baseUrl}/sale/ozon/listing`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    await page.getByRole('button', { name: '读取 Ozon 商品' }).click();
    const sourceRow = page.locator('.oc-excel-entry-table tbody tr:not(.ant-table-measure-row)').first();
    await sourceRow.waitFor();
    await sourceRow.locator('input[type=checkbox]').check();
    await page.getByRole('button', { name: '生成复制草稿' }).click();
    const table = page.locator('.opp-item-table');
    await table.waitFor();
    const rows = table.locator('tbody tr:not(.ant-table-measure-row)');
    check('Ozon 铺货实际草稿表直接接入 ExcelTable', await table.locator('xpath=ancestor::*[contains(@class,"oc-excel-interaction-scope")]').count() === 1);
    check('Ozon 铺货草稿表渲染两条编辑行', await rows.count() === 2, { count: await rows.count() });
    const first = table.locator('tbody input').first();
    await first.click();
    const selection = await first.evaluate((element) => ({
      start: element.selectionStart,
      end: element.selectionEnd,
      length: element.value.length,
    }));
    check('Ozon 铺货草稿输入聚焦自动全选', selection.start === 0 && selection.end === selection.length, selection);
    await first.fill('Ozon UI 验收商品 已编辑');
    await first.press('ArrowRight');
    check('Ozon 铺货草稿方向键移动到目标货号', await page.evaluate(() => document.activeElement?.value === 'UI-TARGET-1'));
    const inputStyle = await styleOf(table.locator('.oc-excel-cell-text-input').first());
    check('Ozon 铺货草稿输入不残留独立圆角', inputStyle.borderRadius === '0px', inputStyle);
    await screenshot(page, 'ozon-product-publish-editor.png');
    check('Ozon 铺货草稿无控制台错误', diagnostics.consoleErrors.length === 0, diagnostics.consoleErrors);
    check('Ozon 铺货草稿无失败请求', diagnostics.failedResponses.length === 0, diagnostics.failedResponses);
    await page.close();
  }

  {
    const page = await context.newPage();
    const diagnostics = collectPageDiagnostics(page);
    await page.goto(`${baseUrl}/sale/ozon/promotions`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(6000);
    const activityRows = page.locator('.scw-promo-list-table .ant-table-tbody tr:not(.ant-table-measure-row)');
    await activityRows.first().waitFor();
    await activityRows.first().evaluate((element) => element.click());
    await page.getByRole('button', { name: '下一步：选择商品' }).evaluate((element) => element.click());
    await page.waitForTimeout(4500);
    const selectable = page.locator('.scw-promo-step-card .ant-table-tbody input[type=checkbox]:not([disabled])');
    await selectable.first().evaluate((element) => element.click());
    await page.getByRole('button', { name: /进入步骤 3/ }).evaluate((element) => element.click());
    const table = page.locator('.scw-promo-entry-table');
    await table.waitFor();
    const rows = table.locator('tbody tr:not(.ant-table-measure-row)');
    check('Ozon 活动报名实际步骤三接入 ExcelTable', await table.locator('xpath=ancestor::*[contains(@class,"oc-excel-interaction-scope")]').count() === 1);
    check('Ozon 活动报名实际步骤三生成编辑行', await rows.count() > 0, { count: await rows.count() });
    const numberInput = table.locator('.oc-excel-cell-input input:not([disabled])').first();
    await numberInput.click();
    const selection = await numberInput.evaluate((element) => ({
      start: element.selectionStart,
      end: element.selectionEnd,
      length: element.value.length,
    }));
    check('Ozon 活动报名数字输入聚焦自动全选', selection.start === 0 && selection.end === selection.length, selection);
    const numberStyle = await styleOf(table.locator('.oc-excel-cell-input').first());
    check('Ozon 活动报名数字输入不残留独立圆角', numberStyle.borderRadius === '0px', numberStyle);
    await screenshot(page, 'ozon-promotions-entry.png');
    const knownProbeFailure = (value) => value.includes('/api/v1/sale/ozon/promotions?') && value.startsWith('502 ');
    result.ignoredExternalProbeFailures.push(...diagnostics.failedResponses.filter(knownProbeFailure));
    const unexpectedFailures = diagnostics.failedResponses.filter((value) => !knownProbeFailure(value));
    const unexpectedConsoleErrors = diagnostics.consoleErrors.filter((value) => !value.includes('Failed to load resource: the server responded with a status of 502'));
    check('Ozon 活动报名除自动探测不可用店铺外无失败请求', unexpectedFailures.length === 0, unexpectedFailures);
    check('Ozon 活动报名除已抑制店铺探测外无控制台错误', unexpectedConsoleErrors.length === 0, unexpectedConsoleErrors);
    await page.close();
  }

  result.ok = true;
} catch (error) {
  result.error = error instanceof Error ? error.stack || error.message : String(error);
} finally {
  fs.writeFileSync(path.join(outDir, 'consumer-walkthrough-result.json'), `${JSON.stringify(result, null, 2)}\n`);
  await browser.close();
}

if (!result.ok) {
  console.error(result.error);
  process.exit(1);
}

console.log(`Excel table consumer walkthrough checks passed: ${result.checks.length}`);
