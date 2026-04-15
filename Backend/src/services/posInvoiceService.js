const Customer = require('../models/Customer');
const AppError = require('../utils/appError');
const batchSelectorService = require('./batchSelectorService');
const salesInvoiceService = require('./salesInvoiceService');
const cashReceiptService = require('./cashReceiptService');

/**
 * POS Invoice Service
 * Optimized invoice creation for POS operations with automatic FEFO batch selection
 */
class POSInvoiceService {
  /**
   * Create invoice for POS
   * @param {Object} invoiceData - Invoice data from POS
   * @param {Object} salesmanContext - Salesman context (id, warehouse)
   * @param {boolean} isDraft - Whether to create as draft
   * @returns {Promise<Object>} Created invoice
   */
  async createInvoice(invoiceData, salesmanContext, isDraft = false) {
    const { salesmanId, warehouseId } = salesmanContext;

    // Validate required fields
    if (!invoiceData.customerId) {
      throw new AppError('Customer is required', 400);
    }

    if (!invoiceData.items || invoiceData.items.length === 0) {
      throw new AppError('At least one item is required', 400);
    }

    // Get customer for credit limit validation
    const customer = await Customer.findById(invoiceData.customerId);
    if (!customer) {
      throw new AppError('Customer not found', 404);
    }

    // Process items with automatic batch selection
    const processedItems = await this.processItemsWithBatches(
      invoiceData.items,
      warehouseId,
    );

    // Build invoice data for salesInvoiceService (always create as draft first)
    const fullInvoiceData = {
      customerId: invoiceData.customerId,
      salesmanId,
      items: processedItems,
      creditDays: invoiceData.creditDays || 0,
      detailNote: invoiceData.notes || '',
      status: 'draft', // Always create as draft first
      salesType: 'new',
    };

    // Create invoice as draft
    const invoice = await salesInvoiceService.createInvoice(fullInvoiceData, salesmanId);

    // If not a draft, confirm it (this handles stock movements, ledger entries, etc.)
    if (!isDraft) {
      let confirmedInvoice = await salesInvoiceService.confirmInvoice(invoice._id, salesmanId);

      // Handle Payment (POS specific)
      if (invoiceData.payment && invoiceData.payment.amount > 0) {
        try {
          const paymentData = {
            customerId: invoiceData.customerId,
            receiptDate: new Date(),
            amount: invoiceData.payment.amount,
            paymentMethod: invoiceData.payment.mode || 'cash',
            invoiceAllocations: [{
              invoiceId: confirmedInvoice._id,
              amount: invoiceData.payment.amount,
            }],
            notes: invoiceData.notes || 'POS Sale',
          };

          await cashReceiptService.createReceipt(paymentData, salesmanId);

          // Refetch invoice to get updated payment status
          confirmedInvoice = await salesInvoiceService.getInvoiceById(confirmedInvoice._id);
        } catch (error) {
          console.error('Error processing POS payment:', error);
          // We don't throw here to avoid failing the invoice creation,
          // but we should probably alert the user or log it critically.
          // The invoice remains confirmed but unpaid.
        }
      }

      return confirmedInvoice;
    }

    return invoice;
  }

  /**
   * Process items with automatic batch selection (FEFO)
   * @param {Array} items - Items from POS
   * @param {string} warehouseId - Warehouse ID
   * @returns {Promise<Array>} Processed items with batch assignments
   */
  async processItemsWithBatches(items, warehouseId) {
    const processedItems = [];

    for (const item of items) {
      // Validate item has required fields
      if (!item.itemId || !item.quantity || !item.unitPrice) {
        throw new AppError(
          'Each item must have itemId, quantity, and unitPrice',
          400,
        );
      }

      // Get batches for item using FEFO
      const batchAllocations = await batchSelectorService.selectBatches(
        item.itemId,
        item.quantity,
        warehouseId,
      );

      // Validate sufficient stock
      const totalAllocated = batchAllocations.reduce(
        (sum, alloc) => sum + alloc.quantity,
        0,
      );

      if (totalAllocated < item.quantity) {
        throw new AppError(
          `Insufficient stock for item ${item.itemName || item.itemId}. Required: ${item.quantity}, Available: ${totalAllocated}`,
          400,
        );
      }

      // Create line items for each batch allocation
      // Format for salesInvoiceService: use boxQty=0, unitQty=quantity, unitTP=unitPrice
      for (const allocation of batchAllocations) {
        processedItems.push({
          itemId: item.itemId,
          warehouseId,
          batchNumber: allocation.batchNumber,
          expiryDate: allocation.expiryDate,
          boxQty: 0,
          unitQty: allocation.quantity,
          boxTP: 0,
          unitTP: item.unitPrice,
          discount1Percent: item.discount || 0,
          discount2Percent: 0,
          scheme1Qty: 0,
          scheme2Qty: 0,
        });
      }
    }

    return processedItems;
  }

