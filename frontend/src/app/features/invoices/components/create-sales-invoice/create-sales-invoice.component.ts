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
import { MatBadgeModule } from '@angular/material/badge';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { InvoiceService } from '../../services/invoice.service';
import { CustomerService } from '../../../customers/services/customer.service';
import { ItemService } from '../../../items/services/item.service';
import { WarehouseService } from '../../../warehouses/services/warehouse.service';
import { ToastService } from '../../../../shared/services/toast.service';
import { Invoice } from '../../models/invoice.model';

@Component({
  selector: 'app-create-sales-invoice',
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
    MatRadioModule,
    MatBadgeModule,
  ],
  templateUrl: './create-sales-invoice.component.html',
  styleUrl: './create-sales-invoice.component.scss'
})
export class CreateSalesInvoiceComponent implements OnInit, OnDestroy {
  public salesForm!: FormGroup;
  public currentItem!: FormGroup;
  public loading = false;
  public saving = false;
  public mode: 'create' | 'edit' = 'create';
  public invoiceId: string | undefined;

  public customers: any[] = [];
  public filteredCustomers: any[] = [];
  public items: any[] = [];
  public filteredItems: any[] = [];
  public warehouses: any[] = [];
  public selectedCustomer: any = null;
  public editingIndex: number | null = null;

  public displayedColumns = [
    'sno', 'itemName', 'batchInfo', 'boxQty', 'unitQty', 'warehouse',
    'saleRate', 'discount', 'gst', 'advanceTax', 'netAmount', 'actions'
  ];

  // Step tracking for card-based layout
  public step1Complete = false;

  public invoiceTypes = [
    { value: 'normal', label: 'Normal Invoice' },
    { value: 'sales_tax', label: 'Sales Tax Invoice' }
  ];

  public salesTypes = [
    { value: 'new', label: 'New Sales Invoice' },
    { value: 'return', label: 'Sales Return Invoice' }
  ];

