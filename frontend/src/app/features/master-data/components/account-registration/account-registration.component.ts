import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { DataTableComponent } from '../../../../shared/components/data-table/data-table.component';
import { DataTableColumn } from '../../../../shared/models/data-table.model';

interface LookupOption {
  _id: string;
  name?: string;
  code?: string;
  dimensionName?: string;
  isActive?: boolean;
}

@Component({
  selector: 'app-account-registration',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatPaginatorModule,
    DataTableComponent
  ],
  templateUrl: './account-registration.component.html',
  styleUrl: './account-registration.component.scss'
})
export class AccountRegistrationComponent implements OnInit, OnDestroy {
  accountForm!: FormGroup;
  saving = false;
  editingId: string | null = null;
  printMode: 'blank' | 'filled' | null = null;

  private printSnapshot: Record<string, unknown> | null = null;
  private printRestoreTimer: number | null = null;
  private afterPrintHandler: ((this: Window, ev: Event) => void) | null = null;

  // Lookups
  dimensions: LookupOption[] = [];
  accounts: any[] = [];
  designations: LookupOption[] = [];
  customerTypes: LookupOption[] = [];
  heads: LookupOption[] = [];
  towns: LookupOption[] = [];
  areas: LookupOption[] = [];

  // List Configuration
  tableColumns: DataTableColumn[] = [
    { key: 'sno', label: '#' },
    { key: 'code', label: 'Code' },
    { key: 'name', label: 'Name' },
    { key: 'typeLabel', label: 'Account Type', type: 'status', colorMap: {
      'customer': 'primary',
      'supplier': 'accent',
      'employee': 'warn',
      'both': 'warn'
    }},
    { key: 'dimension', label: 'Dimension' },
    { key: 'phone', label: 'Phone' },
    { key: 'status', label: 'Status', type: 'status', colorMap: { 'Active': 'primary', 'Inactive': 'warn' } },
    { key: 'actions', label: 'Actions', type: 'action', actions: [
      { icon: 'edit', label: 'Edit', actionKey: 'edit', color: 'primary' },
      { icon: 'delete', label: 'Delete', actionKey: 'delete', color: 'warn' }
    ]}
  ];

  dataSource = new MatTableDataSource<any>([]);
  loading = false;
  totalItems = 0;
  pageSize = 20;
  pageIndex = 0;

  readonly primaryAccountTypes = [
    { value: 'account_manager', label: 'Account Manager' },
    { value: 'sub_account', label: 'Sub Account' },
    { value: 'employee', label: 'Employee Account' }
  ];

  readonly accountTypes = [
    ...this.primaryAccountTypes,
    { value: 'customer', label: 'Customer' },
    { value: 'supplier', label: 'Supplier' },
    { value: 'both', label: 'Both (Customer & Supplier)' }
  ];

  readonly bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  constructor(
    private fb: FormBuilder,
    private snackBar: MatSnackBar,
    private http: HttpClient
  ) { }

  ngOnInit(): void {
    this.initForm();
    this.loadMasterData();
    this.loadAccounts();
  }

  ngOnDestroy(): void {
    this.finishPrint();
  }

