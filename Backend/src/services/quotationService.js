const Quotation = require('../models/Quotation');
const Customer = require('../models/Customer');
const Item = require('../models/Item');
const Invoice = require('../models/Invoice');
const EOrder = require('../models/EOrder');
const salesInvoiceService = require('./salesInvoiceService');
const eOrderService = require('./eOrderService');
const AppError = require('../utils/appError');
const counterService = require('../utils/counterService');

/**
 * Quotation Service
 * Core business logic for quotation management
 */
class QuotationService {
  /**
   * Generate unique quotation number
   * Format: QT2025000001 (QT + Year + 6-digit sequence)
   * @returns {Promise<string>} Generated quotation number
   */
  async generateQuotationNumber() {
    return counterService.nextSequence('QT', Quotation, 'quotationNumber');
  }

  /**
   * Create new quotation
   * @param {Object} quotationData - Quotation data
   * @param {string} userId - User creating the quotation
   * @returns {Promise<Object>} Created quotation
   */
  async createQuotation(quotationData, userId) {
    const {
      customerId,
      salesmanId,
      items,
      referenceNumber,
      tenderNumber,
      customerReference,
      validityPeriod = 'One Month',
      termsAndConditions,
      columnVisibility,
      notes,
    } = quotationData;

    // Validate required fields
    if (!customerId || !items || items.length === 0) {
      throw new AppError('Customer and at least one item are required', 400);
    }

    // Get customer data
    const customer = await Customer.findById(customerId);
    if (!customer) {
      throw new AppError('Customer not found', 404);
    }

    // Generate quotation number
    const quotationNumber = await this.generateQuotationNumber();

    // Calculate quotation date and valid until date
    const quotationDate = new Date();
    const validUntil = new Date(quotationDate);

    // Parse validity period (default to 30 days if "One Month")
    if (validityPeriod === 'One Month' || !validityPeriod) {
      validUntil.setDate(validUntil.getDate() + 30);
    } else {
      // Try to parse days from validity period string
      const daysMatch = validityPeriod.match(/(\d+)\s*days?/i);
      if (daysMatch) {
        validUntil.setDate(validUntil.getDate() + parseInt(daysMatch[1]));
      } else {
        validUntil.setDate(validUntil.getDate() + 30); // Default to 30 days
      }
    }

    // Process items
    const processedItems = await this.processQuotationItems(items);

    // Create quotation
    const quotation = await Quotation.create({
      quotationNumber,
      quotationDate,
      validUntil,
      validityPeriod,
      customerId,
      customerName: customer.name,
      customerTown: customer.town,
      salesmanId: salesmanId || customer.salesmanId,
      referenceNumber,
      tenderNumber,
      customerReference,
      items: processedItems,
      termsAndConditions,
      columnVisibility: columnVisibility || {
        company: true,
        boxPacking: true,
        unitRetail: false,
        unitTP: false,
        discount: false,
        unitRateOffered: true,
      },
      notes,
      status: 'draft',
      createdBy: userId,
    });

    return this.getQuotationById(quotation._id);
  }

  /**
   * Process quotation items
   * @param {Array} items - Quotation items
   * @returns {Promise<Array>} Processed items
   */
  async processQuotationItems(items) {
    const processedItems = [];

    for (const item of items) {
      const {
        itemId,
        quantity,
        unitPrice,
        discount = 0,
        gstRate = 18,
        unitRetail,
        unitTP,
        unitRateOffered,
      } = item;

      // Get item details
      const itemDoc = await Item.findById(itemId);
      if (!itemDoc) {
        throw new AppError(`Item not found: ${itemId}`, 404);
      }

      // Calculate unit rate offered if not provided
      let calculatedUnitRateOffered = unitRateOffered;
      if (!calculatedUnitRateOffered && unitTP) {
        calculatedUnitRateOffered = unitTP - (unitTP * discount) / 100;
      } else if (!calculatedUnitRateOffered) {
        calculatedUnitRateOffered = unitPrice;
      }

      // Calculate amounts
      const itemSubtotal = quantity * unitPrice;
      const discountAmount = (itemSubtotal * discount) / 100;
      const taxableAmount = itemSubtotal - discountAmount;
      const gstAmount = (taxableAmount * gstRate) / 100;
      const lineTotal = taxableAmount + gstAmount;

      processedItems.push({
        itemId,
        itemName: itemDoc.name,
        companyName: itemDoc.company?.name || '',
        boxPacking: itemDoc.packSize || 1,
        unitRetail: unitRetail || itemDoc.retailPrice || 0,
        unitTP: unitTP || itemDoc.tradePrice || 0,
        quantity,
        unitPrice,
        unitRateOffered: calculatedUnitRateOffered,
        discount,
        gstRate,
        gstAmount,
        lineTotal,
      });
    }

    return processedItems;
  }

