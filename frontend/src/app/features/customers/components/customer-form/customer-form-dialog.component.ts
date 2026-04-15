import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { CustomerService } from '../../services/customer.service';
import { ToastService } from '../../../../shared/services/toast.service';
import { SupportingMasterService, Dimension, Town, Area, AccountHead, CustomerType as SupportCustomerType, Designation, Salesman } from '../../../master-data/services/supporting-master.service';
import { Customer, CustomerType, AccountType, CustomerCreateRequest, CustomerUpdateRequest } from '../../../../core/models/customer.model';

@Component({
    selector: 'app-customer-form-dialog',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatDialogModule,
        MatButtonModule,
        MatInputModule,
        MatSelectModule,
        MatSlideToggleModule,
        MatIconModule,
        MatProgressSpinnerModule,
        MatTabsModule
    ],
    template: `
        <div class="premium-account-dialog">
            <div class="dialog-header">
                <div class="title-section">
                    <div class="header-icon">
                        <mat-icon>{{ isEditMode ? 'edit' : 'person_add' }}</mat-icon>
                    </div>
                    <div class="text-group">
                        <h2>{{ isEditMode ? 'Modify Customer Profile' : 'New Customer Registration' }}</h2>
                        <span class="subtitle">Enter the details below to maintain accurate business records</span>
                    </div>
                </div>
                <button mat-icon-button mat-dialog-close class="close-btn">
                    <mat-icon>close</mat-icon>
                </button>
            </div>

            <mat-dialog-content class="dialog-content">
                <form [formGroup]="customerForm" class="account-grid-form">
                    <!-- Section 1: Core Account Identity -->
                    <div class="form-section main-info">
                        <div class="section-title">
                            <mat-icon>admin_panel_settings</mat-icon>
                            <span>Primary Classification</span>
                        </div>
                        
                        <div class="grid-row three-cols">
                            <mat-form-field appearance="outline">
                                <mat-label>Account Category</mat-label>
                                <mat-select formControlName="accountType" required (selectionChange)="onAccountTypeChange()">
                                    <mat-option *ngFor="let type of accountTypes" [value]="type.value">
                                        {{ type.label }}
                                    </mat-option>
                                </mat-select>
                            </mat-form-field>

                            <mat-form-field appearance="outline" *ngIf="isEmployeeType()">
                                <mat-label>Employment Role</mat-label>
                                <mat-select formControlName="employeeAccountType">
                                    <mat-option value="account_manager">Account Manager</mat-option>
                                    <mat-option value="sub_account">Sub Account</mat-option>
                                    <mat-option value="employee_account">General Staff</mat-option>
                                </mat-select>
                            </mat-form-field>

                            <mat-form-field appearance="outline">
                                <mat-label>Branch / Warehouse</mat-label>
                                <mat-select formControlName="dimensionId">
                                    <mat-option *ngFor="let d of dimensions" [value]="d._id">{{ d.name }}</mat-option>
                                </mat-select>
                            </mat-form-field>
                        </div>

                        <div class="grid-row three-cols">
                             <mat-form-field appearance="outline">
                                <mat-label>Ledger Head</mat-label>
                                <mat-select formControlName="accountHeadId">
                                    <mat-option *ngFor="let h of accountHeads" [value]="h._id">{{ h.name }}</mat-option>
                                </mat-select>
                            </mat-form-field>

                            <mat-form-field appearance="outline">
                                <mat-label>Business Type</mat-label>
                                <mat-select formControlName="customerTypeId">
                                    <mat-option *ngFor="let ct of customerTypeList" [value]="ct._id">{{ ct.name }}</mat-option>
                                </mat-select>
                            </mat-form-field>

                            <mat-form-field appearance="outline" *ngIf="customerForm.get('employeeAccountType')?.value === 'sub_account'">
                                <mat-label>Managed By (Parent)</mat-label>
                                <mat-select formControlName="parentAccountId">
                                    <mat-option *ngFor="let acc of admins" [value]="acc._id">{{ acc.name }}</mat-option>
                                </mat-select>
                            </mat-form-field>
                        </div>

                        <div class="grid-row two-cols">
                            <mat-form-field appearance="outline">
                                <mat-label>FullName (International)</mat-label>
                                <input matInput formControlName="name" required placeholder="e.g. John Doe">
                            </mat-form-field>
                            <mat-form-field appearance="outline">
                                <mat-label>FullName (Regional/Local)</mat-label>
                                <input matInput formControlName="nameUrdu" dir="rtl" placeholder="مقامی زبان میں نام">
                            </mat-form-field>
                        </div>
                    </div>

                    <!-- Section 2: Location & Contact -->
                    <div class="form-section location-info">
                        <div class="section-title">
                            <mat-icon>map</mat-icon>
                            <span>GIS & Contact Matrix</span>
                        </div>

                        <div class="grid-row three-cols">
                            <mat-form-field appearance="outline">
                                <mat-label>District / Town</mat-label>
                                <mat-select formControlName="townId" (selectionChange)="onTownChange($event.value)">
                                    <mat-option *ngFor="let t of towns" [value]="t._id">{{ t.name }}</mat-option>
                                </mat-select>
                            </mat-form-field>

                            <mat-form-field appearance="outline">
                                <mat-label>Territory / Beat</mat-label>
                                <mat-select formControlName="areaId">
                                    <mat-option *ngFor="let a of filteredAreas" [value]="a._id">{{ a.name }}</mat-option>
                                </mat-select>
                            </mat-form-field>

                            <mat-form-field appearance="outline">
                                <mat-label>Account Executive</mat-label>
                                <mat-select formControlName="assignedSalesmanId">
                                    <mat-option *ngFor="let s of salesmen" [value]="s._id">{{ s.name }}</mat-option>
                                </mat-select>
                            </mat-form-field>
                        </div>

                        <div class="grid-row three-cols">
                            <mat-form-field appearance="outline">
                                <mat-label>Primary Hotlink</mat-label>
                                <mat-icon matPrefix>phone_iphone</mat-icon>
                                <input matInput formControlName="phone">
                            </mat-form-field>
                            <mat-form-field appearance="outline">
                                <mat-label>Alternate Line</mat-label>
                                <input matInput formControlName="phone1">
                            </mat-form-field>
                            <mat-form-field appearance="outline">
                                <mat-label>Store WhatsApp</mat-label>
                                <mat-icon matPrefix>whatsapp</mat-icon>
                                <input matInput formControlName="phone2">
                            </mat-form-field>
                        </div>

                        <mat-form-field appearance="outline" class="full-width">
                            <mat-label>Registered Physical Address</mat-label>
                            <textarea matInput formControlName="address" rows="2"></textarea>
                        </mat-form-field>
                    </div>

                    <!-- Section 3: Financial & Governance -->
                    <div class="form-section financial-info">
                        <div class="section-title">
                            <mat-icon>account_balance_wallet</mat-icon>
                            <span>Trade & Compliance Profile</span>
                        </div>

                        <div class="grid-row four-cols">
                            <mat-form-field appearance="outline">
                                <mat-label>Credit Threshold</mat-label>
                                <mat-icon matPrefix>trending_up</mat-icon>
                                <input matInput type="number" formControlName="creditLimit">
                            </mat-form-field>
                            <mat-form-field appearance="outline" formGroupName="businessDetails">
                                <mat-label>Aging Limit (Days)</mat-label>
                                <input matInput type="number" formControlName="creditDaysLimit">
                            </mat-form-field>
                            <mat-form-field appearance="outline" formGroupName="businessDetails">
                                <mat-label>Opening Bal</mat-label>
                                <input matInput type="number" formControlName="openingBalance">
                            </mat-form-field>
                             <mat-form-field appearance="outline" formGroupName="businessDetails">
                                <mat-label>Ledger Type</mat-label>
                                <mat-select formControlName="balanceType">
                                    <mat-option value="debit">Receivable (+)</mat-option>
                                    <mat-option value="credit">Payable (-)</mat-option>
                                </mat-select>
                            </mat-form-field>
                        </div>

                        <div class="grid-row three-cols" formGroupName="financialInfo">
                            <mat-form-field appearance="outline">
                                <mat-label>Tax ID / NTN</mat-label>
                                <input matInput formControlName="ntn">
                            </mat-form-field>
                            <mat-form-field appearance="outline">
                                <mat-label>Sales Tax No / STRN</mat-label>
                                <input matInput formControlName="strn">
                            </mat-form-field>
                            <div class="toggle-cell">
                                <mat-slide-toggle formControlName="isNonFiler">Non-Filer Entity</mat-slide-toggle>
                            </div>
                        </div>
                    </div>

                    <!-- Section 4: Employee Records (Contextual) -->
                    <div class="form-section employee-biodata" *ngIf="isEmployeeType()" formGroupName="employeeBiodata">
                        <div class="section-title">
                            <mat-icon>history_edu</mat-icon>
                            <span>Human Resource Records</span>
                        </div>

                        <div class="grid-row three-cols">
                            <mat-form-field appearance="outline">
                                <mat-label>Father / Guardian</mat-label>
                                <input matInput formControlName="fatherName">
                            </mat-form-field>
                            <mat-form-field appearance="outline">
                                <mat-label>Guardian Identity No</mat-label>
                                <input matInput formControlName="fatherNIC">
                            </mat-form-field>
                             <mat-form-field appearance="outline">
                                <mat-label>Corporate Title</mat-label>
                                <mat-select formControlName="designationId">
                                    <mat-option *ngFor="let des of designations" [value]="des._id">{{ des.name }}</mat-option>
                                </mat-select>
                            </mat-form-field>
                        </div>

                         <div class="grid-row three-cols">
                            <mat-form-field appearance="outline">
                                <mat-label>Joining Date</mat-label>
                                <input matInput type="date" formControlName="dateOfAppointment">
                            </mat-form-field>
                            <mat-form-field appearance="outline">
                                <mat-label>Remuneration (Basic)</mat-label>
                                <input matInput type="number" formControlName="basicPay">
                            </mat-form-field>
                             <mat-form-field appearance="outline">
                                <mat-label>Vertical Experience</mat-label>
                                <input matInput formControlName="experience" placeholder="e.g. 5 Years">
                            </mat-form-field>
                        </div>

                        <div class="grid-row three-cols">
                            <mat-form-field appearance="outline">
                                <mat-label>Guarantor Legal Name</mat-label>
                                <input matInput formControlName="guarantorName">
                            </mat-form-field>
                            <mat-form-field appearance="outline">
                                <mat-label>Guarantor CNIC</mat-label>
                                <input matInput formControlName="guarantorNIC">
                            </mat-form-field>
                             <mat-form-field appearance="outline">
                                <mat-label>Guarantor Contact</mat-label>
                                <input matInput formControlName="guarantorPhone">
                            </mat-form-field>
                        </div>
                    </div>
                </form>
            </mat-dialog-content>

            <mat-dialog-actions align="end" class="dialog-footer">
                <div class="active-status">
                    <mat-slide-toggle [formControl]="$any(customerForm.get('isActive'))">Authorize Active Status</mat-slide-toggle>
                </div>
                <div class="buttons">
                    <button mat-button mat-dialog-close [disabled]="saving" class="cancel-btn">Discard Changes</button>
                    <button mat-raised-button class="save-btn" (click)="onSubmit()" [disabled]="customerForm.invalid || saving">
                        <mat-icon *ngIf="!saving">verified</mat-icon>
                        <mat-spinner *ngIf="saving" diameter="20"></mat-spinner>
                        {{ isEditMode ? 'Update Database' : 'Finalize Registration' }}
                    </button>
                </div>
            </mat-dialog-actions>
        </div>
    `,
    styleUrl: './customer-form-dialog.component.scss'
})
export class CustomerFormDialogComponent implements OnInit {
    customerForm!: FormGroup;
    isEditMode = false;
    saving = false;

