const mongoose = require('mongoose');
const Inventory = require('../models/Inventory');
const StockMovement = require('../models/StockMovement');
const Warehouse = require('../models/Warehouse');
const Item = require('../models/Item');
const inventoryService = require('./inventoryService');
const AppError = require('../utils/appError');

/**
 * Stock Transfer Service
 * Handles business logic for transferring stock between warehouses
 * Implements Requirements 3.1-3.15 from Inventory Management Spec
 */
class StockTransferService {
  /**
   * Create stock transfer between warehouses
   * Requirement 3.1-3.15: Inter-Warehouse Stock Transfer
   * @param {Object} transferData - Transfer data
   * @param {string} transferData.itemId - Item ID
   * @param {string} transferData.fromWarehouseId - Source warehouse ID
   * @param {string} transferData.toWarehouseId - Destination warehouse ID
   * @param {number} [transferData.quantity] - Total quantity in units (legacy)
   * @param {Object} [transferData.quantities] - Quantity breakdown (carton/box/unit)
   * @param {number} [transferData.quantities.qtyCtn] - Quantity in cartons
   * @param {number} [transferData.quantities.qtyBox] - Quantity in boxes
   * @param {number} [transferData.quantities.qtyUnit] - Quantity in units
   * @param {string} [transferData.batchNumber] - Batch number if applicable
   * @param {Date} [transferData.expiryDate] - Expiry date for batch
   * @param {string} [transferData.status] - Transfer status (pending, in_transit, completed)
   * @param {string} [transferData.notes] - Transfer notes
   * @param {string} transferData.createdBy - User ID who initiated transfer
   * @returns {Promise<Object>} Transfer result with movement records
   */
  async createTransfer(transferData) {
    const {
      itemId,
      fromWarehouseId,
      toWarehouseId,
      quantity,
      quantities,
      batchNumber,
      expiryDate,
      status = 'completed',
      notes = 'Stock Transfer',
      createdBy,
    } = transferData;

    // Validate required fields (Requirement 3.1-3.4)
    if (!itemId || !fromWarehouseId || !toWarehouseId) {
      throw new AppError('Item ID, source warehouse, and destination warehouse are required', 400);
    }

    // Requirement 3.3: Validate source ≠ destination
    if (fromWarehouseId === toWarehouseId) {
      throw new AppError('Source and destination warehouses must be different', 400);
    }

    // Calculate total unit quantity (Requirement 3.5-3.6)
    let totalUnitQty = quantity || 0;

    if (quantities) {
      const item = await Item.findById(itemId);
      if (!item) {
        throw new AppError('Item not found', 404);
      }

      // Get packing configuration from item
      const cartonToBoxes = item.packingConfig?.cartonToBoxes || 1;
      const boxToUnits = item.packingConfig?.boxToUnits || 1;

      // Calculate total units: (qtyCtn × cartonToBoxes × boxToUnits) + (qtyBox × boxToUnits) + qtyUnit
      const qtyCtn = quantities.qtyCtn || 0;
      const qtyBox = quantities.qtyBox || 0;
      const qtyUnit = quantities.qtyUnit || 0;

      totalUnitQty = (qtyCtn * cartonToBoxes * boxToUnits) + (qtyBox * boxToUnits) + qtyUnit;
    }

    if (totalUnitQty <= 0) {
      throw new AppError('Transfer quantity must be greater than 0', 400);
    }

    // Verify item exists
    const item = await Item.findById(itemId);
    if (!item) {
      throw new AppError('Item not found', 404);
    }

    // Verify warehouses exist
    const fromWarehouse = await Warehouse.findById(fromWarehouseId);
    if (!fromWarehouse) {
      throw new AppError('Source warehouse not found', 404);
    }

    const toWarehouse = await Warehouse.findById(toWarehouseId);
    if (!toWarehouse) {
      throw new AppError('Destination warehouse not found', 404);
    }

    // Build inventory query (Requirement 3.8: Support batch selection)
    const inventoryQuery = {
      item: itemId,
      warehouse: fromWarehouseId,
    };

    if (batchNumber) {
      inventoryQuery.batchNumber = batchNumber;
    }

    // Get source warehouse inventory (Requirement 3.7: Validate sufficient stock)
    const sourceInventory = await Inventory.findOne(inventoryQuery);

    if (!sourceInventory) {
      throw new AppError(
        batchNumber
          ? `Item with batch ${batchNumber} not found in source warehouse`
          : 'Item not found in source warehouse',
        404,
      );
    }

    // Validate sufficient stock in source warehouse
    if (sourceInventory.availableQuantity < totalUnitQty) {
      throw new AppError(
        `Insufficient stock in source warehouse. Available: ${sourceInventory.availableQuantity}, Requested: ${totalUnitQty}`,
        400,
      );
    }

    // Create transfer ID for linking movements
    const transferId = new mongoose.Types.ObjectId();

    // Requirement 3.12-3.14: Support "In Transit" status
    const movementStatus = status === 'in_transit' ? 'in_transit' : 'completed';

    // Create outbound stock movement (Requirement 3.11: Create stock movement records)
    const outMovement = await StockMovement.create({
      itemId,
      warehouse: fromWarehouseId,
      movementType: 'out',
      quantity: totalUnitQty,
      quantities: quantities || {
        qtyCtn: 0,
        qtyBox: 0,
        qtyUnit: totalUnitQty,
        totalUnitQty,
      },
      referenceType: 'warehouse_transfer',
      transferInfo: {
        toWarehouse: toWarehouseId,
        transferId,
      },
      batchInfo: batchNumber ? {
        batchNumber,
        expiryDate,
      } : undefined,
      movementDate: new Date(),
      notes,
      status: movementStatus,
      createdBy,
    });

    // Create inbound stock movement
    const inMovement = await StockMovement.create({
      itemId,
      warehouse: toWarehouseId,
      movementType: 'in',
      quantity: totalUnitQty,
      quantities: quantities || {
        qtyCtn: 0,
        qtyBox: 0,
        qtyUnit: totalUnitQty,
        totalUnitQty,
      },
      referenceType: 'warehouse_transfer',
      transferInfo: {
        fromWarehouse: fromWarehouseId,
        transferId,
      },
      batchInfo: batchNumber ? {
        batchNumber,
        expiryDate,
      } : undefined,
      movementDate: new Date(),
      notes,
      status: movementStatus,
      createdBy,
    });

    // Update inventory based on status
    if (status === 'completed') {
      // Requirement 3.9-3.10: Deduct from source and add to destination
      sourceInventory.quantity -= totalUnitQty;
      await sourceInventory.save();

      // Get or create destination warehouse inventory
      const destInventoryQuery = {
        item: itemId,
        warehouse: toWarehouseId,
      };

      if (batchNumber) {
        destInventoryQuery.batchNumber = batchNumber;
      }

      let destinationInventory = await Inventory.findOne(destInventoryQuery);

      if (!destinationInventory) {
        destinationInventory = await Inventory.create({
          item: itemId,
          warehouse: toWarehouseId,
          batchNumber,
          quantity: totalUnitQty,
          reservedQuantity: 0,
          available: totalUnitQty,
        });
      } else {
        destinationInventory.quantity += totalUnitQty;
        await destinationInventory.save();
      }
    } else if (status === 'in_transit') {
      // Requirement 3.13: When transfer is in transit, deduct from source but don't add to destination yet
      sourceInventory.quantity -= totalUnitQty;
      await sourceInventory.save();
    }

    // Sync Item.inventory.currentStock after transfer
    await inventoryService.syncItemCurrentStock(itemId);

    return {
      success: true,
      transferId,
      transfer: {
        itemId,
        itemName: item.name,
        itemCode: item.code,
        quantity: totalUnitQty,
        quantities,
        batchNumber,
        expiryDate,
        fromWarehouse: {
          id: fromWarehouse._id,
          code: fromWarehouse.code,
          name: fromWarehouse.name,
          remainingStock: sourceInventory.quantity,
        },
        toWarehouse: {
          id: toWarehouse._id,
          code: toWarehouse.code,
          name: toWarehouse.name,
        },
        status: movementStatus,
        notes,
        timestamp: new Date(),
      },
      movements: {
        outMovement: outMovement._id,
        inMovement: inMovement._id,
      },
    };
  }

