const Invoice = require('../models/Invoice');
const inventoryService = require('./inventoryService');
const stockMovementRepository = require('../repositories/stockMovementRepository');
const ledgerService = require('./ledgerService');
const batchCreationService = require('./batchCreationService');

/**
 * Purchase Return Service
 * Requirement 3: Purchase Return Processing
 * Handles business logic for purchase return management
 *
 * Task 5.1 Implementation:
 * - createReturn(originalInvoiceId, returnData, userId)
 * - validateReturn(originalInvoice, returnItems)
 * - processReturn(returnInvoice) for stock and ledger
 * - generateDebitNote(returnInvoice)
 */
class PurchaseReturnService {
  /**
   * Task 5.1: Create a purchase return
   * Wrapper method that matches the task specification
   * @param {string} originalInvoiceId - Original invoice ID
   * @param {Object} returnData - Return data (returnItems, returnReason, returnNotes)
   * @param {string} userId - User ID creating the return
   * @returns {Promise<Object>} Created return invoice with debit note
   */
  async createReturn(originalInvoiceId, returnData, userId) {
    return this.createPurchaseReturn({
      originalInvoiceId,
      returnItems: returnData.returnItems,
      returnReason: returnData.returnReason,
      returnNotes: returnData.returnNotes,
      createdBy: userId,
    });
  }

  /**
   * Task 5.1: Validate return against original invoice
   * Wrapper method that matches the task specification
   * @param {Object} originalInvoice - Original invoice object
   * @param {Array} returnItems - Items to be returned with quantities
   * @returns {Promise<Object>} Validation result
   */
  async validateReturn(originalInvoice, returnItems) {
    return this.validateReturnQuantities(originalInvoice._id, returnItems);
  }

  /**
   * Task 5.1: Process return for stock and ledger
   * Wrapper method that matches the task specification
   * Processes both inventory adjustments and ledger entries
   * @param {Object} returnInvoice - Return invoice object
   * @returns {Promise<Object>} Processing result
   */
  async processReturn(returnInvoice) {
    // Get original invoice for warehouse information
    const originalInvoice = await Invoice.findById(returnInvoice.originalInvoiceId);

    if (!originalInvoice) {
      throw new Error('Original invoice not found');
    }

    // Process inventory (stock reduction)
    await this.processReturnInventory(returnInvoice, originalInvoice);

    // Process ledger entries (reverse accounting)
    await this.createReverseLedgerEntries(returnInvoice, originalInvoice);

    return {
      success: true,
      message: 'Return processed successfully',
      inventoryProcessed: true,
      ledgerEntriesCreated: true,
    };
  }

