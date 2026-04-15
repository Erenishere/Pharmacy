/**
 * Authorization Middleware
 * Re-exports authorization functions from auth middleware for backward compatibility
 */

const {
  authorize,
  requireAdmin,
  requireSales,
  requirePurchase,
  requireInventory,
  requireAccountant,
  requireDataEntry,
  requireRoles,
} = require('./auth');

module.exports = {
  authorize,
  requireAdmin,
  requireSales,
  requirePurchase,
  requireInventory,
  requireAccountant,
  requireDataEntry,
  requireRoles,
};
