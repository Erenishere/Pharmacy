# Dashboard Redesign Implementation Plan
## Project: Pharmacy ERP / Distribution Control Tower

**Date:** March 8, 2026  
**Status:** Proposed redesign specification

---

## 1. Why redesign now

The current main dashboard still reflects an earlier phase of the product. Since then, the system has expanded into a broader pharma distribution ERP with modules for:

- quotations
- e-orders
- sales invoices and sales returns
- purchase invoices and purchase orders
- inventory, batch expiry, stock movements, stock valuation, and physical counts
- cashbook, expenses, PDC, capital, investors, and tax reports
- route plans, recovery summary, salesman targets, and POS flows

The dashboard should now operate as a daily decision surface for owners, managers, accountants, and operations leads, not just a stock-and-sales summary page.

---

## 2. Current implementation audit

### 2.1 Current strengths

- The existing dashboard is fast enough to understand and already uses reusable chart infrastructure.
- It covers a useful base set of metrics: sales, stock, warehouse sales, top items, low stock, stock distribution, and expiry.
- The route structure already exposes enough drill-down destinations to make a strong operational dashboard.

### 2.2 Current problems

1. Labels do not match the data.
   - "Today's Sales" is actually date-range sales.
   - "Sales Trend (Last 7 Days)" is backed by a monthly aggregation API.
   - "Total Stock" shows item count, not stock quantity or stock value.

2. The page mixes incompatible data scopes.
   - Some cards respect the selected date range.
   - Some charts do not refresh when the date range changes.
   - Some data is warehouse-filtered while other panels are global.

3. The component is too orchestration-heavy.
   - The dashboard component issues many direct HTTP requests itself.
   - Data loading is split across `DashboardService`, direct `HttpClient` calls, and report services.
   - Error handling is inconsistent.

4. Demo fallback data exists in production code.
   - Several API failures silently replace missing data with mock values.
   - This creates false confidence and makes the dashboard unsafe for business use.

5. There is a split dashboard architecture in the repo.
   - The old main dashboard is mounted and used.
   - An "enhanced dashboard" path and realtime service exist but are not integrated.
   - The separate analytics dashboard uses generic BI language and does not match the operational flows of this ERP.

### 2.3 Product implication

The redesign should not be a prettier version of the current page. It should consolidate:

- dashboard KPIs
- analytics-level insight
- inventory control
- finance control
- operational exceptions
- drill-down entry points into existing modules

---

## 3. Design principles

1. Show what needs attention first.
2. Keep the first paint fast with one overview payload.
3. Use real business flows from this ERP, not generic BI wording.
4. Prefer action-oriented widgets over decorative charts.
5. Support role-based composition.
6. Never use placeholder or demo data in production.
7. Every widget must link to a real drill-down route or report.

---

## 4. Dashboard information architecture

The new dashboard should be organized into six layers.

### 4.1 Global header

Purpose: filtering, context, and freshness.

Include:

- page title: `Business Control Tower`
- subtitle with company and selected scope
- period chips: `Today`, `7D`, `30D`, `MTD`, `QTD`, `YTD`, `Custom`
- optional filters: warehouse, branch/dimension, salesman
- last refreshed timestamp
- refresh button

### 4.2 Executive KPI strip

Purpose: immediate financial and operational state.

Widgets:

- Net Sales
- Gross Margin
- Collections Received
- Receivables Due
- Payables Due
- Cash + Bank Position
- Inventory Value
- Expiry Exposure Value

Each KPI card should include:

- current value
- delta vs previous comparable period
- micro-sparkline
- status color
- one-click drill-down

### 4.3 Commercial performance zone

Purpose: show revenue pipeline and team output.

Widgets:

- Sales trend hero chart
- Commercial funnel: Quotations -> E-Orders -> Sales Invoices -> Collections
- Top customers by revenue
- Top items / brands by revenue and margin
- Salesman performance and target attainment

### 4.4 Inventory health zone

Purpose: expose stock risk and stock quality.

Widgets:

- Low stock risk matrix
- Near-expiry batches timeline
- Slow-moving inventory
- Stockout forecast / reorder recommendations
- Warehouse stock imbalance

### 4.5 Finance and control zone

