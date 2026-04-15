import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
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
import { Subject, takeUntil } from 'rxjs';
import { InventoryService } from '../../services/inventory.service';
import { WarehouseService, Warehouse } from '../../../warehouses/services/warehouse.service';
import { ItemService } from '../../../items/services/item.service';
import { ToastService } from '../../../../shared/services/toast.service';
import { StockTransfer } from '../../models/inventory.model';

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

@Component({
  selector: 'app-stock-transfer',
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
    MatDialogModule
  ],
  templateUrl: './stock-transfer.component.html',
  styleUrls: ['./stock-transfer.component.scss']
})
export class StockTransferComponent implements OnInit, OnDestroy {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  transferForm!: FormGroup;
  displayedColumns: string[] = [
    'sno',
    'transferDate',
    'formulaSize',
    'itemName',
    'fromWarehouse',
    'toWarehouse',
    'quantity',
    'userId',
    'actions'
  ];

  dataSource = new MatTableDataSource<StockTransfer>([]);
  loading = false;
  submitting = false;
  editMode = false;
  editingTransferId: string | null = null;

  // Dropdowns data
  warehouses: Warehouse[] = [];
  items: Item[] = [];
  filteredItems: Item[] = [];

  // Pagination
  totalItems = 0;
  pageSize = 25;
  pageIndex = 0;
  pageSizeOptions = [10, 25, 50, 100];

  // Status options
  statusOptions = [
    { value: 'pending', label: 'Pending', color: 'warn' },
    { value: 'in_transit', label: 'In Transit', color: 'accent' },
    { value: 'completed', label: 'Completed', color: 'primary' },
    { value: 'cancelled', label: 'Cancelled', color: '' }
  ];

  approvalOptions = [
    { value: 'pending_approval', label: 'Pending Approval', color: 'warn' },
    { value: 'approved', label: 'Approved', color: 'primary' },
    { value: 'rejected', label: 'Rejected', color: 'error' }
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
    this.loadTransfers();
    this.setupQuantityCalculation();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm(): void {
    this.transferForm = this.fb.group({
      transferDate: [new Date(), Validators.required],
      itemId: ['', Validators.required],
      fromWarehouseId: ['', Validators.required],
      toWarehouseId: ['', Validators.required],
      qtyCtn: [0, [Validators.min(0)]],
      qtyBox: [0, [Validators.min(0)]],
      qtyUnit: [0, [Validators.min(0)]],
      totalUnitQty: [{ value: 0, disabled: true }],
      batchNumber: [''],
      status: ['pending', Validators.required]
    });

    // Add custom validator to ensure source != destination
    this.transferForm.setValidators(this.warehouseValidator);
  }

  private warehouseValidator(control: AbstractControl): ValidationErrors | null {
    const form = control as FormGroup;
    const fromWarehouse = form.get('fromWarehouseId')?.value;
    const toWarehouse = form.get('toWarehouseId')?.value;
    
    if (fromWarehouse && toWarehouse && fromWarehouse === toWarehouse) {
      return { sameWarehouse: true };
    }
    return null;
  }

  private setupQuantityCalculation(): void {
    // Auto-calculate total unit quantity when carton, box, or unit changes
    this.transferForm.get('qtyCtn')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.calculateTotalUnitQty());

    this.transferForm.get('qtyBox')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.calculateTotalUnitQty());

