# Real-Time System Integration Testing Framework

This directory contains the comprehensive integration testing framework for verifying real-time synchronization, data consistency, concurrent operation handling, and performance across all system modules.

## ⚠️ IMPORTANT: Production Database Testing

**These tests run against the PRODUCTION database** to verify real-world data consistency. Unlike typical integration tests that use isolated test databases, this framework:

- Connects to the existing production database
- Verifies data consistency across all modules
- Detects and reports any inconsistencies found
- Can optionally auto-resolve detected issues
- Does NOT clean up data between tests

## Directory Structure

```
real-time-sync/
├── config/
│   └── testConfig.js          # Test configuration and thresholds
├── utils/
│   ├── testHelpers.js         # Common utility functions
│   └── apiClient.js           # API client for making requests
├── components/
│   ├── mockDataGenerator.js  # Generates realistic test data
│   ├── syncVerifier.js        # Verifies real-time synchronization
│   ├── consistencyChecker.js # Checks data consistency
│   ├── performanceMonitor.js # Monitors performance metrics
│   ├── concurrentExecutor.js # Executes concurrent operations
│   └── inconsistencyResolver.js # Resolves detected issues
├── properties/
│   ├── syncProperties.test.js      # Real-time sync property tests
│   ├── consistencyProperties.test.js # Data consistency property tests
│   ├── concurrentProperties.test.js  # Concurrent operation tests
│   └── errorProperties.test.js       # Error handling tests
├── performance/
│   └── performanceBenchmarks.test.js # Performance benchmark tests
├── workflows/
│   └── endToEndWorkflows.test.js    # Complete workflow tests
├── setup.js                   # Test setup and teardown
├── jest.config.js            # Jest configuration
└── README.md                 # This file
```

## Getting Started

### Prerequisites

1. Node.js >= 18.0.0
2. Access to production MongoDB database
3. Environment variables configured (see Configuration section)

### Installation

Dependencies are already installed as part of the main project:

```bash
# fast-check is already in package.json
npm install
```

### Configuration

Create or update your `.env` file with the following variables:

```bash
# Production database connection
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database_name

# API endpoints (optional, defaults to localhost:3000)
ADMIN_API_URL=http://localhost:3000/api/v1
POS_API_URL=http://localhost:3000/api/v1/salesman/pos

# Test behavior
AUTO_RESOLVE_INCONSISTENCIES=false  # Set to true to auto-fix issues
DRY_RUN=true                        # Set to false to apply changes
VERBOSE_TESTS=true                  # Enable detailed logging
LOG_LEVEL=info                      # info, warn, error
```

## Running Tests

### Run All Integration Tests

```bash
npm test -- tests/integration/real-time-sync
```

### Run Specific Test Suites

```bash
# Property-based tests only
npm test -- tests/integration/real-time-sync/properties

# Performance benchmarks only
npm test -- tests/integration/real-time-sync/performance

# End-to-end workflows only
npm test -- tests/integration/real-time-sync/workflows
```

### Run with Coverage

```bash
npm test -- tests/integration/real-time-sync --coverage
```

### Run in Watch Mode

```bash
npm test -- tests/integration/real-time-sync --watch
```

## Test Framework Components

### 1. Mock Data Generator

Generates realistic test data using fast-check arbitraries:
- Items (pharmaceutical products)
- Accounts (customers/suppliers)
- Warehouses
- Batches (with expiry dates)
- Invoices (sales/purchase)
- Payments
- Stock adjustments

### 2. Synchronization Verifier

Verifies real-time data propagation:
- Measures synchronization latency
- Polls for changes with configurable timeout
- Verifies Admin → POS synchronization
- Verifies POS → Admin synchronization

### 3. Consistency Checker

Verifies data integrity across modules:
- Inventory balance = sum of stock movements
- Account balance = opening + sum of transactions
- Batch quantity = sum of batch movements
- Report totals = sum of underlying data
- Referential integrity (foreign keys)

### 4. Performance Monitor

Measures system performance:
- Response times (average, median, p95, p99)
- Operations per second
- Failure rate
- Concurrent user handling

### 5. Concurrent Test Executor

