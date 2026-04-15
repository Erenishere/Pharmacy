const mongoose = require('mongoose');
const Inventory = require('../models/Inventory');
const StockMovement = require('../models/StockMovement');
const Warehouse = require('../models/Warehouse');
const Item = require('../models/Item');
const inventoryService = require('./inventoryService');
const AppError = require('../utils/appError');

/**
 * Stock Adjustment Service
 * Handles business logic for stock adjustments
 * Implements Requirements 4.1-4.12 from Inventory Management Spec
 */
class StockAdjustmentService {
  /**
   * Configuration for approval thresholds
   */
  constructor() {
    this.approvalConfig = {
      percentageThreshold: 0.5, // 50% of stock
      valueThreshold: 10000, // Configurable value threshold
      alwaysApproveReasons: ['theft'], // Reasons that always require approval
    };
  }

  /**
   * Check if adjustment requires approval
   * Requirement 4.11: Large adjustments require manager approval
   * @param {Object} adjustmentData - Adjustment data
   * @param {number} currentStock - Current stock level
   * @param {number} itemValue - Item value (for value-based threshold)
   * @returns {Object} Approval requirement result
   */
  _requiresApproval(adjustmentData, currentStock, itemValue = 0) {
    const { adjustmentType, quantity, reason } = adjustmentData;

    // Theft always requires approval
    if (this.approvalConfig.alwaysApproveReasons.includes(reason)) {
      return {
        required: true,
        reason: `Adjustment reason "${reason}" always requires approval`,
      };
    }

    // Check percentage threshold (> 50% of stock)
    if (currentStock > 0 && quantity > currentStock * this.approvalConfig.percentageThreshold) {
      return {
        required: true,
        reason: `Adjustment quantity (${quantity}) exceeds ${this.approvalConfig.percentageThreshold * 100}% of current stock (${currentStock})`,
      };
    }

    // Check value threshold
    const adjustmentValue = quantity * itemValue;
    if (adjustmentValue > this.approvalConfig.valueThreshold) {
      return {
        required: true,
        reason: `Adjustment value (${adjustmentValue}) exceeds threshold (${this.approvalConfig.valueThreshold})`,
      };
    }

    return {
      required: false,
      reason: 'Adjustment is within auto-approval limits',
    };
  }

