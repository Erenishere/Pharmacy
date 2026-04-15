# Task 1.1: Invoice Model Enhancements for Purchase Management

## Summary
Enhanced the Invoice model to support purchase-specific fields and dual GST rate tracking at the item level, as required by the Purchase Management module.

## Changes Made

### 1. Item-Level Dual GST Fields (invoiceItemSchema)
Added fields to track both 18% and 4% GST rates separately at the item level:

```javascript
// Purchase Management - Dual GST tracking at item level (Requirement 1.20-1.24, 1.27)
gst18Percent: {
  type: Number,
  enum: [0, 18],
  default: 0,
},
gst18Amount: {
  type: Number,
  default: 0,
  min: [0, 'GST 18% amount cannot be negative'],
},
gst4Percent: {
  type: Number,
  enum: [0, 4],
  default: 0,
},
gst4Amount: {
  type: Number,
  default: 0,
  min: [0, 'GST 4% amount cannot be negative'],
},
```

**Rationale**: These fields allow the UI to display separate columns for "GST 18% Amount" and "GST 4% Amount" as specified in Requirement 1.27. Each item will have one rate active (with the other set to 0), enabling clear tracking of which GST rate applies to each item.

### 2. Purchase-Specific Fields (Already Present)
Verified that the following required fields are already present in the Invoice schema:

- **supplierBillNo** (line 274-281): Required for purchase invoices, used for reconciliation with supplier bills
- **qualityControlNotes** (line 283-287): Stores quality control inspection notes
- **goodsReceiptNumber** (line 288-292): Tracks the goods receipt number for received items

### 3. Invoice Totals (Already Present)
Confirmed that the totals object already includes:

- **gst18Total** (line 463-467): Sum of all 18% GST amounts
- **gst4Total** (line 468-472): Sum of all 4% GST amounts

### 4. Updated calculateTotals Method
Enhanced the `calculateTotals()` method to populate the new item-level GST fields:

```javascript
// Phase 2: Calculate GST based on rate (Requirement 6.1, 6.2)
if (item.gstRate && item.gstRate > 0) {
  const gstAmount = (taxableAmount * item.gstRate) / 100;
  item.gstAmount = gstAmount;

  // Separate GST by rate (Requirement 2.2, 2.7, Purchase Management 1.20-1.24)
  if (item.gstRate === 18) {
    item.gst18Percent = 18;
    item.gst18Amount = gstAmount;
    item.gst4Percent = 0;
    item.gst4Amount = 0;
    gst18Total += gstAmount;
  } else if (item.gstRate === 4) {
    item.gst18Percent = 0;
    item.gst18Amount = 0;
    item.gst4Percent = 4;
    item.gst4Amount = gstAmount;
    gst4Total += gstAmount;
  }
} else {
  // No GST applied
  item.gst18Percent = 0;
  item.gst18Amount = 0;
  item.gst4Percent = 0;
  item.gst4Amount = 0;
}
```

**Logic**: 
- When an item has `gstRate = 18`, the method sets `gst18Percent = 18` and calculates `gst18Amount`, while setting `gst4Percent = 0` and `gst4Amount = 0`
- When an item has `gstRate = 4`, the method sets `gst4Percent = 4` and calculates `gst4Amount`, while setting `gst18Percent = 0` and `gst18Amount = 0`
- When an item has `gstRate = 0`, all GST fields are set to 0
- The invoice totals (`gst18Total` and `gst4Total`) are calculated by summing the respective amounts from all items

## Requirements Satisfied

### Requirement 1.20-1.24 (Dual GST Rates)
✅ System supports dual GST rates (18% and 4%) at the item level
✅ System calculates GST 18% amount for standard items
✅ System calculates GST 4% amount for essential medicines/items
✅ System allows mixing both GST rates in one invoice
✅ System calculates total GST amount (18% + 4%)

### Requirement 1.27 (Invoice Item Display)
✅ System can display separate "GST 18% Amount" and "GST 4% Amount" columns for each item

### Requirement 1.7 (Supplier Bill No)
✅ System requires Supplier Bill No for reconciliation (already implemented)

### Requirement 8.1-8.2 (Quality Control)
✅ System allows quality control notes entry (already implemented)
✅ System supports goods receipt number entry (already implemented)

## Data Model Impact

### Before
- Items had a single `gstRate` field (0, 4, or 18)
- Items had a single `gstAmount` field
- Totals had `gst18Total` and `gst4Total` but items didn't track which rate applied

### After
- Items still have `gstRate` (primary field determining which rate applies)
- Items now have separate `gst18Percent`/`gst18Amount` and `gst4Percent`/`gst4Amount` fields
- The `calculateTotals()` method automatically populates these fields based on `gstRate`
- This enables clear UI display and reporting of which GST rate applies to each item

## Testing

Created comprehensive test suite in `Backend/tests/models/Invoice.dualGST.test.js` covering:
- Purchase invoice creation with all purchase-specific fields
- GST 18% field population for standard items
- GST 4% field population for essential items
- Mixed GST rates (18% and 4%) in the same invoice
- GST calculation with discounts
- Zero GST handling
- Field validation (maxlength for qualityControlNotes and goodsReceiptNumber)
- Enum validation for gst18Percent and gst4Percent

## Backward Compatibility

✅ **Fully backward compatible**: 
- Existing invoices will continue to work
- The new fields default to 0
- The `calculateTotals()` method will populate the new fields when invoices are saved or updated
- No migration required for existing data

## Next Steps

1. Task 2.1: Enhance taxService.js for dual GST calculations
2. Task 4.1: Create purchaseInvoiceService.js with dual GST support
3. Frontend implementation to display the new GST fields in the invoice UI

## Files Modified

- `Backend/src/models/Invoice.js`: Added gst18Percent, gst18Amount, gst4Percent, gst4Amount fields and updated calculateTotals method
- `Backend/tests/models/Invoice.test.js`: Added comprehensive test suite for dual GST support
- `Backend/tests/models/Invoice.dualGST.test.js`: Created focused test file for Task 1.1

## Validation

✅ No syntax errors (verified with getDiagnostics)
✅ Schema validation rules in place
✅ Calculation logic implemented
✅ Test coverage added