Simulates multi-user scenarios:
- Executes operations in parallel
- Detects conflicts and race conditions
- Measures concurrent operation performance

### 6. Inconsistency Resolver

Resolves detected data issues:
- Recalculates inventory from stock movements
- Recalculates account balances from transactions
- Recalculates batch quantities
- Detects and cleans orphaned references
- Regenerates reports from source data

## Property-Based Testing

This framework uses **fast-check** for property-based testing. Each correctness property from the design document is implemented as a property test that:

1. Generates random test data (100+ iterations)
2. Performs operations via the API
3. Verifies the property holds
4. Reports detailed failure information

### Example Property Test

```javascript
// Feature: real-time-system-integration-testing, Property 1: Admin to POS synchronization latency
// **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6**

const fc = require('fast-check');

test('Admin to POS synchronization latency', async () => {
  await fc.assert(
    fc.asyncProperty(
      itemArbitrary(),
      async (item) => {
        // Create item via Admin API
        const created = await adminClient.post('/master-data/items', item);
        
        // Verify it appears in POS within 2 seconds
        const syncResult = await syncVerifier.verifyAdminToPOS({
          type: 'create',
          module: 'master-data',
          entity: 'item',
          data: created,
        }, 2000);
        
        expect(syncResult.synchronized).toBe(true);
        expect(syncResult.latency).toBeLessThan(2000);
      }
    ),
    { numRuns: 100 }
  );
});
```

## Inconsistency Detection and Resolution

### Detection

The framework automatically detects inconsistencies:
- Inventory mismatches
- Account balance errors
- Batch quantity errors
- Orphaned references
- Report discrepancies

### Resolution

When `AUTO_RESOLVE_INCONSISTENCIES=true`:
1. Framework detects inconsistency
2. Calculates correct value from source data
3. Applies fix (if not in dry-run mode)
4. Logs the resolution
5. Continues testing

### Dry-Run Mode

When `DRY_RUN=true`:
- Inconsistencies are detected and reported
- No changes are made to the database
- Proposed fixes are logged for review

## Performance Benchmarks

The framework includes performance benchmarks for:

1. **10 Concurrent Users** - 95% of requests under 3 seconds
2. **20 Concurrent Users** - 95% of requests under 5 seconds
3. **High Throughput** - 100 invoices/minute with <2s sync
4. **Large Dataset** - 10,000+ items, 50,000+ transactions
5. **Report Generation** - Complete within 10 seconds

## End-to-End Workflows

Complete business workflow tests:

1. **Sales Cycle** - Create item → add stock → create invoice → verify updates
2. **Purchase to Sale** - Create purchase → receive stock → create sale
3. **Customer Payment** - Create customer → invoice → payment → verify balance
4. **Inventory Adjustment** - Adjust inventory → verify POS → create invoice
5. **Batch Tracking** - Create batch → track expiry → prevent expired sales

## Troubleshooting

### Connection Issues

If tests fail to connect to the database:
1. Verify `MONGODB_URI` is correct in `.env`
2. Check network connectivity
3. Verify database credentials
4. Check firewall settings

### Timeout Issues

If tests timeout:
1. Increase `testTimeout` in `config/testConfig.js`
2. Check API server is running
3. Verify database performance
4. Check for slow queries

### Inconsistency Issues

If tests report inconsistencies:
1. Review the inconsistency report
2. Run with `DRY_RUN=true` to preview fixes
3. Enable `AUTO_RESOLVE_INCONSISTENCIES=true` to fix
4. Manually investigate complex issues

## Best Practices

1. **Always run with DRY_RUN=true first** to preview changes
2. **Review inconsistency reports** before enabling auto-resolution
3. **Run tests during low-traffic periods** to minimize impact
4. **Monitor system performance** during test execution
5. **Keep test data identifiable** with test prefixes/markers
6. **Document any manual fixes** required

## Contributing

When adding new tests:

1. Follow the existing structure and patterns
2. Use property-based testing for universal properties
3. Include unit tests for specific edge cases
4. Document the requirements being validated
5. Add appropriate error handling
6. Update this README if needed

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review test logs for detailed error information
3. Consult the design document for property definitions
4. Contact the development team

## License

This testing framework is part of the Indus Traders ERP system.
