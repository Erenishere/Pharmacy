const inventoryRepository = require('../repositories/inventoryRepository');
const itemService = require('./itemService');
const { executeTransactionalOperation } = require('../utils/transactionUtils');
const eventPublisherService = require('./eventPublisherService');

class InventoryService {
  /**
   * Get current stock level for an item across all locations
   * @param {string} itemId - Item ID
   * @returns {Promise<number>} Total quantity in stock
   */
  async getItemStock(itemId) {
    return inventoryRepository.getTotalStock(itemId);
  }

  /**
   * Get stock levels by location for an item
   * @param {string} itemId - Item ID
   * @returns {Promise<Array>} Array of stock levels by location
   */
  async getItemStockByLocation(itemId) {
    return inventoryRepository.getStockByLocation(itemId);
  }

  /**
   * Add stock to inventory
   * @param {string} itemId - Item ID
   * @param {string} locationId - Location ID
   * @param {number} quantity - Quantity to add
   * @param {Object} [options] - Additional options
   * @param {string} [options.batchId] - Batch ID
   * @param {string} [options.referenceId] - Reference ID (e.g., purchase order ID)
   * @param {string} [options.notes] - Notes about the transaction
   * @returns {Promise<Object>} Updated inventory record
   */
  async addStock(itemId, locationId, quantity, options = {}) {
    if (quantity <= 0) {
      throw new Error('Quantity must be greater than zero');
    }

    // Verify item exists
    await itemService.getItemById(itemId);

    // Update inventory
    const inventory = await inventoryRepository.updateQuantity(
      itemId,
      locationId,
      quantity,
      options.batchId,
    );

    // Log the transaction
    await this.logTransaction({
      itemId,
      locationId,
      batchId: options.batchId,
      referenceId: options.referenceId,
      quantity,
      transactionType: 'STOCK_IN',
      notes: options.notes || `Added ${quantity} units to inventory`,
      createdBy: options.userId,
    });

    // Sync Item.inventory.currentStock
    await this.syncItemCurrentStock(itemId);

    return inventory;
  }

  /**
   * Remove stock from inventory
   * @param {string} itemId - Item ID
   * @param {string} locationId - Location ID
   * @param {number} quantity - Quantity to remove
   * @param {Object} [options] - Additional options
   * @param {string} [options.batchId] - Batch ID
   * @param {string} [options.referenceId] - Reference ID (e.g., sales order ID)
   * @param {string} [options.notes] - Notes about the transaction
   * @returns {Promise<Object>} Updated inventory record
   */
  async removeStock(itemId, locationId, quantity, options = {}) {
    if (quantity <= 0) {
      throw new Error('Quantity must be greater than zero');
    }

    const { session } = options;

    // Verify item exists and has sufficient stock
    const currentStock = await this.getItemStock(itemId);
    if (currentStock < quantity) {
      throw new Error('Insufficient stock available');
    }

    // Update inventory (quantity is negative for removal)
    const inventory = await inventoryRepository.updateQuantity(
      itemId,
      locationId,
      -quantity,
      options.batchId || options.batchNumber,
      session,
    );

    // Log the transaction
    await this.logTransaction({
      itemId,
      warehouseId: locationId,
      batchNumber: options.batchId || options.batchNumber,
      referenceId: options.referenceId,
      quantity: -quantity,
      transactionType: 'STOCK_OUT',
      notes: options.notes || `Removed ${quantity} units from inventory`,
      createdBy: options.userId,
    }, session);

    // Sync Item.inventory.currentStock
    await this.syncItemCurrentStock(itemId, session);

    return inventory;
  }

  /**
   * Transfer stock between locations with transaction support
   * @param {string} itemId - Item ID
   * @param {string} fromLocationId - Source location ID
   * @param {string} toLocationId - Destination location ID
   * @param {number} quantity - Quantity to transfer
   * @param {Object} [options] - Additional options
   * @param {string} [options.batchId] - Batch ID
   * @param {string} [options.referenceId] - Reference ID (e.g., transfer order ID)
   * @param {string} [options.notes] - Notes about the transfer
   * @returns {Promise<Object>} Result of the transfer
   */
  async transferStock(itemId, fromLocationId, toLocationId, quantity, options = {}) {
    if (fromLocationId === toLocationId) {
      throw new Error('Source and destination locations must be different');
    }

    if (quantity <= 0) {
      throw new Error('Quantity must be greater than zero');
    }

    // Execute transfer within transaction
    return executeTransactionalOperation(async (session) => {
      // Verify item exists
      await itemService.getItemById(itemId);

      // Verify source stock within transaction
      const Inventory = require('../models/Inventory');
      const sourceInventory = await Inventory.findOne({
        item: itemId,
        warehouse: fromLocationId,
      }).session(session);

      const sourceStock = sourceInventory?.quantity || 0;
      if (sourceStock < quantity) {
        throw new Error(`Insufficient stock available in source warehouse. Available: ${sourceStock}, Required: ${quantity}`);
      }

      // Perform the transfer using atomic operations
      const result = await inventoryRepository.transferInventory(
        itemId,
        fromLocationId,
        toLocationId,
        quantity,
        options.batchId,
        session,
      );

      // Log outbound movement from source
      await this.logTransaction({
        itemId,
        warehouseId: fromLocationId,
        referenceId: options.referenceId,
        quantity,
        transactionType: 'STOCK_TRANSFER',
        fromWarehouseId: fromLocationId,
        toWarehouseId: toLocationId,
        notes: options.notes || `Transferred ${quantity} units to ${toLocationId}`,
        createdBy: options.userId,
      }, session);

      // Log inbound movement to destination
      await this.logTransaction({
        itemId,
        warehouseId: toLocationId,
        referenceId: options.referenceId,
        quantity,
        transactionType: 'STOCK_IN',
        referenceType: 'warehouse_transfer',
        notes: options.notes || `Received ${quantity} units from ${fromLocationId}`,
        createdBy: options.userId,
      }, session);

      // Sync Item.inventory.currentStock (outside transaction for performance)
      await this.syncItemCurrentStock(itemId);

      // Publish stock update event
      await eventPublisherService.publishStockUpdated(itemId, fromLocationId, -quantity, 'transfer_out');
      await eventPublisherService.publishStockUpdated(itemId, toLocationId, quantity, 'transfer_in');

      return result;
    }, {
      maxRetries: 3,
      timeout: 30000,
    });
  }

  /**
   * Adjust inventory level (manual adjustment)
   * @param {string} itemId - Item ID
   * @param {string} locationId - Location ID
   * @param {number} newQuantity - New quantity
   * @param {Object} [options] - Additional options
   * @param {string} [options.batchId] - Batch ID
   * @param {string} [options.reason] - Reason for adjustment
   * @param {string} [options.notes] - Additional notes
   * @returns {Promise<Object>} Updated inventory record
   */
  async adjustStock(itemId, locationId, newQuantity, options = {}) {
    if (newQuantity < 0) {
      throw new Error('Quantity cannot be negative');
    }

    // Get current inventory
    const currentInventory = await inventoryRepository.findByItemAndLocation(
      itemId,
      locationId,
      options.batchId,
    );

    const currentQuantity = currentInventory ? currentInventory.quantity : 0;
    const quantityDifference = newQuantity - currentQuantity;

    if (quantityDifference === 0) {
      return currentInventory || { item: itemId, location: locationId, quantity: 0 };
    }

    // Update inventory
    const inventory = await inventoryRepository.updateQuantity(
      itemId,
      locationId,
      quantityDifference,
      options.batchId,
    );

    // Log the adjustment
    await this.logTransaction({
      itemId,
      locationId,
      batchId: options.batchId,
      referenceId: options.referenceId,
      quantity: quantityDifference,
      transactionType: 'STOCK_ADJUST',
      notes: options.notes || `Adjusted stock from ${currentQuantity} to ${newQuantity}. ${options.reason || ''}`.trim(),
      createdBy: options.userId,
    });

    // Sync Item.inventory.currentStock
    await this.syncItemCurrentStock(itemId);

    return inventory;
  }

  /**
   * Get low stock items
   * @param {Object} [options] - Options
   * @param {number} [options.threshold] - Threshold for low stock
   * @param {string} [options.locationId] - Filter by location ID
   * @returns {Promise<Array>} Array of low stock items
   */
  async getLowStockItems(options = {}) {
    const { threshold, locationId } = options;

    if (locationId) {
      // Get low stock items for a specific location
      const allItems = await inventoryRepository.getStockByLocation(locationId);
      return allItems.filter((item) => item.quantity <= (item.minimumStock || threshold || 10));
    }

    // Get low stock items across all locations
    return inventoryRepository.getLowStockItems(threshold);
  }

  /**
   * Get inventory movement history
   * @param {Object} filters - Filter criteria
   * @param {string} [filters.itemId] - Filter by item ID
   * @param {string} [filters.locationId] - Filter by location ID
   * @param {string} [filters.batchId] - Filter by batch ID
   * @param {Date} [filters.startDate] - Start date for filtering
   * @param {Date} [filters.endDate] - End date for filtering
   * @param {number} [limit=100] - Maximum number of records to return
   * @returns {Promise<Array>} Array of inventory movements
   */
  async getMovementHistory(filters = {}, limit = 100) {
    return inventoryRepository.getMovementHistory(filters, limit);
  }

  /**
   * Get inventory valuation report
   * @param {Object} [options] - Options
   * @param {string} [options.locationId] - Filter by location ID
   * @returns {Promise<Object>} Inventory valuation summary
   */
  async getInventoryValuation(options = {}) {
    const { locationId } = options;
    return inventoryRepository.getInventoryValuation(locationId);
  }

