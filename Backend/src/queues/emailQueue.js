/**
 * Email Queue
 * Handles asynchronous email sending operations
 */

const Queue = require('bull');
const redisConnection = require('./connection');

const emailQueue = new Queue('email', {
  redis: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: 10, // Keep 10 completed jobs
    removeOnFail: 5, // Keep 5 failed jobs
  },
  limiter: {
    max: 100, // Max 100 emails per
    duration: 60000, // per minute
  },
});

// Event handlers for monitoring
emailQueue.on('completed', (job, result) => {
  console.log(`[EmailQueue] Email sent: ${job.data.to}`, result);
});

emailQueue.on('failed', (job, err) => {
  console.error(`[EmailQueue] Failed to send email to ${job.data.to}:`, err.message);
});

emailQueue.on('stalled', (job) => {
  console.warn(`[EmailQueue] Job stalled: ${job.id}`);
});

module.exports = emailQueue;