Purpose: help management and accounts control cash and risk.

Widgets:

- Receipts vs payments trend
- Expense burn by category
- PDC due / overdue
- Investor capital and profit-share snapshot
- Tax compliance status

### 4.6 Action center

Purpose: convert insight into action.

Widgets:

- Expiring batches requiring action
- Overdue receivables
- Pending purchase orders or dispatch bottlenecks
- Low stock items below reorder threshold
- PDC due today / bounced / overdue
- Draft quotations or e-orders needing conversion

This area should be a compact, priority-ranked exception feed rather than another chart row.

---

## 5. Exact widget map for this project

This section lists the recommended widgets tied to real product areas and drill-down routes that already exist.

### 5.1 Executive KPI strip

1. Net Sales
   - Source: sales invoices minus sales returns
   - Drill-down: `/sales-invoices`

2. Gross Margin
   - Source: sales revenue vs item cost aggregation
   - Drill-down: item or sales reports when available

3. Collections Received
   - Source: cashbook, receipts, recovery summary
   - Drill-down: `/cashbook` or `/recovery-summary`

4. Receivables Due
   - Source: customer balances and due aging
   - Drill-down: `/recovery-summary`

5. Payables Due
   - Source: supplier and purchase obligations
   - Drill-down: `/purchase-invoices`

6. Cash + Bank Position
   - Source: cash accounts and bank accounts
   - Drill-down: `/cashbook`

7. Inventory Value
   - Source: stock valuation, not item count
   - Drill-down: `/reports/inventory/stock-valuation`

8. Expiry Exposure
   - Source: batches expiring within configurable window
   - Drill-down: `/reports/inventory/batch-expiry`

### 5.2 Commercial performance zone

1. Sales trend hero chart
   - View: daily for <= 30 days, weekly for <= 90 days, monthly beyond that
   - Metrics toggle: revenue, invoice count, average invoice value
   - Drill-down: `/sales-invoices`

2. Commercial funnel
   - Stages:
     - quotations
     - e-orders
     - sales invoices
     - collections
   - Drill-downs:
     - `/quotations`
     - `/e-orders`
     - `/sales-invoices`
     - `/recovery-summary`

3. Top customers panel
   - Metrics: revenue, frequency, average order value, overdue exposure
   - Drill-down: `/customers`

4. Top items / brands panel
   - Metrics: revenue, quantity, gross margin, sell-through
   - Drill-down: `/items`

5. Salesman leaderboard
   - Metrics: sales, recovery, visit target, order conversion
   - Drill-down: `/targets/dashboard`

### 5.3 Inventory health zone

1. Low stock matrix
   - Group by warehouse and severity
   - Drill-down: `/inventory/stock-levels`

2. Near-expiry timeline
   - Buckets:
     - expired
     - 0-30 days
     - 31-60 days
     - 61-90 days
   - Drill-down: `/reports/inventory/batch-expiry`

3. Slow-moving items
   - Metrics: no movement days, stock value locked, warehouse
   - Drill-down: `/reports/inventory/slow-moving`

4. Stock valuation / warehouse imbalance
   - View: stacked bars by warehouse
   - Drill-down: `/reports/inventory/stock-valuation`

5. Reorder recommendations
   - Inputs: current stock, recent movement, reorder point, pending purchase orders
   - Drill-down: `/purchase-orders`

### 5.4 Finance and control zone

1. Receipts vs payments trend
   - Source: cashbook and payment flows
   - Drill-down: `/cashbook`

2. Expense burn by category
   - Source: expense entries by category and account
   - Drill-down: `/expenses`

3. PDC health
   - Metrics: due today, upcoming, overdue, bounced
   - Drill-down: `/pdc`

4. Investor and capital snapshot
   - Metrics: total investor capital, current profit-share exposure, capital movements
   - Drill-downs:
     - `/investors`
     - `/capital`

5. Tax control card
   - Metrics: GST sales, GST purchases, withholding, compliance warnings
   - Drill-downs:
     - `/reports/tax/gst-sales`
     - `/reports/tax/gst-purchases`
     - `/reports/tax/compliance-summary`

### 5.5 Operations and action center

1. Pending purchase orders
   - Drill-down: `/purchase-orders`

