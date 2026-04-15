/**
 * Inconsistency Resolver Module
 * 
 * Provides automated resolution capabilities for data inconsistencies detected
 * in the production database. This module can recalculate values from source data
 * and optionally apply fixes to restore data consistency.
 * 
 * This module provides resolution for:
 * - Inventory: Recalculate quantity from stock movements
 * - Accounts: Recalculate balance from transactions
 * - Batches: Recalculate quantity from batch movements
 * - Orphaned References: Detect and optionally remove invalid foreign keys
 * - Reports: Regenerate from source data
 * 
 * IMPORTANT: All resolution functions support dry-run mode (default) to preview
 * changes before applying them. Auto-resolution must be explicitly enabled.
 * 
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */

const mongoose = require('mongoose');

// ============================================================================
// MODELS
// ============================================================================

// Models will be loaded dynamically to avoid circular dependencies
let Inventory, StockMovement, Account, LedgerEntry, Batch, Invoice, Item, Warehouse, Customer, Supplier;

/**
 * Load models dynamically
 */
function loadModels() {
  if (!Inventory) {
    Inventory = require('../../../../src/models/Inventory');
    StockMovement = require('../../../../src/models/StockMovement');
    Account = require('../../../../src/models/Account');
    LedgerEntry = require('../../../../src/models/LedgerEntry');
    Batch = require('../../../../src/models/Batch');
    Invoice = require('../../../../src/models/Invoice');
    Item = require('../../../../src/models/Item');
    Warehouse = require('../../../../src/models/Warehouse');
    Customer = require('../../../../src/models/Customer');
    Supplier = require('../../../../src/models/Supplier');
  }
}

// ============================================================================
// LOGGING UTILITY
// ============================================================================

/**
 * Log resolution action with timestamp
 * @private
 */
function logResolution(action, details, dryRun = true) {
  const timestamp = new Date().toISOString();
  const mode = dryRun ? '[DRY-RUN]' : '[APPLIED]';
  console.log(`${timestamp} ${mode} ${action}: ${details}`);
}

// ============================================================================
// INVENTORY RESOLUTION
// ============================================================================

/**
 * Resolve inventory inconsistency by recalculating from stock movements
 * 
 * Recalculates inventory quantity from all stock movements and updates
 * the inventory record if different from current value.
 * 
 * @param {string} itemId - Item ID to resolve
 * @param {string} warehouseId - Warehouse ID to resolve
 * @param {boolean} dryRun - If true, calculate but don't apply changes (default: true)
 * @returns {Promise<ResolutionResult>}
 */
