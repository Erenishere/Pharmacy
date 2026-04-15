/**
 * Redis Client Configuration
 * Production-ready ioredis setup for Redis Cloud
 */

const Redis = require('ioredis');

let client = null;
let isConnected = false;

function createClient() {
  const tlsEnabled = process.env.REDIS_TLS === 'true';

  const config = {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT, 10),
    username: process.env.REDIS_USERNAME || 'default',
    password: process.env.REDIS_PASSWORD || undefined,
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
    // TLS for Redis Cloud
    ...(tlsEnabled && {
      tls: {
        rejectUnauthorized: false, // Redis Cloud uses self-signed certs
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
