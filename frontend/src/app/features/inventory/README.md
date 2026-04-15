# Inventory Management Module

## Overview
This module provides comprehensive inventory management functionality including stock level tracking, transfers, adjustments, batch management, and reporting.

## Components

### Stock Level Dashboard (`stock-level-dashboard.component.ts`)
A comprehensive dashboard for viewing and managing stock levels across warehouses.

**Features:**
- **Real-time Stock Overview**
  - Total items in inventory
  - Total inventory value
  - Low stock items count
  - Out of stock items count

- **Stock Level Table**
  - Item code, name, category, company
  - Warehouse-wise stock levels
  - Available quantity (total - reserved)
  - Reserved quantity
  - Minimum level indicator
  - Low stock alerts (highlighted)
  - Batch information
  - Expiry dates with warnings

- **Filters and Search**
  - Search by item name/code
  - Filter by warehouse
  - Filter by category
  - Filter by company
  - Filter by stock status (all, low stock, out of stock)

- **Actions**
  - View item details
  - Quick transfer (to be implemented in Task 10.2)
  - Quick adjustment (to be implemented in Task 10.3)
  - View movement history

- **Real-time Updates**
  - Manual refresh button
  - Auto-refresh toggle (30-second interval)
  - Loading indicators

## Services

### InventoryService (`inventory.service.ts`)
Handles all inventory-related API calls.

**Methods:**
- `getStockLevels(params)` - Get stock levels with filters
- `getStockOverview(warehouseId?)` - Get stock overview/summary
- `getWarehouseStock(itemId)` - Get warehouse-wise stock for an item
- `getStockByWarehouse(warehouseId, params)` - Get stock for a warehouse
- `getLowStockItems(warehouseId?)` - Get low stock items
- `getReorderSuggestions(warehouseId?)` - Get reorder suggestions
- `createTransfer(transferData)` - Create stock transfer
- `getTransfers(params)` - Get stock transfers
- `updateTransferStatus(transferId, status)` - Update transfer status
- `createAdjustment(adjustmentData)` - Create stock adjustment
- `getAdjustments(params)` - Get stock adjustments
- `approveAdjustment(adjustmentId)` - Approve adjustment
- `rejectAdjustment(adjustmentId, reason)` - Reject adjustment
- `getMovementHistory(itemId, warehouseId?, days)` - Get movement history
- `reserveStock(itemId, warehouseId, quantity, referenceId)` - Reserve stock
- `releaseReservation(reservationId)` - Release reservation
- `getStockValuation(method, warehouseId?)` - Get stock valuation

## Models

### StockLevel
```typescript
{
  _id: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  categoryId?: string;
  categoryName?: string;
  companyId?: string;
  companyName?: string;
  warehouseId: string;
  warehouseName: string;
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  minimumLevel?: number;
  reorderLevel?: number;
  batchNumber?: string;
  expiryDate?: string;
  lastUpdated: string;
  isLowStock?: boolean;
  isOutOfStock?: boolean;
}
```

### StockOverview
```typescript
{
  totalItems: number;
  totalInventoryValue: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalQuantity: number;
  totalReserved: number;
  totalAvailable: number;
}
```

## Routing

The inventory module is accessible at `/inventory` with the following routes:
- `/inventory/stock-levels` - Stock Level Dashboard (default)
- `/inventory/transfers` - Stock Transfers (Task 10.2)
- `/inventory/adjustments` - Stock Adjustments (Task 10.3)
- `/inventory/batches` - Batch Management (Task 10.4)
- `/inventory/physical-count` - Physical Count (Task 10.5)
- `/inventory/reports` - Inventory Reports (Task 10.6)

## API Endpoints

The service connects to the following backend endpoints:

```
GET    /api/v1/inventory/stock                    # Get stock levels
GET    /api/v1/inventory/stock/overview           # Get stock overview
GET    /api/v1/inventory/stock/item/:id           # Get warehouse stock for item
GET    /api/v1/inventory/stock/warehouse/:id      # Get stock by warehouse
GET    /api/v1/inventory/low-stock                # Get low stock items
GET    /api/v1/inventory/reorder-suggestions      # Get reorder suggestions
POST   /api/v1/inventory/transfer                 # Create transfer
GET    /api/v1/inventory/transfers                # Get transfers
PATCH  /api/v1/inventory/transfer/:id/status      # Update transfer status
POST   /api/v1/inventory/adjustment               # Create adjustment
GET    /api/v1/inventory/adjustments              # Get adjustments
PATCH  /api/v1/inventory/adjustment/:id/approve   # Approve adjustment
PATCH  /api/v1/inventory/adjustment/:id/reject    # Reject adjustment
GET    /api/v1/inventory/movements/item/:id       # Get movement history
POST   /api/v1/inventory/reserve                  # Reserve stock
POST   /api/v1/inventory/release/:id              # Release reservation
GET    /api/v1/inventory/valuation                # Get stock valuation
```

## Usage

### Importing the Component
```typescript
import { StockLevelDashboardComponent } from './features/inventory/components';
```

### Using in Routes
```typescript
{
  path: 'inventory/stock-levels',
  loadComponent: () => import('./features/inventory/components/stock-level-dashboard/stock-level-dashboard.component')
    .then(m => m.StockLevelDashboardComponent)
}
```

## Styling

The component uses Material Design with custom styling:
- Responsive grid layout for overview cards
- Color-coded status indicators
- Expiry date warnings (yellow for expiring soon, red for expired)
- Low stock highlighting
- Mobile-responsive design

## Future Enhancements

1. **WebSocket Integration** - Real-time stock updates via WebSocket
2. **Export Functionality** - Excel and PDF export implementation
3. **Advanced Filtering** - Multi-select filters, date ranges
4. **Batch Operations** - Bulk transfers and adjustments
5. **Stock Alerts** - Email/SMS notifications for low stock
6. **Barcode Scanning** - Quick item lookup via barcode
7. **Stock Forecasting** - Predictive analytics for reorder points

## Testing

To test the component:
1. Navigate to `/inventory/stock-levels`
2. Verify overview cards display correct data
3. Test search functionality
4. Test all filters
5. Test pagination
6. Test auto-refresh toggle
7. Verify action menu items

## Dependencies

- Angular Material (Tables, Cards, Forms, etc.)
- RxJS (Observables, Operators)
- SweetAlert2 (Toast notifications via ToastService)

## Notes

- The component uses standalone component architecture
- All API calls are handled through the InventoryService
- Loading states are managed with local component state
- Error handling uses the ToastService for user feedback
- The component follows the existing application patterns and styling
