const taxService = require('../services/taxService');
const Invoice = require('../models/Invoice');

// Helper function to send success response
const successResponse = (res, data, message = 'Success', statusCode = 200) => res.status(statusCode).json({
  success: true,
  message,
  data,
  timestamp: new Date().toISOString(),
});

// Helper function to send error response
const errorResponse = (res, message, statusCode = 400, errorCode = 'TAX_ERROR') => res.status(statusCode).json({
  success: false,
  error: {
    code: errorCode,
    message,
  },
  timestamp: new Date().toISOString(),
});

// ============================================
// TAX CONFIGURATION MANAGEMENT ENDPOINTS
// ============================================

/**
 * Create a new tax configuration
 * @route POST /api/tax/config
 */
const createTaxConfig = async (req, res) => {
  try {
    const taxData = {
      ...req.body,
      createdBy: req.user._id,
    };

    // Validate tax configuration
    const validation = taxService.validateTaxConfig(taxData);
    if (!validation.isValid) {
      return errorResponse(res, validation.errors.join(', '), 400, 'VALIDATION_ERROR');
    }

    const taxConfig = await taxService.createTaxConfig(taxData);
    return successResponse(res, taxConfig, 'Tax configuration created successfully', 201);
  } catch (error) {
    console.error('Create tax config error:', error);
    return errorResponse(res, error.message, 400, 'TAX_CONFIG_CREATE_ERROR');
  }
};

/**
 * Get all tax configurations
 * @route GET /api/tax/config
 */
const getAllTaxConfigs = async (req, res) => {
  try {
    const {
      type, isActive, category, applicableOn,
    } = req.query;

    const filters = {};
    if (type) filters.type = type;
    if (isActive !== undefined) filters.isActive = isActive === 'true';
    if (category) filters.category = category;
    if (applicableOn) filters.applicableOn = applicableOn;

    const taxConfigs = await taxService.getAllTaxConfigs(filters);
    return successResponse(res, taxConfigs, 'Tax configurations retrieved successfully');
  } catch (error) {
    console.error('Get tax configs error:', error);
    return errorResponse(res, error.message, 500, 'TAX_CONFIG_FETCH_ERROR');
  }
};

/**
 * Get tax configuration by ID
 * @route GET /api/tax/config/:id
 */
const getTaxConfigById = async (req, res) => {
  try {
    const { id } = req.params;
    const taxConfig = await taxService.getTaxConfigById(id);
    return successResponse(res, taxConfig, 'Tax configuration retrieved successfully');
  } catch (error) {
    console.error('Get tax config error:', error);
    return errorResponse(res, error.message, 404, 'TAX_CONFIG_NOT_FOUND');
  }
};

/**
 * Update tax configuration
 * @route PUT /api/tax/config/:id
 */
const updateTaxConfig = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = {
      ...req.body,
      updatedBy: req.user._id,
    };

    // Validate if provided
    if (Object.keys(updateData).length > 1) { // More than just updatedBy
      const validation = taxService.validateTaxConfig({
        ...updateData, name: updateData.name || 'temp', code: updateData.code || 'TEMP', type: updateData.type || 'GST', rate: updateData.rate !== undefined ? updateData.rate : 0,
      });
      if (!validation.isValid && updateData.rate !== undefined) {
        return errorResponse(res, validation.errors.join(', '), 400, 'VALIDATION_ERROR');
      }
    }

    const taxConfig = await taxService.updateTaxConfig(id, updateData);
    return successResponse(res, taxConfig, 'Tax configuration updated successfully');
  } catch (error) {
    console.error('Update tax config error:', error);
    return errorResponse(res, error.message, 400, 'TAX_CONFIG_UPDATE_ERROR');
  }
};

/**
 * Delete tax configuration
 * @route DELETE /api/tax/config/:id
 */
const deleteTaxConfig = async (req, res) => {
  try {
    const { id } = req.params;
    const taxConfig = await taxService.deleteTaxConfig(id);
    return successResponse(res, taxConfig, 'Tax configuration deleted successfully');
  } catch (error) {
    console.error('Delete tax config error:', error);
    return errorResponse(res, error.message, 404, 'TAX_CONFIG_DELETE_ERROR');
  }
};

/**
 * Activate tax configuration
 * @route PATCH /api/tax/config/:id/activate
 */
