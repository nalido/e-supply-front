import fs from 'node:fs';
import { chromium } from 'playwright';

const baseUrl = 'http://127.0.0.1:5173';
const storageState = '/Users/jambin/codes/supply-and-sale/e-supply-front/logs/ozon-style-image-auth.json';
const outDir = '/Users/jambin/codes/supply-and-sale/docs/e-sale/verification/2026-06-17-ozon-store1-style-image-check';
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
});
const context = await browser.newContext({ storageState });
const page = await context.newPage();

await page.goto(`${baseUrl}/dashboard/workplace`, { waitUntil: 'networkidle' });

const result = await page.evaluate(async () => {
  const tenantId = 1;
  const channelAccountId = 6;
  const clerk = window.Clerk;
  if (!clerk?.session) {
    throw new Error('Clerk session not available');
  }
  const token = await clerk.session.getToken();
  if (!token) {
    throw new Error('Failed to get Clerk token');
  }

  const request = async (method, path, body, params = {}) => {
    const query = new URLSearchParams({ tenantId: String(tenantId) });
    Object.entries(params).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach((item) => query.append(key, String(item)));
      } else if (value !== undefined && value !== null) {
        query.set(key, String(value));
      }
    });
    const resp = await fetch(`${path}?${query.toString()}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Tenant-Id': String(tenantId),
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await resp.text();
    return { status: resp.status, body: text ? JSON.parse(text) : null };
  };

  const submit = await request('POST', '/api/v1/sale/products/sync', { channelAccountId, page: 1, pageSize: 50 });
  if (![200, 409].includes(submit.status)) {
    throw new Error(`sync submit failed: ${submit.status} ${JSON.stringify(submit.body)}`);
  }
  const taskId = submit.body?.taskId ?? null;

  let finalTask = null;
  const polls = [];
  for (let i = 0; i < 180; i += 1) {
    const stat = await request('GET', '/api/v1/sale/products/sync-status', null, { channelAccountId });
    if (stat.status !== 200) {
      throw new Error(`sync status failed: ${stat.status} ${JSON.stringify(stat.body)}`);
    }
    const currentTask = stat.body?.currentTask ?? null;
    const latestFinishedTask = stat.body?.latestFinishedTask ?? null;
    polls.push({ i, currentTask, latestFinishedTask });
    let candidate = null;
    if (taskId && currentTask?.taskId === taskId) candidate = currentTask;
    else if (taskId && latestFinishedTask?.taskId === taskId) candidate = latestFinishedTask;
    else if (!taskId && currentTask) candidate = currentTask;
    else if (!taskId && latestFinishedTask) candidate = latestFinishedTask;
    if (candidate && ['SUCCESS', 'FAILED', 'TERMINATED'].includes(candidate.status)) {
      finalTask = candidate;
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
  if (!finalTask) {
    throw new Error('sync status timeout');
  }
  if (finalTask.status !== 'SUCCESS') {
    throw new Error(`sync final status not success: ${JSON.stringify(finalTask)}`);
  }

  const stats = { both: [], colorOnly: [], detailOnly: [], neither: 0, scanned: 0 };
  for (let pageNo = 1; pageNo <= 8; pageNo += 1) {
    const mappingsResp = await request('GET', '/api/v1/sale/product-mappings', null, {
      channelAccountIds: [channelAccountId],
      page: pageNo,
      pageSize: 50,
      view: 'SUMMARY',
    });
    if (mappingsResp.status !== 200) {
      throw new Error(`list mappings failed: ${mappingsResp.status} ${JSON.stringify(mappingsResp.body)}`);
    }
    const items = mappingsResp.body?.list ?? [];
    for (const item of items) {
      if (!item.styleId) continue;
      stats.scanned += 1;
      const detailResp = await request('GET', `/api/v1/styles/${item.styleId}`, null);
      if (detailResp.status !== 200) continue;
      const detail = detailResp.body ?? {};
      const colorImages = detail.colorImages ?? {};
      const detailImageUrls = detail.detailImageUrls ?? [];
      const row = {
        styleId: item.styleId,
        styleNo: detail.styleNo,
        styleName: detail.styleName,
        offerId: item.platformSkuCode ?? item.offerId ?? null,
        colorImageCount: Object.keys(colorImages).length,
        detailImageCount: detailImageUrls.length,
        colorImages,
        detailImageUrls,
      };
      if (Object.keys(colorImages).length > 0 && detailImageUrls.length > 0) stats.both.push(row);
      else if (Object.keys(colorImages).length > 0) stats.colorOnly.push(row);
      else if (detailImageUrls.length > 0) stats.detailOnly.push(row);
      else stats.neither += 1;
    }
  }

  return { submit, finalTask, polls, stats };
});

fs.writeFileSync(`${outDir}/result.json`, JSON.stringify(result, null, 2), 'utf8');

const pick = result.stats.both[0] ?? result.stats.colorOnly[0] ?? result.stats.detailOnly[0] ?? null;
if (pick) {
  await page.goto(`${baseUrl}/foundation/product/detail?id=${pick.styleId}`, { waitUntil: 'networkidle' });
  await page.screenshot({ path: `${outDir}/style-detail-${pick.styleId}.png`, fullPage: true });
}

await browser.close();
console.log(JSON.stringify({
  submit: result.submit,
  finalTask: result.finalTask,
  summary: {
    scanned: result.stats.scanned,
    both: result.stats.both.length,
    colorOnly: result.stats.colorOnly.length,
    detailOnly: result.stats.detailOnly.length,
    neither: result.stats.neither,
  },
  picked: pick,
  screenshot: pick ? `${outDir}/style-detail-${pick.styleId}.png` : null,
}, null, 2));
