import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCardModule } from '@angular/material/card';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { ActivatedRoute } from '@angular/router';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';

import { InventoryService } from '../../services/inventory.service';
import { ToastService } from '../../../../shared/services/toast.service';
import { ExportService } from '../../../../core/services/export.service';
import { StockLevel, StockOverview, StockQueryParams } from '../../models/inventory.model';

@Component({
  selector: 'app-stock-level-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatCardModule,
    MatMenuModule,
    MatBadgeModule,
    MatDialogModule
  ],
  templateUrl: './stock-level-dashboard.component.html',
  styleUrls: ['./stock-level-dashboard.component.scss']
})
export class StockLevelDashboardComponent implements OnInit, OnDestroy {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  displayedColumns: string[] = [
    'itemCode',
    'itemName',
    'category',
    'company',
    'warehouse',
    'quantity',
    'reserved',
    'available',
    'minimumLevel',
    'batchNumber',
    'expiryDate',
    'status',
    'actions'
  ];

  dataSource = new MatTableDataSource<StockLevel>([]);
  loading = false;
  refreshing = false;
  exporting = false;

  // Overview stats
  overview: StockOverview = {
    totalItems: 0,
    totalInventoryValue: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    totalQuantity: 0,
    totalReserved: 0,
    totalAvailable: 0
  };

  // Filters
  searchControl = new FormControl('');
  selectedWarehouse = '';
  selectedCategory = '';
  selectedCompany = '';
  selectedStockStatus = 'all';

  // Dropdowns data
  warehouses: any[] = [];
  categories: any[] = [];
  companies: any[] = [];

  stockStatusOptions = [
    { value: 'all', label: 'All Items' },
    { value: 'low_stock', label: 'Low Stock' },
    { value: 'out_of_stock', label: 'Out of Stock' }
  ];

  // Pagination
  totalItems = 0;
  pageSize = 25;
  pageIndex = 0;
  pageSizeOptions = [10, 25, 50, 100];

  // Auto-refresh
  autoRefreshEnabled = false;
  autoRefreshInterval: any;
  refreshIntervalSeconds = 30;

  private destroy$ = new Subject<void>();

  constructor(
    private inventoryService: InventoryService,
    private toastService: ToastService,
    private exportService: ExportService,
    private dialog: MatDialog,
    private route: ActivatedRoute
  ) { }

