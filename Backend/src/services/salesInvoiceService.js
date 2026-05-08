const Invoice = require('../models/Invoice');
const Customer = require('../models/Customer');
const Item = require('../models/Item');
const Warehouse = require('../models/Warehouse');
const StockMovement = require('../models/StockMovement');
const LedgerEntry = require('../models/LedgerEntry');
const taxService = require('./taxService');
const schemeService = require('./schemeService');
const creditValidationService = require('./creditValidationService');
const batchService = require('./batchService');
const inventoryService = require('./inventoryService');
const eventPublisherService = require('./eventPublisherService');
const { executeTransactionalOperation } = require('../utils/transactionUtils');
const AppError = require('../utils/appError');

const getObjectId = (value) => value?._id || value;

/**
 * Sales Invoice Service
 * Core business logic for sales invoice management
 */
class SalesInvoiceService {
  /**
   * Generate unique invoice number
   * Format: SI2025000001 (SI + Year + 6-digit sequence)
   * @returns {Promise<string>} Generated invoice number
   */
  async generateInvoiceNumber() {
    const year = new Date().getFullYear();
    const prefix = `SI${year}`;

    // Find the last invoice number for this year
    const lastInvoice = await Invoice.findOne({
      invoiceNumber: { $regex: `^${prefix}` },
      type: 'sales',
    })
      .sort({ invoiceNumber: -1 })
      .limit(1);

    let sequence = 1;
    if (lastInvoice && lastInvoice.invoiceNumber) {
      const lastSequence = parseInt(lastInvoice.invoiceNumber.substring(prefix.length));
      sequence = lastSequence + 1;
    }

    return `${prefix}${String(sequence).padStart(6, '0')}`;
  }

  /**
   * Create new sales invoice
   * @param {Object} invoiceData - Invoice data
   * @param {string} userId - User creating the invoice
   * @returns {Promise<Object>} Created invoice
   */
  async createInvoice(invoiceData, userId) {
    const {
      customerId,
      salesmanId,
      items,
      creditDays,
      claimAccountId,
      advanceTaxRate,
      taxInvoiceType,
      otherTitle,
      memoNo,
      poReference,
      detailNote,
      warrantyInfo,
      dimensionId,
      salesType = 'new',
      status = 'draft',
    } = invoiceData;

    // Validate required fields
    if (!customerId || !items || items.length === 0) {
      throw new AppError('Customer and at least one item are required', 400);
    }

    // Execute within transaction
    return executeTransactionalOperation(async (session) => {
      // Get customer data
      const customer = await Customer.findById(customerId).session(session);
      if (!customer) {
        throw new AppError('Customer not found', 404);
      }

      // Get customer tax information
      const customerTaxInfo = await taxService.getTaxRateForCustomer(customerId);

      // Generate invoice number
      const invoiceNumber = await this.generateInvoiceNumber();

      // Calculate invoice date and due date
      const invoiceDate = new Date();
      const dueDate = new Date(invoiceDate);
      if (creditDays) {
        dueDate.setDate(dueDate.getDate() + creditDays);
      }

      // Process items and calculate totals
      const processedItems = await this.processInvoiceItems(items, customerId, session);
      const totals = this.calculateInvoiceTotals(processedItems, customerTaxInfo);

      // Validate stock availability (only for confirmed invoices)
      if (status === 'confirmed') {
        await this.validateStockAvailability(processedItems, session);
      }

      // Validate credit limit using new credit validation service
      if (customer.code !== 'WALK-IN' && totals.netBillTotal > 0) {
        const creditCheck = await creditValidationService.validateCreditLimit(
          customerId,
          totals.netBillTotal,
          { session },
        );

        if (!creditCheck.allowed) {
          throw new AppError(
            `Credit limit exceeded: ${creditCheck.reason}. Available: ${creditCheck.availableCredit}, Required: ${totals.netBillTotal}`,
            400,
            'CREDIT_LIMIT_EXCEEDED',
          );
        }
      }

      // Create invoice
      const invoiceArray = await Invoice.create([{
        invoiceNumber,
        type: 'sales',
        salesType,
        invoiceDate,
        dueDate,
        customerId,
        customerName: customer.name,
        customerTown: customer.town,
        salesmanId: salesmanId || customer.salesmanId,
        dimensionId,
        otherTitle,
        memoNo,
        poReference,
        creditDays,
        advanceTaxRate: advanceTaxRate || customerTaxInfo.advanceTaxRate,
        taxInvoiceType: taxInvoiceType || 'normal',
        claimAccountId,
        items: processedItems,
        totals,
        previousBalance: customer.currentBalance || 0,
        totalBalance: (customer.currentBalance || 0) + totals.netBillTotal,
        paymentStatus: 'pending',
        paidAmount: 0,
        remainingAmount: totals.netBillTotal,
        status,
        detailNote,
        warrantyInfo,
        createdBy: userId,
      }], { session });

      const invoice = invoiceArray[0];

      // If status is confirmed, process confirmation within same transaction
      if (status === 'confirmed') {
        await this.processConfirmation(invoice, userId, session);
        
        // Publish event for async processing
        await eventPublisherService.publishInvoiceConfirmed(invoice);
      } else {
        // Publish created event for draft invoices
        await eventPublisherService.publishInvoiceCreated(invoice);
      }

      return this.getInvoiceById(invoice._id);
    }, {
      maxRetries: 3,
      timeout: 30000,
    });
  }

