const Joi = require('joi');

/**
 * Quotation Validation Schemas
 * Comprehensive validation for quotation management
 * Requirements: 4.1-4.15 from sales-management/requirements.md
 */

// Quotation item schema
const quotationItemSchema = Joi.object({
  itemId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid item ID format',
      'any.required': 'Item ID is required',
    }),

  // Item details (Requirement 4.5)
  itemName: Joi.string()
    .trim()
    .max(200)
    .optional(),

  companyName: Joi.string()
    .trim()
    .max(200)
    .optional(),

  boxPacking: Joi.number()
    .min(1)
    .default(1)
    .messages({
      'number.min': 'Box packing must be at least 1',
    }),

  // Unit retail price (Requirement 4.5)
  unitRetail: Joi.number()
    .min(0)
    .optional()
    .messages({
      'number.min': 'Unit retail cannot be negative',
    }),

  // Unit TP (Requirement 4.5)
  unitTP: Joi.number()
    .min(0)
    .optional()
    .messages({
      'number.min': 'Unit TP cannot be negative',
    }),

  quantity: Joi.number()
    .min(0.01)
    .required()
    .messages({
      'number.min': 'Quantity must be greater than 0',
      'any.required': 'Quantity is required',
    }),

  unitPrice: Joi.number()
    .min(0)
    .required()
    .messages({
      'number.min': 'Unit price cannot be negative',
      'any.required': 'Unit price is required',
    }),

  // Discount (Requirement 4.5)
  discount: Joi.number()
    .min(0)
    .max(100)
    .default(0)
    .messages({
      'number.min': 'Discount cannot be negative',
      'number.max': 'Discount cannot exceed 100%',
    }),

  // Unit rate offered (Requirement 4.6)
  unitRateOffered: Joi.number()
    .min(0)
    .optional()
    .messages({
      'number.min': 'Unit rate offered cannot be negative',
    }),

  gstRate: Joi.number()
    .valid(0, 4, 18)
    .default(18)
    .messages({
      'any.only': 'GST rate must be 0, 4, or 18',
    }),
});

// Create quotation schema (Requirement 4.1-4.10)
const createQuotationSchema = Joi.object({
  // Quotation date (Requirement 4.1)
  quotationDate: Joi.date()
    .default(() => new Date())
    .messages({
      'date.base': 'Invalid quotation date format',
    }),

  // Customer selection (Requirement 4.2)
  customerId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid customer ID format',
      'any.required': 'Customer ID is required',
    }),

  // Reference number (Requirement 4.3)
  referenceNumber: Joi.string()
    .trim()
    .max(100)
    .optional()
    .allow('', null)
    .messages({
      'string.max': 'Reference number cannot exceed 100 characters',
    }),

  tenderNumber: Joi.string()
    .trim()
    .max(100)
    .optional()
    .allow('', null),

  customerReference: Joi.string()
    .trim()
    .max(100)
    .optional()
    .allow('', null),

  salesmanId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .optional()
    .allow(null)
    .messages({
      'string.pattern.base': 'Invalid salesman ID format',
    }),

  // Items (Requirement 4.5, 4.6)
  items: Joi.array()
    .items(quotationItemSchema)
    .min(1)
    .required()
    .messages({
      'array.min': 'At least one item is required',
      'any.required': 'Items array is required',
    }),

  // Validity period (Requirement 4.8)
  validUntil: Joi.date()
    .optional()
    .messages({
      'date.base': 'Invalid valid until date format',
    }),

  validityPeriod: Joi.string()
    .trim()
    .max(100)
    .default('One Month')
    .messages({
      'string.max': 'Validity period cannot exceed 100 characters',
    }),

  // Terms and conditions (Requirement 4.9)
  termsAndConditions: Joi.string()
    .trim()
    .max(2000)
    .optional()
    .allow('', null)
    .messages({
      'string.max': 'Terms and conditions cannot exceed 2000 characters',
    }),

  // Column visibility settings (Requirement 4.4, 4.7)
  columnVisibility: Joi.object({
    company: Joi.boolean().default(true),
    boxPacking: Joi.boolean().default(true),
    unitRetail: Joi.boolean().default(true),
    unitTP: Joi.boolean().default(true),
    discount: Joi.boolean().default(true),
    unitRateOffered: Joi.boolean().default(true),
    boxQuantity: Joi.boolean().default(true),
    unitQuantity: Joi.boolean().default(true),
    unitPrice: Joi.boolean().default(true),
    gstRate: Joi.boolean().default(true),
    gstAmount: Joi.boolean().default(true),
    lineTotal: Joi.boolean().default(true),
  }).optional(),

  notes: Joi.string()
    .trim()
    .max(1000)
    .optional()
    .allow('', null)
    .messages({
      'string.max': 'Notes cannot exceed 1000 characters',
    }),

  status: Joi.string()
    .valid('draft', 'sent')
    .default('draft')
    .messages({
      'any.only': 'Status must be either "draft" or "sent"',
    }),
}).custom((value, helpers) => {
  // Validate validUntil is after quotation date
  if (value.validUntil && value.quotationDate && value.validUntil < value.quotationDate) {
    return helpers.error('any.custom', {
      message: 'Valid until date cannot be before quotation date',
    });
  }
  return value;
});

