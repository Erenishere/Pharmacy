const { BusinessRuleError, DuplicateEntryError } = require('../errors');

/**
 * Business Rule Validators
 * Implements business logic validations for master data management
 * Requirements: 1.19-1.20, 3.21-3.22, 2.9-2.10
 */

/**
 * Validate stock levels: min <= reorder <= max
 * Requirement: 1.19
 */
const validateStockLevels = (inventory) => {
  if (!inventory) return true;

  const { minStockLevel, maxStockLevel, reorderPoint } = inventory;

  // Check if min <= max
  if (minStockLevel !== undefined && maxStockLevel !== undefined) {
    if (minStockLevel > maxStockLevel) {
      throw new BusinessRuleError(
        'Minimum stock level cannot be greater than maximum stock level',
        'INVALID_STOCK_LEVELS',
        { minStockLevel, maxStockLevel },
      );
    }
  }

  // Check if min <= reorder <= max
  if (reorderPoint !== undefined) {
    if (minStockLevel !== undefined && reorderPoint < minStockLevel) {
      throw new BusinessRuleError(
        'Reorder point cannot be less than minimum stock level',
        'INVALID_REORDER_POINT',
        { reorderPoint, minStockLevel },
      );
    }

    if (maxStockLevel !== undefined && reorderPoint > maxStockLevel) {
      throw new BusinessRuleError(
        'Reorder point cannot be greater than maximum stock level',
        'INVALID_REORDER_POINT',
        { reorderPoint, maxStockLevel },
      );
    }
  }

  return true;
};

/**
 * Validate credit limit for account
 * Requirements: 3.21-3.22
 */
const validateCreditLimit = (account, transactionAmount) => {
  if (!account || !account.businessDetails) return true;

  const { creditAmountLimit, creditDaysLimit } = account.businessDetails;
  const { currentBalance } = account;

  // Check credit amount limit
  if (creditAmountLimit !== undefined && creditAmountLimit > 0) {
    const newBalance = (currentBalance || 0) + transactionAmount;

    if (newBalance > creditAmountLimit) {
      throw new BusinessRuleError(
        `Transaction exceeds credit limit. Available credit: ${creditAmountLimit - currentBalance}`,
        'CREDIT_LIMIT_EXCEEDED',
        {
          creditLimit: creditAmountLimit,
          currentBalance,
          transactionAmount,
          availableCredit: creditAmountLimit - currentBalance,
        },
      );
    }
  }

  return true;
};

/**
 * Check if account has exceeded credit days
 * Requirements: 3.22
 */
const checkCreditDaysExceeded = (account, oldestUnpaidInvoiceDate) => {
  if (!account || !account.businessDetails || !oldestUnpaidInvoiceDate) return false;

  const { creditDaysLimit } = account.businessDetails;

  if (creditDaysLimit !== undefined && creditDaysLimit > 0) {
    const daysPassed = Math.floor(
      (new Date() - new Date(oldestUnpaidInvoiceDate)) / (1000 * 60 * 60 * 24),
    );

    if (daysPassed > creditDaysLimit) {
      return {
        exceeded: true,
        creditDaysLimit,
        daysPassed,
        overdueBy: daysPassed - creditDaysLimit,
      };
    }
  }

  return { exceeded: false };
};

/**
 * Validate unique constraint
 * Used for checking duplicate entries before creation
 */
const validateUnique = async (Model, field, value, excludeId = null) => {
  const query = { [field]: value };

  if (excludeId) {
    query._id = { $ne: excludeId };
  }

  const existing = await Model.findOne(query);

  if (existing) {
    throw new DuplicateEntryError(field, value);
  }

  return true;
};

/**
 * Validate entity can be deleted (no dependencies)
 * Requirement: 2.9-2.10
 */