  initForm(): void {
    this.accountForm = this.fb.group({
      // Account Type Section
      accountType: ['account_manager', Validators.required],
      employeeAccountType: [''],
      dimensionId: [''],
      parentAccountId: [''],

      // Personal Information
      name: ['', Validators.required],
      nameUrdu: [''],
      code: [''],
      fatherName: [''],
      fatherNIC: [''],
      dateOfAppointment: [''],
      nicNumber: [''],
      bloodGroup: [''],

      // Guarantor Information
      guarantorName: [''],
      guarantorNIC: [''],
      guarantorAddress: [''],
      guarantorPhone: [''],

      // Employment Details
      designationId: [''],
      basicPay: [0, Validators.min(0)],
      experience: [''],
      salaryPosition: [''],

      // Business/Company Details
      customerTypeId: [''],
      accountHeadId: [''],
      townId: [''],
      areaId: [''],
      proprietorName: [''],
      storeInchargeName: [''],

      // Contact Information
      phone: [''],
      phone1: [''],
      phone2: [''],
      whatsapp: [''],
      proprietorWhatsapp: [''],
      storeInchargeWhatsapp: [''],
      messageNumber: [''],
      email: ['', Validators.email],
      address: [''],
      deliveryLocation: [''],
      locationPinPoint: [''],
      city: [''],
      town: [''],
      country: ['Pakistan'],
      permanentAddress: [''],

      // Credit & Financial
      creditDaysLimit: [0, Validators.min(0)],
      creditAmountLimit: [0, Validators.min(0)],
      openingBalance: [0],
      balanceType: ['debit'],
      currentBalance: [0],

      // Banking Information (3 accounts)
      bankName1: [''],
      accountNumber1: [''],
      branch1: [''],

      bankName2: [''],
      accountNumber2: [''],
      branch2: [''],

      bankName3: [''],
      accountNumber3: [''],
      branch3: [''],

      // Tax & License Information
      licenseNo: [''],
      licenseExpiryDate: [''],
      strn: [''],
      ntn: [''],
      srbNo: [''],
      taxNumber: [''],

      // Tax Rates
      whtPercent: [0, [Validators.min(0), Validators.max(100)]],
      advanceWhtPercent: [0, [Validators.min(0), Validators.max(100)]],
      incomeTaxDeductionPercent: [0, [Validators.min(0), Validators.max(100)]],
      advanceTaxRate: [0],
      isNonFiler: [false],

      // Profit Share
      profitSharePercent: [0, [Validators.min(0), Validators.max(100)]],
      profitShareAccountId: [''],

      // Additional Fields
      assignedSalesmanId: [''],
      routeId: [''],
      dueInvoiceQty: [0],

      // Signatures
      signatureIndusTraders: [''],
      signatureEmployee: [''],
      signatureGuarantor: [''],

      // Notes
      notes: [''],

      // Status
      isActive: [true]
    });
  }

  loadMasterData(): void {
    // Load dimensions
    this.http.get<any>(`${environment.apiUrl}/dimensions?isActive=true&limit=500`).subscribe({
      next: (res) => { this.dimensions = this.extractActiveList(res); }
    });

    // Load accounts for parent/sub-account selection
    this.http.get<any>(`${environment.apiUrl}/customers?isActive=true&limit=500`).subscribe({
      next: (res) => { this.accounts = this.extractDataArray(res); }
    });

    // Load designations
    this.http.get<any>(`${environment.apiUrl}/designations?isActive=true`).subscribe({
      next: (res) => { this.designations = this.extractActiveList(res); }
    });

    // Load customer types
    this.http.get<any>(`${environment.apiUrl}/customer-types`).subscribe({
      next: (res) => { this.customerTypes = this.extractActiveList(res); }
    });

    // Load account heads
    this.http.get<any>(`${environment.apiUrl}/account-heads?isActive=true`).subscribe({
      next: (res) => { this.heads = this.extractActiveList(res); }
    });

    // Load towns
    this.http.get<any>(`${environment.apiUrl}/towns?isActive=true`).subscribe({
      next: (res) => { this.towns = this.extractActiveList(res); }
    });

    // Load areas
    this.http.get<any>(`${environment.apiUrl}/areas?isActive=true`).subscribe({
      next: (res) => { this.areas = this.extractActiveList(res); }
    });
  }

  onTownChange(townId: string): void {
    if (townId) {
      this.http.get<any>(`${environment.apiUrl}/areas?townId=${townId}&isActive=true`).subscribe({
        next: (res) => { this.areas = this.extractActiveList(res); }
      });
    } else {
      this.areas = [];
    }
  }

  loadAccounts(): void {
    this.loading = true;
    this.http.get<any>(`${environment.apiUrl}/customers?page=${this.pageIndex + 1}&limit=${this.pageSize}`).subscribe({
      next: (res) => {
        this.loading = false;
        const rawData = this.extractDataArray(res);
        this.dataSource.data = rawData.map((acc, index) => ({
          ...acc,
          sno: this.pageIndex * this.pageSize + index + 1,
          typeLabel: acc.accountType,
          dimension: this.getDimensionName(acc.dimensionId),
          phone: acc.contactInfo?.phone || acc.phone || '-',
          status: acc.isActive ? 'Active' : 'Inactive'
        }));
        this.totalItems = res.pagination?.total || this.dataSource.data.length || 0;
      },
      error: () => { this.loading = false; }
    });
  }

