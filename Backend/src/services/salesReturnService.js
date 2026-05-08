const Invoice = require('../models/Invoice');
const Customer = require('../models/Customer');
const Item = require('../models/Item');
const StockMovement = require('../models/StockMovement');
const LedgerEntry = require('../models/LedgerEntry');
const batchService = require('./batchService');
const inventoryService = require('./inventoryService');
const { applyReturnCreditToInvoice } = require('./invoicePaymentAllocationService');
const AppError = require('../utils/appError');

const getInvoiceItemQuantity = (item) => Math.abs(
  item.totalUnitQty
  || item.quantity
  || ((item.boxQuantity || 0) + (item.unitQuantity || 0))
  || 0,
);

const getInvoiceItemBatchNumber = (item) => (
  item.batchInfo?.batchNumber
  || item.batchNumber
  || null
);

const getInvoiceItemExpiryDate = (item) => (
  item.batchInfo?.expiryDate
  || item.expiryDate
  || null
);

/**
 * Sales Return Service
 * Handles sales return processing, credit notes, and reversals
 * Requirements: 2.1-2.10
 */
class SalesReturnService {
  /**
   * Create a sales return invoice
   * @param {string} originalInvoiceId - Original sales invoice ID
   * @param {Object} returnData - Return data including items and reason
   * @param {string} userId - User creating the return
   * @returns {Promise<Object>} Created return invoice
   */
  async createReturn(originalInvoiceId, returnData, userId) {
    const { returnItems, returnReason, returnNotes } = returnData;

    // Validate required fields
    if (!originalInvoiceId || !returnItems || returnItems.length === 0) {
      throw new AppError('Original invoice and return items are required', 400);
    }

    // Get original invoice
    const originalInvoice = await Invoice.findById(originalInvoiceId)
      .populate('customerId', 'name code town currentBalance creditLimit')
      .populate('salesmanId', 'name code')
      .populate('items.itemId', 'name code company packing');

    if (!originalInvoice) {
      throw new AppError('Original invoice not found', 404);
    }

    // Validate original invoice is a sales invoice and confirmed
    if (originalInvoice.type !== 'sales') {
      throw new AppError('Can only create returns for sales invoices', 400);
    }

    if (originalInvoice.status !== 'confirmed') {
      throw new AppError('Can only create returns for confirmed invoices', 400);
    }

    // Validate return items against original invoice
    await this.validateReturn(originalInvoice, returnItems);

    // Generate return invoice number
    const returnInvoiceNumber = await this.generateReturnInvoiceNumber();

    // Process return items with negative quantities
    const processedReturnItems = this.processReturnItems(originalInvoice, returnItems);

    // Calculate return totals (negative amounts)
    const returnTotals = this.calculateReturnTotals(processedReturnItems);

    // Create return invoice
    const returnInvoice = await Invoice.create({
      invoiceNumber: returnInvoiceNumber,
      type: 'return_sales',
      salesType: 'return',
      invoiceDate: new Date(),
      dueDate: new Date(), // Return invoices are immediate
      customerId: originalInvoice.customerId._id,
      customerName: originalInvoice.customerId.name,
      customerTown: originalInvoice.customerId.town,
      salesmanId: originalInvoice.salesmanId?._id,
      dimensionId: originalInvoice.dimensionId,
      originalInvoiceId,
      returnMetadata: {
        returnReason: returnReason || 'other',
        returnNotes: returnNotes || '',
        returnDate: new Date(),
      },
      advanceTaxRate: originalInvoice.advanceTaxRate,
      taxInvoiceType: originalInvoice.taxInvoiceType,
      claimAccountId: originalInvoice.claimAccountId,
      items: processedReturnItems,
      totals: returnTotals,
      previousBalance: originalInvoice.customerId.currentBalance || 0,
      totalBalance: (originalInvoice.customerId.currentBalance || 0) + returnTotals.netBillTotal,
      creditLimitExceeded: false,
      paymentStatus: 'pending',
      status: 'draft',
      detailNote: `Return for Invoice ${originalInvoice.invoiceNumber}`,
      createdBy: userId,
    });

    return this.getReturnInvoiceById(returnInvoice._id);
  }

