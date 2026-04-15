const customerRepository = require('../repositories/customerRepository');

/**
 * Customer Service
 * Handles business logic for customer management
 */
class CustomerService {
  /**
   * Get customer by ID
   */
  async getCustomerById(id) {
    const customer = await customerRepository.findById(id);
    if (!customer) {
      throw new Error('Customer not found');
    }
    return customer;
  }

  /**
   * Get customer by code
   */
  async getCustomerByCode(code) {
    const customer = await customerRepository.findByCode(code);
    if (!customer) {
      throw new Error('Customer not found');
    }
    return customer;
  }

  /**
   * Get all customers with advanced filtering and pagination
   * @param {Object} filters - Filter criteria
   * @param {string} [filters.keyword] - Search keyword
   * @param {string} [filters.type] - Customer type
   * @param {string} [filters.city] - City filter
   * @param {string} [filters.state] - State filter
   * @param {string} [filters.country] - Country filter
   * @param {boolean} [filters.isActive] - Active status filter
   * @param {Date} [filters.createdFrom] - Created from date
   * @param {Date} [filters.createdTo] - Created to date
   * @param {Object} options - Query options
   * @param {number} [options.page=1] - Page number
   * @param {number} [options.limit=10] - Items per page
   * @param {Object} [options.sort] - Sort criteria
   * @returns {Promise<Object>} - Paginated result with customers and pagination info
   */
  async getAllCustomers(filters = {}, options = {}) {
    const {
      page = 1, limit = 10, sort, ...otherOptions
    } = options;
    const skip = (page - 1) * limit;

    const [customers, total] = await Promise.all([
      customerRepository.search(filters, {
        ...otherOptions, limit, skip, sort,
      }),
      customerRepository.count(filters),
    ]);

    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    return {
      customers,
      pagination: {
        totalItems: total,
        totalPages,
        currentPage: page,
        itemsPerPage: limit,
        hasNextPage,
        hasPreviousPage,
        nextPage: hasNextPage ? page + 1 : null,
        previousPage: hasPreviousPage ? page - 1 : null,
      },
    };
  }

  /**
   * Get all active customers
   */
  async getActiveCustomers() {
    return customerRepository.findAllActive();
  }

  /**
   * Get customers by type
   */
  async getCustomersByType(type) {
    this.validateType(type);
    return customerRepository.findByType(type);
  }

  /**
   * Create new customer
   */
  async createCustomer(customerData) {
    const normalizedData = this.normalizeCustomerPayload(customerData);
    const { code, name, type } = normalizedData;

    // Validate required fields
    if (!name) {
      throw new Error('Customer name is required');
    }

    // Validate type
    if (type) {
      this.validateType(type);
    }

    // Check if code already exists (if provided)
    if (code) {
      const codeExists = await customerRepository.codeExists(code);
      if (codeExists) {
        throw new Error('Customer code already exists');
      }
    }

    // Validate credit limit
    if (normalizedData.financialInfo?.creditLimit !== undefined) {
      if (normalizedData.financialInfo.creditLimit < 0) {
        throw new Error('Credit limit cannot be negative');
      }
    }

    // Validate payment terms
    if (normalizedData.financialInfo?.paymentTerms !== undefined) {
      if (normalizedData.financialInfo.paymentTerms < 0 || normalizedData.financialInfo.paymentTerms > 365) {
        throw new Error('Payment terms must be between 0 and 365 days');
      }
    }

    // Validate email format if provided
    if (normalizedData.contactInfo?.email) {
      const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
      if (!emailRegex.test(normalizedData.contactInfo.email)) {
        throw new Error('Invalid email format');
      }
    }

    return customerRepository.create(normalizedData);
  }

  /**
   * Update customer
   */
  async updateCustomer(id, updateData) {
    // Check if customer exists
    const existingCustomer = await customerRepository.findById(id);
    if (!existingCustomer) {
      throw new Error('Customer not found');
    }

    const normalizedUpdateData = this.normalizeCustomerPayload(updateData, existingCustomer);

    // Validate type if provided
    if (normalizedUpdateData.type) {
      this.validateType(normalizedUpdateData.type);
    }

    // Check code uniqueness if changing code
    if (normalizedUpdateData.code && normalizedUpdateData.code !== existingCustomer.code) {
      const codeExists = await customerRepository.codeExists(normalizedUpdateData.code, id);
      if (codeExists) {
        throw new Error('Customer code already exists');
      }
    }

    // Validate credit limit
    if (normalizedUpdateData.financialInfo?.creditLimit !== undefined) {
      if (normalizedUpdateData.financialInfo.creditLimit < 0) {
        throw new Error('Credit limit cannot be negative');
      }
    }

    // Validate payment terms
    if (normalizedUpdateData.financialInfo?.paymentTerms !== undefined) {
      if (normalizedUpdateData.financialInfo.paymentTerms < 0 || normalizedUpdateData.financialInfo.paymentTerms > 365) {
        throw new Error('Payment terms must be between 0 and 365 days');
      }
    }

    // Validate email format if provided
    if (normalizedUpdateData.contactInfo?.email) {
      const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
      if (!emailRegex.test(normalizedUpdateData.contactInfo.email)) {
        throw new Error('Invalid email format');
      }
    }

    return customerRepository.update(id, normalizedUpdateData);
  }

