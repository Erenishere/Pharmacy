/**
 * Business Rules Validation Middleware
 * Implements complex business logic validations for sales management
 * Requirements: 1.34-1.46, 8.1-8.10, 9.1-9.10 from sales-management/requirements.md
 */

const Item = require('../models/Item');
const Customer = require('../models/Customer');
const Batch = require('../models/Batch');
const Invoice = require('../models/Invoice');
const Warehouse = require('../models/Warehouse');
const { AppError } = require('../utils/errors');

/**
 * Validate stock availability for all items in invoice
 * Requirement 1.34: Prevent overselling
 * Requirement 1.45: Display error when stock insufficient
 */
const validateStockAvailability = async (req, res, next) => {
  try {
    const { items } = req.body;

    if (!items || items.length === 0) {
      return next();
    }

    const stockErrors = [];

    for (const item of items) {
      const {
        itemId, warehouseId, boxQuantity = 0, unitQuantity = 0, scheme1Quantity = 0, scheme2Quantity = 0,
      } = item;

      // Get item details
      const itemDoc = await Item.findById(itemId);
      if (!itemDoc) {
        stockErrors.push({
          itemId,
          message: 'Item not found',
        });
        continue;
      }

      // Calculate total required quantity
      const boxPacking = itemDoc.boxPacking || 1;
      const totalBoxUnits = boxQuantity * boxPacking;
      const totalRequired = totalBoxUnits + unitQuantity + scheme1Quantity + scheme2Quantity;

      // Check warehouse stock if warehouse specified
      if (warehouseId) {
        const warehouse = await Warehouse.findById(warehouseId);
        if (!warehouse) {
          stockErrors.push({
            itemId,
            itemName: itemDoc.itemName,
            message: 'Warehouse not found',
          });
          continue;
        }

        // Get warehouse-specific stock
        const warehouseStock = itemDoc.warehouseStock?.find(
          (ws) => ws.warehouseId.toString() === warehouseId.toString(),
        );

        const availableStock = warehouseStock?.quantity || 0;

        if (totalRequired > availableStock) {
          stockErrors.push({
            itemId,
            itemName: itemDoc.itemName,
            warehouseId,
            warehouseName: warehouse.name,
            required: totalRequired,
            available: availableStock,
            message: `Insufficient stock in warehouse. Required: ${totalRequired}, Available: ${availableStock}`,
          });
        }
      } else {
        // Check total stock
        const availableStock = itemDoc.currentStock || 0;

        if (totalRequired > availableStock) {
          stockErrors.push({
            itemId,
            itemName: itemDoc.itemName,
            required: totalRequired,
            available: availableStock,
            message: `Insufficient stock. Required: ${totalRequired}, Available: ${availableStock}`,
          });
        }
      }
    }

    if (stockErrors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient stock',
        message: 'One or more items have insufficient stock',
        details: stockErrors,
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Validate credit limit for customer
 * Requirement 1.35: Check credit limit
 * Requirement 1.46: Warn but allow override with authorization
 * Requirement 8.1-8.10: Credit management
 */
const validateCreditLimit = async (req, res, next) => {
  try {
    const { customerId, totals } = req.body;

    if (!customerId) {
      return next();
    }

    // Get customer details
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found',
        message: 'The specified customer does not exist',
      });
    }

    // Calculate invoice total (use provided totals or estimate)
    let invoiceTotal = 0;
    if (totals && totals.grandTotal) {
      invoiceTotal = totals.grandTotal;
    } else if (req.body.items) {
      // Estimate total from items
      invoiceTotal = req.body.items.reduce((sum, item) => {
        const boxTotal = (item.boxQuantity || 0) * (item.boxRate || item.unitPrice || 0);
        const unitTotal = (item.unitQuantity || 0) * (item.unitRate || item.unitPrice || 0);
        return sum + boxTotal + unitTotal;
      }, 0);
    }

    // Get customer's current balance
    const currentBalance = customer.currentBalance || 0;
    const creditLimit = customer.creditLimit || 0;

    // Calculate new balance
    const newBalance = currentBalance + invoiceTotal;

    // Check if credit limit exceeded
    if (newBalance > creditLimit && creditLimit > 0) {
      const exceeded = newBalance - creditLimit;
      const utilizationPercent = ((newBalance / creditLimit) * 100).toFixed(2);

      // Check if override authorization provided
      const hasAuthorization = req.body.creditLimitOverride === true
                               || req.headers['x-credit-override'] === 'true';

      if (!hasAuthorization) {
        // Return warning but don't block (Requirement 1.46)
        return res.status(400).json({
          success: false,
          error: 'Credit limit exceeded',
          message: 'Customer credit limit will be exceeded',
          warning: true,
          requiresAuthorization: true,
          details: {
            customerId: customer._id,
            customerName: customer.name,
            currentBalance,
            creditLimit,
            invoiceTotal,
            newBalance,
            exceeded,
            utilizationPercent,
            availableCredit: Math.max(0, creditLimit - currentBalance),
          },
        });
      }

      // Log the override
      console.log(`Credit limit override authorized for customer ${customer.name} by user ${req.user?.id}`);
      req.creditLimitOverridden = true;
      req.creditLimitDetails = {
        exceeded,
        utilizationPercent,
        authorizedBy: req.user?.id,
      };
    }

    // Check for overdue invoices (Requirement 8.8)
    const overdueInvoices = await Invoice.find({
      customerId,
      dueDate: { $lt: new Date() },
      paymentStatus: { $ne: 'paid' },
      status: { $ne: 'cancelled' },
    });

    if (overdueInvoices.length > 0) {
      req.overdueWarning = {
        count: overdueInvoices.length,
        totalOverdue: overdueInvoices.reduce((sum, inv) => sum + (inv.totals?.grandTotal || 0), 0),
      };
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Validate batch expiry dates
 * Requirement 9.4: Warn if batch near expiry
 * Requirement 9.5: Prevent selling expired batches
 */
const validateBatchExpiry = async (req, res, next) => {
  try {
    const { items } = req.body;

    if (!items || items.length === 0) {
      return next();
    }

    const expiryWarnings = [];
    const expiryErrors = [];
    const nearExpiryDays = 30; // Configurable: warn if expiring within 30 days

    for (const item of items) {
      const { itemId, batchNumber, expiryDate } = item;

      if (!batchNumber && !expiryDate) {
        continue; // Skip if no batch tracking
      }

      let batchDoc = null;
      let expiry = expiryDate;

      // Get batch details if batch number provided
      if (batchNumber) {
        batchDoc = await Batch.findOne({ batchNumber, itemId });
        if (batchDoc) {
          expiry = batchDoc.expiryDate;
        }
      }

      if (expiry) {
        const expiryDateObj = new Date(expiry);
        const today = new Date();
        const daysUntilExpiry = Math.ceil((expiryDateObj - today) / (1000 * 60 * 60 * 24));

        // Check if expired (Requirement 9.5)
        if (daysUntilExpiry < 0) {
          const itemDoc = await Item.findById(itemId);
          expiryErrors.push({
            itemId,
            itemName: itemDoc?.itemName || 'Unknown',
            batchNumber,
            expiryDate: expiry,
            daysExpired: Math.abs(daysUntilExpiry),
            message: `Batch has expired ${Math.abs(daysUntilExpiry)} days ago`,
          });
        }
        // Check if near expiry (Requirement 9.4)
        else if (daysUntilExpiry <= nearExpiryDays) {
          const itemDoc = await Item.findById(itemId);
          expiryWarnings.push({
            itemId,
            itemName: itemDoc?.itemName || 'Unknown',
            batchNumber,
            expiryDate: expiry,
            daysUntilExpiry,
            message: `Batch expires in ${daysUntilExpiry} days`,
          });
        }
      }
    }

    // Block if any expired batches (Requirement 9.5)
    if (expiryErrors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Expired batch',
        message: 'Cannot sell expired batches',
        details: expiryErrors,
      });
    }

    // Attach warnings to request for logging
    if (expiryWarnings.length > 0) {
      req.expiryWarnings = expiryWarnings;
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Validate batch quantity availability
 * Requirement 9.3: Validate batch has sufficient quantity
 */
const validateBatchQuantity = async (req, res, next) => {
  try {
    const { items } = req.body;

    if (!items || items.length === 0) {
      return next();
    }

    const batchErrors = [];

    for (const item of items) {
      const {
        itemId, batchNumber, boxQuantity = 0, unitQuantity = 0, scheme1Quantity = 0, scheme2Quantity = 0,
      } = item;

      if (!batchNumber) {
        continue; // Skip if no batch tracking
      }

      // Get batch details
      const batch = await Batch.findOne({ batchNumber, itemId });
      if (!batch) {
        const itemDoc = await Item.findById(itemId);
        batchErrors.push({
          itemId,
          itemName: itemDoc?.itemName || 'Unknown',
          batchNumber,
          message: 'Batch not found',
        });
        continue;
      }

      // Calculate total required quantity
      const itemDoc = await Item.findById(itemId);
      const boxPacking = itemDoc?.boxPacking || 1;
      const totalBoxUnits = boxQuantity * boxPacking;
      const totalRequired = totalBoxUnits + unitQuantity + scheme1Quantity + scheme2Quantity;

      const availableInBatch = batch.remainingQuantity || 0;

      if (totalRequired > availableInBatch) {
        batchErrors.push({
          itemId,
          itemName: itemDoc?.itemName || 'Unknown',
          batchNumber,
          required: totalRequired,
          available: availableInBatch,
          message: `Insufficient quantity in batch. Required: ${totalRequired}, Available: ${availableInBatch}`,
        });
      }
    }

    if (batchErrors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient batch quantity',
        message: 'One or more batches have insufficient quantity',
        details: batchErrors,
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Validate invoice status for editing
 * Requirement 1.43: Only draft invoices can be edited
 */
const validateInvoiceStatus = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) {
      return next();
    }

    // Get invoice
    const invoice = await Invoice.findById(id);
    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found',
        message: 'The specified invoice does not exist',
      });
    }

    // Check if invoice is in draft status
    if (invoice.status !== 'draft') {
      return res.status(400).json({
        success: false,
        error: 'Invalid invoice status',
        message: `Cannot edit invoice with status "${invoice.status}". Only draft invoices can be edited.`,
        details: {
          invoiceId: invoice._id,
          invoiceNumber: invoice.invoiceNumber,
          currentStatus: invoice.status,
        },
      });
    }

    // Attach invoice to request for use in controller
    req.invoice = invoice;

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Validate date fields
 * Requirement 1.8: Due date validation
 * Requirement 9.4: Expiry date validation
 */
const validateDates = (req, res, next) => {
  try {
    const { invoiceDate, dueDate, expiryDate } = req.body;

    const errors = [];

    // Validate due date is after invoice date
    if (invoiceDate && dueDate) {
      const invDate = new Date(invoiceDate);
      const dueDateObj = new Date(dueDate);

      if (dueDateObj < invDate) {
        errors.push({
          field: 'dueDate',
          message: 'Due date cannot be before invoice date',
        });
      }
    }

    // Validate expiry date is in the future
    if (expiryDate) {
      const expiryDateObj = new Date(expiryDate);
      const today = new Date();

      if (expiryDateObj < today) {
        errors.push({
          field: 'expiryDate',
          message: 'Expiry date cannot be in the past',
        });
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid dates',
        message: 'One or more date fields are invalid',
        details: errors,
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Validate claim account is provided when using scheme 2 or discount 2
 * Requirement 1.18, 1.20: Scheme 2 and Discount 2 require claim account
 */
const validateClaimAccount = (req, res, next) => {
  try {
    const { items, claimAccountId } = req.body;

    if (!items || items.length === 0) {
      return next();
    }

    // Check if any item uses scheme2 or discount2
    const hasScheme2 = items.some((item) => (item.scheme2Quantity || 0) > 0);
    const hasDiscount2 = items.some((item) => (item.discount2Percent || 0) > 0);

    if ((hasScheme2 || hasDiscount2) && !claimAccountId) {
      return res.status(400).json({
        success: false,
        error: 'Claim account required',
        message: 'Claim account is required when using scheme 2 quantities or discount 2',
        details: {
          hasScheme2,
          hasDiscount2,
        },
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Validate e-order can be converted
 * Requirement 3.16: Only approved orders can be converted
 */
const validateEOrderConversion = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) {
      return next();
    }

    const EOrder = require('../models/EOrder');
    const order = await EOrder.findById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
        message: 'The specified e-order does not exist',
      });
    }

    // Check if order is already converted
    if (order.status === 'converted') {
      return res.status(400).json({
        success: false,
        error: 'Order already converted',
        message: 'This order has already been converted to an invoice',
        details: {
          orderId: order._id,
          orderNumber: order.orderNumber,
          convertedInvoiceId: order.convertedInvoiceId,
        },
      });
    }

    // Check if order is cancelled
    if (order.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        error: 'Order cancelled',
        message: 'Cannot convert a cancelled order',
        details: {
          orderId: order._id,
          orderNumber: order.orderNumber,
        },
      });
    }

    // Attach order to request
    req.eOrder = order;

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  validateStockAvailability,
  validateCreditLimit,
  validateBatchExpiry,
  validateBatchQuantity,
  validateInvoiceStatus,
  validateDates,
  validateClaimAccount,
  validateEOrderConversion,
};