  /**
   * Create stock adjustment with approval workflow
   * Requirement 4.1-4.12: Stock Adjustment
   * @param {Object} adjustmentData - Adjustment data
   * @param {string} adjustmentData.itemId - Item ID
   * @param {string} adjustmentData.warehouseId - Warehouse ID
   * @param {string} adjustmentData.adjustmentType - Adjustment type (increase, decrease)
   * @param {number} adjustmentData.quantity - Adjustment quantity (always positive)
   * @param {string} adjustmentData.reason - Adjustment reason
   * @param {string} adjustmentData.notes - Detailed notes
   * @param {string} [adjustmentData.batchNumber] - Batch number if applicable
   * @param {Date} [adjustmentData.expiryDate] - Expiry date for batch
   * @param {string} adjustmentData.createdBy - User ID who created adjustment
   * @returns {Promise<Object>} Adjustment result
   */
  async createAdjustment(adjustmentData) {
    const {
      itemId,
      warehouseId,
      adjustmentType,
      quantity,
      reason,
      notes,
      batchNumber,
      expiryDate,
      createdBy,
    } = adjustmentData;

    // Requirement 4.1-4.2: Validate required fields
    if (!itemId || !warehouseId || !adjustmentType || !quantity || !reason || !notes) {
      throw new AppError('Item, warehouse, adjustment type, quantity, reason, and notes are required', 400);
    }

    // Requirement 4.4: Validate adjustment type
    if (!['increase', 'decrease'].includes(adjustmentType)) {
      throw new AppError('Adjustment type must be either "increase" or "decrease"', 400);
    }

    // Requirement 4.5: Validate adjustment quantity > 0
    if (quantity <= 0) {
      throw new AppError('Adjustment quantity must be greater than 0', 400);
    }

    // Requirement 4.2: Validate reason
    const validReasons = ['opening_balance', 'physical_count', 'damage', 'expiry', 'theft', 'other'];
    if (!validReasons.includes(reason)) {
      throw new AppError(
        `Reason must be one of: ${validReasons.join(', ')}`,
        400,
      );
    }

    // Requirement 4.7: Validate detailed notes for "other" reason
    if (reason === 'other' && (!notes || notes.trim().length < 10)) {
      throw new AppError('Detailed notes (minimum 10 characters) are required for "other" reason', 400);
    }

    // Requirement 4.1: Validate warehouse exists and is active
    const warehouse = await Warehouse.findById(warehouseId);
    if (!warehouse) {
      throw new AppError('Warehouse not found', 404);
    }
    if (!warehouse.isActive) {
      throw new AppError('Warehouse is not active', 400);
    }

    // Requirement 4.2: Validate item exists and is active
    const item = await Item.findById(itemId);
    if (!item) {
      throw new AppError('Item not found', 404);
    }
    if (item.status && item.status !== 'active') {
      throw new AppError(`Item is ${item.status} and cannot be adjusted`, 400);
    }

    // Build inventory query (Requirement 4.8: Support batch selection)
    const inventoryQuery = {
      item: itemId,
      warehouse: warehouseId,
    };

    if (batchNumber) {
      inventoryQuery.batchNumber = batchNumber;
    }

    // Requirement 4.3: Get current stock level
    let inventory = await Inventory.findOne(inventoryQuery);

    const currentStock = inventory ? inventory.quantity : 0;

    // Requirement 4.6: Validate sufficient stock for decrease adjustments
    if (adjustmentType === 'decrease') {
      if (!inventory || inventory.availableQuantity < quantity) {
        throw new AppError(
          `Insufficient stock for decrease adjustment. Available: ${inventory?.availableQuantity || 0}, Requested: ${quantity}`,
          400,
        );
      }

      // Requirement 4.9: Validate batch exists if batch number provided
      if (batchNumber && !inventory) {
        throw new AppError(`Batch ${batchNumber} not found in warehouse`, 404);
      }
    }

    // Calculate new stock level
    const adjustmentQuantity = adjustmentType === 'increase' ? quantity : -quantity;
    const newStock = currentStock + adjustmentQuantity;

    // Create adjustment ID for tracking
    const adjustmentId = new mongoose.Types.ObjectId();

    // Requirement 4.11: Check if adjustment requires approval
    const approvalCheck = this._requiresApproval(
      { adjustmentType, quantity, reason },
      currentStock,
      item.purchasePrice || 0,
    );

    const requiresApproval = approvalCheck.required;
    const approvalStatus = requiresApproval ? 'pending_approval' : 'auto_approved';

    // Requirement 4.4: Create stock movement record with type 'adjustment'
    // If requires approval, set status to 'pending', otherwise 'completed'
    const movement = await StockMovement.create({
      itemId,
      warehouse: warehouseId,
      movementType: adjustmentType === 'increase' ? 'in' : 'out',
      quantity: Math.abs(quantity),
      referenceType: 'adjustment',
      referenceId: adjustmentId,
      batchInfo: batchNumber ? {
        batchNumber,
        expiryDate,
      } : undefined,
      movementDate: new Date(),
      notes: `${this._getReasonLabel(reason)} - ${notes}`,
      status: requiresApproval ? 'pending' : 'completed',
      approvalStatus,
      approvalReason: approvalCheck.reason,
      createdBy,
    });

    // Requirement 4.11: Only update inventory if auto-approved
    // For pending approval, do NOT update inventory yet
    if (!requiresApproval) {
      if (!inventory) {
        // Create new inventory record for increase adjustments
        if (adjustmentType === 'increase') {
          inventory = await Inventory.create({
            item: itemId,
            warehouse: warehouseId,
            batchNumber,
            quantity,
            reservedQuantity: 0,
            available: quantity,
          });
        } else {
          throw new AppError('Cannot decrease stock that does not exist', 400);
        }
      } else {
        // Update existing inventory
        inventory.quantity = newStock;
        await inventory.save();
      }

      // Sync Item.inventory.currentStock
      await inventoryService.syncItemCurrentStock(itemId);
    }

    return {
      success: true,
      adjustmentId,
      requiresApproval,
      approvalStatus,
      approvalReason: approvalCheck.reason,
      adjustment: {
        itemId,
        itemName: item.name,
        itemCode: item.code,
        warehouseId,
        warehouseName: warehouse.name,
        warehouseCode: warehouse.code,
        adjustmentType,
        quantity,
        reason: this._getReasonLabel(reason),
        notes,
        batchNumber,
        expiryDate,
        previousStock: currentStock,
        newStock: requiresApproval ? currentStock : newStock,
        difference: adjustmentQuantity,
        timestamp: new Date(),
        createdBy,
        status: approvalStatus,
      },
      movement: {
        id: movement._id,
        movementType: movement.movementType,
        quantity: movement.quantity,
        status: movement.status,
      },
    };
  }

  /**
   * Request approval for an adjustment
   * Requirement 4.11: Submit adjustment for approval
   * @param {string} adjustmentId - Adjustment ID
   * @param {string} userId - User ID requesting approval
   * @returns {Promise<Object>} Request result
   */
  async requestApproval(adjustmentId, userId) {
    if (!adjustmentId || !userId) {
      throw new AppError('Adjustment ID and User ID are required', 400);
    }

    // Find the adjustment movement
    const movement = await StockMovement.findOne({
      referenceType: 'adjustment',
      referenceId: adjustmentId,
    });

    if (!movement) {
      throw new AppError('Adjustment not found', 404);
    }

    // Check if already approved or rejected
    if (movement.approvalStatus === 'approved') {
      throw new AppError('Adjustment is already approved', 400);
    }

    if (movement.approvalStatus === 'rejected') {
      throw new AppError('Adjustment is already rejected', 400);
    }

    // Update status to pending_approval
    movement.approvalStatus = 'pending_approval';
    movement.status = 'pending';
    movement.approvalRequestedBy = userId;
    movement.approvalRequestedAt = new Date();
    await movement.save();

    return {
      success: true,
      message: 'Approval request submitted successfully',
      adjustmentId,
      status: 'pending_approval',
    };
  }