  /**
   * Log an inventory transaction by creating a StockMovement record
   * @private
   * @param {Object} transactionData - Transaction data
   * @param {Object} [session] - Optional MongoDB session for transactional logging
   * @returns {Promise<Object>} Created StockMovement record
   */
  async logTransaction(transactionData, session = null) {
    const StockMovement = require('../models/StockMovement');

    // Map transactionType to movementType
    const movementTypeMap = {
      STOCK_IN: 'in',
      STOCK_OUT: 'out',
      STOCK_ADJUST: 'adjustment',
      STOCK_TRANSFER: 'out', // Transfer out from source
      STOCK_RESERVE: 'out',
      STOCK_RELEASE: 'in',
      STOCK_FULFILL: 'out',
    };

    // Map transactionType to referenceType
    const referenceTypeMap = {
      STOCK_IN: transactionData.referenceType || 'purchase_invoice',
      STOCK_OUT: transactionData.referenceType || 'sales_invoice',
      STOCK_ADJUST: 'adjustment',
      STOCK_TRANSFER: 'warehouse_transfer',
      STOCK_RESERVE: 'sales_invoice',
      STOCK_RELEASE: 'sales_invoice',
      STOCK_FULFILL: 'sales_invoice',
    };

    const movementType = movementTypeMap[transactionData.transactionType] || 'adjustment';
    const referenceType = referenceTypeMap[transactionData.transactionType] || 'adjustment';

    // Don't create duplicate movements for operations that already create them
    // (e.g. salesInvoiceService.processConfirmation already creates StockMovement directly)
    const skipMovementTypes = ['BULK_SALE', 'BULK_PURCHASE', 'BULK_ADJUSTMENT'];
    if (skipMovementTypes.includes(transactionData.transactionType)) {
      return { skipped: true, reason: 'Bulk operations logged separately' };
    }

    try {
      const movementData = {
        itemId: transactionData.itemId,
        warehouse: transactionData.warehouseId || transactionData.locationId,
        movementType,
        quantity: Math.abs(transactionData.quantity || 0),
        referenceType,
        referenceId: transactionData.referenceId || undefined,
        movementDate: new Date(),
        notes: transactionData.notes || '',
        status: 'completed',
        createdBy: transactionData.createdBy || undefined,
      };

      // Add transfer info for transfers
      if (transactionData.transactionType === 'STOCK_TRANSFER' && transactionData.toWarehouseId) {
        movementData.transferInfo = {
          fromWarehouse: transactionData.fromWarehouseId,
          toWarehouse: transactionData.toWarehouseId,
        };
      }

      // Only create if we have required fields
      if (movementData.itemId && movementData.quantity > 0) {
        const movement = session
          ? await StockMovement.create([movementData], { session })
          : await StockMovement.create(movementData);
        return movement;
      }

      return { skipped: true, reason: 'Missing required fields (itemId or quantity)' };
    } catch (error) {
      // Log error but don't fail the parent operation
      console.error('Failed to log stock movement:', error.message);
      return { error: error.message };
    }
  }

  /**
   * Get warehouse stock for a specific item
   * Requirement 1.2 - Show available quantity per warehouse
   * @param {string} itemId - Item ID
   * @param {string} warehouseId - Warehouse ID
   * @returns {Promise<Object>} Stock information for the warehouse
   */
  async getWarehouseStock(itemId, warehouseId) {
    if (!itemId) {
      throw new Error('Item ID is required');
    }

    if (!warehouseId) {
      throw new Error('Warehouse ID is required');
    }

    // Verify item exists
    await itemService.getItemById(itemId);

    // Get stock for specific warehouse
    const stock = await inventoryRepository.getStockByWarehouse(itemId, warehouseId);

    return {
      itemId,
      warehouseId,
      quantity: stock?.quantity || 0,
      availableQuantity: stock?.availableQuantity || 0,
      reservedQuantity: stock?.reservedQuantity || 0,
      lastUpdated: stock?.updatedAt || null,
    };
  }

  /**
   * Get total stock across all warehouses for an item
   * Requirement 1.4 - Show total quantity across all warehouses
   * @param {string} itemId - Item ID
   * @returns {Promise<Object>} Total stock information
   */
  async getTotalStockAcrossWarehouses(itemId) {
    if (!itemId) {
      throw new Error('Item ID is required');
    }

    const Inventory = require('../models/Inventory');
    const mongoose = require('mongoose');

    // Verify item exists
    await itemService.getItemById(itemId);

    // Aggregate stock across all warehouses
    const result = await Inventory.aggregate([
      {
        $match: { item: new mongoose.Types.ObjectId(itemId) },
      },
      {
        $group: {
          _id: null,
          totalQuantity: { $sum: '$quantity' },
          totalReserved: { $sum: { $ifNull: ['$reservedQuantity', 0] } },
          totalAvailable: {
            $sum: { $subtract: ['$quantity', { $ifNull: ['$reservedQuantity', 0] }] },
          },
          warehouseCount: { $sum: 1 },
        },
      },
    ]);

    if (result.length === 0) {
      return {
        itemId,
        totalQuantity: 0,
        totalReserved: 0,
        totalAvailable: 0,
        warehouseCount: 0,
      };
    }

    return {
      itemId,
      totalQuantity: result[0].totalQuantity,
      totalReserved: result[0].totalReserved,
      totalAvailable: result[0].totalAvailable,
      warehouseCount: result[0].warehouseCount,
    };
  }

  /**
   * Get all warehouse stock for an item
   * @param {string} itemId - Item ID
   * @returns {Promise<Array>} Stock information across all warehouses
   */
  async getAllWarehouseStock(itemId) {
    if (!itemId) {
      throw new Error('Item ID is required');
    }

    // Verify item exists
    await itemService.getItemById(itemId);

    // Get stock across all warehouses
    const stockByWarehouse = await inventoryRepository.getAllWarehouseStock(itemId);

    return stockByWarehouse.map((stock) => ({
      itemId: stock.itemId,
      warehouseId: stock.warehouseId,
      warehouseName: stock.warehouse?.name || 'Unknown',
      quantity: stock.quantity || 0,
      availableQuantity: stock.availableQuantity || 0,
      reservedQuantity: stock.reservedQuantity || 0,
      lastUpdated: stock.updatedAt,
    }));
  }

  /**
   * Compare stock levels across all warehouses for an item
   * @param {string} itemId - Item ID
   * @returns {Promise<Object>} Comparison of stock levels across all warehouses
   */
  async compareWarehouseStock(itemId) {
    if (!itemId) {
      throw new Error('Item ID is required');
    }

    const Item = require('../models/Item');
    const Inventory = require('../models/Inventory');
    const Warehouse = require('../models/Warehouse');

    // Verify item exists and get item details
    const item = await itemService.getItemById(itemId);
    if (!item) {
      throw new Error('Item not found');
    }

    // Get all inventory records for this item across all warehouses
    const inventoryRecords = await Inventory.find({ item: itemId })
      .populate('warehouse', 'code name location isActive')
      .sort({ 'warehouse.name': 1 });

    // Format warehouse stock comparison
    const warehouseStock = inventoryRecords.map((inv) => {
      const { warehouse } = inv;
      const quantity = inv.quantity || 0;
      const available = inv.available || 0;
      const allocated = inv.allocated || 0;
      const stockValue = quantity * (item.pricing?.costPrice || 0);

      return {
        warehouseId: warehouse?._id,
        warehouseCode: warehouse?.code,
        warehouseName: warehouse?.name,
        warehouseLocation: warehouse?.location,
        isActive: warehouse?.isActive || false,
        quantity,
        availableQuantity: available,
        allocatedQuantity: allocated,
        stockValue,
        reorderPoint: inv.reorderPoint || item.inventory?.minimumStock || 0,
        lastUpdated: inv.lastUpdated || inv.updatedAt,
        lastCounted: inv.lastCounted,
      };
    });

    // Calculate totals
    const totalQuantity = warehouseStock.reduce((sum, ws) => sum + ws.quantity, 0);
    const totalAvailable = warehouseStock.reduce((sum, ws) => sum + ws.availableQuantity, 0);
    const totalAllocated = warehouseStock.reduce((sum, ws) => sum + ws.allocatedQuantity, 0);
    const totalValue = warehouseStock.reduce((sum, ws) => sum + ws.stockValue, 0);

    // Find warehouses with stock and without stock
    const warehousesWithStock = warehouseStock.filter((ws) => ws.quantity > 0);
    const warehousesWithoutStock = warehouseStock.filter((ws) => ws.quantity === 0);

    return {
      item: {
        id: item._id,
        code: item.code,
        name: item.name,
        unit: item.unit,
        category: item.category,
        minimumStock: item.inventory?.minimumStock || 0,
        maximumStock: item.inventory?.maximumStock || 0,
        unitCost: item.pricing?.costPrice || 0,
      },
      warehouses: warehouseStock,
      summary: {
        totalWarehouses: warehouseStock.length,
        warehousesWithStock: warehousesWithStock.length,
        warehousesWithoutStock: warehousesWithoutStock.length,
        totalQuantity,
        totalAvailable,
        totalAllocated,
        totalValue,
        averageStockPerWarehouse: warehouseStock.length > 0 ? totalQuantity / warehouseStock.length : 0,
        largestStock: warehouseStock.length > 0 ? Math.max(...warehouseStock.map((ws) => ws.quantity)) : 0,
        smallestStock: warehouseStock.length > 0 ? Math.min(...warehouseStock.map((ws) => ws.quantity)) : 0,
      },
    };
  }

  /**
   * Check stock availability for an item in a specific warehouse
   * Requirement 1.2 - Check available quantity per warehouse
   * @param {string} itemId - Item ID
   * @param {string} warehouseId - Warehouse ID
   * @param {number} requiredQuantity - Required quantity
   * @returns {Promise<Object>} Availability status
   */
  async checkStockAvailability(itemId, warehouseId, requiredQuantity) {
    if (!itemId) {
      throw new Error('Item ID is required');
    }

    if (!warehouseId) {
      throw new Error('Warehouse ID is required');
    }

    if (!requiredQuantity || requiredQuantity <= 0) {
      throw new Error('Required quantity must be greater than zero');
    }

    const Inventory = require('../models/Inventory');

    // Get inventory record for the item in the warehouse
    const inventory = await Inventory.findByItemAndWarehouse(itemId, warehouseId);

    if (!inventory) {
      return {
        available: false,
        itemId,
        warehouseId,
        requiredQuantity,
        currentStock: 0,
        availableStock: 0,
        reservedStock: 0,
        shortfall: requiredQuantity,
      };
    }

    const availableStock = inventory.availableQuantity || 0;
    const isAvailable = availableStock >= requiredQuantity;

    return {
      available: isAvailable,
      itemId,
      warehouseId,
      requiredQuantity,
      currentStock: inventory.quantity || 0,
      availableStock,
      reservedStock: inventory.reservedQuantity || 0,
      shortfall: isAvailable ? 0 : requiredQuantity - availableStock,
    };
  }

