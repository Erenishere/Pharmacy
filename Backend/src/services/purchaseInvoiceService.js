const invoiceRepository = require('../repositories/invoiceRepository');
const supplierService = require('./supplierService');
const itemService = require('./itemService');
const taxService = require('./taxService');
const stockMovementRepository = require('../repositories/stockMovementRepository');
const ledgerService = require('./ledgerService');
const accountService = require('./accountService');
const discountCalculationService = require('./discountCalculationService');
const batchCreationService = require('./batchCreationService');
const eventPublisherService = require('./eventPublisherService');
const inventoryService = require('./inventoryService');
const { executeTransactionalOperation } = require('../utils/transactionUtils');
const Item = require('../models/Item');
const PurchaseOrder = require('../models/PurchaseOrder');
const LedgerEntry = require('../models/LedgerEntry');

const getObjectId = (value) => value?._id || value;

/**
 * Purchase Invoice Service
 * Handles business logic for purchase invoice management
 */
class PurchaseInvoiceService {
  /**
   * Create a new purchase invoice with automatic calculations
   * @param {Object} invoiceData - Invoice data
   * @param {string} invoiceData.supplierId - Supplier ID
   * @param {Date} invoiceData.invoiceDate - Invoice date
   * @param {Date} invoiceData.dueDate - Due date
   * @param {Array} invoiceData.items - Invoice items
   * @param {string} invoiceData.createdBy - User ID who created the invoice
   * @param {string} invoiceData.notes - Optional notes
   * @returns {Promise<Object>} Created invoice
   */
  async createPurchaseInvoice(invoiceData) {
    const {
      supplierId, items, createdBy, invoiceDate, dueDate, notes, poId, poNumber, supplierBillNo,
    } = invoiceData;

    // Validate required fields
    if (!supplierId) {
      throw new Error('Supplier ID is required');
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new Error('At least one item is required');
    }
    if (!createdBy) {
      throw new Error('Created by user ID is required');
    }

    // Validate supplier exists and is active
    const supplier = await supplierService.getSupplierById(supplierId);
    if (!supplier.isActive) {
      throw new Error('Supplier is not active');
    }

    // Validate supplier type
    if (supplier.type !== 'supplier' && supplier.type !== 'both') {
      throw new Error('Selected entity is not a supplier');
    }

    // Validate and calculate items
    const processedItems = await this.processInvoiceItems(items);

    // Calculate totals
    const totals = this.calculateInvoiceTotals(processedItems);

    // Generate invoice number
    const invoiceNumber = await invoiceRepository.generateInvoiceNumber('purchase');

    // Prepare invoice data
    const invoice = {
      invoiceNumber,
      type: 'purchase',
      supplierId,

      invoiceDate: invoiceDate || new Date(),
      dueDate: dueDate || this.calculateDueDate(supplier.financialInfo.paymentTerms),
      supplierBillNo,
      items: processedItems,
      totals,
      status: 'draft',
      paymentStatus: 'pending',
      notes: notes || '',
      poId,
      poNumber,
      createdBy,
    };

    // Create invoice
    return invoiceRepository.create(invoice);
  }

  /**
   * Process and validate invoice items with tax calculations
   * @param {Array} items - Array of invoice items
   * @returns {Promise<Array>} Processed items with calculations
   */
  async processInvoiceItems(items) {
    const processedItems = [];

    for (const item of items) {
      const {
        itemId,
        quantity,
        unitPrice,
        discount = 0, // Legacy single discount support
        discount1Percent = 0,
        discount2Percent = 0,
        claimAccountId,
        batchInfo,
        warehouseId,
      } = item;

      // Validate item
      if (!itemId) {
        throw new Error('Item ID is required for all items');
      }
      if (!quantity || quantity <= 0) {
        throw new Error(`Invalid quantity for item ${itemId}`);
      }
      if (unitPrice === undefined || unitPrice < 0) {
        throw new Error(`Invalid unit price for item ${itemId}`);
      }

      // Handle legacy single discount or new multi-level discounts
      let finalDiscount1Percent = discount1Percent;
      const finalDiscount2Percent = discount2Percent;
      const finalClaimAccountId = claimAccountId;

      if (discount > 0 && discount1Percent === 0 && discount2Percent === 0) {
        // Legacy single discount - treat as discount1
        finalDiscount1Percent = discount;
      }

      // Validate discount percentages
      if (finalDiscount1Percent < 0 || finalDiscount1Percent > 100) {
        throw new Error(`Discount 1 must be between 0 and 100 for item ${itemId}`);
      }
      if (finalDiscount2Percent < 0 || finalDiscount2Percent > 100) {
        throw new Error(`Discount 2 must be between 0 and 100 for item ${itemId}`);
      }

      // Get item details
      const itemDetails = await itemService.getItemById(itemId);
      if (!itemDetails.isActive) {
        throw new Error(`Item ${itemDetails.name} is not active`);
      }

      // Validate batch info for purchase invoices
      if (batchInfo) {
        if (batchInfo.expiryDate && batchInfo.manufacturingDate) {
          const mfgDate = new Date(batchInfo.manufacturingDate);
          const expDate = new Date(batchInfo.expiryDate);
          if (expDate <= mfgDate) {
            throw new Error(`Expiry date must be after manufacturing date for item ${itemDetails.name}`);
          }
        }
      }

      // Calculate line subtotal
      const lineSubtotal = quantity * unitPrice;

      // Apply multi-level discounts using discount calculation service
      let discountResult;
      if (finalDiscount2Percent > 0) {
        // Apply discounts with claim account validation
        discountResult = await discountCalculationService.applySequentialDiscountsWithValidation(
          lineSubtotal,
          finalDiscount1Percent,
          finalDiscount2Percent,
          finalClaimAccountId,
        );
      } else {
        // Apply only discount1
        discountResult = discountCalculationService.applySequentialDiscounts(
          lineSubtotal,
          finalDiscount1Percent,
          0,
        );
      }

      // Calculate tax on amount after discounts
      const taxableAmount = discountResult.finalAmount;
      const taxAmount = await this.calculateItemTax(itemDetails, taxableAmount);

      // Calculate line total
      const lineTotal = taxableAmount + taxAmount;

      processedItems.push({
        itemId,
        quantity,
        unitPrice,
        // Legacy discount support
        discount: finalDiscount1Percent,
        // Multi-level discount details
        discount1Percent: finalDiscount1Percent,
        discount1Amount: discountResult.discount1.amount,
        discount2Percent: finalDiscount2Percent,
        discount2Amount: discountResult.discount2.amount,
        claimAccountId: finalClaimAccountId,
        // Totals
        lineSubtotal,
        totalDiscountAmount: discountResult.totalDiscount.amount,
        taxableAmount,
        taxAmount,
        lineTotal,
        batchInfo: batchInfo || {},
        // Include claim account details if available
        claimAccount: discountResult.claimAccount || null,
        warehouseId,
      });
    }

    return processedItems;
  }

