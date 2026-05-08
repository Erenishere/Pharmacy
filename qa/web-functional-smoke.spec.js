const fs = require('fs');
const path = require('path');
const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.QA_BASE_URL || 'http://127.0.0.1:4200';
const API_URL = process.env.QA_API_URL || 'http://localhost:3001/api/v1';
const REPORT_DIR = path.resolve(__dirname, 'artifacts');
const REPORT_JSON = path.join(REPORT_DIR, 'web-functional-smoke-results.json');

const ADMIN = {
  identifier: process.env.QA_ADMIN_USER || 'admin_new',
  password: process.env.QA_ADMIN_PASSWORD || 'Admin@123',
};

const listPages = [
  { path: '/items', area: 'Inventory', expects: ['Items'], table: true, action: /new item|add item|create|register/i },
  { path: '/batches', area: 'Inventory', expects: ['Batch'], table: true, action: /create|new/i },
  { path: '/inventory/stock-levels', area: 'Inventory', expects: ['Stock'], table: true },
  { path: '/inventory/reports', area: 'Inventory', expects: ['Inventory'], table: true },
  { path: '/warehouses', area: 'Warehouse', expects: ['Warehouse'], table: true, action: /add|new|create/i },
  { path: '/customers', area: 'Customers', expects: ['Customer'], table: true, action: /add|new|create/i },
  { path: '/suppliers', area: 'Suppliers', expects: ['Supplier'], table: true, action: /add|new|create/i },
  { path: '/purchase-orders', area: 'Purchase', expects: ['Purchase'], table: true, action: /create|new/i },
  { path: '/purchase-invoices', area: 'Purchase', expects: ['Purchase'], table: true, action: /create|new/i },
  { path: '/sales-invoices', area: 'Sales', expects: ['Sales'], table: true, action: /create|new/i },
  { path: '/sales-returns', area: 'Sales', expects: ['Return'], table: true, action: /create|new/i },
  { path: '/e-orders', area: 'E-Orders', expects: ['Order'], table: true, action: /new|create/i },
  { path: '/quotations', area: 'Quotations', expects: ['Quotation'], table: true, action: /new|create/i },
  { path: '/accounts', area: 'Accounts', expects: ['Account'], table: true, action: /create|new/i },
  { path: '/cashbook', area: 'Cash Book', expects: ['Cash'], table: true },
  { path: '/expenses', area: 'Expenses', expects: ['Expense'], table: true, action: /add|new|create/i },
  { path: '/investors', area: 'Investors', expects: ['Investor'], table: true, action: /add|new|create/i },
  { path: '/investors/profit-share', area: 'Profit Share', expects: ['Profit'], table: true, action: /calculate/i },
  { path: '/tax-config', area: 'Tax Config', expects: ['Tax'], table: true },
  { path: '/salary-packages', area: 'Salary Packages', expects: ['Salary'], table: true, action: /create/i },
  { path: '/users', area: 'Users', expects: ['User'], table: true, action: /add|new|create/i },
  { path: '/bilty', area: 'Bilty', expects: ['Bilty'], table: true, action: /new|create/i },
  { path: '/recovery-summary', area: 'Recovery', expects: ['Recovery'], table: true, action: /generate/i },
  { path: '/route-plans', area: 'Route Plans', expects: ['Route'], table: true, action: /new|create|add/i },
  { path: '/letters', area: 'Letters', expects: ['Letter'], table: true, action: /new|create|add/i },
  { path: '/master-data', area: 'Master Data', expects: ['Master'], table: true },
];

const generationPages = [
  {
    path: '/sales-invoices/create',
    area: 'Sales Invoice Builder',
    expects: ['Invoice'],
    controls: [/customer/i, /item/i, /save|submit|create|invoice/i],
  },
  {
    path: '/purchase-invoices/create',
    area: 'Purchase Invoice Builder',
    expects: ['Purchase', 'Invoice'],
    controls: [/supplier/i, /item/i, /save|submit|create|invoice/i],
  },
  {
    path: '/purchase-invoices/return/create',
    area: 'Purchase Return Builder',
    expects: ['Return'],
    controls: [/supplier|invoice/i, /item|return/i, /save|submit|create/i],
  },
  {
    path: '/purchase-orders/create',
    area: 'Purchase Order Builder',
    expects: ['Purchase', 'Order'],
    controls: [/supplier/i, /item/i, /save|submit|create|order/i],
  },
  {
    path: '/accounts/create',
    area: 'Account Builder',
    expects: ['Account'],
    controls: [/name|title/i, /type/i, /save|submit|create/i],
  },
  {
    path: '/salary-packages/new',
    area: 'Salary Package Builder',
    expects: ['Salary'],
    controls: [/employee|basic/i, /year|date/i, /save|submit|create/i],
  },
  {
    path: '/batches/create',
    area: 'Batch Builder',
    expects: ['Batch'],
    controls: [/item/i, /quantity|qty/i, /expiry|date/i],
  },
];