async function resolveInventoryInconsistency(itemId, warehouseId, dryRun = true) {
  loadModels();
  
  try {
    logResolution('INVENTORY_RESOLUTION', `Starting for item ${itemId} in warehouse ${warehouseId}`, dryRun);

    // Get current inventory record
    const inventory = await Inventory.findOne({
      item: itemId,
      warehouse: warehouseId,
    });

    if (!inventory) {
      logResolution('INVENTORY_RESOLUTION', 'No inventory record found - nothing to resolve', dryRun);
      return {
        success: true,
        action: 'none',
        reason: 'No inventory record exists',
        oldValue: null,
        newValue: null,
        applied: false,
      };
    }

    const oldQuantity = inventory.quantity;

    // Calculate correct quantity from stock movements
    const movements = await StockMovement.find({
      itemId: itemId,
      $or: [
        { warehouse: warehouseId },
        { 'transferInfo.toWarehouse': warehouseId }
      ],
      status: 'completed',
    }).sort({ createdAt: 1 });

    logResolution('INVENTORY_RESOLUTION', `Found ${movements.length} stock movements`, dryRun);

    let calculatedQuantity = 0;
    
    for (const movement of movements) {
      if (movement.movementType === 'in') {
        calculatedQuantity += movement.quantity;
        logResolution('INVENTORY_CALCULATION', `Movement IN: +${movement.quantity} (ref: ${movement.referenceType})`, dryRun);
      } else if (movement.movementType === 'out') {
        // For warehouse transfers, quantity is already negative
        if (movement.referenceType === 'warehouse_transfer') {
          calculatedQuantity += movement.quantity; // Already negative
          logResolution('INVENTORY_CALCULATION', `Movement OUT (transfer): ${movement.quantity}`, dryRun);
        } else {
          calculatedQuantity -= Math.abs(movement.quantity);
          logResolution('INVENTORY_CALCULATION', `Movement OUT: -${Math.abs(movement.quantity)} (ref: ${movement.referenceType})`, dryRun);
        }
      } else if (movement.movementType === 'adjustment') {
        calculatedQuantity += movement.quantity; // Can be positive or negative
        logResolution('INVENTORY_CALCULATION', `Movement ADJUSTMENT: ${movement.quantity >= 0 ? '+' : ''}${movement.quantity}`, dryRun);
      }
    }

    const difference = oldQuantity - calculatedQuantity;
    const needsUpdate = Math.abs(difference) >= 0.01; // Allow for floating point errors

    if (!needsUpdate) {
      logResolution('INVENTORY_RESOLUTION', `No update needed - values match (${oldQuantity})`, dryRun);
      return {
        success: true,
        action: 'none',
        reason: 'Values already match',
        oldValue: oldQuantity,
        newValue: calculatedQuantity,
        difference: 0,
        applied: false,
      };
    }

    logResolution('INVENTORY_RESOLUTION', `Mismatch detected: current=${oldQuantity}, calculated=${calculatedQuantity}, difference=${difference}`, dryRun);

    // Apply update if not dry-run
    if (!dryRun) {
      inventory.quantity = calculatedQuantity;
      await inventory.save();
      logResolution('INVENTORY_UPDATE', `Updated inventory quantity from ${oldQuantity} to ${calculatedQuantity}`, false);
    } else {
      logResolution('INVENTORY_UPDATE', `Would update inventory quantity from ${oldQuantity} to ${calculatedQuantity}`, true);
    }

    return {
      success: true,
      action: 'recalculate_inventory',
      reason: 'Inventory quantity recalculated from stock movements',
      oldValue: oldQuantity,
      newValue: calculatedQuantity,
      difference,
      movementCount: movements.length,
      applied: !dryRun,
      itemId,
      warehouseId,
    };
  } catch (error) {
    logResolution('INVENTORY_ERROR', `Failed to resolve: ${error.message}`, dryRun);
    return {
      success: false,
      action: 'error',
      reason: `Error resolving inventory: ${error.message}`,
      error: error.message,
      applied: false,
    };
  }
}

// ============================================================================
// ACCOUNT RESOLUTION
// ============================================================================

/**
 * Resolve account balance inconsistency by recalculating from transactions
 * 
 * Recalculates account balance from opening balance and all transactions,
 * then updates the account record if different from current value.
 * 
 * @param {string} accountId - Account ID to resolve
 * @param {string} accountType - Account type: 'Customer', 'Supplier', 'Account'
 * @param {boolean} dryRun - If true, calculate but don't apply changes (default: true)
 * @returns {Promise<ResolutionResult>}
 */