  save(): void {
    if (this.accountForm.invalid) {
      this.accountForm.markAllAsTouched();
      this.snackBar.open('Please fill all required fields', 'Close', { duration: 3000 });
      return;
    }

    this.saving = true;
    const fv = this.accountForm.getRawValue();
    const accountType = String(fv.accountType || '');
    const mappedEmployeeType = this.resolveEmployeeAccountType(accountType, String(fv.employeeAccountType || ''));
    const openingBalance = this.toNumber(fv.openingBalance);
    const creditDaysLimit = this.toNumber(fv.creditDaysLimit);
    const creditAmountLimit = this.toNumber(fv.creditAmountLimit);

    const accountData = {
      // Basic Info
      name: fv.name,
      nameUrdu: fv.nameUrdu,
      code: fv.code,
      accountType,
      employeeAccountType: mappedEmployeeType,
      type: this.resolvePartyType(accountType),

      // Hierarchy
      dimensionId: fv.dimensionId || null,
      parentAccountId: fv.parentAccountId || null,
      townId: fv.townId || null,
      areaId: fv.areaId || null,
      routeId: fv.routeId || null,
      accountHeadId: fv.accountHeadId || null,
      customerTypeId: fv.customerTypeId || null,
      linkedAccountId: fv.profitShareAccountId || null,

      // Contact Info
      contactInfo: {
        phone: fv.phone,
        phone1: fv.phone1,
        phone2: fv.phone2,
        whatsapp: fv.whatsapp,
        proprietorWhatsapp: fv.proprietorWhatsapp,
        storeInchargeWhatsapp: fv.storeInchargeWhatsapp,
        messageNumber: fv.messageNumber,
        email: fv.email,
        address: fv.address,
        guarantorAddress: fv.guarantorAddress,
        deliveryLocation: fv.deliveryLocation,
        locationPinPoint: fv.locationPinPoint,
        city: fv.city,
        town: fv.town,
        country: fv.country,
        nicNumber: fv.nicNumber
      },

      // Employee Biodata
      employeeBiodata: {
        fatherName: fv.fatherName,
        fatherNIC: fv.fatherNIC,
        dateOfAppointment: this.normalizeDate(fv.dateOfAppointment),
        guarantorName: fv.guarantorName,
        guarantorNIC: fv.guarantorNIC,
        emergencyContact: fv.guarantorPhone,
        guarantorPhone: fv.guarantorPhone,
        bloodGroup: fv.bloodGroup,
        permanentAddress: fv.permanentAddress,
        designationId: fv.designationId || null,
        basicPay: this.toNumber(fv.basicPay),
        experience: fv.experience,
        salaryPosition: fv.salaryPosition,
        proprietorName: fv.proprietorName,
        storeInchargeName: fv.storeInchargeName
      },

      // Business Details
      businessDetails: {
        customerType: this.lookupName(this.customerTypes, fv.customerTypeId),
        creditDaysLimit,
        creditAmountLimit,
        openingBalance,
        balanceType: fv.balanceType,
        assignedSalesmanId: fv.assignedSalesmanId || null
      },
      creditDaysLimit,
      creditAmountLimit,
      openingBalance,
      balanceType: fv.balanceType,

      // Banking Info
      bankingInfo: {
        bankName: fv.bankName1,
        accountNumber: fv.accountNumber1,
        branch: fv.branch1
      },
      bankingInfo2: {
        bankName: fv.bankName2,
        accountNumber: fv.accountNumber2,
        branch: fv.branch2
      },
      bankingInfo3: {
        bankName: fv.bankName3,
        accountNumber: fv.accountNumber3,
        branch: fv.branch3
      },

      // Financial Info
      financialInfo: {
        creditLimit: creditAmountLimit,
        paymentTerms: creditDaysLimit,
        taxNumber: fv.taxNumber,
        licenseNo: fv.licenseNo,
        licenseExpiryDate: this.normalizeDate(fv.licenseExpiryDate),
        srbNo: fv.srbNo,
        ntn: fv.ntn,
        strn: fv.strn,
        nicNumber: fv.nicNumber,
        whtPercent: this.toNumber(fv.whtPercent),
        advanceWhtPercent: this.toNumber(fv.advanceWhtPercent),
        incomeTaxDeductionPercent: this.toNumber(fv.incomeTaxDeductionPercent),
        profitSharePercent: this.toNumber(fv.profitSharePercent),
        creditDays: creditDaysLimit,
        currency: 'PKR',
        advanceTaxRate: this.toNumber(fv.advanceTaxRate),
        isNonFiler: fv.isNonFiler
      },

      // Signatures
      signatures: {
        indusTraders: fv.signatureIndusTraders,
        employee: fv.signatureEmployee,
        guarantor: fv.signatureGuarantor
      },

      notes: fv.notes,
      dueInvoiceQty: this.toNumber(fv.dueInvoiceQty),
      currentBalance: openingBalance,
      isActive: fv.isActive
    };

    const request$ = this.editingId
      ? this.http.put(`${environment.apiUrl}/customers/${this.editingId}`, accountData)
      : this.http.post(`${environment.apiUrl}/customers`, accountData);

    request$.subscribe({
      next: () => {
        this.saving = false;
        this.snackBar.open(`Account ${this.editingId ? 'updated' : 'created'} successfully`, 'Close', { duration: 3000 });
        this.resetForm();
        this.loadAccounts();
      },
      error: (err) => {
        this.saving = false;
        this.snackBar.open(err?.error?.message || 'Failed to save account', 'Close', { duration: 3000 });
      }
    });
  }

