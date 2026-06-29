# System Actionable Audit

Date: 2026-05-02  
Scope: Indus Traders / pharmacy ERP backend, frontend route/API contracts, duplicated feature surfaces, and high-risk business workflows.  
Mode: Initial audit, then follow-up implementation of selected P0/P1 fixes.

## Implementation Status

Completed after the initial audit:

- Removed duplicate backend API mounts from `Backend/src/routes/index.js` for legacy/non-canonical warehouse, inventory, route, quotation history, rate suggestion, print, cash receipt, cash payment, and purchase invoice aliases. Canonical mounted APIs remain under `/api/v1/...`.
- Fixed same-depth dynamic route shadowing in stock movement, scheme, company group, sales return, and cashbook routes by placing static routes before `/:id`.
- Aligned frontend analytics/dashboard services to the mounted backend report routes under `/reports/analytics/*` and `/reports/*`.
- Repaired cashbook account posting so receipts/payments resolve a real active cash/bank `Account` and ledger entries no longer use placeholder account ids.
- Added cash payment `cashAccountId`, invoice allocations, total allocated, difference, and notes persistence to match the cashbook requirement.
- Added missing supplier pending-invoices endpoint for cash payments and normalized customer pending-invoices responses to arrays for the frontend.
- Centralized invoice payment allocation math so cash receipts/payments update `totals.paidAmount`, `totals.dueAmount`, and `paymentStatus` on the actual invoice schema fields.
- Added cashbook cancellation and bounced-cheque reversal behavior for invoice allocations and ledger entries.
- Wrapped cashbook receipt/payment creation, cancellation, bounced-cheque reversal, invoice allocation updates, and ledger entries in MongoDB sessions so the main posting chains commit or roll back together.
- Preserved the `/v1/pdc` compatibility page after controller cleanup by mapping it to cashbook endpoints, normalizing frontend response handling, and keeping `chequeStatus` in sync on clear/bounce.
- Restricted posted cashbook accounting-field edits; posted receipt/payment amount, account, payment method, date, and allocations must be cancelled and recreated to keep ledger history auditable.
- Added the missing backend Jest setup file, excluded stale legacy `src/test` Mocha/Chai harness files from Jest, repaired current unit-test drift, and restored the main backend Jest suite.
- Removed unmounted duplicate cash receipt/payment route files and controllers after moving PDC endpoints onto the canonical cashbook controller.
- Consolidated account create/edit navigation onto the workbook-style account registration screen under `/accounts/registration`, including direct edit mode at `/accounts/registration/:id`; the screen now lists/creates/updates/deletes through canonical `/accounts`, and workbook account-manager/sub-account types pass `/accounts` API validation.
- Tightened account registration/list round-trip behavior: canonical account list responses populate town, dimension, route, account head, customer type, and salesman references; workbook optional blanks no longer fail validation; account edit saves no longer reset live current balances from opening balance; account list now includes workbook columns for town, dimension, salesman, credit days, quality status, and print preview.
- Fixed purchase-order conversion navigation so converted purchase invoices open the mounted `/purchase-invoices/edit/:id` route instead of an undefined `/purchase-invoices/:id` route.
- Created `docs/project-completion-team-plan.md` with project-manager, senior-developer, frontend-developer, and backend-developer ownership, acceptance criteria, and verification gates for completing all workbook requirements without placeholders.
- Repointed the frontend account ledger service from the unmounted `/accounting/ledger` contract to mounted `/accounts/:id/ledger`, `/accounts/:id/balance`, and `/accounts/:id/transactions` endpoints; unsupported legacy reconciliation/export calls now fail locally instead of hitting phantom routes.
- Continued route/API contract cleanup: `/profile` now opens a real current-user profile/password page backed by `/users/profile/me`, stale `accounting.service.ts` no longer calls unmounted `/accounting/**`, e-order helper calls point to mounted `/salesmen`, `/schemes`, and `/e-orders/summary` or fail locally when unsupported, `/e-orders/sync` is no longer shadowed by `/:id`, and batch detail/create/edit services unwrap mounted `/batches` API responses correctly. Verified with `npm run build` in `frontend` on 2026-05-03.
- Added active Jest cashbook/PDC transaction contract coverage for receipt/payment allocation, cancellation reversal, ledger-session propagation, and rollback-on-ledger-failure behavior in `Backend/tests/cashbookTransactionContracts.test.js`. Verified with `npm test -- --runInBand tests/cashbookTransactionContracts.test.js src/services/__tests__/inventorySourceOfTruth.test.js` on 2026-05-03.
- Added replica-set-backed cashbook/PDC API workflow coverage in `Backend/tests/cashbookPdcApiWorkflow.integration.test.js` for partial customer receipts, full supplier payments, over-allocation rejection with rollback, cancel reversal, PDC pending, clear, and bounce compatibility routes. Verified with `npm test -- --runInBand tests/cashbookPdcApiWorkflow.integration.test.js tests/cashbookTransactionContracts.test.js src/services/__tests__/inventorySourceOfTruth.test.js` on 2026-05-03.
- Tightened invoice allocation validation so cashbook receipts/payments reject zero/invalid allocation amounts, allocations above the receipt/payment amount, and allocations above the invoice remaining due instead of silently capping paid amounts. Cash receipts now persist the workbook-facing top-level `difference` field consistently with cash payments.
- Added inventory source-of-truth regression coverage in `Backend/src/services/__tests__/inventorySourceOfTruth.test.js` for purchase, sale, reserved sale, negative adjustment rollback, and transfer audit metadata. Verified with the same focused Jest run on 2026-05-03.
- Replaced visible print/report/export placeholders in the current sprint slice: invoice print and sales report PDF endpoints now stream real PDF output, sales invoice email returns explicit `501` until SMTP is configured, tax report generation aggregates invoice tax totals, purchase-order print/export and purchase-invoice print/export perform real browser actions, analytics/financial dashboard exports use loaded data, and financial reporting points at mounted `/reports/financial` routes. Verified with `npm run build` in `frontend` on 2026-05-03.
- Removed fake chart-of-accounts data/actions from the accounts UI: it now loads active account heads from `/account-heads`, filters locally, and routes create/edit/sub-account work to the existing master-data/account-registration surfaces instead of showing fake success. Verified with `npm run build` in `frontend` on 2026-05-03.
- Removed salary frontend mock fallbacks for package creation/listing, employee/item dropdowns, and salary calculation. Salary now fails visibly on API errors, loads employees/items from canonical APIs, resolves an active salary package before calculation, and the backend salary package flow validates employees against the same account/customer model used by `/accounts?accountType=employee`. Verified with `npm run build` in `frontend` and `Backend/tests/salaryPackageApiContracts.test.js` on 2026-05-03.
- Added the Phase 1 browser smoke foundation under `qa/`: Playwright config, safe smoke seed script, login smoke, admin route navigation smoke, and critical cashbook/PDC/invoice/report action-surface smoke tests. Root QA scripts now expose install, seed, list, smoke, and headed-smoke commands. Syntax checks, QA dependency install, Playwright test discovery, and frontend build passed on 2026-05-05.

Completed 2026-05-05:

- Corrected return payment-state consistency for sales returns and purchase returns. Return credits now run through the shared invoice payment helper, keep recorded cash `paidAmount` unchanged, reduce `dueAmount` by confirmed return credits, update `paymentStatus`, and avoid overwriting the original invoice workflow `status`.
- Added session plumbing for purchase return creation across return invoice save, inventory adjustment, stock movement creation, ledger posting, and original-invoice payment-state update where the existing helpers support sessions.
- Added focused backend tests for unpaid, partially paid, and fully paid original invoices, plus prior/current return-credit aggregation.
- Added mounted report/print/export API contract proof in `Backend/tests/reportPrintExportApiContracts.test.js`. The test seeds real invoice data, verifies print data, invoice PDF streaming, sales report JSON, CSV export, sales report PDF export, dashboard cards, sales-trend chart data, and top-items chart data without placeholder text.
- Fixed unbound report and print controller callbacks that caused mounted PDF/export routes to fail when helper methods were called through `this`.
- Implemented the dashboard analytics service methods required by mounted `/api/v1/reports/analytics/**` routes, including dashboard summary, trends, top customers/items, category revenue, margin, collection, inventory turnover, and KPI contracts.
- Verified focused return-payment tests, focused report/print/export API tests, the full backend Jest suite, and the frontend build pass after the correction.
- Fixed return stock movement contracts for Phase 3 inventory proof. Sales returns now write inbound `StockMovement` audit rows with modeled `warehouse`, `batchInfo`, `referenceType: 'sales_return'`, and source return invoice `referenceId`; purchase returns now write outbound stock audit rows with canonical `movementType: 'out'` instead of the invalid `return_to_supplier` movement type.
- Extended the `StockMovement` schema to accept return reference types and require return movements to carry `referenceId`, preventing return stock changes from losing invoice traceability.
- Reservation release and auto-expiry now use the reservation's own `orderId` and `createdBy` when writing release stock movements, removing the previous invalid stock-movement audit attempts for release-by-id and expiry-job paths.
- Added focused model and service tests for return stock movements, sales-return batch metadata preservation, purchase-return outbound audit payloads, and reservation release stock-audit persistence. Full backend Jest passed with 332 tests, 1 skipped, 20 suites, and the frontend build also passed.

Completed 2026-05-06:

- Added mounted `/api/v1/inventory` workflow contract proof for completed warehouse transfer, in-transit transfer receive, and large stock-adjustment approval.
- The new proof asserts that `Inventory`, derived `Item.inventory.currentStock`, and `StockMovement` audit rows reconcile after transfer and adjustment status transitions.
- Fixed `StockMovement` pre-save validation so outbound movements stored with the canonical negative quantity sign can be saved again during later status changes, such as receiving an in-transit transfer.
- Verified the new API workflow test plus the nearby return, reservation, adjustment, and source-of-truth stock suites. Full backend Jest also passed with 339 tests, 1 skipped, and 22 suites.
- Added mounted sales and purchase invoice API workflow proof for confirmation and cancellation. The tests now verify stock, batch, derived item stock, stock movement audit rows, customer balance, and supplier ledger entries through the canonical invoice routes.
- Fixed invoice stock reconciliation drift exposed by that proof: sales invoice item quantity/batch fields now accept the persisted schema shape, invoice cancellation movements use modeled reference types and warehouse/batch metadata, purchase invoice cancellation reverses stock/batches/ledger entries, and batch quantity writes honor active MongoDB sessions.
- Verified the invoice API workflow plus the nearby transfer, return, reservation, adjustment, and source-of-truth stock suites. The focused widened gate passed 124 tests, 1 skipped, and 9 suites. A full backend Jest run was attempted again but timed out after 799 seconds without a summary, so that result is inconclusive for this slice.
- Advanced the browser smoke phase. The first server-starting smoke attempt exposed malformed Sass gradients in report, purchase invoice, and salesman dashboard styles; those compile blockers were fixed and the frontend build passes again. The smoke harness then reached seed setup and is now blocked by missing local MongoDB at `localhost:27017`.
- Added mounted purchase-order conversion API proof. Confirmed POs now convert to draft purchase invoices with required supplier bill, quantity, unit price, warehouse, batch, and PO link fields preserved; invoice confirmation marks PO fulfillment as fulfilled and cancellation reverts fulfillment, inventory, batch, item stock, and stock movement audit rows.
- Fixed purchase-order conversion and fulfillment drift exposed by that proof: PO item box/unit quantities now map to purchase invoice `quantity`/`unitPrice`, `supplierBillNo` is persisted by purchase invoice creation, populated item references match during fulfillment updates, and invoice repository status updates can receive the active MongoDB session.
- Added mounted physical-count API proof. Physical counts now create from the real frontend payload shape, list through the mounted history API, approve through `/api/v1/inventory/physical-count/:id/approve`, update inventory plus derived item stock, and surface variance/discrepancy report rows through the mounted report endpoints.
- Rebuilt physical-count service drift exposed by that proof: it now uses the real `PhysicalCount` schema fields and statuses, normalizes the API response shape for the frontend history view, and keeps approval on the repo's existing inventory-save pattern after transaction retries conflicted with inventory post-save stock-sync hooks.
- Added mounted inventory report read API proof. Stock overview, warehouse stock, low-stock, movement report, and stock aging endpoints now reconcile against canonical `Inventory`, `Batch`, and `StockMovement` data instead of stale placeholder math or legacy field names.
- Fixed inventory report read drift exposed by that proof: stock overview now reports real reserved and available totals, warehouse stock rows include batch and expiry metadata, low-stock rows use item `minimumStock` / `reorderPoint`, movement reads query `StockMovement.itemId` with sign-safe totals, and stock aging returns bucket summaries plus flattened batch rows.
- Added mounted API proof for the remaining inventory report surface: fast-moving, slow-moving, dead-stock, reorder suggestions, and turnover now return data derived from the same canonical inventory, stock movement, and invoice sources as the rest of Phase 3.
- Fixed remaining inventory report drift exposed by that proof: sales velocity and inactivity calculations now use `StockMovement.itemId` plus completed outbound sales movements, reorder suggestions derive from item stock thresholds instead of placeholder inventory fields, turnover is backed by real sales invoice lines and current inventory value, and the duplicate inventory reports component now reads mounted `{ items: [...] }` payloads correctly.
- Added focused mounted API proof for `stockout-history`, confirming the final unverified inventory read route now reports only current zero-stock items with warehouse attribution and inactivity metrics.
- Added mounted API proof for tax drilldown routes under `/api/v1/reports/*`, covering `tax-summary`, `purchase-gst-breakdown`, `purchase-summary-gst`, and `supplier-wise-gst` with real sales/purchase invoice tax data.
- Fixed two report-service drifts exposed by that proof: the mounted `tax-summary` route had been silently overridden by a later legacy `getTaxReport()` wrapper, and supplier-wise GST summary/sort logic was reading numeric totals as nested objects and returning `null` summary figures.
- Added mounted API proof for `/api/v1/capital`, covering capital in/out creation, listing, insufficient-withdrawal validation, delete reversal, and `GET /api/v1/capital/statement`.
- Fixed capital service drift exposed by that proof: the backend was reading stale `Account` fields (`accountName`, `currentBalance`), calling a non-existent ledger helper signature, and returning a zeroed placeholder capital statement. Capital now writes real `capital` ledger entries, updates `Account.balance`, reverses balances/ledger on delete, and reports running/net capital from real transactions.
- Aligned the capital frontend runtime surface with the proved backend contract: `/capital` now loads cash accounts from active asset accounts, investor/proprietor accounts from active equity accounts, renders the real capital statement summary/fixed-capital/running-capital data from `/v1/capital/statement`, and locks financial fields during edit mode so the UI no longer implies unsupported ledger-impacting edits.
- Aligned the letters frontend contract with the mounted CRUD surface: the `/letters` filters now use the real `Letter` enum values, the status badge surface now supports `Final`, the visible delete action is hidden for non-authorized roles such as accountant, and the letter print action now renders a record-specific printable layout instead of the previous raw popup placeholder.
- Aligned the standalone bilty receipt surface around the canonical `/v1/bilty-receipts` contract: the frontend bilty service/model now match the receipt payload instead of the stale invoice-linked `/v1/bilty` shape, the mounted backend now exposes `PATCH /v1/bilty-receipts/:id/status` for explicit sent/received transitions, the visible delete action is hidden for unauthorized roles, and the print action now renders a record-specific bilty receipt layout instead of the old browser-wide placeholder.
- Hardened the enhanced item registration dialog runtime surface: the `/items` registration modal now uses a balanced section layout, proper Material field sizing, readable pricing/packaging/barcode inputs, and a full-width image/status side panel instead of the previous collapsed, whitespace-heavy dialog shell.
- Captured the first real browser baseline on 2026-05-06 by running the Playwright smoke harness against the approved development Atlas database with deterministic `smoke.*` seed data; 31 auth, action-surface, and visible-route checks passed after updating the smoke harness to reflect current `New ...` CTA labels and the now-larger route inventory.
- Completed the salary/targets workflow proof on 2026-05-06. The shared monthly performance path is now verified from route plan plus sales invoice plus cash receipt plus mobile e-order input, through `/api/v1/targets/dashboard`, `/api/v1/targets/achievement/:employeeId`, `/api/v1/salary/calculate`, and `/api/v1/salary/sheet/:employeeId`.
- Added deterministic QA seed coverage for the salary/targets slice: smoke employee account, linked salesman user, active salary package, current-month route plan, planned customer area, seeded mobile order, seeded recovery receipt, and reset of the smoke employee's current-month salary calculation before browser runs.
- Added dedicated Playwright smoke coverage for salary/targets on the running stack: salary package list monthly-visit snapshot and print popup, target dashboard live metrics, and salary calculation for the seeded employee package.
- Completed the recovery summary contract proof on 2026-05-07. The mounted `/api/v1/recovery-summary` read surface now derives per-salesman and per-customer recovery figures, overdue totals, and aging statistics from canonical sales invoice paid/due totals instead of the old placeholder CRUD list, and the Angular `/recovery-summary` page now consumes that proved contract without fake overdue math or console-only actions.
- Completed the recovery summary browser proof on 2026-05-07. The QA seed now provisions deterministic recovery fixtures (`SMOKESM`, `SMOKEREC`, and a partial paid recovery invoice/receipt pair), and a focused Playwright smoke test verifies `/recovery-summary` can filter to that seeded salesman and render the live customer breakdown without runtime errors.
- Completed the cashbook browser proof on 2026-05-07. The mounted `/cashbook` page now loads real asset cash accounts, real pending customer invoices, and the missing cheque-date field required for post-dated cheque receipts; focused Playwright smoke proves create plus cancel for a seeded pending cheque receipt with invoice allocation.
- Completed the dedicated PDC screen browser proof on 2026-05-07. The mounted `/pdc` page now renders seeded pending cheques with the populated customer contract and accurate pending-only summary cards, and focused Playwright smoke proves the dedicated clear action against `SMOKE-PDC-001`.
- Completed the account registration browser proof on 2026-05-07. The QA seed now provisions deterministic dimension/designation/customer-type/account-head lookups, and focused Playwright smoke proves create plus edit round-trip through `/accounts/registration` and `/accounts/registration/:id`, including API verification that edited opening-balance metadata no longer resets live `currentBalance`.
- Completed the sales invoice print browser proof on 2026-05-07. The QA seed now marks seeded smoke invoices as admin-created so the default `/sales-invoices` list can render them, and focused Playwright smoke proves the seeded `SMOKE-SI-001` invoice can be previewed and printed through the live A4 print popup with real customer, item, and total content.
- Completed the purchase invoice print/export browser proof on 2026-05-07. The mounted `/purchase-invoices` list now falls back to populated supplier objects for account-title rendering, the visible print action opens a record-specific purchase invoice popup instead of printing the whole application tab, and focused Playwright smoke proves the seeded `SMOKE-PI-001` invoice can be printed and exported through the live screen actions.
- Completed the purchase order print/export browser proof on 2026-05-07. Focused Playwright smoke now proves the seeded `SMOKE-PO-001` order can be printed through the live list-to-detail print path and exported through the visible list export action with real CSV output.
- Completed the item management create/export browser proof on 2026-05-07. The enhanced `/items` page now uses the mounted `/api/v1/items/export` route instead of a placeholder export action, deterministic smoke master data backs the registration dropdowns, and focused Playwright smoke proves the live dialog can create an item that returns in the list before the export button downloads a non-empty Excel file.
- Completed the stock-level dashboard export/runtime polish on 2026-05-07. The `/inventory/stock-levels` Excel and PDF actions no longer show placeholder toasts; they now export the live filtered stock rows through the shared frontend export service, the warehouse chip remains readable without hover, and the `/profile` page now uses a cleaner settings-style layout instead of the prior whitespace-heavy card stack.
- Stabilized the shared Material frontend theme on 2026-05-07. Standard `mat-form-field` placeholders are now suppressed until focus so labels no longer overlap placeholders across common pages/dialogs, and default `mat-menu` action panels now render with the light Indus theme instead of the dark fallback on screens without a custom menu class.
- Completed a frontend performance first pass on 2026-05-07. The shared export service now lazy-loads CSV, Excel, and PDF libraries on demand, and the shared data-table component now uses `OnPush` change detection with precomputed column state and tracked columns to reduce repeated list/table render work across mounted pages. Frontend build passed after the change, and Angular now emits `xlsx` and `jspdf-es-min` as separate lazy chunks instead of the initial application path.
- Completed datepicker and stock-endpoint optimization on 2026-05-07. Shared Material datepicker overlays now force the light Indus surface so dialog calendars no longer render with the dark fallback background, and the mounted `/api/v1/inventory/stock` route now uses early item prefiltering plus one faceted aggregate instead of the prior duplicated joined aggregation. The same backend slice also adds the missing `companyId` filter, projects `companyName`, aligns pagination metadata with current frontend expectations, and is covered by focused API proof in `Backend/tests/inventoryStockApiContracts.test.js`.
- Completed the item registration dialog redesign and quantity alignment on 2026-05-07. The live item form now exposes the quantity that feeds the list table (`inventory.currentStock`) as an opening quantity on create and a visible read-only current quantity on edit, while the redesigned layout gives pricing and inventory enough width to avoid the previous cramped right-column presentation. Frontend build passed after the change.
- Completed backend auth session hardening on 2026-05-07. The mounted `/api/v1/auth` flow now uses a Redis-backed session contract with in-memory fallback: login creates a server-side session, refresh rotates the stored refresh-token hash, logout revokes the session, and access-token verification rejects revoked sessions instead of relying on JWT expiry alone. Focused API proof now covers logout revocation and refresh-token rotation, and the supplied Upstash Redis connection responded to a live `PING` from this workspace.
- Completed the first cashbook performance contract slice on 2026-05-07. The backend now exposes canonical merged `/api/v1/cashbook/entries` with server-side type/status/date filtering, unified sorting, and real pagination metadata instead of forcing the UI to merge receipts and payments client-side.
- Updated the frontend cashbook screen to consume the merged entries contract, use backend-driven paginator totals, keep serial numbering page-aware, and avoid loading supplier lookups on first paint until payment mode is selected.
- Verified the cashbook performance slice with `Backend/tests/cashbookPdcApiWorkflow.integration.test.js`, which now covers merged entries pagination/type filtering, and with `npm run build` in `frontend`.
- Completed the first item-list performance contract slice on 2026-05-07. The mounted `/api/v1/items` endpoint now resolves supported sort keys through an explicit backend field map, preventing the enhanced list from advertising client-side sorting without a matching server contract.
- Updated the enhanced `/items` page to send real sort events through the shared data-table, and cached company/category filter option reads in `ItemService` so the page no longer refetches those low-churn datasets on every visit.
- Verified the item-list performance slice with `Backend/tests/itemListApiContracts.test.js` and `npm run build` in `frontend`.
- Completed the first account-registration boot performance slice on 2026-05-07. The mounted `/api/v1/accounts/registration-lookups` route now bundles active dimensions, designations, customer types, account heads, and towns with dropdown-sized projections instead of making five separate startup requests.
- Updated the frontend account master service and `/accounts/registration` screen to cache that lookup bundle client-side and keep only parent-account and town-area reads lazy, reducing first-paint request fan-out without changing the form contract.
- Verified the account-registration performance slice with `Backend/tests/accountRegistrationLookupsApiContracts.test.js` and `npm run build` in `frontend`.
- Added the measured performance baseline runner on 2026-05-08. `Backend/scripts/performance-baseline.js` and `npm run perf:baseline` now capture p50/p95 client timing, server `X-Response-Time`, payload bytes, status mix, route budget pass/fail, monitoring slow routes, cache stats, and database index snapshots for the optimized cashbook, account, and item hot paths.
- Added the documented `/api/v1/monitoring/indexes` route, documented the benchmark output location in `docs/performance-baselines/README.md`, and verified the timing helpers plus index snapshot contract with `Backend/tests/performanceBaselineUtils.test.js` and `Backend/tests/monitoringIndexesApiContracts.test.js`.
- Improved the monitoring index snapshot path on 2026-05-08. `getAllIndexStats()` now collects configured collection stats in parallel, `/api/v1/monitoring/indexes` and `/api/v1/monitoring/metrics/database` share a 120-second route cache, and the benchmark includes `/api/v1/monitoring/indexes` as a measured budgeted route.
- Improved the account-registration lookup boot path again on 2026-05-08. `/api/v1/accounts/registration-lookups` now uses a 120-second backend route cache for warm reads, and related dimension/designation/customer-type/account-head/town mutations clear the lookup cache before returning success.
- Improved the cashbook form boot path on 2026-05-08. The page now consumes one projected `/api/v1/cashbook/lookups` contract for receive/payment form options, caches those reads per transaction mode in the frontend, defers supplier-only lookups until payment mode is selected, and refreshes the local lookup cache after balance-changing actions so account balances do not stay stale between edits.
- Improved item-list database retrieval on 2026-05-31. `/api/v1/items` now escapes literal keyword input instead of compiling raw user text as a regular expression, clamps invalid/oversized page parameters in the service, and the item schema declares compound indexes for the active item list's common name/code/stock/retail price and company/category filter paths. The shared Mongo pagination helper now runs count and row retrieval concurrently for helper-backed list routes.

