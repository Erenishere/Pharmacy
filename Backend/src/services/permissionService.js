/**
 * Permission Service
 * Provides granular Role-Based Access Control (RBAC) with resource-specific permissions
 * Replaces broad role checks with fine-grained permission verification
 */

const User = require('../models/User');

class PermissionService {
  constructor() {
    // Define the permission matrix
    // Each role maps to a set of permission patterns
    this.permissionMatrix = {
      // Admin has all permissions
      admin: ['*'],
      
      // Sales Manager
      sales_manager: [
        'sales:*',
        'inventory:stock:view',
        'inventory:batch:view',
        'master:customer:*',
        'master:item:read',
        'master:company:read',
        'finance:receipt:create',
        'finance:receipt:read',
        'reports:sales:*',
        'reports:customer:*',
      ],
      
      // Salesman (field sales)
      salesman: [
        'sales:invoice:create',
        'sales:invoice:read:own',
        'sales:order:create',
        'sales:order:read:own',
        'sales:quotation:create',
        'sales:quotation:read:own',
        'sales:eorder:read',
        'sales:eorder:update:own',
        'inventory:stock:view',
        'master:customer:create',
        'master:customer:read',
        'master:customer:update:own',
        'master:item:read',
        'finance:receipt:create',
        'finance:receipt:read:own',
        'reports:sales:view:own',
      ],
      
      // Purchase Manager
      purchase_manager: [
        'purchase:*',
        'inventory:stock:view',
        'inventory:batch:*',
        'master:supplier:*',
        'master:item:read',
        'master:company:read',
        'finance:payment:create',
        'finance:payment:read',
        'reports:purchase:*',
        'reports:supplier:*',
        'reports:inventory:*',
      ],
      
      // Purchase Officer
      purchase_officer: [
        'purchase:order:create',
        'purchase:order:read',
        'purchase:order:update',
        'purchase:invoice:read',
        'inventory:stock:view',
        'master:supplier:read',
        'master:item:read',
        'reports:purchase:view',
      ],
      
      // Inventory Manager
      inventory_manager: [
        'inventory:*',
        'master:item:create',
        'master:item:read',
        'master:item:update',
        'master:batch:*',
        'purchase:invoice:read',
        'sales:invoice:read',
        'reports:inventory:*',
      ],
      
      // Warehouse Staff
      warehouse_staff: [
        'inventory:stock:view',
        'inventory:movement:create',
        'inventory:movement:read',
        'inventory:physicalcount:*',
        'master:item:read',
      ],
      
      // Accountant
      accountant: [
        'finance:*',
        'sales:invoice:read',
        'purchase:invoice:read',
        'master:customer:read',
        'master:supplier:read',
        'reports:financial:*',
        'reports:sales:view',
        'reports:purchase:view',
      ],
      
      // Cashier
      cashier: [
        'finance:receipt:create',
        'finance:receipt:read',
        'finance:payment:create',
        'finance:payment:read',
        'finance:cashbook:read',
        'sales:invoice:read',
        'sales:invoice:update:payment',
      ],
      
      // HR Manager
      hr_manager: [
        'hr-payroll:*',
        'master:employee:*',
        'reports:hr:*',
        'reports:payroll:*',
      ],
      
      // Data Entry Operator
      data_entry: [
        'master:customer:create',
        'master:customer:read',
        'master:customer:update',
        'master:supplier:create',
        'master:supplier:read',
        'master:supplier:update',
        'master:item:read',
        'sales:invoice:read',
        'purchase:order:read',
      ],
      
      // Viewer (read-only)
      viewer: [
        'master:customer:read',
        'master:supplier:read',
        'master:item:read',
        'master:company:read',
        'inventory:stock:view',
        'sales:invoice:read',
        'purchase:invoice:read',
        'finance:ledger:read',
        'reports:*:view',
      ],
    };

    // Resource definitions for wildcard expansion
    this.resourceDefinitions = {
      sales: ['invoice', 'return', 'order', 'quotation', 'eorder', 'estimate', 'scheme', 'pos'],
      purchase: ['order', 'invoice', 'return', 'transporter', 'bilty'],
      inventory: ['stock', 'movement', 'batch', 'warehouse', 'physicalcount', 'adjustment', 'transfer'],
      finance: ['receipt', 'payment', 'ledger', 'account', 'bankreconciliation', 'capital', 'expense', 'tax'],
      master: ['customer', 'supplier', 'item', 'company', 'category', 'formula', 'town', 'area'],
      'hr-payroll': ['employee', 'salarypackage', 'salarycalculation', 'attendance', 'letter'],
      reports: ['sales', 'purchase', 'inventory', 'financial', 'customer', 'supplier', 'hr'],
    };

    // Action definitions
    this.actions = ['create', 'read', 'update', 'delete', 'approve', 'reject', 'export', 'print'];
  }