  /**
   * Validate return items against original invoice
   * @param {Object} originalInvoice - Original sales invoice
   * @param {Array} returnItems - Items to be returned
   * @returns {Promise<void>}
   */
  async validateReturn(originalInvoice, returnItems) {
    const errors = [];

    for (const returnItem of returnItems) {
      const { itemId, returnQuantity, batchNumber } = returnItem;

      // Find the item in original invoice
      const originalItem = originalInvoice.items.find(
        (item) => item.itemId._id.toString() === itemId.toString(),
      );

      if (!originalItem) {
        errors.push(`Item ${itemId} was not in the original invoice`);
        continue;
      }

      // Validate return quantity doesn't exceed original quantity
      const originalTotalQty = getInvoiceItemQuantity(originalItem);
      if (returnQuantity > originalTotalQty) {
        errors.push(
          `Return quantity (${returnQuantity}) exceeds original quantity (${originalTotalQty}) for ${originalItem.itemName}`,
        );
      }

      // Validate batch number matches if specified
      const originalBatchNumber = getInvoiceItemBatchNumber(originalItem);
      if (batchNumber && originalBatchNumber && batchNumber !== originalBatchNumber) {
        errors.push(
          `Batch number ${batchNumber} doesn't match original batch ${originalBatchNumber} for ${originalItem.itemName}`,
        );
      }

      // Validate return quantity is positive
      if (returnQuantity <= 0) {
        errors.push(`Return quantity must be greater than 0 for ${originalItem.itemName}`);
      }
    }

    if (errors.length > 0) {
      throw new AppError(`Return validation failed:\n${errors.join('\n')}`, 400);
    }
  }

  /**
   * Process return items with negative quantities
   * @param {Object} originalInvoice - Original sales invoice
   * @param {Array} returnItems - Items to be returned
   * @returns {Array} Processed return items with negative quantities
   */
  processReturnItems(originalInvoice, returnItems) {
    const processedItems = [];

    for (const returnItem of returnItems) {
      const { itemId, returnQuantity, batchNumber } = returnItem;

      // Find the original item
      const originalItem = originalInvoice.items.find(
        (item) => item.itemId._id.toString() === itemId.toString(),
      );

      if (!originalItem) {
        continue; // Should have been caught in validation
      }

      // Calculate proportional amounts based on return quantity
      const originalTotalQty = getInvoiceItemQuantity(originalItem);
      const returnRatio = originalTotalQty ? (returnQuantity / originalTotalQty) : 1;
      const returnBatchNumber = batchNumber || getInvoiceItemBatchNumber(originalItem);
      const returnExpiryDate = getInvoiceItemExpiryDate(originalItem);

      // Calculate return amounts (negative) — default every field to 0 to avoid NaN
      const returnBoxQty = Math.floor(returnQuantity / (originalItem.itemId.packSize || 1));
      const returnUnitQty = returnQuantity % (originalItem.itemId.packSize || 1);

      const unitPrice = originalItem.unitPrice || 0;
      const lineAmount = returnQuantity * unitPrice;
      const totalAmountBeforeDiscount = -((originalItem.totalAmountBeforeDiscount || lineAmount) * returnRatio);
      const discount1Amount = -((originalItem.discount1Amount || 0) * returnRatio);
      const discount2Amount = -((originalItem.discount2Amount || 0) * returnRatio);
      const gstTotal = -((originalItem.gstTotal || originalItem.gstAmount || originalItem.taxAmount || 0) * returnRatio);
      const advanceTaxAmount = -((originalItem.advanceTaxAmount || 0) * returnRatio);
      const netAmount = -((originalItem.netAmount || originalItem.lineTotal || lineAmount) * returnRatio);

      processedItems.push({
        itemId: originalItem.itemId._id,
        itemName: originalItem.itemName,
        itemCode: originalItem.itemCode,
        companyName: originalItem.companyName,
        warehouseId: originalItem.warehouseId,
        batchInfo: returnBatchNumber ? {
          batchNumber: returnBatchNumber,
          expiryDate: returnExpiryDate,
        } : undefined,
        // Negative quantities for return
        boxQuantity: -returnBoxQty,
        unitQuantity: -returnUnitQty,
        // Standard Invoice model fields (negative)
        quantity: -returnQuantity,
        unitPrice,
        discount: originalItem.discount1Percent || originalItem.discount || 0,
        taxAmount: gstTotal + advanceTaxAmount,
        lineTotal: netAmount,
        // Detailed calculations (negative)
        totalAmountBeforeDiscount,
        discount1Percent: originalItem.discount1Percent || 0,
        discount1Amount,
        discount2Percent: originalItem.discount2Percent || 0,
        discount2Amount,
        gstAmount: gstTotal,
        gstRate: originalItem.gstRate || 18,
        advanceTaxAmount,
        boxRate: originalItem.boxRate || originalItem.boxTP || 0,
        unitRate: originalItem.unitRate || originalItem.unitTP || 0,
      });
    }

    return processedItems;
  }

