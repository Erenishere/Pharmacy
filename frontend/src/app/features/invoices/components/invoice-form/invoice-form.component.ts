import { Component, OnInit, OnDestroy, Inject, Optional } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { Subject, debounceTime, distinctUntilChanged, takeUntil, switchMap, of } from 'rxjs';
import { InvoiceService } from '../../services/invoice.service';
import { CustomerService } from '../../../customers/services/customer.service';
import { SupplierService } from '../../../suppliers/services/supplier.service';
import { ItemService } from '../../../items/services/item.service';
import { SupportingMasterService, Warehouse } from '../../../master-data/services/supporting-master.service';
import { ToastService } from '../../../../shared/services/toast.service';
import { Invoice, InvoiceItem } from '../../models/invoice.model';

export interface InvoiceFormData {
  mode: 'create' | 'edit' | 'view';
  type: 'sales' | 'purchase';
  invoice?: Invoice;
}

@Component({
  selector: 'app-invoice-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatAutocompleteModule,
    MatTableModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatChipsModule,
    MatCardModule,
    MatDividerModule
  ],
  templateUrl: './invoice-form.component.html',
  styleUrl: './invoice-form.component.scss'
})
export class InvoiceFormComponent implements OnInit, OnDestroy {
  invoiceForm!: FormGroup;
  loading = false;
  saving = false;
  mode: 'create' | 'edit' | 'view' = 'create';
  type: 'sales' | 'purchase' = 'sales';

  customers: any[] = [];
  suppliers: any[] = [];
  items: any[] = [];
  filteredItems: any[] = [];
  salesmen: any[] = [];
  warehouses: Warehouse[] = [];

  displayedColumns = ['sn', 'company', 'itemName', 'boxQty', 'unitQty', 'warehouse', 'boxRate', 'unitRate', 'discount', 'gst', 'advanceTax', 'total', 'actions'];

  stockLoading = false;

  private destroy$ = new Subject<void>();
  private itemSearch$ = new Subject<string>();

  constructor(
    private fb: FormBuilder,
    private invoiceService: InvoiceService,
    private customerService: CustomerService,
    private supplierService: SupplierService,
    private itemService: ItemService,
    private supportingMasterService: SupportingMasterService,
    private toastService: ToastService,
    @Optional() public dialogRef: MatDialogRef<InvoiceFormComponent>,
    @Optional() @Inject(MAT_DIALOG_DATA) public data: InvoiceFormData
  ) {
    if (data) {
      this.mode = data.mode;
      this.type = data.type;
    }
  }

  ngOnInit(): void {
    this.initForm();
    this.loadData();
    this.setupItemSearch();
    this.setupWarehouseListener();

    if (this.data?.invoice && this.mode !== 'create') {
      this.populateForm(this.data.invoice);
    }

    if (this.mode === 'view') {
      this.invoiceForm.disable({ emitEvent: false });
      this.currentItemForm.disable({ emitEvent: false });
    }
  }

  private setupWarehouseListener(): void {
    this.currentItemForm.get('warehouseId')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(warehouseId => this.refreshItemStock(warehouseId));
  }

