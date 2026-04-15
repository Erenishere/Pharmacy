/**
 * Notification Worker
 * Processes notification jobs from the notification queue
 */

const notificationQueue = require('../queues/notificationQueue');
const websocketService = require('../services/websocketService');
const smsService = require('../services/smsService');
const auditService = require('../services/auditService');

console.log('[NotificationWorker] Initializing...');

// Process notify-invoice-created jobs
notificationQueue.process('notify-invoice-created', async (job) => {
  const { invoiceId, customerId, salesmanId, invoiceNumber, totalAmount } = job.data;
  
  console.log(`[NotificationWorker] Notifying invoice creation: ${invoiceNumber}`);
  
  try {
    // Notify salesman via WebSocket
    if (salesmanId) {
      websocketService.sendToUser(salesmanId, {
        type: 'invoice_created',
        invoiceId,
        invoiceNumber,
        totalAmount,
        timestamp: new Date(),
      });
    }
    
    return { success: true, notified: ['salesman'] };
  } catch (error) {
    console.error(`[NotificationWorker] Failed to notify:`, error);
    throw error;
  }
});

// Process notify-invoice-confirmed jobs
notificationQueue.process('notify-invoice-confirmed', async (job) => {
  const { invoiceId, customerId, invoiceNumber } = job.data;
  
  console.log(`[NotificationWorker] Notifying invoice confirmation: ${invoiceNumber}`);
  
  try {
    // Notify customer
    // This could be an SMS or push notification
    
    return { success: true };
  } catch (error) {
    console.error(`[NotificationWorker] Failed to notify:`, error);
    throw error;
  }
});

// Process notify-salesman jobs
notificationQueue.process('notify-salesman', async (job) => {
  const { userId, message, type } = job.data;
  
  console.log(`[NotificationWorker] Notifying salesman ${userId}: ${message}`);
  
  try {
    websocketService.sendToUser(userId, {
      type,
      message,
      timestamp: new Date(),
    });
    
    return { success: true };
  } catch (error) {
    console.error(`[NotificationWorker] Failed to notify salesman:`, error);
    throw error;
  }
});

// Process check-reorder-point jobs
notificationQueue.process('check-reorder-point', async (job) => {
  const { itemId, warehouseId, quantity } = job.data;
  
  try {
    const Item = require('../models/Item');
    const item = await Item.findById(itemId);
    
    if (item && item.reorderPoint && quantity <= item.reorderPoint) {
      // Notify inventory managers
      websocketService.sendToRole('inventory_manager', {
        type: 'reorder_alert',
        itemId,
        itemName: item.name,
        currentStock: quantity,
        reorderPoint: item.reorderPoint,
      });
    }
    
    return { success: true };
  } catch (error) {
    console.error(`[NotificationWorker] Failed to check reorder point:`, error);
    throw error;
  }
});

// Process stock-alert jobs
notificationQueue.process('stock-alert', async (job) => {
  const { itemId, warehouseId, quantity, movementType } = job.data;
  
  // Handle low stock alerts
  if (quantity < 0) { // Stock out
    console.log(`[NotificationWorker] Stock alert for item ${itemId}`);
  }
  
  return { success: true };
});

// Process batch-expiry-warning jobs
notificationQueue.process('batch-expiry-warning', async (job) => {
  const { batchId, batchNumber, itemId, daysToExpiry } = job.data;
  
  console.log(`[NotificationWorker] Batch expiry warning: ${batchNumber} expires in ${daysToExpiry} days`);
  
  try {
    // Notify inventory managers
    websocketService.sendToRole('inventory_manager', {
      type: 'batch_expiry_warning',
      batchId,
      batchNumber,
      itemId,
      daysToExpiry,
    });
    
    return { success: true };
  } catch (error) {
    console.error(`[NotificationWorker] Failed to send expiry warning:`, error);
    throw error;
  }
});

// Process notify-credit-limit jobs
notificationQueue.process('notify-credit-limit', async (job) => {
  const { customerId, currentBalance, creditLimit, severity } = job.data;
  
  console.log(`[NotificationWorker] Credit limit reached for customer ${customerId}`);
  
  try {
    // Notify sales managers
    websocketService.sendToRole('sales_manager', {
      type: 'credit_limit_reached',
      customerId,
      currentBalance,
      creditLimit,
      severity,
    });
    
    return { success: true };
  } catch (error) {
    console.error(`[NotificationWorker] Failed to notify credit limit:`, error);
    throw error;
  }
});

// Process send-sms jobs
notificationQueue.process('send-sms', async (job) => {
  const { phoneNumber, message } = job.data;
  
  console.log(`[NotificationWorker] Sending SMS to ${phoneNumber}`);
  
  try {
    const result = await smsService.sendSMS(phoneNumber, message);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error(`[NotificationWorker] Failed to send SMS:`, error);
    throw error;
  }
});

// Process audit-log jobs
notificationQueue.process('audit-log', async (job) => {
  const { type, payload, userId } = job.data;
  
  try {
    await auditService.createLogEntry({
      actionType: 'SYSTEM',
      collectionName: 'events',
      documentId: payload.id || 'system',
      summary: type,
      userId,
      metadata: payload,
    });
    
    return { success: true };
  } catch (error) {
    console.error(`[NotificationWorker] Failed to log audit:`, error);
    throw error;
  }
});

console.log('[NotificationWorker] Ready');

module.exports = notificationQueue;
