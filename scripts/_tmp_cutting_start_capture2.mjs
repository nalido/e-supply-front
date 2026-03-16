import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
const baseUrl = 'http://127.0.0.1:5173';
const outDir = path.resolve('logs/cutting-start-capture2');
fs.mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
const context = await browser.newContext({ viewport: { width: 1440, height: 1280 }, storageState: 'logs/route-sweep-auth.json' });
const page = await context.newPage();
try {
  await page.goto(`${baseUrl}/piecework/cutting/pending`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(5000);
  await page.screenshot({ path: path.join(outDir, 'page.png'), fullPage: true });
  console.log(JSON.stringify({ok:true,url:page.url(),title:await page.title()}, null, 2));
} catch (error) {
  await page.screenshot({ path: path.join(outDir, 'failure.png'), fullPage: true }).catch(() => {});
  console.log(JSON.stringify({ok:false,error:String(error),url:page.url()}, null, 2));
  process.exitCode = 1;
} finally {
  await browser.close();
}
