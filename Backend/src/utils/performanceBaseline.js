const DEFAULT_PERFORMANCE_ROUTES = [
  {
    name: 'account-registration-lookups',
    method: 'GET',
    path: '/accounts/registration-lookups',
    budgetMs: 250,
    category: 'lookup',
  },
  {
    name: 'accounts-list',
    method: 'GET',
    path: '/accounts?page=1&limit=20&sortBy=name&sortOrder=asc',
    budgetMs: 400,
    category: 'list',
  },
  {
    name: 'items-list-name-sort',
    method: 'GET',
    path: '/items?page=1&limit=20&sortBy=name&sortOrder=asc',
    budgetMs: 400,
    category: 'list',
  },
  {
    name: 'item-registration-lookups',
    method: 'GET',
    path: '/items/registration-lookups',
    budgetMs: 250,
    category: 'lookup',
  },
  {
    name: 'items-list-stock-sort',
    method: 'GET',
    path: '/items?page=1&limit=20&sortBy=currentStock&sortOrder=desc',
    budgetMs: 400,
    category: 'list',
  },
  {
    name: 'cashbook-entries',
    method: 'GET',
    path: '/cashbook/entries?page=1&limit=20&sortBy=date&sortOrder=desc',
    budgetMs: 400,
    category: 'list',
  },
  {
    name: 'monitoring-indexes',
    method: 'GET',
    path: '/monitoring/indexes',
    budgetMs: 800,
    category: 'monitoring',
  },
];

function parseMilliseconds(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = Number(String(value).replace('ms', '').trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function percentile(values, percentileRank) {
  if (!values.length) {
    return null;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((percentileRank / 100) * sorted.length) - 1),
  );

  return sorted[index];
}

function roundMetric(value) {
  return value === null || value === undefined ? null : Number(value.toFixed(2));
}

function summarizeSamples(samples, budgetMs) {
  const durations = samples.map((sample) => sample.durationMs).filter(Number.isFinite);
  const serverDurations = samples.map((sample) => sample.serverMs).filter(Number.isFinite);
  const payloadBytes = samples.map((sample) => sample.payloadBytes).filter(Number.isFinite);
  const okCount = samples.filter((sample) => sample.ok).length;
  const statusCodes = samples.reduce((acc, sample) => {
    const key = String(sample.status || 'error');
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const p50 = percentile(durations, 50);
  const p95 = percentile(durations, 95);
  const avg = durations.length
    ? durations.reduce((total, value) => total + value, 0) / durations.length
    : null;
  const avgServerMs = serverDurations.length
    ? serverDurations.reduce((total, value) => total + value, 0) / serverDurations.length
    : null;
  const avgPayloadBytes = payloadBytes.length
    ? payloadBytes.reduce((total, value) => total + value, 0) / payloadBytes.length
    : null;
  const successRate = samples.length ? (okCount / samples.length) * 100 : 0;

  return {
    samples: samples.length,
    successRate: roundMetric(successRate),
    statusCodes,
    minMs: roundMetric(durations.length ? Math.min(...durations) : null),
    maxMs: roundMetric(durations.length ? Math.max(...durations) : null),
    avgMs: roundMetric(avg),
    p50Ms: roundMetric(p50),
    p95Ms: roundMetric(p95),
    avgServerMs: roundMetric(avgServerMs),
    avgPayloadBytes: roundMetric(avgPayloadBytes),
    budgetMs,
    passed: successRate === 100 && p95 !== null && p95 <= budgetMs,
  };
}

function buildBenchmarkReport({
  baseUrl,
  routes,
  monitoring = {},
  samplesPerRoute,
  warmupPerRoute,
  startedAt,
  endedAt,
}) {
  const passedRoutes = routes.filter((route) => route.summary.passed).length;

  return {
    schemaVersion: 1,
    baseUrl,
    startedAt,
    endedAt,
    samplesPerRoute,
    warmupPerRoute,
    summary: {
      routeCount: routes.length,
      passedRoutes,
      failedRoutes: routes.length - passedRoutes,
      allBudgetsPassed: routes.length > 0 && passedRoutes === routes.length,
    },
    routes,
    monitoring,
  };
}

module.exports = {
  DEFAULT_PERFORMANCE_ROUTES,
  buildBenchmarkReport,
  parseMilliseconds,
  percentile,
  summarizeSamples,
};
