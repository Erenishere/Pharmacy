const authService = require('../services/authService');
const Response = require('../utils/response');
const { normalizeRole, normalizeRoles } = require('../utils/roleUtils');

/**
 * Middleware to authenticate JWT tokens
 * Extracts token from Authorization header and validates it
 */
const authenticate = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return Response.error(res, 'No token provided', 401, 'UNAUTHORIZED');
    }

    // Check if token starts with 'Bearer '
    if (!authHeader.startsWith('Bearer ')) {
      return Response.error(res, 'Invalid token format. Use Bearer <token>', 401, 'UNAUTHORIZED');
    }

    // Extract token
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    if (!token) {
      return Response.error(res, 'No token provided', 401, 'UNAUTHORIZED');
    }

    req.authToken = token;

    // Validate token and get user
    const user = await authService.validateTokenAndGetUser(token);

    // Attach user to request object
    req.user = user;
    next();
  } catch (error) {
    if (error.message === 'Token has expired' || error.message === 'Session has expired') {
      return Response.error(res, 'Your session has expired. Please login again.', 401, 'TOKEN_EXPIRED');
    }

    if (error.message === 'Invalid token') {
      return Response.error(res, 'Invalid authentication token', 401, 'INVALID_TOKEN');
    }

    if (error.message === 'User not found') {
      return Response.error(res, 'User associated with this token no longer exists', 401, 'USER_NOT_FOUND');
    }

    if (error.message === 'User account is inactive') {
      return Response.error(res, 'Your account has been deactivated', 401, 'ACCOUNT_INACTIVE');
    }

    console.error('Authentication error:', error);
    return Response.error(res, 'An error occurred during authentication', 500, 'INTERNAL_SERVER_ERROR');
  }
};

/**
 * Middleware to authorize based on user roles
 * @param {string|string[]} allowedRoles - Single role or array of allowed roles
 */
const authorize = (...allowedRolesInput) => (req, res, next) => {
  try {
    // Check if user is attached to request (should be done by authenticate middleware)
    if (!req.user) {
      return Response.error(res, 'User not authenticated', 401, 'UNAUTHORIZED');
    }

    const rawRoles = allowedRolesInput.length === 1 && Array.isArray(allowedRolesInput[0])
      ? allowedRolesInput[0]
      : allowedRolesInput;
    const roles = normalizeRoles(rawRoles);

    if (roles.length === 0) {
      return Response.error(res, 'Route authorization is misconfigured', 500, 'INTERNAL_SERVER_ERROR');
    }

    // Check if user's role is in allowed roles
    if (!roles.includes(normalizeRole(req.user.role))) {
      return Response.error(res, 'You do not have permission to perform this action', 403, 'FORBIDDEN');
    }

    next();
  } catch (error) {
    console.error('Authorization error:', error);
    return Response.error(res, 'An error occurred during authorization', 500, 'INTERNAL_SERVER_ERROR');
  }
};

/**
 * Middleware for admin-only access
 */
const requireAdmin = authorize('admin');

/**
 * Middleware for sales-related access (admin, sales)
 */
const requireSales = authorize(['admin', 'sales', 'salesman']);

/**
 * Middleware for purchase-related access (admin, purchase)
 */
const requirePurchase = authorize(['admin', 'purchase']);

/**
 * Middleware for inventory-related access (admin, inventory, sales, purchase)
 */
const requireInventory = authorize(['admin', 'inventory', 'sales', 'purchase']);

/**
 * Middleware for accounting-related access (admin, accountant)
 */
const requireAccountant = authorize(['admin', 'accountant']);

/**
 * Middleware for data entry access (admin, data_entry, sales, purchase)
 */
const requireDataEntry = authorize(['admin', 'data_entry', 'sales', 'purchase']);

/**
 * Helper function to create role-based middleware
 * @param {string[]} roles - Array of allowed roles
 */
const requireRoles = (roles) => authorize(roles);