  /**
   * Process invoice items - apply schemes, calculate taxes
   * P01: Optimized to avoid N+1 queries by bulk fetching items
   * @param {Array} items - Invoice items
   * @param {string} customerId - Customer ID
   * @param {Object} [session] - Optional session
   * @returns {Promise<Array>} Processed items
   */
  async processInvoiceItems(items, customerId, session = null) {
    const itemIds = items.map((i) => i.itemId);

    // Bulk fetch all items at once
    const itemDocs = await Item.find({ _id: { $in: itemIds } }).session(session);
    const itemMap = new Map(itemDocs.map((doc) => [doc._id.toString(), doc]));

    const processedItems = [];

    for (const item of items) {
      const {
        itemId,
        warehouseId,
        batchNumber,
        boxQty = 0,
        unitQty = 0,
        boxTP,
        unitTP,
        discount1Percent = 0,
        discount2Percent = 0,
        scheme1Qty = 0,
        scheme2Qty = 0,
      } = item;

      // Get item details from map (no DB call)
      const itemDoc = itemMap.get(itemId.toString());
      if (!itemDoc) {
        throw new AppError(`Item not found: ${itemId}`, 404);
      }

      // Get item tax rate (from item doc if available, otherwise default)
      const gstRate = itemDoc.gstRate || itemDoc.taxRate || 18;

      // Calculate total unit quantity
      const packing = itemDoc.packSize || 1;
      const totalUnitQty = (boxQty * packing) + unitQty;

      // Calculate amounts
      const boxAmount = boxQty * (boxTP || 0);
      const unitAmount = unitQty * (unitTP || 0);
      const totalAmountBeforeDiscount = boxAmount + unitAmount;

      // Calculate discounts
      const discount1Amount = (totalAmountBeforeDiscount * discount1Percent) / 100;
      const discount2Amount = (totalAmountBeforeDiscount * discount2Percent) / 100;
      const amountAfterDiscount = totalAmountBeforeDiscount - discount1Amount - discount2Amount;

      // Calculate GST separately for box and unit
      const boxGSTCalc = taxService.calculateBoxUnitGST({
        boxQty,
        unitQty: 0,
        boxTP: boxTP || 0,
        unitTP: 0,
        gstRate,
      });

      const unitGSTCalc = taxService.calculateBoxUnitGST({
        boxQty: 0,
        unitQty,
        boxTP: 0,
        unitTP: unitTP || 0,
        gstRate,
      });

      const gstBoxAmount = boxGSTCalc.boxGSTAmount;
      const gstUnitAmount = unitGSTCalc.unitGSTAmount;
      const gstTotal = gstBoxAmount + gstUnitAmount;

      // Calculate advance tax on amount after discount
      const advanceTaxRate = item.advanceTaxRate || 0;
      const advanceTaxAmount = (amountAfterDiscount * advanceTaxRate) / 100;

      // Calculate net amount
      const netAmount = amountAfterDiscount + gstTotal + advanceTaxAmount;

      processedItems.push({
        itemId,
        itemName: itemDoc.name,
        itemCode: itemDoc.code,
        companyName: itemDoc.company?.name || '',
        warehouseId,
        batchNumber,
        expiryDate: item.expiryDate,
        boxQty,
        unitQty,
        totalUnitQty,
        scheme1Qty,
        scheme2Qty,
        boxTP: boxTP || 0,
        unitTP: unitTP || 0,
        quantity: totalUnitQty,
        unitPrice: unitTP || 0,
        discount: discount1Percent,
        taxAmount: gstTotal + advanceTaxAmount,
        lineTotal: netAmount,
        totalAmountBeforeDiscount,
        discount1Percent,
        discount1Amount,
        discount2Percent,
        discount2Amount,
        gstBoxAmount,
        gstUnitAmount,
        gstTotal,
        gstRate,
        advanceTaxAmount,
        netAmount,
      });
    }

    return processedItems;
  }