2. Dispatch / bilty backlog
   - Drill-down: `/bilty`

3. Route plan coverage
   - Drill-down: `/route-plans`

4. Sales returns watchlist
   - Drill-down: `/sales-returns`

5. Top urgent alerts
   - low stock critical
   - expiry critical
   - overdue recovery
   - bounced PDC
   - missing target coverage

---

## 6. Recommended visual design direction

### 6.1 Overall look

- Use the existing Vuexy visual language but make it more premium and more analytical.
- Keep the page bright and clean with slightly denser cards.
- Use a strong hero row and compact secondary cards.
- Reserve saturated colors for status and alerts, not for every chart.

### 6.2 Layout

- 12-column responsive grid
- KPI strip in 4 or 8 compact cards depending on width
- 2-column hero analytics row on desktop
- stacked panels on tablet
- mobile uses collapsible sections with only the most important cards above the fold

### 6.3 Charts to prefer

- line / area chart for revenue and cash flow
- stacked bar for warehouse distribution
- funnel for quotation to invoice conversion
- heatmap or matrix for low stock severity
- compact sparkline in KPI cards
- timeline bars for expiry exposure

### 6.4 Charts to reduce

- avoid multiple doughnut charts
- avoid radar charts on the main dashboard
- avoid decorative charts that do not lead to action

---

## 7. Role-based dashboard variants

### 7.1 Admin / owner

Show all sections:

- executive KPI strip
- commercial
- inventory
- finance
- action center

### 7.2 Accountant

Prioritize:

- collections
- payables
- cash position
- expenses
- PDC
- tax compliance
- investor profit-share

### 7.3 Manager / operations lead

Prioritize:

- sales trend
- warehouse performance
- low stock
- expiry
- purchase orders
- route plans
- salesman target attainment

### 7.4 Salesman

Do not reuse the full admin dashboard.

Use a simplified field dashboard:

- daily sales
- recovery due
- visit target
- route plan
- top customers to revisit
- quick entry to POS and sales history

---

## 8. Backend API design

### 8.1 New endpoint

Add a dedicated overview endpoint:

`GET /api/v1/dashboard/overview`

### 8.2 Query parameters

- `period`: `today | 7d | 30d | mtd | qtd | ytd | custom`
- `startDate`
- `endDate`
- `warehouseId`
- `dimensionId`
- `salesmanId`
- `refresh`

### 8.3 Response shape

```json
{
  "success": true,
  "data": {
    "scope": {
      "period": "mtd",
      "startDate": "2026-03-01",
      "endDate": "2026-03-08",
      "warehouseId": null,
      "dimensionId": null,
      "salesmanId": null
    },
    "summary": {
      "netSales": { "value": 0, "delta": 0, "trend": [] },
      "grossMargin": { "value": 0, "delta": 0, "percent": 0, "trend": [] },
      "collections": { "value": 0, "delta": 0, "trend": [] },
      "receivablesDue": { "value": 0, "count": 0 },
      "payablesDue": { "value": 0, "count": 0 },
      "cashBank": { "value": 0, "delta": 0 },
      "inventoryValue": { "value": 0, "delta": 0 },
      "expiryExposure": { "value": 0, "count": 0 }
    },
    "commercial": {
      "salesTrend": [],
      "funnel": {
        "quotations": 0,
        "eOrders": 0,
        "salesInvoices": 0,
        "collections": 0
      },
      "topCustomers": [],
      "topItems": [],
      "salesmen": []
    },
    "inventory": {
      "lowStock": [],
      "expiryBuckets": [],
      "slowMoving": [],
      "warehouseDistribution": [],
      "reorderRecommendations": []
    },
    "finance": {
      "receiptsVsPayments": [],
      "expenseByCategory": [],
      "pdc": {
        "dueToday": 0,
        "upcoming": 0,
        "overdue": 0,
        "bounced": 0
      },
      "investors": {
        "totalCapital": 0,
        "activeInvestors": 0,
        "profitShareDue": 0
      },
      "tax": {
        "gstSales": 0,
        "gstPurchases": 0,
        "withholding": 0,
        "complianceIssues": 0
      }
    },
    "operations": {
      "pendingPurchaseOrders": 0,
      "dispatchBacklog": 0,
      "routeCoverage": 0,
      "salesReturnsRate": 0
    },
    "alerts": [],
    "generatedAt": "2026-03-08T00:00:00.000Z"
  }
}
```

