# System Performance Recovery Plan

Date: 2026-05-07
Scope: Make request-heavy workflows, entry forms, lists, tables, and reporting screens feel fast and stay fast as data volume grows.

## Why This Plan Exists

The current ERP already has many real production surfaces, but several patterns are making the system feel slow:

- Large Angular Material list screens are spread across accounts, customers, items, cashbook, capital, bilty, salary sheets, route plans, warehouses, and other modules.
- Some screens load multiple lookup datasets on every entry, including repeated `limit=500` calls for master data and account dropdowns.
- The cashbook screen currently merges receipts and payments in the browser after two separate API calls, then sorts client-side and paginates against the merged in-memory array.
- Shared backend performance utilities already exist (`/api/v1/monitoring`, cache middleware, compression, response-time tracking, Redis/L1 cache helpers, index analysis), but the hottest list and lookup routes are not consistently using them.
- Several list screens are server-paginated in concept, but still carry extra frontend render churn, duplicated loading logic, or weak sort/filter contracts.

This plan turns performance into a managed delivery stream with measurable targets, clear owners, and proof gates.

## Performance Targets

Targets for the busiest admin flows after the first optimization pass:

- P50 list API response for master-data screens: under 400ms
- P95 list API response for master-data screens: under 1200ms
- P50 lookup dropdown API response: under 250ms
- Warm-cache dashboard/report summary reads: under 800ms
- Save/create/update response for common entry forms: under 1500ms
- First visible table render after navigation on warm browser session: under 1500ms
- No table screen should fetch unbounded or pseudo-unbounded data for routine navigation

## Measured Hotspots To Fix First

### 1. Cashbook list and entry workflow

Evidence from current code:

- `frontend/src/app/features/cashbook/components/cashbook.component.ts`
- `frontend/src/app/features/cashbook/components/cashbook.component.html`
- `Backend/src/services/cashReceiptService.js`
- `Backend/src/services/cashPaymentService.js`

Observed issues:

- The UI makes separate receipt and payment requests, merges them client-side, sorts them client-side, and then paginates the merged result.
- The paginator length is bound to `dataSource.data.length`, so the list is effectively sized by the current in-memory merge instead of a canonical backend total.
- Entry mode also loads large customer, supplier, user, and cash-account lookups up front.

Required fix:

- Introduce one canonical backend cashbook entry-list contract that returns merged, filtered, sorted, paginated rows from the server.
- Keep receipt/payment posting logic separate internally, but stop making the UI build the final list itself.
- Split create-form lookups from list rendering so the screen can open fast before heavy dropdowns finish.

Status update 2026-05-08:

- Completed the next cashbook boot optimization wave. The backend now exposes `GET /api/v1/cashbook/lookups`, which returns projected party-account options for the active transaction type together with projected cash-account and salesman lists.
- `frontend/src/app/features/cashbook/services/cashbook.service.ts` now caches those projected lookup reads per transaction type with `shareReplay(1)`, and `cashbook.component.ts` uses that single contract instead of firing separate startup requests to `/customers`, `/users`, and `/accounts`.
- Receive-mode lookups now load through one projected request on page boot, supplier-only lookups stay deferred until payment mode is selected, and balance-changing save/delete actions clear the local lookup cache before reloading the current form data.
- Verified with `Backend/tests/cashbookLookupsApiContracts.test.js` and `npm run build` in `frontend`.

### 2. Account registration and account list

Evidence from current code:

- `frontend/src/app/features/master-data/components/account-registration/account-registration.component.ts`
- `Backend/src/services/accountService.js`

Observed issues:

- Screen load triggers many master-data requests immediately.
- Several lookups use broad active-list reads, including `dimensions`, `accounts`, and other reference data, before the user even starts typing.
- The account registration screen mixes entry-form concerns and list concerns in one page, which increases startup cost.

Required fix:

- Create a cached lookup bundle contract for account registration (`dimensions`, `designations`, `customer types`, `account heads`, `towns`) and lazy-load heavier relationships like parent accounts only when needed.
- Keep the account list server-paginated and searchable, but reduce initial screen boot by separating form boot from list boot.

