const VALID_USER_ROLES = Object.freeze([
  'admin',
  'manager',
  'hr',
  'salesman',
  'accountant',
  'store_keeper',
  'store_incharge',
  'deliveryman',
  'driver',
  'it_support',
  'data_entry',
  'custom',
  'sales',
  'inventory',
  'purchase',
]);

const ROLE_ALIASES = Object.freeze({
  'inventory-manager': 'inventory',
  inventory_manager: 'inventory',
  purchase_manager: 'purchase',
  purchase_officer: 'purchase',
  sales_manager: 'sales',
  warehouse_staff: 'store_keeper',
  hr_manager: 'hr',
});

const normalizeRole = (role) => {
  if (!role) {
    return role;
  }

  return ROLE_ALIASES[role] || role;
};

const normalizeRoles = (roles = []) => {
  const values = Array.isArray(roles) ? roles : [roles];
  return [...new Set(values.filter(Boolean).map(normalizeRole))];
};

module.exports = {
  VALID_USER_ROLES,
  ROLE_ALIASES,
  normalizeRole,
  normalizeRoles,
};
