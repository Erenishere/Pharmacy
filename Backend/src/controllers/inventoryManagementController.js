const stockValuationService = require('../services/stockValuationService');
const physicalCountService = require('../services/physicalCountService');
const inventoryReportService = require('../services/inventoryReportService');
const Item = require('../models/Item');

exports.getStock = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 25,
      itemId,
      warehouseId,
      categoryId,
      search,
      stockStatus,
    } = req.query;

    const Inventory = require('../models/Inventory');
    const mongoose = require('mongoose');

    // Build the aggregation pipeline for flexible filtering and joining
    const pipeline = [];

    // 1. Initial Match (Inventory filters)
    const match = {};
    if (itemId) match.item = new mongoose.Types.ObjectId(itemId);
    if (warehouseId) match.warehouse = new mongoose.Types.ObjectId(warehouseId);
    pipeline.push({ $match: match });

    // 2. Join with Item
    pipeline.push({
      $lookup: {
        from: 'items',
        localField: 'item',
        foreignField: '_id',
        as: 'itemInfo',
      },
    });
    pipeline.push({ $unwind: '$itemInfo' });

    // 3. Post-join filters (Item filters)
    const postMatch = { 'itemInfo.isActive': true };
    if (categoryId) postMatch['itemInfo.categoryId'] = new mongoose.Types.ObjectId(categoryId);

    if (search) {
      postMatch.$or = [
        { 'itemInfo.name': { $regex: search, $options: 'i' } },
        { 'itemInfo.code': { $regex: search, $options: 'i' } },
      ];
    }

    if (stockStatus) {
      switch (stockStatus) {
        case 'low_stock':
          pipeline.push({
            $match: {
              $expr: { $lte: ['$quantity', { $ifNull: ['$itemInfo.inventory.minimumStock', 10] }] }
            }
          });
          break;
        case 'out_of_stock':
          postMatch.quantity = { $lte: 0 };
          break;
      }
    }

    if (Object.keys(postMatch).length > 0) {
      pipeline.push({ $match: postMatch });
    }

    // 4. Join with Warehouse
    pipeline.push({
      $lookup: {
        from: 'warehouses',
        localField: 'warehouse',
        foreignField: '_id',
        as: 'warehouseInfo',
      },
    });
    pipeline.push({ $unwind: { path: '$warehouseInfo', preserveNullAndEmptyArrays: true } });

    // 5. Join with Category (optional for name)
    pipeline.push({
      $lookup: {
        from: 'categories',
        localField: 'itemInfo.categoryId',
        foreignField: '_id',
        as: 'categoryInfo',
      },
    });
    pipeline.push({ $unwind: { path: '$categoryInfo', preserveNullAndEmptyArrays: true } });

    // 6. Project to match StockLevel interface
    pipeline.push({
      $project: {
        _id: 1,
        itemId: '$itemInfo._id',
        itemCode: '$itemInfo.code',
        itemName: '$itemInfo.name',
        categoryId: '$itemInfo.categoryId',
        categoryName: '$categoryInfo.name',
        companyId: '$itemInfo.companyId',
        warehouseId: '$warehouseInfo._id',
        warehouseName: { $ifNull: ['$warehouseInfo.name', 'Global Stock'] },
        quantity: 1,
        reservedQuantity: { $ifNull: ['$reservedQuantity', '$allocated', 0] },
        availableQuantity: { $ifNull: ['$available', '$quantity'] },
        minimumLevel: '$itemInfo.inventory.minimumStock',
        reorderLevel: '$itemInfo.inventory.reorderPoint',
        batchNumber: 1,
        lastUpdated: 1,
      },
    });

    // 7. Sort
    pipeline.push({ $sort: { itemName: 1, warehouseName: 1 } });

    // 8. Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Total count for pagination
    const countPipeline = [...pipeline];
    countPipeline.push({ $count: 'total' });
    const countResult = await Inventory.aggregate(countPipeline);
    const totalItems = countResult.length > 0 ? countResult[0].total : 0;

    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: parseInt(limit) });

    const results = await Inventory.aggregate(pipeline);

    return res.status(200).json({
      success: true,
      data: results,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalItems,
        totalPages: Math.ceil(totalItems / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Get stock error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to retrieve stock levels',
      },
    });
  }
};


