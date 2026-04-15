const Customer = require('../models/Customer');
const LedgerEntry = require('../models/LedgerEntry');
const customerRepository = require('../repositories/customerRepository');

/**
 * Account Service
 * Handles business logic for account management (Customer/Supplier/Employee/Investor)
 * Master Data Management - Requirements 3.1-3.22
 */
class AccountService {
  /**
   * Create new account with type-specific validation
   * Requirements: 3.1-3.22
   */
  async createAccount(accountData, userId) {
    const { accountType, name, parentAccountId } = accountData;

    // Validate required fields
    if (!name) {
      throw new Error('Account name is required');
    }

    if (!accountType) {
      throw new Error('Account type is required');
    }

    // Validate account type
    this.validateAccountType(accountType);

    // Validate parent account if sub-account
    if (parentAccountId) {
      const parentAccount = await customerRepository.findById(parentAccountId);
      if (!parentAccount) {
        throw new Error('Parent account not found');
      }
      if (!parentAccount.isActive) {
        throw new Error('Parent account is not active');
      }
    }

    // Type-specific validation
    if (accountType === 'employee') {
      this.validateEmployeeData(accountData);
    } else if (accountType === 'customer' || accountType === 'supplier' || accountType === 'both') {
      this.validateBusinessData(accountData);
    }

    // Validate credit limits if provided
    if (accountData.businessDetails?.creditAmountLimit !== undefined) {
      if (accountData.businessDetails.creditAmountLimit < 0) {
        throw new Error('Credit amount limit cannot be negative');
      }
    }

    if (accountData.businessDetails?.creditDaysLimit !== undefined) {
      if (accountData.businessDetails.creditDaysLimit < 0 || accountData.businessDetails.creditDaysLimit > 365) {
        throw new Error('Credit days limit must be between 0 and 365');
      }
    }

    // Validate email format if provided
    if (accountData.contactInfo?.email) {
      const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
      if (!emailRegex.test(accountData.contactInfo.email)) {
        throw new Error('Invalid email format');
      }
    }

    // Set initial balance from opening balance
    if (accountData.businessDetails?.openingBalance) {
      accountData.currentBalance = accountData.businessDetails.openingBalance;
      if (accountData.businessDetails.balanceType === 'credit') {
        accountData.currentBalance = -Math.abs(accountData.currentBalance);
      } else {
        accountData.currentBalance = Math.abs(accountData.currentBalance);
      }
    }

    // Create account
    const account = await customerRepository.create(accountData);

    // Create opening balance ledger entry if opening balance exists
    if (accountData.businessDetails?.openingBalance && accountData.businessDetails.openingBalance !== 0 && userId) {
      const transactionType = accountData.businessDetails.balanceType === 'debit' ? 'debit' : 'credit';
      await LedgerEntry.create({
        accountId: account._id,
        accountType: 'Customer',
        transactionType,
        amount: Math.abs(accountData.businessDetails.openingBalance),
        description: 'Opening balance',
        referenceType: 'opening_balance',
        transactionDate: new Date(),
        createdBy: userId,
      });
    }

    return account;
  }