Completed 2026-05-20:

- Removed customer frontend mock fallbacks and fake-success paths. The customer service now calls only the mounted customer API contract, invalidates statistics on real mutations, and propagates API errors instead of fabricating rows.
- Tightened inventory stock removal against the exact item, warehouse/location, and batch selected by the workflow. Negative stock updates no longer upsert missing inventory rows, removal requires sufficient quantity in the selected warehouse/batch, and focused source-of-truth tests now reject warehouse/batch over-removal before any audit/item mutation.
- Hardened auth/API protection for shipping: password reset OTP generation now uses cryptographic randomness, OTP verification and reset endpoints are rate-limited, reset-password requires the verified reset token path, and the Vercel API CORS policy no longer mirrors every browser origin with credentials in production.
- Removed runtime `console.log` usage from the backend/frontend application surfaces checked in this slice, including stale auth/email success logs and test debug output.
- Verified with full backend Jest (`39` suites, `382` passed, `1` skipped), frontend Angular production build, focused auth/inventory contracts, and syntax checks for touched backend entry points. Browser smoke is not yet passed in the current environment because `Backend/.env` points at a non-local Atlas `MONGODB_URI` and the QA seed correctly refuses to mutate it without `ALLOW_SMOKE_SEED=1` or a safe `SMOKE_MONGODB_URI`/`MONGODB_TEST_URI`.

Still open:

- System-wide performance recovery is now a dedicated delivery stream. The repo already has monitoring routes, compression, cache middleware, Redis/L1 cache helpers, and index-analysis utilities, and the first visible slices now cover cashbook merged-list plus lookup boot, account-registration boot, item-list contract hardening, the shared baseline runner, and monitoring/index warm-read uplift. Remaining work is to run the baseline on the real dev/staging dataset, tune the slowest measured routes, and continue route-by-route index/cache review. See `docs/system-performance-plan.md` and the new P0 lane in `docs/project-completion-team-plan.md`.
- Cashbook and the dedicated PDC screen now have transactional posting/reversal coverage in code, active Jest contract tests, real MongoDB replica-set API workflow proof, and passing browser-level smoke coverage under `qa/` on 2026-05-07. Remaining gaps are bank reconciliation behavior and broader non-cashbook payment-state consistency.
- Legacy backend `src/test` files are excluded from Jest because they use a different Mocha/Chai/path harness and duplicate current Jest coverage; either migrate or delete them in a follow-up cleanup.
- Account registration now has focused field-level round-trip verification against representative workbook fields, including create plus direct edit proof through the mounted `/accounts/registration` routes. Remaining gap is deciding whether to delete or archive the older smaller account form component after route consolidation.
- Report/print/export now has backend API proof for the core invoice print, sales report export, analytics dashboard routes, tax drilldown report routes, and capital backend reporting; the capital page runtime account-loading flow is aligned on the frontend; the letters surface no longer shows stale filters or dead delete behavior; the standalone bilty receipt surface now has a canonical status workflow with a record-specific print layout; salary/targets now has both backend workflow proof and browser smoke coverage; sales invoices now have focused preview-plus-print browser proof on the running stack; purchase invoices now have focused print-plus-export browser proof on the running stack; purchase orders now have focused print-plus-export browser proof on the running stack; and browser smoke against the running frontend now passes on the approved development Atlas database. Remaining work is deeper workbook-specific report/export contracts beyond the current invoice and purchase-order paths.
- Inventory Phase 3 now has return stock movement, reservation-release audit proof, mounted transfer/adjustment API reconciliation, mounted purchase/sale invoice stock workflow reconciliation, mounted purchase-order conversion side-effect proof, mounted physical-count reconciliation/report proof, mounted stock overview/warehouse/low-stock/movement/aging read proof, mounted fast/slow/dead/reorder/turnover proof, mounted stockout-history proof, and exact warehouse/batch over-removal protection. The Phase 3 inventory backend contract surface is now fully verified; the next work shifts back to browser smoke and other report/print placeholder surfaces.
- Shipment readiness remains blocked on the browser smoke gate until QA runs against an explicitly approved smoke/test database instead of the current production-looking Atlas URI.
- Duplicate frontend pages/dialogs and UI standardization remain a separate UI pass, but the enhanced item registration dialog is no longer one of the blocking theme/layout regressions.