  /**
   * Delete customer (soft delete)
   */
  async deleteCustomer(id) {
    const customer = await customerRepository.findById(id);
    if (!customer) {
      throw new Error('Customer not found');
    }

    return customerRepository.softDelete(id);
  }

  /**
   * Permanently delete customer
   */
  async permanentlyDeleteCustomer(id) {
    const customer = await customerRepository.findById(id);
    if (!customer) {
      throw new Error('Customer not found');
    }

    return customerRepository.hardDelete(id);
  }

  /**
   * Restore soft-deleted customer
   */
  async restoreCustomer(id) {
    const customer = await customerRepository.findById(id);
    if (!customer) {
      throw new Error('Customer not found');
    }

    if (customer.isActive) {
      throw new Error('Customer is already active');
    }

    return customerRepository.restore(id);
  }

  /**
   * Search customers
   */
  async searchCustomers(keyword, options = {}) {
    if (!keyword || keyword.trim().length === 0) {
      throw new Error('Search keyword is required');
    }
    return customerRepository.search(keyword.trim(), options);
  }

  /**
   * Get paginated customers
   */
  async getPaginatedCustomers(page = 1, limit = 10, filters = {}, sort = { createdAt: -1 }) {
    // Validate pagination parameters
    if (page < 1) {
      throw new Error('Page number must be greater than 0');
    }

    if (limit < 1 || limit > 100) {
      throw new Error('Limit must be between 1 and 100');
    }

    return customerRepository.paginate(page, limit, filters, sort);
  }

  /**
   * Get customer statistics
   */
  async getCustomerStatistics() {
    return customerRepository.getStatistics();
  }

  /**
   * Validate credit limit for transaction
   */
  async validateCreditLimit(customerId, transactionAmount) {
    const customer = await this.getCustomerById(customerId);

    if (!customer.checkCreditAvailability(transactionAmount)) {
      throw new Error(`Transaction amount exceeds customer credit limit of ${customer.financialInfo.creditLimit}`);
    }

    return true;
  }

  /**
   * Get customers with credit limit
   */
  async getCustomersWithCreditLimit(minLimit = 0) {
    return customerRepository.findWithCreditLimit(minLimit);
  }

