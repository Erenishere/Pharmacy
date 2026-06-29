const { test, expect } = require('@playwright/test');
const { loginAsSmokeAdmin } = require('./support/auth');
const fs = require('fs');

async function selectMatOption(page, selector, optionPattern) {
  await page.locator(selector).click();
  await page.getByRole('option', { name: optionPattern }).click();
}

async function selectFirstMatOption(page, selector) {
  await page.locator(selector).click();
  await page.getByRole('option').first().click();
}

async function trySelectMatOption(page, selector, optionPattern) {
  const field = page.locator(selector);
  await field.click();
  const option = page.getByRole('option', { name: optionPattern });
  const optionCount = await option.count().catch(() => 0);
  if (optionCount > 0) {
    await option.first().click();
    return true;
  }

  await page.keyboard.press('Escape').catch(() => {});
  return false;
}

test.describe('item management create and export workflow', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSmokeAdmin(page);
  });

  test('item management creates a new item through the dialog and exports the list', async ({ page }) => {
    const uniqueSuffix = Date.now().toString().slice(-6);
    const itemCode = `SMKUI${uniqueSuffix}`;
    const itemName = `Smoke UI Item ${uniqueSuffix}`;

    await page.goto('/items');
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

    await expect(page.locator('body')).toContainText('Item Management');
    await page.getByRole('button', { name: /new item/i }).click();

    const dialog = page.locator('mat-dialog-container');
    await expect(dialog).toContainText('New Item Registration');
    await expect(dialog).toContainText('Classification');
    await expect(dialog).toContainText('Pricing');
    await expect(dialog).toContainText('Catalog Profile');
    await expect(dialog).toContainText('Tax & Charges');
    await expect(dialog).toContainText('Packaging');
    await expect(dialog).toContainText('Inventory Controls');

    await selectFirstMatOption(page, 'mat-select[formcontrolname="companyId"]');
    await selectFirstMatOption(page, 'mat-select[formcontrolname="categoryId"]');
    await selectFirstMatOption(page, 'mat-select[formcontrolname="businessTypeId"]');
    await selectMatOption(page, 'mat-select[formcontrolname="sellingGroup"]', /^A$/i);
    await trySelectMatOption(page, 'mat-select[formcontrolname="formulaId"]', /Smoke Formula/i);
    await trySelectMatOption(page, 'mat-select[formcontrolname="subCategoryId"]', /Smoke Sub Category/i);
    await trySelectMatOption(page, 'mat-select[formcontrolname="formulaSizeId"]', /250mg/i);

    await dialog.locator('input[formcontrolname="unitPurchaseTP"]').fill('125');
    await dialog.locator('input[formcontrolname="unitSaleTP"]').fill('145');
    await dialog.locator('input[formcontrolname="unitRetailPrice"]').fill('160');
    await dialog.locator('input[formcontrolname="boxPurchaseTP"]').fill('1200');
    await dialog.locator('input[formcontrolname="boxSaleTP"]').fill('1350');
    await dialog.locator('input[formcontrolname="boxRetailPrice"]').fill('1500');
    await dialog.locator('input[formcontrolname="cartonPurchaseTP"]').fill('4800');
    await dialog.locator('input[formcontrolname="cartonSaleTP"]').fill('5200');

    await dialog.locator('input[formcontrolname="code"]').fill(itemCode);
    await dialog.locator('input[formcontrolname="name"]').fill(itemName);
    await selectMatOption(page, 'mat-select[formcontrolname="unit"]', /Piece/i);

    await selectMatOption(page, 'mat-select[formcontrolname="gstFiler"]', /^18%$/i);
    await selectMatOption(page, 'mat-select[formcontrolname="gstNonFiler"]', /^4%$/i);
    await dialog.locator('input[formcontrolname="goodsChargesPerUnit"]').fill('3');

    await dialog.locator('input[formcontrolname="unitsInCarton"]').fill('48');
    await dialog.locator('input[formcontrolname="unitsInBox"]').fill('12');
    await dialog.locator('input[formcontrolname="boxesInCarton"]').fill('4');
    await dialog.locator('input[formcontrolname="cartonLength"]').fill('22');
    await dialog.locator('input[formcontrolname="cartonWidth"]').fill('18');
    await dialog.locator('input[formcontrolname="cartonHeight"]').fill('16');
    await dialog.locator('input[formcontrolname="unitWeight"]').fill('0.15');
    await dialog.locator('input[formcontrolname="boxWeight"]').fill('1.8');
    await dialog.locator('input[formcontrolname="cartonWeight"]').fill('7.2');

    await dialog.locator('input[formcontrolname="minimumStock"]').fill('15');
    await dialog.locator('input[formcontrolname="maximumStock"]').fill('300');
    await dialog.locator('input[formcontrolname="noSalesAlertDays"]').fill('45');
    await dialog.getByRole('button', { name: /generate/i }).click();
    await expect(dialog.locator('.barcode-display')).not.toHaveText('');

    await dialog.getByRole('button', { name: /^save$/i }).click();
    await expect(dialog).toBeHidden({ timeout: 20_000 });

    const searchInput = page.getByPlaceholder(/search by name, code, barcode/i);
    await searchInput.fill(itemCode);

    const row = page.getByRole('row').filter({ hasText: itemCode }).first();
    await expect(row).toBeVisible({ timeout: 20_000 });
    await expect(row).toContainText(itemName);

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /export/i }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/^items_\d{4}-\d{2}-\d{2}\.xlsx$/);
    const filePath = await download.path();
    expect(fs.statSync(filePath).size).toBeGreaterThan(0);
  });
});
