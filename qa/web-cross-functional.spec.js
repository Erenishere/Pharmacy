const fs = require('fs');
const path = require('path');
const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.QA_BASE_URL || 'http://127.0.0.1:4200';
const REPORT_DIR = path.resolve(__dirname, 'artifacts');
const REPORT_JSON = path.join(REPORT_DIR, 'web-cross-functional-results.json');

const ADMIN = {
  identifier: process.env.QA_ADMIN_USER || 'admin_new',
  password: process.env.QA_ADMIN_PASSWORD || 'Admin@123',
};

const routes = [
  { path: '/dashboard', area: 'Dashboard', mustHave: ['Executive Overview'] },
  { path: '/items', area: 'Inventory', mustHave: ['Items'] },
  { path: '/batches', area: 'Inventory', mustHave: ['Batch'] },
  { path: '/inventory/stock-levels', area: 'Inventory', mustHave: ['Stock'] },
  { path: '/inventory/reports', area: 'Inventory', mustHave: ['Inventory'] },
  { path: '/warehouses', area: 'Warehouse', mustHave: ['Warehouse'] },
  { path: '/customers', area: 'Master/Sales', mustHave: ['Customer'] },
  { path: '/suppliers', area: 'Purchase', mustHave: ['Supplier'] },
  { path: '/purchase-orders', area: 'Purchase', mustHave: ['Purchase'] },
  { path: '/purchase-invoices', area: 'Purchase', mustHave: ['Purchase'] },
  { path: '/sales-invoices', area: 'Sales', mustHave: ['Sales'] },
  { path: '/sales-returns', area: 'Sales', mustHave: ['Return'] },
  { path: '/e-orders', area: 'Sales', mustHave: ['Order'] },
  { path: '/quotations', area: 'Sales', mustHave: ['Quotation'] },
  { path: '/accounts', area: 'Accounts', mustHave: ['Account'] },
  { path: '/cashbook', area: 'Accounts', mustHave: ['Cash'] },
  { path: '/expenses', area: 'Expenses', mustHave: ['Expense'] },
  { path: '/investors', area: 'Expenses', mustHave: ['Investor'] },
  { path: '/investors/profit-share', area: 'Expenses', mustHave: ['Profit'] },
  { path: '/tax-config', area: 'Expenses', mustHave: ['Tax'] },
  { path: '/salary-packages', area: 'Payroll', mustHave: ['Salary'] },
  { path: '/salary/calculate', area: 'Payroll', mustHave: ['Salary'] },
  { path: '/master-data', area: 'Master Data', mustHave: ['Master'] },
  { path: '/users', area: 'Users', mustHave: ['User'] },
  { path: '/bilty', area: 'Bilty', mustHave: ['Bilty'] },
  { path: '/recovery-summary', area: 'Accounts', mustHave: ['Recovery'] },
  { path: '/route-plans', area: 'Operations', mustHave: ['Route'] },
  { path: '/letters', area: 'Accounts', mustHave: ['Letter'] },
];

function ensureDir() {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
}

async function visibleCanvasCount(page) {
  return page.locator('canvas').evaluateAll((canvases) => canvases.filter((canvas) => {
    const box = canvas.getBoundingClientRect();
    return box.width > 40 && box.height > 40;
  }).length);
}

async function nonBlankCanvasCount(page) {
  return page.locator('canvas').evaluateAll((canvases) => canvases.filter((canvas) => {
    const box = canvas.getBoundingClientRect();
    if (box.width <= 40 || box.height <= 40) {
      return false;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return false;
    }

    const width = Math.min(canvas.width, 240);
    const height = Math.min(canvas.height, 160);
    const data = ctx.getImageData(0, 0, width, height).data;

    for (let index = 3; index < data.length; index += 4) {
      if (data[index] !== 0) {
        return true;
      }
    }

    return false;
  }).length);
}

