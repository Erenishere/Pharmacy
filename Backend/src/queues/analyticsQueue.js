/**
 * Analytics Queue
 * Handles analytics updates and metric calculations
 */

const Queue = require('bull');
const redisConnection = require('./connection');

const analyticsQueue = new Queue('analytics', {
  redis: redisConnection,
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: 'fixed',
      delay: 1000,
    },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
  limiter: {
    max: 100,
    duration: 60000,
  },
});

// Event handlers
analyticsQueue.on('completed', (job, result) => {
  console.log(`[AnalyticsQueue] Analytics updated: ${job.data.type}`, result);
});

analyticsQueue.on('failed', (job, err) => {
  console.error(`[AnalyticsQueue] Analytics update failed ${job.data.type}:`, err.message);
});

module.exports = analyticsQueue;
