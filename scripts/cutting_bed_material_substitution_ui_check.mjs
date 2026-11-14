import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.ESUPPLY_FRONT_BASE_URL || 'http://127.0.0.1:5177';
const outputDir = path.resolve(
  process.env.ESUPPLY_UI_OUTPUT_DIR
    || '../docs/e-supply/04-verification/cutting-bed-material-substitution-20261114',
);
const storageStateCandidates = [
  path.resolve('logs/route-sweep-auth-dev.json'),
  path.resolve('logs/route-sweep-auth.json'),
];
const storageState = storageStateCandidates.find((candidate) => fs.existsSync(candidate));
const backendEnvPath = path.resolve('../e-supply-back/src/main/resources/.env');
fs.mkdirSync(outputDir, { recursive: true });

const readEnv = (filePath) => {
  if (!fs.existsSync(filePath)) return {};
  return Object.fromEntries(fs.readFileSync(filePath, 'utf8').split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#') && line.includes('='))
    .map((line) => {
      const separator = line.indexOf('=');
      return [line.slice(0, separator), line.slice(separator + 1).replace(/^["']|["']$/g, '')];
    }));
};
const localEnv = readEnv(backendEnvPath);

const task = {
  id: 'ui-cutting-substitution',
  workOrderId: 9001,
  workOrderStatus: 'IN_PROGRESS',
  bedNumber: 'BED-9001-1',
  styleCode: 'UI-ST-SUB-001',
  styleName: '床次替料浏览器验收款',
  orderCode: 'UI-ORDER-SUB-001',
  orderDate: '2026-11-14',
  orderedQuantity: 20,
  cutQuantity: 4,
  pendingQuantity: 16,
  unit: '件',
  thumbnail: '',
  colors: [{ name: '黑色', image: '' }],
  customer: '验收客户',
};

const plannedCalculation = {
  calculationKey: '201::501::*',
  materialType: 'FABRIC',
  applicableColors: ['黑色'],
  materialId: 201,
  materialMinimumSpecificationId: 501,
  materialMinimumSpecificationLabel: '黑色 / 150cm',
  materialCode: 'FAB-PLAN-001',
  materialName: '计划黑色主面料',
  materialUnit: '米',
  plannedQty: 5,
  stockOptions: [{
    sourceInventoryBalanceId: 6101,
    warehouseId: 101,
    warehouseName: '计划料仓',
    materialMinimumSpecificationId: 501,
    materialMinimumSpecificationLabel: '黑色 / 150cm',
    availableQty: 1,
  }],
};

const existingSubstitution = {
  calculationKey: plannedCalculation.calculationKey,
  materialType: 'FABRIC',
  applicableColors: ['黑色'],
  plannedMaterialId: 201,
  plannedMinimumSpecificationId: 501,
  plannedMinimumSpecificationLabel: '黑色 / 150cm',
  plannedMaterialCode: 'FAB-PLAN-001',
  plannedMaterialName: '计划黑色主面料',
  plannedQty: 5,
  materialId: 203,
  materialMinimumSpecificationId: 603,
  materialMinimumSpecificationLabel: '藏青 / 150cm',
  materialCode: 'FAB-SUB-003',
  materialName: '替代藏青主面料',
  materialUnit: '米',
  sourceInventoryBalanceId: 6201,
  warehouseId: 102,
  warehouseName: '替代料仓',
  actualQty: 5,
  substitutionReason: '计划面料库存不足，使用同类型同单位替代料',
  usageId: 7101,
  usageVersion: 7,
};

const detail = {
  workOrderId: 9001,
  productionOrderId: 8001,
  styleId: 7001,
  orderCode: task.orderCode,
  styleCode: task.styleCode,
  styleName: task.styleName,
  customer: task.customer,
  status: 'IN_PROGRESS',
  bedNumber: 'BED-9001-1',
  startedAt: '2026-11-14T01:00:00',
  plannedQty: 20,
  completedQty: 4,
  sizes: ['M'],
  rows: [{
    color: '黑色',
    orderedSubtotal: 20,
    completedSubtotal: 4,
    pendingSubtotal: 16,
    cells: [{ size: 'M', orderedQty: 20, completedQty: 4, pendingQty: 16 }],
  }],
  materialUsages: [],
  fabricUsages: [],
  bedRecords: [{
    bedId: 'ui-bed-substituted-01',
    bedNumber: 'BED-9001-1',
    recordedAt: '2026-11-14T01:10:00',
    cuttingPieceRate: 1.25,
    materialUsageEditable: true,
    deletable: true,
    totalQty: 4,
    items: [{ color: '黑色', size: 'M', quantity: 4 }],
    materialUsages: [existingSubstitution],
    fabricUsages: [existingSubstitution],
  }],
  materialDocuments: [],
};

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1600, height: 1100 },
  storageState,
});
const page = await context.newPage();
const consoleErrors = [];
const failedResponses = [];
const inventorySearches = [];
const calculationPayloads = [];
let createPayload;
let updatePayload;

