/**
 * Event Publisher Service
 * Publishes domain events to message queues for asynchronous processing
 * Decouples critical operations from API response time
 */

const auditService = require('./auditService');
const { getRequestContext } = require('../utils/requestContext');

class EventPublisherService {
  constructor() {
    // Track published events for correlation
    this.events = [];
    
    // Configuration
    this.config = {
      // Whether to publish synchronously (for testing) or asynchronously
      syncPublish: process.env.QUEUE_SYNC_PUBLISH === 'true',
      // Max retry attempts for publishing
      maxRetries: 3,
    };
  }

  /**
   * Publish invoice created event
   * Triggers: Ledger posting, notifications, emails, analytics
   * @param {Object} invoice - Created invoice
   */
  async publishInvoiceCreated(invoice) {
    const eventData = this.createEventData('invoice.created', {
      invoiceId: invoice._id,
      invoiceNumber: invoice.invoiceNumber,
      type: invoice.type,
      customerId: invoice.customerId,
      supplierId: invoice.supplierId,
      salesmanId: invoice.salesmanId,
      totalAmount: invoice.total,
      status: invoice.status,
    });

    try {
      // Queues removed - async operations disabled
      // Previously: ledgerQueue.add, notificationQueue.add, emailQueue.add, analyticsQueue.add

      this.logEvent('invoice.created', eventData);
      return true;
    } catch (error) {
      console.error('[EventPublisher] Error publishing invoice created:', error);
      // Don't throw - event publishing should not break business logic
      return false;
    }
  }

  /**
   * Publish invoice confirmed event
   * @param {Object} invoice - Confirmed invoice
   */
  async publishInvoiceConfirmed(invoice) {
    const eventData = this.createEventData('invoice.confirmed', {
      invoiceId: invoice._id,
      invoiceNumber: invoice.invoiceNumber,
      type: invoice.type,
      customerId: invoice.customerId,
      status: 'confirmed',
      confirmedAt: new Date(),
    });

    try {
      // Queues removed - async operations disabled
      // Previously: ledgerQueue.add, notificationQueue.add

      this.logEvent('invoice.confirmed', eventData);
      return true;
    } catch (error) {
      console.error('[EventPublisher] Error publishing invoice confirmed:', error);
      return false;
    }
  }

  /**
   * Publish invoice paid event
   * @param {Object} invoice - Paid invoice
   * @param {Object} paymentDetails - Payment information
   */
  async publishInvoicePaid(invoice, paymentDetails) {
    const eventData = this.createEventData('invoice.paid', {
      invoiceId: invoice._id,
      invoiceNumber: invoice.invoiceNumber,
      paymentAmount: paymentDetails.amount,
      paymentMethod: paymentDetails.method,
      customerId: invoice.customerId,
      paidAt: new Date(),
    });

    try {
      // Queues removed - async operations disabled
      // Previously: ledgerQueue.add, notificationQueue.add, emailQueue.add, analyticsQueue.add

      this.logEvent('invoice.paid', eventData);
      return true;
    } catch (error) {
      console.error('[EventPublisher] Error publishing invoice paid:', error);
      return false;
    }
  }

  /**
   * Publish stock updated event
   * @param {string} itemId - Item ID
   * @param {string} warehouseId - Warehouse ID
   * @param {number} quantity - Quantity changed
   * @param {string} movementType - Type of movement (in/out/transfer)
   */
  async publishStockUpdated(itemId, warehouseId, quantity, movementType) {
    const eventData = this.createEventData('stock.updated', {
      itemId,
      warehouseId,
      quantity,
      movementType,
      timestamp: new Date(),
    });

    try {
      // Queues removed - async operations disabled
      // Previously: notificationQueue.add, analyticsQueue.add

      this.logEvent('stock.updated', eventData);
      return true;
    } catch (error) {
      console.error('[EventPublisher] Error publishing stock update:', error);
      return false;
    }
  }

  /**
   * Publish batch expiring event
   * @param {Object} batch - Batch nearing expiry
   */
  async publishBatchExpiring(batch) {
    const eventData = this.createEventData('batch.expiring', {
      batchId: batch._id,
      batchNumber: batch.batchNumber,
      itemId: batch.itemId,
      expiryDate: batch.expiryDate,
      remainingQuantity: batch.remainingQuantity,
      daysToExpiry: this.calculateDaysToExpiry(batch.expiryDate),
    });

    try {
      // Queues removed - async operations disabled
      // Previously: notificationQueue.add

      this.logEvent('batch.expiring', eventData);
      return true;
    } catch (error) {
      console.error('[EventPublisher] Error publishing batch expiring:', error);
      return false;
    }
  }

  /**
   * Publish customer credit limit reached event
   * @param {string} customerId - Customer ID
   * @param {Object} creditInfo - Credit information
   */
  async publishCreditLimitReached(customerId, creditInfo) {
    const eventData = this.createEventData('customer.credit-limit-reached', {
      customerId,
      currentBalance: creditInfo.currentBalance,
      creditLimit: creditInfo.creditLimit,
      availableCredit: creditInfo.availableCredit,
      utilizationPercent: creditInfo.utilizationPercent,
    });

    try {
      // Queues removed - async operations disabled
      // Previously: notificationQueue.add

      this.logEvent('customer.credit-limit-reached', eventData);
      return true;
    } catch (error) {
      console.error('[EventPublisher] Error publishing credit limit:', error);
      return false;
    }
  }

