import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
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
  selector: 'app-create-purchase-order',
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
  templateUrl: './create-purchase-order.component.html',
  styleUrls: ['./create-purchase-order.component.scss']
})
export class CreatePurchaseOrderComponent implements OnInit {
  poForm: FormGroup;
  suppliers: any[] = [];
  items: any[] = [];
  loading = false;
  submitting = false;

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
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    this.poForm = this.fb.group({
      poDate: [new Date().toISOString().split('T')[0], Validators.required],
      supplierId: ['', Validators.required],
      billNo: [''],
      notes: [''],
      items: this.fb.array([])
    });
  }

  ngOnInit(): void {
    this.loadSuppliers();
    this.loadItems();
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

  onSubmit(saveType: 'draft' | 'send'): void {
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
      status: saveType === 'draft' ? 'draft' : 'sent',
      items: this.itemsArray.value.map((item: any, index: number) => ({
        ...item,
        netAmount: this.calculateLineTotal(index)
      })),
      totalAmount: this.calculateGrandTotal()
    };

    this.submitting = true;
    this.poService.createPurchaseOrder(poData).subscribe({
      next: (response) => {
        this.snackBar.open(
          `Purchase order ${saveType === 'draft' ? 'saved as draft' : 'sent'} successfully`,
          'Close',
          { duration: 3000 }
        );
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

  onCancel(): void {
    this.router.navigate(['/purchase-orders']);
  }
}
