const config = require('../config/carton');

/**
 * Box/Unit Conversion Service
 * Unified service for all Box ↔ Unit ↔ Carton calculations.
 * Consolidates logic from:
 * - boxUnitConversionService.js (original)
 * - quantityCalculationService.js (redundant)
 * - cartonCalculationService.js (carton specific)
 */
class BoxUnitConversionService {
  /**
   * Convert box quantity to units
   * @param {number} boxQty - Number of boxes
   * @param {number} packSize - Units per box
   * @returns {number} Total units
   */
  convertBoxToUnits(boxQty, packSize) {
    if (boxQty < 0) {
      throw new Error('Box quantity cannot be negative');
    }
    if (packSize <= 0) {
      throw new Error('Pack size must be greater than 0');
    }
    return boxQty * packSize;
  }

  /**
   * Calculate total units from box and unit quantities
   * @param {number} boxQty - Number of boxes
   * @param {number} unitQty - Number of loose units
   * @param {number} packSize - Units per box
   * @returns {number} Total units
   */
  calculateTotalUnits(boxQty = 0, unitQty = 0, packSize = 1) {
    if (boxQty < 0 || unitQty < 0) {
      throw new Error('Quantities cannot be negative');
    }
    if (packSize <= 0) {
      throw new Error('Pack size must be greater than 0');
    }

    const unitsFromBoxes = this.convertBoxToUnits(boxQty, packSize);
    return unitsFromBoxes + unitQty;
  }

  /**
   * Convert total units to boxes and remaining units
   * @param {number} totalUnits - Total number of units
   * @param {number} packSize - Units per box
   * @returns {Object} { boxes, remainingUnits, totalUnits }
   */
  convertUnitsToBoxes(totalUnits, packSize) {
    if (totalUnits < 0) {
      throw new Error('Total units cannot be negative');
    }
    if (packSize <= 0) {
      throw new Error('Pack size must be greater than 0');
    }

    const boxes = Math.floor(totalUnits / packSize);
    const remainingUnits = totalUnits % packSize;

    return {
      boxes,
      remainingUnits,
      totalUnits,
    };
  }

  /**
   * Break down total units into boxes and units (Alias for convertUnitsToBoxes for compatibility)
   * @param {number} totalUnits - Total number of units
   * @param {number} packSize - Units per box
   * @returns {Object} { boxQty, unitQty }
   */
  breakdownUnits(totalUnits, packSize = 1) {
    const result = this.convertUnitsToBoxes(totalUnits, packSize);
    return {
      boxQty: result.boxes,
      unitQty: result.remainingUnits,
    };
  }

  /**
   * Calculate line total with dual rates (box rate and unit rate)
   * @param {number} boxQty - Number of boxes
   * @param {number} boxRate - Price per box
   * @param {number} unitQty - Number of loose units
   * @param {number} unitRate - Price per unit
   * @returns {number} Total line amount
   */
  calculateLineTotal(boxQty = 0, boxRate = 0, unitQty = 0, unitRate = 0) {
    if (boxQty < 0 || unitQty < 0) {
      throw new Error('Quantities cannot be negative');
    }
    if (boxRate < 0 || unitRate < 0) {
      throw new Error('Rates cannot be negative');
    }

    const boxTotal = boxQty * boxRate;
    const unitTotal = unitQty * unitRate;

    return boxTotal + unitTotal;
  }

  /**
   * Calculate effective rate per unit when using box/unit pricing
   * @param {number} boxQty - Number of boxes
   * @param {number} boxRate - Price per box
   * @param {number} unitQty - Number of loose units
   * @param {number} unitRate - Price per unit
   * @param {number} packSize - Units per box
   * @returns {number} Effective rate per unit
   */
  calculateEffectiveUnitRate(boxQty, boxRate, unitQty, unitRate, packSize) {
    const totalAmount = this.calculateLineTotal(boxQty, boxRate, unitQty, unitRate);
    const totalUnits = this.calculateTotalUnits(boxQty, unitQty, packSize);

    if (totalUnits === 0) {
      return 0;
    }

    return totalAmount / totalUnits;
  }