  private refreshItemStock(warehouseId: string): void {
    const itemId = this.currentItemForm.get('itemId')?.value;
    if (!itemId || !warehouseId) {
      this.currentItemForm.patchValue({ availableQty: 0 }, { emitEvent: false });
      return;
    }

    this.stockLoading = true;
    this.itemService.getItemStock(itemId, warehouseId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.currentItemForm.patchValue({ availableQty: res.data?.availableStock || 0 }, { emitEvent: false });
          this.stockLoading = false;
        },
        error: () => {
          this.currentItemForm.patchValue({ availableQty: 0 }, { emitEvent: false });
          this.stockLoading = false;
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initForm(): void {
    this.invoiceForm = this.fb.group({
      customerId: [null, this.type === 'sales' ? Validators.required : null],
      supplierId: [null, this.type === 'purchase' ? Validators.required : null],
      salesmanId: [null],
      invoiceDate: [new Date(), Validators.required],
      dueDate: [this.getDefaultDueDate(), Validators.required],
      supplierBillNo: [''],
      salesType: ['new'],
      taxInvoiceType: ['normal'], // Normal or Sale Tax
      memoNo: [''],
      poReference: [''],
      otherTitle: [''],
      creditDays: [0],
      advanceTaxRate: [0], // 0.5 or 2.5
      claimAccountId: [null],
      claimPercentage: [0],
      previousBalance: [0],
      returnReason: [''],
      notes: [''],
      detailNote: [''],
      // Bilty / Transport Info
      biltyNo: [''],
      biltyDate: [null],
      transportCompany: [''],
      transportCharges: [0],
      biltyStatus: ['pending'],
      items: this.fb.array([], Validators.minLength(1))
    });

    this.initItemDetailForm();
  }

  currentItemForm!: FormGroup;
  selectedItem: any = null;

  private initItemDetailForm(): void {
    this.currentItemForm = this.fb.group({
      itemId: ['', Validators.required],
      itemName: [''],
      itemCode: [''],
      barcode: [''],
      batchNumber: [''],
      expiryDate: [null],
      warehouseId: ['', Validators.required],
      boxQuantity: [0, [Validators.min(0)]],
      unitQuantity: [0, [Validators.min(0)]],
      boxRate: [0, [Validators.min(0)]],
      unitRate: [0, [Validators.min(0)]],
      packSize: [1],
      availableQty: [0],
      // Discount & Schemes
      scheme1Qty: [0],
      scheme2Qty: [0],
      discount1Percent: [0],
      discount1Amount: [0],
      discount2Percent: [0],
      discount2Amount: [0],
      // GST & Advance Tax
      gstRate: [18],
      gstAmount: [0],
      advanceTaxPercent: [0],
      advanceTaxAmount: [0],
      lineTotal: [0]
    });

    // Watch for changes to calculate line total in the input form
    this.currentItemForm.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.calculateCurrentItemLineTotal();
    });
  }

  private createItemGroup(item?: any): FormGroup {
    return this.fb.group({
      itemId: [item?.itemId || '', Validators.required],
      itemName: [item?.itemName || ''],
      itemCode: [item?.itemCode || ''],
      companyName: [item?.companyName || ''],
      warehouseName: [item?.warehouseName || ''],
      packSize: [item?.packSize || 1],
      boxQuantity: [item?.boxQuantity || 0],
      unitQuantity: [item?.unitQuantity || 0],
      schemeUnit: [item?.scheme1Qty || 0], // Total scheme units
      totalUnitQty: [item?.totalUnitQty || (item?.boxQuantity * (item?.packSize || 1)) + item?.unitQuantity],
      boxRate: [item?.boxRate || 0],
      unitRate: [item?.unitRate || 0],
      discount1Percent: [item?.discount1Percent || 0],
      discount2Percent: [item?.discount2Percent || 0],
      gst18Amount: [item?.gstAmount || 0],
      advanceTaxPercent: [item?.advanceTaxPercent || 0],
      lineTotal: [item?.lineTotal || 0],
      warehouseId: [item?.warehouseId || ''],
      batchNumber: [item?.batchNumber || ''],
      expiryDate: [item?.expiryDate || null]
    });
  }

  calculateCurrentItemLineTotal(): void {
    const form = this.currentItemForm.value;
    const boxQty = form.boxQuantity || 0;
    const unitQty = form.unitQuantity || 0;
    const boxRate = form.boxRate || 0;
    const unitRate = form.unitRate || 0;
    const disc1Pct = form.discount1Percent || 0;
    const disc2Pct = form.discount2Percent || 0;
    const gstRate = form.gstRate || 18;
    const advTaxPct = form.advanceTaxPercent || 0;

    const subtotal = (boxQty * boxRate) + (unitQty * unitRate);
    const disc1Amt = subtotal * (disc1Pct / 100);
    const taxableAfterDisc1 = subtotal - disc1Amt;
    const disc2Amt = taxableAfterDisc1 * (disc2Pct / 100);
    const taxableAmount = taxableAfterDisc1 - disc2Amt;

    const gstAmt = taxableAmount * (gstRate / 100);
    const amountWithGst = taxableAmount + gstAmt;
    const advTaxAmt = amountWithGst * (advTaxPct / 100);
    const lineTotal = amountWithGst + advTaxAmt;

    this.currentItemForm.patchValue({
      discount1Amount: Math.round(disc1Amt * 100) / 100,
      discount2Amount: Math.round(disc2Amt * 100) / 100,
      gstAmount: Math.round(gstAmt * 100) / 100,
      advanceTaxAmount: Math.round(advTaxAmt * 100) / 100,
      lineTotal: Math.round(lineTotal * 100) / 100
    }, { emitEvent: false });
  }

