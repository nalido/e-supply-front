import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl='http://115.29.200.124';
const user='jambin';
const pass='Jambin288416';
const ts=new Date().toISOString().replace(/[:.]/g,'').replace('T','_').slice(0,15);
const outDir=path.join('logs',`menu-click-audit-${ts}`);
const errDir=path.join(outDir,'errors');
fs.mkdirSync(errDir,{recursive:true});

const browser=await chromium.launch({headless:true});
const context=await browser.newContext({ignoreHTTPSErrors:true,viewport:{width:1600,height:1100}});
const page=await context.newPage();

const issues=[];
page.on('pageerror',e=>issues.push({type:'pageerror',message:e.message,page:page.url()}));
page.on('console',m=>{ if(m.type()==='error') issues.push({type:'console',message:m.text(),page:page.url()});});
page.on('response',r=>{ if(r.url().includes('/api/') && r.status()>=400) issues.push({type:'api',status:r.status(),url:r.url(),page:page.url()});});

await page.goto(baseUrl+'/welcome',{waitUntil:'domcontentloaded',timeout:60000});
await page.getByRole('button',{name:/登录系统|登录|sign in/i}).first().click();
await page.locator('input[name="identifier"],input[type="email"]').first().waitFor({timeout:30000});
await page.locator('input[name="identifier"],input[type="email"]').first().fill(user);
await page.locator('input[name="password"],input[type="password"]').first().fill(pass);
await page.getByRole('button',{name:/继续|continue|sign in|登录|下一步/i}).first().click();
await page.waitForURL(/\/dashboard\//,{timeout:30000});
await page.locator('.ant-layout-sider .ant-menu').first().waitFor({timeout:15000});
await page.waitForTimeout(1000);

// progressively expand all submenus to reveal all anchors
let prev = -1;
for (let round=0; round<8; round++) {
  const titles = page.locator('.ant-layout-sider .ant-menu-submenu-title');
  const n = await titles.count();
  for (let i=0;i<n;i++) {
    try { await titles.nth(i).click({timeout:1200}); } catch {}
  }
  await page.waitForTimeout(500);
  const hrefCount = await page.locator('.ant-layout-sider .ant-menu a[href^="/"]').count();
  if (hrefCount === prev) break;
  prev = hrefCount;
}

const hrefs = await page.locator('.ant-layout-sider .ant-menu a[href^="/"]').evaluateAll(nodes => {
  const arr = nodes.map(n => n.getAttribute('href')).filter(Boolean);
  return [...new Set(arr)];
});

const results=[];
for (const href of hrefs) {
  const start = issues.length;
  try {
    // ensure parent menus expanded again
    const titles = page.locator('.ant-layout-sider .ant-menu-submenu-title');
    const n = await titles.count();
    for (let i=0;i<n;i++) { try { await titles.nth(i).click({timeout:500}); } catch {} }
    const link = page.locator(`.ant-layout-sider .ant-menu a[href="${href}"]`).first();
    await link.scrollIntoViewIfNeeded();
    await link.click({timeout:5000});
    await page.waitForTimeout(1800);
  } catch (e) {
    issues.push({type:'click',message:String(e?.message||e),page:href});
  }
  const newIssues = issues.slice(start);
  let shot = null;
  if (newIssues.length>0) {
    shot = path.join(errDir, href.replace(/^\//,'').replace(/[^a-zA-Z0-9_-]+/g,'_') + '.png');
    try { await page.screenshot({path:shot,fullPage:true}); } catch {}
  }
  results.push({route:href,finalUrl:page.url(),issues:newIssues,screenshot:shot});
}

const report = {
  generatedAt: new Date().toISOString(),
  mode: 'pure-click-path',
  totalMenuLinks: hrefs.length,
  errorRoutes: results.filter(r=>r.issues.length>0).length,
  results,
};
fs.writeFileSync(path.join(outDir,'report.json'), JSON.stringify(report,null,2));
fs.writeFileSync(path.join(outDir,'report.md'), [
  '# 纯点击路径回归报告',
  `- 时间: ${report.generatedAt}`,
  `- 菜单链接数: ${report.totalMenuLinks}`,
  `- 异常路由数: ${report.errorRoutes}`,
  ...results.filter(r=>r.issues.length>0).flatMap(r=>[
    `\n## ${r.route}`,
    ...r.issues.map(i=>`- [${i.type}] ${i.status??''} ${i.url??''} ${i.message??''}`.trim()),
    r.screenshot?`- 截图: ${r.screenshot}`:''
  ])
].join('\n'));

console.log(JSON.stringify({outDir,totalMenuLinks:report.totalMenuLinks,errorRoutes:report.errorRoutes},null,2));
await browser.close();
