import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl, FormsModule } from '@angular/forms';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatMenuModule } from '@angular/material/menu';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { Router } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { AccountService, Account } from '../../services/account.service';
import { DataTableComponent } from '../../../../shared/components/data-table/data-table.component';
import { DataTableColumn } from '../../../../shared/models/data-table.model';

@Component({
  selector: 'app-account-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatPaginatorModule,
    MatSortModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    MatTooltipModule,
    MatSnackBarModule,
    MatMenuModule,
    MatChipsModule,
    MatDividerModule,
    DataTableComponent
  ],
  templateUrl: './account-list.component.html',
  styleUrls: ['./account-list.component.scss']
})
export class AccountListComponent implements OnInit {
  tableColumns: DataTableColumn[] = [
    { key: 'accountNumber', label: 'Account #', sortable: true },
    { key: 'name', label: 'Name', sortable: true },
    { key: 'townName', label: 'Town' },
    { key: 'dimensionName', label: 'Dimension' },
    { key: 'salesmanName', label: 'Salesman' },
    { key: 'typeLabel', label: 'Type', type: 'status', colorMap: {
      'customer': 'primary',
      'supplier': 'accent',
      'employee': 'warn',
      'investor': 'primary',
      'both': 'warn',
      'account_manager': 'primary',
      'sub_account': 'accent'
    }, classMap: {
      'customer': 'chip-purple',
      'supplier': 'chip-warning',
      'employee': 'chip-danger',
      'investor': 'chip-info',
      'both': 'chip-warning',
      'account_manager': 'chip-info',
      'sub_account': 'chip-purple'
    }},
    { key: 'balance', label: 'Balance', type: 'currency', sortable: true },
    { key: 'creditLimit', label: 'Credit Limit', type: 'currency' },
    { key: 'creditDays', label: 'Credit Days', type: 'numeric' },
    { key: 'qualityStatus', label: 'Quality', type: 'status', colorMap: { 'best': 'primary', 'medium': 'accent', 'low': 'warn' }, classMap: { 'best': 'chip-active', 'medium': 'chip-warning', 'low': 'chip-inactive' } },
    { key: 'status', label: 'Status', type: 'status', colorMap: { 'Active': 'primary', 'Inactive': 'warn' }, classMap: { 'Active': 'chip-active', 'Inactive': 'chip-inactive' } },
    { key: 'actions', label: 'Actions', type: 'action', actions: [
      { icon: 'edit', label: 'Edit Account', actionKey: 'edit', color: 'primary' },
      { icon: 'print', label: 'Print Preview', actionKey: 'print' },
      { icon: 'block', label: 'Toggle Status', actionKey: 'toggleStatus' },
      { icon: 'delete', label: 'Delete', actionKey: 'delete', color: 'warn' }
    ]}
  ];

  dataSource = new MatTableDataSource<any>([]);
  loading = false;
  totalItems = 0;
  pageSize = 20;
  currentPage = 0;
  pageSizeOptions = [10, 20, 50, 100];

  // Filters
  searchControl = new FormControl('');
  accountTypeFilter = new FormControl('');
  townFilter = new FormControl('');
  statusFilter = new FormControl('active');

  accountTypes = [
    { value: '', label: 'All Types' },
    { value: 'customer', label: 'Customer' },
    { value: 'supplier', label: 'Supplier' },
    { value: 'employee', label: 'Employee' },
    { value: 'investor', label: 'Investor' },
    { value: 'both', label: 'Both' },
    { value: 'account_manager', label: 'Account Manager' },
    { value: 'sub_account', label: 'Sub Account' }
  ];

  statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' }
  ];

  // Statistics
  statistics = {
    totalAccounts: 0,
    activeAccounts: 0,
    totalBalance: 0,
    customersCount: 0,
    suppliersCount: 0
  };

  constructor(
    private accountService: AccountService,
    private router: Router,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) { }

  ngOnInit(): void {
    this.setupFilters();
    this.loadAccounts();
    this.loadStatistics();
  }

  setupFilters(): void {
    this.searchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe(() => {
        this.currentPage = 0;
        this.loadAccounts();
      });

    this.accountTypeFilter.valueChanges.subscribe(() => {
        this.currentPage = 0;
        this.loadAccounts();
    });
    this.townFilter.valueChanges.subscribe(() => {
        this.currentPage = 0;
        this.loadAccounts();
    });
    this.statusFilter.valueChanges.subscribe(() => {
        this.currentPage = 0;
        this.loadAccounts();
    });
  }

  loadAccounts(): void {
    this.loading = true;

    const filters: any = {
      page: this.currentPage + 1,
      limit: this.pageSize,
      searchText: this.searchControl.value || undefined,
      accountType: this.accountTypeFilter.value || undefined,
      townId: this.townFilter.value || undefined,
      isActive: this.statusFilter.value === 'active' ? true : (this.statusFilter.value === 'inactive' ? false : undefined)
    };

    this.accountService.getAccounts(filters).subscribe({
      next: (response) => {
        if (response.success) {
          this.dataSource.data = (response.data || []).map((acc: any) => ({
            ...acc,
            accountNumber: acc.code || acc.accountNumber || acc._id,
            typeLabel: acc.accountType,
            balance: acc.currentBalance ?? acc.businessDetails?.openingBalance ?? acc.openingBalance ?? 0,
            creditLimit: acc.businessDetails?.creditAmountLimit ?? acc.creditAmountLimit ?? acc.financialInfo?.creditLimit ?? 0,
            creditDays: acc.businessDetails?.creditDaysLimit ?? acc.creditDaysLimit ?? acc.financialInfo?.creditDays ?? 0,
            townName: this.lookupDisplay(acc.townId),
            dimensionName: this.lookupDisplay(acc.dimensionId),
            salesmanName: this.lookupDisplay(acc.assignedSalesmanId || acc.businessDetails?.assignedSalesmanId),
            qualityStatus: this.getQualityStatus(acc),
            status: acc.isActive ? 'Active' : 'Inactive'
          }));
          this.totalItems = response.pagination?.totalItems || 0;
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading accounts:', error);
        this.snackBar.open('Failed to load accounts', 'Close', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  loadStatistics(): void {
    this.accountService.getAccounts({ limit: 1000 }).subscribe({
      next: (response) => {
        if (response.success) {
          const accounts = response.data || [];
          this.statistics = {
            totalAccounts: accounts.length,
            activeAccounts: accounts.filter(acc => acc.isActive).length,
            totalBalance: accounts.reduce((sum, acc: any) => sum + (acc.currentBalance ?? acc.businessDetails?.openingBalance ?? acc.openingBalance ?? 0), 0),
            customersCount: accounts.filter(acc => acc.accountType === 'customer').length,
            suppliersCount: accounts.filter(acc => acc.accountType === 'supplier').length
          };
        }
      },
      error: () => { }
    });
  }

  onPageChange(event: any): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadAccounts();
  }

  onCreateAccount(): void {
    this.router.navigate(['/accounts/registration']);
  }

  onEditAccount(account: Account): void {
    this.router.navigate(['/accounts/registration', account._id]);
  }

  onPrintAccount(account: Account): void {
    this.router.navigate(['/accounts/registration', account._id], {
      queryParams: { print: 'filled' }
    });
  }

  onToggleStatus(account: Account): void {
    const newStatus = !account.isActive;
    const action = newStatus ? 'activate' : 'deactivate';

    if (confirm(`Are you sure you want to ${action} this account?`)) {
      this.accountService.updateAccount(account._id, { isActive: newStatus }).subscribe({
        next: () => {
          this.snackBar.open(`Account ${action}d successfully`, 'Close', { duration: 3000 });
          this.loadAccounts();
          this.loadStatistics();
        },
        error: (error) => {
          console.error('Error updating account status:', error);
          this.snackBar.open('Failed to update account status', 'Close', { duration: 3000 });
        }
      });
    }
  }

  onDeleteAccount(account: Account): void {
    if (confirm(`Are you sure you want to delete account "${account.name}"? This action cannot be undone.`)) {
      this.accountService.deleteAccount(account._id).subscribe({
        next: () => {
          this.snackBar.open('Account deleted successfully', 'Close', { duration: 3000 });
          this.loadAccounts();
          this.loadStatistics();
        },
        error: (error) => {
          console.error('Error deleting account:', error);
          this.snackBar.open('Failed to delete account', 'Close', { duration: 3000 });
        }
      });
    }
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0
    }).format(amount || 0);
  }

  lookupDisplay(value: any): string {
    if (!value) return 'N/A';
    if (typeof value === 'string') return value;
    return value.name || value.dimensionName || value.routeName || value.code || 'N/A';
  }

  getQualityStatus(account: any): 'best' | 'medium' | 'low' {
    if (account.isActive === false) return 'low';
    const balance = Math.abs(account.currentBalance ?? account.businessDetails?.openingBalance ?? account.openingBalance ?? 0);
    const creditLimit = account.businessDetails?.creditAmountLimit ?? account.creditAmountLimit ?? account.financialInfo?.creditLimit ?? 0;
    if (creditLimit > 0 && balance > creditLimit) return 'low';
    if (balance > 0) return 'medium';
    return 'best';
  }

  clearFilters(): void {
    this.searchControl.setValue('');
    this.accountTypeFilter.setValue('');
    this.townFilter.setValue('');
    this.statusFilter.setValue('active');
  }

  onTableAction(event: { action: string, row: any }): void {
    const acc = event.row as Account;
    switch(event.action) {
      case 'edit': this.onEditAccount(acc); break;
      case 'print': this.onPrintAccount(acc); break;
      case 'toggleStatus': this.onToggleStatus(acc); break;
      case 'delete': this.onDeleteAccount(acc); break;
    }
  }
}