    customerTypes = [
        { value: CustomerType.REGULAR, label: 'Regular', icon: 'person' },
        { value: CustomerType.WHOLESALE, label: 'Wholesale', icon: 'business' },
        { value: CustomerType.RETAIL, label: 'Retail', icon: 'store' },
        { value: CustomerType.DISTRIBUTOR, label: 'Distributor', icon: 'local_shipping' }
    ];

    accountTypes = [
        { value: AccountType.CUSTOMER, label: 'Customer' },
        { value: AccountType.SUPPLIER, label: 'Supplier' },
        { value: AccountType.EMPLOYEE, label: 'Employee' },
        { value: AccountType.INVESTOR, label: 'Investor' },
        { value: AccountType.BOTH, label: 'Both (Cust/Supp)' },
        { value: AccountType.ACCOUNT_MANAGER, label: 'Account Manager' },
        { value: AccountType.SUB_ACCOUNT, label: 'Sub Account' }
    ];

    dimensions: Dimension[] = [];
    towns: Town[] = [];
    areas: Area[] = [];
    filteredAreas: Area[] = [];
    accountHeads: AccountHead[] = [];
    customerTypeList: SupportCustomerType[] = [];
    designations: Designation[] = [];
    salesmen: Salesman[] = [];
    admins: Customer[] = [];

