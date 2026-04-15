const taxConfigRepository = require('../repositories/taxConfigRepository');

/**
 * Tax Service
 * Handles all tax-related calculations and validations for Pakistani tax system
 * Supports GST (Goods and Services Tax) and WHT (Withholding Tax)
 */
class TaxService {
  constructor() {
    // Cache for tax configurations
    this.taxCache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
    this.lastCacheUpdate = null;
  }

  /**
   * Get tax configuration from database or cache
   */
  async getTaxConfig(code) {
    // Check cache first
    if (this.taxCache.has(code) && this._isCacheValid()) {
      return this.taxCache.get(code);
    }

    // Fetch from database
    const taxConfig = await taxConfigRepository.findByCode(code);

    if (taxConfig && taxConfig.isActive) {
      this.taxCache.set(code, taxConfig);
      return taxConfig;
    }

    return null;
  }

  /**
   * Get all active tax configurations
   */
  async getAllActiveTaxes(type = null) {
    return await taxConfigRepository.findActive(type);
  }

  /**
   * Get effective taxes for a specific date
   */
  async getEffectiveTaxes(date = new Date(), type = null) {
    return await taxConfigRepository.findEffective(date, type);
  }

  /**
   * Check if cache is still valid
   */
  _isCacheValid() {
    if (!this.lastCacheUpdate) {
      return false;
    }
    return Date.now() - this.lastCacheUpdate < this.cacheExpiry;
  }

  /**
   * Clear tax cache
   */
  clearCache() {
    this.taxCache.clear();
    this.lastCacheUpdate = null;
  }

  /**
   * Refresh tax cache
   */
  async refreshCache() {
    this.clearCache();
    const activeTaxes = await taxConfigRepository.findActive();
    activeTaxes.forEach((tax) => {
      this.taxCache.set(tax.code, tax);
    });
    this.lastCacheUpdate = Date.now();
  }

  /**
   * Calculate tax for a single item using tax configuration
   * @param {number} taxableAmount - The amount to calculate tax on
   * @param {string} taxCode - Tax configuration code (e.g., 'GST18', 'WHT')
   * @param {Object} [options] - Additional options
   * @param {boolean} [options.isInclusive] - Whether tax is included in the amount
   * @param {number} [options.quantity=1] - Quantity of items
   * @returns {Promise<Object>} Tax calculation result
   */
  async calculateTax(taxableAmount, taxCode, options = {}) {
    const { isInclusive = false, quantity = 1 } = options;

    // Validate inputs
    if (typeof taxableAmount !== 'number' || isNaN(taxableAmount) || taxableAmount < 0) {
      throw new Error('Invalid taxable amount');
    }

    // Get tax configuration
    const taxConfig = await this.getTaxConfig(taxCode);
    if (!taxConfig) {
      throw new Error(`Tax configuration not found: ${taxCode}`);
    }

    let taxAmount; let netAmount; let
      grossAmount;

    if (isInclusive) {
      // Tax is included in the price
      taxAmount = (taxableAmount * taxConfig.rate) / (1 + taxConfig.rate);
      netAmount = taxableAmount - taxAmount;
      grossAmount = taxableAmount;
    } else {
      // Tax is added to the price
      taxAmount = taxableAmount * taxConfig.rate;
      netAmount = taxableAmount;
      grossAmount = netAmount + taxAmount;
    }

    // Apply quantity
    const totalNetAmount = netAmount * quantity;
    const totalTaxAmount = taxAmount * quantity;
    const totalGrossAmount = grossAmount * quantity;

    return {
      taxCode: taxConfig.code,
      taxName: taxConfig.name,
      taxType: taxConfig.type,
      taxRate: taxConfig.rate,
      description: taxConfig.description,
      isInclusive,
      quantity,
      taxableAmount: netAmount,
      taxAmount,
      grossAmount,
      totalTaxableAmount: totalNetAmount,
      totalTaxAmount,
      totalGrossAmount,
      breakdown: [
        {
          taxCode: taxConfig.code,
          taxName: taxConfig.name,
          taxType: taxConfig.type,
          rate: taxConfig.rate,
          amount: taxAmount,
          totalAmount: totalTaxAmount,
          description: taxConfig.description,
        },
      ],
    };
  }

