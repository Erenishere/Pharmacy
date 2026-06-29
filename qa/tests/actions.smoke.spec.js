const { test, expect } = require('@playwright/test');
const { loginAsSmokeAdmin } = require('./support/auth');

const workflowSurfaces = [
  {
    name: 'cashbook receive/payment surface',
    route: '/cashbook',
    expectedText: /receive|payment|cash account|invoice/i,
    expectedAction: /new|add|create|receive|payment|save|print/i
  },
  {
    name: 'PDC status surface',
    route: '/pdc',
    expectedText: /cheque|pending|clear|bounce|bank/i,
    expectedAction: /new|add|create|clear|bounce|print|export|refresh/i
  },
  {
    name: 'sales invoice print/list surface',
    route: '/sales-invoices',
    expectedText: /invoice|customer|total|status/i,
    expectedAction: /new|add|create|print|export|view|edit/i
  },
  {
    name: 'purchase invoice print/list surface',
    route: '/purchase-invoices',
    expectedText: /invoice|supplier|total|status/i,
    expectedAction: /new|add|create|print|export|view|edit/i
  },
  {
    name: 'purchase order print/export surface',
    route: '/purchase-orders',
    expectedText: /purchase order|supplier|status|total/i,
    expectedAction: /new|add|create|print|export|view|edit/i
  },
  {
    name: 'financial reports export surface',
    route: '/salesman/financial-reports',
    expectedText: /financial|report|sales|collection|recovery/i,
    expectedAction: /new|add|create|print|export|download|refresh|generate/i
  }
];

test.describe('critical money/report pages expose real workflow action surfaces', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSmokeAdmin(page);
  });

  for (const surface of workflowSurfaces) {
    test(surface.name, async ({ page }) => {
      await page.goto(surface.route);
      await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

      await expect(page).not.toHaveURL(/\/login/);
      await expect(page.locator('body')).toContainText(surface.expectedText);
      await expect(page.getByRole('button', { name: surface.expectedAction }).first()).toBeVisible();
      await expect(page.locator('body')).not.toContainText(/coming soon|mock response|fake success/i);
    });
  }
});
