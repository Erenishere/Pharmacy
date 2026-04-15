const Batch = require('../models/Batch');
const inventoryService = require('./inventoryService');

/**
 * Batch Creation Service
 * Requirement 2: Batch Creation on Purchase
 * Handles automatic batch creation when confirming purchase invoices
 */
class BatchCreationService {
  /**
   * Create batches from purchase invoice items
   * Requirement 2.1: Create batch records when confirming purchase invoice
   * @param {Object} invoice - Purchase invoice object
   * @param {string} userId - User ID performing the operation
   * @returns {Promise<Array>} Created batches
   */
  async createBatchesFromInvoice(invoice, userId) {
    const batches = [];
    const itemsWithBatches = invoice.items.filter(
      (item) => item.batchInfo && item.batchInfo.batchNumber,
    );

    for (const item of itemsWithBatches) {
      const batch = await this.createOrUpdateBatch({
        itemId: item.itemId,
        batchNumber: item.batchInfo.batchNumber,
        manufacturingDate: item.batchInfo.manufacturingDate,
        expiryDate: item.batchInfo.expiryDate,
        quantity: this.calculateTotalQuantity(item),
        unitCost: this.calculateUnitCost(item),
        warehouseId: item.warehouseId || invoice.warehouseId,
        supplierId: invoice.supplierId,
        invoiceId: invoice._id,
        userId,
      });
      batches.push(batch);
    }

    return batches;
  }

  /**
   * Create or update a batch record
   * Requirement 2.11: Add quantity to existing batch if it exists
   * @param {Object} batchData - Batch data
   * @returns {Promise<Object>} Created or updated batch
   */
  async createOrUpdateBatch(batchData) {
    const {
      itemId,
      batchNumber,
      manufacturingDate,
      expiryDate,
      quantity,
      unitCost,
      warehouseId,
      supplierId,
      invoiceId,
      userId,
    } = batchData;

    const existingBatch = await Batch.findOne({
      batchNumber: new RegExp(`^${batchNumber}$`, 'i'),
      item: itemId,
      warehouse: warehouseId,
    });

    if (existingBatch) {
      return await this.addToExistingBatch(existingBatch, quantity, unitCost, invoiceId, userId);
    }

    return await this.createNewBatch(batchData);
  }

  /**
   * Create a new batch record
   * Requirement 2.2-2.10: Batch creation with all required fields
   * @param {Object} batchData - Batch data
   * @returns {Promise<Object>} Created batch
   */
  async createNewBatch(batchData) {
    const {
      itemId,
      batchNumber,
      manufacturingDate,
      expiryDate,
      quantity,
      unitCost,
      warehouseId,
      supplierId,
      invoiceId,
      userId,
    } = batchData;

    const batch = new Batch({
      batchNumber: batchNumber.toUpperCase(),
      item: itemId,
      warehouse: warehouseId,
      supplier: supplierId,
      manufacturingDate: new Date(manufacturingDate),
      expiryDate: new Date(expiryDate),
      quantity,
      remainingQuantity: quantity,
      unitCost,
      totalCost: quantity * unitCost,
      status: 'active',
      referenceNumber: invoiceId?.toString(),
      referenceType: 'PURCHASE_ORDER',
      createdBy: userId,
    });

    await batch.save();

    return batch;
  }

  /**
   * Add quantity to existing batch
   * @param {Object} existingBatch - Existing batch document
   * @param {number} quantityToAdd - Quantity to add
   * @param {number} unitCost - Unit cost for average calculation
   * @param {string} invoiceId - Reference invoice ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Updated batch
   */
  async addToExistingBatch(existingBatch, quantityToAdd, unitCost, invoiceId, userId) {
    const newTotalCost = existingBatch.totalCost + quantityToAdd * unitCost;
    const newQuantity = existingBatch.quantity + quantityToAdd;
    const newRemainingQuantity = existingBatch.remainingQuantity + quantityToAdd;

    existingBatch.quantity = newQuantity;
    existingBatch.remainingQuantity = newRemainingQuantity;
    existingBatch.totalCost = newTotalCost;
    existingBatch.unitCost = newTotalCost / newQuantity;
    existingBatch.updatedBy = userId;

    if (existingBatch.referenceNumber) {
      existingBatch.referenceNumber += `,${invoiceId?.toString()}`;
    } else {
      existingBatch.referenceNumber = invoiceId?.toString();
    }

    await existingBatch.save();

    return existingBatch;
  }