  /**
   * Get low stock items across warehouses
   * Requirement 1.10 - Generate low stock alerts
   * @param {Object} filters - Filter options
   * @param {string} [filters.warehouseId] - Filter by warehouse
   * @param {string} [filters.categoryId] - Filter by category
   * @param {string} [filters.companyId] - Filter by company
   * @returns {Promise<Array>} Low stock items
   */
  async getLowStockItemsEnhanced(filters = {}) {
    const Inventory = require('../models/Inventory');
    const Item = require('../models/Item');
    const mongoose = require('mongoose');

    // Build aggregation pipeline
    const pipeline = [];

    // Match stage for warehouse filter
    if (filters.warehouseId) {
      pipeline.push({
        $match: { warehouse: new mongoose.Types.ObjectId(filters.warehouseId) },
      });
    }

    // Lookup item details
    pipeline.push({
      $lookup: {
        from: 'items',
        localField: 'item',
        foreignField: '_id',
        as: 'itemDetails',
      },
    });

    pipeline.push({ $unwind: '$itemDetails' });

    // Lookup warehouse details
    pipeline.push({
      $lookup: {
        from: 'warehouses',
        localField: 'warehouse',
        foreignField: '_id',
        as: 'warehouseDetails',
      },
    });

    pipeline.push({ $unwind: '$warehouseDetails' });

    // Apply category filter if provided
    if (filters.categoryId) {
      pipeline.push({
        $match: { 'itemDetails.category': new mongoose.Types.ObjectId(filters.categoryId) },
      });
    }

    // Apply company filter if provided
    if (filters.companyId) {
      pipeline.push({
        $match: { 'itemDetails.company': new mongoose.Types.ObjectId(filters.companyId) },
      });
    }

    // Calculate available quantity and filter low stock
    pipeline.push({
      $addFields: {
        availableQty: { $subtract: ['$quantity', { $ifNull: ['$reservedQuantity', 0] }] },
        minimumStock: { $ifNull: ['$itemDetails.inventory.minimumStock', 0] },
      },
    });

    // Filter items where available quantity is at or below minimum stock
    pipeline.push({
      $match: {
        $expr: { $lte: ['$availableQty', '$minimumStock'] },
      },
    });

    // Project final fields
    pipeline.push({
      $project: {
        itemId: '$item',
        itemCode: '$itemDetails.code',
        itemName: '$itemDetails.name',
        category: '$itemDetails.category',
        company: '$itemDetails.company',
        warehouseId: '$warehouse',
        warehouseName: '$warehouseDetails.name',
        warehouseCode: '$warehouseDetails.code',
        currentStock: '$quantity',
        reservedStock: { $ifNull: ['$reservedQuantity', 0] },
        availableStock: '$availableQty',
        minimumStock: '$minimumStock',
        maximumStock: { $ifNull: ['$itemDetails.inventory.maximumStock', 0] },
        reorderPoint: { $ifNull: ['$reorderPoint', '$minimumStock'] },
        shortfall: { $subtract: ['$minimumStock', '$availableQty'] },
        lastUpdated: 1,
      },
    });

    // Sort by shortfall (most critical first)
    pipeline.push({ $sort: { shortfall: -1, itemName: 1 } });

    const lowStockItems = await Inventory.aggregate(pipeline);

    return lowStockItems;
  }

  /**
   * Get warehouse-wise stock summary
   * Requirement 1.1 - Display warehouse-wise stock levels
   * @param {Object} filters - Filter options
   * @param {string} [filters.itemId] - Filter by item
   * @param {string} [filters.categoryId] - Filter by category
   * @param {string} [filters.companyId] - Filter by company
   * @returns {Promise<Array>} Warehouse-wise stock summary
   */
  async getWarehouseStockSummary(filters = {}) {
    const Inventory = require('../models/Inventory');
    const mongoose = require('mongoose');

    // Build aggregation pipeline
    const pipeline = [];

    // Match stage for item filter
    const matchStage = {};
    if (filters.itemId) {
      matchStage.item = new mongoose.Types.ObjectId(filters.itemId);
    }

    if (Object.keys(matchStage).length > 0) {
      pipeline.push({ $match: matchStage });
    }

    // Lookup item details
    pipeline.push({
      $lookup: {
        from: 'items',
        localField: 'item',
        foreignField: '_id',
        as: 'itemDetails',
      },
    });

    pipeline.push({ $unwind: '$itemDetails' });

    // Apply category filter if provided
    if (filters.categoryId) {
      pipeline.push({
        $match: { 'itemDetails.category': new mongoose.Types.ObjectId(filters.categoryId) },
      });
    }

    // Apply company filter if provided
    if (filters.companyId) {
      pipeline.push({
        $match: { 'itemDetails.company': new mongoose.Types.ObjectId(filters.companyId) },
      });
    }

    // Group by warehouse
    pipeline.push({
      $group: {
        _id: '$warehouse',
        totalItems: { $sum: 1 },
        totalQuantity: { $sum: '$quantity' },
        totalReserved: { $sum: { $ifNull: ['$reservedQuantity', 0] } },
        totalAvailable: { $sum: { $subtract: ['$quantity', { $ifNull: ['$reservedQuantity', 0] }] } },
        totalValue: {
          $sum: {
            $multiply: ['$quantity', { $ifNull: ['$itemDetails.pricing.costPrice', 0] }],
          },
        },
        items: {
          $push: {
            itemId: '$item',
            itemCode: '$itemDetails.code',
            itemName: '$itemDetails.name',
            quantity: '$quantity',
            reserved: { $ifNull: ['$reservedQuantity', 0] },
            available: { $subtract: ['$quantity', { $ifNull: ['$reservedQuantity', 0] }] },
            batchNumber: '$batchNumber',
          },
        },
      },
    });

    // Lookup warehouse details
    pipeline.push({
      $lookup: {
        from: 'warehouses',
        localField: '_id',
        foreignField: '_id',
        as: 'warehouseDetails',
      },
    });

    pipeline.push({ $unwind: '$warehouseDetails' });

    // Project final fields
    pipeline.push({
      $project: {
        warehouseId: '$_id',
        warehouseCode: '$warehouseDetails.code',
        warehouseName: '$warehouseDetails.name',
        warehouseLocation: '$warehouseDetails.location',
        totalItems: 1,
        totalQuantity: 1,
        totalReserved: 1,
        totalAvailable: 1,
        totalValue: { $round: ['$totalValue', 2] },
        items: 1,
      },
    });

    // Sort by warehouse name
    pipeline.push({ $sort: { warehouseName: 1 } });

    const summary = await Inventory.aggregate(pipeline);

    return summary;
  }

  /**
   * Get batch-wise stock for an item
   * Requirement 1.8 - Display batch-wise stock if batch tracking enabled
   * @param {string} itemId - Item ID
   * @param {Object} filters - Filter options
   * @param {string} [filters.warehouseId] - Filter by warehouse
   * @param {boolean} [filters.includeExpired] - Include expired batches
   * @returns {Promise<Array>} Batch-wise stock information
   */
  async getBatchWiseStock(itemId, filters = {}) {
    if (!itemId) {
      throw new Error('Item ID is required');
    }

    const Inventory = require('../models/Inventory');
    const Batch = require('../models/Batch');
    const mongoose = require('mongoose');

    // Build query
    const query = { item: new mongoose.Types.ObjectId(itemId) };

    if (filters.warehouseId) {
      query.warehouse = new mongoose.Types.ObjectId(filters.warehouseId);
    }

    // Only include records with batch numbers
    query.batchNumber = { $exists: true, $ne: null };

    // Get inventory records with batch information
    const inventoryRecords = await Inventory.find(query)
      .populate('warehouse', 'code name location')
      .sort({ batchNumber: 1 });

    // Get batch details for all batch numbers
    const batchNumbers = [...new Set(inventoryRecords.map((inv) => inv.batchNumber))];
    const batches = await Batch.find({
      item: itemId,
      batchNumber: { $in: batchNumbers },
    });

    // Create a map of batch details
    const batchMap = new Map();
    batches.forEach((batch) => {
      batchMap.set(batch.batchNumber, batch);
    });

    // Combine inventory and batch information
    const batchWiseStock = inventoryRecords.map((inv) => {
      const batch = batchMap.get(inv.batchNumber);
      const isExpired = batch && batch.expiryDate && new Date(batch.expiryDate) < new Date();

      return {
        batchNumber: inv.batchNumber,
        warehouseId: inv.warehouse?._id,
        warehouseName: inv.warehouse?.name,
        warehouseCode: inv.warehouse?.code,
        quantity: inv.quantity || 0,
        reservedQuantity: inv.reservedQuantity || 0,
        availableQuantity: inv.availableQuantity || 0,
        manufacturingDate: batch?.manufacturingDate,
        expiryDate: batch?.expiryDate,
        isExpired,
        status: batch?.status || 'active',
        lastUpdated: inv.lastUpdated,
      };
    });

    // Filter out expired batches if requested
    if (!filters.includeExpired) {
      return batchWiseStock.filter((stock) => !stock.isExpired);
    }

    return batchWiseStock;
  }

