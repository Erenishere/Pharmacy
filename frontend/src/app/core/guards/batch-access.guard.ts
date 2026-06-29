import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { STORAGE_KEYS } from '../constants/api.constants';

export const batchAccessGuard: CanActivateFn = (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    // Check if user is authenticated
    if (!authService.isAuthenticated()) {
        router.navigate(['/login']);
        return false;
    }

    // Get user from localStorage synchronously
    const userStr = localStorage.getItem(STORAGE_KEYS.USER);
    if (!userStr) {
        router.navigate(['/login']);
        return false;
    }

    try {
        const user = JSON.parse(userStr);

        // Allow access for admin and inventory manager roles
        const role = user?.role?.toLowerCase();
        if (role === 'admin' || role === 'inventory') {
            return true;
        }

        router.navigate(['/dashboard']);
        return false;
    } catch (error) {
        console.error('[BatchAccessGuard] Error parsing user:', error);
        router.navigate(['/login']);
        return false;
    }
};