const validateCanDelete = async (entityType, entityId, dependencies) => {
  const errors = [];

  for (const dep of dependencies) {
    const { model, field, name } = dep;
    const count = await model.countDocuments({ [field]: entityId });

    if (count > 0) {
      errors.push({
        dependency: name,
        count,
        message: `Cannot delete ${entityType} because ${count} ${name}(s) are associated with it`,
      });
    }
  }

  if (errors.length > 0) {
    throw new BusinessRuleError(
      `Cannot delete ${entityType} due to existing dependencies`,
      'HAS_DEPENDENCIES',
      { dependencies: errors },
    );
  }

  return true;
};

/**
 * Validate company can be deleted
 * Requirement: 2.10
 */
const validateCompanyCanDelete = async (companyId, Item) => {
  const itemCount = await Item.countDocuments({ companyId, isActive: true });

  if (itemCount > 0) {
    throw new BusinessRuleError(
      `Cannot delete company because ${itemCount} active item(s) are associated with it. Please set company status to Inactive instead.`,
      'COMPANY_HAS_ITEMS',
      { itemCount },
    );
  }

  return true;
};

/**
 * Validate warehouse can be deleted
 * Requirement: 5.7
 */
const validateWarehouseCanDelete = async (warehouseId, StockMovement) => {
  const stockCount = await StockMovement.countDocuments({
    warehouseId,
    quantity: { $gt: 0 },
  });

  if (stockCount > 0) {
    throw new BusinessRuleError(
      `Cannot delete warehouse because it has ${stockCount} stock record(s). Please set warehouse status to Inactive instead.`,
      'WAREHOUSE_HAS_STOCK',
      { stockCount },
    );
  }

  return true;
};

/**
 * Validate town can be deleted
 * Requirement: 6.8
 */
const validateTownCanDelete = async (townId, Customer, Area) => {
  const accountCount = await Customer.countDocuments({ townId });
  const areaCount = await Area.countDocuments({ townId });

  const errors = [];

  if (accountCount > 0) {
    errors.push({
      dependency: 'accounts',
      count: accountCount,
      message: `${accountCount} account(s) are associated with this town`,
    });
  }

  if (areaCount > 0) {
    errors.push({
      dependency: 'areas',
      count: areaCount,
      message: `${areaCount} area(s) are associated with this town`,
    });
  }

  if (errors.length > 0) {
    throw new BusinessRuleError(
      'Cannot delete town due to existing dependencies',
      'TOWN_HAS_DEPENDENCIES',
      { dependencies: errors },
    );
  }

  return true;
};

/**
 * Validate category can be deleted
 * Requirement: 7.6
 */
const validateCategoryCanDelete = async (categoryId, Item, SubCategory) => {
  const itemCount = await Item.countDocuments({ categoryId });
  const subCategoryCount = await SubCategory.countDocuments({ categoryId });

  const errors = [];

  if (itemCount > 0) {
    errors.push({
      dependency: 'items',
      count: itemCount,
      message: `${itemCount} item(s) are associated with this category`,
    });
  }

  if (subCategoryCount > 0) {
    errors.push({
      dependency: 'sub-categories',
      count: subCategoryCount,
      message: `${subCategoryCount} sub-category(ies) are associated with this category`,
    });
  }

  if (errors.length > 0) {
    throw new BusinessRuleError(
      'Cannot delete category due to existing dependencies',
      'CATEGORY_HAS_DEPENDENCIES',
      { dependencies: errors },
    );
  }

  return true;
};

/**
 * Validate business type can be deleted
 * Requirement: 9.5
 */
const validateBusinessTypeCanDelete = async (businessTypeId, Item) => {
  const itemCount = await Item.countDocuments({ businessTypeId });

  if (itemCount > 0) {
    throw new BusinessRuleError(
      `Cannot delete business type because ${itemCount} item(s) are associated with it`,
      'BUSINESS_TYPE_HAS_ITEMS',
      { itemCount },
    );
  }

  return true;
};

/**
 * Validate claim account can be deleted
 * Requirement: 12.7
 */
const validateClaimAccountCanDelete = async (claimAccountId, Transaction) => {
  const transactionCount = await Transaction.countDocuments({ claimAccountId });

  if (transactionCount > 0) {
    throw new BusinessRuleError(
      `Cannot delete claim account because ${transactionCount} transaction(s) are associated with it`,
      'CLAIM_ACCOUNT_HAS_TRANSACTIONS',
      { transactionCount },
    );
  }

  return true;
};

