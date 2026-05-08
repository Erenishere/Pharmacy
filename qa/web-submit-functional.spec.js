const fs = require('fs');
const path = require('path');
const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.QA_BASE_URL || 'http://127.0.0.1:4200';
const API_URL = process.env.QA_API_URL || 'http://localhost:3001/api/v1';
const REPORT_DIR = path.resolve(__dirname, 'artifacts');
const REPORT_JSON = path.join(REPORT_DIR, 'web-submit-functional-results.json');

const ADMIN = {
  identifier: process.env.QA_ADMIN_USER || 'admin_new',
  password: process.env.QA_ADMIN_PASSWORD || 'Admin@123',
};

function ensureDir() {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
}

function stamp() {
  return new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
}

function compact(text, limit = 500) {
  return (text || '').replace(/\s+/g, ' ').trim().slice(0, limit);
}

function dataArray(body) {
  if (!body) return [];
  if (Array.isArray(body.data)) return body.data;
  if (Array.isArray(body.data?.items)) return body.data.items;
  if (Array.isArray(body.items)) return body.items;
  if (Array.isArray(body.customers)) return body.customers;
  if (Array.isArray(body.suppliers)) return body.suppliers;
  if (Array.isArray(body.warehouses)) return body.warehouses;
  return [];
}

async function responseBody(response) {
  const text = await response.text().catch(() => '');
  try {
    return { text, json: JSON.parse(text) };
  } catch {
    return { text, json: null };
  }
}

async function apiFetch(request, token, method, urlPath, body) {
  const options = {
    method,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  };
  if (body !== undefined) {
    options.headers['Content-Type'] = 'application/json';
    options.data = body;
  }

  let response = await request.fetch(`${API_URL}${urlPath}`, options);
  if (response.status() === 429) {
    await new Promise((resolve) => setTimeout(resolve, 2500));
    response = await request.fetch(`${API_URL}${urlPath}`, options);
  }

  const parsed = await responseBody(response);
  return {
    status: response.status(),
    ok: response.ok(),
    body: parsed.json,
    bodyPreview: compact(parsed.text),
  };
}

async function login(page) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#identifier')).toBeVisible({ timeout: 15000 });
  await page.locator('#identifier').fill(ADMIN.identifier);
  await page.locator('#password').fill(ADMIN.password);
  await Promise.all([
    page.waitForURL(/dashboard|salesman\/pos/, { timeout: 30000 }).catch(() => null),
    page.locator('button.btn-primary').click(),
  ]);
  return page.evaluate(() => localStorage.getItem('auth_token'));
}

async function recordStep(result, name, fn) {
  const step = {
    name,
    passed: false,
    status: 'running',
    notes: [],
    evidence: {},
    error: null,
  };
  result.steps.push(step);
  try {
    await fn(step);
    if (step.status !== 'blocked' && step.status !== 'expected-fail' && step.status !== 'failed') {
      step.passed = true;
      step.status = 'passed';
    }
  } catch (error) {
    step.status = 'failed';
    step.error = compact(error.stack || error.message || String(error), 1200);
  }
  return step;
}

function updateSummary(result) {
  result.summary = {
    passed: result.steps.filter((s) => s.status === 'passed').length,
    blocked: result.steps.filter((s) => s.status === 'blocked').length,
    expectedFail: result.steps.filter((s) => s.status === 'expected-fail').length,
    failed: result.steps.filter((s) => s.status === 'failed').length,
    consoleErrorCount: result.consoleErrors.length,
    failedRequestCount: result.failedRequests.length,
  };
  result.finishedAt = new Date().toISOString();
}

function flushResult(result) {
  updateSummary(result);
  fs.writeFileSync(REPORT_JSON, JSON.stringify(result, null, 2));
}

