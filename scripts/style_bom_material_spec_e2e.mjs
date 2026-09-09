#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const appRoot = process.cwd();
const baseUrl = process.env.ESUPPLY_BASE_URL || 'http://127.0.0.1:5176';
const apiBaseUrl = process.env.ESUPPLY_API_BASE_URL;
const styleId = process.env.ESUPPLY_STYLE_ID;
const authToken = process.env.ESUPPLY_AUTH_TOKEN;
const tenantId = process.env.ESUPPLY_TENANT_ID || '1';
const storageStatePath = process.env.ESUPPLY_STORAGE_STATE || path.resolve(
  appRoot,
  'logs/route-sweep-auth-dev.json',
);
const outputDir = process.env.ESUPPLY_OUTPUT_DIR || path.resolve(
  appRoot,
  '../docs/e-supply/04-verification/style-bom-inline-entry-20260907',
);
const backendEnvPath = process.env.ESUPPLY_BACKEND_ENV
  || '/Users/jambin/codes/supply-and-sale/e-supply-back/src/main/resources/.env';

function readDotenv(filePath) {
  if (!fs.existsSync(filePath)) return {};
  return Object.fromEntries(
    fs.readFileSync(filePath, 'utf8')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => {
        const separator = line.indexOf('=');
        return [line.slice(0, separator), line.slice(separator + 1).replace(/^['"]|['"]$/g, '')];
      }),
  );
}

const backendEnv = readDotenv(backendEnvPath);
const username = process.env.ESUPPLY_ADMIN_EMAIL || backendEnv.ESUPPLY_ADMIN_EMAIL;
const password = process.env.ESUPPLY_ADMIN_PASSWORD || backendEnv.ESUPPLY_ADMIN_PASSWORD;
fs.mkdirSync(outputDir, { recursive: true });
for (const name of [
  '01-style-bom-inline-entry-desktop.png',
  '02-style-bom-inline-entry-mobile.png',
  '03-style-bom-impact-preview.png',
  '04-style-bom-save-warning.png',
  '05-style-bom-all-colors-option.png',
  '06-style-bom-all-colors-dropdown.png',
  '99-style-bom-failure.png',
  'result.json',
]) {
  fs.rmSync(path.join(outputDir, name), { force: true });
}
if (!styleId) {
  throw new Error('请通过 ESUPPLY_STYLE_ID 指定本次集成测试动态创建的款式');
}

const result = {
  ok: false,
  baseUrl,
  apiBaseUrl,
  styleId,
  checks: [],
  screenshots: [],
  consoleErrors: [],
  failedRequests: [],
  failedApiResponses: [],
  materialRequests: [],
};

function check(name, condition, detail = undefined) {
  result.checks.push({ name, ok: Boolean(condition), detail });
  if (!condition) throw new Error(name);
}

async function capture(page, name, locator = undefined) {
  const target = path.join(outputDir, name);
  if (locator) await locator.screenshot({ path: target });
  else await page.screenshot({ path: target, fullPage: true });
  result.screenshots.push(name);
}

async function ensureLogin(page) {
  await page.goto(`${baseUrl}/welcome`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForTimeout(1_000);
  const workspaceHeading = page.getByRole('heading', { name: '工作台', exact: true }).first();
  await workspaceHeading.waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {});
  if (await workspaceHeading.isVisible().catch(() => false)) return;
  if (authToken) {
    const existingSessionButton = page.getByRole('button', { name: '登录系统' }).first();
    if (await existingSessionButton.count()) {
      await existingSessionButton.click();
      await page.waitForTimeout(1_000);
    }
    if (/sign-in|accounts|clerk/i.test(page.url())) {
      throw new Error(`本地 API 令牌模式需要有效的页面登录态：${storageStatePath}`);
    }
    return;
  }
  check('本地验收账号配置存在', Boolean(username && password));
  const loginButton = page.getByRole('button', { name: /登录系统|登录|Sign in|Login/i }).first();
  if (await loginButton.count()) {
    await loginButton.click();
    await page.waitForTimeout(1_000);
  }
  const identifier = page.locator('input[name="identifier"], input[type="email"], input[name="username"], input[name="emailAddress"]').first();
  await identifier.waitFor({ state: 'visible', timeout: 30_000 });
  await identifier.fill(username);
  await page.getByRole('button', { name: /继续|Continue|Sign in|下一步|登录/i }).first().click();
  const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
  await passwordInput.waitFor({ state: 'visible', timeout: 30_000 });
  await passwordInput.fill(password);
  await page.getByRole('button', { name: /继续|Continue|Sign in|登录/i }).first().click();
  await page.waitForURL((url) => !/sign-in|accounts|clerk/i.test(url.href), { timeout: 40_000 });
}

async function chooseMaterial(page, row, type) {
  const isFabric = type === 'FABRIC';
  const materialSelect = row.getByRole('combobox', { name: isFabric ? '面料物料' : '辅料/包材物料' });
  const initialResponse = page.waitForResponse((response) => (
    response.request().method() === 'GET'
    && response.url().includes('/api/v1/materials?')
    && response.url().includes(`materialType=${type}`)
  ));
  await materialSelect.click();
  const initialPayload = await (await initialResponse).json();
  const candidates = (initialPayload.items ?? []).filter((item) => (
    item.minimumSpecifications?.some((specification) => specification.active !== false && specification.id)
  ));
  const selectedMaterialLabels = await page.locator(
    '.style-bom-inline-material-cell .ant-select-selection-item',
  ).allTextContents();
  const unselectedCandidates = candidates.filter((item) => (
    !selectedMaterialLabels.some((label) => label.includes(item.name))
  ));
  const material = unselectedCandidates[0];
  const staleMaterial = unselectedCandidates[1];
  check(`${isFabric ? '面料' : '辅料'}搜索返回可选物料`, Boolean(material));
  check(`${isFabric ? '面料' : '辅料'}具备并发搜索验收数据`, Boolean(staleMaterial));
  delayedMaterialKeyword = staleMaterial.name;
  const staleRequest = page.waitForRequest((request) => (
    request.method() === 'GET'
    && request.url().includes('/api/v1/materials?')
    && request.url().includes(`materialType=${type}`)
    && request.url().includes(`keyword=${encodeURIComponent(staleMaterial.name)}`)
  ));
  await materialSelect.fill(staleMaterial.name);
  await staleRequest;
  await materialSelect.fill(material.name);
  const searchResponse = await page.waitForResponse((response) => (
    response.request().method() === 'GET'
    && response.url().includes('/api/v1/materials?')
    && response.url().includes(`materialType=${type}`)
    && response.url().includes('keyword=')
  ));
  check(`${isFabric ? '面料' : '辅料'}关键词由后端搜索`, searchResponse.ok(), searchResponse.url());
  await page.waitForTimeout(800);
  const option = page.locator('.ant-select-dropdown:visible .ant-select-item-option').filter({
    hasText: material.name,
  }).first();
  await option.waitFor({ state: 'visible', timeout: 10_000 });
  check(
    `${isFabric ? '面料' : '辅料'}旧搜索响应不会覆盖最新结果`,
    await page.locator('.ant-select-dropdown:visible .ant-select-item-option').filter({
      hasText: staleMaterial.name,
    }).count() === 0,
  );
  delayedMaterialKeyword = undefined;
  await option.click();
  return material;
}

async function completeInlineRow(page, row, type) {
  const material = await chooseMaterial(page, row, type);
  const isFabric = type === 'FABRIC';
  const specificationSelect = row.getByRole('combobox', { name: /最小规格$/ });
  const activeSpecifications = (material.minimumSpecifications ?? []).filter((item) => (
    item.active !== false && item.id
  ));
  check('物料与最小规格使用两个独立下拉单元格', await specificationSelect.count() === 1);
  if (activeSpecifications.length > 1) {
    await specificationSelect.click();
    const listboxId = await specificationSelect.getAttribute('aria-controls');
    check('最小规格下拉具备独立列表语义', Boolean(listboxId));
    const specificationDropdown = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)')
      .filter({ hasText: activeSpecifications[0].label })
      .last();
    await specificationDropdown.waitFor({ state: 'visible', timeout: 10_000 });
    const specificationOptions = specificationDropdown.locator(
      '.ant-select-item-option:not(.ant-select-item-option-disabled)',
    );
    await specificationOptions.first().waitFor({ state: 'visible', timeout: 10_000 });
    check(
      '最小规格下拉展示所选物料的全部启用规格',
      await specificationOptions.count() === activeSpecifications.length,
      { expected: activeSpecifications.length, actual: await specificationOptions.count() },
    );
    await specificationOptions.first().click();
    await page.keyboard.press('Escape');
  } else {
    check(
      '单一启用规格自动选中',
      await row.locator('.ant-select-selection-item').filter({ hasText: activeSpecifications[0].label }).count() === 1,
    );
  }
  const colorSelect = row.getByRole('combobox', { name: /适用颜色$/ });
  const averageConsumptionInput = row.getByRole('spinbutton', { name: /平均单件用量$/ });
  check(
    `${isFabric ? '面料' : '辅料'}可在行内维护适用颜色`,
    await colorSelect.count() === 1,
  );
  check(
    `${isFabric ? '面料' : '辅料'}新增行默认选中一个适用颜色`,
    await row.locator('.ant-select-selection-item').filter({ hasText: /黑色|白色/ }).count() === 1,
  );
  const colorSelectRoot = colorSelect.locator(
    'xpath=ancestor::div[contains(concat(" ", normalize-space(@class), " "), " ant-select ")][1]',
  );
  await page.keyboard.press('Escape');
  await colorSelectRoot.locator('.ant-select-selector').click();
  const colorListboxId = await colorSelect.getAttribute('aria-controls');
  check(`${isFabric ? '面料' : '辅料'}适用颜色下拉具备独立列表语义`, Boolean(colorListboxId));
  const colorDropdown = page.locator(`#${colorListboxId}`).locator(
    'xpath=ancestor::div[contains(concat(" ", normalize-space(@class), " "), " ant-select-dropdown ")][1]',
  );
  await colorDropdown.waitFor({ state: 'visible', timeout: 10_000 });
  const allColorsOption = colorDropdown.locator('.ant-select-item-option').filter({ hasText: '全部颜色' });
  await allColorsOption.first().waitFor({ state: 'visible', timeout: 10_000 });
  check(
    `${isFabric ? '面料' : '辅料'}适用颜色提供独立的全部颜色选项`,
    await allColorsOption.count() >= 1,
  );
  await allColorsOption.first().click();
  check(
    '选择全部颜色后只显示一个范围标签',
    await row.locator('.ant-select-selection-item').filter({ hasText: '全部颜色' }).count() === 1
      && await row.locator('.ant-select-selection-item').filter({ hasText: /黑色|白色/ }).count() === 0,
  );
  await colorDropdown.locator('.ant-select-item-option').filter({ hasText: '黑色' }).first().click();
  await page.keyboard.press('Escape');
  check(
    '从全部颜色选择具体颜色时自动退出全部颜色范围',
    await row.locator('.ant-select-selection-item').filter({ hasText: '黑色' }).count() === 1
      && await row.locator('.ant-select-selection-item').filter({ hasText: '全部颜色' }).count() === 0,
  );
  await colorSelect.click();
  await page.locator('.ant-select-dropdown:visible .ant-select-item-option').filter({ hasText: '白色' }).first().click();
  await page.keyboard.press('Escape');
  check(
    '逐个选择当前全部颜色仍保持具体颜色范围',
    await row.locator('.ant-select-selection-item').filter({ hasText: /黑色|白色/ }).count() === 2
      && await row.locator('.ant-select-selection-item').filter({ hasText: '全部颜色' }).count() === 0,
  );
  await averageConsumptionInput.fill('1.25');
  await row.getByRole('spinbutton', { name: /损耗率$/ }).fill('2.5');
  await row.getByPlaceholder('可选').fill(`${isFabric ? '面料' : '辅料'}行内录入验收`);
  check(
    '平均单耗、损耗率和备注可在同一行填写',
    Number(await row.getByRole('spinbutton', { name: /平均单件用量$/ }).inputValue()) === 1.25
      && Number(await row.getByRole('spinbutton', { name: /损耗率$/ }).inputValue()) === 2.5
      && Boolean(await row.getByPlaceholder('可选').inputValue()),
  );
}

async function removeInlineRow(page, row) {
  const rowKey = await row.getAttribute('data-row-key');
  check('新增用料行具备稳定行标识', Boolean(rowKey));
  await row.getByRole('button', { name: '移除用料' }).click();
  const confirm = page.locator('.ant-popconfirm:visible');
  await confirm.waitFor({ state: 'visible', timeout: 10_000 });
  await confirm.locator('.ant-popconfirm-buttons .ant-btn-primary').click();
  await page.locator(`tr[data-row-key="${rowKey}"]`).waitFor({ state: 'detached', timeout: 10_000 });
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1050 },
  ...(fs.existsSync(storageStatePath) ? { storageState: storageStatePath } : {}),
});
const page = await context.newPage();
let delayedMaterialKeyword;

