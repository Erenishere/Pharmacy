/**
 * Redis Client Configuration
 * Production-ready ioredis setup for Redis Cloud
 */

const Redis = require('ioredis');

let client = null;
let isConnected = false;

function getConnectionConfig() {
  const redisUrl = process.env.REDIS_URL;
  const envTlsEnabled = process.env.REDIS_TLS === 'true';
  const rejectUnauthorized = process.env.REDIS_TLS_REJECT_UNAUTHORIZED !== 'false';

  if (redisUrl) {
    const parsedUrl = new URL(redisUrl);
    const tlsEnabled = parsedUrl.protocol === 'rediss:' || envTlsEnabled;

    return {
      host: parsedUrl.hostname,
      port: parseInt(parsedUrl.port || '6379', 10),
      username: decodeURIComponent(parsedUrl.username || process.env.REDIS_USERNAME || 'default'),
      password: decodeURIComponent(parsedUrl.password || process.env.REDIS_PASSWORD || '') || undefined,
      tlsEnabled,
      rejectUnauthorized,
    };
  }

  return {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    username: process.env.REDIS_USERNAME || 'default',
    password: process.env.REDIS_PASSWORD || undefined,
    tlsEnabled: envTlsEnabled,
    rejectUnauthorized,
  };
}

function createClient() {
  const connection = getConnectionConfig();

  const config = {
    host: connection.host,
    port: connection.port,
    username: connection.username,
    password: connection.password,
    // Retry strategy: exponential backoff, give up after 10 attempts
    retryStrategy(times) {
      if (times > 10) {
        console.error('[Redis] Max retry attempts reached. Redis unavailable.');
        return null; // Stop retrying
      }
      return Math.min(times * 200, 3000); // 200ms, 400ms, ... 3s
    },
    // Connection settings
    connectTimeout: 10000,
    lazyConnect: false,
    keepAlive: 30000,
    // TLS is required by providers such as Upstash/Redis Cloud.
    ...(connection.tlsEnabled && {
      tls: {
        rejectUnauthorized: connection.rejectUnauthorized,
      },
    }),
  };

  const redisClient = new Redis(config);

  redisClient.on('connect', () => {
    isConnected = true;
    console.log('[Redis] Connected to Redis Cloud');
  });

  redisClient.on('ready', () => {
    console.log('[Redis] Client ready');
  });

  redisClient.on('error', (err) => {
    isConnected = false;
    // Log but don't crash — app falls back to no-cache gracefully
    console.error('[Redis] Error:', err.message);
  });

  redisClient.on('close', () => {
    isConnected = false;
  });

  redisClient.on('reconnecting', () => {
    console.log('[Redis] Reconnecting...');
  });

  return redisClient;
}

function getClient() {
  if (!client) {
    client = createClient();
  }
  return client;
}

function isReady() {
  return isConnected && client && client.status === 'ready';
}

async function disconnect() {
  if (client) {
    await client.quit();
    client = null;
    isConnected = false;
    console.log('[Redis] Disconnected');
  }
}

module.exports = { getClient, isReady, disconnect };
