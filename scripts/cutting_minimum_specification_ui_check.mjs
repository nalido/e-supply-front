import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.ESUPPLY_FRONT_BASE_URL || 'http://127.0.0.1:5176';
const backendEnvPath = path.resolve('../e-supply-back/src/main/resources/.env');
const outputDir = path.resolve('../docs/e-supply/04-verification/cutting-minimum-specification-20260905');
fs.mkdirSync(outputDir, { recursive: true });

const env = {};
for (const line of fs.readFileSync(backendEnvPath, 'utf8').split(/\r?\n/)) {
  const normalized = line.trim();
  if (!normalized || normalized.startsWith('#') || !normalized.includes('=')) continue;
  const separator = normalized.indexOf('=');
  env[normalized.slice(0, separator)] = normalized.slice(separator + 1).replace(/^["']|["']$/g, '');
}
const email = env.ESUPPLY_ADMIN_EMAIL;
const password = env.ESUPPLY_ADMIN_PASSWORD;
if (!email || !password) throw new Error('缺少本地验收账号配置');

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const errors = [];
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(`console:${message.text()}`);
});
page.on('response', (response) => {
  if (response.url().includes('/api/') && response.status() >= 400) {
    errors.push(`api:${response.status()}:${response.url()}`);
  }
});

const login = async () => {
  await page.goto(`${baseUrl}/piecework/cutting/pending`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2000);
  const loginButton = page.getByRole('button', { name: '登录系统' });
  await loginButton.waitFor({ timeout: 30000 });
  await loginButton.click();
  const identifier = page.locator('input[name="identifier"], input[type="email"], input[name="username"]').first();
  await identifier.waitFor({ timeout: 30000 });
  await identifier.fill(email);
  await page.getByRole('button', { name: /继续|Continue|Sign in|下一步/i }).first().click();
  const passwordInput = page.locator('input[type="password"]').first();
  await passwordInput.waitFor({ timeout: 30000 });
  await passwordInput.fill(password);
  await page.getByRole('button', { name: /继续|Continue|Sign in|登录/i }).first().click();
  await page.waitForURL((url) => !/sign-in|accounts\.dev|clerk/.test(url.toString()), { timeout: 60000 });
  await page.waitForTimeout(2000);
};

const fulfillJson = (route, body) => route.fulfill({
  status: 200,
  contentType: 'application/json',
  body: JSON.stringify(body),
});

try {
  await login();
  await page.route('**/api/v1/inventory/materials?**', (route) => fulfillJson(route, {
    list: [
      {
        id: '9101',
        materialId: '5',
        materialMinimumSpecificationId: '101',
        materialMinimumSpecificationLabel: '黑色 · 310',
        materialMinimumSpecificationColor: '黑色',
        materialType: 'fabric',
        materialCode: 'FAB-UI-001',
        materialName: '裁床规格验收面料',
        colorStocks: [],
        unit: '米',
        warehouseId: '1',
        warehouseName: '面料仓',
        stockQty: 20,
        availableQty: 20,
        inTransitQty: 0,
      },
      {
        id: '9102',
        materialId: '5',
        materialMinimumSpecificationId: '102',
        materialMinimumSpecificationLabel: '白色 · 310',
        materialMinimumSpecificationColor: '白色',
        materialType: 'fabric',
        materialCode: 'FAB-UI-001',
        materialName: '裁床规格验收面料',
        colorStocks: [],
        unit: '米',
        warehouseId: '1',
        warehouseName: '面料仓',
        stockQty: 30,
        availableQty: 30,
        inTransitQty: 0,
      },
    ],
    total: 2,
  }));
  await page.route('**/api/v1/warehouses?**', (route) => fulfillJson(route, {
    items: [{ id: 1, tenantId: 1, name: '面料仓', type: 'MATERIAL', status: 'ACTIVE' }],
    total: 1,
    page: 0,
    size: 200,
  }));
  await page.route('**/api/v1/settings/users?**', (route) => fulfillJson(route, {
    items: [], total: 0, page: 0, size: 200,
  }));
  await page.route('**/api/v1/styles/5/materials?**', (route) => fulfillJson(route, [{
    materialId: 5,
    materialName: '裁床规格验收面料',
    materialSku: 'FAB-UI-001',
    materialType: 'FABRIC',
    unit: '米',
    consumption: 0.4,
    lossRate: 0,
  }]));

  await page.goto(`${baseUrl}/piecework/cutting/pending`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2000);
  const recordButton = page.locator('[data-testid^="cutting-task-record-bed-"]').first();
  await recordButton.waitFor({ timeout: 30000 });
  await recordButton.click();
  await page.getByText('物料用量', { exact: true }).waitFor({ timeout: 30000 });
  await page.getByRole('columnheader', { name: '最小规格' }).waitFor();
  await page.getByText('黑色 · 310', { exact: false }).waitFor();
  await page.waitForTimeout(500);
  const whiteSelectedCount = await page.getByText('白色 · 310', { exact: false }).count();
  const modalBox = await page.locator('.ant-modal').last().boundingBox();
  await page.screenshot({ path: path.join(outputDir, 'cutting-bed-minimum-specification.png'), fullPage: true });
  const relevantErrors = errors.filter((item) => (
    !item.includes('/api/v1/auth/onboarding/status')
    && !item.includes('Failed to load resource: the server responded with a status of 401')
    && !item.includes('Instance created by `useForm` is not connected')
  ));
  const result = {
    passed: whiteSelectedCount === 0,
    route: '/piecework/cutting/pending',
    assertions: {
      minimumSpecificationColumnVisible: true,
      uniqueBlackSpecificationAutofilled: true,
      whiteSpecificationNotSelected: whiteSelectedCount === 0,
    },
    modalBox,
    errors: relevantErrors.slice(0, 20),
  };
  fs.writeFileSync(path.join(outputDir, 'ui-result.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
  if (!result.passed || result.errors.length) process.exitCode = 1;
} catch (error) {
  await page.screenshot({ path: path.join(outputDir, 'cutting-bed-minimum-specification-failed.png'), fullPage: true });
  const result = {
    passed: false,
    error: String(error),
    url: page.url(),
    bodyText: (await page.locator('body').innerText().catch(() => '')).slice(0, 1000),
    errors: errors.slice(0, 20),
  };
  fs.writeFileSync(path.join(outputDir, 'ui-result.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = 1;
} finally {
  await browser.close();
}
