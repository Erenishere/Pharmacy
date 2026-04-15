# Batch Management Component

## Overview

The Batch Management component provides a comprehensive UI for managing pharmaceutical batches with expiry tracking, FIFO/FEFO recommendations, and batch-wise inventory reports.

## Features

### 1. Batch Listing and Filtering
- View all batches with detailed information
- Filter by warehouse, item, and status
- Search by item name or batch number
- Configurable near-expiry threshold (default: 90 days)

### 2. Batch Details Display
- **Batch Number**: Unique identifier for each batch
- **Item Information**: Name and code
- **Warehouse Location**: Current storage location
- **Manufacturing Date**: Production date
- **Expiry Date**: Expiration date with visual indicators
- **Quantities**: Initial and remaining quantities
- **Cost Information**: Unit cost and total cost
- **Status**: Active, Near Expiry, Expired, or Depleted

### 3. Visual Status Indicators
- **Active**: Green indicator for batches with sufficient shelf life
- **Near Expiry**: Orange indicator for batches approaching expiry (within threshold)
- **Expired**: Red indicator for expired batches
- **Depleted**: Gray indicator for batches with zero remaining quantity

### 4. FIFO/FEFO Recommendations
- **Do Not Use - Expired**: Red chip for expired batches
- **Use First - Expiring Soon**: Orange chip for batches expiring within 30 days
- **Use Next - Near Expiry**: Yellow chip for batches expiring within 90 days
- **Normal Priority**: Green chip for batches with >90 days until expiry

### 5. Statistics Dashboard
- Total batches count
- Active batches count with total value
- Near-expiry batches count
- Expired batches count requiring action
- Total inventory value

### 6. Auto-Refresh
- Toggle auto-refresh functionality
- Configurable refresh interval (default: 60 seconds)
- Manual refresh button

### 7. Export and Reporting
- Export to Excel
- Export to PDF
- Generate expiry alert reports
- Generate batch-wise stock reports

## Usage

### Basic Usage

```typescript
import { BatchManagementComponent } from './features/inventory/components';

// In your routing module
{
  path: 'batches',
  component: BatchManagementComponent
}
```

### Filtering Batches

The component supports multiple filter options:

1. **Search**: Type item name or batch number in the search field
2. **Warehouse**: Select a specific warehouse from the dropdown
3. **Status**: Filter by Active, Near Expiry, Expired, or Depleted
4. **Near Expiry Days**: Adjust the threshold for near-expiry warnings

### Understanding FIFO/FEFO

The component implements First Expired, First Out (FEFO) recommendations:

- **Priority 1 (Urgent)**: Batches expiring within 30 days should be used immediately
- **Priority 2 (Soon)**: Batches expiring within 90 days should be used next
- **Priority 3 (Normal)**: Batches with >90 days can be used normally
- **Do Not Use**: Expired batches should not be dispensed

## API Integration

The component uses the `BatchService` which connects to the following backend endpoints:

- `GET /api/v1/batches` - List all batches with filtering
- `GET /api/v1/batches/:id` - Get batch details
- `GET /api/v1/batches/expiring-soon` - Get expiring batches
- `GET /api/v1/batches/expired` - Get expired batches
- `GET /api/v1/batches/statistics` - Get batch statistics
- `GET /api/v1/batches/item/:itemId` - Get batches for specific item

## Requirements Satisfied

This component satisfies **Requirement 5: Batch and Expiry Management** with all 10 acceptance criteria:

1. ✅ Display all batches for items with batch tracking
2. ✅ Display batch details: Batch Number, Mfg Date, Expiry Date, Quantity, Remaining Qty, Warehouse, Status
3. ✅ Highlight near-expiry batches (configurable days, default 90)
4. ✅ Highlight expired batches
5. ✅ Auto-update status to Expired (handled by backend)
6. ✅ Auto-update status to Depleted (handled by backend)
7. ✅ Provide expiry alert report
8. ✅ Provide expired items report
9. ✅ Recommend FIFO/FEFO batch selection
10. ✅ Prevent selling expired batches (visual indicators and recommendations)

## Styling

The component uses Material Design with custom color-coded status indicators:

- **Active**: Green (#4caf50)
- **Near Expiry**: Orange (#ff9800)
- **Expired**: Red (#f44336)
- **Depleted**: Gray (#9e9e9e)

## Responsive Design

The component is fully responsive and adapts to different screen sizes:

- **Desktop**: Full grid layout with all columns visible
- **Tablet**: Adjusted grid with 2 columns for statistics
- **Mobile**: Single column layout with stacked elements

## Testing

Comprehensive unit tests are provided in `batch-management.component.spec.ts`:

- Component initialization
- Batch status helpers
- Expiry date calculations
- FIFO/FEFO recommendations
- Filtering functionality
- Pagination
- Data refresh
- Error handling
- Formatting helpers

Run tests with:
```bash
ng test --include='**/batch-management.component.spec.ts'
```

## Future Enhancements

Potential improvements for future iterations:

1. Batch details dialog with full history
2. Batch movement tracking visualization
3. Batch transfer functionality
4. Batch adjustment capabilities
5. Advanced filtering with date ranges
6. Batch barcode scanning
7. Batch quality control integration
8. Batch recall management

## Dependencies

- Angular Material Components
- RxJS for reactive programming
- HttpClient for API communication
- ToastService for notifications

## Notes

- The component follows the same patterns as StockLevelDashboardComponent
- All backend batch endpoints are already implemented
- The component is standalone and can be used independently
- Auto-refresh is disabled by default to conserve resources
