const accountService = require('../services/accountService');
const AccountHead = require('../models/accountHead');
const CustomerType = require('../models/customertype');
const Designation = require('../models/designation');
const DimensionBranch = require('../models/dimensionbranch');
const Town = require('../models/town');

/**
 * Account Controller
 * Handles HTTP requests for account management
 * Master Data Management - Requirements 3.1-3.22
 */

/**
 * Create new account
 * @route POST /api/v1/accounts
 */
const createAccount = async (req, res) => {
  try {
    const accountData = req.body;
    const userId = req.user?._id || req.user?.id;

    const account = await accountService.createAccount(accountData, userId);

    return res.status(201).json({
      success: true,
      data: account,
      message: 'Account created successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Create account error:', error);

    if (
      error.message.includes('required')
      || error.message.includes('Invalid')
      || error.message.includes('must be')
      || error.message.includes('cannot be')
      || error.message.includes('not found')
      || error.message.includes('not active')
    ) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to create account',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Get account registration lookup bundle
 * @route GET /api/v1/accounts/registration-lookups
 */
const getAccountRegistrationLookups = async (req, res) => {
  try {
    const [dimensions, designations, customerTypes, accountHeads, towns] = await Promise.all([
      DimensionBranch.find({ isActive: true })
        .select('_id code name type isActive')
        .sort({ name: 1 })
        .lean(),
      Designation.find({ isActive: true })
        .select('_id name isActive')
        .sort({ name: 1 })
        .lean(),
      CustomerType.find({ isActive: true })
        .select('_id name isActive')
        .sort({ name: 1 })
        .lean(),
      AccountHead.find({ isActive: true })
        .select('_id name code type isActive')
        .sort({ name: 1 })
        .lean(),
      Town.find({ isActive: true })
        .select('_id name region isActive')
        .sort({ name: 1 })
        .lean(),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        dimensions,
        designations,
        customerTypes,
        accountHeads,
        towns,
      },
      message: 'Account registration lookups retrieved successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get account registration lookups error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to retrieve account registration lookups',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Get all accounts with filtering and pagination
 * @route GET /api/v1/accounts
 */
const getAccounts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      sort,
      sortBy = 'name',
      sortOrder = 'asc',
      keyword,
      accountType,
      dimensionId,
      townId,
      areaId,
      isActive,
      ...otherFilters
    } = req.query;

    // Build filters object
    const filters = {
      ...(keyword && { keyword }),
      ...(accountType && { accountType }),
      ...(dimensionId && { dimensionId }),
      ...(townId && { townId }),
      ...(areaId && { areaId }),
      ...(isActive !== undefined && { isActive: isActive === 'true' }),
      ...otherFilters,
    };

    // Build sort options
    const sortOptions = {};
    if (sort) {
      const [field, order] = sort.split(':');
      sortOptions[field] = order === 'desc' ? -1 : 1;
    } else if (sortBy) {
      sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
    }

    const result = await accountService.getAccounts(filters, {
      page: parseInt(page, 10),
      limit: Math.min(parseInt(limit, 10), 100),
      sort: sortOptions,
    });

    return res.status(200).json({
      success: true,
      data: result.accounts,
      pagination: result.pagination,
      message: 'Accounts retrieved successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get accounts error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to retrieve accounts',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Get account by ID
 * @route GET /api/v1/accounts/:id
 */
const getAccountById = async (req, res) => {
  try {
    const { id } = req.params;
    const account = await accountService.getAccountById(id);

    return res.status(200).json({
      success: true,
      data: account,
      message: 'Account retrieved successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get account by ID error:', error);

    if (error.message === 'Account not found') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ACCOUNT_NOT_FOUND',
          message: 'Account not found',
        },
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to retrieve account',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Get accounts by type
 * @route GET /api/v1/accounts/type/:type
 */
const getAccountsByType = async (req, res) => {
  try {
    const { type } = req.params;
    const accounts = await accountService.getAccountsByType(type);

    return res.status(200).json({
      success: true,
      data: accounts,
      message: 'Accounts retrieved successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get accounts by type error:', error);

    if (error.message.includes('Invalid')) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to retrieve accounts',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Update account
 * @route PUT /api/v1/accounts/:id
 */
const updateAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const userId = req.user?._id || req.user?.id;

    const account = await accountService.updateAccount(id, updateData, userId);

    return res.status(200).json({
      success: true,
      data: account,
      message: 'Account updated successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Update account error:', error);

    if (error.message === 'Account not found') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ACCOUNT_NOT_FOUND',
          message: 'Account not found',
        },
        timestamp: new Date().toISOString(),
      });
    }

    if (
      error.message.includes('Invalid')
      || error.message.includes('must be')
      || error.message.includes('cannot be')
      || error.message.includes('not found')
      || error.message.includes('not active')
      || error.message.includes('circular')
    ) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to update account',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Delete account
 * @route DELETE /api/v1/accounts/:id
 */
const deleteAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id || req.user?.id;

    const account = await accountService.deleteAccount(id, userId);

    return res.status(200).json({
      success: true,
      data: account,
      message: 'Account deleted successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Delete account error:', error);

    if (error.message === 'Account not found') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ACCOUNT_NOT_FOUND',
          message: 'Account not found',
        },
        timestamp: new Date().toISOString(),
      });
    }

    if (error.message.includes('Cannot delete')) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'BUSINESS_RULE_ERROR',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to delete account',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Update account balance
 * @route PATCH /api/v1/accounts/:id/balance
 */
const updateAccountBalance = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      amount, transactionType, description, referenceType, referenceId,
    } = req.body;
    const userId = req.user?._id || req.user?.id;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Amount must be greater than zero',
        },
        timestamp: new Date().toISOString(),
      });
    }

    if (!transactionType || !['debit', 'credit'].includes(transactionType)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Transaction type must be either debit or credit',
        },
        timestamp: new Date().toISOString(),
      });
    }

    if (!description) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Description is required',
        },
        timestamp: new Date().toISOString(),
      });
    }

    const result = await accountService.updateAccountBalance(
      id,
      amount,
      transactionType,
      description,
      referenceType,
      referenceId,
      userId,
    );

    return res.status(200).json({
      success: true,
      data: result,
      message: 'Account balance updated successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Update account balance error:', error);

    if (error.message === 'Account not found') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ACCOUNT_NOT_FOUND',
          message: 'Account not found',
        },
        timestamp: new Date().toISOString(),
      });
    }

    if (error.message.includes('inactive') || error.message.includes('must be')) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to update account balance',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Get account ledger
 * @route GET /api/v1/accounts/:id/ledger
 */
