#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'

const baseUrl = process.env.ESUPPLY_UI_BASE_URL || 'http://127.0.0.1:5182'
const outputDir = process.env.ESUPPLY_OUTPUT_DIR || path.resolve(
  process.cwd(),
  '../docs/e-supply/04-verification/pod-template-status-20260910',
)

const templateDefaults = {
  categoryName: '卫衣',
  description: '模板状态展示验收',
  configVersion: 7,
  printTechnique: 'DTF',
  minDpi: 300,
  bleedMm: 5,
  safeMarginMm: 5,
  workflowConfig: '{"version":1,"prints":[],"sizes":[],"nodes":[]}',
  images: [],
  createdAt: '2026-09-10T12:00:00',
  updatedAt: '2026-09-10T12:10:00',
}

const templates = [
  {
    ...templateDefaults,
    id: 1,
    templateNo: 'READY-DRAFT-001',
    templateName: '资料已齐全模板',
    status: 'DRAFT',
    readinessBlockers: [],
  },
  {
    ...templateDefaults,
    id: 2,
    templateNo: 'INCOMPLETE-001',
    templateName: '资料待补充模板',
    status: 'DRAFT',
    readinessBlockers: ['至少配置一张商品图的设计区域'],
  },
  {
    ...templateDefaults,
    id: 3,
    templateNo: 'ACTIVE-001',
    templateName: '使用中的模板',
    status: 'ACTIVE',
    readinessBlockers: [],
  },
  {
    ...templateDefaults,
    id: 4,
    templateNo: 'INACTIVE-001',
    templateName: '已停用模板',
    status: 'INACTIVE',
    readinessBlockers: [],
  },
]

const result = {
  ok: false,
  baseUrl,
  checks: [],
  screenshots: [],
  consoleErrors: [],
  failedRequests: [],
  failedApiResponses: [],
}

function check(name, condition, detail) {
  result.checks.push({ name, ok: Boolean(condition), detail })
  if (!condition) throw new Error(`${name}${detail ? `: ${detail}` : ''}`)
}

const json = (body) => ({
  status: 200,
  contentType: 'application/json',
  body: JSON.stringify(body),
})

async function preparePage(browser, viewport = { width: 1440, height: 1000 }) {
  const page = await browser.newPage({ viewport })
  page.on('pageerror', (error) => result.consoleErrors.push(`pageerror: ${error.message}`))
  page.on('console', (message) => {
    if (message.type() === 'error') result.consoleErrors.push(`console: ${message.text()}`)
  })
  page.on('requestfailed', (request) => {
    result.failedRequests.push(`${request.method()} ${request.url()} ${request.failure()?.errorText || ''}`)
  })
  page.on('response', (response) => {
    if (response.url().includes('/api/') && response.status() >= 400) {
      result.failedApiResponses.push(`${response.status()} ${response.url()}`)
    }
  })
  await page.route('**/api/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    if (!url.pathname.startsWith('/api/')) return route.continue()
    if (url.pathname === '/api/v1/auth/onboarding/status') {
      return route.fulfill(json({
        linked: true,
        tenantId: 1,
        userId: 20,
        tenantName: '本地验收企业',
        username: 'admin',
        billing: { status: 'ACTIVE', upgradeRequired: false },
      }))
    }
    if (url.pathname === '/api/v1/settings/company/overview') {
      return route.fulfill(json({
        id: '1',
        name: '本地验收企业',
        stats: {
          users: { value: 1, limit: 20 },
          storage: { value: 1, limit: 20 },
        },
        modules: [],
        tenants: [{ id: '1', name: '本地验收企业', current: true }],
        billing: { status: 'ACTIVE', upgradeRequired: false },
      }))
    }
    if (url.pathname === '/api/v1/pod/product-templates' && request.method() === 'GET') {
      return route.fulfill(json(templates))
    }
    const detailMatch = url.pathname.match(/^\/api\/v1\/pod\/product-templates\/(\d+)$/)
    if (detailMatch && request.method() === 'GET') {
      const template = templates.find((item) => item.id === Number(detailMatch[1]))
      return route.fulfill(template ? json(template) : { status: 404, body: '' })
    }
    if (url.pathname === '/api/v1/pod/print-size-history') return route.fulfill(json([]))
    if (url.pathname === '/api/v1/settings/preferences') return route.fulfill(json([]))
    if (url.pathname === '/api/v1/workshop/reports/downloads') {
      return route.fulfill(json({ list: [], total: 0, page: 0, size: 20 }))
    }
    if (url.pathname === '/api/v1/settings/usage-analytics/events') {
      return route.fulfill({ status: 204, body: '' })
    }
    return route.fulfill(json({ items: [], list: [], total: 0, page: 0, size: 20 }))
  })
  return page
}

