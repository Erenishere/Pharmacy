const express = require('express');

const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const {
  // Configuration management
  createTaxConfig,
  getAllTaxConfigs,
  getTaxConfigById,
  updateTaxConfig,
  deleteTaxConfig,
  activateTaxConfig,
  deactivateTaxConfig,
  setDefaultTaxConfig,
  getTaxStatistics,

  // Tax calculations
  calculateTax,
  calculateMultipleTaxes,
  calculateGST,
  calculateWHT,
  calculateGSTAndWHT,
  calculateItemTax,
  calculateInvoiceTaxes,

  // Tax rates and reports
  getActiveTaxRates,
  getEffectiveTaxRates,
  generateTaxReport,
} = require('../controllers/taxController');

/**
 * @swagger
 * tags:
 *   name: Tax
 *   description: Tax calculation and management for Pakistani tax system (GST, WHT)
 */

// ============================================
// TAX CONFIGURATION ROUTES
// ============================================

/**
 * @swagger
 * /api/tax/config:
 *   post:
 *     summary: Create a new tax configuration
 *     tags: [Tax]
 *     security:
 *       - bearerAuth: []
 */
router.post('/config', authenticate, authorize(['admin']), createTaxConfig);

/**
 * @swagger
 * /api/tax/config:
 *   get:
 *     summary: Get all tax configurations
 *     tags: [Tax]
 *     security:
 *       - bearerAuth: []
 */
router.get('/config', authenticate, getAllTaxConfigs);

/**
 * @swagger
 * /api/tax/config/:id:
 *   get:
 *     summary: Get tax configuration by ID
 *     tags: [Tax]
 *     security:
 *       - bearerAuth: []
 */
router.get('/config/:id', authenticate, getTaxConfigById);

/**
 * @swagger
 * /api/tax/config/:id:
 *   put:
 *     summary: Update tax configuration
 *     tags: [Tax]
 *     security:
 *       - bearerAuth: []
 */
router.put('/config/:id', authenticate, authorize(['admin']), updateTaxConfig);

/**
 * @swagger
 * /api/tax/config/:id:
 *   delete:
 *     summary: Delete tax configuration
 *     tags: [Tax]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/config/:id', authenticate, authorize(['admin']), deleteTaxConfig);

/**
 * @swagger
 * /api/tax/config/:id/activate:
 *   patch:
 *     summary: Activate tax configuration
 *     tags: [Tax]
 *     security:
 *       - bearerAuth: []
 */
router.patch('/config/:id/activate', authenticate, authorize(['admin']), activateTaxConfig);

/**
 * @swagger
 * /api/tax/config/:id/deactivate:
 *   patch:
 *     summary: Deactivate tax configuration
 *     tags: [Tax]
 *     security:
 *       - bearerAuth: []
 */
router.patch('/config/:id/deactivate', authenticate, authorize(['admin']), deactivateTaxConfig);

/**
 * @swagger
 * /api/tax/config/:id/set-default:
 *   patch:
 *     summary: Set tax as default for its type
 *     tags: [Tax]
 *     security:
 *       - bearerAuth: []
 */
router.patch('/config/:id/set-default', authenticate, authorize(['admin']), setDefaultTaxConfig);

/**
 * @swagger
 * /api/tax/statistics:
 *   get:
 *     summary: Get tax statistics
 *     tags: [Tax]
 *     security:
 *       - bearerAuth: []
 */
router.get('/statistics', authenticate, getTaxStatistics);

// ============================================
// TAX CALCULATION ROUTES
// ============================================

/**
 * @swagger
 * /api/tax/calculate:
 *   post:
 *     summary: Calculate tax for a single amount
 *     tags: [Tax]
 *     security:
 *       - bearerAuth: []
 */
router.post('/calculate', authenticate, calculateTax);

/**
 * @swagger
 * /api/tax/calculate-multiple:
 *   post:
 *     summary: Calculate multiple taxes for an amount
 *     tags: [Tax]
 *     security:
 *       - bearerAuth: []
 */
router.post('/calculate-multiple', authenticate, calculateMultipleTaxes);

/**
 * @swagger
 * /api/tax/calculate-gst:
 *   post:
 *     summary: Calculate GST (Goods and Services Tax)
 *     tags: [Tax]
 *     security:
 *       - bearerAuth: []
 */
router.post('/calculate-gst', authenticate, calculateGST);

/**
 * @swagger
 * /api/tax/calculate-wht:
 *   post:
 *     summary: Calculate WHT (Withholding Tax)
 *     tags: [Tax]
 *     security:
 *       - bearerAuth: []
 */
router.post('/calculate-wht', authenticate, calculateWHT);

/**
 * @swagger
 * /api/tax/calculate-gst-wht:
 *   post:
 *     summary: Calculate combined GST and WHT
 *     tags: [Tax]
 *     security:
 *       - bearerAuth: []
 */
router.post('/calculate-gst-wht', authenticate, calculateGSTAndWHT);

/**
 * @swagger
 * /api/tax/calculate-item:
 *   post:
 *     summary: Calculate tax for an invoice line item
 *     tags: [Tax]
 *     security:
 *       - bearerAuth: []
 */
router.post('/calculate-item', authenticate, calculateItemTax);

/**
 * @swagger
 * /api/tax/calculate-invoice:
 *   post:
 *     summary: Calculate taxes for multiple invoice items
 *     tags: [Tax]
 *     security:
 *       - bearerAuth: []
 */
router.post('/calculate-invoice', authenticate, calculateInvoiceTaxes);

// ============================================
// TAX RATES AND REPORTS ROUTES
// ============================================

/**
 * @swagger
 * /api/tax/rates:
 *   get:
 *     summary: Get all active tax rates
 *     tags: [Tax]
 *     security:
 *       - bearerAuth: []
 */
router.get('/rates', authenticate, getActiveTaxRates);

/**
 * @swagger
 * /api/tax/rates/effective:
 *   get:
 *     summary: Get effective tax rates for a specific date
 *     tags: [Tax]
 *     security:
 *       - bearerAuth: []
 */
router.get('/rates/effective', authenticate, getEffectiveTaxRates);

/**
 * @swagger
 * /api/tax/report:
 *   post:
 *     summary: Generate tax report (SRB/FBR compliant)
 *     tags: [Tax]
 *     security:
 *       - bearerAuth: []
 */
router.post('/report', authenticate, authorize(['admin', 'accountant']), generateTaxReport);

module.exports = router;