  /**
   * Validate return quantities against original purchase invoice
   * @param {string} invoiceId - Original invoice ID
   * @param {Array} returnItems - Items to be returned with quantities
   * @returns {Promise<Object>} Validation result
   */
  async validateReturnQuantities(invoiceId, returnItems) {
    const originalInvoice = await Invoice.findById(invoiceId);

    if (!originalInvoice) {
      return {
        valid: false,
        errors: ['Original invoice not found'],
      };
    }

    if (originalInvoice.type !== 'purchase') {
      return {
        valid: false,
        errors: ['Can only create returns for purchase invoices'],
      };
    }

    const existingReturns = await Invoice.find({
      originalInvoiceId: invoiceId,
      type: 'return_purchase',
      status: { $ne: 'cancelled' },
    });

    const returnedQuantities = {};
    existingReturns.forEach((returnInvoice) => {
      returnInvoice.items.forEach((item) => {
        const itemId = item.itemId.toString();
        if (!returnedQuantities[itemId]) {
          returnedQuantities[itemId] = 0;
        }
        const totalQty = (item.boxQuantity || 0) + (item.unitQuantity || 0) + (item.quantity || 0);
        returnedQuantities[itemId] += Math.abs(totalQty);
      });
    });

    const errors = [];
    const validatedItems = [];

    for (const returnItem of returnItems) {
      const itemId = returnItem.itemId.toString();

      const originalItem = originalInvoice.items.find(
        (item) => item.itemId.toString() === itemId,
      );

      if (!originalItem) {
        errors.push(`Item ${itemId} not found in original invoice`);
        continue;
      }

      const originalBoxQty = originalItem.boxQuantity || originalItem.boxQty || 0;
      const originalUnitQty = originalItem.unitQuantity || originalItem.unitQty || 0;
      const boxPacking = originalItem.boxPacking || 1;
      const originalTotalQty = (originalBoxQty * boxPacking) + originalUnitQty;
      const alreadyReturned = returnedQuantities[itemId] || 0;
      const availableForReturn = originalTotalQty - alreadyReturned;

      const returnBoxQty = returnItem.boxQuantity || returnItem.boxQty || 0;
      const returnUnitQty = returnItem.unitQuantity || returnItem.unitQty || 0;
      const returnTotalQty = (returnBoxQty * boxPacking) + returnUnitQty;

      if (returnTotalQty > availableForReturn) {
        errors.push(
          `Item ${itemId}: Cannot return ${returnTotalQty} units. `
          + `Only ${availableForReturn} units available (${originalTotalQty} original, `
          + `${alreadyReturned} already returned)`,
        );
        continue;
      }

      if (returnTotalQty <= 0) {
        errors.push(`Item ${itemId}: Return quantity must be greater than 0`);
        continue;
      }

      validatedItems.push({
        itemId,
        ...returnItem,
        availableForReturn,
        originalQuantity: originalTotalQty,
        alreadyReturned,
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      validatedItems,
    };
  }

  /**
   * Get returnable items from a purchase invoice
   * @param {string} invoiceId - Original invoice ID
   * @returns {Promise<Array>} List of items with returnable quantities
   */
  async getReturnableItems(invoiceId) {
    const originalInvoice = await Invoice.findById(invoiceId)
      .populate('items.itemId', 'name code');

    if (!originalInvoice) {
      throw new Error('Original invoice not found');
    }

    if (originalInvoice.type !== 'purchase') {
      throw new Error('Can only get returnable items for purchase invoices');
    }

    const existingReturns = await Invoice.find({
      originalInvoiceId: invoiceId,
      type: 'return_purchase',
      status: { $ne: 'cancelled' },
    });

    const returnedQuantities = {};
    existingReturns.forEach((returnInvoice) => {
      returnInvoice.items.forEach((item) => {
        const itemId = item.itemId.toString();
        if (!returnedQuantities[itemId]) {
          returnedQuantities[itemId] = 0;
        }
        const totalQty = (item.boxQuantity || 0) + (item.unitQuantity || 0) + (item.quantity || 0);
        returnedQuantities[itemId] += Math.abs(totalQty);
      });
    });

    const returnableItems = originalInvoice.items.map((item) => {
      const itemId = item.itemId._id.toString();
      const boxQty = item.boxQuantity || item.boxQty || 0;
      const unitQty = item.unitQuantity || item.unitQty || 0;
      const boxPacking = item.boxPacking || 1;
      const quantity = (boxQty * boxPacking) + unitQty;
      const alreadyReturned = returnedQuantities[itemId] || 0;
      const availableForReturn = quantity - alreadyReturned;

      return {
        itemId: item.itemId._id,
        itemName: item.itemId.name,
        itemCode: item.itemId.code,
        originalBoxQty: boxQty,
        originalUnitQty: unitQty,
        originalQuantity: quantity,
        alreadyReturned,
        availableForReturn,
        boxRate: item.boxRate || item.boxTP || 0,
        unitRate: item.unitRate || item.unitTP || 0,
        gstRate: item.gstRate || 18,
        canReturn: availableForReturn > 0,
      };
    }).filter((item) => item.canReturn);

    return returnableItems;
  }

  /**
   * Generate debit note for purchase return
   * Requirement 3.6: Generate debit note
   * @param {Object} returnInvoice - Return invoice
   * @returns {Object} Debit note data
   */
  generateDebitNote(returnInvoice) {
    return {
      debitNoteNumber: `DN${returnInvoice.invoiceNumber}`,
      date: returnInvoice.invoiceDate,
      originalInvoiceNumber: returnInvoice.originalInvoiceId?.invoiceNumber,
      supplierId: returnInvoice.supplierId,
      supplierName: returnInvoice.supplierName,
      totalAmount: Math.abs(returnInvoice.totals.grandTotal),
      gst18Amount: Math.abs(returnInvoice.totals.gst18Total || 0),
      gst4Amount: Math.abs(returnInvoice.totals.gst4Total || 0),
      reason: returnInvoice.returnMetadata?.returnReason,
      notes: returnInvoice.returnMetadata?.returnNotes,
    };
  }

  /**
   * Create a purchase return invoice
   * Requirement 3.1-3.10: Complete return processing
   * @param {Object} returnData - Return invoice data
   * @returns {Promise<Object>} Created return invoice with debit note
   */
  async createPurchaseReturn(returnData) {
    const {
      originalInvoiceId,
      returnItems,
      returnReason,
      returnNotes,
      createdBy,
    } = returnData;

    const originalInvoice = await Invoice.findById(originalInvoiceId)
      .populate('supplierId', 'name town isTaxFiler isNonFilerAccount');

    if (!originalInvoice) {
      throw new Error('Original invoice not found');
    }

    if (originalInvoice.type !== 'purchase') {
      throw new Error('Can only create returns for purchase invoices');
    }

    const validation = await this.validateReturnQuantities(originalInvoiceId, returnItems);

    if (!validation.valid) {
      throw new Error(`Return validation failed: ${validation.errors.join(', ')}`);
    }

    const returnInvoiceItems = [];
    let subtotal = 0;
    let totalDiscount = 0;
    let gst18Total = 0;
    let gst4Total = 0;

    for (const returnItem of validation.validatedItems) {
      const originalItem = originalInvoice.items.find(
        (item) => item.itemId.toString() === returnItem.itemId,
      );

      const boxPacking = originalItem.boxPacking || 1;
      const returnBoxQty = returnItem.boxQuantity || returnItem.boxQty || 0;
      const returnUnitQty = returnItem.unitQuantity || returnItem.unitQty || 0;
      const boxTP = originalItem.boxRate || originalItem.boxTP || 0;
      const unitTP = originalItem.unitRate || originalItem.unitTP || 0;
      const discount = originalItem.discount1Percent || originalItem.discount || 0;

      const boxAmount = returnBoxQty * boxTP;
      const unitAmount = returnUnitQty * unitTP;
      const grossAmount = boxAmount + unitAmount;
      const discountAmount = (grossAmount * discount) / 100;
      const netAmount = -(grossAmount - discountAmount);
      subtotal += netAmount;
      totalDiscount += -(discountAmount);

      let gstAmount = 0;
      const gstRate = originalItem.gstRate || 18;
      const taxableAmount = grossAmount - discountAmount;

      if (gstRate === 18) {
        gstAmount = (taxableAmount * 18) / 100;
        gst18Total += gstAmount;
      } else if (gstRate === 4) {
        gstAmount = (taxableAmount * 4) / 100;
        gst4Total += gstAmount;
      }

      returnInvoiceItems.push({
        itemId: returnItem.itemId,
        boxQuantity: -returnBoxQty,
        unitQuantity: -returnUnitQty,
        quantity: -(returnBoxQty * boxPacking + returnUnitQty),
        boxRate: boxTP,
        unitRate: unitTP,
        discount,
        gstRate,
        gstAmount: -gstAmount,
        taxAmount: -gstAmount,
        lineTotal: netAmount - gstAmount,
      });
    }

    const totalGST = gst18Total + gst4Total;
    const grandTotal = subtotal + totalGST;

    const returnInvoice = new Invoice({
      invoiceNumber: await this.generateReturnInvoiceNumber(),
      type: 'return_purchase',
      supplierId: originalInvoice.supplierId._id,
      supplierName: originalInvoice.supplierId.name,
      supplierTown: originalInvoice.supplierId.town,
      supplierBillNo: `${originalInvoice.supplierBillNo}-RET`,
      originalInvoiceId,
      invoiceDate: new Date(),
      dueDate: new Date(),
      items: returnInvoiceItems,
      totals: {
        subtotal,
        totalDiscount,
        totalTax: -totalGST,
        gst18Total: -gst18Total,
        gst4Total: -gst4Total,
        grandTotal,
      },
      returnMetadata: {
        returnReason,
        returnNotes,
        returnDate: new Date(),
      },
      status: 'confirmed',
      paymentStatus: 'pending',
      createdBy,
    });

    await returnInvoice.save();

    await this.processReturnInventory(returnInvoice, originalInvoice);

    await this.createReverseLedgerEntries(returnInvoice, originalInvoice);

    const debitNote = this.generateDebitNote(returnInvoice);

    return {
      returnInvoice,
      debitNote,
    };
  }

  /**
   * Generate return invoice number
   * @returns {Promise<string>} Invoice number
   */
  async generateReturnInvoiceNumber() {
    const year = new Date().getFullYear();
    const count = await Invoice.countDocuments({
      invoiceNumber: new RegExp(`^PRI${year}`),
      type: 'return_purchase',
    });
    return `PRI${year}${String(count + 1).padStart(6, '0')}`;
  }

  /**
   * Process inventory for return (reduce stock)
   * Requirement 3.4: Reduce stock from warehouse
   * @param {Object} returnInvoice - Return invoice
   * @param {Object} originalInvoice - Original invoice
   */
  async processReturnInventory(returnInvoice, originalInvoice) {
    for (const item of returnInvoice.items) {
      const quantity = Math.abs(item.quantity);

      await inventoryService.adjustInventory(
        item.itemId,
        quantity,
        'decrease',
        'Purchase return',
      );

      await stockMovementRepository.create({
        itemId: item.itemId,
        movementType: 'return_to_supplier',
        quantity: -quantity,
        referenceType: 'return_purchase',
        referenceId: returnInvoice._id,
        warehouse: item.warehouseId || originalInvoice.items.find((i) => i.itemId.toString() === item.itemId.toString())?.warehouseId,
        batchInfo: item.batchInfo,
        movementDate: returnInvoice.invoiceDate,
        notes: `Return to supplier - ${returnInvoice.returnMetadata?.returnNotes || 'Purchase return'}`,
        createdBy: returnInvoice.createdBy,
      });
    }
  }

  /**
   * Create reverse ledger entries for purchase return
   * Requirement 3.8: Create reverse ledger entries
   * @param {Object} returnInvoice - Return invoice
   * @param {Object} originalInvoice - Original invoice
   */
  async createReverseLedgerEntries(returnInvoice, originalInvoice) {
    const amount = Math.abs(returnInvoice.totals.grandTotal);
    const gstAmount = Math.abs(returnInvoice.totals.totalTax || 0);
    const subtotal = Math.abs(returnInvoice.totals.subtotal);

    await ledgerService.createLedgerEntry({
      accountId: 'INVENTORY_ACCOUNT',
      date: returnInvoice.invoiceDate,
      description: `Purchase Return - Invoice ${returnInvoice.invoiceNumber}`,
      debit: 0,
      credit: subtotal,
      referenceType: 'Invoice',
      referenceId: returnInvoice._id,
      createdBy: returnInvoice.createdBy,
    });

    await ledgerService.createLedgerEntry({
      accountId: originalInvoice.supplierId._id,
      date: returnInvoice.invoiceDate,
      description: `Purchase Return - Invoice ${returnInvoice.invoiceNumber}`,
      debit: amount,
      credit: 0,
      referenceType: 'Invoice',
      referenceId: returnInvoice._id,
      createdBy: returnInvoice.createdBy,
    });

    if (gstAmount > 0) {
      await ledgerService.createLedgerEntry({
        accountId: 'GST_INPUT_ACCOUNT',
        date: returnInvoice.invoiceDate,
        description: `Purchase Return GST - Invoice ${returnInvoice.invoiceNumber}`,
        debit: 0,
        credit: gstAmount,
        referenceType: 'Invoice',
        referenceId: returnInvoice._id,
        createdBy: returnInvoice.createdBy,
      });
    }
  }

  /**
   * Cancel purchase return and reverse inventory
   * @param {string} returnInvoiceId - Return invoice ID
   * @param {string} userId - User ID
   * @param {string} reason - Cancellation reason
   * @returns {Promise<Object>} Cancelled invoice
   */
  async cancelPurchaseReturn(returnInvoiceId, userId, reason) {
    const returnInvoice = await Invoice.findById(returnInvoiceId);

    if (!returnInvoice) {
      throw new Error('Return invoice not found');
    }

    if (returnInvoice.type !== 'return_purchase') {
      throw new Error('Not a purchase return invoice');
    }

    if (returnInvoice.status === 'cancelled') {
      throw new Error('Return invoice is already cancelled');
    }

    for (const item of returnInvoice.items) {
      const quantity = Math.abs(item.quantity);

      await inventoryService.adjustInventory(
        item.itemId,
        quantity,
        'add',
        'Return cancellation',
      );

      await stockMovementRepository.create({
        itemId: item.itemId,
        movementType: 'return_cancelled',
        quantity,
        referenceType: 'return_purchase',
        referenceId: returnInvoice._id,
        movementDate: new Date(),
        notes: `Return cancelled: ${reason}`,
        createdBy: userId,
      });
    }

    return await Invoice.findByIdAndUpdate(
      returnInvoiceId,
      {
        status: 'cancelled',
        cancelledAt: new Date(),
        cancelledBy: userId,
        cancellationReason: reason,
      },
      { new: true },
    );
  }
}

module.exports = new PurchaseReturnService();
