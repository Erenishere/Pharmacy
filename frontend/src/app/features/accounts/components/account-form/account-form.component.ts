import { Component, OnInit, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTabsModule } from '@angular/material/tabs';

import { AccountService, Account } from '../../services/account.service';

@Component({
  selector: 'app-account-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatOptionModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDividerModule,
    MatCheckboxModule,
    MatTabsModule
  ],
  templateUrl: './account-form.component.html',
  styleUrls: ['./account-form.component.scss']
})
export class AccountFormComponent implements OnInit {
  accountForm: FormGroup;
  loading = false;
  saving = false;
  isEditMode = false;
  accountId: string | null = null;

  accountTypes = [
    { value: 'customer', label: 'Customer' },
    { value: 'supplier', label: 'Supplier' },
    { value: 'employee', label: 'Employee' },
    { value: 'investor', label: 'Investor' },
    { value: 'both', label: 'Both' }
  ];

  customerTypes = [
    { value: 'retailer', label: 'Retailer' },
    { value: 'wholesaler', label: 'Wholesaler' },
    { value: 'distributor', label: 'Distributor' },
    { value: 'hospital', label: 'Hospital' },
    { value: 'pharmacy', label: 'Pharmacy' }
  ];

  bloodGroups = [
    { value: 'A+', label: 'A+' },
    { value: 'A-', label: 'A-' },
    { value: 'B+', label: 'B+' },
    { value: 'B-', label: 'B-' },
    { value: 'AB+', label: 'AB+' },
    { value: 'AB-', label: 'AB-' },
    { value: 'O+', label: 'O+' },
    { value: 'O-', label: 'O-' }
  ];

  balanceTypes = [
    { value: 'debit', label: 'Debit' },
    { value: 'credit', label: 'Credit' }
  ];

  constructor(
    private fb: FormBuilder,
    private accountService: AccountService,
    private route: ActivatedRoute,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    this.accountForm = this.createForm();
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.accountId = params['id'];
      this.isEditMode = !!this.accountId;

      if (this.isEditMode && this.accountId) {
        this.loadAccount(this.accountId);
      }
    });
  }

  createForm(): FormGroup {
    return this.fb.group({
      // Basic Information
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(200)]],
      accountType: ['customer', Validators.required],
      parentAccountId: [''],
      dimensionId: [''],
      isActive: [true],

      // Contact Information
      contactInfo: this.fb.group({
        email: ['', [Validators.email]],
        phone: [''],
        mobile: [''],
        address: [''],
        city: [''],
        nicNumber: ['', [Validators.maxLength(20)]]
      }),

      // Business Details
      businessDetails: this.fb.group({
        customerType: ['retailer'],
        creditAmountLimit: [0, [Validators.min(0)]],
        creditDaysLimit: [0, [Validators.min(0), Validators.max(365)]],
        balanceType: ['debit'],
        openingBalance: [0]
      }),

      // Employee Biodata
      employeeBiodata: this.fb.group({
        designation: [''],
        department: [''],
        basicPay: [0, [Validators.min(0)]],
        dateOfBirth: [''],
        dateOfJoining: [''],
        bloodGroup: ['']
      }),

      // Banking Information
      bankingInfo: this.fb.group({
        bankName: [''],
        accountNumber: ['', [Validators.maxLength(50)]],
        iban: [''],
        swiftCode: ['']
      }),

      // Location
      townId: [''],
      areaId: [''],

      // Additional
      notes: ['']
    });
  }

  loadAccount(id: string): void {
    this.loading = true;
    this.accountService.getAccountById(id).subscribe({
      next: (response) => {
        const account = response.data;
        this.populateForm(account);
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading account:', error);
        this.snackBar.open('Failed to load account', 'Close', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  populateForm(account: Account): void {
    this.accountForm.patchValue({
      name: account.name,
      accountType: account.accountType,
      parentAccountId: (account.parentAccountId as any)?._id || account.parentAccountId || '',
      dimensionId: (account.dimensionId as any)?._id || account.dimensionId || '',
      isActive: account.isActive,
      townId: (account.townId as any)?._id || account.townId || '',
      areaId: (account.areaId as any)?._id || account.areaId || '',
      notes: account.notes || '',

      contactInfo: {
        email: account.contactInfo?.email || '',
        phone: account.contactInfo?.phone || '',
        mobile: account.contactInfo?.mobile || '',
        address: account.contactInfo?.address || '',
        city: account.contactInfo?.city || '',
        nicNumber: account.contactInfo?.nicNumber || ''
      },

      businessDetails: {
        customerType: account.businessDetails?.customerType || 'retailer',
        creditAmountLimit: account.businessDetails?.creditAmountLimit || 0,
        creditDaysLimit: account.businessDetails?.creditDaysLimit || 0,
        balanceType: account.businessDetails?.balanceType || 'debit',
        openingBalance: account.businessDetails?.openingBalance || 0
      },

      employeeBiodata: {
        designation: account.employeeBiodata?.designation || '',
        department: account.employeeBiodata?.department || '',
        basicPay: account.employeeBiodata?.basicPay || 0,
        dateOfBirth: account.employeeBiodata?.dateOfBirth || '',
        dateOfJoining: account.employeeBiodata?.dateOfJoining || '',
        bloodGroup: account.employeeBiodata?.bloodGroup || ''
      },

      bankingInfo: {
        bankName: account.bankingInfo?.bankName || '',
        accountNumber: account.bankingInfo?.accountNumber || '',
        iban: account.bankingInfo?.iban || '',
        swiftCode: account.bankingInfo?.swiftCode || ''
      }
    });
  }

  onAccountTypeChange(): void {
    const accountType = this.accountForm.get('accountType')?.value;

    // Reset conditional fields based on account type
    if (accountType === 'customer' || accountType === 'both') {
      // Keep business details
    } else if (accountType === 'supplier') {
      // Keep business details for credit terms
    } else if (accountType === 'employee') {
      // Employee specific fields are available
    } else if (accountType === 'investor') {
      // Minimal requirements
    }
  }

  onSubmit(): void {
    if (this.accountForm.invalid) {
      this.markFormGroupTouched(this.accountForm);
      this.snackBar.open('Please fill all required fields correctly', 'Close', { duration: 4000 });
      return;
    }

    this.saving = true;
    const accountData = this.accountForm.value;

    const request = this.isEditMode && this.accountId
      ? this.accountService.updateAccount(this.accountId, accountData)
      : this.accountService.createAccount(accountData);

    request.subscribe({
      next: (response) => {
        this.saving = false;
        const action = this.isEditMode ? 'updated' : 'created';
        this.snackBar.open(`Account ${action} successfully`, 'Close', { duration: 3000 });
        this.router.navigate(['/accounts']);
      },
      error: (error) => {
        console.error('Error saving account:', error);
        this.saving = false;
        const errorMessage = error.error?.message || `Failed to ${this.isEditMode ? 'update' : 'create'} account`;
        this.snackBar.open(errorMessage, 'Close', { duration: 5000 });
      }
    });
  }

  onCancel(): void {
    this.router.navigate(['/accounts']);
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();

      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  getFormFieldError(fieldPath: string): string {
    const field = this.accountForm.get(fieldPath);
    if (field?.hasError('required')) {
      return 'This field is required';
    }
    if (field?.hasError('email')) {
      return 'Please enter a valid email address';
    }
    if (field?.hasError('minlength')) {
      return 'Value is too short';
    }
    if (field?.hasError('maxlength')) {
      return 'Value is too long';
    }
    if (field?.hasError('min')) {
      return 'Value must be greater than or equal to ' + field.errors?.['min']?.min;
    }
    return '';
  }
}