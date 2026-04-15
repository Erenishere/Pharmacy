import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { ExpenseService } from '../../services/expense.service';
import { ExpenseCategory } from '../../models/expense.model';

@Component({
  selector: 'app-expense-category-list',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatListModule, MatSnackBarModule, MatDividerModule, MatChipsModule
  ],
  template: `
    <div class="dialog-container">
      <h2 mat-dialog-title>Expense Categories</h2>

      <mat-dialog-content>
        <form [formGroup]="form" class="add-form" (ngSubmit)="addCategory()">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Category Name</mat-label>
            <input matInput formControlName="categoryName">
          </mat-form-field>
          <button mat-raised-button color="primary" type="submit" [disabled]="form.invalid">
            <mat-icon>add</mat-icon> Add
          </button>
        </form>

        <mat-divider></mat-divider>

        <mat-list>
          @for (cat of categories; track cat._id) {
            <mat-list-item>
              <span matListItemTitle>{{ cat.categoryName }}</span>
              <span matListItemMeta>
                <mat-chip-set>
                  <mat-chip [class]="cat.status === 'active' ? 'chip-active' : 'chip-inactive'">{{ cat.status }}</mat-chip>
                </mat-chip-set>
                <button mat-icon-button (click)="toggleStatus(cat)" matTooltip="Toggle Status">
                  <mat-icon>{{ cat.status === 'active' ? 'toggle_on' : 'toggle_off' }}</mat-icon>
                </button>
                <button mat-icon-button color="warn" (click)="deleteCategory(cat)">
                  <mat-icon>delete</mat-icon>
                </button>
              </span>
            </mat-list-item>
          }
          @if (categories.length === 0) {
            <div class="empty-state">No categories yet</div>
          }
        </mat-list>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-stroked-button (click)="dialogRef.close()">Close</button>
      </mat-dialog-actions>
    </div>
  `,
  styleUrl: './expense-category-list.component.scss'
})
export class ExpenseCategoryListComponent implements OnInit {
  categories: ExpenseCategory[] = [];
  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private expenseService: ExpenseService,
    private snackBar: MatSnackBar,
    public dialogRef: MatDialogRef<ExpenseCategoryListComponent>
  ) {
    this.form = this.fb.group({
      categoryName: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    this.loadCategories();
  }

  loadCategories(): void {
    this.expenseService.getCategories().subscribe({
      next: (res) => { if (res.success) this.categories = res.data; }
    });
  }

  addCategory(): void {
    if (this.form.invalid) return;
    this.expenseService.createCategory(this.form.value).subscribe({
      next: (res) => {
        if (res.success) {
          this.form.reset();
          this.loadCategories();
          this.snackBar.open('Category added', 'Close', { duration: 2000 });
        }
      },
      error: () => this.snackBar.open('Failed to add category', 'Close', { duration: 3000 })
    });
  }

  toggleStatus(cat: ExpenseCategory): void {
    const newStatus = cat.status === 'active' ? 'inactive' : 'active';
    this.expenseService.updateCategory(cat._id, { status: newStatus } as any).subscribe({
      next: () => this.loadCategories(),
    });
  }

  deleteCategory(cat: ExpenseCategory): void {
    if (!confirm(`Delete category "${cat.categoryName}"?`)) return;
    this.expenseService.deleteCategory(cat._id).subscribe({
      next: () => { this.loadCategories(); this.snackBar.open('Category deleted', 'Close', { duration: 2000 }); },
      error: () => this.snackBar.open('Failed to delete category', 'Close', { duration: 3000 })
    });
  }
}
