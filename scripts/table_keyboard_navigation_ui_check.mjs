#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const appRoot = process.cwd();
const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:5177';
const outputDir = process.env.OUT_DIR || path.resolve(
  appRoot,
  '../docs/e-supply/04-verification/excel-table-component-20261116',
);
const storageStateCandidates = [
  path.resolve(appRoot, 'logs/route-sweep-auth-dev.json'),
  path.resolve(appRoot, 'logs/route-sweep-auth.json'),
];
const storageState = storageStateCandidates.find((candidate) => fs.existsSync(candidate));

const material = {
  id: 16,
  tenantId: 1,
  sku: 'FAB-TABLE-KEYBOARD',
  name: '表格键盘验收面料',
  unit: 'kg',
  materialType: 'FABRIC',
  imageUrl: null,
  status: 'ACTIVE',
  attributes: {
    colors: ['黑色', '白色'],
    width: '180cm',
    grammage: '230g/m²',
    price: 12,
  },
  minimumSpecifications: [
    {
      id: 101,
      code: 'FAB-BLACK',
      label: '黑色 · 180cm · 230g/m²',
      color: '黑色',
      width: '180cm',
      grammage: '230g/m²',
      safetyStockQty: 10,
      active: true,
      legacyDefault: false,
    },
    {
      id: 102,
      code: 'FAB-WHITE',
      label: '白色 · 180cm · 230g/m²',
      color: '白色',
      width: '180cm',
      grammage: '230g/m²',
      safetyStockQty: 20,
      active: true,
      legacyDefault: false,
    },
  ],
  createdAt: '2026-11-12T09:00:00',
  updatedAt: '2026-11-12T09:00:00',
};

const result = {
  ok: false,
  baseUrl,
  storageState: Boolean(storageState),
  checks: [],
  screenshots: [],
  consoleErrors: [],
  failedRequests: [],
  failedApiResponses: [],
};

const ensure = (condition, name, detail = undefined) => {
  result.checks.push({ name, ok: Boolean(condition), detail });
  if (!condition) {
    throw new Error(`${name}${detail ? `: ${JSON.stringify(detail)}` : ''}`);
  }
};

const fulfillJson = (route, body, status = 200) => route.fulfill({
  status,
  contentType: 'application/json',
  body: JSON.stringify(body),
});

const focusedId = (page) => page.evaluate(() => document.activeElement?.id || '');
const isFocused = (locator) => locator.evaluate((element) => document.activeElement === element);
const selection = (locator) => locator.evaluate((element) => ({
  start: element.selectionStart,
  end: element.selectionEnd,
  length: element.value.length,
}));

fs.mkdirSync(outputDir, { recursive: true });
for (const name of ['01-material-table-arrow-focus.png', '02-component-dom-variants.png', '03-scroll-navigation.png', '99-failure.png', 'result.json']) {
  fs.rmSync(path.join(outputDir, name), { force: true });
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  ...(storageState ? { storageState } : {}),
});
const page = await context.newPage();

page.on('pageerror', (error) => result.consoleErrors.push(`pageerror: ${error.message}`));
page.on('console', (message) => {
  if (message.type() === 'error') result.consoleErrors.push(`console: ${message.text()}`);
});
page.on('requestfailed', (request) => {
  result.failedRequests.push(`${request.method()} ${request.url()} ${request.failure()?.errorText || ''}`);
});
page.on('response', (response) => {
  if (response.url().includes('/api/') && response.status() >= 400) {
    result.failedApiResponses.push(`${response.status()} ${response.url()}`);
  }
});

await page.route('**/api/**', async (route) => {
  const request = route.request();
  const url = new URL(request.url());
  if (!url.pathname.startsWith('/api/')) {
    return route.continue();
  }
  if (url.pathname === '/api/v1/auth/onboarding/status') {
    return fulfillJson(route, {
      linked: true,
      tenantId: 1,
      userId: 20,
      tenantName: '本地验收企业',
      username: 'admin',
      billing: { status: 'ACTIVE', upgradeRequired: false },
    });
  }
  if (url.pathname === '/api/v1/settings/company/overview') {
    return fulfillJson(route, {
      id: '1',
      name: '本地验收企业',
      stats: { users: { value: 1, limit: 20 }, storage: { value: 1, limit: 20 } },
      modules: [],
      tenants: [{ id: '1', name: '本地验收企业', current: true }],
      billing: { status: 'ACTIVE', upgradeRequired: false },
    });
  }
  if (url.pathname === '/api/v1/materials' && request.method() === 'GET') {
    return fulfillJson(route, { items: [material], total: 1, page: 0, size: 10 });
  }
  if (url.pathname === '/api/v1/settings/preferences') return fulfillJson(route, []);
  if (url.pathname === '/api/v1/settings/usage-analytics/events') {
    return route.fulfill({ status: 204, body: '' });
  }
  return fulfillJson(route, { items: [], list: [], total: 0, page: 0, size: 20 });
});

