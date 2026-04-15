const mongoose = require('mongoose');
const Item = require('../models/Item');
const Inventory = require('../models/Inventory');
const Batch = require('../models/Batch');
const AppError = require('../utils/appError');
const batchSelectorService = require('./batchSelectorService');

/**
 * POS Item Service
 * Optimized item search and barcode scanning for POS operations
 */
class POSItemService {
  /**
   * Search items for POS with minimal data - OPTIMIZED for speed
   * Uses aggregation pipeline starting from Inventory for warehouse-specific results
   * @param {string} query - Search query (name, code, barcode, SKU)
   * @param {string} warehouseId - Salesman's warehouse
   * @param {number} limit - Max results (default 20)
   * @returns {Promise<Array>} Minimal item data
   */
  async searchItems(query, warehouseId, limit = 20) {
    if (!query || query.trim().length === 0) {
      return [];
    }

    const searchTerm = query.trim();
    const warehouseOid = new mongoose.Types.ObjectId(warehouseId);

    // OPTIMIZED: Single aggregation pipeline starting from Inventory
    // This ensures we only get items that have stock in the salesman's warehouse
    const results = await Inventory.aggregate([
      // Stage 1: Filter inventory by warehouse with stock
      {
        $match: {
          warehouse: warehouseOid,
          quantity: { $gt: 0 },
        },
      },
      // Stage 2: Join with Items collection
      {
        $lookup: {
          from: 'items',
          localField: 'item',
          foreignField: '_id',
          as: 'itemDetails',
        },
      },
      { $unwind: '$itemDetails' },
      // Stage 2.1: Join with Formula collection
      {
        $lookup: {
          from: 'formulas',
          localField: 'itemDetails.formulaId',
          foreignField: '_id',
          as: 'formulaDetails',
        },
      },
      { $addFields: { formulaDetails: { $arrayElemAt: ['$formulaDetails', 0] } } },
      // Stage 2.2: Join with FormulaSize collection
      {
        $lookup: {
          from: 'formulasizes',
          localField: 'itemDetails.formulaSizeId',
          foreignField: '_id',
          as: 'sizeDetails',
        },
      },
      { $addFields: { sizeDetails: { $arrayElemAt: ['$sizeDetails', 0] } } },
      // Stage 3: Filter by search term and active status
      {
        $match: {
          'itemDetails.isActive': true,
          $or: [
            { 'itemDetails.name': { $regex: searchTerm, $options: 'i' } },
            { 'itemDetails.code': { $regex: searchTerm, $options: 'i' } },
            { 'itemDetails.barcode': { $regex: searchTerm, $options: 'i' } },
            { 'itemDetails.sku': { $regex: searchTerm, $options: 'i' } },
            { 'formulaDetails.name': { $regex: searchTerm, $options: 'i' } },
            { 'sizeDetails.size': { $regex: searchTerm, $options: 'i' } },
          ],
        },
      },
      // Stage 4: Group by item to sum quantities across batches/locations
      {
        $group: {
          _id: '$item',
          totalStock: { $sum: '$quantity' },
          itemDetails: { $first: '$itemDetails' },
          formulaName: { $first: '$formulaDetails.name' },
          formulaSize: { $first: '$sizeDetails.size' },
        },
      },
      // Stage 5: Project final shape
      {
        $project: {
          _id: 0,
          id: '$_id',
          name: '$itemDetails.name',
          code: '$itemDetails.code',
          barcode: { $ifNull: ['$itemDetails.barcode', ''] },
          sku: { $ifNull: ['$itemDetails.sku', ''] },
          price: { $ifNull: ['$itemDetails.pricing.salePrice', 0] },
          unit: { $ifNull: ['$itemDetails.unit', 'piece'] },
          gstRate: { $ifNull: ['$itemDetails.tax.gstRate', 18] },
          packSize: { $ifNull: ['$itemDetails.packSize', 1] },
          formulaName: { $ifNull: ['$formulaName', ''] },
          formulaSize: { $ifNull: ['$formulaSize', ''] },
          availableStock: '$totalStock',
        },
      },
      // Stage 6: Sort by name for consistent results
      { $sort: { name: 1 } },
      // Stage 7: Limit results
      { $limit: limit },
    ]);

    return results;
  }

  /**
   * Scan barcode and get item with batch information
   * @param {string} barcode - Item barcode
   * @param {string} warehouseId - Salesman's warehouse
   * @returns {Promise<Object>} Item with batch information
   */
  async scanBarcode(barcode, warehouseId) {
    if (!barcode || barcode.trim().length === 0) {
      throw new AppError('Barcode is required', 400);
    }

    // Find item by barcode
    const item = await Item.findOne({ barcode: barcode.trim(), isActive: true })
      .select('_id name code barcode pricing.salePrice unit tax.gstRate formulaId formulaSizeId packSize')
      .populate('formulaId', 'name')
      .populate('formulaSizeId', 'size')
      .lean();

    if (!item) {
      throw new AppError(`Item not found with barcode: ${barcode}`, 404);
    }

    // Get stock from Inventory collection for this warehouse
    const inventoryStock = await Inventory.aggregate([
      {
        $match: {
          item: item._id,
          warehouse: new mongoose.Types.ObjectId(warehouseId),
          quantity: { $gt: 0 },
        },
      },
      {
        $group: {
          _id: null,
          totalStock: { $sum: '$quantity' },
        },
      },
    ]);

    const totalStock = inventoryStock.length > 0 ? inventoryStock[0].totalStock : 0;

    // Try to get batch info if batch tracking is used
    let batches = [];
    try {
      batches = await batchSelectorService.getBatchInfo(item._id, warehouseId);
    } catch (err) {
      // Batch info not available, continue without it
    }

    if (totalStock === 0) {
      throw new AppError(`Item not available in this warehouse`, 404);
    }

    return {
      id: item._id,
      name: item.name,
      code: item.code,
      barcode: item.barcode || '',
      price: item.pricing?.salePrice || 0,
      unit: item.unit || 'piece',
      gstRate: item.tax?.gstRate || 18,
      packSize: item.packSize || 1,
      formulaName: item.formulaId?.name || '',
      formulaSize: item.formulaSizeId?.size || '',
      availableStock: totalStock,
      batches,
    };
  }
}

module.exports = new POSItemService();