  /**
   * Calculate return totals (negative amounts)
   * @param {Array} returnItems - Processed return items
   * @returns {Object} Return totals
   */
  calculateReturnTotals(returnItems) {
    let grossTotal = 0;
    let discountTotal = 0;
    let gstTotal = 0;
    let advanceTaxTotal = 0;

    returnItems.forEach((item) => {
      grossTotal += item.totalAmountBeforeDiscount || 0;
      discountTotal += (item.discount1Amount || 0) + (item.discount2Amount || 0);
      gstTotal += item.gstAmount || 0;
      advanceTaxTotal += item.advanceTaxAmount || 0;
    });

    // All amounts are negative for returns
    const netBillTotal = grossTotal - discountTotal + gstTotal + advanceTaxTotal;

    return {
      subtotal: Math.round(grossTotal * 100) / 100,
      grossTotal: Math.round(grossTotal * 100) / 100,
      totalDiscount: Math.round(discountTotal * 100) / 100,
      discountTotal: Math.round(discountTotal * 100) / 100,
      discountPercentOverall: 0,
      discountAmountOverall: 0,
      totalTax: Math.round((gstTotal + advanceTaxTotal) * 100) / 100,
      gstTotal: Math.round(gstTotal * 100) / 100,
      advanceTaxTotal: Math.round(advanceTaxTotal * 100) / 100,
      nonFilerGst: 0, // Not applicable to returns
      grandTotal: Math.round(netBillTotal * 100) / 100,
      netBillTotal: Math.round(netBillTotal * 100) / 100,
    };
  }

