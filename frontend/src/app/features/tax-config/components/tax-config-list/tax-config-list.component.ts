import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSelectModule } from '@angular/material/select';
import { TaxConfigService, TaxConfig } from '../../services/tax-config.service';

@Component({
  selector: 'app-tax-config-list',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatTableModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSnackBarModule, MatCardModule,
    MatProgressSpinnerModule, MatTooltipModule, MatSlideToggleModule, MatPaginatorModule,
    MatSelectModule
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <h2><mat-icon>receipt_long</mat-icon> Tax Configuration</h2>
      </div>

      <mat-card class="add-card">
        <h3>Add Tax Rate</h3>
        <form [formGroup]="form" class="add-form" (ngSubmit)="addTax()">
          <mat-form-field appearance="outline">
            <mat-label>Tax Name</mat-label>
            <input matInput formControlName="taxName">
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Tax Type</mat-label>
            <mat-select formControlName="taxType">
              @for (option of taxTypeOptions; track option.value) {
                <mat-option [value]="option.value">{{ option.label }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Rate (%)</mat-label>
            <input matInput type="number" formControlName="rate" min="0" max="100">
          </mat-form-field>
          <button mat-raised-button color="primary" class="add-tax-btn" type="submit" [disabled]="form.invalid || saving">
            <mat-icon>add</mat-icon> Add
          </button>
        </form>
      </mat-card>

      @if (loading) {
        <div class="loading-container"><mat-spinner diameter="40"></mat-spinner></div>
      } @else {
        <mat-card class="list-card">
          <div class="table-container">
            <table mat-table [dataSource]="dataSource" class="tax-table">
              <ng-container matColumnDef="taxName">
                <th mat-header-cell *matHeaderCellDef>Tax Name</th>
                <td mat-cell *matCellDef="let row">{{ row.taxName }}</td>
              </ng-container>
              <ng-container matColumnDef="taxType">
                <th mat-header-cell *matHeaderCellDef>Type</th>
                <td mat-cell *matCellDef="let row">{{ row.taxType }}</td>
              </ng-container>
              <ng-container matColumnDef="rate">
                <th mat-header-cell *matHeaderCellDef>Rate</th>
                <td mat-cell *matCellDef="let row">{{ row.rate }}%</td>
              </ng-container>
              <ng-container matColumnDef="isActive">
                <th mat-header-cell *matHeaderCellDef>Active</th>
                <td mat-cell *matCellDef="let row">
                  <mat-slide-toggle [checked]="row.isActive" (change)="toggleActive(row)"></mat-slide-toggle>
                </td>
              </ng-container>
              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef>Actions</th>
                <td mat-cell *matCellDef="let row">
                  <div class="action-buttons">
                    <button mat-icon-button matTooltip="Delete" color="warn" (click)="deleteTax(row)"><mat-icon>delete</mat-icon></button>
                  </div>
                </td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
              <tr class="mat-mdc-no-data-row no-data-row" *matNoDataRow>
                <td class="mat-cell" [attr.colspan]="displayedColumns.length">
                  <div class="table-empty-state">
                    <mat-icon>receipt_long</mat-icon>
                    <h4>No tax configurations found</h4>
                    <p>Add a tax rate to start configuring GST, WHT, or other tax rules.</p>
                  </div>
                </td>
              </tr>
            </table>
            <mat-paginator
              class="standard-purple-footer"
              [length]="dataSource.data.length"
              [pageSize]="pageSize"
              [pageSizeOptions]="pageSizeOptions"
              showFirstLastButtons
              aria-label="Select page of tax configurations">
            </mat-paginator>
          </div>
        </mat-card>
      }
    </div>
  `,
  styleUrl: './tax-config-list.component.scss'
})
export class TaxConfigListComponent implements OnInit {
  @ViewChild(MatPaginator)
  set matPaginator(paginator: MatPaginator | undefined) {
    if (paginator) {
      this.dataSource.paginator = paginator;
    }
  }

  displayedColumns = ['taxName', 'taxType', 'rate', 'isActive', 'actions'];
  dataSource = new MatTableDataSource<TaxConfig>([]);
  taxTypeOptions = [
    { value: 'GST', label: 'GST' },
    { value: 'WHT', label: 'WHT' },
    { value: 'SALES_TAX', label: 'Sales Tax' },
    { value: 'CUSTOM', label: 'Custom' },
  ];
  pageSize = 10;
  pageSizeOptions = [10, 25, 50];
  loading = false;
  saving = false;
  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private taxConfigService: TaxConfigService,
    private snackBar: MatSnackBar
  ) {
    this.form = this.fb.group({
      taxName: ['', Validators.required],
      taxType: ['GST', Validators.required],
      rate: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
    });
  }

  ngOnInit(): void { this.loadTaxConfigs(); }

  loadTaxConfigs(): void {
    this.loading = true;
    this.taxConfigService.getTaxConfigs().subscribe({
      next: (res) => { this.loading = false; if (res.success) this.dataSource.data = res.data; },
      error: () => { this.loading = false; }
    });
  }

  addTax(): void {
    if (this.form.invalid) return;
    this.saving = true;
    this.taxConfigService.createTaxConfig(this.form.value).subscribe({
      next: (res) => {
        this.saving = false;
        if (res.success) {
          this.form.reset({ taxName: '', taxType: 'GST', rate: 0 });
          this.loadTaxConfigs();
          this.snackBar.open('Tax config added', 'Close', { duration: 3000 });
        }
      },
      error: (error) => {
        this.saving = false;
        this.snackBar.open(this.getErrorMessage(error, 'Failed to add tax config'), 'Close', { duration: 5000 });
      }
    });
  }

  toggleActive(tax: TaxConfig): void {
    const request = tax.isActive
      ? this.taxConfigService.deactivateTaxConfig(tax._id)
      : this.taxConfigService.activateTaxConfig(tax._id);

    request.subscribe({
      next: () => this.loadTaxConfigs(),
      error: (error) => {
        this.snackBar.open(this.getErrorMessage(error, 'Failed to update tax status'), 'Close', { duration: 5000 });
        this.loadTaxConfigs();
      }
    });
  }

  deleteTax(tax: TaxConfig): void {
    if (!confirm(`Delete "${tax.taxName}"?`)) return;
    this.taxConfigService.deleteTaxConfig(tax._id).subscribe({
      next: () => { this.loadTaxConfigs(); this.snackBar.open('Deleted', 'Close', { duration: 3000 }); },
      error: (error) => this.snackBar.open(this.getErrorMessage(error, 'Failed to delete tax config'), 'Close', { duration: 5000 })
    });
  }

  private getErrorMessage(error: any, fallback: string): string {
    return error?.error?.error?.message || error?.error?.message || error?.message || fallback;
  }
}