// Update quotation schema
const updateQuotationSchema = Joi.object({
  quotationDate: Joi.date()
    .optional(),

  customerId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .optional(),

  referenceNumber: Joi.string()
    .trim()
    .max(100)
    .optional()
    .allow('', null),

  tenderNumber: Joi.string()
    .trim()
    .max(100)
    .optional()
    .allow('', null),

  customerReference: Joi.string()
    .trim()
    .max(100)
    .optional()
    .allow('', null),

  salesmanId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .optional()
    .allow(null),

  items: Joi.array()
    .items(quotationItemSchema)
    .min(1)
    .optional(),

  validUntil: Joi.date()
    .optional(),

  validityPeriod: Joi.string()
    .trim()
    .max(100)
    .optional(),

  termsAndConditions: Joi.string()
    .trim()
    .max(2000)
    .optional()
    .allow('', null),

  columnVisibility: Joi.object({
    company: Joi.boolean().optional(),
    boxPacking: Joi.boolean().optional(),
    unitRetail: Joi.boolean().optional(),
    unitTP: Joi.boolean().optional(),
    discount: Joi.boolean().optional(),
    unitRateOffered: Joi.boolean().optional(),
    boxQuantity: Joi.boolean().optional(),
    unitQuantity: Joi.boolean().optional(),
    unitPrice: Joi.boolean().optional(),
    gstRate: Joi.boolean().optional(),
    gstAmount: Joi.boolean().optional(),
    lineTotal: Joi.boolean().optional(),
  }).optional(),

  notes: Joi.string()
    .trim()
    .max(1000)
    .optional()
    .allow('', null),

  status: Joi.string()
    .valid('draft', 'sent', 'approved', 'expired', 'cancelled')
    .optional(),
}).min(1).messages({
  'object.min': 'At least one field must be provided for update',
});

// Send quotation schema (Requirement 4.12)
const sendQuotationSchema = Joi.object({
  // No body required, just marks as sent
});

// Convert quotation schema (Requirement 4.14, 4.15)
const convertQuotationSchema = Joi.object({
  convertTo: Joi.string()
    .valid('invoice', 'order')
    .required()
    .messages({
      'any.only': 'Convert to must be either "invoice" or "order"',
      'any.required': 'Convert to type is required',
    }),

  // Optional fields for invoice conversion
  invoiceDate: Joi.date()
    .optional()
    .default(() => new Date()),

  dueDate: Joi.date()
    .optional(),

  creditDays: Joi.number()
    .min(0)
    .optional()
    .default(0),

  notes: Joi.string()
    .trim()
    .max(1000)
    .optional()
    .allow('', null),
});

module.exports = {
  createQuotationSchema,
  updateQuotationSchema,
  sendQuotationSchema,
  convertQuotationSchema,
};