  /**
   * Calculate multiple taxes for an item
   * @param {number} amount - The base amount
   * @param {Array<string>} taxCodes - Array of tax configuration codes
   * @param {Object} [options] - Additional options
   * @param {boolean} [options.isInclusive] - Whether taxes are included in the amount
   * @param {number} [options.quantity=1] - Quantity of items
   * @returns {Promise<Object>} Tax calculation result
   */
  async calculateMultipleTaxes(amount, taxCodes, options = {}) {
    const { isInclusive = false, quantity = 1 } = options;

    if (!Array.isArray(taxCodes) || taxCodes.length === 0) {
      throw new Error('At least one tax code must be specified');
    }

    // Fetch all tax configurations
    const taxConfigs = await Promise.all(
      taxCodes.map((code) => this.getTaxConfig(code)),
    );

    // Validate all tax configs exist
    taxConfigs.forEach((config, index) => {
      if (!config) {
        throw new Error(`Tax configuration not found: ${taxCodes[index]}`);
      }
    });

    // For inclusive taxes, we need to calculate the net amount first
    let netAmount = amount;
    let currentAmount = amount;
    const breakdown = [];
    let totalTaxAmount = 0;

    if (isInclusive) {
      // Calculate the total effective tax rate first
      let totalRate = 0;
      taxConfigs.forEach((config) => {
        totalRate += config.rate;
      });

      // Calculate net amount before taxes
      netAmount = amount / (1 + totalRate);
      currentAmount = netAmount;
    }

    // Calculate each tax
    taxConfigs.forEach((config) => {
      const taxAmount = currentAmount * config.rate;
      totalTaxAmount += taxAmount;

      breakdown.push({
        taxCode: config.code,
        taxName: config.name,
        taxType: config.type,
        rate: config.rate,
        amount: taxAmount,
        totalAmount: taxAmount * quantity,
        description: config.description,
      });

      // For compound taxes, add to current amount for next calculation
      if (config.metadata && config.metadata.compoundTax) {
        currentAmount += taxAmount;
      }
    });

    const grossAmount = netAmount + totalTaxAmount;

    return {
      taxCodes,
      isInclusive,
      quantity,
      taxableAmount: netAmount,
      taxAmount: totalTaxAmount,
      grossAmount,
      totalTaxableAmount: netAmount * quantity,
      totalTaxAmount: totalTaxAmount * quantity,
      totalGrossAmount: grossAmount * quantity,
      breakdown,
    };
  }

  /**
   * Calculate GST (Goods and Services Tax) for Pakistan
   * @param {number} amount - The base amount
   * @param {string} gstRate - GST rate code (e.g., 'GST18', 'GST17')
   * @param {Object} [options] - Additional options
   * @param {boolean} [options.isInclusive] - Whether tax is included in the amount
   * @param {number} [options.quantity=1] - Quantity of items
   * @returns {Promise<Object>} GST calculation result
   */
  async calculateGST(amount, gstRate = 'GST18', options = {}) {
    return await this.calculateTax(amount, gstRate, options);
  }

  /**
   * Calculate WHT (Withholding Tax) for Pakistan
   * @param {number} amount - The base amount
   * @param {string} whtRate - WHT rate code (e.g., 'WHT', 'WHT_SERVICES')
   * @param {Object} [options] - Additional options
   * @param {boolean} [options.isInclusive] - Whether tax is included in the amount
   * @param {number} [options.quantity=1] - Quantity of items
   * @returns {Promise<Object>} WHT calculation result
   */
  async calculateWHT(amount, whtRate = 'WHT', options = {}) {
    return await this.calculateTax(amount, whtRate, options);
  }