/**
 * Optional authentication middleware
 * Authenticates if token is present, but doesn't fail if not
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);

      if (token) {
        try {
          const user = await authService.validateTokenAndGetUser(token);
          req.user = user;
        } catch (error) {
          // Ignore authentication errors in optional auth
          console.log('Optional auth failed:', error.message);
        }
      }
    }

    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};

/**
 * Middleware to apply dimension-based data filtering
 * Master Data Management - Requirements 10.8-10.9
 * Adds dimension filter to request for use in queries
 */
const applyDimensionFilter = async (req, res, next) => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
    }

    // Admin has access to all data
    if (req.user.role === 'admin') {
      req.dimensionFilter = {};
      req.dimensionBased = false;
      return next();
    }

    // Check if user has dimension-based access enabled
    if (!req.user.permissions || !req.user.permissions.dataAccess || !req.user.permissions.dataAccess.dimensionBased) {
      req.dimensionFilter = {};
      req.dimensionBased = false;
      return next();
    }

    // Apply dimension filter
    const allowedDimensions = req.user.permissions.dataAccess.allowedDimensions || [];

    if (allowedDimensions.length === 0) {
      // No dimensions allowed - user can't access any data
      req.dimensionFilter = { dimensionId: null };
      req.dimensionBased = true;
    } else {
      // Filter by allowed dimensions
      req.dimensionFilter = {
        dimensionId: { $in: allowedDimensions },
      };
      req.dimensionBased = true;
    }

    req.allowedDimensions = allowedDimensions;
    next();
  } catch (error) {
    console.error('Dimension filter error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'An error occurred while applying dimension filter',
    });
  }
};

/**
 * Middleware to check if user has access to a specific dimension
 * Master Data Management - Requirement 10.8
 * @param {string} dimensionIdParam - Name of the parameter containing dimension ID (default: 'dimensionId')
 */
const checkDimensionAccess = (dimensionIdParam = 'dimensionId') => async (req, res, next) => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
    }

    // Admin has access to all dimensions
    if (req.user.role === 'admin') {
      return next();
    }

    // Get dimension ID from request (params, body, or query)
    const dimensionId = req.params[dimensionIdParam] || req.body[dimensionIdParam] || req.query[dimensionIdParam];

    if (!dimensionId) {
      // No dimension specified, continue
      return next();
    }

    // Check if user has dimension-based access enabled
    if (!req.user.permissions || !req.user.permissions.dataAccess || !req.user.permissions.dataAccess.dimensionBased) {
      // Dimension-based access not enabled, allow access
      return next();
    }

    // Check if user has access to this dimension
    const allowedDimensions = req.user.permissions.dataAccess.allowedDimensions || [];
    const hasAccess = allowedDimensions.some(
      (allowedDim) => allowedDim.toString() === dimensionId.toString(),
    );

    if (!hasAccess) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have access to this dimension',
      });
    }

    next();
  } catch (error) {
    console.error('Dimension access check error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'An error occurred while checking dimension access',
    });
  }
};

/**
 * Middleware to validate dimension ID in request
 * Master Data Management - Requirement 10.8
 */
const validateDimensionId = async (req, res, next) => {
  try {
    const dimensionId = req.body.dimensionId || req.params.dimensionId || req.query.dimensionId;

    if (!dimensionId) {
      return next();
    }

    // Validate dimension exists
    const DimensionBranch = require('../models/DimensionBranch');
    const dimension = await DimensionBranch.findById(dimensionId);

    if (!dimension) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Invalid dimension ID',
      });
    }

    next();
  } catch (error) {
    console.error('Dimension validation error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'An error occurred while validating dimension',
    });
  }
};

module.exports = {
  authenticate,
  authorize,
  normalizeRole,
  normalizeRoles,
  requireAdmin,
  requireSales,
  requirePurchase,
  requireInventory,
  requireAccountant,
  requireDataEntry,
  requireRoles,
  optionalAuth,
  applyDimensionFilter,
  checkDimensionAccess,
  validateDimensionId,
};