## Audit Method

- Backend API source of truth: `Backend/src/routes/index.js`.
- Frontend route source of truth: `frontend/src/app/app.routes.ts`.
- Static scans used `rg`, targeted file reads, and route/service/model inventories.
- High-risk workflows reviewed first: cash receipts/payments/adjustments, invoices, returns, inventory/batches/stock movements, accounts/ledger, quotations/e-orders/bilty, dashboard/reporting.
- Existing design duplication context was reused from `duplicate-styles-summary.md` and `feature-module-refactoring-guide.md`.
- Runtime verification was limited to non-mutating checks:
  - `npm run build` in `frontend`.
  - `npm test -- --runInBand` in `Backend`.

## Requirements Workbook Review

The `requirements/` folder was read as the product source of truth. It contains six Excel workbooks:

- `00000020-Indus Traders Data  Inputs Requirments (1st Phase) (2).xlsx`
- `00000114-Item Registration New Software Inputs (2).xlsx`
- `00000115-Accounts (2).xlsx`
- `Accounts (1) (1).xlsx`
- `Billing software.xlsx`
- `Item Registration 2 (1).xlsx`

Important source notes:

- `Billing software.xlsx` is the most complete requirement workbook. It contains the phase-1 module list plus detailed layouts for sales invoice, purchase invoice, cashbook, cash adjustment, e-order, scheme/bonus, salary, quotation, purchase order, warehouse, warehouse stock movement, bilty, and capital.
- The two account workbooks are near-duplicates. They define account setup lists, the account registration form, system user creation, account list columns, salary/target setup, salary list, and employee list.
- The two item-registration workbooks are near-duplicates. `Item Registration 2 (1).xlsx` appears newer because it adds item code and clarifies barcode creation.
- `00000020-Indus Traders...` is the phase-1 menu map. It is useful as the module checklist but not detailed enough for field-level implementation.

## Requirement Coverage And Gap Map

Legend: `Present` means route/page/model support exists. `Partial` means the module exists but has workflow, contract, UI, reporting, or verification gaps. `Gap` means no clear implemented surface was found. `Drift` means implementation exists but the API/page/model shape differs from the workbook.