  /**
   * Calculate combined GST and WHT for Pakistan
   * @param {number} amount - The base amount
   * @param {string} gstCode - GST rate code
   * @param {string} whtCode - WHT rate code
   * @param {Object} [options] - Additional options
   * @param {boolean} [options.isInclusive] - Whether taxes are included in the amount
   * @param {number} [options.quantity=1] - Quantity of items
   * @returns {Promise<Object>} Combined tax calculation result
   */
  async calculateGSTAndWHT(amount, gstCode, whtCode, options = {}) {
    const { isInclusive = false, quantity = 1 } = options;

    // Get both tax configurations
    const gstConfig = await this.getTaxConfig(gstCode);
    const whtConfig = await this.getTaxConfig(whtCode);

    if (!gstConfig) {
      throw new Error(`GST configuration not found: ${gstCode}`);
    }
    if (!whtConfig) {
      throw new Error(`WHT configuration not found: ${whtCode}`);
    }

    let netAmount = amount;
    let gstAmount = 0;
    let whtAmount = 0;

    if (isInclusive) {
      // Calculate net amount when taxes are inclusive
      const totalRate = gstConfig.rate + whtConfig.rate;
      netAmount = amount / (1 + totalRate);
    }

    // Calculate GST on net amount
    gstAmount = netAmount * gstConfig.rate;

    // Calculate WHT on net amount
    whtAmount = netAmount * whtConfig.rate;

    const totalTaxAmount = gstAmount + whtAmount;
    const grossAmount = netAmount + totalTaxAmount;

    return {
      taxCodes: [gstCode, whtCode],
      isInclusive,
      quantity,
      taxableAmount: netAmount,
      taxAmount: totalTaxAmount,
      grossAmount,
      totalTaxableAmount: netAmount * quantity,
      totalTaxAmount: totalTaxAmount * quantity,
      totalGrossAmount: grossAmount * quantity,
      breakdown: [
        {
          taxCode: gstConfig.code,
          taxName: gstConfig.name,
          taxType: gstConfig.type,
          rate: gstConfig.rate,
          amount: gstAmount,
          totalAmount: gstAmount * quantity,
          description: gstConfig.description,
        },
        {
          taxCode: whtConfig.code,
          taxName: whtConfig.name,
          taxType: whtConfig.type,
          rate: whtConfig.rate,
          amount: whtAmount,
          totalAmount: whtAmount * quantity,
          description: whtConfig.description,
        },
      ],
    };
  }

  /**
   * Calculate tax for an invoice line item
   * @param {Object} item - Invoice line item
   * @param {number} item.unitPrice - Price per unit
   * @param {number} item.quantity - Quantity
   * @param {string|Array<string>} item.taxCodes - Tax code(s) to apply
   * @param {boolean} [item.taxInclusive] - Whether price includes tax
   * @param {number} [item.discount] - Discount percentage (0-100)
   * @returns {Promise<Object>} Tax calculation result with line total
   */
  async calculateItemTax(item) {
    const {
      unitPrice,
      quantity = 1,
      taxCodes,
      taxInclusive = false,
      discount = 0,
    } = item;

    // Validate inputs
    if (!unitPrice || unitPrice < 0) {
      throw new Error('Valid unit price is required');
    }
    if (!quantity || quantity <= 0) {
      throw new Error('Valid quantity is required');
    }
    if (!taxCodes) {
      throw new Error('Tax code(s) required');
    }

    // Calculate subtotal
    const subtotal = unitPrice * quantity;

    // Apply discount
    const discountAmount = (subtotal * discount) / 100;
    const taxableAmount = subtotal - discountAmount;

    // Calculate taxes
    let taxResult;
    if (Array.isArray(taxCodes)) {
      taxResult = await this.calculateMultipleTaxes(taxableAmount / quantity, taxCodes, {
        isInclusive: taxInclusive,
        quantity,
      });
    } else {
      taxResult = await this.calculateTax(taxableAmount / quantity, taxCodes, {
        isInclusive: taxInclusive,
        quantity,
      });
    }

    // Calculate line total
    const lineTotal = taxInclusive ? taxableAmount : taxableAmount + taxResult.totalTaxAmount;

    return {
      ...taxResult,
      unitPrice,
      quantity,
      subtotal,
      discount,
      discountAmount,
      taxableAmount: taxResult.totalTaxableAmount,
      taxAmount: taxResult.totalTaxAmount,
      lineTotal,
    };
  }

