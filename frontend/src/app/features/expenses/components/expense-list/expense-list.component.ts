import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ExpenseService } from '../../services/expense.service';
import { Expense, ExpenseCategory } from '../../models/expense.model';
import { ExpenseFormDialogComponent } from '../expense-form-dialog/expense-form-dialog.component';
import { ExpenseCategoryListComponent } from '../expense-category-list/expense-category-list.component';
import { DataTableComponent, TableColumn } from '../../../../shared/components/data-table/data-table.component';

@Component({
  selector: 'app-expense-list',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatTableModule, MatPaginatorModule, MatSortModule,
    MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatDatepickerModule, MatNativeDateModule, MatDialogModule, MatSnackBarModule,
    MatCardModule, MatChipsModule, MatProgressSpinnerModule, MatTooltipModule,
    DataTableComponent
  ],
  template: `
    <div class="list-page-container">
      <div class="list-page-header">
        <div class="header-content">
          <h1><mat-icon>account_balance_wallet</mat-icon> Pharmacy Expenses</h1>
          <p>Manage and track all pharmaceutical operating expenses</p>
        </div>
        <div class="header-actions">
          <button mat-stroked-button color="primary" class="me-2" (click)="openCategoryDialog()">
            <mat-icon>category</mat-icon> Categories
          </button>
          <button mat-raised-button color="primary" (click)="openCreateDialog()">
            <mat-icon>add</mat-icon> New Expense
          </button>
        </div>
      </div>

      <div class="list-page-card">
        <div class="list-filters-section">
          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>Category</mat-label>
            <mat-select [formControl]="categoryFilter" (selectionChange)="loadExpenses()">
              <mat-option value="">All Categories</mat-option>
              @for (cat of categories; track cat._id) {
                <mat-option [value]="cat._id">{{ cat.categoryName }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>From Date</mat-label>
            <input matInput [matDatepicker]="fromPicker" [formControl]="fromDate" (dateChange)="loadExpenses()">
            <mat-datepicker-toggle matIconSuffix [for]="fromPicker"></mat-datepicker-toggle>
            <mat-datepicker #fromPicker></mat-datepicker>
          </mat-form-field>

          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>To Date</mat-label>
            <input matInput [matDatepicker]="toPicker" [formControl]="toDate" (dateChange)="loadExpenses()">
            <mat-datepicker-toggle matIconSuffix [for]="toPicker"></mat-datepicker-toggle>
            <mat-datepicker #toPicker></mat-datepicker>
          </mat-form-field>

          <button mat-icon-button color="warn" matTooltip="Clear Filters" (click)="clearFilters()">
            <mat-icon>filter_alt_off</mat-icon>
          </button>
        </div>

        <div class="table-wrapper" style="position: relative; min-height: 200px;">
          <div class="loading-overlay" *ngIf="loading" 
               style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(255,255,255,0.7); display: flex; justify-content: center; align-items: center; z-index: 10;">
            <mat-spinner diameter="40"></mat-spinner>
          </div>

          <app-data-table 
            [data]="dataSource.data"
            [columns]="tableColumns"
            [pageSize]="10"
            [pageSizeOptions]="[10, 25, 50]"
            (actionClick)="onTableAction($event)">
          </app-data-table>

          <div class="list-empty-state" *ngIf="!loading && dataSource.data.length === 0">
            <mat-icon>receipt_long</mat-icon>
            <p>No expenses found</p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .header-actions { display: flex; align-items: center; gap: 8px; }
  `]
})
export class ExpenseListComponent implements OnInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  tableColumns: TableColumn[] = [
    { key: 'date', label: 'Date', type: 'date', sortable: true },
    { key: 'category', label: 'Category', sortable: true },
    { key: 'account', label: 'Account', sortable: true },
    { key: 'detail', label: 'Detail' },
    { key: 'amount', label: 'Amount', type: 'currency', sortable: true },
    { key: 'dimension', label: 'Dimension' },
    { key: 'actions', label: 'Actions', type: 'action', actions: [
      { icon: 'edit', label: 'Edit', actionKey: 'edit', color: 'primary' },
      { icon: 'delete', label: 'Delete', actionKey: 'delete', color: 'warn' }
    ]}
  ];

  dataSource = new MatTableDataSource<any>([]);
  loading = false;
  categories: ExpenseCategory[] = [];

  categoryFilter = new FormControl('');
  fromDate = new FormControl<Date | null>(null);
  toDate = new FormControl<Date | null>(null);

  constructor(
    private expenseService: ExpenseService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadCategories();
    this.loadExpenses();
  }

  loadCategories(): void {
    this.expenseService.getCategories('active').subscribe({
      next: (res) => { if (res.success) this.categories = res.data; },
    });
  }

  loadExpenses(): void {
    this.loading = true;
    const filters: any = {};
    if (this.categoryFilter.value) filters.categoryId = this.categoryFilter.value;
    if (this.fromDate.value) filters.fromDate = this.fromDate.value.toISOString();
    if (this.toDate.value) filters.toDate = this.toDate.value.toISOString();

    this.expenseService.getExpenses(filters).subscribe({
      next: (res) => {
        this.loading = false;
        if (res.success) {
          this.dataSource.data = (res.data || []).map((exp: any) => ({
            ...exp,
            category: exp.categoryId?.categoryName || '-',
            account: exp.accountId?.name || '-',
            dimension: exp.dimensionId?.name || '-'
          }));
          this.dataSource.paginator = this.paginator;
          this.dataSource.sort = this.sort;
        }
      },
      error: () => { this.loading = false; this.showMessage('Failed to load expenses', 'error'); }
    });
  }

  clearFilters(): void {
    this.categoryFilter.setValue('');
    this.fromDate.setValue(null);
    this.toDate.setValue(null);
    this.loadExpenses();
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(ExpenseFormDialogComponent, {
      width: '760px',
      maxWidth: '96vw',
      maxHeight: '92vh',
      panelClass: 'expense-form-dialog-panel',
      data: { mode: 'create', categories: this.categories }
    });
    dialogRef.afterClosed().subscribe(result => { if (result) this.loadExpenses(); });
  }

  openEditDialog(expense: Expense): void {
    const dialogRef = this.dialog.open(ExpenseFormDialogComponent, {
      width: '760px',
      maxWidth: '96vw',
      maxHeight: '92vh',
      panelClass: 'expense-form-dialog-panel',
      data: { mode: 'edit', expense, categories: this.categories }
    });
    dialogRef.afterClosed().subscribe(result => { if (result) this.loadExpenses(); });
  }

  openCategoryDialog(): void {
    const dialogRef = this.dialog.open(ExpenseCategoryListComponent, {
      width: '500px', maxHeight: '80vh'
    });
    dialogRef.afterClosed().subscribe(() => this.loadCategories());
  }

  deleteExpense(expense: Expense): void {
    if (!confirm('Are you sure you want to delete this expense?')) return;
    this.expenseService.deleteExpense(expense._id).subscribe({
      next: (res) => {
        if (res.success) { this.showMessage('Expense deleted', 'success'); this.loadExpenses(); }
      },
      error: () => this.showMessage('Failed to delete expense', 'error')
    });
  }

  onTableAction(event: { action: string, row: any }): void {
    switch(event.action) {
      case 'edit': this.openEditDialog(event.row); break;
      case 'delete': this.deleteExpense(event.row); break;
    }
  }

  showMessage(message: string, type: 'success' | 'error'): void {
    this.snackBar.open(message, 'Close', {
      duration: 3000, panelClass: type === 'success' ? 'snackbar-success' : 'snackbar-error'
    });
  }
}
