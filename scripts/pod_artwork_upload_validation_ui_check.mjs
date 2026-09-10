#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'

const baseUrl = process.env.ESUPPLY_UI_BASE_URL || 'http://127.0.0.1:5182'
const outputDir = process.env.ESUPPLY_OUTPUT_DIR || path.resolve(
  process.cwd(),
  '../docs/e-supply/04-verification/pod-artwork-upload-validation-20260910',
)
const maxArtworkBytes = 10 * 1024 * 1024
const tooLargeMessage = '透明设计图不能超过 10MB，请压缩后重新上传'
const transparentPixel = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+XoPsWQAAAABJRU5ErkJggg=='

const workflow = {
  version: 1,
  prints: [{ id: 'front-logo', name: '正面图案', color: '#2563eb' }],
  sizes: [{ id: 'm', name: 'M' }],
  nodes: [
    { id: 'input-front', type: 'INPUT', imageId: 11, name: '正面图', finalOutput: false },
    {
      id: 'print-front',
      type: 'PRINT',
      imageId: 11,
      inputNodeId: 'input-front',
      printId: 'front-logo',
      name: '正面印花',
      finalOutput: true,
      outputRole: 'PRODUCT_MAIN',
      area: { x: 0.32, y: 0.24, width: 0.26, height: 0.3, rotationDegrees: 0, mirrorArtwork: false },
      sizeMeasurements: [{ sizeId: 'm', widthMm: 180, heightMm: 200 }],
    },
  ],
}

const template = {
  id: 1,
  templateNo: 'UPLOAD-CHECK-001',
  templateName: '上传校验验收模板',
  categoryName: '卫衣',
  description: '本地页面上传边界验收',
  status: 'ACTIVE',
  configVersion: 1,
  printTechnique: 'DTF',
  minDpi: 300,
  bleedMm: 5,
  safeMarginMm: 5,
  workflowConfig: JSON.stringify(workflow),
  images: [{
    id: 11,
    imageRole: 'PRODUCT_MAIN',
    imageName: '正面图',
    deliveryUrl: transparentPixel,
    referencePreviewUrl: transparentPixel,
    width: 1200,
    height: 1200,
    rotationDegrees: 0,
    mirrorArtwork: false,
    sortOrder: 0,
  }],
  readinessBlockers: [],
  createdAt: '2026-09-10T14:00:00',
  updatedAt: '2026-09-10T14:00:00',
}

const uploadedAsset = {
  id: 101,
  assetType: 'SOURCE_IMAGE',
  printId: 'front-logo',
  fileName: 'valid-transparent.png',
  deliveryUrl: transparentPixel,
  width: 1,
  height: 1,
  fileSize: 70,
}

let uploaded = false
let updateRequests = 0
let uploadRequests = 0

const styleFixture = () => ({
  id: 1,
  currentRevisionId: 21,
  productTemplateId: 1,
  styleNo: 'LOCAL-UPLOAD-001',
  styleName: '设计图上传校验验收',
  status: 'DRAFT',
  categoryName: '卫衣',
  description: '验证超限文件在页面端拦截',
  resultCurrent: false,
  publishReadiness: { ready: false, blockers: ['请先完成效果图生成并确认'] },
  reviewEvents: [],
  revisions: [{ id: 21, revisionNo: 1, frozen: false, assets: uploaded ? [uploadedAsset] : [] }],
  mockupImages: [],
  createdAt: '2026-09-10T14:00:00',
  updatedAt: '2026-09-10T14:00:00',
})

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