  edit(account: any): void {
    this.editingId = account._id;

    this.accountForm.patchValue({
      // Basic
      name: account.name,
      nameUrdu: account.nameUrdu || '',
      code: account.code,
      accountType: account.accountType || 'account_manager',
      employeeAccountType: account.employeeAccountType || '',
      dimensionId: account.dimensionId?._id || account.dimensionId || '',
      parentAccountId: account.parentAccountId?._id || account.parentAccountId || '',
      accountHeadId: account.accountHeadId?._id || account.accountHeadId || '',
      customerTypeId: account.customerTypeId?._id || account.customerTypeId || '',

      // Personal
      fatherName: account.employeeBiodata?.fatherName || '',
      fatherNIC: account.employeeBiodata?.fatherNIC || '',
      dateOfAppointment: this.toDateInput(account.employeeBiodata?.dateOfAppointment),
      nicNumber: account.contactInfo?.nicNumber || '',
      bloodGroup: account.employeeBiodata?.bloodGroup || '',

      // Guarantor
      guarantorName: account.employeeBiodata?.guarantorName || '',
      guarantorNIC: account.employeeBiodata?.guarantorNIC || '',
      guarantorAddress: account.contactInfo?.guarantorAddress || '',
      guarantorPhone: account.employeeBiodata?.guarantorPhone || account.employeeBiodata?.emergencyContact || '',

      // Employment
      designationId: account.employeeBiodata?.designationId?._id || account.employeeBiodata?.designationId || '',
      basicPay: account.employeeBiodata?.basicPay || 0,
      experience: account.employeeBiodata?.experience || '',
      salaryPosition: account.employeeBiodata?.salaryPosition || '',
      proprietorName: account.employeeBiodata?.proprietorName || '',
      storeInchargeName: account.employeeBiodata?.storeInchargeName || '',

      // Business
      townId: account.townId?._id || account.townId || '',
      areaId: account.areaId?._id || account.areaId || '',
      routeId: account.routeId?._id || account.routeId || '',
      assignedSalesmanId: account.businessDetails?.assignedSalesmanId?._id || account.businessDetails?.assignedSalesmanId || '',

      // Contact
      phone: account.contactInfo?.phone || '',
      phone1: account.contactInfo?.phone1 || '',
      phone2: account.contactInfo?.phone2 || '',
      whatsapp: account.contactInfo?.whatsapp || '',
      proprietorWhatsapp: account.contactInfo?.proprietorWhatsapp || '',
      storeInchargeWhatsapp: account.contactInfo?.storeInchargeWhatsapp || '',
      messageNumber: account.contactInfo?.messageNumber || '',
      email: account.contactInfo?.email || '',
      address: account.contactInfo?.address || '',
      deliveryLocation: account.contactInfo?.deliveryLocation || '',
      locationPinPoint: account.contactInfo?.locationPinPoint || '',
      city: account.contactInfo?.city || '',
      town: account.contactInfo?.town || '',
      country: account.contactInfo?.country || 'Pakistan',
      permanentAddress: account.employeeBiodata?.permanentAddress || '',

      // Credit
      creditDaysLimit: account.businessDetails?.creditDaysLimit ?? account.creditDaysLimit ?? 0,
      creditAmountLimit: account.businessDetails?.creditAmountLimit ?? account.creditAmountLimit ?? 0,
      openingBalance: account.businessDetails?.openingBalance ?? account.openingBalance ?? 0,
      balanceType: account.businessDetails?.balanceType ?? account.balanceType ?? 'debit',
      currentBalance: account.currentBalance || 0,

      // Banking
      bankName1: account.bankingInfo?.bankName || '',
      accountNumber1: account.bankingInfo?.accountNumber || '',
      branch1: account.bankingInfo?.branch || '',
      bankName2: account.bankingInfo2?.bankName || '',
      accountNumber2: account.bankingInfo2?.accountNumber || '',
      branch2: account.bankingInfo2?.branch || '',
      bankName3: account.bankingInfo3?.bankName || '',
      accountNumber3: account.bankingInfo3?.accountNumber || '',
      branch3: account.bankingInfo3?.branch || '',

      // Tax
      licenseNo: account.financialInfo?.licenseNo || '',
      licenseExpiryDate: this.toDateInput(account.financialInfo?.licenseExpiryDate),
      strn: account.financialInfo?.strn || '',
      ntn: account.financialInfo?.ntn || '',
      srbNo: account.financialInfo?.srbNo || '',
      taxNumber: account.financialInfo?.taxNumber || '',
      whtPercent: account.financialInfo?.whtPercent || 0,
      advanceWhtPercent: account.financialInfo?.advanceWhtPercent || 0,
      incomeTaxDeductionPercent: account.financialInfo?.incomeTaxDeductionPercent || 0,
      advanceTaxRate: account.financialInfo?.advanceTaxRate || 0,
      isNonFiler: account.financialInfo?.isNonFiler || false,
      profitSharePercent: account.financialInfo?.profitSharePercent || 0,
      profitShareAccountId: account.linkedAccountId?._id || account.linkedAccountId || '',

      // Signatures
      signatureIndusTraders: account.signatures?.indusTraders || '',
      signatureEmployee: account.signatures?.employee || '',
      signatureGuarantor: account.signatures?.guarantor || '',

      notes: account.notes || '',
      dueInvoiceQty: account.dueInvoiceQty || 0,
      isActive: account.isActive !== false
    });

    if (account.townId) {
      this.onTownChange(account.townId._id || account.townId);
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  delete(account: any): void {
    if (!confirm(`Delete account "${account.name}"?`)) return;
    this.http.delete(`${environment.apiUrl}/customers/${account._id}`).subscribe({
      next: () => {
        this.snackBar.open('Account deleted', 'Close', { duration: 2000 });
        this.loadAccounts();
      },
      error: (err) => {
        this.snackBar.open(err?.error?.message || 'Failed to delete', 'Close', { duration: 3000 });
      }
    });
  }

  resetForm(): void {
    this.editingId = null;
    this.accountForm.reset(this.defaultFormValues());
    this.areas = [];
  }

  cancelEdit(): void {
    this.resetForm();
  }

  onPage(e: PageEvent): void {
    this.pageIndex = e.pageIndex;
    this.pageSize = e.pageSize;
    this.loadAccounts();
  }

  printBlankForm(): void {
    this.printSnapshot = this.accountForm.getRawValue();
    this.accountForm.reset(this.blankPrintValues());
    this.startPrint('blank');
  }

  printFilledForm(): void {
    this.startPrint('filled');
  }

  getDimensionName(dimensionRef: unknown): string {
    const refObject = dimensionRef as { _id?: string; name?: string; dimensionName?: string; code?: string } | null;
    if (refObject && typeof refObject === 'object') {
      return refObject.name || refObject.dimensionName || refObject.code || '-';
    }

    const id = typeof dimensionRef === 'string' ? dimensionRef : '';
    const found = this.dimensions.find((item) => item._id === id);
    return found?.name || found?.dimensionName || found?.code || id || '-';
  }

  getAccountTypeLabel(accountType: string): string {
    const found = this.accountTypes.find((item) => item.value === accountType);
    return found?.label || accountType || '-';
  }

  lookupName(list: LookupOption[], idOrObject: unknown): string {
    if (!idOrObject) {
      return '';
    }

    if (typeof idOrObject === 'object') {
      const option = idOrObject as LookupOption;
      return option.name || option.dimensionName || option.code || '';
    }

    const id = String(idOrObject);
    const found = list.find((item) => item._id === id);
    return found?.name || found?.dimensionName || found?.code || '';
  }

  private startPrint(mode: 'blank' | 'filled'): void {
    if (this.afterPrintHandler) {
      window.removeEventListener('afterprint', this.afterPrintHandler);
      this.afterPrintHandler = null;
    }

    this.printMode = mode;
    this.afterPrintHandler = () => this.finishPrint();
    window.addEventListener('afterprint', this.afterPrintHandler, { once: true });

    if (this.printRestoreTimer !== null) {
      window.clearTimeout(this.printRestoreTimer);
    }

    // Fallback restoration in case browser doesn't emit afterprint.
    this.printRestoreTimer = window.setTimeout(() => this.finishPrint(), 60000);
    window.setTimeout(() => window.print(), 80);
  }

  private finishPrint(): void {
    if (this.afterPrintHandler) {
      window.removeEventListener('afterprint', this.afterPrintHandler);
      this.afterPrintHandler = null;
    }

    if (this.printRestoreTimer !== null) {
      window.clearTimeout(this.printRestoreTimer);
      this.printRestoreTimer = null;
    }

    if (this.printSnapshot) {
      this.accountForm.patchValue(this.printSnapshot);
      this.printSnapshot = null;
    }

    this.printMode = null;
  }

  private toDateInput(value: unknown): string {
    if (!value) return '';
    const asString = String(value);
    return asString.includes('T') ? asString.split('T')[0] : asString;
  }

  private normalizeDate(value: unknown): string | null {
    if (!value) return null;
    return String(value);
  }

  private toNumber(value: unknown): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private resolvePartyType(accountType: string): 'customer' | 'supplier' | 'both' {
    if (accountType === 'customer') return 'customer';
    if (accountType === 'supplier') return 'supplier';
    return 'both';
  }

  private resolveEmployeeAccountType(accountType: string, currentValue: string): string {
    if (accountType === 'account_manager') return 'account_manager';
    if (accountType === 'sub_account') return 'sub_account';
    if (accountType === 'employee') return 'employee_account';
    return currentValue || '';
  }

  private blankPrintValues(): Record<string, unknown> {
    return {
      ...this.defaultFormValues(),
      accountType: '',
      balanceType: '',
      country: ''
    };
  }

  private defaultFormValues(): Record<string, unknown> {
    return {
      accountType: 'account_manager',
      employeeAccountType: '',
      dimensionId: '',
      parentAccountId: '',
      name: '',
      nameUrdu: '',
      code: '',
      fatherName: '',
      fatherNIC: '',
      dateOfAppointment: '',
      nicNumber: '',
      bloodGroup: '',
      guarantorName: '',
      guarantorNIC: '',
      guarantorAddress: '',
      guarantorPhone: '',
      designationId: '',
      basicPay: 0,
      experience: '',
      salaryPosition: '',
      customerTypeId: '',
      accountHeadId: '',
      townId: '',
      areaId: '',
      proprietorName: '',
      storeInchargeName: '',
      phone: '',
      phone1: '',
      phone2: '',
      whatsapp: '',
      proprietorWhatsapp: '',
      storeInchargeWhatsapp: '',
      messageNumber: '',
      email: '',
      address: '',
      deliveryLocation: '',
      locationPinPoint: '',
      city: '',
      town: '',
      country: 'Pakistan',
      permanentAddress: '',
      creditDaysLimit: 0,
      creditAmountLimit: 0,
      openingBalance: 0,
      balanceType: 'debit',
      currentBalance: 0,
      bankName1: '',
      accountNumber1: '',
      branch1: '',
      bankName2: '',
      accountNumber2: '',
      branch2: '',
      bankName3: '',
      accountNumber3: '',
      branch3: '',
      licenseNo: '',
      licenseExpiryDate: '',
      strn: '',
      ntn: '',
      srbNo: '',
      taxNumber: '',
      whtPercent: 0,
      advanceWhtPercent: 0,
      incomeTaxDeductionPercent: 0,
      advanceTaxRate: 0,
      isNonFiler: false,
      profitSharePercent: 0,
      profitShareAccountId: '',
      assignedSalesmanId: '',
      routeId: '',
      dueInvoiceQty: 0,
      signatureIndusTraders: '',
      signatureEmployee: '',
      signatureGuarantor: '',
      notes: '',
      isActive: true
    };
  }

  private extractDataArray(response: any): any[] {
    if (Array.isArray(response?.data)) {
      return response.data;
    }
    if (Array.isArray(response)) {
      return response;
    }
    if (Array.isArray(response?.result)) {
      return response.result;
    }
    return [];
  }

  private extractActiveList(response: any): LookupOption[] {
    const list = this.extractDataArray(response) as LookupOption[];
    return list.filter((item) => item?.isActive !== false);
  }

  onTableAction(event: { action: string, row: any }): void {
    switch(event.action) {
      case 'edit': this.edit(event.row); break;
      case 'delete': this.delete(event.row); break;
    }
  }
}
