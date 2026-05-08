# Performance Baselines

Use this folder for repeatable JSON timing captures from the running backend.

Command from `Backend/`:

```bash
npm run perf:baseline -- --identifier <admin-user-or-email> --password <password>
```

Token-based command:

```bash
PERF_TOKEN=<jwt> npm run perf:baseline -- --base-url http://localhost:3000/api/v1
```

The benchmark captures the optimized hot routes from the current performance lane:

- account-registration lookup boot bundle
- accounts list
- item list name sort
- item list stock sort
- cashbook merged entries
- monitoring index snapshot
- monitoring slow-route, cache, and database index snapshots

Each route records client timing, server `X-Response-Time`, payload size, status mix, p50, p95, and pass/fail against the route budget.
