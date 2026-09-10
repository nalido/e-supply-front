#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'

const baseUrl = process.env.ESUPPLY_UI_BASE_URL || 'http://127.0.0.1:5182'
const outputDir = process.env.ESUPPLY_OUTPUT_DIR || path.resolve(
  process.cwd(),
  '../docs/e-supply/04-verification/material-specification-input-focus-20260910',
)

const materialDefaults = {
  tenantId: 1,
  imageUrl: null,
  status: 'ACTIVE',
  createdAt: '2026-09-10T15:00:00',
  updatedAt: '2026-09-10T15:00:00',
}

const fabric = {
  ...materialDefaults,
  id: 16,
  sku: 'FAB-INPUT-CHECK',
  name: '230g拉毛面料',
  unit: 'kg',
  materialType: 'FABRIC',
  attributes: { colors: ['黑色'], width: '180', grammage: '230G', price: 12 },
  minimumSpecifications: [{
    id: 101,
    code: 'FAB-BLACK',
    label: '黑色 · 180 · 230G',
    color: '黑色',
    width: '180',
    grammage: '230G',
    active: true,
    legacyDefault: false,
  }],
}

const accessory = {
  ...materialDefaults,
  id: 100,
  sku: 'ACC-INPUT-CHECK',
  name: '圆绳',
  unit: '米',
  materialType: 'ACCESSORY',
  attributes: { colors: ['黑色'], specifications: ['1米'], price: 0.8 },
  minimumSpecifications: [{
    id: 201,
    code: 'ACC-BLACK-1M',
    label: '黑色 · 1米',
    color: '黑色',
    specification: '1米',
    active: true,
    legacyDefault: false,
  }],
}

const result = {
  ok: false,
  baseUrl,
  checks: [],
  screenshots: [],
  updatePayloads: [],
  consoleErrors: [],
  failedRequests: [],
  failedApiResponses: [],
}

const check = (name, condition, detail) => {
  result.checks.push({ name, ok: Boolean(condition), detail })
  if (!condition) throw new Error(`${name}${detail ? `: ${detail}` : ''}`)
}

const json = (body) => ({
  status: 200,
  contentType: 'application/json',
  body: JSON.stringify(body),
})

const responseAfterUpdate = (material, payload) => ({
  ...material,
  name: payload.name,
  unit: payload.unit,
  attributes: payload.attributes,
  minimumSpecifications: (payload.minimumSpecifications ?? []).map((item, index) => ({
    ...item,
    id: item.id ?? material.id * 100 + index,
  })),
})

async function preparePage(browser, viewport) {
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
        stats: { users: { value: 1, limit: 20 }, storage: { value: 1, limit: 20 } },
        modules: [],
        tenants: [{ id: '1', name: '本地验收企业', current: true }],
        billing: { status: 'ACTIVE', upgradeRequired: false },
      }))
    }
    if (url.pathname === '/api/v1/materials' && request.method() === 'GET') {
      const list = url.searchParams.get('materialType') === 'ACCESSORY' ? [accessory] : [fabric]
      return route.fulfill(json({ items: list, total: 1, page: 0, size: 10 }))
    }
    const updateMatch = url.pathname.match(/^\/api\/v1\/materials\/(16|100)\/update$/)
    if (updateMatch && request.method() === 'POST') {
      const payload = request.postDataJSON()
      result.updatePayloads.push(payload)
      const material = updateMatch[1] === '16' ? fabric : accessory
      return route.fulfill(json(responseAfterUpdate(material, payload)))
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
  return page
}

const isFocused = (locator) => locator.evaluate((element) => document.activeElement === element)

async function enterSequentially(page, locator, value, delay = 30) {
  await locator.click()
  await page.waitForTimeout(50)
  await locator.pressSequentially(value, { delay })
}

async function openMaterial(page, name) {
  await page.getByText(name, { exact: true }).waitFor()
  await page.getByRole('button', { name: /编辑/ }).click()
  await page.getByText('颜色与规格组合', { exact: true }).waitFor()
}

fs.mkdirSync(outputDir, { recursive: true })
for (const name of ['01-fabric-desktop.png', '02-accessory-mobile.png', '99-failure.png', 'result.json']) {
  fs.rmSync(path.join(outputDir, name), { force: true })
}