  /**
   * Approve an adjustment
   * Requirement 4.11: Approve adjustment and update inventory
   * @param {string} adjustmentId - Adjustment ID
   * @param {string} approverId - Approver user ID
   * @param {string} [notes] - Approval notes
   * @returns {Promise<Object>} Approval result
   */
  async approveAdjustment(adjustmentId, approverId, notes = '') {
    if (!adjustmentId || !approverId) {
      throw new AppError('Adjustment ID and Approver ID are required', 400);
    }

    const User = require('../models/User');

    // Validate approver is a manager
    const approver = await User.findById(approverId);
    if (!approver) {
      throw new AppError('Approver not found', 404);
    }

    // Requirement 4.11: Only managers can approve adjustments
    const managerRoles = ['admin', 'manager', 'store_incharge'];
    if (!managerRoles.includes(approver.role)) {
      throw new AppError('Only managers can approve adjustments', 403);
    }

    // Find the adjustment movement
    const movement = await StockMovement.findOne({
      referenceType: 'adjustment',
      referenceId: adjustmentId,
    }).populate('itemId').populate('warehouse');

    if (!movement) {
      throw new AppError('Adjustment not found', 404);
    }

    // Requirement 4.11: Cannot approve already approved/rejected adjustments
    if (movement.approvalStatus === 'approved') {
      throw new AppError('Adjustment is already approved', 400);
    }

    if (movement.approvalStatus === 'rejected') {
      throw new AppError('Adjustment has been rejected and cannot be approved', 400);
    }

    // Requirement 4.11: Cannot approve own adjustments
    if (movement.createdBy.toString() === approverId.toString()) {
      throw new AppError('Cannot approve your own adjustment', 403);
    }

    // Get inventory
    const inventoryQuery = {
      item: movement.itemId._id,
      warehouse: movement.warehouse._id,
    };

    if (movement.batchInfo?.batchNumber) {
      inventoryQuery.batchNumber = movement.batchInfo.batchNumber;
    }

    let inventory = await Inventory.findOne(inventoryQuery);

    const isIncrease = movement.movementType === 'in';
    const quantity = Math.abs(movement.quantity);

    // Validate sufficient stock for decrease adjustments
    if (!isIncrease) {
      if (!inventory || inventory.availableQuantity < quantity) {
        throw new AppError(
          `Insufficient stock to approve decrease adjustment. Available: ${inventory?.availableQuantity || 0}, Required: ${quantity}`,
          400,
        );
      }
    }

    // Calculate new stock level
    const currentStock = inventory ? inventory.quantity : 0;
    const adjustmentQuantity = isIncrease ? quantity : -quantity;
    const newStock = currentStock + adjustmentQuantity;

    // Requirement 4.11: Update inventory when approved
    if (!inventory) {
      // Create new inventory record for increase adjustments
      if (isIncrease) {
        inventory = await Inventory.create({
          item: movement.itemId._id,
          warehouse: movement.warehouse._id,
          batchNumber: movement.batchInfo?.batchNumber,
          quantity,
          reservedQuantity: 0,
          available: quantity,
        });
      } else {
        throw new AppError('Cannot decrease stock that does not exist', 400);
      }
    } else {
      // Update existing inventory
      inventory.quantity = newStock;
      await inventory.save();
    }

    // Update movement status
    movement.approvalStatus = 'approved';
    movement.status = 'completed';
    movement.approvedBy = approverId;
    movement.approvedAt = new Date();
    movement.approvalNotes = notes;
    await movement.save();

    // Sync Item.inventory.currentStock
    await inventoryService.syncItemCurrentStock(movement.itemId._id);

    return {
      success: true,
      message: 'Adjustment approved and inventory updated successfully',
      adjustmentId,
      adjustment: {
        itemId: movement.itemId._id,
        itemName: movement.itemId.name,
        itemCode: movement.itemId.code,
        warehouseId: movement.warehouse._id,
        warehouseName: movement.warehouse.name,
        adjustmentType: isIncrease ? 'increase' : 'decrease',
        quantity,
        previousStock: currentStock,
        newStock,
        approvedBy: approver.username,
        approvedAt: movement.approvedAt,
        approvalNotes: notes,
        status: 'approved',
      },
    };
  }

