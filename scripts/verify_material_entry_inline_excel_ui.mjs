#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const appRoot = process.cwd();
const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:5173';
const outDir = process.env.OUT_DIR || path.resolve(
  appRoot,
  '..',
  'docs/e-supply/04-verification/material-entry-inline-excel-input-20260523',
);
const storageStateCandidates = [
  path.resolve(appRoot, 'logs/route-sweep-auth-dev.json'),
  path.resolve(appRoot, 'logs/route-sweep-auth.json'),
  path.resolve(appRoot, 'logs/login-state-20260412.json'),
];
const storageState = storageStateCandidates.find((item) => fs.existsSync(item));

fs.mkdirSync(outDir, { recursive: true });

function readDotenv(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }
  return Object.fromEntries(
    fs.readFileSync(filePath, 'utf8')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => {
        const idx = line.indexOf('=');
        return [
          line.slice(0, idx),
          line.slice(idx + 1).replace(/^['"]|['"]$/g, ''),
        ];
      }),
  );
}

const backendEnv = readDotenv(path.resolve(appRoot, '..', 'e-supply-back/src/main/resources/.env'));
const username = process.env.ESUPPLY_ADMIN_EMAIL || backendEnv.ESUPPLY_ADMIN_EMAIL || 'admin@huaaosoft.com';
const password = process.env.ESUPPLY_ADMIN_PASSWORD || backendEnv.ESUPPLY_ADMIN_PASSWORD;

