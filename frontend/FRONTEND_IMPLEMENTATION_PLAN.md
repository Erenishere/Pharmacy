# Frontend Implementation Plan
## Reporting & Analytics + Capital Investment Management

**Date:** February 9, 2026  
**Status:** Services Created ✅ | Components In Progress 🔄

---

## Color Scheme (Vuexy Theme)
```scss
$primary: #7367F0;      // Purple - main brand color
$secondary: #82868B;    // Gray
$success: #28C76F;      // Green
$info: #00CFE8;         // Cyan
$warning: #FF9F43;      // Orange
$danger: #EA5455;       // Red
$dark: #4B4B4B;         // Dark gray

// Backgrounds
$bg-page: #F8F7FA;      // Light purple-gray
$bg-card: #FFFFFF;      // White
```

---

## Phase 1: Services Created ✅

### 1. Dashboard Service
**File:** `frontend/src/app/features/dashboard/services/dashboard.service.ts`

**Endpoints:**
- `GET /api/v1/dashboard/kpis` - Get KPIs for date range
- `GET /api/v1/dashboard/sales-trend` - Get sales trend (months)
- `GET /api/v1/dashboard/top-items` - Get top performing items
- `GET /api/v1/dashboard/top-customers` - Get top customers

**Interfaces:**
- `KPIData` - Comprehensive KPIs (sales, purchases, inventory, customers, suppliers, cash)
- `SalesTrendData` - Monthly sales trends
- `TopItemsData` - Top performing items by revenue
- `TopCustomersData` - Top customers by sales

### 2. Inventory Report Service
**File:** `frontend/src/app/features/reports/services/inventory-report.service.ts`

**Endpoints:**
- `GET /api/v1/reports/inventory/stock-level` - Stock level report
- `GET /api/v1/reports/inventory/stock-movement` - Stock movement report
- `GET /api/v1/reports/inventory/batch-expiry` - Batch expiry report
- `GET /api/v1/reports/inventory/stock-valuation` - Stock valuation report
- `GET /api/v1/reports/inventory/abc-analysis` - ABC analysis report
- `GET /api/v1/reports/inventory/slow-moving` - Slow-moving items report

**Interfaces:**
- `StockLevelReport` - Current stock levels with status
- `StockMovementReport` - Stock movements over time
- `BatchExpiryReport` - Expiring batches
- `StockValuationReport` - Inventory valuation (FIFO/LIFO/Weighted Average)
- `ABCAnalysisReport` - ABC classification of items
- `SlowMovingReport` - Slow-moving inventory items

### 3. Tax Report Service
**File:** `frontend/src/app/features/reports/services/tax-report.service.ts`

**Endpoints:**
- `GET /api/v1/reports/tax/gst-sales` - GST sales report
- `GET /api/v1/reports/tax/gst-purchases` - GST purchase report
- `GET /api/v1/reports/tax/withholding-tax` - WHT report
- `GET /api/v1/reports/tax/compliance-summary` - Tax compliance summary

**Interfaces:**
- `GSTSalesReport` - GST on sales with customer details
- `GSTPurchaseReport` - GST on purchases with supplier details
- `WHTReport` - Withholding tax transactions
- `TaxComplianceSummary` - Complete tax compliance overview

### 4. Investor Service
**File:** `frontend/src/app/features/investors/services/investor.service.ts`

**Endpoints:**
- `GET /api/v1/investors` - Get all investors
- `GET /api/v1/investors/:id` - Get investor by ID
- `POST /api/v1/investors` - Create investor
- `PUT /api/v1/investors/:id` - Update investor
- `DELETE /api/v1/investors/:id` - Delete investor
- `GET /api/v1/investors/:id/statement` - Get investor statement

**Interfaces:**
- `Investor` - Investor account details
- `InvestorStatement` - Investor statement with transactions

---

## Phase 2: Components to Create 🔄

### A. Enhanced Dashboard Components

#### 1. Dashboard KPI Cards Component
**Path:** `frontend/src/app/features/dashboard/components/kpi-cards/`
**Features:**
- Display 6 KPI cards (Sales, Purchases, Inventory, Customers, Suppliers, Cash)
- Color-coded icons (purple, info, warning, danger, success)
- Date range filter
- Auto-refresh capability
- Responsive grid layout

#### 2. Sales Trend Chart Component
**Path:** `frontend/src/app/features/dashboard/components/sales-trend-chart/`
**Features:**
- Line/Bar chart showing monthly sales trends
- Configurable months (3, 6, 12)
- Hover tooltips with details
- Export to image

#### 3. Top Items Widget Component
**Path:** `frontend/src/app/features/dashboard/components/top-items-widget/`
**Features:**
- List of top 10 items by revenue
- Bar chart visualization
- Click to view item details
- Date range filter

#### 4. Top Customers Widget Component
**Path:** `frontend/src/app/features/dashboard/components/top-customers-widget/`
**Features:**
- List of top 10 customers by sales
- Donut/Pie chart visualization
- Click to view customer details
- Date range filter

