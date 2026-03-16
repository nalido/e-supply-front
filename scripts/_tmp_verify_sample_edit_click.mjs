import fs from 'node:fs';
import path from 'node:path';
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
const sampleId=6;
const outDir=`/Users/huangjianbing/.openclaw/workspace/outbox/sample-edit-click-${Date.now()}`;
fs.mkdirSync(outDir,{recursive:true});
const browser=await chromium.launch({headless:true, executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const context=await browser.newContext({viewport:{width:1440,height:1100}, deviceScaleFactor:1});
const page=await context.newPage();
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
const result={baseUrl,sampleId,outDir};
async function shot(name){ await page.screenshot({ path:path.join(outDir,name), timeout:60000 }); }
async function login(){
 await page.goto(`${baseUrl}/welcome`,{waitUntil:'domcontentloaded',timeout:60000});
 const loginBtn=page.getByRole('button',{name:'登录系统'}); if(await loginBtn.count()){await loginBtn.click().catch(()=>{}); await sleep(1200);} 
 const userInput=page.locator('input[name="identifier"], input[type="email"], input[name="username"], input[name="emailAddress"]').first();
 await userInput.waitFor({timeout:30000}); await userInput.fill(username);
 await page.getByRole('button',{name:/继续|Continue|Sign in|下一步/i}).first().click();
 const pwdInput=page.locator('input[type="password"]').first(); await pwdInput.waitFor({timeout:30000}); await pwdInput.fill(password);
 await page.getByRole('button',{name:/继续|Continue|Sign in|登录/i}).first().click(); await page.waitForLoadState('domcontentloaded'); await sleep(4000);
}
try {
 await login();
 await page.goto(`${baseUrl}/sample/detail?id=${sampleId}`, { waitUntil:'domcontentloaded', timeout:60000 });
 await sleep(3000);
 await shot('01-detail-before-edit.png');
 const editBtn = page.getByRole('button', { name: '编辑' }).first();
 await editBtn.waitFor({ timeout: 30000 });
 await editBtn.click();
 await page.getByText('编辑样板单').first().waitFor({ timeout: 30000 });
 await sleep(1500);
 result.url=page.url();
 result.hasEditModal=await page.getByText('编辑样板单').count();
 result.hasSaveLinked=await page.getByRole('button', { name:'保存关联款式资料' }).count();
 result.styleCodeDisabled=await page.locator('input[placeholder="请输入款号"]').first().isDisabled();
 result.styleNameDisabled=await page.locator('input[placeholder="请输入款名"]').first().isDisabled();
 await shot('02-edit-modal-top.png');
 await page.getByText('物料清单').nth(1).scrollIntoViewIfNeeded().catch(()=>{});
 await sleep(1000);
 await shot('03-edit-modal-materials.png');
 fs.writeFileSync(path.join(outDir,'result.json'), JSON.stringify(result,null,2));
 console.log(JSON.stringify(result,null,2));
} catch (error) {
 result.error=String(error); result.finalUrl=page.url();
 await page.screenshot({ path:path.join(outDir,'99-failure.png'), timeout:60000 }).catch(()=>{});
 fs.writeFileSync(path.join(outDir,'result.json'), JSON.stringify(result,null,2));
 console.log(JSON.stringify(result,null,2)); process.exitCode=1;
} finally { await browser.close(); }
