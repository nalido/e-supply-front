import fs from 'node:fs';
import { chromium } from 'playwright';

const baseUrl = 'http://127.0.0.1:5173';
const storageState = '/Users/jambin/codes/supply-and-sale/e-supply-front/logs/ozon-style-image-auth.json';
const outFile = '/Users/jambin/codes/supply-and-sale/docs/e-sale/verification/2026-06-17-ozon-store1-style-image-check/samples.json';

const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
const context = await browser.newContext({ storageState });
const page = await context.newPage();
await page.goto(`${baseUrl}/dashboard/workplace`, { waitUntil: 'networkidle' });

const result = await page.evaluate(async () => {
  const clerk = window.Clerk;
  const token = await clerk.session.getToken();
  const tenantId = 1;
  const channelAccountId = 6;
  const req = async (path, params = {}) => {
    const query = new URLSearchParams({ tenantId: String(tenantId) });
    Object.entries(params).forEach(([key, value]) => {
      if (Array.isArray(value)) value.forEach((item) => query.append(key, String(item)));
      else if (value !== undefined && value !== null) query.set(key, String(value));
    });
    const resp = await fetch(`${path}?${query.toString()}`, {
      headers: { Authorization: `Bearer ${token}`, 'X-Tenant-Id': String(tenantId), Accept: 'application/json' },
    });
    const text = await resp.text();
    return { status: resp.status, body: text ? JSON.parse(text) : null };
  };

  const mappingsResp = await req('/api/v1/sale/product-mappings', { channelAccountIds: [channelAccountId], page: 1, pageSize: 10, view: 'SUMMARY' });
  const items = mappingsResp.body?.list ?? [];
  const samples = [];
  for (const item of items.slice(0, 5)) {
    const detailResp = await req(`/api/v1/styles/${item.styleId}`);
    samples.push({
      mapping: {
        id: item.id,
        styleId: item.styleId,
        offerId: item.platformSkuCode ?? item.offerId ?? null,
        productName: item.platformProductName ?? null,
      },
      detail: detailResp.body,
    });
  }
  return samples;
});

fs.writeFileSync(outFile, JSON.stringify(result, null, 2), 'utf8');
console.log(outFile);
await browser.close();
