const { test, expect } = require('@playwright/test');

async function loginAsSmokeAdmin(page) {
  await page.goto('/login');

  for (let attempt = 0; attempt < 2; attempt++) {
    await page.locator('#identifier').fill(process.env.SMOKE_ADMIN_USERNAME || 'smoke.admin');
    await page.locator('#password').fill(process.env.SMOKE_ADMIN_PASSWORD || 'SmokePass123');
    await page.getByRole('button', { name: /sign in/i }).click();

    try {
      await page.waitForURL(/\/dashboard/, { timeout: 30_000 });
      return;
    } catch (error) {
      const loginFailed = await page.locator('text=Login failed').isVisible().catch(() => false);
      if (!loginFailed || attempt === 1) {
        throw error;
      }
    }
  }
}

test.describe('salary and targets smoke workflows', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSmokeAdmin(page);
  });

  test('salary packages show seeded visit snapshots and printable package details', async ({ page }) => {
    await page.goto('/salary-packages');
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

    const row = page.getByRole('row').filter({ hasText: 'Smoke Employee Account' }).first();

    await expect(page).not.toHaveURL(/\/login/);
    await expect(row).toBeVisible();
    await expect(row.locator('td').nth(5)).toContainText('1');

    const popupPromise = page.waitForEvent('popup');
    await row.locator('button').nth(1).click();
    const popup = await popupPromise;

    await expect(popup.locator('body')).toContainText('Salary Package Details');
    await expect(popup.locator('body')).toContainText('Smoke Employee Account');
    await popup.close();
  });

  test('targets dashboard shows seeded route plan, order, recovery, and visit metrics', async ({ page }) => {
    await page.goto('/targets/dashboard');
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

    const row = page.getByRole('row').filter({ hasText: 'Smoke Employee Account' }).first();

    await expect(page).not.toHaveURL(/\/login/);
    await expect(row).toBeVisible();
    await expect(row).toContainText('1 / 1');
    await expect(row).toContainText('1 Orders');
    await expect(row).toContainText('500');
  });

  test('salary calculation can calculate the seeded employee package for the current month', async ({ page }) => {
    await page.goto('/salary/calculate');
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

    const employeeSelect = page.locator('mat-select[formcontrolname="employeeId"]');
    await employeeSelect.focus();
    await employeeSelect.press('Enter');
    await page.getByRole('option', { name: /Smoke Employee Account \(SMOKEEMP\)/ }).click();
    await page.getByRole('button', { name: /calculate salary/i }).click();

    await expect(page.locator('.calculation-results')).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('.employee-name')).toContainText('Smoke Employee Account');
    await expect(page.locator('.calculation-results')).toContainText('Gross Salary');
    await expect(page.locator('.calculation-results')).toContainText('NET SALARY');
    await expect(page.locator('.calculation-results')).toContainText(/1 orders created/i);
    await expect(page.getByRole('button', { name: /print salary sheet/i })).toBeVisible();
  });
});
