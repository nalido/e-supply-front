#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const appRoot = process.cwd();
const baseUrl = process.env.ESUPPLY_BASE_URL || 'http://127.0.0.1:5173';
const styleId = process.env.ESUPPLY_STYLE_ID;
const storageStatePath = process.env.ESUPPLY_STORAGE_STATE || path.resolve(
  appRoot,
  'logs/route-sweep-auth-dev.json',
);
const outputDir = process.env.ESUPPLY_OUTPUT_DIR || path.resolve(
  appRoot,
  '../docs/e-supply/04-verification/style-bom-http-uuid-fix-20260923',
);

if (!styleId) throw new Error('请通过 ESUPPLY_STYLE_ID 指定本地验收款式');
fs.mkdirSync(outputDir, { recursive: true });

const result = {
  ok: false,
  baseUrl,
  styleId,
  checks: [],
  consoleErrors: [],
  failedApiResponses: [],
};
const check = (name, condition, detail) => {
  result.checks.push({ name, ok: Boolean(condition), ...(detail === undefined ? {} : { detail }) });
  if (!condition) throw new Error(name);
};

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1050 },
  ...(fs.existsSync(storageStatePath) ? { storageState: storageStatePath } : {}),
});
await context.addInitScript(() => {
  Object.defineProperty(globalThis.crypto, 'randomUUID', {
    configurable: true,
    value: undefined,
  });
});
const page = await context.newPage();
page.on('console', (message) => {
  if (message.type() === 'error') result.consoleErrors.push(message.text());
});
page.on('response', (response) => {
  if (response.url().includes('/api/') && response.status() >= 400) {
    result.failedApiResponses.push({ url: response.url(), status: response.status() });
  }
});

try {
  await page.goto(`${baseUrl}/foundation/product/detail?id=${encodeURIComponent(styleId)}`, {
    waitUntil: 'domcontentloaded',
    timeout: 60_000,
  });
  const section = page.getByTestId('style-bom-section');
  await section.waitFor({ state: 'visible', timeout: 30_000 });
  check('浏览器 randomUUID 已按线上故障条件移除', await page.evaluate(() => (
    typeof globalThis.crypto.randomUUID === 'undefined'
  )));

  const firstFabricRow = section.locator('.style-bom-summary-panel').first()
    .locator('tbody tr.ant-table-row').first();
  const averageInput = firstFabricRow.getByRole('spinbutton', { name: /平均单件用量$/ });
  const originalValue = Number(await averageInput.inputValue());
  check('存在可编辑的平均单耗', Number.isFinite(originalValue) && originalValue > 0, originalValue);
  const nextValue = originalValue === 1.261 ? 1.262 : 1.261;
  await averageInput.fill(String(nextValue));

  const previewPromise = page.waitForResponse((response) => (
    response.url().includes(`/api/v1/styles/${styleId}/bom-configuration/impact-preview`)
    && response.status() === 200
  ));
  await page.getByTestId('style-detail-save-button').click();
  await previewPromise;

  const modal = page.locator('.style-bom-impact-modal');
  await modal.waitFor({ state: 'visible', timeout: 10_000 });
  const updatePromise = page.waitForResponse((response) => (
    response.url().includes(`/api/v1/styles/${styleId}/bom-configuration/update`)
  ));
  await modal.getByRole('button', { name: '保存并用于之后订单' }).click();
  const updateResponse = await updatePromise;
  const updateRequest = updateResponse.request().postDataJSON();
  check('缺少 randomUUID 时用料保存接口仍返回成功', updateResponse.status() === 200, updateResponse.status());
  check(
    '兼容生成的幂等键符合 UUID 格式',
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(updateRequest.idempotencyKey),
    updateRequest.idempotencyKey,
  );
  await modal.waitFor({ state: 'hidden', timeout: 20_000 });
  await page.screenshot({ path: path.join(outputDir, 'style-bom-http-uuid-save-success.png'), fullPage: true });

  await page.reload({ waitUntil: 'domcontentloaded' });
  await section.waitFor({ state: 'visible', timeout: 30_000 });
  const savedValue = Number(await section.locator('.style-bom-summary-panel').first()
    .locator('tbody tr.ant-table-row').first()
    .getByRole('spinbutton', { name: /平均单件用量$/ })
    .inputValue());
  check('保存重载后平均单耗保持', savedValue === nextValue, { expected: nextValue, actual: savedValue });
  check('页面没有业务接口失败', result.failedApiResponses.length === 0, result.failedApiResponses);
  check('页面没有控制台错误', result.consoleErrors.length === 0, result.consoleErrors);
  result.ok = true;
} catch (error) {
  result.error = error instanceof Error ? error.message : String(error);
  await page.screenshot({ path: path.join(outputDir, 'style-bom-http-uuid-save-failure.png'), fullPage: true }).catch(() => {});
} finally {
  fs.writeFileSync(path.join(outputDir, 'result.json'), `${JSON.stringify(result, null, 2)}\n`);
  await browser.close();
}

console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exitCode = 1;
