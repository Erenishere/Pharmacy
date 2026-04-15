# StockMovement Model Status Enhancement

## Overview
Enhanced the StockMovement model to support transfer status tracking as specified in the inventory management design document (Task 1.2).

## Changes Made

### 1. Added Status Field
- **Field Name**: `status`
- **Type**: String (enum)
- **Values**: `['pending', 'in_transit', 'completed', 'cancelled']`
- **Default**: `'completed'`
- **Indexed**: Yes
- **Purpose**: Track the lifecycle of stock movements, especially for inter-warehouse transfers

### 2. Instance Methods Added

#### Status Check Methods
- `canBeCancelled()`: Returns true if movement can be cancelled (pending or in_transit)
- `isInTransit()`: Returns true if movement status is 'in_transit'
- `isCompleted()`: Returns true if movement status is 'completed'

#### Status Transition Methods
- `cancel()`: Cancels a pending or in_transit movement
  - Throws error if movement is already completed or cancelled
- `markInTransit()`: Marks a pending movement as in_transit
  - Throws error if movement is not pending
- `complete()`: Completes a pending or in_transit movement
  - Throws error if movement is cancelled or already completed

### 3. Static Methods Added

#### Query Methods
- `findByStatus(status, options)`: Find movements by status with pagination
  - Populates: itemId, warehouse, transferInfo warehouses, createdBy
  - Supports pagination via options
  
- `findInTransitTransfers()`: Find all in-transit transfer movements
  - Filters by referenceType: 'transfer' or 'warehouse_transfer'
  - Filters by status: 'in_transit'
  - Populates all related fields

- `findPendingMovements()`: Find all pending movements
  - Filters by status: 'pending'
  - Populates itemId, warehouse, createdBy

### 4. Updated Existing Methods

#### calculateStockBalance()
- Now filters movements to only include status: 'completed'
- Excludes in_transit and cancelled movements from stock calculations
- Ensures accurate stock levels by not counting pending/cancelled transfers

#### getItemStockLevels()
- Now filters movements to only include status: 'completed'
- Provides accurate stock levels across warehouses

### 5. Pre-save Hook Enhancement
- Automatically sets status to 'pending' for transfer movements (warehouse_transfer or transfer)
- Sets status to 'completed' for non-transfer movements (purchase, sales, adjustment)
- Maintains backward compatibility with existing code

## Usage Examples

### Creating a Transfer with Status
```javascript
const transfer = await StockMovement.create({
  itemId: item._id,
  warehouse: sourceWarehouse._id,
  movementType: 'out',
  quantity: 50,
  referenceType: 'warehouse_transfer',
  transferInfo: {
    toWarehouse: destWarehouse._id,
    transferId: transferDoc._id
  },
  createdBy: user._id
  // status will automatically be set to 'pending'
});
```

### Status Transitions
```javascript
// Mark as in transit
await transfer.markInTransit();

// Complete the transfer
await transfer.complete();

// Or cancel if needed
await transfer.cancel();
```

### Querying by Status
```javascript
// Find all pending movements
const pending = await StockMovement.findPendingMovements();

// Find in-transit transfers
const inTransit = await StockMovement.findInTransitTransfers();

// Find by specific status with pagination
const completed = await StockMovement.findByStatus('completed', {
  limit: 20,
  page: 1
});
```

### Stock Balance Calculation
```javascript
// Only counts completed movements
const balance = await StockMovement.calculateStockBalance(itemId, warehouseId);
// In-transit and cancelled movements are excluded
```

## Testing

Comprehensive unit tests have been added in `Backend/tests/models/StockMovement.test.js`:

### Test Coverage
1. **Status Field Tests**
   - Default status for non-transfer movements (completed)
   - Default status for transfer movements (pending)
   - Status enum validation
   - All valid status values

2. **Instance Method Tests**
   - canBeCancelled() for all statuses
   - isInTransit() and isCompleted() checks
   - cancel() method with validation
   - markInTransit() method with validation
   - complete() method with validation

3. **Static Method Tests**
   - findByStatus() for all statuses
   - findInTransitTransfers() filtering
   - findPendingMovements() filtering
   - Population of related fields

4. **Stock Balance Tests**
   - Verification that only completed movements are counted
   - Exclusion of in_transit and cancelled movements

## Database Migration

No migration is required as:
- The `status` field has a default value of 'completed'
- Existing records will automatically get 'completed' status
- This maintains backward compatibility

## API Impact

Controllers and services using StockMovement should be updated to:
1. Handle status transitions for transfers
2. Display status in transfer lists
3. Allow users to mark transfers as in_transit or complete them
4. Prevent modifications to completed or cancelled movements

## Next Steps

1. Update stock transfer service to use status transitions
2. Update stock transfer controller to expose status management endpoints
3. Update frontend to display and manage transfer statuses
4. Add status-based filtering in transfer list views

## Compliance

This enhancement fulfills:
- **Requirement 3.12**: Support "In Transit" status for transfers
- **Requirement 3.13**: Track when transfer is in transit
- **Requirement 3.14**: Track when transfer is received/completed
- **Design Specification**: Status field with pending, in_transit, completed, cancelled values
