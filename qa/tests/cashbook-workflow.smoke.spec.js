const { test, expect } = require('@playwright/test');
const { loginAsSmokeAdmin } = require('./support/auth');

test.describe('cashbook workflow browser proof', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSmokeAdmin(page);
  });

  test('cashbook can create and cancel a pending cheque receipt with invoice allocation', async ({ page }) => {
    const consoleErrors = [];
    const pageErrors = [];
    const uniqueReference = `PW-CB-${Date.now()}`;

    page.on('console', (message) => {
      if (message.type() === 'error') {
        consoleErrors.push(message.text());
      }
    });

    page.on('pageerror', (error) => {
      pageErrors.push(error.message);
    });

    await page.goto('/cashbook');
    await expect(page).not.toHaveURL(/\/login/);

    const accountSelect = page.locator('mat-select[formcontrolname="accountId"]');
    await accountSelect.click();
    await page.getByRole('option', { name: /Smoke Cashbook Customer/i }).click();

    const cashAccountSelect = page.locator('mat-select[formcontrolname="cashAccountId"]');
    await cashAccountSelect.focus();
    await cashAccountSelect.press('Enter');
    await page.getByRole('option', { name: /Smoke Cash Account/i }).click();

    const allocationInput = page.locator('.allocation-input').first();
    await expect(allocationInput).toBeVisible({ timeout: 20_000 });
    await allocationInput.fill('25');

    await page.locator('input[formcontrolname="detailReference"]').fill(uniqueReference);
    await page.locator('input[formcontrolname="bankName"]').fill('Smoke Browser Bank');
    await page.locator('input[formcontrolname="chequeNumber"]').fill(`CHQ-${Date.now()}`);
    await page.locator('input[formcontrolname="chequeDate"]').fill('12/31/2099');

    await page.getByRole('button', { name: /save entry/i }).click();
    await expect(page.locator('.mat-mdc-snack-bar-container')).toContainText(/saved successfully/i, { timeout: 20_000 });

    const createdRow = page.getByRole('row').filter({ hasText: uniqueReference }).first();
    await expect(createdRow).toBeVisible({ timeout: 20_000 });
    await expect(createdRow).toContainText(/pending/i);
    await expect(createdRow).toContainText(/Smoke Browser Bank/i);
    await expect(createdRow).toContainText(/25/);

    page.once('dialog', async (dialog) => {
      await dialog.accept();
    });
    await createdRow.locator('button').filter({ has: page.locator('mat-icon:has-text("delete")') }).click();

    await expect(createdRow).toContainText(/cancelled/i, { timeout: 20_000 });
    await expect(page.locator('body')).not.toContainText(/coming soon|mock response|fake success/i);
    expect(pageErrors).toEqual([]);
    expect(consoleErrors.filter((text) => text.includes('ERROR TypeError') || text.includes('NG0'))).toEqual([]);
  });
});
