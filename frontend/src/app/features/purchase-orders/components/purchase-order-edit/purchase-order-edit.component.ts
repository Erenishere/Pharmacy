import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PurchaseOrderService } from '../../services/purchase-order.service';
import { Observable } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSnackBarModule } from '@angular/material/snack-bar';

@Component({
  selector: 'app-purchase-order-edit',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatOptionModule,
    MatIconModule,
    MatButtonModule,
    MatTableModule,
    MatProgressSpinnerModule,
    MatCardModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSnackBarModule
  ],
  templateUrl: './purchase-order-edit.component.html',
  styleUrls: ['./purchase-order-edit.component.scss']
})
export class PurchaseOrderEditComponent implements OnInit {
  poForm: FormGroup;
  suppliers: any[] = [];
  items: any[] = [];
  loading = false;
  submitting = false;
  isEditMode = false;
  purchaseOrderId: string | null = null;

  displayedColumns: string[] = [
    'sno',
    'itemName',
    'boxPacking',
    'boxQty',
    'unitQty',
    'boxTP',
    'unitTP',
    'discount',
    'netAmount',
    'actions'
  ];

  constructor(
    private fb: FormBuilder,
    private poService: PurchaseOrderService,
    private route: ActivatedRoute,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    this.poForm = this.fb.group({
      poDate: ['', Validators.required],
      supplierId: ['', Validators.required],
      billNo: [''],
      notes: [''],
      items: this.fb.array([])
    });
  }

  ngOnInit(): void {
    this.purchaseOrderId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!this.purchaseOrderId;

    this.loadSuppliers();
    this.loadItems();

    if (this.isEditMode && this.purchaseOrderId) {
      this.loadPurchaseOrder(this.purchaseOrderId);
    }
  }

  get itemsArray(): FormArray {
    return this.poForm.get('items') as FormArray;
  }

  loadSuppliers(): void {
    this.poService.getSuppliers().subscribe({
      next: (response) => {
        this.suppliers = response.data;
      },
      error: (error) => {
        console.error('Error loading suppliers:', error);
        this.snackBar.open('Failed to load suppliers', 'Close', { duration: 3000 });
      }
    });
  }

  loadItems(): void {
    this.poService.getItems().subscribe({
      next: (response) => {
        this.items = response.data;
      },
      error: (error) => {
        console.error('Error loading items:', error);
        this.snackBar.open('Failed to load items', 'Close', { duration: 3000 });
      }
    });
  }

