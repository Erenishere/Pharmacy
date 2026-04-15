const EOrder = require('../models/EOrder');
const Customer = require('../models/Customer');
const Item = require('../models/Item');
const Invoice = require('../models/Invoice');
const salesInvoiceService = require('./salesInvoiceService');
const counterService = require('../utils/counterService');

class EOrderService {
  /**
   * Generate unique order number
   * Format: EO2025000001 (EO + Year + 6-digit sequence)
   * @returns {Promise<string>} Generated order number
   */
  async generateOrderNumber() {
    return counterService.nextSequence('EO', EOrder, 'orderNumber');
  }

  async createOrder(data) {
    const {
      customerId, salesmanId, routeId, items, notes, createdBy, deviceId,
    } = data;

    const customer = await Customer.findById(customerId);
    if (!customer) {
      throw new Error('Customer not found');
    }

    const itemIds = items.map((item) => item.itemId);
    const existingItems = await Item.find({ _id: { $in: itemIds } });
    if (existingItems.length !== itemIds.length) {
      throw new Error('One or more items not found');
    }

    // Generate order number
    const orderNumber = await this.generateOrderNumber();

    const orderData = {
      orderNumber,
      customerId,
      customerName: customer.name,
      customerTown: customer.town || customer.city,
      salesmanId,
      routeId,
      items: items.map((item) => {
        const existingItem = existingItems.find(
          (i) => i._id.toString() === item.itemId.toString(),
        );
        return {
          ...item,
          itemName: existingItem ? existingItem.name : item.itemName,
          boxPacking: item.boxPacking || existingItem?.boxPacking || 1,
        };
      }),
      notes,
      createdBy,
      mobileSync: deviceId
        ? {
          isSynced: true,
          syncedAt: new Date(),
          deviceId,
        }
        : undefined,
    };

    const order = await EOrder.create(orderData);

    return await EOrder.findById(order._id)
      .populate('customerId', 'name code town phone')
      .populate('salesmanId', 'name code')
      .populate('routeId', 'name code')
      .populate('items.itemId', 'name code unit boxPacking')
      .populate('createdBy', 'username email');
  }

