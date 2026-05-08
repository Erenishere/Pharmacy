const Batch = require('../models/Batch');
const Item = require('../models/Item');
const AppError = require('../utils/appError');
const auditService = require('../services/auditService');

/**
 * Batch Selector Service
 * Provides automated FEFO (First Expired, First Out) and FIFO (First In, First Out)
 * batch selection for inventory operations. Minimizes human error and reduces waste.
 */
class BatchSelectorService {
  constructor() {
    // Default configuration
    this.config = {
      // Days before expiry to consider batch "expiring soon"
      expiryWarningDays: 30,
      
      // Default selection method
      defaultMethod: 'FEFO',
      
      // Allow manual override for specific roles
      allowManualOverride: true,
      
      // Override roles (requires special permission)
      overrideRoles: ['admin', 'inventory'],
      
      // Maximum batches to allocate per request
      maxBatchesPerAllocation: 10,
      
      // Buffer stock percentage (don't allocate last X% of stock)
      bufferStockPercent: 0,
    };
  }

  /**
   * Select batches based on FEFO (First Expired, First Out)
   * Prioritizes batches with earliest expiry dates
   * 
   * @param {string} itemId - Item ID
   * @param {number} quantityRequired - Quantity needed
   * @param {Object} options - Selection options
   * @param {string} options.warehouseId - Warehouse ID filter
   * @param {boolean} options.excludeExpired - Exclude expired batches (default: true)
   * @param {number} options.minShelfLifeDays - Minimum remaining shelf life required
   * @param {Object} options.session - MongoDB session
   * @returns {Promise<Array<Object>>} Selected batches with quantities
   */
  async selectBatchesFEFO(itemId, quantityRequired, options = {}) {
    const {
      warehouseId,
      excludeExpired = true,
      minShelfLifeDays = 0,
      session,
    } = options;

    // Validate inputs
    if (!itemId) {
      throw new AppError('Item ID is required', 400);
    }

    const qty = parseFloat(quantityRequired);
    if (isNaN(qty) || qty <= 0) {
      throw new AppError('Valid quantity required', 400);
    }

    // Build query
    const query = {
      item: itemId,
      remainingQuantity: { $gt: 0 },
      status: 'active',
    };

    if (warehouseId) {
      query.warehouse = warehouseId;
    }

    if (excludeExpired) {
      query.expiryDate = { $gt: new Date() };
    }

    if (minShelfLifeDays > 0) {
      const minDate = new Date();
      minDate.setDate(minDate.getDate() + minShelfLifeDays);
      query.expiryDate = { ...query.expiryDate, $gte: minDate };
    }

    // Fetch batches sorted by expiry date (FEFO), then manufacturing date
    const batches = await Batch.find(query)
      .sort({ expiryDate: 1, manufacturingDate: 1, createdAt: 1 })
      .session(session)
      .lean();

    return this.allocateFromBatches(batches, quantityRequired, 'FEFO');
  }

  /**
   * Select batches based on FIFO (First In, First Out)
   * Prioritizes oldest batches by manufacturing/receipt date
   * 
   * @param {string} itemId - Item ID
   * @param {number} quantityRequired - Quantity needed
   * @param {Object} options - Selection options
   * @returns {Promise<Array<Object>>} Selected batches
   */
  async selectBatchesFIFO(itemId, quantityRequired, options = {}) {
    const {
      warehouseId,
      excludeExpired = true,
      session,
    } = options;

    // Build query
    const query = {
      item: itemId,
      remainingQuantity: { $gt: 0 },
      status: 'active',
    };

    if (warehouseId) query.warehouse = warehouseId;
    if (excludeExpired) query.expiryDate = { $gt: new Date() };

    // Sort by manufacturing date (FIFO), then expiry date as tiebreaker
    const batches = await Batch.find(query)
      .sort({ manufacturingDate: 1, expiryDate: 1, createdAt: 1 })
      .session(session)
      .lean();

    return this.allocateFromBatches(batches, quantityRequired, 'FIFO');
  }

