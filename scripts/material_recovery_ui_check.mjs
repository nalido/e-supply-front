import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.ESUPPLY_UI_BASE_URL || 'http://127.0.0.1:5180';
const outputDir = path.resolve('logs/material-recovery-ui');
const colors = ['白色', '黑色', '花色', '银色'];
const specifications = ['1cm', '1.5cm'];
const evidenceKeys = new Set(['白色|1cm', '花色|1.5cm', '银色|1.5cm', '黑色|1.5cm']);

const suggestions = colors.flatMap((color, colorIndex) =>
  specifications.map((specification, specificationIndex) => {
    const selected = evidenceKeys.has(`${color}|${specification}`);
    return {
      minimumSpecificationId: selected ? 2000 + colorIndex * 2 + specificationIndex : null,
      color,
      specification,
      selected,
      basis: selected ? 'BUSINESS_RECORD' : 'ORIGINAL_DATA',
      evidenceCount: selected ? specificationIndex + 1 : 0,
    };
  }),
);
const minimumSpecifications = [
  {
    id: 1999,
    code: 'DEFAULT',
    label: '历史未归属规格',
    active: true,
    legacyDefault: true,
  },
  ...suggestions
    .filter((item) => item.selected)
    .map((item) => ({
      id: item.minimumSpecificationId,
      code: `HISTORY-${item.minimumSpecificationId}`,
      label: `${item.color} · ${item.specification}`,
      color: item.color,
      specification: item.specification,
      active: true,
      legacyDefault: false,
    })),
];
const material = {
  id: 84,
  tenantId: 1,
  sku: 'ACC-FOUR-HOLE',
  name: '四眼扣',
  unit: '个',
  status: 'ACTIVE',
  materialType: 'ACCESSORY',
  attributes: { colors, specifications, price: 0.22 },
  minimumSpecifications,
  updatedAt: '2026-09-09T10:00:00',
};

const json = (body) => ({
  status: 200,
  contentType: 'application/json',
  body: JSON.stringify(body),
});

async function preparePage(page) {
  const errors = [];
  page.on('pageerror', (error) => errors.push(`pageerror:${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') {
      errors.push(`console:${message.text()}`);
    }
  });
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (!url.pathname.startsWith('/api/')) {
      return route.continue();
    }
    if (url.pathname === '/api/v1/auth/onboarding/status') {
      return route.fulfill(
        json({
          linked: true,
          tenantId: 1,
          userId: 1,
          tenantName: '迁移验收企业',
          username: 'admin',
          billing: { status: 'ACTIVE', upgradeRequired: false },
        }),
      );
    }
    if (url.pathname === '/api/v1/settings/company/overview') {
      return route.fulfill(
        json({
          id: '1',
          name: '迁移验收企业',
          stats: {
            users: { value: 1, limit: 20 },
            storage: { value: 1, limit: 20 },
          },
          modules: [],
          tenants: [{ id: '1', name: '迁移验收企业', current: true }],
          billing: { status: 'ACTIVE', upgradeRequired: false },
        }),
      );
    }
    if (url.pathname === '/api/v1/settings/preferences') {
      return route.fulfill(json([]));
    }
    if (url.pathname === '/api/v1/workshop/reports/downloads') {
      return route.fulfill(json({ list: [], total: 0, page: 0, size: 20 }));
    }
    if (url.pathname === '/api/v1/materials/84/specification-recovery-preview') {
      return route.fulfill(
        json({
          materialId: 84,
          originalColors: colors,
          originalSpecifications: specifications,
          historicalPlaceholderRetained: true,
          suggestions,
        }),
      );
    }
    if (url.pathname === '/api/v1/materials') {
      return route.fulfill(json({ items: [material], total: 1, page: 0, size: 10 }));
    }
    return route.fulfill(json({ items: [], list: [], total: 0, page: 0, size: 20 }));
  });

  await page.goto(`${baseUrl}/basic/material`, { waitUntil: 'networkidle' });
  await page.getByRole('tab', { name: '辅料/包材' }).click();
  await page.getByText('四眼扣', { exact: true }).waitFor();
  await page.getByRole('button', { name: /编辑/ }).click();
  await page.getByText('原有资料已自动带入，无需重新填写').waitFor();
  await page.locator('input[value="白色"]').first().waitFor();
  return errors;
}

await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  const desktopErrors = await preparePage(desktop);
  const tableMetrics = await desktop
    .locator('.material-specification-editor .ant-table-content')
    .evaluate((element) => ({
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
    }));
  if (tableMetrics.scrollWidth > tableMetrics.clientWidth + 1) {
    throw new Error(`desktop horizontal overflow: ${JSON.stringify(tableMetrics)}`);
  }
  const checkedCount = await desktop.locator('.material-specification-editor .ant-switch-checked').count();
  if (checkedCount !== 4) {
    throw new Error(`expected 4 historical selections, got ${checkedCount}`);
  }
  await desktop.getByText('已预填 8 个可能组合').scrollIntoViewIfNeeded();
  await desktop.screenshot({
    path: path.join(outputDir, 'material-recovery-desktop.png'),
    fullPage: false,
  });

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const mobileErrors = await preparePage(mobile);
  await mobile.getByText('已预填 8 个可能组合').scrollIntoViewIfNeeded();
  const cards = await mobile.locator('.material-specification-card').count();
  if (cards !== 8) {
    throw new Error(`expected 8 mobile cards, got ${cards}`);
  }
  if (await mobile.locator('.material-form-modal .ant-table').count()) {
    throw new Error('mobile modal still renders a scrolling table');
  }
  const modalBox = await mobile.locator('.material-form-modal').boundingBox();
  if (!modalBox || modalBox.x < 0 || modalBox.x + modalBox.width > 390) {
    throw new Error(`mobile modal is outside viewport: ${JSON.stringify(modalBox)}`);
  }
  await mobile.screenshot({
    path: path.join(outputDir, 'material-recovery-mobile.png'),
    fullPage: false,
  });

  const browserErrors = [...desktopErrors, ...mobileErrors].filter(
    (item) => !item.includes('favicon'),
  );
  if (browserErrors.length) {
    throw new Error(`browser errors:\n${browserErrors.join('\n')}`);
  }
  console.log(
    `PASS: desktop=${JSON.stringify(tableMetrics)} selected=${checkedCount} mobileCards=${cards}`,
  );
  console.log(path.join(outputDir, 'material-recovery-desktop.png'));
  console.log(path.join(outputDir, 'material-recovery-mobile.png'));
} finally {
  await browser.close();
}