const apiChecks = [
  { method: 'GET', path: '/dashboard/overview?period=mtd', area: 'Dashboard API', expectStatus: [200] },
  { method: 'GET', path: '/invoices/sales?page=1&limit=10', area: 'Sales Invoice API', expectStatus: [200] },
  { method: 'GET', path: '/invoices/purchase?page=1&limit=10', area: 'Purchase Invoice API', expectStatus: [200] },
  { method: 'GET', path: '/purchase-orders?page=1&limit=10', area: 'Purchase Order API', expectStatus: [200] },
  { method: 'GET', path: '/quotations?page=1&limit=10', area: 'Quotation API', expectStatus: [200] },
  { method: 'GET', path: '/e-orders?page=1&limit=10', area: 'E-Order API', expectStatus: [200] },
  { method: 'GET', path: '/cashbook/receipts?page=1&limit=20', area: 'Cash Receipts API', expectStatus: [200] },
  { method: 'GET', path: '/cashbook/payments?page=1&limit=20', area: 'Cash Payments API', expectStatus: [200] },
  { method: 'GET', path: '/tax/config', area: 'Tax Config API', expectStatus: [200] },
  { method: 'GET', path: '/salesmen?limit=200', area: 'Salesmen API', expectStatus: [200] },
];

function ensureDir() {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
}

function firstLines(text, limit = 500) {
  return (text || '').replace(/\s+/g, ' ').trim().slice(0, limit);
}

async function pageText(page) {
  return page.locator('body').innerText({ timeout: 10000 }).catch(() => '');
}

async function hasTableSurface(page) {
  const selectors = [
    'table',
    '.mat-mdc-table',
    '.mat-table',
    '[role="table"]',
    'mat-paginator',
    '.mat-mdc-paginator',
    '.table-empty-state',
    '.empty-state',
    '.no-data-content',
    '.list-page-container',
    '.table-container',
  ];

  for (const selector of selectors) {
    if (await page.locator(selector).count()) {
      return true;
    }
  }

  return false;
}

async function controlExists(page, pattern) {
  const text = await pageText(page);
  if (pattern.test(text)) {
    return true;
  }

  const labels = await page.locator('label, mat-label, input[placeholder], textarea[placeholder], button, a').evaluateAll((nodes) => nodes.map((node) => {
    const placeholder = node.getAttribute('placeholder') || '';
    return `${node.textContent || ''} ${placeholder}`;
  })).catch(() => []);

  return labels.some((label) => pattern.test(label));
}

async function visibleCanvasCount(page) {
  return page.locator('canvas').evaluateAll((canvases) => canvases.filter((canvas) => {
    const box = canvas.getBoundingClientRect();
    return box.width > 40 && box.height > 40;
  }).length).catch(() => 0);
}