Status update 2026-05-07:

- Completed the first account-registration boot optimization wave. The backend now exposes `GET /api/v1/accounts/registration-lookups`, which returns active dropdown-sized projections for dimensions, designations, customer types, account heads, and towns in one call instead of five separate first-paint requests.
- `frontend/src/app/features/master-data/services/account-master.service.ts` now caches that lookup bundle with `shareReplay(1)`, and `account-registration.component.ts` consumes the bundled response while still lazy-loading parent accounts and town-specific areas only when needed.
- Verified with `Backend/tests/accountRegistrationLookupsApiContracts.test.js` and `npm run build` in `frontend`.
- Follow-up uplift 2026-05-08: the bundled lookup route now has a 120-second server-side route cache, and mutations to dimensions, designations, customer types, account heads, and towns clear that cache so benchmark warm reads can improve without serving stale startup data.

### 3. Item list and item registration support data

Evidence from current code:

- `frontend/src/app/features/items/components/item-list-enhanced/item-list-enhanced.component.ts`
- `frontend/src/app/features/master-data/components/item-registration/item-registration.component.ts`

Observed issues:

- The list pulls filter option datasets on entry and uses ad hoc load logic for sort/filter/search.
- Sort is not yet a real backend contract even though the table surface exposes sortable columns.
- The items surface is one of the heaviest workflows in the ERP and should be treated as a first-class performance lane.

Required fix:

- Standardize item list filters, search, sort, and pagination on a single backend query contract.
- Cache low-churn filter data like companies/categories.
- Avoid reloading unchanged filter datasets on every visit.

### 4. Repeated lookup and master-data loading across forms

Observed issues:

- Many forms request the same active master data repeatedly.
- Lookup payloads are larger than needed for dropdown display.
- There is no shared frontend lookup store for common ERP lists.

Required fix:

- Add a shared lookup cache layer in the frontend for low-churn reference data.
- Add backend projection rules so dropdown APIs only return fields needed by selectors.
- Introduce cache invalidation on relevant create/update/delete flows.

### 5. Backend query consistency and index usage

Evidence from current code:

- `Backend/src/config/indexOptimization.js`
- `Backend/src/routes/monitoring.js`
- `Backend/src/middleware/cacheMiddleware.js`
- list services under `Backend/src/services/`

Observed issues:

- Some services are well-indexed and use `lean()`, but route-by-route behavior is inconsistent.
- Hot list endpoints still rely on heavy populate chains or broad regex filters without a standard review gate.
- The repo has monitoring and index-analysis helpers, but they are not yet part of a regular optimization loop for the busiest screens.

Required fix:

- Baseline the slowest real routes using `/api/v1/monitoring/metrics/slow-routes` and index stats.
- Add a query-review checklist for every hot list route: projection, pagination, sort path, index coverage, populate count, and cache eligibility.

## Delivery Streams

## Stream A: Instrumentation and Baseline

Owner: Senior Developer

Deliverables:

- Turn performance work into measured route budgets, not anecdotal reports.
- Capture the slowest 10 API routes from the monitoring surface.
- Capture database index stats and identify missing compound indexes for the slowest routes.
- Define a repeatable benchmark script for core screens: cashbook, accounts, items, customers, reports/dashboard.

Acceptance criteria:

- We have a baseline table showing route, average response time, payload size, query shape, and suspected bottleneck.
- Every optimization slice references before/after measurements.

Verification:

- `/api/v1/monitoring/metrics/dashboard`
- `/api/v1/monitoring/metrics/slow-routes`
- `/api/v1/monitoring/indexes`
- focused API timing capture in development

Status update 2026-05-08:

- Added a repeatable backend benchmark runner at `Backend/scripts/performance-baseline.js` with npm command `npm run perf:baseline`.
- The runner measures the optimized hot routes with warmup runs, p50, p95, average client timing, server `X-Response-Time`, payload size, status mix, and pass/fail against the current lookup/list budgets.
- The same report captures `/api/v1/monitoring/metrics/slow-routes`, `/api/v1/monitoring/metrics/cache`, and `/api/v1/monitoring/indexes` so each future optimization can be compared against route timings, cache behavior, and index coverage in one JSON artifact under `docs/performance-baselines/`.
- Verified the timing math with `Backend/tests/performanceBaselineUtils.test.js` and the documented index snapshot route with `Backend/tests/monitoringIndexesApiContracts.test.js`; run the live baseline against a running backend with `npm run perf:baseline -- --identifier <admin-user-or-email> --password <password>`.
- Follow-up uplift: `/api/v1/monitoring/indexes` now gathers collection stats concurrently and uses a 120-second route cache, and the benchmark route list measures the cached index snapshot against an 800ms budget.

## Stream B: Canonical Fast List Contracts

Owner: Backend Developer with Frontend Developer

Deliverables:

- Standard list contract for hot modules: `page`, `limit`, `sortBy`, `sortOrder`, `keyword`, typed filters, projected row payload, canonical pagination object.
- Replace frontend-side merged/pseudo-paginated tables with real server-paginated data.
- Start with cashbook, accounts, items, customers, capital, salary sheets.

Acceptance criteria:

- No hot list screen merges multiple paginated APIs in the browser to simulate a single table.
- No hot list screen uses table length from current in-memory rows when the backend already supports pagination.
- Sort and filter state are preserved through one canonical API contract per screen.

Verification:

- Focused backend API contract tests for list/filter/sort/pagination
- Frontend smoke on page change, sort change, filter change

## Stream C: Lookup and Form Boot Optimization

Owner: Frontend Developer with Backend Developer

Deliverables:

- Shared lookup facade for low-churn master data.
- Lazy-loading for heavyweight selectors such as large account/customer/supplier lists.
- Optional bundled lookup endpoints for workflows that currently require many startup calls.

Acceptance criteria:

- Navigation to entry screens is not blocked on loading every lookup list up front.
- Common lookups are cached and reused for the session unless invalidated.
- Dropdown APIs return minimal display fields by default.

Verification:

- Network waterfall comparison before/after
- Manual navigation timing for accounts, cashbook, items

## Stream D: Database and Cache Tuning

Owner: Senior Developer with Backend Developer

Deliverables:

- Add or confirm compound indexes for top list/filter paths.
- Apply route cache middleware to safe read-mostly endpoints like lookups, dashboard summaries, and low-churn master lists.
- Add explicit invalidation for affected caches on mutation routes.

Acceptance criteria:

- Top slow list routes have reviewed index coverage.
- Read-mostly endpoints show measurable cache-hit improvement on warm reads.
- No cached route serves stale data past agreed TTL or invalidation rules.

Verification:

- index stats before/after
- monitoring cache-hit rate
- focused regression tests for cached read surfaces

## Stream E: Frontend Render Hygiene

Owner: Frontend Developer

Deliverables:

- Keep shared tables on `OnPush` and stable `trackBy`.
- Remove unnecessary `MatTableDataSource` usage where a plain array plus explicit table state is enough.
- Debounce search/filter inputs consistently.
- Avoid rerendering whole pages when only table data changes.

Acceptance criteria:

- Hot screens stop doing redundant render/state work on each filter or page event.
- Search and filter interaction feels immediate on warm session data.

Verification:

- Angular devtools/manual profiling in development
- focused browser smoke on table interaction

## Stream F: Heavy Report and Dashboard Strategy

Owner: Senior Developer with Backend Developer

Deliverables:

- Classify report endpoints into synchronous, cached, and async/export queue paths.
- Keep fast summary cards synchronous and cached.
- Move heavy exports and large report generation to background or explicit download flows where appropriate.

Acceptance criteria:

- Dashboard entry no longer waits on large report-style aggregations that do not need to block first paint.
- Export actions do not degrade normal browsing performance.

Verification:

- API timing comparison
- browser smoke for dashboard first render and export actions

## Execution Order

### Phase 0: Baseline and budgets

- Capture slow-route and index baseline
- Pick the first 5 routes by real pain and traffic
- Freeze response-time targets for those routes

### Phase 1: Highest-impact visible fixes

- Cashbook canonical merged list API
- Cashbook paginator/total alignment
- Account registration lookup boot reduction
- Item list filter caching and real sort contract

