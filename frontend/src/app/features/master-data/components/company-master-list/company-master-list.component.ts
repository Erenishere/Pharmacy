import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { CompanyMasterService, Company } from '../../services/company-master.service';
import { ToastService } from '../../../../shared/services/toast.service';
import { CompanyMasterFormComponent } from '../company-master-form/company-master-form.component';

@Component({
  selector: 'app-company-master-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatChipsModule
  ],
  template: `
    <div class="company-master-container">
      <div class="page-header">
        <h1><mat-icon>business</mat-icon> Company Master Management</h1>
        <p class="page-description">Manage pharmaceutical manufacturing companies</p>
      </div>

      <mat-card>
        <mat-card-header>
          <mat-card-title>Companies List</mat-card-title>
          <mat-card-subtitle>{{ totalCompanies }} companies found</mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          <div class="filters-section">
            <div class="search-filters">
              <mat-form-field appearance="outline">
                <mat-label>Search</mat-label>
                <input matInput [(ngModel)]="searchText" (input)="onSearch()">
                <mat-icon matSuffix>search</mat-icon>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Group Type</mat-label>
                <mat-select [(ngModel)]="selectedGroup" (selectionChange)="onFilterChange()">
                  <mat-option value="">All Groups</mat-option>
                  <mat-option value="A">Group A</mat-option>
                  <mat-option value="B">Group B</mat-option>
                  <mat-option value="C">Group C</mat-option>
                </mat-select>
              </mat-form-field>
            </div>

            <div class="action-buttons">
              <button mat-raised-button color="primary" (click)="addCompany()">
                <mat-icon>add</mat-icon> Add Company
              </button>
              <button mat-icon-button (click)="loadCompanies()">
                <mat-icon>refresh</mat-icon>
              </button>
            </div>
          </div>

          <div class="table-container" *ngIf="!loading; else loadingTemplate">
            <table mat-table [dataSource]="companies">
              <ng-container matColumnDef="code">
                <th mat-header-cell *matHeaderCellDef>Code</th>
                <td mat-cell *matCellDef="let company">{{ company.code }}</td>
              </ng-container>

              <ng-container matColumnDef="name">
                <th mat-header-cell *matHeaderCellDef>Company Name</th>
                <td mat-cell *matCellDef="let company"><strong>{{ company.name }}</strong></td>
              </ng-container>

              <ng-container matColumnDef="groupType">
                <th mat-header-cell *matHeaderCellDef>Group</th>
                <td mat-cell *matCellDef="let company">
                  <mat-chip>{{ company.groupType }}</mat-chip>
                </td>
              </ng-container>

              <ng-container matColumnDef="contact">
                <th mat-header-cell *matHeaderCellDef>Contact</th>
                <td mat-cell *matCellDef="let company">
                  <div>{{ company.contactPerson || 'N/A' }}</div>
                  <small>{{ company.phone || '' }}</small>
                </td>
              </ng-container>

              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef>Status</th>
                <td mat-cell *matCellDef="let company">
                  <mat-chip [class.active]="company.isActive" [class.inactive]="!company.isActive">
                    {{ company.isActive ? 'Active' : 'Inactive' }}
                  </mat-chip>
                </td>
              </ng-container>

              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef>Actions</th>
                <td mat-cell *matCellDef="let company">
                  <button mat-icon-button (click)="editCompany(company)">
                    <mat-icon>edit</mat-icon>
                  </button>
                  <button mat-icon-button (click)="toggleStatus(company)">
                    <mat-icon>{{ company.isActive ? 'toggle_on' : 'toggle_off' }}</mat-icon>
                  </button>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
            </table>

            <div *ngIf="companies.length === 0" class="no-data">
              <mat-icon>business</mat-icon>
              <h3>No companies found</h3>
              <button mat-raised-button color="primary" (click)="addCompany()">
                <mat-icon>add</mat-icon> Add First Company
              </button>
            </div>
          </div>

          <ng-template #loadingTemplate>
            <div class="loading-container">
              <mat-icon class="loading-icon">hourglass_empty</mat-icon>
              <p>Loading companies...</p>
            </div>
          </ng-template>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .company-master-container { padding: 20px; }
    .page-header h1 { display: flex; align-items: center; gap: 12px; margin: 0 0 8px 0; }
    .page-description { color: #666; margin: 0 0 24px 0; }
    .filters-section { display: flex; justify-content: space-between; margin-bottom: 20px; gap: 16px; }
    .search-filters { display: flex; gap: 12px; flex: 1; }
    .action-buttons { display: flex; gap: 8px; }
    .table-container { overflow-x: auto; }
    mat-chip.active { background-color: #4caf50; color: white; }
    mat-chip.inactive { background-color: #9e9e9e; color: white; }
    .no-data, .loading-container { text-align: center; padding: 60px 20px; }
    .no-data mat-icon, .loading-icon { font-size: 48px; width: 48px; height: 48px; color: #ccc; }
  `]
})
export class CompanyMasterListComponent implements OnInit {
  companies: Company[] = [];
  totalCompanies = 0;
  loading = false;
  searchText = '';
  selectedGroup = '';
  displayedColumns = ['code', 'name', 'groupType', 'contact', 'status', 'actions'];

  constructor(
    private companyService: CompanyMasterService,
    private toastService: ToastService,
    private dialog: MatDialog
  ) {}

  ngOnInit() {
    this.loadCompanies();
  }

  loadCompanies() {
    this.loading = true;
    this.companyService.getCompanies({
      search: this.searchText,
      groupType: this.selectedGroup
    }).subscribe({
      next: (response) => {
        if (response.success) {
          this.companies = response.data;
          this.totalCompanies = response.data.length;
        }
        this.loading = false;
      },
      error: (err) => {
        this.toastService.error('Failed to load companies');
        this.loading = false;
      }
    });
  }

  onSearch() {
    this.loadCompanies();
  }

  onFilterChange() {
    this.loadCompanies();
  }

  addCompany() {
    const dialogRef = this.dialog.open(CompanyMasterFormComponent, {
      width: '600px',
      data: { mode: 'create' }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) this.loadCompanies();
    });
  }

  editCompany(company: Company) {
    const dialogRef = this.dialog.open(CompanyMasterFormComponent, {
      width: '600px',
      data: { mode: 'edit', company }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) this.loadCompanies();
    });
  }

  toggleStatus(company: Company) {
    this.companyService.toggleCompanyStatus(company._id).subscribe({
      next: (response) => {
        if (response.success) {
          this.toastService.success('Company status updated');
          this.loadCompanies();
        }
      },
      error: (err) => this.toastService.error('Failed to update status')
    });
  }
}