  /**
   * Select batches based on LEFO (Last Expired, First Out)
   * Uses batches with longest remaining shelf life first
   * Useful for specific customer requirements
   * 
   * @param {string} itemId - Item ID
   * @param {number} quantityRequired - Quantity needed
   * @param {Object} options - Selection options
   * @returns {Promise<Array<Object>>} Selected batches
   */
  async selectBatchesLEFO(itemId, quantityRequired, options = {}) {
    const {
      warehouseId,
      excludeExpired = true,
      session,
    } = options;

    const query = {
      item: itemId,
      remainingQuantity: { $gt: 0 },
      status: 'active',
    };

    if (warehouseId) query.warehouse = warehouseId;
    if (excludeExpired) query.expiryDate = { $gt: new Date() };

    // Sort by expiry date descending (latest expiry first)
    const batches = await Batch.find(query)
      .sort({ expiryDate: -1, createdAt: 1 })
      .session(session)
      .lean();

    return this.allocateFromBatches(batches, quantityRequired, 'LEFO');
  }

  /**
   * Smart batch selection with business rules
   * Automatically selects best method based on item characteristics and stock status
   * 
   * @param {string} itemId - Item ID
   * @param {number} quantityRequired - Quantity needed
   * @param {Object} options - Selection options
   * @returns {Promise<Object>} Selection result with method used
   */
  async smartSelectBatches(itemId, quantityRequired, options = {}) {
    const { customerRequirements, session, warehouseId } = options;

    // Get item details for decision making
    const item = await Item.findById(itemId)
      .select('name categoryId trackExpiry smartSelectionEnabled')
      .session(session);

    if (!item) {
      throw new AppError('Item not found', 404);
    }

    let selectedBatches;
    let selectionMethod;
    let selectionReason;

    // Decision logic
    if (customerRequirements?.preferLongestExpiry) {
      // Customer specifically wants longest shelf life
      selectedBatches = await this.selectBatchesLEFO(itemId, quantityRequired, { session, warehouseId });
      selectionMethod = 'LEFO';
      selectionReason = 'Customer preference for longest shelf life';
    } else if (customerRequirements?.acceptExpiringSoon) {
      // Customer accepts near-expiry items (e.g., for immediate use)
      selectedBatches = await this.selectBatchesFEFO(itemId, quantityRequired, {
        session,
        warehouseId,
        excludeExpired: false,
      });
      selectionMethod = 'FEFO';
      selectionReason = 'Accepting near-expiry items for immediate consumption';
    } else {
      // Default: FEFO to minimize waste
      selectedBatches = await this.selectBatchesFEFO(itemId, quantityRequired, { session, warehouseId });
      selectionMethod = 'FEFO';
      selectionReason = 'Default selection to minimize expiry waste';
    }

    // Check if any selected batches are expiring soon
    const expiringBatches = selectedBatches.filter(b => b.isExpiringSoon);
    
    return {
      itemId,
      itemName: item.name,
      quantityRequired,
      quantityAllocated: selectedBatches.reduce((sum, b) => sum + b.quantity, 0),
      selectionMethod,
      selectionReason,
      batches: selectedBatches,
      warnings: expiringBatches.length > 0 ? [{
        type: 'expiring_soon',
        message: `${expiringBatches.length} batches expire within ${this.config.expiryWarningDays} days`,
        batches: expiringBatches.map(b => ({
          batchNumber: b.batchNumber,
          daysToExpiry: b.daysToExpiry,
        })),
      }] : [],
      meta: {
        totalBatchesUsed: selectedBatches.length,
        earliestExpiry: selectedBatches[0]?.expiryDate,
        latestExpiry: selectedBatches[selectedBatches.length - 1]?.expiryDate,
      },
    };
  }

