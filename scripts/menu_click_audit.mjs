import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl='http://115.29.200.124';
const user='jambin';
const pass='Jambin288416';
const ts=new Date().toISOString().replace(/[:.]/g,'').replace('T','_').slice(0,15);
const outDir=path.join('logs',`menu-click-audit-${ts}`); const errDir=path.join(outDir,'errors'); fs.mkdirSync(errDir,{recursive:true});

const browser=await chromium.launch({headless:true});
const context=await browser.newContext({ignoreHTTPSErrors:true,viewport:{width:1600,height:1100}});
const page=await context.newPage();
const allIssues=[];
page.on('pageerror',e=>allIssues.push({type:'pageerror',message:e.message,url:page.url()}));
page.on('console',m=>{if(m.type()==='error') allIssues.push({type:'console',message:m.text(),url:page.url()});});
page.on('response',r=>{if(r.url().includes('/api/')&&r.status()>=400) allIssues.push({type:'api',status:r.status(),url:r.url(),page:page.url()});});

await page.goto(baseUrl+'/welcome',{waitUntil:'domcontentloaded',timeout:60000});
await page.getByRole('button',{name:/登录系统|登录|sign in/i}).first().click();
await page.locator('input[name="identifier"],input[type="email"]').first().waitFor({timeout:30000});
await page.locator('input[name="identifier"],input[type="email"]').first().fill(user);
await page.locator('input[name="password"],input[type="password"]').first().fill(pass);
await page.getByRole('button',{name:/继续|continue|sign in|登录|下一步/i}).first().click();
await page.waitForURL(/\/dashboard\//,{timeout:30000});
await page.locator('.ant-layout-sider .ant-menu').first().waitFor({timeout:20000});
await page.waitForTimeout(1000);

for(let i=0;i<6;i++){
  const subs=page.locator('.ant-layout-sider .ant-menu-submenu-title');
  const n=await subs.count();
  for(let j=0;j<n;j++){ try{ await subs.nth(j).click({timeout:1000}); }catch{} }
}
await page.waitForTimeout(800);

const hrefs = await page.locator('.ant-layout-sider .ant-menu a[href^="/"]').evaluateAll(nodes => [...new Set(nodes.map(n=>n.getAttribute('href')).filter(Boolean))]);

const results=[];
for (const href of hrefs){
  const start=allIssues.length;
  try{
    const l=page.locator(`.ant-layout-sider .ant-menu a[href="${href}"]`).first();
    await l.scrollIntoViewIfNeeded();
    await l.click({timeout:5000});
    await page.waitForTimeout(1800);
  }catch(e){ allIssues.push({type:'click',message:String(e?.message||e),url:href}); }
  const issues=allIssues.slice(start);
  let shot=null;
  if(issues.length){ shot=path.join(errDir,href.replace(/^\//,'').replace(/[^a-zA-Z0-9_-]+/g,'_')+'.png'); await page.screenshot({path:shot,fullPage:true}); }
  results.push({route:href,finalUrl:page.url(),issues,screenshot:shot});
}

const report={generatedAt:new Date().toISOString(),mode:'pure-click-path',totalMenuLinks:hrefs.length,errorRoutes:results.filter(r=>r.issues.length).length,results};
fs.writeFileSync(path.join(outDir,'report.json'),JSON.stringify(report,null,2));
fs.writeFileSync(path.join(outDir,'report.md'),`# 纯点击路径回归报告\n- 菜单链接数: ${report.totalMenuLinks}\n- 异常路由数: ${report.errorRoutes}\n`+results.filter(r=>r.issues.length).map(r=>`\n## ${r.route}\n${r.issues.map(i=>`- [${i.type}] ${i.status??''} ${i.url??''} ${i.message??''}`).join('\n')}\n${r.screenshot?`- 截图: ${r.screenshot}`:''}`).join('\n'));
console.log(JSON.stringify({outDir,totalMenuLinks:report.totalMenuLinks,errorRoutes:report.errorRoutes},null,2));
await browser.close();