  /**
   * Internal method to process confirmation logic (stock, balance, etc.)
   * Used by both createInvoice (when status is confirmed) and confirmInvoice
   */
  async processConfirmation(invoice, userId, session) {
    // 1. Create stock movement records
    for (const item of invoice.items) {
      const batchNumber = item.batchNumber || item.batchInfo?.batchNumber;
      const totalQuantity =
        (item.totalUnitQty || item.quantity || 0) +
        (item.scheme1Qty || item.scheme1Quantity || 0) +
        (item.scheme2Qty || item.scheme2Quantity || 0);

      if (totalQuantity === 0) continue;

      await StockMovement.create([{
        itemId: getObjectId(item.itemId),
        warehouse: getObjectId(item.warehouseId),
        movementType: 'out',
        quantity: totalQuantity,
        referenceType: 'sales_invoice',
        referenceId: invoice._id,
        batchInfo: {
          batchNumber,
        },
        movementDate: invoice.invoiceDate,
        notes: `Sales Invoice ${invoice.invoiceNumber}`,
        createdBy: userId,
      }], { session });

      // 2. Update item stock levels (B02: Using atomic $inc)
      const Inventory = require('../models/Inventory');
      const inventoryQuery = {
        item: getObjectId(item.itemId),
        warehouse: getObjectId(item.warehouseId),
      };
      if (batchNumber) {
        inventoryQuery.batchNumber = batchNumber;
      }

      await Inventory.findOneAndUpdate(
        inventoryQuery,
        { $inc: { quantity: -totalQuantity }, $set: { lastUpdated: new Date() } },
        { session, upsert: true },
      );

      // 3. Update batch quantities
      if (batchNumber) {
        await batchService.deductFromBatch(batchNumber, totalQuantity, { session });
      }
    }

    // 4. Update customer balance (Atomic $inc)
    await Customer.findByIdAndUpdate(
      getObjectId(invoice.customerId),
      { $inc: { currentBalance: invoice.totals?.netBillTotal || invoice.totals?.grandTotal || invoice.totals?.dueAmount || 0 } },
      { session },
    );
  }

