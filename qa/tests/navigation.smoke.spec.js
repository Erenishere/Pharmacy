const { test, expect } = require('@playwright/test');
const { loginAsSmokeAdmin } = require('./support/auth');

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