  /**
   * Calculate tax for an invoice item
   * @param {Object} item - Item details
   * @param {number} taxableAmount - Amount to calculate tax on
   * @returns {Promise<number>} Tax amount
   */
  async calculateItemTax(item, taxableAmount) {
    try {
      // Get tax rates from item
      const gstRate = item.tax.gstRate || 0;
      const whtRate = item.tax.whtRate || 0;

      // Calculate GST
      const gstAmount = (taxableAmount * gstRate) / 100;

      // Calculate WHT (usually deducted from supplier payment)
      const whtAmount = (taxableAmount * whtRate) / 100;

      // For purchase invoices, typically GST is added and WHT is tracked separately
      return gstAmount;
    } catch (error) {
      console.error('Tax calculation error:', error);
      return 0;
    }
  }

  /**
   * Calculate invoice totals with multi-level discounts
   * @param {Array} items - Processed invoice items
   * @returns {Object} Invoice totals
   */
  calculateInvoiceTotals(items) {
    let subtotal = 0;
    let totalDiscount1 = 0;
    let totalDiscount2 = 0;
    let totalTax = 0;

    items.forEach((item) => {
      // Use lineSubtotal if available, otherwise calculate
      const itemSubtotal = item.lineSubtotal || (item.quantity * item.unitPrice);
      subtotal += itemSubtotal;

      // Use calculated discount amounts from discount service
      if (item.discount1Amount !== undefined) {
        totalDiscount1 += item.discount1Amount;
      }
      if (item.discount2Amount !== undefined) {
        totalDiscount2 += item.discount2Amount;
      }

      totalTax += item.taxAmount || 0;
    });

    const totalDiscount = totalDiscount1 + totalDiscount2;
    const taxableAmount = subtotal - totalDiscount;
    const grandTotal = taxableAmount + totalTax;

    return {
      subtotal,
      totalDiscount,
      totalDiscount1,
      totalDiscount2,
      taxableAmount,
      totalTax,
      grandTotal,
    };
  }

