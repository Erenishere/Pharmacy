import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators, FormControl } from '@angular/forms';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatExpansionModule } from '@angular/material/expansion';
import { InvestorProfitShareService, InvestorProfitShare, ProfitShareDetail } from '../../services/investor-profit-share.service';

@Component({
  selector: 'app-profit-share',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatTableModule, MatPaginatorModule, MatButtonModule,
    MatIconModule, MatFormFieldModule, MatInputModule, MatDatepickerModule, MatNativeDateModule,
    MatDialogModule, MatSnackBarModule, MatCardModule, MatChipsModule, MatProgressSpinnerModule,
    MatTooltipModule, MatExpansionModule
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <h2><mat-icon>pie_chart</mat-icon> Investor Profit Share</h2>
      </div>

      <!-- Create New Distribution -->
      <mat-expansion-panel class="create-panel">
        <mat-expansion-panel-header>
          <mat-panel-title><mat-icon>add_circle</mat-icon> Create New Distribution</mat-panel-title>
        </mat-expansion-panel-header>

        <form [formGroup]="createForm">
          <div class="form-row three-col">
            <mat-form-field appearance="outline">
              <mat-label>Period From</mat-label>
              <input matInput [matDatepicker]="fromPicker" formControlName="periodFrom">
              <mat-datepicker-toggle matIconSuffix [for]="fromPicker"></mat-datepicker-toggle>
              <mat-datepicker #fromPicker></mat-datepicker>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Period To</mat-label>
              <input matInput [matDatepicker]="toPicker" formControlName="periodTo">
              <mat-datepicker-toggle matIconSuffix [for]="toPicker"></mat-datepicker-toggle>
              <mat-datepicker #toPicker></mat-datepicker>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Total Profit</mat-label>
              <input matInput type="number" formControlName="totalProfit">
              <span matPrefix>PKR&nbsp;</span>
            </mat-form-field>
          </div>

          <button mat-stroked-button class="calculate-btn" (click)="calculateShares()" [disabled]="!createForm.get('totalProfit')?.value">
            <mat-icon>calculate</mat-icon> Calculate Shares
          </button>

          @if (calculatedDetails.length > 0) {
            <div class="table-container">
              <table mat-table [dataSource]="calculatedDetails" class="detail-table">
                <ng-container matColumnDef="investor">
                  <th mat-header-cell *matHeaderCellDef>Investor</th>
                  <td mat-cell *matCellDef="let row">{{ row.investorAccountId?.name || row.investorAccountId }}</td>
                </ng-container>
                <ng-container matColumnDef="contribution">
                  <th mat-header-cell *matHeaderCellDef>Capital Contribution</th>
                  <td mat-cell *matCellDef="let row" class="amount-cell">{{ formatCurrency(row.capitalContribution) }}</td>
                </ng-container>
                <ng-container matColumnDef="sharePercent">
                  <th mat-header-cell *matHeaderCellDef>Share %</th>
                  <td mat-cell *matCellDef="let row">{{ row.sharePercent }}%</td>
                </ng-container>
                <ng-container matColumnDef="profitAmount">
                  <th mat-header-cell *matHeaderCellDef>Profit Amount</th>
                  <td mat-cell *matCellDef="let row" class="amount-cell">{{ formatCurrency(row.profitAmount) }}</td>
                </ng-container>
                <tr mat-header-row *matHeaderRowDef="detailColumns"></tr>
                <tr mat-row *matRowDef="let row; columns: detailColumns;"></tr>
              </table>
            </div>

            <div class="save-btn-row">
              <button mat-raised-button (click)="createDistribution()" [disabled]="saving">
                @if (saving) { <mat-spinner diameter="20"></mat-spinner> }
                @else { <ng-container><mat-icon>save</mat-icon> Save Distribution</ng-container> }
              </button>
            </div>
          }
        </form>
      </mat-expansion-panel>

      <!-- History -->
      <mat-card class="list-card">
        <mat-card-header>
          <mat-card-title>Distribution History</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          @if (loading) {
            <div class="loading-container"><mat-spinner diameter="40"></mat-spinner></div>
          } @else {
            <div class="table-container">
              <table mat-table [dataSource]="dataSource" class="history-table">
                <ng-container matColumnDef="periodFrom">
                  <th mat-header-cell *matHeaderCellDef>Period From</th>
                  <td mat-cell *matCellDef="let row">{{ row.periodFrom | date:'dd/MM/yyyy' }}</td>
                </ng-container>
                <ng-container matColumnDef="periodTo">
                  <th mat-header-cell *matHeaderCellDef>Period To</th>
                  <td mat-cell *matCellDef="let row">{{ row.periodTo | date:'dd/MM/yyyy' }}</td>
                </ng-container>
                <ng-container matColumnDef="totalProfit">
                  <th mat-header-cell *matHeaderCellDef>Total Profit</th>
                  <td mat-cell *matCellDef="let row" class="amount-cell">{{ formatCurrency(row.totalProfit) }}</td>
                </ng-container>
                <ng-container matColumnDef="status">
                  <th mat-header-cell *matHeaderCellDef>Status</th>
                  <td mat-cell *matCellDef="let row">
                    <mat-chip-set><mat-chip [class]="row.status === 'Distributed' ? 'chip-success' : 'chip-draft'">{{ row.status }}</mat-chip></mat-chip-set>
                  </td>
                </ng-container>
                <ng-container matColumnDef="actions">
                  <th mat-header-cell *matHeaderCellDef>Actions</th>
                  <td mat-cell *matCellDef="let row">
                    <div class="action-buttons">
                      <button mat-icon-button matTooltip="Distribute" (click)="distribute(row)" [disabled]="row.status === 'Distributed'">
                        <mat-icon>send</mat-icon>
                      </button>
                      <button mat-icon-button matTooltip="Delete" color="warn" (click)="deleteProfitShare(row)" [disabled]="row.status === 'Distributed'">
                        <mat-icon>delete</mat-icon>
                      </button>
                    </div>
                  </td>
                </ng-container>
                <tr mat-header-row *matHeaderRowDef="historyColumns"></tr>
                <tr mat-row *matRowDef="let row; columns: historyColumns;"></tr>
                <tr class="mat-mdc-no-data-row no-data-row" *matNoDataRow>
                  <td class="mat-cell" [attr.colspan]="historyColumns.length">
                    <div class="table-empty-state">
                      <mat-icon>pie_chart</mat-icon>
                      <h4>No distributions found</h4>
                      <p>Create a profit distribution to start tracking investor shares.</p>
                    </div>
                  </td>
                </tr>
              </table>
            </div>
            <mat-paginator
              class="standard-purple-footer"
              [length]="dataSource.data.length"
              [pageSize]="pageSize"
              [pageSizeOptions]="pageSizeOptions"
              showFirstLastButtons
              aria-label="Select page of profit share distributions">
            </mat-paginator>
          }
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styleUrl: './profit-share.component.scss'
})
export class ProfitShareComponent implements OnInit {
  @ViewChild(MatPaginator)
  set matPaginator(paginator: MatPaginator | undefined) {
    if (paginator) {
      this.dataSource.paginator = paginator;
    }
  }

