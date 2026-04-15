import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule, FormsModule } from '@angular/forms';
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
import { MatDialogModule } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
import { BatchService } from '../../services/batch.service';
import { ToastService } from '../../../../shared/services/toast.service';
import { Batch, BatchStatistics, BatchQueryParams } from '../../models/batch.model';

@Component({
  selector: 'app-batch-management',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
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
    MatDialogModule,
    MatExpansionModule
  ],
  templateUrl: './batch-management.component.html',
  styleUrls: ['./batch-management.component.scss']
})
export class BatchManagementComponent implements OnInit, OnDestroy {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  displayedColumns: string[] = [
    'batchNumber',
    'itemName',
    'warehouseName',
    'manufacturingDate',
    'expiryDate',
    'quantity',
    'remainingQuantity',
    'unitCost',
    'totalCost',
    'status',
    'fifoRecommendation',
    'actions'
  ];

  dataSource = new MatTableDataSource<Batch>([]);
  loading = false;
  refreshing = false;

  // Statistics
  statistics: BatchStatistics = {
    totalBatches: 0,
    activeBatches: 0,
    expiredBatches: 0,
    nearExpiryBatches: 0,
    depletedBatches: 0,
    totalValue: 0,
    totalQuantity: 0,
    totalRemainingQuantity: 0
  };

  // Filters
  searchControl = new FormControl('');
  selectedWarehouse = '';
  selectedItem = '';
  selectedStatus = 'all';
  expiryDaysThreshold = 90; // Default 90 days for near-expiry

  // Dropdowns data
  warehouses: any[] = [];
  items: any[] = [];

  statusOptions = [
    { value: 'all', label: 'All Batches' },
    { value: 'active', label: 'Active' },
    { value: 'near_expiry', label: 'Near Expiry' },
    { value: 'expired', label: 'Expired' },
    { value: 'depleted', label: 'Depleted' }
  ];

  // Pagination
  totalItems = 0;
  pageSize = 25;
  pageIndex = 0;
  pageSizeOptions = [10, 25, 50, 100];

  // Auto-refresh
  autoRefreshEnabled = false;
  autoRefreshInterval: any;
  refreshIntervalSeconds = 60;

  private destroy$ = new Subject<void>();

