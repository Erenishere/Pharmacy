import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-salary-sheet',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    MatTableModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatCheckboxModule,
    MatSnackBarModule, MatProgressSpinnerModule, MatTooltipModule, MatPaginatorModule
  ],
  templateUrl: './salary-sheet.component.html',
  styleUrl: './salary-sheet.component.scss'
})
export class SalarySheetComponent implements OnInit {
  salaryForm!: FormGroup;
  saving = false;
  editingId: string | null = null;

  // Lookups
  dimensions: any[] = [];
  employees: any[] = [];
  items: any[] = [];
  months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ];
  years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i);

  // List
  displayedColumns = ['sno', 'referenceNumber', 'employeeName', 'monthYear', 'basicPay', 'totalTarget', 'status', 'actions'];
  dataSource = new MatTableDataSource<any>([]);
  loading = false;
  totalItems = 0;
  pageSize = 20;
  pageIndex = 0;

  statuses = [
    { value: 'draft', label: 'Draft', color: 'gray' },
    { value: 'active', label: 'Active', color: 'green' },
    { value: 'paid', label: 'Paid', color: 'blue' },
    { value: 'cancelled', label: 'Cancelled', color: 'red' }
  ];

  constructor(
    private fb: FormBuilder,
    private snackBar: MatSnackBar,
    private http: HttpClient
  ) { }

  ngOnInit(): void {
    this.initForm();
    this.loadMasterData();
    this.loadSalarySheets();
  }

  initForm(): void {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    this.salaryForm = this.fb.group({
      // Basic Info
      dimensionId: [''],
      employeeId: ['', Validators.required],
      month: [currentMonth, Validators.required],
      year: [currentYear, Validators.required],

      // Basic Pay (auto from employee profile)
      basicPay: [0, Validators.min(0)],

      // Targets with Incentives
      basicSalesTargetAmount: [0, Validators.min(0)],
      basicSalesTargetIncentive: [0, [Validators.min(0), Validators.max(100)]],

      cashRecoveryTargetAmount: [0, Validators.min(0)],
      cashRecoveryTargetIncentive: [0, [Validators.min(0), Validators.max(100)]],

      zeroCreditTownAmount: [0, Validators.min(0)],
      zeroCreditTownIncentive: [0, [Validators.min(0), Validators.max(100)]],

      profitAchievementAmount: [0, Validators.min(0)],
      profitAchievementIncentive: [0, [Validators.min(0), Validators.max(100)]],

      partyVisitTargetCount: [0, Validators.min(0)],
      partyVisitTargetIncentive: [0, [Validators.min(0), Validators.max(100)]],

      // Allowances
      workingDays: [26, [Validators.min(0), Validators.max(31)]],
      dailyAllowance: [0, Validators.min(0)],
      petrolAndMaintenance: [0, Validators.min(0)],
      mobileInternetPackage: [0, Validators.min(0)],

      // Bonuses
      yearlyBonusAmount: [0, Validators.min(0)],
      yearlyBonusPercent: [0, [Validators.min(0), Validators.max(100)]],
      eidBonus: [0, Validators.min(0)],

      // Special Item Sales
      specialItemId: [''],
      specialItemIncentive: [0, [Validators.min(0), Validators.max(100)]],

      // New Incentive
      newIncentiveDetail: [''],
      newIncentivePercent: [0, [Validators.min(0), Validators.max(100)]],

      // Status
      status: ['draft'],
      notes: ['']
    });

    // Listen for employee changes to auto-fetch basic pay
    this.salaryForm.get('employeeId')?.valueChanges.subscribe(empId => {
      if (empId) {
        this.loadEmployeeBasicPay(empId);
      }
    });
  }

  loadMasterData(): void {
    // Load dimensions
    this.http.get<any>(`${environment.apiUrl}/dimensions?isActive=true`).subscribe({
      next: (res) => { this.dimensions = res.data || []; }
    });

    // Load employees (customers with employee account type)
    this.http.get<any>(`${environment.apiUrl}/customers?accountType=employee&isActive=true&limit=500`).subscribe({
      next: (res) => { this.employees = res.data || []; }
    });

    // Load items for special item sales
    this.http.get<any>(`${environment.apiUrl}/items?isActive=true&limit=500`).subscribe({
      next: (res) => { this.items = res.data || []; }
    });
  }

  loadEmployeeBasicPay(employeeId: string): void {
    this.http.get<any>(`${environment.apiUrl}/salary-sheets/employee-basic-pay/${employeeId}`).subscribe({
      next: (res) => {
        if (res.data?.basicPay) {
          this.salaryForm.patchValue({ basicPay: res.data.basicPay });
        }
      },
      error: () => {
        // Try to get from employee directly
        const emp = this.employees.find(e => e._id === employeeId);
        if (emp?.employeeBiodata?.basicPay) {
          this.salaryForm.patchValue({ basicPay: emp.employeeBiodata.basicPay });
        }
      }
    });
  }

  loadSalarySheets(): void {
    this.loading = true;
    this.http.get<any>(`${environment.apiUrl}/salary-sheets?page=${this.pageIndex + 1}&limit=${this.pageSize}`).subscribe({
      next: (res) => {
        this.loading = false;
        this.dataSource.data = res.data || [];
        this.totalItems = res.pagination?.total || res.data?.length || 0;
      },
      error: () => { this.loading = false; }
    });
  }

  save(): void {
    if (this.salaryForm.invalid) {
      this.salaryForm.markAllAsTouched();
      this.snackBar.open('Please fill all required fields', 'Close', { duration: 3000 });
      return;
    }

    this.saving = true;
    const fv = this.salaryForm.value;

    const salaryData = {
      dimensionId: fv.dimensionId || null,
      employeeId: fv.employeeId,
      month: fv.month,
      year: fv.year,
      basicPay: fv.basicPay,
      targets: {
        basicSalesTarget: {
          amount: fv.basicSalesTargetAmount,
          incentivePercent: fv.basicSalesTargetIncentive
        },
        cashRecoveryTarget: {
          amount: fv.cashRecoveryTargetAmount,
          incentivePercent: fv.cashRecoveryTargetIncentive
        },
        zeroCreditTownTarget: {
          amount: fv.zeroCreditTownAmount,
          incentivePercent: fv.zeroCreditTownIncentive
        },
        profitAchievementTarget: {
          amount: fv.profitAchievementAmount,
          incentivePercent: fv.profitAchievementIncentive
        },
        partyVisitTarget: {
          count: fv.partyVisitTargetCount,
          incentivePercent: fv.partyVisitTargetIncentive
        }
      },
      allowances: {
        workingDays: fv.workingDays,
        dailyAllowance: fv.dailyAllowance,
        petrolAndMaintenance: fv.petrolAndMaintenance,
        mobileInternetPackage: fv.mobileInternetPackage,
        yearlyBonus: {
          amount: fv.yearlyBonusAmount,
          percent: fv.yearlyBonusPercent
        },
        eidBonus: fv.eidBonus
      },
      specialItemSales: {
        itemId: fv.specialItemId || null,
        incentivePercent: fv.specialItemIncentive
      },
      newIncentive: {
        detail: fv.newIncentiveDetail,
        percent: fv.newIncentivePercent
      },
      status: fv.status,
      notes: fv.notes
    };

    const url = this.editingId
      ? `${environment.apiUrl}/salary-sheets/${this.editingId}`
      : `${environment.apiUrl}/salary-sheets`;
    const method = this.editingId ? 'put' : 'post';

    this.http[method](url, salaryData).subscribe({
      next: () => {
        this.saving = false;
        this.snackBar.open(`Salary sheet ${this.editingId ? 'updated' : 'created'} successfully`, 'Close', { duration: 3000 });
        this.resetForm();
        this.loadSalarySheets();
      },
      error: (err) => {
        this.saving = false;
        this.snackBar.open(err?.error?.message || 'Failed to save salary sheet', 'Close', { duration: 3000 });
      }
    });
  }

  edit(sheet: any): void {
    this.editingId = sheet._id;

    this.salaryForm.patchValue({
      dimensionId: sheet.dimensionId?._id || sheet.dimensionId || '',
      employeeId: sheet.employeeId?._id || sheet.employeeId || '',
      month: sheet.month,
      year: sheet.year,
      basicPay: sheet.basicPay,

      // Targets
      basicSalesTargetAmount: sheet.targets?.basicSalesTarget?.amount || 0,
      basicSalesTargetIncentive: sheet.targets?.basicSalesTarget?.incentivePercent || 0,

      cashRecoveryTargetAmount: sheet.targets?.cashRecoveryTarget?.amount || 0,
      cashRecoveryTargetIncentive: sheet.targets?.cashRecoveryTarget?.incentivePercent || 0,

      zeroCreditTownAmount: sheet.targets?.zeroCreditTownTarget?.amount || 0,
      zeroCreditTownIncentive: sheet.targets?.zeroCreditTownTarget?.incentivePercent || 0,

      profitAchievementAmount: sheet.targets?.profitAchievementTarget?.amount || 0,
      profitAchievementIncentive: sheet.targets?.profitAchievementTarget?.incentivePercent || 0,

      partyVisitTargetCount: sheet.targets?.partyVisitTarget?.count || 0,
      partyVisitTargetIncentive: sheet.targets?.partyVisitTarget?.incentivePercent || 0,

      // Allowances
      workingDays: sheet.allowances?.workingDays || 26,
      dailyAllowance: sheet.allowances?.dailyAllowance || 0,
      petrolAndMaintenance: sheet.allowances?.petrolAndMaintenance || 0,
      mobileInternetPackage: sheet.allowances?.mobileInternetPackage || 0,

      // Bonuses
      yearlyBonusAmount: sheet.allowances?.yearlyBonus?.amount || 0,
      yearlyBonusPercent: sheet.allowances?.yearlyBonus?.percent || 0,
      eidBonus: sheet.allowances?.eidBonus || 0,

      // Special Item
      specialItemId: sheet.specialItemSales?.itemId?._id || sheet.specialItemSales?.itemId || '',
      specialItemIncentive: sheet.specialItemSales?.incentivePercent || 0,

      // New Incentive
      newIncentiveDetail: sheet.newIncentive?.detail || '',
      newIncentivePercent: sheet.newIncentive?.percent || 0,

      status: sheet.status,
      notes: sheet.notes
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  delete(sheet: any): void {
    if (!confirm(`Delete salary sheet for "${sheet.employeeName || sheet.employeeId?.name}"?`)) return;
    this.http.delete(`${environment.apiUrl}/salary-sheets/${sheet._id}`).subscribe({
      next: () => {
        this.snackBar.open('Salary sheet deleted', 'Close', { duration: 2000 });
        this.loadSalarySheets();
      },
      error: (err) => {
        this.snackBar.open(err?.error?.message || 'Failed to delete', 'Close', { duration: 3000 });
      }
    });
  }

  updateStatus(sheet: any, newStatus: string): void {
    this.http.patch(`${environment.apiUrl}/salary-sheets/${sheet._id}/status`, { status: newStatus }).subscribe({
      next: () => {
        this.snackBar.open(`Status updated to ${newStatus}`, 'Close', { duration: 2000 });
        this.loadSalarySheets();
      },
      error: (err) => {
        this.snackBar.open(err?.error?.message || 'Failed to update status', 'Close', { duration: 3000 });
      }
    });
  }

  resetForm(): void {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    this.editingId = null;
    this.salaryForm.reset({
      month: currentMonth,
      year: currentYear,
      basicPay: 0,
      workingDays: 26,
      status: 'draft',
      basicSalesTargetAmount: 0,
      basicSalesTargetIncentive: 0,
      cashRecoveryTargetAmount: 0,
      cashRecoveryTargetIncentive: 0,
      zeroCreditTownAmount: 0,
      zeroCreditTownIncentive: 0,
      profitAchievementAmount: 0,
      profitAchievementIncentive: 0,
      partyVisitTargetCount: 0,
      partyVisitTargetIncentive: 0,
      dailyAllowance: 0,
      petrolAndMaintenance: 0,
      mobileInternetPackage: 0,
      yearlyBonusAmount: 0,
      yearlyBonusPercent: 0,
      eidBonus: 0,
      specialItemIncentive: 0,
      newIncentivePercent: 0
    });
  }

  cancelEdit(): void {
    this.resetForm();
  }

  onPage(e: PageEvent): void {
    this.pageIndex = e.pageIndex;
    this.pageSize = e.pageSize;
    this.loadSalarySheets();
  }

  getStatusLabel(status: string): string {
    const s = this.statuses.find(x => x.value === status);
    return s?.label || status;
  }

  getStatusColor(status: string): string {
    const s = this.statuses.find(x => x.value === status);
    return s?.color || 'gray';
  }

  getDimensionName(id: string): string {
    const d = this.dimensions.find(x => x._id === id);
    return d?.name || d?.dimensionName || '—';
  }

  fmtNum(n: number): string {
    return n ? n.toLocaleString('en-PK') : '—';
  }
}
