import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { CompanyMasterService, Company } from '../../services/company-master.service';
import { ToastService } from '../../../../shared/services/toast.service';

@Component({
  selector: 'app-company-master-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatCheckboxModule
  ],
  template: `
    <h2 mat-dialog-title>{{ mode === 'create' ? 'Add New Company' : 'Edit Company' }}</h2>
    
    <mat-dialog-content>
      <form [formGroup]="companyForm">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Company Name *</mat-label>
          <input matInput formControlName="name" placeholder="Enter company name">
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Group Type *</mat-label>
          <mat-select formControlName="groupType">
            <mat-option value="A">Group A</mat-option>
            <mat-option value="B">Group B</mat-option>
            <mat-option value="C">Group C</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Contact Person</mat-label>
          <input matInput formControlName="contactPerson">
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Phone</mat-label>
          <input matInput formControlName="phone">
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Email</mat-label>
          <input matInput type="email" formControlName="email">
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Address</mat-label>
          <textarea matInput formControlName="address" rows="3"></textarea>
        </mat-form-field>

        <mat-checkbox formControlName="isActive">Active</mat-checkbox>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()" [disabled]="loading">Cancel</button>
      <button mat-raised-button color="primary" (click)="onSubmit()" [disabled]="loading || companyForm.invalid">
        {{ loading ? 'Saving...' : (mode === 'create' ? 'Create' : 'Update') }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .full-width { width: 100%; margin-bottom: 16px; }
    mat-dialog-content { min-width: 500px; padding: 20px; }
    mat-checkbox { margin-top: 8px; }
  `]
})
export class CompanyMasterFormComponent implements OnInit {
  companyForm!: FormGroup;
  mode: 'create' | 'edit' = 'create';
  loading = false;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<CompanyMasterFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private companyService: CompanyMasterService,
    private toastService: ToastService
  ) {
    this.mode = data.mode || 'create';
  }

  ngOnInit() {
    this.companyForm = this.fb.group({
      name: ['', Validators.required],
      groupType: ['', Validators.required],
      contactPerson: [''],
      phone: [''],
      email: ['', Validators.email],
      address: [''],
      isActive: [true]
    });

    if (this.mode === 'edit' && this.data.company) {
      this.companyForm.patchValue(this.data.company);
    }
  }

  onSubmit() {
    if (this.companyForm.invalid) {
      this.toastService.error('Please fill all required fields');
      return;
    }

    this.loading = true;
    const request = this.mode === 'create'
      ? this.companyService.createCompany(this.companyForm.value)
      : this.companyService.updateCompany(this.data.company._id, this.companyForm.value);

    request.subscribe({
      next: (response) => {
        if (response.success) {
          this.toastService.success(`Company ${this.mode === 'create' ? 'created' : 'updated'} successfully`);
          this.dialogRef.close(true);
        }
        this.loading = false;
      },
      error: (err) => {
        this.toastService.error(`Failed to ${this.mode === 'create' ? 'create' : 'update'} company`);
        this.loading = false;
      }
    });
  }

  onCancel() {
    this.dialogRef.close(false);
  }
}
