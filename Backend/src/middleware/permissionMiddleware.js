/**
 * Permission Middleware
 * Express middleware for granular permission checking
 * Provides requirePermission and requireAllPermissions functions
 */

const permissionService = require('../services/permissionService');
const Response = require('../utils/response');

/**
 * Require specific permission(s)
 * @param {string|Array<string>} permissions - Required permission(s)
 * @param {Object} options - Options
 * @param {string} options.mode - 'any' or 'all'
 * @param {boolean} options.checkOwnership - Also check resource ownership
 * @param {string} options.resourceType - Resource type for ownership check
 * @returns {Function} Express middleware
 */
function requirePermission(permissions, options = {}) {
  const { mode = 'any', checkOwnership = false, resourceType = null } = options;

  return async (req, res, next) => {
    try {
      // Ensure user is authenticated
      if (!req.user) {
        return Response.error(res, 'Authentication required', 401, 'UNAUTHORIZED');
      }

      // Convert single permission to array
      const perms = Array.isArray(permissions) ? permissions : [permissions];

      // Check permissions
      const hasPermission = await permissionService.hasPermissions(req.user, perms, mode);

      if (!hasPermission) {
        // Check for 'own' scoped permissions if resource ownership is provided
        if (checkOwnership && resourceType && req.resource) {
          const hasOwnPermission = await permissionService.hasPermissions(
            req.user,
            perms.map(p => `${p}:own`),
            mode
          );

          if (hasOwnPermission && permissionService.isResourceOwner(req.user, resourceType, req.resource)) {
            return next();
          }
        }

        return Response.error(res, 
          `Access denied. Required permission${perms.length > 1 ? 's' : ''}: ${perms.join(', ')}`,
          403,
          'FORBIDDEN'
        );
      }

      next();
    } catch (error) {
      console.error('Permission middleware error:', error);
      return Response.error(res, 'Permission check failed', 500, 'INTERNAL_ERROR');
    }
  };
}

/**
 * Require all specified permissions
 * @param {Array<string>} permissions - Required permissions
 * @returns {Function} Express middleware
 */
function requireAllPermissions(permissions) {
  return requirePermission(permissions, { mode: 'all' });
}

/**
 * Require any of the specified permissions
 * @param {Array<string>} permissions - Permissions (any one will suffice)
 * @returns {Function} Express middleware
 */
function requireAnyPermission(permissions) {
  return requirePermission(permissions, { mode: 'any' });
}

/**
 * Check resource ownership middleware
 * Attaches ownership info to request for subsequent checks
 * @param {string} resourceType - Type of resource (e.g., 'sales:invoice')
 * @param {Function} fetchResource - Async function to fetch resource by ID
 * @returns {Function} Express middleware
 */
function checkOwnership(resourceType, fetchResource) {
  return async (req, res, next) => {
    try {
      const resourceId = req.params.id || req.body.id;
      if (!resourceId) {
        return Response.error(res, 'Resource ID required', 400);
      }

      const resource = await fetchResource(resourceId);
      if (!resource) {
        return Response.error(res, 'Resource not found', 404);
      }

      req.resource = resource;
      req.isOwner = permissionService.isResourceOwner(req.user, resourceType, resource);
      req.resourceType = resourceType;

      next();
    } catch (error) {
      console.error('Ownership check error:', error);
      return Response.error(res, 'Ownership check failed', 500);
    }
  };
}

/**
 * Require ownership of resource
 * @param {string} resourceType - Resource type
 * @param {boolean} options.allowAdmin - Allow admin to bypass ownership
 * @returns {Function} Express middleware
 */
function requireOwnership(resourceType, options = {}) {
  const { allowAdmin = true } = options;

  return (req, res, next) => {
    // Admin bypass
    if (allowAdmin && req.user?.role === 'admin') {
      return next();
    }

    // Check if ownership was already verified
    if (req.isOwner === true) {
      return next();
    }

    // Check resource ownership
    if (req.resource && permissionService.isResourceOwner(req.user, resourceType, req.resource)) {
      return next();
    }

    return Response.error(res, 'Access denied - resource ownership required', 403, 'NOT_OWNER');
  };
}

/**
 * Conditional permission check
 * Applies different permission requirements based on request conditions
 * @param {Object} conditions - Map of condition functions to permission arrays
 * @returns {Function} Express middleware
 */
function conditionalPermissions(conditions) {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return Response.error(res, 'Authentication required', 401);
      }

      for (const [conditionFn, permissions] of Object.entries(conditions)) {
        const conditionMet = await conditionFn(req, res);
        
        if (conditionMet) {
          const hasPerm = await permissionService.hasPermissions(
            req.user,
            Array.isArray(permissions) ? permissions : [permissions],
            'all'
          );

          if (!hasPerm) {
            return Response.error(res, 
              `Access denied for this operation. Required: ${permissions}`,
              403
            );
          }
          
          return next();
        }
      }

      // No conditions matched - deny by default
      return Response.error(res, 'Operation not allowed', 403);
    } catch (error) {
      console.error('Conditional permission error:', error);
      return Response.error(res, 'Permission check failed', 500);
    }
  };
}

/**
 * Rate limit by permission
 * Different rate limits for different permission levels
 * @param {Object} limits - Map of permission patterns to rate limit configs
 * @returns {Function} Express middleware
 */
function permissionBasedRateLimit(limits) {
  const userLimits = new Map();

  return async (req, res, next) => {
    try {
      if (!req.user) {
        return next(); // Let auth middleware handle this
      }

      // Find applicable limit
      let applicableLimit = null;
      const effectivePerms = await permissionService.getEffectivePermissions(req.user);

      for (const [pattern, limit] of Object.entries(limits)) {
        if (effectivePerms.some(p => permissionService.matchesPermission(p, pattern))) {
          applicableLimit = limit;
          break;
        }
      }

      if (!applicableLimit) {
        return next(); // No limit defined for this user
      }

      const key = `${req.user._id}:${req.route?.path || req.path}`;
      const now = Date.now();
      const windowStart = now - applicableLimit.windowMs;

      // Get or initialize user's request history
      if (!userLimits.has(key)) {
        userLimits.set(key, []);
      }

      const requests = userLimits.get(key).filter(time => time > windowStart);
      
      if (requests.length >= applicableLimit.max) {
        return Response.error(res, 'Rate limit exceeded for your permission level', 429);
      }

      requests.push(now);
      userLimits.set(key, requests);

      // Add rate limit headers
      res.setHeader('X-RateLimit-Limit', applicableLimit.max);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, applicableLimit.max - requests.length));

      next();
    } catch (error) {
      console.error('Rate limit error:', error);
      next();
    }
  };
}

/**
 * Audit action middleware
 * Logs actions with user permissions at the time of action
 * @param {string} action - Action being performed
 * @param {string} resource - Resource type
 * @returns {Function} Express middleware
 */
function auditAction(action, resource) {
  return async (req, res, next) => {
    // Store permissions for audit
    req.actionMetadata = {
      action,
      resource,
      userRole: req.user?.role,
      userPermissions: req.user?.permissions,
      timestamp: new Date(),
    };

    next();
  };
}

module.exports = {
  requirePermission,
  requireAllPermissions,
  requireAnyPermission,
  checkOwnership,
  requireOwnership,
  conditionalPermissions,
  permissionBasedRateLimit,
  auditAction,
};