  /**
   * Get stock levels with comprehensive filters
   * Requirement 1.6 - Support filtering by warehouse, item, category, company
   * Requirement 1.7 - Support search by item name, code, barcode
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Filtered stock levels
   */
  async getStockLevels(filters = {}) {
    const Inventory = require('../models/Inventory');
    const mongoose = require('mongoose');

    // Build aggregation pipeline
    const pipeline = [];

    // Match stage for warehouse filter
    const matchStage = {};
    if (filters.warehouseId) {
      matchStage.warehouse = new mongoose.Types.ObjectId(filters.warehouseId);
    }

    if (Object.keys(matchStage).length > 0) {
      pipeline.push({ $match: matchStage });
    }

    // Lookup item details
    pipeline.push({
      $lookup: {
        from: 'items',
        localField: 'item',
        foreignField: '_id',
        as: 'itemDetails',
      },
    });

    pipeline.push({ $unwind: '$itemDetails' });

    // Lookup warehouse details
    pipeline.push({
      $lookup: {
        from: 'warehouses',
        localField: 'warehouse',
        foreignField: '_id',
        as: 'warehouseDetails',
      },
    });

    pipeline.push({ $unwind: '$warehouseDetails' });

    // Apply filters
    const filterStage = {};

    if (filters.itemId) {
      filterStage['itemDetails._id'] = new mongoose.Types.ObjectId(filters.itemId);
    }

    if (filters.categoryId) {
      filterStage['itemDetails.category'] = new mongoose.Types.ObjectId(filters.categoryId);
    }

    if (filters.companyId) {
      filterStage['itemDetails.company'] = new mongoose.Types.ObjectId(filters.companyId);
    }

    // Search by item name, code, or barcode
    if (filters.search) {
      const searchRegex = new RegExp(filters.search, 'i');
      filterStage.$or = [
        { 'itemDetails.name': searchRegex },
        { 'itemDetails.code': searchRegex },
        { 'itemDetails.barcode': searchRegex },
      ];
    }

    if (Object.keys(filterStage).length > 0) {
      pipeline.push({ $match: filterStage });
    }

    // Calculate available quantity
    pipeline.push({
      $addFields: {
        availableQty: { $subtract: ['$quantity', { $ifNull: ['$reservedQuantity', 0] }] },
      },
    });

    // Project final fields
    pipeline.push({
      $project: {
        itemId: '$item',
        itemCode: '$itemDetails.code',
        itemName: '$itemDetails.name',
        itemBarcode: '$itemDetails.barcode',
        category: '$itemDetails.category',
        company: '$itemDetails.company',
        warehouseId: '$warehouse',
        warehouseName: '$warehouseDetails.name',
        warehouseCode: '$warehouseDetails.code',
        batchNumber: 1,
        quantity: 1,
        reservedQuantity: { $ifNull: ['$reservedQuantity', 0] },
        availableQuantity: '$availableQty',
        minimumStock: { $ifNull: ['$itemDetails.inventory.minimumStock', 0] },
        maximumStock: { $ifNull: ['$itemDetails.inventory.maximumStock', 0] },
        unitCost: { $ifNull: ['$itemDetails.pricing.costPrice', 0] },
        stockValue: {
          $multiply: ['$quantity', { $ifNull: ['$itemDetails.pricing.costPrice', 0] }],
        },
        lastUpdated: 1,
      },
    });

    // Sort
    const sortField = filters.sortBy || 'itemName';
    const sortOrder = filters.sortOrder === 'desc' ? -1 : 1;
    pipeline.push({ $sort: { [sortField]: sortOrder } });

    // Pagination
    if (filters.page && filters.limit) {
      const skip = (filters.page - 1) * filters.limit;
      pipeline.push({ $skip: skip });
      pipeline.push({ $limit: filters.limit });
    }

    const stockLevels = await Inventory.aggregate(pipeline);

    // Get total count for pagination
    const countPipeline = [...pipeline.slice(0, -2)]; // Remove skip and limit
    countPipeline.push({ $count: 'total' });
    const countResult = await Inventory.aggregate(countPipeline);
    const totalCount = countResult.length > 0 ? countResult[0].total : 0;

    return {
      data: stockLevels,
      pagination: {
        total: totalCount,
        page: filters.page || 1,
        limit: filters.limit || stockLevels.length,
        pages: filters.limit ? Math.ceil(totalCount / filters.limit) : 1,
      },
    };
  }

  /**
   * Get warehouse stock levels for all items in a warehouse or all warehouses
   * @param {string} warehouseId - Warehouse ID (optional - if null, aggregates all warehouses)
   * @returns {Promise<Object>} Items with stock levels and low stock indicators
   */
  async getWarehouseStockLevels(warehouseId) {
    const Warehouse = require('../models/Warehouse');
    const Inventory = require('../models/Inventory');

    // If warehouseId is provided, use specific warehouse logic
    if (warehouseId) {
      // Verify warehouse exists
      const warehouse = await Warehouse.findById(warehouseId);
      if (!warehouse) {
        throw new Error('Warehouse not found');
      }

      // Get all inventory records for this warehouse
      const inventoryRecords = await Inventory.find({ warehouse: warehouseId })
        .populate('item', 'code name unit category pricing inventory isActive')
        .sort({ 'item.name': 1 });

      // Format the results with low stock indicators
      const stockLevels = inventoryRecords.map((inv) => {
        const { item } = inv;
        if (!item) return null; // Skip orphaned records

        const currentStock = inv.quantity || 0;
        const minStock = item.inventory?.minimumStock || 0;
        const isLowStock = currentStock <= minStock;
        const isOutOfStock = currentStock === 0;
        const stockValue = currentStock * (item.pricing?.costPrice || 0);

        return {
          itemId: item._id,
          itemCode: item.code,
          itemName: item.name,
          category: item.category,
          unit: item.unit,
          quantity: currentStock,
          availableQuantity: inv.available || 0,
          allocatedQuantity: inv.allocated || 0,
          minimumStock: minStock,
          maximumStock: item.inventory?.maximumStock || 0,
          reorderPoint: inv.reorderPoint || minStock,
          stockValue,
          unitCost: item.pricing?.costPrice || 0,
          isLowStock,
          isOutOfStock,
          stockStatus: isOutOfStock ? 'out_of_stock' : (isLowStock ? 'low_stock' : 'in_stock'),
          lastUpdated: inv.lastUpdated || inv.updatedAt,
          lastCounted: inv.lastCounted,
        };
      }).filter((item) => item !== null);

      return {
        warehouse: {
          id: warehouse._id,
          code: warehouse.code,
          name: warehouse.name,
          location: warehouse.location,
        },
        items: stockLevels,
        summary: {
          totalItems: stockLevels.length,
          totalValue: stockLevels.reduce((sum, item) => sum + item.stockValue, 0),
          lowStockItems: stockLevels.filter((item) => item.isLowStock && !item.isOutOfStock).length,
          outOfStockItems: stockLevels.filter((item) => item.isOutOfStock).length,
          inStockItems: stockLevels.filter((item) => !item.isLowStock && !item.isOutOfStock).length,
        },
      };
    }

    // Consolidated "All Warehouses" Report
    // Aggregate by item
    const inventoryRecords = await Inventory.aggregate([
      {
        $group: {
          _id: '$item',
          quantity: { $sum: '$quantity' },
          available: { $sum: '$available' },
          allocated: { $sum: '$allocated' },
          lastUpdated: { $max: '$updatedAt' },
        },
      },
      {
        $lookup: {
          from: 'items',
          localField: '_id',
          foreignField: '_id',
          as: 'item',
        },
      },
      { $unwind: '$item' },
      { $sort: { 'item.name': 1 } },
    ]);

    // Format consolidated results
    const stockLevels = inventoryRecords.map((inv) => {
      const { item } = inv;
      const currentStock = inv.quantity || 0;
      const minStock = item.inventory?.minimumStock || 0;
      const isLowStock = currentStock <= minStock;
      const isOutOfStock = currentStock === 0;
      const stockValue = currentStock * (item.pricing?.costPrice || 0);

      return {
        itemId: item._id,
        itemCode: item.code,
        itemName: item.name,
        category: item.category,
        unit: item.unit,
        quantity: currentStock,
        availableQuantity: inv.available || 0,
        allocatedQuantity: inv.allocated || 0,
        minimumStock: minStock,
        maximumStock: item.inventory?.maximumStock || 0,
        reorderPoint: minStock,
        stockValue,
        unitCost: item.pricing?.costPrice || 0,
        isLowStock,
        isOutOfStock,
        stockStatus: isOutOfStock ? 'out_of_stock' : (isLowStock ? 'low_stock' : 'in_stock'),
        lastUpdated: inv.lastUpdated,
      };
    });

    return {
      warehouse: {
        id: 'all',
        code: 'ALL',
        name: 'All Warehouses',
        location: { city: 'Consolidated', country: '' },
      },
      items: stockLevels,
      summary: {
        totalItems: stockLevels.length,
        totalValue: stockLevels.reduce((sum, item) => sum + item.stockValue, 0),
        lowStockItems: stockLevels.filter((item) => item.isLowStock && !item.isOutOfStock).length,
        outOfStockItems: stockLevels.filter((item) => item.isOutOfStock).length,
        inStockItems: stockLevels.filter((item) => !item.isLowStock && !item.isOutOfStock).length,
      },
    };
  }