  /**
   * Validate and reserve batch quantities
   * Prevents overselling by reserving stock during checkout
   * 
   * @param {Array<Object>} selectedBatches - Batches to reserve
   * @param {string} reservationType - Type of reservation (order, invoice, etc.)
   * @param {string} referenceId - Reference document ID
   * @param {Object} options - Reservation options
   * @returns {Promise<boolean>}
   */
  async reserveBatches(selectedBatches, reservationType, referenceId, options = {}) {
    const { session, expiresAt } = options;
    
    const Reservation = require('../models/Reservation');
    
    for (const batch of selectedBatches) {
      // Create reservation record
      await Reservation.create([{
        batchId: batch.batchId,
        itemId: batch.itemId,
        warehouseId: batch.warehouseId,
        quantity: batch.quantity,
        reservationType,
        referenceId,
        status: 'active',
        expiresAt: expiresAt || this.calculateReservationExpiry(reservationType),
      }], { session });

      // Update batch reserved quantity
      await Batch.findByIdAndUpdate(
        batch.batchId,
        { $inc: { reservedQuantity: batch.quantity } },
        { session }
      );
    }

    return true;
  }

  /**
   * Release batch reservations
   * Called when order is cancelled or reservation expires
   * 
   * @param {string} referenceId - Reference document ID
   * @param {string} reservationType - Type of reservation
   * @param {Object} options - Options
   * @returns {Promise<boolean>}
   */
  async releaseReservations(referenceId, reservationType, options = {}) {
    const { session } = options;
    
    const Reservation = require('../models/Reservation');
    
    // Find active reservations
    const reservations = await Reservation.find({
      referenceId,
      reservationType,
      status: 'active',
    }).session(session);

    for (const reservation of reservations) {
      // Release batch quantity
      await Batch.findByIdAndUpdate(
        reservation.batchId,
        { $inc: { reservedQuantity: -reservation.quantity } },
        { session }
      );

      // Mark reservation as released
      reservation.status = 'released';
      await reservation.save({ session });
    }

    return true;
  }

  /**
   * Confirm reservations (convert to actual stock movement)
   * Called when invoice is confirmed
   * 
   * @param {string} referenceId - Reference document ID
   * @param {string} reservationType - Type of reservation
   * @param {Object} options - Options
   * @returns {Promise<boolean>}
   */
  async confirmReservations(referenceId, reservationType, options = {}) {
    const { session } = options;
    
    const Reservation = require('../models/Reservation');
    
    const reservations = await Reservation.find({
      referenceId,
      reservationType,
      status: 'active',
    }).session(session);

    for (const reservation of reservations) {
      // Deduct from batch quantity
      await Batch.findByIdAndUpdate(
        reservation.batchId,
        { 
          $inc: { 
            remainingQuantity: -reservation.quantity,
            reservedQuantity: -reservation.quantity 
          } 
        },
        { session }
      );

      // Mark reservation as fulfilled
      reservation.status = 'fulfilled';
      await reservation.save({ session });
    }

    return true;
  }