  /**
   * Legacy method for backward compatibility
   * @deprecated Use createTransfer instead
   */
  async transferStock(transferData) {
    return this.createTransfer({
      ...transferData,
      notes: transferData.reason || transferData.notes,
      status: 'completed',
    });
  }

  /**
   * Receive transfer (complete in-transit transfer)
   * Requirement 3.14: When transfer is received, add to destination warehouse
   * @param {string} transferId - Transfer ID
   * @param {string} userId - User receiving the transfer
   * @returns {Promise<Object>} Updated transfer result
   */
  async receiveTransfer(transferId, userId) {
    if (!transferId) {
      throw new AppError('Transfer ID is required', 400);
    }

    // Find the in-transit movements
    const movements = await StockMovement.find({
      'transferInfo.transferId': transferId,
      status: 'in_transit',
    }).populate('itemId warehouse');

    if (movements.length === 0) {
      throw new AppError('In-transit transfer not found', 404);
    }

    // Find the inbound movement
    const inMovement = movements.find((m) => m.movementType === 'in');
    if (!inMovement) {
      throw new AppError('Inbound movement not found', 404);
    }

    // Get or create destination warehouse inventory
    const destInventoryQuery = {
      item: inMovement.itemId,
      warehouse: inMovement.warehouse,
    };

    if (inMovement.batchInfo?.batchNumber) {
      destInventoryQuery.batchNumber = inMovement.batchInfo.batchNumber;
    }

    let destinationInventory = await Inventory.findOne(destInventoryQuery);

    if (!destinationInventory) {
      destinationInventory = await Inventory.create({
        item: inMovement.itemId,
        warehouse: inMovement.warehouse,
        batchNumber: inMovement.batchInfo?.batchNumber,
        quantity: inMovement.quantity,
        reservedQuantity: 0,
        available: inMovement.quantity,
      });
    } else {
      destinationInventory.quantity += inMovement.quantity;
      await destinationInventory.save();
    }

    // Update movement statuses to completed
    for (const movement of movements) {
      movement.status = 'completed';
      await movement.save();
    }

    // Sync Item.inventory.currentStock after receiving transfer
    await inventoryService.syncItemCurrentStock(inMovement.itemId._id || inMovement.itemId);

    return {
      success: true,
      transferId,
      receivedQuantity: inMovement.quantity,
      warehouse: {
        id: inMovement.warehouse._id,
        name: inMovement.warehouse.name,
        newStock: destinationInventory.quantity,
      },
      receivedBy: userId,
      receivedAt: new Date(),
    };
  }