  /**
   * Process return invoice - restore stock and reverse ledger entries
   * @param {string} returnInvoiceId - Return invoice ID
   * @param {string} userId - User processing the return
   * @returns {Promise<Object>} Processed return invoice
   */
  async processReturn(returnInvoiceId, userId) {
    const returnInvoice = await this.getReturnInvoiceById(returnInvoiceId);

    // Only draft return invoices can be processed
    if (returnInvoice.status !== 'draft') {
      throw new AppError('Only draft return invoices can be processed', 400);
    }

    // Start a session for transaction
    const session = await Invoice.startSession();
    session.startTransaction();

    try {
      // 1. Restore stock to original warehouse
      for (const item of returnInvoice.items) {
        const returnQuantity = getInvoiceItemQuantity(item);
        const batchNumber = getInvoiceItemBatchNumber(item);
        const expiryDate = getInvoiceItemExpiryDate(item);

        if (!returnQuantity) {
          throw new Error(`Return item ${item.itemId} has no quantity to restore`);
        }

        // Create stock movement (in) to restore stock
        await StockMovement.create([{
          itemId: item.itemId,
          warehouse: item.warehouseId,
          movementType: 'in',
          quantity: returnQuantity,
          referenceType: 'sales_return',
          referenceId: returnInvoice._id,
          batchInfo: batchNumber ? {
            batchNumber,
            expiryDate,
          } : undefined,
          movementDate: returnInvoice.invoiceDate,
          notes: `Sales Return ${returnInvoice.invoiceNumber} (Original: ${returnInvoice.originalInvoiceId})`,
          createdBy: userId,
        }], { session });

        // 2. Update item stock levels in warehouse
        const Inventory = require('../models/Inventory');
        await Inventory.findOneAndUpdate(
          { item: item.itemId, warehouse: item.warehouseId },
          {
            $inc: {
              quantity: returnQuantity,
              available: returnQuantity // Keep stored available field in sync
            }
          },
          { session, upsert: true, setDefaultsOnInsert: true },
        );

        // 3. Restore batch quantities if batch tracking is used
        if (batchNumber) {
          await batchService.returnToBatch(batchNumber, returnQuantity, { session });
        }
      }

      // 4. Reduce customer balance (credit the customer)
      const creditAmount = Math.abs(returnInvoice.totals.netBillTotal);
      await Customer.findByIdAndUpdate(
        returnInvoice.customerId,
        { $inc: { currentBalance: -creditAmount } },
        { session },
      );

      // 5. Create reverse ledger entries
      await this.createReverseLedgerEntries(returnInvoice, userId, session);

      // 5.5. Update original invoice payment state with return credit
      await applyReturnCreditToInvoice(returnInvoice, { session });

      // 6. Update return invoice status to confirmed
      const processedInvoice = await Invoice.findByIdAndUpdate(
        returnInvoiceId,
        {
          status: 'confirmed',
          confirmedAt: new Date(),
          confirmedBy: userId,
        },
        { new: true, session },
      );

      // Commit the transaction
      await session.commitTransaction();
      session.endSession();

      // Sync Item.inventory.currentStock for all returned items
      const returnedItemIds = [...new Set(returnInvoice.items.map(i => i.itemId.toString()))];
      await Promise.all(returnedItemIds.map(id => inventoryService.syncItemCurrentStock(id)));

      return this.getReturnInvoiceById(processedInvoice._id);
    } catch (error) {
      // Rollback the transaction on error
      await session.abortTransaction();
      session.endSession();
      throw new AppError(`Failed to process return: ${error.message}`, 500);
    }
  }

