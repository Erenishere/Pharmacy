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
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { EOrderService, EOrder } from '../../e-order.service';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Component({
  selector: 'app-e-order-form-dialog',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatDialogModule, MatButtonModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatIconModule,
    MatAutocompleteModule, MatTooltipModule, MatProgressSpinnerModule
  ],
  template: `
    <div class="e-order-dialog">
      <div class="header-banner">
        <div class="banner-title">
          <mat-icon>shopping_cart</mat-icon>
          <div class="banner-text">
            <h2>{{ data.order ? 'Edit E-Order' : 'New E-Order' }}</h2>
            <p>{{ data.order ? 'Update order details and line items' : 'Create a new order booking with line items' }}</p>
          </div>
        </div>
        <button mat-icon-button mat-dialog-close class="close-btn" matTooltip="Close">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <mat-dialog-content class="dense-content" [formGroup]="form">
        <div class="form-section">
          <div class="section-title">
            <mat-icon>person_search</mat-icon>
            Customer & Salesman
          </div>
          <div class="form-row">
            <mat-form-field appearance="outline" class="customer-field">
              <mat-label>Customer *</mat-label>
              <input matInput [matAutocomplete]="custAuto" formControlName="customerSearch">
              <mat-icon matPrefix>search</mat-icon>
              <mat-autocomplete #custAuto="matAutocomplete" [displayWith]="displayCustomer"
                (optionSelected)="onCustomerSelect($event.option.value)">
                @for (c of filteredCustomers; track c._id) {
                  <mat-option [value]="c">{{ c.name }} - {{ c.town || '' }}</mat-option>
                }
              </mat-autocomplete>
              <mat-error>Customer is required</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline" class="salesman-field">
              <mat-label>Salesman</mat-label>
              <mat-select formControlName="salesmanId">
                <mat-option value="">None</mat-option>
                @for (s of salesmen; track s._id) {
                  <mat-option [value]="s._id">{{ s.name }}</mat-option>
                }
              </mat-select>
              <mat-icon matPrefix>badge</mat-icon>
            </mat-form-field>
          </div>
        </div>

        <div class="form-section">
          <div class="section-title">
            <mat-icon>list_alt</mat-icon>
            Order Items
          </div>

          <div class="items-table" formArrayName="items">
            <div class="items-header">
              <span class="col-item">Item</span>
              <span class="col-box">Box Qty</span>
              <span class="col-unit">Unit Qty</span>
              <span class="col-price">Unit Price</span>
              <span class="col-disc">Disc %</span>
              <span class="col-gst">GST %</span>
              <span class="col-total">Total</span>
              <span class="col-action"></span>
            </div>

            @for (item of itemsArray.controls; track i; let i = $index) {
              <div class="item-row" [formGroupName]="i">
                <mat-form-field appearance="outline" class="col-item">
                  <input matInput [matAutocomplete]="itemAuto" formControlName="itemSearch" placeholder="Search item...">
                  <mat-icon matPrefix>inventory_2</mat-icon>
                  <mat-autocomplete #itemAuto="matAutocomplete" [displayWith]="displayItem"
                    (optionSelected)="onItemSelect($event.option.value, i)">
                    @for (it of filteredItems; track it._id) {
                      <mat-option [value]="it">{{ it.name }} - {{ it.code }}</mat-option>
                    }
                  </mat-autocomplete>
                </mat-form-field>

                <mat-form-field appearance="outline" class="col-box">
                  <input matInput type="number" formControlName="boxQuantity" min="0" (input)="calcLine(i)">
                </mat-form-field>

                <mat-form-field appearance="outline" class="col-unit">
                  <input matInput type="number" formControlName="unitQuantity" min="0" (input)="calcLine(i)">
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

                <button mat-icon-button color="warn" class="col-action" type="button"
                  (click)="removeItem(i)" matTooltip="Remove line">
                  <mat-icon>delete</mat-icon>
                </button>
              </div>
            }

            <button mat-stroked-button color="primary" class="add-line-btn" type="button" (click)="addItem()">
              <mat-icon>add</mat-icon>
              Add Item
            </button>
          </div>

          <div class="totals-row">
            <span>Subtotal: <strong>{{ formatCurrency(totals.subtotal) }}</strong></span>
            <span>Discount: <strong>{{ formatCurrency(totals.totalDiscount) }}</strong></span>
            <span>GST: <strong>{{ formatCurrency(totals.totalGST) }}</strong></span>
            <span class="grand-total">Grand Total: <strong>PKR {{ formatCurrency(totals.grandTotal) }}</strong></span>
          </div>
        </div>

        <div class="form-section">
          <div class="section-title">
            <mat-icon>notes</mat-icon>
            Additional Notes
          </div>
          <mat-form-field appearance="outline" class="full-width notes-field">
            <mat-label>Notes</mat-label>
            <textarea matInput formControlName="notes" rows="3"></textarea>
          </mat-form-field>
        </div>
      </mat-dialog-content>

      <mat-dialog-actions align="end" class="dialog-footer">
        <button mat-button mat-dialog-close>Cancel</button>
        <button mat-raised-button color="primary" [disabled]="saving || form.invalid" (click)="save()">
          @if (saving) {
            <mat-spinner diameter="18" style="display:inline-block; margin-right: 8px;"></mat-spinner>
          } @else {
            <mat-icon>save</mat-icon>
          }
          {{ data.order ? 'Update' : 'Create' }} Order
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .e-order-dialog {
      width: 100%;
      min-width: 0;
      max-width: 1500px;
      background: #ffffff;
      display: flex;
      flex-direction: column;
      height: 100%;
      border-radius: 12px;
      overflow: hidden;
    }

    .e-order-dialog .mat-icon,
    .e-order-dialog mat-icon {
      font-family: 'Material Icons' !important;
      font-weight: normal !important;
      font-style: normal !important;
      line-height: 1;
      letter-spacing: normal;
      text-transform: none;
      white-space: nowrap;
      word-wrap: normal;
      direction: ltr;
      -webkit-font-feature-settings: 'liga';
      font-feature-settings: 'liga';
      font-variant-ligatures: normal;
      -webkit-font-smoothing: antialiased;
    }

    .header-banner {
      background: #ffffff;
      border-bottom: 1px solid #ebe9f1;
      padding: 16px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      flex-shrink: 0;
    }

    .banner-title {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 0;
    }

    .banner-title > mat-icon {
      font-size: 30px;
      width: 30px;
      height: 30px;
      color: #867cf0;
      background: rgba(134, 124, 240, 0.1);
      border-radius: 10px;
      padding: 8px;
      flex-shrink: 0;
    }

    .banner-text h2 {
      margin: 0;
      font-size: 1.35rem;
      color: #5e5873;
      font-weight: 700;
      line-height: 1.2;
    }

    .banner-text p {
      margin: 3px 0 0;
      color: #82868b;
      font-size: 0.92rem;
    }

    .close-btn {
      color: #82868b;
    }

    .close-btn:hover {
      background-color: rgba(130, 134, 139, 0.08);
    }

    .dense-content {
      padding: 20px !important;
      background: #f8f9fc;
      overflow: auto;
      display: flex;
      flex-direction: column;
      gap: 18px;
    }

    .form-section {
      background: #ffffff;
      border: 1px solid #ebe9f1;
      border-radius: 10px;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.03);
      padding: 18px;
    }

    .section-title {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0 0 14px;
      font-size: 1rem;
      font-weight: 700;
      color: #5e5873;
      position: relative;
      padding-left: 12px;
    }

    .section-title::before {
      content: '';
      position: absolute;
      left: 0;
      top: 50%;
      transform: translateY(-50%);
      width: 4px;
      height: 16px;
      border-radius: 4px;
      background: #867cf0;
    }

    .section-title mat-icon {
      color: #867cf0;
    }

    .form-row {
      display: grid;
      grid-template-columns: minmax(0, 2fr) minmax(220px, 1fr);
      gap: 14px;
      align-items: start;
    }

    .full-width {
      width: 100%;
    }

    .items-table {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .items-header {
      display: grid;
      grid-template-columns: 2fr 0.8fr 0.8fr 1fr 0.7fr 0.7fr 1fr 42px;
      gap: 8px;
      padding: 10px 10px;
      border-radius: 8px;
      background: #f3f2f7;
      border: 1px solid #ebe9f1;
      font-size: 0.76rem;
      font-weight: 700;
      color: #6e6b7b;
      letter-spacing: 0.45px;
      text-transform: uppercase;
    }

    .item-row {
      display: grid;
      grid-template-columns: 2fr 0.8fr 0.8fr 1fr 0.7fr 0.7fr 1fr 42px;
      gap: 8px;
      align-items: center;
      padding: 8px 10px;
      border-radius: 8px;
      border: 1px solid #ebe9f1;
      background: #ffffff;
    }

    .item-row .mat-mdc-form-field {
      width: 100%;
    }

    .total-cell {
      font-weight: 700;
      color: #867cf0;
      font-size: 0.94rem;
      text-align: right;
      padding-right: 4px;
    }

    .add-line-btn {
      align-self: flex-start;
      margin-top: 4px;
      border-color: #867cf0 !important;
      color: #867cf0 !important;
      font-weight: 700;
      border-radius: 8px !important;
    }

    .add-line-btn:hover {
      background: rgba(134, 124, 240, 0.08) !important;
    }

    .totals-row {
      margin-top: 12px;
      display: flex;
      gap: 20px;
      justify-content: flex-end;
      flex-wrap: wrap;
      padding: 12px 14px;
      background: #f8f9fc;
      border-radius: 8px;
      border: 1px solid #ebe9f1;
      font-size: 0.9rem;
      color: #6e6b7b;
    }

    .totals-row strong {
      color: #5e5873;
      font-weight: 700;
    }

    .grand-total strong {
      color: #867cf0;
      font-size: 1.04rem;
    }

    .dialog-footer {
      margin: 0;
      padding: 14px 20px;
      border-top: 1px solid #ebe9f1;
      background: #ffffff;
      display: flex;
      gap: 10px;
      flex-shrink: 0;
    }

    .dialog-footer .mat-mdc-button {
      color: #82868b;
      font-weight: 600;
      height: 44px;
      border-radius: 8px;
      padding: 0 20px;
    }

    .dialog-footer .mat-mdc-raised-button {
      height: 44px;
      border-radius: 8px;
      padding: 0 24px;
      font-weight: 700;
      color: #ffffff !important;
      background: linear-gradient(118deg, #867cf0, #7367f0) !important;
      box-shadow: 0 4px 14px rgba(115, 103, 240, 0.4) !important;
    }

    .dialog-footer .mat-mdc-raised-button:hover:not(:disabled) {
      box-shadow: 0 6px 20px rgba(115, 103, 240, 0.5) !important;
      transform: translateY(-2px);
    }

    .dialog-footer .mat-mdc-raised-button:disabled {
      background: #eaebf0 !important;
      box-shadow: none !important;
      color: #b9b9c3 !important;
    }

    ::ng-deep .e-order-dialog .mat-mdc-form-field .mat-mdc-text-field-wrapper {
      min-height: 56px !important;
      background-color: #fcfcfd !important;
      overflow: visible !important;
    }

    ::ng-deep .e-order-dialog .mat-mdc-form-field-infix {
      min-height: 56px !important;
      padding-top: 18px !important;
      padding-bottom: 8px !important;
    }

    ::ng-deep .e-order-dialog .mdc-text-field--outlined .mdc-floating-label--float-above {
      transform: translateY(-34px) scale(0.75) !important;
      background: #fcfcfd !important;
      padding: 0 4px !important;
    }

    ::ng-deep .e-order-dialog .mdc-notched-outline__leading,
    ::ng-deep .e-order-dialog .mdc-notched-outline__notch,
    ::ng-deep .e-order-dialog .mdc-notched-outline__trailing {
      border-color: #c9c8d3 !important;
      border-width: 1px !important;
    }

    ::ng-deep .e-order-dialog .mat-mdc-form-field.mat-focused .mdc-notched-outline__leading,
    ::ng-deep .e-order-dialog .mat-mdc-form-field.mat-focused .mdc-notched-outline__notch,
    ::ng-deep .e-order-dialog .mat-mdc-form-field.mat-focused .mdc-notched-outline__trailing {
      border-color: #867cf0 !important;
      border-width: 2px !important;
    }

    ::ng-deep .e-order-dialog .mat-mdc-form-field-icon-prefix,
    ::ng-deep .e-order-dialog .mat-mdc-form-field-icon-suffix,
    ::ng-deep .e-order-dialog .mat-mdc-select-arrow {
      color: #867cf0 !important;
    }

    :host ::ng-deep .mat-mdc-dialog-container .mat-mdc-dialog-surface {
      background: #ffffff !important;
      border-radius: 12px !important;
      overflow: hidden !important;
    }

    @media (max-width: 1200px) {
      .items-header,
      .item-row {
        grid-template-columns: 1.8fr 0.8fr 0.8fr 0.9fr 0.7fr 0.7fr 0.9fr 38px;
      }
    }

    @media (max-width: 992px) {
      .header-banner {
        padding: 14px 16px;
      }

      .banner-text h2 {
        font-size: 1.16rem;
      }

      .banner-text p {
        font-size: 0.84rem;
      }

      .dense-content {
        padding: 14px !important;
      }

      .form-row {
        grid-template-columns: 1fr;
      }

      .items-header {
        display: none;
      }

      .item-row {
        grid-template-columns: 1fr 1fr;
      }

      .col-item,
      .col-total {
        grid-column: 1 / -1;
      }

      .total-cell {
        text-align: left;
        padding-left: 2px;
      }
    }
  `]
})
export class EOrderFormDialogComponent implements OnInit {
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
    private eOrderService: EOrderService,
    private dialogRef: MatDialogRef<EOrderFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { order?: EOrder }
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      customerId: ['', Validators.required],
      customerSearch: [''],
      salesmanId: [''],
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