  /**
   * Check if a user has a specific permission
   * @param {Object} user - User object or userId
   * @param {string} requiredPermission - Permission to check (e.g., 'sales:invoice:create')
   * @returns {boolean}
   */
  async hasPermission(user, requiredPermission) {
    // If user is just an ID, fetch the user
    let userObj = user;
    if (typeof user === 'string' || user instanceof require('mongoose').Types.ObjectId) {
      userObj = await User.findById(user).select('role permissions');
    }

    if (!userObj) return false;

    // Admin bypass
    if (userObj.role === 'admin') return true;

    // Get user's effective permissions
    const effectivePermissions = await this.getEffectivePermissions(userObj);

    // Check if any permission matches
    return effectivePermissions.some(permission => 
      this.matchesPermission(permission, requiredPermission)
    );
  }

  /**
   * Check multiple permissions (any or all)
   * @param {Object} user - User object
   * @param {Array<string>} permissions - Permissions to check
   * @param {string} mode - 'any' or 'all'
   * @returns {boolean}
   */
  async hasPermissions(user, permissions, mode = 'any') {
    if (!Array.isArray(permissions) || permissions.length === 0) {
      return true;
    }

    const results = await Promise.all(
      permissions.map(p => this.hasPermission(user, p))
    );

    if (mode === 'all') {
      return results.every(r => r);
    }
    return results.some(r => r);
  }

  /**
   * Get all effective permissions for a user
   * @param {Object} user - User object
   * @returns {Array<string>}
   */
  async getEffectivePermissions(user) {
    if (!user) return [];

    // Start with role-based permissions
    let permissions = [];
    
    if (user.role && this.permissionMatrix[user.role]) {
      permissions = [...this.permissionMatrix[user.role]];
    }

    // Add user-specific permissions
    if (user.permissions && Array.isArray(user.permissions)) {
      permissions = [...permissions, ...user.permissions];
    }

    // Expand wildcards and return unique permissions
    return this.expandPermissions([...new Set(permissions)]);
  }

  /**
   * Check if a permission pattern matches a required permission
   * @param {string} pattern - Permission pattern (may contain wildcards)
   * @param {string} required - Required permission
   * @returns {boolean}
   */
  matchesPermission(pattern, required) {
    // Exact match
    if (pattern === required) return true;

    // Universal wildcard
    if (pattern === '*') return true;

    const patternParts = pattern.split(':');
    const requiredParts = required.split(':');

    // Different segment counts - no match
    if (patternParts.length !== requiredParts.length) {
      // Check for partial wildcards like 'sales:invoice:*'
      if (patternParts.length < requiredParts.length) return false;
    }

    // Check each segment
    for (let i = 0; i < Math.min(patternParts.length, requiredParts.length); i++) {
      const patternPart = patternParts[i];
      const requiredPart = requiredParts[i];

      if (patternPart === '*') continue; // Wildcard matches anything
      if (patternPart !== requiredPart) return false;
    }

    return true;
  }

  /**
   * Expand wildcard permissions to concrete permissions
   * @param {Array<string>} permissions - Permissions with possible wildcards
   * @returns {Array<string>} Expanded permissions
   */
  expandPermissions(permissions) {
    const expanded = new Set();

    for (const permission of permissions) {
      if (permission === '*') {
        // Universal wildcard - add all possible permissions
        for (const [resource, subResources] of Object.entries(this.resourceDefinitions)) {
          for (const subResource of subResources) {
            for (const action of this.actions) {
              expanded.add(`${resource}:${subResource}:${action}`);
            }
          }
        }
      } else if (permission.includes('*')) {
        // Partial wildcard
        const expandedPerms = this.expandPartialWildcard(permission);
        expandedPerms.forEach(p => expanded.add(p));
      } else {
        // Concrete permission
        expanded.add(permission);
      }
    }

    return Array.from(expanded);
  }

  /**
   * Expand a partial wildcard permission
   * e.g., 'sales:invoice:*' -> ['sales:invoice:create', 'sales:invoice:read', ...]
   * @param {string} permission - Permission with wildcard
   * @returns {Array<string>}
   */
  expandPartialWildcard(permission) {
    const parts = permission.split(':');
    const expanded = [];

    if (parts.length === 2 && parts[1] === '*') {
      // Format: 'resource:*' -> all actions on all sub-resources
      const resource = parts[0];
      const subResources = this.resourceDefinitions[resource] || [];
      for (const subResource of subResources) {
        for (const action of this.actions) {
          expanded.push(`${resource}:${subResource}:${action}`);
        }
      }
    } else if (parts.length === 3 && parts[2] === '*') {
      // Format: 'resource:subresource:*' -> all actions on specific sub-resource
      const [resource, subResource] = parts;
      for (const action of this.actions) {
        expanded.push(`${resource}:${subResource}:${action}`);
      }
    } else if (parts.length === 3 && parts[1] === '*') {
      // Format: 'resource:*:action' -> specific action on all sub-resources
      const [resource, , action] = parts;
      const subResources = this.resourceDefinitions[resource] || [];
      for (const subResource of subResources) {
        expanded.push(`${resource}:${subResource}:${action}`);
      }
    } else {
      // Keep as-is if we can't expand
      expanded.push(permission);
    }

    return expanded;
  }

