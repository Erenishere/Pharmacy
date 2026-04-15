# Master Data Management Module

This module provides comprehensive master data management functionality for the Indus Traders ERP system.

## Structure

```
master-data/
├── services/           # API communication services
│   ├── item-master.service.ts
│   ├── account-master.service.ts
│   ├── company-master.service.ts
│   ├── user-master.service.ts
│   └── supporting-master.service.ts
├── components/         # UI components
│   ├── item-master-list/
│   ├── item-master-form/
│   ├── item-master-detail/
│   ├── company-master-list/
│   ├── company-master-form/
│   ├── account-master-list/
│   ├── user-master-list/
│   └── supporting-master-list/
└── README.md
```

## Services

### ItemMasterService
Manages pharmaceutical items with complete specifications including:
- CRUD operations for items
- Advanced filtering and search
- Low stock and expiring items alerts
- Bulk import/export (Excel, PDF)
- Stock level management

### AccountMasterService
Manages different account types (customer, supplier, employee, investor):
- Account CRUD operations
- Credit limit management
- Account ledger and transactions
- Balance updates
- Bulk import/export

### CompanyMasterService
Manages pharmaceutical manufacturing companies:
- Company CRUD operations
- Group type classification (A, B, C)
- Status management

### UserMasterService
Manages system users and permissions:
- User CRUD operations
- Role-based access control
- Permission management
- Password management (change, forgot, reset)

### SupportingMasterService
Manages supporting master data:
- Warehouses
- Towns and Areas
- Categories and SubCategories
- Formulas and Formula Sizes
- Business Types
- Salesmen
- Transporters
- Claim Accounts

## Components

### Item Management
- **ItemMasterListComponent**: Full-featured list with filters, pagination, search, and export
- **ItemMasterFormComponent**: Comprehensive form with tabs for basic info, pricing, inventory, tax & specifications
- **ItemMasterDetailComponent**: Detailed view of item information

### Company Management
- **CompanyMasterListComponent**: List with group type filtering
- **CompanyMasterFormComponent**: Form for company creation/editing

### Account Management
- **AccountMasterListComponent**: Stub component for account listing (to be fully implemented)

### User Management
- **UserMasterListComponent**: Stub component for user listing (to be fully implemented)

### Supporting Master Data
- **SupportingMasterListComponent**: Tabbed interface for all supporting master data (to be fully implemented)

## Authentication & Authorization

### Guards
- **masterDataGuard**: Restricts access to admin, manager, and data_entry roles
- **authGuard**: Ensures user is authenticated
- **adminGuard**: Restricts access to admin role only

### Directives
- **HasRoleDirective**: `*appHasRole="'admin'"` - Show/hide elements based on user role
- **HasPermissionDirective**: `*appHasPermission="'items.create'"` - Show/hide elements based on permissions

### Interceptors
- **authInterceptor**: Automatically adds JWT token to all HTTP requests
- **errorInterceptor**: Handles API errors globally
- **loadingInterceptor**: Manages loading states

## Usage

### Routing Example
```typescript
import { Routes } from '@angular/router';
import { masterDataGuard } from './core/guards/master-data.guard';
import { ItemMasterListComponent } from './features/master-data/components';

export const routes: Routes = [
  {
    path: 'master-data',
    canActivate: [masterDataGuard],
    children: [
      { path: 'items', component: ItemMasterListComponent },
      { path: 'companies', component: CompanyMasterListComponent },
      { path: 'accounts', component: AccountMasterListComponent },
      { path: 'users', component: UserMasterListComponent },
      { path: 'supporting', component: SupportingMasterListComponent }
    ]
  }
];
```

### Service Usage Example
```typescript
import { ItemMasterService } from './features/master-data/services';

constructor(private itemService: ItemMasterService) {}

loadItems() {
  this.itemService.getItems({
    search: 'paracetamol',
    companyId: '123',
    isActive: true,
    page: 1,
    limit: 25
  }).subscribe(response => {
    if (response.success) {
      this.items = response.data;
    }
  });
}
```

### Directive Usage Example
```html
<!-- Show button only for admin and manager roles -->
<button mat-raised-button *appHasRole="['admin', 'manager']">
  Delete Item
</button>

<!-- Show section only if user has permission -->
<div *appHasPermission="'items.create'">
  <button mat-raised-button (click)="addItem()">Add Item</button>
</div>
```

## Features Implemented

### ✅ Completed
- All API communication services with comprehensive methods
- Item Master list, form, and detail components (fully functional)
- Company Master list and form components (fully functional)
- Authentication guards and interceptors
- Role-based and permission-based directives
- Error handling and loading states

### 🚧 Partially Implemented (Stubs Created)
- Account Master components (service ready, UI stub)
- User Master components (service ready, UI stub)
- Supporting Master Data components (service ready, UI stub with tabs)

## Next Steps

To complete the implementation:

1. **Account Management**: Expand AccountMasterListComponent with full CRUD UI, including:
   - Dynamic forms based on account type
   - Employee biodata sub-form
   - Business details sub-form
   - Credit limit validation

2. **User Management**: Expand UserMasterListComponent with:
   - Role and permission management UI
   - Password change form
   - Dimension-based access control UI

3. **Supporting Master Data**: Implement full CRUD for each tab in SupportingMasterListComponent:
   - Warehouse management
   - Town/Area management
   - Category/SubCategory management
   - Formula/FormulaSize management
   - Business Type management
   - Salesman management
   - Transporter management
   - Claim Account management

4. **Testing**: Add unit tests for all services and components

5. **Integration**: Wire up routes in app.routes.ts and add navigation menu items

## API Endpoints

All services communicate with the backend API at `${environment.apiUrl}`:

- Items: `/api/v1/items`
- Accounts: `/api/v1/accounts`
- Companies: `/api/v1/companies`
- Users: `/api/v1/users`
- Warehouses: `/api/v1/warehouses`
- Towns: `/api/v1/towns`
- Areas: `/api/v1/areas`
- Categories: `/api/v1/categories`
- SubCategories: `/api/v1/subcategories`
- Formulas: `/api/v1/formulas`
- Formula Sizes: `/api/v1/formula-sizes`
- Business Types: `/api/v1/business-types`
- Salesmen: `/api/v1/salesmen`
- Transporters: `/api/v1/transporters`
- Claim Accounts: `/api/v1/claim-accounts`

## Dependencies

Required Angular Material modules:
- MatCardModule
- MatButtonModule
- MatIconModule
- MatTableModule
- MatPaginatorModule
- MatFormFieldModule
- MatInputModule
- MatSelectModule
- MatChipsModule
- MatTooltipModule
- MatDialogModule
- MatCheckboxModule
- MatTabsModule

## Notes

- All services use the `ApiResponse<T>` interface for consistent response handling
- Error handling is centralized through the error interceptor
- Loading states are managed through the loading interceptor
- JWT tokens are automatically attached to requests via auth interceptor
- All components are standalone for better tree-shaking and lazy loading
