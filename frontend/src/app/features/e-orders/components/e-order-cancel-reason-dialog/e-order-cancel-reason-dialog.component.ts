import { Component, Inject, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';

export interface EOrderCancelReasonDialogData {
  orderNumber?: string;
}

export interface EOrderCancelReasonDialogResult {
  confirmed: boolean;
  reason: string;
}

@Component({
  selector: 'app-e-order-cancel-reason-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule
  ],
  template: `
    <div class="cancel-dialog">
      <h2 mat-dialog-title>
        <mat-icon>cancel</mat-icon>
        Cancel E-Order {{ data.orderNumber ? '(' + data.orderNumber + ')' : '' }}
      </h2>

      <mat-dialog-content [formGroup]="form">
        <p class="helper-text">Please provide a cancellation reason. This is required.</p>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Cancellation Reason</mat-label>
          <textarea matInput formControlName="reason" rows="4" maxlength="500"></textarea>
          <mat-hint align="end">{{ form.get('reason')?.value?.length || 0 }}/500</mat-hint>
          <mat-error *ngIf="form.get('reason')?.hasError('required')">Reason is required</mat-error>
        </mat-form-field>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button type="button" (click)="onCancel()">Back</button>
        <button mat-raised-button color="warn" type="button" [disabled]="form.invalid" (click)="onConfirm()">
          <mat-icon>check</mat-icon>
          Confirm Cancel
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .cancel-dialog {
      min-width: 420px;
      max-width: 560px;
    }

    h2 {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #5e5873;
      margin: 0;
      font-weight: 700;
      font-size: 1.1rem;
    }

    h2 mat-icon {
      color: #ea5455;
    }

    mat-dialog-content {
      padding: 14px 0 !important;
    }

    .helper-text {
      margin: 0 0 12px;
      color: #6e6b7b;
      font-size: 0.9rem;
    }

    .full-width {
      width: 100%;
    }

    mat-dialog-actions {
      margin: 0;
      padding: 8px 0 0;
      gap: 8px;
    }

    @media (max-width: 600px) {
      .cancel-dialog {
        min-width: auto;
        width: 100%;
      }
    }
  `]
})
export class EOrderCancelReasonDialogComponent {
  private fb = inject(FormBuilder);

  form = this.fb.group({
    reason: ['', [Validators.required, Validators.maxLength(500)]]
  });

  constructor(
    private dialogRef: MatDialogRef<EOrderCancelReasonDialogComponent, EOrderCancelReasonDialogResult>,
    @Inject(MAT_DIALOG_DATA) public data: EOrderCancelReasonDialogData
  ) {}

  onCancel(): void {
    this.dialogRef.close({ confirmed: false, reason: '' });
  }

  onConfirm(): void {
    if (this.form.invalid) return;
    const reason = (this.form.value.reason || '').trim();
    this.dialogRef.close({ confirmed: true, reason });
  }
}
