import { test, expect } from '@playwright/test';

test('welcome login flow', async ({ page }) => {
  await page.goto('http://115.29.200.124/welcome');
  await page.screenshot({ path: '/tmp/login-01-welcome.png', fullPage: true });

  await page.getByRole('button', { name: '登录系统' }).click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: '/tmp/login-02-after-click.png', fullPage: true });

  const userInput = page.locator('input[name="identifier"], input[type="email"], input[name="username"]').first();
  await userInput.waitFor({ timeout: 30000 });
  await userInput.fill('jambin');
  await page.getByRole('button', { name: /继续|Continue|Sign in|下一步/i }).first().click();

  const pwdInput = page.locator('input[type="password"]').first();
  await pwdInput.waitFor({ timeout: 30000 });
  await pwdInput.fill('Jambin288416');
  await page.getByRole('button', { name: /继续|Continue|Sign in|登录/i }).first().click();

  await page.waitForTimeout(5000);
  await page.screenshot({ path: '/tmp/login-03-after-submit.png', fullPage: true });
  await expect(page).toHaveURL(/dashboard|workplace/);
});
