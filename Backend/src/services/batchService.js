const batchRepository = require('../repositories/batchRepository');
const itemService = require('./itemService');
const inventoryService = require('./inventoryService');

class BatchService {
  /**
   * Create a new batch
   * @param {Object} batchData - Batch data
   * @returns {Promise<Object>} Created batch
   */
  async createBatch(batchData) {
    const {
      itemId,
      batchNumber,
      quantity,
      unitCost,
      locationId,
      ...rest
    } = batchData;

    // Validate required fields
    if (!itemId || !batchNumber || quantity === undefined || unitCost === undefined) {
      throw new Error('Missing required fields: itemId, batchNumber, quantity, and unitCost are required');
    }

    // Verify item exists
    await itemService.getItemById(itemId);

    // Check if batch number already exists for this item
    const exists = await batchRepository.findByBatchNumber(batchNumber, itemId);
    if (exists) {
      throw new Error(`Batch number ${batchNumber} already exists for this item`);
    }

    // Create batch
    const batch = await batchRepository.create({
      ...rest,
      item: itemId,
      batchNumber: batchNumber.toUpperCase(),
      quantity,
      remainingQuantity: quantity,
      unitCost,
      totalCost: quantity * unitCost,
      location: locationId,
      warehouse: locationId,
      status: 'active',
    });

    // Update inventory if location is provided
    if (locationId) {
      await inventoryService.addStock(itemId, locationId, quantity, {
        batchId: batch._id,
        referenceId: `BATCH_${batch.batchNumber}`,
        notes: `Initial stock from batch ${batchNumber}`,
        userId: batch.createdBy,
      });
    }

    return this.getBatchById(batch._id);
  }

  /**
   * Get batch by ID
   * @param {string} id - Batch ID
   * @returns {Promise<Object>} Batch
   */
  async getBatchById(id, options = {}) {
    const batch = await batchRepository.findById(id, options);
    if (!batch) {
      throw new Error('Batch not found');
    }
    return batch;
  }

  /**
   * Get batch by batch number and item ID
   * @param {string} batchNumber - Batch number
   * @param {string} itemId - Item ID
   * @returns {Promise<Object>} Batch
   */
  async getBatchByNumber(batchNumber, itemId) {
    const batch = await batchRepository.findByBatchNumber(batchNumber, itemId);
    if (!batch) {
      throw new Error('Batch not found');
    }
    return batch;
  }

  /**
   * Get all batches with filtering and pagination
   * @param {Object} [filters] - Filter criteria
   * @param {Object} [pagination] - Pagination options
   * @returns {Promise<Object>} Object with batches array and pagination info
   */
  async getAllBatches(filters = {}, pagination = {}) {
    return batchRepository.findAll(filters, pagination);
  }

  /**
   * Update batch
   * @param {string} id - Batch ID
   * @param {Object} updateData - Update data
   * @returns {Promise<Object>} Updated batch
   */
  async updateBatch(id, updateData) {
    const batch = await this.getBatchById(id);

    // Prevent certain fields from being updated
    const {
      quantity, remainingQuantity, totalCost, ...safeUpdates
    } = updateData;

    // If unitCost is being updated, recalculate totalCost
    if (safeUpdates.unitCost !== undefined) {
      safeUpdates.totalCost = batch.quantity * safeUpdates.unitCost;
    }

    // If expiryDate is being updated, validate it
    if (safeUpdates.expiryDate) {
      const expiryDate = new Date(safeUpdates.expiryDate);
      if (isNaN(expiryDate.getTime())) {
        throw new Error('Invalid expiry date');
      }

      // If batch has manufacturingDate, ensure expiry is after manufacturing
      if (batch.manufacturingDate && expiryDate <= batch.manufacturingDate) {
        throw new Error('Expiry date must be after manufacturing date');
      }
    }

    // If manufacturingDate is being updated, validate it
    if (safeUpdates.manufacturingDate) {
      const manufacturingDate = new Date(safeUpdates.manufacturingDate);
      if (isNaN(manufacturingDate.getTime())) {
        throw new Error('Invalid manufacturing date');
      }

      // If batch has expiryDate, ensure manufacturing is before expiry
      if (batch.expiryDate && manufacturingDate >= batch.expiryDate) {
        throw new Error('Manufacturing date must be before expiry date');
      }
    }

    // Update batch
    const updatedBatch = await batchRepository.update(id, safeUpdates);

    // If location is being updated, adjust inventory
    if (safeUpdates.locationId && safeUpdates.locationId !== batch.location?.toString()) {
      // Remove from old location
      if (batch.location) {
        await inventoryService.removeStock(
          batch.item._id,
          batch.location,
          batch.remainingQuantity,
          {
            batchId: batch._id,
            referenceId: `BATCH_UPDATE_${batch._id}`,
            notes: `Location change from ${batch.location} to ${safeUpdates.locationId}`,
            userId: safeUpdates.updatedBy,
          },
        );
      }

      // Add to new location
      await inventoryService.addStock(
        batch.item._id,
        safeUpdates.locationId,
        batch.remainingQuantity,
        {
          batchId: batch._id,
          referenceId: `BATCH_UPDATE_${batch._id}`,
          notes: `Location change from ${batch.location || 'none'} to ${safeUpdates.locationId}`,
          userId: safeUpdates.updatedBy,
        },
      );
    }

    return updatedBatch;
  }

