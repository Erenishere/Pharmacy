const mongoose = require('mongoose');

const PhysicalCount = require('../models/PhysicalCount');
const Batch = require('../models/Batch');
const Inventory = require('../models/Inventory');
const Item = require('../models/Item');
const Warehouse = require('../models/Warehouse');
const StockMovement = require('../models/StockMovement');
const inventoryService = require('./inventoryService');

const getObjectId = (value) => value?._id || value;
const normalizeBatchNumber = (value) => {
  if (value === undefined || value === null) {
    return null;
  }

  const trimmed = String(value).trim();
  return trimmed ? trimmed.toUpperCase() : null;
};

class PhysicalCountService {
  async createCountSession(countData) {
    const {
      warehouseId,
      countDate,
      items = [],
      notes,
      freezeStock,
      freezeMovements,
      createdBy,
    } = countData;

    if (!warehouseId) {
      throw new Error('Warehouse ID is required');
    }
    if (!createdBy) {
      throw new Error('Created by user is required');
    }
    if (!Array.isArray(items) || items.length === 0) {
      throw new Error('At least one item is required');
    }

    const warehouse = await Warehouse.findById(warehouseId);
    if (!warehouse) {
      throw new Error('Warehouse not found');
    }

    const countItems = await this.buildCountItems(items, warehouse._id, createdBy);
    const status = this.determineCountStatus(countItems);
    const countNumber = await PhysicalCount.generateCountNumber();

    const countSession = await PhysicalCount.create({
      countNumber,
      countName: `Physical Count ${countNumber}`,
      warehouse: warehouse._id,
      countDate: countDate || new Date(),
      status,
      freezeMovements: Boolean(freezeMovements ?? freezeStock),
      items: countItems,
      notes,
      createdBy,
      startedAt: status === 'draft' ? undefined : new Date(),
      completedAt: status === 'completed' ? new Date() : undefined,
    });

    return this.getCountById(countSession._id);
  }