  /**
   * Normalize mixed payload formats (flat + nested) into schema-compatible structure.
   * This keeps older and newer frontend forms writing full data to Customer documents.
   */
  normalizeCustomerPayload(payload = {}, existingCustomer = null) {
    const normalized = { ...payload };

    if (typeof normalized.name === 'string') normalized.name = normalized.name.trim();
    if (typeof normalized.code === 'string') normalized.code = normalized.code.trim();

    // Keep type aligned even when account-centric payload is sent.
    if (!this.hasValue(normalized.type)) {
      if (this.hasValue(normalized.accountType) && ['customer', 'supplier', 'both'].includes(normalized.accountType)) {
        normalized.type = normalized.accountType;
      } else if (!existingCustomer) {
        normalized.type = 'regular';
      }
    }

    // CONTACT
    normalized.contactInfo = {
      ...(existingCustomer?.contactInfo || {}),
      ...(normalized.contactInfo || {}),
    };
    const contactAliases = [
      'email', 'phone', 'phone1', 'phone2', 'phone3', 'whatsapp', 'proprietorWhatsapp',
      'storeInchargeWhatsapp', 'messageNumber', 'address', 'guarantorAddress',
      'deliveryLocation', 'locationPinPoint', 'city', 'town', 'country', 'nicNumber', 'mobile',
    ];
    contactAliases.forEach((field) => {
      if (this.hasValue(normalized[field]) && !this.hasValue(normalized.contactInfo[field])) {
        normalized.contactInfo[field] = normalized[field];
      }
    });

    // EMPLOYEE BIODATA
    normalized.employeeBiodata = {
      ...(existingCustomer?.employeeBiodata || {}),
      ...(normalized.employeeBiodata || {}),
    };
    const employeeAliases = [
      'fatherName', 'fatherNIC', 'dateOfAppointment', 'guarantorName', 'guarantorNIC', 'emergencyContact',
      'bloodGroup', 'permanentAddress', 'designationId', 'experience', 'salaryPosition',
      'proprietorName', 'storeInchargeName', 'department', 'dateOfBirth', 'dateOfJoining',
    ];
    employeeAliases.forEach((field) => {
      if (this.hasValue(normalized[field]) && !this.hasValue(normalized.employeeBiodata[field])) {
        normalized.employeeBiodata[field] = normalized[field];
      }
    });
    if (this.hasValue(normalized.guarantorPhone) && !this.hasValue(normalized.employeeBiodata.guarantorPhone)) {
      normalized.employeeBiodata.guarantorPhone = normalized.guarantorPhone;
    }
    if (this.hasValue(normalized.basicPay) && !this.hasValue(normalized.employeeBiodata.basicPay)) {
      normalized.employeeBiodata.basicPay = this.toNumber(normalized.basicPay, 0);
    }

    // BUSINESS DETAILS
    normalized.businessDetails = {
      ...(existingCustomer?.businessDetails || {}),
      ...(normalized.businessDetails || {}),
    };
    const creditDaysLimit = this.toNumber(
      this.hasValue(normalized.creditDaysLimit) ? normalized.creditDaysLimit : normalized.businessDetails.creditDaysLimit,
      undefined,
    );
    const creditAmountLimit = this.toNumber(
      this.hasValue(normalized.creditAmountLimit) ? normalized.creditAmountLimit : normalized.businessDetails.creditAmountLimit,
      undefined,
    );
    const openingBalance = this.toNumber(
      this.hasValue(normalized.openingBalance) ? normalized.openingBalance : normalized.businessDetails.openingBalance,
      undefined,
    );
    const balanceType = this.hasValue(normalized.balanceType) ? normalized.balanceType : normalized.businessDetails.balanceType;

    if (creditDaysLimit !== undefined) normalized.businessDetails.creditDaysLimit = creditDaysLimit;
    if (creditAmountLimit !== undefined) normalized.businessDetails.creditAmountLimit = creditAmountLimit;
    if (openingBalance !== undefined) normalized.businessDetails.openingBalance = openingBalance;
    if (this.hasValue(balanceType)) normalized.businessDetails.balanceType = balanceType;
    if (this.hasValue(normalized.assignedSalesmanId) && !this.hasValue(normalized.businessDetails.assignedSalesmanId)) {
      normalized.businessDetails.assignedSalesmanId = normalized.assignedSalesmanId;
    }

    // Keep top-level fields populated for code paths that read these directly.
    if (creditDaysLimit !== undefined && !this.hasValue(normalized.creditDaysLimit)) {
      normalized.creditDaysLimit = creditDaysLimit;
    }
    if (creditAmountLimit !== undefined && !this.hasValue(normalized.creditAmountLimit)) {
      normalized.creditAmountLimit = creditAmountLimit;
    }
    if (openingBalance !== undefined && !this.hasValue(normalized.openingBalance)) {
      normalized.openingBalance = openingBalance;
    }
    if (this.hasValue(balanceType) && !this.hasValue(normalized.balanceType)) {
      normalized.balanceType = balanceType;
    }

    // FINANCIAL INFO
    normalized.financialInfo = {
      ...(existingCustomer?.financialInfo || {}),
      ...(normalized.financialInfo || {}),
    };
    const financialAliases = [
      'licenseNo', 'licenseExpiryDate', 'srbNo', 'ntn', 'strn', 'taxNumber', 'nicNumber',
      'currency',
    ];
    financialAliases.forEach((field) => {
      if (this.hasValue(normalized[field]) && !this.hasValue(normalized.financialInfo[field])) {
        normalized.financialInfo[field] = normalized[field];
      }
    });

    const mappedCreditLimit = this.toNumber(
      this.hasValue(normalized.creditLimit)
        ? normalized.creditLimit
        : (creditAmountLimit !== undefined ? creditAmountLimit : normalized.financialInfo.creditLimit),
      undefined,
    );
    if (mappedCreditLimit !== undefined) normalized.financialInfo.creditLimit = mappedCreditLimit;

    const mappedPaymentTerms = this.toNumber(
      this.hasValue(normalized.paymentTerms)
        ? normalized.paymentTerms
        : (creditDaysLimit !== undefined ? creditDaysLimit : normalized.financialInfo.paymentTerms),
      undefined,
    );
    if (mappedPaymentTerms !== undefined) normalized.financialInfo.paymentTerms = mappedPaymentTerms;

    const numericFinancialFields = [
      'whtPercent',
      'advanceWhtPercent',
      'incomeTaxDeductionPercent',
      'profitSharePercent',
      'advanceTaxRate',
      'creditDays',
    ];
    numericFinancialFields.forEach((field) => {
      if (this.hasValue(normalized[field]) && !this.hasValue(normalized.financialInfo[field])) {
        normalized.financialInfo[field] = this.toNumber(normalized[field], 0);
      }
    });

    if (this.hasValue(normalized.isNonFiler) && !this.hasValue(normalized.financialInfo.isNonFiler)) {
      normalized.financialInfo.isNonFiler = !!normalized.isNonFiler;
    }

    // BANKING
    normalized.bankingInfo = {
      ...(existingCustomer?.bankingInfo || {}),
      ...(normalized.bankingInfo || {}),
    };
    normalized.bankingInfo2 = {
      ...(existingCustomer?.bankingInfo2 || {}),
      ...(normalized.bankingInfo2 || {}),
    };
    normalized.bankingInfo3 = {
      ...(existingCustomer?.bankingInfo3 || {}),
      ...(normalized.bankingInfo3 || {}),
    };

    if (this.hasValue(normalized.bankName) && !this.hasValue(normalized.bankingInfo.bankName)) {
      normalized.bankingInfo.bankName = normalized.bankName;
    }
    if (this.hasValue(normalized.accountNumber) && !this.hasValue(normalized.bankingInfo.accountNumber)) {
      normalized.bankingInfo.accountNumber = normalized.accountNumber;
    }
    if (this.hasValue(normalized.branch) && !this.hasValue(normalized.bankingInfo.branch)) {
      normalized.bankingInfo.branch = normalized.branch;
    }
    if (this.hasValue(normalized.bankName1) && !this.hasValue(normalized.bankingInfo.bankName)) {
      normalized.bankingInfo.bankName = normalized.bankName1;
    }
    if (this.hasValue(normalized.accountNumber1) && !this.hasValue(normalized.bankingInfo.accountNumber)) {
      normalized.bankingInfo.accountNumber = normalized.accountNumber1;
    }
    if (this.hasValue(normalized.branch1) && !this.hasValue(normalized.bankingInfo.branch)) {
      normalized.bankingInfo.branch = normalized.branch1;
    }

    if (this.hasValue(normalized.bankName2) && !this.hasValue(normalized.bankingInfo2.bankName)) {
      normalized.bankingInfo2.bankName = normalized.bankName2;
    }
    if (this.hasValue(normalized.accountNumber2) && !this.hasValue(normalized.bankingInfo2.accountNumber)) {
      normalized.bankingInfo2.accountNumber = normalized.accountNumber2;
    }
    if (this.hasValue(normalized.branch2) && !this.hasValue(normalized.bankingInfo2.branch)) {
      normalized.bankingInfo2.branch = normalized.branch2;
    }

    if (this.hasValue(normalized.bankName3) && !this.hasValue(normalized.bankingInfo3.bankName)) {
      normalized.bankingInfo3.bankName = normalized.bankName3;
    }
    if (this.hasValue(normalized.accountNumber3) && !this.hasValue(normalized.bankingInfo3.accountNumber)) {
      normalized.bankingInfo3.accountNumber = normalized.accountNumber3;
    }
    if (this.hasValue(normalized.branch3) && !this.hasValue(normalized.bankingInfo3.branch)) {
      normalized.bankingInfo3.branch = normalized.branch3;
    }

    // SIGNATURES
    normalized.signatures = {
      ...(existingCustomer?.signatures || {}),
      ...(normalized.signatures || {}),
    };
    if (this.hasValue(normalized.signatureIndusTraders) && !this.hasValue(normalized.signatures.indusTraders)) {
      normalized.signatures.indusTraders = normalized.signatureIndusTraders;
    }
    if (this.hasValue(normalized.signatureEmployee) && !this.hasValue(normalized.signatures.employee)) {
      normalized.signatures.employee = normalized.signatureEmployee;
    }
    if (this.hasValue(normalized.signatureGuarantor) && !this.hasValue(normalized.signatures.guarantor)) {
      normalized.signatures.guarantor = normalized.signatureGuarantor;
    }

    // Keep current balance aligned with opening balance on create when balance not explicitly set.
    if (!existingCustomer && !this.hasValue(normalized.currentBalance) && openingBalance !== undefined) {
      const normalizedBalanceType = this.hasValue(balanceType) ? balanceType : 'debit';
      normalized.currentBalance = normalizedBalanceType === 'credit'
        ? -Math.abs(openingBalance)
        : Math.abs(openingBalance);
    }

    if (this.hasValue(normalized.dueInvoiceQty)) {
      normalized.dueInvoiceQty = this.toNumber(normalized.dueInvoiceQty, 0);
    }

    return normalized;
  }