  /**
   * Delete batch
   * @param {string} id - Batch ID
   * @returns {Promise<Object>} Deletion result
   */
  async deleteBatch(id) {
    const batch = await this.getBatchById(id);

    // Check if batch has remaining quantity
    if (batch.remainingQuantity > 0) {
      throw new Error('Cannot delete batch with remaining quantity');
    }

    return batchRepository.delete(id);
  }

  /**
   * Get batches by item ID
   * @param {string} itemId - Item ID
   * @param {Object} [options] - Options
   * @returns {Promise<Array>} Array of batches
   */
  async getBatchesByItem(itemId, options = {}) {
    return batchRepository.findByItemId(itemId, options);
  }

  /**
   * Get batches by location ID
   * @param {string} locationId - Location ID
   * @param {Object} [options] - Options
   * @returns {Promise<Array>} Array of batches
   */
  async getBatchesByLocation(locationId, options = {}) {
    return batchRepository.findByLocationId(locationId, options);
  }

  /**
   * Get batches by supplier ID
   * @param {string} supplierId - Supplier ID
   * @param {Object} [options] - Options
   * @returns {Promise<Array>} Array of batches
   */
  async getBatchesBySupplier(supplierId, options = {}) {
    return batchRepository.findBySupplierId(supplierId, options);
  }

  /**
   * Get batches expiring soon
   * @param {Object} [options] - Options
   * @param {number} [options.days=30] - Number of days to check for expiry
   * @param {string} [options.locationId] - Filter by location ID
   * @returns {Promise<Array>} Array of batches expiring soon
   */
  async getExpiringBatches(options = {}) {
    const { days = 30, locationId } = options;
    return batchRepository.findExpiringSoon(days, { locationId });
  }

  /**
   * Get expired batches
   * @param {Object} [options] - Options
   * @param {string} [options.locationId] - Filter by location ID
   * @returns {Promise<Array>} Array of expired batches
   */
  async getExpiredBatches(options = {}) {
    const { locationId } = options;
    return batchRepository.findExpiredBatches({ locationId });
  }

  /**
   * Get expired items by warehouse
   * @param {string} warehouseId - Warehouse ID
   * @returns {Promise<Array>} Array of expired items with batch details grouped by item
   */
  async getExpiredItemsByWarehouse(warehouseId) {
    if (!warehouseId) {
      throw new Error('Warehouse ID is required');
    }

    const Batch = require('../models/Batch');
    return Batch.getExpiredItemsByWarehouse(warehouseId);
  }

  /**
   * Update batch quantity
   * @param {string} id - Batch ID
   * @param {number} quantity - Quantity to add (positive) or remove (negative)
   * @param {Object} [options] - Options
   * @returns {Promise<Object>} Updated batch
   */
  async updateBatchQuantity(id, quantity, options = {}) {
    const batch = await this.getBatchById(id);

    // If removing stock, check if enough is available
    if (quantity < 0 && Math.abs(quantity) > batch.remainingQuantity) {
      throw new Error('Insufficient quantity in batch');
    }

    // Update batch quantity
    await batchRepository.updateQuantity(id, quantity, options);

    // Update inventory if location is set
    if (batch.location) {
      if (quantity > 0) {
        await inventoryService.addStock(
          batch.item._id,
          batch.location,
          quantity,
          {
            batchId: batch._id,
            referenceId: options.referenceId,
            notes: options.notes || `Batch quantity updated by ${quantity}`,
            userId: options.userId,
          },
        );
      } else {
        await inventoryService.removeStock(
          batch.item._id,
          batch.location,
          Math.abs(quantity),
          {
            batchId: batch._id,
            referenceId: options.referenceId,
            notes: options.notes || `Batch quantity updated by ${quantity}`,
            userId: options.userId,
          },
        );
      }
    }

    return this.getBatchById(id, options);
  }