page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});
page.on('pageerror', (error) => consoleErrors.push(error.message));
page.on('response', (response) => {
  if (response.status() >= 400) failedResponses.push(`${response.status()}:${response.url()}`);
});

const fulfillJson = (route, body) => route.fulfill({
  status: 200,
  contentType: 'application/json',
  body: JSON.stringify(body),
});

await page.route('**/api/v1/**', (route) => route.continue());
await page.route('**/api/v1/workshop/cutting/pending?**', (route) => fulfillJson(route, {
  summary: [], list: [task], total: 1, page: 1, pageSize: 20,
}));
await page.route('**/api/v1/workshop/cutting/sheets/9001/beds/materials/calculate?**', async (route) => {
  calculationPayloads.push(route.request().postDataJSON());
  await fulfillJson(route, { materials: [plannedCalculation], unconfiguredItems: [] });
});
await page.route('**/api/v1/workshop/cutting/sheets/9001/beds/update?**', async (route) => {
  updatePayload = route.request().postDataJSON();
  await fulfillJson(route, { success: true, status: 'IN_PROGRESS', operatedAt: '2026-11-14T01:35:00' });
});
await page.route('**/api/v1/workshop/cutting/sheets/9001/beds?**', async (route) => {
  createPayload = route.request().postDataJSON();
  await fulfillJson(route, { success: true, status: 'IN_PROGRESS', operatedAt: '2026-11-14T01:30:00' });
});
await page.route('**/api/v1/workshop/cutting/sheets/9001?**', (route) => fulfillJson(route, detail));
await page.route('**/api/v1/production-orders/8001/progress?**', (route) => fulfillJson(route, [
  { nodeCode: 'ORDER_PLACED', nodeName: '下单', status: 'COMPLETED' },
  { nodeCode: 'CUTTING', nodeName: '裁剪', status: 'IN_PROGRESS' },
]));
await page.route('**/api/v1/settings/users?**', (route) => fulfillJson(route, {
  items: [{ id: 301, username: 'cutting-ui', displayName: '张裁剪', status: 'ACTIVE' }],
  total: 1,
}));
await page.route('**/api/v1/inventory/materials?**', async (route) => {
  const url = new URL(route.request().url());
  inventorySearches.push(Object.fromEntries(url.searchParams));
  await fulfillJson(route, {
    list: [{
      id: '6201',
      materialId: '204',
      materialMinimumSpecificationId: '604',
      materialMinimumSpecificationLabel: '通用辅料规格',
      materialMinimumSpecificationColor: null,
      materialType: 'accessory',
      materialCode: 'ACC-FREE-004',
      materialName: '自由替换辅料',
      color: null,
      colorStocks: [],
      specification: '通用',
      unit: '个',
      warehouseId: '102',
      warehouseName: '替代料仓',
      stockQty: 12,
      availableQty: 12,
      inTransitQty: 0,
    }],
    total: 1,
  });
});

const result = {
  passed: false,
  route: '/piecework/cutting/pending',
  assertions: {},
  screenshots: [],
  consoleErrors,
  failedResponses,
};

