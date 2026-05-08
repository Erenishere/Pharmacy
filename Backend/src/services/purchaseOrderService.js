const PurchaseOrder = require('../models/PurchaseOrder');
const Supplier = require('../models/Supplier');
const Item = require('../models/Item');

const getObjectId = (value) => value?._id || value;
const getTotalUnitQuantity = (item) => ((item.boxQty || 0) * (item.boxPacking || 1)) + (item.unitQty || 0);
const getUnitPurchasePrice = (item) => {
  if (item.unitTP !== undefined && item.unitTP > 0) {
    return item.unitTP;
  }
  if (item.boxTP !== undefined && item.boxTP > 0) {
    return item.boxTP / (item.boxPacking || 1);
  }
  return 0;
};

/**
 * Purchase Order Service
 * Requirements 4.1-4.18: Complete Purchase Order Management
 * Task 6.1: Create purchaseOrderService.js
 */
class PurchaseOrderService {
  /**
   * Generate unique PO number
   * Requirement 4.1: Auto-generate unique PO number
   * @returns {Promise<string>} Generated PO number
   */
  async generatePONumber() {
    return await PurchaseOrder.generatePONumber();
  }

  /**
   * Create a new purchase order
   * Requirements 4.2-4.7: PO creation with items and calculations
   * @param {Object} poData - Purchase order data
   * @param {string} userId - User ID creating the PO
   * @returns {Promise<Object>} Created purchase order
   */
  async createPurchaseOrder(poData, userId) {
    const data = { ...poData, createdBy: userId };
    const {
      poNumber, supplierId, poDate, items, notes, billNo,
    } = data;

    // Validate supplier exists
    const supplier = await Supplier.findById(supplierId);
    if (!supplier) {
      throw new Error('Supplier not found');
    }

    // Validate all items exist
    const itemIds = items.map((item) => item.itemId);
    const existingItems = await Item.find({ _id: { $in: itemIds } });
    if (existingItems.length !== itemIds.length) {
      throw new Error('One or more items not found');
    }

    // Auto-generate PO number if not provided
    const finalPONumber = poNumber || await this.generatePONumber();

    // Process items - calculations handled by model pre-save hook
    const processedItems = items.map((item) => ({
      itemId: item.itemId,
      itemName: item.itemName,
      boxPacking: item.boxPacking || 1,
      boxQty: item.boxQty || 0,
      unitQty: item.unitQty || 0,
      boxTP: item.boxTP || 0,
      unitTP: item.unitTP || 0,
      discount: item.discount || 0,
      receivedQuantity: 0,
      pendingQuantity: (item.boxQty || 0) * (item.boxPacking || 1) + (item.unitQty || 0),
    }));

    // Create purchase order (Requirement 4.8: Set status to Draft)
    const purchaseOrder = await PurchaseOrder.create({
      poNumber: finalPONumber,
      supplierId,
      supplierName: supplier.name,
      supplierTown: supplier.town,
      poDate: poDate || new Date(),
      billNo,
      items: processedItems,
      notes,
      createdBy: userId,
      status: 'draft',
    });

    return await PurchaseOrder.findById(purchaseOrder._id)
      .populate('supplierId', 'name code contactPerson phone email')
      .populate('items.itemId', 'name code unit')
      .populate('createdBy', 'username email')
      .exec();
  }