---

### B. Inventory Report Components

#### 1. Stock Level Report Component
**Path:** `frontend/src/app/features/reports/components/inventory-reports/stock-level/`
**Features:**
- Filterable table (warehouse, item, status)
- Status badges (In Stock, Low Stock, Out of Stock)
- Summary cards (Total Items, Total Stock, Total Value, Low Stock Count)
- Export to CSV/PDF
- Color-coded status indicators

#### 2. Stock Movement Report Component
**Path:** `frontend/src/app/features/reports/components/inventory-reports/stock-movement/`
**Features:**
- Date range filter
- Movement type filter (In, Out, Transfer, Adjustment)
- Timeline view
- Running balance column
- Export functionality

#### 3. Batch Expiry Report Component
**Path:** `frontend/src/app/features/reports/components/inventory-reports/batch-expiry/`
**Features:**
- Days ahead filter (30, 60, 90, 180)
- Status badges (Expired, Expiring Soon, Safe)
- Alert indicators for critical batches
- Sortable by expiry date
- Export functionality

#### 4. Stock Valuation Report Component
**Path:** `frontend/src/app/features/reports/components/inventory-reports/stock-valuation/`
**Features:**
- Method selector (FIFO, LIFO, Weighted Average)
- As-of-date picker
- Summary cards (Total Items, Total Quantity, Total Value)
- Detailed item breakdown
- Export functionality

#### 5. ABC Analysis Report Component
**Path:** `frontend/src/app/features/reports/components/inventory-reports/abc-analysis/`
**Features:**
- Visual classification (A: 70%, B: 20%, C: 10%)
- Pie chart showing distribution
- Color-coded categories (A: success, B: warning, C: info)
- Cumulative percentage column
- Export functionality

#### 6. Slow Moving Report Component
**Path:** `frontend/src/app/features/reports/components/inventory-reports/slow-moving/`
**Features:**
- Days filter (30, 60, 90, 180)
- Days since last movement indicator
- Total value locked in slow-moving items
- Action buttons (Mark for clearance, etc.)
- Export functionality

---

### C. Tax Report Components

#### 1. GST Sales Report Component
**Path:** `frontend/src/app/features/reports/components/tax-reports/gst-sales/`
**Features:**
- Date range filter
- Customer-wise GST breakdown
- Summary cards (Total Invoices, Taxable Amount, GST Amount, Total Amount)
- GST rate filter (4%, 18%)
- Export functionality

#### 2. GST Purchase Report Component
**Path:** `frontend/src/app/features/reports/components/tax-reports/gst-purchases/`
**Features:**
- Date range filter
- Supplier-wise GST breakdown
- Summary cards (Total Invoices, Taxable Amount, GST Amount, Total Amount)
- Input tax credit calculation
- Export functionality

#### 3. Withholding Tax Report Component
**Path:** `frontend/src/app/features/reports/components/tax-reports/withholding-tax/`
**Features:**
- Date range filter
- Customer-wise WHT breakdown
- WHT rate column (0.5%, 2.5%)
- Summary cards (Total Transactions, Taxable Amount, WHT Amount, Net Amount)
- Export functionality

#### 4. Tax Compliance Summary Component
**Path:** `frontend/src/app/features/reports/components/tax-reports/compliance-summary/`
**Features:**
- Date range filter
- Comprehensive tax overview
- GST Sales vs GST Purchases comparison
- Net GST Payable calculation
- WHT summary
- Total Tax Liability
- Visual charts (Bar, Pie)
- Export functionality
- Print-friendly format

---

### D. Capital Investment Management Components

#### 1. Investor List Component
**Path:** `frontend/src/app/features/investors/components/investor-list/`
**Features:**
- Searchable/filterable table
- Status badges (Active, Inactive)
- Balance display
- Action buttons (View, Edit, Delete, Statement)
- Add New Investor button
- Export functionality

#### 2. Investor Form Dialog Component
**Path:** `frontend/src/app/features/investors/components/investor-form-dialog/`
**Features:**
- Create/Edit form
- Fields: Code, Name, Contact Person, Phone, Email, Address, Opening Balance
- Validation
- Save/Cancel buttons
- Success/Error notifications

#### 3. Investor Statement Component
**Path:** `frontend/src/app/features/investors/components/investor-statement/`
**Features:**
- Date range filter
- Opening balance display
- Transaction list (Date, Description, Type, Amount, Balance)
- Closing balance display
- Running balance column
- Export to PDF
- Print functionality

#### 4. Investor Dashboard Component
**Path:** `frontend/src/app/features/investors/components/investor-dashboard/`
**Features:**
- Summary cards (Total Investors, Total Investment, Active Investors)
- Recent transactions
- Investment trends chart
- Quick actions

---

## Phase 3: Routing Configuration 🔄

### Update Routes
**File:** `frontend/src/app/app.routes.ts`

