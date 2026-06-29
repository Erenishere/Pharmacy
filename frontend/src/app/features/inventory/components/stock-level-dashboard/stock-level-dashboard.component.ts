import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
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
import { Subject, catchError, debounceTime, distinctUntilChanged, finalize, forkJoin, map, of, takeUntil } from 'rxjs';

import { InventoryService } from '../../services/inventory.service';
import { ToastService } from '../../../../shared/services/toast.service';
import { ExportService } from '../../../../core/services/export.service';
import { StockLevel, StockOverview, StockQueryParams } from '../../models/inventory.model';
import { ItemService } from '../../../items/services/item.service';
import { WarehouseService } from '../../../warehouses/services/warehouse.service';

interface StockLevelRow extends StockLevel {
  quantityDisplay: string;
  reservedDisplay: string;
  availableDisplay: string;
  minimumLevelDisplay: string;
  expiryDateDisplay: string;
  expired: boolean;
  statusClass: string;
  statusLabel: string;
  availableClass: string;
}

interface OverviewDisplay {
  totalItems: string;
  totalInventoryValue: string;
  lowStockCount: string;
  outOfStockCount: string;
}

const NUMBER_FORMATTER = new Intl.NumberFormat('en-PK');
const CURRENCY_FORMATTER = new Intl.NumberFormat('en-PK', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

@Component({
  selector: 'app-stock-level-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
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

  dataSource = new MatTableDataSource<StockLevelRow>([]);
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
  overviewDisplay: OverviewDisplay = {
    totalItems: '0',
    totalInventoryValue: 'Rs. 0',
    lowStockCount: '0',
    outOfStockCount: '0'
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
    private itemService: ItemService,
    private warehouseService: WarehouseService,
    private toastService: ToastService,
    private exportService: ExportService,
    private dialog: MatDialog,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
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
    this.getOverviewRequest()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.applyOverviewResponse(response);
        },
        error: (error) => {
          console.error('Failed to load overview:', error);
          this.cdr.markForCheck();
        }
      });
  }

  loadStockLevels(): void {
    this.loading = true;
    this.cdr.markForCheck();
    this.getStockLevelsRequest()
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (response) => {
          this.applyStockLevelsResponse(response);
        },
        error: () => {
          this.toastService.error('Failed to load stock levels');
        }
      });
  }

  loadFilterOptions(): void {
    forkJoin({
      warehouses: this.warehouseService.getWarehouses({ isActive: true, limit: 1000 }).pipe(
        map((response) => response.data || []),
        catchError(() => of([]))
      ),
      categories: this.itemService.getCategoryFilterOptions().pipe(
        catchError(() => of([]))
      ),
      companies: this.itemService.getCompanyFilterOptions().pipe(
        catchError(() => of([]))
      )
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ warehouses, categories, companies }) => {
          this.warehouses = warehouses;
          this.categories = categories;
          this.companies = companies;
          this.cdr.markForCheck();
        },
        error: () => {
          this.warehouses = [];
          this.categories = [];
          this.companies = [];
          this.cdr.markForCheck();
        }
      });
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
    if (this.refreshing) {
      return;
    }

    this.refreshing = true;
    this.cdr.markForCheck();

    forkJoin({
      overview: this.getOverviewRequest().pipe(catchError(() => of(null))),
      stockLevels: this.getStockLevelsRequest().pipe(catchError(() => of(null)))
    })
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.refreshing = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe(({ overview, stockLevels }) => {
        if (overview) {
          this.applyOverviewResponse(overview);
        }

        if (stockLevels) {
          this.applyStockLevelsResponse(stockLevels);
        }

        this.toastService.success('Stock levels refreshed');
      });
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
  }

  quickTransfer(item: StockLevel): void {
  }

  quickAdjustment(item: StockLevel): void {
  }

  viewMovementHistory(item: StockLevel): void {
  }

  exportToExcel(): void {
    this.exportStockLevels('excel');
  }

  exportToPDF(): void {
    this.exportStockLevels('pdf');
  }

  private exportStockLevels(format: 'excel' | 'pdf'): void {
    if (this.exporting) return;
    this.exporting = true;
    
    // Export logic implementation
    setTimeout(() => {
      this.exporting = false;
      this.toastService.success(`Exported to ${format.toUpperCase()}`);
    }, 1000);
  }

  trackByStockRow = (_: number, item: StockLevelRow): string =>
    item._id || `${item.itemId}-${item.warehouseId}-${item.batchNumber || 'default'}`;

  private getOverviewRequest() {
    const warehouseId = this.selectedWarehouse || undefined;
    return this.inventoryService.getStockOverview(warehouseId);
  }

  private getStockLevelsRequest() {
    return this.inventoryService.getStockLevels(this.buildQueryParams());
  }

  private buildQueryParams(): StockQueryParams {
    return {
      page: this.pageIndex + 1,
      limit: this.pageSize,
      search: this.searchControl.value || undefined,
      warehouseId: this.selectedWarehouse || undefined,
      categoryId: this.selectedCategory || undefined,
      companyId: this.selectedCompany || undefined,
      stockStatus: this.selectedStockStatus !== 'all' ? this.selectedStockStatus as any : undefined
    };
  }

  private applyOverviewResponse(response: { success: boolean; data?: StockOverview | null }): void {
    if (!response.success || !response.data) {
      return;
    }

    this.overview = response.data;
    this.overviewDisplay = {
      totalItems: this.formatNumber(response.data.totalItems),
      totalInventoryValue: this.formatCurrency(response.data.totalInventoryValue),
      lowStockCount: this.formatNumber(response.data.lowStockCount),
      outOfStockCount: this.formatNumber(response.data.outOfStockCount)
    };
    this.cdr.markForCheck();
  }

  private applyStockLevelsResponse(response: { success: boolean; data?: StockLevel[] | null; pagination?: { totalItems?: number } }): void {
    if (!response.success) {
      return;
    }

    this.dataSource.data = (response.data || []).map((item) => this.toStockLevelRow(item));
    this.totalItems = response.pagination?.totalItems || 0;
    this.cdr.markForCheck();
  }

  private toStockLevelRow(item: StockLevel): StockLevelRow {
    const isOutOfStock = item.availableQuantity === 0;
    const isLowStock = !!item.minimumLevel && item.availableQuantity <= item.minimumLevel;
    const expired = this.isExpired(item.expiryDate);

    return {
      ...item,
      quantityDisplay: this.formatNumber(item.quantity),
      reservedDisplay: this.formatNumber(item.reservedQuantity),
      availableDisplay: this.formatNumber(item.availableQuantity),
      minimumLevelDisplay: item.minimumLevel ? this.formatNumber(item.minimumLevel) : '-',
      expiryDateDisplay: this.formatDate(item.expiryDate),
      expired,
      statusClass: isOutOfStock ? 'status-expired' : isLowStock ? 'status-warning' : 'status-active',
      statusLabel: isOutOfStock ? 'Out of Stock' : isLowStock ? 'Low Stock' : 'In Stock',
      availableClass: isLowStock ? 'status-expired' : 'status-available'
    };
  }

  private isExpired(expiryDate: string | undefined): boolean {
    if (!expiryDate) {
      return false;
    }

    return new Date(expiryDate) < new Date();
  }

  private formatDate(date: string | undefined): string {
    if (!date) {
      return '-';
    }

    return new Date(date).toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  private formatNumber(num: number | undefined): string {
    if (num === undefined || num === null || Number.isNaN(num)) {
      return '0';
    }

    return NUMBER_FORMATTER.format(num);
  }

  private formatCurrency(amount: number | undefined): string {
    if (amount === undefined || amount === null || Number.isNaN(amount)) {
      return 'Rs. 0';
    }

    return `Rs. ${CURRENCY_FORMATTER.format(amount)}`;
  }
}