  /**
   * Get all purchase orders with optional filters
   * Requirements 4.16: Search and filter by supplier, status, date
   * @param {Object} filters - Query filters
   * @param {Object} pagination - Pagination options
   * @returns {Promise<Object>} List of purchase orders with pagination
   */
  async getPurchaseOrders(filters = {}, pagination = {}) {
    const {
      status,
      supplierId,
      startDate,
      endDate,
    } = filters;

    const {
      page = 1,
      limit = 50,
      sort = '-createdAt',
    } = pagination;

    const query = { isDeleted: false };

    if (status) {
      query.status = status;
    }

    if (supplierId) {
      query.supplierId = supplierId;
    }

    if (startDate || endDate) {
      query.poDate = {};
      if (startDate) {
        query.poDate.$gte = new Date(startDate);
      }
      if (endDate) {
        query.poDate.$lte = new Date(endDate);
      }
    }

    const skip = (page - 1) * limit;

    const [purchaseOrders, total] = await Promise.all([
      PurchaseOrder.find(query)
        .populate('supplierId', 'name code contactPerson phone')
        .populate('items.itemId', 'name code unit')
        .populate('createdBy', 'username email')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      PurchaseOrder.countDocuments(query),
    ]);

    return {
      purchaseOrders,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get purchase order by ID
   * @param {string} id - Purchase order ID
   * @returns {Promise<Object>} Purchase order
   */
  async getPurchaseOrderById(id) {
    const purchaseOrder = await PurchaseOrder.findOne({
      _id: id,
      isDeleted: false,
    })
      .populate('supplierId', 'name code contactPerson phone email address city')
      .populate('items.itemId', 'name code unit purchasePrice')
      .populate('createdBy', 'username email')
      .exec();

    if (!purchaseOrder) {
      throw new Error('Purchase order not found');
    }

    return purchaseOrder;
  }

  /**
   * Approve a purchase order (legacy method, kept for compatibility)
   * @param {string} id - Purchase order ID
   * @param {string} approvedBy - User ID who approved
   * @returns {Promise<Object>} Approved purchase order
   */
  async approvePurchaseOrder(id, approvedBy) {
    return this.confirmPurchaseOrder(id, approvedBy);
  }

  /**
   * Send purchase order to supplier
   * Requirement 4.9: Update status to Sent
   * @param {string} id - Purchase order ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Updated purchase order
   */
  async sendPurchaseOrder(id, userId) {
    const purchaseOrder = await PurchaseOrder.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!purchaseOrder) {
      throw new Error('Purchase order not found');
    }

    if (purchaseOrder.status !== 'draft') {
      throw new Error(`Cannot send purchase order with status: ${purchaseOrder.status}. Only draft orders can be sent.`);
    }

    purchaseOrder.status = 'sent';
    purchaseOrder.sentAt = new Date();

    await purchaseOrder.save();

    return await this.getPurchaseOrderById(id);
  }

  /**
   * Confirm purchase order by supplier
   * Requirement 4.10: Update status to Confirmed
   * @param {string} id - Purchase order ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Updated purchase order
   */
  async confirmPurchaseOrder(id, userId) {
    const purchaseOrder = await PurchaseOrder.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!purchaseOrder) {
      throw new Error('Purchase order not found');
    }

    if (purchaseOrder.status === 'confirmed') {
      throw new Error('Purchase order is already confirmed');
    }

    if (purchaseOrder.status === 'cancelled') {
      throw new Error('Cannot confirm cancelled purchase order');
    }

    purchaseOrder.status = 'confirmed';
    purchaseOrder.confirmedAt = new Date();

    await purchaseOrder.save();

    return await this.getPurchaseOrderById(id);
  }

  /**
   * Mark purchase order as received (goods received)
   * @param {string} id - Purchase order ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Updated purchase order
   */
  async receivePurchaseOrder(id, userId) {
    const purchaseOrder = await PurchaseOrder.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!purchaseOrder) {
      throw new Error('Purchase order not found');
    }

    purchaseOrder.status = 'received';
    purchaseOrder.receivedAt = new Date();

    await purchaseOrder.save();