  /**
   * Get batch statistics
   * @param {Object} [filters] - Filter criteria
   * @returns {Promise<Object>} Batch statistics
   */
  async getBatchStatistics(filters = {}) {
    return batchRepository.getStatistics(filters);
  }

  /**
   * Update batch statuses (should be run periodically)
   * @returns {Promise<Object>} Update result
   */
  async updateBatchStatuses() {
    return batchRepository.updateBatchStatuses();
  }

  /**
   * Get next available batch number for an item
   * @param {string} itemId - Item ID
   * @returns {Promise<string>} Next available batch number
   */
  async getNextBatchNumber(itemId) {
    // Get the item to use its code in the batch number
    const item = await itemService.getItemById(itemId);

    // Format: ITEM-CODE-YYYYMMDD-XXX
    const date = new Date();
    const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;

    // Find the highest sequence number for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const batches = await batchRepository.findByItemId(itemId);
    const todayBatches = batches.filter((batch) => {
      const batchDate = new Date(batch.createdAt);
      return batchDate >= today && batch.batchNumber.startsWith(`${item.code}-${dateStr}`);
    });

    const sequence = String(todayBatches.length + 1).padStart(3, '0');
    return `${item.code}-${dateStr}-${sequence}`;
  }

  /**
   * Get available batches for item in warehouse
   * Returns batches with available stock, sorted by expiry date (FIFO/FEFO)
   * @param {string} itemId - Item ID
   * @param {string} warehouseId - Warehouse ID
   * @returns {Promise<Array>} Available batches
   */
  async getAvailableBatches(itemId, warehouseId) {
    if (!itemId || !warehouseId) {
      throw new Error('Item ID and Warehouse ID are required');
    }

    const batches = await batchRepository.findByItemId(itemId, {
      activeOnly: true,
      hasStock: true,
    });

    // Filter by warehouse and sort by expiry date
    const availableBatches = batches
      .filter((batch) => {
        const batchWarehouse = batch.warehouse?._id?.toString() || batch.location?._id?.toString();
        return batchWarehouse === warehouseId && batch.remainingQuantity > 0;
      })
      .sort((a, b) => {
        // Sort by expiry date (FEFO - First Expiry First Out)
        if (a.expiryDate && b.expiryDate) {
          return new Date(a.expiryDate) - new Date(b.expiryDate);
        }
        // If no expiry date, sort by creation date (FIFO - First In First Out)
        return new Date(a.createdAt) - new Date(b.createdAt);
      });

    return availableBatches.map((batch) => ({
      batchId: batch._id,
      batchNumber: batch.batchNumber,
      remainingQuantity: batch.remainingQuantity,
      expiryDate: batch.expiryDate,
      manufacturingDate: batch.manufacturingDate,
      unitCost: batch.unitCost,
      isExpired: batch.expiryDate && new Date(batch.expiryDate) < new Date(),
      isNearExpiry: batch.expiryDate && this.isNearExpiry(batch.expiryDate, 30),
    }));
  }

  /**
   * Validate batch quantity for sales
   * Checks if sufficient quantity is available in batch
   * @param {string} batchNumber - Batch number
   * @param {number} quantity - Quantity to validate
   * @returns {Promise<Object>} Validation result
   */
  async validateBatchQuantity(batchNumber, quantity, options = {}) {
    if (!batchNumber || quantity === undefined) {
      throw new Error('Batch number and quantity are required');
    }

    const Batch = require('../models/Batch');
    const query = Batch.findOne({ batchNumber });
    const batch = options.session ? await query.session(options.session) : await query;

    if (!batch) {
      return {
        valid: false,
        error: 'Batch not found',
        batchNumber,
      };
    }

    const available = batch.remainingQuantity || 0;
    const sufficient = available >= quantity;

    return {
      valid: sufficient,
      batchNumber,
      batchId: batch._id,
      requestedQuantity: quantity,
      availableQuantity: available,
      shortfall: sufficient ? 0 : quantity - available,
      error: sufficient ? null : `Insufficient quantity. Available: ${available}, Requested: ${quantity}`,
    };
  }

