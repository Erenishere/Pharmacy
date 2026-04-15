import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatCardModule } from '@angular/material/card';
import { WarehouseService, Warehouse } from '../../services/warehouse.service';
import { ToastService } from '../../../../shared/services/toast.service';

/**
 * Warehouse Form Dialog Component
 * Dedicated form for creating and editing warehouses with all required fields
 */
@Component({
  selector: 'app-warehouse-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatCardModule
  ],
  template: `
    <div class="warehouse-form-dialog">
      <h2 mat-dialog-title class="dialog-title">
        <mat-icon>{{ isEditMode ? 'edit' : 'add_business' }}</mat-icon>
        {{ isEditMode ? 'Edit' : 'Create' }} Warehouse
      </h2>

      <mat-dialog-content class="dialog-content">
        <form [formGroup]="warehouseForm" class="warehouse-form">
          <!-- Basic Information -->
          <mat-card class="form-section">
            <mat-card-header>
              <mat-card-title>Basic Information</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="form-row">
                <mat-form-field appearance="outline">
                  <mat-label>Code</mat-label>
                  <input matInput formControlName="code" [readonly]="isEditMode" placeholder="Auto-generated if empty">
                  <mat-hint>Leave empty for auto-generation</mat-hint>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Name</mat-label>
                  <input matInput formControlName="name" required>
                  <mat-error *ngIf="warehouseForm.get('name')?.hasError('required')">
                    Warehouse name is required
                  </mat-error>
                  <mat-error *ngIf="warehouseForm.get('name')?.hasError('maxlength')">
                    Name cannot exceed 100 characters
                  </mat-error>
                </mat-form-field>
              </div>

              <div class="form-row">
                <mat-form-field appearance="outline">
                  <mat-label>Capacity (m³)</mat-label>
                  <input matInput formControlName="capacity" type="number" min="0" placeholder="Optional">
                  <mat-error *ngIf="warehouseForm.get('capacity')?.hasError('min')">
                    Capacity cannot be negative
                  </mat-error>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Opening Hours</mat-label>
                  <input matInput formControlName="openingHours" placeholder="e.g., Mon-Fri 9AM-6PM">
                  <mat-error *ngIf="warehouseForm.get('openingHours')?.hasError('maxlength')">
                    Opening hours cannot exceed 100 characters
                  </mat-error>
                </mat-form-field>
              </div>
            </mat-card-content>
          </mat-card>

          <!-- Location Information -->
          <mat-card class="form-section">
            <mat-card-header>
              <mat-card-title>Location Details</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Address</mat-label>
                <textarea matInput formControlName="address" rows="3" required></textarea>
                <mat-error *ngIf="warehouseForm.get('address')?.hasError('required')">
                  Address is required
                </mat-error>
                <mat-error *ngIf="warehouseForm.get('address')?.hasError('maxlength')">
                  Address cannot exceed 200 characters
                </mat-error>
              </mat-form-field>

              <div class="form-row">
                <mat-form-field appearance="outline">
                  <mat-label>City</mat-label>
                  <input matInput formControlName="city" required>
                  <mat-error *ngIf="warehouseForm.get('city')?.hasError('required')">
                    City is required
                  </mat-error>
                  <mat-error *ngIf="warehouseForm.get('city')?.hasError('maxlength')">
                    City cannot exceed 50 characters
                  </mat-error>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>State/Province</mat-label>
                  <input matInput formControlName="state" placeholder="Optional">
                  <mat-error *ngIf="warehouseForm.get('state')?.hasError('maxlength')">
                    State cannot exceed 50 characters
                  </mat-error>
                </mat-form-field>
              </div>

              <div class="form-row">
                <mat-form-field appearance="outline">
                  <mat-label>Country</mat-label>
                  <input matInput formControlName="country" required>
                  <mat-error *ngIf="warehouseForm.get('country')?.hasError('required')">
                    Country is required
                  </mat-error>
                  <mat-error *ngIf="warehouseForm.get('country')?.hasError('maxlength')">
                    Country cannot exceed 50 characters
                  </mat-error>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Postal Code</mat-label>
                  <input matInput formControlName="postalCode" placeholder="Optional">
                  <mat-error *ngIf="warehouseForm.get('postalCode')?.hasError('maxlength')">
                    Postal code cannot exceed 20 characters
                  </mat-error>
                </mat-form-field>
              </div>
            </mat-card-content>
          </mat-card>

          <!-- Contact Information -->
          <mat-card class="form-section">
            <mat-card-header>
              <mat-card-title>Contact Information</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="form-row">
                <mat-form-field appearance="outline">
                  <mat-label>Phone</mat-label>
                  <input matInput formControlName="phone" placeholder="Optional">
                  <mat-error *ngIf="warehouseForm.get('phone')?.hasError('maxlength')">
                    Phone number cannot exceed 20 characters
                  </mat-error>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Email</mat-label>
                  <input matInput formControlName="email" type="email" placeholder="Optional">
                  <mat-error *ngIf="warehouseForm.get('email')?.hasError('email')">
                    Please enter a valid email address
                  </mat-error>
                  <mat-error *ngIf="warehouseForm.get('email')?.hasError('maxlength')">
                    Email cannot exceed 100 characters
                  </mat-error>
                </mat-form-field>
              </div>
            </mat-card-content>
          </mat-card>

          <!-- Additional Information -->
          <mat-card class="form-section">
            <mat-card-header>
              <mat-card-title>Additional Information</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Notes</mat-label>
                <textarea matInput formControlName="notes" rows="3" placeholder="Optional notes about the warehouse"></textarea>
                <mat-error *ngIf="warehouseForm.get('notes')?.hasError('maxlength')">
                  Notes cannot exceed 500 characters
                </mat-error>
              </mat-form-field>
            </mat-card-content>
          </mat-card>
        </form>
      </mat-dialog-content>

      <mat-dialog-actions class="dialog-actions">
        <button mat-button class="cancel-btn" (click)="onCancel()" [disabled]="loading">
          Cancel
        </button>
        <button mat-raised-button class="save-btn" color="primary" (click)="onSubmit()"
          [disabled]="warehouseForm.invalid || loading">
          <mat-spinner diameter="20" *ngIf="loading"></mat-spinner>
          <mat-icon *ngIf="!loading">{{ isEditMode ? 'save' : 'add_business' }}</mat-icon>
          {{ isEditMode ? 'Update' : 'Create' }} Warehouse
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: `
    .warehouse-form-dialog {
      width: 100%;
      max-width: 900px;
      background: var(--surface-color, #ffffff);
      color: var(--text-color, #6e6b7b);
      border-radius: 12px;
      overflow: hidden;
    }

    .dialog-title {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 0;
      padding: 20px 24px;
      font-size: 1.35rem;
      font-weight: 600;
      color: var(--heading-color, #5e5873);
      background: linear-gradient(135deg, rgba(115, 103, 240, 0.14), rgba(115, 103, 240, 0.04));
      border-bottom: 1px solid var(--border-color, #ebe9f1);

      mat-icon {
        color: var(--primary-color, #7367f0);
      }
    }

    .dialog-content {
      max-height: 70vh;
      overflow-y: auto;
      padding: 20px 24px;
      background: #f8f8fc;
    }

    .warehouse-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .form-section {
      margin: 0;
      background: var(--surface-color, #ffffff);
      border: 1px solid var(--border-color, #ebe9f1);
      border-radius: 10px;
      box-shadow: 0 4px 14px rgba(34, 41, 47, 0.06);
      overflow: hidden;

      mat-card-header {
        padding: 14px 18px;
        border-bottom: 1px solid var(--border-color, #ebe9f1);

        mat-card-title {
          margin: 0;
          font-size: 1rem;
          font-weight: 700;
          color: var(--heading-color, #5e5873);
        }
      }

      mat-card-content {
        padding: 18px;
      }
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 16px;

      &:last-child {
        margin-bottom: 0;
      }
    }

    .full-width {
      width: 100%;
      grid-column: 1 / -1;
    }

    mat-form-field {
      width: 100%;

      ::ng-deep {
        .mat-mdc-text-field-wrapper {
          background: #ffffff !important;
        }

        .mdc-notched-outline__leading,
        .mdc-notched-outline__notch,
        .mdc-notched-outline__trailing {
          border-color: #d8d6de !important;
          border-width: 1px !important;
        }

        .mat-mdc-form-field:hover .mdc-notched-outline__leading,
        .mat-mdc-form-field:hover .mdc-notched-outline__notch,
        .mat-mdc-form-field:hover .mdc-notched-outline__trailing {
          border-color: rgba(115, 103, 240, 0.55) !important;
        }

        .mat-mdc-form-field.mat-focused .mdc-notched-outline__leading,
        .mat-mdc-form-field.mat-focused .mdc-notched-outline__notch,
        .mat-mdc-form-field.mat-focused .mdc-notched-outline__trailing {
          border-color: var(--primary-color, #7367f0) !important;
          border-width: 2px !important;
        }

        .mat-mdc-form-field-label {
          color: #82868b !important;
        }

        .mat-mdc-form-field.mat-focused .mat-mdc-form-field-label {
          color: var(--primary-color, #7367f0) !important;
        }

        input.mat-mdc-input-element,
        textarea.mat-mdc-input-element,
        .mat-mdc-select-value-text {
          color: var(--heading-color, #5e5873) !important;
        }

        .mat-mdc-input-element::placeholder,
        textarea.mat-mdc-input-element::placeholder {
          color: #b8b8b8 !important;
        }

        .mat-mdc-form-field-hint,
        .mat-mdc-form-field-error {
          font-size: 0.78rem;
        }
      }
    }

    .dialog-actions {
      padding: 16px 24px 24px;
      justify-content: flex-end;
      gap: 12px;
      border-top: 1px solid var(--border-color, #ebe9f1);
      background: var(--surface-color, #ffffff);

      button {
        min-width: 140px;
        height: 44px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        border-radius: 8px;
        font-weight: 600;
      }

      .cancel-btn {
        border: 1px solid var(--border-color, #d8d6de);
        color: var(--text-color, #6e6b7b);

        &:hover:not([disabled]) {
          background: rgba(115, 103, 240, 0.08);
          border-color: rgba(115, 103, 240, 0.35);
          color: var(--primary-color, #7367f0);
        }
      }

      .save-btn {
        background: linear-gradient(118deg, var(--primary-color, #7367f0), #8f84f7) !important;
        color: #ffffff !important;
        box-shadow: 0 4px 14px rgba(115, 103, 240, 0.35) !important;
        transition: all 0.2s ease;

        &:hover:not([disabled]) {
          transform: translateY(-1px);
          box-shadow: 0 6px 18px rgba(115, 103, 240, 0.45) !important;
        }

        &:disabled {
          background: #e8e7ed !important;
          box-shadow: none !important;
          color: #b9b9c3 !important;
        }
      }
    }

    @media (max-width: 768px) {
      .dialog-title {
        padding: 16px;
        font-size: 1.15rem;
      }

      .dialog-content {
        padding: 16px;
      }

      .form-row {
        grid-template-columns: 1fr;
      }

      .form-section mat-card-content {
        padding: 14px;
      }

      .dialog-actions {
        padding: 14px 16px 16px;
        flex-direction: column;

        button {
          width: 100%;
        }
      }
    }
  `
})
export class WarehouseFormDialogComponent implements OnInit {
  warehouseForm: FormGroup;
  isEditMode = false;
  loading = false;
  error: string | null = null;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<WarehouseFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { warehouse?: Warehouse },
    private warehouseService: WarehouseService,
    private toastService: ToastService
  ) {
    this.warehouseForm = this.createForm();
  }

  ngOnInit(): void {
    if (this.data?.warehouse) {
      this.isEditMode = true;
      this.populateForm(this.data.warehouse);
    }
  }

  private createForm(): FormGroup {
    return this.fb.group({
      code: [null], // Auto-generated if not provided
      name: ['', [Validators.required, Validators.maxLength(100)]],
      capacity: [null, [Validators.min(0)]],
      openingHours: ['', Validators.maxLength(100)],
      // Location fields
      address: ['', [Validators.required, Validators.maxLength(200)]],
      city: ['', [Validators.required, Validators.maxLength(50)]],
      state: ['', Validators.maxLength(50)],
      country: ['Pakistan', [Validators.required, Validators.maxLength(50)]],
      postalCode: ['', Validators.maxLength(20)],
      // Contact fields
      phone: ['', Validators.maxLength(20)],
      email: ['', [Validators.email, Validators.maxLength(100)]],
      // Additional fields
      notes: ['', Validators.maxLength(500)]
    });
  }

  private populateForm(warehouse: Warehouse): void {
    this.warehouseForm.patchValue({
      code: warehouse.code,
      name: warehouse.name,
      capacity: warehouse.capacity,
      openingHours: warehouse.openingHours,
      address: warehouse.location?.address || '',
      city: warehouse.location?.city || '',
      state: warehouse.location?.state || '',
      country: warehouse.location?.country || 'Pakistan',
      postalCode: warehouse.location?.postalCode || '',
      phone: warehouse.contact?.phone || '',
      email: warehouse.contact?.email || '',
      notes: warehouse.notes || ''
    });
  }

  onSubmit(): void {
    if (this.warehouseForm.invalid) {
      this.warehouseForm.markAllAsTouched();
      this.toastService.error('Please fix the validation errors before submitting');
      return;
    }

    this.loading = true;
    this.error = null;

    const formData = this.prepareFormData();

    const operation = this.isEditMode
      ? this.warehouseService.updateWarehouse(this.data.warehouse!._id, formData)
      : this.warehouseService.createWarehouse(formData);

    operation.subscribe({
      next: (response) => {
        if (response.success) {
          this.toastService.success(
            `Warehouse ${this.isEditMode ? 'updated' : 'created'} successfully`
          );
          this.dialogRef.close({ success: true, warehouse: response.data });
        } else {
          this.error = 'Operation failed';
          this.toastService.error(this.error);
          this.loading = false;
        }
      },
      error: (error) => {
        this.loading = false;
        this.error = this.getUserFriendlyErrorMessage(error);
        this.toastService.error(this.error);
      }
    });
  }

  private prepareFormData(): any {
    const formValue = this.warehouseForm.value;

    // Prepare the data object, excluding code if it's null/undefined
    const data: any = {
      name: formValue.name,
      capacity: formValue.capacity || undefined,
      openingHours: formValue.openingHours || undefined,
      location: {
        address: formValue.address,
        city: formValue.city,
        state: formValue.state || undefined,
        country: formValue.country,
        postalCode: formValue.postalCode || undefined
      },
      contact: {
        phone: formValue.phone || undefined,
        email: formValue.email || undefined
      },
      notes: formValue.notes || undefined
    };

    // Only include code if it's provided and not empty
    if (formValue.code && formValue.code.trim()) {
      data.code = formValue.code.trim();
    }

    return data;
  }

  private getUserFriendlyErrorMessage(error: any): string {
    if (!navigator.onLine) {
      return 'No internet connection. Please check your network and try again.';
    }

    if (error.originalError?.status) {
      const status = error.originalError.status;

      switch (status) {
        case 0:
          return 'Unable to connect to the server. Please check your internet connection.';
        case 400:
          return error.message || 'Invalid data. Please check your input and try again.';
        case 409:
          return error.message || 'A warehouse with this code already exists.';
        case 422:
          return error.message || 'Validation failed. Please check your input.';
        case 500:
          return 'A server error occurred. Please try again later.';
        default:
          if (status >= 500) {
            return 'A server error occurred. Please try again later.';
          }
      }
    }

    if (error.message) {
      return error.message;
    }

    const action = this.isEditMode ? 'updating' : 'creating';
    return `An error occurred while ${action} the warehouse. Please try again.`;
  }

  onCancel(): void {
    this.dialogRef.close({ success: false });
  }
}