  private destroy$ = new Subject<void>();
  private itemSearch$ = new Subject<string>();
  private customerSearch$ = new Subject<string>();

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private invoiceService: InvoiceService,
    private customerService: CustomerService,
    private itemService: ItemService,
    private warehouseService: WarehouseService,
    private toastService: ToastService
  ) { }

  ngOnInit(): void {
    this.initForm();
    this.initCurrentItem();
    this.loadData();
    this.setupItemSearch();
    this.setupCustomerSearch();
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
    this.salesForm = this.fb.group({
      salesType: ['new', Validators.required],
      invoiceDate: [new Date(), Validators.required],
      customerId: ['', Validators.required],
      customerName: [{ value: '', disabled: true }],
      customerTown: [{ value: '', disabled: true }],
      previousBalance: [{ value: 0, disabled: true }],
      otherTitle: [''],
      memoNo: [''],
      poReference: [''],
      creditDays: [30, [Validators.min(0)]],
      dueDate: [this.getDefaultDueDate()],
      salesmanId: [''],
      taxInvoiceType: ['normal', Validators.required],
      advanceTaxRate: [{ value: 0, disabled: true }],
      claimAccountId: [''],
      claimPercentage: [0, [Validators.min(0), Validators.max(100)]],
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
      itemCode: [{ value: '', disabled: true }],
      barcode: [{ value: '', disabled: true }],
      companyName: [{ value: '', disabled: true }],
      warehouseId: ['', Validators.required],
      availableQty: [{ value: 0, disabled: true }],
      boxQuantity: [0, Validators.min(0)],
      unitQuantity: [0, Validators.min(0)],
      boxPacking: [1],
      totalUnitQty: [{ value: 0, disabled: true }],
      scheme1Qty: [0, Validators.min(0)],
      scheme2Qty: [0, Validators.min(0)],
      saleBoxRate: [0, Validators.min(0)],
      saleUnitRate: [0, Validators.min(0)],
      grossTotal: [{ value: 0, disabled: true }],
      discount1Percent: [0, [Validators.min(0), Validators.max(100)]],
      discount1Amount: [{ value: 0, disabled: true }],
      discount2Percent: [0, [Validators.min(0), Validators.max(100)]],
      discount2Amount: [{ value: 0, disabled: true }],
      amountAfterDiscount: [{ value: 0, disabled: true }],
      gstRate: [0],
      gstAmount: [{ value: 0, disabled: true }],
      advanceTaxPercent: [{ value: 0, disabled: true }],
      advanceTaxAmount: [{ value: 0, disabled: true }],
      netAmount: [{ value: 0, disabled: true }],
      batchNumber: [''],
      expiryDate: [null],
    });

    this.setupCurrentItemListeners();
    this.editingIndex = null;
  }

  private setupCurrentItemListeners(): void {
    const fields = ['boxQuantity', 'unitQuantity', 'boxPacking', 'saleBoxRate', 'saleUnitRate',
      'discount1Percent', 'discount2Percent', 'scheme1Qty', 'gstRate'];
    fields.forEach(f => {
      this.currentItem.get(f)?.valueChanges
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => this.recalcCurrentItem());
    });
  }

  // Card-based step navigation
  public toggleStep1(): void {
    if (this.step1Complete) {
      this.step1Complete = false;
    }
  }

  public completeStep1(): void {
    if (!this.selectedCustomer) {
      this.toastService.error('Please select a customer');
      return;
    }
    this.step1Complete = true;
  }

  public recalcCurrentItem(): void {
    const v = this.currentItem.getRawValue();
    const boxQty = v.boxQuantity || 0;
    const unitQty = v.unitQuantity || 0;
    const packing = v.boxPacking || 1;
    const totalUnitQty = (boxQty * packing) + unitQty;

    const saleBoxRate = v.saleBoxRate || 0;
    const saleUnitRate = v.saleUnitRate || 0;
    const grossTotal = (boxQty * saleBoxRate) + (unitQty * saleUnitRate);

    const disc1 = v.discount1Percent || 0;
    const discount1Amount = grossTotal * (disc1 / 100);
    const disc2 = v.discount2Percent || 0;
    const discount2Amount = grossTotal * (disc2 / 100);
    const amountAfterDiscount = grossTotal - discount1Amount - discount2Amount;

    const gstRate = v.gstRate || 0;
    const gstAmount = amountAfterDiscount * (gstRate / 100);

    const advanceTaxPercent = this.selectedCustomer?.advanceTaxRate ||
      (this.selectedCustomer?.taxStatus === 'filer' ? 0.5 : 2.5);
    const advanceTaxAmount = amountAfterDiscount * (advanceTaxPercent / 100);
    const netAmount = amountAfterDiscount + gstAmount + advanceTaxAmount;

    this.currentItem.patchValue({
      totalUnitQty,
      grossTotal: this.round(grossTotal),
      discount1Amount: this.round(discount1Amount),
      discount2Amount: this.round(discount2Amount),
      amountAfterDiscount: this.round(amountAfterDiscount),
      gstAmount: this.round(gstAmount),
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
    if (!v.warehouseId) {
      this.toastService.error('Please select a warehouse');
      return;
    }
    if ((v.boxQuantity || 0) === 0 && (v.unitQuantity || 0) === 0) {
      this.toastService.error('Please enter a quantity (Box or Unit)');
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
    if (this.editingIndex === index) {
      this.initCurrentItem();
    }
  }

  get itemsArray(): FormArray {
    return this.salesForm.get('items') as FormArray;
  }

  get itemsData(): any[] {
    return this.itemsArray.controls.map(c => c.getRawValue ? c.getRawValue() : c.value);
  }

  public onCustomerSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.customerSearch$.next(value);
  }

  public onCustomerSelected(event: any): void {
    const customer = event.option?.value;
    if (customer) {
      this.selectedCustomer = customer;
      this.salesForm.patchValue({
        customerId: customer._id,
        customerName: customer.name,
        customerTown: customer.town || customer.city || '',
        creditDays: customer.creditDays || 30,
        advanceTaxRate: customer.taxStatus === 'filer' ? 0.5 : 2.5,
        previousBalance: customer.currentBalance || 0,
      });
      this.recalcCurrentItem();
    }
  }

  public displayCustomer(customer: any): string {
    if (!customer || typeof customer === 'string') return customer || '';
    return `${customer.name}${customer.town ? ' — ' + customer.town : ''}`;
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
        saleBoxRate: item.pricing?.salePrice || item.pricing?.sellingPrice || 0,
        saleUnitRate: item.pricing?.unitSalePrice || item.pricing?.unitSellingPrice || 0,
        gstRate: item.tax?.gstRate || 0,
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
    const formula = item.formulaId?.name ? ` / ${item.formulaId.name}` : '';
    const size = item.formulaSizeId?.size ? ` (${item.formulaSizeId.size})` : '';
    return `${item.code} - ${item.name}${formula}${size}`;
  }

  private getDefaultDueDate(): Date {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date;
  }

  private setupFormListeners(): void {
    this.salesForm.get('creditDays')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(days => {
        const invoiceDate = this.salesForm.get('invoiceDate')?.value;
        if (invoiceDate && days !== null) {
          const dueDate = new Date(invoiceDate);
          dueDate.setDate(dueDate.getDate() + days);
          this.salesForm.patchValue({ dueDate }, { emitEvent: false });
        }
      });
  }

  private setupItemSearch(): void {
    this.itemSearch$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(term => {
        if (!term || term.length < 2) {
          this.filteredItems = this.items.slice(0, 50);
        } else {
          const lower = term.toLowerCase();
          this.filteredItems = this.items.filter(item =>
            item.name?.toLowerCase().includes(lower) ||
            item.code?.toLowerCase().includes(lower) ||
            item.barcode?.toLowerCase().includes(lower) ||
            item.formulaId?.name?.toLowerCase().includes(lower)
          ).slice(0, 30);
        }
      });
  }

  private setupCustomerSearch(): void {
    this.customerSearch$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(term => {
        if (!term || term.length < 2) {
          this.filteredCustomers = this.customers.slice(0, 30);
        } else {
          const lower = term.toLowerCase();
          this.filteredCustomers = this.customers.filter(c =>
            c.name?.toLowerCase().includes(lower) ||
            c.town?.toLowerCase().includes(lower) ||
            c.phone?.includes(term)
          ).slice(0, 20);
        }
      });
  }

  private loadData(): void {
    this.loading = true;

    this.customerService.getCustomers({ isActive: true, limit: 1000 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({ next: (r: any) => { this.customers = r.data || []; this.filteredCustomers = this.customers.slice(0, 30); } });

    this.itemService.getItems({ isActive: true, limit: 2000 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({ next: (r: any) => { this.items = r.data || []; this.filteredItems = this.items.slice(0, 50); } });

    this.warehouseService.getWarehouses({ isActive: true })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (r: any) => { this.warehouses = r.data || []; this.loading = false; },
        error: () => { this.loading = false; }
      });
  }

  private loadInvoice(id: string): void {
    this.loading = true;
    this.invoiceService.getSalesInvoiceById(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (r: any) => {
          if (r.success) this.populateForm(r.data);
          this.loading = false;
        },
        error: () => { this.loading = false; this.toastService.error('Failed to load invoice'); }
      });
  }

  private populateForm(invoice: Invoice): void {
    this.salesForm.patchValue({
      salesType: invoice.salesType || 'new',
      invoiceDate: new Date(invoice.invoiceDate),
      customerId: invoice.customerId,
      memoNo: (invoice as any).memoNo || '',
      poReference: (invoice as any).poReference || '',
      creditDays: invoice.creditDays || 30,
      dueDate: new Date(invoice.dueDate),
      taxInvoiceType: invoice.taxInvoiceType || 'normal',
      claimAccountId: (invoice as any).claimAccountId || '',
      claimPercentage: (invoice as any).claimPercentage || 0,
      overallDiscountPercent: (invoice as any).overallDiscountPercent || 0,
      overallDiscountAmount: (invoice as any).overallDiscountAmount || 0,
      detailNote: (invoice as any).detailNote || '',
      warrantyInfo: (invoice as any).warrantyInfo || '',
    });
    this.itemsArray.clear();
    invoice.items?.forEach((item: any) => {
      this.itemsArray.push(this.fb.group(item));
    });
  }

  public calculateTotals() {
    let grossTotal = 0, totalDiscount = 0, gstTotal = 0, advanceTaxTotal = 0;
    this.itemsData.forEach(item => {
      grossTotal += item.grossTotal || 0;
      totalDiscount += (item.discount1Amount || 0) + (item.discount2Amount || 0);
      gstTotal += item.gstAmount || 0;
      advanceTaxTotal += item.advanceTaxAmount || 0;
    });
    const overallDiscPct = this.salesForm.get('overallDiscountPercent')?.value || 0;
    const overallDiscAmt = this.salesForm.get('overallDiscountAmount')?.value || 0;
    const additionalDiscount = overallDiscPct > 0 ? grossTotal * (overallDiscPct / 100) : overallDiscAmt;
    totalDiscount += additionalDiscount;
    const subtotal = grossTotal - totalDiscount;
    const netBillTotal = subtotal + gstTotal + advanceTaxTotal;
    const previousBalance = this.salesForm.get('previousBalance')?.value || 0;
    const totalBalance = netBillTotal + previousBalance;
    return {
      grossTotal: this.round(grossTotal),
      totalDiscount: this.round(totalDiscount),
      subtotal: this.round(subtotal),
      gstTotal: this.round(gstTotal),
      advanceTaxTotal: this.round(advanceTaxTotal),
      netBillTotal: this.round(netBillTotal),
      previousBalance: this.round(previousBalance),
      totalBalance: this.round(totalBalance),
    };
  }

  public getWarehouseName(id: string): string {
    const wh = this.warehouses.find(w => w._id === id);
    return wh ? wh.name : '—';
  }

  public saveDraft(): void { this.save('draft'); }
  public saveAndConfirm(): void { this.save('confirmed'); }

  private save(status: 'draft' | 'confirmed'): void {
    if (!this.salesForm.get('customerId')?.value) {
      this.toastService.error('Please select a customer');
      return;
    }
    if (this.itemsArray.length === 0) {
      this.toastService.error('Please add at least one item');
      return;
    }
    this.saving = true;
    const formValue = this.salesForm.getRawValue();
    const totals = this.calculateTotals();

    const invoiceData: any = {
      ...formValue,
      type: 'sales',
      status,
      totals: {
        grossTotal: totals.grossTotal,
        discountTotal: totals.totalDiscount,
        gstTotal: totals.gstTotal,
        advanceTaxTotal: totals.advanceTaxTotal,
        netBillTotal: totals.netBillTotal,
      },
      items: this.itemsData.map((item: any) => ({
        itemId: item.itemId,
        itemName: item.itemName,
        itemCode: item.itemCode,
        companyName: item.companyName,
        warehouseId: item.warehouseId,
        batchNumber: item.batchNumber,
        expiryDate: item.expiryDate,
        boxQty: item.boxQuantity,
        unitQty: item.unitQuantity,
        scheme1Qty: item.scheme1Qty,
        scheme2Qty: item.scheme2Qty,
        quantity: item.totalUnitQty,
        totalUnitQty: item.totalUnitQty,
        boxTP: item.saleBoxRate,
        unitTP: item.saleUnitRate,
        unitPrice: item.saleUnitRate || (item.saleBoxRate && item.boxPacking ? item.saleBoxRate / item.boxPacking : 0),
        discount1Percent: item.discount1Percent,
        discount1Amount: item.discount1Amount,
        discount2Percent: item.discount2Percent,
        discount2Amount: item.discount2Amount,
        gstRate: item.gstRate,
        gstTotal: item.gstAmount,
        advanceTaxAmount: item.advanceTaxAmount,
        netAmount: item.netAmount,
      }))
    };
    this.omitEmptyObjectIds(invoiceData, ['salesmanId', 'claimAccountId']);

    const request$ = this.mode === 'create'
      ? this.invoiceService.createSalesInvoice(invoiceData)
      : this.invoiceService.updateSalesInvoice(this.invoiceId!, invoiceData);

    request$.pipe(takeUntil(this.destroy$)).subscribe({
      next: (response: any) => {
        this.saving = false;
        if (response.success) {
          this.toastService.success(`Sales invoice ${this.mode === 'create' ? 'created' : 'updated'} successfully`);
          this.router.navigate(['/sales-invoices']);
        }
      },
      error: (error: any) => {
        this.saving = false;
        this.toastService.error(error?.error?.message || 'Failed to save sales invoice');
      }
    });
  }

  public cancel(): void { this.router.navigate(['/sales-invoices']); }

  private round(n: number): number { return Math.round(n * 100) / 100; }

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
}
