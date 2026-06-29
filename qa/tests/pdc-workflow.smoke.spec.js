const { test, expect } = require('@playwright/test');
const { loginAsSmokeAdmin } = require('./support/auth');

test.describe('pdc browser proof', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSmokeAdmin(page);
  });

  test('pdc screen can clear a seeded pending cheque', async ({ page }) => {
    const consoleErrors = [];
    const pageErrors = [];

    page.on('console', (message) => {
      if (message.type() === 'error') {
        consoleErrors.push(message.text());
      }
    });

    page.on('pageerror', (error) => {
      pageErrors.push(error.message);
    });

    await page.goto('/pdc');
    await expect(page).not.toHaveURL(/\/login/);

    const pdcRow = page.getByRole('row').filter({ hasText: /SMOKE-PDC-001/ }).first();
    await expect(pdcRow).toBeVisible({ timeout: 20_000 });
    await expect(pdcRow).toContainText(/Smoke Customer/i);
    await expect(pdcRow).toContainText(/SMOKE-CHQ-001/i);
    await expect(pdcRow).toContainText(/Pending/i);

    await pdcRow.getByRole('button').first().click();
    await expect(page.locator('.mat-mdc-snack-bar-container')).toContainText(/cleared successfully/i, { timeout: 20_000 });
    await expect(page.getByRole('row').filter({ hasText: /SMOKE-PDC-001/ })).toHaveCount(0, { timeout: 20_000 });
    await expect(page.locator('body')).not.toContainText(/coming soon|mock response|fake success/i);
    expect(pageErrors).toEqual([]);
    expect(consoleErrors.filter((text) => text.includes('ERROR TypeError') || text.includes('NG0'))).toEqual([]);
  });
});