const activateTaxConfig = async (req, res) => {
  try {
    const { id } = req.params;
    const taxConfig = await taxService.activateTaxConfig(id);
    return successResponse(res, taxConfig, 'Tax configuration activated successfully');
  } catch (error) {
    console.error('Activate tax config error:', error);
    return errorResponse(res, error.message, 400, 'TAX_CONFIG_ACTIVATE_ERROR');
  }
};

/**
 * Deactivate tax configuration
 * @route PATCH /api/tax/config/:id/deactivate
 */
const deactivateTaxConfig = async (req, res) => {
  try {
    const { id } = req.params;
    const taxConfig = await taxService.deactivateTaxConfig(id);
    return successResponse(res, taxConfig, 'Tax configuration deactivated successfully');
  } catch (error) {
    console.error('Deactivate tax config error:', error);
    return errorResponse(res, error.message, 400, 'TAX_CONFIG_DEACTIVATE_ERROR');
  }
};

/**
 * Set tax as default
 * @route PATCH /api/tax/config/:id/set-default
 */
const setDefaultTaxConfig = async (req, res) => {
  try {
    const { id } = req.params;
    const taxConfig = await taxService.setDefaultTax(id);
    return successResponse(res, taxConfig, 'Tax set as default successfully');
  } catch (error) {
    console.error('Set default tax error:', error);
    return errorResponse(res, error.message, 400, 'TAX_CONFIG_DEFAULT_ERROR');
  }
};

/**
 * Get tax statistics
 * @route GET /api/tax/statistics
 */
const getTaxStatistics = async (req, res) => {
  try {
    const statistics = await taxService.getTaxStatistics();
    return successResponse(res, statistics, 'Tax statistics retrieved successfully');
  } catch (error) {
    console.error('Get tax statistics error:', error);
    return errorResponse(res, error.message, 500, 'TAX_STATISTICS_ERROR');
  }
};

// ============================================
// TAX CALCULATION ENDPOINTS
// ============================================

/**
 * Calculate tax for a single item
 * @route POST /api/tax/calculate
 */
const calculateTax = async (req, res) => {
  try {
    const {
      amount, taxCode, isInclusive = false, quantity = 1,
    } = req.body;

    if (amount === undefined || !taxCode) {
      return errorResponse(res, 'Amount and taxCode are required', 400, 'VALIDATION_ERROR');
    }

    const result = await taxService.calculateTax(amount, taxCode, { isInclusive, quantity });
    return successResponse(res, result, 'Tax calculated successfully');
  } catch (error) {
    console.error('Tax calculation error:', error);
    return errorResponse(res, error.message, 400, 'TAX_CALCULATION_ERROR');
  }
};

/**
 * Calculate multiple taxes for an item
 * @route POST /api/tax/calculate-multiple
 */
const calculateMultipleTaxes = async (req, res) => {
  try {
    const {
      amount, taxCodes, isInclusive = false, quantity = 1,
    } = req.body;

    if (amount === undefined || !Array.isArray(taxCodes) || taxCodes.length === 0) {
      return errorResponse(
        res,
        'Amount and at least one tax code are required',
        400,
        'VALIDATION_ERROR',
      );
    }

    const result = await taxService.calculateMultipleTaxes(amount, taxCodes, { isInclusive, quantity });
    return successResponse(res, result, 'Multiple taxes calculated successfully');
  } catch (error) {
    console.error('Multiple tax calculation error:', error);
    return errorResponse(res, error.message, 400, 'TAX_CALCULATION_ERROR');
  }
};

/**
 * Calculate GST (Goods and Services Tax)
 * @route POST /api/tax/calculate-gst
 */
const calculateGST = async (req, res) => {
  try {
    const {
      amount, gstCode = 'GST18', isInclusive = false, quantity = 1,
    } = req.body;

    if (amount === undefined) {
      return errorResponse(res, 'Amount is required', 400, 'VALIDATION_ERROR');
    }

    const result = await taxService.calculateGST(amount, gstCode, { isInclusive, quantity });

    return successResponse(res, result, 'GST calculated successfully');
  } catch (error) {
    console.error('GST calculation error:', error);
    return errorResponse(res, error.message, 400, 'GST_CALCULATION_ERROR');
  }
};

/**
 * Calculate WHT (Withholding Tax)
 * @route POST /api/tax/calculate-wht
 */
