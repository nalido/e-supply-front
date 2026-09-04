#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const appRoot = process.cwd();
const baseUrl = process.env.ESUPPLY_BASE_URL || 'http://127.0.0.1:5176';
const styleId = process.env.ESUPPLY_STYLE_ID;
const outputDir = process.env.ESUPPLY_OUTPUT_DIR || path.resolve(
  appRoot,
  '../docs/e-supply/04-verification/style-bom-average-consumption-20260904',
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
  '01-style-bom-average-list-1440.png',
  '02-style-bom-average-input.png',
  '03-style-bom-impact-preview.png',
  '04-style-bom-editor-mobile-390.png',
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
  styleId,
  checks: [],
  screenshots: [],
  consoleErrors: [],
  failedRequests: [],
  failedApiResponses: [],
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
  if (!/sign-in|accounts|clerk/i.test(page.url()) && await page.getByText('工作台').count()) return;
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

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1050 } });
const page = await context.newPage();

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

  check('页面不再按颜色拆成多个页签', await section.locator('.style-bom-color-tabs').count() === 0);
  check('页面不再展示尺码用量矩阵', await section.locator('.style-bom-size-material-table').count() === 0);
  check('面料和辅料按两类汇总展示', await section.locator('.style-bom-summary-panel').count() === 2);
  check('汇总表显示平均单件用量和适用颜色',
    await section.getByRole('columnheader', { name: '平均单件用量' }).count() === 2
      && await section.getByRole('columnheader', { name: '适用颜色' }).count() === 2);
  check('面料按自身颜色维护且辅料统一适用全部颜色',
    (await section.innerText()).includes('黑色')
      && (await section.innerText()).includes('白色')
      && (await section.innerText()).includes('全部颜色'));
  check('提供按类型添加用料入口',
    await section.getByText('添加面料', { exact: true }).count() === 1
      && await section.getByText('添加辅料/包材', { exact: true }).count() === 1);
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
  await capture(page, '01-style-bom-average-list-1440.png', section);

  await section.getByRole('button', { name: '设置' }).first().click();
  const drawer = page.locator('.style-bom-editor-drawer');
  await drawer.waitFor({ state: 'visible', timeout: 10_000 });
  const fabricDrawerText = await drawer.innerText();
  check('面料抽屉只维护汇总规则',
    /设置款式用料/.test(fabricDrawerText)
      && /平均单件用量/.test(fabricDrawerText)
      && /指定颜色/.test(fabricDrawerText)
      && !/各尺码/.test(fabricDrawerText));
  const drawerAverageInput = drawer.getByLabel('平均单件用量');
  check('平均单耗按汇总值回显', Number(await drawerAverageInput.inputValue()) === 1.75, { value: await drawerAverageInput.inputValue() });
  const lossInput = drawer.locator('label').filter({ hasText: '损耗率' }).locator('input').first();
  check('损耗率按百分比正确回显', Number(await lossInput.inputValue()) === 2.5, { value: await lossInput.inputValue() });
  await page.locator('.ant-drawer:visible .ant-drawer-extra button').first().click();
  await drawer.waitFor({ state: 'hidden', timeout: 10_000 });

  const blackAverageInput = section.getByLabel(/BOM规格测试面料.*平均单件用量/).first();
  const initialAverageValue = Number(await blackAverageInput.inputValue());
  check('表格只显示一个平均单耗输入', Number.isFinite(initialAverageValue) && initialAverageValue > 0, { value: await blackAverageInput.inputValue() });
  const savedAverageValue = initialAverageValue === 1.8 ? 1.81 : 1.8;
  await capture(page, '02-style-bom-average-input.png', section);

  await blackAverageInput.fill(String(savedAverageValue));

  const previewResponse = page.waitForResponse(
    (response) => response.url().includes(`/api/v1/styles/${styleId}/bom-configuration/impact-preview`) && response.status() === 200,
    { timeout: 30_000 },
  );
  await page.getByTestId('style-detail-save-button').click();
  await previewResponse;
  const impactModal = page.locator('.style-bom-impact-modal');
  await impactModal.waitFor({ state: 'visible', timeout: 10_000 });
  check('保存影响默认只作用于新订单', await impactModal.getByText('仅用于之后的新订单').count() === 1);
  check('历史选项明确不覆盖原出库', (await impactModal.innerText()).includes('不覆盖原有出库记录'));
  await capture(page, '03-style-bom-impact-preview.png', impactModal);

  const updateResponse = page.waitForResponse(
    (response) => response.url().includes(`/api/v1/styles/${styleId}/bom-configuration/update`) && response.status() === 200,
    { timeout: 30_000 },
  );
  await impactModal.getByRole('button', { name: '保存并用于之后订单' }).click();
  await updateResponse;
  await impactModal.waitFor({ state: 'hidden', timeout: 20_000 });

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByTestId('style-bom-section').waitFor({ state: 'visible', timeout: 30_000 });
  const reloadedSection = page.getByTestId('style-bom-section');
  const reloadedAverage = reloadedSection.getByLabel(/BOM规格测试面料.*平均单件用量/).first();
  check('保存重载后平均单耗保持', Number(await reloadedAverage.inputValue()) === savedAverageValue, { value: await reloadedAverage.inputValue() });

  await reloadedSection.locator('.style-bom-summary-panel').nth(1).getByRole('button', { name: '设置' }).first().click();
  const reloadedDrawer = page.locator('.style-bom-editor-drawer');
  await reloadedDrawer.waitFor({ state: 'visible', timeout: 10_000 });
  check('辅料抽屉明确全部颜色统一使用', (await reloadedDrawer.innerText()).includes('辅料/包材统一用于该款式的全部颜色'));

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(800);
  const mobileDrawer = page.locator('.style-bom-editor-drawer-root .ant-drawer-content-wrapper');
  await mobileDrawer.scrollIntoViewIfNeeded();
  const mobileLayout = await mobileDrawer.evaluate((node) => {
    const rect = node.getBoundingClientRect();
    const overflowingDescendants = [...node.querySelectorAll('*')]
      .map((element) => {
        const childRect = element.getBoundingClientRect();
        return {
          className: element.className,
          left: childRect.left,
          right: childRect.right,
          width: childRect.width,
        };
      })
      .filter((child) => child.width > 0 && (child.left < -1 || child.right > window.innerWidth + 1))
      .slice(0, 10);
    return {
      viewportWidth: window.innerWidth,
      drawerWidth: rect.width,
      clientWidth: node.clientWidth,
      scrollWidth: node.scrollWidth,
      inlineStyle: node.getAttribute('style'),
      computedWidth: window.getComputedStyle(node).width,
      parentClass: node.parentElement?.className,
      className: node.className,
      overflowingDescendants,
    };
  });
  await capture(page, '04-style-bom-editor-mobile-390.png', mobileDrawer);
  check(
    '390 宽抽屉不产生自身横向溢出',
    mobileLayout.drawerWidth <= mobileLayout.viewportWidth + 1
      && mobileLayout.scrollWidth <= mobileLayout.clientWidth + 1
      && mobileLayout.overflowingDescendants.length === 0,
    mobileLayout,
  );

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
