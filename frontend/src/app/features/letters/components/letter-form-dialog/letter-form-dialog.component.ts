import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { LetterService } from '../../services/letter.service';
import { Letter } from '../../models/letter.model';

@Component({
  selector: 'app-letter-form-dialog',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatDatepickerModule, MatNativeDateModule, MatButtonModule, MatIconModule,
    MatSnackBarModule, MatProgressSpinnerModule
  ],
  template: `
    <div class="letter-dialog">
      <h2 mat-dialog-title class="dialog-title">
        <span class="title-content">
          <mat-icon>mail</mat-icon>
          <span>{{ mode === 'create' ? 'New Letter' : 'Edit Letter' }}</span>
        </span>
        <button mat-icon-button type="button" class="close-btn" aria-label="Close letter dialog" (click)="dialogRef.close()">
          <mat-icon>close</mat-icon>
        </button>
      </h2>

      <mat-dialog-content class="dialog-content">
        <form [formGroup]="form" class="letter-form">
          <div class="form-grid two-column">
            <mat-form-field appearance="outline">
              <mat-label>Date</mat-label>
              <input matInput [matDatepicker]="picker" formControlName="date">
              <mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
              <mat-datepicker #picker></mat-datepicker>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Type</mat-label>
              <mat-select formControlName="letterType">
                <mat-option value="Employment">Employment</mat-option>
                <mat-option value="SupplierContract">Supplier Contract</mat-option>
                <mat-option value="CustomerAgreement">Customer Agreement</mat-option>
                <mat-option value="Other">Other</mat-option>
              </mat-select>
            </mat-form-field>
          </div>

          <div class="form-grid two-column">
            <mat-form-field appearance="outline">
              <mat-label>Account (Optional)</mat-label>
              <mat-select formControlName="accountId">
                <mat-option value="">None</mat-option>
                @for (acc of accounts; track acc._id) {
                  <mat-option [value]="acc._id">{{ acc.name }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Status</mat-label>
              <mat-select formControlName="status">
                <mat-option value="Draft">Draft</mat-option>
                <mat-option value="Final">Final</mat-option>
              </mat-select>
            </mat-form-field>
          </div>

          <mat-form-field appearance="outline" class="full-width-field">
            <mat-label>Subject</mat-label>
            <input matInput formControlName="subject">
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width-field">
            <mat-label>Content</mat-label>
            <textarea matInput formControlName="content" rows="10"></textarea>
          </mat-form-field>
        </form>
      </mat-dialog-content>

      <mat-dialog-actions align="end" class="dialog-actions">
        <button mat-stroked-button type="button" (click)="dialogRef.close()" [disabled]="loading">Cancel</button>
        <button mat-raised-button color="primary" type="button" (click)="onSubmit()" [disabled]="loading || form.invalid">
          @if (loading) { <mat-spinner diameter="20"></mat-spinner> }
          @else { <ng-container><mat-icon>{{ mode === 'create' ? 'add' : 'save' }}</mat-icon> {{ mode === 'create' ? 'Create' : 'Update' }}</ng-container> }
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styleUrl: './letter-form-dialog.component.scss'
})
export class LetterFormDialogComponent implements OnInit {
  form: FormGroup;
  loading = false;
  mode: 'create' | 'edit' = 'create';
  accounts: any[] = [];

  constructor(
    private fb: FormBuilder,
    private letterService: LetterService,
    private http: HttpClient,
    private snackBar: MatSnackBar,
    public dialogRef: MatDialogRef<LetterFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.form = this.fb.group({
      date: [new Date(), Validators.required],
      letterType: ['Employment', Validators.required],
      accountId: [''],
      subject: ['', Validators.required],
      content: ['', Validators.required],
      status: ['Draft'],
    });
  }

  ngOnInit(): void {
    this.mode = this.data?.mode || 'create';
    this.http.get<any>(`${environment.apiUrl}/accounts`).subscribe({
      next: (res) => { if (res.success) this.accounts = res.data; }
    });

    if (this.mode === 'edit' && this.data?.letter) {
      const l = this.data.letter;
      this.form.patchValue({
        date: new Date(l.date), letterType: l.letterType,
        accountId: l.accountId?._id || l.accountId || '',
        subject: l.subject, content: l.content, status: l.status,
      });
    }
  }

  onSubmit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading = true;
    const request = this.mode === 'create'
      ? this.letterService.createLetter(this.form.value)
      : this.letterService.updateLetter(this.data.letter._id, this.form.value);

    request.subscribe({
      next: (res) => {
        this.loading = false;
        if (res.success) { this.snackBar.open('Letter saved', 'Close', { duration: 3000 }); this.dialogRef.close(true); }
      },
      error: () => { this.loading = false; this.snackBar.open('Failed to save', 'Close', { duration: 3000 }); }
    });
  }
}
