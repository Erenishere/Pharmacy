# Data Consistency Property Tests

## Overview

This test suite implements 8 property-based tests that verify data consistency invariants across all modules in the pharmaceutical distribution system. These tests ensure that data remains consistent across inventory, accounts, batches, invoices, payments, and reports.

## Test Properties

### Property 4: Inventory Balance Invariant (Test 10.1)
**Validates: Requirements 9.1**

Verifies that for any item and warehouse, the current inventory quantity equals the sum of all stock movements (purchases in, sales out, adjustments, transfers).

- **Test Strategy**: Creates random sequences of stock movements and verifies final inventory matches calculated total
- **Iterations**: 20 runs with 100+ iterations per run via fast-check
- **Timeout**: 180 seconds

### Property 5: Account Balance Invariant (Test 10.2)
**Validates: Requirements 9.2**

Verifies that for any account (customer or supplier), the current balance equals the opening balance plus the sum of all transactions (invoices, payments, returns).

- **Test Strategy**: Creates random transaction sequences and verifies final balance matches calculated total
- **Iterations**: 20 runs with 100+ iterations per run
- **Timeout**: 180 seconds

### Property 6: Batch Quantity Invariant (Test 10.3)
**Validates: Requirements 9.3**

Verifies that for any batch, the current quantity equals the initial quantity plus the sum of all batch movements (receipts, sales, adjustments).

- **Test Strategy**: Creates batch via purchase, executes random sales, verifies remaining quantity
- **Iterations**: 15 runs with 100+ iterations per run
- **Timeout**: 180 seconds

### Property 7: Sales Invoice Cross-Module Consistency (Test 10.4)
**Validates: Requirements 4.1**

Verifies that when a sales invoice is created:
- Inventory reduction equals invoice quantities
- Account balance increase equals invoice total
- Sales report includes the invoice

- **Test Strategy**: Creates invoice and verifies consistency across all three modules
- **Iterations**: 20 runs with 100+ iterations per run
- **Timeout**: 180 seconds

### Property 8: Purchase Invoice Cross-Module Consistency (Test 10.5)
**Validates: Requirements 4.2**

Verifies that when a purchase invoice is created:
- Inventory increase equals invoice quantities
- Account balance increase equals invoice total
- Purchase report includes the invoice

- **Test Strategy**: Creates purchase invoice and verifies consistency across all modules
- **Iterations**: 20 runs with 100+ iterations per run
- **Timeout**: 180 seconds

### Property 9: Payment Consistency (Test 10.6)
**Validates: Requirements 4.3**

Verifies that when a payment is recorded:
- Account balance is reduced by payment amount
- Payment report shows the payment

- **Test Strategy**: Creates invoice to establish balance, records payment, verifies consistency
- **Iterations**: 20 runs with 100+ iterations per run
- **Timeout**: 180 seconds

### Property 10: Report Data Consistency (Test 10.7)
**Validates: Requirements 9.4**

Verifies that for any report type (sales, purchase, inventory), the report totals match the sum of underlying transaction data.

- **Test Strategy**: Uses consistency checker to verify report calculations
- **Iterations**: 30 runs with 100+ iterations per run
- **Timeout**: 120 seconds

### Property 11: Referential Integrity (Test 10.8)
**Validates: Requirements 4.6, 9.5**

Verifies that all foreign key references (itemId, accountId, warehouseId, batchId) point to existing entities in their respective collections.

- **Test Strategy**: Creates various entity combinations and verifies all references are valid
- **Iterations**: 30 runs with 100+ iterations per run
- **Timeout**: 180 seconds

## Running the Tests

### Run all data consistency tests:
```bash
cd Backend/tests/integration/real-time-sync
npm test -- properties/dataConsistency.test.js
```

### Run a specific property test:
```bash
npm test -- properties/dataConsistency.test.js -t "Property 4"
```

### Run with verbose output:
```bash
VERBOSE_TESTS=true npm test -- properties/dataConsistency.test.js
```

## Test Configuration

Tests use the following configuration from `config/testConfig.js`:

- **maxSyncLatency**: 2000ms - Maximum time for real-time synchronization
- **pollInterval**: 100ms - How often to poll for changes
- **pollTimeout**: 5000ms - Maximum time to wait for changes
- **propertyTestIterations**: 100 - Minimum iterations for property tests

## Test Data

Tests use the mock data generator to create realistic pharmaceutical data:
- Items with pharmaceutical names, prices, categories
- Accounts (customers/suppliers) with contact information
- Warehouses with locations
- Batches with expiry dates
- Invoices with multiple line items
- Payments with various methods

## Expected Results

All property tests should pass, indicating:
- ✅ Inventory quantities are consistent with stock movements
- ✅ Account balances are consistent with transactions
- ✅ Batch quantities are consistent with movements
- ✅ Sales invoices create consistent changes across modules
- ✅ Purchase invoices create consistent changes across modules
- ✅ Payments create consistent changes across modules
- ✅ Report totals match underlying data
- ✅ All foreign key references are valid

## Troubleshooting

### Test Failures

If a property test fails, check:

1. **Synchronization Issues**: Verify real-time sync is working (increase wait times if needed)
2. **API Endpoints**: Ensure all API endpoints are accessible and working
3. **Database State**: Check if database has inconsistent data from previous runs
4. **Timing Issues**: Some tests may need longer timeouts on slower systems

### Common Issues

**"No response from server"**: Backend API is not running
- Solution: Start the backend server before running tests

**"Inventory mismatch"**: Stock movements not calculating correctly
- Solution: Check stock movement logic in backend services

**"Account balance mismatch"**: Transaction calculations incorrect
- Solution: Verify ledger entry creation and balance calculations

**"Referential integrity violation"**: Orphaned references in database
- Solution: Run consistency checker to identify and fix orphaned references

## Integration with CI/CD

These tests are designed to run in CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Run Data Consistency Tests
  run: |
    cd Backend/tests/integration/real-time-sync
    npm test -- properties/dataConsistency.test.js
  timeout-minutes: 30
```

## Notes

- Tests run against production database to verify real-world data consistency
- Each test creates its own test data and cleans up after completion
- Tests use property-based testing with fast-check for comprehensive coverage
- All tests include proper error handling and logging for debugging
- Tests verify both immediate consistency and eventual consistency after sync delays
