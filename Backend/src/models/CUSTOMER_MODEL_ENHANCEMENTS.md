# Customer Model Enhancements for Master Data Management

## Overview
This document summarizes the enhancements made to the Customer model (Backend/src/models/Customer.js) to support the Master Data Management module requirements 3.1-3.22.

## Date
February 7, 2026

## Changes Made

### 1. Account Type Field (Requirement 3.1)
Added `accountType` field to support different account types:
- **Values**: customer, supplier, employee, investor, both
- **Default**: customer
- **Purpose**: Allows the Customer model to serve as a unified Account model for all business relationships

### 2. Sub-account Hierarchy (Requirement 3.4)
Added `parentAccountId` field:
- **Type**: ObjectId reference to Customer
- **Purpose**: Enables hierarchical account structures (parent-child relationships)
- **Use Case**: Sub-accounts under main accounts

### 3. Dimension/Territory Support (Requirement 3.2)
Added `dimensionId` field:
- **Type**: ObjectId reference to DimensionBranch
- **Purpose**: Territory-based access control and reporting

### 4. Town and Area References (Requirements 3.5, 3.6)
Added location fields:
- `townId`: ObjectId reference to Town
- `areaId`: ObjectId reference to Area
- **Purpose**: Geographic organization and route planning

### 5. Enhanced Contact Information (Requirements 3.7, 3.8, 3.10)
Extended `contactInfo` object with:
- `phone1`, `phone2`, `phone3`: Multiple phone numbers (Zong#, Moblink#, Ufone#)
- `deliveryLocation`: Separate delivery address
- `nicNumber`: CNIC number for verification

### 6. Employee Biodata (Requirements 3.11-3.13)
Added `employeeBiodata` object for employee accounts:
```javascript
{
  fatherName: String,
  fatherNIC: String,
  dateOfAppointment: Date,
  guarantorName: String,
  guarantorNIC: String,
  emergencyContact: String,
  bloodGroup: String (enum: A+, A-, B+, B-, AB+, AB-, O+, O-),
  permanentAddress: String,
  designationId: ObjectId (ref: Designation),
  basicPay: Number,
  salaryPosition: String
}
```

### 7. Business Details (Requirements 3.14-3.17)
Added `businessDetails` object for customer/supplier accounts:
```javascript
{
  customerType: String (enum: retailer, wholesaler, distributor, hospital, pharmacy),
  creditDaysLimit: Number (0-365),
  creditAmountLimit: Number,
  openingBalance: Number,
  balanceType: String (enum: debit, credit),
  assignedSalesmanId: ObjectId (ref: Salesman)
}
```

### 8. Banking Information (Requirement 3.18)
Added `bankingInfo` object:
```javascript
{
  bankName: String,
  accountNumber: String,
  branch: String
}
```

### 9. Current Balance Tracking
Added `currentBalance` field:
- **Type**: Number
- **Default**: 0
- **Purpose**: Track real-time account balance

## New Indexes for Performance

Added the following indexes to optimize queries:
- `accountType`: For filtering by account type
- `parentAccountId`: For sub-account queries
- `dimensionId`: For dimension-based filtering
- `townId`: For location-based queries
- `areaId`: For area-based queries
- `businessDetails.assignedSalesmanId`: For salesman assignment queries
- `employeeBiodata.designationId`: For employee designation queries
- `currentBalance`: For balance-based queries
- Compound indexes:
  - `accountType + isActive`
  - `townId + areaId`
  - `dimensionId + accountType`

## New Instance Methods

### Account Type Helpers
- `isEmployee()`: Check if account is employee type
- `isCustomer()`: Check if account is customer or both
- `isSupplier()`: Check if account is supplier or both

### Credit Management (Requirements 3.21, 3.22)
- `checkCreditLimitExceeded(additionalAmount)`: Check if adding amount exceeds credit limit
- `getAvailableCreditAmount()`: Get remaining credit available
- `checkCreditDaysExceeded(invoiceDate)`: Check if invoice has exceeded credit days

## New Static Methods

- `findByAccountType(accountType)`: Find accounts by type
- `findSubAccounts(parentAccountId)`: Find all sub-accounts of a parent
- `findByDimension(dimensionId)`: Find accounts by dimension
- `findByTown(townId)`: Find accounts by town
- `findByArea(areaId)`: Find accounts by area

## Validation Rules

### Blood Group
- Must be one of: A+, A-, B+, B-, AB+, AB-, O+, O-

### Customer Type
- Must be one of: retailer, wholesaler, distributor, hospital, pharmacy

### Credit Days Limit
- Range: 0-365 days

### Credit Amount Limit
- Must be non-negative

### Basic Pay
- Must be non-negative

### Balance Type
- Must be either 'debit' or 'credit'

## Testing

Comprehensive test suite added in `Backend/tests/models/Customer.test.js`:
- 60+ passing tests covering all new features
- Tests for account types
- Tests for sub-account hierarchy
- Tests for employee biodata validation
- Tests for business details validation
- Tests for banking information
- Tests for credit limit checks
- Tests for credit days validation
- Tests for helper methods

## Backward Compatibility

All changes are backward compatible:
- Existing fields remain unchanged
- New fields are optional (not required)
- Default values provided where appropriate
- Existing code will continue to work without modifications

## Migration Notes

For existing data:
1. No migration required - new fields are optional
2. Existing customers will have `accountType` default to 'customer'
3. Existing customers will have null values for new optional fields
4. Indexes will be created automatically on first query

## Usage Examples

### Creating an Employee Account
```javascript
const employee = await Customer.create({
  name: 'John Doe',
  accountType: 'employee',
  employeeBiodata: {
    fatherName: 'James Doe',
    dateOfAppointment: new Date('2024-01-01'),
    bloodGroup: 'O+',
    basicPay: 50000
  }
});
```

### Creating a Customer with Business Details
```javascript
const customer = await Customer.create({
  name: 'ABC Pharmacy',
  accountType: 'customer',
  townId: townObjectId,
  businessDetails: {
    customerType: 'pharmacy',
    creditDaysLimit: 30,
    creditAmountLimit: 100000,
    assignedSalesmanId: salesmanObjectId
  }
});
```

### Checking Credit Limit
```javascript
const customer = await Customer.findById(customerId);
if (customer.checkCreditLimitExceeded(invoiceAmount)) {
  throw new Error('Credit limit exceeded');
}
```

### Finding Sub-accounts
```javascript
const subAccounts = await Customer.findSubAccounts(parentAccountId);
```

## Related Files

- Model: `Backend/src/models/Customer.js`
- Tests: `Backend/tests/models/Customer.test.js`
- Requirements: `.kiro/specs/master-data-management/requirements.md`
- Design: `.kiro/specs/master-data-management/design.md`

## Next Steps

1. Create supporting models (Town, Area, Designation, DimensionBranch) if they don't exist
2. Update customerService.js to handle new account types
3. Update customerController.js with new endpoints
4. Create frontend forms for different account types
5. Implement dimension-based access control middleware

## Notes

- The Customer model now serves as a unified Account model
- All account types (customer, supplier, employee, investor) use the same model
- Type-specific fields are grouped in nested objects (employeeBiodata, businessDetails)
- This design provides flexibility while maintaining data integrity