  /**
   * Calculate invoice totals with tax
   * @param {Array} items - Processed items
   * @param {number} invoiceDiscount - Invoice-level discount percentage
   * @returns {Object} Calculated totals
   */
  calculateTotals(items, invoiceDiscount = 0) {
    let subtotal = 0;
    let totalTax = 0;
    let totalDiscount = 0;

    // Calculate line item totals
    items.forEach((item) => {
      const lineSubtotal = item.quantity * item.unitPrice;
      const lineDiscount = (lineSubtotal * item.discount) / 100;
      const lineAfterDiscount = lineSubtotal - lineDiscount;
      const lineTax = (lineAfterDiscount * item.gstRate) / 100;

      subtotal += lineSubtotal;
      totalDiscount += lineDiscount;
      totalTax += lineTax;
    });

    // Apply invoice-level discount on subtotal after line discounts
    const subtotalAfterLineDiscounts = subtotal - totalDiscount;
    const invoiceDiscountAmount = (subtotalAfterLineDiscounts * invoiceDiscount) / 100;
    const subtotalAfterAllDiscounts = subtotalAfterLineDiscounts - invoiceDiscountAmount;

    // Recalculate tax proportionally after invoice discount
    const taxAfterInvoiceDiscount = subtotalAfterAllDiscounts > 0
      ? (totalTax * subtotalAfterAllDiscounts) / subtotalAfterLineDiscounts
      : 0;

    const grandTotal = subtotalAfterAllDiscounts + taxAfterInvoiceDiscount;

    return {
      subtotal,
      lineDiscounts: totalDiscount,
      invoiceDiscount: invoiceDiscountAmount,
      totalDiscount: totalDiscount + invoiceDiscountAmount,
      subtotalAfterDiscount: subtotalAfterAllDiscounts,
      tax: taxAfterInvoiceDiscount,
      grandTotal,
    };
  }

  /**
   * Validate customer credit limit
   * @param {Object} customer - Customer object
   * @param {number} invoiceTotal - Invoice total amount
   */
  async validateCreditLimit(customer, invoiceTotal) {
    // Skip validation for cash customers or walk-in
    if (customer.type === 'retail' || customer.code === 'CUST-WALKIN') {
      return;
    }

    // Get credit limit (use businessDetails.creditAmountLimit if available)
    const creditLimit = customer.businessDetails?.creditAmountLimit
      || customer.financialInfo?.creditLimit || 0;

    // Skip if no credit limit set
    if (creditLimit === 0) {
      return;
    }

    // Calculate new balance
    const currentBalance = Math.abs(customer.currentBalance || 0);
    const newBalance = currentBalance + invoiceTotal;

    // Check if credit limit exceeded
    if (newBalance > creditLimit) {
      throw new AppError(
        `Credit limit exceeded. Limit: ${creditLimit.toFixed(2)}, Current Balance: ${currentBalance.toFixed(2)}, Invoice Total: ${invoiceTotal.toFixed(2)}, New Balance: ${newBalance.toFixed(2)}`,
        400,
      );
    }
  }

  /**
   * Get draft invoices for a salesman
   * @param {string} salesmanId - Salesman ID
   * @returns {Promise<Array>} Draft invoices
   */
  async getDraftInvoices(salesmanId) {
    return await salesInvoiceService.getSalesmanInvoices(salesmanId, {
      status: 'draft',
      salesType: 'pos',
    });
  }

  /**
   * Hold an invoice
   * @param {string} invoiceId - Invoice ID
   * @param {string} reason - Reason for holding
   * @param {string} salesmanId - Salesman ID
   * @returns {Promise<Object>} Held invoice
   */
  async holdInvoice(invoiceId, reason, salesmanId) {
    const invoice = await salesInvoiceService.getInvoiceById(invoiceId);

    if (!invoice) {
      throw new AppError('Invoice not found', 404);
    }

    if (invoice.status !== 'draft') {
      throw new AppError('Only draft invoices can be held', 400);
    }

    // Update status to 'held'
    const Invoice = require('../models/Invoice');
    const updatedInvoice = await Invoice.findByIdAndUpdate(
      invoiceId,
      {
        status: 'held',
        heldAt: new Date(),
        heldReason: reason,
        salesmanId, // Ensure salesman is owner
      },
      { new: true },
    );

    return updatedInvoice;
  }

  /**
   * Recall a held invoice
   * @param {string} invoiceId - Invoice ID
   * @returns {Promise<Object>} Recalled invoice (status set back to draft)
   */
  async recallInvoice(invoiceId) {
    const invoice = await salesInvoiceService.getInvoiceById(invoiceId);

    if (!invoice) {
      throw new AppError('Invoice not found', 404);
    }

    if (invoice.status !== 'held') {
      throw new AppError('Only held invoices can be recalled', 400);
    }

    // Update status back to 'draft'
    const Invoice = require('../models/Invoice');
    const updatedInvoice = await Invoice.findByIdAndUpdate(
      invoiceId,
      {
        status: 'draft',
        heldAt: null, // Clear held info
        heldReason: null,
      },
      { new: true },
    );

    return updatedInvoice;
  }

  /**
   * Get held invoices
   * @param {string} salesmanId - Salesman ID (optional, to see only my holds)
   * @returns {Promise<Array>} List of held invoices
   */
  async getHeldInvoices(salesmanId) {
    const Invoice = require('../models/Invoice');
    const query = { status: 'held' };

    if (salesmanId) {
      query.salesmanId = salesmanId;
    }

    return await Invoice.find(query)
      .populate('customerId', 'name code')
      .sort({ heldAt: -1 }); // Newest held first
  }

  /**
   * Cancel an invoice (wrapper for salesInvoiceService.cancelInvoice)
   * @param {string} invoiceId - Invoice ID
   * @param {string} reason - Cancellation reason
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Cancelled invoice
   */
  async cancelInvoice(invoiceId, reason, userId) {
    return await salesInvoiceService.cancelInvoice(invoiceId, reason, userId);
  }
}

module.exports = new POSInvoiceService();
