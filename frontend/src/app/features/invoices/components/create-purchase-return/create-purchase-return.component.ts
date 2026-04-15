import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { InvoiceService } from '../../services/invoice.service';
import { Invoice, InvoiceItem } from '../../models/invoice.model';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-create-purchase-return',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatOptionModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatProgressSpinnerModule,
    MatTooltipModule
  ],
  templateUrl: './create-purchase-return.component.html',
  styleUrls: ['./create-purchase-return.component.scss']
})
export class CreatePurchaseReturnComponent implements OnInit {
  returnForm: FormGroup;
  originalInvoices: Invoice[] = [];
  selectedInvoice: Invoice | null = null;
  loading = false;
  submitting = false;

  displayedColumns: string[] = [
    'itemName',
    'originalQty',
    'returnQty',
    'unitPrice',
    'gstRate',
    'lineTotal'
  ];

  constructor(
    private fb: FormBuilder,
    private invoiceService: InvoiceService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    this.returnForm = this.fb.group({
      originalInvoiceId: ['', Validators.required],
      returnDate: [new Date().toISOString().split('T')[0], Validators.required],
      reason: ['', Validators.required],
      notes: [''],
      items: this.fb.array([])
    });
  }

  ngOnInit(): void {
    this.loadPurchaseInvoices();
  }

  get itemsArray(): FormArray {
    return this.returnForm.get('items') as FormArray;
  }

  loadPurchaseInvoices(): void {
    this.loading = true;
    this.invoiceService.getInvoices({
      type: 'purchase',
      status: 'confirmed'
    }).subscribe({
      next: (response) => {
        this.originalInvoices = response.data;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading invoices:', error);
        this.snackBar.open('Failed to load purchase invoices', 'Close', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  onInvoiceSelected(): void {
    const invoiceId = this.returnForm.get('originalInvoiceId')?.value;
    if (!invoiceId) {
      this.selectedInvoice = null;
      this.itemsArray.clear();
      return;
    }

    this.loading = true;
    this.invoiceService.getInvoiceById(invoiceId).subscribe({
      next: (response) => {
        this.selectedInvoice = response.data;
        this.populateItems();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading invoice details:', error);
        this.snackBar.open('Failed to load invoice details', 'Close', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  populateItems(): void {
    this.itemsArray.clear();

    if (!this.selectedInvoice) return;

    this.selectedInvoice.items.forEach(item => {
      this.itemsArray.push(this.fb.group({
        itemId: [item.itemId],
        itemName: [item.itemName],
        originalQuantity: [item.quantity],
        returnQuantity: [0, [Validators.required, Validators.min(0)]],
        unitPrice: [item.unitPrice],
        gstRate: [item.gstRate || 18],
        discount: [item.discount || 0],
        batchNumber: [item.batchInfo?.batchNumber || ''],
        warehouseId: [item.warehouseId]
      }));
    });
  }

  getItemControl(index: number, field: string): any {
    return this.itemsArray.at(index).get(field);
  }

  calculateLineTotal(index: number): number {
    const item = this.itemsArray.at(index);
    const returnQty = item.get('returnQuantity')?.value || 0;
    const unitPrice = item.get('unitPrice')?.value || 0;
    const discount = item.get('discount')?.value || 0;
    const gstRate = item.get('gstRate')?.value || 0;

    const subtotal = returnQty * unitPrice;
    const discountAmount = subtotal * (discount / 100);
    const afterDiscount = subtotal - discountAmount;
    const gstAmount = afterDiscount * (gstRate / 100);

    return afterDiscount + gstAmount;
  }

  calculateReturnTotal(): number {
    let total = 0;
    for (let i = 0; i < this.itemsArray.length; i++) {
      total += this.calculateLineTotal(i);
    }
    return total;
  }

  calculateGSTBreakdown(): { gst18: number; gst4: number } {
    let gst18 = 0;
    let gst4 = 0;

    for (let i = 0; i < this.itemsArray.length; i++) {
      const item = this.itemsArray.at(i);
      const returnQty = item.get('returnQuantity')?.value || 0;
      const unitPrice = item.get('unitPrice')?.value || 0;
      const discount = item.get('discount')?.value || 0;
      const gstRate = item.get('gstRate')?.value || 0;

      const subtotal = returnQty * unitPrice;
      const discountAmount = subtotal * (discount / 100);
      const afterDiscount = subtotal - discountAmount;
      const gstAmount = afterDiscount * (gstRate / 100);

      if (gstRate === 18) {
        gst18 += gstAmount;
      } else if (gstRate === 4) {
        gst4 += gstAmount;
      }
    }

    return { gst18, gst4 };
  }

  validateReturnQuantities(): boolean {
    for (let i = 0; i < this.itemsArray.length; i++) {
      const item = this.itemsArray.at(i);
      const returnQty = item.get('returnQuantity')?.value || 0;
      const originalQty = item.get('originalQuantity')?.value || 0;

      if (returnQty > originalQty) {
        this.snackBar.open(
          `Return quantity cannot exceed original quantity for ${item.get('itemName')?.value}`,
          'Close',
          { duration: 5000 }
        );
        return false;
      }
    }
    return true;
  }

  onSubmit(): void {
    if (this.returnForm.invalid) {
      this.snackBar.open('Please fill all required fields', 'Close', { duration: 3000 });
      return;
    }

    if (!this.validateReturnQuantities()) {
      return;
    }

    // Filter items with return quantity > 0
    const itemsWithReturns = this.itemsArray.value.filter(
      (item: any) => item.returnQuantity > 0
    );

    if (itemsWithReturns.length === 0) {
      this.snackBar.open('Please enter return quantities for at least one item', 'Close', { duration: 3000 });
      return;
    }

    const returnData = {
      originalInvoiceId: this.returnForm.get('originalInvoiceId')?.value,
      returnDate: this.returnForm.get('returnDate')?.value,
      reason: this.returnForm.get('reason')?.value,
      notes: this.returnForm.get('notes')?.value,
      items: itemsWithReturns.map((item: any) => ({
        itemId: item.itemId,
        returnQuantity: item.returnQuantity,
        unitPrice: item.unitPrice,
        gstRate: item.gstRate,
        discount: item.discount,
        batchNumber: item.batchNumber,
        warehouseId: item.warehouseId
      }))
    };

    this.submitting = true;
    this.invoiceService.createPurchaseReturn(returnData).subscribe({
      next: (response) => {
        this.snackBar.open('Purchase return created successfully', 'Close', { duration: 3000 });
        this.router.navigate(['/purchase-invoices']);
      },
      error: (error) => {
        console.error('Error creating return:', error);
        this.snackBar.open(
          error.error?.message || 'Failed to create purchase return',
          'Close',
          { duration: 5000 }
        );
        this.submitting = false;
      }
    });
  }

  onCancel(): void {
    this.router.navigate(['/purchase-invoices']);
  }
}