  /**
   * Reserve stock for an order
   * Requirement 10.1-10.4 - Reserve stock and reduce available quantity
   * @param {string} itemId - Item ID
   * @param {string} warehouseId - Warehouse ID
   * @param {number} quantity - Quantity to reserve
   * @param {Object} options - Additional options
   * @param {string} [options.orderId] - Order ID for reference
   * @param {string} [options.batchNumber] - Batch number if applicable
   * @param {string} [options.userId] - User making the reservation
   * @returns {Promise<Object>} Reservation result
   */
  /**
   * Reserve stock for an order
   * Requirement 10.1-10.4 - Reserve stock and track reservations
   * @param {string} itemId - Item ID
   * @param {string} warehouseId - Warehouse ID
   * @param {number} quantity - Quantity to reserve
   * @param {Object} options - Additional options
   * @param {string} [options.orderId] - Order ID for reference
   * @param {string} [options.orderNumber] - Order number for reference
   * @param {string} [options.batchNumber] - Batch number if applicable
   * @param {number} [options.expirationMinutes=1440] - Expiration time in minutes (default 24 hours)
   * @param {string} [options.userId] - User creating the reservation
   * @param {string} [options.notes] - Additional notes
   * @returns {Promise<Object>} Reservation result
   */
  async reserveStock(itemId, warehouseId, quantity, options = {}) {
    if (!itemId) {
      throw new Error('Item ID is required');
    }

    if (!warehouseId) {
      throw new Error('Warehouse ID is required');
    }

    if (!quantity || quantity <= 0) {
      throw new Error('Quantity must be greater than zero');
    }

    if (!options.orderId) {
      throw new Error('Order ID is required for reservation');
    }

    const Inventory = require('../models/Inventory');
    const Reservation = require('../models/Reservation');

    // Find inventory record
    const query = { item: itemId, warehouse: warehouseId };
    if (options.batchNumber) {
      query.batchNumber = options.batchNumber;
    }

    const inventory = await Inventory.findOne(query);

    if (!inventory) {
      throw new Error('Inventory record not found for the specified item and warehouse');
    }

    // Check if sufficient stock is available
    const availableStock = inventory.availableQuantity || 0;
    if (availableStock < quantity) {
      throw new Error(`Insufficient stock available. Required: ${quantity}, Available: ${availableStock}`);
    }

    // Reserve the stock in inventory
    const reserved = inventory.reserve(quantity);
    if (!reserved) {
      throw new Error('Failed to reserve stock');
    }

    await inventory.save();

    // Calculate expiration time (default 24 hours)
    const expirationMinutes = options.expirationMinutes || 1440;
    const expiresAt = new Date(Date.now() + expirationMinutes * 60 * 1000);

    // Create reservation record
    const reservation = await Reservation.create({
      orderId: options.orderId,
      orderNumber: options.orderNumber,
      item: itemId,
      warehouse: warehouseId,
      batchNumber: options.batchNumber,
      quantity,
      status: 'active',
      expiresAt,
      notes: options.notes,
      createdBy: options.userId,
    });

    // Log the reservation
    await this.logTransaction({
      itemId,
      warehouseId,
      batchNumber: options.batchNumber,
      referenceId: options.orderId,
      quantity: -quantity,
      transactionType: 'STOCK_RESERVE',
      notes: `Reserved ${quantity} units for order ${options.orderNumber || options.orderId}. Expires at: ${expiresAt.toISOString()}`,
      createdBy: options.userId,
    });

    return {
      success: true,
      reservationId: reservation._id,
      itemId,
      warehouseId,
      reservedQuantity: quantity,
      newReservedTotal: inventory.reservedQuantity,
      newAvailableQuantity: inventory.availableQuantity,
      expiresAt,
      orderId: options.orderId,
    };
  }

  /**
   * Release reserved stock
   * Requirement 10.6-10.7 - Release reservation when order is cancelled or expires
   * @param {string} reservationId - Reservation ID (optional if itemId and warehouseId provided)
   * @param {string} itemId - Item ID (optional if reservationId provided)
   * @param {string} warehouseId - Warehouse ID (optional if reservationId provided)
   * @param {number} quantity - Quantity to release (optional if reservationId provided)
   * @param {Object} options - Additional options
   * @param {string} [options.orderId] - Order ID for reference
   * @param {string} [options.batchNumber] - Batch number if applicable
   * @param {string} [options.reason] - Reason for release
   * @param {string} [options.userId] - User releasing the reservation
   * @returns {Promise<Object>} Release result
   */
  async releaseReservation(reservationId = null, itemId = null, warehouseId = null, quantity = null, options = {}) {
    const Inventory = require('../models/Inventory');
    const Reservation = require('../models/Reservation');

    let reservation = null;
    let releaseQuantity = quantity;

    // If reservationId is provided, fetch the reservation
    if (reservationId) {
      reservation = await Reservation.findById(reservationId);
      if (!reservation) {
        throw new Error('Reservation not found');
      }

      if (reservation.status !== 'active') {
        throw new Error(`Cannot release reservation with status: ${reservation.status}`);
      }

      // Use reservation details
      itemId = reservation.item;
      warehouseId = reservation.warehouse;
      releaseQuantity = reservation.quantity;
      options.batchNumber = reservation.batchNumber;
      options.orderId = options.orderId || reservation.orderId;
      options.userId = options.userId || reservation.createdBy?._id || reservation.createdBy;
    } else {
      // Validate required parameters
      if (!itemId) {
        throw new Error('Item ID is required');
      }

      if (!warehouseId) {
        throw new Error('Warehouse ID is required');
      }

      if (!releaseQuantity || releaseQuantity <= 0) {
        throw new Error('Quantity must be greater than zero');
      }
    }

    // Find inventory record
    const query = { item: itemId, warehouse: warehouseId };
    if (options.batchNumber) {
      query.batchNumber = options.batchNumber;
    }

    const inventory = await Inventory.findOne(query);

    if (!inventory) {
      throw new Error('Inventory record not found for the specified item and warehouse');
    }

    // Release the reservation
    const released = inventory.releaseReservation(releaseQuantity);
    if (!released) {
      throw new Error(`Failed to release reservation. Reserved: ${inventory.reservedQuantity}, Requested: ${releaseQuantity}`);
    }

    await inventory.save();

    // Update reservation record if it exists
    if (reservation) {
      reservation.cancel(options.userId, options.reason || 'Manual release');
      await reservation.save();
    } else if (options.orderId) {
      // Try to find and update reservation by orderId
      const orderReservation = await Reservation.findOne({
        orderId: options.orderId,
        item: itemId,
        warehouse: warehouseId,
        status: 'active',
      });

      if (orderReservation) {
        orderReservation.cancel(options.userId, options.reason || 'Manual release');
        await orderReservation.save();
      }
    }

    // Log the release
    await this.logTransaction({
      itemId,
      warehouseId,
      batchNumber: options.batchNumber,
      referenceId: options.orderId,
      quantity: releaseQuantity,
      transactionType: 'STOCK_RELEASE',
      notes: `Released ${releaseQuantity} units reservation. Reason: ${options.reason || 'N/A'}`,
      createdBy: options.userId,
    });

    return {
      success: true,
      reservationId: reservation?._id,
      itemId,
      warehouseId,
      releasedQuantity: releaseQuantity,
      newReservedTotal: inventory.reservedQuantity,
      newAvailableQuantity: inventory.availableQuantity,
      reason: options.reason,
    };
  }

  /**
   * Get active reservations for an item
   * Requirement 10.8 - Display all active reservations
   * @param {string} itemId - Item ID (optional)
   * @param {Object} filters - Filter options
   * @param {string} [filters.warehouseId] - Filter by warehouse
   * @param {string} [filters.orderId] - Filter by order
   * @param {boolean} [filters.includeExpired=false] - Include expired reservations
   * @returns {Promise<Array>} Active reservations
   */
  async getActiveReservations(itemId = null, filters = {}) {
    const Reservation = require('../models/Reservation');
    const mongoose = require('mongoose');

    // Build query
    const query = {};

    if (itemId) {
      query.item = new mongoose.Types.ObjectId(itemId);
    }

    if (filters.warehouseId) {
      query.warehouse = new mongoose.Types.ObjectId(filters.warehouseId);
    }

    if (filters.orderId) {
      query.orderId = new mongoose.Types.ObjectId(filters.orderId);
    }

    // Filter by status
    if (filters.includeExpired) {
      query.status = { $in: ['active', 'expired'] };
    } else {
      query.status = 'active';
      query.expiresAt = { $gt: new Date() };
    }

    const reservations = await Reservation.find(query)
      .populate('warehouse', 'code name location')
      .populate('item', 'code name unit')
      .populate('orderId', 'invoiceNumber')
      .populate('createdBy', 'username')
      .sort({ expiresAt: 1 });

    return reservations.map((res) => ({
      reservationId: res._id,
      orderId: res.orderId?._id,
      orderNumber: res.orderNumber || res.orderId?.invoiceNumber,
      itemId: res.item._id,
      itemCode: res.item.code,
      itemName: res.item.name,
      warehouseId: res.warehouse._id,
      warehouseName: res.warehouse.name,
      warehouseCode: res.warehouse.code,
      batchNumber: res.batchNumber,
      quantity: res.quantity,
      status: res.status,
      expiresAt: res.expiresAt,
      remainingTime: res.remainingTime,
      isExpired: res.isExpired,
      createdBy: res.createdBy?.username,
      createdAt: res.createdAt,
      notes: res.notes,
    }));
  }

