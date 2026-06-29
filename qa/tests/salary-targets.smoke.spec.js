const { test, expect } = require('@playwright/test');
const { loginAsSmokeAdmin } = require('./support/auth');

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
