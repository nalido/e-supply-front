import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.ESUPPLY_BASE_URL || 'http://127.0.0.1:5173';
const username = process.env.ESUPPLY_E2E_USERNAME || 'admin@huaaosoft.com';
const password = process.env.ESUPPLY_E2E_PASSWORD || 'Test@2027';
const outDir = path.join(process.cwd(), 'logs', `ozon-promotion-workbench-${Date.now()}`);

fs.mkdirSync(outDir, { recursive: true });

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function login(page) {
  await page.goto(`${baseUrl}/welcome`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.getByRole('button', { name: '登录系统' }).click();

  const identifierInput = page
    .locator('input[name="identifier"], input[type="email"], input[name="username"], input[name="emailAddress"]')
    .first();
  await identifierInput.waitFor({ timeout: 30000 });
  await identifierInput.fill(username);
  await page.getByRole('button', { name: /继续|Continue|Sign in|下一步/i }).first().click();

  const passwordInput = page.locator('input[type="password"]').first();
  await passwordInput.waitFor({ timeout: 30000 });
  await passwordInput.fill(password);
  await page.getByRole('button', { name: /继续|Continue|Sign in|登录/i }).first().click();

  await page.waitForURL(/dashboard|workplace/, { timeout: 60000 });
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
  const page = await context.newPage();
  const checks = [];

  try {
    await login(page);
    await page.goto(`${baseUrl}/sale/ozon/promotions`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.getByText('步骤 1 · 选择活动', { exact: true }).waitFor({ timeout: 30000 });
    await page.locator('.ant-spin-spinning').waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {});
    const activityRows = page.locator('.ant-table-tbody tr').filter({ hasText: '活动 ID：' });
    await activityRows.first().waitFor({ timeout: 30000 });
    const activityCount = await activityRows.count();
    let selectedActivityIndex = -1;
    for (let index = 0; index < activityCount; index += 1) {
      await activityRows.nth(index).click();
      await sleep(300);
      await page.getByRole('button', { name: '下一步：选择商品' }).click();
      await page.getByText('步骤 2 · 选择商品', { exact: true }).waitFor({ timeout: 30000 });
      await page.getByRole('tab', { name: '待选店铺商品' }).waitFor({ timeout: 10000 });
      await page.getByRole('tab', { name: '平台候选商品' }).waitFor({ timeout: 10000 });
      await page.getByRole('tab', { name: '平台已报名商品' }).waitFor({ timeout: 10000 });
      await page.getByRole('tab', { name: '平台候选商品' }).click();
      await page.getByText('当前展示已在本地建立映射、且被平台识别为候选报名的商品，可直接勾选加入本次报名。', { exact: true }).waitFor({ timeout: 10000 });
      await page.locator('.ant-spin-spinning').waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {});
      await sleep(800);
      const candidateRows = page.locator('.ant-table-tbody tr[data-row-key]');
      if ((await candidateRows.count()) > 0) {
        selectedActivityIndex = index;
        await page.screenshot({ path: path.join(outDir, '01-step1.png'), fullPage: true });
        checks.push('step1 visible');
        await page.screenshot({ path: path.join(outDir, '02-step2-local.png'), fullPage: true });
        checks.push('step2 visible with tabs');
        break;
      }
      await page.getByRole('button', { name: '上一步' }).click();
      await page.getByText('步骤 1 · 选择活动', { exact: true }).waitFor({ timeout: 30000 });
      await page.locator('.ant-spin-spinning').waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {});
    }
    assert(selectedActivityIndex >= 0, 'no activity exposes locally mapped candidate rows');

    await page.getByRole('tab', { name: '平台已报名商品' }).click();
    await page.getByText('当前展示已在本地建立映射、且被平台识别为已报名的商品，仅供核对。', { exact: true }).waitFor({ timeout: 10000 });
    await page.locator('.ant-spin-spinning').waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {});
    await page.getByRole('button', { name: '查看候选报名商品' }).waitFor({ timeout: 10000 });
    assert((await page.getByRole('button', { name: /进入步骤 3/ }).count()) === 0, 'participating tab should not expose step-3 submit CTA');
    await page.screenshot({ path: path.join(outDir, '03-step2-participating.png'), fullPage: true });
    checks.push('participating tab read-only');

    await page.getByRole('tab', { name: '平台候选商品' }).click();
    await page.getByText('当前展示已在本地建立映射、且被平台识别为候选报名的商品，可直接勾选加入本次报名。', { exact: true }).waitFor({ timeout: 10000 });
    await page.locator('.ant-spin-spinning').waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {});
    await sleep(800);
    const candidateRows = page.locator('.ant-table-tbody tr[data-row-key]');
    await page.screenshot({ path: path.join(outDir, '04-step2-candidate-before-select.png'), fullPage: true });
    const checkboxes = page.locator('.ant-table-selection-column .ant-checkbox');
    const checkboxCount = await checkboxes.count();
    if (checkboxCount < 2) {
      const html = await page.locator('.ant-table-wrapper').first().innerHTML();
      throw new Error(`candidate tab missing row selection checkboxes: count=${checkboxCount} html=${html.slice(0, 1000)}`);
    }
    const firstRowCheckbox = candidateRows.nth(0).locator('.ant-checkbox').first();
    await firstRowCheckbox.click({ force: true });
    await sleep(400);
    const checkedCount = await page.locator('.ant-table-tbody .ant-checkbox-checked').count();
    assert(checkedCount >= 1, 'candidate tab selection did not take effect');
    await page.screenshot({ path: path.join(outDir, '04-step2-candidate.png'), fullPage: true });
    checks.push('candidate tab loads and supports selection');

    const nextButton = page.getByRole('button', { name: /进入步骤 3/ });
    await page.waitForFunction(() => {
      const button = Array.from(document.querySelectorAll('button'))
        .find((item) => item.textContent?.includes('进入步骤 3'));
      return button && !button.hasAttribute('disabled');
    }, { timeout: 30000 });
    await nextButton.click();
    await page.getByText('步骤 3 · 填写报名信息并提交', { exact: true }).waitFor({ timeout: 30000 });
    await page.getByRole('columnheader', { name: '活动价（必填）' }).waitFor({ timeout: 10000 });
    assert((await page.locator('.scw-promo-entry-table .ant-table-tbody tr').count()) > 0, 'step 3 request table is empty');
    const locateButton = page.getByRole('button', { name: /定位待处理商品/ });
    if (await locateButton.count()) {
      await locateButton.first().click();
      await sleep(300);
      const focusedPlaceholder = await page.evaluate(() => {
        const active = document.activeElement;
        return active instanceof HTMLInputElement ? active.getAttribute('placeholder') : null;
      });
      assert(focusedPlaceholder === '请输入活动价', 'step 3 locate action did not focus the pending action-price input');
    }
    await page.evaluate(() => {
      const card = Array.from(document.querySelectorAll('.ant-card'))
        .find((element) => element.textContent?.includes('步骤 3 · 填写报名信息并提交'));
      if (card instanceof HTMLElement) {
        const top = Math.max(card.getBoundingClientRect().top + window.scrollY - 24, 0);
        window.scrollTo({ top, behavior: 'auto' });
      }
    });
    await sleep(300);
    await page.screenshot({ path: path.join(outDir, '05-step3.png'), fullPage: true });
    checks.push('step3 visible with request rows');

    console.log(JSON.stringify({ ok: true, outDir, checks }, null, 2));
  } catch (error) {
    console.error(JSON.stringify({ ok: false, outDir, checks, error: String(error) }, null, 2));
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

await main();
