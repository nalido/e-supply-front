import { chromium } from 'playwright';
const base='http://115.29.200.124';
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({ignoreHTTPSErrors:true});
const page=await context.newPage();
await page.goto(base+'/welcome',{waitUntil:'domcontentloaded',timeout:60000});
await page.getByRole('button',{name:/登录系统|登录|sign in/i}).first().click();
await page.locator('input[name="identifier"],input[type="email"]').first().waitFor({timeout:30000});
await page.locator('input[name="identifier"],input[type="email"]').first().fill('jambin');
await page.locator('input[name="password"],input[type="password"]').first().fill('Jambin288416');
await page.getByRole('button',{name:/继续|continue|sign in|登录|下一步/i}).first().click();
await page.waitForURL(/\/dashboard\//,{timeout:30000});
const p2=await context.newPage();
const issues=[];
p2.on('response',r=>{if(r.url().includes('/api/')&&r.status()>=400) issues.push(`API ${r.status()} ${r.url()}`)});
try{
  await p2.goto(base+'/orders/report/cost',{waitUntil:'domcontentloaded',timeout:60000});
  await p2.waitForTimeout(2000);
  console.log('URL',p2.url());
}catch(e){console.log('ERR',String(e.message||e));}
console.log('issues',issues.slice(0,10));
await p2.screenshot({path:'logs/menu-audit-2026-03-01_1020/errors/orders_report_cost_recheck.png',fullPage:true});
await browser.close();
