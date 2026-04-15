# Stock Transfer Component

## Overview
Comprehensive stock transfer UI component for managing inter-warehouse stock transfers.

## Features Implemented

### 1. Create Stock Transfers (Requirement 3.1-3.8)
- ✅ Source warehouse selection (Requirement 3.1)
- ✅ Destination warehouse selection (Requirement 3.2)
- ✅ Validation: source ≠ destination (Requirement 3.3)
- ✅ Item selection (Requirement 3.4)
- ✅ Quantity entry with carton/box/unit breakdown (Requirement 3.5)
- ✅ Auto-calculation of total unit quantity (Requirement 3.6)
- ✅ Stock validation in source warehouse (Requirement 3.7)
- ✅ Batch selection support (Requirement 3.8)

### 2. Transfer Processing (Requirement 3.9-3.14)
- ✅ Deduct from source warehouse (Requirement 3.9)
- ✅ Add to destination warehouse (Requirement 3.10)
- ✅ Create stock movement records (Requirement 3.11)
- ✅ In-transit status support (Requirement 3.12)
- ✅ Stock not shown in either warehouse during transit (Requirement 3.13)
- ✅ Add to destination when received (Requirement 3.14)

### 3. Transfer List (Requirement 3.15)
- ✅ Display: Date, Item, From Warehouse, To Warehouse, Qty, User, Status, Actions
- ✅ Filtering and pagination
- ✅ Status indicators (pending, in_transit, completed, cancelled)
- ✅ Action menu: Edit, Receive, Print, Delete

## Component Structure

### Form Fields
- **Transfer Date**: Date picker for transfer date
- **Item**: Dropdown with item selection
- **From Warehouse**: Source warehouse dropdown
- **To Warehouse**: Destination warehouse dropdown
- **Quantity Section**:
  - QTY Carton
  - QTY Box
  - QTY Unit
  - Total Unit QTY (auto-calculated)
- **Batch Number**: Optional batch selection
- **Status**: Transfer status (pending, in_transit, completed, cancelled)

### Quantity Calculation
```typescript
totalUnitQty = (qtyCtn × cartonToBoxes × boxToUnits) + (qtyBox × boxToUnits) + qtyUnit
```

Example:
- Item packing: 1 Carton = 10 Boxes, 1 Box = 100 Units
- Input: 2 Cartons + 5 Boxes + 50 Units
- Calculation: (2 × 10 × 100) + (5 × 100) + 50 = 2550 units

### Validation
- Source and destination warehouses must be different
- At least one quantity field must be > 0
- Sufficient stock must be available in source warehouse
- All required fields must be filled

### Actions
- **Edit**: Modify pending/in-transit transfers
- **Receive**: Mark in-transit transfers as completed
- **Print**: Generate transfer document
- **Delete**: Remove pending transfers

## API Integration

### Endpoints Used
- `POST /api/v1/inventory/transfer` - Create new transfer
- `GET /api/v1/inventory/transfers` - List transfers with filters
- `GET /api/v1/inventory/transfer/:id` - Get transfer details
- `PATCH /api/v1/inventory/transfer/:id/status` - Update transfer status
- `POST /api/v1/inventory/transfer/:id/receive` - Receive transfer
- `POST /api/v1/inventory/transfer/:id/cancel` - Cancel transfer

### Request Format
```json
{
  "transferDate": "2025-01-15T00:00:00Z",
  "itemId": "item123",
  "fromWarehouseId": "wh1",
  "toWarehouseId": "wh2",
  "quantities": {
    "qtyCtn": 2,
    "qtyBox": 5,
    "qtyUnit": 50,
    "totalUnitQty": 2550
  },
  "batchNumber": "BATCH001",
  "status": "in_transit"
}
```

### Response Format
```json
{
  "success": true,
  "data": {
    "_id": "transfer123",
    "transferNumber": "TRF-12345678",
    "transferDate": "2025-01-15T00:00:00Z",
    "itemName": "D/Syringe 5cc",
    "fromWarehouseName": "Main Warehouse",
    "toWarehouseName": "Branch-1",
    "quantities": {
      "qtyCtn": 2,
      "qtyBox": 5,
      "qtyUnit": 50,
      "totalUnitQty": 2550
    },
    "status": "in_transit",
    "createdBy": "USER001"
  }
}
```

## Material Design Components Used
- MatCard
- MatFormField
- MatInput
- MatSelect
- MatDatepicker
- MatTable
- MatPaginator
- MatSort
- MatButton
- MatIcon
- MatMenu
- MatChip
- MatTooltip
- MatProgressSpinner

## Responsive Design
- Desktop: Multi-column grid layout
- Tablet: 2-column layout
- Mobile: Single-column stacked layout
- Table: Horizontal scroll on small screens

## Testing
Unit tests are provided in `stock-transfer.component.spec.ts` covering:
- Component initialization
- Form validation
- Quantity calculation
- Transfer creation
- Transfer receiving
- Error handling

## Usage

### In Routes
```typescript
{
  path: 'inventory/stock-transfer',
  loadComponent: () => import('./features/inventory/components/stock-transfer/stock-transfer.component')
    .then(m => m.StockTransferComponent)
}
```

### Standalone
```typescript
import { StockTransferComponent } from './features/inventory/components/stock-transfer/stock-transfer.component';
```

## Future Enhancements
- Bulk transfer creation
- Transfer templates
- Barcode scanning for items
- Real-time stock availability check
- Transfer approval workflow
- Transfer history timeline
- Export to Excel/PDF
- Email notifications