  /**
   * Calculate invoice totals
   * @param {Array} items - Processed invoice items
   * @param {Object} customerTaxInfo - Customer tax information
   * @returns {Object} Invoice totals
   */
  calculateInvoiceTotals(items, customerTaxInfo) {
    let grossTotal = 0;
    let discountTotal = 0;
    let gstTotal = 0;
    let advanceTaxTotal = 0;

    items.forEach((item) => {
      grossTotal += item.totalAmountBeforeDiscount;
      discountTotal += item.discount1Amount + item.discount2Amount;
      gstTotal += item.gstTotal;
      advanceTaxTotal += item.advanceTaxAmount;
    });

    // Calculate non-filer GST if applicable
    const nonFilerGst = customerTaxInfo.isNonFiler
      ? (grossTotal * 0.1) / 100
      : 0;

    // Calculate net bill total
    const netBillTotal = grossTotal - discountTotal + gstTotal + advanceTaxTotal + nonFilerGst;

    return {
      subtotal: Math.round(grossTotal * 100) / 100,
      grossTotal: Math.round(grossTotal * 100) / 100,
      totalDiscount: Math.round(discountTotal * 100) / 100,
      discountTotal: Math.round(discountTotal * 100) / 100,
      discountPercentOverall: 0,
      discountAmountOverall: 0,
      totalTax: Math.round((gstTotal + advanceTaxTotal + nonFilerGst) * 100) / 100,
      gstTotal: Math.round(gstTotal * 100) / 100,
      advanceTaxTotal: Math.round(advanceTaxTotal * 100) / 100,
      nonFilerGst: Math.round(nonFilerGst * 100) / 100,
      grandTotal: Math.round(netBillTotal * 100) / 100,
      netBillTotal: Math.round(netBillTotal * 100) / 100,
    };
  }

  /**
   * Validate stock availability for all items
   * @param {Array} items - Invoice items
   * @param {Object} session - MongoDB session for transactional reads
   * @returns {Promise<void>}
   */
  async validateStockAvailability(items, session = null) {
    const errors = [];

    for (const item of items) {
      const {
        itemId, warehouseId, totalUnitQty, scheme1Qty, scheme2Qty,
      } = item;
      const itemObjectId = getObjectId(itemId);
      const warehouseObjectId = getObjectId(warehouseId);
      const batchNumber = item.batchNumber || item.batchInfo?.batchNumber;

      // Total quantity needed (including scheme units)
      const totalNeeded =
        (totalUnitQty || item.quantity || 0) +
        (scheme1Qty || item.scheme1Quantity || 0) +
        (scheme2Qty || item.scheme2Quantity || 0);

      // If batch number is specified, validate batch quantity
      if (batchNumber) {
        const batchValidation = await batchService.validateBatchQuantity(batchNumber, totalNeeded);
        if (!batchValidation.valid) {
          errors.push(`${item.itemName}: ${batchValidation.error}`);
          continue;
        }

        // Check batch expiry
        const expiryCheck = await batchService.checkBatchExpiry(batchNumber);
        if (expiryCheck.isExpired) {
          errors.push(`${item.itemName}: Batch ${batchNumber} has expired`);
        }
      } else {
        // Check warehouse stock from Batch model (actual stock tracking)
        const Batch = require('../models/Batch');
        const mongoose = require('mongoose');
        
        const matchStage = {
          item: new mongoose.Types.ObjectId(itemObjectId),
          warehouse: new mongoose.Types.ObjectId(warehouseObjectId),
          remainingQuantity: { $gt: 0 },
          expiryDate: { $gt: new Date() },
          status: 'active',
        };

        const pipeline = [
          { $match: matchStage },
          {
            $group: {
              _id: null,
              totalQuantity: { $sum: '$remainingQuantity' },
            },
          },
        ];

        const batches = session 
          ? await Batch.aggregate(pipeline).session(session)
          : await Batch.aggregate(pipeline);

        const available = batches.length > 0 ? batches[0].totalQuantity : 0;

        if (available < totalNeeded) {
          errors.push(
            `${item.itemName}: Insufficient stock. Available: ${available}, Required: ${totalNeeded}`,
          );
        }
      }
    }

    if (errors.length > 0) {
      throw new AppError(`Stock validation failed:\n${errors.join('\n')}`, 400);
    }
  }

  /**
   * Validate credit limit
   * @param {string} customerId - Customer ID
   * @param {number} invoiceTotal - Invoice total amount
   * @returns {Promise<Object>} Credit check result
   */
  async validateCreditLimit(customerId, invoiceTotal) {
    return creditManagementService.checkCreditLimit(customerId, invoiceTotal);
  }

  /**
   * Apply schemes to items automatically
   * @param {Array} items - Invoice items
   * @param {string} customerId - Customer ID
   * @returns {Promise<Array>} Items with applied schemes
   */
  async applySchemes(items, customerId) {
    return schemeService.autoApplySchemes(items, customerId);
  }

