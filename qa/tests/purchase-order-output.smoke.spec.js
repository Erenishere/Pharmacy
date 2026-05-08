const { test, expect } = require('@playwright/test');
const fs = require('fs');

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

test.describe('purchase order print and export smoke workflow', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSmokeAdmin(page);
  });

  test('purchase orders can print the seeded order detail and export filtered CSV', async ({ page }) => {
    await page.context().addInitScript(() => {
      window.print = () => {
        window.__smokePrintCalled = true;
      };
    });

    await page.goto('/purchase-orders');
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

    const searchInput = page.getByPlaceholder(/search by po number, supplier/i);
    await searchInput.fill('SMOKE-PO-001');

    const row = page.getByRole('row').filter({ hasText: 'SMOKE-PO-001' }).first();
    await expect(page).not.toHaveURL(/\/login/);
    await expect(row).toBeVisible({ timeout: 20_000 });
    await expect(row).toContainText('Smoke Supplier');
    await expect(row).toContainText(/confirmed/i);

    await row.getByRole('button').click();
    await page.getByRole('menuitem', { name: /^print$/i }).click();

    await page.waitForURL(/\/purchase-orders\/.+\?print=1/, { timeout: 20_000 });
    await expect(page.locator('body')).toContainText('Purchase Order SMOKE-PO-001');
    await expect(page.locator('body')).toContainText('Smoke Supplier');
    await expect(page.locator('body')).toContainText('SMOKE-PO-BILL-001');
    await expect(page.locator('body')).toContainText('Smoke Test Item');
    await expect(page.locator('body')).toContainText(/Total Amount/i);
    await expect.poll(async () => page.evaluate(() => window.__smokePrintCalled === true)).toBe(true);

    await page.goto('/purchase-orders');
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
    await searchInput.fill('SMOKE-PO-001');

    const downloadButton = page.locator('.filters-card button').filter({
      has: page.locator('mat-icon', { hasText: 'download' })
    }).first();
    await expect(downloadButton).toBeVisible();

    const downloadPromise = page.waitForEvent('download');
    await downloadButton.click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/^purchase-orders-\d{4}-\d{2}-\d{2}\.csv$/);
    const filePath = await download.path();
    const csv = fs.readFileSync(filePath, 'utf8');
    expect(csv).toContain('P/O No');
    expect(csv).toContain('SMOKE-PO-001');
    expect(csv).toContain('Smoke Supplier');
  });
});
