/**
 * Queue Connection
 * Redis connection configuration for Bull message queues
 */

const Redis = require('ioredis');

// Create Redis connection for Bull queues
const createRedisConnection = () => {
  return new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD,
    db: process.env.REDIS_DB || 0,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryDelayOnFailover: 100,
    showFriendlyErrorStack: process.env.NODE_ENV === 'development',
  });
};

// Create separate connections for queue and worker (recommended by Bull)
const redisConnection = createRedisConnection();

// Event handlers for connection monitoring
redisConnection.on('connect', () => {
  console.log('[Queue] Redis connection established');
});

redisConnection.on('error', (error) => {
  console.error('[Queue] Redis connection error:', error.message);
});

redisConnection.on('reconnecting', () => {
  console.log('[Queue] Redis reconnecting...');
});

module.exports = redisConnection;