  /**
   * Fulfill a reservation (when order is completed)
   * Requirement 10.5 - Release reservation and deduct actual stock when order is fulfilled
   * @param {string} reservationId - Reservation ID
   * @param {Object} options - Additional options
   * @param {string} [options.userId] - User fulfilling the reservation
   * @returns {Promise<Object>} Fulfillment result
   */
  async fulfillReservation(reservationId, options = {}) {
    if (!reservationId) {
      throw new Error('Reservation ID is required');
    }

    const Reservation = require('../models/Reservation');
    const Inventory = require('../models/Inventory');

    // Find the reservation
    const reservation = await Reservation.findById(reservationId);
    if (!reservation) {
      throw new Error('Reservation not found');
    }

    if (reservation.status !== 'active') {
      throw new Error(`Cannot fulfill reservation with status: ${reservation.status}`);
    }

    // Find inventory record
    const query = {
      item: reservation.item,
      warehouse: reservation.warehouse,
    };
    if (reservation.batchNumber) {
      query.batchNumber = reservation.batchNumber;
    }

    const inventory = await Inventory.findOne(query);
    if (!inventory) {
      throw new Error('Inventory record not found');
    }

    // Release the reservation
    const released = inventory.releaseReservation(reservation.quantity);
    if (!released) {
      throw new Error('Failed to release reservation from inventory');
    }

    // Deduct actual stock
    const removed = inventory.removeStock(reservation.quantity);
    if (!removed) {
      // Rollback reservation release
      inventory.reserve(reservation.quantity);
      await inventory.save();
      throw new Error('Insufficient stock to fulfill reservation');
    }

    await inventory.save();

    // Mark reservation as fulfilled
    reservation.fulfill(options.userId);
    await reservation.save();

    // Log the fulfillment
    await this.logTransaction({
      itemId: reservation.item,
      warehouseId: reservation.warehouse,
      batchNumber: reservation.batchNumber,
      referenceId: reservation.orderId,
      quantity: -reservation.quantity,
      transactionType: 'STOCK_FULFILL',
      notes: `Fulfilled reservation ${reservationId}. Deducted ${reservation.quantity} units from stock.`,
      createdBy: options.userId,
    });

    // Sync Item.inventory.currentStock
    await this.syncItemCurrentStock(reservation.item);

    return {
      success: true,
      reservationId: reservation._id,
      itemId: reservation.item,
      warehouseId: reservation.warehouse,
      fulfilledQuantity: reservation.quantity,
      newQuantity: inventory.quantity,
      newReservedTotal: inventory.reservedQuantity,
      newAvailableQuantity: inventory.availableQuantity,
    };
  }

  /**
   * Auto-release expired reservations
   * Requirement 10.7 - Auto-release expired reservations
   * @param {Object} options - Additional options
   * @param {number} [options.limit=100] - Maximum number of reservations to process
   * @returns {Promise<Object>} Release result with count
   */
  async autoReleaseExpiredReservations(options = {}) {
    const Reservation = require('../models/Reservation');
    const limit = options.limit || 100;

    // Find expired reservations
    const expiredReservations = await Reservation.findExpired(limit);

    if (expiredReservations.length === 0) {
      return {
        success: true,
        releasedCount: 0,
        message: 'No expired reservations found',
      };
    }

    const results = {
      success: true,
      releasedCount: 0,
      failedCount: 0,
      errors: [],
    };

    // Process each expired reservation
    for (const reservation of expiredReservations) {
      try {
        await this.releaseReservation(
          reservation._id.toString(),
          null,
          null,
          null,
          {
            reason: 'Auto-released due to expiration',
            userId: null, // System action
          },
        );

        // Mark as expired
        reservation.expire();
        await reservation.save();

        results.releasedCount++;
      } catch (error) {
        results.failedCount++;
        results.errors.push({
          reservationId: reservation._id,
          error: error.message,
        });
      }
    }

    return results;
  }

  /**
   * Get reservation by ID
   * @param {string} reservationId - Reservation ID
   * @returns {Promise<Object>} Reservation details
   */
  async getReservationById(reservationId) {
    if (!reservationId) {
      throw new Error('Reservation ID is required');
    }

    const Reservation = require('../models/Reservation');

    const reservation = await Reservation.findById(reservationId)
      .populate('warehouse', 'code name location')
      .populate('item', 'code name unit')
      .populate('orderId', 'invoiceNumber')
      .populate('createdBy', 'username')
      .populate('fulfilledBy', 'username')
      .populate('cancelledBy', 'username');

    if (!reservation) {
      throw new Error('Reservation not found');
    }

    return {
      reservationId: reservation._id,
      orderId: reservation.orderId?._id,
      orderNumber: reservation.orderNumber || reservation.orderId?.invoiceNumber,
      itemId: reservation.item._id,
      itemCode: reservation.item.code,
      itemName: reservation.item.name,
      warehouseId: reservation.warehouse._id,
      warehouseName: reservation.warehouse.name,
      warehouseCode: reservation.warehouse.code,
      batchNumber: reservation.batchNumber,
      quantity: reservation.quantity,
      status: reservation.status,
      expiresAt: reservation.expiresAt,
      remainingTime: reservation.remainingTime,
      isExpired: reservation.isExpired,
      createdBy: reservation.createdBy?.username,
      createdAt: reservation.createdAt,
      fulfilledBy: reservation.fulfilledBy?.username,
      fulfilledAt: reservation.fulfilledAt,
      cancelledBy: reservation.cancelledBy?.username,
      cancelledAt: reservation.cancelledAt,
      cancellationReason: reservation.cancellationReason,
      notes: reservation.notes,
    };
  }

  /**
   * Adjust inventory (increase or decrease)
   * @param {string} itemId - Item ID
   * @param {number} quantity - Quantity to adjust (positive or negative)
   * @param {string} operation - Operation type ('increase' or 'decrease')
   * @param {string} reason - Reason for adjustment
   * @param {Object} [options] - Additional options
   * @returns {Promise<Object>} Updated inventory
   */
  async adjustInventory(itemId, quantity, operation, reason, options = {}) {
    const session = options.session || null;

    if (!itemId) {
      throw new Error('Item ID is required');
    }

    if (!quantity || quantity <= 0) {
      throw new Error('Quantity must be greater than zero');
    }

    if (!['increase', 'decrease'].includes(operation)) {
      throw new Error('Operation must be either "increase" or "decrease"');
    }

    // Verify item exists
    const item = await itemService.getItemById(itemId);

    // Calculate adjustment amount
    const adjustmentAmount = operation === 'increase' ? quantity : -quantity;

    // Check if decrease would result in negative stock
    if (operation === 'decrease') {
      const currentStock = item.inventory?.currentStock || 0;
      if (currentStock < quantity) {
        throw new Error(`Insufficient stock. Current: ${currentStock}, Requested: ${quantity}`);
      }
    }

    const Item = require('../models/Item');
    const Inventory = require('../models/Inventory');
    const mongoose = require('mongoose');

    // If warehouseId provided, update Inventory collection properly
    if (options.warehouseId) {
      const query = {
        item: new mongoose.Types.ObjectId(itemId),
        warehouse: new mongoose.Types.ObjectId(options.warehouseId),
      };

      await Inventory.findOneAndUpdate(
        query,
        {
          $inc: { quantity: adjustmentAmount },
          $set: { lastUpdated: new Date() },
        },
        { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true, session },
      );

      // Sync Item.inventory.currentStock from Inventory collection
      await this.syncItemCurrentStock(itemId);
    } else {
      // Legacy fallback: update Item directly when no warehouse specified
      const itemDocQuery = Item.findById(itemId);
      const itemDoc = session ? await itemDocQuery.session(session) : await itemDocQuery;
      if (!itemDoc) {
        throw new Error('Item not found');
      }
      itemDoc.inventory.currentStock = Math.max(0, (itemDoc.inventory.currentStock || 0) + adjustmentAmount);
      await itemDoc.save({ session });
    }

    // Log the transaction
    await this.logTransaction({
      itemId,
      warehouseId: options.warehouseId,
      quantity: adjustmentAmount,
      transactionType: operation === 'increase' ? 'STOCK_IN' : 'STOCK_OUT',
      referenceType: 'adjustment',
      notes: reason,
      createdBy: options.userId,
    }, session);

    const itemDocQuery = Item.findById(itemId);
    return session ? itemDocQuery.session(session) : itemDocQuery;
  }

  /**
   * Adjust inventory using box/unit quantities
   * Phase 2 - Requirement 12.4 - Task 45.4
   * @param {string} itemId - Item ID
   * @param {number} boxQty - Box quantity
   * @param {number} unitQty - Unit quantity
   * @param {string} operation - Operation type ('increase' or 'decrease')
   * @param {string} reason - Reason for adjustment
   * @param {Object} [options] - Additional options
   * @returns {Promise<Object>} Updated inventory with conversion details
   */
  async adjustInventoryBoxUnit(itemId, boxQty = 0, unitQty = 0, operation, reason, options = {}) {
    if (!itemId) {
      throw new Error('Item ID is required');
    }

    if (boxQty < 0 || unitQty < 0) {
      throw new Error('Box and unit quantities cannot be negative');
    }

    if (boxQty === 0 && unitQty === 0) {
      throw new Error('At least one of box quantity or unit quantity must be greater than 0');
    }

    // Get item to retrieve packSize
    const Item = require('../models/Item');
    const item = await Item.findById(itemId);

    if (!item) {
      throw new Error('Item not found');
    }

    const packSize = item.packSize || 1;

    // Convert boxes to units using packSize
    const boxUnitConversionService = require('./boxUnitConversionService');
    const totalUnits = boxUnitConversionService.calculateTotalUnits(boxQty, unitQty, packSize);

    // Use existing adjustInventory method with total units
    const result = await this.adjustInventory(itemId, totalUnits, operation, reason, options);

    // Return result with conversion details
    return {
      ...result.toObject(),
      conversionDetails: {
        boxQuantity: boxQty,
        unitQuantity: unitQty,
        packSize,
        totalUnits,
        operation,
      },
    };
  }

  /**
   * Get current stock in box/unit format
   * Phase 2 - Requirement 12.5 - Task 45.5
   * @param {string} itemId - Item ID
   * @returns {Promise<Object>} Stock details in box/unit format
   */
  async getStockBoxUnit(itemId) {
    const Item = require('../models/Item');
    const item = await Item.findById(itemId);

    if (!item) {
      throw new Error('Item not found');
    }

    const currentStock = item.inventory?.currentStock || 0;
    const packSize = item.packSize || 1;

    const boxUnitConversionService = require('./boxUnitConversionService');
    const conversion = boxUnitConversionService.convertUnitsToBoxes(currentStock, packSize);

    return {
      itemId: item._id,
      itemCode: item.code,
      itemName: item.name,
      packSize,
      currentStockUnits: currentStock,
      currentStockBoxes: conversion.boxes,
      currentStockRemainingUnits: conversion.remainingUnits,
      displayString: boxUnitConversionService.formatBoxUnitDisplay(
        conversion.boxes,
        conversion.remainingUnits,
        'Box',
        'Unit',
      ),
      minimumStock: item.inventory?.minimumStock || 0,
      maximumStock: item.inventory?.maximumStock || 0,
      stockStatus: item.stockStatus,
    };
  }