const browser = await chromium.launch({ headless: true })
let activePage
try {
  const desktop = await preparePage(browser, { width: 1440, height: 1000 })
  activePage = desktop
  await desktop.goto(`${baseUrl}/basic/material`, { waitUntil: 'networkidle' })
  await openMaterial(desktop, '230g拉毛面料')
  await desktop.getByRole('button', { name: '添加组合' }).click()
  const desktopRows = desktop.locator('.material-specification-editor tbody tr.ant-table-row')
  let draftRow = desktopRows.last()
  let colorInput = draftRow.locator('input[placeholder="如 黑色"]')
  await enterSequentially(desktop, colorInput, '海军蓝')
  check('桌面端新增面料颜色可连续输入', await colorInput.inputValue() === '海军蓝', await colorInput.inputValue())
  check('桌面端输入颜色后焦点保持', await isFocused(colorInput))

  const widthInput = draftRow.locator('input[placeholder="如 150cm"]')
  await enterSequentially(desktop, widthInput, '180cm')
  check('桌面端新增面料幅宽可连续输入', await widthInput.inputValue() === '180cm', await widthInput.inputValue())
  check('桌面端输入幅宽后焦点保持', await isFocused(widthInput))

  const grammageInput = draftRow.locator('input[placeholder="如 180g/m²"]')
  await enterSequentially(desktop, grammageInput, '260g/m²')
  check('桌面端新增面料克重可连续输入', await grammageInput.inputValue() === '260g/m²', await grammageInput.inputValue())
  check('桌面端输入克重后焦点保持', await isFocused(grammageInput))

  await draftRow.getByRole('button', { name: '复制规格' }).click()
  draftRow = desktopRows.last()
  colorInput = draftRow.locator('input[placeholder="如 黑色"]')
  await colorInput.fill('')
  await enterSequentially(desktop, colorInput, '深蓝色')
  check('桌面端复制出的草稿行可连续修改颜色', await colorInput.inputValue() === '深蓝色', await colorInput.inputValue())
  check('桌面端复制行修改颜色后焦点保持', await isFocused(colorInput))
  await draftRow.scrollIntoViewIfNeeded()
  await desktop.screenshot({ path: path.join(outputDir, '01-fabric-desktop.png'), fullPage: false })
  result.screenshots.push('01-fabric-desktop.png')

  await desktop.locator('.material-form-modal .ant-modal-footer .ant-btn-primary').click()
  await desktop.getByText('已更新「230g拉毛面料」', { exact: true }).waitFor()
  const fabricPayload = result.updatePayloads[0]
  check('面料保存包含新增和复制规格', fabricPayload.minimumSpecifications.some((item) => item.color === '海军蓝') && fabricPayload.minimumSpecifications.some((item) => item.color === '深蓝色'))
  check('稳定行标识不会进入保存请求', !JSON.stringify(fabricPayload).includes('rowKey'))

  const mobile = await preparePage(browser, { width: 390, height: 844 })
  activePage = mobile
  await mobile.goto(`${baseUrl}/basic/material`, { waitUntil: 'networkidle' })
  await mobile.getByRole('tab', { name: '辅料/包材' }).click()
  await openMaterial(mobile, '圆绳')
  await mobile.getByRole('button', { name: '添加组合' }).click()
  const mobileCard = mobile.locator('.material-specification-card').last()
  const mobileColorInput = mobileCard.locator('input[placeholder="如 黑色"]')
  await enterSequentially(mobile, mobileColorInput, '藏青')
  check('移动端新增辅料颜色可连续输入', await mobileColorInput.inputValue() === '藏青', await mobileColorInput.inputValue())
  check('移动端输入颜色后焦点保持', await isFocused(mobileColorInput))

  const specificationInput = mobileCard.locator('input[placeholder="如 20mm"]')
  await enterSequentially(mobile, specificationInput, '1.4厘米')
  check('移动端新增辅料规格可连续输入', await specificationInput.inputValue() === '1.4厘米', await specificationInput.inputValue())
  check('移动端输入规格后焦点保持', await isFocused(specificationInput))
  await mobileCard.scrollIntoViewIfNeeded()
  await mobile.screenshot({ path: path.join(outputDir, '02-accessory-mobile.png'), fullPage: false })
  result.screenshots.push('02-accessory-mobile.png')

  await mobile.locator('.material-form-modal .ant-modal-footer .ant-btn-primary').click()
  await mobile.getByText('已更新「圆绳」', { exact: true }).waitFor()
  const accessoryPayload = result.updatePayloads[1]
  check('辅料保存包含完整新增规格', accessoryPayload.minimumSpecifications.some((item) => item.color === '藏青' && item.specification === '1.4厘米'))
  check('移动端保存请求不包含稳定行标识', !JSON.stringify(accessoryPayload).includes('rowKey'))

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

console.log(`Material specification input focus UI checks passed: ${result.checks.length}`)
