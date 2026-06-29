const { test, expect } = require('@playwright/test');
const { loginAsSmokeAdmin } = require('./support/auth');

test.describe('purchase invoice print and export smoke workflow', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSmokeAdmin(page);
  });

  test('purchase invoices can print a seeded invoice and export its CSV', async ({ page }) => {
    await page.context().addInitScript(() => {
      window.print = () => {
        window.__smokePrintCalled = true;
      };
    });

    await page.goto('/purchase-invoices');
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

    const searchInput = page.getByPlaceholder(/search by invoice number or supplier/i);
    await searchInput.fill('SMOKE-PI-001');

    const row = page.getByRole('row').filter({ hasText: 'SMOKE-PI-001' }).first();
    await expect(page).not.toHaveURL(/\/login/);
    await expect(row).toBeVisible({ timeout: 20_000 });
    await expect(row).toContainText('Smoke Supplier');
    await expect(row).toContainText(/confirmed/i);

    await row.getByRole('button').click();
    const popupPromise = page.waitForEvent('popup');
    await page.getByRole('menuitem', { name: /^print$/i }).click();
    const popup = await popupPromise;

    await popup.waitForLoadState('domcontentloaded');
    await expect(popup.locator('body')).toContainText('PURCHASE INVOICE');
    await expect(popup.locator('body')).toContainText('SMOKE-PI-001');
    await expect(popup.locator('body')).toContainText('Smoke Supplier');
    await expect(popup.locator('body')).toContainText('SMOKE-BILL-001');
    await expect(popup.locator('body')).toContainText('Smoke Test Item');
    await expect(popup.locator('body')).toContainText('Grand Total');
    await expect.poll(async () => popup.evaluate(() => window.__smokePrintCalled === true)).toBe(true);
    await popup.close();

    await page.keyboard.press('Escape').catch(() => {});
    await expect(page.getByRole('menuitem', { name: /^print$/i })).toBeHidden({ timeout: 10_000 }).catch(() => {});

    await row.getByRole('button').click();
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('menuitem', { name: /^export$/i }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe('purchase-invoice-SMOKE-PI-001.csv');
    const filePath = await download.path();
    const csv = require('fs').readFileSync(filePath, 'utf8');
    expect(csv).toContain('Invoice Number');
    expect(csv).toContain('SMOKE-PI-001');
    expect(csv).toContain('Smoke Supplier');
  });
});