  /**
   * Get batch availability summary for an item
   * @param {string} itemId - Item ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Availability summary
   */
  async getBatchAvailability(itemId, options = {}) {
    const { warehouseId, session } = options;

    const query = {
      item: itemId,
      remainingQuantity: { $gt: 0 },
      status: { $in: ['active', 'available'] },
    };

    if (warehouseId) query.warehouse = warehouseId;

    const batches = await Batch.find(query)
      .sort({ expiryDate: 1 })
      .session(session)
      .lean();

    const now = new Date();
    const warningDate = new Date();
    warningDate.setDate(warningDate.getDate() + this.config.expiryWarningDays);

    let totalQuantity = 0;
    let totalReserved = 0;
    let availableQuantity = 0;
    let expiredQuantity = 0;
    let expiringSoonQuantity = 0;
    let goodQuantity = 0;

    const batchDetails = batches.map(batch => {
      const reserved = batch.reservedQuantity || 0;
      const available = batch.remainingQuantity - reserved;
      const isExpired = batch.expiryDate < now;
      const isExpiringSoon = !isExpired && batch.expiryDate < warningDate;

      totalQuantity += batch.remainingQuantity;
      totalReserved += reserved;
      availableQuantity += available;

      if (isExpired) expiredQuantity += batch.remainingQuantity;
      else if (isExpiringSoon) expiringSoonQuantity += batch.remainingQuantity;
      else goodQuantity += batch.remainingQuantity;

      return {
        batchId: batch._id,
        batchNumber: batch.batchNumber,
        quantity: batch.remainingQuantity,
        reserved,
        available,
        expiryDate: batch.expiryDate,
        isExpired,
        isExpiringSoon,
        daysToExpiry: this.calculateDaysToExpiry(batch.expiryDate),
      };
    });

    return {
      itemId,
      warehouseId,
      summary: {
        totalBatches: batches.length,
        totalQuantity,
        totalReserved,
        availableQuantity,
        expiredQuantity,
        expiringSoonQuantity,
        goodQuantity,
      },
      batches: batchDetails,
    };
  }

  /**
   * Original method: Select batches using FEFO logic
   * @param {string} itemId - Item ID
   * @param {number} requiredQuantity - Required quantity
   * @param {string} warehouseId - Warehouse ID
   * @returns {Promise<Array>} Batch allocations
   * @deprecated Use selectBatchesFEFO instead
   */
  async selectBatches(itemId, requiredQuantity, warehouseId) {
    return this.selectBatchesFEFO(itemId, requiredQuantity, { warehouseId });
  }

  /**
   * Original method: Validate batch availability
   * @param {string} itemId - Item ID
   * @param {number} requiredQuantity - Required quantity
   * @param {string} warehouseId - Warehouse ID
   * @returns {Promise<Object>} Validation result
   */
  async validateBatchAvailability(itemId, requiredQuantity, warehouseId) {
    const allocations = await this.selectBatches(itemId, requiredQuantity, warehouseId);

    const totalAllocated = allocations.reduce(
      (sum, alloc) => sum + alloc.quantity,
      0,
    );

    return {
      valid: totalAllocated >= requiredQuantity,
      available: totalAllocated,
      required: requiredQuantity,
      shortage: Math.max(0, requiredQuantity - totalAllocated),
      allocations,
    };
  }

  /**
   * Original method: Get batch information
   * @param {string} itemId - Item ID
   * @param {string} warehouseId - Warehouse ID
   * @returns {Promise<Array>} Batch information
   */
  async getBatchInfo(itemId, warehouseId) {
    const batches = await Batch.find({
      item: itemId,
      warehouse: warehouseId,
      remainingQuantity: { $gt: 0 },
      expiryDate: { $gt: new Date() },
      status: 'active',
    })
      .sort({ expiryDate: 1 })
      .select('batchNumber expiryDate remainingQuantity manufacturingDate')
      .lean();

    return batches.map((batch) => ({
      batchNumber: batch.batchNumber,
      expiryDate: batch.expiryDate,
      availableQuantity: batch.remainingQuantity,
      manufacturingDate: batch.manufacturingDate,
    }));
  }

  /**
   * Helper: Calculate available quantity from batch
   * @param {Object} batch - Batch document
   * @returns {number}
   */
  calculateAvailableQuantity(batch) {
    const totalQty = parseFloat(batch.remainingQuantity) || 0;
    const reservedQty = parseFloat(batch.reservedQuantity) || 0;
    return Math.max(0, totalQty - reservedQty);
  }

  /**
   * Helper: Calculate days to expiry
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
   * Helper: Check if batch is expiring soon
   * @param {Date} expiryDate
   * @returns {boolean}
   */
  isExpiringSoon(expiryDate) {
    const days = this.calculateDaysToExpiry(expiryDate);
    return days !== null && days <= this.config.expiryWarningDays && days > 0;
  }