  /**
   * Calculate due date based on payment terms
   * @param {number} paymentTerms - Payment terms in days
   * @returns {Date} Due date
   */
  calculateDueDate(paymentTerms = 30) {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + paymentTerms);
    return dueDate;
  }

  /**
   * Calculate dual GST for purchase invoice items
   * Requirement 1.20-1.24: Dual GST rate support (18% and 4%)
   * @param {Array} items - Invoice items
   * @param {Object} supplier - Supplier object
   * @returns {Object} GST calculation result
   */
  calculateDualGST(items, supplier) {
    const gst18Total = items
      .filter((item) => (item.gstRate || 18) === 18)
      .reduce((sum, item) => {
        const taxableAmount = this.calculateItemTaxableAmount(item);
        return sum + (taxableAmount * 18) / 100;
      }, 0);

    const gst4Total = items
      .filter((item) => item.gstRate === 4)
      .reduce((sum, item) => {
        const taxableAmount = this.calculateItemTaxableAmount(item);
        return sum + (taxableAmount * 4) / 100;
      }, 0);

    const totalGST = gst18Total + gst4Total;

    return {
      gst18Total: Math.round(gst18Total * 100) / 100,
      gst4Total: Math.round(gst4Total * 100) / 100,
      totalGST: Math.round(totalGST * 100) / 100,
    };
  }

  /**
   * Calculate item taxable amount after discounts
   * @param {Object} item - Invoice item
   * @returns {number} Taxable amount
   */
  calculateItemTaxableAmount(item) {
    const boxPacking = item.boxPacking || 1;
    const boxQty = item.boxQuantity || item.boxQty || 0;
    const unitQty = item.unitQuantity || item.unitQty || 0;
    const boxTP = item.boxRate || item.boxTP || 0;
    const unitTP = item.unitRate || item.unitTP || 0;
    const discount = item.discount1Percent || item.discount || 0;

    const boxAmount = boxQty * boxTP;
    const unitAmount = unitQty * unitTP;
    const grossAmount = boxAmount + unitAmount;
    const discountAmount = (grossAmount * discount) / 100;

    return grossAmount - discountAmount;
  }

  /**
   * Calculate advance tax based on supplier status
   * Requirement 1.5, 1.25: 0.5% for filers, 2.5% for non-filers
   * @param {Object} supplier - Supplier object
   * @param {number} taxableAmount - Taxable amount
   * @returns {Object} Advance tax calculation
   */
  calculateAdvanceTax(supplier, taxableAmount) {
    const isFiler = supplier?.isTaxFiler !== false;
    return taxService.calculateAdvanceTax(taxableAmount, isFiler);
  }

  /**
   * Calculate non-filer GST
   * Requirement 1.36: Non-filer GST 0.1%
   * @param {Object} supplier - Supplier object
   * @param {number} taxableAmount - Taxable amount
   * @returns {Object} Non-filer GST calculation
   */
  calculateNonFilerGST(supplier, taxableAmount) {
    const isNonFiler = supplier?.isNonFilerAccount?.() === true;
    return taxService.calculateNonFilerGST(taxableAmount, isNonFiler);
  }

  /**
   * Validate batch information for purchase invoice
   * Requirement 2.2-2.5: Batch validation
   * @param {Object} batchInfo - Batch information
   * @param {string} itemName - Item name for error messages
   * @returns {Object} Validation result
   */
  validateBatchInfo(batchInfo, itemName) {
    if (!batchInfo || !batchInfo.batchNumber) {
      return { isValid: true };
    }

    const errors = [];

    if (!batchInfo.manufacturingDate) {
      errors.push(`Manufacturing date is required for batch ${batchInfo.batchNumber} of ${itemName}`);
    }

    if (!batchInfo.expiryDate) {
      errors.push(`Expiry date is required for batch ${batchInfo.batchNumber} of ${itemName}`);
    }

    if (batchInfo.manufacturingDate && batchInfo.expiryDate) {
      const mfgDate = new Date(batchInfo.manufacturingDate);
      const expDate = new Date(batchInfo.expiryDate);

      if (expDate <= mfgDate) {
        errors.push(`Expiry date must be after manufacturing date for batch ${batchInfo.batchNumber} of ${itemName}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Create batches from confirmed invoice
   * Requirement 2.1, 2.7-2.10: Batch creation
   * @param {Object} invoice - Confirmed invoice
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Created batches
   */
  async createBatchesFromConfirmedInvoice(invoice, userId) {
    return await batchCreationService.createBatchesFromInvoice(invoice, userId);
  }

  /**
   * Process purchase invoice with complete calculations
   * Requirement 1.1-1.48: Complete purchase invoice processing
   * @param {Object} invoiceData - Invoice data
   * @returns {Promise<Object>} Processed invoice
   */
  async processPurchaseInvoice(invoiceData) {
    const {
      supplierId,
      items,
      invoiceDate,
      dueDate,
      creditDays,
      notes,
      createdBy,
      qualityControlNotes,
      goodsReceiptNumber,
      inspectionStatus,
    } = invoiceData;

    const supplier = await supplierService.getSupplierById(supplierId);

    const processedItems = await this.processInvoiceItems(items);

    const gstCalculation = this.calculateDualGST(processedItems, supplier);

    let advanceTaxTotal = 0;
    let nonFilerGSTTotal = 0;

    processedItems.forEach((item) => {
      const taxableAmount = this.calculateItemTaxableAmount(item);
      const advanceTax = this.calculateAdvanceTax(supplier, taxableAmount);
      const nonFilerGST = this.calculateNonFilerGST(supplier, taxableAmount);
      advanceTaxTotal += advanceTax.taxAmount;
      nonFilerGSTTotal += nonFilerGST.taxAmount;
    });

    const subtotal = processedItems.reduce((sum, item) => sum + this.calculateItemTaxableAmount(item), 0);

    const totalDiscount = processedItems.reduce((sum, item) => {
      const boxPacking = item.boxPacking || 1;
      const boxQty = item.boxQuantity || item.boxQty || 0;
      const unitQty = item.unitQuantity || item.unitQty || 0;
      const boxTP = item.boxRate || item.boxTP || 0;
      const unitTP = item.unitRate || item.unitTP || 0;
      const discount = item.discount1Percent || item.discount || 0;
      const grossAmount = boxQty * boxTP + unitQty * unitTP;
      return sum + (grossAmount * discount) / 100;
    }, 0);

    const grandTotal = subtotal
      - totalDiscount
      + gstCalculation.totalGST
      + advanceTaxTotal
      + nonFilerGSTTotal;

    const invoiceNumber = await invoiceRepository.generateInvoiceNumber('purchase');

    const invoice = {
      invoiceNumber,
      type: 'purchase',
      supplierId,
      supplierName: supplier.name,
      supplierTown: supplier.town,
      invoiceDate: invoiceDate || new Date(),
      dueDate: dueDate || this.calculateDueDate(creditDays || supplier.financialInfo?.paymentTerms || 30),
      items: processedItems,
      totals: {
        subtotal: Math.round(subtotal * 100) / 100,
        totalDiscount: Math.round(totalDiscount * 100) / 100,
        gst18Total: gstCalculation.gst18Total,
        gst4Total: gstCalculation.gst4Total,
        totalGST: gstCalculation.totalGST,
        advanceTaxTotal: Math.round(advanceTaxTotal * 100) / 100,
        nonFilerGSTTotal: Math.round(nonFilerGSTTotal * 100) / 100,
        grandTotal: Math.round(grandTotal * 100) / 100,
      },
      status: 'draft',
      paymentStatus: 'pending',
      notes: notes || '',
      qualityControlNotes: qualityControlNotes || '',
      goodsReceiptNumber: goodsReceiptNumber || '',
      inspectionStatus: inspectionStatus || 'pending',
      createdBy,
    };

    return invoice;
  }

  /**
   * Generate invoice number
   * @returns {Promise<string>} Generated invoice number
   */
  async generateInvoiceNumber() {
    return invoiceRepository.generateInvoiceNumber('purchase');
  }

  /**
   * Validate invoice number format and uniqueness
   * @param {string} invoiceNumber - Invoice number to validate
   * @returns {Promise<boolean>} Validation result
   */
  async validateInvoiceNumber(invoiceNumber) {
    if (!invoiceNumber || invoiceNumber.trim().length === 0) {
      throw new Error('Invoice number is required');
    }

    // Check format (PI + Year + 6 digits)
    const invoiceNumberRegex = /^PI\d{10}$/;
    if (!invoiceNumberRegex.test(invoiceNumber)) {
      throw new Error('Invalid invoice number format. Expected format: PI + Year + 6 digits (e.g., PI2024000001)');
    }

    // Check uniqueness
    const exists = await invoiceRepository.invoiceNumberExists(invoiceNumber);
    if (exists) {
      throw new Error(`Invoice number ${invoiceNumber} already exists`);
    }

    return true;
  }

  /**
   * Get purchase invoice by ID
   * @param {string} id - Invoice ID
   * @returns {Promise<Object>} Invoice
   */
  async getPurchaseInvoiceById(id) {
    const invoice = await invoiceRepository.findById(id);
    if (!invoice) {
      throw new Error('Purchase invoice not found');
    }
    if (invoice.type !== 'purchase') {
      throw new Error('Invoice is not a purchase invoice');
    }
    return invoice;
  }

  /**
   * Get purchase invoice by invoice number
   * @param {string} invoiceNumber - Invoice number
   * @returns {Promise<Object>} Invoice
   */
  async getPurchaseInvoiceByNumber(invoiceNumber) {
    const invoice = await invoiceRepository.findByInvoiceNumber(invoiceNumber);
    if (!invoice) {
      throw new Error('Purchase invoice not found');
    }
    if (invoice.type !== 'purchase') {
      throw new Error('Invoice is not a purchase invoice');
    }
    return invoice;
  }

  /**
   * Get all purchase invoices with filtering and pagination
   * @param {Object} filters - Filter criteria
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Paginated invoices
   */
  async getAllPurchaseInvoices(filters = {}, options = {}) {
    const {
      page = 1, limit = 10, sort, ...otherOptions
    } = options;
    const skip = (page - 1) * limit;

    // Ensure we only get purchase invoices
    const purchaseFilters = { ...filters, type: 'purchase' };

    const [invoices, total] = await Promise.all([
      invoiceRepository.search(purchaseFilters, {
        ...otherOptions, limit, skip, sort,
      }),
      invoiceRepository.count(purchaseFilters),
    ]);

    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    return {
      invoices,
      pagination: {
        totalItems: total,
        totalPages,
        currentPage: page,
        itemsPerPage: limit,
        hasNextPage,
        hasPreviousPage,
        nextPage: hasNextPage ? page + 1 : null,
        previousPage: hasPreviousPage ? page - 1 : null,
      },
    };
  }

  /**
   * Get purchase invoices by supplier
   * @param {string} supplierId - Supplier ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Invoices
   */
  async getPurchaseInvoicesBySupplier(supplierId, options = {}) {
    // Validate supplier exists
    await supplierService.getSupplierById(supplierId);

    return invoiceRepository.findBySupplier(supplierId, options);
  }

  /**
   * Update purchase invoice
   * @param {string} id - Invoice ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated invoice
   */
  async updatePurchaseInvoice(id, updateData) {
    // Get existing invoice
    const existingInvoice = await this.getPurchaseInvoiceById(id);

    // Prevent updates to confirmed or paid invoices (except payment status updates)
    if ((existingInvoice.status === 'confirmed' || existingInvoice.status === 'paid') && updateData.items) {
      const error = new Error('Cannot modify confirmed invoice items');
      error.code = 'CANNOT_MODIFY_CONFIRMED_INVOICE';
      error.statusCode = 422;
      throw error;
    }

    // If items are being updated, reprocess them
    if (updateData.items) {
      updateData.items = await this.processInvoiceItems(updateData.items);
      updateData.totals = this.calculateInvoiceTotals(updateData.items);
    }

    // Update invoice
    return invoiceRepository.update(id, updateData);
  }

  /**
   * Delete purchase invoice
   * @param {string} id - Invoice ID
   * @returns {Promise<Object>} Deleted invoice
   */
  async deletePurchaseInvoice(id) {
    const invoice = await this.getPurchaseInvoiceById(id);

    // Prevent deletion of confirmed or paid invoices
    if (invoice.status === 'confirmed' || invoice.status === 'paid') {
      throw new Error('Cannot delete confirmed or paid invoices. Cancel the invoice instead.');
    }

    return invoiceRepository.delete(id);
  }

  /**
   * Get purchase statistics
   * @param {Object} filters - Filter criteria
   * @returns {Promise<Object>} Purchase statistics
   */
  async getPurchaseStatistics(filters = {}) {
    const stats = await invoiceRepository.getStatistics('purchase');

    const result = {
      totalInvoices: 0,
      totalAmount: 0,
      paidAmount: 0,
      pendingAmount: 0,
      draftCount: 0,
      confirmedCount: 0,
      paidCount: 0,
      cancelledCount: 0,
    };

    stats.forEach((stat) => {
      const count = stat.count || 0;
      const amount = stat.totalAmount || 0;

      if (stat._id !== 'cancelled') {
        result.totalInvoices += count;
        result.totalAmount += amount;
      }

      switch (stat._id) {
        case 'draft':
          result.draftCount = count;
          result.pendingAmount += amount;
          break;
        case 'confirmed':
          result.confirmedCount = count;
          result.pendingAmount += amount;
          break;
        case 'paid':
          result.paidCount = count;
          result.paidAmount += amount;
          break;
        case 'cancelled':
          result.cancelledCount = count;
          break;
      }
    });

    return result;
  }

  /**
   * Confirm purchase invoice and update inventory
   * @param {string} id - Invoice ID
   * @param {string} userId - User ID performing the confirmation
   * @returns {Promise<Object>} Confirmed invoice with stock movements
   */
  async confirmPurchaseInvoice(id, userId) {
    const invoice = await this.getPurchaseInvoiceById(id);

    if (invoice.status !== 'draft') {
      throw new Error(`Cannot confirm invoice with status: ${invoice.status}. Only draft invoices can be confirmed.`);
    }

    // Execute confirmation within transaction
    const result = await executeTransactionalOperation(async (session) => {
      // Create stock movements
      const stockMovements = await this.createStockMovementsForInvoice(invoice, userId, session);

      // Update inventory levels
      await this.updateInventoryLevels(invoice.items, 'add', session);

      // Create batches
      const batches = await this.createBatchesFromConfirmedInvoice(invoice, userId, session);

      // Create ledger entries
      const ledgerEntries = await this.createLedgerEntriesForPurchaseInvoice(invoice, userId, session);

      // Update invoice status
      const confirmedInvoice = await invoiceRepository.update(id, {
        status: 'confirmed',
        confirmedAt: new Date(),
        confirmedBy: userId,
      }, { session });

      // Update Purchase Order fulfillment status if linked
      if (invoice.poId) {
        await this.updatePurchaseOrderFulfillment(confirmedInvoice, session);
      }

      // Publish event for async processing
      await eventPublisherService.publishInvoiceConfirmed(confirmedInvoice);

      return {
        invoice: confirmedInvoice,
        stockMovements,
        batches,
        ledgerEntries,
      };
    }, {
      maxRetries: 3,
      timeout: 30000,
    });

    const itemIds = [...new Set(invoice.items.map((item) => getObjectId(item.itemId).toString()))];
    await Promise.all(itemIds.map((itemId) => inventoryService.syncItemCurrentStock(itemId)));

    return result;
  }

  /**
   * Create stock movements for invoice items
   * @param {Object} invoice - Invoice object
   * @param {string} userId - User ID
   * @param {Object} session - MongoDB session
   * @returns {Promise<Array>} Created stock movements
   */
  async createStockMovementsForInvoice(invoice, userId, session = null) {
    const movements = [];

    for (const item of invoice.items) {
      const itemId = getObjectId(item.itemId);
      const warehouseId = getObjectId(item.warehouseId);
      const movementData = {
        itemId,
        warehouse: warehouseId,
        movementType: 'in', // Purchase invoice adds stock
        quantity: item.quantity,
        referenceType: 'purchase_invoice',
        referenceId: invoice._id,
        date: new Date(),
        createdBy: userId,
        notes: `Purchase Invoice ${invoice.invoiceNumber}`,
        batchInfo: item.batchInfo || {},
      };

      const stockMovement = session 
        ? await stockMovementRepository.create(movementData, { session })
        : await stockMovementRepository.create(movementData);
      movements.push(stockMovement);
    }

    return movements;
  }

  /**
   * Update Purchase Order fulfillment based on confirmed invoice
   * @param {Object} invoice - Confirmed invoice
   * @param {Object} session - MongoDB session
   * @returns {Promise<void>}
   */
  async updatePurchaseOrderFulfillment(invoice, session = null) {
    if (!invoice.poId) return;

    try {
      const purchaseOrder = await PurchaseOrder.findById(invoice.poId).session(session);
      if (!purchaseOrder) {
        console.warn(`Purchase Order ${invoice.poId} not found for invoice ${invoice.invoiceNumber}`);
        return;
      }

      // Map invoice items to get received quantities
      const invoiceItemsMap = new Map();
      invoice.items.forEach((item) => {
        const itemIdStr = getObjectId(item.itemId).toString();
        const currentQty = invoiceItemsMap.get(itemIdStr) || 0;
        invoiceItemsMap.set(itemIdStr, currentQty + item.quantity);
      });

      let hasUpdates = false;

      purchaseOrder.items.forEach((poItem) => {
        const itemIdStr = getObjectId(poItem.itemId).toString();
        if (invoiceItemsMap.has(itemIdStr)) {
          const receivedQty = invoiceItemsMap.get(itemIdStr);
          // Add to existing received quantity
          poItem.receivedQuantity = (poItem.receivedQuantity || 0) + receivedQty;
          // Note: pendingQuantity and fulfillmentStatus are updated by the PO pre-save hook
          hasUpdates = true;
        }
      });

      if (hasUpdates) {
        if (session) {
          purchaseOrder.$session(session);
        }
        await purchaseOrder.save({ session });
      }
    } catch (error) {
      console.error('Error updating Purchase Order fulfillment:', error);
      // Don't block the invoice confirmation if PO update fails
    }
  }

  /**
   * Revert Purchase Order fulfillment when invoice is cancelled
   * @param {Object} invoice - Cancelled invoice
   * @param {Object} session - MongoDB session
   * @returns {Promise<void>}
   */
  async revertPurchaseOrderFulfillment(invoice, session = null) {
    if (!invoice.poId) return;

    try {
      const purchaseOrder = await PurchaseOrder.findById(invoice.poId).session(session);
      if (!purchaseOrder) {
        console.warn(`Purchase Order ${invoice.poId} not found for invoice ${invoice.invoiceNumber}`);
        return;
      }

      // Map invoice items to get received quantities
      const invoiceItemsMap = new Map();
      invoice.items.forEach((item) => {
        const itemIdStr = getObjectId(item.itemId).toString();
        const currentQty = invoiceItemsMap.get(itemIdStr) || 0;
        invoiceItemsMap.set(itemIdStr, currentQty + item.quantity);
      });

      let hasUpdates = false;

      purchaseOrder.items.forEach((poItem) => {
        const itemIdStr = getObjectId(poItem.itemId).toString();
        if (invoiceItemsMap.has(itemIdStr)) {
          const receivedQty = invoiceItemsMap.get(itemIdStr);
          // Subtract from existing received quantity (prevent negative)
          poItem.receivedQuantity = Math.max(0, (poItem.receivedQuantity || 0) - receivedQty);
          // Note: pendingQuantity and fulfillmentStatus are updated by the PO pre-save hook
          hasUpdates = true;
        }
      });

      if (hasUpdates) {
        if (session) {
          purchaseOrder.$session(session);
        }
        await purchaseOrder.save({ session });
      }
    } catch (error) {
      console.error('Error reverting Purchase Order fulfillment:', error);
      // Don't block invoice cancellation if PO update fails
    }
  }

  /**
   * Update inventory levels for invoice items
   * Updates both Inventory collection (warehouse-level) and syncs Item.inventory.currentStock
   * @param {Array} items - Invoice items
   * @param {string} operation - Operation type ('add' or 'subtract')
   * @param {Object} session - MongoDB session
   * @returns {Promise<Array>} Updated items
   */
  async updateInventoryLevels(items, operation = 'add', session = null) {
    const Inventory = require('../models/Inventory');
    const inventoryService = require('./inventoryService');
    const mongoose = require('mongoose');
    const updatedItems = [];
    const affectedItemIds = new Set();

    for (const item of items) {
      const itemId = getObjectId(item.itemId);
      const warehouseId = getObjectId(item.warehouseId);
      const itemDoc = await Item.findById(itemId).session(session);

      if (!itemDoc) {
        throw new Error(`Item not found: ${item.itemId}`);
      }

      const quantity = operation === 'add' ? item.quantity : -item.quantity;

      // Update Inventory collection (warehouse-level stock) - this is the source of truth
      if (item.warehouseId) {
        const inventoryQuery = {
          item: new mongoose.Types.ObjectId(itemId),
          warehouse: new mongoose.Types.ObjectId(warehouseId),
        };

        // Add batch number to query if provided
        if (item.batchInfo?.batchNumber) {
          inventoryQuery.batchNumber = item.batchInfo.batchNumber;
        }

        const updateOptions = {
          upsert: true,
          new: true,
          runValidators: true,
          setDefaultsOnInsert: true,
        };

        if (session) {
          updateOptions.session = session;
        }

        await Inventory.findOneAndUpdate(
          inventoryQuery,
          {
            $inc: { quantity },
            $set: { lastUpdated: new Date() },
          },
          updateOptions,
        );
      } else {
        // Fallback: If no warehouseId, update Item directly (legacy behavior)
        if (operation === 'add') {
          itemDoc.inventory.currentStock += item.quantity;
        } else if (operation === 'subtract') {
          itemDoc.inventory.currentStock = Math.max(0, itemDoc.inventory.currentStock - item.quantity);
        }
        await itemDoc.save({ session });
      }

      affectedItemIds.add(itemId.toString());
      updatedItems.push(itemDoc);
    }

    if (!session) {
      await Promise.all(
        Array.from(affectedItemIds).map((itemId) => inventoryService.syncItemCurrentStock(itemId)),
      );
    }

    return updatedItems;
  }

  /**
   * Create batches from purchase invoice items
   * @param {Object} invoice - Invoice object
   * @returns {Promise<Array>} Created batches
   */
  async createBatchesFromInvoice(invoice) {
    const batches = [];

    for (const item of invoice.items) {
      // Only create batch if batch info is provided
      if (item.batchInfo && item.batchInfo.batchNumber) {
        // Batch tracking is handled through stock movements
        // This method can be extended to create separate batch records if needed
        batches.push({
          itemId: item.itemId,
          batchNumber: item.batchInfo.batchNumber,
          quantity: item.quantity,
          manufacturingDate: item.batchInfo.manufacturingDate,
          expiryDate: item.batchInfo.expiryDate,
          invoiceId: invoice._id,
        });
      }
    }

    return batches;
  }

  /**
   * Mark invoice as paid
   * @param {string} id - Invoice ID
   * @param {Object} paymentData - Payment information
   * @returns {Promise<Object>} Updated invoice
   */
  async markInvoiceAsPaid(id, paymentData = {}) {
    const invoice = await this.getPurchaseInvoiceById(id);

    // Validate invoice status
    if (invoice.status === 'cancelled') {
      throw new Error('Cannot mark cancelled invoice as paid');
    }

    if (invoice.status === 'draft') {
      throw new Error('Cannot mark draft invoice as paid. Confirm the invoice first.');
    }

    if (invoice.paymentStatus === 'paid') {
      throw new Error('Invoice is already marked as paid');
    }

    // Update invoice payment status
    const updateData = {
      paymentStatus: 'paid',
      paidAt: paymentData.paidAt || new Date(),
      paymentMethod: paymentData.paymentMethod,
      paymentReference: paymentData.paymentReference,
      paymentNotes: paymentData.notes,
    };

    return invoiceRepository.update(id, updateData);
  }

  /**
   * Mark invoice as partially paid
   * @param {string} id - Invoice ID
   * @param {Object} paymentData - Payment information
   * @returns {Promise<Object>} Updated invoice
   */
  async markInvoiceAsPartiallyPaid(id, paymentData = {}) {
    const invoice = await this.getPurchaseInvoiceById(id);

    // Validate invoice status
    if (invoice.status === 'cancelled') {
      throw new Error('Cannot process payment for cancelled invoice');
    }

    if (invoice.status === 'draft') {
      throw new Error('Cannot process payment for draft invoice. Confirm the invoice first.');
    }

    if (invoice.paymentStatus === 'paid') {
      throw new Error('Invoice is already fully paid');
    }

    // Update invoice payment status
    const updateData = {
      paymentStatus: 'partial',
      partialPaymentAmount: paymentData.amount,
      lastPaymentDate: paymentData.paidAt || new Date(),
      paymentNotes: paymentData.notes,
    };

    return invoiceRepository.update(id, updateData);
  }

  /**
   * Cancel purchase invoice and reverse inventory
   * @param {string} id - Invoice ID
   * @param {string} userId - User ID performing the cancellation
   * @param {string} reason - Cancellation reason
   * @returns {Promise<Object>} Cancelled invoice
   */
  async cancelPurchaseInvoice(id, userId, reason = '') {
    const invoice = await this.getPurchaseInvoiceById(id);

    // Validate invoice status
    if (invoice.status === 'cancelled') {
      throw new Error('Invoice is already cancelled');
    }

    if (invoice.status === 'paid' || invoice.paymentStatus === 'paid') {
      const error = new Error('Cannot cancel paid invoice. Please process a refund instead.');
      error.code = 'CANNOT_CANCEL_PAID_INVOICE';
      error.statusCode = 422;
      throw error;
    }

    // If invoice was confirmed, reverse operations within transaction
    if (invoice.status === 'confirmed') {
      const cancelledInvoice = await executeTransactionalOperation(async (session) => {
        // Reverse stock movements
        await this.reverseStockMovements(invoice, userId, reason, session);
        
        // Update inventory levels
        await this.updateInventoryLevels(invoice.items, 'subtract', session);

        await batchCreationService.reverseBatchesFromInvoice(invoice, userId);

        await this.createLedgerEntriesForPurchaseInvoiceCancellation(invoice, userId, reason, session);

        // Revert Purchase Order fulfillment if linked
        if (invoice.poId) {
          await this.revertPurchaseOrderFulfillment(invoice, session);
        }

        // Update invoice status to cancelled
        const cancelledInvoice = await invoiceRepository.update(id, {
          status: 'cancelled',
          cancelledAt: new Date(),
          cancelledBy: userId,
          cancellationReason: reason,
        }, { session });

        if (typeof eventPublisherService.publishInvoiceCancelled === 'function') {
          await eventPublisherService.publishInvoiceCancelled(invoice);
        }

        return cancelledInvoice;
      }, {
        maxRetries: 3,
        timeout: 30000,
      });

      const itemIds = [...new Set(invoice.items.map((item) => getObjectId(item.itemId).toString()))];
      await Promise.all(itemIds.map((itemId) => inventoryService.syncItemCurrentStock(itemId)));

      return cancelledInvoice;
    }

    // For non-confirmed invoices, just update status
    const updateData = {
      status: 'cancelled',
      cancelledAt: new Date(),
      cancelledBy: userId,
      cancellationReason: reason,
    };

    return invoiceRepository.update(id, updateData);
  }

  /**
   * Reverse stock movements for cancelled invoice
   * @param {Object} invoice - Invoice object
   * @param {string} userId - User ID performing the reversal
   * @param {string} reason - Reversal reason
   * @param {Object} session - MongoDB session
   * @returns {Promise<Array>} Created reversal stock movements
   */
  async reverseStockMovements(invoice, userId, reason, session = null) {
    const movements = [];

    for (const item of invoice.items) {
      const itemId = getObjectId(item.itemId);
      const warehouseId = getObjectId(item.warehouseId);
      const movementData = {
        itemId,
        warehouse: warehouseId,
        movementType: 'out',
        quantity: item.quantity, // Positive for outward movement (reversal)
        referenceType: 'purchase_invoice_cancellation',
        referenceId: invoice._id,
        batchInfo: item.batchInfo || {},
        movementDate: new Date(),
        notes: `Reversal: Purchase invoice ${invoice.invoiceNumber} cancelled. Reason: ${reason}`,
        createdBy: userId,
      };

      const movement = session
        ? await stockMovementRepository.create(movementData, { session })
        : await stockMovementRepository.create(movementData);
      movements.push(movement);
    }

    return movements;
  }

  /**
   * Get stock movements for an invoice
   * @param {string} invoiceId - Invoice ID
   * @returns {Promise<Array>} Stock movements
   */
  async getInvoiceStockMovements(invoiceId) {
    const StockMovement = require('../models/StockMovement');
    return StockMovement.find({
      referenceId: invoiceId,
      referenceType: { $in: ['purchase_invoice', 'purchase_invoice_cancellation'] },
    }).sort({ movementDate: 1 });
  }

  async createLedgerEntriesForPurchaseInvoice(invoice, userId, session = null) {
    const supplierId = getObjectId(invoice.supplierId);
    const invoiceTotal = invoice.totals?.netBillTotal || invoice.totals?.grandTotal || invoice.totals?.dueAmount || 0;
    if (!supplierId || !invoiceTotal) {
      return [];
    }

    return LedgerEntry.create([{
      accountId: supplierId,
      accountType: 'Supplier',
      transactionType: 'credit',
      amount: invoiceTotal,
      description: `Purchase Invoice ${invoice.invoiceNumber}`,
      referenceType: 'invoice',
      referenceId: invoice._id,
      transactionDate: invoice.invoiceDate || new Date(),
      createdBy: userId,
    }], { session });
  }

  async createLedgerEntriesForPurchaseInvoiceCancellation(invoice, userId, reason = '', session = null) {
    const supplierId = getObjectId(invoice.supplierId);
    const invoiceTotal = invoice.totals?.netBillTotal || invoice.totals?.grandTotal || invoice.totals?.dueAmount || 0;
    if (!supplierId || !invoiceTotal) {
      return [];
    }

    return LedgerEntry.create([{
      accountId: supplierId,
      accountType: 'Supplier',
      transactionType: 'debit',
      amount: invoiceTotal,
      description: `Cancellation of Purchase Invoice ${invoice.invoiceNumber}${reason ? ` - ${reason}` : ''}`,
      referenceType: 'adjustment',
      referenceId: invoice._id,
      transactionDate: new Date(),
      createdBy: userId,
    }], { session });
  }

  /**
   * Check for duplicate supplier bill number
   * @param {string} supplierId - Supplier ID
   * @param {string} billNo - Bill number to check
   * @param {string} excludeInvoiceId - Optional invoice ID to exclude from check (for updates)
   * @returns {Promise<Object>} Validation result with isDuplicate flag and existing invoice details
   */
  async checkDuplicateSupplierBill(supplierId, billNo, excludeInvoiceId = null) {
    if (!supplierId || !billNo) {
      return {
        isDuplicate: false,
        error: 'Supplier ID and bill number are required',
      };
    }

    const Invoice = require('../models/Invoice');

    // Build query
    const query = {
      supplierId,
      supplierBillNo: billNo,
      type: { $in: ['purchase', 'return_purchase'] },
      status: { $ne: 'cancelled' },
    };

    // Exclude current invoice if provided (for updates)
    if (excludeInvoiceId) {
      query._id = { $ne: excludeInvoiceId };
    }

    // Check for existing invoice with same supplier and bill number
    const existingInvoice = await Invoice.findOne(query);

    if (existingInvoice) {
      return {
        isDuplicate: true,
        existingInvoiceId: existingInvoice._id,
        existingInvoiceNumber: existingInvoice.invoiceNumber,
        existingInvoiceDate: existingInvoice.invoiceDate,
        message: `Bill number '${billNo}' already exists for this supplier (Invoice: ${existingInvoice.invoiceNumber})`,
      };
    }

    return {
      isDuplicate: false,
      message: 'Bill number is unique for this supplier',
    };
  }

  /**
   * Validate supplier bill number before saving
   * @param {string} supplierId - Supplier ID
   * @param {string} billNo - Bill number
   * @param {string} invoiceId - Current invoice ID (for updates)
   * @throws {Error} If bill number is duplicate
   */
  async validateSupplierBillNumber(supplierId, billNo, invoiceId = null) {
    const validation = await this.checkDuplicateSupplierBill(supplierId, billNo, invoiceId);

    if (validation.isDuplicate) {
      throw new Error(validation.message);
    }
  }
}

module.exports = new PurchaseInvoiceService();