const calculateWHT = async (req, res) => {
  try {
    const {
      amount, whtCode = 'WHT', isInclusive = false, quantity = 1,
    } = req.body;

    if (amount === undefined) {
      return errorResponse(res, 'Amount is required', 400, 'VALIDATION_ERROR');
    }

    const result = await taxService.calculateWHT(amount, whtCode, { isInclusive, quantity });

    return successResponse(res, result, 'WHT calculated successfully');
  } catch (error) {
    console.error('WHT calculation error:', error);
    return errorResponse(res, error.message, 400, 'WHT_CALCULATION_ERROR');
  }
};

/**
 * Calculate combined GST and WHT
 * @route POST /api/tax/calculate-gst-wht
 */
const calculateGSTAndWHT = async (req, res) => {
  try {
    const {
      amount, gstCode = 'GST18', whtCode = 'WHT', isInclusive = false, quantity = 1,
    } = req.body;

    if (amount === undefined) {
      return errorResponse(res, 'Amount is required', 400, 'VALIDATION_ERROR');
    }

    const result = await taxService.calculateGSTAndWHT(amount, gstCode, whtCode, { isInclusive, quantity });

    return successResponse(res, result, 'GST and WHT calculated successfully');
  } catch (error) {
    console.error('GST and WHT calculation error:', error);
    return errorResponse(res, error.message, 400, 'GST_WHT_CALCULATION_ERROR');
  }
};

/**
 * Calculate tax for an invoice line item
 * @route POST /api/tax/calculate-item
 */
const calculateItemTax = async (req, res) => {
  try {
    const item = req.body;

    if (item.unitPrice === undefined || !item.taxCodes) {
      return errorResponse(
        res,
        'unitPrice and taxCodes are required in the request body',
        400,
        'VALIDATION_ERROR',
      );
    }

    const result = await taxService.calculateItemTax(item);
    return successResponse(res, result, 'Item tax calculated successfully');
  } catch (error) {
    console.error('Item tax calculation error:', error);
    return errorResponse(res, error.message, 400, 'ITEM_TAX_CALCULATION_ERROR');
  }
};

/**
 * Calculate taxes for multiple invoice items
 * @route POST /api/tax/calculate-invoice
 */
const calculateInvoiceTaxes = async (req, res) => {
  try {
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return errorResponse(
        res,
        'An array of items is required in the request body',
        400,
        'VALIDATION_ERROR',
      );
    }

    const result = await taxService.calculateInvoiceTaxes(items);
    return successResponse(res, result, 'Invoice taxes calculated successfully');
  } catch (error) {
    console.error('Invoice tax calculation error:', error);
    return errorResponse(res, error.message, 400, 'INVOICE_TAX_CALCULATION_ERROR');
  }
};

/**
 * Get all active tax rates
 * @route GET /api/tax/rates
 */
const getActiveTaxRates = async (req, res) => {
  try {
    const { type } = req.query;
    const taxRates = await taxService.getAllActiveTaxes(type || null);
    return successResponse(res, taxRates, 'Active tax rates retrieved successfully');
  } catch (error) {
    console.error('Get tax rates error:', error);
    return errorResponse(res, 'Failed to retrieve tax rates', 500, 'TAX_RATES_ERROR');
  }
};

/**
 * Get effective tax rates for a specific date
 * @route GET /api/tax/rates/effective
 */
const getEffectiveTaxRates = async (req, res) => {
  try {
    const { date, type } = req.query;
    const effectiveDate = date ? new Date(date) : new Date();
    const taxRates = await taxService.getEffectiveTaxes(effectiveDate, type || null);
    return successResponse(res, taxRates, 'Effective tax rates retrieved successfully');
  } catch (error) {
    console.error('Get effective tax rates error:', error);
    return errorResponse(res, 'Failed to retrieve effective tax rates', 500, 'TAX_RATES_ERROR');
  }
};

/**
 * Generate tax report
 * @route POST /api/tax/report
 */
