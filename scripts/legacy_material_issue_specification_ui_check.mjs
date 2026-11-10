#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const appRoot = process.cwd();
const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:5173';
const outputDir = process.env.OUT_DIR || path.resolve(
  appRoot,
  '../docs/e-supply/04-verification/legacy-material-issue-specification-20261110',
);
const storageStateCandidates = [
  path.resolve(appRoot, 'logs/route-sweep-auth-dev.json'),
  path.resolve(appRoot, 'logs/route-sweep-auth.json'),
];
const storageState = storageStateCandidates.find((candidate) => fs.existsSync(candidate));

fs.mkdirSync(outputDir, { recursive: true });

const result = {
  baseUrl,
  outputDir,
  storageState,
  checks: [],
  screenshots: [],
};

const ensure = (condition, message, extra = {}) => {
  result.checks.push({ message, ok: Boolean(condition), ...extra });
  if (!condition) throw new Error(message);
};

const screenshot = async (page, name) => {
  const target = path.join(outputDir, name);
  await page.screenshot({ path: target, fullPage: true });
  result.screenshots.push(target);
};

const legacyRow = {
  id: '9001',
  materialId: '7001',
  materialMinimumSpecificationId: null,
  materialMinimumSpecificationLabel: null,
  materialMinimumSpecificationColor: null,
  legacySpecification: true,
  materialType: 'accessory',
  materialCode: 'ACC-LEGACY-001',
  materialName: '历史汇总松紧带',
  color: null,
  colorStocks: [],
  specification: '历史多规格汇总',
  unit: '米',
  warehouseId: '301',
  warehouseName: '永春仓库',
  stockQty: 100,
  availableQty: 100,
  inTransitQty: 0,
  remark: '历史库存',
};

const formalRow = {
  id: '9002',
  materialId: '7002',
  materialMinimumSpecificationId: '502',
  materialMinimumSpecificationLabel: '黑色 / 20mm',
  materialMinimumSpecificationColor: '黑色',
  legacySpecification: false,
  materialType: 'accessory',
  materialCode: 'ACC-FORMAL-002',
  materialName: '正式规格织带',
  color: '黑色',
  colorStocks: [],
  specification: '20mm',
  unit: '米',
  warehouseId: '301',
  warehouseName: '永春仓库',
  stockQty: 50,
  availableQty: 50,
  inTransitQty: 0,
  remark: '',
};

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1480, height: 1080 },
  ...(storageState ? { storageState } : {}),
});
const page = await context.newPage();
let submittedPayload;
const browserErrors = [];

page.on('console', (message) => {
  if (message.type() === 'error') browserErrors.push(`console:${message.text()}`);
});
page.on('pageerror', (error) => browserErrors.push(`page:${error.message}`));

const fulfillJson = (route, body, status = 200) => route.fulfill({
  status,
  contentType: 'application/json',
  body: JSON.stringify(body),
});

await page.route('**/api/v1/inventory/materials/meta?**', (route) => fulfillJson(route, {
  materialTabs: [
    { value: 'fabric', label: '面料' },
    { value: 'accessory', label: '辅料/包材' },
  ],
  warehouses: [{ id: '301', name: '永春仓库' }],
}));
await page.route('**/api/v1/inventory/materials/summary?**', (route) => fulfillJson(route, {
  stockQtyTotal: 150,
  availableQtyTotal: 150,
  inTransitQtyTotal: 0,
  stockAmountTotal: 0,
}));
await page.route('**/api/v1/inventory/materials?**', (route) => fulfillJson(route, {
  list: [legacyRow, formalRow],
  total: 2,
}));
await page.route('**/api/v1/inventory/material-issues/materials/7001/specifications?**', (route) => fulfillJson(route, [
  { id: '501', label: '红色 / 10mm', color: '红色', specification: '10mm' },
  { id: '503', label: '蓝色 / 12mm', color: '蓝色', specification: '12mm' },
]));
await page.route('**/api/v1/workshop/cutting/pending?**', (route) => fulfillJson(route, {
  summary: [], list: [], total: 0, page: 1, pageSize: 20,
}));
await page.route('**/api/v1/inventory/material-issues?**', async (route) => {
  if (route.request().method() !== 'POST') {
    return fulfillJson(route, { list: [], total: 0, summary: { issueQtyTotal: 0, amountTotal: 0 } });
  }
  submittedPayload = route.request().postDataJSON();
  return fulfillJson(route, {
    issueId: '9901',
    issueNo: 'MI-UI-9901',
    status: 'issued',
    statusLabel: '已出库',
    lineCount: 2,
  });
});

