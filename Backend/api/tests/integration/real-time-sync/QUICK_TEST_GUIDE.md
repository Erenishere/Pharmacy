# Quick Test Guide - Real-Time System Integration Testing

## 🚀 Quick Start

### Run All Tests (Fast Mode - ~5-10 minutes)
```bash
cd Backend/tests/integration/real-time-sync
npm test
```

### Run Specific Test Suites

#### Framework Component Tests (~1 minute)
```bash
npm test -- framework-components.test.js
```

#### Property Tests by Category

**Real-Time Synchronization** (~2 minutes)
```bash
npm test -- properties/adminToPosSync.test.js
npm test -- properties/posToAdminSync.test.js
npm test -- properties/inventorySync.test.js
```

**Data Consistency** (~3