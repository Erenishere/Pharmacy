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
    router.navigate(['/login']);
    return false;
  }

  const currentUser = authService.currentUserValue;
  const role = currentUser?.role?.toLowerCase();


  // Allow admin, manager, and data_entry roles to access master data
  const allowedRoles = ['admin', 'manager', 'data_entry'];
  
  if (role && allowedRoles.includes(role)) {
    return true;
  }

  router.navigate(['/dashboard']);
  return false;
};
