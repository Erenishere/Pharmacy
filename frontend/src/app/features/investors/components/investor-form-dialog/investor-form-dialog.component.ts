import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { InvestorService, Investor } from '../../services/investor.service';

@Component({
  selector: 'app-investor-form-dialog',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatDialogModule, MatFormFieldModule,
    MatInputModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  templateUrl: './investor-form-dialog.component.html',
  styleUrl: './investor-form-dialog.component.scss'
})
export class InvestorFormDialogComponent implements OnInit {
  investorForm: FormGroup;
  loading = false;
  mode: 'create' | 'edit' = 'create';

  constructor(
    private fb: FormBuilder,
    private investorService: InvestorService,
    private snackBar: MatSnackBar,
    public dialogRef: MatDialogRef<InvestorFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { mode: 'create' | 'edit'; investor?: Investor }
  ) {
    this.mode = data.mode;
    this.investorForm = this.fb.group({
      code: ['', Validators.required],
      name: ['', Validators.required],
      contactPerson: [''],
      phone: [''],
      email: ['', Validators.email],
      address: [''],
      openingBalance: [0, [Validators.required, Validators.min(0)]]
    });
  }

  ngOnInit(): void {
    if (this.mode === 'edit' && this.data.investor) {
      this.investorForm.patchValue({
        code: this.data.investor.code,
        name: this.data.investor.name,
        contactPerson: this.data.investor.metadata?.contactPerson || '',
        phone: this.data.investor.metadata?.phone || '',
        email: this.data.investor.metadata?.email || '',
        address: this.data.investor.metadata?.address || '',
        openingBalance: this.data.investor.balance || 0
      });
    }
  }

  onSubmit(): void {
    if (this.investorForm.invalid) {
      this.investorForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    const formValue = this.investorForm.value;
    
    const investorData = {
      code: formValue.code,
      name: formValue.name,
      type: 'investor',
      category: 'capital',
      balance: formValue.openingBalance,
      isActive: true,
      metadata: {
        contactPerson: formValue.contactPerson,
        phone: formValue.phone,
        email: formValue.email,
        address: formValue.address,
        accountType: 'investor'
      }
    };

    const request = this.mode === 'create'
      ? this.investorService.createInvestor(investorData)
      : this.investorService.updateInvestor(this.data.investor!._id, investorData);

    request.subscribe({
      next: (response) => {
        if (response.success) {
          this.showMessage(
            this.mode === 'create' ? 'Investor created successfully' : 'Investor updated successfully',
            'success'
          );
          this.dialogRef.close(true);
        }
        this.loading = false;
      },
      error: () => {
        this.showMessage(
          this.mode === 'create' ? 'Failed to create investor' : 'Failed to update investor',
          'error'
        );
        this.loading = false;
      }
    });
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }

  showMessage(message: string, type: 'success' | 'error'): void {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      panelClass: type === 'success' ? 'snackbar-success' : 'snackbar-error'
    });
  }
}