await page.route('**/api/**', async (route) => {
  const requestUrl = new URL(route.request().url());
  if (!requestUrl.pathname.startsWith('/api/')) {
    await route.continue();
    return;
  }
  const keyword = requestUrl.searchParams.get('keyword');
  if (delayedMaterialKeyword && keyword === delayedMaterialKeyword) {
    await new Promise((resolve) => setTimeout(resolve, 700));
  }
  const headers = { ...route.request().headers() };
  if (authToken) {
    headers.authorization = `Bearer ${authToken}`;
    headers['x-tenant-id'] = tenantId;
  }
  if (apiBaseUrl) {
    const upstreamUrl = new URL(`${requestUrl.pathname}${requestUrl.search}`, apiBaseUrl);
    const response = await route.fetch({ url: upstreamUrl.href, headers });
    await route.fulfill({ response });
    return;
  }
  await route.continue({ headers });
});

page.on('console', (message) => {
  if (message.type() === 'error') result.consoleErrors.push(message.text());
});
page.on('requestfailed', (request) => {
  const reason = request.failure()?.errorText;
  if (reason !== 'net::ERR_ABORTED') {
    result.failedRequests.push({ url: request.url(), reason });
  }
});
page.on('response', (response) => {
  if (response.request().method() === 'GET' && response.url().includes('/api/v1/materials?')) {
    result.materialRequests.push(response.url().replace(/tenantId=[^&]+/, 'tenantId=<tenant>'));
  }
  if (response.url().includes('/api/') && response.status() >= 400) {
    result.failedApiResponses.push({ url: response.url().replace(/tenantId=[^&]+/, 'tenantId=<tenant>'), status: response.status() });
  }
});

