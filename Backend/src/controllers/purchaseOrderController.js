const purchaseOrderService = require('../services/purchaseOrderService');

/**
 * Purchase Order Controller
 * Phase 2 - Requirement 10: Purchase Order Integration
 * Task 41.3: Create PurchaseOrder API endpoints
 */
class PurchaseOrderController {
  /**
   * Create a new purchase order
   * @route POST /api/purchase-orders
   */
  async createPurchaseOrder(req, res, next) {
    try {
      const {
        poNumber, supplierId, poDate, items, notes,
      } = req.body;

      if (!poNumber || !supplierId || !items || items.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'PO number, supplier ID, and items are required',
        });
      }

      const purchaseOrder = await purchaseOrderService.createPurchaseOrder({
        poNumber,
        supplierId,
        poDate,
        items,
        notes,
        createdBy: req.user._id,
      });

      res.status(201).json({
        success: true,
        data: purchaseOrder,
        message: 'Purchase order created successfully',
      });
    } catch (error) {
      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          message: 'Purchase order number already exists',
        });
      }
      next(error);
    }
  }

  /**
   * Get all purchase orders with filters
   * @route GET /api/purchase-orders
   */
  async getPurchaseOrders(req, res, next) {
    try {
      const filters = {
        status: req.query.status,
        fulfillmentStatus: req.query.fulfillmentStatus,
        supplierId: req.query.supplierId,
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        page: req.query.page,
        limit: req.query.limit,
        sort: req.query.sort,
      };

      const result = await purchaseOrderService.getPurchaseOrders(filters);

      res.status(200).json({
        success: true,
        data: result.purchaseOrders,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get purchase order by ID
   * @route GET /api/purchase-orders/:id
   */
  async getPurchaseOrderById(req, res, next) {
    try {
      const { id } = req.params;

      const purchaseOrder = await purchaseOrderService.getPurchaseOrderById(id);

      res.status(200).json({
        success: true,
        data: purchaseOrder,
      });
    } catch (error) {
      if (error.message === 'Purchase order not found') {
        return res.status(404).json({
          success: false,
          message: error.message,
        });
      }
      next(error);
    }
  }

  /**
   * Approve a purchase order
   * @route POST /api/purchase-orders/:id/approve
   */
  async approvePurchaseOrder(req, res, next) {
    try {
      const { id } = req.params;

      const purchaseOrder = await purchaseOrderService.approvePurchaseOrder(
        id,
        req.user._id,
      );

      res.status(200).json({
        success: true,
        data: purchaseOrder,
        message: 'Purchase order approved successfully',
      });
    } catch (error) {
      if (
        error.message === 'Purchase order not found'
        || error.message.includes('already approved')
        || error.message.includes('Cannot approve')
      ) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }
      next(error);
    }
  }

  /**
   * Update a purchase order
   * @route PUT /api/purchase-orders/:id
   */
  async updatePurchaseOrder(req, res, next) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const purchaseOrder = await purchaseOrderService.updatePurchaseOrder(id, updateData);

      res.status(200).json({
        success: true,
        data: purchaseOrder,
        message: 'Purchase order updated successfully',
      });
    } catch (error) {
      if (
        error.message === 'Purchase order not found'
        || error.message.includes('Cannot update')
      ) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }
      next(error);
    }
  }

  /**
   * Delete a purchase order (soft delete)
   * @route DELETE /api/purchase-orders/:id
   */
  async deletePurchaseOrder(req, res, next) {
    try {
      const { id } = req.params;

      const result = await purchaseOrderService.deletePurchaseOrder(id);

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      if (
        error.message === 'Purchase order not found'
        || error.message.includes('Cannot delete')
      ) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }
      next(error);
    }
  }

  /**
   * Convert purchase order to invoice
   * Phase 2 - Requirement 10.2, 10.3 - Task 42.2
   * @route POST /api/purchase-orders/:id/convert-to-invoice
   */
  async convertPOToInvoice(req, res, next) {
    try {
      const { id } = req.params;
      const additionalData = req.body;

      const invoice = await purchaseOrderService.convertPOToInvoice(id, additionalData);

      res.status(201).json({
        success: true,
        data: invoice,
        message: 'Purchase order converted to invoice successfully',
      });
    } catch (error) {
      if (
        error.message === 'Purchase order not found'
        || error.message.includes('must be approved')
      ) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }
      next(error);
    }
  }

  /**
   * Send purchase order to supplier
   * Requirement 4.9: Update status to Sent
   * @route PATCH /api/v1/purchase-orders/:id/send
   */
  async sendPurchaseOrder(req, res, next) {
    try {
      const { id } = req.params;

      const purchaseOrder = await purchaseOrderService.sendPurchaseOrder(
        id,
        req.user._id,
      );

      res.status(200).json({
        success: true,
        data: purchaseOrder,
        message: 'Purchase order sent to supplier successfully',
      });
    } catch (error) {
      if (
        error.message === 'Purchase order not found'
        || error.message.includes('Cannot send')
      ) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }
      next(error);
    }
  }

  /**
   * Confirm purchase order by supplier
   * Requirement 4.10: Update status to Confirmed
   * @route PATCH /api/v1/purchase-orders/:id/confirm
   */
  async confirmPurchaseOrder(req, res, next) {
    try {
      const { id } = req.params;

      const purchaseOrder = await purchaseOrderService.confirmPurchaseOrder(
        id,
        req.user._id,
      );

      res.status(200).json({
        success: true,
        data: purchaseOrder,
        message: 'Purchase order confirmed successfully',
      });
    } catch (error) {
      if (
        error.message === 'Purchase order not found'
        || error.message.includes('already confirmed')
        || error.message.includes('Cannot confirm')
      ) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }
      next(error);
    }
  }

  /**
   * Convert purchase order to invoice
   * Requirements 4.11-4.14: Convert PO to invoice with auto-fill
   * @route PATCH /api/v1/purchase-orders/:id/convert
   */
  async convertToInvoice(req, res, next) {
    try {
      const { id } = req.params;
      const additionalData = req.body;

      const invoice = await purchaseOrderService.convertToInvoice(
        id,
        req.user._id,
        additionalData,
      );

      res.status(201).json({
        success: true,
        data: invoice,
        message: 'Purchase order converted to invoice successfully',
      });
    } catch (error) {
      if (
        error.message === 'Purchase order not found'
        || error.message.includes('must be confirmed')
        || error.message.includes('already been converted')
      ) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }
      next(error);
    }
  }

  /**
   * Get outstanding purchase orders
   * Requirement 4.18: Outstanding PO report
   * @route GET /api/v1/purchase-orders/outstanding
   */
  async getOutstandingPOs(req, res, next) {
    try {
      const filters = {
        supplierId: req.query.supplierId,
        startDate: req.query.startDate,
        endDate: req.query.endDate,
      };

      const result = await purchaseOrderService.getOutstandingPOs(filters);

      res.status(200).json({
        success: true,
        data: result.outstandingPOs,
        summary: result.summary,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get PO rate lookup for an item and supplier
   * Phase 2 - Requirement 18.3 - Task 60.2
   * @route GET /api/purchase-orders/rate-lookup
   */
  async getPORate(req, res, next) {
    try {
      const { itemId, supplierId } = req.query;

      if (!itemId) {
        return res.status(400).json({
          success: false,
          message: 'Item ID is required',
        });
      }

      if (!supplierId) {
        return res.status(400).json({
          success: false,
          message: 'Supplier ID is required',
        });
      }

      const rateInfo = await purchaseOrderService.getPORate(itemId, supplierId);

      if (!rateInfo) {
        return res.status(404).json({
          success: false,
          message: 'No purchase order found for this item and supplier combination',
        });
      }

      res.status(200).json({
        success: true,
        data: rateInfo,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new PurchaseOrderController();