| Requirement area | Workbook requirement | Current implementation evidence | Coverage | Gap / action |
|---|---|---|---|---|
| Sales invoice | New sales and return sales invoice; account title with balance/town; other title; advance tax from account; normal vs sales tax invoice; claim account; box/unit quantity; warehouse; batch/expiry; GST; discounts; totals; save/print/list. | Frontend `/sales-invoices`; backend `/v1/invoices/sales`; `Invoice.js` supports sales/return, claim account, tax invoice type, advance tax, GST 18/4, box/unit quantities, warehouse/batch fields, totals. | Mostly Present / Print Verified in browser | Workbook workflow mostly exists, and focused Playwright smoke now proves the mounted sales invoice list can find, preview, and print a seeded admin invoice through the live A4 popup path. Remaining gaps are broader payment/state drift, stock source-of-truth risks, return/delete behavior, and deeper report/export workflow proof beyond the current sales-invoice print slice. |
| Purchase invoice | New purchase and purchase return; supplier/account; bill no; salesman/dimension; batch/expiry; warehouse; box/unit quantity; GST 18/4; advance tax; duplicate supplier bill protection; list/print. | Frontend `/purchase-invoices`; backend canonical route `/v1/invoices/purchase`; `create-purchase-invoice` includes box/unit, warehouse, batch, GST 18/4, advance tax. | Mostly Present / Print and export verified in browser | Legacy `/v1/purchase-invoices` duplicate mount was removed. The list now renders supplier titles from the populated supplier contract, the visible print action opens a record-specific invoice popup, and focused Playwright smoke proves print plus CSV export for a seeded purchase invoice. Remaining gaps are purchase return stock/ledger workflow proof and any deeper workbook-specific output expectations beyond the current invoice print/export slice. |
| Purchase order | Party account, PO no, bill no, item detail, box/unit qty, TP rates, discount, net amount, list/edit/delete/print. | Frontend `/purchase-orders`; backend `/v1/purchase-orders`; conversion navigation now opens `/purchase-invoices/edit/:id`, which is a mounted frontend route. | Mostly Present / Print and export verified in browser | Module exists, converted invoices navigate to a valid route, and focused Playwright smoke now proves the live list can print the seeded purchase order through the mounted detail route and export a filtered CSV. Remaining gaps are deeper workbook-column confirmation and broader conversion side-effect/browser workflow proof beyond the current print/export slice. |
| E-order | Party account, date auto, item detail, formula size, item qty, box/unit qty, scheme qty, GST rate, discount, estimated amount, list/edit/delete/print. | Frontend `/e-orders`; backend `/v1/e-orders`; salary package references mobile order incentive. | Partial | Need verify e-order line-item calculations, scheme quantity, print/list columns, and whether mobile order incentive is fed by real e-orders. |
| Quotation | Party account, reference number, one-month validity, dynamic hide/show columns per party, item/company/packing/retail/TP/discount/offered rate, list/edit/delete/print. | Frontend `/quotations`; backend `/v1/quotations`; quotation history and rate suggestions routes exist. | Partial | Core module exists, but dynamic per-party column visibility and print format need confirmation. Frontend had out-of-theme dialog issues in earlier UI review. |
| Cashbook receive/payment | Receive/payment selector, account with balance, cash account with balance, salesman, detail reference, invoice allocation rows, received/paid/difference, post-dated cheque details, list/edit/delete/print. | Frontend `/cashbook`; canonical backend `/v1/cashbook`; services allocate to invoices and ledger. | Mostly Present / Verified in browser | Duplicate cash receipt/payment mounts were removed, cash/bank account posting now uses real account ids, invoice allocation fields update actual invoice totals, create/cancel/bounced-cheque chains run in MongoDB sessions, replica-set API tests now prove partial/full allocation, over-allocation rejection, cancel reversal, pending-invoice reads, and asset-account lookup, and focused Playwright smoke now proves cheque receipt create/cancel with seeded invoice allocation and the repaired cheque-date UI contract. |
| Cash adjustment | Account-to-account, user-to-user, employee-account-to-account movement; receive from, paid to, amount, status, list/edit/print/delete. | Frontend `/cash-adjustment`; backend `/v1/cash-adjustments`. | Partial | Need verify ledger posting rules, account/user/employee account validation, and print/delete behavior. |
| PDC / bank cheque | Bank cheque post-date system. | Frontend `/pdc`; backend `/v1/pdc`; cashbook has post-dated cheque endpoints. | Mostly Present / Verified in browser | Backend compatibility routes now prove pending, clear, and bounce with invoice/ledger rollback in replica-set API tests; the shared cashbook cheque create/cancel browser path is verified; and focused Playwright smoke now proves the dedicated `/pdc` screen can render and clear the seeded pending cheque row. Remaining gap: bank reconciliation tests and any wider cheque-history/reporting requirements beyond the pending-management surface. |
| Recovery summary | Cash recovery summary for bill recovery. | Frontend `/recovery-summary`; backend `/v1/recovery-summary`. | Mostly Present / Verified in browser | The mounted report now derives per-salesman and per-customer recovery, outstanding, overdue, and aging data from canonical sales invoice totals, with focused API proof using real cash receipt allocations, a frontend page aligned to that contract, and targeted Playwright smoke coverage against deterministic seeded recovery fixtures. |
| Item registration | Company, company group, formula/generic, formula size, category, subcategory, business type, supplier account, item code/name, carton/box/unit sizes, TP pricing, retail pricing, GST filer/non-filer, weights, max/min stock alerts, image, goods charges, no-sales alert days, barcode, active/inactive. | Frontend `/item-registration` and `/items`; backend `/v1/items`, `/v1/companies`, `/v1/company-groups`, `/v1/formulas`, `/v1/formula-sizes`, `/v1/categories`, `/v1/subcategories`, `/v1/business-types`; `Item.js` contains these fields including goods charges, no-sales alert days, barcode, stock limits, carton/box/weight/tax fields. | Mostly Present | Field surface is strong, and the enhanced `/items` registration dialog now has a production-ready layout instead of the previous collapsed overlay. Remaining gaps are duplicate item registration surfaces, unit conversion mapping defects recently seen, image persistence/upload runtime proof, and stock being split across item/inventory/batch. |
| Item registration | Company, company group, formula/generic, formula size, category, subcategory, business type, supplier account, item code/name, carton/box/unit sizes, TP pricing, retail pricing, GST filer/non-filer, weights, max/min stock alerts, image, goods charges, no-sales alert days, barcode, active/inactive. | Frontend `/item-registration` and `/items`; backend `/v1/items`, `/v1/companies`, `/v1/company-groups`, `/v1/formulas`, `/v1/formula-sizes`, `/v1/categories`, `/v1/subcategories`, `/v1/business-types`; `Item.js` contains these fields including goods charges, no-sales alert days, barcode, stock limits, carton/box/weight/tax fields. | Mostly Present / Verified in browser | Field surface is strong, the enhanced `/items` registration dialog now has a production-ready layout, and focused Playwright smoke proves a new item can be created through the live dialog and returned to the list. Remaining gaps are duplicate item registration surfaces, image persistence/upload runtime proof, and stock being split across item/inventory/batch. |
| Item list | Company, item name, available qty, last purchase price, average purchase rate, total cost, unit sale rate, generic size/category, search and popup detail. | Frontend `/items` and `/item-registration`; backend item APIs. | Mostly Present / Export verified in browser | The enhanced item list now loads, searches, shows created items after dialog save, and exports through the mounted `/v1/items/export` route instead of a placeholder action. Remaining gap: confirm workbook-specific list columns such as average purchase rate against backend aggregates and client expectations. |
| Supporting master data | Company, company group, category, subcategory, formula/generic, formula size, business type, town, area, customer type, account head, designation, dimension. | Frontend `/master-data`; backend mounts all listed supporting routes. | Present / Partial | CRUD surfaces exist. Need remove duplicate/inconsistent metadata pages and verify all select dropdowns load from canonical endpoints. |
| Account registration | Account manager, sub account, employee account; dimension; parent account; designation; customer type; head; town/area; address; English/Urdu title; proprietor/store contact; credit limit/days; three bank info blocks; location pin; opening balance; license/GST/NTN/NIC/SRB; filer/non-filer tax; income tax; email; profit share account/percent; signatures; active/inactive. | Frontend `/accounts/registration` and `/accounts/registration/:id` host the fuller workbook registration screen; account-list create/edit actions use it; `/accounts/create` and `/accounts/edit/:id` redirect to it; backend `/v1/accounts`, `/v1/account-heads`, `/v1/towns`, `/v1/areas`, `/v1/dimensions`, `/v1/customer-types`, `/v1/designations`; account registration TS maps many workbook fields and now writes through `/v1/accounts`. | Mostly Present / Verified in browser | Workbook account manager/sub-account types pass canonical `/v1/accounts` validation, optional blank fields are accepted, edit saves avoid resetting current balance, referenced fields populate for edit/list, and focused Playwright smoke now proves create plus edit round-trip with deterministic master-data lookups and API verification of persisted workbook-style fields. Remaining gap: decide whether to delete or archive the older smaller account form component if no longer needed. |
| Account list | ID, title, town, dimension, salesman, credit days/limit, total balance, print preview, status best/medium/low and active/inactive. | Frontend `/accounts`; backend `/v1/accounts` now populates town, dimension, area, account head, customer type, route, and salesman references for list rendering. | Mostly Present / Needs runtime proof | List now shows account/code, title, town, dimension, salesman, balance, credit limit/days, quality status, active status, and print preview. Remaining gap: confirm quality-status business rules with the client and test populated list rendering with real data. |
| System users | Select account, select dimension, username, password, email, SMS OTP number, user list. | Frontend `/users`; backend `/v1/users`, `/v1/auth`, `/v1/sms`; account registration/user services exist. | Partial | Users exist, but requirement says system user should be created from account + dimension. Need verify user-account linkage and SMS OTP phone mapping. |
| Salary package and targets | Salary package by duration, employee, basic pay from biodata, sales target, recovery target, daily allowance, petrol/bike, mobile package, mobile order incentive, mobile cash recovery incentive, visit/order targets, Eid bonuses, brand/item incentives. | Frontend `/salary-packages`, `/salary/calculate`, `/targets/dashboard`, `/salary-sheet`; backend `/v1/salary-packages`, `/v1/salary`, `/v1/targets`, `/v1/salary-sheets`. | Mostly Present / Verified in current slice | Frontend salary services no longer fabricate packages, employees, items, or calculations; backend salary packages use canonical employee accounts; the salary package list now reads real monthly visit snapshots; and the route-plan/order/recovery-backed target metrics are proved through dashboard, employee-target, salary-calculation, salary-sheet, and browser smoke coverage. Remaining gaps are deeper workbook-specific print/export expectations beyond the current popup layouts. |
| Salesman route plan | Monthly route plan and sales target. | Frontend `/route-plans`, `/salesman`; backend `/v1/route-plans`, `/v1/salesmen`, `/v1/targets`. | Mostly Present / Verified in salary slice | The route-plan-to-target chain is now proved end to end for the salary/targets workflow via seeded area planning, planned-customer visits, mobile orders, and recovery metrics flowing into the mounted target and salary endpoints. Remaining work is broader browser CRUD proof on the route-plan management UI itself. |
| Scheme/bonus/claim | Claim account creation, company/group scheme, discount 2, scheme 2, TO, active/inactive, claim list. | Frontend `/schemes`; backend `/v1/schemes`, `/v1/claim-accounts`; invoice fields include scheme/discount/TO/claim account. | Partial | Core pieces exist, but claim-account accounting and invoice scheme application need runtime verification. |
| Warehouse | Warehouse create/list with name/address; warehouse stock movement from/to warehouse, item/formula size, carton/box/unit qty, total unit qty, movement list/edit/delete/print. | Frontend `/warehouses`, `/inventory`, `/batches`; backend `/v1/warehouses`, `/v1/inventory`, `/v1/stock-movements`. | Partial / High risk | Routes exist, but inventory has multiple write sources and route-order shadowing in stock movement routes. Must standardize stock truth before relying on reports. |
| Bilty | Receive/send selector, date, party account, claim account, transporter, agent/amount, bilty no, total nug, nug detail by single/double/triple/bundle/kata, bilty amount, list/status/edit/delete/print. | Frontend `/bilty`; backend `/v1/bilty` and `/v1/bilty-receipts`; `BiltyReceipt.js` supports bilty type, claim account, transporter, agent, bilty no, total nug, nug detail, amount, status. | Mostly Present | The workbook-style standalone bilty receipt flow is now aligned on `/bilty-receipts`, with explicit sent/received status transitions, canonical frontend service/model usage, and a record-specific print layout. Remaining gap: browser proof on a running stack and any deeper workbook-format print/export requirements. |
| Capital | Capital asset name, cash account balance, investor/proprietor account, in/out amount, status, fixed capital list, running capital list, net capital value. | Frontend `/capital`; backend `/v1/capital`; investor routes exist. | Mostly Present | Backend ledger/net-capital contracts are proved, and the frontend now loads cash and investor accounts from the real account types while rendering the mounted capital statement. Remaining gap: browser proof on a running stack and any workbook-specific print/output expectations. |
| Investor profit share | Investor program for profit share. | Frontend `/investors` and profit share page; backend `/v1/investors`, `/v1/investor-profit-share`. | Partial | Surface exists. Earlier UI review showed out-of-theme profit share page; calculation rules need accounting verification against account profit share fields. |
| Tax management | Income tax, advance withholding tax, GST, filer/non-filer rates; tax config/reporting. | Frontend `/tax-config`; backend `/v1/tax`, `/v1/reports/tax`; invoice/account/item tax fields exist. | Partial | Core data exists, but tax report generation has placeholder evidence and tax config UI had overlapping fields. Needs contract and report completion. |
| Expenses | Expense management. | Frontend `/expenses`; backend `/v1/expenses`, `/v1/expense-categories`. | Present / Partial | Surface exists. Need verify ledger posting and report integration. |
| Letters/agreements | Letters and agreements. | Frontend `/letters`; backend `/v1/letters`. | Mostly Present | CRUD surface is mounted and the frontend now aligns to the real letter-type/status contract with a record-specific printable layout. Remaining gap: browser proof on a running stack and any workbook-specific export/template requirements beyond the current print layout. |
| SMS/notifications | SMS and notification; OTP number for users. | Backend `/v1/sms`; user/account fields mention SMS OTP number; notification services exist. | Partial | Need verify frontend exposure, OTP flow, and production provider configuration. |
| Email/security/login alert | Email and security login alert. | Backend auth/user/email-related dependencies exist, and `/api/v1/auth` now has Redis-backed session revocation/refresh rotation; frontend login-alert UX is still not mapped. | Partial / Backend auth hardened | Requirement exists, and the backend auth/session contract is now stronger, but no confirmed login alert, OTP, or frontend security-notification workflow was mapped yet. Continue the auth/security audit pass from this improved baseline. |
| Graphic layout/dashboard | Graphs/charts/reporting panel. | Frontend dashboard route exists and chart libraries are installed; backend `/v1/dashboard` and `/v1/reports/analytics/*`. | Partial | Frontend services were aligned from `/analytics/*` to `/reports/analytics/*`. Remaining gap is actual chart/card UX completion and runtime validation with real data. |
| Reports panel / print preview | Second phase: multipurpose reports panel and print preview. | Backend has multiple report routes and print routes; frontend has list print/export actions. | Partial / Gap | Report/print exists but has placeholder implementations and fragmented mounts. Treat as not production-complete until output is verified. |

## Requirement-Level Priorities

1. P0: Dashboard/reporting API alignment because workbook requires graph/report panels and the current frontend/backend analytics paths do not match.
2. P1: Inventory source-of-truth cleanup because workbook stock workflows depend on warehouse, batch/expiry, available quantity, and stock movement detail being consistent.
3. P1: Sales/purchase invoice workflow tests because workbook invoice forms are detailed and financial/stock/tax side effects must be proven end to end.
4. P1: Bank-reconciliation runtime proof because cheque compatibility routes and the standalone `/pdc` screen are now browser-proved, but downstream reconciliation/reporting behavior still needs verification.
5. P1: Report/print/export runtime proof because workbook-specific outputs still need deeper than route-exists coverage.
6. P2: UI standardization after contract fixes, using the workbook forms as the field checklist and the global design system as the implementation style.

## Executive Summary: Top 10 Actionable Risks

