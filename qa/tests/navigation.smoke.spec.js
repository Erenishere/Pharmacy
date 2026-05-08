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

const visibleRoutes = [
  ['Dashboard', '/dashboard'],
  ['Cashbook', '/cashbook'],
  ['PDC', '/pdc'],
  ['Sales invoices', '/sales-invoices'],
  ['Purchase invoices', '/purchase-invoices'],
  ['Purchase orders', '/purchase-orders'],
  ['Accounts', '/accounts'],
  ['Account registration', '/accounts/registration'],
  ['Item registration', '/item-registration'],
  ['Items', '/items'],
  ['Warehouses', '/warehouses'],
  ['Inventory stock levels', '/inventory/stock-levels'],
  ['Recovery summary', '/recovery-summary'],
  ['Salary packages', '/salary-packages'],
  ['Salary calculation', '/salary/calculate'],
  ['Targets dashboard', '/targets/dashboard'],
  ['Bilty receipts', '/bilty-receipts'],
  ['Capital', '/capital'],
  ['Letters', '/letters'],
  ['Expenses', '/expenses'],
  ['Tax config', '/tax-config'],
  ['Schemes', '/schemes'],
  ['Route plans', '/route-plans']
];

test.describe('admin visible routes open without redirecting to login or dead pages', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSmokeAdmin(page);
  });

  for (const [name, route] of visibleRoutes) {
    test(name, async ({ page }) => {
      await page.goto(route);
      await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

      await expect(page).not.toHaveURL(/\/login/);
      await expect(page.locator('body')).not.toContainText(/Cannot GET|404 Not Found|coming soon|mock response|fake success/i);
    });
  }
});