  /**
   * Calculate taxes for multiple invoice items
   * @param {Array<Object>} items - Array of invoice line items
   * @returns {Promise<Object>} Invoice tax summary
   */
  async calculateInvoiceTaxes(items) {
    if (!Array.isArray(items) || items.length === 0) {
      throw new Error('At least one item is required');
    }

    let totalSubtotal = 0;
    let totalDiscount = 0;
    let totalTaxableAmount = 0;
    let totalTaxAmount = 0;
    let totalGrossAmount = 0;
    const taxBreakdown = {};
    const itemCalculations = [];

    // Calculate taxes for each item
    for (let index = 0; index < items.length; index++) {
      const item = items[index];
      const calculation = await this.calculateItemTax(item);

      // Update totals
      totalSubtotal += calculation.subtotal;
      totalDiscount += calculation.discountAmount;
      totalTaxableAmount += calculation.taxableAmount;
      totalTaxAmount += calculation.taxAmount;
      totalGrossAmount += calculation.lineTotal;

      // Update tax breakdown
      calculation.breakdown.forEach((tax) => {
        const key = tax.taxCode;
        if (!taxBreakdown[key]) {
          taxBreakdown[key] = {
            taxCode: tax.taxCode,
            taxName: tax.taxName,
            taxType: tax.taxType,
            rate: tax.rate,
            description: tax.description,
            totalAmount: 0,
          };
        }
        taxBreakdown[key].totalAmount += tax.totalAmount;
      });

      itemCalculations.push({
        itemIndex: index,
        ...calculation,
      });
    }

    // Convert tax breakdown to array
    const taxSummary = Object.values(taxBreakdown);

    return {
      totalSubtotal,
      totalDiscount,
      totalTaxableAmount,
      totalTaxAmount,
      totalGrossAmount,
      taxSummary,
      items: itemCalculations,
    };
  }

  /**
   * Create a new tax configuration
   * @param {Object} taxData - Tax configuration data
   * @returns {Promise<Object>} Created tax configuration
   */
  async createTaxConfig(taxData) {
    // Validate required fields
    if (!taxData.name || !taxData.code || !taxData.type || taxData.rate === undefined) {
      throw new Error('Name, code, type, and rate are required');
    }

    // Check if code already exists
    const exists = await taxConfigRepository.codeExists(taxData.code);
    if (exists) {
      throw new Error(`Tax code ${taxData.code} already exists`);
    }

    const taxConfig = await taxConfigRepository.create(taxData);

    // Clear cache to reflect new configuration
    this.clearCache();

    return taxConfig;
  }

  /**
   * Update tax configuration
   * @param {string} id - Tax configuration ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated tax configuration
   */
  async updateTaxConfig(id, updateData) {
    // If code is being updated, check for duplicates
    if (updateData.code) {
      const exists = await taxConfigRepository.codeExists(updateData.code, id);
      if (exists) {
        throw new Error(`Tax code ${updateData.code} already exists`);
      }
    }

    const taxConfig = await taxConfigRepository.update(id, updateData);

    if (!taxConfig) {
      throw new Error('Tax configuration not found');
    }

    // Clear cache to reflect updated configuration
    this.clearCache();

    return taxConfig;
  }

  /**
   * Delete tax configuration
   * @param {string} id - Tax configuration ID
   * @returns {Promise<Object>} Deleted tax configuration
   */
  async deleteTaxConfig(id) {
    const taxConfig = await taxConfigRepository.delete(id);

    if (!taxConfig) {
      throw new Error('Tax configuration not found');
    }

    // Clear cache
    this.clearCache();

    return taxConfig;
  }

