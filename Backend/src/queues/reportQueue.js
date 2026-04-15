/**
 * Report Queue
 * Handles asynchronous report generation and data exports
 */

const Queue = require('bull');
const redisConnection = require('./connection');

const reportQueue = new Queue('report', {
  redis: redisConnection,
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: 'fixed',
      delay: 5000,
    },
    timeout: 600000, // 10 minutes for large reports
    removeOnComplete: 20,
    removeOnFail: 10,
  },
  limiter: {
    max: 10, // Limited to prevent overload
    duration: 60000,
  },
});

// Event handlers
reportQueue.on('completed', (job, result) => {
  console.log(`[ReportQueue] Report generated: ${job.data.reportType}`, result);
});

reportQueue.on('failed', (job, err) => {
  console.error(`[ReportQueue] Report generation failed ${job.data.reportType}:`, err.message);
});

reportQueue.on('progress', (job, progress) => {
  console.log(`[ReportQueue] Report ${job.data.reportType} progress: ${progress}%`);
});

module.exports = reportQueue;
