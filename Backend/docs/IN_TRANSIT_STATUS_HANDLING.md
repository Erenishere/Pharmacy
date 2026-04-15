# In-Transit Status Handling Documentation

## Overview

The in-transit status feature allows tracking stock transfers between warehouses during the physical movement of goods. This ensures accurate inventory tracking by distinguishing between stock that has left the source warehouse but hasn't yet arrived at the destination warehouse.

## Requirements Implemented

This implementation satisfies the following requirements from the Inventory Management specification:

- **Requirement 3.12**: Support "In Transit" status for stock transfers
- **Requirement 3.13**: When transfer is in transit, stock is not shown in either warehouse
- **Requirement 3.14**: When transfer is received, add to destination warehouse
- **Requirement 3.15**: Display transfer list with status information

## Key Features

### 1. Creating In-Transit Transfers

When creating a stock transfer with `status: 'in_transit'`:

- Stock is **deducted** from the source warehouse immediately
- Stock is **NOT added** to the destination warehouse yet
- Two stock movement records are created with `status: 'in_transit'`:
  - One outbound movement from source warehouse
  - One inbound movement to destination warehouse

**Example:**
```javascript
const transferResult = await stockTransferService.createTransfer({
  itemId: 'item123',
  fromWarehouseId: 'warehouse1',
  toWarehouseId: 'warehouse2',
  quantity: 100,
  status: 'in_transit',  // Key parameter
  notes: 'Transfer to branch',
  createdBy: 'user123'
});
```

### 2. Receiving In-Transit Transfers

When goods physically arrive at the destination warehouse, use `receiveTransfer()`:

- Stock is **added** to the destination warehouse
- Both stock movement records are updated to `status: 'completed'`
- Inventory records are created or updated in the destination warehouse

**Example:**
```javascript
const receiveResult = await stockTransferService.receiveTransfer(
  transferId,
  userId
);
```

**Result:**
- `success`: Boolean indicating operation success
- `receivedQuantity`: Quantity received
- `warehouse`: Destination warehouse details with new stock level
- `receivedBy`: User ID who received the transfer
- `receivedAt`: Timestamp of receipt

### 3. Cancelling In-Transit Transfers

If a transfer needs to be cancelled (e.g., goods damaged in transit, wrong destination):

- Stock is **restored** to the source warehouse
- Both stock movement records are updated to `status: 'cancelled'`
- Cancellation reason is appended to movement notes

**Example:**
```javascript
const cancelResult = await stockTransferService.cancelTransfer(
  transferId,
  userId,
  'Goods damaged in transit'
);
```

**Result:**
- `success`: Boolean indicating operation success
- `cancelledQuantity`: Quantity cancelled
- `restoredToWarehouse`: Source warehouse details
- `cancelledBy`: User ID who cancelled
- `cancelledAt`: Timestamp of cancellation
- `reason`: Cancellation reason

## Workflow Diagrams

### Complete In-Transit Transfer Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. Create In-Transit Transfer                                   │
│    - Source: 1000 units → 900 units (deducted)                 │
│    - Destination: 0 units (not added yet)                       │
│    - Status: in_transit                                         │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. Goods in Transit                                             │
│    - Stock not visible in either warehouse                      │
│    - Transfer tracked with transferId                           │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. Receive Transfer                                             │
│    - Source: 900 units (unchanged)                              │
│    - Destination: 0 → 100 units (added)                         │
│    - Status: completed                                          │
└─────────────────────────────────────────────────────────────────┘
```

### Cancelled In-Transit Transfer Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. Create In-Transit Transfer                                   │
│    - Source: 1000 units → 900 units (deducted)                 │
│    - Destination: 0 units (not added)                           │
│    - Status: in_transit                                         │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. Cancel Transfer                                              │
│    - Source: 900 → 1000 units (restored)                        │
│    - Destination: 0 units (unchanged)                           │
│    - Status: cancelled                                          │
└─────────────────────────────────────────────────────────────────┘
```

## API Usage

### Create In-Transit Transfer

**Endpoint:** `POST /api/v1/inventory/transfer`

**Request Body:**
```json
{
  "itemId": "64abc123...",
  "fromWarehouseId": "64def456...",
  "toWarehouseId": "64ghi789...",
  "quantity": 100,
  "status": "in_transit",
  "notes": "Transfer to branch warehouse",
  "createdBy": "64user123..."
}
```