exports.getStockValuation = async (req, res) => {
  try {
    const {
      method = 'weighted_average', itemId, warehouseId, categoryId,
    } = req.query;

    let valuation;
    if (itemId && warehouseId) {
      switch (method.toLowerCase()) {
        case 'fifo':
          valuation = await stockValuationService.calculateFIFO(itemId, warehouseId);
          break;
        case 'lifo':
          valuation = await stockValuationService.calculateLIFO(itemId, warehouseId);
          break;
        default:
          valuation = await stockValuationService.calculateWeightedAverage(
            itemId,
            warehouseId,
          );
          break;
      }
    } else if (warehouseId) {
      valuation = await stockValuationService.getWarehouseValuation(warehouseId, method);
    } else if (categoryId) {
      valuation = await stockValuationService.getCategoryValuation(
        categoryId,
        warehouseId,
        method,
      );
    } else {
      valuation = await stockValuationService.getTotalInventoryValue(method);
    }

    res.json({ success: true, data: valuation });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.compareValuationMethods = async (req, res) => {
  try {
    const { itemId, warehouseId } = req.query;

    if (!itemId || !warehouseId) {
      return res
        .status(400)
        .json({ success: false, error: 'itemId and warehouseId are required' });
    }

    const comparison = await stockValuationService.compareMethods(itemId, warehouseId);
    res.json({ success: true, data: comparison });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.createPhysicalCount = async (req, res) => {
  try {
    const countData = {
      ...req.body,
      createdBy: req.user?.id,
    };
    const count = await physicalCountService.createCountSession(countData);
    res.status(201).json({ success: true, data: count });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

exports.getPhysicalCounts = async (req, res) => {
  try {
    const filters = {
      warehouseId: req.query.warehouseId,
      status: req.query.status,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 50,
      sort: req.query.sort || '-createdAt',
    };
    const result = await physicalCountService.getCountSessions(filters);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getPhysicalCountById = async (req, res) => {
  try {
    const count = await physicalCountService.getCountById(req.params.id);
    res.json({ success: true, data: count });
  } catch (error) {
    res.status(404).json({ success: false, error: error.message });
  }
};

exports.updatePhysicalCount = async (req, res) => {
  try {
    const count = await physicalCountService.updateCount(req.params.id, req.body);
    res.json({ success: true, data: count });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

exports.approvePhysicalCount = async (req, res) => {
  try {
    const count = await physicalCountService.approveCount(req.params.id, req.user?.id);
    res.json({ success: true, data: count });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

exports.cancelPhysicalCount = async (req, res) => {
  try {
    const count = await physicalCountService.cancelCount(req.params.id, req.body.reason);
    res.json({ success: true, data: count });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

exports.getVarianceReport = async (req, res) => {
  try {
    const { warehouseId, startDate, endDate } = req.query;
    const variance = await physicalCountService.getCountVarianceReport(
      warehouseId,
      startDate,
      endDate,
    );
    res.json({ success: true, data: variance });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getDiscrepancyItems = async (req, res) => {
  try {
    const { warehouseId, limit = 20 } = req.query;
    const discrepancies = await physicalCountService.getDiscrepancyItems(
      warehouseId,
      parseInt(limit),
    );
    res.json({ success: true, data: discrepancies });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getStockSummary = async (req, res) => {
  try {
    const { warehouseId, categoryId } = req.query;

    console.log('getStockSummary called with:', { warehouseId, categoryId });

    const summary = await inventoryReportService.getStockSummary(
      warehouseId,
      categoryId,
    );

    console.log('Stock summary result:', summary);

    res.json({ success: true, data: summary });
  } catch (error) {
    console.error('getStockSummary error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'STOCK_SUMMARY_ERROR',
        message: error.message || 'Failed to retrieve stock summary',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
    });
  }
};

exports.getWarehouseStockReport = async (req, res) => {
  try {
    const report = await inventoryReportService.getWarehouseStockReport(req.query.warehouseId);
    res.json({ success: true, data: report });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getStockMovementReport = async (req, res) => {
  try {
    const filters = {
      itemId: req.query.itemId,
      warehouseId: req.query.warehouseId,
      movementType: req.query.movementType,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 50,
    };
    const report = await inventoryReportService.getStockMovementReport(filters);
    res.json({ success: true, ...report });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getFastMovingItems = async (req, res) => {
  try {
    const { warehouseId, days = 30, limit = 50 } = req.query;
    const report = await inventoryReportService.getFastMovingItems(
      warehouseId,
      parseInt(days),
      parseInt(limit),
    );
    res.json({ success: true, data: report });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getSlowMovingItems = async (req, res) => {
  try {
    const { warehouseId, days = 90, limit = 50 } = req.query;
    const report = await inventoryReportService.getSlowMovingItemsReport(
      warehouseId,
      parseInt(days),
      parseInt(limit),
    );
    res.json({ success: true, data: report });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getDeadStockReport = async (req, res) => {
  try {
    const { warehouseId, days = 180, limit = 50 } = req.query;
    const report = await inventoryReportService.getDeadStockReport(
      warehouseId,
      parseInt(days),
      parseInt(limit),
    );
    res.json({ success: true, data: report });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getStockAgingReport = async (req, res) => {
  try {
    const report = await inventoryReportService.getStockAgingReport(
      req.query.warehouseId,
    );
    res.json({ success: true, data: report });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getInventoryTurnover = async (req, res) => {
  try {
    const { warehouseId, startDate, endDate } = req.query;
    const report = await inventoryReportService.getInventoryTurnoverReport(
      warehouseId,
      startDate,
      endDate,
    );
    res.json({ success: true, data: report });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getLowStockReport = async (req, res) => {
  try {
    const { warehouseId, limit = 50 } = req.query;
    const report = await inventoryReportService.getLowStockReport(
      warehouseId,
      parseInt(limit),
    );
    res.json({ success: true, data: report });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getReorderSuggestions = async (req, res) => {
  try {
    const { warehouseId, limit = 50 } = req.query;
    const suggestions = await inventoryReportService.getReorderSuggestions(
      warehouseId,
      parseInt(limit),
    );
    res.json({ success: true, data: suggestions });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getStockoutHistory = async (req, res) => {
  try {
    const { warehouseId, days = 30, limit = 50 } = req.query;
    const report = await inventoryReportService.getStockoutHistory(
      warehouseId,
      parseInt(days),
      parseInt(limit),
    );
    res.json({ success: true, data: report });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Stock Transfer Controllers
const stockTransferService = require('../services/stockTransferService');
const stockAdjustmentService = require('../services/stockAdjustmentService');

exports.createTransfer = async (req, res) => {
  try {
    const transferData = {
      ...req.body,
      createdBy: req.user?.id,
    };
    const transfer = await stockTransferService.createTransfer(transferData);
    res.status(201).json({ success: true, data: transfer });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.getTransfers = async (req, res) => {
  try {
    const filters = {
      fromWarehouseId: req.query.fromWarehouseId,
      toWarehouseId: req.query.toWarehouseId,
      itemId: req.query.itemId,
      status: req.query.status,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 25,
    };
    const result = await stockTransferService.listTransfers(filters);

    // Format data to match frontend expectations
    const formattedData = result.data.map((transfer) => ({
      _id: transfer.transferId?.toString() || '',
      transferNumber: `TRF-${transfer.transferId?.toString().slice(-8).toUpperCase() || 'N/A'}`,
      transferDate: transfer.date,
      itemId: transfer.item?.id,
      itemName: transfer.item?.name || '',
      itemCode: transfer.item?.code || '',
      fromWarehouseId: transfer.fromWarehouse?.id,
      fromWarehouseName: transfer.fromWarehouse?.name || '',
      toWarehouseId: transfer.toWarehouse?.id,
      toWarehouseName: transfer.toWarehouse?.name || '',
      quantities: transfer.quantities || {
        qtyCtn: 0,
        qtyBox: 0,
        qtyUnit: transfer.quantity || 0,
        totalUnitQty: transfer.quantity || 0,
      },
      batchNumber: transfer.batchNumber,
      status: transfer.status || 'completed',
      createdBy: transfer.user || '',
      createdAt: transfer.date,
      updatedAt: transfer.date,
    }));

    res.json({
      success: true,
      data: formattedData,
      pagination: {
        currentPage: result.pagination.page,
        totalPages: result.pagination.pages,
        totalItems: result.pagination.total,
        itemsPerPage: result.pagination.limit,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getTransferById = async (req, res) => {
  try {
    const StockMovement = require('../models/StockMovement');
    const mongoose = require('mongoose');

    // Find both movements (in and out) for this transfer
    const movements = await StockMovement.find({
      'transferInfo.transferId': new mongoose.Types.ObjectId(req.params.id),
    })
      .populate('itemId', 'code name unit')
      .populate('warehouse', 'code name')
      .populate('transferInfo.fromWarehouse', 'code name')
      .populate('transferInfo.toWarehouse', 'code name')
      .populate('createdBy', 'username');

    if (movements.length === 0) {
      return res.status(404).json({ success: false, message: 'Transfer not found' });
    }

    const outMovement = movements.find((m) => m.movementType === 'out');
    const inMovement = movements.find((m) => m.movementType === 'in');

    const transfer = {
      _id: req.params.id,
      transferNumber: `TRF-${req.params.id.slice(-8).toUpperCase()}`,
      transferDate: outMovement?.movementDate || inMovement?.movementDate,
      itemId: outMovement?.itemId?._id || inMovement?.itemId?._id,
      itemName: outMovement?.itemId?.name || inMovement?.itemId?.name || '',
      itemCode: outMovement?.itemId?.code || inMovement?.itemId?.code || '',
      fromWarehouseId: outMovement?.warehouse?._id,
      fromWarehouseName: outMovement?.warehouse?.name || '',
      toWarehouseId: inMovement?.warehouse?._id,
      toWarehouseName: inMovement?.warehouse?.name || '',
      quantities: outMovement?.quantities || inMovement?.quantities || {
        qtyCtn: 0,
        qtyBox: 0,
        qtyUnit: outMovement?.quantity || inMovement?.quantity || 0,
        totalUnitQty: outMovement?.quantity || inMovement?.quantity || 0,
      },
      batchNumber: outMovement?.batchInfo?.batchNumber || inMovement?.batchInfo?.batchNumber,
      status: outMovement?.status || inMovement?.status || 'completed',
      createdBy: outMovement?.createdBy?.username || inMovement?.createdBy?.username || '',
      createdAt: outMovement?.createdAt || inMovement?.createdAt,
      updatedAt: outMovement?.updatedAt || inMovement?.updatedAt,
    };

    res.json({ success: true, data: transfer });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
};

exports.receiveTransfer = async (req, res) => {
  try {
    const result = await stockTransferService.receiveTransfer(
      req.params.id,
      req.user?.id,
    );
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.cancelTransfer = async (req, res) => {
  try {
    const { reason } = req.body;
    const result = await stockTransferService.cancelTransfer(
      req.params.id,
      req.user?.id,
      reason,
    );
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.updateTransferStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const transferId = req.params.id;

    // Handle different status transitions
    if (status === 'completed') {
      // Receive the transfer
      const result = await stockTransferService.receiveTransfer(
        transferId,
        req.user?.id,
      );
      res.json({ success: true, data: result });
    } else if (status === 'cancelled') {
      // Cancel the transfer
      const result = await stockTransferService.cancelTransfer(
        transferId,
        req.user?.id,
        req.body.reason || 'Cancelled by user',
      );
      res.json({ success: true, data: result });
    } else {
      res.status(400).json({
        success: false,
        message: 'Invalid status transition. Use "completed" to receive or "cancelled" to cancel.',
      });
    }
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Stock Adjustment Controllers

exports.createAdjustment = async (req, res) => {
  try {
    const adjustmentData = {
      ...req.body,
      createdBy: req.user?.id,
    };
    const result = await stockAdjustmentService.createAdjustment(adjustmentData);
    res.status(201).json(result);
  } catch (error) {
    res.status(error.statusCode || 400).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getAdjustments = async (req, res) => {
  try {
    const filters = {
      warehouseId: req.query.warehouseId,
      itemId: req.query.itemId,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      reason: req.query.reason,
      userId: req.query.userId,
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 25,
    };
    const result = await stockAdjustmentService.getAdjustmentHistory(filters);

    // Format data to match frontend expectations
    const formattedData = result.data.map((adj) => ({
      _id: adj.adjustmentId?.toString() || '',
      adjustmentNumber: `ADJ-${adj.adjustmentId?.toString().slice(-8).toUpperCase() || 'N/A'}`,
      adjustmentDate: adj.date,
      itemId: adj.item?.id,
      itemName: adj.item?.name || '',
      itemCode: adj.item?.code || '',
      warehouseId: adj.warehouse?.id,
      warehouseName: adj.warehouse?.name || '',
      adjustmentType: adj.type,
      quantity: adj.quantity,
      reason: adj.reason,
      notes: adj.notes,
      batchNumber: adj.batchNumber,
      status: adj.status === 'completed' ? 'approved' : adj.status === 'pending' ? 'pending' : 'rejected',
      createdBy: adj.user?.username || '',
      createdAt: adj.date,
      updatedAt: adj.date,
    }));

    res.json({
      success: true,
      data: formattedData,
      pagination: {
        currentPage: result.pagination.page,
        totalPages: result.pagination.pages,
        totalItems: result.pagination.total,
        itemsPerPage: result.pagination.limit,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getPendingAdjustments = async (req, res) => {
  try {
    const filters = {
      warehouseId: req.query.warehouseId,
      itemId: req.query.itemId,
      userId: req.query.userId,
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 25,
      status: 'pending',
    };

    const result = await stockAdjustmentService.getAdjustmentHistory(filters);

    // Format data to match frontend expectations
    const formattedData = result.data.map((adj) => ({
      _id: adj.adjustmentId?.toString() || '',
      adjustmentNumber: `ADJ-${adj.adjustmentId?.toString().slice(-8).toUpperCase() || 'N/A'}`,
      adjustmentDate: adj.date,
      itemId: adj.item?.id,
      itemName: adj.item?.name || '',
      itemCode: adj.item?.code || '',
      warehouseId: adj.warehouse?.id,
      warehouseName: adj.warehouse?.name || '',
      adjustmentType: adj.type,
      quantity: adj.quantity,
      reason: adj.reason,
      notes: adj.notes,
      batchNumber: adj.batchNumber,
      status: 'pending',
      createdBy: adj.user?.username || '',
      createdAt: adj.date,
      updatedAt: adj.date,
    }));

    res.json({
      success: true,
      data: formattedData,
      pagination: {
        currentPage: result.pagination.page,
        totalPages: result.pagination.pages,
        totalItems: result.pagination.total,
        itemsPerPage: result.pagination.limit,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.rejectAdjustment = async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required',
      });
    }
    const result = await stockAdjustmentService.rejectAdjustment(
      req.params.id,
      req.user?.id,
      reason,
    );
    res.json(result);
  } catch (error) {
    res.status(error.statusCode || 400).json({
      success: false,
      message: error.message,
    });
  }
};

exports.approveAdjustment = async (req, res) => {
  try {
    const { notes } = req.body;
    const result = await stockAdjustmentService.approveAdjustment(
      req.params.id,
      req.user?._id,
      notes,
    );

    res.json(result);
  } catch (error) {
    res.status(error.statusCode || 400).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getAdjustmentById = async (req, res) => {
  try {
    const result = await stockAdjustmentService.getAdjustmentById(req.params.id);

    if (!result.success) {
      return res.status(404).json(result);
    }

    const adj = result.adjustment;
    const formattedData = {
      _id: adj.adjustmentId?.toString() || '',
      adjustmentNumber: `ADJ-${adj.adjustmentId?.toString().slice(-8).toUpperCase() || 'N/A'}`,
      adjustmentDate: adj.date,
      itemId: adj.item?.id,
      itemName: adj.item?.name || '',
      itemCode: adj.item?.code || '',
      warehouseId: adj.warehouse?.id,
      warehouseName: adj.warehouse?.name || '',
      adjustmentType: adj.type,
      quantity: adj.quantity,
      reason: adj.reason || '',
      status: adj.status,
      createdBy: adj.createdBy,
      createdAt: adj.createdAt,
      approvedBy: adj.approvedBy,
      approvedAt: adj.approvedAt,
    };

    res.status(200).json({
      success: true,
      data: formattedData,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