try {
  await ensureLogin(page);
  await page.goto(`${baseUrl}/foundation/product/detail?id=${encodeURIComponent(styleId)}`, {
    waitUntil: 'domcontentloaded',
    timeout: 60_000,
  });
  const section = page.getByTestId('style-bom-section');
  await section.waitFor({ state: 'visible', timeout: 30_000 });
  await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});

  check('页面不再挂载款式用料编辑抽屉', await page.locator('.style-bom-editor-drawer-root').count() === 0);
  check('页面不再按颜色拆成多个页签', await section.locator('.style-bom-color-tabs').count() === 0);
  check('页面不再展示尺码用量矩阵', await section.locator('.style-bom-size-material-table').count() === 0);
  check('面料和辅料按两类汇总展示', await section.locator('.style-bom-summary-panel').count() === 2);
  check('汇总表显示平均单件用量和适用颜色',
    await section.getByRole('columnheader', { name: '平均单件用量' }).count() === 2
      && await section.getByRole('columnheader', { name: '适用颜色' }).count() === 2);
  check('提供按类型添加用料入口',
    await section.getByText('添加面料', { exact: true }).count() === 1
      && await section.getByText('添加辅料/包材', { exact: true }).count() === 1);

  const fabricPanel = section.locator('.style-bom-summary-panel').nth(0);
  const accessoryPanel = section.locator('.style-bom-summary-panel').nth(1);
  const initialFabricCount = await fabricPanel.locator('tbody tr.ant-table-row').count();
  const initialAccessoryCount = await accessoryPanel.locator('tbody tr.ant-table-row').count();
  check('验收款式至少保留一项可保存面料', initialFabricCount > 0);

  await section.getByRole('button', { name: '添加面料' }).click();
  const addedFabricRow = fabricPanel.locator('tbody tr.ant-table-row').last();
  check('点击添加面料直接新增表格行', await fabricPanel.locator('tbody tr.ant-table-row').count() === initialFabricCount + 1);
  await completeInlineRow(page, addedFabricRow, 'FABRIC');

  await section.getByRole('button', { name: '添加辅料/包材' }).click();
  const addedAccessoryRow = accessoryPanel.locator('tbody tr.ant-table-row').last();
  check('点击添加辅料直接新增表格行', await accessoryPanel.locator('tbody tr.ant-table-row').count() === initialAccessoryCount + 1);
  await completeInlineRow(page, addedAccessoryRow, 'ACCESSORY');
  check('新增和填写过程中没有打开弹窗或抽屉',
    await page.locator('.ant-modal:visible, .ant-drawer:visible').count() === 0);

  const tableLayout = await section.evaluate((node) => {
    const cardBody = node.closest('.style-detail-bom-card')?.querySelector('.ant-card-body');
    const firstCell = node.querySelector('.style-bom-summary-table .ant-table-tbody > .ant-table-row > td:first-child');
    const suffix = node.querySelector('.style-bom-average-input .ant-input-number-suffix');
    const readPadding = (element) => {
      if (!element) return undefined;
      const style = window.getComputedStyle(element);
      return `${style.paddingTop} ${style.paddingRight} ${style.paddingBottom} ${style.paddingLeft}`;
    };
    return {
      cardPadding: readPadding(cardBody),
      firstCellPadding: readPadding(firstCell),
      suffixBorder: suffix ? window.getComputedStyle(suffix).borderStyle : undefined,
      suffixBackground: suffix ? window.getComputedStyle(suffix).backgroundColor : undefined,
    };
  });
  check('款式用料卡片保持紧凑内边距', tableLayout.cardPadding === '8px 14px 8px 14px', tableLayout);
  check('汇总表使用单元格输入语义', tableLayout.firstCellPadding === '0px 0px 0px 0px', tableLayout);
  check('平均单耗单位是无独立边框的输入后缀',
    tableLayout.suffixBorder === 'none'
      && ['rgba(0, 0, 0, 0)', 'transparent'].includes(tableLayout.suffixBackground),
    tableLayout);
  check('页面不出现逐尺码和三面用量',
    !(await section.innerText()).includes('复制尺码用量')
      && !(await section.innerText()).includes('面 A')
      && !(await section.innerText()).includes('面A'));
  await capture(page, '01-style-bom-inline-entry-desktop.png', section);

  await page.setViewportSize({ width: 390, height: 844 });
  await section.scrollIntoViewIfNeeded();
  const mobileLayout = await section.evaluate((node) => {
    const pageWidth = document.documentElement.scrollWidth;
    const overflowingDescendants = [...node.querySelectorAll('*')]
      .map((element) => ({ className: String(element.className), rect: element.getBoundingClientRect() }))
      .filter((item) => item.rect.right > pageWidth + 1)
      .slice(0, 10)
      .map((item) => ({ className: item.className, right: item.rect.right }));
    return {
      viewportWidth: document.documentElement.clientWidth,
      pageWidth,
      sectionWidth: node.getBoundingClientRect().width,
      overflowingDescendants,
    };
  });
  await capture(page, '02-style-bom-inline-entry-mobile.png', section);
  check('390 宽页面内款式用料没有新增横向溢出', mobileLayout.overflowingDescendants.length === 0, mobileLayout);
  await page.setViewportSize({ width: 1440, height: 1050 });

  await removeInlineRow(page, addedAccessoryRow);
  await removeInlineRow(page, addedFabricRow);
  check('验收临时行可删除且不进入保存',
    await fabricPanel.locator('tbody tr.ant-table-row').count() === initialFabricCount
      && await accessoryPanel.locator('tbody tr.ant-table-row').count() === initialAccessoryCount);

  const persistedFabricRow = fabricPanel.locator('tbody tr.ant-table-row').first();
  const persistedAccessoryRow = accessoryPanel.locator('tbody tr.ant-table-row').first();
  const persistedAccessoryColorSelect = persistedAccessoryRow.getByRole('combobox', { name: /适用颜色$/ });
  const persistedAccessoryColorCell = persistedAccessoryColorSelect.locator('xpath=ancestor::td[1]');
  check('已发布辅料适用颜色可以继续编辑', await persistedAccessoryColorSelect.count() === 1);
  const persistedAccessoryColors = (await persistedAccessoryColorCell.locator('.ant-select-selection-item').allTextContents())
    .map((value) => value.trim())
    .filter((value) => value === '黑色' || value === '白色');
  check('已发布辅料按限定颜色回显', persistedAccessoryColors.length === 1, persistedAccessoryColors);
  const currentAccessoryColor = persistedAccessoryColors[0];
  const targetAccessoryColor = currentAccessoryColor === '黑色' ? '白色' : '黑色';
  await persistedAccessoryColorSelect.click();
  const persistedColorDropdown = page.locator('.ant-select-dropdown:visible').filter({ hasText: '全部颜色' }).last();
  await persistedColorDropdown.locator('.ant-select-item-option').filter({ hasText: '全部颜色' }).click();
  await page.keyboard.press('Escape');
  check('已有辅料可显式切换为全部颜色',
    await persistedAccessoryColorCell.locator('.ant-select-selection-item').filter({ hasText: '全部颜色' }).count() === 1
      && await persistedAccessoryColorCell.locator('.ant-select-selection-item').filter({ hasText: /黑色|白色/ }).count() === 0);
  await persistedAccessoryColorSelect.click();
  await capture(page, '05-style-bom-all-colors-option.png');
  const allColorsDropdown = page.locator('.ant-select-dropdown:visible').filter({ hasText: '全部颜色' }).last();
  await capture(page, '06-style-bom-all-colors-dropdown.png', allColorsDropdown);
  await page.keyboard.press('Escape');
  await persistedAccessoryRow.getByPlaceholder('可选').fill('全部颜色选项验收');

  const allColorsPreviewResponsePromise = page.waitForResponse(
    (response) => response.url().includes(`/api/v1/styles/${styleId}/bom-configuration/impact-preview`) && response.status() === 200,
    { timeout: 30_000 },
  );
  await page.getByTestId('style-detail-save-button').click();
  const allColorsPreviewResponse = await allColorsPreviewResponsePromise;
  const allColorsPreviewPayload = allColorsPreviewResponse.request().postDataJSON();
  const allColorsAccessoryPayload = allColorsPreviewPayload.items.find((item) => item.remark === '全部颜色选项验收');
  check('全部颜色只通过范围标识提交且不进入颜色数组',
    allColorsAccessoryPayload?.applyToAllColors === true
      && Array.isArray(allColorsAccessoryPayload?.applicableColors)
      && allColorsAccessoryPayload.applicableColors.length === 0
      && allColorsPreviewPayload.items.every((item) => !(item.applicableColors ?? []).includes('全部颜色')),
    allColorsAccessoryPayload);
  const allColorsImpactModal = page.locator('.style-bom-impact-modal');
  await allColorsImpactModal.waitFor({ state: 'visible', timeout: 10_000 });
  await allColorsImpactModal.getByRole('button', { name: '继续检查' }).click();
  await allColorsImpactModal.waitFor({ state: 'hidden', timeout: 10_000 });

  await persistedAccessoryColorSelect.click();
  const allToSpecificDropdown = page.locator('.ant-select-dropdown:visible').filter({ hasText: targetAccessoryColor }).last();
  await allToSpecificDropdown.locator('.ant-select-item-option').filter({ hasText: targetAccessoryColor }).click();
  await page.keyboard.press('Escape');
  check('辅料适用颜色可按款式颜色重新选择',
    await persistedAccessoryColorCell.locator('.ant-select-selection-item').filter({ hasText: targetAccessoryColor }).count() === 1
      && await persistedAccessoryColorCell.locator('.ant-select-selection-item').filter({ hasText: '全部颜色' }).count() === 0);
  await persistedAccessoryRow.getByPlaceholder('可选').fill(`仅${targetAccessoryColor}使用辅料`);

  const averageInput = persistedFabricRow.getByRole('spinbutton', { name: /平均单件用量$/ });
  const initialAverageValue = Number(await averageInput.inputValue());
  check('已发布用料按平均单耗回显', Number.isFinite(initialAverageValue) && initialAverageValue > 0, {
    value: await averageInput.inputValue(),
  });
  const savedAverageValue = initialAverageValue === 1.26 ? 1.27 : 1.26;
  await averageInput.fill(String(savedAverageValue));

  const previewResponse = page.waitForResponse(
    (response) => response.url().includes(`/api/v1/styles/${styleId}/bom-configuration/impact-preview`) && response.status() === 200,
    { timeout: 30_000 },
  );
  await page.getByTestId('style-detail-save-button').click();
  const preview = await previewResponse;
  const scopedPreviewPayload = preview.request().postDataJSON();
  const scopedAccessoryPayload = scopedPreviewPayload.items.find((item) => item.remark === `仅${targetAccessoryColor}使用辅料`);
  check('从全部颜色退回具体颜色时只提交真实款式颜色',
    scopedAccessoryPayload?.applyToAllColors === false
      && scopedAccessoryPayload?.applicableColors?.length === 1
      && scopedAccessoryPayload.applicableColors[0] === targetAccessoryColor
      && !scopedAccessoryPayload.applicableColors.includes('全部颜色'),
    scopedAccessoryPayload);
  const impactModal = page.locator('.style-bom-impact-modal');
  await impactModal.waitFor({ state: 'visible', timeout: 10_000 });
  check('保存影响默认只作用于新订单', await impactModal.getByText('仅用于之后的新订单').count() === 1);
  check('存在尚未领料订单可验证未配置规格告警',
    Number(await impactModal.locator('.ant-statistic-content-value').first().innerText()) > 0);
  check('历史选项明确不覆盖原出库', (await impactModal.innerText()).includes('不覆盖原有出库记录'));
  await capture(page, '03-style-bom-impact-preview.png', impactModal);

  await impactModal.getByText('同步尚未领料的订单', { exact: true }).click();
  const updateResponsePromise = page.waitForResponse(
    (response) => response.url().includes(`/api/v1/styles/${styleId}/bom-configuration/update`) && response.status() === 200,
    { timeout: 30_000 },
  );
  await impactModal.getByRole('button', { name: /保存并同步 \d+ 个订单/ }).click();
  const updateResponse = await updateResponsePromise;
  const updatePayload = await updateResponse.json();
  await impactModal.waitFor({ state: 'hidden', timeout: 20_000 });
  const unconfiguredOrderLines = updatePayload.unconfiguredOrderLines ?? [];
  if (unconfiguredOrderLines.length > 0) {
    const warning = page.locator('.ant-message-notice-content').filter({ hasText: '用料已保存，但' }).last();
    await warning.waitFor({ state: 'visible', timeout: 10_000 });
    const warningText = await warning.innerText();
    check('页面展示未配置规格但不阻断保存的业务告警',
      warningText.includes('未生成自动用料需求') && warningText.includes('不影响后续裁床'),
      warningText);
  } else {
    const success = page.locator('.ant-message-notice-content').filter({ hasText: '款式资料和用料已更新' }).last();
    await success.waitFor({ state: 'visible', timeout: 10_000 });
    check('全部订单规格可配置时页面展示保存成功反馈', await success.count() === 1);
  }
  await capture(page, '04-style-bom-save-warning.png');

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByTestId('style-bom-section').waitFor({ state: 'visible', timeout: 30_000 });
  const reloadedSection = page.getByTestId('style-bom-section');
  const reloadedAverage = reloadedSection.getByRole('spinbutton', { name: /平均单件用量$/ }).first();
  check('保存重载后平均单耗保持', Number(await reloadedAverage.inputValue()) === savedAverageValue, { value: await reloadedAverage.inputValue() });
  const reloadedAccessoryRow = reloadedSection.locator('.style-bom-summary-panel').nth(1)
    .locator('tbody tr.ant-table-row').first();
  const reloadedAccessoryColorCell = reloadedAccessoryRow.getByRole('combobox', { name: /适用颜色$/ })
    .locator('xpath=ancestor::td[1]');
  check('辅料适用颜色保存重载后保持',
    await reloadedAccessoryColorCell.locator('.ant-select-selection-item').filter({ hasText: targetAccessoryColor }).count() === 1
      && await reloadedAccessoryColorCell.locator('.ant-select-selection-item').filter({ hasText: currentAccessoryColor }).count() === 0);
  check('保存后仍不再出现旧侧边抽屉', await page.locator('.style-bom-editor-drawer-root').count() === 0);
  check('面料和辅料关键词请求均由后端处理',
    result.materialRequests.some((url) => url.includes('materialType=FABRIC') && url.includes('keyword='))
      && result.materialRequests.some((url) => url.includes('materialType=ACCESSORY') && url.includes('keyword=')),
    result.materialRequests);

  check('无失败 API 响应', result.failedApiResponses.length === 0, result.failedApiResponses);
  check('无请求失败', result.failedRequests.length === 0, result.failedRequests);
  check('浏览器控制台无 error', result.consoleErrors.length === 0, result.consoleErrors);
  result.ok = true;
} catch (error) {
  result.error = error instanceof Error ? error.message : String(error);
  await capture(page, '99-style-bom-failure.png').catch(() => {});
  process.exitCode = 1;
} finally {
  fs.writeFileSync(path.join(outputDir, 'result.json'), `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify(result, null, 2));
  await browser.close();
}
