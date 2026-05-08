# Web Functional Submission Test Report

Date: 2026-04-27

## Scope

Tested authenticated admin workflows on:

- `http://127.0.0.1:4200`
- `http://localhost:3001/api/v1`

Testing covered page/table rendering, generation pages, API health, and real form submissions using QA-prefixed data. Backend rate limiting was exhausted during broad testing, so the backend was restarted locally with a higher test limit before the final submit runs.

## Artifacts

- Route/table smoke JSON: `qa/artifacts/web-functional-smoke-results.json`
- Submit workflow JSON: `qa/artifacts/web-submit-functional-results.json`
- Fresh invoice context JSON: `qa/artifacts/invoice-fresh-context-results.json`
- Invoice backend error bodies: `qa/artifacts/invoice-error-bodies.json`
- Screenshots: `qa/artifacts/functional-cashbook-failure.png`, `qa/artifacts/functional-recovery-summary-failure.png`, `qa/artifacts/functional-route-plans-failure.png`, `qa/artifacts/functional-inventory-reports-failure.png`, `qa/artifacts/purchase-invoice-add-diagnostic.png`

## Summary

Page/table smoke:

- Authentication: passed
- Dashboard charts: passed, 3 visible canvas charts
- List/table pages: 22 passed, 4 failed
- Generation pages: 7 passed, 0 failed
- API checks: 8 passed, 2 failed

Submit-level workflow:

- Prerequisite category: passed
- Prerequisite business type: passed by reusing existing `General Items`
- Account form submit: failed
- Item registration submit: failed, API fallback item created for invoice testing
- Purchase invoice UI add/save: failed at backend submit
- Sales invoice UI add/save: failed at backend submit
- Tax config submit: expected fail due frontend/backend endpoint mismatch

## Main Failures

1. Account create form is broken.

   The page logs Angular control binding errors such as `Cannot find control with name: 'contactInfo.email'`, `contactInfo.phone`, `bankingInfo.*`, and `businessDetails.*`. The UI submit sends `POST /api/v1/accounts`, receives `400`, and the created account is not returned by the account list API.

2. Item registration UI submit is broken.

   The UI posts empty strings for optional ObjectId fields. Backend rejects the request:
   - `formulaId`: invalid formula ID
   - `formulaSizeId`: invalid formula size ID
   - `subCategoryId`: invalid sub-category ID

   I created an API fallback item after this failure so invoice testing could continue.

3. Purchase invoice UI reaches backend but cannot save.

   Backend response from `POST /api/v1/invoices/purchase`:
   - `400 VALIDATION_ERROR`
   - `items[0].batchInfo.manufacturingDate`: invalid manufacturing date format

   The UI allows purchase invoice submission without a manufacturing date, but the backend validator rejects the payload.

4. Sales invoice UI reaches backend but cannot save.

   Backend response from `POST /api/v1/invoices/sales`:
   - `salesmanId` is not allowed to be empty
   - `claimAccountId` is not allowed to be empty
   - `items.0.unitPrice` is required

   The sales UI maps rates as `unitTP`/`boxTP`, while backend validation requires `unitPrice`. Optional empty fields should be omitted or normalized before submit.

5. Tax config endpoint mismatch.

   Frontend submits to `/api/v1/tax`, which returns `404`. Backend exposes working tax config APIs under `/api/v1/tax/config`.

6. Cashbook APIs are broken.

   - `GET /cashbook/receipts?page=1&limit=20` returns `400`: `cashReceiptService.getAllCashReceipts is not a function`
   - `GET /cashbook/payments?page=1&limit=20` returns `400`: `cashPaymentService.getAllCashPayments is not a function`

7. Recovery Summary and Route Plans have Angular runtime errors.

   Both pages trigger `newCollection[Symbol.iterator] is not a function`, likely because the component assigns an API object to an array-backed template loop/table instead of extracting the data array.

8. Inventory reports route has no detected table/list/empty-state surface.

   `/inventory/reports` loads but does not expose a standard table, list, or empty-state surface in the smoke test.

## Passed Areas

- Login works with admin credentials.
- Dashboard renders interactive chart canvases.
- Most list pages render a table or empty-state surface.
- Generation routes load for sales invoice, purchase invoice, purchase return, purchase order, account create, salary package create, and batch create.
- Prerequisite master data APIs for category and business type are usable.

## Recommended Fix Order

1. Fix account form nested reactive bindings with `formGroupName` for `contactInfo`, `businessDetails`, `employeeBiodata`, and `bankingInfo`.
2. Fix item registration payload normalization: omit empty optional ObjectId fields before POST.
3. Align sales invoice UI payload with backend schema: omit empty optional IDs and send `unitPrice`.
4. Align purchase invoice UI/backend date requirements: either require manufacturing date in UI or make backend optional handling match the form.
5. Change tax config frontend base URL from `/tax` to `/tax/config`.
6. Fix cashbook service method names or controller calls.
7. Normalize recovery summary and route plan API response handling to assign arrays to templates.
