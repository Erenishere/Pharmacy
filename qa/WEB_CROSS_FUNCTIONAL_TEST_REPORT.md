# Web Manual and Cross-Functional Test Report

Date: 2026-04-27

## Scope

Executed a browser-based, read-only manual QA sweep against the local app:

- Frontend: `http://127.0.0.1:4200`
- Backend: `http://localhost:3001`
- Auth: real admin login succeeded
- Browser runner: Playwright Chromium
- Test harness: `qa/web-cross-functional.spec.js`
- Raw results: `qa/artifacts/web-cross-functional-results.json`

No destructive create/update/delete workflows were submitted in this pass.

## Summary

| Area | Result |
| --- | --- |
| Backend health | Pass |
| Frontend boot | Pass |
| Admin login | Pass |
| Desktop dashboard charts | Pass, 3 visible/non-blank canvases |
| Removed global Reports nav | Pass, no `/reports` sidebar link found |
| Inventory Reports link | Pass, `/inventory/reports` still present |
| Desktop route sweep | 27 passed visually, 1 hard route failure |
| Mobile dashboard | Fail |
| Runtime console errors | 54 captured |
| API 4xx/5xx responses | 4 captured |

## Routes Covered

`/dashboard`, `/items`, `/batches`, `/inventory/stock-levels`, `/inventory/reports`,
`/warehouses`, `/customers`, `/suppliers`, `/purchase-orders`, `/purchase-invoices`,
`/sales-invoices`, `/sales-returns`, `/e-orders`, `/quotations`, `/accounts`,
`/cashbook`, `/expenses`, `/investors`, `/investors/profit-share`, `/tax-config`,
`/salary-packages`, `/salary/calculate`, `/master-data`, `/users`, `/bilty`,
`/recovery-summary`, `/route-plans`, `/letters`.

## Failures

### 1. Cash Book has backend API failures

Severity: High

Route: `/cashbook`

Observed:

- `GET /api/v1/cashbook/receipts?page=1&limit=20` returns `400`
- `GET /api/v1/cashbook/payments?page=1&limit=20` returns `400`
- `GET /api/v1/users?role=salesman&limit=200` returns `500`

Evidence:

- Screenshot: `qa/artifacts/cashbook-failure.png`
- Frontend call: `frontend/src/app/features/cashbook/components/cashbook.component.ts:206`
- Backend role validator only allows roles such as `admin`, `sales`, `purchase`, `inventory`, `accountant`, `data_entry`, not `salesman`: `Backend/src/routes/users.js:156`

Likely cause:

- Cash Book is requesting users with `role=salesman`, but backend user routes do not accept that role.
- Receipts/payments list APIs also reject the default list request with `400`; needs backend service/controller validation check.

Recommended fix:

- Change the Cash Book salesman lookup to `/api/v1/salesmen` or align backend roles to support `salesman`.
- Inspect `cashReceiptService.getAllCashReceipts` and `cashPaymentService.getAllCashPayments` for why empty/default filters are rejected.

### 2. Mobile dashboard is unusable with sidebar open

Severity: High

Route: `/dashboard`

Observed:

- At `390x844`, the sidebar remains open and occupies most of the viewport.
- Dashboard content is pushed/cut to the right.
- Test detected zero visible chart canvases on mobile because the chart area is off-screen/occluded.

Evidence:

- Screenshot: `qa/artifacts/dashboard-mobile-failure.png`

Recommended fix:

- On mobile, default the sidenav to closed or overlay mode.
- Ensure the dashboard content container is full-width when the menu is collapsed.
- Re-test at `390x844` and `768x1024`.

### 3. Recovery Summary throws Angular runtime errors

Severity: Medium-High

Route: `/recovery-summary`

Observed:

- Repeated console error:
  `TypeError: newCollection[Symbol.iterator] is not a function`
- Error originates from Angular repeater rendering in `RecoverySummaryComponent_Template`.

Evidence:

- Salesmen response assignment: `frontend/src/app/features/recovery-summary/components/recovery-summary/recovery-summary.component.ts:82`
- Table data assignment: `frontend/src/app/features/recovery-summary/components/recovery-summary/recovery-summary.component.ts:103`
- Template repeats salesmen: `frontend/src/app/features/recovery-summary/components/recovery-summary/recovery-summary.component.html:92`

Likely cause:

- A template `@for` is receiving an object instead of an array, probably because backend response shape is not normalized before assigning `res.data`.

Recommended fix:

- Normalize lookup/list responses defensively:
  `this.salesmen = Array.isArray(res.data) ? res.data : res.data?.items || res.data?.data || []`
- Do the same for recovery summary rows before assigning `dataSource.data`.

### 4. Route Plans throws Angular runtime errors

Severity: Medium

Route: `/route-plans`

Observed:

- Console error:
  `TypeError: newCollection[Symbol.iterator] is not a function`
- Error originates from `RoutePlanListComponent_Template`.

Evidence:

- Salesmen response assignment: `frontend/src/app/features/route-plan/components/route-plan-list/route-plan-list.component.ts:57`
- Route plan data assignment: `frontend/src/app/features/route-plan/components/route-plan-list/route-plan-list.component.ts:71`
- Template repeats salesmen: `frontend/src/app/features/route-plan/components/route-plan-list/route-plan-list.component.html:65`

Likely cause:

- Same response-shape problem as Recovery Summary: `@for` receives a non-array.

Recommended fix:

- Normalize `salesmen` and route-plan list response data before binding.

### 5. Tax Config calls the wrong backend path

Severity: Medium

Route: `/tax-config`

Observed:

- `GET /api/v1/tax` returns `404`.
- Page still renders, but the tax list cannot load real data.

Evidence:

- Frontend base URL: `frontend/src/app/features/tax-config/services/tax-config.service.ts:27`
- Backend tax config routes are under `/tax/config`: `Backend/src/routes/taxRoutes.js:52`, `Backend/src/routes/taxRoutes.js:63`, `Backend/src/routes/taxRoutes.js:85`, `Backend/src/routes/taxRoutes.js:96`

Recommended fix:

- Change `TaxConfigService` base URL from `${environment.apiUrl}/tax` to `${environment.apiUrl}/tax/config`.

## Passed Checks

- Admin login redirects to `/dashboard`.
- Desktop dashboard shows 3 non-blank chart canvases.
- Dashboard has no desktop horizontal overflow.
- Global `/reports` sidebar link is removed.
- `/inventory/reports` remains accessible.
- Main pages render enough visible content and do not redirect to login.
- No Playwright `pageerror` events were captured.

## Artifacts

- `qa/web-cross-functional.spec.js`
- `qa/artifacts/web-cross-functional-results.json`
- `qa/artifacts/cashbook-failure.png`
- `qa/artifacts/dashboard-mobile-failure.png`

## Re-run Command

```powershell
$tool = Join-Path $env:TEMP 'pharmacy-qa-playwright'
$env:NODE_PATH = Join-Path $tool 'node_modules'
node (Join-Path $tool 'node_modules\@playwright\test\cli.js') test qa/web-cross-functional.spec.js --reporter=line --workers=1
```

