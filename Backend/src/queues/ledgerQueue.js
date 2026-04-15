/**
 * Ledger Queue
 * Handles asynchronous ledger posting and financial updates
 */

const Queue = require('bull');
const redisConnection = require('./connection');

const ledgerQueue = new Queue('ledger', {
  redis: redisConnection,
  defaultJobOptions: {
    attempts: 5, // More retries for financial operations
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
  limiter: {
    max: 50,
    duration: 60000,
  },
});

// Event handlers
ledgerQueue.on('completed', (job, result) => {
  console.log(`[LedgerQueue] Ledger operation completed: ${job.data.type}`, result);
});

ledgerQueue.on('failed', (job, err) => {
  console.error(`[LedgerQueue] Ledger operation failed ${job.data.type}:`, err.message);
  // Alert for manual review if needed
});

module.exports = ledgerQueue;
