const Batch = require('../models/Batch');
const Inventory = require('../models/Inventory');
const Item = require('../models/Item');

class StockValuationService {
  async calculateFIFO(itemId, warehouseId) {
    const batches = await Batch.find({
      item: itemId,
      warehouse: warehouseId,
      status: 'active',
    })
      .sort({ createdAt: 1 })
      .lean();

    const valuation = {
      method: 'FIFO',
      itemId,
      warehouseId,
      totalQuantity: 0,
      totalValue: 0,
      batches: [],
    };

    let remainingQuantity = await this.getItemStock(itemId, warehouseId);
    let totalValue = 0;

    for (const batch of batches) {
      if (remainingQuantity <= 0) break;

      const quantity = Math.min(batch.remainingQuantity, remainingQuantity);
      const value = quantity * batch.unitCost;

      valuation.batches.push({
        batchNumber: batch.batchNumber,
        quantity,
        unitCost: batch.unitCost,
        value,
        createdAt: batch.createdAt,
        expiryDate: batch.expiryDate,
      });

      totalValue += value;
      remainingQuantity -= quantity;
      valuation.totalQuantity += quantity;
    }

    valuation.totalValue = totalValue;
    valuation.averageCost = valuation.totalQuantity > 0 ? totalValue / valuation.totalQuantity : 0;

    return valuation;
  }

  async calculateLIFO(itemId, warehouseId) {
    const batches = await Batch.find({
      item: itemId,
      warehouse: warehouseId,
      status: 'active',
    })
      .sort({ createdAt: -1 })
      .lean();

    const valuation = {
      method: 'LIFO',
      itemId,
      warehouseId,
      totalQuantity: 0,
      totalValue: 0,
      batches: [],
    };

    let remainingQuantity = await this.getItemStock(itemId, warehouseId);
    let totalValue = 0;

    for (const batch of batches) {
      if (remainingQuantity <= 0) break;

      const quantity = Math.min(batch.remainingQuantity, remainingQuantity);
      const value = quantity * batch.unitCost;

      valuation.batches.push({
        batchNumber: batch.batchNumber,
        quantity,
        unitCost: batch.unitCost,
        value,
        createdAt: batch.createdAt,
        expiryDate: batch.expiryDate,
      });

      totalValue += value;
      remainingQuantity -= quantity;
      valuation.totalQuantity += quantity;
    }

    valuation.totalValue = totalValue;
    valuation.averageCost = valuation.totalQuantity > 0 ? totalValue / valuation.totalQuantity : 0;

    return valuation;
  }

  async calculateWeightedAverage(itemId, warehouseId) {
    const batches = await Batch.find({
      item: itemId,
      warehouse: warehouseId,
      status: 'active',
    })
      .lean();

    const valuation = {
      method: 'Weighted Average',
      itemId,
      warehouseId,
      totalQuantity: 0,
      totalValue: 0,
      averageCost: 0,
      batches: [],
    };

    let totalQuantity = 0;
    let totalValue = 0;

    for (const batch of batches) {
      const quantity = batch.remainingQuantity;
      const value = quantity * batch.unitCost;

      valuation.batches.push({
        batchNumber: batch.batchNumber,
        quantity,
        unitCost: batch.unitCost,
        value,
      });

      totalQuantity += quantity;
      totalValue += value;
    }

    valuation.totalQuantity = totalQuantity;
    valuation.totalValue = totalValue;
    valuation.averageCost = totalQuantity > 0 ? totalValue / totalQuantity : 0;

    return valuation;
  }

  async getWarehouseValuation(warehouseId, method = 'weighted_average') {
    const inventories = await Inventory.find({ warehouseId }).populate('itemId').lean();

    const valuation = {
      method,
      warehouseId,
      items: [],
      totalValue: 0,
      totalQuantity: 0,
    };

    for (const inv of inventories) {
      let itemValuation;

      switch (method.toLowerCase()) {
        case 'fifo':
          itemValuation = await this.calculateFIFO(inv.itemId._id, warehouseId);
          break;
        case 'lifo':
          itemValuation = await this.calculateLIFO(inv.itemId._id, warehouseId);
          break;
        case 'weighted_average':
        default:
          itemValuation = await this.calculateWeightedAverage(inv.itemId._id, warehouseId);
          break;
      }

      if (itemValuation && itemValuation.batches.length > 0) {
        valuation.items.push({
          itemId: inv.itemId._id,
          itemName: inv.itemId.name,
          itemCode: inv.itemId.code,
          category: inv.itemId.category,
          totalQuantity: itemValuation.totalQuantity,
          totalValue: itemValuation.totalValue,
          averageCost: itemValuation.averageCost,
        });

        valuation.totalValue += itemValuation.totalValue;
        valuation.totalQuantity += itemValuation.totalQuantity;
      }
    }

    valuation.items.sort((a, b) => b.totalValue - a.totalValue);

    return valuation;
  }

