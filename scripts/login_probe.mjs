import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
const appRoot='/Users/huangjianbing/codes/supply-and-sale/e-supply-front';
const outDir=path.join(appRoot,'logs/over-plan-linkage-20260316');
const browser=await chromium.launch({headless:true, executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const context=await browser.newContext({viewport:{width:1440,height:960}});
const page=await context.newPage();
await page.goto('http://127.0.0.1:5173/dashboard/workplace',{waitUntil:'domcontentloaded'});
await page.waitForTimeout(1500);
if (await page.getByRole('button', {name:/登录系统|Sign in/i}).isVisible().catch(()=>false)) {
  await page.getByRole('button', {name:/登录系统|Sign in/i}).click();
  await page.waitForTimeout(2500);
}
await page.screenshot({path:path.join(outDir,'login-step-1.png'),fullPage:true});
console.log('url1', page.url());
const emailInput=page.locator('input[type="email"], input[name="identifier"]');
console.log('email count', await emailInput.count());
if (await emailInput.count()) {
  await emailInput.first().fill('admin@huaaosoft.com');
  await page.getByRole('button', { name: /Continue|Sign in|登录/i }).click();
  await page.waitForTimeout(1500);
  await page.screenshot({path:path.join(outDir,'login-step-2.png'),fullPage:true});
  console.log('url2', page.url());
  await page.locator('input[type="password"]').first().fill('ZsW@5H8Wl^7M44zG');
  await page.getByRole('button', { name: /Continue|Sign in|登录/i }).click();
  await page.waitForTimeout(6000);
  await page.screenshot({path:path.join(outDir,'login-step-3.png'),fullPage:true});
  console.log('url3', page.url());
  await context.storageState({path:path.join(appRoot,'logs/route-sweep-auth.json')});
}
await browser.close();