  /**
   * Helper: Allocate quantities from batch list
   * @param {Array} batches - Available batches
   * @param {number} quantityRequired - Quantity needed
   * @param {string} method - Selection method name
   * @returns {Array<Object>}
   */
  allocateFromBatches(batches, quantityRequired, method) {
    const selected = [];
    let remaining = quantityRequired;

    for (const batch of batches) {
      if (remaining <= 0) break;

      const available = this.calculateAvailableQuantity(batch);
      if (available <= 0) continue;

      const take = Math.min(available, remaining);
      
      selected.push({
        batchId: batch._id,
        batchNumber: batch.batchNumber,
        expiryDate: batch.expiryDate,
        manufacturingDate: batch.manufacturingDate,
        quantity: take,
        unitCost: batch.unitCost,
        warehouseId: batch.warehouseId || batch.warehouse,
        availableQuantity: available,
        originalQuantity: batch.remainingQuantity,
        reservedQuantity: batch.reservedQuantity || 0,
        daysToExpiry: this.calculateDaysToExpiry(batch.expiryDate),
        isExpiringSoon: this.isExpiringSoon(batch.expiryDate),
        selectionMethod: method,
      });

      remaining -= take;
    }

    if (remaining > 0) {
      const available = batches.reduce((sum, b) => 
        sum + this.calculateAvailableQuantity(b), 0
      );
      
      throw new AppError(
        `Insufficient stock. Required: ${quantityRequired}, Available: ${available}`,
        400,
        'INSUFFICIENT_STOCK'
      );
    }

    return selected;
  }

  /**
   * Helper: Calculate reservation expiry time
   * @param {string} reservationType
   * @returns {Date}
   */
  calculateReservationExpiry(reservationType) {
    const now = new Date();
    
    switch (reservationType) {
      case 'cart':
        now.setMinutes(now.getMinutes() + 30); // 30 minutes
        break;
      case 'order':
        now.setHours(now.getHours() + 24); // 24 hours
        break;
      case 'invoice':
        now.setHours(now.getHours() + 2); // 2 hours
        break;
      default:
        now.setHours(now.getHours() + 1); // 1 hour default
    }
    
    return now;
  }

  /**
   * Log manual batch override (for audit purposes)
   * @param {Object} data - Override details
   */
  async logManualOverride(data) {
    const {
      userId,
      userName,
      itemId,
      invoiceId,
      selectedBatches,
      reason,
    } = data;

    await auditService.logUpdate({
      collectionName: 'batches',
      documentId: invoiceId,
      documentIdentifier: invoiceId,
      summary: `Manual batch selection override by ${userName}: ${reason}`,
      changes: selectedBatches.map(b => ({
        field: `batch:${b.batchNumber}`,
        oldValue: 'auto-selected',
        newValue: `manual-${b.selectionMethod || 'custom'}`,
      })),
      userId,
      userName,
      metadata: {
        itemId,
        overrideReason: reason,
        selectedBatches,
      },
    });
  }

  /**
   * Get total available stock for an item in a warehouse
   * @param {string} itemId - Item ID
   * @param {string} warehouseId - Warehouse ID
   * @returns {Promise<number>} Total available quantity
   */
  async getTotalAvailableStock(itemId, warehouseId) {
    const result = await Batch.aggregate([
      {
        $match: {
          item: itemId,
          warehouse: warehouseId,
          remainingQuantity: { $gt: 0 },
          expiryDate: { $gt: new Date() },
          status: 'active',
        },
      },
      {
        $group: {
          _id: null,
          totalQuantity: { $sum: '$remainingQuantity' },
        },
      },
    ]);

    return result.length > 0 ? result[0].totalQuantity : 0;
  }
}

module.exports = new BatchSelectorService();
