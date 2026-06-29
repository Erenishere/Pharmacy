import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../models/user.model';

export const adminGuard: CanActivateFn = (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    // Check if user is authenticated
    if (!authService.isAuthenticated()) {
        router.navigate(['/login']);
        return false;
    }

    const currentUser = authService.currentUserValue;
    const role = currentUser?.role?.toLowerCase();


    if (role === UserRole.ADMIN || role === 'admin') {
        return true;
    }

    // For non-admins, redirect to dashboard. dashboardGuard will further handle sales role if needed.
    router.navigate(['/dashboard']);
    return false;
};
