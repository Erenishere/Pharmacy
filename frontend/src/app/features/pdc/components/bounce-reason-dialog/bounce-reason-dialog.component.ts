import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-bounce-reason-dialog',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatIconModule
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon style="color:#e53935;vertical-align:middle;margin-right:8px">cancel</mat-icon>
      Mark Cheque as Bounced
    </h2>
    <mat-dialog-content>
      <p style="margin-bottom:16px;color:#555">
        Receipt: <strong>{{ data.receiptNumber }}</strong> &nbsp;|&nbsp;
        Cheque: <strong>{{ data.chequeNumber }}</strong>
      </p>
      <mat-form-field appearance="outline" style="width:100%">
        <mat-label>Bounce Reason</mat-label>
        <textarea matInput [formControl]="reason" rows="3"
          placeholder="e.g. Insufficient funds, Account closed..."></textarea>
        <mat-error *ngIf="reason.hasError('required')">Reason is required</mat-error>
        <mat-error *ngIf="reason.hasError('maxlength')">Max 500 characters</mat-error>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-raised-button color="warn" [disabled]="reason.invalid" (click)="confirm()">
        <mat-icon>cancel</mat-icon> Bounce Cheque
      </button>
    </mat-dialog-actions>
  `
})
export class BounceReasonDialogComponent {
  reason = new FormControl('', [Validators.required, Validators.maxLength(500)]);

  constructor(
    private dialogRef: MatDialogRef<BounceReasonDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { receiptNumber: string; chequeNumber: string }
  ) {}

  confirm(): void {
    if (this.reason.valid) {
      this.dialogRef.close(this.reason.value);
    }
  }
}
