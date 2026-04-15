import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
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
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatRadioModule } from '@angular/material/radio';
import { Subject, takeUntil, debounceTime, switchMap } from 'rxjs';
import { InventoryService } from '../../services/inventory.service';
import { WarehouseService, Warehouse } from '../../../warehouses/services/warehouse.service';
import { ItemService } from '../../../items/services/item.service';
import { ToastService } from '../../../../shared/services/toast.service';
import { StockAdjustment } from '../../models/inventory.model';

interface Item {
  _id: string;
  code: string;
  name: string;
  packingConfig?: {
    cartonToBoxes: number;
    boxToUnits: number;
    unitName: string;
  };
}

interface CurrentStock {
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
}

@Component({
  selector: 'app-stock-adjustment',
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
    MatRadioModule
  ],
  templateUrl: './stock-adjustment.component.html',
  styleUrls: ['./stock-adjustment.component.scss']
})
export class StockAdjustmentComponent implements OnInit, OnDestroy {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  adjustmentForm!: FormGroup;
  displayedColumns: string[] = [
    'adjustmentDate',
    'adjustmentNumber',
    'itemName',
    'warehouse',
    'adjustmentType',
    'quantity',
    'reason',
    'status',
    'createdBy',
    'actions'
  ];

  dataSource = new MatTableDataSource<StockAdjustment>([]);
  loading = false;
  submitting = false;
  loadingStock = false;
  editMode = false;
  editingAdjustmentId: string | null = null;

  // Dropdowns data
  warehouses: Warehouse[] = [];
  items: Item[] = [];
  filteredItems: Item[] = [];

  // Current stock info
  currentStock: CurrentStock | null = null;

  // Pagination
  totalItems = 0;
  pageSize = 25;
  pageIndex = 0;
  pageSizeOptions = [10, 25, 50, 100];

  // Adjustment type options
  adjustmentTypeOptions = [
    { value: 'increase', label: 'Increase', icon: 'add_circle', color: 'primary' as const },
    { value: 'decrease', label: 'Decrease', icon: 'remove_circle', color: 'warn' as const }
  ];

  // Reason options
  reasonOptions = [
    { value: 'opening_balance', label: 'Opening Balance' },
    { value: 'physical_count', label: 'Physical Count Correction' },
    { value: 'damage', label: 'Damage' },
    { value: 'expiry', label: 'Expiry' },
    { value: 'theft', label: 'Theft' },
    { value: 'other', label: 'Other' }
  ];