async function selectFirstRealOption(page, selector, preferredValue) {
  const select = page.locator(selector).first();
  await expect(select).toBeVisible({ timeout: 15000 });
  const value = preferredValue || await select.locator('option').evaluateAll((options) => {
    const option = options.find((opt) => opt.value && opt.value.trim());
    return option ? option.value : '';
  });
  if (!value) throw new Error(`No selectable option for ${selector}`);
  await select.selectOption(value);
  return value;
}

async function chooseMatOption(page, selectLocator, optionText) {
  await selectLocator.click();
  const option = optionText
    ? page.locator('mat-option').filter({ hasText: optionText }).first()
    : page.locator('mat-option').first();
  await expect(option).toBeVisible({ timeout: 15000 });
  await option.click();
}

async function chooseAutocompleteFirst(page, inputSelector, searchText) {
  const input = page.locator(inputSelector).first();
  await expect(input).toBeVisible({ timeout: 15000 });
  await input.fill(searchText);
  await input.dispatchEvent('input');
  const option = page.locator('mat-option').first();
  await expect(option).toBeVisible({ timeout: 15000 });
  await option.click();
}

async function expectPageContains(page, text, label) {
  await page.waitForTimeout(1500);
  const body = await page.locator('body').innerText();
  if (!body.includes(text)) {
    throw new Error(`${label} did not render "${text}". Page tail: ${compact(body.slice(-2000), 1200)}`);
  }
}