  loadPurchaseOrder(id: string): void {
    this.loading = true;
    this.poService.getPurchaseOrderById(id).subscribe({
      next: (response) => {
        const po = response.data;
        this.populateForm(po);
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading purchase order:', error);
        this.snackBar.open('Failed to load purchase order', 'Close', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  populateForm(po: any): void {
    // Set basic fields
    this.poForm.patchValue({
      poDate: po.poDate ? new Date(po.poDate).toISOString().split('T')[0] : '',
      supplierId: po.supplierId || po.supplier?._id || '',
      billNo: po.billNo || '',
      notes: po.notes || ''
    });

    // Clear existing items
    while (this.itemsArray.length > 0) {
      this.itemsArray.removeAt(0);
    }

    // Add existing items
    if (po.items && po.items.length > 0) {
      po.items.forEach((item: any) => {
        const itemGroup = this.fb.group({
          itemId: [item.itemId || item.item?._id || '', Validators.required],
          itemName: [item.itemName || item.item?.name || ''],
          boxPacking: [item.boxPacking || 1],
          boxQty: [item.boxQty || 0, [Validators.min(0)]],
          unitQty: [item.unitQty || 0, [Validators.min(0)]],
          boxTP: [item.boxTP || 0, [Validators.min(0)]],
          unitTP: [item.unitTP || 0, [Validators.min(0)]],
          discount: [item.discount || 0, [Validators.min(0), Validators.max(100)]]
        });

        this.itemsArray.push(itemGroup);
      });
    }
  }

  addItem(): void {
    const itemGroup = this.fb.group({
      itemId: ['', Validators.required],
      itemName: [''],
      boxPacking: [1],
      boxQty: [0, [Validators.min(0)]],
      unitQty: [0, [Validators.min(0)]],
      boxTP: [0, [Validators.min(0)]],
      unitTP: [0, [Validators.min(0)]],
      discount: [0, [Validators.min(0), Validators.max(100)]]
    });

    // Subscribe to item selection to auto-populate fields
    itemGroup.get('itemId')?.valueChanges.subscribe(itemId => {
      const selectedItem = this.items.find(i => i._id === itemId);
      if (selectedItem) {
        const packSize = selectedItem.packSize || 1;
        const costPrice = selectedItem.pricing?.costPrice || 0;
        itemGroup.patchValue({
          itemName: selectedItem.name || selectedItem.itemName,
          boxPacking: packSize,
          boxTP: costPrice,
          unitTP: packSize > 1 ? Math.round((costPrice / packSize) * 100) / 100 : costPrice
        });
      }
    });

    this.itemsArray.push(itemGroup);
  }

  removeItem(index: number): void {
    this.itemsArray.removeAt(index);
  }

  getItemControl(index: number, field: string): any {
    return this.itemsArray.at(index).get(field);
  }

  calculateLineTotal(index: number): number {
    const item = this.itemsArray.at(index);
    const boxQty = item.get('boxQty')?.value || 0;
    const unitQty = item.get('unitQty')?.value || 0;
    const boxTP = item.get('boxTP')?.value || 0;
    const unitTP = item.get('unitTP')?.value || 0;
    const discount = item.get('discount')?.value || 0;

    const boxAmount = boxQty * boxTP;
    const unitAmount = unitQty * unitTP;
    const grossAmount = boxAmount + unitAmount;
    const discountAmount = grossAmount * (discount / 100);

    return grossAmount - discountAmount;
  }

  calculateGrandTotal(): number {
    let total = 0;
    for (let i = 0; i < this.itemsArray.length; i++) {
      total += this.calculateLineTotal(i);
    }
    return total;
  }

  onSubmit(): void {
    if (this.poForm.invalid) {
      this.snackBar.open('Please fill all required fields', 'Close', { duration: 3000 });
      return;
    }

    if (this.itemsArray.length === 0) {
      this.snackBar.open('Please add at least one item', 'Close', { duration: 3000 });
      return;
    }

    const poData = {
      ...this.poForm.value,
      items: this.itemsArray.value.map((item: any, index: number) => ({
        ...item,
        netAmount: this.calculateLineTotal(index)
      })),
      totalAmount: this.calculateGrandTotal()
    };

    this.submitting = true;

    if (this.isEditMode && this.purchaseOrderId) {
      this.poService.updatePurchaseOrder(this.purchaseOrderId, poData).subscribe({
        next: (response) => {
          this.snackBar.open('Purchase order updated successfully', 'Close', { duration: 3000 });
          this.router.navigate(['/purchase-orders', this.purchaseOrderId]);
        },
        error: (error) => {
          console.error('Error updating purchase order:', error);
          this.snackBar.open(
            error.error?.message || 'Failed to update purchase order',
            'Close',
            { duration: 5000 }
          );
          this.submitting = false;
        }
      });
    } else {
      this.poService.createPurchaseOrder(poData).subscribe({
        next: (response) => {
          this.snackBar.open('Purchase order created successfully', 'Close', { duration: 3000 });
          this.router.navigate(['/purchase-orders']);
        },
        error: (error) => {
          console.error('Error creating purchase order:', error);
          this.snackBar.open(
            error.error?.message || 'Failed to create purchase order',
            'Close',
            { duration: 5000 }
          );
          this.submitting = false;
        }
      });
    }
  }

  onCancel(): void {
    if (this.isEditMode && this.purchaseOrderId) {
      this.router.navigate(['/purchase-orders', this.purchaseOrderId]);
    } else {
      this.router.navigate(['/purchase-orders']);
    }
  }
}
