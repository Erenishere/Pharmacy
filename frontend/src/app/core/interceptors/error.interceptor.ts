import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError, retry, timer } from 'rxjs';
import { Router } from '@angular/router';
import { ToastService } from '../../shared/services/toast.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
    const router = inject(Router);
    const toastService = inject(ToastService);

    return next(req).pipe(
        // Retry logic for transient failures
        retry({
            count: 2,
            delay: (error: HttpErrorResponse, retryCount: number) => {
                // Only retry for specific error codes and non-destructive methods
                const retryableErrors = [0, 408, 429, 500, 502, 503, 504];
                const retryableMethods = ['GET', 'HEAD', 'OPTIONS'];

                if (retryableErrors.includes(error.status) &&
                    retryableMethods.includes(req.method.toUpperCase())) {
                    // Exponential backoff: 1s, 2s, 4s...
                    const delayMs = Math.pow(2, retryCount) * 1000;
                    return timer(delayMs);
                }

                // Don't retry for other errors
                return throwError(() => error);
            }
        }),
        catchError((error: HttpErrorResponse) => {
            if (error.error instanceof ErrorEvent) {
                // Client-side / network error
                toastService.error(`Network error: ${error.error.message}`);
            } else if (error.status === 401) {
                // Auth error — redirect to login
                router.navigate(['/login']);
            } else if (error.status === 0) {
                toastService.error('Network connection failed. Please check your internet connection.');
            }
            // For all other errors (400, 403, 404, 500, etc.), let the
            // component error handler display a contextual message.
            // Pass through the original HttpErrorResponse unchanged.
            return throwError(() => error);
        })
    );
};