  constructor(
    private batchService: BatchService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.loadStatistics();
    this.loadBatches();
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
        this.loadBatches();
      });
  }

  loadStatistics(): void {
    const warehouseId = this.selectedWarehouse || undefined;
    this.batchService.getBatchStatistics({ locationId: warehouseId })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.statistics = response.data;
          }
        },
        error: (error) => {
          console.error('Failed to load statistics:', error);
        }
      });
  }

  loadBatches(): void {
    this.loading = true;
    const params: BatchQueryParams = {
      page: this.pageIndex + 1,
      limit: this.pageSize,
      itemSearch: this.searchControl.value || undefined,
      locationIds: this.selectedWarehouse ? [this.selectedWarehouse] : undefined,
      includeExpired: this.selectedStatus === 'expired' || this.selectedStatus === 'all',
      includeDepleted: this.selectedStatus === 'depleted' || this.selectedStatus === 'all'
    };

    // Handle status filtering
    if (this.selectedStatus === 'active') {
      params.statuses = ['active'];
    } else if (this.selectedStatus === 'expired') {
      params.statuses = ['expired'];
    } else if (this.selectedStatus === 'depleted') {
      params.statuses = ['depleted'];
    } else if (this.selectedStatus === 'near_expiry') {
      // For near expiry, we'll filter on the client side after loading
      params.statuses = ['active'];
    }

    this.batchService.getAllBatches(params)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            let batches = response.data || [];
            
            // Filter near-expiry batches on client side
            if (this.selectedStatus === 'near_expiry') {
              batches = batches.filter(batch => this.isNearExpiry(batch.expiryDate));
            }

            this.dataSource.data = batches;
            this.totalItems = response.pagination?.totalItems || batches.length;
          }
          this.loading = false;
        },
        error: (error) => {
          this.toastService.error('Failed to load batches');
          this.loading = false;
        }
      });
  }

  loadFilterOptions(): void {
    // Load warehouses and items for filters
    // These would typically come from their respective services
    // For now, we'll load them as part of the batch data or from separate endpoints
  }

  onFilterChange(): void {
    this.pageIndex = 0;
    this.loadBatches();
    this.loadStatistics();
  }

  clearFilters(): void {
    this.searchControl.setValue('');
    this.selectedWarehouse = '';
    this.selectedItem = '';
    this.selectedStatus = 'all';
    this.pageIndex = 0;
    this.loadBatches();
    this.loadStatistics();
  }

  onPageChange(event: any): void {
    this.pageSize = event.pageSize;
    this.pageIndex = event.pageIndex;
    this.loadBatches();
  }

  refreshData(): void {
    this.refreshing = true;
    this.loadStatistics();
    this.loadBatches();
    setTimeout(() => {
      this.refreshing = false;
      this.toastService.success('Batch data refreshed');
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

  viewBatchDetails(batch: Batch): void {
    // Navigate to batch details or open dialog
    console.log('View batch details:', batch);
    this.toastService.info('Batch details view will be implemented');
  }

  viewBatchHistory(batch: Batch): void {
    // Open batch movement history dialog
    console.log('View batch history:', batch);
    this.toastService.info('Batch history view will be implemented');
  }

  viewItemBatches(batch: Batch): void {
    // Show all batches for this item
    this.selectedItem = batch.item._id;
    this.searchControl.setValue(batch.item.name);
    this.loadBatches();
  }

  // Status and expiry helpers
  getBatchStatusClass(batch: Batch): string {
    if (batch.status === 'expired') {
      return 'expired';
    }
    if (batch.status === 'depleted') {
      return 'depleted';
    }
    if (this.isNearExpiry(batch.expiryDate)) {
      return 'near-expiry';
    }
    return 'active';
  }

  getBatchStatusLabel(batch: Batch): string {
    if (batch.status === 'expired') {
      return 'Expired';
    }
    if (batch.status === 'depleted') {
      return 'Depleted';
    }
    if (this.isNearExpiry(batch.expiryDate)) {
      return 'Near Expiry';
    }
    return 'Active';
  }

  getBatchStatusIcon(batch: Batch): string {
    if (batch.status === 'expired') {
      return 'error';
    }
    if (batch.status === 'depleted') {
      return 'remove_circle';
    }
    if (this.isNearExpiry(batch.expiryDate)) {
      return 'warning';
    }
    return 'check_circle';
  }

  isNearExpiry(expiryDate: string): boolean {
    const expiry = new Date(expiryDate);
    const today = new Date();
    const daysUntilExpiry = Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= this.expiryDaysThreshold && daysUntilExpiry > 0;
  }

  isExpired(expiryDate: string): boolean {
    const expiry = new Date(expiryDate);
    const today = new Date();
    return expiry < today;
  }

  getDaysUntilExpiry(expiryDate: string): number {
    const expiry = new Date(expiryDate);
    const today = new Date();
    return Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  }

  // FIFO/FEFO Recommendations
  getFifoRecommendation(batch: Batch): string {
    const days = this.getDaysUntilExpiry(batch.expiryDate);
    
    if (days < 0) {
      return 'Do Not Use - Expired';
    }
    if (days <= 30) {
      return 'Use First - Expiring Soon';
    }
    if (days <= 90) {
      return 'Use Next - Near Expiry';
    }
    return 'Normal Priority';
  }

  getFifoRecommendationClass(batch: Batch): string {
    const days = this.getDaysUntilExpiry(batch.expiryDate);
    
    if (days < 0) {
      return 'fifo-expired';
    }
    if (days <= 30) {
      return 'fifo-urgent';
    }
    if (days <= 90) {
      return 'fifo-soon';
    }
    return 'fifo-normal';
  }

  // Formatting helpers
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

  exportToExcel(): void {
    this.toastService.info('Excel export will be implemented');
  }

  exportToPDF(): void {
    this.toastService.info('PDF export will be implemented');
  }

  generateExpiryReport(): void {
    this.toastService.info('Expiry report generation will be implemented');
  }

  generateBatchReport(): void {
    this.toastService.info('Batch-wise stock report generation will be implemented');
  }
}
