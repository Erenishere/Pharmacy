import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
    selector: 'app-forgot-password',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterModule],
    templateUrl: './forgot-password.component.html',
    styleUrls: ['./forgot-password.component.scss']
})
export class ForgotPasswordComponent {
    forgotForm: FormGroup;
    verifyForm: FormGroup;
    isLoading = false;
    currentStep: 'email' | 'otp' = 'email';
    successMessage = '';
    errorMessage = '';
    submittedEmail = '';

    constructor(
        private fb: FormBuilder,
        private authService: AuthService,
        private router: Router
    ) {
        this.forgotForm = this.fb.group({
            email: ['', [Validators.required, Validators.email]]
        });

        this.verifyForm = this.fb.group({
            otp: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6), Validators.pattern('^[0-9]*$')]]
        });
    }

    onSubmitEmail(): void {
        if (this.forgotForm.invalid) return;

        this.isLoading = true;
        this.errorMessage = '';
        this.successMessage = '';

        const { email } = this.forgotForm.value;
        this.submittedEmail = email;

        this.authService.forgotPassword(email).subscribe({
            next: (response) => {
                this.isLoading = false;
                this.currentStep = 'otp';
                this.successMessage = response.message || 'Verification code sent to your email.';
            },
            error: (error: any) => {
                this.isLoading = false;
                this.errorMessage = error.error?.message || 'Something went wrong. Please try again.';
            }
        });
    }

    onVerifyOTP(): void {
        if (this.verifyForm.invalid) return;

        this.isLoading = true;
        this.errorMessage = '';

        const { otp } = this.verifyForm.value;

        this.authService.verifyOTP(this.submittedEmail, otp).subscribe({
            next: (response) => {
                this.isLoading = false;
                if (response.success && response.data?.token) {
                    // Success! Redirect to reset password with the token
                    this.router.navigate(['/reset-password'], { 
                        queryParams: { token: response.data.token } 
                    });
                }
            },
            error: (error: any) => {
                this.isLoading = false;
                this.errorMessage = error.error?.message || 'Invalid or expired code. Please try again.';
            }
        });
    }

    resendOTP(): void {
        this.onSubmitEmail();
    }

    backToEmail(): void {
        this.currentStep = 'email';
        this.successMessage = '';
        this.errorMessage = '';
    }
}
