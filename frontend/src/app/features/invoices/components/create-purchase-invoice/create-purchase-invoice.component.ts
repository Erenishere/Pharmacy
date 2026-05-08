import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
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
import { MatRadioModule } from '@angular/material/radio';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { InvoiceService } from '../../services/invoice.service';
import { SupplierService } from '../../../suppliers/services/supplier.service';
import { ItemService } from '../../../items/services/item.service';
import { WarehouseService } from '../../../warehouses/services/warehouse.service';
import { ToastService } from '../../../../shared/services/toast.service';
import { Invoice, InvoiceItem } from '../../models/invoice.model';

@Component({
  selector: 'app-create-purchase-invoice',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
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
    MatDividerModule,
    MatRadioModule
  ],
  templateUrl: './create-purchase-invoice.component.html',
  styleUrl: './create-purchase-invoice.component.scss'
})
export class CreatePurchaseInvoiceComponent implements OnInit, OnDestroy {
  public purchaseForm!: FormGroup;
  public currentItem!: FormGroup;
  public loading = false;
  public saving = false;
  public mode: 'create' | 'edit' = 'create';
  public invoiceId: string | undefined;

  public suppliers: any[] = [];
  public items: any[] = [];
  public warehouses: any[] = [];
  public filteredItems: any[] = [];
  public selectedSupplier: any = null;
  public editingIndex: number | null = null;

  public displayedColumns = [
    'sno', 'company', 'itemName', 'boxQty', 'unitQty', 'warehouse',
    'boxTP', 'unitTP', 'discount', 'gst', 'advanceTax', 'netAmount', 'actions'
  ];

  public invoiceTypes = [
    { value: 'normal', label: 'Normal Invoice' },
    { value: 'sales_tax', label: 'Sale Tax Invoice' }
  ];

  public salesTypes = [
    { value: 'new', label: 'New Purchase Invoice' },
    { value: 'return', label: 'Purchase Return Invoice' }
  ];