try {
  await page.goto(`${baseUrl}/material/stock`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.getByText('物料库存').first().waitFor({ state: 'visible', timeout: 30_000 });
  await page.getByText('辅料/包材').first().click();
  await page.getByText('历史汇总松紧带').waitFor({ state: 'visible', timeout: 20_000 });

  const legacyTableRow = page.locator('tr.ant-table-row').filter({ hasText: '历史汇总松紧带' });
  const formalTableRow = page.locator('tr.ant-table-row').filter({ hasText: '正式规格织带' });
  await legacyTableRow.locator('.ant-checkbox-wrapper').click();
  await formalTableRow.locator('.ant-checkbox-wrapper').click();
  const issueButton = page.getByRole('button', { name: '领料出库' }).first();
  ensure(await issueButton.isEnabled(), '选择库存行后领料出库按钮应启用');
  await issueButton.click();

  const modal = page.getByRole('dialog').filter({ hasText: '领料出库' });
  await modal.waitFor({ state: 'visible', timeout: 20_000 });
  await modal.getByText('历史库存需选择本次实际出库规格').waitFor({ state: 'visible' });
  ensure(
    await modal.getByText('剩余历史库存保持不变').count() === 1,
    '弹窗应明确只扣减本次数量，剩余历史库存不改绑',
  );
  ensure(
    await modal.locator('.material-issue-entry-table .ant-select').count() === 1,
    '只有历史库存行显示规格下拉框',
  );
  ensure(
    (await modal.locator('.material-issue-entry-table .ant-table-thead').innerText()).includes('出库规格'),
    '规格列应使用业务文案“出库规格”',
  );
  ensure(
    (await modal.innerText()).includes('20mm'),
    '正式规格库存行应直接显示原规格',
  );

  const legacyIssueRow = modal.locator('tr.ant-table-row').filter({ hasText: '历史汇总松紧带' });
  const formalIssueRow = modal.locator('tr.ant-table-row').filter({ hasText: '正式规格织带' });
  await legacyIssueRow.locator('.ant-select').click();
  const dropdown = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)');
  await dropdown.getByText('红色 / 10mm').click();
  await modal.getByText(/已填写数量的物料/).click();
  const quantityInputs = modal.locator('.material-issue-entry-table .ant-input-number-input');
  await quantityInputs.nth(0).fill('10');
  await quantityInputs.nth(1).fill('5');
  await page.waitForTimeout(300);

  const legacyUnitStyle = await legacyIssueRow.locator('.ant-input-number-group-addon').evaluate((node) => {
    const style = window.getComputedStyle(node);
    return {
      borderTopWidth: Number.parseFloat(style.borderTopWidth),
      borderRightWidth: Number.parseFloat(style.borderRightWidth),
      borderBottomWidth: Number.parseFloat(style.borderBottomWidth),
      borderLeftWidth: Number.parseFloat(style.borderLeftWidth),
      boxShadow: style.boxShadow,
    };
  });
  ensure(
    Object.entries(legacyUnitStyle).every(([key, value]) => key === 'boxShadow' ? value === 'none' : value === 0),
    '数量单位应保持无边框纯文本后缀',
    legacyUnitStyle,
  );

  await screenshot(page, '01-legacy-and-formal-issue-specification.png');
  const confirmButton = page.locator('.ant-modal-wrap:visible .ant-modal-footer .ant-btn-primary');
  ensure(
    await confirmButton.isEnabled(),
    '历史库存选择正式规格并填写数量后应允许出库',
    { buttonText: await confirmButton.innerText(), disabled: await confirmButton.isDisabled() },
  );
  await confirmButton.click();
  await page.getByText('出库成功，单号 MI-UI-9901').waitFor({ state: 'visible', timeout: 10_000 });

  ensure(Boolean(submittedPayload), '页面应提交领料出库请求');
  const submittedLegacy = submittedPayload.lines.find((line) => line.sourceInventoryBalanceId === 9001);
  const submittedFormal = submittedPayload.lines.find((line) => line.sourceInventoryBalanceId === 9002);
  ensure(
    submittedLegacy?.materialMinimumSpecificationId === 501 && submittedLegacy?.quantity === 10,
    '历史库存行应提交来源库存行和用户选择的正式规格',
    { submittedLegacy },
  );
  ensure(
    submittedFormal?.materialMinimumSpecificationId === 502 && submittedFormal?.quantity === 5,
    '正式库存行应提交来源库存行和原正式规格',
    { submittedFormal },
  );
  ensure(browserErrors.length === 0, '页面验收期间不应出现控制台或运行时错误', { browserErrors });
  result.ok = true;
} catch (error) {
  result.ok = false;
  result.error = String(error?.message || error);
  result.finalUrl = page.url();
  await screenshot(page, '99-failure.png').catch(() => {});
  process.exitCode = 1;
} finally {
  fs.writeFileSync(path.join(outputDir, 'result.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
  await browser.close();
}