  /**
   * Reject an adjustment
   * Requirement 4.11: Reject adjustment
   * @param {string} adjustmentId - Adjustment ID
   * @param {string} approverId - Approver user ID
   * @param {string} reason - Rejection reason
   * @returns {Promise<Object>} Rejection result
   */
  async rejectAdjustment(adjustmentId, approverId, reason) {
    if (!adjustmentId || !approverId || !reason) {
      throw new AppError('Adjustment ID, Approver ID, and Rejection reason are required', 400);
    }

    const User = require('../models/User');

    // Validate approver is a manager
    const approver = await User.findById(approverId);
    if (!approver) {
      throw new AppError('Approver not found', 404);
    }

    // Requirement 4.11: Only managers can reject adjustments
    const managerRoles = ['admin', 'manager', 'store_incharge'];
    if (!managerRoles.includes(approver.role)) {
      throw new AppError('Only managers can reject adjustments', 403);
    }

    // Find the adjustment movement
    const movement = await StockMovement.findOne({
      referenceType: 'adjustment',
      referenceId: adjustmentId,
    }).populate('itemId').populate('warehouse');

    if (!movement) {
      throw new AppError('Adjustment not found', 404);
    }

    // Requirement 4.11: Cannot reject already approved/rejected adjustments
    if (movement.approvalStatus === 'approved') {
      throw new AppError('Cannot reject an already approved adjustment', 400);
    }

    if (movement.approvalStatus === 'rejected') {
      throw new AppError('Adjustment is already rejected', 400);
    }

    // Update movement status
    movement.approvalStatus = 'rejected';
    movement.status = 'cancelled';
    movement.approvedBy = approverId;
    movement.approvedAt = new Date();
    movement.approvalNotes = reason;
    await movement.save();

    return {
      success: true,
      message: 'Adjustment rejected successfully',
      adjustmentId,
      adjustment: {
        itemId: movement.itemId._id,
        itemName: movement.itemId.name,
        itemCode: movement.itemId.code,
        warehouseId: movement.warehouse._id,
        warehouseName: movement.warehouse.name,
        adjustmentType: movement.movementType === 'in' ? 'increase' : 'decrease',
        quantity: Math.abs(movement.quantity),
        rejectedBy: approver.username,
        rejectedAt: movement.approvedAt,
        rejectionReason: reason,
        status: 'rejected',
      },
    };
  }

