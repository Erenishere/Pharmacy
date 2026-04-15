# Item Model Enhancements - Completed

## Date: February 7, 2026
## Task: 1.1 Review and enhance existing Item model

---

## Summary of Changes

The Item model has been significantly enhanced to meet all requirements specified in the Master Data Management requirements document. The model now supports comprehensive pharmaceutical item management with all necessary fields for regulatory compliance, pricing, inventory tracking, and supplier management.

---

## New Fields Added

### 1. Company/Manufacturer Reference (Requirement 1.1)
```javascript
companyId: ObjectId (ref: 'Company') - Required, Indexed
```
- Links item to pharmaceutical manufacturing company
- Replaces string-based manufacturer field with proper reference

### 2. Selling Group (Requirement 1.2)
```javascript
sellingGroup: String (enum: ['A', 'B', 'C', null]) - Indexed
```
- Classifies items for scheme eligibility
- Supports A, B, C grouping for promotional schemes

### 3. Formula/Generic References (Requirements 1.3, 1.4)
```javascript
formulaId: ObjectId (ref: 'Formula') - Indexed
formulaSizeId: ObjectId (ref: 'FormulaSize') - Indexed
```
- Links to medicine generic/formula (e.g., Paracetamol)
- Links to generic size (e.g., 500mg, 100ml)

### 4. Business Type Reference (Requirement 1.5)
```javascript
businessTypeId: ObjectId (ref: 'Business') - Required, Indexed
```
- Categorizes items by business type (Surgical, Medicine, Drip Infusion, Consumer, etc.)

### 5. Category References (Requirement 1.6)
```javascript
categoryId: ObjectId (ref: 'Category') - Required, Indexed
subCategoryId: ObjectId (ref: 'SubCategory') - Indexed
```
- Proper hierarchical category structure with ObjectId references
- Legacy string-based category field retained for backward compatibility

### 6. Multiple Pricing Levels (Requirement 1.7)
```javascript
pricing: {
  purchasePrice: Number,
  costPrice: Number (required),
  salePrice: Number (required),
  tradePrice: Number,
  retailPrice: Number,
  wholesalePrice: Number,
  distributorPrice: Number,
  mrp: Number,
  currency: String (default: 'PKR')
}
```
- Supports all pricing tiers for different customer types
- Maintains backward compatibility with existing costPrice/salePrice

### 7. Enhanced Inventory Parameters (Requirement 1.8)
```javascript
inventory: {
  openingStock: Number,
  currentStock: Number,
  batches: Array,
  minimumStock: Number,
  maximumStock: Number,
  reorderPoint: Number (NEW),
  leadTime: Number (NEW),
  location: String (NEW - bin/shelf location)
}
```
- Added reorder point for automated purchase suggestions
- Added lead time for procurement planning
- Added location for warehouse bin management

### 8. Enhanced Tax Configuration (Requirement 1.9)
```javascript
tax: {
  taxType: String (enum: ['GST', 'VAT', 'Exempt', 'Zero-Rated']),
  gstRate: Number (enum: [0, 4, 18]),
  whtRate: Number,
  taxCategory: String,
  hsnCode: String (NEW)
}
```
- Added tax type classification
- Restricted GST rates to valid values (0%, 4%, 18%)
- Added HSN code for tax compliance

### 9. Regulatory Fields (Requirement 1.10)
```javascript
regulatory: {
  taxRegistrationNumber: String,
  complianceStatus: String (enum),
  licenseNumbers: Array<String>
}
```
- Tracks regulatory compliance status
- Stores multiple license numbers
- Supports pharmaceutical regulatory requirements

### 10. Product Specifications (Requirement 1.11)
```javascript
barcode: String (unique, sparse),
sku: String (unique, sparse),
packSize: Number,
packingSize: String (NEW - e.g., "10x10 tablets")
```
- Enhanced packing size description
- Added SKU field for additional identification

### 11. Batch and Expiry Tracking (Requirement 1.12)
```javascript
batchTrackingEnabled: Boolean (default: true),
expiryTrackingEnabled: Boolean (default: true)
```
- Flags to enable/disable batch and expiry tracking per item
- Supports pharmaceutical expiry management

### 12. Supplier Information (Requirement 1.13)
```javascript
supplier: {
  primarySupplierId: ObjectId (ref: 'Customer'),
  alternativeSuppliers: [{
    supplierId: ObjectId,
    supplierItemCode: String,
    leadTime: Number
  }],
  supplierItemCode: String,
  leadTimeFromSupplier: Number
}
```
- Tracks primary and alternative suppliers
- Stores supplier-specific item codes
- Manages lead times per supplier

### 13. Optional Fields (Requirement 1.14)
```javascript
productImage: String (URL),
storageConditions: String,
handlingInstructions: String,
safetyInformation: String
```
- Product image URL for visual identification
- Storage and handling instructions for pharmaceutical compliance
- Safety information for hazardous materials

---

## New Indexes Added

```javascript
companyId: 1
sellingGroup: 1
formulaId: 1
formulaSizeId: 1
businessTypeId: 1
categoryId: 1
subCategoryId: 1
'inventory.batches.expiryDate': 1
'supplier.primarySupplierId': 1
sku: 1
```

All new reference fields are indexed for optimal query performance.

---

## New Instance Methods