  /**
   * Get tax configuration by ID
   * @param {string} id - Tax configuration ID
   * @returns {Promise<Object>} Tax configuration
   */
  async getTaxConfigById(id) {
    const taxConfig = await taxConfigRepository.findById(id);

    if (!taxConfig) {
      throw new Error('Tax configuration not found');
    }

    return taxConfig;
  }

  /**
   * Get all tax configurations with optional filters
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} Tax configurations
   */
  async getAllTaxConfigs(filters = {}) {
    return await taxConfigRepository.findAll(filters);
  }

  /**
   * Get taxes by category
   * @param {string} category - Tax category
   * @returns {Promise<Array>} Tax configurations
   */
  async getTaxesByCategory(category) {
    return await taxConfigRepository.findByCategory(category);
  }

  /**
   * Activate tax configuration
   * @param {string} id - Tax configuration ID
   * @returns {Promise<Object>} Activated tax configuration
   */
  async activateTaxConfig(id) {
    const taxConfig = await taxConfigRepository.activate(id);
    this.clearCache();
    return taxConfig;
  }

  /**
   * Deactivate tax configuration
   * @param {string} id - Tax configuration ID
   * @returns {Promise<Object>} Deactivated tax configuration
   */
  async deactivateTaxConfig(id) {
    const taxConfig = await taxConfigRepository.deactivate(id);
    this.clearCache();
    return taxConfig;
  }

  /**
   * Set tax as default for its type
   * @param {string} id - Tax configuration ID
   * @returns {Promise<Object>} Updated tax configuration
   */
  async setDefaultTax(id) {
    const taxConfig = await taxConfigRepository.setAsDefault(id);
    this.clearCache();
    return taxConfig;
  }

  /**
   * Get tax statistics
   * @returns {Promise<Array>} Tax statistics by type
   */
  async getTaxStatistics() {
    return await taxConfigRepository.getStatistics();
  }

  /**
   * Validate GST rate
   * Requirement 10.3: Ensure valid GST rates (4% or 18%)
   * @param {number} rate - GST rate to validate
   * @returns {boolean} True if valid
   */
  validateGSTRate(rate) {
    const validRates = [0, 4, 18];
    return validRates.includes(rate);
  }

  /**
   * Calculate dual GST (18% and 4%) for purchase items
   * Requirement 10.1, 10.2, 10.4, 10.5: Dual GST rate support
   * @param {Array} items - Invoice items with amounts and GST rates
   * @returns {Object} Dual GST calculation result
   */
  calculateDualGST(items) {
    let gst18Total = 0;
    let gst4Total = 0;
    const itemBreakdown = [];

    items.forEach((item, index) => {
      const { amountAfterDiscount = 0, gstRate = 18, itemIndex = index } = item;

      let gstAmount = 0;
      if (gstRate === 18) {
        gstAmount = (amountAfterDiscount * 18) / 100;
        gst18Total += gstAmount;
      } else if (gstRate === 4) {
        gstAmount = (amountAfterDiscount * 4) / 100;
        gst4Total += gstAmount;
      }

      itemBreakdown.push({
        itemIndex,
        amountAfterDiscount,
        gstRate,
        gstAmount,
      });
    });

    return {
      gst18Total,
      gst4Total,
      totalGST: gst18Total + gst4Total,
      itemBreakdown,
    };
  }

  /**
   * Separate GST by rate for reporting
   * Requirement 10.6, 10.7: Separate GST tracking by rate
   * @param {Array} items - Invoice items
   * @returns {Object} GST separated by rate
   */
  separateGSTByRate(items) {
    const result = {
      gst18Items: [],
      gst4Items: [],
      gst18Total: 0,
      gst4Total: 0,
    };

    items.forEach((item, index) => {
      const { amountAfterDiscount = 0, gstRate = 18 } = item;
      const gstAmount = gstRate === 18
        ? (amountAfterDiscount * 18) / 100
        : (amountAfterDiscount * 4) / 100;

      const itemData = {
        itemIndex: index,
        amountAfterDiscount,
        gstRate,
        gstAmount,
      };

      if (gstRate === 18) {
        result.gst18Items.push(itemData);
        result.gst18Total += gstAmount;
      } else if (gstRate === 4) {
        result.gst4Items.push(itemData);
        result.gst4Total += gstAmount;
      }
    });

    return result;
  }