  /**
   * Get permissions for a specific role
   * @param {string} role - Role name
   * @returns {Array<string>}
   */
  getRolePermissions(role) {
    if (!role || !this.permissionMatrix[role]) {
      return [];
    }
    return this.expandPermissions(this.permissionMatrix[role]);
  }

  /**
   * Get all available roles
   * @returns {Array<string>}
   */
  getAvailableRoles() {
    return Object.keys(this.permissionMatrix);
  }

  /**
   * Get all available permissions
   * @returns {Array<string>}
   */
  getAllPermissions() {
    const all = new Set();
    for (const [resource, subResources] of Object.entries(this.resourceDefinitions)) {
      for (const subResource of subResources) {
        for (const action of this.actions) {
          all.add(`${resource}:${subResource}:${action}`);
        }
      }
    }
    return Array.from(all).sort();
  }

  /**
   * Validate if a permission string is valid
   * @param {string} permission - Permission to validate
   * @returns {boolean}
   */
  isValidPermission(permission) {
    if (!permission || typeof permission !== 'string') return false;
    
    const parts = permission.split(':');
    if (parts.length !== 3 && parts.length !== 2) return false;

    // Allow wildcards
    if (permission.includes('*')) return true;

    const [resource, subResource, action] = parts;
    
    if (parts.length === 3) {
      return this.resourceDefinitions[resource]?.includes(subResource) &&
             this.actions.includes(action);
    }
    
    return !!this.resourceDefinitions[resource];
  }

  /**
   * Create middleware for Express to check permissions
   * @param {string|Array<string>} permissions - Required permission(s)
   * @param {Object} options - Options
   * @returns {Function} Express middleware
   */
  middleware(permissions, options = {}) {
    const { mode = 'any', redirectTo = null } = options;
    
    return async (req, res, next) => {
      try {
        if (!req.user) {
          return res.status(401).json({
            success: false,
            message: 'Authentication required',
          });
        }

        const hasPerm = await this.hasPermissions(req.user, 
          Array.isArray(permissions) ? permissions : [permissions],
          mode
        );

        if (!hasPerm) {
          if (redirectTo) {
            return res.redirect(redirectTo);
          }
          
          return res.status(403).json({
            success: false,
            message: 'Access denied - insufficient permissions',
            required: permissions,
          });
        }

        next();
      } catch (error) {
        next(error);
      }
    };
  }

  /**
   * Check resource ownership
   * Used for 'own' scoping (e.g., salesman can only see their own invoices)
   * @param {Object} user - User object
   * @param {string} resourceType - Type of resource
   * @param {Object} resource - Resource object
   * @returns {boolean}
   */
  isResourceOwner(user, resourceType, resource) {
    if (!user || !resource) return false;

    // Admin owns everything
    if (user.role === 'admin') return true;

    switch (resourceType) {
      case 'sales:invoice':
        return resource.salesmanId?.toString() === user._id?.toString() ||
               resource.createdBy?.toString() === user._id?.toString();
      
      case 'sales:order':
        return resource.salesmanId?.toString() === user._id?.toString() ||
               resource.createdBy?.toString() === user._id?.toString();
      
      case 'master:customer':
        return resource.assignedUserId?.toString() === user._id?.toString();
      
      case 'finance:receipt':
        return resource.createdBy?.toString() === user._id?.toString();
      
      default:
        return false;
    }
  }

  /**
   * Grant additional permissions to a user
   * @param {string} userId - User ID
   * @param {Array<string>} permissions - Permissions to grant
   * @returns {Promise<Object>} Updated user
   */
  async grantPermissions(userId, permissions) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Validate permissions
    const validPermissions = permissions.filter(p => this.isValidPermission(p));
    
    user.permissions = [...new Set([...(user.permissions || []), ...validPermissions])];
    await user.save();

    return user;
  }

  /**
   * Revoke permissions from a user
   * @param {string} userId - User ID
   * @param {Array<string>} permissions - Permissions to revoke
   * @returns {Promise<Object>} Updated user
   */
  async revokePermissions(userId, permissions) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    user.permissions = (user.permissions || []).filter(
      p => !permissions.includes(p)
    );
    await user.save();

    return user;
  }

  /**
   * Check if action is allowed on resource
   * Convenience method combining permission check and ownership
   * @param {Object} user - User object
   * @param {string} action - Action (create, read, update, delete)
   * @param {string} resource - Resource type (e.g., 'sales:invoice')
   @param {Object} resourceObj - Resource object (for ownership check)
   * @returns {boolean}
   */
  async can(user, action, resource, resourceObj = null) {
    // Check general permission
    const hasGeneralPermission = await this.hasPermission(user, `${resource}:${action}`);
    
    if (hasGeneralPermission) return true;

    // Check 'own' scoped permission
    const hasOwnPermission = await this.hasPermission(user, `${resource}:${action}:own`);
    
    if (hasOwnPermission && resourceObj) {
      return this.isResourceOwner(user, resource, resourceObj);
    }

    return false;
  }
}

// Export singleton instance
module.exports = new PermissionService();
