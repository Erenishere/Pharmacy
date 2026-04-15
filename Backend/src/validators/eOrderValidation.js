const Joi = require('joi');

/**
 * E-Order Validation Schemas
 * Comprehensive validation for e-order booking system
 * Requirements: 3.1-3.20 from sales-management/requirements.md
 */

// E-Order item schema
const eOrderItemSchema = Joi.object({
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
    .optional(),

  // Formula size for item selection (Requirement 3.4)
  formulaSize: Joi.string()
    .trim()
    .max(100)
    .optional()
    .allow('', null),

  companyName: Joi.string()
    .trim()
    .max(200)
    .optional(),

  // Sale quantities (Requirement 3.5)
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

  // Scheme quantity (Requirement 3.6)
  schemeUnitQty: Joi.number()
    .min(0)
    .default(0)
    .messages({
      'number.min': 'Scheme unit quantity cannot be negative',
    }),

  scheme1Quantity: Joi.number()
    .min(0)
    .default(0)
    .optional(),

  scheme2Quantity: Joi.number()
    .min(0)
    .default(0)
    .optional(),

  // Rate with GST (Requirement 3.7)
  unitPrice: Joi.number()
    .min(0)
    .required()
    .messages({
      'number.min': 'Unit price cannot be negative',
      'any.required': 'Unit price is required',
    }),

  rateWithGST: Joi.number()
    .min(0)
    .optional()
    .messages({
      'number.min': 'Rate with GST cannot be negative',
    }),

  // Discount (Requirement 3.8)
  discount: Joi.number()
    .min(0)
    .max(100)
    .default(0)
    .messages({
      'number.min': 'Discount cannot be negative',
      'number.max': 'Discount cannot exceed 100%',
    }),

  gstRate: Joi.number()
    .valid(0, 4, 18)
    .default(18)
    .messages({
      'any.only': 'GST rate must be 0, 4, or 18',
    }),

  // Available quantity display (Requirement 3.4)
  availableQuantity: Joi.number()
    .min(0)
    .optional()
    .messages({
      'number.min': 'Available quantity cannot be negative',
    }),

  batchNumber: Joi.string()
    .trim()
    .max(50)
    .optional()
    .allow('', null),

  expiryDate: Joi.date()
    .optional()
    .allow(null),
}).custom((value, helpers) => {
  // At least one quantity must be provided
  if ((value.boxQuantity || 0) === 0 && (value.unitQuantity || 0) === 0) {
    return helpers.error('any.custom', {
      message: 'At least one of box quantity or unit quantity must be greater than 0',
    });
  }
  return value;
});

// Create e-order schema (Requirement 3.1-3.13)
const createEOrderSchema = Joi.object({
  // Customer selection (Requirement 3.2)
  customerId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid customer ID format',
      'any.required': 'Customer ID is required',
    }),

  // Order date (Requirement 3.3)
  orderDate: Joi.date()
    .default(() => new Date())
    .messages({
      'date.base': 'Invalid order date format',
    }),

  // Salesman (Requirement 3.12)
  salesmanId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .optional()
    .allow(null)
    .messages({
      'string.pattern.base': 'Invalid salesman ID format',
    }),

  routeId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .optional()
    .allow(null)
    .messages({
      'string.pattern.base': 'Invalid route ID format',
    }),

  // Items (Requirement 3.4-3.10)
  items: Joi.array()
    .items(eOrderItemSchema)
    .min(1)
    .required()
    .messages({
      'array.min': 'At least one item is required',
      'any.required': 'Items array is required',
    }),

  notes: Joi.string()
    .trim()
    .max(1000)
    .optional()
    .allow('', null)
    .messages({
      'string.max': 'Notes cannot exceed 1000 characters',
    }),

  // Status (Requirement 3.13)
  status: Joi.string()
    .valid('pending', 'approved')
    .default('pending')
    .messages({
      'any.only': 'Status must be either "pending" or "approved"',
    }),

  // Mobile sync support (Requirement 3.20)
  mobileSync: Joi.object({
    deviceId: Joi.string()
      .trim()
      .optional(),

    offlineCreated: Joi.boolean()
      .default(false),
  }).optional(),
});

// Update e-order schema (only for pending orders)
const updateEOrderSchema = Joi.object({
  customerId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .optional(),

  orderDate: Joi.date()
    .optional(),

  salesmanId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .optional()
    .allow(null),

  routeId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .optional()
    .allow(null),

  items: Joi.array()
    .items(eOrderItemSchema)
    .min(1)
    .optional(),

  notes: Joi.string()
    .trim()
    .max(1000)
    .optional()
    .allow('', null),
}).min(1).messages({
  'object.min': 'At least one field must be provided for update',
});

// Approve e-order schema (Requirement 3.15)
const approveEOrderSchema = Joi.object({
  // No body required, just ID in params
});

// Cancel e-order schema (Requirement 3.18)
const cancelEOrderSchema = Joi.object({
  reason: Joi.string()
    .trim()
    .max(500)
    .optional()
    .allow('', null)
    .messages({
      'string.max': 'Cancellation reason cannot exceed 500 characters',
    }),
});

// Convert to invoice schema (Requirement 3.16, 3.17)
const convertToInvoiceSchema = Joi.object({
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

// Sync from mobile schema (Requirement 3.20)
const syncFromMobileSchema = Joi.object({
  orders: Joi.array()
    .items(createEOrderSchema)
    .min(1)
    .required()
    .messages({
      'array.min': 'At least one order is required for sync',
      'any.required': 'Orders array is required',
    }),

  deviceId: Joi.string()
    .trim()
    .required()
    .messages({
      'any.required': 'Device ID is required for sync',
    }),
});

module.exports = {
  createEOrderSchema,
  updateEOrderSchema,
  approveEOrderSchema,
  cancelEOrderSchema,
  convertToInvoiceSchema,
  syncFromMobileSchema,
};
