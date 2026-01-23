#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline/promises';
import { chromium } from 'playwright';

const baseUrl = process.env.ESUPPLY_BASE_URL || 'http://localhost:5173';
const storageStatePath = process.env.ESUPPLY_STORAGE_STATE || 'logs/route-sweep-auth.json';
const executablePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptDir, '..');
const absStatePath = path.isAbsolute(storageStatePath)
  ? storageStatePath
  : path.resolve(appRoot, storageStatePath);

if (!fs.existsSync(executablePath)) {
  throw new Error(`Chrome not found at ${executablePath}. Install Chrome or set a different path.`);
}

const browser = await chromium.launch({ headless: false, executablePath });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();

console.log(`Opening ${baseUrl}. Please complete login if prompted...`);
await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });

const rl = createInterface({ input: process.stdin, output: process.stdout });
await rl.question('请在浏览器中完成登录后按回车继续...');
rl.close();

await context.storageState({ path: absStatePath });
const state = JSON.parse(fs.readFileSync(absStatePath, 'utf-8'));
if (!state.cookies?.length && !state.origins?.length) {
  console.warn('Warning: storage state is empty. Please verify you logged in successfully.');
}
console.log(`Saved storage state to ${absStatePath}`);

await browser.close();