    constructor(
        private fb: FormBuilder,
        private customerService: CustomerService,
        private supportingService: SupportingMasterService,
        private toastService: ToastService,
        private dialogRef: MatDialogRef<CustomerFormDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: { customer: Customer | null }
    ) {
        this.isEditMode = !!data.customer;
    }

    ngOnInit(): void {
        this.initializeForm();
        this.loadSupportingData();
    }

    private loadSupportingData(): void {
        this.supportingService.getDimensions().subscribe(res => this.dimensions = res.data);
        this.supportingService.getTowns().subscribe(res => this.towns = res.data);
        this.supportingService.getAreas().subscribe(res => this.areas = res.data);
        this.supportingService.getAccountHeads().subscribe(res => this.accountHeads = res.data);
        this.supportingService.getCustomerTypes().subscribe(res => this.customerTypeList = res.data);
        this.supportingService.getDesignations().subscribe(res => this.designations = res.data);
        this.supportingService.getSalesmen().subscribe((res: any) => this.salesmen = res.data?.salesmen || res.data || []);

        // Load customers with accountType=employee for parent account selection
        this.customerService.getCustomers({ page: 1, limit: 100 }).subscribe(res => {
            this.admins = res.data.filter(c => c.accountType === AccountType.EMPLOYEE);
        });
    }

