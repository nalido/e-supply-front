#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import readline from 'node:readline/promises';
import { chromium } from 'playwright';

const DEFAULT_BASE_URL = 'http://localhost:5173';
const DEFAULT_TIMEOUT = 20000;
const DEFAULT_SKIP = new Set(['/sample/detail', '/foundation/product/detail']);

const args = new Map();
for (const arg of process.argv.slice(2)) {
  const [key, value] = arg.startsWith('--') ? arg.slice(2).split('=') : [arg, ''];
  if (key) {
    args.set(key, value ?? '');
  }
}

const baseUrl = args.get('base-url') || DEFAULT_BASE_URL;
const headless = args.get('headless') === 'true';
const includeUnstable = args.get('include-unstable') === 'true';
const storageStatePath = args.get('storage-state') || '';
const saveStoragePath = args.get('save-storage') || '';
const manualLogin = args.get('manual') === 'true';
const onlyRoutes = (args.get('only') || '')
  .split(',')
  .map((route) => route.trim())
  .filter(Boolean)
  .map((route) => (route.startsWith('/') ? route : `/${route}`));
const timeoutMs = Number(args.get('timeout') || DEFAULT_TIMEOUT);

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptDir, '..');
const routerPath = path.join(appRoot, 'src', 'router.tsx');

const readText = (filePath) => fs.readFileSync(filePath, 'utf8');

const extractPaths = (source, regex) =>
  Array.from(source.matchAll(regex)).map((match) => match[1]).filter(Boolean);

const normalizePath = (route) => (route.startsWith('/') ? route : `/${route}`);

const buildRoutes = () => {
  const routerText = readText(routerPath);
  const routeMatches = extractPaths(routerText, /path:\s*['"]([^'"]+)['"]/g);
  const merged = new Set(routeMatches.map(normalizePath));
  return Array.from(merged)
    .filter((route) => route !== '/')
    .filter((route) => includeUnstable || !DEFAULT_SKIP.has(route))
    .sort((a, b) => a.localeCompare(b));
};

const routes = buildRoutes().filter((route) => (onlyRoutes.length ? onlyRoutes.includes(route) : true));

const logDir = path.join(appRoot, 'logs');
fs.mkdirSync(logDir, { recursive: true });
const timestamp = new Date().toISOString().replace(/[:.]/g, '').replace('T', '_').slice(0, 15);
const reportPath = path.join(logDir, `route-sweep-${timestamp}.json`);
const loginShotPath = path.join(logDir, `route-sweep-login-${timestamp}.png`);
const loginHtmlPath = path.join(logDir, `route-sweep-login-${timestamp}.html`);

const executablePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
if (!fs.existsSync(executablePath)) {
  throw new Error(`Chrome not found at ${executablePath}. Install Chrome or pass a different path.`);
}

const browser = await chromium.launch({ headless, executablePath });
const context = await browser.newContext(
  storageStatePath ? { storageState: storageStatePath } : undefined,
);

const adminEmail = process.env.ESUPPLY_ADMIN_EMAIL || '';
const adminPassword = process.env.ESUPPLY_ADMIN_PASSWORD || '';
let savedLoginSnapshot = false;

const trySaveLoginSnapshot = async (page) => {
  if (savedLoginSnapshot) {
    return;
  }
  try {
    const html = await page.content();
    fs.writeFileSync(loginHtmlPath, html);
    await page.screenshot({ path: loginShotPath, fullPage: true });
    savedLoginSnapshot = true;
  } catch {
    // ignore snapshot errors
  }
};

const tryClerkLogin = async (page) => {
  if (!adminEmail || !adminPassword) {
    return;
  }
  const emailInput = page.locator(
    'input[type="email"], input[name="identifier"], input[name="emailAddress"]',
  );
  const passwordInput = page.locator('input[type="password"]');
  const continueButton = page.getByRole('button', { name: /continue/i });
  const submitButton = page.locator(
    'button[type="submit"], button[data-localization-key="formButtonPrimary"], button.cl-formButtonPrimary',
  );
  if ((await emailInput.count()) > 0) {
    await emailInput.first().fill(adminEmail);
  }
  if ((await passwordInput.count()) > 0) {
    await passwordInput.first().fill(adminPassword);
  }
  if ((await continueButton.count()) > 0) {
    await continueButton.first().scrollIntoViewIfNeeded();
    await continueButton.first().click({ force: true });
    return;
  }
  if ((await submitButton.count()) > 0) {
    await submitButton.first().scrollIntoViewIfNeeded();
    await submitButton.first().click({ force: true });
  }
};

const loginPage = await context.newPage();
await loginPage.goto(`${baseUrl}/dashboard/workplace`, { waitUntil: 'domcontentloaded' });
if (!storageStatePath) {
  console.log('Waiting for login... please complete Clerk sign-in in the opened browser.');
  if (manualLogin) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    await rl.question('完成登录后回到终端按 Enter 继续...');
    rl.close();
  }
  const deadline = Date.now() + 180000;
  while (Date.now() < deadline) {
    const pages = context.pages().filter((page) => !page.isClosed());
    for (const page of pages) {
      const url = page.url();
      if (url.startsWith(baseUrl)) {
        try {
          await page.getByText('易供云').first().waitFor({ timeout: 1000 });
          if (saveStoragePath) {
            await context.storageState({ path: saveStoragePath });
            console.log(`Saved storage state to ${saveStoragePath}`);
          }
          await loginPage.close();
          break;
        } catch {
          // keep waiting
        }
      } else if (url.includes('accounts.dev')) {
        try {
          await trySaveLoginSnapshot(page);
          await tryClerkLogin(page);
        } catch {
          // ignore and keep waiting
        }
      }
    }
    if (saveStoragePath && fs.existsSync(saveStoragePath)) {
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  if (saveStoragePath && !fs.existsSync(saveStoragePath)) {
    throw new Error('Login timeout: storage state not saved.');
  }
} else if (saveStoragePath) {
  await context.storageState({ path: saveStoragePath });
  console.log(`Saved storage state to ${saveStoragePath}`);
}

if (!loginPage.isClosed()) {
  await loginPage.close();
}

const results = [];

for (const route of routes) {
  const page = await context.newPage();
  const routeErrors = [];
  let lastUrl = '';

  page.on('pageerror', (error) => {
    routeErrors.push({ type: 'pageerror', message: error.message });
  });

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      routeErrors.push({ type: 'console', message: msg.text() });
    }
  });

  page.on('response', (response) => {
    const url = response.url();
    if (url.includes('/api/') && response.status() >= 400) {
      routeErrors.push({
        type: 'response',
        status: response.status(),
        url,
      });
    }
  });

  try {
    const response = await page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
    lastUrl = page.url();
    if (response && response.status() >= 400) {
      routeErrors.push({ type: 'navigation', status: response.status(), message: `HTTP ${response.status()}` });
    }
    await page.waitForTimeout(1000);
  } catch (error) {
    lastUrl = page.url();
    routeErrors.push({ type: 'navigation', message: error.message, url: lastUrl });
  }

  results.push({ route, errors: routeErrors, finalUrl: lastUrl });
  await page.close();
}

const report = {
  baseUrl,
  routes,
  results,
  summary: {
    total: results.length,
    failed: results.filter((item) => item.errors.length > 0).length,
  },
};

fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(`Route sweep complete. Report saved to ${reportPath}`);

await context.close();
await browser.close();