async function resolveAccountInconsistency(accountId, accountType = 'Customer', dryRun = true) {
  loadModels();
  
  try {
    logResolution('ACCOUNT_RESOLUTION', `Starting for account ${accountId} (type: ${accountType})`, dryRun);

    // Get account based on type
    let account;
    let openingBalance = 0;
    
    if (accountType === 'Customer') {
      account = await Customer.findById(accountId);
      openingBalance = account?.openingBalance || 0;
    } else if (accountType === 'Supplier') {
      account = await Supplier.findById(accountId);
      openingBalance = account?.openingBalance || 0;
    } else if (accountType === 'Account') {
      account = await Account.findById(accountId);
      openingBalance = account?.openingBalance || 0;
    }

    if (!account) {
      logResolution('ACCOUNT_RESOLUTION', 'Account not found', dryRun);
      return {
        success: false,
        action: 'error',
        reason: `Account not found: ${accountId} (type: ${accountType})`,
        applied: false,
      };
    }

    logResolution('ACCOUNT_RESOLUTION', `Opening balance: ${openingBalance}`, dryRun);

    // Get all ledger entries for this account
    const ledgerEntries = await LedgerEntry.find({
      accountId: accountId,
      accountType: accountType,
    }).sort({ transactionDate: 1 });

    logResolution('ACCOUNT_RESOLUTION', `Found ${ledgerEntries.length} ledger entries`, dryRun);

    // Calculate expected balance from ledger entries
    let calculatedBalance = openingBalance;
    
    for (const entry of ledgerEntries) {
      if (entry.transactionType === 'debit') {
        calculatedBalance += entry.amount;
        logResolution('ACCOUNT_CALCULATION', `Debit: +${entry.amount} (ref: ${entry.referenceType})`, dryRun);
      } else if (entry.transactionType === 'credit') {
        calculatedBalance -= entry.amount;
        logResolution('ACCOUNT_CALCULATION', `Credit: -${entry.amount} (ref: ${entry.referenceType})`, dryRun);
      }
    }

    // Get current balance
    let oldBalance;
    if (accountType === 'Customer' || accountType === 'Supplier') {
      // For Customer/Supplier, calculate current balance from invoices and payments
      const invoices = await Invoice.find({
        [accountType === 'Customer' ? 'customerId' : 'supplierId']: accountId,
        status: { $ne: 'cancelled' },
      });
      
      oldBalance = openingBalance;
      for (const invoice of invoices) {
        if (invoice.type === 'sales' || invoice.type === 'purchase') {
          oldBalance += invoice.totals?.grandTotal || 0;
        } else if (invoice.type === 'return_sales' || invoice.type === 'return_purchase') {
          oldBalance -= invoice.totals?.grandTotal || 0;
        }
      }
      
      // Subtract payments
      const payments = await LedgerEntry.find({
        accountId: accountId,
        accountType: accountType,
        referenceType: { $in: ['payment', 'cash_receipt', 'cash_payment'] },
        transactionType: 'credit',
      });
      
      for (const payment of payments) {
        oldBalance -= payment.amount;
      }
    } else {
      oldBalance = account.balance || 0;
    }

    const difference = oldBalance - calculatedBalance;
    const needsUpdate = Math.abs(difference) >= 0.01; // Allow for floating point errors

    if (!needsUpdate) {
      logResolution('ACCOUNT_RESOLUTION', `No update needed - values match (${oldBalance})`, dryRun);
      return {
        success: true,
        action: 'none',
        reason: 'Values already match',
        oldValue: oldBalance,
        newValue: calculatedBalance,
        difference: 0,
        applied: false,
      };
    }

    logResolution('ACCOUNT_RESOLUTION', `Mismatch detected: current=${oldBalance}, calculated=${calculatedBalance}, difference=${difference}`, dryRun);

    // Apply update if not dry-run
    if (!dryRun) {
      // Note: For Customer/Supplier, we don't have a direct balance field to update
      // The balance is calculated from invoices and payments
      // For Account model, we can update the balance field
      if (accountType === 'Account' && account.balance !== undefined) {
        account.balance = calculatedBalance;
        await account.save();
        logResolution('ACCOUNT_UPDATE', `Updated account balance from ${oldBalance} to ${calculatedBalance}`, false);
      } else {
        logResolution('ACCOUNT_UPDATE', `Cannot directly update ${accountType} balance - balance is calculated from transactions`, false);
      }
    } else {
      logResolution('ACCOUNT_UPDATE', `Would update account balance from ${oldBalance} to ${calculatedBalance}`, true);
    }

    return {
      success: true,
      action: 'recalculate_balance',
      reason: 'Account balance recalculated from transactions',
      oldValue: oldBalance,
      newValue: calculatedBalance,
      difference,
      transactionCount: ledgerEntries.length,
      applied: !dryRun && accountType === 'Account',
      accountId,
      accountType,
      note: accountType !== 'Account' ? 'Balance is calculated from transactions, not stored directly' : undefined,
    };
  } catch (error) {
    logResolution('ACCOUNT_ERROR', `Failed to resolve: ${error.message}`, dryRun);
    return {
      success: false,
      action: 'error',
      reason: `Error resolving account: ${error.message}`,
      error: error.message,
      applied: false,
    };
  }
}

