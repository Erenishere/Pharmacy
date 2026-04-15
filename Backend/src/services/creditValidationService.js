const Customer = require('../models/Customer');
const Invoice = require('../models/Invoice');
const AppError = require('../utils/appError');

/**
 * Credit Validation Service
 * Handles customer credit limit validation and checks
 */
class CreditValidationService {
  /**
   * Validate if customer can make a purchase based on credit limit
   * @param {string} customerId - Customer ID
   * @param {number} newInvoiceAmount - New invoice amount
   * @returns {Promise<Object>} Validation result
   */
  async validateCreditLimit(customerId, newInvoiceAmount) {
    try {
      // Get customer with credit information
      const customer = await Customer.findById(customerId);
      if (!customer) {
        throw new AppError('Customer not found', 404);
      }

      // If no credit limit set, allow transaction
      if (!customer.creditLimit || customer.creditLimit === 0) {
        return {
          allowed: true,
          message: 'No credit limit set'
        };
      }

      // Calculate current outstanding balance
      const outstandingBalance = await this.getOutstandingBalance(customerId);

      // Calculate total exposure after this invoice
      const totalExposure = outstandingBalance + newInvoiceAmount;

      // Check if total exposure exceeds credit limit
      if (totalExposure > customer.creditLimit) {
        return {
          allowed: false,
          message: `Credit limit exceeded. Limit: ${customer.creditLimit}, Current Outstanding: ${outstandingBalance}, New Invoice: ${newInvoiceAmount}, Total: ${totalExposure}`,
          creditLimit: customer.creditLimit,
          currentOutstanding: outstandingBalance,
          proposedAmount: newInvoiceAmount,
          totalExposure: totalExposure,
          exceededBy: totalExposure - customer.creditLimit
        };
      }

      // Credit check passed
      return {
        allowed: true,
        message: 'Credit limit check passed',
        creditLimit: customer.creditLimit,
        currentOutstanding: outstandingBalance,
        proposedAmount: newInvoiceAmount,
        totalExposure: totalExposure,
        availableCredit: customer.creditLimit - totalExposure
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Error validating credit limit: ' + error.message, 500);
    }
  }

  /**
   * Get customer's current outstanding balance
   * @param {string} customerId - Customer ID
   * @returns {Promise<number>} Outstanding balance
   */
  async getOutstandingBalance(customerId) {
    try {
      // Aggregate all unpaid/partially paid invoices
      const result = await Invoice.aggregate([
        {
          $match: {
            customerId: customerId,
            type: 'sales',
            status: { $in: ['pending', 'partial'] }
          }
        },
        {
          $group: {
            _id: null,
            totalOutstanding: {
              $sum: { $subtract: ['$totalAmount', '$paidAmount'] }
            }
          }
        }
      ]);

      return result.length > 0 ? result[0].totalOutstanding : 0;
    } catch (error) {
      throw new AppError('Error calculating outstanding balance: ' + error.message, 500);
    }
  }

  /**
   * Get customer credit summary
   * @param {string} customerId - Customer ID
   * @returns {Promise<Object>} Credit summary
   */
  async getCreditSummary(customerId) {
    try {
      const customer = await Customer.findById(customerId);
      if (!customer) {
        throw new AppError('Customer not found', 404);
      }

      const outstandingBalance = await this.getOutstandingBalance(customerId);
      const creditLimit = customer.creditLimit || 0;
      const availableCredit = Math.max(0, creditLimit - outstandingBalance);
      const creditUtilization = creditLimit > 0 ? (outstandingBalance / creditLimit) * 100 : 0;

      return {
        customerId: customer._id,
        customerName: customer.name,
        creditLimit,
        outstandingBalance,
        availableCredit,
        creditUtilization: parseFloat(creditUtilization.toFixed(2)),
        status: creditUtilization > 100 ? 'exceeded' : creditUtilization > 80 ? 'warning' : 'good'
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Error getting credit summary: ' + error.message, 500);
    }
  }

  /**
   * Update customer outstanding balance
   * @param {string} customerId - Customer ID
   * @returns {Promise<void>}
   */
  async updateCustomerBalance(customerId) {
    try {
      const outstandingBalance = await this.getOutstandingBalance(customerId);
      await Customer.findByIdAndUpdate(customerId, {
        currentBalance: outstandingBalance
      });
    } catch (error) {
      throw new AppError('Error updating customer balance: ' + error.message, 500);
    }
  }
}

module.exports = new CreditValidationService();