### Phase 2: Shared platform improvements

- Shared frontend lookup cache
- Shared backend list-query helper standards
- Cache middleware rollout for safe reads
- Index rollout for top route families

### Phase 3: Heavy analytics/report optimization

- Dashboard/report cache tuning
- Async export strategy
- Broader query review of report aggregations

## First Implementation Backlog

### P0: Cashbook performance recovery

Owner: Backend Developer + Frontend Developer

Tasks:

- Add canonical merged list endpoint for cashbook entries
- Move merge/sort/pagination to backend
- Fix frontend paginator to use canonical totals
- Lazy-load or cache cashbook reference lookups

Proof:

- Focused API contract tests
- browser smoke for cashbook list filters and pagination
- before/after route timings

Status update:

- Completed 2026-05-07 initial contract slice: backend now exposes canonical merged `/api/v1/cashbook/entries`, the frontend cashbook list uses one request instead of separate receipt/payment merges, paginator length now uses backend totals, row numbering is page-aware, and the form defers supplier lookup loading until payment mode is selected. Verified with `Backend/tests/cashbookPdcApiWorkflow.integration.test.js` and `npm run build` in `frontend`.
- Completed 2026-05-08 lookup-bundle follow-up: backend now exposes projected `/api/v1/cashbook/lookups`, the frontend caches receive/payment lookup reads per mode, startup no longer fans out into separate customer/user/account list calls, and balance-changing actions clear the local lookup cache before reloading form options. Verified with `Backend/tests/cashbookLookupsApiContracts.test.js` and `npm run build` in `frontend`.

### P0: Account screen boot optimization

Owner: Frontend Developer + Backend Developer

Tasks:

- Create account lookup bundle or cached lookup strategy
- Remove broad startup fetches that are not needed for first paint
- Keep parent-account selection on demand

Proof:

- network waterfall comparison
- frontend build
- manual timing capture

Status update:

- Started 2026-05-07 initial frontend deferral: the account registration screen no longer preloads the parent-account selector dataset or the global areas list on first paint. Parent-account options now load when `sub_account` mode is selected or an existing sub-account is edited, and area options continue to load from the selected town. Frontend build passed after the change.

### P1: Item list contract hardening

Owner: Backend Developer + Frontend Developer

Tasks:

- Add backend-backed sort mapping for exposed item columns
- cache companies/categories lookup lists
- avoid repeated filter dataset fetches on every visit

Proof:

- route contract tests
- frontend smoke for sort/filter/page behavior

Status update:

- Completed 2026-05-07 initial list-contract slice: the mounted `/api/v1/items` list now resolves sort keys through an allowed backend field map for the supported live table columns, the enhanced Angular item list now sends real `sortBy` and `sortOrder` parameters through the shared data-table sort events, and company/category filter option requests are cached in `ItemService` instead of being refetched on every page visit. Verified with `Backend/tests/itemListApiContracts.test.js` and `npm run build` in `frontend`.
- Follow-up retrieval hardening 2026-05-31: the `/api/v1/items` list now treats keyword searches as literal text instead of raw regular expressions, clamps invalid/oversized pagination input inside the service, and declares compound indexes for the common active item name/code/stock/retail price plus company/category list paths. The shared Mongo pagination helper now retrieves page rows and count metadata concurrently instead of sequencing independent database round trips. Verified with `Backend/tests/itemListApiContracts.test.js` and `Backend/tests/paginationHelper.test.js`.

### P1: Monitoring-driven index pass

Owner: Senior Developer

Tasks:

- review top slow routes
- map filters to compound indexes
- remove unnecessary populate breadth where possible

Proof:

- monitoring and index stats snapshot
- focused regression tests on optimized routes

## Definition Of Done For The Performance Program

- Slow screens have measured before/after evidence, not only subjective feedback.
- Hot list pages use canonical backend pagination, sorting, and filtering.
- Common lookups are cached, projected, and loaded only when needed.
- Slow routes are visible in monitoring and have explicit owners.
- Performance changes are protected by focused contract tests or smoke proof where applicable.