    onTownChange(townId: string): void {
        this.filteredAreas = this.areas.filter(a => a.townId === townId || (a.townId as any)?._id === townId);
    }

    onAccountTypeChange(): void {
        const type = this.customerForm.get('accountType')?.value;
        if (type !== AccountType.EMPLOYEE) {
            this.customerForm.get('employeeAccountType')?.setValue('');
        }
    }

    isEmployeeType(): boolean {
        const type = this.customerForm.get('accountType')?.value;
        return type === AccountType.EMPLOYEE || type === AccountType.ACCOUNT_MANAGER || type === AccountType.SUB_ACCOUNT;
    }

    private initializeForm(): void {
        this.customerForm = this.fb.group({
            code: [(this.data.customer as any)?.code || ''],
            name: [(this.data.customer as any)?.name || '', [Validators.required]],
            nameUrdu: [(this.data.customer as any)?.nameUrdu || ''],
            email: [(this.data.customer as any)?.email || '', [Validators.email]],
            phone: [(this.data.customer as any)?.phone || ''],
            phone1: [(this.data.customer as any)?.phone1 || ''],
            phone2: [(this.data.customer as any)?.phone2 || ''],
            address: [(this.data.customer as any)?.address || ''],
            deliveryLocation: [(this.data.customer as any)?.deliveryLocation || ''],
            type: [(this.data.customer as any)?.type || CustomerType.REGULAR],
            accountType: [(this.data.customer as any)?.accountType || AccountType.CUSTOMER, [Validators.required]],
            employeeAccountType: [(this.data.customer as any)?.employeeAccountType || ''],
            dimensionId: [(this.data.customer as any)?.dimensionId?._id || (this.data.customer as any)?.dimensionId || null],
            townId: [(this.data.customer as any)?.townId?._id || (this.data.customer as any)?.townId || null],
            areaId: [(this.data.customer as any)?.areaId?._id || (this.data.customer as any)?.areaId || null],
            accountHeadId: [(this.data.customer as any)?.accountHeadId?._id || (this.data.customer as any)?.accountHeadId || null],
            customerTypeId: [(this.data.customer as any)?.customerTypeId?._id || (this.data.customer as any)?.customerTypeId || null],
            parentAccountId: [(this.data.customer as any)?.parentAccountId?._id || (this.data.customer as any)?.parentAccountId || null],
            assignedSalesmanId: [(this.data.customer as any)?.assignedSalesmanId?._id || (this.data.customer as any)?.assignedSalesmanId || null],
            creditLimit: [(this.data.customer as any)?.creditLimit || 0],
            isActive: [(this.data.customer as any)?.isActive ?? true],

            employeeBiodata: this.fb.group({
                fatherName: [(this.data.customer as any)?.employeeBiodata?.fatherName || ''],
                fatherNIC: [(this.data.customer as any)?.employeeBiodata?.fatherNIC || ''],
                dateOfAppointment: [(this.data.customer as any)?.employeeBiodata?.dateOfAppointment || ''],
                guarantorName: [(this.data.customer as any)?.employeeBiodata?.guarantorName || ''],
                guarantorNIC: [(this.data.customer as any)?.employeeBiodata?.guarantorNIC || ''],
                guarantorPhone: [(this.data.customer as any)?.employeeBiodata?.guarantorPhone || ''],
                basicPay: [(this.data.customer as any)?.employeeBiodata?.basicPay || 0],
                experience: [(this.data.customer as any)?.employeeBiodata?.experience || ''],
                bloodGroup: [(this.data.customer as any)?.employeeBiodata?.bloodGroup || ''],
                designationId: [(this.data.customer as any)?.employeeBiodata?.designationId?._id || (this.data.customer as any)?.employeeBiodata?.designationId || null]
            }),

            businessDetails: this.fb.group({
                openingBalance: [(this.data.customer as any)?.businessDetails?.openingBalance || 0],
                balanceType: [(this.data.customer as any)?.businessDetails?.balanceType || 'debit'],
                creditDaysLimit: [(this.data.customer as any)?.businessDetails?.creditDaysLimit || 0],
                creditAmountLimit: [(this.data.customer as any)?.businessDetails?.creditAmountLimit || 0]
            }),

            bankingInfo: this.fb.group({
                bankName: [(this.data.customer as any)?.bankingInfo?.bankName || ''],
                accountNumber: [(this.data.customer as any)?.bankingInfo?.accountNumber || ''],
                branch: [(this.data.customer as any)?.bankingInfo?.branch || '']
            }),

            financialInfo: this.fb.group({
                licenseNo: [(this.data.customer as any)?.financialInfo?.licenseNo || ''],
                ntn: [(this.data.customer as any)?.financialInfo?.ntn || ''],
                strn: [(this.data.customer as any)?.financialInfo?.strn || ''],
                isNonFiler: [(this.data.customer as any)?.financialInfo?.isNonFiler || false]
            })
        });

        if ((this.data.customer as any)?.townId) {
            const customerData = (this.data?.customer || {}) as any;
            const tId = customerData?.townId?._id || customerData?.townId;
            setTimeout(() => this.onTownChange(tId), 500);
        }
    }