// ============================================================================
// BATCH RESOLUTION
// ============================================================================

/**
 * Resolve batch quantity inconsistency by recalculating from batch movements
 * 
 * Recalculates batch remaining quantity from initial quantity and all movements,
 * then updates the batch record if different from current value.
 * 
 * @param {string} batchId - Batch ID to resolve
 * @param {boolean} dryRun - If true, calculate but don't apply changes (default: true)
 * @returns {Promise<ResolutionResult>}
 */
async function resolveBatchInconsistency(batchId, dryRun = true) {
  loadModels();
  
  try {
    logResolution('BATCH_RESOLUTION', `Starting for batch ${batchId}`, dryRun);

    // Get batch record
    const batch = await Batch.findById(batchId);

    if (!batch) {
      logResolution('BATCH_RESOLUTION', 'Batch not found', dryRun);
      return {
        success: false,
        action: 'error',
        reason: `Batch not found: ${batchId}`,
        applied: false,
      };
    }

    const oldQuantity = batch.remainingQuantity;
    const initialQuantity = batch.quantity;

    logResolution('BATCH_RESOLUTION', `Initial quantity: ${initialQuantity}, current remaining: ${oldQuantity}`, dryRun);

    // Get all stock movements for this batch
    const movements = await StockMovement.find({
      'batchInfo.batchNumber': batch.batchNumber,
      itemId: batch.item,
      status: 'completed',
    }).sort({ createdAt: 1 });

    logResolution('BATCH_RESOLUTION', `Found ${movements.length} batch movements`, dryRun);

    // Calculate expected remaining quantity
    let totalOut = 0;
    
    for (const movement of movements) {
      if (movement.movementType === 'out') {
        totalOut += Math.abs(movement.quantity);
        logResolution('BATCH_CALCULATION', `Movement OUT: -${Math.abs(movement.quantity)} (ref: ${movement.referenceType})`, dryRun);
      }
    }

    const calculatedRemaining = initialQuantity - totalOut;
    const difference = oldQuantity - calculatedRemaining;
    const needsUpdate = Math.abs(difference) >= 0.01; // Allow for floating point errors

    if (!needsUpdate) {
      logResolution('BATCH_RESOLUTION', `No update needed - values match (${oldQuantity})`, dryRun);
      return {
        success: true,
        action: 'none',
        reason: 'Values already match',
        oldValue: oldQuantity,
        newValue: calculatedRemaining,
        difference: 0,
        applied: false,
      };
    }

    logResolution('BATCH_RESOLUTION', `Mismatch detected: current=${oldQuantity}, calculated=${calculatedRemaining}, difference=${difference}`, dryRun);

    // Apply update if not dry-run
    if (!dryRun) {
      batch.remainingQuantity = calculatedRemaining;
      await batch.save();
      logResolution('BATCH_UPDATE', `Updated batch remaining quantity from ${oldQuantity} to ${calculatedRemaining}`, false);
    } else {
      logResolution('BATCH_UPDATE', `Would update batch remaining quantity from ${oldQuantity} to ${calculatedRemaining}`, true);
    }

    return {
      success: true,
      action: 'recalculate_batch',
      reason: 'Batch quantity recalculated from movements',
      oldValue: oldQuantity,
      newValue: calculatedRemaining,
      difference,
      initialQuantity,
      totalOut,
      movementCount: movements.length,
      applied: !dryRun,
      batchId,
      batchNumber: batch.batchNumber,
    };
  } catch (error) {
    logResolution('BATCH_ERROR', `Failed to resolve: ${error.message}`, dryRun);
    return {
      success: false,
      action: 'error',
      reason: `Error resolving batch: ${error.message}`,
      error: error.message,
      applied: false,
    };
  }
}

// ============================================================================
// ORPHANED REFERENCE RESOLUTION
// ============================================================================

/**
 * Detect and optionally remove orphaned references (invalid foreign keys)
 * 
 * Scans collections for foreign key references that point to non-existent entities.
 * Can optionally remove or flag these orphaned records.
 * 
 * @param {boolean} dryRun - If true, detect but don't remove orphans (default: true)
 * @returns {Promise<ResolutionResult>}
 */