  /**
   * Get pending approvals
   * Requirement 4.11: List pending approvals
   * @param {Object} filters - Filter options
   * @param {string} [filters.warehouseId] - Filter by warehouse
   * @param {string} [filters.itemId] - Filter by item
   * @param {string} [filters.userId] - Filter by user who created
   * @param {number} [filters.page=1] - Page number
   * @param {number} [filters.limit=50] - Items per page
   * @returns {Promise<Object>} Paginated pending approvals
   */
  async getPendingApprovals(filters = {}) {
    const {
      warehouseId,
      itemId,
      userId,
      page = 1,
      limit = 50,
    } = filters;

    // Build query for pending approval adjustments
    const query = {
      referenceType: 'adjustment',
      approvalStatus: 'pending_approval',
    };

    if (warehouseId) {
      query.warehouse = warehouseId;
    }

    if (itemId) {
      query.itemId = itemId;
    }

    if (userId) {
      query.createdBy = userId;
    }

    // Get total count
    const total = await StockMovement.countDocuments(query);

    // Get paginated results
    const skip = (page - 1) * limit;
    const pendingAdjustments = await StockMovement.find(query)
      .populate('itemId', 'code name unit')
      .populate('warehouse', 'code name')
      .populate('createdBy', 'username email')
      .sort({ movementDate: -1 })
      .skip(skip)
      .limit(limit);

    // Format results
    const formattedAdjustments = pendingAdjustments.map((adj) => {
      // Extract reason from notes
      const reasonMatch = adj.notes?.match(/^([^-]+)/);
      const extractedReason = reasonMatch ? reasonMatch[1].trim() : 'Unknown';
      const detailedNotes = adj.notes?.replace(/^[^-]+-\s*/, '').trim();

      return {
        adjustmentId: adj.referenceId,
        date: adj.movementDate,
        item: {
          id: adj.itemId?._id,
          code: adj.itemId?.code,
          name: adj.itemId?.name,
          unit: adj.itemId?.unit,
        },
        warehouse: {
          id: adj.warehouse?._id,
          code: adj.warehouse?.code,
          name: adj.warehouse?.name,
        },
        type: adj.movementType === 'in' ? 'increase' : 'decrease',
        quantity: Math.abs(adj.quantity),
        reason: extractedReason,
        notes: detailedNotes,
        approvalReason: adj.approvalReason,
        batchNumber: adj.batchInfo?.batchNumber,
        requestedBy: {
          id: adj.createdBy?._id,
          username: adj.createdBy?.username,
          email: adj.createdBy?.email,
        },
        requestedAt: adj.approvalRequestedAt || adj.movementDate,
        status: adj.approvalStatus,
      };
    });

    return {
      success: true,
      data: formattedAdjustments,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get adjustment history with filters
   * Requirement 4.5: Complete history of all adjustments
   * @param {Object} filters - Filter options
   * @param {string} [filters.warehouseId] - Filter by warehouse
   * @param {string} [filters.itemId] - Filter by item
   * @param {Date} [filters.startDate] - Start date
   * @param {Date} [filters.endDate] - End date
   * @param {string} [filters.reason] - Filter by reason
   * @param {string} [filters.userId] - Filter by user
   * @param {number} [filters.page=1] - Page number
   * @param {number} [filters.limit=50] - Items per page
   * @returns {Promise<Object>} Paginated adjustment history
   */
  async getAdjustmentHistory(filters = {}) {
    const {
      warehouseId,
      itemId,
      startDate,
      endDate,
      reason,
      userId,
      page = 1,
      limit = 50,
    } = filters;

    // Build query for adjustment movements
    const query = {
      referenceType: 'adjustment',
    };

    if (warehouseId) {
      query.warehouse = warehouseId;
    }

    if (itemId) {
      query.itemId = itemId;
    }

    if (userId) {
      query.createdBy = userId;
    }

    if (startDate || endDate) {
      query.movementDate = {};
      if (startDate) {
        query.movementDate.$gte = new Date(startDate);
      }
      if (endDate) {
        query.movementDate.$lte = new Date(endDate);
      }
    }

    // Filter by reason in notes (since reason is embedded in notes)
    if (reason) {
      const reasonLabel = this._getReasonLabel(reason);
      query.notes = new RegExp(reasonLabel, 'i');
    }

    // Get total count
    const total = await StockMovement.countDocuments(query);

    // Get paginated results
    const skip = (page - 1) * limit;
    const adjustments = await StockMovement.find(query)
      .populate('itemId', 'code name unit')
      .populate('warehouse', 'code name')
      .populate('createdBy', 'username email')
      .sort({ movementDate: -1 })
      .skip(skip)
      .limit(limit);

    // Requirement 4.5: Format results with Date, Item, Warehouse, Type, Quantity, Reason, User
    const formattedAdjustments = adjustments.map((adj) => {
      // Extract reason from notes
      const reasonMatch = adj.notes?.match(/^([^-]+)/);
      const extractedReason = reasonMatch ? reasonMatch[1].trim() : 'Unknown';
      const detailedNotes = adj.notes?.replace(/^[^-]+-\s*/, '').trim();

      return {
        adjustmentId: adj.referenceId,
        date: adj.movementDate,
        item: {
          id: adj.itemId?._id,
          code: adj.itemId?.code,
          name: adj.itemId?.name,
          unit: adj.itemId?.unit,
        },
        warehouse: {
          id: adj.warehouse?._id,
          code: adj.warehouse?.code,
          name: adj.warehouse?.name,
        },
        type: adj.movementType === 'in' ? 'increase' : 'decrease',
        quantity: Math.abs(adj.quantity),
        reason: extractedReason,
        notes: detailedNotes,
        batchNumber: adj.batchInfo?.batchNumber,
        user: {
          id: adj.createdBy?._id,
          username: adj.createdBy?.username,
          email: adj.createdBy?.email,
        },
        status: adj.status,
      };
    });

    return {
      success: true,
      data: formattedAdjustments,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get adjustment by ID
   * @param {string} adjustmentId - Adjustment ID
   * @returns {Promise<Object>} Adjustment details
   */
  async getAdjustmentById(adjustmentId) {
    if (!adjustmentId) {
      throw new AppError('Adjustment ID is required', 400);
    }

    const movements = await StockMovement.find({
      referenceType: 'adjustment',
      referenceId: adjustmentId,
    })
      .populate('itemId', 'code name unit')
      .populate('warehouse', 'code name')
      .populate('createdBy', 'username email');

    if (movements.length === 0) {
      throw new AppError('Adjustment not found', 404);
    }

    const movement = movements[0];

    // Extract reason from notes
    const reasonMatch = movement.notes?.match(/^([^-]+)/);
    const extractedReason = reasonMatch ? reasonMatch[1].trim() : 'Unknown';
    const detailedNotes = movement.notes?.replace(/^[^-]+-\s*/, '').trim();

    return {
      success: true,
      adjustment: {
        adjustmentId: movement.referenceId,
        date: movement.movementDate,
        item: {
          id: movement.itemId?._id,
          code: movement.itemId?.code,
          name: movement.itemId?.name,
          unit: movement.itemId?.unit,
        },
        warehouse: {
          id: movement.warehouse?._id,
          code: movement.warehouse?.code,
          name: movement.warehouse?.name,
        },
        type: movement.movementType === 'in' ? 'increase' : 'decrease',
        quantity: Math.abs(movement.quantity),
        reason: extractedReason,
        notes: detailedNotes,
        batchNumber: movement.batchInfo?.batchNumber,
        expiryDate: movement.batchInfo?.expiryDate,
        user: {
          id: movement.createdBy?._id,
          username: movement.createdBy?.username,
          email: movement.createdBy?.email,
        },
        status: movement.status,
        createdAt: movement.createdAt,
        updatedAt: movement.updatedAt,
      },
    };
  }

  /**
   * Get adjustment summary for a warehouse
   * @param {string} warehouseId - Warehouse ID
   * @param {Object} options - Query options
   * @param {Date} [options.startDate] - Start date
   * @param {Date} [options.endDate] - End date
   * @returns {Promise<Object>} Adjustment summary
   */
  async getWarehouseAdjustmentSummary(warehouseId, options = {}) {
    const query = {
      referenceType: 'adjustment',
      warehouse: warehouseId,
    };

    if (options.startDate || options.endDate) {
      query.movementDate = {};
      if (options.startDate) {
        query.movementDate.$gte = new Date(options.startDate);
      }
      if (options.endDate) {
        query.movementDate.$lte = new Date(options.endDate);
      }
    }

    const movements = await StockMovement.find(query)
      .populate('itemId', 'code name')
      .populate('warehouse', 'code name')
      .populate('createdBy', 'username');

    // Calculate summary
    const summary = {
      totalAdjustments: movements.length,
      totalIncreases: 0,
      totalDecreases: 0,
      totalQuantityIncreased: 0,
      totalQuantityDecreased: 0,
      itemsAdjusted: new Set(),
      reasonBreakdown: {
        physical_count: 0,
        damage: 0,
        expiry: 0,
        theft: 0,
        other: 0,
      },
      adjustments: [],
    };

    movements.forEach((movement) => {
      const isIncrease = movement.movementType === 'in';
      const quantity = Math.abs(movement.quantity);

      if (isIncrease) {
        summary.totalIncreases++;
        summary.totalQuantityIncreased += quantity;
      } else {
        summary.totalDecreases++;
        summary.totalQuantityDecreased += quantity;
      }

      summary.itemsAdjusted.add(movement.itemId._id.toString());

      // Extract reason from notes
      const notes = movement.notes || '';
      if (notes.includes('Physical Count')) summary.reasonBreakdown.physical_count++;
      else if (notes.includes('Damage')) summary.reasonBreakdown.damage++;
      else if (notes.includes('Expiry')) summary.reasonBreakdown.expiry++;
      else if (notes.includes('Theft')) summary.reasonBreakdown.theft++;
      else summary.reasonBreakdown.other++;

      summary.adjustments.push({
        date: movement.movementDate,
        type: isIncrease ? 'increase' : 'decrease',
        item: movement.itemId?.code,
        itemName: movement.itemId?.name,
        quantity,
        reason: notes.split('-')[0]?.trim(),
        user: movement.createdBy?.username,
      });
    });

    summary.itemsAdjusted = summary.itemsAdjusted.size;

    return summary;
  }

  /**
   * Get adjustment summary for an item
   * @param {string} itemId - Item ID
   * @param {Object} options - Query options
   * @param {Date} [options.startDate] - Start date
   * @param {Date} [options.endDate] - End date
   * @returns {Promise<Object>} Item adjustment summary
   */
  async getItemAdjustmentSummary(itemId, options = {}) {
    const query = {
      referenceType: 'adjustment',
      itemId,
    };

    if (options.startDate || options.endDate) {
      query.movementDate = {};
      if (options.startDate) {
        query.movementDate.$gte = new Date(options.startDate);
      }
      if (options.endDate) {
        query.movementDate.$lte = new Date(options.endDate);
      }
    }

    const movements = await StockMovement.find(query)
      .populate('itemId', 'code name unit')
      .populate('warehouse', 'code name')
      .populate('createdBy', 'username');

    // Calculate summary
    const summary = {
      itemId,
      itemCode: movements[0]?.itemId?.code,
      itemName: movements[0]?.itemId?.name,
      totalAdjustments: movements.length,
      totalIncreases: 0,
      totalDecreases: 0,
      netChange: 0,
      warehousesAffected: new Set(),
      adjustmentsByWarehouse: {},
    };

    movements.forEach((movement) => {
      const isIncrease = movement.movementType === 'in';
      const quantity = Math.abs(movement.quantity);
      const warehouseId = movement.warehouse?._id.toString();
      const warehouseName = movement.warehouse?.name;

      if (isIncrease) {
        summary.totalIncreases++;
        summary.netChange += quantity;
      } else {
        summary.totalDecreases++;
        summary.netChange -= quantity;
      }

      summary.warehousesAffected.add(warehouseId);

      if (!summary.adjustmentsByWarehouse[warehouseName]) {
        summary.adjustmentsByWarehouse[warehouseName] = {
          increases: 0,
          decreases: 0,
          netChange: 0,
        };
      }

      if (isIncrease) {
        summary.adjustmentsByWarehouse[warehouseName].increases += quantity;
        summary.adjustmentsByWarehouse[warehouseName].netChange += quantity;
      } else {
        summary.adjustmentsByWarehouse[warehouseName].decreases += quantity;
        summary.adjustmentsByWarehouse[warehouseName].netChange -= quantity;
      }
    });

    summary.warehousesAffected = summary.warehousesAffected.size;

    return summary;
  }

  /**
   * Validate adjustment data
   * @param {Object} adjustmentData - Adjustment data to validate
   * @returns {Promise<Object>} Validation result
   */
  async validateAdjustment(adjustmentData) {
    const {
      itemId,
      warehouseId,
      adjustmentType,
      quantity,
      reason,
      notes,
      batchNumber,
    } = adjustmentData;

    const errors = [];
    const warnings = [];

    // Validate required fields
    if (!itemId) errors.push('Item ID is required');
    if (!warehouseId) errors.push('Warehouse ID is required');
    if (!adjustmentType) errors.push('Adjustment type is required');
    if (!quantity) errors.push('Quantity is required');
    if (!reason) errors.push('Reason is required');
    if (!notes) errors.push('Notes are required');

    // Validate adjustment type
    if (adjustmentType && !['increase', 'decrease'].includes(adjustmentType)) {
      errors.push('Adjustment type must be either "increase" or "decrease"');
    }

    // Validate quantity
    if (quantity !== undefined && quantity !== null) {
      if (typeof quantity !== 'number' || isNaN(quantity)) {
        errors.push('Quantity must be a valid number');
      } else if (quantity <= 0) {
        errors.push('Quantity must be greater than 0');
      }
    }

    // Validate reason
    const validReasons = ['opening_balance', 'physical_count', 'damage', 'expiry', 'theft', 'other'];
    if (reason && !validReasons.includes(reason)) {
      errors.push(`Reason must be one of: ${validReasons.join(', ')}`);
    }

    // Validate notes for "other" reason
    if (reason === 'other' && (!notes || notes.trim().length < 10)) {
      errors.push('Detailed notes (minimum 10 characters) are required for "other" reason');
    }

    // Check warehouse exists and is active
    let warehouse = null;
    if (warehouseId) {
      warehouse = await Warehouse.findById(warehouseId);
      if (!warehouse) {
        errors.push('Warehouse not found');
      } else if (!warehouse.isActive) {
        errors.push('Warehouse is not active');
      }
    }

    // Check item exists and is active
    let item = null;
    if (itemId) {
      item = await Item.findById(itemId);
      if (!item) {
        errors.push('Item not found');
      } else {
        if (item.status && item.status !== 'active') {
          errors.push(`Item is ${item.status} and cannot be adjusted`);
        }
        if (item.isDiscontinued === true) {
          errors.push('Item is discontinued and cannot be adjusted');
        }
      }
    }

    // Check inventory for decrease adjustments
    let inventory = null;
    if (item && warehouse && adjustmentType === 'decrease' && errors.length === 0) {
      const inventoryQuery = {
        item: itemId,
        warehouse: warehouseId,
      };

      if (batchNumber) {
        inventoryQuery.batchNumber = batchNumber;
      }

      inventory = await Inventory.findOne(inventoryQuery);

      if (!inventory) {
        errors.push(
          batchNumber
            ? `Item with batch ${batchNumber} not found in warehouse`
            : 'Item not found in warehouse',
        );
      } else {
        if (inventory.availableQuantity < quantity) {
          errors.push(
            `Insufficient available stock. Available: ${inventory.availableQuantity}, Requested: ${quantity}`,
          );
        }

        // Warning for large adjustments
        if (quantity > inventory.quantity * 0.5) {
          warnings.push(`Adjustment is more than 50% of current stock (${inventory.quantity} units)`);
        }
      }
    }

    // Warning for increase adjustments without batch tracking
    if (adjustmentType === 'increase' && !batchNumber && item?.batchTracking) {
      warnings.push('Item requires batch tracking but no batch number provided');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      item: item ? {
        id: item._id,
        code: item.code,
        name: item.name,
        status: item.status,
        isDiscontinued: item.isDiscontinued,
      } : null,
      warehouse: warehouse ? {
        id: warehouse._id,
        code: warehouse.code,
        name: warehouse.name,
        isActive: warehouse.isActive,
      } : null,
      currentStock: inventory ? {
        quantity: inventory.quantity,
        availableQuantity: inventory.availableQuantity,
        reservedQuantity: inventory.reservedQuantity,
        batchNumber: inventory.batchNumber,
      } : null,
    };
  }

  /**
   * Get current stock level before adjustment
   * Requirement 4.3: Display current stock level
   * @param {string} itemId - Item ID
   * @param {string} warehouseId - Warehouse ID
   * @param {string} [batchNumber] - Batch number if applicable
   * @returns {Promise<Object>} Current stock information
   */
  async getCurrentStock(itemId, warehouseId, batchNumber = null) {
    if (!itemId || !warehouseId) {
      throw new AppError('Item ID and Warehouse ID are required', 400);
    }

    const inventoryQuery = {
      item: itemId,
      warehouse: warehouseId,
    };

    if (batchNumber) {
      inventoryQuery.batchNumber = batchNumber;
    }

    const inventory = await Inventory.findOne(inventoryQuery)
      .populate('item', 'code name unit')
      .populate('warehouse', 'code name');

    if (!inventory) {
      return {
        itemId,
        warehouseId,
        batchNumber,
        currentStock: 0,
        availableStock: 0,
        reservedStock: 0,
        exists: false,
      };
    }

    return {
      itemId: inventory.item._id,
      itemCode: inventory.item.code,
      itemName: inventory.item.name,
      itemUnit: inventory.item.unit,
      warehouseId: inventory.warehouse._id,
      warehouseCode: inventory.warehouse.code,
      warehouseName: inventory.warehouse.name,
      batchNumber: inventory.batchNumber,
      currentStock: inventory.quantity,
      availableStock: inventory.availableQuantity,
      reservedStock: inventory.reservedQuantity,
      lastUpdated: inventory.lastUpdated,
      exists: true,
    };
  }

  /**
   * Get reason label from reason code
   * @private
   * @param {string} reason - Reason code
   * @returns {string} Reason label
   */
  _getReasonLabel(reason) {
    const reasonLabels = {
      opening_balance: 'Opening Balance',
      physical_count: 'Physical Count Correction',
      damage: 'Damage',
      expiry: 'Expiry',
      theft: 'Theft',
      other: 'Other',
    };

    return reasonLabels[reason] || reason;
  }

  /**
   * Get adjustment statistics
   * @param {Object} filters - Filter options
   * @param {Date} [filters.startDate] - Start date
   * @param {Date} [filters.endDate] - End date
   * @param {string} [filters.warehouseId] - Filter by warehouse
   * @returns {Promise<Object>} Adjustment statistics
   */
  async getAdjustmentStatistics(filters = {}) {
    const query = {
      referenceType: 'adjustment',
    };

    if (filters.warehouseId) {
      query.warehouse = filters.warehouseId;
    }

    if (filters.startDate || filters.endDate) {
      query.movementDate = {};
      if (filters.startDate) {
        query.movementDate.$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        query.movementDate.$lte = new Date(filters.endDate);
      }
    }

    const movements = await StockMovement.find(query);

    const stats = {
      totalAdjustments: movements.length,
      increases: 0,
      decreases: 0,
      totalQuantityIncreased: 0,
      totalQuantityDecreased: 0,
      netChange: 0,
      reasonBreakdown: {
        physical_count: 0,
        damage: 0,
        expiry: 0,
        theft: 0,
        other: 0,
      },
      topAdjustedItems: {},
      adjustmentsByDate: {},
    };

    movements.forEach((movement) => {
      const isIncrease = movement.movementType === 'in';
      const quantity = Math.abs(movement.quantity);

      if (isIncrease) {
        stats.increases++;
        stats.totalQuantityIncreased += quantity;
        stats.netChange += quantity;
      } else {
        stats.decreases++;
        stats.totalQuantityDecreased += quantity;
        stats.netChange -= quantity;
      }

      // Extract reason from notes
      const notes = movement.notes || '';
      if (notes.includes('Physical Count')) stats.reasonBreakdown.physical_count++;
      else if (notes.includes('Damage')) stats.reasonBreakdown.damage++;
      else if (notes.includes('Expiry')) stats.reasonBreakdown.expiry++;
      else if (notes.includes('Theft')) stats.reasonBreakdown.theft++;
      else stats.reasonBreakdown.other++;

      // Track top adjusted items
      const itemId = movement.itemId.toString();
      if (!stats.topAdjustedItems[itemId]) {
        stats.topAdjustedItems[itemId] = {
          itemId,
          count: 0,
          totalQuantity: 0,
        };
      }
      stats.topAdjustedItems[itemId].count++;
      stats.topAdjustedItems[itemId].totalQuantity += quantity;

      // Track adjustments by date
      const dateKey = movement.movementDate.toISOString().split('T')[0];
      if (!stats.adjustmentsByDate[dateKey]) {
        stats.adjustmentsByDate[dateKey] = {
          date: dateKey,
          count: 0,
          increases: 0,
          decreases: 0,
        };
      }
      stats.adjustmentsByDate[dateKey].count++;
      if (isIncrease) {
        stats.adjustmentsByDate[dateKey].increases++;
      } else {
        stats.adjustmentsByDate[dateKey].decreases++;
      }
    });

    // Convert top adjusted items to array and sort
    stats.topAdjustedItems = Object.values(stats.topAdjustedItems)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Convert adjustments by date to array and sort
    stats.adjustmentsByDate = Object.values(stats.adjustmentsByDate)
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    return stats;
  }
}

module.exports = new StockAdjustmentService();
