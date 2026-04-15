const Joi = require('joi');

/**
 * Sales Invoice Validation Schemas
 * Comprehensive validation for sales invoice creation and updates
 * Requirements: 1.1-1.46 from sales-management/requirements.md
 */

// Invoice item schema
const invoiceItemSchema = Joi.object({
  itemId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid item ID format',
      'any.required': 'Item ID is required',
    }),

  itemName: Joi.string()
    .trim()
    .max(200)
    .optional()
    .allow('', null),

  companyName: Joi.string()
    .trim()
    .max(200)
    .optional()
    .allow('', null),

  // Warehouse and batch tracking (Requirement 1.11, 1.12)
  warehouseId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid warehouse ID format',
      'any.required': 'Warehouse ID is required',
    }),

  batchNumber: Joi.string()
    .trim()
    .max(50)
    .optional()
    .allow('', null),

  expiryDate: Joi.date()
    .optional()
    .allow(null),

  // Quantities (Requirement 1.13, 1.14, 1.17, 1.18)
  boxQuantity: Joi.number()
    .min(0)
    .default(0)
    .messages({
      'number.min': 'Box quantity cannot be negative',
    }),

  unitQuantity: Joi.number()
    .min(0)
    .default(0)
    .messages({
      'number.min': 'Unit quantity cannot be negative',
    }),

  scheme1Quantity: Joi.number()
    .min(0)
    .default(0)
    .messages({
      'number.min': 'Scheme 1 quantity cannot be negative',
    }),

  scheme2Quantity: Joi.number()
    .min(0)
    .default(0)
    .messages({
      'number.min': 'Scheme 2 quantity cannot be negative',
    }),

  // Pricing (Requirement 1.15, 1.16)
  boxRate: Joi.number()
    .min(0)
    .optional()
    .messages({
      'number.min': 'Box rate cannot be negative',
    }),

  unitRate: Joi.number()
    .min(0)
    .optional()
    .messages({
      'number.min': 'Unit rate cannot be negative',
    }),

  unitPrice: Joi.number()
    .min(0)
    .required()
    .messages({
      'number.min': 'Unit price cannot be negative',
      'any.required': 'Unit price is required',
    }),

  // Discounts (Requirement 1.19, 1.20)
  discount1Percent: Joi.number()
    .min(0)
    .max(100)
    .default(0)
    .messages({
      'number.min': 'Discount 1 percent cannot be negative',
      'number.max': 'Discount 1 percent cannot exceed 100%',
    }),

  discount2Percent: Joi.number()
    .min(0)
    .max(100)
    .default(0)
    .messages({
      'number.min': 'Discount 2 percent cannot be negative',
      'number.max': 'Discount 2 percent cannot exceed 100%',
    }),

  // GST (Requirement 1.21, 1.22)
  gstRate: Joi.number()
    .valid(0, 4, 18)
    .default(18)
    .messages({
      'any.only': 'GST rate must be 0, 4, or 18',
    }),

  // Advance tax (Requirement 1.23)
  advanceTaxPercent: Joi.number()
    .valid(0, 0.5, 2.5)
    .default(0)
    .messages({
      'any.only': 'Advance tax percent must be 0, 0.5, or 2.5',
    }),
}).custom((value, helpers) => {
  // At least one quantity must be provided
  if ((value.boxQuantity || 0) === 0 && (value.unitQuantity || 0) === 0) {
    return helpers.error('any.custom', {
      message: 'At least one of box quantity or unit quantity must be greater than 0',
    });
  }
  return value;
});

// Sales invoice creation schema
const createSalesInvoiceSchema = Joi.object({
  // Customer information (Requirement 1.4, 1.5)
  customerId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid customer ID format',
      'any.required': 'Customer ID is required',
    }),

  // Sales type (Requirement 1.2)
  salesType: Joi.string()
    .valid('new', 'return')
    .default('new')
    .messages({
      'any.only': 'Sales type must be either "new" or "return"',
    }),

  // Dates (Requirement 1.3, 1.8)
  invoiceDate: Joi.date()
    .default(() => new Date())
    .messages({
      'date.base': 'Invalid invoice date format',
    }),

  dueDate: Joi.date()
    .optional()
    .messages({
      'date.base': 'Invalid due date format',
    }),

  // Optional fields (Requirement 1.7)
  otherTitle: Joi.string()
    .trim()
    .max(200)
    .optional()
    .allow('', null),

  memoNo: Joi.string()
    .trim()
    .max(50)
    .optional()
    .allow('', null),

  poReference: Joi.string()
    .trim()
    .max(50)
    .optional()
    .allow('', null),

  // Credit days (Requirement 1.8)
  creditDays: Joi.number()
    .min(0)
    .default(0)
    .messages({
      'number.min': 'Credit days cannot be negative',
    }),

  // Salesman (Requirement 1.5)
  salesmanId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .optional()
    .allow(null)
    .messages({
      'string.pattern.base': 'Invalid salesman ID format',
    }),

  // Invoice type (Requirement 1.9)
  taxInvoiceType: Joi.string()
    .valid('normal', 'sales_tax', 'advance_tax')
    .default('normal')
    .messages({
      'any.only': 'Tax invoice type must be "normal", "sales_tax", or "advance_tax"',
    }),

  // Claim account (Requirement 1.10)
  claimAccountId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .optional()
    .allow(null)
    .messages({
      'string.pattern.base': 'Invalid claim account ID format',
    }),

  // Advance tax rate (Requirement 1.6, 1.23)
  advanceTaxRate: Joi.number()
    .valid(0, 0.5, 2.5)
    .default(0)
    .messages({
      'any.only': 'Advance tax rate must be 0, 0.5, or 2.5',
    }),

  // Items array (Requirement 1.11-1.25)
  items: Joi.array()
    .items(invoiceItemSchema)
    .min(1)
    .required()
    .messages({
      'array.min': 'At least one item is required',
      'any.required': 'Items array is required',
    }),

  // Overall discounts (Requirement 1.30, 1.31)
  totals: Joi.object({
    discountPercentOverall: Joi.number()
      .min(0)
      .max(100)
      .default(0)
      .messages({
        'number.min': 'Overall discount percent cannot be negative',
        'number.max': 'Overall discount percent cannot exceed 100%',
      }),

    discountAmountOverall: Joi.number()
      .min(0)
      .default(0)
      .messages({
        'number.min': 'Overall discount amount cannot be negative',
      }),
  }).optional(),

  // Additional information (Requirement 1.41)
  detailNote: Joi.string()
    .trim()
    .max(1000)
    .optional()
    .allow('', null),

  warrantyInfo: Joi.string()
    .trim()
    .max(500)
    .optional()
    .allow('', null),

  // Status
  status: Joi.string()
    .valid('draft', 'confirmed')
    .default('draft')
    .messages({
      'any.only': 'Status must be either "draft" or "confirmed"',
    }),
}).custom((value, helpers) => {
  // Validate due date is after invoice date
  if (value.dueDate && value.invoiceDate && value.dueDate < value.invoiceDate) {
    return helpers.error('any.custom', {
      message: 'Due date cannot be before invoice date',
    });
  }

  // If scheme2Quantity is used, claimAccountId is required
  const hasScheme2 = value.items?.some((item) => (item.scheme2Quantity || 0) > 0);
  if (hasScheme2 && !value.claimAccountId) {
    return helpers.error('any.custom', {
      message: 'Claim account is required when using scheme 2 quantities',
    });
  }

  // If discount2Percent is used, claimAccountId is required
  const hasDiscount2 = value.items?.some((item) => (item.discount2Percent || 0) > 0);
  if (hasDiscount2 && !value.claimAccountId) {
    return helpers.error('any.custom', {
      message: 'Claim account is required when using discount 2',
    });
  }

  return value;
});