**Response:**
```json
{
  "success": true,
  "transferId": "64transfer123...",
  "transfer": {
    "itemId": "64abc123...",
    "itemName": "Test Product",
    "quantity": 100,
    "fromWarehouse": {
      "id": "64def456...",
      "name": "Main Warehouse",
      "remainingStock": 900
    },
    "toWarehouse": {
      "id": "64ghi789...",
      "name": "Branch Warehouse"
    },
    "status": "in_transit",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

### Receive In-Transit Transfer

**Endpoint:** `POST /api/v1/inventory/transfer/:transferId/receive`

**Request Body:**
```json
{
  "userId": "64user123..."
}
```

**Response:**
```json
{
  "success": true,
  "transferId": "64transfer123...",
  "receivedQuantity": 100,
  "warehouse": {
    "id": "64ghi789...",
    "name": "Branch Warehouse",
    "newStock": 100
  },
  "receivedBy": "64user123...",
  "receivedAt": "2024-01-16T14:20:00Z"
}
```

### Cancel In-Transit Transfer

**Endpoint:** `POST /api/v1/inventory/transfer/:transferId/cancel`

**Request Body:**
```json
{
  "userId": "64user123...",
  "reason": "Goods damaged in transit"
}
```

**Response:**
```json
{
  "success": true,
  "transferId": "64transfer123...",
  "cancelledQuantity": 100,
  "restoredToWarehouse": {
    "id": "64def456...",
    "name": "Main Warehouse"
  },
  "cancelledBy": "64user123...",
  "cancelledAt": "2024-01-16T11:45:00Z",
  "reason": "Goods damaged in transit"
}
```

### List Transfers by Status

**Endpoint:** `GET /api/v1/inventory/transfers?status=in_transit`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "transferId": "64transfer123...",
      "date": "2024-01-15T10:30:00Z",
      "item": {
        "id": "64abc123...",
        "code": "ITEM001",
        "name": "Test Product"
      },
      "fromWarehouse": {
        "id": "64def456...",
        "code": "WH001",
        "name": "Main Warehouse"
      },
      "toWarehouse": {
        "id": "64ghi789...",
        "code": "WH002",
        "name": "Branch Warehouse"
      },
      "quantity": 100,
      "status": "in_transit",
      "user": "admin",
      "actions": ["view", "print"]
    }
  ],
  "pagination": {
    "total": 1,
    "page": 1,
    "limit": 50,
    "pages": 1
  }
}
```

## Batch Handling

In-transit transfers fully support batch tracking:

```javascript
// Create in-transit transfer with batch
const transferResult = await stockTransferService.createTransfer({
  itemId: 'item123',
  fromWarehouseId: 'warehouse1',
  toWarehouseId: 'warehouse2',
  quantity: 50,
  batchNumber: 'BATCH001',
  expiryDate: new Date('2025-12-31'),
  status: 'in_transit',
  createdBy: 'user123'
});

// Receive transfer - batch info is preserved
const receiveResult = await stockTransferService.receiveTransfer(
  transferResult.transferId,
  'user123'
);
```

The batch number and expiry date are:
- Tracked in both stock movement records
- Used to query the correct inventory record
- Preserved when creating destination inventory

## Carton/Box/Unit Quantities

In-transit transfers support the carton/box/unit breakdown:

```javascript
const transferResult = await stockTransferService.createTransfer({
  itemId: 'item123',
  fromWarehouseId: 'warehouse1',
  toWarehouseId: 'warehouse2',
  quantities: {
    qtyCtn: 2,   // 2 cartons
    qtyBox: 5,   // 5 boxes
    qtyUnit: 50  // 50 units
  },
  status: 'in_transit',
  createdBy: 'user123'
});

// Total units calculated: (2 × 10 × 100) + (5 × 100) + 50 = 2550 units
```

## State Transitions

Valid state transitions for transfers:

```
pending → in_transit → completed
pending → in_transit → cancelled
pending → completed (direct transfer)
```

Invalid transitions (will throw errors):
- `completed → in_transit` (cannot revert completed transfer)
- `cancelled → in_transit` (cannot restart cancelled transfer)
- `completed → cancelled` (cannot cancel completed transfer)

## Error Handling

### Common Errors

1. **Transfer ID Required**
   - Error: "Transfer ID is required"
   - Occurs when: transferId is null or undefined
   - Solution: Provide valid transferId

2. **In-Transit Transfer Not Found**
   - Error: "In-transit transfer not found"
   - Occurs when: No movements with status 'in_transit' found for transferId
   - Possible causes:
     - Transfer already completed
     - Transfer already cancelled
     - Invalid transferId
     - Transfer was created with status 'completed'