  /**
   * Validate batch data
   * Requirement 2.3-2.5: Validate manufacturing date and expiry date
   * @param {Object} batchData - Batch data to validate
   * @returns {Object} Validation result
   */
  validateBatchData(batchData) {
    const { manufacturingDate, expiryDate, batchNumber } = batchData;
    const errors = [];

    // Requirement 2.2: Batch number is required
    if (!batchNumber || batchNumber.trim().length === 0) {
      errors.push('Batch number is required');
    }

    // Requirement 2.3: Manufacturing date is required
    if (!manufacturingDate) {
      errors.push('Manufacturing date is required');
    }

    // Requirement 2.4: Expiry date is required
    if (!expiryDate) {
      errors.push('Expiry date is required');
    }

    // Requirement 2.5: Expiry date must be after manufacturing date
    if (manufacturingDate && expiryDate) {
      const mfgDate = new Date(manufacturingDate);
      const expDate = new Date(expiryDate);

      if (expDate <= mfgDate) {
        errors.push('Expiry date must be after manufacturing date');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Check if batch number already exists
   * Requirement 2.12: Check for duplicate batch
   * @param {string} batchNumber - Batch number to check
   * @param {string} itemId - Item ID
   * @param {string} warehouseId - Warehouse ID
   * @returns {Promise<boolean>} True if exists
   */
  async checkDuplicateBatch(batchNumber, itemId, warehouseId) {
    const count = await Batch.countDocuments({
      batchNumber: new RegExp(`^${batchNumber}$`, 'i'),
      item: itemId,
      warehouse: warehouseId,
    });
    return count > 0;
  }

  /**
   * Add quantity to an existing batch
   * Requirement 2.11: Add quantity to existing batch
   * @param {string} batchNumber - Batch number
   * @param {number} quantity - Quantity to add
   * @param {Object} options - Additional options
   * @param {string} options.itemId - Item ID
   * @param {string} options.warehouseId - Warehouse ID
   * @param {number} options.unitCost - Unit cost for average calculation
   * @param {string} options.invoiceId - Reference invoice ID
   * @param {string} options.userId - User ID
   * @returns {Promise<Object>} Updated batch
   */
  async addToBatch(batchNumber, quantity, options = {}) {
    const {
      itemId, warehouseId, unitCost, invoiceId, userId,
    } = options;

    const existingBatch = await Batch.findOne({
      batchNumber: new RegExp(`^${batchNumber}$`, 'i'),
      item: itemId,
      warehouse: warehouseId,
    });

    if (!existingBatch) {
      throw new Error(`Batch ${batchNumber} not found for the specified item and warehouse`);
    }

    return await this.addToExistingBatch(existingBatch, quantity, unitCost, invoiceId, userId);
  }

  /**
   * Calculate total unit quantity from box and unit quantities
   * Requirement 1.14: Auto-calculate total unit quantity
   * @param {Object} item - Invoice item
   * @returns {number} Total unit quantity
   */
  calculateTotalQuantity(item) {
    const boxPacking = item.boxPacking || 1;
    const boxQty = item.boxQuantity || item.boxQty || 0;
    const unitQty = item.unitQuantity || item.unitQty || 0;
    return boxQty * boxPacking + unitQty;
  }

  /**
   * Calculate unit cost from box and unit rates
   * @param {Object} item - Invoice item
   * @returns {number} Unit cost
   */
  calculateUnitCost(item) {
    const boxPacking = item.boxPacking || 1;
    const boxTP = item.boxRate || item.boxTP || 0;
    const unitTP = item.unitRate || item.unitTP || 0;

    const boxPackingValue = boxPacking * boxTP;
    if (boxPackingValue > 0) {
      return boxPackingValue / boxPacking;
    }
    return unitTP;
  }

  /**
   * Reverse batches for cancelled invoice
   * Requirement 2.12: Batch is available for sales transactions
   * @param {Object} invoice - Cancelled invoice
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Updated batches
   */
  async reverseBatchesFromInvoice(invoice, userId) {
    const batches = [];
    const itemsWithBatches = invoice.items.filter(
      (item) => item.batchInfo && item.batchInfo.batchNumber,
    );

    for (const item of itemsWithBatches) {
      const existingBatch = await Batch.findOne({
        batchNumber: new RegExp(`^${item.batchInfo.batchNumber}$`, 'i'),
        item: item.itemId,
      });

      if (existingBatch) {
        const quantityToRemove = this.calculateTotalQuantity(item);
        existingBatch.remainingQuantity -= quantityToRemove;
        existingBatch.quantity -= quantityToRemove;
        existingBatch.updatedBy = userId;

        if (existingBatch.remainingQuantity <= 0) {
          existingBatch.status = 'depleted';
          existingBatch.remainingQuantity = 0;
        }

        await existingBatch.save();
        batches.push(existingBatch);
      }
    }

    return batches;
  }
}

module.exports = new BatchCreationService();