test.describe('Functional table and invoice smoke sweep', () => {
  test('list pages, generation pages, and key APIs', async ({ page, request }) => {
    test.setTimeout(240000);
    ensureDir();

    const result = {
      startedAt: new Date().toISOString(),
      baseUrl: BASE_URL,
      apiUrl: API_URL,
      auth: null,
      dashboard: null,
      listPages: [],
      generationPages: [],
      apiChecks: [],
      consoleErrors: [],
      pageErrors: [],
      failedRequests: [],
    };

    const routeConsoleErrors = [];
    const routeFailedRequests = [];

    page.on('console', (message) => {
      if (message.type() === 'error') {
        const entry = { url: page.url(), text: message.text() };
        result.consoleErrors.push(entry);
        routeConsoleErrors.push(entry);
      }
    });

    page.on('pageerror', (error) => {
      result.pageErrors.push({ url: page.url(), message: error.message, stack: error.stack });
    });

    page.on('response', (response) => {
      const url = response.url();
      const status = response.status();
      if (url.includes('/api/') && status >= 400) {
        const entry = { url, status, route: page.url() };
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
      passed: page.url().includes('/dashboard'),
      finalUrl: page.url(),
    };

    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);
    result.dashboard = {
      passed: (await visibleCanvasCount(page)) >= 3,
      visibleCanvasCount: await visibleCanvasCount(page),
      hasHorizontalOverflow: await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2),
    };

    const token = await page.evaluate(() => localStorage.getItem('auth_token'));

    for (const check of apiChecks) {
      const response = await request.fetch(`${API_URL}${check.path}`, {
        method: check.method,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      const body = await response.text().catch(() => '');
      result.apiChecks.push({
        ...check,
        status: response.status(),
        passed: check.expectStatus.includes(response.status()),
        bodyPreview: firstLines(body),
      });
    }

    for (const item of listPages) {
      routeConsoleErrors.length = 0;
      routeFailedRequests.length = 0;

      const row = {
        ...item,
        finalUrl: '',
        passed: true,
        tablePassed: false,
        actionPassed: null,
        failures: [],
        consoleErrors: [],
        failedRequests: [],
      };

      try {
        await page.goto(`${BASE_URL}${item.path}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(2200);
        row.finalUrl = page.url();

        const text = await pageText(page);
        const hasExpectedText = item.expects.some((needle) => text.toLowerCase().includes(needle.toLowerCase()));
        row.tablePassed = item.table ? await hasTableSurface(page) : true;
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
        const api5xx = routeFailedRequests.filter((requestEntry) => requestEntry.status >= 500);
        const runtimeErrors = routeConsoleErrors.filter((entry) => entry.text.includes('ERROR TypeError') || entry.text.includes('NG0'));

        if (!hasExpectedText) row.failures.push(`Expected page identity text missing: ${item.expects.join(' or ')}`);
        if (item.table && !row.tablePassed) row.failures.push('No table/list/empty-state surface detected');
        if (overflow) row.failures.push('Horizontal overflow detected');
        if (api5xx.length) row.failures.push(`${api5xx.length} API 5xx response(s)`);
        if (runtimeErrors.length) row.failures.push(`${runtimeErrors.length} Angular runtime error(s)`);

        if (item.action) {
          const action = page.getByRole('button', { name: item.action }).or(page.getByRole('link', { name: item.action })).first();
          if (await action.count()) {
            await action.click({ timeout: 5000 }).catch((error) => row.failures.push(`Action click failed: ${error.message}`));
            await page.waitForTimeout(1000);
            const hasDialog = await page.locator('mat-dialog-container, .mat-mdc-dialog-container, form, input, textarea, mat-form-field').count();
            row.actionPassed = hasDialog > 0 || page.url() !== `${BASE_URL}${item.path}`;
            if (!row.actionPassed) row.failures.push('Primary action did not open a form/dialog or navigate');
          } else {
            row.actionPassed = false;
            row.failures.push(`Primary action not found: ${item.action}`);
          }
        }

        row.consoleErrors = routeConsoleErrors.slice();
        row.failedRequests = routeFailedRequests.slice();
        row.passed = row.failures.length === 0;
      } catch (error) {
        row.passed = false;
        row.failures.push(error.message);
      }

      if (!row.passed) {
        const safeName = item.path.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'root';
        await page.screenshot({ path: path.join(REPORT_DIR, `functional-${safeName}-failure.png`), fullPage: true }).catch(() => null);
      }

      result.listPages.push(row);
    }

    for (const item of generationPages) {
      routeConsoleErrors.length = 0;
      routeFailedRequests.length = 0;

      const row = {
        ...item,
        finalUrl: '',
        passed: true,
        controlResults: [],
        failures: [],
        consoleErrors: [],
        failedRequests: [],
      };

      try {
        await page.goto(`${BASE_URL}${item.path}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(2500);
        row.finalUrl = page.url();

        const text = await pageText(page);
        const hasExpectedText = item.expects.some((needle) => text.toLowerCase().includes(needle.toLowerCase()));
        if (!hasExpectedText) row.failures.push(`Expected form identity text missing: ${item.expects.join(' or ')}`);

        for (const control of item.controls) {
          const exists = await controlExists(page, control);
          row.controlResults.push({ pattern: control.toString(), passed: exists });
          if (!exists) row.failures.push(`Expected control/label missing: ${control}`);
        }

        const hasFormSurface = await page.locator('form, input, textarea, mat-form-field, table, .mat-mdc-table').count();
        if (!hasFormSurface) row.failures.push('No form/table builder surface detected');

        const api5xx = routeFailedRequests.filter((requestEntry) => requestEntry.status >= 500);
        const runtimeErrors = routeConsoleErrors.filter((entry) => entry.text.includes('ERROR TypeError') || entry.text.includes('NG0'));
        if (api5xx.length) row.failures.push(`${api5xx.length} API 5xx response(s)`);
        if (runtimeErrors.length) row.failures.push(`${runtimeErrors.length} Angular runtime error(s)`);

        row.consoleErrors = routeConsoleErrors.slice();
        row.failedRequests = routeFailedRequests.slice();
        row.passed = row.failures.length === 0;
      } catch (error) {
        row.passed = false;
        row.failures.push(error.message);
      }

      if (!row.passed) {
        const safeName = item.path.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'root';
        await page.screenshot({ path: path.join(REPORT_DIR, `functional-${safeName}-failure.png`), fullPage: true }).catch(() => null);
      }

      result.generationPages.push(row);
    }

    result.finishedAt = new Date().toISOString();
    result.summary = {
      listPagesPassed: result.listPages.filter((item) => item.passed).length,
      listPagesFailed: result.listPages.filter((item) => !item.passed).length,
      generationPagesPassed: result.generationPages.filter((item) => item.passed).length,
      generationPagesFailed: result.generationPages.filter((item) => !item.passed).length,
      apiChecksPassed: result.apiChecks.filter((item) => item.passed).length,
      apiChecksFailed: result.apiChecks.filter((item) => !item.passed).length,
      consoleErrorCount: result.consoleErrors.length,
      pageErrorCount: result.pageErrors.length,
      failedRequestCount: result.failedRequests.length,
    };

    fs.writeFileSync(REPORT_JSON, JSON.stringify(result, null, 2));
  });
});