  async getOrders(filters = {}) {
    const {
      status,
      customerId,
      salesmanId,
      routeId,
      startDate,
      endDate,
      page = 1,
      limit = 50,
      sort = '-createdAt',
    } = filters;

    const query = { isDeleted: false };

    if (status) {
      query.status = status;
    }

    if (customerId) {
      query.customerId = customerId;
    }

    if (salesmanId) {
      query.salesmanId = salesmanId;
    }

    if (routeId) {
      query.routeId = routeId;
    }

    if (startDate || endDate) {
      query.orderDate = {};
      if (startDate) {
        query.orderDate.$gte = new Date(startDate);
      }
      if (endDate) {
        query.orderDate.$lte = new Date(endDate);
      }
    }

    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      EOrder.find(query)
        .populate('customerId', 'name code town phone')
        .populate('salesmanId', 'name code')
        .populate('routeId', 'name code')
        .populate('items.itemId', 'name code unit')
        .populate('approvedBy', 'username email')
        .populate('createdBy', 'username email')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      EOrder.countDocuments(query),
    ]);

    return {
      orders,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getOrderById(id) {
    const order = await EOrder.findOne({
      _id: id,
      isDeleted: false,
    })
      .populate('customerId', 'name code town phone email address')
      .populate('salesmanId', 'name code phone')
      .populate('routeId', 'name code')
      .populate('items.itemId', 'name code unit boxPacking purchasePrice')
      .populate('approvedBy', 'username email')
      .populate('createdBy', 'username email');

    if (!order) {
      throw new Error('Order not found');
    }

    return order;
  }

  async approveOrder(id, approvedBy) {
    const order = await EOrder.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!order) {
      throw new Error('Order not found');
    }

    if (order.status !== 'pending') {
      throw new Error(`Cannot approve order with status: ${order.status}`);
    }

    order.status = 'approved';
    order.approvedBy = approvedBy;
    order.approvedAt = new Date();

    await order.save();

    return await this.getOrderById(id);
  }

  async cancelOrder(id, reason) {
    const order = await EOrder.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!order) {
      throw new Error('Order not found');
    }

    if (order.status === 'cancelled') {
      throw new Error('Order is already cancelled');
    }

    if (order.convertedInvoiceId) {
      throw new Error('Cannot cancel order that has been converted to invoice');
    }

    order.status = 'cancelled';
    order.cancelledAt = new Date();
    order.cancellationReason = reason;

    await order.save();

    return await this.getOrderById(id);
  }

  async convertToInvoice(id, additionalData = {}) {
    const order = await this.getOrderById(id);

    if (order.status !== 'approved') {
      throw new Error('Order must be approved before conversion to invoice');
    }

    const invoiceItems = order.items.map((item) => ({
      itemId: item.itemId._id || item.itemId,
      boxQuantity: item.boxQuantity,
      unitQuantity: item.unitQuantity,
      unitPrice: item.unitPrice,
      discount: item.discount,
      gstRate: item.gstRate,
      scheme1Quantity: item.scheme1Quantity,
      scheme2Quantity: item.scheme2Quantity,
      batchInfo: item.batchNumber
        ? {
          batchNumber: item.batchNumber,
          expiryDate: item.expiryDate,
        }
        : undefined,
    }));

    const invoiceData = {
      type: 'sales',
      customerId: order.customerId._id || order.customerId,
      invoiceDate: additionalData.invoiceDate || new Date(),
      dueDate: additionalData.dueDate || new Date(Date.now() + (order.customerId.creditDays || 30) * 24 * 60 * 60 * 1000),
      salesmanId: order.salesmanId?._id || order.salesmanId,
      poNumber: additionalData.poNumber,
      creditDays: order.customerId.creditDays || 0,
      items: invoiceItems,
      notes: additionalData.notes || `Converted from E-Order: ${order.orderNumber}`,
    };

    const invoice = await salesInvoiceService.createSalesInvoice(invoiceData);

    order.status = 'converted';
    order.convertedInvoiceId = invoice._id;
    order.convertedAt = new Date();
    await order.save();

    return invoice;
  }

  async updateOrder(id, data) {
    const order = await EOrder.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!order) {
      throw new Error('Order not found');
    }

    if (order.status !== 'pending') {
      throw new Error(`Cannot update order with status: ${order.status}. Only pending orders can be updated.`);
    }

    const allowedUpdates = ['items', 'notes', 'customerId', 'salesmanId', 'routeId'];
    allowedUpdates.forEach((field) => {
      if (data[field] !== undefined) {
        order[field] = data[field];
      }
    });

    if (data.items) {
      const itemIds = data.items.map((item) => item.itemId);
      const existingItems = await Item.find({ _id: { $in: itemIds } });
      if (existingItems.length.length !== itemIds.length) {
        throw new Error('One or more items not found');
      }

      order.items = data.items.map((item) => {
        const existingItem = existingItems.find(
          (i) => i._id.toString() === item.itemId.toString(),
        );
        return {
          ...item,
          itemName: existingItem ? existingItem.name : item.itemName,
          boxPacking: item.boxPacking || existingItem?.boxPacking || 1,
        };
      });
    }

    await order.save();

    return await this.getOrderById(id);
  }

  async deleteOrder(id) {
    const order = await EOrder.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!order) {
      throw new Error('Order not found');
    }

    if (order.status !== 'pending') {
      throw new Error(`Cannot delete order with status: ${order.status}. Only pending orders can be deleted.`);
    }

    order.isDeleted = true;
    await order.save();

    return { message: 'Order deleted successfully' };
  }

  async syncFromMobile(orders, deviceId) {
    const results = {
      created: 0,
      updated: 0,
      errors: [],
    };

    for (const orderData of orders) {
      try {
        if (orderData._id) {
          const existingOrder = await EOrder.findOne({
            _id: orderData._id,
            'mobileSync.deviceId': deviceId,
          });

          if (existingOrder) {
            await EOrder.findByIdAndUpdate(orderData._id, {
              ...orderData,
              mobileSync: {
                isSynced: true,
                syncedAt: new Date(),
                deviceId,
              },
            });
            results.updated++;
          } else {
            await this.createOrder({ ...orderData, deviceId });
            results.created++;
          }
        } else {
          await this.createOrder({ ...orderData, deviceId });
          results.created++;
        }
      } catch (error) {
        results.errors.push({
          order: orderData.orderNumber || orderData._id,
          error: error.message,
        });
      }
    }

    return results;
  }

  async getPendingOrders(filters = {}) {
    return this.getOrders({ ...filters, status: 'pending' });
  }

  async getOrderSummary(filters = {}) {
    const query = { isDeleted: false };

    if (filters.startDate || filters.endDate) {
      query.orderDate = {};
      if (filters.startDate) {
        query.orderDate.$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        query.orderDate.$lte = new Date(filters.endDate);
      }
    }

    const orders = await EOrder.find(query).lean();

    const summary = {
      totalOrders: orders.length,
      pendingOrders: orders.filter((o) => o.status === 'pending').length,
      approvedOrders: orders.filter((o) => o.status === 'approved').length,
      convertedOrders: orders.filter((o) => o.status === 'converted').length,
      cancelledOrders: orders.filter((o) => o.status === 'cancelled').length,
      totalValue: orders.reduce((sum, o) => sum + (o.grandTotal || 0), 0),
      totalItems: orders.reduce((sum, o) => sum + (o.items?.length || 0), 0),
    };

    return summary;
  }
}

module.exports = new EOrderService();