  async getCountSessions(filters = {}) {
    const {
      warehouseId,
      status,
      startDate,
      endDate,
      page = 1,
      limit = 50,
      sort = '-createdAt',
    } = filters;

    const query = {};
    if (warehouseId) {
      query.warehouse = warehouseId;
    }
    if (status) {
      query.status = status;
    }
    if (startDate || endDate) {
      query.countDate = {};
      if (startDate) {
        query.countDate.$gte = new Date(startDate);
      }
      if (endDate) {
        query.countDate.$lte = new Date(endDate);
      }
    }

    const pageNumber = parseInt(page, 10);
    const pageSize = parseInt(limit, 10);
    const skip = (pageNumber - 1) * pageSize;

    const [counts, total] = await Promise.all([
      PhysicalCount.find(query)
        .populate('warehouse', 'name code')
        .populate('createdBy', 'username email')
        .populate('approvalInfo.approvedBy', 'username email')
        .sort(sort)
        .skip(skip)
        .limit(pageSize)
        .lean(),
      PhysicalCount.countDocuments(query),
    ]);

    return {
      data: counts.map((count) => this.serializeCount(count)),
      pagination: {
        total,
        totalItems: total,
        page: pageNumber,
        limit: pageSize,
        pages: Math.ceil(total / pageSize),
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async getCountById(id) {
    const count = await PhysicalCount.findById(id)
      .populate('warehouse', 'name code location')
      .populate('items.item', 'name code unit category')
      .populate('createdBy', 'username email')
      .populate('approvalInfo.approvedBy', 'username email');

    if (!count) {
      throw new Error('Physical count not found');
    }

    return this.serializeCount(count);
  }

  async updateCount(id, updateData) {
    const count = await PhysicalCount.findById(id);
    if (!count) {
      throw new Error('Physical count not found');
    }
    if (!['draft', 'in_progress', 'completed'].includes(count.status)) {
      throw new Error('Can only update draft, in-progress, or completed counts');
    }

    if (updateData.notes !== undefined) {
      count.notes = updateData.notes;
    }
    if (updateData.freezeStock !== undefined || updateData.freezeMovements !== undefined) {
      count.freezeMovements = Boolean(updateData.freezeMovements ?? updateData.freezeStock);
    }
    if (updateData.countDate) {
      count.countDate = new Date(updateData.countDate);
    }

    if (Array.isArray(updateData.items)) {
      count.items = await this.buildCountItems(
        updateData.items,
        count.warehouse,
        updateData.updatedBy || count.createdBy,
      );
      count.status = this.determineCountStatus(count.items);
      count.startedAt = count.status === 'draft' ? count.startedAt : (count.startedAt || new Date());
      count.completedAt = count.status === 'completed' ? new Date() : undefined;
    }

    count.updateStatistics();
    await count.save();
    return this.getCountById(id);
  }

  async approveCount(id, approvedBy) {
    if (!approvedBy) {
      throw new Error('Approved by user is required');
    }

    const count = await PhysicalCount.findById(id)
      .populate('warehouse', 'name code')
      .populate('items.item', 'name code unit category');

    if (!count) {
      throw new Error('Physical count not found');
    }

    if (count.status === 'in_progress' && count.isComplete) {
      count.status = 'completed';
      count.completedAt = count.completedAt || new Date();
    }

    if (count.status !== 'completed') {
      throw new Error('Can only approve completed counts');
    }

    await this.processCountAdjustments(count, approvedBy);

    count.status = 'approved';
    count.approvalInfo = {
      approvedBy,
      approvedAt: new Date(),
      approvalNotes: 'Stock reconciled from physical count',
    };
    await count.save();

    return this.getCountById(id);
  }

  async cancelCount(id, reason = '') {
    const count = await PhysicalCount.findById(id);
    if (!count) {
      throw new Error('Physical count not found');
    }
    if (['approved', 'cancelled'].includes(count.status)) {
      throw new Error('Cannot cancel an approved or already cancelled count');
    }

    count.status = 'cancelled';
    if (reason) {
      count.notes = count.notes ? `${count.notes}\nCancelled: ${reason}` : `Cancelled: ${reason}`;
    }
    await count.save();

    return this.getCountById(id);
  }

  async processCountAdjustments(count, approvedBy, session = null) {
    const affectedItemIds = new Set();

    for (const countItem of count.items) {
      if (!countItem.isCounted || countItem.variance === 0) {
        continue;
      }

      const itemId = getObjectId(countItem.item);
      const warehouseId = getObjectId(count.warehouse);
      const batchNumber = normalizeBatchNumber(countItem.batchNumber);
      const variance = countItem.variance;
      const inventories = await this.getMatchingInventories(itemId, warehouseId, batchNumber, session);

      if (variance > 0) {
        await this.applyIncrease(inventories, itemId, warehouseId, batchNumber, variance, session);
      } else {
        await this.applyDecrease(inventories, itemId, warehouseId, Math.abs(variance), session);
      }

      const movement = new StockMovement({
        itemId,
        warehouse: warehouseId,
        movementType: variance > 0 ? 'in' : 'out',
        quantity: Math.abs(variance),
        referenceType: 'adjustment',
        referenceId: count._id,
        batchInfo: batchNumber ? { batchNumber } : undefined,
        movementDate: new Date(),
        notes: `Physical count ${variance > 0 ? 'excess' : 'shortage'} - Count ${count.countNumber}`,
        createdBy: approvedBy,
      });
      await movement.save({ session });

      affectedItemIds.add(itemId.toString());
    }

    await Promise.all(
      Array.from(affectedItemIds).map((itemId) => inventoryService.syncItemCurrentStock(itemId, session)),
    );
  }

  async getCountVarianceReport(warehouseId, startDate, endDate) {
    const query = { status: { $in: ['completed', 'approved'] } };
    if (warehouseId) {
      query.warehouse = warehouseId;
    }
    if (startDate || endDate) {
      query.countDate = {};
      if (startDate) {
        query.countDate.$gte = new Date(startDate);
      }
      if (endDate) {
        query.countDate.$lte = new Date(endDate);
      }
    }

    const counts = await PhysicalCount.find(query)
      .populate('warehouse', 'name')
      .lean();

    return counts.map((count) => {
      const systemStock = count.items.reduce((sum, item) => sum + (item.systemQuantity || 0), 0);
      const physicalStock = count.items.reduce((sum, item) => sum + (item.physicalQuantity || 0), 0);
      const variance = count.items.reduce((sum, item) => sum + (item.variance || 0), 0);

      return {
        countNumber: count.countNumber,
        countDate: count.countDate,
        warehouse: count.warehouse?.name,
        systemStock,
        physicalStock,
        variance,
        variancePercentage: systemStock ? (variance / systemStock) * 100 : 0,
        itemCount: count.items?.length || 0,
        approved: count.status === 'approved',
      };
    });
  }

  async getDiscrepancyItems(warehouseId, limit = 20) {
    const query = {
      status: { $in: ['completed', 'approved'] },
      'items.variance': { $ne: 0 },
    };
    if (warehouseId) {
      query.warehouse = warehouseId;
    }

    const counts = await PhysicalCount.find(query)
      .populate('warehouse', 'name')
      .populate('items.item', 'name code')
      .sort({ countDate: -1 })
      .limit(limit)
      .lean();

    const discrepancies = [];
    for (const count of counts) {
      for (const item of count.items.filter((entry) => entry.variance !== 0)) {
        discrepancies.push({
          countNumber: count.countNumber,
          countDate: count.countDate,
          warehouse: count.warehouse?.name,
          itemId: getObjectId(item.item),
          itemName: item.item?.name,
          itemCode: item.item?.code,
          batchNumber: item.batchNumber,
          systemStock: item.systemQuantity,
          physicalStock: item.physicalQuantity,
          variance: item.variance,
          varianceType: item.variance > 0 ? 'excess' : 'shortage',
          variancePercentage: item.systemQuantity ? (item.variance / item.systemQuantity) * 100 : 0,
        });
      }
    }

    return discrepancies
      .sort((left, right) => Math.abs(right.variance) - Math.abs(left.variance))
      .slice(0, limit);
  }

  async buildCountItems(items, warehouseId, countedBy) {
    const countItems = [];

    for (const itemData of items) {
      const itemId = getObjectId(itemData.itemId || itemData.item);
      if (!itemId) {
        throw new Error('Item ID is required for all physical count rows');
      }

      const item = await Item.findById(itemId);
      if (!item) {
        throw new Error(`Item not found: ${itemId}`);
      }

      const batchNumber = normalizeBatchNumber(itemData.batchNumber);
      const systemQuantity = await this.getSystemQuantity(itemId, warehouseId, batchNumber);
      const rawPhysicalQuantity = itemData.countedQuantity ?? itemData.physicalQuantity ?? null;
      const physicalQuantity = rawPhysicalQuantity === null ? null : Number(rawPhysicalQuantity);

      if (physicalQuantity !== null && (!Number.isFinite(physicalQuantity) || physicalQuantity < 0)) {
        throw new Error('Physical quantity must be a non-negative number');
      }

      const isCounted = physicalQuantity !== null;

      countItems.push({
        item: item._id,
        batchNumber,
        systemQuantity,
        physicalQuantity,
        variance: isCounted ? physicalQuantity - systemQuantity : 0,
        notes: itemData.reason || itemData.notes || '',
        countedBy: isCounted ? countedBy : undefined,
        countedAt: isCounted ? new Date() : undefined,
        isCounted,
      });
    }

    return countItems;
  }

  determineCountStatus(items) {
    if (!items.length) {
      return 'draft';
    }

    const countedItems = items.filter((item) => item.isCounted).length;
    if (countedItems === 0) {
      return 'draft';
    }
    if (countedItems === items.length) {
      return 'completed';
    }
    return 'in_progress';
  }

  async getSystemQuantity(itemId, warehouseId, batchNumber = null, session = null) {
    const match = {
      item: new mongoose.Types.ObjectId(itemId),
      warehouse: new mongoose.Types.ObjectId(warehouseId),
    };

    if (batchNumber) {
      match.batchNumber = batchNumber;
    }

    const aggregate = Inventory.aggregate([
      { $match: match },
      { $group: { _id: null, total: { $sum: '$quantity' } } },
    ]);
    if (session) {
      aggregate.session(session);
    }

    const result = await aggregate;
    return result[0]?.total || 0;
  }

  async getMatchingInventories(itemId, warehouseId, batchNumber = null, session = null) {
    const query = {
      item: itemId,
      warehouse: warehouseId,
    };

    if (batchNumber) {
      query.batchNumber = batchNumber;
    }

    const inventoryQuery = Inventory.find(query).sort({ batchNumber: 1, createdAt: 1, _id: 1 });
    if (session) {
      inventoryQuery.session(session);
    }

    return inventoryQuery.exec();
  }

  async applyIncrease(inventories, itemId, warehouseId, batchNumber, quantity, session = null) {
    let targetInventory = null;

    if (batchNumber) {
      targetInventory = inventories[0] || null;
    } else {
      targetInventory = inventories.find((entry) => !entry.batchNumber) || null;
    }

    if (!targetInventory) {
      targetInventory = new Inventory({
        item: itemId,
        warehouse: warehouseId,
        batchNumber: batchNumber || undefined,
        quantity: 0,
        reservedQuantity: 0,
      });
      if (session) {
        targetInventory.$session(session);
      }
    }

    targetInventory.quantity += quantity;
    targetInventory.lastCounted = new Date();
    await targetInventory.save({ session });

    if (batchNumber) {
      const batchQuery = Batch.findOne({
        item: itemId,
        warehouse: warehouseId,
        batchNumber,
      });
      if (session) {
        batchQuery.session(session);
      }

      const batch = await batchQuery;
      if (batch) {
        batch.remainingQuantity += quantity;
        if (batch.quantity < batch.remainingQuantity) {
          batch.quantity = batch.remainingQuantity;
        }
        await batch.save({ session });
      }
    }
  }

  async applyDecrease(inventories, itemId, warehouseId, quantity, session = null) {
    const totalAvailable = inventories.reduce((sum, entry) => sum + entry.quantity, 0);
    if (totalAvailable < quantity) {
      throw new Error('Physical count reduction exceeds available inventory');
    }

    let remaining = quantity;
    const batchDeductions = new Map();

    for (const inventory of inventories) {
      if (remaining <= 0) {
        break;
      }

      const decrement = Math.min(inventory.quantity, remaining);
      inventory.quantity -= decrement;
      inventory.lastCounted = new Date();
      await inventory.save({ session });

      if (inventory.batchNumber) {
        batchDeductions.set(
          inventory.batchNumber,
          (batchDeductions.get(inventory.batchNumber) || 0) + decrement,
        );
      }

      remaining -= decrement;
    }

    if (remaining > 0) {
      throw new Error(`Failed to fully apply physical count decrease for item ${itemId} in warehouse ${warehouseId}`);
    }

    for (const [batchNumber, deduction] of batchDeductions.entries()) {
      const batchQuery = Batch.findOne({
        item: itemId,
        warehouse: warehouseId,
        batchNumber,
      });
      if (session) {
        batchQuery.session(session);
      }

      const batch = await batchQuery;
      if (batch) {
        batch.remainingQuantity = Math.max(0, batch.remainingQuantity - deduction);
        await batch.save({ session });
      }
    }
  }

  serializeCount(count) {
    const warehouse = count.warehouse || {};
    const createdBy = count.createdBy || {};
    const approvedBy = count.approvalInfo?.approvedBy || {};

    const items = (count.items || []).map((item) => {
      const itemDoc = item.item || {};
      return {
        _id: item._id,
        itemId: getObjectId(itemDoc) || getObjectId(item.item),
        itemName: itemDoc.name,
        itemCode: itemDoc.code,
        unit: itemDoc.unit,
        category: itemDoc.category,
        batchNumber: item.batchNumber,
        systemQuantity: item.systemQuantity,
        physicalQuantity: item.physicalQuantity,
        countedQuantity: item.physicalQuantity,
        variance: item.variance,
        variancePercentage: item.systemQuantity ? (item.variance / item.systemQuantity) * 100 : 0,
        notes: item.notes,
        isCounted: item.isCounted,
        countedBy: item.countedBy,
        countedAt: item.countedAt,
      };
    });

    return {
      _id: count._id,
      countNumber: count.countNumber,
      countName: count.countName,
      countDate: count.countDate,
      warehouse: getObjectId(warehouse),
      warehouseId: getObjectId(warehouse),
      warehouseName: warehouse.name,
      status: count.status,
      freezeStock: count.freezeMovements,
      notes: count.notes,
      items,
      statistics: count.statistics,
      createdBy: createdBy.username || createdBy.email || createdBy,
      createdById: getObjectId(createdBy),
      approvedBy: approvedBy.username || approvedBy.email || approvedBy,
      approvedAt: count.approvalInfo?.approvedAt,
      startedAt: count.startedAt,
      completedAt: count.completedAt,
      createdAt: count.createdAt,
      updatedAt: count.updatedAt,
    };
  }
}

module.exports = new PhysicalCountService();