  /**
   * Calculate purchase-specific taxes including advance tax
   * Requirement 1.25: Advance tax calculations
   * @param {number} taxableAmount - Amount to calculate tax on
   * @param {number} advanceTaxRate - Advance tax rate (0.5% or 2.5%)
   * @returns {Object} Tax calculation result
   */
  calculatePurchaseTaxes(taxableAmount, advanceTaxRate = 0) {
    const gstAmount = (taxableAmount * 18) / 100;
    const advanceTaxAmount = advanceTaxRate > 0
      ? (taxableAmount * advanceTaxRate) / 100
      : 0;

    return {
      taxableAmount,
      gstAmount,
      gstRate: 18,
      advanceTaxRate,
      advanceTaxAmount,
      totalTax: gstAmount + advanceTaxAmount,
    };
  }

  /**
   * Calculate advance tax based on supplier status
   * Requirement 1.5: 0.5% for filers, 2.5% for non-filers
   * @param {number} amount - Taxable amount
   * @param {boolean} isFiler - Whether supplier is a tax filer
   * @returns {Object} Advance tax calculation
   */
  calculateAdvanceTax(amount, isFiler = true) {
    const rate = isFiler ? 0.5 : 2.5;
    const taxAmount = (amount * rate) / 100;

    return {
      rate,
      taxAmount,
      isFiler,
      description: isFiler
        ? 'Advance Tax @ 0.5% (Filer)'
        : 'Advance Tax @ 2.5% (Non-Filer)',
    };
  }

  /**
   * Calculate non-filer GST
   * Requirement 1.36: Non-filer GST 0.1%
   * @param {number} amount - Taxable amount
   * @param {boolean} isNonFiler - Whether account is non-filer
   * @returns {Object} Non-filer GST calculation
   */
  calculateNonFilerGST(amount, isNonFiler = false) {
    if (!isNonFiler) {
      return {
        rate: 0,
        taxAmount: 0,
        isNonFiler: false,
        description: 'N/A',
      };
    }

    const rate = 0.1;
    const taxAmount = (amount * rate) / 100;

    return {
      rate,
      taxAmount,
      isNonFiler: true,
      description: 'Non-Filer GST @ 0.1%',
    };
  }

  /**
   * Get tax rate for customer (for sales invoices)
   * Retrieves advance tax rate based on customer's filer status
   * @param {string} customerId - Customer ID
   * @returns {Promise<Object>} Customer tax information
   */
  async getTaxRateForCustomer(customerId) {
    const Customer = require('../models/Customer');
    const customer = await Customer.findById(customerId);

    if (!customer) {
      throw new Error('Customer not found');
    }

    const isFiler = customer.taxStatus === 'filer' || customer.isFiler === true;
    const advanceTaxRate = isFiler ? 0.5 : 2.5;
    const isNonFiler = customer.taxStatus === 'non-filer' || customer.isNonFiler === true;

    return {
      customerId,
      customerName: customer.name,
      isFiler,
      isNonFiler,
      advanceTaxRate,
      nonFilerGSTRate: isNonFiler ? 0.1 : 0,
      taxStatus: customer.taxStatus || (isFiler ? 'filer' : 'non-filer'),
    };
  }

  /**
   * Get tax rate for item (GST rate)
   * @param {string} itemId - Item ID
   * @returns {Promise<Object>} Item tax information
   */
  async getTaxRateForItem(itemId) {
    const Item = require('../models/Item');
    const item = await Item.findById(itemId);

    if (!item) {
      throw new Error('Item not found');
    }

    // Default GST rate is 18% for pharmaceutical items
    const gstRate = item.gstRate || item.taxRate || 18;

    return {
      itemId,
      itemName: item.name,
      itemCode: item.code,
      gstRate,
      gstPercentage: gstRate,
    };
  }