    onSubmit(): void {
        if (this.customerForm.valid) {
            this.saving = true;
            const formData = this.buildApiPayload();

            if (this.isEditMode) {
                this.customerService.updateCustomer(this.data.customer!._id, formData)
                    .subscribe({
                        next: (response) => {
                            if (response.success) {
                                this.toastService.success('Account updated successfully');
                                this.dialogRef.close(response.data);
                            }
                            this.saving = false;
                        },
                        error: (error) => {
                            this.toastService.error(this.getApiErrorMessage(error, 'Failed to update account'));
                            this.saving = false;
                        }
                    });
            } else {
                this.customerService.createCustomer(formData)
                    .subscribe({
                        next: (response) => {
                            if (response.success) {
                                this.toastService.success('Account created successfully');
                                this.dialogRef.close(response.data);
                            }
                            this.saving = false;
                        },
                        error: (error) => {
                            this.toastService.error(this.getApiErrorMessage(error, 'Failed to create account'));
                            this.saving = false;
                        }
                    });
            }
        }
    }

    private getApiErrorMessage(error: any, fallbackMessage: string): string {
        return error?.error?.error?.message || error?.error?.message || fallbackMessage;
    }

    private buildApiPayload(): any {
        const raw = this.customerForm.getRawValue() as any;
        const accountType = raw.accountType as string;
        const typeForApi = ['customer', 'supplier', 'both'].includes(accountType) ? accountType : undefined;

        const payload = {
            code: raw.code?.trim() || undefined,
            name: raw.name?.trim(),
            nameUrdu: raw.nameUrdu?.trim() || undefined,
            type: typeForApi,
            accountType,
            employeeAccountType: raw.employeeAccountType || '',
            dimensionId: raw.dimensionId || undefined,
            townId: raw.townId || undefined,
            areaId: raw.areaId || undefined,
            accountHeadId: raw.accountHeadId || undefined,
            customerTypeId: raw.customerTypeId || undefined,
            parentAccountId: raw.parentAccountId || undefined,
            assignedSalesmanId: raw.assignedSalesmanId || undefined,
            isActive: !!raw.isActive,
            contactInfo: {
                email: raw.email?.trim() || undefined,
                phone: raw.phone?.trim() || undefined,
                phone1: raw.phone1?.trim() || undefined,
                phone2: raw.phone2?.trim() || undefined,
                address: raw.address?.trim() || undefined,
                deliveryLocation: raw.deliveryLocation?.trim() || undefined
            },
            employeeBiodata: raw.employeeBiodata,
            bankingInfo: raw.bankingInfo,
            financialInfo: {
                ...raw.financialInfo,
                creditLimit: Number(raw.creditLimit || 0)
            },
            businessDetails: raw.businessDetails,
            creditDaysLimit: Number(raw.businessDetails?.creditDaysLimit || 0),
            creditAmountLimit: Number(raw.businessDetails?.creditAmountLimit || 0),
            openingBalance: Number(raw.businessDetails?.openingBalance || 0),
            balanceType: raw.businessDetails?.balanceType || 'debit'
        };

        return this.removeEmptyValues(payload) || {};
    }

    private removeEmptyValues(value: any): any {
        if (Array.isArray(value)) {
            const cleanedArray = value
                .map(item => this.removeEmptyValues(item))
                .filter(item => item !== undefined);
            return cleanedArray.length > 0 ? cleanedArray : undefined;
        }

        if (value && typeof value === 'object') {
            const cleanedObject: any = {};
            Object.entries(value).forEach(([key, val]) => {
                const cleanedValue = this.removeEmptyValues(val);
                if (cleanedValue !== undefined) {
                    cleanedObject[key] = cleanedValue;
                }
            });
            return Object.keys(cleanedObject).length > 0 ? cleanedObject : undefined;
        }

        if (value === '' || value === null || value === undefined) {
            return undefined;
        }

        return value;
    }
}