  /**
   * Calculate unit rate from box rate
   * @param {number} boxRate - Rate per box
   * @param {number} packSize - Units per box
   * @returns {number} Rate per unit
   */
  calculateUnitRate(boxRate, packSize = 1) {
    if (boxRate < 0) {
      throw new Error('Box rate cannot be negative');
    }
    if (packSize <= 0) {
      throw new Error('Pack size must be greater than zero');
    }
    return boxRate / packSize;
  }

  /**
   * Calculate box rate from unit rate
   * @param {number} unitRate - Rate per unit
   * @param {number} packSize - Units per box
   * @returns {number} Rate per box
   */
  calculateBoxRate(unitRate, packSize = 1) {
    if (unitRate < 0) {
      throw new Error('Unit rate cannot be negative');
    }
    if (packSize <= 0) {
      throw new Error('Pack size must be greater than zero');
    }
    return unitRate * packSize;
  }

  /**
   * Calculate carton quantity from box quantity
   * Carton is typically a larger unit containing multiple boxes
   * @param {number} boxQty - Number of boxes
   * @param {number} boxesPerCarton - Boxes per carton (optional, defaults to config or 1)
   * @returns {number} Number of cartons
   */
  calculateCartonQty(boxQty, boxesPerCarton = null) {
    if (boxQty < 0) {
      throw new Error('Box quantity cannot be negative');
    }

    // Check for null/undefined explicitly to allow 0 to be validated if passed (though unlikely)
    const divisor = boxesPerCarton !== null && boxesPerCarton !== undefined
      ? boxesPerCarton
      : (config && config.defaultBoxesPerCarton ? config.defaultBoxesPerCarton : 1);

    if (divisor <= 0) {
      throw new Error('Boxes per carton must be greater than 0');
    }

    if (boxQty === 0) {
      return 0;
    }

    return Math.ceil(boxQty / divisor);
  }

  /**
   * Calculate total carton quantity for an invoice
   * @param {Object} invoice - Invoice object with items array
   * @param {number} boxesPerCarton - Boxes per carton (optional)
   * @returns {number} Total carton quantity for the invoice
   */
  calculateInvoiceCartonQty(invoice, boxesPerCarton = null) {
    if (!invoice || !invoice.items || !Array.isArray(invoice.items)) {
      throw new Error('Invalid invoice object');
    }

    let totalBoxes = 0;
    invoice.items.forEach((item) => {
      if (item.boxQuantity && item.boxQuantity > 0) {
        totalBoxes += item.boxQuantity;
      }
    });

    return this.calculateCartonQty(totalBoxes, boxesPerCarton);
  }

  /**
   * Calculate carton quantities for all items in an invoice
   * Updates each item with its carton quantity
   * @param {Object} invoice - Invoice object with items array
   * @param {number} boxesPerCarton - Boxes per carton (optional)
   * @returns {Object} Object with item carton quantities and total
   */
  calculateAllCartonQuantities(invoice, boxesPerCarton = null) {
    if (!invoice || !invoice.items || !Array.isArray(invoice.items)) {
      throw new Error('Invalid invoice object');
    }

    const itemCartons = [];
    let totalCartons = 0;

    invoice.items.forEach((item, index) => {
      const cartonQty = this.calculateCartonQty(item.boxQuantity || 0, boxesPerCarton);
      itemCartons.push({
        index,
        itemId: item.itemId,
        boxQuantity: item.boxQuantity || 0,
        cartonQty,
      });
      totalCartons += cartonQty;
    });

    return {
      itemCartons,
      totalCartons,
      boxesPerCarton: boxesPerCarton || (config && config.defaultBoxesPerCarton ? config.defaultBoxesPerCarton : 1),
    };
  }

