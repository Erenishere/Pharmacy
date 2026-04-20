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
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';
import { CompanyMasterService, Company } from '../../services/company-master.service';
import { ToastService } from '../../../../shared/services/toast.service';
import { CompanyMasterFormComponent } from '../company-master-form/company-master-form.component';
import { DataTableColumn, TableActionClickEvent } from '../../../../shared/models/data-table.model';
import { DataTableComponent } from '../../../../shared/components/data-table/data-table.component';


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
    MatChipsModule,
    MatProgressSpinnerModule,
    DataTableComponent
  ],
  template: `
    <div class="list-page-container items-enhanced-page">
      <div class="list-page-header">
        <div class="header-content">
          <h1 class="page-title"><mat-icon>business</mat-icon> Company Master Management</h1>
          <p class="page-subtitle">Manage pharmaceutical manufacturing companies (Total: {{ totalCompanies }})</p>
        </div>
        <div class="header-actions">
          <button mat-raised-button color="primary" (click)="addCompany()" class="create-btn">
            <mat-icon>add</mat-icon> New Company
          </button>
        </div>
      </div>

      <div class="list-page-card">
        <div class="list-filters-section">
          <div class="filter-group-primary">
            <mat-form-field appearance="outline" class="filter-field">
              <mat-label>Search Companies</mat-label>
              <input matInput [(ngModel)]="searchText" (input)="onSearch()" placeholder="Name or Code">
              <mat-icon matPrefix>search</mat-icon>
            </mat-form-field>
          </div>

          <div class="filter-group-secondary">
            <mat-form-field appearance="outline" class="filter-field" style="min-width: 200px;">
              <mat-label>Group Type</mat-label>
              <mat-select [(ngModel)]="selectedGroup" (selectionChange)="onFilterChange()">
                <mat-option value="">All Groups</mat-option>
                <mat-option value="A">Group A</mat-option>
                <mat-option value="B">Group B</mat-option>
                <mat-option value="C">Group C</mat-option>
              </mat-select>
            </mat-form-field>

            <button mat-icon-button (click)="loadCompanies()" matTooltip="Refresh Data">
              <mat-icon>refresh</mat-icon>
            </button>
          </div>
        </div>

        <div class="table-wrapper">
          <div class="loading-overlay" *ngIf="loading">
            <mat-spinner diameter="40"></mat-spinner>
          </div>

          <app-data-table 
            [data]="companies"
            [columns]="tableColumns"
            [pageSize]="10"
            [pageSizeOptions]="[10, 25, 50]"
            (actionClick)="onTableAction($event)">
          </app-data-table>
        </div>
      </div>
    </div>
  `,
  styles: [`
    @import 'styles/shared-list-styles';
    .list-page-card { @include list-card; border: 1px solid $p-border; }
    .list-filters-section { padding: 24px !important; border-bottom: 1px solid $p-border; display: flex; justify-content: space-between; align-items: center; }
    .filter-group-primary { flex: 1; }
    .filter-group-secondary { display: flex; align-items: center; gap: 16px; }
  `]
})
export class CompanyMasterListComponent implements OnInit {
  companies: Company[] = [];
  totalCompanies = 0;
  loading = false;
  searchText = '';
  selectedGroup = '';

  tableColumns: DataTableColumn[] = [
    { key: 'code', label: 'Code', sortable: true },
    { key: 'name', label: 'Company Name', sortable: true },
    { key: 'groupType', label: 'Group', getValue: (row: any) => row.groupType || '-' },
    { key: 'contact', label: 'Contact', getValue: (row: any) => row.contactPerson || 'N/A' },
    { key: 'phone', label: 'Phone', getValue: (row: any) => row.phone || '-' },
    { key: 'actions', label: 'Actions', type: 'action', actions: [
      { icon: 'edit', label: 'Edit', actionKey: 'edit' },
      { icon: 'sync_alt', label: 'Toggle Status', actionKey: 'toggle' }
    ]}
  ];

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

  onTableAction(event: TableActionClickEvent): void {
    const row = event.row as Company;
    switch(event.action) {
      case 'edit': this.editCompany(row); break;
      case 'toggle': this.toggleStatus(row); break;
    }
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