  /**
   * Create reverse ledger entries for return
   * @param {Object} returnInvoice - Return invoice
   * @param {string} userId - User ID
   * @param {Object} session - MongoDB session for transaction
   * @returns {Promise<void>}
   */
  async createReverseLedgerEntries(returnInvoice, userId, session) {
    const creditAmount = Math.abs(returnInvoice.totals.netBillTotal);
    const grossAmount = Math.abs(returnInvoice.totals.grossTotal - returnInvoice.totals.discountTotal);
    const gstAmount = Math.abs(returnInvoice.totals.gstTotal);
    const advanceTaxAmount = Math.abs(returnInvoice.totals.advanceTaxTotal);
    const discountAmount = Math.abs(returnInvoice.totals.discountTotal);

    // Credit Customer Account (reverse the debit from original sale)
    await LedgerEntry.create([{
      accountId: returnInvoice.customerId,
      accountType: 'Customer',
      entryType: 'credit',
      amount: creditAmount,
      description: `Sales Return ${returnInvoice.invoiceNumber} (Original: ${returnInvoice.originalInvoiceId})`,
      referenceType: 'sales_return',
      referenceId: returnInvoice._id,
      transactionDate: returnInvoice.invoiceDate,
      createdBy: userId,
    }], { session });

    // Debit Sales Account (reverse the credit from original sale)
    await LedgerEntry.create([{
      accountType: 'Sales',
      entryType: 'debit',
      amount: grossAmount,
      description: `Sales Return ${returnInvoice.invoiceNumber} - Sales Revenue Reversal`,
      referenceType: 'sales_return',
      referenceId: returnInvoice._id,
      transactionDate: returnInvoice.invoiceDate,
      createdBy: userId,
    }], { session });

    // Debit GST Account (reverse the credit from original sale)
    if (gstAmount > 0) {
      await LedgerEntry.create([{
        accountType: 'GST_Payable',
        entryType: 'debit',
        amount: gstAmount,
        description: `Sales Return ${returnInvoice.invoiceNumber} - GST Reversal`,
        referenceType: 'sales_return',
        referenceId: returnInvoice._id,
        transactionDate: returnInvoice.invoiceDate,
        createdBy: userId,
      }], { session });
    }

    // Debit Advance Tax Account (reverse the credit from original sale)
    if (advanceTaxAmount > 0) {
      await LedgerEntry.create([{
        accountType: 'Advance_Tax_Payable',
        entryType: 'debit',
        amount: advanceTaxAmount,
        description: `Sales Return ${returnInvoice.invoiceNumber} - Advance Tax Reversal`,
        referenceType: 'sales_return',
        referenceId: returnInvoice._id,
        transactionDate: returnInvoice.invoiceDate,
        createdBy: userId,
      }], { session });
    }

    // If claim account was used, credit claim account (reverse the debit from original sale)
    if (returnInvoice.claimAccountId && discountAmount > 0) {
      await LedgerEntry.create([{
        accountId: returnInvoice.claimAccountId,
        accountType: 'Claim_Account',
        entryType: 'credit',
        amount: discountAmount,
        description: `Sales Return ${returnInvoice.invoiceNumber} - Scheme Discount Reversal`,
        referenceType: 'sales_return',
        referenceId: returnInvoice._id,
        transactionDate: returnInvoice.invoiceDate,
        createdBy: userId,
      }], { session });
    }
  }

  /**
   * Generate credit note for return invoice
   * @param {string} returnInvoiceId - Return invoice ID
   * @returns {Promise<Object>} Credit note data
   */
  async generateCreditNote(returnInvoiceId) {
    const returnInvoice = await this.getReturnInvoiceById(returnInvoiceId);

    // Only confirmed return invoices can have credit notes
    if (returnInvoice.status !== 'confirmed') {
      throw new AppError('Only confirmed return invoices can have credit notes', 400);
    }

    // Get original invoice
    const originalInvoice = await Invoice.findById(returnInvoice.originalInvoiceId)
      .populate('customerId', 'name code town address phone');

    const creditAmount = Math.abs(returnInvoice.totals.netBillTotal);

    const creditNote = {
      creditNoteNumber: `CN${returnInvoice.invoiceNumber.substring(2)}`, // CN + invoice number without SI
      creditNoteDate: returnInvoice.invoiceDate,
      returnInvoiceId: returnInvoice._id,
      returnInvoiceNumber: returnInvoice.invoiceNumber,
      originalInvoiceId: originalInvoice._id,
      originalInvoiceNumber: originalInvoice.invoiceNumber,
      originalInvoiceDate: originalInvoice.invoiceDate,
      customer: {
        id: returnInvoice.customerId._id,
        name: returnInvoice.customerId.name,
        code: returnInvoice.customerId.code,
        town: returnInvoice.customerId.town,
        address: returnInvoice.customerId.address,
        phone: returnInvoice.customerId.phone,
      },
      returnReason: returnInvoice.returnMetadata?.returnReason || 'other',
      returnNotes: returnInvoice.returnMetadata?.returnNotes || '',
      items: returnInvoice.items.map((item) => ({
        itemName: item.itemName,
        itemCode: item.itemCode,
        companyName: item.companyName,
        returnQuantity: Math.abs(item.totalUnitQty),
        unitPrice: item.unitPrice,
        amount: Math.abs(item.totalAmountBeforeDiscount),
        discount: Math.abs(item.discount1Amount + item.discount2Amount),
        gst: Math.abs(item.gstTotal),
        advanceTax: Math.abs(item.advanceTaxAmount),
        netAmount: Math.abs(item.netAmount),
      })),
      totals: {
        grossTotal: Math.abs(returnInvoice.totals.grossTotal),
        discountTotal: Math.abs(returnInvoice.totals.discountTotal),
        gstTotal: Math.abs(returnInvoice.totals.gstTotal),
        advanceTaxTotal: Math.abs(returnInvoice.totals.advanceTaxTotal),
        creditAmount,
      },
      notes: `Credit note issued for return of goods from Invoice ${originalInvoice.invoiceNumber}`,
      generatedAt: new Date(),
    };

    return creditNote;
  }