  /**
   * Validate box/unit quantities and rates
   * @param {Object} data - Box/unit data
   * @returns {Object} Validation result
   */
  validateBoxUnitData(data) {
    const {
      boxQty, unitQty, boxRate, unitRate, packSize,
    } = data;
    const errors = [];

    // At least one quantity must be provided
    if ((!boxQty || boxQty === 0) && (!unitQty || unitQty === 0)) {
      errors.push('At least one of box quantity or unit quantity must be greater than 0');
    }

    if (boxQty && boxQty < 0) errors.push('Box quantity cannot be negative');
    if (unitQty && unitQty < 0) errors.push('Unit quantity cannot be negative');

    // If box quantity is provided, box rate must be provided
    if (boxQty && boxQty > 0 && (!boxRate || boxRate === 0)) {
      errors.push('Box rate is required when box quantity is provided');
    }

    // If unit quantity is provided, unit rate must be provided
    if (unitQty && unitQty > 0 && (!unitRate || unitRate === 0)) {
      // We might be able to calculate it? But strict validation requires it.
      errors.push('Unit rate is required when unit quantity is provided');
    }

    if (boxRate && boxRate < 0) errors.push('Box rate cannot be negative');
    if (unitRate && unitRate < 0) errors.push('Unit rate cannot be negative');

    // Pack size validation
    if (packSize && packSize <= 0) {
      errors.push('Pack size must be greater than 0');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get default boxes per carton configuration
   * @returns {number} Default boxes per carton
   */
  getDefaultBoxesPerCarton() {
    return config && config.defaultBoxesPerCarton ? config.defaultBoxesPerCarton : 1;
  }

  /**
   * Format box/unit display string
   * @param {number} boxQty - Number of boxes
   * @param {number} unitQty - Number of loose units
   * @param {string} boxLabel - Label for box (default 'Box')
   * @param {string} unitLabel - Label for unit (default 'Unit')
   * @returns {string} Formatted string
   */
  formatBoxUnitDisplay(boxQty, unitQty, boxLabel = 'Box', unitLabel = 'Unit') {
    const parts = [];

    if (boxQty && boxQty > 0) {
      parts.push(`${boxQty} ${boxLabel}${boxQty > 1 ? 'es' : ''}`);
    }

    if (unitQty && unitQty > 0) {
      parts.push(`${unitQty} ${unitLabel}${unitQty > 1 ? 's' : ''}`);
    }

    return parts.join(' + ') || '0';
  }

  /**
   * Format carton/box/unit display string (Merged from cartonCalculationService)
   * @param {number} cartonQty - Number of cartons
   * @param {number} boxQty - Number of boxes
   * @param {number} unitQty - Number of units
   * @returns {string} Formatted display string
   */
  formatCartonBoxUnitDisplay(cartonQty = 0, boxQty = 0, unitQty = 0) {
    const parts = [];

    if (cartonQty && cartonQty > 0) {
      parts.push(`${cartonQty} Carton${cartonQty > 1 ? 's' : ''}`);
    }

    if (boxQty && boxQty > 0) {
      parts.push(`${boxQty} Box${boxQty > 1 ? 'es' : ''}`);
    }

    if (unitQty && unitQty > 0) {
      parts.push(`${unitQty} Unit${unitQty > 1 ? 's' : ''}`);
    }

    return parts.join(' + ') || '0';
  }

  /**
   * Calculate discount on box/unit pricing
   * @param {number} boxQty - Number of boxes
   * @param {number} boxRate - Price per box
   * @param {number} unitQty - Number of loose units
   * @param {number} unitRate - Price per unit
   * @param {number} discountPercent - Discount percentage
   * @returns {Object} Discount breakdown
   */
  calculateDiscount(boxQty, boxRate, unitQty, unitRate, discountPercent) {
    const subtotal = this.calculateLineTotal(boxQty, boxRate, unitQty, unitRate);
    const discountAmount = (subtotal * discountPercent) / 100;
    const totalAfterDiscount = subtotal - discountAmount;

    return {
      subtotal,
      discountPercent,
      discountAmount,
      totalAfterDiscount,
    };
  }
}

module.exports = new BoxUnitConversionService();
