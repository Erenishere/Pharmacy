# POS Frontend Backend Integration Update

**Date:** February 12, 2026  
**Status:** ✅ Complete

## Overview

Updated the POS frontend to use the new POS-specific backend endpoints (`/api/v1/salesman/pos/*`) instead of the generic API endpoints. This ensures proper integration with the optimized POS backend that includes FEFO batch selection, warehouse filtering, and salesman-specific operations.

## Changes Made

### 1. POS Service Updates (`frontend/src/app/core/services/pos.service.ts`)

#### Updated Endpoints

| Old Endpoint | New Endpoint | Method |
|-------------|--------------|--------|
| `/customers?keyword=...` | `/salesman/pos/customers/search?q=...` | GET |
| `/items?keyword=...` | `/salesman/pos/items/search?q=...` | GET |
| `/items/scan-barcode` | `/salesman/pos/items/scan-barcode` | POST |
| `/customers/code/CUST-WALKIN` | `/salesman/pos/customers/walk-in` | GET |
| `/invoices/sales` | `/salesman/pos/invoices` | POST |
| N/A | `/salesman/pos/invoices/draft` | POST |
| N/A | `/salesman/pos/invoices/draft` | GET |

#### New Interfaces

Added POS-specific interfaces to match backend response format:

```typescript
export interface POSItem {
    id: string;
    name: string;
    code: string;
    barcode?: string;
    sku?: string;
    price: number;
    unit: string;
    gstRate: number;
    availableStock: number;
    batches?: Array<{
        batchNumber: string;
        expiryDate: string;
        availableQuantity: number;
        manufacturingDate: string;
    }>;
}

export interface POSCustomer {
    id: string;
    name: string;
    code: string;
    phone?: string;
    creditLimit: number;
    currentBalance: number;
    availableCredit: number;
}
```

#### Response Mapping

All POS endpoints now properly map backend responses to frontend format:

- **Customer Search**: Maps `id` → `_id`, adds `financialInfo` structure
- **Item Search**: Maps `id` → `_id`, `price` → `salePrice`, adds `tax` structure
- **Barcode Scan**: Maps item data and batches array to frontend format
- **Walk-In Customer**: Maps POS customer format to full Customer interface

### 2. POS Component Updates (`frontend/src/app/features/salesman/components/pos/pos.component.ts`)

#### Invoice Submission

Updated `submitInvoice()` to send data in the format expected by POS backend:

```typescript
const invoiceData = {
    customerId: this.selectedCustomer._id,
    items: this.cart().map(item => ({
        itemId: item._id,
        quantity: item.quantity,
        unitPrice: item.salePrice,
        discount: item.discount,
        // Backend calculates taxAmount and lineTotal
    })),
    discount: 0, // Invoice-level discount
    paymentMethod: 'cash',
    notes: ''
};
```

#### Error Handling

Enhanced error handling to display backend error messages:

```typescript
error: (error) => {
    const errorMsg = error?.error?.error?.message || 
                     error?.error?.message || 
                     'Failed to create invoice';
    this.toastService.error(errorMsg);
}
```

#### Walk-In Customer

Updated all walk-in customer references to use new `getWalkInCustomer()` method:

- `loadDefaultCustomer()`
- `selectWalkIn()`

### 3. New Features Available

With the backend integration, the POS now supports:

1. **Automatic FEFO Batch Selection**: Backend automatically selects batches with earliest expiry dates
2. **Warehouse Filtering**: Only shows items available in salesman's assigned warehouse
3. **Real-time Stock Validation**: Backend validates stock availability before creating invoice
4. **Credit Limit Validation**: Backend checks customer credit limits automatically
5. **Optimized Performance**: POS-specific endpoints return minimal data for faster response times
6. **Draft Invoices**: Can save invoices as drafts without affecting inventory

## Backend Requirements

The frontend now expects the following backend endpoints to be available:

### Authentication
All POS endpoints require:
- Valid JWT token in Authorization header
- User must have 'sales' role
- User must have assigned warehouse

### Endpoints

1. **GET** `/api/v1/salesman/pos/customers/search?q={query}&limit={limit}`
   - Returns: `{ success: true, data: POSCustomer[], count: number }`

2. **GET** `/api/v1/salesman/pos/customers/walk-in`
   - Returns: `{ success: true, data: POSCustomer }`

3. **GET** `/api/v1/salesman/pos/items/search?q={query}&limit={limit}`
   - Returns: `{ success: true, data: POSItem[], count: number }`

4. **POST** `/api/v1/salesman/pos/items/scan-barcode`
   - Body: `{ barcode: string }`
   - Returns: `{ success: true, data: POSItem (with batches array) }`

5. **POST** `/api/v1/salesman/pos/invoices`
   - Body: `{ customerId, items[], discount, paymentMethod, notes }`
   - Returns: `{ success: true, data: Invoice }`

6. **POST** `/api/v1/salesman/pos/invoices/draft`
   - Same as above but creates draft invoice

7. **GET** `/api/v1/salesman/pos/invoices/draft`
   - Returns: `{ success: true, data: Invoice[] }`

## Testing Checklist

- [x] Customer search uses new endpoint
- [x] Item search uses new endpoint
- [x] Barcode scanning uses new endpoint
- [x] Walk-in customer uses new endpoint
- [x] Invoice creation uses new endpoint
- [x] Response mapping works correctly
- [x] Error messages display properly
- [x] TypeScript compilation passes
- [ ] Manual testing with backend
- [ ] Test FEFO batch selection
- [ ] Test credit limit validation
- [ ] Test insufficient stock error
- [ ] Test draft invoice creation

## Migration Notes

### Breaking Changes

1. **Query Parameter Change**: `keyword` → `q` for search endpoints
2. **Response Format**: Backend returns `id` instead of `_id` (mapped in service)
3. **Walk-In Customer**: Code changed from `CUST-WALKIN` to `WALK-IN` (backend handles both)

### Backward Compatibility

The following methods are kept for backward compatibility:
- `getCustomerById()` - Still uses generic endpoint
- `getItemById()` - Still uses generic endpoint
- `getItems()` - Still uses generic endpoint (for non-POS features)

### Data Mapping

All POS responses are automatically mapped to match existing frontend interfaces, so no changes are needed in the component logic beyond the service calls.

## Next Steps

1. **Backend Deployment**: Ensure POS backend endpoints are deployed and accessible
2. **Authentication Setup**: Verify salesman users have correct roles and warehouse assignments
3. **Integration Testing**: Test complete flow from search to invoice creation
4. **Performance Testing**: Verify response times meet requirements (<300ms for search, <500ms for invoice)
5. **Error Scenarios**: Test all error cases (insufficient stock, credit limit, etc.)

## Related Files

- `frontend/src/app/core/services/pos.service.ts` - Updated service with new endpoints
- `frontend/src/app/features/salesman/components/pos/pos.component.ts` - Updated component
- `.kiro/specs/pos-backend-integration/requirements.md` - Backend requirements
- `.kiro/specs/pos-backend-integration/design.md` - Backend design
- `.kiro/specs/pos-backend-integration/tasks.md` - Backend implementation tasks

## Success Criteria

✅ All POS operations use new backend endpoints  
✅ Response mapping works correctly  
✅ TypeScript compilation passes  
✅ Error handling displays backend messages  
⏳ Manual testing with backend (pending)  
⏳ FEFO batch selection verified (pending)  
⏳ Credit limit validation verified (pending)  

---

**Implementation Complete**: Frontend is now ready to integrate with the POS backend. Manual testing required once backend is deployed.