  /**
   * Check if batch is expired or near expiry
   * @param {string} batchNumber - Batch number
   * @param {number} warningDays - Days before expiry to warn (default 30)
   * @returns {Promise<Object>} Expiry check result
   */
  async checkBatchExpiry(batchNumber, warningDays = 30, options = {}) {
    if (!batchNumber) {
      throw new Error('Batch number is required');
    }

    const Batch = require('../models/Batch');
    const query = Batch.findOne({ batchNumber });
    const batch = options.session ? await query.session(options.session) : await query;

    if (!batch) {
      return {
        valid: false,
        error: 'Batch not found',
        batchNumber,
      };
    }

    if (!batch.expiryDate) {
      return {
        valid: true,
        batchNumber,
        batchId: batch._id,
        hasExpiryDate: false,
        isExpired: false,
        isNearExpiry: false,
        message: 'No expiry date set',
      };
    }

    const now = new Date();
    const expiryDate = new Date(batch.expiryDate);
    const daysUntilExpiry = Math.floor((expiryDate - now) / (1000 * 60 * 60 * 24));
    const isExpired = expiryDate < now;
    const isNearExpiry = !isExpired && daysUntilExpiry <= warningDays;

    return {
      valid: !isExpired,
      batchNumber,
      batchId: batch._id,
      hasExpiryDate: true,
      expiryDate: batch.expiryDate,
      isExpired,
      isNearExpiry,
      daysUntilExpiry: isExpired ? 0 : daysUntilExpiry,
      warning: isExpired
        ? 'Batch has expired'
        : isNearExpiry
          ? `Batch expires in ${daysUntilExpiry} days`
          : null,
      error: isExpired ? 'Cannot sell expired batch' : null,
    };
  }

  /**
   * Deduct quantity from batch (for sales)
   * @param {string} batchNumber - Batch number
   * @param {number} quantity - Quantity to deduct
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Updated batch
   */
  async deductFromBatch(batchNumber, quantity, options = {}) {
    if (!batchNumber || quantity === undefined || quantity <= 0) {
      throw new Error('Valid batch number and positive quantity are required');
    }

    const Batch = require('../models/Batch');
    const query = Batch.findOne({ batchNumber });
    const batch = options.session ? await query.session(options.session) : await query;

    if (!batch) {
      throw new Error('Batch not found');
    }

    // Validate quantity
    const validation = await this.validateBatchQuantity(batchNumber, quantity, options);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Check expiry
    const expiryCheck = await this.checkBatchExpiry(batchNumber, 30, options);
    if (expiryCheck.isExpired) {
      throw new Error('Cannot deduct from expired batch');
    }

    // Update batch quantity (negative to deduct)
    return this.updateBatchQuantity(batch._id, -quantity, options);
  }

  /**
   * Return quantity to batch (for sales returns)
   * @param {string} batchNumber - Batch number
   * @param {number} quantity - Quantity to return
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Updated batch
   */
  async returnToBatch(batchNumber, quantity, options = {}) {
    if (!batchNumber || quantity === undefined || quantity <= 0) {
      throw new Error('Valid batch number and positive quantity are required');
    }

    const Batch = require('../models/Batch');
    const query = Batch.findOne({ batchNumber });
    const batch = options.session ? await query.session(options.session) : await query;

    if (!batch) {
      throw new Error('Batch not found');
    }

    // Update batch quantity (positive to add)
    return this.updateBatchQuantity(batch._id, quantity, {
      ...options,
      notes: options.notes || `Returned ${quantity} units to batch`,
    });
  }

  /**
   * Helper method to check if date is near expiry
   * @param {Date} expiryDate - Expiry date
   * @param {number} days - Days threshold
   * @returns {boolean} True if near expiry
   */
  isNearExpiry(expiryDate, days = 30) {
    if (!expiryDate) return false;
    const now = new Date();
    const expiry = new Date(expiryDate);
    const daysUntilExpiry = Math.floor((expiry - now) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry > 0 && daysUntilExpiry <= days;
  }
}

module.exports = new BatchService();