  /**
   * Update stock atomically for sales transactions
   * Task 2.2 - Real-time stock updates
   * Requirement 1.5 - Real-time stock updates when inventory changes
   * @param {string} itemId - Item ID
   * @param {string} warehouseId - Warehouse ID
   * @param {number} quantity - Quantity sold (positive number)
   * @param {Object} options - Additional options
   * @param {string} [options.batchNumber] - Batch number if applicable
   * @param {string} [options.referenceId] - Sales invoice ID
   * @param {string} [options.userId] - User making the sale
   * @returns {Promise<Object>} Updated inventory record
   */
  async updateStockOnSale(itemId, warehouseId, quantity, options = {}) {
    if (!itemId) {
      throw new Error('Item ID is required');
    }

    if (!warehouseId) {
      throw new Error('Warehouse ID is required');
    }

    if (!quantity || quantity <= 0) {
      throw new Error('Quantity must be greater than zero');
    }

    const Inventory = require('../models/Inventory');
    const mongoose = require('mongoose');

    // Build query
    const query = {
      item: new mongoose.Types.ObjectId(itemId),
      warehouse: new mongoose.Types.ObjectId(warehouseId),
    };

    if (options.batchNumber) {
      query.batchNumber = options.batchNumber;
    }

    // Check current inventory to determine if stock was reserved
    const currentInventory = await Inventory.findOne(query);
    if (!currentInventory) {
      throw new Error('Inventory record not found for the specified item and warehouse');
    }

    // Only decrement reservedQuantity if there's actually reserved stock
    // POS sales don't use reservations, so reservedQuantity should not be decremented
    const currentReserved = currentInventory.reservedQuantity || 0;
    const reservedDecrement = options.fromReservation
      ? Math.min(quantity, currentReserved)
      : 0;

    // Perform atomic update - decrement quantity, conditionally decrement reserved
    const updateOp = {
      $inc: { quantity: -quantity },
      $set: { lastUpdated: new Date() },
    };
    if (reservedDecrement > 0) {
      updateOp.$inc.reservedQuantity = -reservedDecrement;
    }

    const result = await Inventory.findOneAndUpdate(
      query,
      updateOp,
      {
        new: true,
        runValidators: true,
      },
    );

    if (!result) {
      throw new Error('Inventory record not found for the specified item and warehouse');
    }

    // Verify stock didn't go negative
    if (result.quantity < 0) {
      // Rollback by adding back the quantity
      const rollbackOp = { $inc: { quantity } };
      if (reservedDecrement > 0) {
        rollbackOp.$inc.reservedQuantity = reservedDecrement;
      }
      await Inventory.findByIdAndUpdate(result._id, rollbackOp);
      throw new Error('Insufficient stock available for sale');
    }

    // Log the transaction
    await this.logTransaction({
      itemId,
      warehouseId,
      batchNumber: options.batchNumber,
      referenceId: options.referenceId,
      referenceType: 'sales_invoice',
      quantity: -quantity,
      transactionType: 'STOCK_OUT',
      notes: `Stock reduced for sale. Invoice: ${options.referenceId || 'N/A'}`,
      createdBy: options.userId,
    });

    // Sync Item.inventory.currentStock
    await this.syncItemCurrentStock(itemId);

    return result;
  }

  /**
   * Update stock atomically for purchase transactions
   * Task 2.2 - Real-time stock updates
   * Requirement 1.5 - Real-time stock updates when inventory changes
   * @param {string} itemId - Item ID
   * @param {string} warehouseId - Warehouse ID
   * @param {number} quantity - Quantity purchased (positive number)
   * @param {Object} options - Additional options
   * @param {string} [options.batchNumber] - Batch number if applicable
   * @param {Date} [options.expiryDate] - Expiry date for batch
   * @param {string} [options.referenceId] - Purchase invoice ID
   * @param {string} [options.userId] - User making the purchase
   * @returns {Promise<Object>} Updated inventory record
   */
  async updateStockOnPurchase(itemId, warehouseId, quantity, options = {}) {
    if (!itemId) {
      throw new Error('Item ID is required');
    }

    if (!warehouseId) {
      throw new Error('Warehouse ID is required');
    }

    if (!quantity || quantity <= 0) {
      throw new Error('Quantity must be greater than zero');
    }

    const Inventory = require('../models/Inventory');
    const mongoose = require('mongoose');

    // Build query
    const query = {
      item: new mongoose.Types.ObjectId(itemId),
      warehouse: new mongoose.Types.ObjectId(warehouseId),
    };

    if (options.batchNumber) {
      query.batchNumber = options.batchNumber;
    }

    // Perform atomic update - increment quantity
    const result = await Inventory.findOneAndUpdate(
      query,
      {
        $inc: {
          quantity,
        },
        $set: {
          lastUpdated: new Date(),
        },
      },
      {
        new: true,
        upsert: true, // Create if doesn't exist
        runValidators: true,
        setDefaultsOnInsert: true,
      },
    );

    // Log the transaction
    await this.logTransaction({
      itemId,
      warehouseId,
      batchNumber: options.batchNumber,
      referenceId: options.referenceId,
      referenceType: 'purchase_invoice',
      quantity,
      transactionType: 'STOCK_IN',
      notes: `Stock added from purchase. Invoice: ${options.referenceId || 'N/A'}`,
      createdBy: options.userId,
    });

    // Sync Item.inventory.currentStock
    await this.syncItemCurrentStock(itemId);

    return result;
  }

  /**
   * Update stock atomically for transfer transactions
   * Task 2.2 - Real-time stock updates
   * Requirement 1.5 - Real-time stock updates when inventory changes
   * Uses MongoDB transactions to ensure atomicity across warehouses
   * @param {string} itemId - Item ID
   * @param {string} fromWarehouseId - Source warehouse ID
   * @param {string} toWarehouseId - Destination warehouse ID
   * @param {number} quantity - Quantity to transfer
   * @param {Object} options - Additional options
   * @param {string} [options.batchNumber] - Batch number if applicable
   * @param {string} [options.referenceId] - Transfer ID
   * @param {string} [options.userId] - User making the transfer
   * @returns {Promise<Object>} Transfer result
   */
  async updateStockOnTransfer(itemId, fromWarehouseId, toWarehouseId, quantity, options = {}) {
    if (!itemId) {
      throw new Error('Item ID is required');
    }

    if (!fromWarehouseId || !toWarehouseId) {
      throw new Error('Both source and destination warehouse IDs are required');
    }

    if (fromWarehouseId === toWarehouseId) {
      throw new Error('Source and destination warehouses must be different');
    }

    if (!quantity || quantity <= 0) {
      throw new Error('Quantity must be greater than zero');
    }

    const Inventory = require('../models/Inventory');
    const mongoose = require('mongoose');

    // Build queries
    const fromQuery = {
      item: new mongoose.Types.ObjectId(itemId),
      warehouse: new mongoose.Types.ObjectId(fromWarehouseId),
    };

    const toQuery = {
      item: new mongoose.Types.ObjectId(itemId),
      warehouse: new mongoose.Types.ObjectId(toWarehouseId),
    };

    if (options.batchNumber) {
      fromQuery.batchNumber = options.batchNumber;
      toQuery.batchNumber = options.batchNumber;
    }

    // Try to use transactions if available (replica set), otherwise use sequential updates
    let session = null;
    let useTransaction = false;

    try {
      // Check if transactions are supported
      const client = mongoose.connection.getClient();
      const { topology } = client;

      // Only use transactions if we're on a replica set or sharded cluster
      if (topology && (topology.description?.type === 'ReplicaSetWithPrimary' || topology.description?.type === 'Sharded')) {
        session = await mongoose.startSession();
        session.startTransaction();
        useTransaction = true;
      }
    } catch (error) {
      // Transactions not supported, will use sequential updates
      useTransaction = false;
    }

    try {
      // Atomically decrement from source warehouse
      const fromResult = await Inventory.findOneAndUpdate(
        fromQuery,
        {
          $inc: { quantity: -quantity },
          $set: { lastUpdated: new Date() },
        },
        {
          new: true,
          session: useTransaction ? session : undefined,
          runValidators: true,
        },
      );

      if (!fromResult) {
        throw new Error('Source inventory record not found');
      }

      if (fromResult.quantity < 0) {
        throw new Error('Insufficient stock in source warehouse');
      }

      // Atomically increment to destination warehouse
      const toResult = await Inventory.findOneAndUpdate(
        toQuery,
        {
          $inc: { quantity },
          $set: { lastUpdated: new Date() },
        },
        {
          new: true,
          upsert: true,
          session: useTransaction ? session : undefined,
          runValidators: true,
          setDefaultsOnInsert: true,
        },
      );

      // Commit the transaction if we're using one
      if (useTransaction && session) {
        await session.commitTransaction();
        session.endSession();
      }

      // Log the transaction
      await this.logTransaction({
        itemId,
        fromWarehouseId,
        toWarehouseId,
        batchNumber: options.batchNumber,
        referenceId: options.referenceId,
        referenceType: 'transfer',
        quantity,
        transactionType: 'STOCK_TRANSFER',
        notes: `Stock transferred between warehouses. Transfer: ${options.referenceId || 'N/A'}`,
        createdBy: options.userId,
      });

      // Sync Item.inventory.currentStock (transfer doesn't change total, but sync for consistency)
      await this.syncItemCurrentStock(itemId);

      return {
        success: true,
        itemId,
        fromWarehouseId,
        toWarehouseId,
        quantity,
        fromWarehouseStock: fromResult.quantity,
        toWarehouseStock: toResult.quantity,
        timestamp: new Date(),
      };
    } catch (error) {
      // Rollback transaction on error if we're using one
      if (useTransaction && session) {
        await session.abortTransaction();
        session.endSession();
      } else if (!useTransaction) {
        // Manual rollback for non-transactional updates
        // Try to reverse the source warehouse decrement if it succeeded
        try {
          await Inventory.findOneAndUpdate(
            fromQuery,
            {
              $inc: { quantity },
              $set: { lastUpdated: new Date() },
            },
          );
        } catch (rollbackError) {
          // Log rollback failure but throw original error
          console.error('Failed to rollback transfer:', rollbackError);
        }
      }
      throw error;
    }
  }

