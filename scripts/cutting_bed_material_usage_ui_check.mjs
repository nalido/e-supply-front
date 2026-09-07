import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.ESUPPLY_FRONT_BASE_URL || 'http://127.0.0.1:5177';
const outputDir = path.resolve('../docs/e-supply/04-verification/cutting-bed-material-usage-20260907');
const storageState = path.resolve('logs/route-sweep-auth.json');
const backendEnvPath = path.resolve('../e-supply-back/src/main/resources/.env');
fs.mkdirSync(outputDir, { recursive: true });

const localEnv = {};
if (fs.existsSync(backendEnvPath)) {
  for (const line of fs.readFileSync(backendEnvPath, 'utf8').split(/\r?\n/)) {
    const normalized = line.trim();
    if (!normalized || normalized.startsWith('#') || !normalized.includes('=')) continue;
    const separator = normalized.indexOf('=');
    localEnv[normalized.slice(0, separator)] = normalized.slice(separator + 1).replace(/^["']|["']$/g, '');
  }
}

const task = {
  id: 'ui-cutting-bed-material',
  workOrderId: 9001,
  workOrderStatus: 'IN_PROGRESS',
  bedNumber: 'UI-BED-START',
  styleCode: 'UI-ST-001',
  styleName: '实时联动录床用料验收款',
  orderCode: 'UI-ORDER-001',
  orderDate: '2026-09-07',
  orderedQuantity: 20,
  cutQuantity: 4,
  pendingQuantity: 16,
  unit: '件',
  thumbnail: '',
  colors: [{ name: '黑色', image: '' }, { name: '白色', image: '' }],
  customer: '验收客户',
};

const stockOptions = [
  {
    warehouseId: 101,
    warehouseName: '面辅料一仓',
    materialMinimumSpecificationId: 501,
    materialMinimumSpecificationLabel: '黑色 / 150cm',
    materialMinimumSpecificationColor: '黑色',
    availableQty: 28,
  },
];
const calculations = [
  {
    calculationKey: '201::501::*',
    materialType: 'FABRIC',
    applicableColors: ['黑色'],
    materialId: 201,
    materialMinimumSpecificationId: 501,
    materialMinimumSpecificationLabel: '黑色 / 150cm',
    materialCode: 'FAB-UI-001',
    materialName: '黑色主面料',
    materialUnit: '米',
    plannedQty: 5.125,
    stockOptions,
  },
  {
    calculationKey: '202::502::*',
    materialType: 'ACCESSORY',
    applicableColors: ['黑色'],
    materialId: 202,
    materialMinimumSpecificationId: 502,
    materialMinimumSpecificationLabel: '通用规格',
    materialCode: 'ACC-UI-001',
    materialName: '通用松紧带',
    materialUnit: '米',
    plannedQty: 0.2,
    stockOptions: [{
      warehouseId: 101,
      warehouseName: '面辅料一仓',
      materialMinimumSpecificationId: 502,
      materialMinimumSpecificationLabel: '通用规格',
      availableQty: 10,
    }],
  },
];

const detail = {
  workOrderId: 9001,
  productionOrderId: 8001,
  styleId: 7001,
  orderCode: task.orderCode,
  styleCode: task.styleCode,
  styleName: task.styleName,
  customer: task.customer,
  status: 'IN_PROGRESS',
  bedNumber: 'UI-BED-START',
  plannedQty: 20,
  completedQty: 4,
  sizes: ['M', 'L'],
  rows: [
    {
      color: '黑色',
      orderedSubtotal: 10,
      completedSubtotal: 4,
      pendingSubtotal: 6,
      cells: [
        { size: 'M', orderedQty: 5, completedQty: 4, pendingQty: 1 },
        { size: 'L', orderedQty: 5, completedQty: 0, pendingQty: 5 },
      ],
    },
    {
      color: '白色',
      orderedSubtotal: 10,
      completedSubtotal: 0,
      pendingSubtotal: 10,
      cells: [
        { size: 'M', orderedQty: 5, completedQty: 0, pendingQty: 5 },
        { size: 'L', orderedQty: 5, completedQty: 0, pendingQty: 5 },
      ],
    },
  ],
  materialUsages: [],
  fabricUsages: [],
  bedRecords: [
    {
      bedId: 'ui-bed-editable-01',
      bedNumber: 'UI-BED-01',
      recordedAt: '2026-09-07T12:00:00',
      materialUsageEditable: true,
      deletable: true,
      totalQty: 4,
      items: [{ color: '黑色', size: 'M', quantity: 4 }],
      materialUsages: [
        { ...calculations[0], warehouseId: 101, warehouseName: '面辅料一仓', actualFabricQty: 5 },
        { ...calculations[1], warehouseId: undefined, warehouseName: undefined, actualFabricQty: 0 },
      ],
    },
  ],
  materialDocuments: [],
};

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1520, height: 1050 },
  storageState: fs.existsSync(storageState) ? storageState : undefined,
});
const page = await context.newPage();
const errors = [];
let recordPayload;
let updatePayload;
const calculationPayloads = [];