const getAccountLedger = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      startDate, endDate, page = 1, limit = 50,
    } = req.query;

    const ledger = await accountService.getAccountLedger(
      id,
      startDate,
      endDate,
      parseInt(page, 10),
      parseInt(limit, 10),
    );

    return res.status(200).json({
      success: true,
      data: ledger,
      message: 'Account ledger retrieved successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get account ledger error:', error);

    if (error.message === 'Account not found') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ACCOUNT_NOT_FOUND',
          message: 'Account not found',
        },
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to retrieve account ledger',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Get account transactions
 * @route GET /api/v1/accounts/:id/transactions
 */
const getAccountTransactions = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      page = 1, limit = 50, transactionType, referenceType,
    } = req.query;

    const filters = {};
    if (transactionType) filters.transactionType = transactionType;
    if (referenceType) filters.referenceType = referenceType;

    const result = await accountService.getAccountTransactions(
      id,
      filters,
      parseInt(page, 10),
      parseInt(limit, 10),
    );

    return res.status(200).json({
      success: true,
      data: result.transactions,
      pagination: result.pagination,
      message: 'Account transactions retrieved successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get account transactions error:', error);

    if (error.message === 'Account not found') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ACCOUNT_NOT_FOUND',
          message: 'Account not found',
        },
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to retrieve account transactions',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Check credit limit
 * @route GET /api/v1/accounts/credit-limit-check
 */