  /**
   * Calculate taxes for items
   * @param {Array} items - Invoice items
   * @param {Object} customer - Customer object
   * @returns {Promise<Array>} Items with calculated taxes
   */
  async calculateTaxes(items, customer) {
    const customerTaxInfo = await taxService.getTaxRateForCustomer(customer._id);
    const itemsWithTaxes = [];

    for (const item of items) {
      const itemTaxInfo = await taxService.getTaxRateForItem(item.itemId);

      const taxCalc = taxService.calculateSalesInvoiceTaxes({
        amount: item.totalAmountBeforeDiscount - item.discount1Amount - item.discount2Amount,
        gstRate: itemTaxInfo.gstRate,
        advanceTaxRate: customerTaxInfo.advanceTaxRate,
        isNonFiler: customerTaxInfo.isNonFiler,
      });

      itemsWithTaxes.push({
        ...item,
        gstAmount: taxCalc.gstAmount,
        advanceTaxAmount: taxCalc.advanceTaxAmount,
        nonFilerGSTAmount: taxCalc.nonFilerGSTAmount,
        totalTaxAmount: taxCalc.totalTaxAmount,
        grossAmount: taxCalc.grossAmount,
      });
    }

    return itemsWithTaxes;
  }

  /**
   * Get invoices with filters and pagination
   * @param {Object} filters - Filter criteria
   * @param {Object} pagination - Pagination options
   * @returns {Promise<Object>} Paginated invoices
   */
  async getInvoices(filters = {}, pagination = {}) {
    const query = { type: 'sales' };

    // Apply filters
    if (filters.salesType) {
      query.salesType = filters.salesType;
    }

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.customerId) {
      query.customerId = filters.customerId;
    }

    if (filters.salesmanId) {
      query.salesmanId = filters.salesmanId;
    }

    if (filters.invoiceNumber) {
      query.invoiceNumber = { $regex: filters.invoiceNumber, $options: 'i' };
    }

    if (filters.dateFrom || filters.dateTo) {
      query.invoiceDate = {};
      if (filters.dateFrom) {
        query.invoiceDate.$gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        query.invoiceDate.$lte = new Date(filters.dateTo);
      }
    }

    if (filters.taxInvoiceType) {
      query.taxInvoiceType = filters.taxInvoiceType;
    }

    if (filters.claimAccountId) {
      query.claimAccountId = filters.claimAccountId;
    }

    // Filter by invoice source: 'admin' or 'pos'
    if (filters.invoiceSource) {
      query.invoiceSource = filters.invoiceSource;
    }

    // Support for searching by customer name
    if (filters.customerName) {
      const customers = await Customer.find({
        name: { $regex: filters.customerName, $options: 'i' },
      }).select('_id');
      const customerIds = customers.map((c) => c._id);
      query.customerId = { $in: customerIds };
    }

    // Pagination
    const page = parseInt(pagination.page) || 1;
    const limit = parseInt(pagination.limit) || 20;
    const skip = (page - 1) * limit;

    // Sorting
    let sortOptions = { invoiceDate: -1, invoiceNumber: -1 };
    if (pagination.sortBy) {
      sortOptions = {};
      const sortField = pagination.sortBy;
      const sortOrder = pagination.sortOrder === 'asc' ? 1 : -1;
      sortOptions[sortField] = sortOrder;
    }

    // Execute query
    const invoices = await Invoice.find(query)
      .populate('customerId', 'name code town currentBalance creditLimit')
      .populate('salesmanId', 'name code')
      .populate('claimAccountId', 'name code')
      .populate('createdBy', 'name email')
      .populate('confirmedBy', 'name email')
      .sort(sortOptions)
      .skip(skip)
      .limit(limit);

    const total = await Invoice.countDocuments(query);

    // Calculate summary statistics
    const summary = await this.calculateInvoiceSummary(query);

