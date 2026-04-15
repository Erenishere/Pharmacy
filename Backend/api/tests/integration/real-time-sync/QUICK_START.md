# Quick Start Guide - Real-Time Integration Testing

This guide will help you get started with the real-time system integration testing framework.

## ⚠️ Important Warning

**These tests run against your PRODUCTION database!** They are designed to:
- Verify real-world data consistency
- Detect and report inconsistencies
- Optionally auto-resolve issues

Always start with `DRY_RUN=true` to preview changes before applying them.

## Step 1: Install Dependencies

```bash
cd Backend
npm install
```

## Step 2: Configure Environment

1. Copy the example environment file:
```bash
cp .env.integration.example .env.integration
```

2. Edit `.env.integration` with your settings:
```bash
# Your production MongoDB connection string
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database_name

# Your API endpoints (if different from defaults)
ADMIN_API_URL=http://localhost:3000/api/v1
POS_API_URL=http://localhost:3000/api/v1/salesman/pos

# Start with dry-run mode enabled
DRY_RUN=true
AUTO_RESOLVE_INCONSISTENCIES=false
VERBOSE_TESTS=true
```

## Step 3: Start Your API Server

The tests need your API server running:

```bash
# In a separate terminal
cd Backend
npm run dev
```

## Step 4: Run Infrastructure Test

Verify the framework is set up correctly:

```bash
npm run test:integration -- infrastructure.test.js
```

Expected output:
```
✓ Connected to production database for integration testing
⚠️  WARNING: Tests will run against PRODUCTION data
ℹ Auto-resolution is DISABLED
ℹ Dry-run mode is ENABLED

Test Framework Infrastructure
  Database Connection
    ✓ should be connected to production database
    ✓ should have access to collections
  Configuration
    ✓ should have valid configuration
    ✓ should have reasonable timeout values
  ...
```

## Step 5: Understanding Test Output

### Success
```
✓ Connected to production database
✓ All tests passed
```

### Inconsistency Detected
```
⚠️  Inconsistency detected in inventory
  Item: ABC123
  Expected: 100
  Actual: 95
  Difference: -5
  
ℹ Dry-run mode: No changes made
ℹ To fix, set AUTO_RESOLVE_INCONSISTENCIES=true and DRY_RUN=false
```

### Auto-Resolution Applied
```
✓ Inconsistency resolved
  Item: ABC123
  Old value: 95
  New value: 100
  Recalculated from stock movements
```

## Step 6: Run Different Test Suites

### All Integration Tests
```bash
npm run test:integration
```

### Property-Based Tests Only
```bash
npm run test:properties
```

### Performance Benchmarks Only
```bash
npm run test:performance
```

### End-to-End Workflows Only
```bash
npm run test:workflows
```

### Specific Test File
```bash
npm run test:integration -- syncProperties.test.js
```

## Step 7: Enable Auto-Resolution (Optional)

Once you've reviewed the inconsistencies in dry-run mode:

1. Update `.env.integration`:
```bash
DRY_RUN=false
AUTO_RESOLVE_INCONSISTENCIES=true
```

2. Run tests again:
```bash
npm run test:integration
```

3. Review the resolution log to see what was fixed

## Common Scenarios

### Scenario 1: Just Check for Issues
```bash
# .env.integration
DRY_RUN=true
AUTO_RESOLVE_INCONSISTENCIES=false

npm run test:integration
```

### Scenario 2: Preview Fixes
```bash
# .env.integration
DRY_RUN=true
AUTO_RESOLVE_INCONSISTENCIES=true

npm run test:integration
```

### Scenario 3: Apply Fixes
```bash
# .env.integration
DRY_RUN=false
AUTO_RESOLVE_INCONSISTENCIES=true

npm run test:integration
```

### Scenario 4: Performance Testing Only
```bash
npm run test:performance
```

## Troubleshooting

### "Cannot connect to database"
- Verify `MONGODB_URI` in `.env.integration`
- Check network connectivity
- Verify database credentials

### "API request failed"
- Ensure API server is running (`npm run dev`)
- Verify `ADMIN_API_URL` and `POS_API_URL`
- Check API server logs for errors

### "Tests timeout"
- Increase timeout in `config/testConfig.js`
- Check database performance
- Verify API server is responsive

### "Module not found"
- Run `npm install` in Backend directory
- Verify all dependencies are installed

## Best Practices

1. **Always start with DRY_RUN=true**
2. **Review inconsistency reports carefully**
3. **Run during low-traffic periods**
4. **Monitor system performance during tests**
5. **Keep backups before enabling auto-resolution**
6. **Document any manual fixes required**

## Next Steps

1. Review the main [README.md](./README.md) for detailed documentation
2. Check the [design document](../../../../.kiro/specs/real-time-system-integration-testing/design.md) for property definitions
3. Explore the test framework components in the `components/` directory
4. Add custom property tests as needed

## Getting Help

- Check test logs for detailed error information
- Review the troubleshooting section in README.md
- Consult the design document for requirements
- Contact the development team for support

## Safety Checklist

Before running tests with auto-resolution enabled:

- [ ] Database backup is current
- [ ] Reviewed inconsistencies in dry-run mode
- [ ] Understood what will be changed
- [ ] Running during low-traffic period
- [ ] Monitoring system is active
- [ ] Team is aware of the test run
- [ ] Rollback plan is ready

## Example Test Run

```bash
# 1. Start API server
npm run dev

# 2. In another terminal, run infrastructure test
npm run test:integration -- infrastructure.test.js

# 3. If successful, run all tests in dry-run mode
npm run test:integration

# 4. Review output for inconsistencies

# 5. If needed, enable auto-resolution and run again
# (after updating .env.integration)
npm run test:integration

# 6. Verify fixes were applied correctly
```

That's it! You're ready to start using the real-time integration testing framework.