  ngOnInit(): void {
    // Check for warehouseId in query params
    const qWarehouseId = this.route.snapshot.queryParamMap.get('warehouseId');
    if (qWarehouseId) {
      this.selectedWarehouse = qWarehouseId;
    }

    this.loadOverview();
    this.loadStockLevels();
    this.loadFilterOptions();
    this.setupSearch();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.autoRefreshInterval) {
      clearInterval(this.autoRefreshInterval);
    }
  }

  private setupSearch(): void {
    this.searchControl.valueChanges
      .pipe(
        debounceTime(400),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.pageIndex = 0;
        this.loadStockLevels();
      });
  }

  loadOverview(): void {
    const warehouseId = this.selectedWarehouse || undefined;
    this.inventoryService.getStockOverview(warehouseId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.overview = response.data;
          }
        },
        error: (error) => {
          console.error('Failed to load overview:', error);
        }
      });
  }

  loadStockLevels(): void {
    this.loading = true;
    const params: StockQueryParams = {
      page: this.pageIndex + 1,
      limit: this.pageSize,
      search: this.searchControl.value || undefined,
      warehouseId: this.selectedWarehouse || undefined,
      categoryId: this.selectedCategory || undefined,
      companyId: this.selectedCompany || undefined,
      stockStatus: this.selectedStockStatus !== 'all' ? this.selectedStockStatus as any : undefined
    };

    this.inventoryService.getStockLevels(params)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.dataSource.data = response.data || [];
            this.totalItems = response.pagination?.totalItems || 0;
          }
          this.loading = false;
        },
        error: (error) => {
          this.toastService.error('Failed to load stock levels');
          this.loading = false;
        }
      });
  }

  loadFilterOptions(): void {
    // Load warehouses, categories, and companies for filters
    // These would typically come from their respective services
    // For now, we'll load them as part of the stock data or from separate endpoints
  }

  onFilterChange(): void {
    this.pageIndex = 0;
    this.loadStockLevels();
    this.loadOverview();
  }

  clearFilters(): void {
    this.searchControl.setValue('');
    this.selectedWarehouse = '';
    this.selectedCategory = '';
    this.selectedCompany = '';
    this.selectedStockStatus = 'all';
    this.pageIndex = 0;
    this.loadStockLevels();
    this.loadOverview();
  }

  onPageChange(event: any): void {
    this.pageSize = event.pageSize;
    this.pageIndex = event.pageIndex;
    this.loadStockLevels();
  }

  refreshData(): void {
    this.refreshing = true;
    this.loadOverview();
    this.loadStockLevels();
    setTimeout(() => {
      this.refreshing = false;
      this.toastService.success('Stock levels refreshed');
    }, 500);
  }

  toggleAutoRefresh(): void {
    this.autoRefreshEnabled = !this.autoRefreshEnabled;

    if (this.autoRefreshEnabled) {
      this.autoRefreshInterval = setInterval(() => {
        this.refreshData();
      }, this.refreshIntervalSeconds * 1000);
      this.toastService.info(`Auto-refresh enabled (${this.refreshIntervalSeconds}s)`);
    } else {
      if (this.autoRefreshInterval) {
        clearInterval(this.autoRefreshInterval);
      }
      this.toastService.info('Auto-refresh disabled');
    }
  }

  viewItemDetails(item: StockLevel): void {
    // Navigate to item details or open dialog
    console.log('View item details:', item);
  }

  quickTransfer(item: StockLevel): void {
    // Open transfer dialog
    console.log('Quick transfer:', item);
    this.toastService.info('Transfer dialog will be implemented in Task 10.2');
  }

  quickAdjustment(item: StockLevel): void {
    // Open adjustment dialog
    console.log('Quick adjustment:', item);
    this.toastService.info('Adjustment dialog will be implemented in Task 10.3');
  }

  viewMovementHistory(item: StockLevel): void {
    // Open movement history dialog
    console.log('View movement history:', item);
  }

  getStockStatusClass(item: StockLevel): string {
    if (item.availableQuantity === 0) {
      return 'out-of-stock';
    }
    if (item.minimumLevel && item.availableQuantity <= item.minimumLevel) {
      return 'low-stock';
    }
    return 'in-stock';
  }

  getStockStatusLabel(item: StockLevel): string {
    if (item.availableQuantity === 0) {
      return 'Out of Stock';
    }
    if (item.minimumLevel && item.availableQuantity <= item.minimumLevel) {
      return 'Low Stock';
    }
    return 'In Stock';
  }

  getStockStatusIcon(item: StockLevel): string {
    if (item.availableQuantity === 0) {
      return 'remove_circle';
    }
    if (item.minimumLevel && item.availableQuantity <= item.minimumLevel) {
      return 'warning';
    }
    return 'check_circle';
  }

  isExpiringSoon(expiryDate: string | undefined): boolean {
    if (!expiryDate) return false;
    const expiry = new Date(expiryDate);
    const today = new Date();
    const daysUntilExpiry = Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 90 && daysUntilExpiry > 0; // Expiring within 90 days
  }

  isExpired(expiryDate: string | undefined): boolean {
    if (!expiryDate) return false;
    const expiry = new Date(expiryDate);
    const today = new Date();
    return expiry < today;
  }

  formatDate(date: string | undefined): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  formatNumber(num: number | undefined): string {
    if (num === undefined || num === null || isNaN(num)) return '0';
    return new Intl.NumberFormat('en-PK').format(num);
  }

  formatCurrency(amount: number | undefined): string {
    if (amount === undefined || amount === null || isNaN(amount)) return 'Rs. 0';
    return 'Rs. ' + new Intl.NumberFormat('en-PK', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }

  private buildStockQueryParams(limitOverride?: number): StockQueryParams {
    return {
      page: 1,
      limit: limitOverride || this.pageSize,
      search: this.searchControl.value || undefined,
      warehouseId: this.selectedWarehouse || undefined,
      categoryId: this.selectedCategory || undefined,
      companyId: this.selectedCompany || undefined,
      stockStatus: this.selectedStockStatus !== 'all' ? this.selectedStockStatus as any : undefined
    };
  }

  private mapExportRows(items: StockLevel[]): Array<Record<string, string | number>> {
    return items.map((item) => ({
      'Item Code': item.itemCode || '',
      'Item Name': item.itemName || '',
      Category: item.categoryName || '',
      Company: item.companyName || '',
      Warehouse: item.warehouseName || '',
      Quantity: item.quantity ?? 0,
      Reserved: item.reservedQuantity ?? 0,
      Available: item.availableQuantity ?? 0,
      'Minimum Level': item.minimumLevel ?? 0,
      'Batch Number': item.batchNumber || '',
      Expiry: item.expiryDate ? this.formatDate(item.expiryDate) : '',
      Status: this.getStockStatusLabel(item)
    }));
  }

  private exportStockLevels(format: 'excel' | 'pdf'): void {
    if (this.exporting) {
      return;
    }

    const exportLimit = Math.max(this.totalItems, this.dataSource.data.length, this.pageSize);
    if (exportLimit === 0) {
      this.toastService.info('No stock rows available to export');
      return;
    }

    this.exporting = true;
    this.inventoryService.getStockLevels(this.buildStockQueryParams(exportLimit))
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          const rows = this.mapExportRows(response.data || []);
          if (rows.length === 0) {
            this.toastService.info('No stock rows available to export');
            this.exporting = false;
            return;
          }

          const filename = 'stock-level-dashboard';
          if (format === 'excel') {
            this.exportService.exportToExcel(rows, filename, 'Stock Levels');
            this.toastService.success('Stock levels exported to Excel');
          } else {
            const columns = Object.keys(rows[0]);
            this.exportService.exportToPDF(rows, columns, filename, 'Stock Level Dashboard', 'landscape');
            this.toastService.success('Stock levels exported to PDF');
          }

          this.exporting = false;
        },
        error: () => {
          this.toastService.error(`Failed to export stock levels to ${format.toUpperCase()}`);
          this.exporting = false;
        }
      });
  }

  exportToExcel(): void {
    this.exportStockLevels('excel');
  }

  exportToPDF(): void {
    this.exportStockLevels('pdf');
  }
}
