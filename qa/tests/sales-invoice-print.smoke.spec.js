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

test.describe('sales invoice print smoke workflow', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSmokeAdmin(page);
  });

  test('sales invoices can preview and print the seeded admin invoice', async ({ page }) => {
    await page.context().addInitScript(() => {
      window.print = () => {
        window.__smokePrintCalled = true;
      };
      window.close = () => {
        window.__smokeCloseCalled = true;
      };
    });

    await page.goto('/sales-invoices');
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

    const searchInput = page.getByLabel(/search invoices/i);
    await searchInput.fill('SMOKE-SI-001');

    const row = page.getByRole('row').filter({ hasText: 'SMOKE-SI-001' }).first();
    await expect(page).not.toHaveURL(/\/login/);
    await expect(row).toBeVisible({ timeout: 20_000 });
    await expect(row).toContainText('Smoke Customer');
    await expect(row).toContainText(/confirmed/i);

    await row.getByRole('button').click();
    await page.getByRole('menuitem', { name: /preview invoice/i }).click();

    const previewDialog = page.locator('mat-dialog-container');
    await expect(previewDialog).toContainText('Invoice Preview');
    await expect(previewDialog).toContainText('#SMOKE-SI-001');
    await expect(previewDialog).toContainText('Smoke Customer');
    await expect(previewDialog).toContainText('Smoke Test Item');
    await expect(previewDialog).toContainText('Grand Total');

    const popupPromise = page.waitForEvent('popup');
    await previewDialog.getByRole('button', { name: /print invoice/i }).click();
    const popup = await popupPromise;

    await popup.waitForLoadState('domcontentloaded');
    await expect(popup.locator('body')).toContainText('SMOKE-SI-001');
    await expect(popup.locator('body')).toContainText('Smoke Customer');
    await expect(popup.locator('body')).toContainText('Smoke Test Item');
    await expect(popup.locator('body')).toContainText('Grand Total');
    await expect.poll(async () => popup.evaluate(() => window.__smokePrintCalled === true)).toBe(true);

    await popup.close();
  });
});