/**
 * Validate date is not in the future
 */
const validateDateNotFuture = (date, fieldName = 'Date') => {
  if (!date) return true;

  const inputDate = new Date(date);
  const today = new Date();
  today.setHours(23, 59, 59, 999); // End of today

  if (inputDate > today) {
    throw new BusinessRuleError(
      `${fieldName} cannot be in the future`,
      'INVALID_DATE',
      { date: inputDate, fieldName },
    );
  }

  return true;
};

/**
 * Validate date range
 */
const validateDateRange = (startDate, endDate, startFieldName = 'Start date', endFieldName = 'End date') => {
  if (!startDate || !endDate) return true;

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (start > end) {
    throw new BusinessRuleError(
      `${startFieldName} cannot be after ${endFieldName}`,
      'INVALID_DATE_RANGE',
      { startDate: start, endDate: end },
    );
  }

  return true;
};

/**
 * Validate account type specific fields
 * Ensures required fields are present based on account type
 */
const validateAccountTypeFields = (accountType, data) => {
  if (accountType === 'employee') {
    // Employee accounts should have biodata
    if (!data.employeeBiodata || !data.employeeBiodata.designationId) {
      throw new BusinessRuleError(
        'Employee accounts must have designation specified',
        'MISSING_EMPLOYEE_DATA',
        { accountType },
      );
    }
  }

  if (accountType === 'customer' || accountType === 'supplier' || accountType === 'both') {
    // Business accounts should have business details
    if (!data.businessDetails) {
      throw new BusinessRuleError(
        'Customer/Supplier accounts must have business details',
        'MISSING_BUSINESS_DATA',
        { accountType },
      );
    }
  }

  return true;
};

/**
 * Validate sub-account hierarchy
 * Prevents circular references and validates parent account exists
 */
const validateSubAccountHierarchy = async (parentAccountId, currentAccountId, Customer) => {
  if (!parentAccountId) return true;

  // Check if parent exists
  const parentAccount = await Customer.findById(parentAccountId);
  if (!parentAccount) {
    throw new BusinessRuleError(
      'Parent account does not exist',
      'INVALID_PARENT_ACCOUNT',
      { parentAccountId },
    );
  }

  // Prevent circular reference
  if (currentAccountId && parentAccountId.toString() === currentAccountId.toString()) {
    throw new BusinessRuleError(
      'Account cannot be its own parent',
      'CIRCULAR_REFERENCE',
      { accountId: currentAccountId },
    );
  }

  // Check if parent is already a sub-account (prevent deep nesting)
  if (parentAccount.parentAccountId) {
    throw new BusinessRuleError(
      'Cannot create sub-account of a sub-account. Only one level of hierarchy is allowed.',
      'INVALID_HIERARCHY_DEPTH',
      { parentAccountId },
    );
  }

  return true;
};

/**
 * Validate inactive company cannot have new items
 * Requirement: 2.9
 */
const validateCompanyActive = async (companyId, Company) => {
  const company = await Company.findById(companyId);

  if (!company) {
    throw new BusinessRuleError(
      'Company does not exist',
      'COMPANY_NOT_FOUND',
      { companyId },
    );
  }

  if (!company.isActive) {
    throw new BusinessRuleError(
      'Cannot assign items to inactive company',
      'COMPANY_INACTIVE',
      { companyId, companyName: company.name },
    );
  }

  return true;
};

module.exports = {
  validateStockLevels,
  validateCreditLimit,
  checkCreditDaysExceeded,
  validateUnique,
  validateCanDelete,
  validateCompanyCanDelete,
  validateWarehouseCanDelete,
  validateTownCanDelete,
  validateCategoryCanDelete,
  validateBusinessTypeCanDelete,
  validateClaimAccountCanDelete,
  validateDateNotFuture,
  validateDateRange,
  validateAccountTypeFields,
  validateSubAccountHierarchy,
  validateCompanyActive,
};