### 1. `isNearExpiry(daysThreshold = 30)`
- Checks if any batch is near expiry within threshold days
- Returns boolean
- Supports expiry alerts (Requirement 1.20)

### 2. `getExpiringBatches(daysThreshold = 30)`
- Returns array of batches expiring within threshold
- Filters out zero-stock batches
- Supports expiry management

### 3. `needsReorder()`
- Checks if current stock is at or below reorder point
- Returns boolean
- Supports automated purchase suggestions (Requirement 1.19)

### 4. `getPriceByType(priceType)`
- Gets price by type (purchasePrice, salePrice, tradePrice, etc.)
- Falls back to salePrice if invalid type
- Supports dynamic pricing for different customer types

---

## New Static Methods

### 1. `findByCompany(companyId)`
- Finds all active items by company
- Supports company-wise inventory reports

### 2. `findBySellingGroup(sellingGroup)`
- Finds items by selling group (A, B, C)
- Supports scheme management

### 3. `findByBusinessType(businessTypeId)`
- Finds items by business type
- Supports business type filtering

### 4. `findNeedingReorder()`
- Finds all items at or below reorder point
- Supports automated purchase order generation
- Implements Requirement 1.19

### 5. `findExpiringItems(daysThreshold = 30)`
- Finds items with batches expiring within threshold
- Supports expiry alerts
- Implements Requirement 1.20

### 6. `findBySupplier(supplierId)`
- Finds items by primary supplier
- Supports supplier-wise procurement

---

## Enhanced Validation

### Pre-save Validations Added:
1. **Reorder Point Validation**: Ensures reorder point doesn't exceed maximum stock
2. **Price Hierarchy Warning**: Warns if wholesale price > retail price
3. **Existing Validations Retained**:
   - Minimum stock ≤ Maximum stock
   - Cost price vs Sale price warning

---

## Backward Compatibility

### Fields Retained:
- `category` (string) - Legacy field kept alongside categoryId
- `manufacturer` (string) - Kept alongside companyId reference
- All existing pricing fields (costPrice, salePrice)
- All existing inventory fields
- All existing methods

### Migration Strategy:
- New fields have sensible defaults
- Existing data will continue to work
- Gradual migration can populate new reference fields
- No breaking changes to existing API contracts

---

## Requirements Coverage

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| 1.1 - Company Selection | ✅ Complete | companyId field with reference |
| 1.2 - Selling Groups | ✅ Complete | sellingGroup enum field |
| 1.3 - Formula/Generic | ✅ Complete | formulaId reference |
| 1.4 - Generic Size | ✅ Complete | formulaSizeId reference |
| 1.5 - Business Type | ✅ Complete | businessTypeId reference |
| 1.6 - Category Hierarchy | ✅ Complete | categoryId, subCategoryId references |
| 1.7 - Multiple Pricing | ✅ Complete | 8 price types in pricing object |
| 1.8 - Inventory Parameters | ✅ Complete | All fields including reorder point |
| 1.9 - Tax Configuration | ✅ Complete | Enhanced tax object with HSN code |
| 1.10 - Regulatory Fields | ✅ Complete | regulatory object with compliance |
| 1.11 - Product Specs | ✅ Complete | barcode, SKU, packing details |
| 1.12 - Batch/Expiry Tracking | ✅ Complete | Enable flags added |
| 1.13 - Supplier Info | ✅ Complete | Comprehensive supplier object |
| 1.14 - Optional Fields | ✅ Complete | Image, storage, handling, safety |
| 1.19 - Low Stock Alerts | ✅ Complete | needsReorder() + findNeedingReorder() |
| 1.20 - Expiry Alerts | ✅ Complete | isNearExpiry() + findExpiringItems() |

---

## Next Steps

1. ✅ **Task 1.1 Complete** - Item model enhanced
2. ⏭️ **Task 1.2** - Review and enhance Account model for unified entity management
3. ⏭️ **Task 1.3** - Review and enhance Company model (add groupType)
4. ⏭️ **Task 1.4** - Review and enhance User model (add RBAC fields)
5. ⏭️ **Task 1.5** - Create/enhance supporting models

---

## Testing Recommendations

### Unit Tests Needed:
1. Test new field validations
2. Test isNearExpiry() with various batch scenarios
3. Test needsReorder() with different stock levels
4. Test getPriceByType() with all price types
5. Test static methods (findByCompany, findExpiringItems, etc.)
6. Test pre-save validations (reorder point, price hierarchy)

### Integration Tests Needed:
1. Test population of all reference fields (companyId, formulaId, etc.)
2. Test queries with new indexes
3. Test backward compatibility with existing data
4. Test migration scenarios

---

## Database Migration Notes

### For Existing Data:
```javascript
// Optional migration script to populate new fields
db.items.updateMany(
  { companyId: { $exists: false } },
  { 
    $set: { 
      sellingGroup: null,
      batchTrackingEnabled: true,
      expiryTrackingEnabled: true,
      'inventory.reorderPoint': 0,
      'inventory.leadTime': 0
    } 
  }
);
```

### Index Creation:
```javascript
// Indexes will be created automatically on first model load
// Or manually create with:
db.items.createIndex({ companyId: 1 });
db.items.createIndex({ sellingGroup: 1 });
// ... etc
```

---

**Enhancement Completed By:** Kiro AI  
**Status:** ✅ Ready for Service Layer Implementation  
**Next Task:** 1.2 - Enhance Account Model