  private destroy$ = new Subject<void>();
  private itemSearch$ = new Subject<string>();

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private invoiceService: InvoiceService,
    private supplierService: SupplierService,
    private itemService: ItemService,
    private warehouseService: WarehouseService,
    private toastService: ToastService
  ) { }

  ngOnInit(): void {
    this.initForm();
    this.initCurrentItem();
    this.loadData();
    this.setupItemSearch();
    this.setupFormListeners();

    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const id = params['id'];
      if (id) {
        this.invoiceId = id;
        this.mode = 'edit';
        this.loadInvoice(id);
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  public initForm(): void {
    this.purchaseForm = this.fb.group({
      salesType: ['new', Validators.required],
      invoiceDate: [new Date(), Validators.required],
      supplierId: ['', Validators.required],
      otherTitle: [''],
      salesman: [''],
      advanceTaxStatus: [{ value: '', disabled: true }],
      memoNo: [''],
      supplierBillNo: [''],
      creditDays: [30, [Validators.required, Validators.min(0)]],
      dueDate: [this.getDefaultDueDate()],
      taxInvoiceType: ['normal', Validators.required],
      claimAccountId: [''],
      claimPercentage: [0],
      overallDiscountPercent: [0, [Validators.min(0), Validators.max(100)]],
      overallDiscountAmount: [0, Validators.min(0)],
      detailNote: [''],
      warrantyInfo: [''],
      items: this.fb.array([], Validators.minLength(1)),
    });
  }

  public initCurrentItem(): void {
    this.currentItem = this.fb.group({
      itemId: [''],
      itemName: [''],
      formulaName: [{ value: '', disabled: true }],
      formulaSize: [{ value: '', disabled: true }],
      itemCode: [''],
      barcode: [''],
      companyName: [''],
      warehouseId: [''],
      availableQty: [{ value: 0, disabled: true }],
      boxQuantity: [0, Validators.min(0)],
      unitQuantity: [0, Validators.min(0)],
      boxPacking: [1],
      totalUnitQty: [{ value: 0, disabled: true }],
      boxTP: [0, Validators.min(0)],
      unitTP: [0, Validators.min(0)],
      grossTotal: [{ value: 0, disabled: true }],
      scheme1Qty: [0, Validators.min(0)],
      discount1Percent: [0, [Validators.min(0), Validators.max(100)]],
      discount1Amount: [{ value: 0, disabled: true }],
      amountAfterDiscount: [{ value: 0, disabled: true }],
      gstRate: [18],
      gst18Amount: [{ value: 0, disabled: true }],
      gst4Amount: [{ value: 0, disabled: true }],
      totalGSTAmount: [{ value: 0, disabled: true }],
      totalWithGST: [{ value: 0, disabled: true }],
      advanceTaxPercent: [{ value: 0, disabled: true }],
      advanceTaxAmount: [{ value: 0, disabled: true }],
      netAmount: [{ value: 0, disabled: true }],
      batchNumber: [''],
      manufacturingDate: [null],
      expiryDate: [null],
    });

    this.setupCurrentItemListeners();
    this.editingIndex = null;
  }

  private setupCurrentItemListeners(): void {
    const fields = ['boxQuantity', 'unitQuantity', 'boxPacking', 'boxTP', 'unitTP', 'discount1Percent', 'gstRate'];
    fields.forEach(f => {
      this.currentItem.get(f)?.valueChanges
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => this.recalcCurrentItem());
    });
  }

  public recalcCurrentItem(): void {
    const v = this.currentItem.getRawValue();
    const boxQty = v.boxQuantity || 0;
    const unitQty = v.unitQuantity || 0;
    const packing = v.boxPacking || 1;
    const totalUnitQty = (boxQty * packing) + unitQty;
    const boxTP = v.boxTP || 0;
    const unitTP = v.unitTP || 0;
    const grossTotal = (boxQty * boxTP) + (unitQty * unitTP);
    const disc = v.discount1Percent || 0;
    const discount1Amount = grossTotal * (disc / 100);
    const amountAfterDiscount = grossTotal - discount1Amount;
    const gstRate = v.gstRate || 18;
    const gst18Amount = gstRate === 18 ? amountAfterDiscount * 0.18 : 0;
    const gst4Amount = gstRate === 4 ? amountAfterDiscount * 0.04 : 0;
    const totalGSTAmount = gst18Amount + gst4Amount;
    const totalWithGST = amountAfterDiscount + totalGSTAmount;
    const advanceTaxPercent = this.selectedSupplier?.advanceTaxStatus === 'filer' ? 0.5 : 2.5;
    const advanceTaxAmount = amountAfterDiscount * (advanceTaxPercent / 100);
    const netAmount = amountAfterDiscount + totalGSTAmount + advanceTaxAmount;

    this.currentItem.patchValue({
      totalUnitQty,
      grossTotal: this.round(grossTotal),
      discount1Amount: this.round(discount1Amount),
      amountAfterDiscount: this.round(amountAfterDiscount),
      gst18Amount: this.round(gst18Amount),
      gst4Amount: this.round(gst4Amount),
      totalGSTAmount: this.round(totalGSTAmount),
      totalWithGST: this.round(totalWithGST),
      advanceTaxPercent,
      advanceTaxAmount: this.round(advanceTaxAmount),
      netAmount: this.round(netAmount),
    }, { emitEvent: false });
  }

  public addItemToInvoice(): void {
    const v = this.currentItem.getRawValue();
    if (!v.itemId) {
      this.toastService.error('Please select an item first');
      return;
    }

    const itemGroup = this.fb.group(v);

    if (this.editingIndex !== null) {
      this.itemsArray.setControl(this.editingIndex, itemGroup);
      this.editingIndex = null;
    } else {
      this.itemsArray.push(itemGroup);
    }

    this.initCurrentItem();
  }

  public editItem(index: number): void {
    const item = this.itemsArray.at(index).getRawValue();
    this.editingIndex = index;
    this.currentItem.patchValue(item);
  }

  public removeItem(index: number): void {
    this.itemsArray.removeAt(index);
  }

  get itemsArray(): FormArray {
    return this.purchaseForm.get('items') as FormArray;
  }

  get itemsData(): any[] {
    return this.itemsArray.controls.map(c => c.getRawValue ? c.getRawValue() : c.value);
  }

  public onItemSelected(event: any): void {
    const item = event.option?.value;
    if (item) {
      this.currentItem.patchValue({
        itemId: item._id,
        itemName: item.name,
        formulaName: item.formulaId?.name || '',
        formulaSize: item.formulaSizeId?.size || '',
        availableQty: item.inventory?.currentStock || 0,
        itemCode: item.code,
        barcode: item.barcode || '',
        companyName: item.companyId?.name || '',
        boxPacking: item.packSize || 1,
        boxTP: item.pricing?.purchasePrice || item.pricing?.costPrice || 0,
        unitTP: item.pricing?.unitCostPrice || 0,
        gstRate: item.tax?.gstRate || 18,
      });
      this.recalcCurrentItem();
    }
  }

  public onItemSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.itemSearch$.next(value);
  }

  public displayItem(item: any): string {
    if (!item || typeof item === 'string') return item || '';
    const name = item.name || '';
    const formula = item.formulaId?.name ? ` / ${item.formulaId.name}` : '';
    const size = item.formulaSizeId?.size ? ` (${item.formulaSizeId.size})` : '';
    return `${item.code} - ${name}${formula}${size}`;
  }

  private getDefaultDueDate(): Date {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date;
  }

  private setupFormListeners(): void {
    this.purchaseForm.get('creditDays')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(days => {
        const invoiceDate = this.purchaseForm.get('invoiceDate')?.value;
        if (invoiceDate && days !== null) {
          const dueDate = new Date(invoiceDate);
          dueDate.setDate(dueDate.getDate() + days);
          this.purchaseForm.patchValue({ dueDate }, { emitEvent: false });
        }
      });

    this.purchaseForm.get('supplierId')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(supplierId => {
        if (supplierId) this.loadSupplierDetails(supplierId);
      });
  }

  private setupItemSearch(): void {
    this.itemSearch$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(term => {
        if (!term) {
          this.filteredItems = this.items;
        } else {
          const lowerTerm = term.toLowerCase();
          this.filteredItems = this.items.filter(item =>
            item.name?.toLowerCase().includes(lowerTerm) ||
            item.code?.toLowerCase().includes(lowerTerm) ||
            item.barcode?.toLowerCase().includes(lowerTerm) ||
            item.formulaId?.name?.toLowerCase().includes(lowerTerm) ||
            item.formulaSizeId?.size?.toLowerCase().includes(lowerTerm)
          );
        }
      });
  }

  private loadData(): void {
    this.loading = true;
    this.supplierService.getSuppliers({ isActive: true, limit: 500 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({ next: (r) => { this.suppliers = r.data || []; } });

    this.itemService.getItems({ isActive: true, limit: 1000 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({ next: (r) => { this.items = r.data || []; this.filteredItems = this.items; } });

    this.warehouseService.getWarehouses({ isActive: true })
      .pipe(takeUntil(this.destroy$))
      .subscribe({ next: (r) => { this.warehouses = r.data || []; this.loading = false; }, error: () => { this.loading = false; } });
  }

  private loadSupplierDetails(supplierId: string): void {
    this.supplierService.getSupplierById(supplierId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (r) => {
          if (r.success) {
            this.selectedSupplier = r.data as any;
            const supplier = r.data as any;
            const taxLabel = supplier.advanceTaxStatus === 'filer' ? '0.5% (Filer)' : '2.5% (Non-Filer)';
            this.purchaseForm.patchValue({ advanceTaxStatus: taxLabel });
            this.recalcCurrentItem();
          }
        }
      });
  }

  private loadInvoice(id: string): void {
    this.loading = true;
    this.invoiceService.getPurchaseInvoiceById(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (r) => {
          if (r.success) this.populateForm(r.data);
          this.loading = false;
        },
        error: () => { this.loading = false; this.toastService.error('Failed to load invoice'); }
      });
  }

  private populateForm(invoice: Invoice): void {
    this.purchaseForm.patchValue({
      invoiceDate: new Date(invoice.invoiceDate),
      supplierId: invoice.supplierId,
      salesType: invoice.salesType || 'new',
      supplierBillNo: invoice.supplierBillNo,
      dueDate: new Date(invoice.dueDate),
      notes: invoice.notes,
      detailNote: invoice.detailNote || '',
      warrantyInfo: invoice.warrantyInfo || '',
      creditDays: invoice.creditDays || 0,
      taxInvoiceType: invoice.taxInvoiceType || 'normal',
      claimAccountId: invoice.claimAccountId || '',
      claimPercentage: invoice.claimPercentage || 0,
      overallDiscountPercent: invoice.overallDiscountPercent || 0,
      overallDiscountAmount: invoice.overallDiscountAmount || 0,
    });
    this.itemsArray.clear();
    invoice.items?.forEach(item => {
      this.itemsArray.push(this.fb.group(item));
    });
  }

  public calculateTotals() {
    let grossTotal = 0, totalDiscount = 0, gst18Total = 0, gst4Total = 0, advanceTaxTotal = 0;
    this.itemsData.forEach(item => {
      grossTotal += item.grossTotal || 0;
      totalDiscount += item.discount1Amount || 0;
      gst18Total += item.gst18Amount || 0;
      gst4Total += item.gst4Amount || 0;
      advanceTaxTotal += item.advanceTaxAmount || 0;
    });
    const overallDiscPct = this.purchaseForm.get('overallDiscountPercent')?.value || 0;
    const overallDiscAmt = this.purchaseForm.get('overallDiscountAmount')?.value || 0;
    const additionalDiscount = overallDiscPct > 0 ? grossTotal * (overallDiscPct / 100) : overallDiscAmt;
    totalDiscount += additionalDiscount;
    const gstTotal = gst18Total + gst4Total;
    const supplier = this.selectedSupplier as any;
    const nonFilerGST = supplier?.advanceTaxStatus === 'non-filer' ? (grossTotal - totalDiscount) * 0.001 : 0;
    const totalWithAdvanceTax = grossTotal - totalDiscount + gstTotal + advanceTaxTotal;
    const netBillTotal = totalWithAdvanceTax + nonFilerGST;
    return {
      grossTotal: this.round(grossTotal),
      totalDiscount: this.round(totalDiscount),
      gst18Total: this.round(gst18Total),
      gst4Total: this.round(gst4Total),
      gstTotal: this.round(gstTotal),
      advanceTaxTotal: this.round(advanceTaxTotal),
      nonFilerGST: this.round(nonFilerGST),
      nonFilerGSTTotal: this.round(nonFilerGST), // Alias for template compatibility
      totalWithAdvanceTax: this.round(totalWithAdvanceTax),
      netBillTotal: this.round(netBillTotal),
      grandTotal: this.round(netBillTotal), // Alias for template compatibility
    };
  }

  public getWarehouseName(id: string): string {
    const wh = this.warehouses.find(w => w._id === id);
    return wh ? wh.name : id || '—';
  }

  public saveDraft(): void { this.save('draft'); }
  public saveAndConfirm(): void { this.save('confirmed'); }

  private save(status: 'draft' | 'confirmed'): void {
    if (this.purchaseForm.invalid || this.itemsArray.length === 0) {
      this.toastService.error('Please fill all required fields and add at least one item');
      return;
    }
    this.saving = true;
    const formValue = this.purchaseForm.value;
    const totals = this.calculateTotals();
    const invoiceData: any = {
      ...formValue,
      type: 'purchase',
      status,
      totals: {
        subtotal: totals.grossTotal - totals.totalDiscount,
        grossTotal: totals.grossTotal,
        totalDiscount: totals.totalDiscount,
        gst18Total: totals.gst18Total,
        gst4Total: totals.gst4Total,
        gstTotal: totals.gstTotal,
        advanceTaxTotal: totals.advanceTaxTotal,
        nonFilerGSTTotal: totals.nonFilerGST,
        grandTotal: totals.netBillTotal,
        netBillTotal: totals.netBillTotal,
      },
      items: this.itemsData.map((item: any) => ({
        itemId: item.itemId,
        itemName: item.itemName,
        itemCode: item.itemCode,
        companyName: item.companyName,
        warehouseId: item.warehouseId,
        boxQuantity: item.boxQuantity,
        unitQuantity: item.unitQuantity,
        quantity: item.totalUnitQty,
        boxTP: item.boxTP,
        unitTP: item.unitTP,
        unitPrice: item.unitTP,
        grossTotal: item.grossTotal,
        scheme1Quantity: item.scheme1Qty,
        discount: item.discount1Percent,
        discount1Amount: item.discount1Amount,
        gstRate: item.gstRate,
        gstAmount: item.totalGSTAmount,
        gst18Amount: item.gst18Amount,
        gst4Amount: item.gst4Amount,
        advanceTaxAmount: item.advanceTaxAmount,
        lineTotal: item.netAmount,
        batchInfo: this.buildBatchInfo(item)
      }))
    };
    this.omitEmptyObjectIds(invoiceData, ['claimAccountId']);

    const request$ = this.mode === 'create'
      ? this.invoiceService.createPurchaseInvoice(invoiceData)
      : this.invoiceService.updatePurchaseInvoice(this.invoiceId!, invoiceData);

    request$.pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        this.saving = false;
        if (response.success) {
          this.toastService.success(`Purchase invoice ${this.mode === 'create' ? 'created' : 'updated'} successfully`);
          this.router.navigate(['/purchase-invoices']);
        }
      },
      error: (error) => {
        this.saving = false;
        this.toastService.error(error.error?.message || 'Failed to save purchase invoice');
      }
    });
  }

  public cancel(): void { this.router.navigate(['/purchase-invoices']); }

  private round(n: number): number { return Math.round(n * 100) / 100; }

  private buildBatchInfo(item: any): any | undefined {
    if (!item.batchNumber) return undefined;
    const batchInfo: any = { batchNumber: item.batchNumber };
    if (item.manufacturingDate) batchInfo.manufacturingDate = item.manufacturingDate;
    if (item.expiryDate) batchInfo.expiryDate = item.expiryDate;
    return batchInfo;
  }

  private omitEmptyObjectIds(payload: any, keys: string[]): void {
    keys.forEach((key) => {
      if (payload[key] === '' || payload[key] === null || payload[key] === undefined) {
        delete payload[key];
      }
    });
  }

  public fmt(amount: number): string {
    if (amount === undefined || amount === null || isNaN(amount)) return '0';
    return new Intl.NumberFormat('en-PK', { maximumFractionDigits: 2 }).format(amount);
  }

  public formatCurrency(amount: number): string {
    return this.fmt(amount);
  }
}