  /**
   * List transfers with filters
   * Requirement 3.15: Display transfer list
   * @param {Object} filters - Filter options
   * @param {string} [filters.itemId] - Filter by item
   * @param {string} [filters.fromWarehouseId] - Filter by source warehouse
   * @param {string} [filters.toWarehouseId] - Filter by destination warehouse
   * @param {string} [filters.status] - Filter by status
   * @param {Date} [filters.startDate] - Start date
   * @param {Date} [filters.endDate] - End date
   * @param {number} [filters.page=1] - Page number
   * @param {number} [filters.limit=50] - Items per page
   * @returns {Promise<Object>} Paginated transfer list
   */
  async listTransfers(filters = {}) {
    const {
      itemId,
      fromWarehouseId,
      toWarehouseId,
      status,
      startDate,
      endDate,
      page = 1,
      limit = 50,
    } = filters;

    // Build query for outbound movements (these represent the transfers)
    const query = {
      referenceType: 'warehouse_transfer',
      movementType: 'out',
    };

    if (itemId) {
      query.itemId = itemId;
    }

    if (fromWarehouseId) {
      query.warehouse = fromWarehouseId;
    }

    if (toWarehouseId) {
      query['transferInfo.toWarehouse'] = toWarehouseId;
    }

    if (status) {
      query.status = status;
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

    // Get total count
    const total = await StockMovement.countDocuments(query);

    // Get paginated results
    const skip = (page - 1) * limit;
    const transfers = await StockMovement.find(query)
      .populate('itemId', 'code name unit')
      .populate('warehouse', 'code name')
      .populate('transferInfo.toWarehouse', 'code name')
      .populate('createdBy', 'username')
      .sort({ movementDate: -1 })
      .skip(skip)
      .limit(limit);

    // Format results (Requirement 3.15: Display format)
    const formattedTransfers = transfers.map((transfer) => ({
      transferId: transfer.transferInfo?.transferId,
      date: transfer.movementDate,
      item: {
        id: transfer.itemId?._id,
        code: transfer.itemId?.code,
        name: transfer.itemId?.name,
      },
      fromWarehouse: {
        id: transfer.warehouse?._id,
        code: transfer.warehouse?.code,
        name: transfer.warehouse?.name,
      },
      toWarehouse: {
        id: transfer.transferInfo?.toWarehouse?._id,
        code: transfer.transferInfo?.toWarehouse?.code,
        name: transfer.transferInfo?.toWarehouse?.name,
      },
      quantity: transfer.quantity,
      quantities: transfer.quantities,
      batchNumber: transfer.batchInfo?.batchNumber,
      status: transfer.status,
      user: transfer.createdBy?.username,
      notes: transfer.notes,
      actions: ['view', 'print'],
    }));

    return {
      success: true,
      data: formattedTransfers,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get transfer history for an item
   * @param {string} itemId - Item ID
   * @param {Object} options - Query options
   * @param {string} [options.warehouseId] - Filter by warehouse
   * @param {Date} [options.startDate] - Start date
   * @param {Date} [options.endDate] - End date
   * @returns {Promise<Array>} Transfer history
   */
  async getTransferHistory(itemId, options = {}) {
    const query = {
      itemId,
      referenceType: 'warehouse_transfer',
    };

    if (options.warehouseId) {
      query.$or = [
        { warehouse: options.warehouseId },
        { 'transferInfo.toWarehouse': options.warehouseId },
        { 'transferInfo.fromWarehouse': options.warehouseId },
      ];
    }

    if (options.startDate || options.endDate) {
      query.movementDate = {};
      if (options.startDate) {
        query.movementDate.$gte = new Date(options.startDate);
      }
      if (options.endDate) {
        query.movementDate.$lte = new Date(options.endDate);
      }
    }

    return StockMovement.find(query)
      .populate('itemId', 'code name')
      .populate('warehouse', 'code name')
      .populate('transferInfo.fromWarehouse', 'code name')
      .populate('transferInfo.toWarehouse', 'code name')
      .populate('createdBy', 'username')
      .sort({ movementDate: -1 });
  }

  /**
   * Get warehouse transfer summary
   * @param {string} warehouseId - Warehouse ID
   * @param {Object} options - Query options
   * @param {Date} [options.startDate] - Start date
   * @param {Date} [options.endDate] - End date
   * @returns {Promise<Object>} Transfer summary
   */
  async getWarehouseTransferSummary(warehouseId, options = {}) {
    const query = {
      referenceType: 'warehouse_transfer',
      $or: [
        { warehouse: warehouseId },
        { 'transferInfo.toWarehouse': warehouseId },
        { 'transferInfo.fromWarehouse': warehouseId },
      ],
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
      .populate('transferInfo.fromWarehouse', 'code name')
      .populate('transferInfo.toWarehouse', 'code name');

    // Calculate summary
    const summary = {
      totalTransfersIn: 0,
      totalTransfersOut: 0,
      totalQuantityIn: 0,
      totalQuantityOut: 0,
      itemsTransferred: new Set(),
      transfers: [],
    };

    movements.forEach((movement) => {
      if (movement.movementType === 'in') {
        summary.totalTransfersIn++;
        summary.totalQuantityIn += movement.quantity;
      } else if (movement.movementType === 'out') {
        summary.totalTransfersOut++;
        summary.totalQuantityOut += movement.quantity;
      }

      summary.itemsTransferred.add(movement.itemId._id.toString());
      summary.transfers.push({
        date: movement.movementDate,
        type: movement.movementType,
        item: movement.itemId?.code,
        itemName: movement.itemId?.name,
        quantity: movement.quantity,
        status: movement.status,
        fromWarehouse: movement.transferInfo?.fromWarehouse?.name,
        toWarehouse: movement.transferInfo?.toWarehouse?.name,
      });
    });

    summary.itemsTransferred = summary.itemsTransferred.size;

    return summary;
  }

  /**
   * Validate transfer data
   * Requirement 3.2: Validate transfer before processing
   *
   * Validation Rules:
   * 1. Required fields: itemId, fromWarehouseId, toWarehouseId, quantity > 0
   * 2. Source and destination warehouses must be different
   * 3. Item must exist and be active
   * 4. Warehouses must exist and be active
   * 5. Sufficient stock must be available in source warehouse
   * 6. Batch must exist if batch number is provided
   * 7. Expiry date must be in the future if provided
   * 8. Quantity values must be positive numbers
   * 9. Cannot transfer reserved stock (only available stock)
   *
   * @param {Object} transferData - Transfer data to validate
   * @param {string} transferData.itemId - Item ID
   * @param {string} transferData.fromWarehouseId - Source warehouse ID
   * @param {string} transferData.toWarehouseId - Destination warehouse ID
   * @param {number} [transferData.quantity] - Total quantity in units
   * @param {Object} [transferData.quantities] - Quantity breakdown
   * @param {string} [transferData.batchNumber] - Batch number
   * @param {Date} [transferData.expiryDate] - Expiry date
   * @returns {Promise<Object>} Validation result with isValid flag and errors array
   */
  async validateTransferData(transferData) {
    const {
      itemId,
      fromWarehouseId,
      toWarehouseId,
      quantity,
      quantities,
      batchNumber,
      expiryDate,
    } = transferData;

    const errors = [];
    const warnings = [];

    // Validate required fields
    if (!itemId) {
      errors.push('Item ID is required');
    }

    if (!fromWarehouseId) {
      errors.push('Source warehouse ID is required');
    }

    if (!toWarehouseId) {
      errors.push('Destination warehouse ID is required');
    }

    // Validate quantity values are positive numbers
    if (quantity !== undefined && quantity !== null) {
      if (typeof quantity !== 'number' || isNaN(quantity)) {
        errors.push('Quantity must be a valid number');
      } else if (quantity < 0) {
        errors.push('Quantity cannot be negative');
      }
    }

    if (quantities) {
      const { qtyCtn, qtyBox, qtyUnit } = quantities;

      if (qtyCtn !== undefined && qtyCtn !== null) {
        if (typeof qtyCtn !== 'number' || isNaN(qtyCtn) || qtyCtn < 0) {
          errors.push('Carton quantity must be a non-negative number');
        }
      }

      if (qtyBox !== undefined && qtyBox !== null) {
        if (typeof qtyBox !== 'number' || isNaN(qtyBox) || qtyBox < 0) {
          errors.push('Box quantity must be a non-negative number');
        }
      }

      if (qtyUnit !== undefined && qtyUnit !== null) {
        if (typeof qtyUnit !== 'number' || isNaN(qtyUnit) || qtyUnit < 0) {
          errors.push('Unit quantity must be a non-negative number');
        }
      }
    }

    // Calculate total quantity
    let totalUnitQty = quantity || 0;
    let item = null;

    if (quantities && itemId) {
      item = await Item.findById(itemId);
      if (item) {
        const cartonToBoxes = item.packingConfig?.cartonToBoxes || 1;
        const boxToUnits = item.packingConfig?.boxToUnits || 1;
        const qtyCtn = quantities.qtyCtn || 0;
        const qtyBox = quantities.qtyBox || 0;
        const qtyUnit = quantities.qtyUnit || 0;
        totalUnitQty = (qtyCtn * cartonToBoxes * boxToUnits) + (qtyBox * boxToUnits) + qtyUnit;
      }
    }

    if (totalUnitQty <= 0) {
      errors.push('Transfer quantity must be greater than 0');
    }

    // Check item exists and is active
    if (!item && itemId) {
      item = await Item.findById(itemId);
    }

    if (!item) {
      errors.push('Item not found');
    } else {
      // Check if item is active (if status field exists)
      if (item.status && item.status !== 'active') {
        errors.push(`Item is ${item.status} and cannot be transferred`);
      }

      // Check if item is discontinued
      if (item.isDiscontinued === true) {
        errors.push('Item is discontinued and cannot be transferred');
      }
    }

    // Check warehouses exist and are active
    const fromWarehouse = await Warehouse.findById(fromWarehouseId);
    if (!fromWarehouse) {
      errors.push('Source warehouse not found');
    } else {
      // Check if warehouse is active (if status field exists)
      if (fromWarehouse.status && fromWarehouse.status !== 'active') {
        errors.push(`Source warehouse is ${fromWarehouse.status} and cannot process transfers`);
      }
    }

    const toWarehouse = await Warehouse.findById(toWarehouseId);
    if (!toWarehouse) {
      errors.push('Destination warehouse not found');
    } else {
      // Check if warehouse is active (if status field exists)
      if (toWarehouse.status && toWarehouse.status !== 'active') {
        errors.push(`Destination warehouse is ${toWarehouse.status} and cannot receive transfers`);
      }
    }

    // Check warehouses are different (Requirement 3.3)
    if (fromWarehouseId === toWarehouseId) {
      errors.push('Source and destination warehouses must be different');
    }

    // Validate expiry date if provided
    if (expiryDate) {
      const expiryDateObj = new Date(expiryDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (isNaN(expiryDateObj.getTime())) {
        errors.push('Invalid expiry date format');
      } else if (expiryDateObj < today) {
        errors.push('Cannot transfer expired batch. Expiry date must be in the future');
      } else {
        // Check if expiry is within 30 days (warning)
        const daysUntilExpiry = Math.ceil((expiryDateObj - today) / (1000 * 60 * 60 * 24));
        if (daysUntilExpiry <= 30) {
          warnings.push(`Batch expires in ${daysUntilExpiry} days. Consider transferring fresher stock`);
        }
      }
    }

    // Check source inventory (Requirement 3.7-3.8)
    let sourceInventory = null;
    if (item && fromWarehouse && errors.length === 0) {
      const inventoryQuery = {
        item: itemId,
        warehouse: fromWarehouseId,
      };

      if (batchNumber) {
        inventoryQuery.batchNumber = batchNumber;
      }

      sourceInventory = await Inventory.findOne(inventoryQuery);

      if (!sourceInventory) {
        errors.push(
          batchNumber
            ? `Item with batch ${batchNumber} not found in source warehouse`
            : 'Item not found in source warehouse',
        );
      } else {
        // Validate sufficient available stock (not reserved)
        if (sourceInventory.availableQuantity < totalUnitQty) {
          errors.push(
            `Insufficient available stock. Available: ${sourceInventory.availableQuantity}, Requested: ${totalUnitQty}`,
          );
        }

        // Check if trying to transfer more than actual quantity
        if (sourceInventory.quantity < totalUnitQty) {
          errors.push(
            `Insufficient total stock. Total: ${sourceInventory.quantity}, Requested: ${totalUnitQty}`,
          );
        }

        // Validate batch expiry if batch exists
        if (sourceInventory.expiryDate) {
          const batchExpiryDate = new Date(sourceInventory.expiryDate);
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          if (batchExpiryDate < today) {
            errors.push(`Batch ${sourceInventory.batchNumber} has expired and cannot be transferred`);
          }
        }

        // Warning if transferring large percentage of stock
        const transferPercentage = (totalUnitQty / sourceInventory.quantity) * 100;
        if (transferPercentage > 80) {
          warnings.push(`Transferring ${transferPercentage.toFixed(1)}% of available stock from source warehouse`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      totalQuantity: totalUnitQty,
      item: item ? {
        id: item._id,
        code: item.code,
        name: item.name,
        status: item.status,
        isDiscontinued: item.isDiscontinued,
      } : null,
      fromWarehouse: fromWarehouse ? {
        id: fromWarehouse._id,
        code: fromWarehouse.code,
        name: fromWarehouse.name,
        status: fromWarehouse.status,
      } : null,
      toWarehouse: toWarehouse ? {
        id: toWarehouse._id,
        code: toWarehouse.code,
        name: toWarehouse.name,
        status: toWarehouse.status,
      } : null,
      sourceInventory: sourceInventory ? {
        quantity: sourceInventory.quantity,
        availableQuantity: sourceInventory.availableQuantity,
        reservedQuantity: sourceInventory.reservedQuantity,
        batchNumber: sourceInventory.batchNumber,
        expiryDate: sourceInventory.expiryDate,
      } : null,
    };
  }

  /**
   * Legacy validation method for backward compatibility
   * @deprecated Use validateTransferData instead
   */
  async validateTransfer(itemId, fromWarehouseId, toWarehouseId, quantity) {
    return this.validateTransferData({
      itemId,
      fromWarehouseId,
      toWarehouseId,
      quantity,
    });
  }

  /**
   * Process transfer (validate and create)
   * Validates transfer data and creates the transfer if validation passes
   * @param {Object} transferData - Transfer data
   * @returns {Promise<Object>} Transfer result with validation warnings if any
   */
  async processTransfer(transferData) {
    // Validate first
    const validation = await this.validateTransferData(transferData);

    if (!validation.isValid) {
      throw new AppError(`Transfer validation failed: ${validation.errors.join(', ')}`, 400);
    }

    // Create the transfer
    const result = await this.createTransfer(transferData);

    // Include validation warnings in the result
    if (validation.warnings && validation.warnings.length > 0) {
      result.warnings = validation.warnings;
    }

    return result;
  }

  /**
   * Cancel in-transit transfer
   * @param {string} transferId - Transfer ID
   * @param {string} userId - User cancelling the transfer
   * @param {string} reason - Cancellation reason
   * @returns {Promise<Object>} Cancellation result
   */
  async cancelTransfer(transferId, userId, reason) {
    if (!transferId) {
      throw new AppError('Transfer ID is required', 400);
    }

    // Find the in-transit movements
    const movements = await StockMovement.find({
      'transferInfo.transferId': transferId,
      status: 'in_transit',
    }).populate('itemId warehouse');

    if (movements.length === 0) {
      throw new AppError('In-transit transfer not found', 404);
    }

    // Find the outbound movement to restore stock
    const outMovement = movements.find((m) => m.movementType === 'out');
    if (!outMovement) {
      throw new AppError('Outbound movement not found', 404);
    }

    // Restore stock to source warehouse
    const inventoryQuery = {
      item: outMovement.itemId,
      warehouse: outMovement.warehouse,
    };

    if (outMovement.batchInfo?.batchNumber) {
      inventoryQuery.batchNumber = outMovement.batchInfo.batchNumber;
    }

    const sourceInventory = await Inventory.findOne(inventoryQuery);
    if (sourceInventory) {
      sourceInventory.quantity += outMovement.quantity;
      await sourceInventory.save();
    }

    // Update movement statuses to cancelled
    for (const movement of movements) {
      movement.status = 'cancelled';
      movement.notes = `${movement.notes || ''} - Cancelled: ${reason}`.trim();
      await movement.save();
    }

    // Sync Item.inventory.currentStock after restoring stock
    const itemId = outMovement.itemId._id || outMovement.itemId;
    await inventoryService.syncItemCurrentStock(itemId);

    return {
      success: true,
      transferId,
      cancelledQuantity: outMovement.quantity,
      restoredToWarehouse: {
        id: outMovement.warehouse._id,
        name: outMovement.warehouse.name,
      },
      cancelledBy: userId,
      cancelledAt: new Date(),
      reason,
    };
  }
}

module.exports = new StockTransferService();