async function statusMeta(row) {
  const tag = row.locator('.ant-tag').first()
  return {
    label: (await tag.textContent())?.trim(),
    className: await tag.getAttribute('class'),
  }
}

fs.mkdirSync(outputDir, { recursive: true })
for (const name of [
  '01-template-list-statuses.png',
  '02-ready-draft-detail.png',
  '03-incomplete-draft-detail.png',
  '99-failure.png',
  'result.json',
]) {
  fs.rmSync(path.join(outputDir, name), { force: true })
}
const browser = await chromium.launch({ headless: true })
let activePage
try {
  const listPage = await preparePage(browser)
  activePage = listPage
  await listPage.goto(`${baseUrl}/customization/templates`, { waitUntil: 'networkidle' })
  await listPage.getByRole('heading', { name: '款式模板', exact: true }).waitFor()

  const expectedRows = [
    ['READY-DRAFT-001', '待启用', 'ant-tag-blue'],
    ['INCOMPLETE-001', '待完善', 'ant-tag-orange'],
    ['ACTIVE-001', '已启用', 'ant-tag-green'],
    ['INACTIVE-001', '已停用', ''],
  ]
  for (const [templateNo, label, colorClass] of expectedRows) {
    const row = listPage.getByRole('row').filter({ hasText: templateNo })
    const meta = await statusMeta(row)
    check(`列表 ${templateNo} 显示“${label}”`, meta.label === label, JSON.stringify(meta))
    if (colorClass) {
      check(`列表 ${templateNo} 使用对应状态色`, meta.className?.includes(colorClass), meta.className)
    }
  }
  await listPage.screenshot({ path: path.join(outputDir, '01-template-list-statuses.png'), fullPage: true })
  result.screenshots.push('01-template-list-statuses.png')

  const readyDetailPage = await preparePage(browser)
  activePage = readyDetailPage
  await readyDetailPage.goto(`${baseUrl}/customization/templates/1`, { waitUntil: 'networkidle' })
  await readyDetailPage.getByRole('heading', { name: '资料已齐全模板', exact: true }).waitFor()
  const readyTag = readyDetailPage.locator('.pod-editor-heading .ant-tag').first()
  check('详情页完整草稿显示“待启用”', (await readyTag.textContent())?.trim() === '待启用')
  check('详情页完整草稿不显示缺失项提示', await readyDetailPage.getByText('启用前还需要完成').count() === 0)
  await readyDetailPage.screenshot({ path: path.join(outputDir, '02-ready-draft-detail.png'), fullPage: true })
  result.screenshots.push('02-ready-draft-detail.png')

  const incompleteDetailPage = await preparePage(browser)
  activePage = incompleteDetailPage
  await incompleteDetailPage.goto(`${baseUrl}/customization/templates/2`, { waitUntil: 'networkidle' })
  await incompleteDetailPage.getByRole('heading', { name: '资料待补充模板', exact: true }).waitFor()
  const incompleteTag = incompleteDetailPage.locator('.pod-editor-heading .ant-tag').first()
  check('详情页缺失资料草稿仍显示“待完善”', (await incompleteTag.textContent())?.trim() === '待完善')
  check('详情页缺失资料草稿保留明确缺失项', await incompleteDetailPage.getByText('至少配置一张商品图的设计区域').count() === 1)
  await incompleteDetailPage.screenshot({ path: path.join(outputDir, '03-incomplete-draft-detail.png'), fullPage: true })
  result.screenshots.push('03-incomplete-draft-detail.png')

  check('页面无脚本或控制台错误', result.consoleErrors.length === 0, result.consoleErrors.join('\n'))
  check('页面无失败请求', result.failedRequests.length === 0, result.failedRequests.join('\n'))
  check('页面无失败接口响应', result.failedApiResponses.length === 0, result.failedApiResponses.join('\n'))
  result.ok = true
} catch (error) {
  result.error = error instanceof Error ? error.stack : String(error)
  if (activePage) {
    await activePage.screenshot({ path: path.join(outputDir, '99-failure.png'), fullPage: true }).catch(() => {})
  }
} finally {
  fs.writeFileSync(path.join(outputDir, 'result.json'), `${JSON.stringify(result, null, 2)}\n`)
  await browser.close()
}

if (!result.ok) {
  console.error(result.error)
  process.exit(1)
}

console.log(`POD template status UI checks passed: ${result.checks.length}`)
