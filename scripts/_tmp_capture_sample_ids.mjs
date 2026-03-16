import fs from 'node:fs';
import { chromium } from 'playwright';
const envPath = '/Users/huangjianbing/codes/supply-and-sale/e-supply-back/src/main/resources/.env.dev';
const env = {};
for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
  const s = line.trim(); if (!s || s.startsWith('#') || !s.includes('=')) continue;
  const idx = s.indexOf('='); env[s.slice(0, idx)] = s.slice(idx + 1).replace(/^["']|["']$/g, '');
}
const baseUrl='http://127.0.0.1:4173';
const username=env.ESUPPLY_ADMIN_EMAIL || env.ESUPPLY_ADMIN_USERNAME || 'jambin';
const password=env.ESUPPLY_ADMIN_PASSWORD;
const browser=await chromium.launch({headless:true, executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const context=await browser.newContext({viewport:{width:1440,height:1100}});
const page=await context.newPage();
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
let captured=[];
page.on('response', async (resp) => {
  const url = resp.url();
  if (!url.includes('/api/v1/sample-orders') || url.includes('/stats')) return;
  try {
    const json = await resp.json();
    if (json?.items) captured.push({ url, items: json.items.map(i => ({ id: i.id, orderNo: i.sampleNo || i.orderNo, styleNo: i.styleNo, styleName: i.styleName })) });
  } catch {}
});
async function login(){
 await page.goto(`${baseUrl}/welcome`,{waitUntil:'domcontentloaded',timeout:60000});
 const loginBtn=page.getByRole('button',{name:'登录系统'}); if(await loginBtn.count()){await loginBtn.click().catch(()=>{}); await sleep(1200);} 
 const userInput=page.locator('input[name="identifier"], input[type="email"], input[name="username"], input[name="emailAddress"]').first();
 await userInput.waitFor({timeout:30000}); await userInput.fill(username);
 await page.getByRole('button',{name:/继续|Continue|Sign in|下一步/i}).first().click();
 const pwdInput=page.locator('input[type="password"]').first(); await pwdInput.waitFor({timeout:30000}); await pwdInput.fill(password);
 await page.getByRole('button',{name:/继续|Continue|Sign in|登录/i}).first().click(); await page.waitForLoadState('domcontentloaded'); await sleep(4000);
}
try{
 await login();
 await page.goto(`${baseUrl}/sample/list`,{waitUntil:'domcontentloaded',timeout:60000});
 await sleep(5000);
 console.log(JSON.stringify(captured, null, 2));
} finally { await browser.close(); }