  addItemToInvoice(): void {
    if (this.currentItemForm.invalid) {
      this.toastService.error('Please select an item and fill required fields');
      return;
    }

    const formValue = this.currentItemForm.value;
    const warehouse = this.warehouses.find(w => w._id === formValue.warehouseId);

    // Check stock availability before adding (only for sales)
    if (this.type === 'sales') {
      const boxQty = formValue.boxQuantity || 0;
      const unitQty = formValue.unitQuantity || 0;
      const packSize = formValue.packSize || 1;
      const totalUnits = (boxQty * packSize) + unitQty;
      const available = formValue.availableQty || 0;

      if (totalUnits > available) {
        this.toastService.error(`Insufficient stock. Available: ${available} units, Requested: ${totalUnits} units`);
        return;
      }
    }

    const newItemGroup = this.createItemGroup({
      ...formValue,
      companyName: this.selectedItem?.companyName || '',
      warehouseName: warehouse?.name || 'Unknown'
    });

    this.itemsArray.push(newItemGroup);

    // Reset form but keep warehouse if preferred
    const lastWh = formValue.warehouseId;
    this.currentItemForm.reset({
      boxQuantity: 0,
      unitQuantity: 0,
      boxRate: 0,
      unitRate: 0,
      packSize: 1,
      gstRate: 18,
      advanceTaxPercent: 0,
      warehouseId: lastWh
    });
    this.selectedItem = null;
  }

