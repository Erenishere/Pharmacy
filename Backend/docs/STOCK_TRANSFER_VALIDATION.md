# Stock Transfer Validation Rules

## Overview

This document describes the comprehensive validation rules implemented in the Stock Transfer Service (`stockTransferService.js`) to ensure data integrity and business rule compliance for inter-warehouse stock transfers.

## Validation Rules

### 1. Required Fields Validation

**Rule:** All essential fields must be provided for a transfer request.

**Required Fields:**
- `itemId` - The item being transferred
- `fromWarehouseId` - Source warehouse
- `toWarehouseId` - Destination warehouse
- `quantity` OR `quantities` - Transfer quantity (at least one must be > 0)

**Error Messages:**
- "Item ID is required"
- "Source warehouse ID is required"
- "Destination warehouse ID is required"
- "Transfer quantity must be greater than 0"

### 2. Quantity Validation

**Rule:** All quantity values must be valid positive numbers.

**Validations:**
- Quantity must be a valid number (not NaN, not string)
- Quantity cannot be negative
- Carton quantity (`qtyCtn`) must be non-negative
- Box quantity (`qtyBox`) must be non-negative
- Unit quantity (`qtyUnit`) must be non-negative
- Total calculated quantity must be greater than 0

**Error Messages:**
- "Quantity must be a valid number"
- "Quantity cannot be negative"
- "Carton quantity must be a non-negative number"
- "Box quantity must be a non-negative number"
- "Unit quantity must be a non-negative number"

### 3. Warehouse Validation

**Rule:** Source and destination warehouses must exist, be active, and be different.

**Validations:**
- Source warehouse must exist in database
- Destination warehouse must exist in database
- Source and destination must be different warehouses
- Warehouses must be active (if status field exists)

**Error Messages:**
- "Source warehouse not found"
- "Destination warehouse not found"
- "Source and destination warehouses must be different"
- "Source warehouse is {status} and cannot process transfers"
- "Destination warehouse is {status} and cannot receive transfers"

### 4. Item Validation

**Rule:** Item must exist, be active, and not discontinued.

**Validations:**
- Item must exist in database
- Item must be active (if status field exists)
- Item must not be discontinued

**Error Messages:**
- "Item not found"
- "Item is {status} and cannot be transferred"
- "Item is discontinued and cannot be transferred"

### 5. Stock Availability Validation

**Rule:** Sufficient stock must be available in the source warehouse.

**Validations:**
- Item must exist in source warehouse inventory
- Available quantity (not reserved) must be sufficient
- Total quantity must be sufficient
- Batch must exist if batch number is specified

**Error Messages:**
- "Item not found in source warehouse"
- "Item with batch {batchNumber} not found in source warehouse"
- "Insufficient available stock. Available: {available}, Requested: {requested}"
- "Insufficient total stock. Total: {total}, Requested: {requested}"

### 6. Batch and Expiry Validation

**Rule:** Batches must not be expired, and expiry dates must be valid.

**Validations:**
- Expiry date must be a valid date format
- Expiry date must be in the future
- Batch in inventory must not be expired
- Near-expiry warning (within 30 days)

**Error Messages:**
- "Invalid expiry date format"
- "Cannot transfer expired batch. Expiry date must be in the future"
- "Batch {batchNumber} has expired and cannot be transferred"

**Warning Messages:**
- "Batch expires in {days} days. Consider transferring fresher stock"

### 7. Large Transfer Warning

**Rule:** Warn when transferring a large percentage of available stock.

**Validation:**
- Warning when transferring > 80% of available stock

**Warning Message:**
- "Transferring {percentage}% of available stock from source warehouse"

## Validation Response Format

The `validateTransferData()` method returns a comprehensive validation result:

```javascript
{
  isValid: boolean,           // Overall validation status
  errors: string[],           // Array of error messages
  warnings: string[],         // Array of warning messages
  totalQuantity: number,      // Calculated total quantity in units
  
  // Item details
  item: {
    id: ObjectId,
    code: string,
    name: string,
    status: string,
    isDiscontinued: boolean
  },
  
  // Source warehouse details
  fromWarehouse: {
    id: ObjectId,
    code: string,
    name: string,
    status: string
  },
  
  // Destination warehouse details
  toWarehouse: {
    id: ObjectId,
    code: string,
    name: string,
    status: string
  },
  
  // Source inventory details
  sourceInventory: {
    quantity: number,
    availableQuantity: number,
    reservedQuantity: number,
    batchNumber: string,
    expiryDate: Date
  }
}
```

## Usage Examples

### Example 1: Valid Transfer

```javascript
const validation = await stockTransferService.validateTransferData({
  itemId: '507f1f77bcf86cd799439011',
  fromWarehouseId: '507f1f77bcf86cd799439012',
  toWarehouseId: '507f1f77bcf86cd799439013',
  quantity: 100
});

// Result:
// {
//   isValid: true,
//   errors: [],
//   warnings: [],
//   totalQuantity: 100,
//   ...
// }
```

