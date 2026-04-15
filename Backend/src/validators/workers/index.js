/**
 * Workers Index
 * Central entry point for all background job workers
 * Each worker handles a specific queue
 */

const emailWorker = require('./emailWorker');
const notificationWorker = require('./notificationWorker');
const ledgerWorker = require('./ledgerWorker');
const reportWorker = require('./reportWorker');
const analyticsWorker = require('./analyticsWorker');

console.log('[Workers] Starting all background workers...');

// Export worker modules for testing
module.exports = {
  emailWorker,
  notificationWorker,
  ledgerWorker,
  reportWorker,
  analyticsWorker,
};
