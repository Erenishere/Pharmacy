import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Guard for Master Data Management access
 * Allows: admin, manager, data_entry roles
 */
export const masterDataGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    console.log('[MasterDataGuard] User not authenticated, redirecting to login');
    router.navigate(['/login']);
    return false;
  }

  const currentUser = authService.currentUserValue;
  const role = currentUser?.role?.toLowerCase();

  console.log('[MasterDataGuard] User role:', role);

  // Allow admin, manager, and data_entry roles to access master data
  const allowedRoles = ['admin', 'manager', 'data_entry'];
  
  if (role && allowedRoles.includes(role)) {
    console.log('[MasterDataGuard] Access granted for role:', role);
    return true;
  }

  console.log('[MasterDataGuard] Access denied for role:', role);
  router.navigate(['/dashboard']);
  return false;
};