### Example 2: Insufficient Stock

```javascript
const validation = await stockTransferService.validateTransferData({
  itemId: '507f1f77bcf86cd799439011',
  fromWarehouseId: '507f1f77bcf86cd799439012',
  toWarehouseId: '507f1f77bcf86cd799439013',
  quantity: 1000  // More than available
});

// Result:
// {
//   isValid: false,
//   errors: ['Insufficient available stock. Available: 100, Requested: 1000'],
//   warnings: [],
//   ...
// }
```

### Example 3: Near-Expiry Warning

```javascript
const validation = await stockTransferService.validateTransferData({
  itemId: '507f1f77bcf86cd799439011',
  fromWarehouseId: '507f1f77bcf86cd799439012',
  toWarehouseId: '507f1f77bcf86cd799439013',
  quantity: 50,
  expiryDate: new Date('2025-02-15')  // 15 days from now
});

// Result:
// {
//   isValid: true,
//   errors: [],
//   warnings: ['Batch expires in 15 days. Consider transferring fresher stock'],
//   ...
// }
```

### Example 4: Multiple Errors

```javascript
const validation = await stockTransferService.validateTransferData({
  itemId: 'invalid-id',
  fromWarehouseId: 'wh1',
  toWarehouseId: 'wh1',  // Same as source
  quantity: -10  // Negative
});

// Result:
// {
//   isValid: false,
//   errors: [
//     'Quantity cannot be negative',
//     'Item not found',
//     'Source and destination warehouses must be different'
//   ],
//   warnings: [],
//   ...
// }
```

## Integration with processTransfer()

The `processTransfer()` method automatically validates before creating a transfer:

```javascript
try {
  const result = await stockTransferService.processTransfer({
    itemId: '507f1f77bcf86cd799439011',
    fromWarehouseId: '507f1f77bcf86cd799439012',
    toWarehouseId: '507f1f77bcf86cd799439013',
    quantity: 100,
    createdBy: 'user123'
  });
  
  // Transfer created successfully
  // Check result.warnings for any warnings
  if (result.warnings && result.warnings.length > 0) {
    console.log('Warnings:', result.warnings);
  }
  
} catch (error) {
  // Validation failed
  console.error('Transfer validation failed:', error.message);
}
```

## Quantity Calculation

When using carton/box/unit quantities, the total is calculated as:

```
totalUnitQty = (qtyCtn × cartonToBoxes × boxToUnits) + (qtyBox × boxToUnits) + qtyUnit
```

Example:
- Item packing: 1 Carton = 10 Boxes, 1 Box = 100 Units
- Transfer: 2 Cartons + 5 Boxes + 50 Units
- Calculation: (2 × 10 × 100) + (5 × 100) + 50 = 2000 + 500 + 50 = 2550 units

## Requirements Mapping

This validation implementation satisfies the following requirements from the Inventory Management specification:

- **Requirement 3.1:** Source warehouse selection validation
- **Requirement 3.2:** Destination warehouse selection validation
- **Requirement 3.3:** Source ≠ destination validation
- **Requirement 3.4:** Item selection validation
- **Requirement 3.5:** Quantity entry support (carton, box, unit)
- **Requirement 3.6:** Total unit quantity calculation
- **Requirement 3.7:** Sufficient stock validation
- **Requirement 3.8:** Batch selection support

## Testing

Comprehensive unit tests are available in `Backend/tests/unit/stockTransferService.test.js` covering:

- Valid transfer scenarios
- All error conditions
- Warning conditions
- Edge cases (negative quantities, zero quantities, etc.)
- Batch and expiry validation
- Inactive/discontinued items and warehouses
- Large transfer warnings

Run tests with:
```bash
npm test -- stockTransferService.test.js
```

## Best Practices

1. **Always validate before processing:** Use `processTransfer()` which validates automatically, or call `validateTransferData()` explicitly before `createTransfer()`.

2. **Handle warnings:** Even when validation passes, check for warnings and inform users about potential issues.

3. **Provide detailed error messages:** The validation returns all errors at once, allowing users to fix multiple issues in one go.

4. **Check batch expiry:** Always validate batch expiry dates to prevent transferring expired stock.

5. **Monitor large transfers:** Pay attention to warnings about large percentage transfers that might leave source warehouse understocked.

## Future Enhancements

Potential future validation rules to consider:

1. Minimum stock level validation (don't transfer if it would bring source below minimum)
2. Maximum warehouse capacity validation for destination
3. Item compatibility validation (temperature requirements, storage conditions)
4. User permission validation (authorization to transfer specific items)
5. Cost center or budget validation for inter-department transfers
6. Seasonal or time-based transfer restrictions