// Update sales invoice schema (similar to create but all fields optional except ID)
const updateSalesInvoiceSchema = Joi.object({
  customerId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Invalid customer ID format',
    }),

  salesType: Joi.string()
    .valid('new', 'return')
    .optional(),

  invoiceDate: Joi.date()
    .optional(),

  dueDate: Joi.date()
    .optional(),

  otherTitle: Joi.string()
    .trim()
    .max(200)
    .optional()
    .allow('', null),

  memoNo: Joi.string()
    .trim()
    .max(50)
    .optional()
    .allow('', null),

  poReference: Joi.string()
    .trim()
    .max(50)
    .optional()
    .allow('', null),

  creditDays: Joi.number()
    .min(0)
    .optional(),

  salesmanId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .optional()
    .allow(null),

  taxInvoiceType: Joi.string()
    .valid('normal', 'sales_tax', 'advance_tax')
    .optional(),

  claimAccountId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .optional()
    .allow(null),

  advanceTaxRate: Joi.number()
    .valid(0, 0.5, 2.5)
    .optional(),

  items: Joi.array()
    .items(invoiceItemSchema)
    .min(1)
    .optional(),

  totals: Joi.object({
    discountPercentOverall: Joi.number()
      .min(0)
      .max(100)
      .optional(),

    discountAmountOverall: Joi.number()
      .min(0)
      .optional(),
  }).optional(),

  detailNote: Joi.string()
    .trim()
    .max(1000)
    .optional()
    .allow('', null),

  warrantyInfo: Joi.string()
    .trim()
    .max(500)
    .optional()
    .allow('', null),

  status: Joi.string()
    .valid('draft', 'confirmed', 'cancelled')
    .optional(),
}).min(1).messages({
  'object.min': 'At least one field must be provided for update',
});

// Confirm invoice schema
const confirmInvoiceSchema = Joi.object({
  // No body required, just ID in params
});

// Cancel invoice schema
const cancelInvoiceSchema = Joi.object({
  reason: Joi.string()
    .trim()
    .max(500)
    .optional()
    .allow('', null)
    .messages({
      'string.max': 'Cancellation reason cannot exceed 500 characters',
    }),
});

// Sales return schema (Requirement 2.1-2.10)
const createSalesReturnSchema = Joi.object({
  returnItems: Joi.array()
    .items(Joi.object({
      itemId: Joi.string()
        .pattern(/^[0-9a-fA-F]{24}$/)
        .required()
        .messages({
          'string.pattern.base': 'Invalid item ID format',
          'any.required': 'Item ID is required for return items',
        }),

      returnQuantity: Joi.number()
        .min(0.01)
        .required()
        .messages({
          'number.min': 'Return quantity must be greater than 0',
          'any.required': 'Return quantity is required',
        }),

      batchNumber: Joi.string()
        .trim()
        .optional()
        .allow('', null),
    }))
    .min(1)
    .required()
    .messages({
      'array.min': 'At least one return item is required',
      'any.required': 'Return items array is required',
    }),

  returnReason: Joi.string()
    .valid('damaged', 'expired', 'wrong_item', 'customer_request', 'quality_issue', 'other')
    .optional()
    .messages({
      'any.only': 'Invalid return reason',
    }),

  returnNotes: Joi.string()
    .trim()
    .max(500)
    .optional()
    .allow('', null)
    .messages({
      'string.max': 'Return notes cannot exceed 500 characters',
    }),
});

module.exports = {
  createSalesInvoiceSchema,
  updateSalesInvoiceSchema,
  confirmInvoiceSchema,
  cancelInvoiceSchema,
  createSalesReturnSchema,
};