### 8.4 Backend implementation rules

1. One controller should assemble the overview payload.
2. Use parallel aggregation with `Promise.all`.
3. Return only production data or empty states.
4. Do not return fake fallback values.
5. Support cached summary slices with short TTL.
6. Keep heavy detail datasets out of the initial payload if they are only used after interaction.

### 8.5 Metric rules

Define each metric centrally and document it in code:

- `netSales = salesInvoices - salesReturns`
- `grossMargin = netSales - costOfGoodsSold`
- `collections = cash receipts + bank receipts against receivables`
- `expiryExposure = sum(stock value of batches expiring within threshold)`
- `lowStockSeverity = currentStock / reorderLevel`

---

## 9. Frontend architecture

### 9.1 Replace the current page orchestration

Introduce a single overview service:

- `DashboardOverviewService`
- fetches `/dashboard/overview`
- exposes typed response models
- caches by filter key
- handles refresh and invalidation centrally

### 9.2 Recommended component structure

Create a modular dashboard screen composed of:

- `dashboard-shell`
- `dashboard-toolbar`
- `dashboard-kpi-strip`
- `dashboard-hero-trend-panel`
- `dashboard-funnel-panel`
- `dashboard-top-customers-panel`
- `dashboard-top-items-panel`
- `dashboard-low-stock-panel`
- `dashboard-expiry-panel`
- `dashboard-finance-panel`
- `dashboard-action-center`
- `dashboard-empty-state`
- `dashboard-error-state`

### 9.3 State model

Use one top-level state object:

- filters
- loading states
- overview payload
- panel errors
- last refresh timestamp

Do not let individual presentation components fire their own unrelated API calls on initial load.

### 9.4 Interaction model

- KPI card click -> route deep-link
- chart segment click -> filtered report page or list page
- alerts row click -> open target route with pre-applied filters
- refresh button -> re-fetch overview payload only
- filter changes -> one request, not many scattered calls

---

## 10. Performance strategy

1. First paint should rely on one overview endpoint.
2. Keep the first payload compact and summary-oriented.
3. Lazy render non-critical charts after above-the-fold content mounts.
4. Add server-side caching for expensive aggregations.
5. Use skeleton loaders instead of spinners for dense panels.
6. Avoid live polling by default.
7. Only realtime-refresh alert counts and tiny KPI deltas if needed.
8. Track dashboard load time and slow panel timings.

---

## 11. Phased delivery plan

### Phase 1 - Correctness and foundation

- remove misleading labels in current dashboard
- remove demo fallback data
- add a new overview backend contract
- add typed overview service in frontend
- ship a new dashboard shell with executive KPI strip and action center

### Phase 2 - Commercial and inventory insight

- add sales hero chart
- add quotation to invoice funnel
- add top customers and top items
- add low stock and expiry panels
- add stock valuation and warehouse distribution

### Phase 3 - Finance and control

- add receipts vs payments
- add expenses by category
- add PDC health
- add investor and capital snapshot
- add tax compliance block

### Phase 4 - Role-aware and advanced behavior

- add role-based variants
- add deep-link filter synchronization
- add cached summary slices
- add optional realtime alert indicators

---

## 12. Acceptance criteria

The redesign is successful when:

1. The dashboard loads from one overview API request.
2. All KPI labels match their actual date scope and business meaning.
3. No production widget uses fake fallback data.
4. Every widget has a real drill-down route.
5. The dashboard reflects the expanded ERP scope:
   - sales
   - inventory
   - finance
   - recovery
   - PDC
   - investors
   - operations
6. Role-based users see relevant panels only.
7. The page feels denser, faster, and more modern without becoming noisy.

---

## 13. Recommended next build step

Implement the redesign in this order:

1. backend `GET /dashboard/overview`
2. frontend `DashboardOverviewService` and models
3. new dashboard shell and KPI strip
4. action center
5. commercial and inventory panels
6. finance and control panels

This order delivers business value early and reduces the current mismatch between UI labels and data behavior before the full visual redesign is complete.
