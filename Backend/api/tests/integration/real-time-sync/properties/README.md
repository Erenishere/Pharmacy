# Real-Time Synchronization Property Tests

This directory contains property-based tests that verify real-time synchronization between Admin and POS systems using fast-check.

## Overview

These tests validate that data changes propagate between systems within the 2-second latency threshold defined in the requirements. Each test runs 100+ iterations with randomly generated data to verify universal correctness properties.

## Test Files

### 1. adminToPosSync.test.js
**Property 1: Admin to POS synchronization latency**

Validates that master data changes in Admin propagate to POS within 2 seconds.

**Tests:**
- **1.1**: Item creation synchronizes to POS (Requirement 1.1)
- **1.2**: Item update synchronizes to POS (Requirement 1.2)
- **1.3**: Item deactivation prevents POS selection (Requirement 1.3)
- **1.4**: Warehouse creation synchronizes to POS (Requirement 1.4)
- **1.5**: Account creation synchronizes to POS (Requirement 1.5)

**Iterations:** 50-100 per test

### 2. posToAdminSync.test.js
**Property 2: POS to Admin synchronization latency**

Validates that POS operations propagate to Admin (inventory, accounts, reports) within 2 seconds.

**Tests:**
- **2.1**: Invoice creation reduces Admin inventory (Requirement 2.1)
- **2.2**: Invoice creation updates Admin account balance (Requirement 2.2)
- **2.3**: Invoice appears in Admin sales reports (Requirement 2.3)
- **2.4**: Payment processing updates Admin account statements (Requirement 2.4)
- **2.5**: Sales return increases Admin inventory (Requirement 2.5)

**Iterations:** 20 per test

### 3. inventorySync.test.js
**Property 3: Inventory operation synchronization**

Validates that inventory operations synchronize to both Admin and POS within 2 seconds.

**Tests:**
- **3.1**: Stock adjustment synchronizes to POS (Requirement 3.1)
- **3.2**: Stock adjustment reflects in Admin reports (Requirement 3.2)
- **3.3**: Batch expiry updates synchronize to POS (Requirement 3.3)
- **3.4**: Stock transfer updates both warehouses (Requirement 3.4)
- **3.5**: Purchase receipt increases POS stock availability (Requirement 3.5)

**Iterations:** 20-50 per test

## Running the Tests

### Run all property tests:
```bash
cd Backend/tests/integration/real-time-sync
npm test properties/
```

### Run specific property test:
```bash
npm test properties/adminToPosSync.test.js
npm test properties/posToAdminSync.test.js
npm test properties/inventorySync.test.js
```

### Run with verbose output:
```bash
VERBOSE_TESTS=true npm test properties/
```

## Test Configuration

Tests use configuration from `config/testConfig.js`:

- **maxSyncLatency**: 2000ms (2 seconds)
- **pollInterval**: 100ms
- **pollTimeout**: 5000ms
- **propertyTestIterations**: 100 (minimum)

## Test Data

Tests use the mock data generator (`components/mockDataGenerator.js`) to create realistic pharmaceutical distribution data:

- Items (pharmaceutical products with names, prices, categories)
- Accounts (customers and suppliers)
- Warehouses (with locations and contact info)
- Batches (with expiry dates)
- Invoices (sales and purchase)
- Payments
- Stock adjustments

## Framework Components

Tests leverage the following framework components:

- **TestHarness**: Orchestrates test execution and manages database connections
- **SyncVerifier**: Validates real-time synchronization with latency measurement
- **MockDataGenerator**: Generates random test data using fast-check
- **ApiClient**: Makes HTTP requests to Admin and POS APIs

## Important Notes

1. **Production Database**: Tests run against the production database to verify real-world data consistency
2. **No Cleanup**: Tests do not clean up created data - they verify production data
3. **Latency Threshold**: All synchronization must complete within 2 seconds
4. **Property-Based**: Tests use randomized data to explore the input space
5. **Iterations**: Each property test runs minimum 100 iterations (configurable)

## Troubleshooting

### Tests timing out
- Check that both Admin and POS APIs are running
- Verify database connection is working
- Increase `testTimeout` in config if needed

### Synchronization failures
- Check network latency between systems
- Verify real-time sync mechanisms are working
- Review API logs for errors

### Random test failures
- Property tests may find edge cases - review counterexamples
- Check if specific data patterns cause issues
- Verify business logic handles all input ranges

## Next Steps

After these tests pass, proceed to:
- Task 10: Data consistency property tests
- Task 11: Concurrent operation property tests
- Task 12: Error handling and recovery property tests
- Task 14: Performance benchmark tests
- Task 15: End-to-end workflow tests
