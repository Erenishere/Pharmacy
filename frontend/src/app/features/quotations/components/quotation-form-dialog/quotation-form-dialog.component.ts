import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { QuotationService, Quotation } from '../../quotation.service';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Component({
  selector: 'app-quotation-form-dialog',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatDialogModule, MatButtonModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatIconModule,
    MatAutocompleteModule, MatTooltipModule, MatProgressSpinnerModule, MatDividerModule
  ],
  template: `
    <h2 mat-dialog-title class="dialog-title">
      <mat-icon style="vertical-align:middle;margin-right:8px">request_quote</mat-icon>
      {{ data.quotation ? 'Edit Quotation' : 'New Quotation' }}
    </h2>

    <mat-dialog-content class="dialog-content" [formGroup]="form">
      <!-- Row 1: Customer + Salesman -->
      <div class="form-row">
        <mat-form-field appearance="outline" style="flex:2">
          <mat-label>Customer *</mat-label>
          <input matInput [matAutocomplete]="custAuto" formControlName="customerSearch">
          <mat-autocomplete #custAuto="matAutocomplete" [displayWith]="displayCustomer"
            (optionSelected)="onCustomerSelect($event.option.value)">
            @for (c of filteredCustomers; track c._id) {
              <mat-option [value]="c">{{ c.name }} — {{ c.town || '' }}</mat-option>
            }
          </mat-autocomplete>
          <mat-error>Customer is required</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Salesman</mat-label>
          <mat-select formControlName="salesmanId">
            <mat-option value="">None</mat-option>
            @for (s of salesmen; track s._id) {
              <mat-option [value]="s._id">{{ s.name }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      </div>

      <!-- Row 2: Reference, Tender, Validity -->
      <div class="form-row">
        <mat-form-field appearance="outline">
          <mat-label>Reference Number</mat-label>
          <input matInput formControlName="referenceNumber">
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Tender Number</mat-label>
          <input matInput formControlName="tenderNumber">
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Validity Period</mat-label>
          <mat-select formControlName="validityPeriod">
            <mat-option value="7 days">7 Days</mat-option>
            <mat-option value="15 days">15 Days</mat-option>
            <mat-option value="One Month">One Month</mat-option>
            <mat-option value="3 months">3 Months</mat-option>
          </mat-select>
        </mat-form-field>
      </div>

      <mat-divider style="margin:12px 0"></mat-divider>

      <!-- Items -->
      <div class="section-title">Quotation Items</div>
      <div class="items-table" formArrayName="items">
        <div class="items-header">
          <span class="col-item">Item</span>
          <span class="col-qty">Quantity</span>
          <span class="col-price">Unit Price</span>
          <span class="col-disc">Disc %</span>
          <span class="col-gst">GST %</span>
          <span class="col-total">Total</span>
          <span class="col-action"></span>
        </div>
        @for (item of itemsArray.controls; track i; let i = $index) {
          <div class="item-row" [formGroupName]="i">
            <mat-form-field appearance="outline" class="col-item">
              <input matInput [matAutocomplete]="itemAuto" formControlName="itemSearch"
                placeholder="Search item...">
              <mat-autocomplete #itemAuto="matAutocomplete" [displayWith]="displayItem"
                (optionSelected)="onItemSelect($event.option.value, i)">
                @for (it of filteredItems; track it._id) {
                  <mat-option [value]="it">{{ it.name }}</mat-option>
                }
              </mat-autocomplete>
            </mat-form-field>
            <mat-form-field appearance="outline" class="col-qty">
              <input matInput type="number" formControlName="quantity" min="0.01" (input)="calcLine(i)">
            </mat-form-field>
            <mat-form-field appearance="outline" class="col-price">
              <input matInput type="number" formControlName="unitPrice" min="0" (input)="calcLine(i)">
            </mat-form-field>
            <mat-form-field appearance="outline" class="col-disc">
              <input matInput type="number" formControlName="discount" min="0" max="100" (input)="calcLine(i)">
            </mat-form-field>
            <mat-form-field appearance="outline" class="col-gst">
              <mat-select formControlName="gstRate" (selectionChange)="calcLine(i)">
                <mat-option [value]="0">0%</mat-option>
                <mat-option [value]="4">4%</mat-option>
                <mat-option [value]="18">18%</mat-option>
              </mat-select>
            </mat-form-field>
            <div class="col-total total-cell">{{ formatCurrency(item.get('lineTotal')?.value) }}</div>
            <button mat-icon-button color="warn" class="col-action" (click)="removeItem(i)" matTooltip="Remove">
              <mat-icon>delete</mat-icon>
            </button>
          </div>
        }
        <button mat-stroked-button color="primary" type="button" (click)="addItem()" style="margin-top:8px">
          <mat-icon>add</mat-icon> Add Item
        </button>
      </div>

      <!-- Totals -->
      <div class="totals-row">
        <span>Subtotal: <strong>{{ formatCurrency(totals.subtotal) }}</strong></span>
        <span>Discount: <strong>{{ formatCurrency(totals.totalDiscount) }}</strong></span>
        <span>GST: <strong>{{ formatCurrency(totals.totalGST) }}</strong></span>
        <span class="grand-total">Grand Total: <strong>PKR {{ formatCurrency(totals.grandTotal) }}</strong></span>
      </div>

      <mat-divider style="margin:12px 0"></mat-divider>

      <!-- Terms & Notes -->
      <div class="form-row">
        <mat-form-field appearance="outline" style="flex:1">
          <mat-label>Terms &amp; Conditions</mat-label>
          <textarea matInput formControlName="termsAndConditions" rows="3"
            placeholder="Payment terms, delivery conditions..."></textarea>
        </mat-form-field>
        <mat-form-field appearance="outline" style="flex:1">
          <mat-label>Notes</mat-label>
          <textarea matInput formControlName="notes" rows="3"></textarea>
        </mat-form-field>
      </div>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-raised-button color="primary" [disabled]="saving || form.invalid" (click)="save()">
        @if (saving) { <mat-spinner diameter="18" style="display:inline-block"></mat-spinner> }
        @else { <mat-icon>save</mat-icon> }
        {{ data.quotation ? 'Update' : 'Create' }} Quotation
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    :host { display: block; }

    .dialog-title {
      min-height: 72px;
      margin: 0;
      padding: 20px 24px;
      display: flex;
      align-items: center;
      gap: 12px;
      border-left: 6px solid var(--indus-primary, #7367f0);
      border-bottom: 1px solid var(--indus-border, #ebe9f1);
      background: linear-gradient(135deg, var(--indus-surface, #ffffff) 0%, var(--indus-surface-muted, #f7f6ff) 100%);
      color: var(--indus-text, #5e5873);
      font-size: 24px;
      font-weight: 800;
      line-height: 1.15;
      letter-spacing: 0;
    }

    .dialog-title mat-icon {
      color: var(--indus-primary, #7367f0);
      margin-right: 0 !important;
    }

    .dialog-content {
      min-width: 760px;
      max-width: 960px;
      padding: 24px !important;
      background: var(--indus-surface, #ffffff);
      color: var(--indus-text, #5e5873);
    }

    .form-row {
      display: flex;
      gap: 16px;
      margin-bottom: 14px;
    }

    .form-row mat-form-field {
      flex: 1;
      min-width: 0;
    }

    .section-title {
      font-weight: 800;
      color: var(--indus-text, #5e5873);
      margin: 16px 0 12px;
      font-size: 15px;
      text-transform: uppercase;
      letter-spacing: 0;
      padding-left: 14px;
      border-left: 4px solid var(--indus-primary, #7367f0);
    }

    .items-table {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .items-header {
      display: grid;
      grid-template-columns: 2fr 0.8fr 1fr 0.7fr 0.7fr 1fr 40px;
      gap: 8px;
      padding: 10px 12px;
      border: 1px solid var(--indus-border, #ebe9f1);
      border-radius: 8px;
      background: var(--indus-surface-muted, #f7f6ff);
      font-size: 12px;
      font-weight: 800;
      color: var(--indus-text-soft, #6e6b7b);
      text-transform: uppercase;
    }

    .item-row {
      display: grid;
      grid-template-columns: 2fr 0.8fr 1fr 0.7fr 0.7fr 1fr 40px;
      gap: 8px;
      align-items: center;
      padding: 8px 10px;
      border: 1px solid var(--indus-border, #ebe9f1);
      border-radius: 8px;
      background: var(--indus-surface, #ffffff);
    }

    .total-cell {
      font-weight: 800;
      color: var(--indus-primary, #7367f0);
      font-size: 13px;
    }

    .totals-row {
      display: flex;
      gap: 24px;
      justify-content: flex-end;
      flex-wrap: wrap;
      margin-top: 12px;
      padding: 14px;
      background: var(--indus-surface-muted, #f7f6ff);
      border: 1px solid var(--indus-border, #ebe9f1);
      border-radius: 8px;
      font-size: 13px;
      color: var(--indus-text-soft, #6e6b7b);
    }

    .grand-total strong {
      font-size: 16px;
      color: var(--indus-primary, #7367f0);
    }

    mat-dialog-actions {
      min-height: 72px;
      padding: 16px 24px !important;
      gap: 12px;
      border-top: 1px solid var(--indus-border, #ebe9f1);
      background: var(--indus-surface-muted, #f7f6ff);
    }

    mat-dialog-actions button[mat-button] {
      min-height: 44px;
      padding: 0 22px;
      border: 1px solid var(--indus-border-strong, #d8d6de);
      border-radius: 8px;
      background: var(--indus-surface, #ffffff);
      color: var(--indus-text, #5e5873);
      font-weight: 700;
    }

    mat-dialog-actions button[mat-raised-button] {
      min-height: 44px;
      border-radius: 8px;
      background: linear-gradient(135deg, var(--indus-primary, #7367f0) 0%, var(--indus-primary-dark, #5e50ee) 100%) !important;
      color: var(--indus-white, #ffffff) !important;
      box-shadow: 0 8px 18px rgba(115, 103, 240, 0.26) !important;
      font-weight: 800;
    }

    :host ::ng-deep .mat-mdc-form-field .mat-mdc-text-field-wrapper {
      min-height: 56px !important;
      background: var(--indus-surface, #ffffff) !important;
      overflow: visible !important;
    }

    :host ::ng-deep .mat-mdc-form-field-infix {
      min-height: 56px !important;
      padding-top: 18px !important;
      padding-bottom: 8px !important;
    }

    :host ::ng-deep .mdc-text-field--outlined .mdc-floating-label--float-above {
      transform: translateY(-34px) scale(0.75) !important;
      background: var(--indus-surface, #ffffff) !important;
      padding: 0 4px !important;
    }
  `]
})
export class QuotationFormDialogComponent implements OnInit {
  form!: FormGroup;
  saving = false;
  customers: any[] = [];
  filteredCustomers: any[] = [];
  salesmen: any[] = [];
  filteredItems: any[] = [];
  totals = { subtotal: 0, totalDiscount: 0, totalGST: 0, grandTotal: 0 };

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private quotationService: QuotationService,
    private dialogRef: MatDialogRef<QuotationFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { quotation?: Quotation }
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      customerId: ['', Validators.required],
      customerSearch: [''],
      salesmanId: [''],
      referenceNumber: [''],
      tenderNumber: [''],
      validityPeriod: ['One Month'],
      termsAndConditions: [''],
      notes: [''],
      items: this.fb.array([])
    });

    this.loadCustomers();
    this.loadSalesmen();

    this.form.get('customerSearch')!.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe(val => {
        if (typeof val === 'string') {
          this.filteredCustomers = this.customers.filter(c =>
            c.name.toLowerCase().includes(val.toLowerCase())
          );
        }
      });

    if (this.data.quotation) {
      this.patchQuotation(this.data.quotation);
    } else {
      this.addItem();
    }
  }

  get itemsArray(): FormArray {
    return this.form.get('items') as FormArray;
  }

  private loadCustomers(): void {
    this.http.get<any>(`${environment.apiUrl}/customers?limit=500`).subscribe(res => {
      this.customers = res.data || res.customers || [];
      this.filteredCustomers = this.customers;
    });
  }

  private loadSalesmen(): void {
    this.http.get<any>(`${environment.apiUrl}/salesmen?limit=200`).subscribe(res => {
      this.salesmen = res.data || res.salesmen || [];
    });
  }

  displayCustomer(c: any): string { return c?.name || ''; }
  displayItem(it: any): string { return it?.name || ''; }

  onCustomerSelect(customer: any): void {
    this.form.patchValue({ customerId: customer._id });
  }

  onItemSelect(item: any, index: number): void {
    const row = this.itemsArray.at(index);
    row.patchValue({
      itemId: item._id,
      itemName: item.name,
      companyName: item.companyName || '',
      boxPacking: item.boxPacking || item.packaging?.unitsPerBox || 1,
      unitTP: item.pricing?.tradePrice || 0,
      unitRetail: item.pricing?.retailPrice || 0,
      unitPrice: item.pricing?.tradePrice || item.pricing?.retailPrice || 0,
      gstRate: item.tax?.gstRate || 18,
      discount: 0,
      quantity: 1
    });
    this.calcLine(index);
  }

  addItem(): void {
    this.itemsArray.push(this.fb.group({
      itemId: ['', Validators.required],
      itemSearch: [''],
      itemName: [''],
      companyName: [''],
      boxPacking: [1],
      unitTP: [0],
      unitRetail: [0],
      quantity: [1, [Validators.required, Validators.min(0.01)]],
      unitPrice: [0, [Validators.required, Validators.min(0)]],
      discount: [0, [Validators.min(0), Validators.max(100)]],
      gstRate: [18],
      gstAmount: [0],
      lineTotal: [0]
    }));

    const lastIdx = this.itemsArray.length - 1;
    this.itemsArray.at(lastIdx).get('itemSearch')!.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe(val => {
        if (typeof val === 'string' && val.length > 1) {
          this.http.get<any>(`${environment.apiUrl}/items?search=${val}&limit=20`).subscribe(res => {
            this.filteredItems = res.data || res.items || [];
          });
        }
      });
  }

  removeItem(index: number): void {
    this.itemsArray.removeAt(index);
    this.recalcTotals();
  }

  calcLine(index: number): void {
    const row = this.itemsArray.at(index);
    const qty = row.get('quantity')?.value || 0;
    const unitPrice = row.get('unitPrice')?.value || 0;
    const discount = row.get('discount')?.value || 0;
    const gstRate = row.get('gstRate')?.value || 0;

    const gross = qty * unitPrice;
    const discAmount = gross * (discount / 100);
    const taxable = gross - discAmount;
    const gstAmount = taxable * (gstRate / 100);
    const lineTotal = taxable + gstAmount;

    row.patchValue({ gstAmount, lineTotal }, { emitEvent: false });
    this.recalcTotals();
  }

  private recalcTotals(): void {
    let subtotal = 0, totalDiscount = 0, totalGST = 0;
    this.itemsArray.controls.forEach(row => {
      const qty = row.get('quantity')?.value || 0;
      const unitPrice = row.get('unitPrice')?.value || 0;
      const discount = row.get('discount')?.value || 0;
      const gstRate = row.get('gstRate')?.value || 0;
      const gross = qty * unitPrice;
      const discAmount = gross * (discount / 100);
      const taxable = gross - discAmount;
      subtotal += gross;
      totalDiscount += discAmount;
      totalGST += taxable * (gstRate / 100);
    });
    this.totals = { subtotal, totalDiscount, totalGST, grandTotal: subtotal - totalDiscount + totalGST };
  }

  private patchQuotation(q: Quotation): void {
    this.form.patchValue({
      customerId: q.customerId?._id || '',
      salesmanId: q.salesmanId?._id || '',
      referenceNumber: q.referenceNumber || '',
      tenderNumber: q.tenderNumber || '',
      validityPeriod: q.validityPeriod || 'One Month',
      termsAndConditions: q.termsAndConditions || '',
      notes: q.notes || ''
    });
    q.items.forEach(item => {
      this.addItem();
      const idx = this.itemsArray.length - 1;
      this.itemsArray.at(idx).patchValue({ ...item });
      this.calcLine(idx);
    });
  }

  formatCurrency(val: number): string {
    return new Intl.NumberFormat('en-PK', { minimumFractionDigits: 0 }).format(val || 0);
  }

  save(): void {
    if (this.form.invalid) return;
    this.saving = true;

    const raw = this.form.value;
    const payload = {
      customerId: raw.customerId,
      salesmanId: raw.salesmanId || undefined,
      referenceNumber: raw.referenceNumber,
      tenderNumber: raw.tenderNumber,
      validityPeriod: raw.validityPeriod,
      termsAndConditions: raw.termsAndConditions,
      notes: raw.notes,
      items: raw.items.map((it: any) => ({
        itemId: it.itemId,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        unitTP: it.unitTP,
        unitRetail: it.unitRetail,
        discount: it.discount,
        gstRate: it.gstRate
      })),
      ...this.totals
    };

    const call = this.data.quotation
      ? this.quotationService.update(this.data.quotation._id, payload)
      : this.quotationService.create(payload);

    call.subscribe({
      next: () => { this.saving = false; this.dialogRef.close(true); },
      error: () => { this.saving = false; }
    });
  }
}