const generateTaxReport = async (req, res) => {
  try {
    const {
      startDate, endDate, taxType, format = 'json',
    } = req.body;

    if (!startDate || !endDate) {
      return errorResponse(res, 'Start date and end date are required', 400, 'VALIDATION_ERROR');
    }

    if (format !== 'json') {
      return errorResponse(res, 'Tax report currently supports json format only', 501, 'TAX_REPORT_FORMAT_UNSUPPORTED');
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return errorResponse(res, 'Start date and end date must be valid dates', 400, 'VALIDATION_ERROR');
    }
    end.setHours(23, 59, 59, 999);

    const match = {
      invoiceDate: { $gte: start, $lte: end },
      status: { $ne: 'cancelled' },
    };

    const [summary = {}] = await Invoice.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          transactionCount: { $sum: 1 },
          totalTaxCollected: { $sum: { $ifNull: ['$totals.totalTax', 0] } },
          totalGST: {
            $sum: {
              $add: [
                { $ifNull: ['$totals.gst18Total', 0] },
                { $ifNull: ['$totals.gst4Total', 0] },
              ],
            },
          },
          gst18Total: { $sum: { $ifNull: ['$totals.gst18Total', 0] } },
          gst4Total: { $sum: { $ifNull: ['$totals.gst4Total', 0] } },
          advanceTaxTotal: { $sum: { $ifNull: ['$totals.advanceTaxTotal', 0] } },
          nonFilerGSTTotal: { $sum: { $ifNull: ['$totals.nonFilerGSTTotal', 0] } },
          incomeTaxTotal: { $sum: { $ifNull: ['$totals.incomeTaxTotal', 0] } },
          taxableSales: { $sum: { $ifNull: ['$totals.subtotal', 0] } },
          grandTotal: { $sum: { $ifNull: ['$totals.grandTotal', 0] } },
        },
      },
      { $project: { _id: 0 } },
    ]);

    const invoiceBreakdown = await Invoice.find(match)
      .select('invoiceNumber type invoiceDate customerId supplierId totals')
      .populate('customerId', 'code name')
      .populate('supplierId', 'code name')
      .sort({ invoiceDate: 1, invoiceNumber: 1 })
      .lean();

    const normalizedTaxType = (taxType || 'ALL').toUpperCase();
    const totals = {
      totalTaxCollected: summary.totalTaxCollected || 0,
      totalGST: summary.totalGST || 0,
      gst18Total: summary.gst18Total || 0,
      gst4Total: summary.gst4Total || 0,
      advanceTaxTotal: summary.advanceTaxTotal || 0,
      nonFilerGSTTotal: summary.nonFilerGSTTotal || 0,
      incomeTaxTotal: summary.incomeTaxTotal || 0,
      transactionCount: summary.transactionCount || 0,
      taxableSales: summary.taxableSales || 0,
      grandTotal: summary.grandTotal || 0,
    };

    const taxBreakdown = [
      { type: 'GST18', label: 'GST 18%', amount: totals.gst18Total },
      { type: 'GST4', label: 'GST 4%', amount: totals.gst4Total },
      { type: 'ADVANCE_TAX', label: 'Advance Tax', amount: totals.advanceTaxTotal },
      { type: 'NON_FILER_GST', label: 'Non-Filer GST', amount: totals.nonFilerGSTTotal },
      { type: 'INCOME_TAX', label: 'Income Tax', amount: totals.incomeTaxTotal },
    ];

    const report = {
      period: {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      },
      taxType: normalizedTaxType,
      summary: totals,
      taxBreakdown: normalizedTaxType === 'ALL'
        ? taxBreakdown
        : taxBreakdown.filter((tax) => tax.type === normalizedTaxType || tax.type.includes(normalizedTaxType)),
      invoices: invoiceBreakdown.map((invoice) => ({
        id: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        type: invoice.type,
        invoiceDate: invoice.invoiceDate,
        party: invoice.customerId || invoice.supplierId || null,
        subtotal: invoice.totals?.subtotal || 0,
        totalTax: invoice.totals?.totalTax || 0,
        gst18Total: invoice.totals?.gst18Total || 0,
        gst4Total: invoice.totals?.gst4Total || 0,
        advanceTaxTotal: invoice.totals?.advanceTaxTotal || 0,
        nonFilerGSTTotal: invoice.totals?.nonFilerGSTTotal || 0,
        incomeTaxTotal: invoice.totals?.incomeTaxTotal || 0,
        grandTotal: invoice.totals?.grandTotal || 0,
      })),
      format,
      generatedAt: new Date().toISOString(),
    };

    return successResponse(res, report, 'Tax report generated successfully');
  } catch (error) {
    console.error('Generate tax report error:', error);
    return errorResponse(res, error.message, 500, 'TAX_REPORT_ERROR');
  }
};

module.exports = {
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
};