```typescript
// Dashboard routes
{ path: 'dashboard', component: DashboardComponent },

// Inventory Report routes
{ path: 'reports/inventory/stock-level', component: StockLevelReportComponent },
{ path: 'reports/inventory/stock-movement', component: StockMovementReportComponent },
{ path: 'reports/inventory/batch-expiry', component: BatchExpiryReportComponent },
{ path: 'reports/inventory/stock-valuation', component: StockValuationReportComponent },
{ path: 'reports/inventory/abc-analysis', component: ABCAnalysisReportComponent },
{ path: 'reports/inventory/slow-moving', component: SlowMovingReportComponent },

// Tax Report routes
{ path: 'reports/tax/gst-sales', component: GSTSalesReportComponent },
{ path: 'reports/tax/gst-purchases', component: GSTPurchaseReportComponent },
{ path: 'reports/tax/withholding-tax', component: WHTReportComponent },
{ path: 'reports/tax/compliance-summary', component: TaxComplianceSummaryComponent },

// Investor routes
{ path: 'investors', component: InvestorListComponent },
{ path: 'investors/:id/statement', component: InvestorStatementComponent },
```

---

## Phase 4: Sidebar Menu Updates 🔄

### Update Sidebar
**File:** `frontend/src/app/layout/sidebar/sidebar.component.ts`

Add menu items:
```typescript
// Under Reports section
{
  label: 'Inventory Reports',
  icon: 'inventory_2',
  children: [
    { label: 'Stock Level', route: '/reports/inventory/stock-level' },
    { label: 'Stock Movement', route: '/reports/inventory/stock-movement' },
    { label: 'Batch Expiry', route: '/reports/inventory/batch-expiry' },
    { label: 'Stock Valuation', route: '/reports/inventory/stock-valuation' },
    { label: 'ABC Analysis', route: '/reports/inventory/abc-analysis' },
    { label: 'Slow Moving', route: '/reports/inventory/slow-moving' },
  ]
},
{
  label: 'Tax Reports',
  icon: 'receipt_long',
  children: [
    { label: 'GST Sales', route: '/reports/tax/gst-sales' },
    { label: 'GST Purchases', route: '/reports/tax/gst-purchases' },
    { label: 'Withholding Tax', route: '/reports/tax/withholding-tax' },
    { label: 'Tax Compliance', route: '/reports/tax/compliance-summary' },
  ]
},

// New section
{
  label: 'Capital Investment',
  icon: 'account_balance',
  route: '/investors'
}
```

---

## UI/UX Guidelines

### 1. Color Usage
- **Primary (#7367F0):** Main actions, active states, primary buttons
- **Success (#28C76F):** Positive indicators, success messages, "In Stock" status
- **Warning (#FF9F43):** Warnings, "Low Stock" status, expiring items
- **Danger (#EA5455):** Errors, "Out of Stock" status, expired items
- **Info (#00CFE8):** Informational elements, neutral status

### 2. Card Design
- White background (#FFFFFF)
- Border radius: 8px
- Shadow: `0 4px 24px 0 rgba(34, 41, 47, .1)`
- Padding: 24px

### 3. Typography
- Font: Montserrat
- Headings: 600-700 weight
- Body: 400-500 weight
- Card titles: #5E5873
- Body text: #6E6B7B
- Muted text: #B8B8B8

### 4. Buttons
- Primary: Purple background, white text
- Stroked: Purple border, purple text
- Icon buttons: Gray, hover purple
- Border radius: 6px

### 5. Tables
- Striped rows for better readability
- Hover effect on rows
- Sortable columns
- Sticky header for long tables
- Responsive (horizontal scroll on mobile)

### 6. Status Badges
- Pill-shaped (border-radius: 20px)
- Small padding (4px 12px)
- Color-coded by status
- Uppercase text

### 7. Charts
- Use Chart.js or ng2-charts
- Match color scheme
- Responsive
- Interactive tooltips
- Legend placement: bottom or right

---

## Next Steps

1. ✅ Create all service files
2. 🔄 Create dashboard KPI cards component
3. 🔄 Create sales trend chart component
4. 🔄 Create inventory report components (6 components)
5. 🔄 Create tax report components (4 components)
6. 🔄 Create investor management components (4 components)
7. 🔄 Update routing configuration
8. 🔄 Update sidebar menu
9. 🔄 Test all components
10. 🔄 Add export functionality (CSV/PDF)

---

## Dependencies Required

```json
{
  "@angular/material": "^18.x",
  "chart.js": "^4.x",
  "ng2-charts": "^6.x",
  "jspdf": "^2.x",
  "jspdf-autotable": "^3.x"
}
```

---

## Estimated Timeline

- **Services:** ✅ Complete (1 hour)
- **Dashboard Components:** 4-6 hours
- **Inventory Reports:** 8-10 hours
- **Tax Reports:** 6-8 hours
- **Investor Management:** 6-8 hours
- **Routing & Menu:** 2 hours
- **Testing & Refinement:** 4-6 hours

**Total:** 31-41 hours

---

## Status: Services Complete ✅

All backend service connections are ready. Ready to proceed with component development.