test.describe('Submit-level functional workflow sweep', () => {
  test('master data, item, invoice, and tax submissions', async ({ page, request }) => {
    test.setTimeout(900000);
    page.setDefaultTimeout(15000);
    page.setDefaultNavigationTimeout(30000);
    ensureDir();

    const id = stamp();
    const qa = {
      id,
      accountName: `QA Customer ${id}`,
      categoryName: `QA Category ${id}`,
      businessTypeName: `QA Business ${id}`,
      itemName: `QA Test Item ${id}`,
      itemCode: `QAITEM${id}`,
      batchNumber: `QAB${id}`,
      taxName: `QA Tax ${id}`,
    };

    const result = {
      startedAt: new Date().toISOString(),
      baseUrl: BASE_URL,
      apiUrl: API_URL,
      qa,
      auth: null,
      prerequisites: {},
      steps: [],
      consoleErrors: [],
      failedRequests: [],
    };

    page.on('console', (message) => {
      if (message.type() === 'error') {
        result.consoleErrors.push({ url: page.url(), text: compact(message.text(), 800) });
      }
    });

    page.on('response', (response) => {
      const url = response.url();
      if (url.includes('/api/') && response.status() >= 400) {
        result.failedRequests.push({ route: page.url(), url, status: response.status() });
      }
    });

    const token = await login(page);
    result.auth = { passed: Boolean(token), finalUrl: page.url() };

    const companies = dataArray((await apiFetch(request, token, 'GET', '/companies?isActive=true&limit=20')).body);
    const customers = dataArray((await apiFetch(request, token, 'GET', '/customers?isActive=true&limit=20')).body);
    const suppliers = dataArray((await apiFetch(request, token, 'GET', '/suppliers?isActive=true&limit=20')).body);
    const warehouses = dataArray((await apiFetch(request, token, 'GET', '/warehouses?isActive=true&limit=20')).body);

    result.prerequisites.counts = {
      companies: companies.length,
      customers: customers.length,
      suppliers: suppliers.length,
      warehouses: warehouses.length,
    };
    result.prerequisites.company = companies[0] || null;

    await recordStep(result, 'Create prerequisite category via API', async (step) => {
      const created = await apiFetch(request, token, 'POST', '/categories', {
        name: qa.categoryName,
        description: 'QA prerequisite for submit workflow',
        isActive: true,
      });
      step.evidence.response = created;
      if (![200, 201].includes(created.status) || !created.body?.success) {
        throw new Error(`Category create failed: ${created.status} ${created.bodyPreview}`);
      }
      result.prerequisites.category = created.body.data;
    });
    flushResult(result);

    await recordStep(result, 'Create prerequisite business type via API', async (step) => {
      const created = await apiFetch(request, token, 'POST', '/business-types', {
        name: 'General Items',
        description: 'QA prerequisite for submit workflow',
        isActive: true,
      });
      step.evidence.response = created;
      if (![200, 201].includes(created.status) || !created.body?.success) {
        const existing = await apiFetch(request, token, 'GET', '/business-types?isActive=true&limit=50');
        step.evidence.existingLookup = existing;
        const found = dataArray(existing.body).find((row) => row.name === 'General Items');
        if (found) {
          result.prerequisites.businessType = found;
          step.notes.push('Business type already existed; reused General Items.');
          return;
        }
        throw new Error(`Business type create failed: ${created.status} ${created.bodyPreview}`);
      }
      result.prerequisites.businessType = created.body.data;
    });
    flushResult(result);

    await recordStep(result, 'Submit Account form and verify account list/API', async (step) => {
      await page.goto(`${BASE_URL}/accounts/create`, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('input[formControlName="name"]')).toBeVisible({ timeout: 20000 });
      await page.locator('input[formControlName="name"]').fill(qa.accountName);
      await chooseMatOption(page, page.locator('mat-select[formControlName="accountType"]'), 'Customer');
      await page.getByRole('button', { name: /create account/i }).click({ timeout: 15000 });
      await page.waitForURL(/\/accounts(?:\?|$)/, { timeout: 20000 }).catch(() => null);
      await page.waitForTimeout(1500);
      const verify = await apiFetch(request, token, 'GET', `/accounts?search=${encodeURIComponent(qa.accountName)}&limit=20`);
      step.evidence.apiVerify = verify;
      if (verify.status !== 200 || !compact(JSON.stringify(verify.body)).includes(qa.accountName)) {
        const accountErrors = result.consoleErrors
          .filter((entry) => entry.url.includes('/accounts/create'))
          .slice(-5);
        step.evidence.consoleErrors = accountErrors;
        throw new Error(`Created account was not returned by list API: ${verify.status} ${verify.bodyPreview}`);
      }
    });
    flushResult(result);

    await recordStep(result, 'Submit Item Registration form and verify item table/API', async (step) => {
      if (!companies[0]?._id) {
        step.status = 'blocked';
        step.notes.push('No active company exists; item form requires a company.');
        return;
      }
      await page.goto(`${BASE_URL}/item-registration`, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('input[formControlName="name"]')).toBeVisible({ timeout: 20000 });
      await page.locator('input[formControlName="name"]').fill(qa.itemName);
      await page.locator('input[formControlName="code"]').fill(qa.itemCode);
      await selectFirstRealOption(page, 'select[formControlName="companyId"]', companies[0]._id);
      await selectFirstRealOption(page, 'select[formControlName="categoryId"]', result.prerequisites.category?._id);
      await selectFirstRealOption(page, 'select[formControlName="businessTypeId"]', result.prerequisites.businessType?._id);
      await page.locator('input[formControlName="purchasePrice"]').fill('10');
      await page.locator('input[formControlName="costPrice"]').fill('10');
      await page.locator('input[formControlName="salePrice"]').fill('15');
      await page.locator('input[formControlName="retailPrice"]').fill('16');
      await page.locator('input[formControlName="wholesalePrice"]').fill('14');
      await page.locator('input[formControlName="distributorPrice"]').fill('13');
      await page.locator('input[formControlName="mrp"]').fill('18');
      await page.locator('input[formControlName="openingStock"]').fill('50');
      await page.locator('input[formControlName="minStockLevel"]').fill('5');
      await page.locator('input[formControlName="maxStockLevel"]').fill('100');
      await page.locator('input[formControlName="reorderPoint"]').fill('10');
      await page.locator('input[formControlName="packingSize"]').fill('1');
      await page.getByRole('button', { name: /^save$/i }).click();
      await page.waitForTimeout(2500);
      const verify = await apiFetch(request, token, 'GET', `/items?search=${encodeURIComponent(qa.itemCode)}&limit=20`);
      step.evidence.apiVerify = verify;
      const found = dataArray(verify.body).find((item) => item.code === qa.itemCode || item.name === qa.itemName);
      if (!found) {
        const fallback = await apiFetch(request, token, 'POST', '/items', {
          name: `${qa.itemName} API Fallback`,
          code: `QAFB${id.slice(-10)}`,
          companyId: companies[0]._id,
          categoryId: result.prerequisites.category._id,
          businessTypeId: result.prerequisites.businessType._id,
          unit: 'piece',
          packSize: 1,
          pricing: {
            purchasePrice: 10,
            costPrice: 10,
            salePrice: 15,
            retailPrice: 16,
            wholesalePrice: 14,
            distributorPrice: 13,
            mrp: 18,
          },
          inventory: {
            openingStock: 50,
            currentStock: 50,
            minStockLevel: 5,
            maxStockLevel: 100,
            reorderPoint: 10,
            leadTime: 0,
          },
          tax: {
            taxType: 'GST',
            taxPercentage: 18,
            gstRate: 18,
          },
          specifications: {
            unitOfMeasurement: 'PCS',
            packingSize: 1,
            batchTracking: true,
            expiryTracking: true,
          },
          isActive: true,
        });
        step.evidence.apiFallback = fallback;
        if (![200, 201].includes(fallback.status) || !fallback.body?.success) {
          throw new Error(`Created item was not returned by list API and fallback item failed: ${fallback.status} ${fallback.bodyPreview}`);
        }
        result.prerequisites.item = fallback.body.data;
        step.status = 'failed';
        step.notes.push('UI item form posted invalid empty optional ObjectId fields; API fallback item created so invoice flows could continue.');
        step.error = `UI item submit failed verification: ${verify.status} ${verify.bodyPreview}`;
        return;
      }
      result.prerequisites.item = found;
    });
    flushResult(result);

    await recordStep(result, 'Submit Purchase Invoice form and verify invoice record', async (step) => {
      const item = result.prerequisites.item;
      if (!item?._id || !suppliers[0]?._id || !warehouses[0]?._id) {
        step.status = 'blocked';
        step.notes.push('Purchase invoice requires active item, supplier, and warehouse.');
        return;
      }

      await page.goto(`${BASE_URL}/purchase-invoices/create`, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('mat-select[formControlName="supplierId"]')).toBeVisible({ timeout: 25000 });
      await chooseMatOption(page, page.locator('mat-select[formControlName="supplierId"]'), suppliers[0].name);
      await page.locator('input[formControlName="supplierBillNo"]').fill(`QA-PI-${id}`);
      await chooseAutocompleteFirst(page, 'input[formControlName="itemName"]', item.code || qa.itemCode);
      await page.waitForTimeout(1000);
      await chooseMatOption(page, page.locator('mat-select[formControlName="warehouseId"]'), warehouses[0].name);
      await page.locator('input[formControlName="batchNumber"]').fill(qa.batchNumber);
      await page.locator('input[formControlName="expiryDate"]').fill('12/31/2030');
      await page.locator('input[formControlName="unitQuantity"]').fill('10');
      await page.locator('input[formControlName="unitTP"]').fill('10');
      await page.getByRole('button', { name: /add to invoice/i }).click();
      await expectPageContains(page, item.name || qa.itemName, 'Purchase invoice item table');
      await Promise.all([
        page.waitForURL(/\/purchase-invoices(?:\?|$)/, { timeout: 30000 }).catch(() => null),
        page.getByRole('button', { name: /save draft/i }).click(),
      ]);
      await page.waitForTimeout(2000);
      const verify = await apiFetch(request, token, 'GET', '/invoices/purchase?page=1&limit=20');
      step.evidence.apiVerify = verify;
      const invoice = dataArray(verify.body).find((row) => compact(JSON.stringify(row)).includes(item.name || qa.itemName));
      if (verify.status !== 200 || !invoice) {
        throw new Error(`Purchase invoice was not visible in list API: ${verify.status} ${verify.bodyPreview}`);
      }
      result.prerequisites.purchaseInvoice = invoice;
      const confirm = await apiFetch(request, token, 'PATCH', `/invoices/purchase/${invoice._id}/confirm`, {});
      step.evidence.confirmForSalesStock = confirm;
      if (![200, 201].includes(confirm.status) || !confirm.body?.success) {
        step.notes.push('Purchase invoice was created, but API confirmation failed; sales invoice may remain blocked by warehouse stock.');
      }
    });
    flushResult(result);

    await recordStep(result, 'Submit Sales Invoice form and verify invoice record', async (step) => {
      const item = result.prerequisites.item;
      if (!item?._id || !customers[0]?._id || !warehouses[0]?._id) {
        step.status = 'blocked';
        step.notes.push('Sales invoice requires active item, customer, and warehouse.');
        return;
      }

      await page.goto(`${BASE_URL}/sales-invoices/create`, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('#si-customer-search')).toBeVisible({ timeout: 25000 });
      await chooseAutocompleteFirst(page, '#si-customer-search', customers[0].name);
      await page.getByRole('button', { name: /continue to add items/i }).click();
      await chooseAutocompleteFirst(page, '#si-item-search', item.code || qa.itemCode);
      await page.waitForTimeout(1000);
      await page.locator('#si-warehouse').selectOption(warehouses[0]._id);
      await page.locator('#si-unit-qty').fill('1');
      await page.locator('#si-sale-unit-rate').fill('15');
      await page.locator('#si-batch').fill(qa.batchNumber);
      await page.locator('#si-add-item-btn').click();
      await expectPageContains(page, item.name || qa.itemName, 'Sales invoice item table');
      await Promise.all([
        page.waitForURL(/\/sales-invoices(?:\?|$)/, { timeout: 30000 }).catch(() => null),
        page.getByRole('button', { name: /save draft/i }).click(),
      ]);
      await page.waitForTimeout(2000);
      const verify = await apiFetch(request, token, 'GET', '/invoices/sales?page=1&limit=20');
      step.evidence.apiVerify = verify;
      if (verify.status !== 200 || !compact(JSON.stringify(verify.body)).includes(item.name || qa.itemName)) {
        throw new Error(`Sales invoice was not visible in list API: ${verify.status} ${verify.bodyPreview}`);
      }
    });
    flushResult(result);

    await recordStep(result, 'Submit Tax Config form', async (step) => {
      await page.goto(`${BASE_URL}/tax-config`, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('input[formControlName="taxName"]')).toBeVisible({ timeout: 20000 });
      await page.locator('input[formControlName="taxName"]').fill(qa.taxName);
      await page.locator('input[formControlName="taxType"]').fill('GST');
      await page.locator('input[formControlName="rate"]').fill('1');
      await page.getByRole('button', { name: /add/i }).click();
      await page.waitForTimeout(2000);
      const correctEndpoint = await apiFetch(request, token, 'GET', '/tax/config');
      const wrongEndpointObserved = result.failedRequests.some((entry) => entry.url.endsWith('/api/v1/tax') && entry.status >= 400);
      step.evidence.correctEndpoint = correctEndpoint;
      step.evidence.wrongEndpointObserved = wrongEndpointObserved;
      if (wrongEndpointObserved) {
        step.status = 'expected-fail';
        step.notes.push('Tax UI submits to /api/v1/tax, while backend exposes /api/v1/tax/config.');
        return;
      }
      if (correctEndpoint.status !== 200) {
        throw new Error(`Tax config backend endpoint is unhealthy: ${correctEndpoint.status} ${correctEndpoint.bodyPreview}`);
      }
    });
    flushResult(result);

    flushResult(result);
  });
});
