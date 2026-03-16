import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const baseUrl = 'http://127.0.0.1:5173';
const outDir = path.resolve('logs/cutting-mock-capture');
fs.mkdirSync(outDir, { recursive: true });

const mockCompany = { id: '1', name: '测试企业', stats: { memberCount: 12, activeModules: 6, storageUsage: '2GB', storageLimit: '20GB' }, modules: [], tenants: [{ id: '1', name: '测试企业', isCurrent: true }] };
const mockPending = { summary: [{ key: 'pending', label: '待裁任务', value: '1 单', description: '待开裁工单', tone: 'warning' }], list: [{ id: 1, workOrderId: 101, workOrderStatus: 'NOT_STARTED', bedNumber: null, styleCode: 'ST-001', styleName: '春夏卫衣', orderCode: 'FO-20260313-001', orderDate: '2026-03-13', orderedQuantity: 600, cutQuantity: 0, pendingQuantity: 600, unit: '件', thumbnail: '', customer: '测试客户', fabricSummary: '鱼鳞布 / 罗纹', priorityTag: '今日需开裁', scheduleDate: '2026-03-14', colors: [{ name: '黑色', image: '' }, { name: '灰色', image: '' }] }], total: 1, page: 1, pageSize: 4 };
const mockDetail = { workOrderId: 101, productionOrderId: 201, styleId: 1, orderCode: 'FO-20260313-001', styleCode: 'ST-001', styleName: '春夏卫衣', customer: '测试客户', status: 'NOT_STARTED', plannedQty: 600, completedQty: 0, sizes: ['S', 'M', 'L'], rows: [{ color: '黑色', orderedSubtotal: 300, completedSubtotal: 0, pendingSubtotal: 300, cells: [{ size: 'S', orderedQty: 100, completedQty: 0, pendingQty: 100 }, { size: 'M', orderedQty: 100, completedQty: 0, pendingQty: 100 }, { size: 'L', orderedQty: 100, completedQty: 0, pendingQty: 100 }] }, { color: '灰色', orderedSubtotal: 300, completedSubtotal: 0, pendingSubtotal: 300, cells: [{ size: 'S', orderedQty: 100, completedQty: 0, pendingQty: 100 }, { size: 'M', orderedQty: 100, completedQty: 0, pendingQty: 100 }, { size: 'L', orderedQty: 100, completedQty: 0, pendingQty: 100 }] }], bedRecords: [], materialDocuments: [] };
const mockStyleMaterials = [{ materialId: 11, materialName: '420g 鱼鳞布', materialSku: 'FAB-420', materialType: 'FABRIC', unit: 'kg', consumption: 1.82, lossRate: 0.03 }, { materialId: 12, materialName: '2x2 罗纹', materialSku: 'FAB-RIB', materialType: 'FABRIC', unit: 'kg', consumption: 0.18, lossRate: 0.02 }, { materialId: 21, materialName: '主唛', materialSku: 'ACC-LABEL', materialType: 'ACCESSORY', unit: '个', consumption: 1, lossRate: 0 }];
const mockWarehouses = { items: [{ id: 1, tenantId: 1, name: '面料主仓', type: 'MATERIAL', status: 'ACTIVE' }, { id: 2, tenantId: 1, name: '裁剪备料仓', type: 'MATERIAL', status: 'ACTIVE' }], total: 2, page: 1, size: 200 };
const mockMembers = { items: [{ id: 9, username: 'cutter.a', displayName: '张师傅', status: 'ACTIVE' }], total: 1, page: 1, size: 200 };
const mockFabricStock = { list: [{ id: '1', materialId: '11', materialCode: 'FAB-420', materialName: '420g 鱼鳞布', unit: 'kg', warehouseId: '2', warehouseName: '裁剪备料仓', stockQty: 520, availableQty: 360, inTransitQty: 0 }, { id: '2', materialId: '12', materialCode: 'FAB-RIB', materialName: '2x2 罗纹', unit: 'kg', warehouseId: '2', warehouseName: '裁剪备料仓', stockQty: 120, availableQty: 88, inTransitQty: 0 }, { id: '3', materialId: '99', materialCode: 'FAB-OTHER', materialName: '替代面料', unit: 'kg', warehouseId: '1', warehouseName: '面料主仓', stockQty: 200, availableQty: 150, inTransitQty: 0 }], total: 3, summary: { stockQtyTotal: 840, availableQtyTotal: 598, inTransitQtyTotal: 0 } };

const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
const context = await browser.newContext({ viewport: { width: 1440, height: 1400 } });
const page = await context.newPage();

async function login() {
  await page.goto(`${baseUrl}/welcome`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.getByRole('button', { name: '登录系统' }).click();
  const userInput = page.locator('input[name="identifier"], input[type="email"], input[name="username"]').first();
  await userInput.waitFor({ timeout: 30000 });
  await userInput.fill('jambin');
  await page.getByRole('button', { name: /继续|Continue|Sign in|下一步/i }).first().click();
  const pwdInput = page.locator('input[type="password"]').first();
  await pwdInput.waitFor({ timeout: 30000 });
  await pwdInput.fill('Jambin288416');
  await page.getByRole('button', { name: /继续|Continue|Sign in|登录/i }).first().click();
  await page.waitForURL(/dashboard|workplace/, { timeout: 60000 });
  await page.waitForTimeout(2000);
}

try {
  await login();
  await page.route('**/api/v1/auth/onboarding/status**', async (route) => route.fulfill({ json: { linked: true, tenantId: 1 } }));
  await page.route('**/api/v1/settings/company/overview**', async (route) => route.fulfill({ json: mockCompany }));
  await page.route('**/api/v1/workshop/cutting/pending**', async (route) => route.fulfill({ json: mockPending }));
  await page.route('**/api/v1/workshop/cutting/sheets/101**', async (route) => route.fulfill({ json: mockDetail }));
  await page.route('**/api/v1/styles/1/materials**', async (route) => route.fulfill({ json: mockStyleMaterials }));
  await page.route('**/api/v1/warehouses**', async (route) => route.fulfill({ json: mockWarehouses }));
  await page.route('**/api/v1/settings/users**', async (route) => route.fulfill({ json: mockMembers }));
  await page.route('**/api/v1/inventory/materials**', async (route) => route.fulfill({ json: mockFabricStock }));

  await page.goto(`${baseUrl}/piecework/cutting/pending`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.getByText('春夏卫衣').waitFor({ timeout: 30000 });
  await page.getByRole('button', { name: '开裁' }).click();
  await page.waitForTimeout(1500);
  const dialog = page.locator('.ant-modal-content').last();
  await dialog.waitFor({ timeout: 30000 });
  await page.screenshot({ path: path.join(outDir, 'page.png'), fullPage: true });
  await dialog.screenshot({ path: path.join(outDir, 'cutting-start-modal-mock.png') });
  console.log(JSON.stringify({ ok: true, outDir, url: page.url(), linkedCards: await page.locator('.cutting-start-linked-card').count(), helperCount: await page.getByText('已优先展示当前款式 BOM 关联的面料').count() }, null, 2));
} catch (error) {
  await page.screenshot({ path: path.join(outDir, 'failure.png'), fullPage: true }).catch(() => {});
  console.log(JSON.stringify({ ok: false, error: String(error), outDir, url: page.url() }, null, 2));
  process.exitCode = 1;
} finally {
  await browser.close();
}