| # | Severity | Area | Evidence | Recommended fix |
|---|---|---|---|---|
| 1 | P0 | Payment-state consistency beyond cashbook | Implemented code now wraps receipt/payment create, cancel, bounced-cheque reversal, invoice allocations, and ledger entries in MongoDB sessions, with accounting-field edits blocked after posting. Replica-set API tests and focused Playwright smoke now prove cashbook cheque receipt create/cancel plus dedicated `/pdc` clear behavior on top of the PDC pending/clear/bounce compatibility routes. | Extend payment-state proof to non-cashbook invoice flows, then keep the shared invoice payment recomputation path canonical while adding bank-reconciliation/report regression coverage. |
| 2 | P0 | Ledger account integrity | Implemented code now resolves real active cash/bank `Account` documents through `cashAccountResolver` and no longer writes `BANK_ACCOUNT` or `CASH_ACCOUNT` sentinel ids. | Seed/validate required cash and bank accounts per environment and add startup health checks for missing system accounts. |
| 3 | P0 | Frontend analytics APIs | Frontend analytics/dashboard services were aligned to `/reports/analytics/*` and `/reports/*`, matching mounted backend report routes. | Add service contract tests and dashboard smoke tests so future chart work cannot drift back to unmounted paths. |
| 4 | P1 | Accounting ledger API | Frontend `account-ledger.service.ts` now uses mounted `/accounts/:id/ledger`, `/accounts/:id/balance`, and `/accounts/:id/transactions` endpoints instead of `/accounting/ledger`. | Add Angular service contract tests for exact mounted URLs and backend route tests for ledger pagination/date filters and balance adjustment ledger entries. |
| 5 | P1 | Express route shadowing | Static/nested routes in stock movement, scheme, company group, sales return, and cashbook routes were moved ahead of generic `/:id` handlers. | Add route-level regression tests for each specific path. |
| 6 | P1 | Duplicate API surfaces | Removed the duplicate cash receipt/payment, purchase invoice, non-versioned warehouse/inventory/route/quotation/rate/print mounts and deleted stale cash receipt/payment route/controller files. | Keep a canonical route map and add tests to catch accidental alias reintroduction. |
| 7 | P1 | Inventory source of truth | Inventory logic spans `Inventory`, `Item.inventory.currentStock`, `Batch`, and `StockMovement`; services contain legacy/fallback direct item stock updates and sync helpers. | Make `Inventory` plus `StockMovement` the write source of truth. Treat `Item.inventory.currentStock` as derived/cache only, updated by one sync path. |
| 8 | P1 | Invoice/payment state drift | Cashbook services now use a shared invoice allocation/reversal helper for actual `totals.paidAmount`, `totals.dueAmount`, and `paymentStatus` fields, but the broader invoice model still has overlapping top-level and totals payment fields. | Extend the shared payment-state contract to returns, adjustments, and manual invoice actions; consider deprecating duplicate top-level payment fields. |
| 9 | P2 | Exposed placeholders and unfinished features | `printController.js`, `invoicePrintService.js`, `taxController.js`, `reportService.js`, and frontend TODOs expose placeholder/report/export logic. | Mark unfinished routes as disabled or feature-flagged until implemented, or return clear 501 responses. |
| 10 | P2 | UI/design duplication | Existing reports identify hardcoded tokens, duplicate batch design system, duplicate Material overrides, and duplicated card/form/table mixins. User-visible issues confirm inconsistent dialogs, cards, select panels, and overlapping labels. | Continue consolidation into global tokens/mixins and a standard dialog/list/card contract. Remove feature-local theme systems after migration. |

## Backend Findings

### 1. Cashbook, receipt, and payment flows need runtime transaction proof

Severity: P0  
Affected files:

- `Backend/src/services/cashPaymentService.js`
- `Backend/src/services/cashReceiptService.js`
- `Backend/src/services/ledgerService.js`
- `Backend/src/models/Invoice.js`

Evidence:

- `cashPaymentService.createPayment()` and `cashReceiptService.createReceipt()` now execute validation, payment document creation, invoice allocation updates, and ledger entries inside `session.withTransaction()`.
- `cancelCashPayment()`, `cancelCashReceipt()`, and bounced-cheque reversal now reverse invoice allocations and ledger entries in the same transaction chain.
- `ledgerRepository`, `ledgerService`, `invoicePaymentAllocationService`, and `cashAccountResolver` now accept and pass the active MongoDB session.
- Posted accounting fields are blocked from direct edit; amount, account, payment method, date, and allocations require cancel/recreate.

Risk:

- The implementation relies on MongoDB transactions; deployments must use a transaction-capable topology.
- Counter sequence generation still happens through the existing counter service and should be validated under concurrent load.
- Backend API workflows are now confirmed with real customer/supplier invoices, cash accounts, PDC clear/bounce, cancel cases, pending-invoice reads, and asset-account lookup against a MongoDB replica-set test database. Focused browser workflows now also prove the cashbook cheque receipt create/cancel path with seeded live data.

Recommended fix:

- Maintain the replica-set API integration tests for cashbook/PDC workflow regression coverage.
- Add broader failure-injection tests for invoice allocation failure and ledger write failure beyond the current focused rollback contract.
- Validate counter behavior under concurrent cash receipt/payment creation.
- Add Playwright smoke tests for partial allocation, over-allocation, cancel, cheque clear/bounce, and pending invoice refresh.

### 2. Cash and bank ledger account ids now resolve real accounts, but seeding must be enforced

Severity: P0  
Affected files:

- `Backend/src/services/cashPaymentService.js`
- `Backend/src/services/cashReceiptService.js`
- `Backend/src/services/ledgerService.js`

Evidence:

- Payment and receipt ledger entries now use `payment.cashAccountId` / `receipt.cashAccountId`, resolved by `cashAccountResolver`.
- `cashAccountResolver` accepts an explicit `cashAccountId` or finds an active cash/bank account by account category/type/code/name fallback.
- `ledgerService.validateAccount()` still validates `Account` entries with `Account.findById(accountId)`, so missing system accounts fail fast.

Risk:

- Environments without an active cash/bank account cannot post receipts/payments.
- Fallback matching by account type/code/name is practical but should be replaced by explicit seeded system account codes.

Recommended fix:

- Add chart-of-accounts seed data for required codes, for example `CASH_IN_HAND` and `BANK_MAIN`.
- Add startup or health-check validation that required system accounts exist.
- Prefer explicit `cashAccountId` from the frontend where the user selects the cash/bank account.

### 3. Route mount drift and compatibility sprawl

Severity: P1, reduced after cleanup  
Affected file: `Backend/src/routes/index.js`

Evidence:

- Duplicate cash receipt/payment and purchase invoice mounts were removed from `Backend/src/routes/index.js`.
- Non-versioned warehouse, inventory, route, quotation history, rate suggestion, and print aliases were removed.
- Stale unmounted `cashReceiptRoutes.js`, `cashPaymentRoutes.js`, `cashReceiptController.js`, and `cashPaymentController.js` were deleted after `/v1/pdc` moved to `cashBookController`.
- Report routes are split across `/v1/reports`, `/v1/reports/sales`, `/v1/reports/financial`, `/v1/reports/inventory`, and `/v1/reports/tax`.

Risk:

- New frontend work has fewer stale mounts to target.
- Reporting remains split across several route files and still needs a published route-to-page contract.

Recommended fix:

- Publish a canonical API map beside `app.routes.ts` / `routes/index.js`.
- Add route-level contract tests for canonical endpoints.
- Require an explicit compatibility note before adding any future alias mount.

### 4. Express route ordering was corrected for known shadowed routes

Severity: P1, reduced after cleanup  
Affected files:

- `Backend/src/routes/stockMovementRoutes.js`
- `Backend/src/routes/schemeRoutes.js`
- `Backend/src/routes/companyGroupRoutes.js`
- `Backend/src/routes/salesReturnRoutes.js`

Evidence:

- Static and nested routes in stock movement, scheme, company group, sales return, and cashbook routes were moved ahead of generic `/:id` handlers.
- Known affected paths include stock movement item/history/balance routes, scheme/company routes, company group/company routes, sales return/invoice routes, and cashbook pending/statistics routes.

Risk:

- Route shadowing is reduced for the scanned known cases.
- Future route additions can regress if generic `/:id` handlers are placed too early.

Recommended fix:

- Add tests that hit each specific route before and after generic ID routes.
- Keep a route-order lint/review checklist for Express routers.

### 5. Inventory and stock have multiple write paths

Severity: P1  
Affected files:

- `Backend/src/services/inventoryService.js`
- `Backend/src/services/stockMovementService.js`
- `Backend/src/services/stockTransferService.js`
- `Backend/src/models/Inventory.js`
- `Backend/src/models/Item.js`
- `Backend/src/models/Batch.js`

Evidence:

- `inventoryService.js` contains legacy fallback direct item updates when no warehouse is provided.
- `stockMovementService.js` has a backward-compatibility fallback to direct `Item` updates.
- `Inventory.js` and `Item.js` keep legacy/backward-compatible fields.
- Sales invoice confirmation writes stock movement, inventory, batch, and item/customer state inside a transaction, but lower-level inventory utilities still support non-transactional fallbacks.

Risk:

- Stock can disagree by screen: item list, batch screen, stock overview, warehouse stock, and dashboard may not read the same truth.
- Direct item fallback paths bypass warehouse and batch granularity.

Recommended fix:

- Establish this write rule: every stock-changing action writes a `StockMovement` and updates `Inventory`; `Batch` is updated only when batch tracking applies; `Item.inventory.currentStock` is derived.
- Remove or isolate direct item fallbacks behind a migration-only service.
- Add reconciliation checks: sum `Inventory.quantity` by item equals item current stock, and stock movements reconcile to inventory deltas.