try {
  await page.goto(`${baseUrl}/basic/material`, { waitUntil: 'networkidle', timeout: 60_000 });
  await page.getByText(material.name, { exact: true }).waitFor({ state: 'visible', timeout: 30_000 });
  await page.getByRole('button', { name: /编辑/ }).click();
  await page.getByText('颜色与规格组合', { exact: true }).waitFor({ state: 'visible', timeout: 20_000 });

  const table = page.locator('.material-specification-editor');
  ensure(await table.locator('xpath=ancestor::div[contains(@class,"oc-excel-interaction-scope")][1]').count() === 1, '真实表格由统一交互作用域托管');
  const rows = table.locator('tbody tr.ant-table-row');
  ensure(await rows.count() === 2, '真实 Ant Design 表格加载两行规格', { count: await rows.count() });

  const firstRow = rows.nth(0);
  const secondRow = rows.nth(1);
  const firstColor = firstRow.locator('input[placeholder="如 黑色"]');
  const firstWidth = firstRow.locator('input[placeholder="如 150cm"]');
  const firstGrammage = firstRow.locator('input[placeholder="如 180g/m²"]');
  const firstSafety = firstRow.locator('.oc-excel-cell-input input');
  const secondColor = secondRow.locator('input[placeholder="如 黑色"]');
  const secondSafety = secondRow.locator('.oc-excel-cell-input input');

  await firstSafety.focus();
  await page.waitForTimeout(50);
  const firstSafetySelection = await selection(firstSafety);
  ensure(
    firstSafetySelection.start === 0 && firstSafetySelection.end === firstSafetySelection.length,
    '数字单元格聚焦后自动全选',
    firstSafetySelection,
  );
  await firstSafety.press('ArrowDown');
  await page.waitForTimeout(50);
  ensure(await isFocused(secondSafety), '数字输入按下键移动到下一行同列');
  ensure(Number(await firstSafety.inputValue()) === 10 && Number(await secondSafety.inputValue()) === 20, '数字输入按下键不修改数值');
  const secondSelection = await selection(secondSafety);
  ensure(secondSelection.start === 0 && secondSelection.end === secondSelection.length, '方向键移动后目标数字自动全选', secondSelection);

  await secondSafety.press('ArrowDown');
  await page.waitForTimeout(50);
  ensure(await isFocused(secondSafety), '末行按下键保持当前焦点');
  ensure(Number(await secondSafety.inputValue()) === 20, '末行按下键仍不修改数值');

  await secondSafety.press('ArrowUp');
  await page.waitForTimeout(50);
  ensure(await isFocused(firstSafety), '数字输入按上键移动到上一行同列');
  ensure(Number(await firstSafety.inputValue()) === 10, '数字输入按上键不修改数值');

  await firstSafety.press('ArrowLeft');
  await page.waitForTimeout(50);
  ensure(await isFocused(firstGrammage), '数字输入按左键移动到同行前一输入格');

  await firstColor.focus();
  await page.waitForTimeout(50);
  const colorSelection = await selection(firstColor);
  ensure(colorSelection.start === 0 && colorSelection.end === colorSelection.length, '文本单元格聚焦后自动全选', colorSelection);
  await firstColor.press('ArrowRight');
  await page.waitForTimeout(50);
  ensure(await isFocused(firstWidth), '文本全选时按右键移动到同行下一输入格');

  await firstWidth.evaluate((element) => element.setSelectionRange(1, 1));
  await firstWidth.press('ArrowRight');
  ensure(await isFocused(firstWidth), '文本光标位于内容中间时右键保留文字编辑');
  ensure((await selection(firstWidth)).start === 2, '文本光标位于内容中间时右键正常移动光标', await selection(firstWidth));

  await firstWidth.evaluate((element) => element.setSelectionRange(element.value.length, element.value.length));
  await firstWidth.press('ArrowRight');
  await page.waitForTimeout(50);
  ensure(await isFocused(firstGrammage), '文本光标到达末尾时右键移动到下一输入格');

  await firstColor.focus();
  await firstColor.press('ArrowDown');
  await page.waitForTimeout(50);
  ensure(await isFocused(secondColor), '普通文本输入按下键移动到下一行同列');

  await secondSafety.focus();
  await page.waitForTimeout(50);
  const screenshotPath = path.join(outputDir, '01-material-table-arrow-focus.png');
  await page.screenshot({ path: screenshotPath, fullPage: false });
  result.screenshots.push(screenshotPath);

  await page.evaluate(() => {
    const scope = document.querySelector('.oc-excel-interaction-scope');
    const provider = document.querySelector('.oc-table-input-provider');
    if (!scope) throw new Error('missing ExcelGrid scope');
    if (!provider) throw new Error('missing table input provider');
    provider.insertAdjacentHTML('beforeend', '<table id="legacy-table"><tbody><tr><td><input id="legacy-input" value="旧表格输入"></td></tr></tbody></table>');
    scope.innerHTML = `
      <main style="padding:24px;font-family:sans-serif">
        <table id="native-grid" style="border-collapse:collapse">
          <tbody>
            <tr><td><input id="native-number-1" type="number" value="5"></td><td><input id="native-text-1" value="甲"></td></tr>
            <tr><td><input id="native-number-disabled" type="number" value="7" disabled></td><td><input id="native-text-2" value="乙"></td></tr>
            <tr><td><input id="native-number-3" type="number" value="9"></td><td><input id="native-text-3" value="丙"></td></tr>
          </tbody>
        </table>
        <div id="role-grid" role="table" style="margin-top:20px">
          <div role="row"><strong>一</strong><label><input id="role-1-1" value="11"></label><label><input id="role-1-2" value="12"></label></div>
          <div role="row"><strong>二</strong><label><input id="role-2-1" value="21"></label><label><input id="role-2-2" value="22"></label></div>
        </div>
        <table id="popup-grid" style="margin-top:20px"><tbody>
          <tr><td><input id="combo-1" role="combobox" aria-expanded="true" value="展开中"></td></tr>
          <tr><td><input id="combo-2" role="combobox" aria-expanded="false" value="下一行"></td></tr>
        </tbody></table>
        <table id="picker-grid" style="margin-top:20px"><tbody>
          <tr><td><span class="ant-picker"><input id="picker-1" value="2026-11-12"></span></td></tr>
          <tr><td><span class="ant-picker"><input id="picker-2" value="2026-11-13"></span></td></tr>
        </tbody></table>
        <div id="picker-popup" class="ant-picker-dropdown" style="display:block;width:20px;height:20px">日期</div>
      </main>`;
  });

  const legacyInput = page.locator('#legacy-input');
  await legacyInput.focus();
  await page.waitForTimeout(50);
  const legacySelection = await selection(legacyInput);
  ensure(legacySelection.start === 0 && legacySelection.end === legacySelection.length, '未迁移表格继续保持聚焦自动全选', legacySelection);

  const nativeNumber1 = page.locator('#native-number-1');
  await nativeNumber1.focus();
  await page.waitForTimeout(50);
  await nativeNumber1.press('ArrowDown');
  ensure(await focusedId(page) === 'native-number-3', '原生表格纵向导航跳过禁用输入', { focused: await focusedId(page) });
  ensure(await nativeNumber1.inputValue() === '5', '原生数字输入方向键不修改数值');

  await page.locator('#native-number-3').press('ArrowUp');
  ensure(await focusedId(page) === 'native-number-1', '原生表格向上导航跳过禁用输入', { focused: await focusedId(page) });
  await nativeNumber1.press('ArrowUp');
  ensure(await focusedId(page) === 'native-number-1' && await nativeNumber1.inputValue() === '5', '原生数字首行上键保持焦点和值');

  const role11 = page.locator('#role-1-1');
  await role11.focus();
  await page.waitForTimeout(50);
  await role11.press('ArrowRight');
  ensure(await focusedId(page) === 'role-1-2', 'role=table 矩阵支持横向导航', { focused: await focusedId(page) });
  await page.locator('#role-1-2').press('ArrowDown');
  ensure(await focusedId(page) === 'role-2-2', 'role=table 矩阵支持同列纵向导航', { focused: await focusedId(page) });

  const combo1 = page.locator('#combo-1');
  await combo1.focus();
  await combo1.press('ArrowDown');
  ensure(await focusedId(page) === 'combo-1', '下拉弹层展开时保留控件自身方向键', { focused: await focusedId(page) });
  await combo1.evaluate((element) => element.setAttribute('aria-expanded', 'false'));
  await combo1.press('ArrowDown');
  ensure(await focusedId(page) === 'combo-2', '下拉弹层关闭后方向键恢复表格导航', { focused: await focusedId(page) });

  const picker1 = page.locator('#picker-1');
  await picker1.focus();
  await picker1.press('ArrowDown');
  ensure(await focusedId(page) === 'picker-1', '日期弹层展开时保留控件自身方向键', { focused: await focusedId(page) });
  await page.locator('#picker-popup').evaluate((element) => { element.style.display = 'none'; });
  await picker1.press('ArrowDown');
  ensure(await focusedId(page) === 'picker-2', '日期弹层关闭后方向键恢复表格导航', { focused: await focusedId(page) });

  await page.evaluate(async () => {
    const container = document.createElement('div');
    document.body.replaceChildren(container);
    const fixture = await import('/scripts/fixtures/ExcelTableVerificationHarness.tsx');
    fixture.mountExcelTableVerificationHarness(container);
  });
  const verificationTable = page.locator('.excel-table-verification-table');
  await verificationTable.waitFor({ state: 'visible', timeout: 20_000 });
  ensure(await verificationTable.locator('.ant-input-number.oc-excel-cell-input').count() > 0, '普通数字框使用通用组件实际 DOM');
  ensure(await verificationTable.locator('.ant-input-number-affix-wrapper.oc-excel-cell-input').count() > 0, '前后缀数字框使用通用组件实际 DOM');
  ensure(await verificationTable.locator('.ant-input-number-group-wrapper.oc-excel-cell-input').count() > 0, 'group 数字框使用通用组件实际 DOM');
  ensure(await verificationTable.locator('.ant-input-affix-wrapper.oc-excel-cell-text-input').count() > 0, 'affix 文本框使用通用组件实际 DOM');
  ensure(await verificationTable.locator('.oc-excel-cell-select.ant-select').count() > 0, '下拉框使用通用组件实际 DOM');
  ensure(await verificationTable.locator('.oc-excel-cell-picker.ant-picker').count() > 0, '日期框使用通用组件实际 DOM');

  const componentStyles = await verificationTable.evaluate((table) => {
    const read = (selector) => {
      const element = table.querySelector(selector);
      if (!element) return null;
      const style = window.getComputedStyle(element);
      return {
        borderTopWidth: style.borderTopWidth,
        borderTopColor: style.borderTopColor,
        borderRadius: style.borderRadius,
        boxShadow: style.boxShadow,
        backgroundColor: style.backgroundColor,
        height: style.height,
      };
    };
    const body = table.querySelector('.ant-table-body');
    return {
      ordinary: read('.ant-input-number.oc-excel-cell-input'),
      affix: read('.ant-input-number-affix-wrapper.oc-excel-cell-input'),
      group: read('.ant-input-number-group-wrapper.oc-excel-cell-input'),
      addon: read('.ant-input-number-group-addon'),
      text: read('.oc-excel-cell-text-input.ant-input'),
      textAffix: read('.ant-input-affix-wrapper.oc-excel-cell-text-input'),
      picker: read('.oc-excel-cell-picker.ant-picker'),
      body: body ? {
        clientWidth: body.clientWidth,
        scrollWidth: body.scrollWidth,
        clientHeight: body.clientHeight,
        scrollHeight: body.scrollHeight,
      } : null,
    };
  });
  for (const key of ['ordinary', 'affix', 'group', 'addon', 'picker']) {
    const style = componentStyles[key];
    ensure(style && style.borderTopWidth === '0px' && style.borderRadius === '0px' && style.boxShadow === 'none', `${key} 常态无独立圆角边框`, style);
  }
  for (const key of ['text', 'textAffix']) {
    const style = componentStyles[key];
    ensure(style && style.borderTopColor === 'rgba(0, 0, 0, 0)' && style.borderRadius === '0px' && style.boxShadow === 'none', `${key} 常态无可见独立圆角边框`, style);
  }
  ensure(componentStyles.body?.scrollWidth > componentStyles.body?.clientWidth, '通用表格支持横向滚动', componentStyles.body);
  ensure(componentStyles.body?.scrollHeight > componentStyles.body?.clientHeight, '通用表格支持纵向滚动', componentStyles.body);
  ensure(await verificationTable.locator('.ant-input-number-disabled, .ant-select-disabled, .ant-picker-disabled').count() >= 3, '禁用态覆盖数字、下拉和日期控件');
  const errorControls = verificationTable.locator('.ant-input-status-error, .ant-input-affix-wrapper-status-error, .ant-input-number-status-error, .ant-select-status-error, .ant-picker-status-error');
  const errorCellStyles = await errorControls.evaluateAll((controls) => controls.map((control) => ({
    className: control.className,
    boxShadow: window.getComputedStyle(control.closest('td')).boxShadow,
  })));
  ensure(await errorControls.count() >= 5, '错误态覆盖文本、数字、下拉和日期控件', errorCellStyles);
  ensure(errorCellStyles.every((item) => item.boxShadow !== 'none'), '错误态由单元格统一显示红色边界', errorCellStyles);

  const componentScreenshot = path.join(outputDir, '02-component-dom-variants.png');
  await page.locator('.excel-table-verification-harness').screenshot({ path: componentScreenshot });
  result.screenshots.push(componentScreenshot);

  const firstActualNumber = verificationTable.getByRole('spinbutton', { name: '普通数字-1' });
  await firstActualNumber.focus();
  await page.waitForTimeout(50);
  await firstActualNumber.press('ArrowDown');
  ensure(await verificationTable.getByRole('spinbutton', { name: '普通数字-3' }).evaluate((element) => document.activeElement === element), '实际组件纵向导航跳过禁用行');
  ensure(await firstActualNumber.inputValue() === '1', '实际组件数字方向键不修改值');

  const firstText = verificationTable.getByRole('textbox', { name: '文本-1', exact: true });
  await firstText.focus();
  for (let index = 0; index < 7; index += 1) {
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(20);
  }
  const scrolledBody = await verificationTable.locator('.ant-table-body').evaluate((element) => ({
    scrollLeft: element.scrollLeft,
    scrollTop: element.scrollTop,
  }));
  ensure(scrolledBody.scrollLeft > 0, '跨列导航自动滚动到横向目标', scrolledBody);

  const thirdRowNumber = verificationTable.getByRole('spinbutton', { name: '普通数字-8' });
  await thirdRowNumber.focus();
  const verticallyScrolledBody = await verificationTable.locator('.ant-table-body').evaluate((element) => ({ scrollTop: element.scrollTop }));
  ensure(verticallyScrolledBody.scrollTop > 0, '聚焦下方行时纵向滚动区域保持目标可见', verticallyScrolledBody);

  const scrollScreenshot = path.join(outputDir, '03-scroll-navigation.png');
  await page.locator('.excel-table-verification-harness').screenshot({ path: scrollScreenshot });
  result.screenshots.push(scrollScreenshot);

  ensure(result.consoleErrors.length === 0, '页面无脚本或控制台错误', result.consoleErrors);
  ensure(result.failedRequests.length === 0, '页面无失败请求', result.failedRequests);
  ensure(result.failedApiResponses.length === 0, '页面无失败接口响应', result.failedApiResponses);
  result.ok = true;
} catch (error) {
  result.error = error instanceof Error ? error.stack : String(error);
  await page.screenshot({ path: path.join(outputDir, '99-failure.png'), fullPage: true }).catch(() => {});
} finally {
  fs.writeFileSync(path.join(outputDir, 'result.json'), `${JSON.stringify(result, null, 2)}\n`);
  await browser.close();
}

if (!result.ok) {
  console.error(result.error);
  process.exit(1);
}

console.log(`Table keyboard navigation UI checks passed: ${result.checks.length}`);