  // Status options
  statusOptions = [
    { value: 'pending', label: 'Pending Approval', color: 'warn' },
    { value: 'approved', label: 'Approved', color: 'primary' },
    { value: 'rejected', label: 'Rejected', color: '' }
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private inventoryService: InventoryService,
    private warehouseService: WarehouseService,
    private itemService: ItemService,
    private toastService: ToastService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.loadWarehouses();
    this.loadItems();
    this.loadAdjustments();
    this.setupStockLevelWatch();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm(): void {
    this.adjustmentForm = this.fb.group({
      adjustmentDate: [new Date(), Validators.required],
      itemId: ['', Validators.required],
      warehouseId: ['', Validators.required],
      adjustmentType: ['increase', Validators.required],
      quantity: [0, [Validators.required, Validators.min(1)]],
      reason: ['', Validators.required],
      notes: ['', Validators.required],
      batchNumber: ['']
    });
  }

  private setupStockLevelWatch(): void {
    // Watch for changes in item and warehouse to fetch current stock
    this.adjustmentForm.valueChanges
      .pipe(
        takeUntil(this.destroy$),
        debounceTime(300)
      )
      .subscribe(() => {
        const itemId = this.adjustmentForm.get('itemId')?.value;
        const warehouseId = this.adjustmentForm.get('warehouseId')?.value;
        
        if (itemId && warehouseId) {
          this.loadCurrentStock(itemId, warehouseId);
        } else {
          this.currentStock = null;
        }
      });
  }

  private loadCurrentStock(itemId: string, warehouseId: string): void {
    this.loadingStock = true;
    this.inventoryService.getStockLevels({ 
      itemId, 
      warehouseId,
      limit: 1 
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data && response.data.length > 0) {
            const stock = response.data[0];
            this.currentStock = {
              quantity: stock.quantity,
              reservedQuantity: stock.reservedQuantity,
              availableQuantity: stock.availableQuantity
            };
          } else {
            this.currentStock = {
              quantity: 0,
              reservedQuantity: 0,
              availableQuantity: 0
            };
          }
          this.loadingStock = false;
        },
        error: (error) => {
          console.error('Failed to load current stock:', error);
          this.currentStock = null;
          this.loadingStock = false;
        }
      });
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
        error: (error) => {
          console.error('Failed to load warehouses:', error);
          this.toastService.error('Failed to load warehouses');
        }
      });
  }

  private loadItems(): void {
    this.itemService.getItems({ isActive: true, limit: 1000 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.items = response.data || [];
            this.filteredItems = this.items;
          }
        },
        error: (error) => {
          console.error('Failed to load items:', error);
          this.toastService.error('Failed to load items');
        }
      });
  }

  loadAdjustments(): void {
    this.loading = true;
    const params = {
      page: this.pageIndex + 1,
      limit: this.pageSize
    };

    this.inventoryService.getAdjustments(params)
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
          this.toastService.error('Failed to load adjustments');
          this.loading = false;
        }
      });
  }

  onSubmit(): void {
    if (this.adjustmentForm.invalid) {
      this.markFormGroupTouched(this.adjustmentForm);
      this.toastService.error('Please fill in all required fields');
      return;
    }

    // Validate quantity for decrease adjustments
    const adjustmentType = this.adjustmentForm.get('adjustmentType')?.value;
    const quantity = this.adjustmentForm.get('quantity')?.value;
    
    if (adjustmentType === 'decrease' && this.currentStock) {
      if (quantity > this.currentStock.availableQuantity) {
        this.toastService.error(`Cannot decrease by ${quantity}. Available quantity is ${this.currentStock.availableQuantity}`);
        return;
      }
    }

    this.submitting = true;
    const formValue = this.adjustmentForm.getRawValue();
    
    const adjustmentData = {
      adjustmentDate: formValue.adjustmentDate,
      itemId: formValue.itemId,
      warehouseId: formValue.warehouseId,
      adjustmentType: formValue.adjustmentType,
      quantity: formValue.quantity,
      reason: formValue.reason,
      notes: formValue.notes,
      batchNumber: formValue.batchNumber || undefined
    };

    this.inventoryService.createAdjustment(adjustmentData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.toastService.success('Stock adjustment created successfully');
            this.resetForm();
            this.loadAdjustments();
          }
          this.submitting = false;
        },
        error: (error) => {
          const errorMessage = error.error?.message || 'Failed to create stock adjustment';
          this.toastService.error(errorMessage);
          this.submitting = false;
        }
      });
  }

  resetForm(): void {
    this.adjustmentForm.reset({
      adjustmentDate: new Date(),
      adjustmentType: 'increase',
      quantity: 0
    });
    this.editMode = false;
    this.editingAdjustmentId = null;
    this.currentStock = null;
  }

  viewAdjustment(adjustment: StockAdjustment): void {
    // Scroll to form and populate with adjustment data (read-only view)
    this.adjustmentForm.patchValue({
      adjustmentDate: new Date(adjustment.adjustmentDate),
      itemId: adjustment.itemId,
      warehouseId: adjustment.warehouseId,
      adjustmentType: adjustment.adjustmentType,
      quantity: adjustment.quantity,
      reason: adjustment.reason,
      notes: adjustment.notes,
      batchNumber: adjustment.batchNumber
    });
    
    this.adjustmentForm.disable();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  approveAdjustment(adjustment: StockAdjustment): void {
    if (adjustment.status !== 'pending') {
      this.toastService.error('Only pending adjustments can be approved');
      return;
    }

    if (confirm(`Approve adjustment ${adjustment.adjustmentNumber}?\n\nThis will ${adjustment.adjustmentType} stock by ${adjustment.quantity} units.`)) {
      this.inventoryService.approveAdjustment(adjustment._id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.toastService.success('Adjustment approved successfully');
              this.loadAdjustments();
            }
          },
          error: (error) => {
            const errorMessage = error.error?.message || 'Failed to approve adjustment';
            this.toastService.error(errorMessage);
          }
        });
    }
  }

  rejectAdjustment(adjustment: StockAdjustment): void {
    if (adjustment.status !== 'pending') {
      this.toastService.error('Only pending adjustments can be rejected');
      return;
    }

    const reason = prompt('Enter rejection reason:');
    if (reason) {
      this.inventoryService.rejectAdjustment(adjustment._id, reason)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.toastService.success('Adjustment rejected');
              this.loadAdjustments();
            }
          },
          error: (error) => {
            const errorMessage = error.error?.message || 'Failed to reject adjustment';
            this.toastService.error(errorMessage);
          }
        });
    }
  }

  printAdjustment(adjustment: StockAdjustment): void {
    this.toastService.info('Print functionality will be implemented');
  }

  onPageChange(event: any): void {
    this.pageSize = event.pageSize;
    this.pageIndex = event.pageIndex;
    this.loadAdjustments();
  }

  getStatusClass(status: string): string {
    const statusMap: { [key: string]: string } = {
      'pending': 'status-pending',
      'approved': 'status-approved',
      'rejected': 'status-rejected'
    };
    return statusMap[status] || '';
  }

  getStatusLabel(status: string): string {
    const option = this.statusOptions.find(opt => opt.value === status);
    return option?.label || status;
  }

  getAdjustmentTypeClass(type: string): string {
    return type === 'increase' ? 'adjustment-increase' : 'adjustment-decrease';
  }

  getAdjustmentTypeLabel(type: string): string {
    const option = this.adjustmentTypeOptions.find(opt => opt.value === type);
    return option?.label || type;
  }

  getAdjustmentTypeIcon(type: string): string {
    const option = this.adjustmentTypeOptions.find(opt => opt.value === type);
    return option?.icon || 'edit';
  }

  getReasonLabel(reason: string): string {
    const option = this.reasonOptions.find(opt => opt.value === reason);
    return option?.label || reason;
  }

  getWarehouseName(warehouseId: string): string {
    const warehouse = this.warehouses.find(w => w._id === warehouseId);
    return warehouse?.name || warehouseId;
  }

  getItemName(itemId: string): string {
    const item = this.items.find(i => i._id === itemId);
    return item?.name || itemId;
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

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();

      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  get formTitle(): string {
    return 'Create Stock Adjustment';
  }

  get submitButtonText(): string {
    return 'Submit for Approval';
  }

  get showCurrentStock(): boolean {
    return this.currentStock !== null && !this.loadingStock;
  }

  get newStockLevel(): number | null {
    if (!this.currentStock) return null;
    
    const adjustmentType = this.adjustmentForm.get('adjustmentType')?.value;
    const quantity = this.adjustmentForm.get('quantity')?.value || 0;
    
    if (adjustmentType === 'increase') {
      return this.currentStock.quantity + quantity;
    } else {
      return this.currentStock.quantity - quantity;
    }
  }
}
