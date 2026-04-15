# Frontend Setup Instructions
**Date:** February 9, 2026

---

## 📦 Step 1: Install Required Dependencies

Run the following command in the `frontend` directory:

```bash
npm install chart.js ng2-charts jspdf jspdf-autotable papaparse @types/papaparse
```

### Dependencies Breakdown:
- **chart.js** - Core charting library
- **ng2-charts** - Angular wrapper for Chart.js
- **jspdf** - PDF generation library
- **jspdf-autotable** - Table plugin for jsPDF
- **papaparse** - CSV parsing and generation
- **@types/papaparse** - TypeScript definitions for papaparse

---

## 🔧 Step 2: Register Chart.js in Angular

### Update `app.config.ts` (if needed)

Add Chart.js configuration:

```typescript
import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient } from '@angular/common/http';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideAnimations(),
    provideHttpClient(),
    provideCharts(withDefaultRegisterables())
  ]
};
```

---

## 🎨 Step 3: Update Sidebar Menu (Optional)

### File: `frontend/src/app/layout/sidebar/sidebar.component.ts`

Add the following menu items to your sidebar configuration:

```typescript
// Add to your menu items array

// Inventory Reports Submenu
{
  label: 'Inventory Reports',
  icon: 'inventory_2',
  children: [
    { label: 'Stock Level', route: '/reports/inventory/stock-level' },
    { label: 'Stock Movement', route: '/reports/inventory/stock-movement' },
    { label: 'Batch Expiry', route: '/reports/inventory/batch-expiry' },
    { label: 'Stock Valuation', route: '/reports/inventory/stock-valuation' },
    { label: 'ABC Analysis', route: '/reports/inventory/abc-analysis' },
    { label: 'Slow Moving', route: '/reports/inventory/slow-moving' }
  ]
},

// Tax Reports Submenu
{
  label: 'Tax Reports',
  icon: 'receipt_long',
  children: [
    { label: 'GST Sales', route: '/reports/tax/gst-sales' },
    { label: 'GST Purchases', route: '/reports/tax/gst-purchases' },
    { label: 'Withholding Tax', route: '/reports/tax/withholding-tax' },
    { label: 'Tax Compliance', route: '/reports/tax/compliance-summary' }
  ]
},

// Capital Investment Menu
{
  label: 'Capital Investment',
  icon: 'account_balance',
  route: '/investors'
}
```

---

## 🚀 Step 4: Run the Application

```bash
# Development server
npm start

# Or
ng serve

# Navigate to
http://localhost:4200
```

---

## ✅ Step 5: Verify Installation

### Check Dashboard
1. Navigate to `/dashboard`
2. Verify KPI cards are loading
3. Verify 3 charts are displaying:
   - Sales Trend (Line chart)
   - Top Items (Bar chart)
   - Top Customers (Doughnut chart)

### Check Inventory Reports
Navigate to each report and verify:
- `/reports/inventory/stock-level`
- `/reports/inventory/stock-movement`
- `/reports/inventory/batch-expiry`
- `/reports/inventory/stock-valuation`
- `/reports/inventory/abc-analysis`
- `/reports/inventory/slow-moving`

### Check Tax Reports
Navigate to each report and verify:
- `/reports/tax/gst-sales`
- `/reports/tax/gst-purchases`
- `/reports/tax/withholding-tax`
- `/reports/tax/compliance-summary`

### Check Investor Management
1. Navigate to `/investors`
2. Click "Add Investor" button
3. Fill form and create investor
4. Click on investor actions menu
5. Select "View Statement"
6. Verify statement displays correctly

---

## 🐛 Troubleshooting

### Issue: Charts not displaying

**Solution:**
1. Verify chart.js and ng2-charts are installed:
   ```bash
   npm list chart.js ng2-charts
   ```

2. Check browser console for errors

3. Verify Chart.js is registered in app.config.ts

### Issue: API calls failing

**Solution:**
1. Verify backend is running
2. Check environment.ts has correct API URL:
   ```typescript
   export const environment = {
     production: false,
     apiUrl: 'http://localhost:5000/api/v1'
   };
   ```

3. Check browser network tab for failed requests

### Issue: Material components not working

**Solution:**
1. Verify @angular/material is installed:
   ```bash
   npm list @angular/material
   ```

2. Check that MatMenuModule is imported in investor-list component

### Issue: Date pickers not working

**Solution:**
1. Verify MatDatepickerModule and MatNativeDateModule are imported
2. Check that date picker is properly bound to ngModel

---

## 📝 Optional: Implement Export Functionality

### CSV Export Example

```typescript
import * as Papa from 'papaparse';

exportToCSV(data: any[], filename: string): void {
  const csv = Papa.unparse(data);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
```

### PDF Export Example

```typescript
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

exportToPDF(data: any[], columns: string[], filename: string): void {
  const doc = new jsPDF();
  
  autoTable(doc, {
    head: [columns],
    body: data.map(row => columns.map(col => row[col])),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [115, 103, 240] }
  });
  
  doc.save(`${filename}.pdf`);
}
```

---

## 🔐 Environment Configuration

### Development
**File:** `frontend/src/environments/environment.ts`
```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:5000/api/v1'
};
```

### Production
**File:** `frontend/src/environments/environment.prod.ts`
```typescript
export const environment = {
  production: true,
  apiUrl: 'https://your-api-domain.com/api/v1'
};
```

---

## 📊 Performance Tips

### 1. Enable Production Mode
```bash
ng build --configuration production
```

### 2. Lazy Loading
All routes are already configured with lazy loading:
```typescript
loadComponent: () => import('./path/to/component').then(m => m.ComponentName)
```

### 3. OnPush Change Detection (Optional)
Add to components for better performance:
```typescript
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush
})
```

---

## 🧪 Testing Commands

### Run Unit Tests
```bash
ng test
```

### Run E2E Tests
```bash
ng e2e
```

### Run Linter
```bash
ng lint
```

---

## 📦 Build for Production

```bash
# Build
ng build --configuration production

# Output will be in dist/ folder
# Deploy the contents of dist/frontend to your web server
```

---

## 🎯 Quick Start Checklist

- [ ] Install dependencies (`npm install chart.js ng2-charts jspdf jspdf-autotable papaparse @types/papaparse`)
- [ ] Register Chart.js in app.config.ts
- [ ] Update sidebar menu (optional)
- [ ] Run development server (`npm start`)
- [ ] Test dashboard with charts
- [ ] Test all 10 report components
- [ ] Test investor management (CRUD + statement)
- [ ] Verify API connections
- [ ] Test responsive design on mobile
- [ ] Implement export functionality (optional)
- [ ] Run tests
- [ ] Build for production

---

## 📞 Support

If you encounter any issues:

1. **Check Console:** Open browser developer tools and check console for errors
2. **Check Network:** Verify API calls are successful in network tab
3. **Check Dependencies:** Run `npm list` to verify all packages are installed
4. **Clear Cache:** Try clearing browser cache and restarting dev server
5. **Reinstall:** If all else fails, delete `node_modules` and run `npm install` again

---

## 🎉 You're All Set!

Your frontend is now fully configured with:
- ✅ Enhanced dashboard with 3 charts
- ✅ 10 comprehensive report components
- ✅ 3 investor management components
- ✅ All routes configured
- ✅ Responsive design
- ✅ Type-safe TypeScript
- ✅ Vuexy theme consistency

**Happy coding! 🚀**
