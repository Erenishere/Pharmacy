#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');
const axios = require('axios');
const {
  DEFAULT_PERFORMANCE_ROUTES,
  buildBenchmarkReport,
  parseMilliseconds,
  summarizeSamples,
} = require('../src/utils/performanceBaseline');

function printHelp() {
  console.log(`
Usage:
  npm run perf:baseline -- --identifier admin --password password123
  PERF_TOKEN=<jwt> npm run perf:baseline -- --base-url http://localhost:3000/api/v1

Options:
  --base-url <url>      API v1 base URL. Default: PERF_BASE_URL or http://localhost:3000/api/v1
  --identifier <value>  Login username/email. Default: PERF_IDENTIFIER
  --password <value>    Login password. Default: PERF_PASSWORD
  --token <jwt>         Bearer token. Default: PERF_TOKEN
  --samples <n>         Measured samples per route. Default: 5
  --warmup <n>          Warmup requests per route. Default: 1
  --out <path>          Output JSON path. Default: docs/performance-baselines/<timestamp>.json
  --no-write            Print JSON only, do not write a file
  --list-routes         Print the built-in benchmark route list
  --help                Show this help
`);
}

function parseArgs(argv) {
  const options = {
    baseUrl: process.env.PERF_BASE_URL || 'http://localhost:3000/api/v1',
    identifier: process.env.PERF_IDENTIFIER || '',
    password: process.env.PERF_PASSWORD || '',
    token: process.env.PERF_TOKEN || '',
    samples: Number(process.env.PERF_SAMPLES || 5),
    warmup: Number(process.env.PERF_WARMUP || 1),
    write: true,
    out: process.env.PERF_OUTPUT || '',
    listRoutes: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === '--help') options.help = true;
    else if (arg === '--list-routes') options.listRoutes = true;
    else if (arg === '--no-write') options.write = false;
    else if (arg === '--base-url') {
      options.baseUrl = next;
      index += 1;
    } else if (arg === '--identifier') {
      options.identifier = next;
      index += 1;
    } else if (arg === '--password') {
      options.password = next;
      index += 1;
    } else if (arg === '--token') {
      options.token = next;
      index += 1;
    } else if (arg === '--samples') {
      options.samples = Number(next);
      index += 1;
    } else if (arg === '--warmup') {
      options.warmup = Number(next);
      index += 1;
    } else if (arg === '--out') {
      options.out = next;
      index += 1;
    }
  }

  options.samples = Number.isInteger(options.samples) && options.samples > 0 ? options.samples : 5;
  options.warmup = Number.isInteger(options.warmup) && options.warmup >= 0 ? options.warmup : 1;
  options.baseUrl = options.baseUrl.replace(/\/$/, '');

  return options;
}

async function getAccessToken(options) {
  if (options.token) {
    return options.token;
  }

  if (!options.identifier || !options.password) {
    throw new Error('Provide --token or both --identifier and --password so protected routes can be measured.');
  }

  const response = await axios.post(`${options.baseUrl}/auth/login`, {
    identifier: options.identifier,
    password: options.password,
  }, {
    validateStatus: () => true,
  });

  const token = response.data?.data?.accessToken;
  if (response.status >= 400 || !token) {
    throw new Error(`Login failed with status ${response.status}: ${response.data?.error?.message || response.data?.message || 'missing access token'}`);
  }

  return token;
}

function responsePayloadBytes(data) {
  if (data === undefined || data === null) {
    return 0;
  }

  return Buffer.byteLength(typeof data === 'string' ? data : JSON.stringify(data));
}

async function requestSample(client, route) {
  const started = performance.now();
  const response = await client.request({
    method: route.method,
    url: route.path,
    validateStatus: () => true,
  });
  const durationMs = performance.now() - started;

  return {
    ok: response.status >= 200 && response.status < 300,
    status: response.status,
    durationMs,
    serverMs: parseMilliseconds(response.headers['x-response-time']),
    payloadBytes: responsePayloadBytes(response.data),
  };
}

async function measureRoute(client, route, options) {
  for (let index = 0; index < options.warmup; index += 1) {
    await requestSample(client, route);
  }

  const samples = [];
  for (let index = 0; index < options.samples; index += 1) {
    samples.push(await requestSample(client, route));
  }

  return {
    name: route.name,
    method: route.method,
    path: route.path,
    category: route.category,
    budgetMs: route.budgetMs,
    summary: summarizeSamples(samples, route.budgetMs),
    samples,
  };
}

async function collectMonitoringSnapshot(client) {
  const endpoints = {
    slowRoutes: '/monitoring/metrics/slow-routes?limit=10',
    cache: '/monitoring/metrics/cache',
    indexes: '/monitoring/indexes',
  };

  const snapshot = {};
  for (const [key, url] of Object.entries(endpoints)) {
    const response = await client.get(url, { validateStatus: () => true });
    snapshot[key] = response.status >= 200 && response.status < 300
      ? response.data?.data
      : { status: response.status, error: response.data?.error?.message || response.data?.message || 'request failed' };
  }

  return snapshot;
}

function defaultOutputPath() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return path.resolve(__dirname, '../../docs/performance-baselines', `performance-baseline-${timestamp}.json`);
}

function writeReport(report, outputPath) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  if (options.listRoutes) {
    console.log(JSON.stringify(DEFAULT_PERFORMANCE_ROUTES, null, 2));
    return;
  }

  const token = await getAccessToken(options);
  const client = axios.create({
    baseURL: options.baseUrl,
    headers: { Authorization: `Bearer ${token}` },
    timeout: Number(process.env.PERF_TIMEOUT_MS || 30000),
  });

  const startedAt = new Date().toISOString();
  const routes = [];
  for (const route of DEFAULT_PERFORMANCE_ROUTES) {
    routes.push(await measureRoute(client, route, options));
  }

  const monitoring = await collectMonitoringSnapshot(client);
  const endedAt = new Date().toISOString();
  const report = buildBenchmarkReport({
    baseUrl: options.baseUrl,
    routes,
    monitoring,
    samplesPerRoute: options.samples,
    warmupPerRoute: options.warmup,
    startedAt,
    endedAt,
  });

  const outputPath = options.out || defaultOutputPath();
  if (options.write) {
    writeReport(report, outputPath);
    console.log(`Performance baseline written to ${outputPath}`);
  }

  console.log(JSON.stringify(report.summary, null, 2));

  if (!report.summary.allBudgetsPassed) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(`Performance baseline failed: ${error.message}`);
  process.exitCode = 1;
});