const ensureSignedIn = async () => {
  await page.goto(`${baseUrl}/welcome`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForFunction(() => window.Clerk?.loaded, { timeout: 30_000 });
  await page.waitForTimeout(1_000);
  if (await page.evaluate(() => Boolean(window.Clerk?.session))) {
    await context.storageState({ path: storageStateCandidates[0] });
    return;
  }
  const loginButton = page.getByRole('button', { name: '登录系统' });
  const email = localEnv.ESUPPLY_ADMIN_EMAIL;
  const password = localEnv.ESUPPLY_ADMIN_PASSWORD;
  if (!email || !password) throw new Error('缺少本地页面验收账号配置');
  await loginButton.click();
  const identifier = page.locator('input[name="identifier"], input[type="email"], input[name="username"]').first();
  await identifier.waitFor({ timeout: 30_000 });
  await identifier.fill(email);
  await page.getByRole('button', { name: /继续|Continue|Sign in|下一步/i }).first().click();
  const passwordInput = page.locator('input[type="password"]').first();
  await passwordInput.waitFor({ timeout: 30_000 });
  await passwordInput.fill(password);
  await page.getByRole('button', { name: /继续|Continue|Sign in|登录/i }).first().click();
  await page.waitForFunction(() => Boolean(window.Clerk?.session), { timeout: 60_000 });
  await context.storageState({ path: storageStateCandidates[0] });
};

const screenshot = async (name) => {
  const screenshotPath = path.join(outputDir, name);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  result.screenshots.push(screenshotPath);
};

try {
  await ensureSignedIn();
  consoleErrors.length = 0;
  failedResponses.length = 0;
  await page.goto(`${baseUrl}/piecework/cutting/pending`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  const recordButton = page.locator('[data-testid="cutting-task-record-bed-UI-ORDER-SUB-001"]');
  await recordButton.waitFor({ timeout: 30_000 });
  await recordButton.click();

  const createModal = page.locator('.ant-modal').filter({ hasText: '录入床次 - UI-ORDER-SUB-001' });
  await createModal.waitFor({ state: 'visible' });
  await createModal.locator('input[placeholder="请输入本床裁剪工价"]').fill('1.25');
  await createModal.locator('.factory-matrix-cell-input input').first().fill('4');
  await createModal.getByText('计划黑色主面料', { exact: true }).waitFor({ timeout: 10_000 });
  result.assertions.planIdentityVisible = await createModal.getByText('FAB-PLAN-001', { exact: true }).isVisible()
    && await createModal.getByRole('columnheader', { name: '实际出库物料 / 仓库 / 规格' }).isVisible();
  result.assertions.liveCalculationRequested = calculationPayloads.length > 0
    && Number(calculationPayloads.at(-1)?.items?.[0]?.quantity) === 4;

  const materialRow = createModal.locator('.ant-table-row').filter({ hasText: '计划黑色主面料' });
  const stockSelect = materialRow.locator('.ant-select').first();
  await stockSelect.click();
  await stockSelect.locator('input').fill('自由');
  const replacementOption = page.locator('.ant-select-dropdown:visible').getByText(/辅料.*自由替换辅料.*ACC-FREE-004.*替代料仓.*通用辅料规格.*可用 12个/);
  await replacementOption.waitFor({ timeout: 10_000 });
  result.assertions.remoteSearchIsServerSide = inventorySearches.some((params) => (
    params.keyword === '自由'
    && params.onlyInStock === 'true'
    && !params.materialType
    && !params.unit
  ));
  await replacementOption.click();

  const reasonInput = materialRow.locator('input[placeholder="替换备注（可选）"]');
  await reasonInput.waitFor({ state: 'visible' });
  result.assertions.replacementShowsOptionalRemark = await reasonInput.isVisible();

  const actualQtyInput = materialRow.locator('input[placeholder="填写用量"]');
  await actualQtyInput.fill('13');
  await reasonInput.click();
  await createModal.getByText('超过可用库存，最多可填 12个', { exact: true }).waitFor();
  result.assertions.availableStockGuardVisible = true;
  result.assertions.noRequestBeforeValidStock = createPayload == null;
  await screenshot('01-free-replacement-stock-guard.png');
  await actualQtyInput.fill('5');
  await reasonInput.click();
  await createModal.getByText('超过可用库存，最多可填 12个', { exact: true }).waitFor({ state: 'hidden' });
  await screenshot('02-free-replacement-ready-to-submit.png');

  await createModal.getByRole('button', { name: '确认并出库' }).click();
  await page.getByText('床次裁剪数据已录入，库存已按实际用量出库', { exact: true }).waitFor({ timeout: 10_000 });
  const createdUsage = createPayload?.materialUsages?.[0];
  result.assertions.createPayloadKeepsPlanAndActual = createdUsage?.calculationKey === plannedCalculation.calculationKey
    && Number(createdUsage?.materialId) === 204
    && Number(createdUsage?.materialMinimumSpecificationId) === 604
    && Number(createdUsage?.sourceInventoryBalanceId) === 6201
    && Number(createdUsage?.warehouseId) === 102
    && Number(createdUsage?.actualQty) === 5
    && !createdUsage?.substitutionReason
    && typeof createPayload?.requestId === 'string'
    && createPayload.requestId.length > 10;

  const detailButton = page.locator('[data-testid="cutting-task-detail-UI-ORDER-SUB-001"]');
  await detailButton.waitFor();
  await detailButton.click();
  const detailModal = page.locator('.ant-modal').filter({ hasText: '裁床任务详情 - UI-ORDER-SUB-001' });
  await detailModal.getByRole('button', { name: '修改床次' }).click();
  const editModal = page.locator('.ant-modal').filter({ hasText: '修改床次 - BED-9001-1' });
  await editModal.waitFor({ state: 'visible' });
  const editRow = editModal.locator('.ant-table-row').filter({ hasText: '计划黑色主面料' });
  const persistedReason = editRow.locator('input[placeholder="替换备注（可选）"]');
  await persistedReason.waitFor({ state: 'visible' });
  result.assertions.editRestoresActualSelectionAndReason = (await editRow.innerText()).includes('替代藏青主面料')
    && await persistedReason.inputValue() === '计划面料库存不足，使用同类型同单位替代料';
  await editRow.locator('input[placeholder="填写用量"]').fill('4');
  await screenshot('03-edit-preserves-substitution.png');
  await editModal.getByRole('button', { name: '保存并调整库存' }).click();
  await page.getByText('床次数据、库存、费用和进度已同步调整', { exact: true }).waitFor({ timeout: 10_000 });
  const updatedUsage = updatePayload?.materialUsages?.[0];
  result.assertions.updatePayloadKeepsVersionAndSource = updatePayload?.bedId === 'ui-bed-substituted-01'
    && Number(updatedUsage?.sourceInventoryBalanceId) === 6201
    && Number(updatedUsage?.materialId) === 203
    && Number(updatedUsage?.actualQty) === 4
    && Number(updatedUsage?.usageVersion) === 7
    && typeof updatePayload?.requestId === 'string'
    && updatePayload.requestId.length > 10;

  const relevantConsoleErrors = consoleErrors.filter((message) => (
    !message.includes('Static function can not consume context')
    && !message.includes('`index` parameter of `rowKey` function is deprecated')
    && !message.includes('Instance created by `useForm` is not connected to any Form element')
  ));
  result.consoleErrors = relevantConsoleErrors;
  result.failedResponses = failedResponses;
  result.assertions.noConsoleOrNetworkErrors = relevantConsoleErrors.length === 0 && failedResponses.length === 0;
  result.passed = Object.values(result.assertions).every(Boolean);
} catch (error) {
  result.error = String(error);
  result.url = page.url();
  result.bodyText = (await page.locator('body').innerText().catch(() => '')).slice(0, 2500);
  await screenshot('failed.png');
} finally {
  fs.writeFileSync(path.join(outputDir, 'ui-result.json'), `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify(result, null, 2));
  await browser.close();
}

if (!result.passed) process.exitCode = 1;