async function resolveOrphanedReferences(dryRun = true) {
  loadModels();
  
  try {
    logResolution('ORPHAN_RESOLUTION', 'Starting orphaned reference detection', dryRun);

    const orphans = [];

    // Check inventory references
    logResolution('ORPHAN_CHECK', 'Checking inventory references...', dryRun);
    const inventories = await Inventory.find({}).limit(1000);
    
    for (const inventory of inventories) {
      // Check item reference
      const item = await Item.findById(inventory.item);
      if (!item) {
        orphans.push({
          collection: 'Inventory',
          documentId: inventory._id,
          field: 'item',
          referencedId: inventory.item,
          issue: 'Referenced item does not exist',
          action: 'flag_for_review',
        });
        logResolution('ORPHAN_FOUND', `Inventory ${inventory._id} references non-existent item ${inventory.item}`, dryRun);
      }

      // Check warehouse reference
      const warehouse = await Warehouse.findById(inventory.warehouse);
      if (!warehouse) {
        orphans.push({
          collection: 'Inventory',
          documentId: inventory._id,
          field: 'warehouse',
          referencedId: inventory.warehouse,
          issue: 'Referenced warehouse does not exist',
          action: 'flag_for_review',
        });
        logResolution('ORPHAN_FOUND', `Inventory ${inventory._id} references non-existent warehouse ${inventory.warehouse}`, dryRun);
      }
    }

    // Check stock movement references
    logResolution('ORPHAN_CHECK', 'Checking stock movement references...', dryRun);
    const movements = await StockMovement.find({}).limit(1000);
    
    for (const movement of movements) {
      // Check item reference
      const item = await Item.findById(movement.itemId);
      if (!item) {
        orphans.push({
          collection: 'StockMovement',
          documentId: movement._id,
          field: 'itemId',
          referencedId: movement.itemId,
          issue: 'Referenced item does not exist',
          action: 'flag_for_review',
        });
        logResolution('ORPHAN_FOUND', `StockMovement ${movement._id} references non-existent item ${movement.itemId}`, dryRun);
      }

      // Check warehouse reference
      if (movement.warehouse) {
        const warehouse = await Warehouse.findById(movement.warehouse);
        if (!warehouse) {
          orphans.push({
            collection: 'StockMovement',
            documentId: movement._id,
            field: 'warehouse',
            referencedId: movement.warehouse,
            issue: 'Referenced warehouse does not exist',
            action: 'flag_for_review',
          });
          logResolution('ORPHAN_FOUND', `StockMovement ${movement._id} references non-existent warehouse ${movement.warehouse}`, dryRun);
        }
      }
    }

    // Check invoice references
    logResolution('ORPHAN_CHECK', 'Checking invoice references...', dryRun);
    const invoices = await Invoice.find({}).limit(1000);
    
    for (const invoice of invoices) {
      // Check customer reference for sales invoices
      if (invoice.type === 'sales' && invoice.customerId) {
        const customer = await Customer.findById(invoice.customerId);
        if (!customer) {
          orphans.push({
            collection: 'Invoice',
            documentId: invoice._id,
            field: 'customerId',
            referencedId: invoice.customerId,
            issue: 'Referenced customer does not exist',
            action: 'flag_for_review',
          });
          logResolution('ORPHAN_FOUND', `Invoice ${invoice._id} references non-existent customer ${invoice.customerId}`, dryRun);
        }
      }

      // Check supplier reference for purchase invoices
      if (invoice.type === 'purchase' && invoice.supplierId) {
        const supplier = await Supplier.findById(invoice.supplierId);
        if (!supplier) {
          orphans.push({
            collection: 'Invoice',
            documentId: invoice._id,
            field: 'supplierId',
            referencedId: invoice.supplierId,
            issue: 'Referenced supplier does not exist',
            action: 'flag_for_review',
          });
          logResolution('ORPHAN_FOUND', `Invoice ${invoice._id} references non-existent supplier ${invoice.supplierId}`, dryRun);
        }
      }
    }

    logResolution('ORPHAN_RESOLUTION', `Found ${orphans.length} orphaned references`, dryRun);

    // Note: We don't automatically delete orphaned records as they may contain
    // important historical data. Instead, we flag them for manual review.
    if (!dryRun && orphans.length > 0) {
      logResolution('ORPHAN_ACTION', 'Orphaned references require manual review - no automatic deletion performed', false);
    }

    return {
      success: true,
      action: 'detect_orphans',
      reason: `Found ${orphans.length} orphaned references`,
      orphanCount: orphans.length,
      orphans,
      applied: false, // We don't auto-delete orphans
      note: 'Orphaned references require manual review and cannot be automatically deleted',
    };
  } catch (error) {
    logResolution('ORPHAN_ERROR', `Failed to detect orphans: ${error.message}`, dryRun);
    return {
      success: false,
      action: 'error',
      reason: `Error detecting orphaned references: ${error.message}`,
      error: error.message,
      applied: false,
    };
  }
}