const result = {
  baseUrl,
  outDir,
  storageState,
  checks: [],
  screenshots: [],
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function addCheck(message, ok, extra = {}) {
  result.checks.push({ message, ok, ...extra });
  if (!ok) {
    throw new Error(message);
  }
}

async function screenshot(page, name) {
  const target = path.join(outDir, name);
  await page.screenshot({ path: target, fullPage: true });
  result.screenshots.push(target);
}

async function ensureLogin(page, context) {
  await page.goto(`${baseUrl}/welcome`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(1200);
  if (await page.getByText('物料档案').count()) {
    return;
  }
  const loginButton = page.getByRole('button', { name: /登录系统|登录|Sign in|Login/i }).first();
  if (await loginButton.count()) {
    await loginButton.click();
    await sleep(1800);
  }
  const identifier = page.locator('input[name="identifier"], input[type="email"], input[name="username"], input[name="emailAddress"]').first();
  if (!await identifier.count()) {
    return;
  }
  if (!password) {
    throw new Error('Missing ESUPPLY_ADMIN_PASSWORD. Set it in env or e-supply-back/src/main/resources/.env');
  }
  await identifier.fill(username);
  const continueButton = page.getByRole('button', { name: /继续|Continue|Sign in|下一步|登录/i }).first();
  if (await continueButton.count()) {
    await continueButton.click();
  }
  const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
  await passwordInput.waitFor({ state: 'visible', timeout: 30000 });
  await passwordInput.fill(password);
  const submitButton = page.getByRole('button', { name: /继续|Continue|Sign in|登录/i }).first();
  await submitButton.click();
  await page.waitForLoadState('domcontentloaded', { timeout: 30000 }).catch(() => {});
  await sleep(4000);
  await context.storageState({ path: path.resolve(appRoot, 'logs/route-sweep-auth-dev.json') }).catch(() => {});
}

async function verifyStockingPurchase(page) {
  await page.goto(`${baseUrl}/material/purchase-prep`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.getByText('备料采购入库').first().waitFor({ state: 'visible', timeout: 30000 });
  await page.getByText('辅料/包材').first().click();
  await sleep(800);
  await page.getByRole('button', { name: '备料采购' }).click();
  const modal = page.getByRole('dialog');
  await modal.getByText('创建备料采购单').waitFor({ state: 'visible', timeout: 30000 });
  await sleep(500);
  const modalBox = await modal.boundingBox();
  const viewport = page.viewportSize();
  addCheck('备料采购弹窗宽度不超过实际视窗', Boolean(modalBox && viewport && modalBox.width <= viewport.width - 24 && modalBox.width >= viewport.width - 80), {
    modalWidth: modalBox?.width,
    viewportWidth: viewport?.width,
  });
  const modalPadding = await page.locator('.stocking-purchase-create-modal .ant-modal-content').first().evaluate((node) => {
    const style = window.getComputedStyle(node);
    return {
      paddingLeft: Number.parseFloat(style.paddingLeft),
      paddingRight: Number.parseFloat(style.paddingRight),
    };
  });
  addCheck('备料采购弹窗左右 padding 留白充足', modalPadding.paddingLeft >= 32 && modalPadding.paddingRight >= 32, modalPadding);

  const beforeText = await modal.innerText();
  addCheck('备料采购弹窗已取消旧的“添加物料/添加所选”流程', !/添加物料|添加所选/.test(beforeText), {
    textSnippet: beforeText.slice(0, 800),
  });
  addCheck('备料采购弹窗已移除表头区域“新增一行”入口', await modal.locator('.stocking-purchase-entry-summary button', { hasText: '新增一行' }).count() === 0);
  addCheck('备料采购弹窗启用 Excel 风格明细表', await modal.locator('.oc-excel-entry-table.stocking-purchase-entry-table').count() === 1);
  addCheck('备料采购弹窗提供底部“新增一行”入口', await modal.locator('.oc-excel-table-footer').count() === 1);

  await modal.getByText('搜索物料名称/编号').first().waitFor({ state: 'visible', timeout: 20000 });
  addCheck('创建弹窗打开后默认已有第一行', await modal.locator('.stocking-purchase-entry-table .ant-table-tbody tr.ant-table-row').count() >= 1);
  addCheck('备料采购明细表增加物料图片列', (await modal.innerText()).includes('物料图片'));
  addCheck('默认第一行物料列显示可搜索选择框', await modal.getByText('搜索物料名称/编号').count() >= 1);
  const afterAddText = await modal.innerText();
  addCheck('颜色、规格、备注拆分为独立表格列', afterAddText.includes('颜色') && afterAddText.includes('规格') && afterAddText.includes('备注') && !afterAddText.includes('颜色/规格/备注'));
  const headerText = await modal.locator('.stocking-purchase-entry-table .ant-table-thead').innerText();
  addCheck('备注列位于采购单价后、操作前', headerText.indexOf('采购单价') < headerText.indexOf('备注') && headerText.indexOf('备注') < headerText.indexOf('操作'), {
    headerText,
  });
  addCheck('默认第一行数量输入框贴合单元格', await modal.locator('.oc-excel-cell-input').count() >= 2);
  addCheck('默认第一行行内操作提供插入、复制、移除', (await modal.innerText()).includes('插入') && (await modal.innerText()).includes('复制') && (await modal.innerText()).includes('移除'));

  await sleep(500);
  await screenshot(page, '01-stocking-purchase-inline-row-top-add.png');

  const footerAdd = modal.locator('.oc-excel-table-footer button');
  await footerAdd.click();
  await sleep(500);
  addCheck('底部新增一行按钮可以继续向下添加', await modal.locator('.stocking-purchase-entry-table .ant-table-tbody tr.ant-table-row').count() >= 2);

  const insertButtons = modal.locator('.oc-excel-row-actions button', { hasText: '插入' });
  addCheck('每行提供就近插入入口', await insertButtons.count() >= 2);
  await insertButtons.first().click();
  await sleep(500);
  addCheck('行内“插入”可在当前位置后新增行', await modal.locator('.stocking-purchase-entry-table .ant-table-tbody tr.ant-table-row').count() >= 3);

  const materialSelect = modal.locator('.oc-excel-cell-select.ant-select').first();
  await materialSelect.click();
  await page.keyboard.type('辅料');
  await sleep(1000);
  addCheck('物料行内下拉选择框支持搜索输入', await page.locator('.ant-select-dropdown').filter({ hasText: /辅料|暂无数据|暂无匹配|Not Found/i }).count() >= 1);
  const dropdownText = await page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)').first().innerText().catch(() => '');
  addCheck('物料下拉选项只展示名称和编号，不混入颜色规格参考价', !/颜色:|规格:|参考价:/.test(dropdownText), {
    dropdownText: dropdownText.slice(0, 300),
  });
  const firstOption = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option').first();
  if (await firstOption.count()) {
    await firstOption.click();
    await sleep(500);
    const firstItemRow = modal.locator('.stocking-purchase-entry-table .ant-table-tbody tr.ant-table-row').filter({ hasText: '插入' }).first();
    const quantityInput = firstItemRow.locator('.oc-excel-cell-input input').first();
    await quantityInput.click();
    await sleep(200);
    const focusedCellStyle = await quantityInput.locator('xpath=ancestor::td[1]').evaluate((node) => {
      const style = window.getComputedStyle(node);
      return {
        boxShadow: style.boxShadow,
        backgroundColor: style.backgroundColor,
      };
    });
    addCheck('表格单元格 focus 状态有明确边框变化', focusedCellStyle.boxShadow !== 'none', focusedCellStyle);
    const quantityUnitStyle = await firstItemRow.locator('.ant-input-number-group-addon').first().evaluate((node) => {
      const style = window.getComputedStyle(node);
      return {
        borderTopWidth: Number.parseFloat(style.borderTopWidth),
        borderRightWidth: Number.parseFloat(style.borderRightWidth),
        borderBottomWidth: Number.parseFloat(style.borderBottomWidth),
        borderLeftWidth: Number.parseFloat(style.borderLeftWidth),
        boxShadow: style.boxShadow,
      };
    });
    addCheck(
      '采购数量单位无边框',
      quantityUnitStyle.borderTopWidth === 0
        && quantityUnitStyle.borderRightWidth === 0
        && quantityUnitStyle.borderBottomWidth === 0
        && quantityUnitStyle.borderLeftWidth === 0
        && quantityUnitStyle.boxShadow === 'none',
      quantityUnitStyle,
    );
  }

  await screenshot(page, '02-stocking-purchase-bottom-add-and-search.png');
}

async function verifyIssueModal(page) {
  await page.goto(`${baseUrl}/material/stock`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.getByText('物料库存').first().waitFor({ state: 'visible', timeout: 30000 });
  await sleep(1200);
  const selectableRows = page.locator('.ant-table-tbody .ant-table-selection-column .ant-checkbox-wrapper:not(.ant-checkbox-wrapper-disabled)');
  const rowCount = await selectableRows.count();
  result.issueModalSkipped = rowCount === 0;
  if (rowCount === 0) {
    result.checks.push({ message: '物料库存无可勾选库存行，跳过领料弹窗截图', ok: true, skipped: true });
    return;
  }
  await selectableRows.first().click();
  await sleep(500);
  const issueButton = page.getByRole('button', { name: '领料出库' }).first();
  addCheck('物料库存勾选后启用领料出库按钮', await issueButton.isEnabled());
  await issueButton.click();
  const modal = page.locator('.ant-modal-content:visible').filter({ hasText: '领料出库' });
  await modal.waitFor({ state: 'visible', timeout: 20000 });
  await modal.getByText('批量出库数量').waitFor({ state: 'visible', timeout: 20000 });
  addCheck('领料出库弹窗启用 Excel 风格明细表', await modal.locator('.oc-excel-entry-table.material-issue-entry-table').count() === 1);
  addCheck('领料出库数量输入框贴合单元格', await modal.locator('.oc-excel-cell-input').count() >= 1);
  await sleep(500);
  await screenshot(page, '03-material-issue-modal-excel-table.png');
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1100 },
  storageState,
});
const page = await context.newPage();

try {
  await ensureLogin(page, context);
  await verifyStockingPurchase(page);
  await verifyIssueModal(page);
  result.ok = result.checks.every((item) => item.ok);
} catch (error) {
  result.ok = false;
  result.error = String(error?.message || error);
  result.finalUrl = page.url();
  await screenshot(page, '99-failure.png').catch(() => {});
  process.exitCode = 1;
} finally {
  fs.writeFileSync(path.join(outDir, 'result.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
  await browser.close();
}
