import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
const appRoot='/Users/huangjianbing/codes/supply-and-sale/e-supply-front';
const outDir=path.join(appRoot,'logs/over-plan-linkage-20260316');
const browser=await chromium.launch({headless:true, executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const page=(await browser.newContext({viewport:{width:1440,height:960}})).newPage();
const p=await page; await p.goto('http://127.0.0.1:5173/welcome',{waitUntil:'domcontentloaded'}); await p.waitForTimeout(2000); fs.writeFileSync(path.join(outDir,'welcome.html'), await p.content()); console.log(await p.locator('body').innerText()); await browser.close();