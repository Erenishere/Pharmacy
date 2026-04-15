# Stock Adjustment Component

## Overview
The Stock Adjustment component provides a comprehensive UI for managing stock adjustments in the inventory system. It allows users to create, view, approve, and reject stock adjustments with complete audit trail.

## Features

### 1. Stock Adjustment Form
- **Date Selection**: Choose adjustment date
- **Warehouse Selection**: Select warehouse for adjustment
- **Item Selection**: Choose item to adjust
- **Current Stock Display**: Shows real-time stock levels
  - Current Stock
  - Reserved Quantity
  - Available Quantity
  - Projected New Stock Level
- **Adjustment Type**: Increase or Decrease
- **Quantity Entry**: Enter adjustment quantity in units
- **Reason Selection**: 
  - Physical Count Correction
  - Damage
  - Expiry
  - Theft
  - Other
- **Batch Number**: Optional batch tracking
- **Detailed Notes**: Required for audit trail

### 2. Stock Adjustment List
- **Comprehensive Table**: Displays all adjustments with:
  - Date
  - Adjustment Number
  - Item Name
  - Warehouse
  - Adjustment Type (Increase/Decrease)
  - Quantity
  - Reason
  - Status (Pending/Approved/Rejected)
  - Created By
- **Pagination**: Configurable page sizes (10, 25, 50, 100)
- **Sorting**: Sort by any column
- **Actions Menu**:
  - View Details
  - Approve (for pending adjustments)
  - Reject (for pending adjustments)
  - Print

### 3. Approval Workflow
- **Manager Approval**: Large adjustments require approval
- **Approve Action**: Approve pending adjustments
- **Reject Action**: Reject with reason
- **Status Tracking**: Visual status indicators

### 4. Real-time Stock Validation
- **Stock Level Check**: Automatically loads current stock when item and warehouse are selected
- **Decrease Validation**: Prevents decreasing more than available quantity
- **Stock Projection**: Shows projected stock level after adjustment

## Requirements Satisfied

This component satisfies **Requirement 4: Stock Adjustment** with all 12 acceptance criteria:

1. ✅ Warehouse selection required
2. ✅ Item selection required
3. ✅ Current stock level displayed
4. ✅ Adjustment type (increase/decrease) required
5. ✅ Adjustment quantity required
6. ✅ Reason selection (physical count, damage, expiry, theft, other)
7. ✅ Detailed notes required
8. ✅ Batch selection support
9. ✅ Stock level updated on save
10. ✅ Stock movement record created
11. ✅ Manager approval workflow for large adjustments
12. ✅ Complete audit trail displayed

## Usage

### Import the Component
```typescript
import { StockAdjustmentComponent } from './features/inventory/components';
```

### Use in Routes
```typescript
{
  path: 'stock-adjustment',
  component: StockAdjustmentComponent
}
```

### Standalone Component
This is a standalone component and can be used directly without module imports.

## API Integration

The component uses the following InventoryService methods:
- `getStockLevels()` - Get current stock levels
- `createAdjustment()` - Create new adjustment
- `getAdjustments()` - List all adjustments
- `approveAdjustment()` - Approve pending adjustment
- `rejectAdjustment()` - Reject pending adjustment

## Validation Rules

1. **Required Fields**:
   - Adjustment Date
   - Warehouse
   - Item
   - Adjustment Type
   - Quantity (minimum 1)
   - Reason
   - Detailed Notes

2. **Business Rules**:
   - Cannot decrease more than available quantity
   - Quantity must be positive
   - Notes are mandatory for audit trail
   - Only pending adjustments can be approved/rejected

## Styling

The component uses Material Design with custom styling:
- Responsive grid layout
- Color-coded adjustment types (green for increase, red for decrease)
- Status chips with appropriate colors
- Gradient stock info card
- Mobile-responsive design

## Testing

Comprehensive unit tests cover:
- Component initialization
- Form validation
- Stock level loading
- Adjustment creation
- Approval/rejection workflow
- Error handling
- Pagination
- Formatting utilities

Run tests:
```bash
ng test --include='**/stock-adjustment.component.spec.ts'
```

## Accessibility

- Proper ARIA labels
- Keyboard navigation support
- Screen reader friendly
- High contrast colors
- Tooltips for additional information

## Future Enhancements

1. Bulk adjustment support
2. Excel import/export
3. Advanced filtering
4. Adjustment templates
5. Email notifications for approvals
6. Detailed audit log viewer
7. Batch-wise adjustment history
