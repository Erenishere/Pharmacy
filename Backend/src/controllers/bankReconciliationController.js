const bankReconciliationService = require('../services/bankReconciliationService');

/**
 * Bank Reconciliation Controller
 * Handles HTTP requests for bank reconciliation management
 */

/**
 * Perform bank reconciliation
 * @route POST /api/v1/bank-reconciliation
 */
const performReconciliation = async (req, res) => {
  try {
    const {
      bankAccountId, statementDate, statementBalance, unclearedCheques, unclearedDeposits,
    } = req.body;

    if (!bankAccountId || !statementDate || statementBalance === undefined) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Bank account ID, statement date, and statement balance are required',
        },
        timestamp: new Date().toISOString(),
      });
    }

    const reconciliation = await bankReconciliationService.performReconciliation(
      bankAccountId,
      statementDate,
      statementBalance,
      unclearedCheques || [],
      unclearedDeposits || [],
      req.user._id,
    );

    return res.status(201).json({
      success: true,
      data: reconciliation,
      message: 'Bank reconciliation completed successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Bank reconciliation error:', error);
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: error.message,
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Get uncleared items for bank account
 * @route GET /api/v1/bank-reconciliation/uncleared/:bankAccountId
 */
const getUnclearedItems = async (req, res) => {
  try {
    const unclearedItems = await bankReconciliationService.getUnclearedItems(req.params.bankAccountId);

    return res.status(200).json({
      success: true,
      data: unclearedItems,
      message: 'Uncleared items retrieved successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get uncleared items error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message,
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Get reconciliation history for bank account
 * @route GET /api/v1/bank-reconciliation/history/:bankAccountId
 */
const getReconciliationHistory = async (req, res) => {
  try {
    const options = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
      sort: req.query.sort || '-statementDate',
    };

    const result = await bankReconciliationService.getReconciliationHistory(
      req.params.bankAccountId,
      options,
    );

    return res.status(200).json({
      success: true,
      data: result.reconciliations,
      pagination: result.pagination,
      message: 'Reconciliation history retrieved successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get reconciliation history error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message,
      },
      timestamp: new Date().toISOString(),
    });
  }
};

module.exports = {
  performReconciliation,
  getUnclearedItems,
  getReconciliationHistory,
};