### 6. Invoice model carries overlapping status and payment fields

Severity: P1  
Affected files:

- `Backend/src/models/Invoice.js`
- `Backend/src/services/salesInvoiceService.js`
- `Backend/src/services/purchaseInvoiceService.js`
- `Backend/src/services/cashReceiptService.js`
- `Backend/src/services/cashPaymentService.js`

Evidence:

- `Invoice.js` contains `status`, `paymentStatus`, `totals.paidAmount`, `totals.dueAmount`, top-level `paidAmount`, and top-level `dueAmount`.
- Pre-save hooks recompute totals and payment-related values.
- Cash services now use `invoicePaymentAllocationService`, but other invoice-affecting workflows still need to adopt the same helper.

Risk:

- Status can mean workflow status in one flow and payment status in another.
- Payment screens, reports, and overdue filters can still disagree if non-cashbook flows update different invoice payment fields.

Recommended fix:

- Keep `status` for workflow only: draft, confirmed, cancelled, etc.
- Keep `paymentStatus` for payment only: pending, partial, paid.
- Extend the shared recomputation helper for `paidAmount`, `dueAmount`, and `paymentStatus` beyond cashbook.
- Add invariant tests around invoice totals after payments, returns, adjustments, and cancellation.

### 7. Dashboard and analytics are split across overlapping services

Severity: P1  
Affected files:

- `Backend/src/controllers/dashboardController.js`
- `Backend/src/controllers/enhancedDashboardController.js`
- `Backend/src/services/dashboardService.js`
- `Backend/src/services/dashboardOverviewService.js`
- `Backend/src/services/analyticsService.js`
- `Backend/src/services/enhancedAnalyticsService.js`
- `Backend/src/routes/reportRoutes.js`
- `Backend/src/routes/index.js`

Evidence:

- There are separate dashboard and enhanced dashboard controllers/services.
- Analytics routes exist under `/v1/reports/analytics/*`.
- No `/v1/analytics` mount exists in `index.js`.

Risk:

- Dashboard cards and charts can read different definitions of the same KPI.
- Frontend chart work can succeed visually while calling dead endpoints.

Recommended fix:

- Define a dashboard API contract with one endpoint per visual block:
  - KPI cards,
  - sales trend,
  - collection trend,
  - stock risk,
  - receivables aging,
  - payables or expense breakdown,
  - recent activity.
- Make dashboard services consume the same aggregation layer as reports where possible.

### 8. Exposed placeholder and incomplete backend features

Severity: P2  
Affected files:

- `Backend/src/controllers/printController.js`
- `Backend/src/services/invoicePrintService.js`
- `Backend/src/controllers/taxController.js`
- `Backend/src/services/reportService.js`
- `frontend/src/app/features/items/components/item-list-enhanced/item-list-enhanced.component.ts`
- `frontend/src/app/features/inventory/components/stock-transfer/stock-transfer.component.ts`

Evidence:

- Print and PDF generation contain placeholder/TODO paths.
- Tax report generation contains placeholder implementation comments.
- Report service has fallback/placeholder commission logic.
- Frontend has TODOs for export/barcode/delete behavior.

Risk:

- UI may present actions that appear functional but are incomplete.
- Manual testing may pass navigation while business output is wrong or empty.

Recommended fix:

- Mark incomplete endpoints as 501 or feature-flag them.
- Hide frontend buttons until the backend contract is implemented.
- Add smoke tests for print/export/report endpoints that assert non-placeholder output.

### 9. Duplicate route files and naming drift

Severity: P2  
Affected areas:

- Controllers: `accountController.js` and `accountsController.js`; `dashboardController.js` and `enhancedDashboardController.js`; `biltyController.js` and `biltyReceiptController.js`; `salesmanController.js` and `salesmanSelfServiceController.js`.
- Services: `dashboardOverviewService.js` and `dashboardService.js`; `analyticsService.js` and `enhancedAnalyticsService.js`; `socketService.js` and `websocketService.js`; `purchaseSchemeTracking.js` and `purchaseSchemeTrackingService.js`.
- Models: mixed naming/casing such as `Account.js`, `accounthead.js`, `business.js`, `companygroup.js`, `dimensionbranch.js`.

Risk:

- Developers may fix the wrong module.
- Imports can become case-sensitive deployment bugs on Linux.
- Compatibility code may outlive the migration.

Recommended fix:

- Add an ownership map for each duplicate concept.
- Rename only with tests and route coverage.
- Archive or delete unmounted modules after confirming no imports.

## Frontend Findings

### 1. Analytics service calls unmounted APIs

Severity: P0  
Affected files:

- `frontend/src/app/features/analytics/services/analytics.service.ts`
- `frontend/src/app/features/dashboard/services/realtime-dashboard.service.ts`
- `Backend/src/routes/index.js`
- `Backend/src/routes/reportRoutes.js`

Evidence:

- Frontend analytics base URL is `${environment.apiUrl}/analytics`.
- Realtime dashboard uses `/analytics/sales`, `/analytics/inventory`, `/analytics/customers`, `/analytics/operational`, `/analytics/financial`.
- Backend analytics routes are mounted as `/v1/reports/analytics/dashboard`, `/sales-trends`, `/top-customers`, `/top-items`, `/revenue-by-category`, `/profit-margins`, `/collection-efficiency`, `/inventory-turnover`, and `/kpis`.

Risk:

- Dashboard and analytics chart panels can render as empty or failed even though the backend has reporting routes.

Recommended fix:

- Decide whether the canonical contract is `/reports/analytics/*` or `/analytics/*`.
- Update frontend service methods and tests to match real backend names and response shapes.

### 2. Accounting ledger service points at an unmounted path

Severity: P1  
Affected files:

- `frontend/src/app/features/accounting/services/account-ledger.service.ts`
- `Backend/src/routes/index.js`

Evidence:

- Frontend base URL is `${environment.apiUrl}/accounting/ledger`.
- Backend route inventory does not mount `/v1/accounting/ledger`.
- Backend does mount `/v1/accounts`.

Risk:

- Account registration and chart of accounts pages may show list data while ledger-specific actions fail.

Recommended fix:

- Either mount accounting ledger routes or migrate the frontend to `/accounts` ledger endpoints.
- Add frontend service tests that assert exact endpoint paths.

### 3. Frontend route tree exposes feature surfaces not backed by a single canonical API map

Severity: P1  
Affected files:

- `frontend/src/app/app.routes.ts`
- `frontend/src/app/layout/sidebar/sidebar.component.ts`
- `Backend/src/routes/index.js`

Evidence:

- Frontend routes include dashboards, cashbook, e-orders, quotations, pdc, schemes, capital, bilty, recovery, salary, investors, tax config, and reports-like views.
- Backend exposes many of the same domains but with split reporting and compatibility mounts.

Risk:

- UI work can accidentally wire a page to an older or non-canonical endpoint.
- Sidebar visibility can imply a complete workflow where only the list or partial action exists.

Recommended fix:

- Create a route-to-API map in docs and keep it near `app.routes.ts`.
- For each page, identify:
  - list endpoint,
  - create/update endpoint,
  - delete/cancel endpoint,
  - report/export endpoint,
  - empty-state behavior.

### 4. Duplicate dialogs, cards, and form field styles remain a global design issue

Severity: P2  
Affected files:

- `duplicate-styles-summary.md`
- `feature-module-refactoring-guide.md`
- `frontend/src/app/features/batches/**`
- `frontend/src/app/features/analytics/**`
- `frontend/src/app/features/accounts/**`

Evidence:

- Existing duplicate-style summary identifies hardcoded colors, spacing, radii, shadows, button styles, card styles, form overrides, and transition values.
- Batches created a feature-local design system in `batch-enhanced-theme.scss`.
- Account and analytics components duplicate global card/form/button styles.
- User testing screenshots show overlapping labels, mismatched select/dropdown panels, black dialog action bars, and inconsistent stat card layouts.

Risk:

- Fixing one page does not fix the same issue elsewhere.
- New dialogs can regress because no standard component contract exists.

Recommended fix:

- Implement a single global dialog shell:
  - white header/body/footer,
  - standard sticky footer,
  - tokenized border/shadow/radius,
  - no dark action bars,
  - form-field label/placeholder collision rules.
- Implement a single global list page contract:
  - page header,
  - stat-card grid,
  - filter panel,
  - data table,
  - global empty row.
- Remove feature-level Material overrides after migration.

### 5. Frontend build succeeds, but tests are not part of the current verification loop

Severity: P2  
Evidence:

- `npm run build` in `frontend` completed successfully.
- Build warning: `sweetalert2` is CommonJS and can cause optimization bailouts.

Risk:

- Build success does not prove API contracts or user flows.
- UI regressions like label overlap require browser-level testing.

Recommended fix:

- Add Playwright smoke tests for core page load, create dialogs, table empty states, and key submit flows.
- Add HttpTestingController tests for each service endpoint path.
- Consider replacing or explicitly allowing the SweetAlert CommonJS dependency.

## Cross-Functional Findings

### Cash payment and invoice lifecycle disagreement

Current state:

- Backend payment services now post receipt/payment documents, invoice allocation updates, and ledger entries through transaction-aware helpers.
- Invoice model hooks still contain overlapping paid/due fields and may be touched by other workflows outside cashbook.
- Frontend cashbook likely trusts returned cashbook objects and pending invoice lists.

Failure mode:

- Non-cashbook workflows such as returns, adjustments, and manual invoice changes can still drift if they bypass the shared allocation helper.

Action:

- Extend the shared payment allocation domain service to returns, adjustments, and manual invoice changes.
- Make frontend display allocation state returned from this service, not recompute independently.

### Dashboard expectation versus backend contract

Current state:

- User expectation is interactive cards, charts, pie charts, and graph widgets.
- Frontend has chart libraries installed: `chart.js` and `ng2-charts`.
- Backend analytics routes exist under reports, while frontend dashboard realtime service calls `/analytics/*`.

Failure mode:

- Dashboard may show static cards with zeros or empty panels because contract paths do not align.

Action:

- First fix the endpoint contract.
- Then build dashboard visuals from real API blocks:
  - Sales trend line chart from confirmed sales invoices.
  - Cash collection bar chart from cash receipts.
  - Receivables aging donut chart from outstanding invoices.
  - Stock risk chart from low/expired/near-expiry batches.
  - Profit and expense mix from financial reports.

### Inventory page disagreement

Current state:

- Frontend has batches, stock overview, stock adjustment, physical count, purchase invoices, sales invoices, and transfers.
- Backend has inventory management routes, stock movement routes, batch routes, inventory service utilities, stock adjustment services, and compatibility item stock fallbacks.

Failure mode:

- One page can show stock from `Item`, another from `Inventory`, another from `Batch`, and another from movement history.

Action:

- Publish a stock read contract:
  - stock list reads from `Inventory` aggregation,
  - batch pages read from `Batch`,
  - audit/history reads from `StockMovement`,
  - item master shows derived stock only.

### Reports and print/export disagreement

Current state:

- Frontend presents report/export/print style actions in several modules.
- Backend print/PDF/tax/report features include placeholders and separate report mounts.

Failure mode:

- Users can click actions that produce incomplete, placeholder, or stale output.

Action:

- Build a report readiness matrix before adding more UI.
- Hide actions with no production backend implementation.

## Refactoring Roadmap

### P0: Fix before more UI expansion

1. Cash receipt/payment browser workflow proof  
   Label: quick fix smoke tests after backend runtime proof  
   Modules: `cashPaymentService`, `cashReceiptService`, `ledgerService`, `Invoice`  
   Outcome: backend posting is already proven against replica-set API workflows; browser forms still need to prove they drive those contracts correctly.

2. Ledger system account seeding  
   Label: quick fix if chart accounts already exist; otherwise needs seed/design decision  
   Modules: cashbook services, account seed/config  
   Outcome: every environment has explicit cash/bank ledger accounts and no fallback ambiguity.

3. Analytics endpoint contract tests  
   Label: quick fix  
   Modules: frontend analytics/dashboard services, backend report routes  
   Outcome: dashboard/chart services keep calling mounted endpoints with tested response shapes.

### P1: Stabilize contracts and workflow correctness

1. Route ordering regression tests  
   Label: quick fix  
   Modules: stock movements, schemes, company groups, sales returns  
   Outcome: specific routes remain reachable before generic `/:id`.

2. Canonical API map  
   Label: quick fix for current canonical routes; design decision for any future aliases  
   Modules: `Backend/src/routes/index.js`, frontend services  
   Outcome: one canonical endpoint per feature action, compatibility aliases documented.

3. Inventory source-of-truth cleanup  
   Label: needs design decision  
   Modules: inventory, stock movement, batch, item, invoice services  
   Outcome: stock changes reconcile across item, inventory, batch, and movement views.

4. Invoice payment state centralization  
   Label: needs design decision  
   Modules: invoice model/services, cashbook, returns, adjustments  
   Outcome: one service computes paid/due/paymentStatus for all payment-affecting actions.

5. Accounting ledger frontend/backend alignment  
   Label: quick fix if backend endpoints exist under `/accounts`; otherwise needs design decision  
   Modules: accounting frontend service, account routes/controllers  
   Outcome: account ledger UI calls real mounted endpoints.

### P2: Reduce maintenance drag and UX inconsistency

1. Standard global UI contracts  
   Label: needs design decision  
   Modules: global SCSS tokens/mixins, dialogs, stat cards, list pages, tables  
   Outcome: no feature-local card/dialog/table styling unless intentionally extended.

2. Remove or flag placeholders  
   Label: quick fix  
   Modules: print, PDF, tax reports, exports, unfinished frontend actions  
   Outcome: incomplete features are hidden or return explicit 501 responses.

3. Duplicate module cleanup  
   Label: needs design decision  
   Modules: dashboard/enhanced dashboard, analytics/enhanced analytics, account/accounts, socket/websocket, salesman self-service  
   Outcome: one owner per business concept.

4. Legacy test harness cleanup  
   Label: quick fix  
   Modules: backend Jest config, frontend service tests, Playwright smoke suite  
   Outcome: stale Mocha/Chai tests are migrated or removed, while Jest/build/Playwright validate API contracts and user flows.

## Verification Results

### Static inventory

Completed:

- Backend route mount scan from `Backend/src/routes/index.js`.
- Frontend route scan from `frontend/src/app/app.routes.ts`.
- Backend controller/service/model duplicate concept scan.
- Cash payment, cash receipt, ledger, invoice model targeted review.
- Analytics/reporting frontend/backend URL comparison.
- Design duplication review from existing style reports.

### Frontend build

Command:

```powershell
cd frontend
npm run build
```

Result: Passed.

Current completion-slice build:

```powershell
npm run frontend:build
```

Result: Passed on 2026-05-05 after adding the QA smoke harness.

Notes:

- Angular completed bundle generation.
- Output path: `frontend/dist/pharma-management-system`.
- Warning: `sweetalert2` is CommonJS and may cause optimization bailouts.

### Backend tests

Command:

```powershell
cd Backend
npm test -- --runInBand
```

Result: Passed.

Summary:

- Test suites: 11 passed, 11 total.
- Tests: 302 passed, 1 skipped, 303 total.
- The main Jest harness now runs after adding `Backend/tests/setup.js`, excluding stale legacy `src/test` files, and repairing current unit-test drift.

Focused cashbook/PDC runtime workflow command:

```powershell
cd Backend
npm test -- --runInBand tests/salaryPackageApiContracts.test.js tests/cashbookPdcApiWorkflow.integration.test.js tests/cashbookTransactionContracts.test.js src/services/__tests__/inventorySourceOfTruth.test.js
```

Result: Passed on 2026-05-03.

Summary:

- Test suites: 4 passed, 4 total.
- Tests: 15 passed, 15 total.
- Coverage includes MongoDB replica-set API workflows for partial receipt, full supplier payment, over-allocation rejection/rollback, cancellation reversal, PDC pending/clear/bounce routes, and salary package/calculation contracts against canonical employee accounts.

Current full backend command:

```powershell
cd Backend
npm test -- --runInBand
```

Result: Passed on 2026-05-05.

Summary:

- Test suites: 17 passed, 17 total.
- Tests: 323 passed, 1 skipped, 324 total.
- Includes focused return-credit coverage for unpaid, partially paid, and fully paid original invoices.

Focused return-payment command:

```powershell
cd Backend
npm test -- --runInBand src/services/__tests__/invoicePaymentAllocationService.test.js src/services/__tests__/purchaseReturnService.test.js
```

Result: Passed on 2026-05-05.

Summary:

- Test suites: 2 passed, 2 total.
- Tests: 33 passed, 33 total.

Expanded touched-service command:

```powershell
cd Backend
npm test -- --runInBand src/services/__tests__/invoicePaymentAllocationService.test.js src/services/__tests__/purchaseReturnService.test.js src/services/__tests__/inventoryService.test.js src/services/__tests__/stockAdjustmentService.test.js
```

Result: Passed on 2026-05-05.

Summary:

- Test suites: 4 passed, 4 total.
- Tests: 104 passed, 1 skipped, 105 total.

### Browser smoke foundation

Commands:

```powershell
npm run qa:install
node --check qa/playwright.config.js
node --check qa/scripts/global-setup.js
node --check qa/scripts/seed-smoke-data.js
node --check qa/tests/auth.smoke.spec.js
node --check qa/tests/navigation.smoke.spec.js
node --check qa/tests/actions.smoke.spec.js
$env:QA_START_SERVERS='0'; $env:QA_SKIP_SEED='1'; npm run qa:list
```

Result: Passed on 2026-05-05.

Summary:

- QA dependencies installed with no vulnerabilities reported.
- Syntax checks passed for the Playwright config, seed/global setup scripts, and all new smoke specs.
- Playwright discovered 4 smoke tests across auth, navigation, and critical money/report action surfaces.

Full browser smoke status:

- `$env:QA_START_SERVERS='0'; $env:QA_SKIP_SEED='1'; npm run qa:smoke` was attempted on 2026-05-05 with server startup disabled; it failed with `net::ERR_CONNECTION_REFUSED` at `http://127.0.0.1:4200/login` because no frontend server was listening.
- `npm run qa:smoke` with server startup enabled was attempted on 2026-05-06. The first run caught Sass compile blockers, which were fixed. The rerun reached global seed setup and failed with `ECONNREFUSED` for local MongoDB at `localhost:27017`. Start local MongoDB or provide an approved smoke database URI before rerunning to capture the first real browser pass.

Warnings:

- Reservation tests still print handled `Failed to log stock movement` console errors because mocked stock movement writes miss `referenceId`/`createdBy`; they do not fail the suite, but this should be cleaned up to keep test output trustworthy.
- Mongoose reports a duplicate index warning on `{ timestamp: 1 }`.
- Jest force-exits because open handles remain; use `--detectOpenHandles` in a follow-up harness cleanup.

## Recommended Next Step

Start with browser proof and remaining contract cleanup before more visual work:

1. Install QA dependencies and run the new Playwright smoke suite against a local or approved smoke database.
2. Add route/service contract tests for dashboard analytics, purchase invoice, reporting export, and PDC canonical endpoints.
3. Migrate or delete the excluded legacy `src/test` Mocha/Chai files.

After that, continue the UI standardization work using the existing global token/mixin guide.
