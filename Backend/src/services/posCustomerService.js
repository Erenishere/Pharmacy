const Customer = require('../models/Customer');
const AppError = require('../utils/appError');

/**
 * POS Customer Service
 * Optimized customer search for POS operations
 */
class POSCustomerService {
  /**
   * Search customers for POS with minimal data
   * @param {string} query - Search query (name, code, phone)
   * @param {number} limit - Max results (default 20)
   * @returns {Promise<Array>} Minimal customer data
   */
  async searchCustomers(query, limit = 20) {
    if (!query || query.trim().length === 0) {
      return [];
    }

    // Build search query for multiple fields
    const searchQuery = {
      isActive: true,
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { code: { $regex: query, $options: 'i' } },
        { 'contactInfo.phone': { $regex: query, $options: 'i' } },
        { 'contactInfo.phone1': { $regex: query, $options: 'i' } },
        { 'contactInfo.phone2': { $regex: query, $options: 'i' } },
      ],
    };

    // Find customers with minimal fields
    const customers = await Customer.find(searchQuery)
      .select('_id name code contactInfo.phone financialInfo.creditLimit currentBalance businessDetails.creditAmountLimit')
      .limit(limit)
      .lean();

    // Return minimal data with calculated available credit
    return customers.map((customer) => {
      // Use businessDetails.creditAmountLimit if available, otherwise financialInfo.creditLimit
      const creditLimit = customer.businessDetails?.creditAmountLimit
        || customer.financialInfo?.creditLimit || 0;
      const currentBalance = Math.abs(customer.currentBalance || 0);
      const availableCredit = Math.max(0, creditLimit - currentBalance);

      return {
        id: customer._id,
        name: customer.name,
        code: customer.code,
        phone: customer.contactInfo?.phone || '',
        creditLimit,
        currentBalance,
        availableCredit,
      };
    });
  }

  /**
   * Get default walk-in customer
   * @returns {Promise<Object>} Walk-in customer data
   */
  async getWalkInCustomer() {
    // Find or create walk-in customer
    let walkInCustomer = await Customer.findOne({ code: 'CUST-WALKIN' })
      .select('_id name code contactInfo.phone financialInfo.creditLimit currentBalance')
      .lean();

    if (!walkInCustomer) {
      // Create walk-in customer if doesn't exist
      walkInCustomer = await Customer.create({
        code: 'CUST-WALKIN',
        name: 'Walk-In Customer',
        type: 'retail',
        accountType: 'customer',
        isActive: true,
        financialInfo: {
          creditLimit: 0,
        },
        currentBalance: 0,
      });
    }

    return {
      id: walkInCustomer._id,
      name: walkInCustomer.name,
      code: walkInCustomer.code,
      phone: walkInCustomer.contactInfo?.phone || '',
      creditLimit: 0,
      currentBalance: 0,
      availableCredit: 0,
    };
  }
}

module.exports = new POSCustomerService();