fs.mkdirSync(outputDir, { recursive: true })
for (const name of ['01-oversized-artwork.png', '02-valid-artwork.png', '99-failure.png', 'result.json']) {
  fs.rmSync(path.join(outputDir, name), { force: true })
}

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
page.on('pageerror', (error) => result.consoleErrors.push(`pageerror: ${error.message}`))
page.on('console', (message) => {
  if (message.type() === 'error') result.consoleErrors.push(`console: ${message.text()}`)
})
page.on('requestfailed', (request) => {
  result.failedRequests.push(`${request.method()} ${request.url()} ${request.failure()?.errorText || ''}`)
})
page.on('response', (response) => {
  const url = new URL(response.url())
  if (url.pathname.startsWith('/api/') && response.status() >= 400) {
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
      stats: { users: { value: 1, limit: 20 }, storage: { value: 1, limit: 20 } },
      modules: [],
      tenants: [{ id: '1', name: '本地验收企业', current: true }],
      billing: { status: 'ACTIVE', upgradeRequired: false },
    }))
  }
  if (url.pathname === '/api/v1/pod/product-templates/render-capability') {
    return route.fulfill(json({ available: true, provider: 'local-check', model: 'local-check' }))
  }
  if (url.pathname === '/api/v1/pod/product-templates' && request.method() === 'GET') {
    return route.fulfill(json([template]))
  }
  if (url.pathname === '/api/v1/pod/design-styles/1' && request.method() === 'GET') {
    return route.fulfill(json(styleFixture()))
  }
  if (url.pathname === '/api/v1/pod/design-styles/1/update' && request.method() === 'POST') {
    updateRequests += 1
    return route.fulfill(json(styleFixture()))
  }
  if (url.pathname === '/api/v1/pod/design-styles/1/assets/upload' && request.method() === 'POST') {
    uploadRequests += 1
    uploaded = true
    return route.fulfill(json(uploadedAsset))
  }
  if (url.pathname === '/api/v1/settings/preferences') return route.fulfill(json([]))
  if (url.pathname === '/api/v1/workshop/reports/downloads') {
    return route.fulfill(json({ list: [], total: 0, page: 0, size: 20 }))
  }
  if (url.pathname === '/api/v1/settings/usage-analytics/events') {
    return route.fulfill({ status: 204, body: '' })
  }
  return route.fulfill(json({ items: [], list: [], total: 0, page: 0, size: 20 }))
})

try {
  await page.goto(`${baseUrl}/customization/styles/1`, { waitUntil: 'networkidle' })
  await page.getByRole('heading', { name: '设计图上传校验验收', exact: true }).waitFor()
  check(
    '上传区域明确展示 10MB 限制',
    await page.getByText('上传正面图案的透明 PNG（不超过 10MB）', { exact: true }).count() === 1,
  )

  const fileInput = page.locator('.pod-print-uploader input[type="file"]')
  check('找到设计图文件选择控件', await fileInput.count() === 1)
  await fileInput.setInputFiles({
    name: 'too-large-transparent.png',
    mimeType: 'image/png',
    buffer: Buffer.alloc(maxArtworkBytes + 1),
  })
  await page.getByText(tooLargeMessage, { exact: true }).waitFor()
  check('超限文件显示明确压缩提示', await page.getByText(tooLargeMessage, { exact: true }).count() === 1)
  check('超限文件不会触发款式保存', updateRequests === 0, `updateRequests=${updateRequests}`)
  check('超限文件不会发起上传请求', uploadRequests === 0, `uploadRequests=${uploadRequests}`)
  await page.screenshot({ path: path.join(outputDir, '01-oversized-artwork.png'), fullPage: true })
  result.screenshots.push('01-oversized-artwork.png')

  await fileInput.setInputFiles({
    name: 'valid-transparent.png',
    mimeType: 'image/png',
    buffer: Buffer.from(transparentPixel.split(',')[1], 'base64'),
  })
  await page.getByText('透明设计图已上传，旧生成结果已失效', { exact: true }).waitFor()
  await page.getByText('点击更换设计图（透明 PNG，不超过 10MB）', { exact: true }).waitFor()
  check('合规文件继续保存并上传', updateRequests === 1 && uploadRequests === 1, `update=${updateRequests} upload=${uploadRequests}`)
  check('上传成功后状态更新为已上传', await page.getByText('已上传', { exact: true }).count() === 1)
  await page.screenshot({ path: path.join(outputDir, '02-valid-artwork.png'), fullPage: true })
  result.screenshots.push('02-valid-artwork.png')

  check('页面无脚本或控制台错误', result.consoleErrors.length === 0, result.consoleErrors.join('\n'))
  check('页面无失败请求', result.failedRequests.length === 0, result.failedRequests.join('\n'))
  check('页面无失败接口响应', result.failedApiResponses.length === 0, result.failedApiResponses.join('\n'))
  result.ok = true
} catch (error) {
  result.error = error instanceof Error ? error.stack : String(error)
  await page.screenshot({ path: path.join(outputDir, '99-failure.png'), fullPage: true }).catch(() => {})
} finally {
  fs.writeFileSync(path.join(outputDir, 'result.json'), `${JSON.stringify(result, null, 2)}\n`)
  await browser.close()
}

if (!result.ok) {
  console.error(result.error)
  process.exit(1)
}

console.log(`POD artwork upload UI checks passed: ${result.checks.length}`)
