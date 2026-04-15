const PhysicalCount = require('../models/PhysicalCount');
const Inventory = require('../models/Inventory');
const Item = require('../models/Item');
const Warehouse = require('../models/Warehouse');
const StockMovement = require('../models/StockMovement');

class PhysicalCountService {
  async createCountSession(countData) {
    const {
      warehouseId, items, notes, freezeStock, createdBy,
    } = countData;

    const warehouse = await Warehouse.findById(warehouseId);
    if (!warehouse) {
      throw new Error('Warehouse not found');
    }

    const countItems = [];
    let totalSystemStock = 0;
    let totalPhysicalStock = 0;
    let totalVariance = 0;

    for (const itemData of items) {
      const item = await Item.findById(itemData.itemId);
      if (!item) {
        throw new Error(`Item not found: ${itemData.itemId}`);
      }

      const inventory = await Inventory.findOne({
        itemId: item._id,
        warehouseId,
      });

      const systemStock = inventory ? inventory.quantity : 0;
      const physicalStock = itemData.physicalQuantity || 0;
      const variance = physicalStock - systemStock;
      const variancePercentage = systemStock > 0 ? (variance / systemStock) * 100 : 0;

      totalSystemStock += systemStock;
      totalPhysicalStock += physicalStock;
      totalVariance += variance;

      countItems.push({
        itemId: item._id,
        itemName: item.name,
        itemCode: item.code,
        unit: item.unit,
        batchNumber: itemData.batchNumber,
        systemStock,
        physicalStock,
        variance,
        variancePercentage,
        varianceType: variance === 0 ? 'match' : variance > 0 ? 'excess' : 'shortage',
        reason: itemData.reason || '',
      });
    }

    const countNumber = await PhysicalCount.generateCountNumber();

    const countSession = await PhysicalCount.create({
      countNumber,
      warehouseId,
      warehouseName: warehouse.name,
      items: countItems,
      totals: {
        systemStock: totalSystemStock,
        physicalStock: totalPhysicalStock,
        variance: totalVariance,
        variancePercentage: totalSystemStock > 0 ? (totalVariance / totalSystemStock) * 100 : 0,
      },
      status: 'pending',
      freezeStock: freezeStock || false,
      notes,
      createdBy,
    });

    return await PhysicalCount.findById(countSession._id)
      .populate('warehouseId', 'name code')
      .populate('items.itemId', 'name code')
      .populate('createdBy', 'username email');
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
      query.warehouseId = warehouseId;
    }

