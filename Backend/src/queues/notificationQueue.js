/**
 * Notification Queue
 * Handles real-time notifications, SMS, and push notifications
 */

const Queue = require('bull');
const redisConnection = require('./connection');

const notificationQueue = new Queue('notification', {
  redis: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'fixed',
      delay: 1000,
    },
    removeOnComplete: 50,
    removeOnFail: 20,
  },
  limiter: {
    max: 200,
    duration: 60000,
  },
});

// Event handlers
notificationQueue.on('completed', (job, result) => {
  console.log(`[NotificationQueue] Notification sent: ${job.data.type}`, result);
});

notificationQueue.on('failed', (job, err) => {
  console.error(`[NotificationQueue] Failed to send notification ${job.data.type}:`, err.message);
});

module.exports = notificationQueue;