  /**
   * Update stock atomically for adjustment transactions
   * Task 2.2 - Real-time stock updates
   * Requirement 1.5 - Real-time stock updates when inventory changes
   * @param {string} itemId - Item ID
   * @param {string} warehouseId - Warehouse ID
   * @param {number} adjustmentQuantity - Quantity to adjust (positive for increase, negative for decrease)
   * @param {Object} options - Additional options
   * @param {string} options.reason - Reason for adjustment (required)
   * @param {string} [options.batchNumber] - Batch number if applicable
   * @param {string} [options.referenceId] - Adjustment ID
   * @param {string} [options.notes] - Additional notes
   * @param {string} [options.userId] - User making the adjustment
   * @returns {Promise<Object>} Updated inventory record
   */
  async updateStockOnAdjustment(itemId, warehouseId, adjustmentQuantity, options = {}) {
    if (!itemId) {
      throw new Error('Item ID is required');
    }

    if (!warehouseId) {
      throw new Error('Warehouse ID is required');
    }

    if (adjustmentQuantity === 0) {
      throw new Error('Adjustment quantity cannot be zero');
    }

    if (!options.reason) {
      throw new Error('Reason for adjustment is required');
    }

    const Inventory = require('../models/Inventory');
    const mongoose = require('mongoose');

    // Build query
    const query = {
      item: new mongoose.Types.ObjectId(itemId),
      warehouse: new mongoose.Types.ObjectId(warehouseId),
    };

    if (options.batchNumber) {
      query.batchNumber = options.batchNumber;
    }

    // Perform atomic update
    const result = await Inventory.findOneAndUpdate(
      query,
      {
        $inc: { quantity: adjustmentQuantity },
        $set: { lastUpdated: new Date() },
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      },
    );

    // Verify stock didn't go negative for decreases
    if (result.quantity < 0) {
      // Rollback by reversing the adjustment
      await Inventory.findByIdAndUpdate(
        result._id,
        {
          $inc: { quantity: -adjustmentQuantity },
        },
      );
      throw new Error('Adjustment would result in negative stock');
    }

    // Log the transaction
    await this.logTransaction({
      itemId,
      warehouseId,
      batchNumber: options.batchNumber,
      referenceId: options.referenceId,
      referenceType: 'adjustment',
      quantity: adjustmentQuantity,
      transactionType: 'STOCK_ADJUST',
      notes: `Stock adjustment: ${options.reason}. ${options.notes || ''}`.trim(),
      createdBy: options.userId,
    });

    // Sync Item.inventory.currentStock
    await this.syncItemCurrentStock(itemId);

    return result;
  }

  /**
   * Bulk update stock for multiple items atomically
   * Task 2.2 - Real-time stock updates
   * Useful for processing multiple line items in a single transaction
   * @param {Array} updates - Array of update objects
   * @param {string} updates[].itemId - Item ID
   * @param {string} updates[].warehouseId - Warehouse ID
   * @param {number} updates[].quantity - Quantity change
   * @param {string} updates[].batchNumber - Optional batch number
   * @param {Object} options - Additional options
   * @param {string} options.operationType - Type of operation (sale, purchase, adjustment)
   * @param {string} [options.referenceId] - Reference document ID
   * @param {string} [options.userId] - User making the updates
   * @returns {Promise<Array>} Array of update results
   */
  async bulkUpdateStock(updates, options = {}) {
    if (!Array.isArray(updates) || updates.length === 0) {
      throw new Error('Updates array is required and must not be empty');
    }

    if (!options.operationType) {
      throw new Error('Operation type is required');
    }

    const Inventory = require('../models/Inventory');
    const mongoose = require('mongoose');

    // Pre-validate all updates before making any changes
    if (options.operationType !== 'purchase') {
      for (const update of updates) {
        const {
          itemId, warehouseId, quantity, batchNumber,
        } = update;

        if (!itemId || !warehouseId || quantity === undefined) {
          throw new Error('Each update must have itemId, warehouseId, and quantity');
        }

        // For decreases, check if sufficient stock exists
        if (quantity < 0) {
          const query = {
            item: new mongoose.Types.ObjectId(itemId),
            warehouse: new mongoose.Types.ObjectId(warehouseId),
          };

          if (batchNumber) {
            query.batchNumber = batchNumber;
          }

          const inventory = await Inventory.findOne(query);
          if (!inventory) {
            throw new Error(`Inventory record not found for item ${itemId} in warehouse ${warehouseId}`);
          }

          if (inventory.quantity + quantity < 0) {
            throw new Error(`Insufficient stock for item ${itemId} in warehouse ${warehouseId}`);
          }
        }
      }
    }

    // Try to use transactions if available (replica set), otherwise use sequential updates
    let session = null;
    let useTransaction = false;

    try {
      // Check if transactions are supported
      const client = mongoose.connection.getClient();
      const { topology } = client;

      // Only use transactions if we're on a replica set or sharded cluster
      if (topology && (topology.description?.type === 'ReplicaSetWithPrimary' || topology.description?.type === 'Sharded')) {
        session = await mongoose.startSession();
        session.startTransaction();
        useTransaction = true;
      }
    } catch (error) {
      // Transactions not supported, will use sequential updates
      useTransaction = false;
    }

    try {
      const results = [];

      for (const update of updates) {
        const {
          itemId, warehouseId, quantity, batchNumber,
        } = update;

        // Build query
        const query = {
          item: new mongoose.Types.ObjectId(itemId),
          warehouse: new mongoose.Types.ObjectId(warehouseId),
        };

        if (batchNumber) {
          query.batchNumber = batchNumber;
        }

        // Perform atomic update
        const result = await Inventory.findOneAndUpdate(
          query,
          {
            $inc: { quantity },
            $set: { lastUpdated: new Date() },
          },
          {
            new: true,
            upsert: options.operationType === 'purchase',
            session: useTransaction ? session : undefined,
            runValidators: true,
            setDefaultsOnInsert: true,
          },
        );

        if (!result) {
          throw new Error(`Inventory record not found for item ${itemId} in warehouse ${warehouseId}`);
        }

        results.push(result);
      }

      // Commit the transaction if we're using one
      if (useTransaction && session) {
        await session.commitTransaction();
        session.endSession();
      }

      // Log the bulk transaction
      await this.logTransaction({
        referenceId: options.referenceId,
        referenceType: options.operationType,
        quantity: updates.reduce((sum, u) => sum + Math.abs(u.quantity), 0),
        transactionType: `BULK_${options.operationType.toUpperCase()}`,
        notes: `Bulk stock update for ${updates.length} items`,
        createdBy: options.userId,
      });

      // Sync Item.inventory.currentStock for all affected items
      const uniqueItemIds = [...new Set(updates.map(u => u.itemId.toString()))];
      await Promise.all(uniqueItemIds.map(id => this.syncItemCurrentStock(id)));

      return results;
    } catch (error) {
      // Rollback transaction on error if we're using one
      if (useTransaction && session) {
        await session.abortTransaction();
        session.endSession();
      }
      throw error;
    }
  }

  /**
   * Get real-time stock status for an item across all warehouses
   * Task 2.2 - Real-time stock updates
   * @param {string} itemId - Item ID
   * @returns {Promise<Object>} Real-time stock status
   */
  async getRealTimeStockStatus(itemId) {
    if (!itemId) {
      throw new Error('Item ID is required');
    }

    const Inventory = require('../models/Inventory');
    const mongoose = require('mongoose');

    // Get real-time aggregated stock data
    const result = await Inventory.aggregate([
      {
        $match: { item: new mongoose.Types.ObjectId(itemId) },
      },
      {
        $group: {
          _id: null,
          totalQuantity: { $sum: '$quantity' },
          totalReserved: { $sum: { $ifNull: ['$reservedQuantity', 0] } },
          totalAvailable: {
            $sum: { $subtract: ['$quantity', { $ifNull: ['$reservedQuantity', 0] }] },
          },
          warehouseCount: { $sum: 1 },
          lastUpdated: { $max: '$lastUpdated' },
        },
      },
    ]);

    if (result.length === 0) {
      return {
        itemId,
        totalQuantity: 0,
        totalReserved: 0,
        totalAvailable: 0,
        warehouseCount: 0,
        lastUpdated: null,
        timestamp: new Date(),
      };
    }

    return {
      itemId,
      totalQuantity: result[0].totalQuantity,
      totalReserved: result[0].totalReserved,
      totalAvailable: result[0].totalAvailable,
      warehouseCount: result[0].warehouseCount,
      lastUpdated: result[0].lastUpdated,
      timestamp: new Date(),
    };
  }
  /**
   * Sync Item.inventory.currentStock with the sum of all Inventory records
   * This ensures the Item model's stock field stays accurate after any stock change
   * @param {string} itemId - Item ID to sync
   */
  async syncItemCurrentStock(itemId, session = null) {
    const Inventory = require('../models/Inventory');
    const Item = require('../models/Item');
    const mongoose = require('mongoose');

    const aggregate = Inventory.aggregate([
      { $match: { item: new mongoose.Types.ObjectId(itemId) } },
      { $group: { _id: null, total: { $sum: '$quantity' } } },
    ]);
    if (session) {
      aggregate.session(session);
    }

    const result = await aggregate || [];
    const totalStock = result.length > 0 ? result[0].total : 0;
    const update = { 'inventory.currentStock': Math.max(0, totalStock) };
    if (session) {
      await Item.findByIdAndUpdate(itemId, update, { session });
    } else {
      await Item.findByIdAndUpdate(itemId, update);
    }
  }
}

module.exports = new InventoryService();