  /**
   * Publish report generation request
   * @param {string} reportType - Type of report
   * @param {Object} parameters - Report parameters
   * @param {string} requestedBy - User ID who requested
   */
  async publishReportGeneration(reportType, parameters, requestedBy) {
    const eventData = this.createEventData('report.generate', {
      reportType,
      parameters,
      requestedBy,
      requestedAt: new Date(),
    });

    try {
      // Queues removed - async operations disabled
      // Previously: reportQueue.add

      this.logEvent('report.generate', eventData);
      return true;
    } catch (error) {
      console.error('[EventPublisher] Error publishing report generation:', error);
      return false;
    }
  }

  /**
   * Publish export request
   * @param {string} exportType - Type of export
   * @param {Object} query - Export query/filter
   * @param {string} format - Export format (csv, xlsx, pdf)
   * @param {string} requestedBy - User ID
   */
  async publishExportRequest(exportType, query, format, requestedBy) {
    const eventData = this.createEventData('export.request', {
      exportType,
      query,
      format,
      requestedBy,
      requestedAt: new Date(),
    });

    try {
      // Queues removed - async operations disabled
      // Previously: reportQueue.add

      this.logEvent('export.request', eventData);
      return true;
    } catch (error) {
      console.error('[EventPublisher] Error publishing export request:', error);
      return false;
    }
  }

  /**
   * Publish email request
   * @param {string} template - Email template name
   * @param {string} to - Recipient email
   * @param {Object} data - Template data
   * @param {Object} options - Email options
   */
  async publishEmail(template, to, data, options = {}) {
    const eventData = this.createEventData('email.send', {
      template,
      to,
      data,
      ...options,
    });

    try {
      // Queues removed - async operations disabled
      // Previously: emailQueue.add

      this.logEvent('email.send', eventData);
      return true;
    } catch (error) {
      console.error('[EventPublisher] Error publishing email:', error);
      return false;
    }
  }

  /**
   * Publish SMS notification
   * @param {string} phoneNumber - Recipient phone
   * @param {string} message - Message text
   * @param {Object} options - SMS options
   */
  async publishSMS(phoneNumber, message, options = {}) {
    const eventData = this.createEventData('sms.send', {
      phoneNumber,
      message,
      ...options,
    });

    try {
      // Queues removed - async operations disabled
      // Previously: notificationQueue.add

      this.logEvent('sms.send', eventData);
      return true;
    } catch (error) {
      console.error('[EventPublisher] Error publishing SMS:', error);
      return false;
    }
  }

  /**
   * Publish audit event
   * @param {string} action - Action performed
   * @param {Object} details - Event details
   */
  async publishAuditEvent(action, details) {
    const eventData = this.createEventData(`audit.${action}`, details);

    try {
      // Queues removed - async operations disabled
      // Previously: notificationQueue.add

      this.logEvent(`audit.${action}`, eventData);
      return true;
    } catch (error) {
      console.error('[EventPublisher] Error publishing audit event:', error);
      return false;
    }
  }

  /**
   * Create standardized event data with correlation
   * @param {string} type - Event type
   * @param {Object} data - Event payload
   * @returns {Object} Standardized event
   */
  createEventData(type, data) {
    const context = getRequestContext();

    return {
      type,
      timestamp: new Date().toISOString(),
      correlationId: context?.get('correlationId') || this.generateCorrelationId(),
      userId: context?.get('userId'),
      userRole: context?.get('userRole'),
      ipAddress: context?.get('ipAddress'),
      payload: data,
    };
  }

  /**
   * Generate correlation ID
   * @returns {string}
   */
  generateCorrelationId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Log published event
   * @param {string} type - Event type
   * @param {Object} eventData - Event data
   */
  logEvent(type, eventData) {
    this.events.push({
      type,
      timestamp: new Date(),
      correlationId: eventData.correlationId,
    });

    // Trim events array to prevent memory leak
    if (this.events.length > 1000) {
      this.events = this.events.slice(-500);
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`[EventPublisher] Event published: ${type}`, {
        correlationId: eventData.correlationId,
        timestamp: eventData.timestamp,
      });
    }
  }

  /**
   * Get published events (for debugging)
   * @param {number} limit - Number of events to return
   * @returns {Array}
   */
  getPublishedEvents(limit = 100) {
    return this.events.slice(-limit);
  }

  /**
   * Calculate days to expiry
   * @param {Date} expiryDate
   * @returns {number}
   */
  calculateDaysToExpiry(expiryDate) {
    if (!expiryDate) return null;
    const now = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry - now;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Wait for all pending event publications
   * Useful for testing
   * @returns {Promise<void>}
   */
  async waitForPending() {
    // This is a placeholder - in production, you'd track promises
    return new Promise(resolve => setTimeout(resolve, 100));
  }
}

// Export singleton instance
module.exports = new EventPublisherService();