    return await this.getPurchaseOrderById(id);
  }

  /**
   * Cancel purchase order
   * @param {string} id - Purchase order ID
   * @param {string} userId - User ID
   * @param {string} reason - Cancellation reason
   * @returns {Promise<Object>} Cancelled purchase order
   */
  async cancelPurchaseOrder(id, userId, reason) {
    const purchaseOrder = await PurchaseOrder.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!purchaseOrder) {
      throw new Error('Purchase order not found');
    }

    if (purchaseOrder.status === 'cancelled') {
      throw new Error('Purchase order is already cancelled');
    }

    if (purchaseOrder.convertedInvoiceId) {
      throw new Error('Cannot cancel purchase order that has been converted to invoice');
    }

    purchaseOrder.status = 'cancelled';
    purchaseOrder.cancelledAt = new Date();
    purchaseOrder.cancelledBy = userId;
    purchaseOrder.cancellationReason = reason;

    await purchaseOrder.save();

    return await this.getPurchaseOrderById(id);
  }

  /**
   * Update purchase order
   * Requirements 4.2-4.7: Update PO details
   * @param {string} id - Purchase order ID
   * @param {Object} updates - Update data
   * @param {string} userId - User ID performing the update
   * @returns {Promise<Object>} Updated purchase order
   */
  async updatePurchaseOrder(id, updates, userId) {
    const purchaseOrder = await PurchaseOrder.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!purchaseOrder) {
      throw new Error('Purchase order not found');
    }

    // Only draft and sent orders can be updated
    if (!['draft', 'sent'].includes(purchaseOrder.status)) {
      throw new Error(`Cannot update purchase order with status: ${purchaseOrder.status}`);
    }

    // Update allowed fields
    const allowedUpdates = ['poDate', 'items', 'notes', 'billNo', 'supplierId'];
    allowedUpdates.forEach((field) => {
      if (updates[field] !== undefined) {
        purchaseOrder[field] = updates[field];
      }
    });

    // If supplier changed, update supplier info
    if (updates.supplierId) {
      const supplier = await Supplier.findById(updates.supplierId);
      if (!supplier) {
        throw new Error('Supplier not found');
      }
      purchaseOrder.supplierName = supplier.name;
      purchaseOrder.supplierTown = supplier.town;
    }

    // Recalculate totals if items changed (handled by pre-save hook)
    if (updates.items) {
      purchaseOrder.items = updates.items.map((item) => ({
        itemId: item.itemId,
        itemName: item.itemName,
        boxPacking: item.boxPacking || 1,
        boxQty: item.boxQty || 0,
        unitQty: item.unitQty || 0,
        boxTP: item.boxTP || 0,
        unitTP: item.unitTP || 0,
        discount: item.discount || 0,
        receivedQuantity: item.receivedQuantity || 0,
      }));
    }

    await purchaseOrder.save();

    return await this.getPurchaseOrderById(id);
  }

  /**
   * Delete (soft delete) a purchase order
   * @param {string} id - Purchase order ID
   * @returns {Promise<Object>} Deleted purchase order
   */
  async deletePurchaseOrder(id) {
    const purchaseOrder = await PurchaseOrder.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!purchaseOrder) {
      throw new Error('Purchase order not found');
    }

    if (purchaseOrder.status === 'approved') {
      throw new Error('Cannot delete approved purchase order');
    }

    purchaseOrder.isDeleted = true;
    await purchaseOrder.save();

    return { message: 'Purchase order deleted successfully' };
  }

  /**
   * Convert purchase order to invoice
   * Requirements 4.11-4.14: Convert PO to invoice with auto-fill
   * @param {string} id - Purchase order ID
   * @param {string} userId - User ID performing the conversion
   * @param {Object} additionalData - Additional invoice data (optional)
   * @returns {Promise<Object>} Created invoice
   */
  async convertToInvoice(id, userId, additionalData = {}) {
    // Get purchase order
    const purchaseOrder = await this.getPurchaseOrderById(id);

    // Requirement 4.11: Only confirmed POs can be converted
    if (purchaseOrder.status !== 'confirmed') {
      throw new Error('Purchase order must be confirmed before conversion to invoice');
    }

    // Check if already converted
    if (purchaseOrder.convertedInvoiceId) {
      throw new Error('Purchase order has already been converted to invoice');
    }

    // Import Invoice model and purchaseInvoiceService
    const purchaseInvoiceService = require('./purchaseInvoiceService');

    // Requirement 4.12: Auto-fill all PO details
    const invoiceData = {
      invoiceType: 'purchase',
      supplierId: getObjectId(purchaseOrder.supplierId),
      invoiceDate: additionalData.invoiceDate || new Date(),
      dueDate: additionalData.dueDate,
      supplierBillNo: additionalData.supplierBillNo || `PO-${purchaseOrder.poNumber}`,
      poNumber: purchaseOrder.poNumber,
      poId: purchaseOrder._id,

      // Map PO items to invoice items
      items: purchaseOrder.items.map((item) => {
        const itemId = getObjectId(item.itemId);
        const itemIdKey = itemId.toString();
        return {
          itemId,
          itemName: item.itemName,
          quantity: getTotalUnitQuantity(item),
          unitPrice: getUnitPurchasePrice(item),
          boxPacking: item.boxPacking,
          boxQty: item.boxQty,
          unitQty: item.unitQty,
          boxTP: item.boxTP,
          unitTP: item.unitTP,
          discount: item.discount,
          warehouseId: additionalData.warehouseId || item.warehouseId,
          batchInfo: additionalData.batchInfoByItemId?.[itemIdKey] || additionalData.batchInfo || item.batchInfo || {},
        };
      }),

      notes: additionalData.notes || `Converted from PO: ${purchaseOrder.poNumber}`,
      createdBy: userId,
    };

    // Add optional fields if provided
    if (additionalData.dimension) {
      invoiceData.dimension = additionalData.dimension;
    }
    if (additionalData.biltyNo) {
      invoiceData.biltyNo = additionalData.biltyNo;
    }
    if (additionalData.biltyDate) {
      invoiceData.biltyDate = additionalData.biltyDate;
    }
    if (additionalData.transportCompany) {
      invoiceData.transportCompany = additionalData.transportCompany;
    }
    if (additionalData.transportCharges) {
      invoiceData.transportCharges = additionalData.transportCharges;
    }
    if (additionalData.qualityControlNotes) {
      invoiceData.qualityControlNotes = additionalData.qualityControlNotes;
    }
    if (additionalData.goodsReceiptNumber) {
      invoiceData.goodsReceiptNumber = additionalData.goodsReceiptNumber;
    }

    // Create purchase invoice
    const invoice = await purchaseInvoiceService.createPurchaseInvoice(invoiceData, userId);

    // Requirement 4.13: Update PO status to Received
    purchaseOrder.status = 'received';
    purchaseOrder.receivedAt = new Date();

    // Requirement 4.14: Link invoice to PO
    purchaseOrder.convertedInvoiceId = invoice._id;
    purchaseOrder.convertedAt = new Date();

    await purchaseOrder.save();

    return invoice;
  }

  /**
   * Convert purchase order to invoice (legacy method for backward compatibility)
   * @deprecated Use convertToInvoice instead
   */
  async convertPOToInvoice(poId, additionalData = {}) {
    return this.convertToInvoice(poId, additionalData.createdBy || additionalData.userId, additionalData);
  }

  /**
   * Get outstanding purchase orders
   * Requirement 4.18: Outstanding PO report
   * @param {Object} filters - Filter criteria
   * @returns {Promise<Object>} Outstanding purchase orders with summary
   */
  async getOutstandingPOs(filters = {}) {
    const { supplierId, startDate, endDate } = filters;

    const query = {
      isDeleted: false,
      status: { $in: ['sent', 'confirmed'] },
      fulfillmentStatus: { $in: ['pending', 'partial'] },
    };

    if (supplierId) {
      query.supplierId = supplierId;
    }

    if (startDate || endDate) {
      query.poDate = {};
      if (startDate) {
        query.poDate.$gte = new Date(startDate);
      }
      if (endDate) {
        query.poDate.$lte = new Date(endDate);
      }
    }

    const purchaseOrders = await PurchaseOrder.find(query)
      .populate('supplierId', 'name code contactPerson phone email')
      .populate('items.itemId', 'name code unit')
      .sort({ poDate: -1 })
      .lean();

    const outstandingPOs = purchaseOrders.map((po) => ({
      poNumber: po.poNumber,
      poDate: po.poDate,
      supplier: {
        id: po.supplierId._id,
        name: po.supplierId.name,
        code: po.supplierId.code,
        contactPerson: po.supplierId.contactPerson,
        phone: po.supplierId.phone,
      },
      totalAmount: po.totalAmount,
      status: po.status,
      fulfillmentStatus: po.fulfillmentStatus,
      items: po.items.map((item) => ({
        itemId: item.itemId._id,
        itemName: item.itemId.name,
        itemCode: item.itemId.code,
        unit: item.itemId.unit,
        orderedQty: (item.boxQty || 0) + (item.unitQty || 0),
        receivedQty: item.receivedQuantity || 0,
        pendingQty: item.pendingQuantity || 0,
        unitTP: item.unitTP || 0,
        netAmount: item.netAmount || 0,
      })),
      pendingAmount: po.items.reduce((sum, item) => sum + (item.pendingQuantity || 0) * (item.unitTP || 0), 0),
    }));

    const summary = {
      totalPOs: outstandingPOs.length,
      totalPendingAmount: outstandingPOs.reduce((sum, po) => sum + po.pendingAmount, 0),
      partiallyFulfilled: outstandingPOs.filter((po) => po.fulfillmentStatus === 'partial').length,
      fullyPending: outstandingPOs.filter((po) => po.fulfillmentStatus === 'pending').length,
    };

    return {
      outstandingPOs,
      summary,
    };
  }
}

module.exports = new PurchaseOrderService();
