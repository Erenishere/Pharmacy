import { Component, OnInit, OnDestroy, ViewChild, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatSortModule, MatSort, Sort } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatMenuModule } from '@angular/material/menu';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { Subject, takeUntil, catchError, of } from 'rxjs';

import { BatchService } from '../../services/batch.service';
import { Batch, BatchResponse, PaginationParams, BatchStatus } from '../../models/batch.model';
import { BatchFilter } from '../../models/batch-filter.model';
import { BatchFiltersComponent } from '../batch-filters/batch-filters.component';
import { DataTableComponent } from '../../../../shared/components/data-table/data-table.component';
import { DataTableColumn, TableActionClickEvent } from '../../../../shared/models/data-table.model';

export enum ViewMode {
  TABLE = 'table',
  BY_ITEM = 'by-item',
  BY_LOCATION = 'by-location'
}

export interface BatchGroup {
  key: string;
  name: string;
  batches: Batch[];
  totalQuantity: number;
  remainingQuantity: number;
  batchCount: number;
  expanded?: boolean;
}

@Component({
  selector: 'app-batch-list',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatCardModule,
    MatTooltipModule,
    MatButtonToggleModule,
    MatMenuModule,
    MatExpansionModule,
    RouterModule,
    BatchFiltersComponent,
    DataTableComponent
  ],
  templateUrl: './batch-list.component.html',
  styleUrls: ['./batch-list.component.scss']
})
export class BatchListComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  // Expose ViewMode enum to template
  ViewMode = ViewMode;

  displayedColumns: string[] = ['batchNumber', 'item', 'quantity', 'expiryDate', 'location', 'status', 'actions'];
  dataSource = new MatTableDataSource<Batch>([]);
  tableColumns: DataTableColumn[] = [];

  loading = false;
  totalBatches = 0;
  pageSize = 25;
  pageSizeOptions: number[] = [10, 25, 50, 100];
  currentPage = 0;

  // View mode properties
  currentViewMode: ViewMode = ViewMode.TABLE;
  groupedBatches: BatchGroup[] = [];

  private destroy$ = new Subject<void>();
  currentFilters: BatchFilter = {};
  private currentSort: Sort = { active: 'expiryDate', direction: 'asc' };

  constructor(
    private batchService: BatchService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.initTableColumns();
    this.loadFiltersFromUrl();
    this.loadViewModeFromUrl();
    this.loadBatches();
  }

  ngAfterViewInit(): void {
    // Initialize sort after view init - wrap in setTimeout to avoid ExpressionChangedAfterItHasBeenCheckedError
    setTimeout(() => {
      if (this.sort) {
        this.sort.active = this.currentSort.active;
        this.sort.direction = this.currentSort.direction;
        this.cdr.detectChanges();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onFiltersChanged(filters: BatchFilter): void {
    this.currentFilters = filters;
    this.currentPage = 0;
    this.updateUrlParams();
    this.loadBatches();
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    this.updateUrlParams();
    this.loadBatches();
  }

  onSortChange(sort: Sort): void {
    this.currentSort = sort;
    this.currentPage = 0;
    this.updateUrlParams();
    this.loadBatches();
  }

  onTableAction(event: TableActionClickEvent): void {
    const batch = event.row as Batch;
    switch (event.action) {
      case 'view':
        this.router.navigate(['/batches', batch._id]);
        break;
      case 'edit':
        this.router.navigate(['/batches', batch._id, 'edit']);
        break;
      case 'delete':
        this.onDeleteBatch(batch);
        break;
    }
  }

  private initTableColumns(): void {
    this.tableColumns = [
      { key: 'batchNumber', label: 'Batch #', sortable: true },
      { 
        key: 'itemName', 
        label: 'Item', 
        sortable: true,
        getValue: (row: Batch) => row.item?.name || 'N/A'
      },
      { 
        key: 'quantity', 
        label: 'Quantity', 
        sortable: true,
        getValue: (row: Batch) => `${row.remainingQuantity} / ${row.quantity}`
      },
      { 
        key: 'expiryDate', 
        label: 'Expiry Date', 
        type: 'date', 
        sortable: true,
        pipeFormat: 'mediumDate',
        getCellClass: (row: Batch) => this.getExpiryClass(row.expiryDate)
      },
      { 
        key: 'locationName', 
        label: 'Location', 
        sortable: true,
        getValue: (row: Batch) => row.location?.name || 'Main'
      },
      { 
        key: 'status', 
        label: 'Status', 
        type: 'status',
        classMap: {
          'active': 'chip-success',
          'expired': 'chip-danger',
          'depleted': 'chip-warning',
          'quarantined': 'chip-info'
        }
      },
      {
        key: 'actions',
        label: 'Actions',
        type: 'action',
        align: 'center',
        actions: [
          { icon: 'visibility', label: 'View', actionKey: 'view' },
          { icon: 'edit', label: 'Edit', actionKey: 'edit' },
          { icon: 'delete', label: 'Delete', actionKey: 'delete', color: 'warn' }
        ]
      }
    ];
  }

  /**
   * Handle view mode change
   */
  onViewModeChange(viewMode: ViewMode): void {
    this.currentViewMode = viewMode;
    this.updateUrlParams();

    // If switching to grouped view, reorganize the data
    if (viewMode !== ViewMode.TABLE) {
      this.organizeBatchesIntoGroups();
    }
  }

  /**
   * Track by function for group iteration
   */
  trackByGroupKey(index: number, group: BatchGroup): string {
    return group.key;
  }

  /**
   * Track by function for batch iteration
   */
  trackByBatchId(index: number, batch: Batch): string {
    return batch._id;
  }

  private loadBatches(): void {
    this.loading = true;

    const pagination: PaginationParams = {
      page: this.currentPage + 1, // API expects 1-based page numbers
      limit: this.pageSize,
      sortBy: this.currentSort.active,
      sortOrder: this.currentSort.direction || 'asc'
    };

    this.batchService.getBatches(this.currentFilters, pagination)
      .pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          console.error('Error loading batches:', error);
          return of({ success: false, data: [], pagination: { currentPage: 1, totalPages: 0, totalItems: 0, pageSize: this.pageSize } } as BatchResponse);
        })
      )
      .subscribe(response => {
        this.loading = false;
        if (response.success) {
          this.dataSource.data = response.data;
          if (response.pagination) {
            this.totalBatches = response.pagination.totalItems;
            this.currentPage = response.pagination.currentPage - 1; // Convert back to 0-based
          }

          // If in grouped view, organize data into groups
          if (this.currentViewMode !== ViewMode.TABLE) {
            this.organizeBatchesIntoGroups();
          }
        } else {
          this.dataSource.data = [];
          this.totalBatches = 0;
          this.groupedBatches = [];
        }
      });
  }

  getStatusLabel(status: BatchStatus): string {
    switch (status) {
      case BatchStatus.ACTIVE:
        return 'Active';
      case BatchStatus.EXPIRED:
        return 'Expired';
      case BatchStatus.DEPLETED:
        return 'Depleted';
      case BatchStatus.QUARANTINED:
        return 'Quarantined';
      default:
        return 'Unknown';
    }
  }

  getExpiryClass(expiryDate: Date): string {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry < 0) {
      return 'expired';
    } else if (daysUntilExpiry <= 7) {
      return 'expiry-warning';
    } else if (daysUntilExpiry <= 30) {
      return 'expiry-soon';
    } else {
      return 'normal';
    }
  }

  /**
   * Load filters from URL query parameters
   */
  private loadFiltersFromUrl(): void {
    const params = this.route.snapshot.queryParams;

    this.currentFilters = {};

    if (params['itemSearch']) {
      this.currentFilters.itemSearch = params['itemSearch'];
    }

    if (params['locationIds']) {
      this.currentFilters.locationIds = params['locationIds'].split(',');
    }

    if (params['supplierIds']) {
      this.currentFilters.supplierIds = params['supplierIds'].split(',');
    }

    if (params['statuses']) {
      this.currentFilters.statuses = params['statuses'].split(',') as BatchStatus[];
    }

    if (params['expiryStart'] || params['expiryEnd']) {
      this.currentFilters.expiryDateRange = {
        start: params['expiryStart'] ? new Date(params['expiryStart']) : undefined,
        end: params['expiryEnd'] ? new Date(params['expiryEnd']) : undefined
      };
    }

    if (params['quantityMin'] || params['quantityMax']) {
      this.currentFilters.quantityRange = {
        min: params['quantityMin'] ? parseInt(params['quantityMin']) : undefined,
        max: params['quantityMax'] ? parseInt(params['quantityMax']) : undefined
      };
    }

    if (params['includeExpired']) {
      this.currentFilters.includeExpired = params['includeExpired'] === 'true';
    }

    if (params['includeDepleted']) {
      this.currentFilters.includeDepleted = params['includeDepleted'] === 'true';
    }

    // Load pagination and sorting from URL
    if (params['page']) {
      this.currentPage = parseInt(params['page']) - 1; // Convert to 0-based
    }

    if (params['pageSize']) {
      this.pageSize = parseInt(params['pageSize']);
    }

    if (params['sortBy']) {
      this.currentSort.active = params['sortBy'];
    }

    if (params['sortOrder']) {
      this.currentSort.direction = params['sortOrder'] as 'asc' | 'desc';
    }
  }

  /**
   * Load view mode from URL query parameters
   */
  private loadViewModeFromUrl(): void {
    const params = this.route.snapshot.queryParams;

    if (params['viewMode'] && Object.values(ViewMode).includes(params['viewMode'])) {
      this.currentViewMode = params['viewMode'] as ViewMode;
    }
  }

  /**
   * Organize batches into groups based on current view mode
   */
  private organizeBatchesIntoGroups(): void {
    const batches = this.dataSource.data;
    const groupMap = new Map<string, BatchGroup>();

    batches.forEach(batch => {
      let groupKey: string;
      let groupName: string;

      if (this.currentViewMode === ViewMode.BY_ITEM) {
        groupKey = batch.itemId;
        groupName = batch.item ? `${batch.item.name} (${batch.item.code})` : 'Unknown Item';
      } else if (this.currentViewMode === ViewMode.BY_LOCATION) {
        groupKey = batch.locationId;
        groupName = batch.location ? batch.location.name : 'Unknown Location';
      } else {
        return; // Should not happen
      }

      if (!groupMap.has(groupKey)) {
        groupMap.set(groupKey, {
          key: groupKey,
          name: groupName,
          batches: [],
          totalQuantity: 0,
          remainingQuantity: 0,
          batchCount: 0,
          expanded: false
        });
      }

      const group = groupMap.get(groupKey)!;
      group.batches.push(batch);
      group.totalQuantity += batch.quantity;
      group.remainingQuantity += batch.remainingQuantity;
      group.batchCount++;
    });

    // Convert map to array and sort groups by name
    this.groupedBatches = Array.from(groupMap.values()).sort((a, b) => a.name.localeCompare(b.name));

    // Sort batches within each group by expiry date (soonest first)
    this.groupedBatches.forEach(group => {
      group.batches.sort((a, b) => {
        const dateA = new Date(a.expiryDate).getTime();
        const dateB = new Date(b.expiryDate).getTime();
        return dateA - dateB;
      });
    });
  }

  /**
   * Update URL parameters with current filter, pagination, and sort state
   */
  private updateUrlParams(): void {
    const queryParams: any = {};

    // Add filter parameters
    if (this.currentFilters.itemSearch) {
      queryParams['itemSearch'] = this.currentFilters.itemSearch;
    }

    if (this.currentFilters.locationIds && this.currentFilters.locationIds.length > 0) {
      queryParams['locationIds'] = this.currentFilters.locationIds.join(',');
    }

    if (this.currentFilters.supplierIds && this.currentFilters.supplierIds.length > 0) {
      queryParams['supplierIds'] = this.currentFilters.supplierIds.join(',');
    }

    if (this.currentFilters.statuses && this.currentFilters.statuses.length > 0) {
      queryParams['statuses'] = this.currentFilters.statuses.join(',');
    }

    if (this.currentFilters.expiryDateRange?.start) {
      queryParams['expiryStart'] = this.currentFilters.expiryDateRange.start.toISOString();
    }

    if (this.currentFilters.expiryDateRange?.end) {
      queryParams['expiryEnd'] = this.currentFilters.expiryDateRange.end.toISOString();
    }

    if (this.currentFilters.quantityRange?.min !== undefined) {
      queryParams['quantityMin'] = this.currentFilters.quantityRange.min.toString();
    }

    if (this.currentFilters.quantityRange?.max !== undefined) {
      queryParams['quantityMax'] = this.currentFilters.quantityRange.max.toString();
    }

    if (this.currentFilters.includeExpired) {
      queryParams['includeExpired'] = 'true';
    }

    if (this.currentFilters.includeDepleted) {
      queryParams['includeDepleted'] = 'true';
    }

    // Add pagination parameters
    if (this.currentPage > 0) {
      queryParams['page'] = (this.currentPage + 1).toString(); // Convert to 1-based
    }

    if (this.pageSize !== 25) { // Only add if different from default
      queryParams['pageSize'] = this.pageSize.toString();
    }

    // Add sorting parameters
    if (this.currentSort.active !== 'expiryDate') { // Only add if different from default
      queryParams['sortBy'] = this.currentSort.active;
    }

    if (this.currentSort.direction !== 'asc') { // Only add if different from default
      queryParams['sortOrder'] = this.currentSort.direction;
    }

    // Add view mode parameter
    if (this.currentViewMode !== ViewMode.TABLE) { // Only add if different from default
      queryParams['viewMode'] = this.currentViewMode;
    }

    // Update URL without triggering navigation
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'replace'
    });
  }

  onDeleteBatch(batch: Batch): void {
     if (confirm('Are you sure you want to delete this batch?')) {
        this.batchService.deleteBatch(batch._id).subscribe({
          next: () => {
            this.loadBatches();
          },
          error: (err) => {
            console.error('Error deleting batch:', err);
          }
        });
     }
  }
}