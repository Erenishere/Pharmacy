/**
 * Analytics Worker
 * Processes analytics update jobs
 */

const analyticsQueue = require('../queues/analyticsQueue');
const analyticsService = require('../services/analyticsService');
const dashboardService = require('../services/dashboardService');

console.log('[AnalyticsWorker] Initializing...');

// Process update-sales-metrics jobs
analyticsQueue.process('update-sales-metrics', async (job) => {
  const { invoiceId, totalAmount, type } = job.data;
  
  console.log(`[AnalyticsWorker] Updating sales metrics for invoice ${invoiceId}`);
  
  try {
    await analyticsService.recordSale({
      invoiceId,
      amount: totalAmount,
      type,
      timestamp: new Date(),
    });
    
    // Update dashboard cache
    await dashboardService.invalidateSalesCache();
    
    return { success: true };
  } catch (error) {
    console.error(`[AnalyticsWorker] Failed to update sales metrics:`, error);
    throw error;
  }
});

// Process update-inventory-metrics jobs
analyticsQueue.process('update-inventory-metrics', async (job) => {
  const { itemId, quantity, movementType } = job.data;
  
  console.log(`[AnalyticsWorker] Updating inventory metrics for item ${itemId}`);
  
  try {
    await analyticsService.recordStockMovement({
      itemId,
      quantity,
      movementType,
      timestamp: new Date(),
    });
    
    return { success: true };
  } catch (error) {
    console.error(`[AnalyticsWorker] Failed to update inventory metrics:`, error);
    throw error;
  }
});

// Process update-payment-metrics jobs
analyticsQueue.process('update-payment-metrics', async (job) => {
  const { invoiceId, paymentAmount, paymentMethod } = job.data;
  
  console.log(`[AnalyticsWorker] Updating payment metrics`);
  
  try {
    await analyticsService.recordPayment({
      invoiceId,
      amount: paymentAmount,
      method: paymentMethod,
      timestamp: new Date(),
    });
    
    return { success: true };
  } catch (error) {
    console.error(`[AnalyticsWorker] Failed to update payment metrics:`, error);
    throw error;
  }
});

console.log('[AnalyticsWorker] Ready');

module.exports = analyticsQueue;