  /**
   * Generate return invoice number
   * Format: SR2025000001 (SR + Year + 6-digit sequence)
   * @returns {Promise<string>} Generated return invoice number
   */
  async generateReturnInvoiceNumber() {
    const year = new Date().getFullYear();
    const prefix = `SR${year}`;

    // Find the last return invoice number for this year
    const lastReturn = await Invoice.findOne({
      invoiceNumber: { $regex: `^${prefix}` },
      type: 'return_sales',
    })
      .sort({ invoiceNumber: -1 })
      .limit(1);

    let sequence = 1;
    if (lastReturn && lastReturn.invoiceNumber) {
      const lastSequence = parseInt(lastReturn.invoiceNumber.substring(prefix.length));
      sequence = lastSequence + 1;
    }

    return `${prefix}${String(sequence).padStart(6, '0')}`;
  }

  /**
   * Get return invoice by ID with populated references
   * @param {string} id - Return invoice ID
   * @returns {Promise<Object>} Return invoice
   */
  async getReturnInvoiceById(id) {
    const invoice = await Invoice.findById(id)
      .populate('customerId', 'name code town creditLimit currentBalance address phone')
      .populate('salesmanId', 'name code')
      .populate('claimAccountId', 'name code')
      .populate('dimensionId', 'name code')
      .populate('originalInvoiceId', 'invoiceNumber invoiceDate')
      .populate('items.itemId', 'name code company packing')
      .populate('items.warehouseId', 'name code')
      .populate('createdBy', 'name email')
      .populate('confirmedBy', 'name email')
      .exec();

    if (!invoice) {
      throw new AppError('Return invoice not found', 404);
    }

    return invoice;
  }

  /**
   * Get all returns for an original invoice
   * @param {string} originalInvoiceId - Original invoice ID
   * @returns {Promise<Array>} Return invoices
   */
  async getReturnsForInvoice(originalInvoiceId) {
    const returns = await Invoice.find({
      originalInvoiceId,
      type: 'return_sales',
    })
      .populate('customerId', 'name code town')
      .populate('createdBy', 'name email')
      .populate('confirmedBy', 'name email')
      .sort({ invoiceDate: -1 });

    return returns;
  }

  /**
   * Get return statistics for an invoice
   * @param {string} originalInvoiceId - Original invoice ID
   * @returns {Promise<Object>} Return statistics
   */
  async getReturnStatistics(originalInvoiceId) {
    const returns = await this.getReturnsForInvoice(originalInvoiceId);

    const totalReturns = returns.length;
    const totalReturnAmount = returns.reduce(
      (sum, ret) => sum + Math.abs(ret.totals.netBillTotal),
      0,
    );

    const confirmedReturns = returns.filter((ret) => ret.status === 'confirmed').length;
    const draftReturns = returns.filter((ret) => ret.status === 'draft').length;

    return {
      totalReturns,
      confirmedReturns,
      draftReturns,
      totalReturnAmount: Math.round(totalReturnAmount * 100) / 100,
    };
  }
}

module.exports = new SalesReturnService();