const checkCreditLimit = async (req, res) => {
  try {
    const { accountId, amount = 0 } = req.query;

    if (!accountId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Account ID is required',
        },
        timestamp: new Date().toISOString(),
      });
    }

    const additionalAmount = parseFloat(amount) || 0;
    const result = await accountService.checkCreditLimit(accountId, additionalAmount);

    return res.status(200).json({
      success: true,
      data: result,
      message: 'Credit limit check completed',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Check credit limit error:', error);

    if (error.message === 'Account not found') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ACCOUNT_NOT_FOUND',
          message: 'Account not found',
        },
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to check credit limit',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Get sub-accounts
 * @route GET /api/v1/accounts/:id/sub-accounts
 */
const getSubAccounts = async (req, res) => {
  try {
    const { id } = req.params;
    const subAccounts = await accountService.getSubAccounts(id);

    return res.status(200).json({
      success: true,
      data: subAccounts,
      message: 'Sub-accounts retrieved successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get sub-accounts error:', error);

    if (error.message === 'Parent account not found') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ACCOUNT_NOT_FOUND',
          message: 'Parent account not found',
        },
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to retrieve sub-accounts',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Get accounts with credit limit exceeded
 * @route GET /api/v1/accounts/credit-limit-exceeded
 */
const getAccountsWithCreditLimitExceeded = async (req, res) => {
  try {
    const accounts = await accountService.getAccountsWithCreditLimitExceeded();

    return res.status(200).json({
      success: true,
      data: accounts,
      message: 'Accounts with credit limit exceeded retrieved successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get accounts with credit limit exceeded error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to retrieve accounts',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Get accounts with credit days exceeded
 * @route GET /api/v1/accounts/credit-days-exceeded
 */
const getAccountsWithCreditDaysExceeded = async (req, res) => {
  try {
    const accounts = await accountService.getAccountsWithCreditDaysExceeded();

    return res.status(200).json({
      success: true,
      data: accounts,
      message: 'Accounts with credit days exceeded retrieved successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get accounts with credit days exceeded error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to retrieve accounts',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Advanced search for accounts
 * @route GET /api/v1/accounts/search
 * Requirements: 3.20
 */
const searchAccounts = async (req, res) => {
  try {
    const searchService = require('../services/searchService');

    // Extract search criteria from query parameters
    const {
      searchText = '',
      page = 1,
      limit = 50,
      sortField = 'name',
      sortOrder = 'asc',
      // Filter parameters
      accountType,
      type,
      townId,
      areaId,
      dimensionId,
      salesmanId,
      customerType,
      isActive,
      minCreditLimit,
      maxCreditLimit,
      minBalance,
      maxBalance,
      parentAccountId,
    } = req.query;

    // Build filters array
    const filters = [];

    if (accountType) {
      filters.push({ field: 'accountType', operator: 'equals', value: accountType });
    }
    if (type) {
      filters.push({ field: 'type', operator: 'equals', value: type });
    }
    if (townId) {
      filters.push({ field: 'townId', operator: 'equals', value: townId });
    }
    if (areaId) {
      filters.push({ field: 'areaId', operator: 'equals', value: areaId });
    }
    if (dimensionId) {
      filters.push({ field: 'dimensionId', operator: 'equals', value: dimensionId });
    }
    if (salesmanId) {
      filters.push({ field: 'businessDetails.assignedSalesmanId', operator: 'equals', value: salesmanId });
    }
    if (customerType) {
      filters.push({ field: 'businessDetails.customerType', operator: 'equals', value: customerType });
    }
    if (isActive !== undefined) {
      filters.push({ field: 'isActive', operator: 'equals', value: isActive === 'true' });
    }
    if (minCreditLimit !== undefined) {
      filters.push({ field: 'businessDetails.creditAmountLimit', operator: 'gte', value: parseFloat(minCreditLimit) });
    }
    if (maxCreditLimit !== undefined) {
      filters.push({ field: 'businessDetails.creditAmountLimit', operator: 'lte', value: parseFloat(maxCreditLimit) });
    }
    if (minBalance !== undefined) {
      filters.push({ field: 'currentBalance', operator: 'gte', value: parseFloat(minBalance) });
    }
    if (maxBalance !== undefined) {
      filters.push({ field: 'currentBalance', operator: 'lte', value: parseFloat(maxBalance) });
    }
    if (parentAccountId) {
      filters.push({ field: 'parentAccountId', operator: 'equals', value: parentAccountId });
    }

    // Build sort array
    const sort = [{ field: sortField, order: sortOrder }];

    // Build search criteria
    const searchCriteria = {
      filters,
      sort,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      searchText,
    };

    // Perform search
    const results = await searchService.searchAccounts(searchCriteria);

    return res.status(200).json({
      success: true,
      data: results.results,
      pagination: results.pagination,
      message: 'Accounts search completed successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Search accounts error:', error);

    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to search accounts',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

module.exports = {
  createAccount,
  getAccountRegistrationLookups,
  getAccounts,
  getAccountById,
  getAccountsByType,
  updateAccount,
  deleteAccount,
  updateAccountBalance,
  getAccountLedger,
  getAccountTransactions,
  checkCreditLimit,
  getSubAccounts,
  getAccountsWithCreditLimitExceeded,
  getAccountsWithCreditDaysExceeded,
  searchAccounts,
};