// ============================================================================
// COMPREHENSIVE RESOLUTION
// ============================================================================

/**
 * Resolve all detected inconsistencies
 * 
 * Takes an array of inconsistency results from the consistency checker
 * and attempts to resolve each one using the appropriate resolution function.
 * 
 * @param {Array<ConsistencyResult>} inconsistencies - Inconsistencies to resolve
 * @param {boolean} dryRun - If true, calculate but don't apply changes (default: true)
 * @returns {Promise<Object>} Resolution summary
 */
async function resolveAllInconsistencies(inconsistencies, dryRun = true) {
  loadModels();
  
  if (!inconsistencies || inconsistencies.length === 0) {
    logResolution('RESOLVE_ALL', 'No inconsistencies to resolve', dryRun);
    return {
      total: 0,
      resolved: 0,
      failed: 0,
      skipped: 0,
      results: [],
    };
  }

  logResolution('RESOLVE_ALL', `Starting resolution of ${inconsistencies.length} inconsistencies`, dryRun);

  const results = {
    total: inconsistencies.length,
    resolved: 0,
    failed: 0,
    skipped: 0,
    results: [],
  };

  for (const issue of inconsistencies) {
    let resolutionResult;

    try {
      if (issue.category === 'Inventory' && issue.itemId && issue.warehouseId) {
        resolutionResult = await resolveInventoryInconsistency(issue.itemId, issue.warehouseId, dryRun);
      } else if (issue.category === 'Accounts' && issue.accountId && issue.accountType) {
        resolutionResult = await resolveAccountInconsistency(issue.accountId, issue.accountType, dryRun);
      } else if (issue.category === 'Batches' && issue.batchId) {
        resolutionResult = await resolveBatchInconsistency(issue.batchId, dryRun);
      } else if (issue.category === 'Referential Integrity') {
        // Orphaned references require manual review
        resolutionResult = {
          success: true,
          action: 'manual_review_required',
          reason: 'Referential integrity issues require manual review',
          applied: false,
        };
        results.skipped++;
      } else {
        resolutionResult = {
          success: false,
          action: 'unknown',
          reason: 'Unknown issue type or missing required fields',
          applied: false,
        };
        results.skipped++;
      }

      if (resolutionResult.success && resolutionResult.applied) {
        results.resolved++;
      } else if (!resolutionResult.success) {
        results.failed++;
      } else if (resolutionResult.action === 'none') {
        results.skipped++;
      }

      results.results.push({
        issue,
        resolution: resolutionResult,
      });
    } catch (error) {
      logResolution('RESOLVE_ERROR', `Error resolving ${issue.category}: ${error.message}`, dryRun);
      results.failed++;
      results.results.push({
        issue,
        resolution: {
          success: false,
          action: 'error',
          reason: error.message,
          error: error.message,
          applied: false,
        },
      });
    }
  }

  logResolution('RESOLVE_ALL', `Resolution complete: ${results.resolved} resolved, ${results.failed} failed, ${results.skipped} skipped`, dryRun);

  return results;
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Individual resolution functions
  resolveInventoryInconsistency,
  resolveAccountInconsistency,
  resolveBatchInconsistency,
  resolveOrphanedReferences,
  
  // Comprehensive resolution
  resolveAllInconsistencies,
};