  historyColumns = ['periodFrom', 'periodTo', 'totalProfit', 'status', 'actions'];
  detailColumns = ['investor', 'contribution', 'sharePercent', 'profitAmount'];
  dataSource = new MatTableDataSource<InvestorProfitShare>([]);
  pageSize = 10;
  pageSizeOptions = [10, 25, 50];
  calculatedDetails: ProfitShareDetail[] = [];
  loading = false;
  saving = false;

  createForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private profitShareService: InvestorProfitShareService,
    private snackBar: MatSnackBar
  ) {
    this.createForm = this.fb.group({
      periodFrom: [null, Validators.required],
      periodTo: [null, Validators.required],
      totalProfit: [null, [Validators.required, Validators.min(1)]],
    });
  }

  ngOnInit(): void { this.loadHistory(); }

  loadHistory(): void {
    this.loading = true;
    this.profitShareService.getProfitShares().subscribe({
      next: (res) => {
        this.loading = false;
        if (res.success) { this.dataSource.data = res.data; }
      },
      error: () => { this.loading = false; }
    });
  }

  calculateShares(): void {
    const totalProfit = this.createForm.get('totalProfit')?.value;
    if (!totalProfit) return;
    this.profitShareService.calculateShares(totalProfit).subscribe({
      next: (res) => { if (res.success) this.calculatedDetails = res.data; },
      error: () => this.snackBar.open('Failed to calculate shares', 'Close', { duration: 3000 })
    });
  }

  createDistribution(): void {
    if (this.createForm.invalid || this.calculatedDetails.length === 0) return;
    this.saving = true;
    const data = {
      ...this.createForm.value,
      details: this.calculatedDetails,
    };
    this.profitShareService.createProfitShare(data).subscribe({
      next: (res) => {
        this.saving = false;
        if (res.success) {
          this.snackBar.open('Distribution created', 'Close', { duration: 3000 });
          this.createForm.reset();
          this.calculatedDetails = [];
          this.loadHistory();
        }
      },
      error: () => { this.saving = false; this.snackBar.open('Failed to create', 'Close', { duration: 3000 }); }
    });
  }

  distribute(ps: InvestorProfitShare): void {
    if (!confirm('Distribute this profit share? This will update investor balances.')) return;
    this.profitShareService.distributeProfitShare(ps._id).subscribe({
      next: () => { this.snackBar.open('Distributed successfully', 'Close', { duration: 3000 }); this.loadHistory(); },
      error: () => this.snackBar.open('Failed to distribute', 'Close', { duration: 3000 })
    });
  }

  deleteProfitShare(ps: InvestorProfitShare): void {
    if (!confirm('Delete this profit share?')) return;
    this.profitShareService.deleteProfitShare(ps._id).subscribe({
      next: () => { this.snackBar.open('Deleted', 'Close', { duration: 3000 }); this.loadHistory(); },
      error: () => this.snackBar.open('Failed to delete', 'Close', { duration: 3000 })
    });
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', minimumFractionDigits: 0 }).format(value || 0);
  }
}