test.describe('Manual web and cross-functional sweep', () => {
  test('admin end-to-end page sweep', async ({ page }, testInfo) => {
    test.setTimeout(180000);
    ensureDir();

    const result = {
      startedAt: new Date().toISOString(),
      baseUrl: BASE_URL,
      browser: testInfo.project.name,
      auth: null,
      dashboard: null,
      navigation: null,
      mobile: null,
      routes: [],
      consoleErrors: [],
      pageErrors: [],
      failedRequests: [],
    };

    const routeConsoleErrors = [];
    const routeFailedRequests = [];

    page.on('console', (message) => {
      if (message.type() === 'error') {
        const entry = {
          url: page.url(),
          text: message.text(),
        };
        result.consoleErrors.push(entry);
        routeConsoleErrors.push(entry);
      }
    });

    page.on('pageerror', (error) => {
      result.pageErrors.push({
        url: page.url(),
        message: error.message,
        stack: error.stack,
      });
    });

    page.on('response', (response) => {
      const url = response.url();
      const status = response.status();
      const isApi = url.includes('/api/');
      if (isApi && status >= 400) {
        const entry = {
          url,
          status,
          route: page.url(),
        };
        result.failedRequests.push(entry);
        routeFailedRequests.push(entry);
      }
    });

    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#identifier')).toBeVisible({ timeout: 15000 });
    await page.locator('#identifier').fill(ADMIN.identifier);
    await page.locator('#password').fill(ADMIN.password);
    await Promise.all([
      page.waitForURL(/dashboard|salesman\/pos/, { timeout: 30000 }).catch(() => null),
      page.locator('button.btn-primary').click(),
    ]);

    result.auth = {
      finalUrl: page.url(),
      passed: page.url().includes('/dashboard'),
    };

    if (!result.auth.passed) {
      await page.screenshot({ path: path.join(REPORT_DIR, 'auth-failure.png'), fullPage: true });
    }

    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    const dashboardCanvasCount = await visibleCanvasCount(page);
    const dashboardNonBlankCanvases = await nonBlankCanvasCount(page);
    const dashboardText = await page.locator('body').innerText();
    const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
    result.dashboard = {
      passed: dashboardCanvasCount >= 3 && dashboardNonBlankCanvases >= 2 && dashboardText.includes('Executive Overview') && !horizontalOverflow,
      visibleCanvasCount: dashboardCanvasCount,
      nonBlankCanvasCount: dashboardNonBlankCanvases,
      hasExecutiveOverview: dashboardText.includes('Executive Overview'),
      hasHorizontalOverflow: horizontalOverflow,
    };

    if (!result.dashboard.passed) {
      await page.screenshot({ path: path.join(REPORT_DIR, 'dashboard-failure.png'), fullPage: true });
    }

    const reportLinkCount = await page.locator('a[routerlink="/reports"], a[href="/reports"]').count();
    const inventoryReportLinkCount = await page.locator('a[routerlink="/inventory/reports"], a[href="/inventory/reports"]').count();
    result.navigation = {
      passed: reportLinkCount === 0 && inventoryReportLinkCount > 0,
      globalReportsLinks: reportLinkCount,
      inventoryReportsLinks: inventoryReportLinkCount,
    };

    for (const item of routes) {
      routeConsoleErrors.length = 0;
      routeFailedRequests.length = 0;

      const routeResult = {
        ...item,
        finalUrl: '',
        passed: true,
        failures: [],
        consoleErrors: [],
        failedRequests: [],
      };

      try {
        await page.goto(`${BASE_URL}${item.path}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(2200);
        routeResult.finalUrl = page.url();

        const bodyText = await page.locator('body').innerText({ timeout: 10000 });
        const isLoginRedirect = page.url().includes('/login');
        const hasText = item.mustHave.some((needle) => bodyText.toLowerCase().includes(needle.toLowerCase()));
        const hasAngularRouteError = bodyText.includes('Cannot match any routes') || bodyText.includes('NG04002');
        const hasVisibleMain = bodyText.trim().length > 80;
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);

        if (isLoginRedirect) routeResult.failures.push('Redirected to login');
        if (!hasText) routeResult.failures.push(`Expected page text missing: ${item.mustHave.join(' or ')}`);
        if (hasAngularRouteError) routeResult.failures.push('Angular route error visible');
        if (!hasVisibleMain) routeResult.failures.push('Page body is nearly empty');
        if (overflow) routeResult.failures.push('Horizontal overflow detected at desktop viewport');

        const hardApiFailures = routeFailedRequests.filter((entry) => entry.status >= 500);
        if (hardApiFailures.length > 0) routeResult.failures.push(`${hardApiFailures.length} API 5xx response(s)`);

        routeResult.consoleErrors = routeConsoleErrors.slice();
        routeResult.failedRequests = routeFailedRequests.slice();
        routeResult.passed = routeResult.failures.length === 0;

        if (!routeResult.passed) {
          const safeName = item.path.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'root';
          await page.screenshot({ path: path.join(REPORT_DIR, `${safeName}-failure.png`), fullPage: true });
        }
      } catch (error) {
        routeResult.passed = false;
        routeResult.failures.push(error.message);
      }

      result.routes.push(routeResult);
    }

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);
    const mobileOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
    const mobileCanvases = await visibleCanvasCount(page);
    result.mobile = {
      passed: !mobileOverflow && mobileCanvases >= 3,
      hasHorizontalOverflow: mobileOverflow,
      visibleCanvasCount: mobileCanvases,
    };

    if (!result.mobile.passed) {
      await page.screenshot({ path: path.join(REPORT_DIR, 'dashboard-mobile-failure.png'), fullPage: true });
    }

    result.finishedAt = new Date().toISOString();
    result.summary = {
      passedRoutes: result.routes.filter((route) => route.passed).length,
      failedRoutes: result.routes.filter((route) => !route.passed).length,
      totalRoutes: result.routes.length,
      consoleErrorCount: result.consoleErrors.length,
      pageErrorCount: result.pageErrors.length,
      apiFailureCount: result.failedRequests.length,
    };

    fs.writeFileSync(REPORT_JSON, JSON.stringify(result, null, 2));
  });
});