    this.transferForm.get('qtyUnit')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.calculateTotalUnitQty());

    this.transferForm.get('itemId')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.calculateTotalUnitQty());
  }

  private calculateTotalUnitQty(): void {
    const itemId = this.transferForm.get('itemId')?.value;
    const qtyCtn = this.transferForm.get('qtyCtn')?.value || 0;
    const qtyBox = this.transferForm.get('qtyBox')?.value || 0;
    const qtyUnit = this.transferForm.get('qtyUnit')?.value || 0;

    const selectedItem = this.items.find(item => item._id === itemId);
    
    if (selectedItem?.packingConfig) {
      const { cartonToBoxes, boxToUnits } = selectedItem.packingConfig;
      const totalUnits = (qtyCtn * cartonToBoxes * boxToUnits) + (qtyBox * boxToUnits) + qtyUnit;
      this.transferForm.get('totalUnitQty')?.setValue(totalUnits, { emitEvent: false });
    } else {
      // If no packing config, assume 1:1 ratio
      const totalUnits = qtyCtn + qtyBox + qtyUnit;
      this.transferForm.get('totalUnitQty')?.setValue(totalUnits, { emitEvent: false });
    }
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

  loadTransfers(): void {
    this.loading = true;
    const params = {
      page: this.pageIndex + 1,
      limit: this.pageSize
    };

    this.inventoryService.getTransfers(params)
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
          this.toastService.error('Failed to load transfers');
          this.loading = false;
        }
      });
  }

  onSubmit(): void {
    if (this.transferForm.invalid) {
      this.markFormGroupTouched(this.transferForm);
      
      if (this.transferForm.errors?.['sameWarehouse']) {
        this.toastService.error('Source and destination warehouses must be different');
      } else {
        this.toastService.error('Please fill in all required fields');
      }
      return;
    }

    const totalQty = this.transferForm.get('totalUnitQty')?.value;
    if (totalQty <= 0) {
      this.toastService.error('Please enter a valid quantity');
      return;
    }

    this.submitting = true;
    const formValue = this.transferForm.getRawValue();
    
    const transferData = {
      transferDate: formValue.transferDate,
      itemId: formValue.itemId,
      fromWarehouseId: formValue.fromWarehouseId,
      toWarehouseId: formValue.toWarehouseId,
      quantities: {
        qtyCtn: formValue.qtyCtn,
        qtyBox: formValue.qtyBox,
        qtyUnit: formValue.qtyUnit,
        totalUnitQty: formValue.totalUnitQty
      },
      batchNumber: formValue.batchNumber || undefined,
      status: formValue.status
    };

    this.inventoryService.createTransfer(transferData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.toastService.success('Stock transfer created successfully');
            this.resetForm();
            this.loadTransfers();
          }
          this.submitting = false;
        },
        error: (error) => {
          const errorMessage = error.error?.message || 'Failed to create stock transfer';
          this.toastService.error(errorMessage);
          this.submitting = false;
        }
      });
  }

  resetForm(): void {
    this.transferForm.reset({
      transferDate: new Date(),
      qtyCtn: 0,
      qtyBox: 0,
      qtyUnit: 0,
      totalUnitQty: 0,
      status: 'pending'
    });
    this.editMode = false;
    this.editingTransferId = null;
  }

  editTransfer(transfer: StockTransfer): void {
    this.editMode = true;
    this.editingTransferId = transfer._id;
    
    this.transferForm.patchValue({
      transferDate: new Date(transfer.transferDate),
      itemId: transfer.itemId,
      fromWarehouseId: transfer.fromWarehouseId,
      toWarehouseId: transfer.toWarehouseId,
      qtyCtn: transfer.quantities.qtyCtn,
      qtyBox: transfer.quantities.qtyBox,
      qtyUnit: transfer.quantities.qtyUnit,
      batchNumber: transfer.batchNumber,
      status: transfer.status
    });

    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  deleteTransfer(transfer: StockTransfer): void {
    if (confirm(`Are you sure you want to delete transfer ${transfer.transferNumber}?`)) {
      // TODO: Implement delete API call
      this.toastService.info('Delete functionality will be implemented');
    }
  }

  receiveTransfer(transfer: StockTransfer): void {
    if (transfer.status !== 'in_transit') {
      this.toastService.error('Only in-transit transfers can be received');
      return;
    }

    if (confirm(`Mark transfer ${transfer.transferNumber} as received?`)) {
      this.inventoryService.updateTransferStatus(transfer._id, 'completed')
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.toastService.success('Transfer received successfully');
              this.loadTransfers();
            }
          },
          error: (error) => {
            this.toastService.error('Failed to receive transfer');
          }
        });
    }
  }

  printTransfer(transfer: StockTransfer): void {
    this.toastService.info('Print functionality will be implemented');
  }

  approveTransfer(transfer: any): void {
    if (confirm('Approve this stock movement?')) {
      // Mock implementation since service might not have it yet
      transfer.approvalStatus = 'approved';
      this.toastService.success('Transfer approved successfully');
    }
  }

  rejectTransfer(transfer: any): void {
    const reason = prompt('Reason for rejection:');
    if (reason) {
      transfer.approvalStatus = 'rejected';
      this.toastService.info('Transfer rejected');
    }
  }

  onPageChange(event: any): void {
    this.pageSize = event.pageSize;
    this.pageIndex = event.pageIndex;
    this.loadTransfers();
  }

  getStatusClass(status: string): string {
    const statusMap: { [key: string]: string } = {
      'pending': 'status-pending',
      'in_transit': 'status-in-transit',
      'completed': 'status-completed',
      'cancelled': 'status-cancelled'
    };
    return statusMap[status] || '';
  }

  getStatusLabel(status: string): string {
    const option = this.statusOptions.find(opt => opt.value === status);
    return option?.label || status;
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
    return this.editMode ? 'Edit Stock Transfer' : 'Create Stock Transfer';
  }

  get submitButtonText(): string {
    return this.editMode ? 'Update Transfer' : 'Save Transfer';
  }
}