  /**
   * Get accounts with filtering by type
   * Requirements: 3.1-3.22
   */
  async getAccounts(filters = {}, options = {}) {
    const {
      page = 1, limit = 10, sort, ...otherOptions
    } = options;
    const skip = (page - 1) * limit;

    // Build account-specific filters
    const accountFilters = { ...filters };

    // Handle account type filter
    if (filters.accountType) {
      this.validateAccountType(filters.accountType);
    }

    const [accounts, total] = await Promise.all([
      customerRepository.search(accountFilters, {
        ...otherOptions, limit, skip, sort,
      }),
      customerRepository.count(accountFilters),
    ]);

    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    return {
      accounts,
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
   * Get account by ID with populated references
   * Requirements: 3.1-3.22
   */
  async getAccountById(id) {
    const account = await Customer.findById(id)
      .populate('parentAccountId', 'name code accountType')
      .populate('dimensionId', 'name')
      .populate('townId', 'name')
      .populate('areaId', 'name')
      .populate('employeeBiodata.designationId', 'name')
      .populate('businessDetails.assignedSalesmanId', 'name')
      .lean();

    if (!account) {
      throw new Error('Account not found');
    }

    return account;
  }

  /**
   * Update account
   * Requirements: 3.1-3.22
   */
  async updateAccount(id, updateData, userId) {
    // Check if account exists
    const existingAccount = await customerRepository.findById(id);
    if (!existingAccount) {
      throw new Error('Account not found');
    }

    // Validate account type if provided
    if (updateData.accountType) {
      this.validateAccountType(updateData.accountType);
    }

    // Validate parent account if changing
    if (updateData.parentAccountId && updateData.parentAccountId !== existingAccount.parentAccountId) {
      // Prevent circular reference
      if (updateData.parentAccountId.toString() === id) {
        throw new Error('Account cannot be its own parent');
      }

      const parentAccount = await customerRepository.findById(updateData.parentAccountId);
      if (!parentAccount) {
        throw new Error('Parent account not found');
      }
      if (!parentAccount.isActive) {
        throw new Error('Parent account is not active');
      }

      // Check if parent is a sub-account of this account (prevent circular hierarchy)
      if (parentAccount.parentAccountId && parentAccount.parentAccountId.toString() === id) {
        throw new Error('Cannot create circular account hierarchy');
      }
    }

    // Type-specific validation
    const accountType = updateData.accountType || existingAccount.accountType;
    if (accountType === 'employee' && updateData.employeeBiodata) {
      this.validateEmployeeData(updateData);
    } else if ((accountType === 'customer' || accountType === 'supplier' || accountType === 'both') && updateData.businessDetails) {
      this.validateBusinessData(updateData);
    }

    // Validate credit limits if provided
    if (updateData.businessDetails?.creditAmountLimit !== undefined) {
      if (updateData.businessDetails.creditAmountLimit < 0) {
        throw new Error('Credit amount limit cannot be negative');
      }
    }

    if (updateData.businessDetails?.creditDaysLimit !== undefined) {
      if (updateData.businessDetails.creditDaysLimit < 0 || updateData.businessDetails.creditDaysLimit > 365) {
        throw new Error('Credit days limit must be between 0 and 365');
      }
    }

    // Validate email format if provided
    if (updateData.contactInfo?.email) {
      const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
      if (!emailRegex.test(updateData.contactInfo.email)) {
        throw new Error('Invalid email format');
      }
    }

    return customerRepository.update(id, updateData);
  }

  /**
   * Delete account with transaction check
   * Requirements: 3.1-3.22
   */
  async deleteAccount(id, userId) {
    const account = await customerRepository.findById(id);
    if (!account) {
      throw new Error('Account not found');
    }

    // Check if account has transactions
    const transactionCount = await LedgerEntry.countDocuments({ accountId: id });
    if (transactionCount > 0) {
      throw new Error('Cannot delete account with existing transactions. Please deactivate instead.');
    }

    // Check if account has sub-accounts
    const subAccountCount = await Customer.countDocuments({ parentAccountId: id });
    if (subAccountCount > 0) {
      throw new Error('Cannot delete account with sub-accounts. Please delete or reassign sub-accounts first.');
    }

    return customerRepository.softDelete(id);
  }

  /**
   * Update account balance
   * Requirements: 3.1-3.22
   */
  async updateAccountBalance(id, amount, transactionType, description, referenceType, referenceId, userId) {
    const account = await customerRepository.findById(id);
    if (!account) {
      throw new Error('Account not found');
    }

    if (!account.isActive) {
      throw new Error('Cannot update balance for inactive account');
    }

    // Validate amount
    if (amount <= 0) {
      throw new Error('Amount must be greater than zero');
    }

    // Validate transaction type
    if (!['debit', 'credit'].includes(transactionType)) {
      throw new Error('Transaction type must be either debit or credit');
    }

    // Create ledger entry
    const ledgerEntry = await LedgerEntry.create({
      accountId: id,
      accountType: 'Customer',
      transactionType,
      amount,
      description,
      referenceType: referenceType || 'adjustment',
      referenceId,
      transactionDate: new Date(),
      createdBy: userId,
    });

    // Update account balance
    let newBalance = account.currentBalance || 0;
    if (transactionType === 'debit') {
      newBalance += amount;
    } else {
      newBalance -= amount;
    }

    await customerRepository.update(id, { currentBalance: newBalance });

    return {
      ledgerEntry,
      newBalance,
    };
  }

  /**
   * Check credit limit
   * Requirements: 3.21
   */
  async checkCreditLimit(id, additionalAmount = 0) {
    const account = await customerRepository.findById(id);
    if (!account) {
      throw new Error('Account not found');
    }

    if (!account.businessDetails || !account.businessDetails.creditAmountLimit) {
      return {
        hasLimit: false,
        limitExceeded: false,
        creditLimit: 0,
        currentBalance: account.currentBalance || 0,
        availableCredit: 0,
      };
    }

    const creditLimit = account.businessDetails.creditAmountLimit;
    const currentBalance = Math.abs(account.currentBalance || 0);
    const totalAmount = currentBalance + additionalAmount;
    const limitExceeded = totalAmount > creditLimit;
    const availableCredit = Math.max(0, creditLimit - currentBalance);

    return {
      hasLimit: true,
      limitExceeded,
      creditLimit,
      currentBalance,
      totalAmount,
      availableCredit,
      additionalAmount,
    };
  }

  /**
   * Get account ledger
   * Requirements: 3.1-3.22
   */
  async getAccountLedger(id, startDate = null, endDate = null, page = 1, limit = 50) {
    const account = await customerRepository.findById(id);
    if (!account) {
      throw new Error('Account not found');
    }

    // Build date filter
    const dateFilter = {};
    if (startDate) {
      dateFilter.$gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.$lte = new Date(endDate);
    }

    const query = { accountId: id };
    if (Object.keys(dateFilter).length > 0) {
      query.transactionDate = dateFilter;
    }

    // Get opening balance (before start date if provided)
    let openingBalance = 0;
    if (startDate) {
      openingBalance = await LedgerEntry.calculateAccountBalance(id, new Date(startDate));
    }

    // Get ledger entries with pagination
    const skip = (page - 1) * limit;
    const [entries, total] = await Promise.all([
      LedgerEntry.find(query)
        .sort({ transactionDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('createdBy', 'username')
        .lean(),
      LedgerEntry.countDocuments(query),
    ]);

    // Calculate running balance
    let runningBalance = openingBalance;
    const ledgerWithBalance = entries.reverse().map((entry) => {
      if (entry.transactionType === 'debit') {
        runningBalance += entry.amount;
      } else {
        runningBalance -= entry.amount;
      }

      return {
        ...entry,
        runningBalance,
      };
    }).reverse();

    const totalPages = Math.ceil(total / limit);

    return {
      account: {
        id: account._id,
        name: account.name,
        code: account.code,
        accountType: account.accountType,
      },
      openingBalance,
      entries: ledgerWithBalance,
      closingBalance: runningBalance,
      pagination: {
        totalItems: total,
        totalPages,
        currentPage: page,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  /**
   * Get account transactions
   * Requirements: 3.1-3.22
   */
  async getAccountTransactions(id, filters = {}, page = 1, limit = 50) {
    const account = await customerRepository.findById(id);
    if (!account) {
      throw new Error('Account not found');
    }

    const query = { accountId: id, ...filters };

    const skip = (page - 1) * limit;
    const [transactions, total] = await Promise.all([
      LedgerEntry.find(query)
        .sort({ transactionDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('createdBy', 'username')
        .lean(),
      LedgerEntry.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      transactions,
      pagination: {
        totalItems: total,
        totalPages,
        currentPage: page,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  /**
   * Get accounts by type
   * Requirements: 3.1
   */
  async getAccountsByType(accountType) {
    this.validateAccountType(accountType);
    return Customer.find({ accountType, isActive: true })
      .sort({ name: 1 })
      .lean();
  }

  /**
   * Get sub-accounts
   * Requirements: 3.4
   */
  async getSubAccounts(parentAccountId) {
    const parentAccount = await customerRepository.findById(parentAccountId);
    if (!parentAccount) {
      throw new Error('Parent account not found');
    }

    return Customer.find({ parentAccountId, isActive: true })
      .sort({ name: 1 })
      .lean();
  }

  /**
   * Validate account type
   */
  validateAccountType(accountType) {
    const validTypes = ['customer', 'supplier', 'employee', 'investor', 'both'];
    if (!validTypes.includes(accountType)) {
      throw new Error(`Invalid account type. Must be one of: ${validTypes.join(', ')}`);
    }
  }

  /**
   * Validate employee data
   * Requirements: 3.11-3.13
   */
  validateEmployeeData(accountData) {
    if (!accountData.employeeBiodata) {
      return; // Employee biodata is optional
    }

    const biodata = accountData.employeeBiodata;

    // Validate blood group if provided
    if (biodata.bloodGroup) {
      const validBloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
      if (!validBloodGroups.includes(biodata.bloodGroup)) {
        throw new Error(`Invalid blood group. Must be one of: ${validBloodGroups.join(', ')}`);
      }
    }

    // Validate basic pay if provided
    if (biodata.basicPay !== undefined && biodata.basicPay < 0) {
      throw new Error('Basic pay cannot be negative');
    }

    // Validate date of appointment if provided
    if (biodata.dateOfAppointment) {
      const appointmentDate = new Date(biodata.dateOfAppointment);
      if (appointmentDate > new Date()) {
        throw new Error('Date of appointment cannot be in the future');
      }
    }
  }

  /**
   * Validate business data
   * Requirements: 3.14-3.17
   */
  validateBusinessData(accountData) {
    if (!accountData.businessDetails) {
      return; // Business details are optional
    }

    const { businessDetails } = accountData;

    // Validate customer type if provided
    if (businessDetails.customerType) {
      const validCustomerTypes = ['retailer', 'wholesaler', 'distributor', 'hospital', 'pharmacy'];
      if (!validCustomerTypes.includes(businessDetails.customerType)) {
        throw new Error(`Invalid customer type. Must be one of: ${validCustomerTypes.join(', ')}`);
      }
    }

    // Validate balance type if provided
    if (businessDetails.balanceType) {
      const validBalanceTypes = ['debit', 'credit'];
      if (!validBalanceTypes.includes(businessDetails.balanceType)) {
        throw new Error('Balance type must be either debit or credit');
      }
    }
  }

  /**
   * Get accounts with credit limit exceeded
   * Requirements: 3.21
   */
  async getAccountsWithCreditLimitExceeded() {
    const accounts = await Customer.find({
      accountType: { $in: ['customer', 'both'] },
      'businessDetails.creditAmountLimit': { $gt: 0 },
      isActive: true,
    }).lean();

    return accounts.filter((account) => {
      const creditLimit = account.businessDetails?.creditAmountLimit || 0;
      const currentBalance = Math.abs(account.currentBalance || 0);
      return currentBalance > creditLimit;
    });
  }

  /**
   * Get accounts with credit days exceeded
   * Requirements: 3.22
   */
  async getAccountsWithCreditDaysExceeded() {
    // This would require invoice data to calculate days overdue
    // For now, return accounts with credit days limit set
    return Customer.find({
      accountType: { $in: ['customer', 'both'] },
      'businessDetails.creditDaysLimit': { $gt: 0 },
      isActive: true,
    })
      .select('name code accountType businessDetails.creditDaysLimit currentBalance')
      .lean();
  }
}

module.exports = new AccountService();
