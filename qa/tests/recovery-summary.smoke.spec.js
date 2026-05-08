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

test.describe('recovery summary browser proof', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSmokeAdmin(page);
  });

  test('recovery summary filters to seeded salesman and shows real customer breakdown', async ({ page }) => {
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

    await page.goto('/recovery-summary');
    await expect(page).not.toHaveURL(/\/login/);

    const salesmanSelect = page.locator('mat-select').first();
    await salesmanSelect.click();
    await page.getByRole('option', { name: 'Smoke Recovery Salesman' }).click();
    await page.getByRole('button', { name: /generate report/i }).click();

    const summaryRow = page.getByRole('row').filter({ hasText: 'Smoke Recovery Salesman' }).first();
    await expect(summaryRow).toBeVisible({ timeout: 20_000 });
    await expect(summaryRow).toContainText('1');
    await expect(summaryRow).toContainText(/25\.0+%/);

    await expect(page.locator('.detail-card')).toBeVisible();
    await expect(page.locator('.detail-card')).toContainText('Smoke Recovery Salesman Customer Breakdown');

    const detailRow = page.getByRole('row').filter({ hasText: 'Smoke Recovery Customer' }).first();
    await expect(detailRow).toBeVisible();
    await expect(detailRow).toContainText(/25\.0+%/);
    await expect(detailRow).toContainText('150');

    await expect(page.locator('body')).not.toContainText(/coming soon|mock response|fake success/i);
    expect(pageErrors).toEqual([]);
    expect(consoleErrors.filter((text) => text.includes('ERROR TypeError') || text.includes('NG0'))).toEqual([]);
  });
});