    if (this.data.order) {
      this.patchOrder(this.data.order);
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

  displayCustomer(c: any): string {
    return c?.name || '';
  }

  displayItem(it: any): string {
    return it?.name || '';
  }

  onCustomerSelect(customer: any): void {
    this.form.patchValue({ customerId: customer._id });
  }

  onItemSelect(item: any, index: number): void {
    const row = this.itemsArray.at(index);
    row.patchValue({
      itemId: item._id,
      itemName: item.name,
      boxPacking: item.boxPacking || item.packaging?.unitsPerBox || 1,
      unitPrice: item.pricing?.tradePrice || item.pricing?.retailPrice || 0,
      gstRate: item.tax?.gstRate || 18,
      discount: 0
    });
    this.calcLine(index);
  }

  addItem(): void {
    this.itemsArray.push(this.fb.group({
      itemId: ['', Validators.required],
      itemSearch: [''],
      itemName: [''],
      boxPacking: [1],
      boxQuantity: [0],
      unitQuantity: [0],
      unitPrice: [0, [Validators.required, Validators.min(0)]],
      discount: [0],
      gstRate: [18],
      gstAmount: [0],
      scheme1Quantity: [0],
      scheme2Quantity: [0],
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
    const boxPacking = row.get('boxPacking')?.value || 1;
    const boxQty = row.get('boxQuantity')?.value || 0;
    const unitQty = row.get('unitQuantity')?.value || 0;
    const unitPrice = row.get('unitPrice')?.value || 0;
    const discount = row.get('discount')?.value || 0;
    const gstRate = row.get('gstRate')?.value || 0;

    const totalUnits = (boxQty * boxPacking) + unitQty;
    const gross = totalUnits * unitPrice;
    const discAmount = gross * (discount / 100);
    const taxable = gross - discAmount;
    const gstAmount = taxable * (gstRate / 100);
    const lineTotal = taxable + gstAmount;

    row.patchValue({ gstAmount, lineTotal }, { emitEvent: false });
    this.recalcTotals();
  }

  private recalcTotals(): void {
    let subtotal = 0;
    let totalDiscount = 0;
    let totalGST = 0;

    this.itemsArray.controls.forEach(row => {
      const boxPacking = row.get('boxPacking')?.value || 1;
      const boxQty = row.get('boxQuantity')?.value || 0;
      const unitQty = row.get('unitQuantity')?.value || 0;
      const unitPrice = row.get('unitPrice')?.value || 0;
      const discount = row.get('discount')?.value || 0;
      const gstRate = row.get('gstRate')?.value || 0;
      const totalUnits = (boxQty * boxPacking) + unitQty;
      const gross = totalUnits * unitPrice;
      const discAmount = gross * (discount / 100);
      const taxable = gross - discAmount;
      subtotal += gross;
      totalDiscount += discAmount;
      totalGST += taxable * (gstRate / 100);
    });

    this.totals = { subtotal, totalDiscount, totalGST, grandTotal: subtotal - totalDiscount + totalGST };
  }

  private patchOrder(order: EOrder): void {
    this.form.patchValue({
      customerId: order.customerId?._id || '',
      salesmanId: order.salesmanId?._id || '',
      notes: order.notes || ''
    });
    order.items.forEach(item => {
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
      notes: raw.notes,
      items: raw.items.map((it: any) => ({
        itemId: it.itemId,
        boxPacking: it.boxPacking,
        boxQuantity: it.boxQuantity,
        unitQuantity: it.unitQuantity,
        unitPrice: it.unitPrice,
        discount: it.discount,
        gstRate: it.gstRate,
        scheme1Quantity: it.scheme1Quantity,
        scheme2Quantity: it.scheme2Quantity
      })),
      ...this.totals
    };

    const call = this.data.order
      ? this.eOrderService.update(this.data.order._id, payload)
      : this.eOrderService.create(payload);

    call.subscribe({
      next: () => {
        this.saving = false;
        this.dialogRef.close(true);
      },
      error: () => {
        this.saving = false;
      }
    });
  }
}
