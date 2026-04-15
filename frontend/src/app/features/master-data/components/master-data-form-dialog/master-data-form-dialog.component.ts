import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Observable } from 'rxjs';
import { SupportingMasterService, Warehouse } from '../../services/supporting-master.service';
import { ToastService } from '../../../../shared/services/toast.service';

@Component({
  selector: 'app-master-data-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule,
    MatSelectModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="premium-dialog">
      <h2 mat-dialog-title class="dialog-title">
        <mat-icon>{{ isEditMode ? 'edit' : 'add' }}</mat-icon>
        {{ isEditMode ? 'Edit' : 'Add' }} {{ data.title }}
      </h2>
      
      <mat-dialog-content class="dialog-content">
        <form [formGroup]="form" class="form-container">
          <mat-form-field appearance="outline" class="full-width" *ngIf="data.fields.includes('code')">
            <mat-label>Code</mat-label>
            <input matInput formControlName="code">
            <mat-error *ngIf="form.get('code')?.hasError('required')">Code is required</mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Name</mat-label>
            <input matInput formControlName="name">
            <mat-error *ngIf="form.get('name')?.hasError('required')">Name is required</mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width" *ngIf="data.fields.includes('contactPerson')">
            <mat-label>Contact Person</mat-label>
            <input matInput formControlName="contactPerson">
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width" *ngIf="data.fields.includes('phone')">
            <mat-label>Phone</mat-label>
            <input matInput formControlName="phone">
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width" *ngIf="data.fields.includes('cnic')">
            <mat-label>CNIC</mat-label>
            <input matInput formControlName="cnic">
            <mat-hint>13 digits without dashes</mat-hint>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width" *ngIf="data.fields.includes('fatherName')">
            <mat-label>Father Name</mat-label>
            <input matInput formControlName="fatherName">
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width" *ngIf="data.fields.includes('guarantorCnic')">
            <mat-label>Guarantor CNIC</mat-label>
            <input matInput formControlName="guarantorCnic">
            <mat-hint>13 digits without dashes</mat-hint>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width" *ngIf="data.fields.includes('description')">
            <mat-label>Description</mat-label>
            <textarea matInput formControlName="description" rows="3"></textarea>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width" *ngIf="data.fields.includes('warehouseId')">
            <mat-label>Warehouse</mat-label>
            <mat-select formControlName="warehouseId">
              <mat-option value="">-- None --</mat-option>
              <mat-option *ngFor="let wh of warehouses" [value]="wh._id">
                {{ wh.code }} - {{ wh.name }}
              </mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width" *ngIf="data.fields.includes('region')">
            <mat-label>Region</mat-label>
            <input matInput formControlName="region">
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width" *ngIf="data.fields.includes('townId')">
            <mat-label>Town</mat-label>
            <mat-select formControlName="townId">
              <mat-option *ngFor="let t of towns" [value]="t._id">
                {{ t.name }}
              </mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width" *ngIf="data.fields.includes('groupType')">
            <mat-label>Group Type</mat-label>
            <mat-select formControlName="groupType">
              <mat-option value="A">A</mat-option>
              <mat-option value="B">B</mat-option>
              <mat-option value="C">C</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width" *ngIf="data.fields.includes('companyId')">
            <mat-label>Company</mat-label>
            <mat-select formControlName="companyId">
              <mat-option *ngFor="let c of companies" [value]="c._id">
                {{ c.name }}
              </mat-option>
            </mat-select>
            <mat-error *ngIf="form.get('companyId')?.hasError('required')">Company is required</mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width" *ngIf="data.fields.includes('type')">
            <mat-label>{{ typeFieldLabel }}</mat-label>
            <mat-select formControlName="type">
              <mat-option *ngFor="let option of typeOptions" [value]="option.value">
                {{ option.label }}
              </mat-option>
            </mat-select>
            <mat-error *ngIf="form.get('type')?.hasError('required')">{{ typeFieldLabel }} is required</mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width" *ngIf="data.fields.includes('parentDimensionId')">
            <mat-label>Parent Location</mat-label>
            <mat-select formControlName="parentDimensionId">
              <mat-option value="">Root Location</mat-option>
              <mat-option *ngFor="let dimension of dimensionOptions" [value]="dimension._id">
                {{ dimension.code }} - {{ dimension.name }}
              </mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width" *ngIf="data.fields.includes('group')">
            <mat-label>Group</mat-label>
            <input matInput formControlName="group">
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width" *ngIf="data.fields.includes('schemeFormat')">
            <mat-label>Scheme Format</mat-label>
            <input matInput formControlName="schemeFormat" placeholder="e.g. 12+1">
            <mat-hint>Use format like 12+1 for buy 12 get 1 free</mat-hint>
            <mat-error *ngIf="form.get('schemeFormat')?.hasError('required')">Scheme format is required</mat-error>
            <mat-error *ngIf="form.get('schemeFormat')?.hasError('pattern')">Use format like 12+1</mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width" *ngIf="data.fields.includes('discountPercent')">
            <mat-label>Discount Percent</mat-label>
            <input matInput type="number" min="0" max="100" step="0.01" formControlName="discountPercent">
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width" *ngIf="data.fields.includes('claimAccountId')">
            <mat-label>Claim Account</mat-label>
            <mat-select formControlName="claimAccountId">
              <mat-option value="">-- None --</mat-option>
              <mat-option *ngFor="let account of claimAccounts" [value]="account._id">
                {{ account.name }}
              </mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width" *ngIf="data.fields.includes('startDate')">
            <mat-label>Start Date</mat-label>
            <input matInput type="date" formControlName="startDate">
            <mat-error *ngIf="form.get('startDate')?.hasError('required')">Start date is required</mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width" *ngIf="data.fields.includes('endDate')">
            <mat-label>End Date</mat-label>
            <input matInput type="date" formControlName="endDate">
            <mat-error *ngIf="form.get('endDate')?.hasError('required')">End date is required</mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width" *ngIf="data.fields.includes('minimumQuantity')">
            <mat-label>Minimum Quantity</mat-label>
            <input matInput type="number" min="0" step="1" formControlName="minimumQuantity">
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width" *ngIf="data.fields.includes('maximumQuantity')">
            <mat-label>Maximum Quantity</mat-label>
            <input matInput type="number" min="0" step="1" formControlName="maximumQuantity">
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width" *ngIf="data.fields.includes('categoryId')">
            <mat-label>Category</mat-label>
            <mat-select formControlName="categoryId">
              <mat-option *ngFor="let c of categories" [value]="c._id">
                {{ c.name }}
              </mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width" *ngIf="data.fields.includes('formulaId')">
            <mat-label>Formula</mat-label>
            <mat-select formControlName="formulaId">
              <mat-option *ngFor="let f of formulas" [value]="f._id">
                {{ f.name }}
              </mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width" *ngIf="data.fields.includes('composition')">
            <mat-label>Composition</mat-label>
            <input matInput formControlName="composition">
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width" *ngIf="data.fields.includes('strength')">
            <mat-label>Strength</mat-label>
            <input matInput formControlName="strength">
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width" *ngIf="data.fields.includes('size')">
            <mat-label>Size</mat-label>
            <input matInput formControlName="size">
          </mat-form-field>

          <div class="toggle-container">
            <mat-slide-toggle formControlName="isActive" color="primary">Active Status</mat-slide-toggle>
          </div>
        </form>
      </mat-dialog-content>

      <mat-dialog-actions align="end" class="dialog-actions">
        <button mat-button mat-dialog-close [disabled]="saving" class="cancel-btn">Cancel</button>
        <button mat-raised-button class="submit-btn" (click)="onSubmit()" [disabled]="form.invalid || saving">
          <mat-icon *ngIf="!saving">save</mat-icon>
          <mat-spinner diameter="20" *ngIf="saving" class="btn-spinner"></mat-spinner>
          {{ isEditMode ? 'Update' : 'Create' }}
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .premium-dialog { background: #ffffff; border-radius: 12px; }
    .dialog-title { display: flex; align-items: center; gap: 12px; color: #5e5873; font-weight: 600; padding: 20px 24px !important; border-bottom: 1px solid #ebe9f1; margin: 0 !important; }
    .dialog-title mat-icon { color: #867cf0; }
    .dialog-content { padding: 24px !important; margin: 0 !important; }
    .form-container { display: flex; flex-direction: column; gap: 4px; min-width: 400px; }
    .full-width { width: 100%; }
    ::ng-deep .premium-dialog .mdc-text-field--outlined:not(.mdc-text-field--disabled) .mdc-notched-outline__leading,
    ::ng-deep .premium-dialog .mdc-text-field--outlined:not(.mdc-text-field--disabled) .mdc-notched-outline__notch,
    ::ng-deep .premium-dialog .mdc-text-field--outlined:not(.mdc-text-field--disabled) .mdc-notched-outline__trailing {
      border-color: #867cf0 !important;
    }
    ::ng-deep .premium-dialog .mat-focused .mdc-floating-label,
    ::ng-deep .premium-dialog .mdc-floating-label--float-above {
      color: #867cf0 !important;
      font-weight: 500;
      background: #ffffff;
      padding: 0 4px;
    }
    ::ng-deep .premium-dialog .mat-mdc-input-element,
    ::ng-deep .premium-dialog .mat-mdc-select-value-text {
      color: #5e5873 !important;
      -webkit-text-fill-color: #5e5873 !important;
    }
    ::ng-deep .premium-dialog .mat-mdc-input-element::placeholder {
      color: #867cf0 !important;
      opacity: 0.7;
    }
    .toggle-container { padding: 8px 0; }
    .dialog-actions { padding: 16px 24px !important; border-top: 1px solid #ebe9f1; }
    .cancel-btn { color: #82868b !important; }
    .submit-btn { background: linear-gradient(118deg, #867cf0, rgba(134, 124, 240, 0.8)) !important; color: #fff !important; box-shadow: 0 0 10px 1px rgba(134, 124, 240, 0.4) !important; font-weight: 500; padding: 0 24px !important; height: 40px; }
    .submit-btn:hover { box-shadow: 0 0 14px 2px rgba(134, 124, 240, 0.6) !important; transform: translateY(-1px); }
    .btn-spinner { margin-right: 8px; }
    ::ng-deep .btn-spinner circle { stroke: #ffffff !important; }
  `]
})
export class MasterDataFormDialogComponent implements OnInit {
  form: FormGroup;
  isEditMode = false;
  saving = false;
  warehouses: Warehouse[] = [];
  towns: any[] = [];
  companies: any[] = [];
  categories: any[] = [];
  formulas: any[] = [];
  claimAccounts: any[] = [];
  dimensionOptions: any[] = [];
  typeFieldLabel = 'Type';
  typeOptions: Array<{ value: string; label: string }> = [];
  private typeDefaultValue = '';

  constructor(
    private fb: FormBuilder,
    private supportingService: SupportingMasterService,
    private toastService: ToastService,
    private dialogRef: MatDialogRef<MasterDataFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: {
      type: string;
      title: string;
      fields: string[];
      item?: any
    }
  ) {
    this.isEditMode = !!data.item;
    const typeConfig = this.getTypeConfig(data.type);
    this.typeFieldLabel = typeConfig.label;
    this.typeOptions = typeConfig.options;
    this.typeDefaultValue = typeConfig.defaultValue;
    this.form = this.createForm();
  }

  ngOnInit(): void {
    if (this.data.fields.includes('warehouseId')) {
      this.loadWarehouses();
    }
    if (this.data.fields.includes('townId')) {
      this.loadTowns();
    }
    if (this.data.fields.includes('companyId')) {
      this.loadCompanies();
    }
    if (this.data.fields.includes('claimAccountId')) {
      this.loadClaimAccounts();
    }
    if (this.data.fields.includes('parentDimensionId')) {
      this.loadDimensionOptions();
    }
    if (this.data.fields.includes('categoryId')) {
      this.loadCategories();
    }
    if (this.data.fields.includes('formulaId')) {
      this.loadFormulas();
    }

    if (this.isEditMode && this.data.item) {
      const patchData = { ...this.data.item };
      // Extract _id if warehouseId is populated object
      if (patchData.warehouseId && typeof patchData.warehouseId === 'object') {
        patchData.warehouseId = patchData.warehouseId._id;
      }
      if (patchData.companyId && typeof patchData.companyId === 'object') {
        patchData.companyId = patchData.companyId._id;
      }
      if (!patchData.companyId && patchData.company && typeof patchData.company === 'object') {
        patchData.companyId = patchData.company._id;
      }
      if (patchData.claimAccountId && typeof patchData.claimAccountId === 'object') {
        patchData.claimAccountId = patchData.claimAccountId._id;
      }
      if (patchData.parentDimensionId && typeof patchData.parentDimensionId === 'object') {
        patchData.parentDimensionId = patchData.parentDimensionId._id;
      }
      if (patchData.startDate) {
        patchData.startDate = this.toDateInputValue(patchData.startDate);
      }
      if (patchData.endDate) {
        patchData.endDate = this.toDateInputValue(patchData.endDate);
      }
      this.form.patchValue(patchData);
    }
  }

  private loadWarehouses(): void {
    this.supportingService.getWarehouses({ isActive: true }).subscribe({
      next: (res) => this.warehouses = res.data || [],
      error: () => this.toastService.error('Failed to load warehouses')
    });
  }

  private loadTowns(): void {
    this.supportingService.getTowns().subscribe({
      next: (res) => this.towns = res.data || [],
      error: () => this.toastService.error('Failed to load towns')
    });
  }

  private loadCompanies(): void {
    this.supportingService.getCompanies({ isActive: true }).subscribe({
      next: (res) => this.companies = res.data || [],
      error: () => this.toastService.error('Failed to load companies')
    });
  }

  private loadClaimAccounts(): void {
    this.supportingService.getClaimAccounts({ isActive: true }).subscribe({
      next: (res) => this.claimAccounts = res.data || [],
      error: () => this.toastService.error('Failed to load claim accounts')
    });
  }

  private loadDimensionOptions(): void {
    this.supportingService.getDimensions({ isActive: true, limit: 1000 }).subscribe({
      next: (res) => {
        const currentItemId = this.data.item?._id;
        this.dimensionOptions = (res.data || []).filter((dimension: any) => dimension._id !== currentItemId);
      },
      error: () => this.toastService.error('Failed to load dimension locations')
    });
  }

  private loadCategories(): void {
    this.supportingService.getCategories().subscribe({
      next: (res) => this.categories = res.data || [],
      error: () => this.toastService.error('Failed to load categories')
    });
  }

  private loadFormulas(): void {
    this.supportingService.getFormulas().subscribe({
      next: (res) => this.formulas = res.data || [],
      error: () => this.toastService.error('Failed to load formulas')
    });
  }

  createForm(): FormGroup {
    const group: any = {
      name: ['', [Validators.required, Validators.maxLength(200)]],
      isActive: [true]
    };

    if (this.data.fields.includes('code')) {
      group.code = ['', [Validators.required, Validators.maxLength(20)]];
    }
    if (this.data.fields.includes('contactPerson')) {
      group.contactPerson = ['', Validators.maxLength(100)];
    }
    if (this.data.fields.includes('phone')) {
      group.phone = ['', Validators.maxLength(20)];
    }
    if (this.data.fields.includes('description')) {
      group.description = ['', Validators.maxLength(500)];
    }
    if (this.data.fields.includes('cnic')) {
      group.cnic = ['', [Validators.maxLength(15), Validators.pattern(/^[0-9]{13}$/)]];
    }
    if (this.data.fields.includes('fatherName')) {
      group.fatherName = ['', Validators.maxLength(100)];
    }
    if (this.data.fields.includes('guarantorCnic')) {
      group.guarantorCnic = ['', [Validators.maxLength(15), Validators.pattern(/^[0-9]{13}$/)]];
    }
    if (this.data.fields.includes('warehouseId')) {
      group.warehouseId = [''];
    }
    if (this.data.fields.includes('townId')) {
      group.townId = ['', Validators.required];
    }
    if (this.data.fields.includes('region')) {
      group.region = [''];
    }
    if (this.data.fields.includes('groupType')) {
      group.groupType = [''];
    }
    if (this.data.fields.includes('companyId')) {
      group.companyId = ['', Validators.required];
    }
    if (this.data.fields.includes('type')) {
      group.type = [this.typeDefaultValue, Validators.required];
    }
    if (this.data.fields.includes('parentDimensionId')) {
      group.parentDimensionId = [''];
    }
    if (this.data.fields.includes('group')) {
      group.group = ['', Validators.maxLength(50)];
    }
    if (this.data.fields.includes('schemeFormat')) {
      group.schemeFormat = ['', [Validators.required, Validators.maxLength(50), Validators.pattern(/^\d+\+\d+$/)]];
    }
    if (this.data.fields.includes('discountPercent')) {
      group.discountPercent = [0, [Validators.min(0), Validators.max(100)]];
    }
    if (this.data.fields.includes('claimAccountId')) {
      group.claimAccountId = [''];
    }
    if (this.data.fields.includes('startDate')) {
      group.startDate = ['', Validators.required];
    }
    if (this.data.fields.includes('endDate')) {
      group.endDate = ['', Validators.required];
    }
    if (this.data.fields.includes('minimumQuantity')) {
      group.minimumQuantity = [0, Validators.min(0)];
    }
    if (this.data.fields.includes('maximumQuantity')) {
      group.maximumQuantity = [0, Validators.min(0)];
    }
    if (this.data.fields.includes('categoryId')) {
      group.categoryId = ['', Validators.required];
    }
    if (this.data.fields.includes('formulaId')) {
      group.formulaId = ['', Validators.required];
    }
    if (this.data.fields.includes('composition')) {
      group.composition = [''];
    }
    if (this.data.fields.includes('strength')) {
      group.strength = [''];
    }
    if (this.data.fields.includes('size')) {
      group.size = [''];
    }

    return this.fb.group(group);
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    this.saving = true;
    const formValue = this.preparePayload(this.data.type, this.form.getRawValue());
    const type = this.data.type;

    let request: Observable<any> | null;
    if (this.isEditMode) {
      request = this.getUpdateMethod(type, this.data.item._id, formValue);
    } else {
      request = this.getCreateMethod(type, formValue);
    }

    if (!request) {
      this.toastService.error('Invalid entity type');
      this.saving = false;
      return;
    }

    request.subscribe({
      next: (response: any) => {
        if (response.success) {
          this.toastService.success(`${this.data.title} ${this.isEditMode ? 'updated' : 'created'} successfully`);
          this.dialogRef.close(response.data);
        }
      },
      error: (err: any) => {
        this.toastService.error(this.extractErrorMessage(err) || `Failed to ${this.isEditMode ? 'update' : 'create'} ${this.data.title}`);
        this.saving = false;
      }
    });
  }

  private preparePayload(type: string, formValue: any): any {
    const payload = { ...formValue };

    Object.keys(payload).forEach((key) => {
      if (payload[key] === '') {
        payload[key] = undefined;
      }
    });

    if (type === 'scheme') {
      payload.company = payload.companyId;
      delete payload.companyId;

      if (!payload.claimAccountId) {
        delete payload.claimAccountId;
      }
    }

    return payload;
  }

  private extractErrorMessage(err: any): string | null {
    return err?.error?.error?.message
      || err?.error?.message
      || err?.message
      || null;
  }

  private getTypeConfig(type: string): {
    label: string;
    defaultValue: string;
    options: Array<{ value: string; label: string }>;
  } {
    switch (type) {
      case 'scheme':
        return {
          label: 'Scheme Type',
          defaultValue: '',
          options: [
            { value: 'scheme1', label: 'Scheme 1' },
            { value: 'scheme2', label: 'Scheme 2' }
          ]
        };
      case 'dimension':
        return {
          label: 'Dimension Type',
          defaultValue: 'BRANCH',
          options: [
            { value: 'BRANCH', label: 'Branch' },
            { value: 'REGION', label: 'Region' },
            { value: 'TERRITORY', label: 'Territory' },
            { value: 'COST_CENTER', label: 'Cost Center' },
            { value: 'DEPARTMENT', label: 'Department' }
          ]
        };
      case 'account-head':
        return {
          label: 'Head Type',
          defaultValue: 'Expenses',
          options: [
            { value: 'Opening Balance', label: 'Opening Balance' },
            { value: 'Purchase', label: 'Purchase' },
            { value: 'Sales', label: 'Sales' },
            { value: 'Expenses', label: 'Expenses' },
            { value: 'Cash', label: 'Cash' },
            { value: 'Tax', label: 'Tax' },
            { value: 'Investor', label: 'Investor' },
            { value: 'Capital', label: 'Capital' }
          ]
        };
      default:
        return {
          label: 'Type',
          defaultValue: '',
          options: []
        };
    }
  }

  private toDateInputValue(value: string | Date): string {
    return new Date(value).toISOString().split('T')[0];
  }

  private getCreateMethod(type: string, data: any): Observable<any> | null {
    switch (type) {
      case 'transporter': return this.supportingService.createTransporter(data);
      case 'claim-account': return this.supportingService.createClaimAccount(data);
      case 'dimension': return this.supportingService.createDimension(data);
      case 'salesman': return this.supportingService.createSalesman(data);
      case 'warehouse': return this.supportingService.createWarehouse(data);
      case 'town': return this.supportingService.createTown(data);
      case 'category': return this.supportingService.createCategory(data);
      case 'formula': return this.supportingService.createFormula(data);
      case 'business-type': return this.supportingService.createBusinessType(data);
      case 'account-head': return this.supportingService.createAccountHead(data);
      case 'scheme': return this.supportingService.createScheme(data);
      case 'area': return this.supportingService.createArea(data);
      case 'customer-type': return this.supportingService.createCustomerType(data);
      case 'designation': return this.supportingService.createDesignation(data);
      case 'company': return this.supportingService.createCompany(data);
      case 'company-group': return this.supportingService.createCompanyGroup(data);
      case 'formula-size': return this.supportingService.createFormulaSize(data);
      case 'sub-category': return this.supportingService.createSubCategory(data);
      default: return null;
    }
  }

  private getUpdateMethod(type: string, id: string, data: any): Observable<any> | null {
    switch (type) {
      case 'transporter': return this.supportingService.updateTransporter(id, data);
      case 'claim-account': return this.supportingService.updateClaimAccount(id, data);
      case 'dimension': return this.supportingService.updateDimension(id, data);
      case 'salesman': return this.supportingService.updateSalesman(id, data);
      case 'warehouse': return this.supportingService.updateWarehouse(id, data);
      case 'town': return this.supportingService.updateTown(id, data);
      case 'category': return this.supportingService.updateCategory(id, data);
      case 'formula': return this.supportingService.updateFormula(id, data);
      case 'business-type': return this.supportingService.updateBusinessType(id, data);
      case 'account-head': return this.supportingService.updateAccountHead(id, data);
      case 'scheme': return this.supportingService.updateScheme(id, data);
      case 'area': return this.supportingService.updateArea(id, data);
      case 'customer-type': return this.supportingService.updateCustomerType(id, data);
      case 'designation': return this.supportingService.updateDesignation(id, data);
      case 'company': return this.supportingService.updateCompany(id, data);
      case 'company-group': return this.supportingService.updateCompanyGroup(id, data);
      case 'formula-size': return this.supportingService.updateFormulaSize(id, data);
      case 'sub-category': return this.supportingService.updateSubCategory(id, data);
      default: return null;
    }
  }
}