  calculateTotals(): any {
    let subtotal = 0;
    let discountTotal = 0;
    let gstTotal = 0;
    let advanceTaxTotal = 0;
    let grandTotal = 0;

    this.itemsArray.controls.forEach(control => {
      const val = control.value;
      const boxQty = val.boxQuantity || 0;
      const unitQty = val.unitQuantity || 0;
      const boxRate = val.boxRate || 0;
      const unitRate = val.unitRate || 0;
      const disc1Pct = val.discount1Percent || 0;
      const disc2Pct = val.discount2Percent || 0;
      const advPct = val.advanceTaxPercent || 0;
      const gstPct = 18; // Default

      const lineSubtotal = (boxQty * boxRate) + (unitQty * unitRate);
      const disc1Amt = lineSubtotal * (disc1Pct / 100);
      const disc2Amt = (lineSubtotal - disc1Amt) * (disc2Pct / 100);
      const taxable = lineSubtotal - disc1Amt - disc2Amt;

      const gstAmt = taxable * (gstPct / 100);
      const withGst = taxable + gstAmt;
      const advAmt = withGst * (advPct / 100);

      subtotal += lineSubtotal;
      discountTotal += (disc1Amt + disc2Amt);
      gstTotal += gstAmt;
      advanceTaxTotal += advAmt;
    });

    grandTotal = subtotal - discountTotal + gstTotal + advanceTaxTotal;

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      discountTotal: Math.round(discountTotal * 100) / 100,
      gstTotal: Math.round(gstTotal * 100) / 100,
      advanceTaxTotal: Math.round(advanceTaxTotal * 100) / 100,
      grandTotal: Math.round(grandTotal * 100) / 100
    };
  }

  onItemSelectedNew(event: any): void {
    const item = event.option?.value;
    if (item) {
      this.selectedItem = item;
      this.currentItemForm.patchValue({
        itemId: item._id,
        itemName: item.name,
        itemCode: item.code,
        barcode: item.specifications?.barcode || '',
        packSize: item.packSize || 1,
        boxRate: this.type === 'sales' ? item.pricing?.salePrice : item.pricing?.costPrice,
        unitRate: item.packSize ? (this.type === 'sales' ? item.pricing?.salePrice : item.pricing?.costPrice) / item.packSize : 0,
        gstRate: item.tax?.gstRate || 18,
        availableQty: item.inventory?.currentStock || 0
      });

      // Fetch warehouse-specific stock if warehouse is selected
      const warehouseId = this.currentItemForm.get('warehouseId')?.value;
      if (warehouseId) {
        this.refreshItemStock(warehouseId);
      }
    }
  }

  private extractCollection(response: any): any[] {
    if (!response) return [];
    if (Array.isArray(response)) return response;
    if (Array.isArray(response.data)) return response.data;
    if (Array.isArray(response?.data?.customers)) return response.data.customers;
    if (Array.isArray(response?.data?.suppliers)) return response.data.suppliers;
    if (Array.isArray(response?.customers)) return response.customers;
    if (Array.isArray(response?.suppliers)) return response.suppliers;
    return [];
  }

  getPartyId(party: any): string | null {
    return party?._id || party?.id || party?.accountId || null;
  }

  getPartyName(party: any): string {
    return party?.name || party?.accountTitle || party?.companyName || party?.code || 'Unnamed';
  }

  getPartyBalance(party: any): number {
    const rawBalance = party?.balance ?? party?.currentBalance ?? party?.previousBalance ?? party?.financialInfo?.currentBalance ?? 0;
    const parsed = Number(rawBalance);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private loadData(): void {
    this.loading = true;

    if (this.type === 'sales') {
      this.customerService.getCustomers({ isActive: true, limit: 100 })
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            const activeCustomers = this.extractCollection(response);
            this.customers = activeCustomers.filter(c => !!this.getPartyId(c));

            // Fallback if backend has no isActive field populated or all records are inactive
            if (this.customers.length === 0) {
              this.customerService.getCustomers({ limit: 100 })
                .pipe(takeUntil(this.destroy$))
                .subscribe({
                  next: (allResponse) => {
                    const allCustomers = this.extractCollection(allResponse);
                    this.customers = allCustomers.filter(c => !!this.getPartyId(c));
                  }
                });
            }
          }
        });
    } else {
      this.supplierService.getSuppliers({ isActive: true, limit: 100 })
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            const suppliers = this.extractCollection(response);
            this.suppliers = suppliers.filter(s => !!this.getPartyId(s));

            if (this.suppliers.length === 0) {
              this.supplierService.getSuppliers({ limit: 100 })
                .pipe(takeUntil(this.destroy$))
                .subscribe({
                  next: (allResponse) => {
                    const allSuppliers = this.extractCollection(allResponse);
                    this.suppliers = allSuppliers.filter(s => !!this.getPartyId(s));
                  }
                });
            }
          }
        });
    }

    this.itemService.getItems({ isActive: true, limit: 500 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.items = response.data || [];
          this.filteredItems = this.items;
        }
      });

    this.supportingMasterService.getWarehouses({ isActive: true })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.warehouses = response.data || [];
          this.loading = false;
        },
        error: () => {
          this.loading = false;
        }
      });
  }

  private setupItemSearch(): void {
    this.itemSearch$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(term => {
        if (!term) {
          this.filteredItems = this.items;
        } else {
          const lowerTerm = term.toLowerCase();
          this.filteredItems = this.items.filter(item =>
            item.name?.toLowerCase().includes(lowerTerm) ||
            item.code?.toLowerCase().includes(lowerTerm)
          );
        }
      });
  }

  onItemSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.itemSearch$.next(value);
  }

  displayItem(item: any): string {
    return item ? `${item.code} - ${item.name}` : '';
  }

  private populateForm(invoice: Invoice): void {
    this.invoiceForm.patchValue({
      customerId: invoice.customerId,
      supplierId: invoice.supplierId,
      salesmanId: invoice.salesmanId,
      invoiceDate: new Date(invoice.invoiceDate),
      dueDate: new Date(invoice.dueDate),
      supplierBillNo: invoice.supplierBillNo,
      salesType: invoice.salesType || 'new',
      taxInvoiceType: invoice.taxInvoiceType || 'normal',
      memoNo: invoice.memoNo || '',
      poReference: invoice.poReference || '',
      otherTitle: invoice.otherTitle || '',
      creditDays: invoice.creditDays || 0,
      advanceTaxRate: invoice.advanceTaxRate || 0,
      claimAccountId: invoice.claimAccountId || null,
      claimPercentage: invoice.claimPercentage || 0,
      previousBalance: invoice.previousBalance || 0,
      returnReason: invoice.returnReason || '',
      notes: invoice.notes,
      detailNote: invoice.detailNote || ''
    });

    this.itemsArray.clear();
    invoice.items?.forEach(item => {
      this.itemsArray.push(this.createItemGroup(item));
    });
  }

  save(): void {
    if (this.invoiceForm.invalid || this.itemsArray.length === 0) {
      this.toastService.error('Please fill all required fields and add at least one item');
      return;
    }

    this.saving = true;
    const formValue = this.invoiceForm.value;
    const totals = this.calculateTotals();

    // Clean up claimAccountId - convert non-ObjectId values to null
    const claimAccountId = formValue.claimAccountId;
    const isValidObjectId = claimAccountId && /^[0-9a-fA-F]{24}$/.test(claimAccountId);

    const invoiceData = {
      ...formValue,
      claimAccountId: isValidObjectId ? claimAccountId : null,
      type: this.type,
      invoiceSource: 'admin',
      totals: totals,
      items: formValue.items.map((item: any) => ({
        itemId: item.itemId,
        itemName: item.itemName,
        itemCode: item.itemCode,
        companyName: item.companyName,
        warehouseId: item.warehouseId,
        boxQuantity: item.boxQuantity || 0,
        unitQuantity: item.unitQuantity || 0,
        boxRate: item.boxRate || 0,
        unitRate: item.unitRate || 0,
        unitPrice: item.unitRate || 0,
        discount1Percent: item.discount1Percent || 0,
        discount2Percent: item.discount2Percent || 0,
        gstRate: item.gstRate || 18,
        gstAmount: item.gst18Amount || 0,
        advanceTaxPercent: item.advanceTaxPercent || 0,
        lineTotal: item.lineTotal || 0,
        batchNumber: item.batchNumber || undefined,
        expiryDate: item.expiryDate || undefined,
        scheme1Quantity: item.schemeUnit || 0
      }))
    };

    const request$ = this.type === 'sales'
      ? (this.mode === 'create'
        ? this.invoiceService.createSalesInvoice(invoiceData)
        : this.invoiceService.updateSalesInvoice(this.data.invoice!._id, invoiceData))
      : (this.mode === 'create'
        ? this.invoiceService.createPurchaseInvoice(invoiceData)
        : this.invoiceService.updatePurchaseInvoice(this.data.invoice!._id, invoiceData));

    request$.pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        this.saving = false;
        if (response.success) {
          this.toastService.success(`Invoice ${this.mode === 'create' ? 'created' : 'updated'} successfully`);
          this.dialogRef?.close(response.data);
        }
      },
      error: (error) => {
        this.saving = false;
        console.error('Invoice save error:', error);
        console.error('Error details:', JSON.stringify(error.error, null, 2));
        // Show detailed validation errors if available - check multiple paths
        const details = error.error?.error?.details || error.error?.details;
        if (details && Array.isArray(details)) {
          const messages = details.map((d: any) => `${d.field}: ${d.message}`).join('; ');
          this.toastService.error(`Validation failed: ${messages}`);
        } else {
          const msg = error.error?.error?.message || error.error?.message || error.message || 'Failed to save invoice';
          this.toastService.error(msg);
        }
      }
    });
  }

  cancel(): void {
    this.dialogRef?.close();
  }

  public formatCurrency(amount: number): string {
    if (amount === undefined || amount === null || isNaN(amount)) {
      return 'PKR 0';
    }
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      maximumFractionDigits: 0
    }).format(amount);
  }
  private getDefaultDueDate(): Date {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date;
  }

  public removeItem(index: number): void {
    this.itemsArray.removeAt(index);
    this.calculateTotals();
  }

  get itemsArray(): FormArray {
    return this.invoiceForm.get('items') as FormArray;
  }
}
