const { test, expect } = require('@playwright/test');

test('login shows an error for bad credentials', async ({ page }) => {
  await page.goto('/login');
  await page.locator('#identifier').fill('missing.user');
  await page.locator('#password').fill('wrong-password');
  await page.getByRole('button', { name: /sign in/i }).click();

  await expect(page.locator('.alert.alert-danger')).toBeVisible();
});

test('smoke admin can login and reach dashboard', async ({ page }) => {
  await page.goto('/login');
  await page.locator('#identifier').fill(process.env.SMOKE_ADMIN_USERNAME || 'smoke.admin');
  await page.locator('#password').fill(process.env.SMOKE_ADMIN_PASSWORD || 'SmokePass123');
  await page.getByRole('button', { name: /sign in/i }).click();

  await page.waitForURL(/\/dashboard/, { timeout: 30_000 });
  await expect(page).not.toHaveURL(/\/login/);
  await expect
    .poll(() => page.evaluate(() => Boolean(localStorage.getItem('auth_token'))))
    .toBe(true);
});