  /**
   * Get quotations with filters and pagination
   * @param {Object} filters - Filter criteria
   * @param {Object} pagination - Pagination options
   * @returns {Promise<Object>} Paginated quotations
   */
  async getQuotations(filters = {}, pagination = {}) {
    const query = { isDeleted: false };

    // Apply filters
    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.customerId) {
      query.customerId = filters.customerId;
    }

    if (filters.salesmanId) {
      query.salesmanId = filters.salesmanId;
    }

    if (filters.quotationNumber) {
      query.quotationNumber = { $regex: filters.quotationNumber, $options: 'i' };
    }

    if (filters.dateFrom || filters.dateTo) {
      query.quotationDate = {};
      if (filters.dateFrom) {
        query.quotationDate.$gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        query.quotationDate.$lte = new Date(filters.dateTo);
      }
    }

    if (filters.referenceNumber) {
      query.referenceNumber = { $regex: filters.referenceNumber, $options: 'i' };
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
    let sortOptions = { quotationDate: -1, quotationNumber: -1 };
    if (pagination.sortBy) {
      sortOptions = {};
      const sortField = pagination.sortBy;
      const sortOrder = pagination.sortOrder === 'asc' ? 1 : -1;
      sortOptions[sortField] = sortOrder;
    }

    // Execute query
    const quotations = await Quotation.find(query)
      .populate('customerId', 'name code town phone email')
      .populate('salesmanId', 'name code')
      .populate('createdBy', 'name email')
      .populate('convertedInvoiceId', 'invoiceNumber')
      .populate('convertedOrderId', 'orderNumber')
      .sort(sortOptions)
      .skip(skip)
      .limit(limit);

    const total = await Quotation.countDocuments(query);

    return {
      data: quotations,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get quotation by ID
   * @param {string} id - Quotation ID
   * @returns {Promise<Object>} Quotation
   */
  async getQuotationById(id) {
    const quotation = await Quotation.findOne({
      _id: id,
      isDeleted: false,
    })
      .populate('customerId', 'name code town phone email address creditLimit currentBalance')
      .populate('salesmanId', 'name code phone')
      .populate('items.itemId', 'name code company packing retailPrice tradePrice')
      .populate('createdBy', 'name email')
      .populate('convertedInvoiceId', 'invoiceNumber status')
      .populate('convertedOrderId', 'orderNumber status')
      .exec();

    if (!quotation) {
      throw new AppError('Quotation not found', 404);
    }

    return quotation;
  }

  /**
   * Update quotation
   * @param {string} id - Quotation ID
   * @param {Object} updates - Update data
   * @param {string} userId - User updating the quotation
   * @returns {Promise<Object>} Updated quotation
   */
  async updateQuotation(id, updates, userId) {
    const quotation = await this.getQuotationById(id);

    // Only draft quotations can be updated
    if (quotation.status !== 'draft') {
      throw new AppError('Only draft quotations can be updated', 400);
    }

    // If items are being updated, reprocess them
    if (updates.items) {
      updates.items = await this.processQuotationItems(updates.items);
    }

    // Update validity period if changed
    if (updates.validityPeriod && updates.validityPeriod !== quotation.validityPeriod) {
      const validUntil = new Date(quotation.quotationDate);
      if (updates.validityPeriod === 'One Month') {
        validUntil.setDate(validUntil.getDate() + 30);
      } else {
        const daysMatch = updates.validityPeriod.match(/(\d+)\s*days?/i);
        if (daysMatch) {
          validUntil.setDate(validUntil.getDate() + parseInt(daysMatch[1]));
        } else {
          validUntil.setDate(validUntil.getDate() + 30);
        }
      }
      updates.validUntil = validUntil;
    }

    // Update quotation
    const updatedQuotation = await Quotation.findByIdAndUpdate(
      id,
      {
        ...updates,
        updatedAt: new Date(),
      },
      { new: true, runValidators: true },
    );

    return this.getQuotationById(updatedQuotation._id);
  }

  /**
   * Delete quotation
   * @param {string} id - Quotation ID
   * @param {string} userId - User deleting the quotation
   * @returns {Promise<boolean>} True if deleted
   */
  async deleteQuotation(id, userId) {
    const quotation = await this.getQuotationById(id);

    // Only draft quotations can be deleted
    if (quotation.status !== 'draft') {
      throw new AppError('Only draft quotations can be deleted', 400);
    }

    // Soft delete
    await Quotation.findByIdAndUpdate(id, { isDeleted: true });
    return true;
  }

  /**
   * Mark quotation as sent
   * @param {string} id - Quotation ID
   * @param {string} userId - User marking as sent
   * @returns {Promise<Object>} Updated quotation
   */
  async markAsSent(id, userId) {
    const quotation = await this.getQuotationById(id);

    if (quotation.status !== 'draft') {
      throw new AppError('Only draft quotations can be marked as sent', 400);
    }

    const updatedQuotation = await Quotation.findByIdAndUpdate(
      id,
      {
        status: 'sent',
        updatedAt: new Date(),
      },
      { new: true },
    );

    return this.getQuotationById(updatedQuotation._id);
  }

  /**
   * Convert quotation to sales invoice
   * @param {string} id - Quotation ID
   * @param {string} userId - User converting the quotation
   * @param {Object} additionalData - Additional invoice data
   * @returns {Promise<Object>} Created invoice
   */
  async convertToInvoice(id, userId, additionalData = {}) {
    const quotation = await this.getQuotationById(id);

    // Check if already converted
    if (quotation.status === 'converted' && quotation.convertedInvoiceId) {
      throw new AppError('Quotation has already been converted to an invoice', 400);
    }

    // Prepare invoice items from quotation items
    const invoiceItems = quotation.items.map((item) => ({
      itemId: item.itemId._id || item.itemId,
      warehouseId: additionalData.warehouseId, // Must be provided
      boxQty: Math.floor(item.quantity / (item.boxPacking || 1)),
      unitQty: item.quantity % (item.boxPacking || 1),
      boxTP: item.unitTP * (item.boxPacking || 1),
      unitTP: item.unitTP || item.unitPrice,
      discount1Percent: item.discount || 0,
      discount2Percent: 0,
      scheme1Qty: 0,
      scheme2Qty: 0,
      advanceTaxRate: additionalData.advanceTaxRate || 0.5,
    }));

    // Create invoice data
    const invoiceData = {
      customerId: quotation.customerId._id || quotation.customerId,
      salesmanId: quotation.salesmanId?._id || quotation.salesmanId,
      items: invoiceItems,
      creditDays: additionalData.creditDays || 0,
      advanceTaxRate: additionalData.advanceTaxRate || 0.5,
      taxInvoiceType: additionalData.taxInvoiceType || 'normal',
      otherTitle: additionalData.otherTitle,
      memoNo: quotation.quotationNumber,
      poReference: quotation.referenceNumber || quotation.customerReference,
      detailNote: `Converted from Quotation ${quotation.quotationNumber}${quotation.notes ? ` - ${quotation.notes}` : ''}`,
      warrantyInfo: additionalData.warrantyInfo,
      dimensionId: additionalData.dimensionId,
      salesType: 'new',
      status: additionalData.autoConfirm ? 'confirmed' : 'draft',
    };

    // Create the invoice
    const invoice = await salesInvoiceService.createInvoice(invoiceData, userId);

    // Update quotation status
    await Quotation.findByIdAndUpdate(id, {
      status: 'converted',
      convertedInvoiceId: invoice._id,
      convertedAt: new Date(),
    });

    return invoice;
  }

  /**
   * Convert quotation to e-order
   * @param {string} id - Quotation ID
   * @param {string} userId - User converting the quotation
   * @param {Object} additionalData - Additional order data
   * @returns {Promise<Object>} Created e-order
   */
  async convertToOrder(id, userId, additionalData = {}) {
    const quotation = await this.getQuotationById(id);

    // Check if already converted to order
    if (quotation.status === 'converted' && quotation.convertedOrderId) {
      throw new AppError('Quotation has already been converted to an e-order', 400);
    }

    // Prepare order items from quotation items
    const orderItems = quotation.items.map((item) => ({
      itemId: item.itemId._id || item.itemId,
      itemName: item.itemName,
      formulaSize: item.itemName, // Use item name as formula size
      boxQuantity: Math.floor(item.quantity / (item.boxPacking || 1)),
      unitQuantity: item.quantity % (item.boxPacking || 1),
      scheme1Quantity: 0,
      scheme2Quantity: 0,
      unitPrice: item.unitRateOffered || item.unitTP || item.unitPrice,
      discount: item.discount || 0,
      gstRate: item.gstRate || 18,
      boxPacking: item.boxPacking || 1,
    }));

    // Create order data
    const orderData = {
      customerId: quotation.customerId._id || quotation.customerId,
      salesmanId: quotation.salesmanId?._id || quotation.salesmanId,
      routeId: additionalData.routeId,
      items: orderItems,
      notes: `Converted from Quotation ${quotation.quotationNumber}${quotation.notes ? ` - ${quotation.notes}` : ''}`,
      createdBy: userId,
    };

    // Create the e-order
    const order = await eOrderService.createOrder(orderData);

    // Update quotation status
    await Quotation.findByIdAndUpdate(id, {
      status: 'converted',
      convertedOrderId: order._id,
      convertedOrderAt: new Date(),
    });

    return order;
  }

  /**
   * Mark expired quotations
   * @returns {Promise<Object>} Result with count of expired quotations
   */
  async markExpiredQuotations() {
    const now = new Date();

    const result = await Quotation.updateMany(
      {
        status: { $in: ['draft', 'sent'] },
        validUntil: { $lt: now },
        isDeleted: false,
      },
      {
        status: 'expired',
      },
    );

    return {
      expiredCount: result.modifiedCount,
      message: `Marked ${result.modifiedCount} quotations as expired`,
    };
  }

  /**
   * Get quotation summary statistics
   * @param {Object} filters - Filter criteria
   * @returns {Promise<Object>} Summary statistics
   */
  async getQuotationSummary(filters = {}) {
    const query = { isDeleted: false };

    if (filters.dateFrom || filters.dateTo) {
      query.quotationDate = {};
      if (filters.dateFrom) {
        query.quotationDate.$gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        query.quotationDate.$lte = new Date(filters.dateTo);
      }
    }

    const quotations = await Quotation.find(query).lean();

    const summary = {
      totalQuotations: quotations.length,
      draftQuotations: quotations.filter((q) => q.status === 'draft').length,
      sentQuotations: quotations.filter((q) => q.status === 'sent').length,
      approvedQuotations: quotations.filter((q) => q.status === 'approved').length,
      convertedQuotations: quotations.filter((q) => q.status === 'converted').length,
      expiredQuotations: quotations.filter((q) => q.status === 'expired').length,
      cancelledQuotations: quotations.filter((q) => q.status === 'cancelled').length,
      totalValue: quotations.reduce((sum, q) => sum + (q.grandTotal || 0), 0),
      totalItems: quotations.reduce((sum, q) => sum + (q.items?.length || 0), 0),
    };

    return summary;
  }
}

module.exports = new QuotationService();
