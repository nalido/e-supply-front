import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl='http://115.29.200.124';
const user='jambin';
const pass='Jambin288416';
const ts=new Date().toISOString().replace(/[:.]/g,'').replace('T','_').slice(0,15);
const outDir=path.join('logs',`menu-click-audit-${ts}`);
const errDir=path.join(outDir,'errors'); fs.mkdirSync(errDir,{recursive:true});

const browser=await chromium.launch({headless:true});
const context=await browser.newContext({ignoreHTTPSErrors:true,viewport:{width:1600,height:1100}});
const page=await context.newPage();

const issueBuf=[];
page.on('pageerror',e=>issueBuf.push({type:'pageerror',message:e.message,page:page.url()}));
page.on('console',m=>{ if(m.type()==='error') issueBuf.push({type:'console',message:m.text(),page:page.url()});});
page.on('response',r=>{ if(r.url().includes('/api/')&&r.status()>=400) issueBuf.push({type:'api',status:r.status(),url:r.url(),page:page.url()});});

const clickAndRecord = async (route, locator) => {
  const start = issueBuf.length;
  try {
    await locator.scrollIntoViewIfNeeded();
    await locator.click({timeout:4000});
    await page.waitForTimeout(1500);
  } catch (e) {
    issueBuf.push({type:'click',message:String(e?.message||e),page:route});
  }
  const issues = issueBuf.slice(start);
  let shot = null;
  if (issues.length) {
    shot = path.join(errDir, route.replace(/^\//,'').replace(/[^a-zA-Z0-9_-]+/g,'_') + '.png');
    try { await page.screenshot({path:shot,fullPage:true}); } catch {}
  }
  return { route, finalUrl: page.url(), issues, screenshot: shot };
};

// login click-path
await page.goto(baseUrl+'/welcome',{waitUntil:'domcontentloaded',timeout:60000});
await page.getByRole('button',{name:/登录系统|登录|sign in/i}).first().click();
await page.locator('input[name="identifier"],input[type="email"]').first().waitFor({timeout:30000});
await page.locator('input[name="identifier"],input[type="email"]').first().fill(user);
await page.locator('input[name="password"],input[type="password"]').first().fill(pass);
await page.getByRole('button',{name:/继续|continue|sign in|登录|下一步/i}).first().click();
await page.waitForURL(/\/dashboard\//,{timeout:30000});
await page.locator('.ant-layout-sider .ant-menu').first().waitFor({timeout:15000});

const results=[];
const seen = new Set();

// top-level links
const topLinks = page.locator('.ant-layout-sider > .ant-layout-sider-children .ant-menu > li.ant-menu-item a[href^="/"]');
for (let i=0;i<await topLinks.count();i++) {
  const link = topLinks.nth(i);
  const href = await link.getAttribute('href');
  if (!href || seen.has(href)) continue;
  seen.add(href);
  results.push(await clickAndRecord(href, link));
}

// submenu links
const submenuCount = await page.locator('.ant-layout-sider li.ant-menu-submenu').count();
for (let si=0; si<submenuCount; si++) {
  const submenu = page.locator('.ant-layout-sider li.ant-menu-submenu').nth(si);
  const title = submenu.locator('> div.ant-menu-submenu-title').first();
  try { await title.click({timeout:3000}); } catch {}
  await page.waitForTimeout(400);

  const links = submenu.locator('ul a[href^="/"]');
  const ln = await links.count();
  for (let j=0;j<ln;j++) {
    const l = links.nth(j);
    const href = await l.getAttribute('href');
    if (!href || seen.has(href)) continue;
    seen.add(href);
    results.push(await clickAndRecord(href, l));
  }
}

const report={generatedAt:new Date().toISOString(),mode:'pure-click-path',clickedRoutes:results.length,errorRoutes:results.filter(r=>r.issues.length>0).length,results};
fs.writeFileSync(path.join(outDir,'report.json'),JSON.stringify(report,null,2));
fs.writeFileSync(path.join(outDir,'report.md'),[
  '# 纯点击路径回归报告',
  `- 时间: ${report.generatedAt}`,
  `- 点击路由数: ${report.clickedRoutes}`,
  `- 异常路由数: ${report.errorRoutes}`,
  ...results.filter(r=>r.issues.length>0).flatMap(r=>[
    `\n## ${r.route}`,
    ...r.issues.map(i=>`- [${i.type}] ${i.status??''} ${i.url??''} ${i.message??''}`.trim()),
    r.screenshot?`- 截图: ${r.screenshot}`:''
  ])
].join('\n'));

console.log(JSON.stringify({outDir,clickedRoutes:report.clickedRoutes,errorRoutes:report.errorRoutes},null,2));
await browser.close();