  hasValue(value) {
    return value !== undefined && value !== null && !(typeof value === 'string' && value.trim() === '');
  }

  toNumber(value, fallback = undefined) {
    if (!this.hasValue(value)) {
      return fallback;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  /**
   * Validate customer type
   */
  validateType(type) {
    const validTypes = ['retail', 'wholesale', 'distributor', 'regular', 'customer', 'supplier', 'both'];
    if (!validTypes.includes(type)) {
      throw new Error(`Invalid type. Must be one of: ${validTypes.join(', ')}`);
    }
  }

  /**
   * Bulk create customers
   */
  async bulkCreateCustomers(customersData) {
    if (!Array.isArray(customersData) || customersData.length === 0) {
      throw new Error('Customers data must be a non-empty array');
    }

    // Validate each customer
    const validatedCustomers = [];
    const errors = [];

    for (let i = 0; i < customersData.length; i += 1) {
      const customerData = customersData[i];
      try {
        // Validate required fields
        if (!customerData.name) {
          throw new Error('Customer name is required');
        }

        // Validate type
        if (customerData.type) {
          this.validateType(customerData.type);
        }

        // Check for duplicate code in batch
        if (customerData.code) {
          const duplicateCode = validatedCustomers.find((c) => c.code === customerData.code);
          if (duplicateCode) {
            throw new Error(`Duplicate code in batch: ${customerData.code}`);
          }

          // Check if code exists in database
          const codeExists = await customerRepository.codeExists(customerData.code);
          if (codeExists) {
            throw new Error(`Code already exists: ${customerData.code}`);
          }
        }

        // Validate email format if provided
        if (customerData.contactInfo?.email) {
          const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
          if (!emailRegex.test(customerData.contactInfo.email)) {
            throw new Error('Invalid email format');
          }
        }

        validatedCustomers.push(customerData);
      } catch (error) {
        errors.push({
          index: i,
          name: customerData.name,
          error: error.message,
        });
      }
    }

    if (errors.length > 0) {
      const errorMessage = errors.map((e) => `Index ${e.index} (${e.name}): ${e.error}`).join('; ');
      throw new Error(`Validation failed: ${errorMessage}`);
    }

    return customerRepository.bulkCreate(validatedCustomers);
  }

  /**
   * Get accounts by town
   * Phase 2 - Requirement 15.2
   * @param {string} town - Town name
   * @returns {Promise<Array>} - List of customers in the town
   */
  async getAccountsByTown(town) {
    if (!town) {
      throw new Error('Town is required');
    }

    // Use case-insensitive regex for town search
    const filters = {
      'contactInfo.town': new RegExp(`^${town}$`, 'i'),
      isActive: true,
    };

    const customers = await customerRepository.findAll(filters, { sort: { name: 1 } });

    // Note: Balance information would typically be calculated from the Ledger or Invoice service.
    // For now, we return the customer details. In a full implementation, we would inject
    // the balance service here to populate current balances.

    return customers;
  }

  /**
   * Get accounts by route
   * Phase 2 - Requirement 17.2
   * @param {string} routeId - Route ID
   * @returns {Promise<Array>} - List of customers on the route
   */
  async getAccountsByRoute(routeId) {
    if (!routeId) {
      throw new Error('Route ID is required');
    }

    // Validate route exists
    const Route = require('../models/Route');
    const route = await Route.findById(routeId);
    if (!route) {
      throw new Error('Route not found');
    }

    const filters = {
      routeId,
      isActive: true,
    };

    return customerRepository.findAll(filters, { sort: { name: 1 } });
  }

  /**
   * Toggle customer active status
   */
  async toggleCustomerStatus(id) {
    const customer = await customerRepository.findById(id);
    if (!customer) {
      throw new Error('Customer not found');
    }

    return customerRepository.update(id, { isActive: !customer.isActive });
  }
}

module.exports = new CustomerService();
