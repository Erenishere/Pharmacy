# Pharmacy ERP QA Smoke Harness

This folder contains Playwright browser smoke tests plus a deterministic seed script for the completion program.

## Commands

Run from the repo root:

```powershell
npm run qa:install
npm run qa:seed
npm run qa:smoke
```

Use headed mode when debugging UI behavior:

```powershell
npm run qa:smoke:headed
```

The Playwright config starts the backend and Angular dev server by default. To test already-running servers:

```powershell
$env:QA_START_SERVERS='0'
$env:FRONTEND_URL='http://127.0.0.1:4200'
npm run qa:smoke
```

## Seed Safety

The seed script loads `Backend/.env` and chooses the first available URI from:

1. `SMOKE_MONGODB_URI`
2. `MONGODB_TEST_URI`
3. `MONGODB_URI`

It refuses non-local/non-test-looking MongoDB URIs unless `ALLOW_SMOKE_SEED=1` is set. Use that only for an approved smoke database.

Seeded login:

- Username: `smoke.admin`
- Password: `SmokePass123`

Seeded business data includes cash/bank ledger accounts, customer, supplier, employee account, item, warehouse, inventory batch, sales invoice, purchase invoice, purchase order, and pending PDC receipt.

## Gates

These tests are intentionally broad smoke checks. They are meant to catch dead navigation, auth failure, placeholder copy, and missing critical action surfaces before a slice is marked complete. Backend Jest and `npm run frontend:build` remain required for business-contract proof.