  /**
   * Calculate sales invoice taxes
   * Comprehensive tax calculation for sales invoices including GST, advance tax, and non-filer GST
   * @param {Object} params - Tax calculation parameters
   * @param {number} params.amount - Base amount (after discounts)
   * @param {number} params.gstRate - GST rate (default 18%)
   * @param {number} params.advanceTaxRate - Advance tax rate (0.5% or 2.5%)
   * @param {boolean} params.isNonFiler - Whether customer is non-filer
   * @param {number} params.quantity - Quantity
   * @returns {Object} Complete tax calculation
   */
  calculateSalesInvoiceTaxes(params) {
    const {
      amount,
      gstRate = 18,
      advanceTaxRate = 0,
      isNonFiler = false,
      quantity = 1,
    } = params;

    // Validate inputs
    if (typeof amount !== 'number' || amount < 0) {
      throw new Error('Invalid amount');
    }

    // Calculate GST
    const gstAmount = (amount * gstRate) / 100;

    // Calculate advance tax
    const advanceTaxAmount = advanceTaxRate > 0 ? (amount * advanceTaxRate) / 100 : 0;

    // Calculate non-filer GST (on gross amount)
    const nonFilerGSTAmount = isNonFiler ? (amount * 0.1) / 100 : 0;

    // Calculate totals
    const totalTaxAmount = gstAmount + advanceTaxAmount + nonFilerGSTAmount;
    const grossAmount = amount + totalTaxAmount;

    return {
      baseAmount: amount,
      quantity,
      gstRate,
      gstAmount,
      advanceTaxRate,
      advanceTaxAmount,
      isNonFiler,
      nonFilerGSTRate: isNonFiler ? 0.1 : 0,
      nonFilerGSTAmount,
      totalTaxAmount,
      grossAmount,
      breakdown: [
        {
          taxType: 'GST',
          rate: gstRate,
          amount: gstAmount,
          description: `GST @ ${gstRate}%`,
        },
        ...(advanceTaxRate > 0 ? [{
          taxType: 'Advance Tax',
          rate: advanceTaxRate,
          amount: advanceTaxAmount,
          description: `Advance Tax @ ${advanceTaxRate}%`,
        }] : []),
        ...(isNonFiler ? [{
          taxType: 'Non-Filer GST',
          rate: 0.1,
          amount: nonFilerGSTAmount,
          description: 'Non-Filer GST @ 0.1%',
        }] : []),
      ],
    };
  }

  /**
   * Calculate box and unit GST separately
   * For pharmaceutical invoices that track box and unit quantities separately
   * @param {Object} params - Calculation parameters
   * @param {number} params.boxQty - Box quantity
   * @param {number} params.unitQty - Unit quantity
   * @param {number} params.boxTP - Box trade price
   * @param {number} params.unitTP - Unit trade price
   * @param {number} params.gstRate - GST rate (default 18%)
   * @returns {Object} Separate box and unit GST calculation
   */
  calculateBoxUnitGST(params) {
    const {
      boxQty = 0,
      unitQty = 0,
      boxTP = 0,
      unitTP = 0,
      gstRate = 18,
    } = params;

    // Calculate box GST
    const boxAmount = boxQty * boxTP;
    const boxGSTAmount = (boxAmount * gstRate) / 100;

    // Calculate unit GST
    const unitAmount = unitQty * unitTP;
    const unitGSTAmount = (unitAmount * gstRate) / 100;

    // Total
    const totalAmount = boxAmount + unitAmount;
    const totalGSTAmount = boxGSTAmount + unitGSTAmount;

    return {
      boxQty,
      boxTP,
      boxAmount,
      boxGSTAmount,
      unitQty,
      unitTP,
      unitAmount,
      unitGSTAmount,
      gstRate,
      totalAmount,
      totalGSTAmount,
      grossAmount: totalAmount + totalGSTAmount,
    };
  }
}

// Export a singleton instance
module.exports = new TaxService();