3. **Inbound Movement Not Found**
   - Error: "Inbound movement not found"
   - Occurs when: Only outbound movement exists (data corruption)
   - Solution: Contact system administrator

4. **Outbound Movement Not Found**
   - Error: "Outbound movement not found"
   - Occurs when: Only inbound movement exists (data corruption)
   - Solution: Contact system administrator

## Edge Cases Handled

### 1. Multiple In-Transit Transfers
The system correctly handles multiple simultaneous in-transit transfers for the same item:

```javascript
// Create multiple transfers
const transfer1 = await createTransfer({ quantity: 100, status: 'in_transit' });
const transfer2 = await createTransfer({ quantity: 150, status: 'in_transit' });

// Source inventory: 1000 - 100 - 150 = 750

// Receive them independently
await receiveTransfer(transfer1.transferId);  // Dest: 0 → 100
await receiveTransfer(transfer2.transferId);  // Dest: 100 → 250
```

### 2. Receiving to Existing Inventory
When receiving a transfer to a warehouse that already has stock:

```javascript
// Destination already has 200 units
// Receive transfer of 100 units
// Result: 200 + 100 = 300 units
```

### 3. Cancelled Transfer with Missing Inventory
If source inventory record is deleted (edge case), cancellation still succeeds gracefully:

```javascript
// Transfer created: source 1000 → 900
// Source inventory deleted (manual intervention)
// Cancel transfer: gracefully handles missing inventory
// Movement records updated to 'cancelled'
```

### 4. Concurrent Operations
The system uses MongoDB transactions where appropriate to handle concurrent operations safely.

## Testing

### Unit Tests
Location: `Backend/tests/unit/stockTransferService.test.js`

Coverage includes:
- Creating in-transit transfers
- Receiving in-transit transfers (new inventory and existing inventory)
- Cancelling in-transit transfers
- Batch number handling
- Error cases (missing IDs, not found, invalid movements)
- Edge cases (missing inventory)

### Integration Tests
Location: `Backend/tests/integration/stockTransfer.intransit.test.js`

Coverage includes:
- Complete in-transit workflow (create → receive)
- Complete cancellation workflow (create → cancel)
- Multiple concurrent transfers
- Batch handling end-to-end
- Carton/box/unit quantities
- State transition validation
- Transfer history tracking
- Edge cases with real database

### Running Tests

```bash
# Run unit tests
cd Backend
npm test -- stockTransferService.test.js

# Run integration tests
npm test -- stockTransfer.intransit.test.js

# Run all inventory tests
npm test -- inventory
```

## Performance Considerations

1. **Indexing**: The `status` field in StockMovement is indexed for fast queries
2. **Batch Operations**: Use `Promise.all()` for concurrent operations when safe
3. **Query Optimization**: Populate only required fields to reduce data transfer
4. **Transaction Support**: Consider using MongoDB transactions for critical operations

## Best Practices

1. **Always Validate**: Use `validateTransferData()` before creating transfers
2. **Track Transfer IDs**: Store transferId for later receive/cancel operations
3. **Handle Errors**: Implement proper error handling for all operations
4. **Audit Trail**: All operations are logged with user ID and timestamp
5. **Status Checks**: Verify transfer status before attempting receive/cancel
6. **Batch Tracking**: Always include batch number when transferring batched items
7. **User Notifications**: Notify users when transfers are received or cancelled

## Future Enhancements

Potential improvements for future versions:

1. **Partial Receives**: Allow receiving partial quantities from in-transit transfers
2. **Transfer Tracking**: Add GPS/location tracking for in-transit goods
3. **Estimated Arrival**: Track expected arrival dates and send alerts
4. **Transfer Notes**: Allow adding notes during receive/cancel operations
5. **Photo Evidence**: Attach photos when receiving or cancelling transfers
6. **Approval Workflow**: Require approval for high-value transfers
7. **Auto-Receive**: Automatically receive transfers after X days
8. **Transfer Templates**: Save common transfer routes as templates

## Support

For issues or questions about in-transit status handling:

1. Check this documentation first
2. Review test files for usage examples
3. Check error messages for specific guidance
4. Contact the development team

## Version History

- **v1.0.0** (2024-01-15): Initial implementation
  - Basic in-transit status support
  - Receive and cancel operations
  - Batch tracking support
  - Comprehensive test coverage
