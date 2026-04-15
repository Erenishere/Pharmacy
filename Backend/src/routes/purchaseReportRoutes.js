const express = require('express');
const { authenticate, requireRoles } = require('../middleware/auth');
const purchaseReportController = require('../controllers/purchaseReportController');
const purchaseOrderController = require('../controllers/purchaseOrderController');
const purchaseOrderService = require('../services/purchaseOrderService');

const router = express.Router();

/**
 * @route   GET /api/purchase-reports/summary
 * @desc    Get purchase summary report
 * @access  Private (Admin, Purchase, Accountant)
 */
router.get(
  '/summary',
  authenticate,
  requireRoles(['admin', 'purchase', 'accountant']),
  purchaseReportController.getPurchaseSummary,
);

/**
 * @route   GET /api/purchase-reports/by-supplier
 * @desc    Get purchase by supplier report
 * @access  Private (Admin, Purchase, Accountant)
 */
router.get(
  '/by-supplier',
  authenticate,
  requireRoles(['admin', 'purchase', 'accountant']),
  purchaseReportController.getPurchaseBySupplier,
);

/**
 * @route   GET /api/purchase-reports/by-item
 * @desc    Get purchase by item report
 * @access  Private (Admin, Purchase, Accountant)
 */
router.get(
  '/by-item',
  authenticate,
  requireRoles(['admin', 'purchase', 'accountant']),
  purchaseReportController.getPurchaseByItem,
);

/**
 * @route   GET /api/purchase-reports/analysis
 * @desc    Get purchase analysis report
 * @access  Private (Admin, Purchase, Accountant, Manager)
 */
router.get(
  '/analysis',
  authenticate,
  requireRoles(['admin', 'purchase', 'accountant', 'manager']),
  purchaseReportController.getPurchaseAnalysis,
);

/**
 * @route   GET /api/purchase-reports/gst-input-summary
 * @desc    Get GST input summary report
 * @access  Private (Admin, Accountant)
 */
router.get(
  '/gst-input-summary',
  authenticate,
  requireRoles(['admin', 'accountant']),
  purchaseReportController.getGSTInputSummary,
);

/**
 * @route   GET /api/purchase-reports/supplier-aging
 * @desc    Get supplier aging report
 * @access  Private (Admin, Accountant)
 */
router.get(
  '/supplier-aging',
  authenticate,
  requireRoles(['admin', 'accountant']),
  purchaseReportController.getSupplierAgingReport,
);

/**
 * @route   GET /api/purchase-reports/payment-due
 * @desc    Get payment due report
 * @access  Private (Admin, Accountant)
 */
router.get(
  '/payment-due',
  authenticate,
  requireRoles(['admin', 'accountant']),
  purchaseReportController.getPaymentDueReport,
);

/**
 * @route   GET /api/purchase-reports/vs-sales
 * @desc    Get purchase vs sales comparison
 * @access  Private (Admin, Manager)
 */
router.get(
  '/vs-sales',
  authenticate,
  requireRoles(['admin', 'manager']),
  purchaseReportController.getPurchaseVsSalesComparison,
);

/**
 * @route   GET /api/purchase-reports/outstanding-pos
 * @desc    Get outstanding purchase orders
 * @access  Private (Admin, Purchase)
 */
router.get(
  '/outstanding-pos',
  authenticate,
  requireRoles(['admin', 'purchase']),
  purchaseReportController.getOutstandingPOs,
);

/**
 * @route   POST /api/purchase-reports/export
 * @desc    Export purchase report to CSV, Excel, or PDF
 * @access  Private (Admin, Purchase, Accountant, Manager)
 */
router.post(
  '/export',
  authenticate,
  requireRoles(['admin', 'purchase', 'accountant', 'manager']),
  purchaseReportController.exportReport,
);

/**
 * @route   PATCH /api/purchase-orders/:id/send
 * @desc    Send purchase order to supplier
 * @access  Private (Admin, Purchase)
 */
router.patch(
  '/:id/send',
  authenticate,
  requireRoles(['admin', 'purchase']),
  async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user._id;

      const purchaseOrder = await purchaseOrderService.sendPurchaseOrder(id, userId);

      res.status(200).json({
        success: true,
        data: purchaseOrder,
        message: 'Purchase order sent successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Send purchase order error:', error);

      if (error.message === 'Purchase order not found') {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: error.message,
          },
          timestamp: new Date().toISOString(),
        });
      }

      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
      });
    }
  },
);

/**
 * @route   PATCH /api/purchase-orders/:id/confirm
 * @desc    Confirm purchase order by supplier
 * @access  Private (Admin, Purchase)
 */
router.patch(
  '/:id/confirm',
  authenticate,
  requireRoles(['admin', 'purchase']),
  async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user._id;

      const purchaseOrder = await purchaseOrderService.confirmPurchaseOrder(id, userId);

      res.status(200).json({
        success: true,
        data: purchaseOrder,
        message: 'Purchase order confirmed successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Confirm purchase order error:', error);

      if (error.message === 'Purchase order not found') {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: error.message,
          },
          timestamp: new Date().toISOString(),
        });
      }

      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
      });
    }
  },
);

/**
 * @route   PATCH /api/purchase-orders/:id/receive
 * @desc    Mark purchase order as received
 * @access  Private (Admin, Purchase, Store Keeper)
 */
router.patch(
  '/:id/receive',
  authenticate,
  requireRoles(['admin', 'purchase', 'store_keeper']),
  async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user._id;

      const purchaseOrder = await purchaseOrderService.receivePurchaseOrder(id, userId);

      res.status(200).json({
        success: true,
        data: purchaseOrder,
        message: 'Purchase order received successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Receive purchase order error:', error);

      if (error.message === 'Purchase order not found') {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: error.message,
          },
          timestamp: new Date().toISOString(),
        });
      }

      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
      });
    }
  },
);

/**
 * @route   PATCH /api/purchase-orders/:id/cancel
 * @desc    Cancel purchase order
 * @access  Private (Admin)
 */
router.patch(
  '/:id/cancel',
  authenticate,
  requireRoles(['admin']),
  async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user._id;
      const { reason } = req.body;

      const purchaseOrder = await purchaseOrderService.cancelPurchaseOrder(id, userId, reason);

      res.status(200).json({
        success: true,
        data: purchaseOrder,
        message: 'Purchase order cancelled successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Cancel purchase order error:', error);

      if (error.message === 'Purchase order not found') {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: error.message,
          },
          timestamp: new Date().toISOString(),
        });
      }

      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
      });
    }
  },
);

module.exports = router;
