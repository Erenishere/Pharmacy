# Project Completion Team Plan

Date: 2026-05-07
Scope: Complete the Indus Traders / pharmacy ERP requirements as a working product, with no user-facing placeholders on required workflows, and recover system performance on the busiest real screens.

## Team

| Role | Owner | Responsibility | Definition of done |
|---|---|---|---|
| Project Manager | Requirements and delivery lead | Own workbook-to-feature backlog, priority, acceptance criteria, dependency order, and audit updates. | Every requirement has a status, owner, acceptance criteria, and verification evidence. |
| Senior Developer / Architect | Technical lead | Own canonical architecture decisions, route/API contracts, performance budgets, transaction boundaries, source-of-truth decisions, duplicate cleanup sequencing, and test strategy. | High-risk workflows have one source of truth, one route contract, measured performance targets where applicable, and regression tests before cleanup. |
| Backend Developer | API/data owner | Complete backend routes, services, models, transactions, reports, print/export, seeds, integration tests, indexes, and cache strategy. | Backend endpoints are mounted, non-placeholder, measured on hot paths, tested, and aligned to frontend services. |
| Frontend Developer | UI/workflow owner | Complete visible workflows, remove broken navigation, hide or implement unavailable actions, wire pages to mounted APIs, and keep hot tables/forms responsive. | Required UI flows save/load/list/print/export through real contracts, feel fast on normal data volume, and pass build/smoke tests. |

## Ground Rules

- `requirements/` workbooks and `docs/system-actionable-audit.md` are the product source of truth.
- Backend mount source of truth: `Backend/src/routes/index.js`.
- Frontend route source of truth: `frontend/src/app/app.routes.ts`.
- No required workflow may show `coming soon`, console-only actions, fake totals, hardcoded reports, or dead routes.
- Unsupported non-required features must be hidden or return explicit `501`, not fake success.
- No hot list or entry screen should rely on pseudo-pagination, broad repeated lookup reads, or avoidable client-side merging when a canonical backend contract is possible.
- Each completion claim needs verification: backend Jest, frontend build, route/service contract test, integration test, browser smoke, or measured before/after timing as appropriate.

## Priority Backlog

### P0: Cashbook / PDC Production Proof

Owner: Backend Developer with Senior Developer review.

Scope:

- `/api/v1/cashbook`
- `/api/v1/pdc`
- `cashReceiptService`, `cashPaymentService`, `invoicePaymentAllocationService`, `ledgerService`, `cashAccountResolver`

Acceptance criteria:

- Receipt/payment creation allocates invoices, writes ledger entries, and updates `totals.paidAmount`, `totals.dueAmount`, and `paymentStatus`.
- Cancel and bounced cheque reverse invoice allocation and ledger entries.
- PDC pending/clear/bounce works through both cashbook and `/pdc` compatibility routes.
- Required cash/bank accounts are seeded or explicitly validated.

Verification:

- Replica-set MongoDB integration tests for receipt, payment, partial/full allocation, over-allocation rejection, cancel, clear cheque, bounce cheque, and rollback on ledger/allocation failure.
- Focused browser smoke for cashbook required fields and status transitions, plus follow-up proof for the dedicated `/pdc` screen and bank reconciliation behavior.

### P0: Reports, Print, Export, Dashboard

Owner: Backend Developer and Frontend Developer.

Scope:

- `/api/v1/reports/**`
- `/api/v1/print/**`
- dashboard analytics services and report pages

Acceptance criteria:

- No visible required report/print/export action returns placeholder data.
- Invoice print returns valid PDF/content.
- Tax/report/dashboard endpoints return real data or the UI hides unsupported actions.

Verification:

- API tests for content type and non-placeholder totals.
- Frontend service contract tests for `/reports/analytics/*` and `/reports/*`.
- Browser smoke for dashboard/report buttons.

### P0: System Performance Recovery

Owner: Senior Developer / Architect with Backend Developer and Frontend Developer.

Scope:

- Request latency for hot read/write flows.
- Slow Angular tables and list pages.
- Entry-form boot time caused by repeated lookup loading.
- Database index coverage, cache usage, and query-shape cleanup.
- Dashboard/report summary response time.

Acceptance criteria:

- The team captures a real baseline from monitoring and identifies the top slow routes instead of optimizing blindly.
- Hot list pages use canonical server-side pagination, sorting, totals, and filtering.
- No high-traffic screen depends on large repeated lookup fetches during first paint when those lookups can be cached, projected, or lazy-loaded.
- The first optimization wave closes the known visible hotspots in cashbook, account registration, and item list flows.
- Each performance claim includes before/after evidence, such as route timings, payload reduction, cache hit data, or browser interaction proof.

Verification:

- `/api/v1/monitoring/metrics/dashboard`
- `/api/v1/monitoring/metrics/slow-routes`
- `/api/v1/monitoring/indexes`
- Focused API contract tests and browser smoke for optimized screens.
- Living detail plan: `docs/system-performance-plan.md`

### P1: Inventory Source Of Truth

Owner: Senior Developer and Backend Developer.

Decision:

- `Inventory.quantity` per item/warehouse/batch is canonical on-hand stock.
- `StockMovement` is append-only audit.
- `Item.inventory.currentStock` is derived/cache only.

Acceptance criteria:

- Sales, purchases, returns, transfers, adjustments, reservations, and batch operations update stock through one mutation path.
- `Inventory`, `Batch`, `Item.currentStock`, and `StockMovement` cannot drift silently.

Verification:

- Reconciliation tests after purchase, sale, sales return, purchase return, transfer, adjustment, reservation/release/fulfill, and physical count.
- 2026-05-20 status: exact warehouse/batch removal is now protected by focused source-of-truth regression coverage and full backend Jest proof. Browser smoke still requires an approved smoke/test database before this lane can be called shipment-ready.

### P1: Invoice Workflow Correctness

Owner: Backend Developer and Frontend Developer.

Scope:

- Sales invoice, sales return, purchase invoice, purchase return, purchase order conversion

Acceptance criteria:

- Workbook fields round-trip: party balance/town, claim account, batch/expiry, warehouse, box/unit qty, GST 18/4, advance tax, discounts, duplicate supplier bill protection, list/print/delete rules.
- Converted purchase orders open valid purchase invoice route.
- Payment state is centralized beyond cashbook.

Verification:

- Backend service tests for stock, ledger, tax, and payment-state side effects.
- Frontend build and route-contract tests.

### P1: Account And Item Workbook Closure

Owner: Frontend Developer and Backend Developer.

Scope:

- Account registration/list
- Item registration/list
- supporting master-data dropdown integrity

Acceptance criteria:

- Account create/edit uses `/accounts/registration` and round-trips workbook fields through mounted APIs.
- Account/item lists show required workbook columns from canonical populated data.
- Supporting lookup dropdowns read mounted endpoints and avoid stale/local placeholder data.
- Duplicate smaller forms are either retired or explicitly kept as non-canonical support surfaces.

Verification:

- Focused backend route/service contract tests.
- Frontend build.
- Browser smoke for account and item create/edit/list flows.

### P1: Salary, Targets, Route Plans, Recovery

Owner: Backend Developer and Frontend Developer.

Scope:

- `/api/v1/salary-packages`
- `/api/v1/salary`
- `/api/v1/targets`
- `/api/v1/salary-sheets`
- `/api/v1/route-plans`
- `/api/v1/recovery-summary`

Acceptance criteria:

- Salary and target figures derive from one shared monthly-performance source.
- Route-plan, order, and recovery data feed visible target and salary surfaces consistently.
- No salary/target page falls back to mock or placeholder totals.

Verification:

- Focused API contract tests for dashboard, achievement, calculate, and salary-sheet endpoints.
- Targeted browser smoke with deterministic seed data.

### P1: Capital, Bilty, Letters, Report Surface Alignment

Owner: Backend Developer and Frontend Developer.

Scope:

- `/api/v1/capital`
- `/api/v1/bilty`
- `/api/v1/bilty-receipts`
- `/api/v1/letters`
- related print/report actions

Acceptance criteria:

- Capital statements and ledger impacts come from real transactions.
- Bilty and bilty-receipt surfaces use canonical status and print flows.
- Letters surface does not expose dead actions, stale filters, or placeholder printing.

Verification:

- Focused API contract tests.
- Frontend build and targeted browser smoke.

### P2: UI Standardization And Duplicate Surface Cleanup

Owner: Frontend Developer with Senior Developer review.

Scope:

- duplicate pages/dialogs
- styling drift
- non-blocking UX cleanup after contract correctness

Acceptance criteria:

- One canonical page per required workflow.
- Duplicate or stale screens are removed, hidden, or clearly non-canonical.
- UI cleanup does not reintroduce contract drift or placeholder behavior.

Verification:

- Frontend build.
- Focused smoke on affected routes.

## Working Order

1. Close broken or placeholder contracts first.
2. Prove the workflow with focused backend tests.
3. Prove the visible page path with frontend build and targeted smoke.
4. Only then clean duplicate surfaces or broaden styling/UI work.
5. Keep `docs/system-actionable-audit.md` and this file in sync after each verified slice.

## Current Performance First Slice

1. Completed 2026-05-07: cashbook canonical merged list contract with real totals, server-side sort/filter/page, and lighter form boot.
2. Completed 2026-05-07: account registration lookup boot reduction via one cached bundled lookup contract plus deferred heavy parent-account reads.
3. Completed 2026-05-07: item list search/sort/filter contract hardening plus cached filter datasets.
4. Completed 2026-05-08: repeatable measured performance baseline runner for hot routes, payload sizes, server response time headers, slow-route monitoring, cache stats, and database index snapshots.
5. Completed 2026-05-08: monitoring index snapshot uplift with parallel collection stats, short-route caching, and a benchmark budget entry for `/api/v1/monitoring/indexes`.
6. Completed 2026-05-08: backend warm-cache uplift for `/api/v1/accounts/registration-lookups` with supporting master-data invalidation.
7. Completed 2026-05-08: cashbook lookup-bundle optimization with projected `/api/v1/cashbook/lookups`, per-mode frontend caching, deferred supplier-mode boot, and focused API/build proof.
8. Completed 2026-05-31: item list database retrieval hardening with literal-safe keyword search, bounded pagination defaults, compound indexes for common item list filters/sorts, and concurrent shared pagination helper reads.
9. Next: run the baseline against the dev/staging dataset, then tune the worst measured route first.
