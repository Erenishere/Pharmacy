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
import { ExpenseService } from '../../services/expense.service';
import { Expense, ExpenseCategory } from '../../models/expense.model';

@Component({
  selector: 'app-expense-form-dialog',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatDatepickerModule, MatNativeDateModule, MatButtonModule, MatIconModule,
    MatSnackBarModule, MatProgressSpinnerModule
  ],
  templateUrl: './expense-form-dialog.component.html',
  styleUrl: './expense-form-dialog.component.scss'
})
export class ExpenseFormDialogComponent implements OnInit {
  form: FormGroup;
  loading = false;
  mode: 'create' | 'edit' = 'create';
  categories: ExpenseCategory[] = [];
  accounts: any[] = [];
  cashAccounts: any[] = [];
  dimensions: any[] = [];

  constructor(
    private fb: FormBuilder,
    private expenseService: ExpenseService,
    private http: HttpClient,
    private snackBar: MatSnackBar,
    public dialogRef: MatDialogRef<ExpenseFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.form = this.fb.group({
      date: [new Date(), Validators.required],
      categoryId: ['', Validators.required],
      accountId: ['', Validators.required],
      cashAccountId: ['', Validators.required],
      amount: [null, [Validators.required, Validators.min(0.01)]],
      detail: [''],
      dimensionId: [''],
    });
  }

  ngOnInit(): void {
    this.mode = this.data?.mode || 'create';
    this.categories = this.data?.categories || [];

    this.loadAccounts();
    this.loadDimensions();

    if (this.mode === 'edit' && this.data?.expense) {
      const e = this.data.expense;
      this.form.patchValue({
        date: new Date(e.date),
        categoryId: e.categoryId?._id || e.categoryId,
        accountId: e.accountId?._id || e.accountId,
        cashAccountId: e.cashAccountId?._id || e.cashAccountId,
        amount: e.amount,
        detail: e.detail,
        dimensionId: e.dimensionId?._id || e.dimensionId || '',
      });
    }
  }

  loadAccounts(): void {
    this.http.get<any>(`${environment.apiUrl}/accounts`).subscribe({
      next: (res) => {
        if (res.success) {
          this.accounts = res.data.filter((a: any) => a.accountType === 'expense');
          this.cashAccounts = res.data.filter((a: any) => a.accountType === 'asset');
        }
      }
    });
  }

  loadDimensions(): void {
    this.http.get<any>(`${environment.apiUrl}/dimensions`).subscribe({
      next: (res) => { if (res.success) this.dimensions = res.data; }
    });
  }

  onSubmit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading = true;
    const formData = this.form.value;

    const request = this.mode === 'create'
      ? this.expenseService.createExpense(formData)
      : this.expenseService.updateExpense(this.data.expense._id, formData);

    request.subscribe({
      next: (res) => {
        this.loading = false;
        if (res.success) {
          this.snackBar.open(`Expense ${this.mode === 'create' ? 'created' : 'updated'} successfully`, 'Close', { duration: 3000 });
          this.dialogRef.close(true);
        }
      },
      error: () => {
        this.loading = false;
        this.snackBar.open('Operation failed', 'Close', { duration: 3000, panelClass: 'snackbar-error' });
      }
    });
  }
}