  async getCategoryValuation(categoryId, warehouseId, method = 'weighted_average') {
    const items = await Item.find({ category: categoryId, isActive: true }).lean();
    const valuation = {
      method,
      categoryId,
      categoryName: (await Item.findById(categoryId))?.name || 'Unknown',
      warehouseId,
      items: [],
      totalValue: 0,
      totalQuantity: 0,
    };

    for (const item of items) {
      let itemValuation;

      if (warehouseId) {
        switch (method.toLowerCase()) {
          case 'fifo':
            itemValuation = await this.calculateFIFO(item._id, warehouseId);
            break;
          case 'lifo':
            itemValuation = await this.calculateLIFO(item._id, warehouseId);
            break;
          default:
            itemValuation = await this.calculateWeightedAverage(item._id, warehouseId);
            break;
        }
      } else {
        const allInventories = await Inventory.find({ itemId: item._id }).lean();
        let totalValue = 0;
        let totalQuantity = 0;
        for (const inv of allInventories) {
          const v = await this.calculateWeightedAverage(item._id, inv.warehouseId);
          totalValue += v.totalValue;
          totalQuantity += v.totalQuantity;
        }
        itemValuation = {
          totalValue,
          totalQuantity,
          averageCost: totalQuantity > 0 ? totalValue / totalQuantity : 0,
        };
      }

      if (itemValuation && itemValuation.totalValue > 0) {
        valuation.items.push({
          itemId: item._id,
          itemName: item.name,
          itemCode: item.code,
          totalQuantity: itemValuation.totalQuantity,
          totalValue: itemValuation.totalValue,
          averageCost: itemValuation.averageCost,
        });

        valuation.totalValue += itemValuation.totalValue;
        valuation.totalQuantity += itemValuation.totalQuantity;
      }
    }

    valuation.items.sort((a, b) => b.totalValue - a.totalValue);

    return valuation;
  }

  async getTotalInventoryValue(method = 'weighted_average') {
    const Inventory = require('../models/Inventory');
    const warehouses = await require('../models/Warehouse').find({ isActive: true }).lean();

    const valuation = {
      method,
      warehouses: [],
      totalValue: 0,
      totalQuantity: 0,
    };

    for (const warehouse of warehouses) {
      const warehouseValuation = await this.getWarehouseValuation(warehouse._id, method);
      valuation.warehouses.push({
        warehouseId: warehouse._id,
        warehouseName: warehouse.name,
        totalValue: warehouseValuation.totalValue,
        totalQuantity: warehouseValuation.totalQuantity,
        itemCount: warehouseValuation.items.length,
      });

      valuation.totalValue += warehouseValuation.totalValue;
      valuation.totalQuantity += warehouseValuation.totalQuantity;
    }

    valuation.warehouses.sort((a, b) => b.totalValue - a.totalValue);

    return valuation;
  }

  async compareMethods(itemId, warehouseId) {
    const [fifo, lifo, weightedAvg] = await Promise.all([
      this.calculateFIFO(itemId, warehouseId),
      this.calculateLIFO(itemId, warehouseId),
      this.calculateWeightedAverage(itemId, warehouseId),
    ]);

    return {
      itemId,
      warehouseId,
      methods: {
        fifo,
        lifo,
        weightedAverage: weightedAvg,
      },
      analysis: {
        highestValue: Math.max(fifo.totalValue, lifo.totalValue, weightedAvg.totalValue),
        lowestValue: Math.min(fifo.totalValue, lifo.totalValue, weightedAvg.totalValue),
        variance:
          Math.max(fifo.totalValue, lifo.totalValue, weightedAvg.totalValue)
          - Math.min(fifo.totalValue, lifo.totalValue, weightedAvg.totalValue),
      },
    };
  }

  async getItemStock(itemId, warehouseId) {
    const inventory = await Inventory.findOne({ itemId, warehouseId });
    return inventory ? (inventory.quantity || 0) : 0;
  }
}

module.exports = new StockValuationService();
