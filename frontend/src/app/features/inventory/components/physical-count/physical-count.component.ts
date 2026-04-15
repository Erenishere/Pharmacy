import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCardModule } from '@angular/material/card';
import { MatMenuModule } from '@angular/material/menu';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule } from '@angular/material/dialog';
import { MatTabsModule } from '@angular/material/tabs';
import { MatExpansionModule } from '@angular/material/expansion';
import { Subject, takeUntil } from 'rxjs';
import { InventoryService } from '../../services/inventory.service';
import { WarehouseService, Warehouse } from '../../../warehouses/services/warehouse.service';
import { ItemService } from '../../../items/services/item.service';
import { ToastService } from '../../../../shared/services/toast.service';

interface CountItem {
  itemId: string;
  itemName: string;
  itemCode: string;
  systemQuantity: number;
  countedQuantity: number | null;
  variance: number;
  variancePercentage: number;
}

@Component({
  selector: 'app-physical-count',
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
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatCardModule,
    MatMenuModule,
    MatChipsModule,
    MatDialogModule,
    MatTabsModule,
    MatExpansionModule
  ],
  templateUrl: './physical-count.component.html',
  styleUrls: ['./physical-count.component.scss']
})
export class PhysicalCountComponent implements OnInit, OnDestroy {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  countForm!: FormGroup;
  displayedColumns: string[] = [
    'countDate',
    'countNumber',
    'warehouse',
    'itemCount',
    'status',
    'createdBy',
    'actions'
  ];

  dataSource = new MatTableDataSource<any>([]);
  loading = false;
  submitting = false;
  showForm = false;

  warehouses: Warehouse[] = [];
  items: any[] = [];

  totalItems = 0;
  pageSize = 25;
  pageIndex = 0;
  pageSizeOptions = [10, 25, 50, 100];

  statusOptions = [
    { value: 'draft', label: 'Draft', color: 'status-draft' },
    { value: 'in_progress', label: 'In Progress', color: 'status-in-progress' },
    { value: 'completed', label: 'Completed', color: 'status-completed' },
    { value: 'approved', label: 'Approved', color: 'status-approved' },
    { value: 'cancelled', label: 'Cancelled', color: 'status-cancelled' }
  ];

  selectedCount: any = null;

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private inventoryService: InventoryService,
    private warehouseService: WarehouseService,
    private itemService: ItemService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.loadWarehouses();
    this.loadItems();
    this.loadCounts();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm(): void {
    this.countForm = this.fb.group({
      warehouseId: ['', Validators.required],
      countDate: [new Date(), Validators.required],
      notes: [''],
      items: this.fb.array([])
    });
  }

  get countItems(): FormArray {
    return this.countForm.get('items') as FormArray;
  }

  addCountItem(): void {
    this.countItems.push(this.fb.group({
      itemId: ['', Validators.required],
      countedQuantity: [0, [Validators.required, Validators.min(0)]]
    }));
  }

  removeCountItem(index: number): void {
    this.countItems.removeAt(index);
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

  private loadItems(): void {
    this.itemService.getItems({ isActive: true, limit: 1000 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.items = response.data || [];
          }
        },
        error: () => this.toastService.error('Failed to load items')
      });
  }

  loadCounts(): void {
    this.loading = true;
    const params = {
      page: this.pageIndex + 1,
      limit: this.pageSize
    };

    this.inventoryService.getPhysicalCounts(params)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          if (response.success) {
            this.dataSource.data = response.data || [];
            this.totalItems = response.pagination?.totalItems || response.data?.length || 0;
          }
          this.loading = false;
        },
        error: () => {
          this.toastService.error('Failed to load physical counts');
          this.loading = false;
        }
      });
  }

  toggleForm(): void {
    this.showForm = !this.showForm;
    if (this.showForm && this.countItems.length === 0) {
      this.addCountItem();
    }
  }

  onSubmit(): void {
    if (this.countForm.invalid) {
      this.toastService.error('Please fill in all required fields');
      return;
    }

    if (this.countItems.length === 0) {
      this.toastService.error('Please add at least one item to count');
      return;
    }

    this.submitting = true;
    const formValue = this.countForm.getRawValue();

    const countData = {
      warehouseId: formValue.warehouseId,
      countDate: formValue.countDate,
      notes: formValue.notes,
      items: formValue.items
    };

    this.inventoryService.createPhysicalCount(countData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.toastService.success('Physical count created successfully');
            this.resetForm();
            this.loadCounts();
          }
          this.submitting = false;
        },
        error: (error) => {
          this.toastService.error(error.error?.message || error.error?.error || 'Failed to create physical count');
          this.submitting = false;
        }
      });
  }

  resetForm(): void {
    this.countForm.reset({ countDate: new Date() });
    this.countItems.clear();
    this.showForm = false;
    this.selectedCount = null;
  }

  viewCount(count: any): void {
    this.selectedCount = count;
  }

  closeDetail(): void {
    this.selectedCount = null;
  }

  approveCount(count: any): void {
    if (confirm(`Approve physical count session? This will adjust stock levels based on counted quantities.`)) {
      this.inventoryService.approvePhysicalCount(count._id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.toastService.success('Physical count approved and stock levels adjusted');
              this.loadCounts();
              this.selectedCount = null;
            }
          },
          error: (error) => this.toastService.error(error.error?.message || error.error?.error || 'Failed to approve count')
        });
    }
  }

  cancelCount(count: any): void {
    const reason = prompt('Enter cancellation reason:');
    if (reason) {
      this.inventoryService.cancelPhysicalCount(count._id, reason)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.toastService.success('Physical count cancelled');
              this.loadCounts();
              this.selectedCount = null;
            }
          },
          error: (error) => this.toastService.error(error.error?.message || error.error?.error || 'Failed to cancel count')
        });
    }
  }

  onPageChange(event: any): void {
    this.pageSize = event.pageSize;
    this.pageIndex = event.pageIndex;
    this.loadCounts();
  }

  getStatusClass(status: string): string {
    const option = this.statusOptions.find(s => s.value === status);
    return option?.color || '';
  }

  getStatusLabel(status: string): string {
    const option = this.statusOptions.find(s => s.value === status);
    return option?.label || status;
  }

  getWarehouseName(warehouseId: string): string {
    const warehouse = this.warehouses.find(w => w._id === warehouseId);
    return warehouse?.name || warehouseId;
  }

  getItemName(itemId: string): string {
    const item = this.items.find(i => i._id === itemId);
    return item ? `${item.code} - ${item.name}` : itemId;
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  formatNumber(num: number): string {
    return new Intl.NumberFormat('en-PK').format(num);
  }
}
