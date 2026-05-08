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
