# Validation and Business Rules Documentation

This directory contains comprehensive validation schemas and business rule validators for the Master Data Management module.

## Overview

The validation system consists of three layers:

1. **Input Validation** - Using express-validator for request validation
2. **Schema Validation** - Using Joi for complex object validation
3. **Business Rule Validation** - Custom validators for business logic

## Files

### Joi Schemas (`joiSchemas.js`)
Comprehensive Joi validation schemas for all master data entities:
- Item, Company, Account, User
- Warehouse, Town, Area
- Category, SubCategory
- Formula, FormulaSize
- Business Type, Salesman, Transporter, Claim Account

### Joi Middleware (`joiValidation.js`)
Middleware functions to apply Joi schemas to requests:
- `validateBody(schema)` - Validate request body
- `validateParams(schema)` - Validate request params
- `validateQuery(schema)` - Validate request query

### Express Validators
Individual validator files using express-validator:
- `itemValidators.js` - Item management validation
- `accountValidators.js` - Account management validation
- `companyValidators.js` - Company management validation
- `userValidators.js` - User management validation
- `masterDataValidators.js` - Supporting entities validation

### Business Rules (`businessRules.js`)
Business logic validators:
- Stock level validations (min <= reorder <= max)
- Credit limit enforcement
- Dependency checks before deletion
- Unique constraint validations
- Date validations
- Account type specific validations

## Usage Examples

### Using Express Validators in Routes

```javascript
const express = require('express');
const router = express.Router();
const { createItemValidation, updateItemValidation } = require('../utils/validators/itemValidators');
const itemController = require('../controllers/itemController');
const { authenticate } = require('../middleware/auth');

// Apply validation middleware before controller
router.post('/', authenticate, createItemValidation, itemController.createItem);
router.put('/:id', authenticate, updateItemValidation, itemController.updateItem);
```

### Using Joi Schemas in Services

```javascript
const { itemSchema } = require('../utils/validators/joiSchemas');
const { ValidationError } = require('../utils/errors');

async function createItem(data) {
  // Validate with Joi
  const { error, value } = itemSchema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const details = error.details.map(d => ({
      field: d.path.join('.'),
      message: d.message,
    }));
    throw new ValidationError('Validation failed', details);
  }

  // Use validated data
  const item = await Item.create(value);
  return item;
}
```

### Using Joi Middleware in Routes

```javascript
const { validateBody } = require('../middleware/joiValidation');
const { itemSchema } = require('../utils/validators/joiSchemas');

// Apply Joi validation middleware
router.post('/', authenticate, validateBody(itemSchema), itemController.createItem);
```

### Using Business Rule Validators

```javascript
const {
  validateStockLevels,
  validateCreditLimit,
  validateCompanyCanDelete,
} = require('../utils/validators/businessRules');

// In service layer
async function createItem(data) {
  // Validate stock levels
  validateStockLevels(data.inventory);

  // Validate company is active
  await validateCompanyActive(data.companyId, Company);

  const item = await Item.create(data);
  return item;
}

async function deleteCompany(companyId) {
  // Check if company can be deleted
  await validateCompanyCanDelete(companyId, Item);

  await Company.findByIdAndDelete(companyId);
}

async function createSalesInvoice(invoiceData, customerId) {
  const customer = await Customer.findById(customerId);

  // Validate credit limit
  validateCreditLimit(customer, invoiceData.totalAmount);

  const invoice = await SalesInvoice.create(invoiceData);
  return invoice;
}
```

### Combining Multiple Validators

```javascript
// In controller
async function createAccount(req, res, next) {
  try {
    const data = req.body;

    // Express-validator already ran (from route middleware)
    // Now apply business rules
    validateAccountTypeFields(data.accountType, data);

    if (data.parentAccountId) {
      await validateSubAccountHierarchy(
        data.parentAccountId,
        null,
        Customer
      );
    }

    // Check unique constraint
    await validateUnique(Customer, 'name', data.name);

    const account = await accountService.createAccount(data, req.user.id);

    res.status(201).json({
      success: true,
      data: account,
    });
  } catch (error) {
    next(error);
  }
}
```

## Validation Rules Summary

### Item Validation
- Name: 3-200 characters (required)
- Company: Valid ObjectId (required)
- Category: Valid ObjectId (required)
- Business Type: Valid ObjectId (required)
- Selling Group: A, B, or C (optional)
- Tax Percentage: 0, 4, or 18 (optional)
- Stock Levels: min <= reorder <= max
- Prices: Non-negative numbers

### Company Validation
- Name: 2-200 characters, unique (required)
- Group Type: A, B, or C (optional)
- Phone: Pakistan format (optional)
- Email: Valid email format (optional)
- Cannot delete if has active items

### Account Validation
- Name: 2-200 characters (required)
- Account Type: customer, supplier, employee, investor, both (required)
- Phone: Pakistan format (optional)
- CNIC: xxxxx-xxxxxxx-x format (optional)
- Email: Valid email format (optional)
- Credit Limit: Non-negative number (optional)
- Credit Days: Non-negative integer (optional)
- Employee accounts must have designation
- Customer/Supplier accounts must have business details
- Sub-accounts: Only one level of hierarchy allowed

### User Validation
- Username: 3-50 characters, alphanumeric with _ and - (required)
- Email: Valid email format (required)
- Password: 6+ characters with uppercase, lowercase, and number (required)
- Role: admin, manager, salesman, accountant, store_keeper, data_entry (required)

## Business Rules

### Stock Management
1. Minimum stock <= Reorder point <= Maximum stock
2. Low stock alert when current stock < minimum stock
3. Expiry tracking for pharmaceutical items

### Credit Management
1. Transaction amount + current balance <= credit limit
2. Flag accounts exceeding credit days
3. Prevent sales to accounts over credit limit

### Deletion Rules
1. Company: Cannot delete if has active items (set to inactive instead)
2. Warehouse: Cannot delete if has stock (set to inactive instead)
3. Town: Cannot delete if has accounts or areas
4. Category: Cannot delete if has items or sub-categories
5. Business Type: Cannot delete if has items
6. Claim Account: Cannot delete if has transactions

### Unique Constraints
1. Company name must be unique
2. Item barcode must be unique (if provided)
3. User username must be unique
4. User email must be unique

### Date Validations
1. Dates cannot be in the future (for historical records)
2. Start date must be before end date (for date ranges)
3. Appointment date cannot be in the future

## Error Response Format

All validation errors follow a consistent format:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "name",
        "message": "Item name is required",
        "value": ""
      },
      {
        "field": "inventory.reorderPoint",
        "message": "Reorder point cannot be greater than maximum stock level",
        "value": 150
      }
    ]
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

Business rule errors:

```json
{
  "success": false,
  "error": {
    "code": "CREDIT_LIMIT_EXCEEDED",
    "message": "Transaction exceeds credit limit. Available credit: 5000",
    "details": {
      "creditLimit": 10000,
      "currentBalance": 5000,
      "transactionAmount": 6000,
      "availableCredit": 5000
    }
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Testing

See `__tests__/validators/` directory for comprehensive test suites covering:
- Input validation tests
- Schema validation tests
- Business rule validation tests
- Error handling tests
