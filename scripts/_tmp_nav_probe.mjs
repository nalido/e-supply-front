import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
async function login() {
  await page.goto('http://127.0.0.1:5173/welcome', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: '登录系统' }).click();
  await page.locator('input[name="identifier"], input[type="email"], input[name="username"]').first().fill('jambin');
  await page.getByRole('button', { name: /继续|Continue|Sign in|下一步/i }).first().click();
  await page.locator('input[type="password"]').first().fill('Jambin288416');
  await page.getByRole('button', { name: /继续|Continue|Sign in|登录/i }).first().click();
  await page.waitForURL(/127\.0\.0\.1:5173\/(dashboard|workplace|sample|foundation|orders|basic)/, { timeout: 60000 });
}
await login();
for (const route of ['/basic/styles','/orders/factory','/foundation/product/detail?id=1']) {
  await page.goto('http://127.0.0.1:5173'+route, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(5000);
  console.log(route, '=>', page.url(), 'title=', await page.title());
}
await browser.close();
