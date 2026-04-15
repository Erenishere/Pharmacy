import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';

function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');
    if (!password || !confirmPassword) return null;
    return password.value !== confirmPassword.value ? { passwordMismatch: true } : null;
}

@Component({
    selector: 'app-reset-password',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterModule],
    templateUrl: './reset-password.component.html',
    styleUrls: ['./reset-password.component.scss']
})
export class ResetPasswordComponent implements OnInit {
    resetForm: FormGroup;
    isLoading = false;
    successMessage = '';
    errorMessage = '';
    showPassword = false;
    showConfirmPassword = false;
    token = '';

    constructor(
        private fb: FormBuilder,
        private authService: AuthService,
        private route: ActivatedRoute,
        private router: Router
    ) {
        this.resetForm = this.fb.group(
            {
                password: ['', [Validators.required, Validators.minLength(6)]],
                confirmPassword: ['', Validators.required]
            },
            { validators: passwordMatchValidator }
        );
    }

    ngOnInit(): void {
        this.token = this.route.snapshot.queryParamMap.get('token') || '';
        if (!this.token) {
            this.errorMessage = 'Invalid reset link. Please request a new password reset.';
        }
    }

    onSubmit(): void {
        if (this.resetForm.invalid || !this.token) return;

        this.isLoading = true;
        this.successMessage = '';
        this.errorMessage = '';

        const { password } = this.resetForm.value;

        this.authService.resetPassword(this.token, password).subscribe({
            next: (response) => {
                this.isLoading = false;
                this.successMessage = response.message || 'Password reset successfully!';
                setTimeout(() => this.router.navigate(['/login']), 2500);
            },
            error: (error: any) => {
                this.isLoading = false;
                this.errorMessage = error.error?.message || 'Invalid or expired reset link. Please request a new one.';
            }
        });
    }
}
