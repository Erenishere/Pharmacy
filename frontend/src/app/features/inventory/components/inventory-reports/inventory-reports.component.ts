import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { Subject, takeUntil, forkJoin } from 'rxjs';
import { InventoryService } from '../../services/inventory.service';
import { WarehouseService, Warehouse } from '../../../warehouses/services/warehouse.service';
import { ToastService } from '../../../../shared/services/toast.service';

@Component({
  selector: 'app-inventory-reports',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatTabsModule,
    MatTableModule,
    MatChipsModule,
    MatTooltipModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule
  ],
  templateUrl: './inventory-reports.component.html',
  styleUrls: ['./inventory-reports.component.scss']
})
export class InventoryReportsComponent implements OnInit, OnDestroy {
  selectedWarehouseId = '';
  warehouses: Warehouse[] = [];
  activeTab = 0;

  loading = {
    summary: false,
    fastMoving: false,
    slowMoving: false,
    deadStock: false,
    lowStock: false,
    aging: false,
    valuation: false
  };

  summaryData: any = null;
  fastMovingItems: any[] = [];
  slowMovingItems: any[] = [];
  deadStockItems: any[] = [];
  lowStockItems: any[] = [];
  agingData: any = null;
  valuationData: any = null;
  valuationMethod = 'weighted_average';

  private destroy$ = new Subject<void>();

  constructor(
    private inventoryService: InventoryService,
    private warehouseService: WarehouseService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.loadWarehouses();
    this.loadSummary();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadWarehouses(): void {
    this.warehouseService.getWarehouses({ isActive: true, limit: 1000 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.warehouses = response.data || [];
          }
        },
        error: () => this.toastService.error('Failed to load warehouses')
      });
  }

  onWarehouseChange(): void {
    this.loadActiveTabData();
  }

  onTabChange(index: number): void {
    this.activeTab = index;
    this.loadActiveTabData();
  }

  private loadActiveTabData(): void {
    switch (this.activeTab) {
      case 0: this.loadSummary(); break;
      case 1: this.loadFastMoving(); break;
      case 2: this.loadSlowMoving(); break;
      case 3: this.loadDeadStock(); break;
      case 4: this.loadLowStock(); break;
      case 5: this.loadAging(); break;
      case 6: this.loadValuation(); break;
    }
  }

  loadSummary(): void {
    this.loading.summary = true;
    this.inventoryService.getStockSummary(this.selectedWarehouseId || undefined)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.summaryData = response.data;
          }
          this.loading.summary = false;
        },
        error: () => {
          this.loading.summary = false;
          this.toastService.error('Failed to load stock summary');
        }
      });
  }

  loadFastMoving(): void {
    this.loading.fastMoving = true;
    this.inventoryService.getFastMovingItems(this.selectedWarehouseId || undefined)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.fastMovingItems = response.data?.items || [];
          }
          this.loading.fastMoving = false;
        },
        error: () => {
          this.loading.fastMoving = false;
          this.toastService.error('Failed to load fast moving items');
        }
      });
  }

  loadSlowMoving(): void {
    this.loading.slowMoving = true;
    this.inventoryService.getSlowMovingItems(this.selectedWarehouseId || undefined)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.slowMovingItems = response.data?.items || [];
          }
          this.loading.slowMoving = false;
        },
        error: () => {
          this.loading.slowMoving = false;
          this.toastService.error('Failed to load slow moving items');
        }
      });
  }

  loadDeadStock(): void {
    this.loading.deadStock = true;
    this.inventoryService.getDeadStockReport(this.selectedWarehouseId || undefined)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.deadStockItems = response.data?.items || [];
          }
          this.loading.deadStock = false;
        },
        error: () => {
          this.loading.deadStock = false;
          this.toastService.error('Failed to load dead stock report');
        }
      });
  }

  loadLowStock(): void {
    this.loading.lowStock = true;
    this.inventoryService.getLowStockReport(this.selectedWarehouseId || undefined)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.lowStockItems = response.data || [];
          }
          this.loading.lowStock = false;
        },
        error: () => {
          this.loading.lowStock = false;
          this.toastService.error('Failed to load low stock report');
        }
      });
  }

  loadAging(): void {
    this.loading.aging = true;
    this.inventoryService.getStockAgingReport(this.selectedWarehouseId || undefined)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.agingData = response.data;
          }
          this.loading.aging = false;
        },
        error: () => {
          this.loading.aging = false;
          this.toastService.error('Failed to load aging report');
        }
      });
  }

  loadValuation(): void {
    this.loading.valuation = true;
    this.inventoryService.getStockValuation(
      this.valuationMethod as any,
      this.selectedWarehouseId || undefined
    )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.valuationData = response.data;
          }
          this.loading.valuation = false;
        },
        error: () => {
          this.loading.valuation = false;
          this.toastService.error('Failed to load valuation report');
        }
      });
  }

  formatNumber(num: number): string {
    if (num === undefined || num === null) return '0';
    return new Intl.NumberFormat('en-PK').format(num);
  }

  formatCurrency(num: number): string {
    if (num === undefined || num === null) return 'Rs. 0';
    return 'Rs. ' + new Intl.NumberFormat('en-PK', { minimumFractionDigits: 2 }).format(num);
  }

  formatDate(date: string): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  getMovementClass(value: number): string {
    if (value > 0) return 'positive';
    if (value < 0) return 'negative';
    return '';
  }
}