    return {
      data: invoices,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      summary,
    };
  }

  /**
   * Calculate summary statistics for invoices
   * @param {Object} query - MongoDB query object
   * @returns {Promise<Object>} Summary statistics
   */
  async calculateInvoiceSummary(query) {
    const result = await Invoice.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalInvoices: { $sum: 1 },
          totalAmount: { $sum: '$totals.netBillTotal' },
          totalGST: { $sum: '$totals.gstTotal' },
          totalDiscount: { $sum: '$totals.discountTotal' },
          grossTotal: { $sum: '$totals.grossTotal' },
        },
      },
    ]);

    if (result.length === 0) {
      return {
        totalInvoices: 0,
        totalAmount: 0,
        totalGST: 0,
        totalDiscount: 0,
        grossTotal: 0,
      };
    }

    return {
      totalInvoices: result[0].totalInvoices,
      totalAmount: parseFloat(result[0].totalAmount.toFixed(2)),
      totalGST: parseFloat(result[0].totalGST.toFixed(2)),
      totalDiscount: parseFloat(result[0].totalDiscount.toFixed(2)),
      grossTotal: parseFloat(result[0].grossTotal.toFixed(2)),
    };
  }

  /**
   * Get invoice by ID
   * @param {string} id - Invoice ID
   * @returns {Promise<Object>} Invoice
   */
  async getInvoiceById(id) {
    const invoice = await Invoice.findById(id)
      .populate('customerId', 'name code town creditLimit currentBalance')
      .populate('salesmanId', 'name code')
      .populate('claimAccountId', 'name code')
      .populate('items.itemId', 'name code company packing')
      .populate('items.warehouseId', 'name code')
      .populate('createdBy', 'name email')
      .populate('confirmedBy', 'name email')
      .exec();

    if (!invoice) {
      throw new AppError('Invoice not found', 404);
    }

    return invoice;
  }

  /**
   * Get invoice by invoice number
   * @param {string} invoiceNumber - Invoice number
   * @returns {Promise<Object>} Invoice
   */
  async getInvoiceByNumber(invoiceNumber) {
    const invoice = await Invoice.findOne({
      invoiceNumber,
      type: 'sales',
    })
      .populate('customerId', 'name code town creditLimit currentBalance')
      .populate('salesmanId', 'name code')
      .populate('claimAccountId', 'name code')
      .populate('items.itemId', 'name code company packing')
      .populate('items.warehouseId', 'name code')
      .populate('createdBy', 'name email')
      .populate('confirmedBy', 'name email');

    if (!invoice) {
      throw new AppError('Invoice not found', 404);
    }

    return invoice;
  }

  /**
   * Get customer invoices
   * @param {string} customerId - Customer ID
   * @param {Object} filters - Additional filters
   * @returns {Promise<Array>} Customer invoices
   */
  async getCustomerInvoices(customerId, filters = {}) {
    return this.getInvoices({ ...filters, customerId });
  }

  /**
   * Get salesman invoices
   * @param {string} salesmanId - Salesman ID
   * @param {Object} filters - Additional filters
   * @returns {Promise<Array>} Salesman invoices
   */
  async getSalesmanInvoices(salesmanId, filters = {}) {
    return this.getInvoices({ ...filters, salesmanId });
  }

  /**
   * Update draft invoice
   * @param {string} id - Invoice ID
   * @param {Object} updates - Update data
   * @param {string} userId - User updating the invoice
   * @returns {Promise<Object>} Updated invoice
   */
  async updateInvoice(id, updates, userId) {
    const invoice = await this.getInvoiceById(id);

    // Only draft invoices can be updated
    if (invoice.status !== 'draft') {
      throw new AppError('Only draft invoices can be updated', 400);
    }

    // If items are being updated, reprocess them
    if (updates.items) {
      const processedItems = await this.processInvoiceItems(updates.items, invoice.customerId);
      const customerTaxInfo = await taxService.getTaxRateForCustomer(invoice.customerId);
      const totals = this.calculateInvoiceTotals(processedItems, customerTaxInfo);

      updates.items = processedItems;
      updates.totals = totals;
      updates.remainingAmount = totals.netBillTotal;
    }

    // Update invoice
    const updatedInvoice = await Invoice.findByIdAndUpdate(
      id,
      {
        ...updates,
        updatedBy: userId,
        updatedAt: new Date(),
      },
      { new: true, runValidators: true },
    );

    return this.getInvoiceById(updatedInvoice._id);
  }

  /**
   * Delete draft invoice
   * @param {string} id - Invoice ID
   * @param {string} userId - User deleting the invoice
   * @returns {Promise<boolean>} True if deleted
   */
  async deleteInvoice(id, userId) {
    const invoice = await this.getInvoiceById(id);

    // Only draft invoices can be deleted
    if (invoice.status !== 'draft') {
      throw new AppError('Only draft invoices can be deleted', 400);
    }

    await Invoice.findByIdAndDelete(id);
    return true;
  }

  /**
   * Cancel invoice - Reverse all operations
   * Reverses stock movements, restores inventory, reverses customer balance, reverses ledger entries
   * @param {string} id - Invoice ID
   * @param {string} userId - User cancelling the invoice
   * @param {string} reason - Reason for cancellation
   * @returns {Promise<Object>} Cancelled invoice
   */
  async cancelInvoice(id, userId, reason = '') {
    const invoice = await this.getInvoiceById(id);

    // Only confirmed invoices can be cancelled
    if (invoice.status !== 'confirmed') {
      throw new AppError('Only confirmed invoices can be cancelled', 400);
    }

    // Execute cancellation within transaction
    const cancelledInvoice = await executeTransactionalOperation(async (session) => {
      // 1. Reverse all stock movements
      for (const item of invoice.items) {
        const batchNumber = item.batchNumber || item.batchInfo?.batchNumber;
        const totalQuantity =
          (item.totalUnitQty || item.quantity || 0) +
          (item.scheme1Qty || item.scheme1Quantity || 0) +
          (item.scheme2Qty || item.scheme2Quantity || 0);

        // Create reverse stock movement (in)
        await StockMovement.create([{
          itemId: getObjectId(item.itemId),
          warehouse: getObjectId(item.warehouseId),
          movementType: 'in',
          quantity: totalQuantity,
          referenceType: 'sales_invoice_cancellation',
          referenceId: invoice._id,
          batchInfo: {
            batchNumber,
          },
          movementDate: new Date(),
          notes: `Cancellation of Sales Invoice ${invoice.invoiceNumber}${reason ? ` - Reason: ${reason}` : ''}`,
          createdBy: userId,
        }], { session });

        // 2. Restore item stock levels in warehouse
        const Inventory = require('../models/Inventory');
        const inventoryQuery = { item: getObjectId(item.itemId), warehouse: getObjectId(item.warehouseId) };
        if (batchNumber) {
          inventoryQuery.batchNumber = batchNumber;
        }

        await Inventory.findOneAndUpdate(
          inventoryQuery,
          { $inc: { quantity: totalQuantity } },
          { session },
        );

        // 3. Restore batch quantities if batch tracking is used
        if (batchNumber) {
          await batchService.returnToBatch(batchNumber, totalQuantity, { session });
        }
      }

      // 4. Reverse customer balance update using atomic $inc
      await Customer.findByIdAndUpdate(
        getObjectId(invoice.customerId),
        { $inc: { currentBalance: -(invoice.totals?.netBillTotal || invoice.totals?.grandTotal || invoice.totals?.dueAmount || 0) } },
        { session },
      );

      // 6. Create all ledger entries for reversal
      const ledgerEntries = [{
        accountId: getObjectId(invoice.customerId),
        accountType: 'Customer',
        transactionType: 'credit',
        amount: invoice.totals?.netBillTotal || invoice.totals?.grandTotal || invoice.totals?.dueAmount || 0,
        description: `Cancellation of Sales Invoice ${invoice.invoiceNumber}${reason ? ` - ${reason}` : ''}`,
        referenceType: 'adjustment',
        referenceId: invoice._id,
        transactionDate: new Date(),
        createdBy: userId,
      }];

      // If claim account was used, credit claim account (reverse the debit)
      if (invoice.claimAccountId && invoice.totals.discountTotal > 0) {
        ledgerEntries.push({
          accountId: getObjectId(invoice.claimAccountId),
          accountType: 'Account',
          transactionType: 'credit',
          amount: invoice.totals.discountTotal,
          description: `Cancellation of Sales Invoice ${invoice.invoiceNumber} - Scheme Discount Reversal`,
          referenceType: 'adjustment',
          referenceId: invoice._id,
          transactionDate: new Date(),
          createdBy: userId,
        });
      }

      // Bulk create all ledger entries
      await LedgerEntry.create(ledgerEntries, { session });

      // 6. Update invoice status to cancelled
      const cancelledInvoice = await Invoice.findByIdAndUpdate(
        id,
        {
          status: 'cancelled',
          cancelledAt: new Date(),
          cancelledBy: userId,
          cancellationReason: reason,
        },
        { new: true, session },
      );

      if (typeof eventPublisherService.publishInvoiceCancelled === 'function') {
        await eventPublisherService.publishInvoiceCancelled(invoice);
      }

      return this.getInvoiceById(cancelledInvoice._id);
    }, {
      maxRetries: 3,
      timeout: 30000,
    });

    const cancelledItemIds = [...new Set(invoice.items.map(i => getObjectId(i.itemId).toString()))];
    await Promise.all(cancelledItemIds.map(id => inventoryService.syncItemCurrentStock(id)));

    return cancelledInvoice;
  }

  /**
   * Confirm invoice - Lock and process invoice
   * Creates stock movements, updates inventory, updates customer balance, creates ledger entries
   * @param {string} id - Invoice ID
   * @param {string} userId - User confirming the invoice
   * @returns {Promise<Object>} Confirmed invoice
   */
  async confirmInvoice(id, userId) {
    const invoice = await this.getInvoiceById(id);

    // Only draft invoices can be confirmed
    if (invoice.status !== 'draft') {
      throw new AppError('Only draft invoices can be confirmed', 400);
    }

    // Execute confirmation within transaction
    const confirmedInvoice = await executeTransactionalOperation(async (session) => {
      // Validate stock availability for all items within transaction
      await this.validateStockAvailability(invoice.items, session);

      // Use the internal method for processing confirmation logic
      await this.processConfirmation(invoice, userId, session);

      // Update invoice status to confirmed and lock it
      const confirmedInvoice = await Invoice.findByIdAndUpdate(
        id,
        {
          status: 'confirmed',
          confirmedAt: new Date(),
          confirmedBy: userId,
        },
        { new: true, session },
      );

      // Publish confirmation event for async processing
      await eventPublisherService.publishInvoiceConfirmed(confirmedInvoice);

      return this.getInvoiceById(confirmedInvoice._id);
    }, {
      maxRetries: 3,
      timeout: 30000,
    });

    const itemIds = [...new Set(invoice.items.map(i => getObjectId(i.itemId).toString()))];
    await Promise.all(itemIds.map(id => inventoryService.syncItemCurrentStock(id)));

    return confirmedInvoice;
  }

  async confirmSalesInvoice(id, userId) {
    const invoice = await this.confirmInvoice(id, userId);
    return { invoice };
  }

  async cancelSalesInvoice(id, userId, reason = '') {
    return this.cancelInvoice(id, userId, reason);
  }

  async getInvoiceStockMovements(invoiceId) {
    return StockMovement.find({
      referenceId: invoiceId,
      referenceType: { $in: ['sales_invoice', 'sales_invoice_cancellation'] },
    }).sort({ movementDate: 1 });
  }

  /**
   * Get confirmed customer invoices that still have an outstanding balance.
   * Used by cashbook invoice allocation screens.
   * @param {string} customerId - Customer ID
   * @returns {Promise<Array>} Pending customer invoices
   */
  async getPendingInvoices(customerId) {
    return Invoice.find({
      customerId,
      type: 'sales',
      status: 'confirmed',
      paymentStatus: { $in: ['pending', 'partial'] },
      'totals.dueAmount': { $gt: 0 },
    })
      .select('invoiceNumber invoiceDate dueDate totals paymentStatus status createdAt')
      .sort({ invoiceDate: 1 })
      .lean();
  }
}

module.exports = new SalesInvoiceService();