page.on('console', (message) => {
  if (message.type() === 'error') errors.push(`console:${message.text()}`);
});
page.on('pageerror', (error) => errors.push(`page:${error.message}`));
page.on('response', (response) => {
  if (response.status() >= 400) {
    errors.push(`http:${response.status()}:${response.url()}`);
  }
});

const fulfillJson = (route, body) => route.fulfill({
  status: 200,
  contentType: 'application/json',
  body: JSON.stringify(body),
});

const ensureSignedIn = async () => {
  await page.goto(`${baseUrl}/piecework/cutting/pending`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForTimeout(1_000);
  const loginButton = page.getByRole('button', { name: '登录系统' });
  if (!page.url().includes('/welcome') && await loginButton.count() === 0) return;
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
  await page.waitForURL((url) => !/sign-in|accounts\.dev|clerk/.test(url.toString()), { timeout: 60_000 });
  await page.waitForTimeout(1_000);
};

await page.route('**/api/v1/workshop/cutting/pending?**', (route) => fulfillJson(route, {
  summary: [], list: [task], total: 1, page: 1, pageSize: 4,
}));
await page.route('**/api/v1/workshop/cutting/sheets/9001/beds/materials/calculate?**', async (route) => {
  const payload = route.request().postDataJSON();
  calculationPayloads.push(payload);
  const totalQty = (payload?.items ?? []).reduce((sum, item) => sum + Number(item.quantity ?? 0), 0);
  await fulfillJson(route, {
    materials: calculations.map((material) => ({
      ...material,
      plannedQty: Number((material.materialType === 'FABRIC' ? totalQty * 1.25 : totalQty * 0.05).toFixed(4)),
    })),
  });
});
await page.route('**/api/v1/workshop/cutting/sheets/9001/beds/material-usage/update?**', async (route) => {
  updatePayload = route.request().postDataJSON();
  await fulfillJson(route, { success: true, status: 'IN_PROGRESS', operatedAt: '2026-09-07T12:30:00' });
});
await page.route('**/api/v1/workshop/cutting/sheets/9001/beds?**', async (route) => {
  recordPayload = route.request().postDataJSON();
  await fulfillJson(route, { success: true, status: 'IN_PROGRESS', operatedAt: '2026-09-07T12:20:00' });
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

const result = {
  passed: false,
  route: '/piecework/cutting/pending',
  assertions: {},
  screenshots: [],
  errors,
};

try {
  await ensureSignedIn();
  errors.length = 0;
  await page.goto(`${baseUrl}/piecework/cutting/pending`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.locator('[data-testid="cutting-task-record-bed-UI-ORDER-001"]').waitFor({ timeout: 30_000 });
  await page.locator('[data-testid="cutting-task-record-bed-UI-ORDER-001"]').click();

  const activeModal = page.locator('.ant-modal').filter({ hasText: '录入床次 - UI-ORDER-001' });
  await activeModal.getByText('颜色尺码', { exact: true }).waitFor();
  await activeModal.getByText('面辅料实际用量', { exact: true }).waitFor();
  const cutterField = activeModal.locator('.ant-form-item').filter({ hasText: '裁剪人（可选）' });
  await cutterField.locator('.ant-select').click();
  await page.getByText('张裁剪', { exact: true }).click();
  await page.waitForTimeout(500);
  result.assertions.singlePageLinkedLayout = await activeModal.getByRole('button', { name: '计算面辅料' }).count() === 0
    && await activeModal.getByRole('button', { name: '确认并出库' }).isDisabled();
  result.assertions.standaloneStartRemoved = await page.locator('[data-testid="cutting-start-modal"]').count() === 0;

  await activeModal.locator('.factory-matrix-cell-input input').first().fill('4');
  await activeModal.getByRole('columnheader', { name: '参考用量' }).waitFor();
  await activeModal.getByText('黑色主面料', { exact: true }).waitFor();
  await activeModal.getByText('通用松紧带', { exact: true }).waitFor();
  result.assertions.liveCalculationRequested = calculationPayloads.length === 1
    && Number(calculationPayloads[0]?.items?.[0]?.quantity) === 4;
  result.assertions.fabricAndAccessoryVisible = true;
  result.assertions.packagingExcluded = await activeModal.getByText('包装', { exact: true }).count() === 0;

  const actualInputs = activeModal.locator('input[placeholder="填写用量"]');
  await actualInputs.nth(0).fill('5');
  await actualInputs.nth(1).fill('0');
  await activeModal.locator('.factory-matrix-cell-input input').first().fill('6');
  for (let attempt = 0; attempt < 50 && calculationPayloads.length < 2; attempt += 1) {
    await page.waitForTimeout(100);
  }
  for (let attempt = 0; attempt < 50 && await activeModal.getByRole('button', { name: '确认并出库' }).isDisabled(); attempt += 1) {
    await page.waitForTimeout(100);
  }
  result.assertions.usagePreservedAfterRefresh = Number(await actualInputs.nth(0).inputValue()) === 5
    && Number(await actualInputs.nth(1).inputValue()) === 0
    && calculationPayloads.length === 2
    && Number(calculationPayloads[1]?.items?.[0]?.quantity) === 6;

  const linkedScreenshot = path.join(outputDir, '01-live-linked-entry.png');
  await page.screenshot({ path: linkedScreenshot, fullPage: true });
  result.screenshots.push(linkedScreenshot);
  await activeModal.getByRole('button', { name: '确认并出库' }).click();
  await page.getByText('床次裁剪数据已录入，库存已按实际用量出库').waitFor({ timeout: 10_000 });
  result.assertions.zeroUsageSubmitted = recordPayload?.materialUsages?.length === 2
    && Number(recordPayload.materialUsages[1]?.actualFabricQty) === 0;
  result.assertions.quantitySubmitted = recordPayload?.items?.length === 1
    && Number(recordPayload.items[0]?.quantity) === 6;
  result.assertions.bedCutterSubmitted = Number(recordPayload?.cutterId) === 301;

  await page.locator('[data-testid="cutting-task-detail-UI-ORDER-001"]').click();
  await page.getByRole('button', { name: '修改用量' }).click();
  const editModal = page.locator('.ant-modal').filter({ hasText: '修改床次用量 - UI-BED-01' });
  await editModal.getByRole('button', { name: '保存并调整库存' }).waitFor();
  await page.waitForTimeout(500);
  await editModal.locator('input[placeholder="填写用量"]').first().fill('6');
  const editScreenshot = path.join(outputDir, '02-edit-usage-delta-stock.png');
  await page.screenshot({ path: editScreenshot, fullPage: true });
  result.screenshots.push(editScreenshot);
  await editModal.getByRole('button', { name: '保存并调整库存' }).click();
  await page.getByText('床次用量与库存已同步调整').waitFor({ timeout: 10_000 });
  result.assertions.editUsageSubmitted = updatePayload?.bedId === 'ui-bed-editable-01'
    && Number(updatePayload.materialUsages?.[0]?.actualFabricQty) === 6;

  const relevantErrors = errors.filter((item) => (
    !item.includes('Static function can not consume context')
    && !item.includes('`index` parameter of `rowKey` function is deprecated')
  ));
  result.errors = relevantErrors;
  result.passed = Object.values(result.assertions).every(Boolean) && relevantErrors.length === 0;
} catch (error) {
  result.error = String(error);
  result.url = page.url();
  result.bodyText = (await page.locator('body').innerText().catch(() => '')).slice(0, 1500);
  await page.screenshot({ path: path.join(outputDir, 'failed.png'), fullPage: true });
} finally {
  fs.writeFileSync(path.join(outputDir, 'ui-result.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
  await browser.close();
}

if (!result.passed) process.exitCode = 1;
