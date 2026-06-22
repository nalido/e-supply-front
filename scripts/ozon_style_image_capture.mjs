import fs from 'node:fs';
import { chromium } from 'playwright';

const baseUrl = 'http://127.0.0.1:5173';
const styleId = '96';
const storageState = '/Users/jambin/codes/supply-and-sale/e-supply-front/logs/ozon-style-image-auth.json';
const outDir = '/Users/jambin/codes/supply-and-sale/docs/e-sale/verification/2026-06-17-ozon-store1-style-image-check';
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
const context = await browser.newContext({ storageState, viewport: { width: 1600, height: 2400 } });
const page = await context.newPage();
await page.goto(`${baseUrl}/foundation/product/detail?id=${styleId}`, { waitUntil: 'networkidle' });
await page.screenshot({ path: `${outDir}/style-detail-${styleId}-full.png`, fullPage: true });
const overview = page.locator('.style-detail-overview-card');
await overview.screenshot({ path: `${outDir}/style-detail-${styleId}-overview.png` });
const detailInfo = await page.evaluate(() => {
  const colorLabels = Array.from(document.querySelectorAll('.style-detail-color-label')).map((el) => el.textContent?.trim()).filter(Boolean);
  const colorItems = document.querySelectorAll('.style-detail-color-item').length;
  const uploaderCards = document.querySelectorAll('.style-detail-gallery .oc-image-uploader, .style-detail-gallery .image-uploader, .style-detail-gallery .ant-upload-wrapper').length;
  const text = document.body.innerText;
  return {
    colorLabels,
    colorItems,
    hasDetailTitle: text.includes('细节图'),
    hasColorTitle: text.includes('颜色图片'),
    hasStyleNo: text.includes('CT0015-3PCS'),
    uploaderCards,
  };
});
fs.writeFileSync(`${outDir}/capture-meta.json`, JSON.stringify(detailInfo, null, 2), 'utf8');
console.log(JSON.stringify({
  full: `${outDir}/style-detail-${styleId}-full.png`,
  overview: `${outDir}/style-detail-${styleId}-overview.png`,
  meta: detailInfo,
}, null, 2));
await browser.close();