    if (status) {
      query.status = status;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate);
      }
    }

    const skip = (page - 1) * limit;

    const [counts, total] = await Promise.all([
      PhysicalCount.find(query)
        .populate('warehouseId', 'name code')
        .populate('createdBy', 'username email')
        .populate('approvedBy', 'username email')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      PhysicalCount.countDocuments(query),
    ]);

    return {
      counts,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getCountById(id) {
    const count = await PhysicalCount.findOne({ _id: id })
      .populate('warehouseId', 'name code address')
      .populate('items.itemId', 'name code unit category')
      .populate('createdBy', 'username email')
      .populate('approvedBy', 'username email');

    if (!count) {
      throw new Error('Physical count not found');
    }

    return count;
  }

  async updateCount(id, updateData) {
    const count = await PhysicalCount.findOne({ _id: id });

    if (!count) {
      throw new Error('Physical count not found');
    }

    if (count.status !== 'pending') {
      throw new Error('Can only update pending counts');
    }

    const allowedUpdates = ['items', 'notes', 'freezeStock'];
    allowedUpdates.forEach((field) => {
      if (updateData[field] !== undefined) {
        count[field] = updateData[field];
      }
    });

    if (updateData.items) {
      let totalSystemStock = 0;
      let totalPhysicalStock = 0;
      let totalVariance = 0;

      for (const itemData of updateData.items) {
        const inventory = await Inventory.findOne({
          itemId: itemData.itemId,
          warehouseId: count.warehouseId,
        });

        const systemStock = inventory ? inventory.quantity : 0;
        const physicalStock = itemData.physicalQuantity || 0;
        const variance = physicalStock - systemStock;

        totalSystemStock += systemStock;
        totalPhysicalStock += physicalStock;
        totalVariance += variance;
      }

      count.totals = {
        systemStock: totalSystemStock,
        physicalStock: totalPhysicalStock,
        variance: totalVariance,
        variancePercentage: totalSystemStock > 0 ? (totalVariance / totalSystemStock) * 100 : 0,
      };
    }

    await count.save();

    return await this.getCountById(id);
  }

  async approveCount(id, approvedBy) {
    const count = await this.getCountById(id);

    if (count.status !== 'pending') {
      throw new Error('Can only approve pending counts');
    }

    count.status = 'approved';
    count.approvedBy = approvedBy;
    count.approvedAt = new Date();

    await count.save();

    const adjustmentsCreated = await this.processCountAdjustments(count);

    return await this.getCountById(id);
  }

  async cancelCount(id, reason) {
    const count = await PhysicalCount.findOne({ _id: id });

    if (!count) {
      throw new Error('Physical count not found');
    }

    if (count.status === 'completed') {
      throw new Error('Cannot cancel completed count');
    }

    count.status = 'cancelled';
    count.cancellationReason = reason;
    count.cancelledAt = new Date();

    await count.save();

    return await this.getCountById(id);
  }

  async processCountAdjustments(count) {
    const adjustments = [];

    for (const item of count.items) {
      if (item.variance !== 0) {
        const inventory = await Inventory.findOne({
          itemId: item.itemId._id,
          warehouseId: count.warehouseId._id,
        });

        const adjustmentType = item.variance > 0 ? 'increase' : 'decrease';
        const adjustmentQuantity = Math.abs(item.variance);
        const reason = item.varianceType === 'excess'
          ? 'Physical count excess'
          : 'Physical count shortage';

        const adjustment = {
          itemId: item.itemId._id,
          warehouseId: count.warehouseId._id,
          adjustmentType,
          quantity: adjustmentQuantity,
          reason,
          referenceType: 'physical_count',
          referenceId: count._id,
          referenceNumber: count.countNumber,
          notes: `${reason} - Batch: ${item.batchNumber || 'N/A'}`,
          status: 'approved',
        };

        if (adjustmentType === 'increase') {
          if (inventory) {
            inventory.quantity += adjustmentQuantity;
            await inventory.save();
          } else {
            await Inventory.create({
              itemId: item.itemId._id,
              warehouseId: count.warehouseId._id,
              quantity: adjustmentQuantity,
              reservedQuantity: 0,
            });
          }
        } else if (inventory) {
          inventory.quantity = Math.max(0, inventory.quantity - adjustmentQuantity);
          await inventory.save();
        }

        adjustments.push(adjustment);
      }
    }

    count.status = 'completed';
    count.adjustmentsCreated = adjustments.length;
    count.completedAt = new Date();
    await count.save();

    return adjustments;
  }

  async getCountVarianceReport(warehouseId, startDate, endDate) {
    const query = { status: { $in: ['approved', 'completed'] } };

    if (warehouseId) {
      query.warehouseId = warehouseId;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate);
      }
    }

    const counts = await PhysicalCount.find(query)
      .populate('warehouseId', 'name')
      .lean();

    const variances = [];
    for (const count of counts) {
      variances.push({
        countNumber: count.countNumber,
        countDate: count.createdAt,
        warehouse: count.warehouseId?.name,
        systemStock: count.totals?.systemStock || 0,
        physicalStock: count.totals?.physicalStock || 0,
        variance: count.totals?.variance || 0,
        variancePercentage: count.totals?.variancePercentage || 0,
        itemCount: count.items?.length || 0,
        approved: count.status === 'completed',
      });
    }

    return variances;
  }

  async getDiscrepancyItems(warehouseId, limit = 20) {
    const query = {
      status: { $in: ['approved', 'completed'] },
      'items.variance': { $ne: 0 },
    };

    if (warehouseId) {
      query.warehouseId = warehouseId;
    }

    const counts = await PhysicalCount.find(query)
      .populate('warehouseId', 'name')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const discrepancies = [];
    for (const count of counts) {
      for (const item of count.items.filter((i) => i.variance !== 0)) {
        discrepancies.push({
          countNumber: count.countNumber,
          countDate: count.createdAt,
          warehouse: count.warehouseId?.name,
          itemId: item.itemId?._id,
          itemName: item.itemName,
          itemCode: item.itemCode,
          batchNumber: item.batchNumber,
          systemStock: item.systemStock,
          physicalStock: item.physicalStock,
          variance: item.variance,
          varianceType: item.varianceType,
          variancePercentage: item.variancePercentage,
        });
      }
    }

    return discrepancies.sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance)).slice(0, limit);
  }
}

module.exports = new PhysicalCountService();
