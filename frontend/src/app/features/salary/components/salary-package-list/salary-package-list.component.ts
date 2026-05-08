import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { SalaryPackageService } from '../../services/salary-package.service';
import { TargetTrackingService } from '../../services/target-tracking.service';
import { ToastService } from '../../../../shared/services/toast.service';
import { SalaryPackage } from '../../../../core/models/salary-package.model';
import { EmployeeTargetData } from '../../../../core/models/target-tracking.model';

@Component({
  selector: 'app-salary-package-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatTableModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatFormFieldModule,
    MatPaginatorModule,
    MatTooltipModule
  ],
  templateUrl: './salary-package-list.component.html',
  styleUrl: './salary-package-list.component.scss'
})
export class SalaryPackageListComponent implements OnInit {
  packages: SalaryPackage[] = [];
  loading = false;
  currentPage = 0;
  pageSize = 10;
  pageSizeOptions = [10, 25, 50];
  
  displayedColumns: string[] = [
    'serial',
    'employeeName',
    'duration',
    'basicPay',
    'partyVisitingTarget',
    'visitedParties',
    'salesTarget',
    'recoveryTarget',
    'actions'
  ];

  // Filters
  statusFilter = new FormControl('Active');
  yearFilter = new FormControl(new Date().getFullYear());
  
  statusOptions = ['Active', 'Inactive', 'All'];
  yearOptions: number[] = [];
  monthFilter = new FormControl('');
  months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  performanceByEmployee: Record<string, EmployeeTargetData> = {};

  constructor(
    private salaryPackageService: SalaryPackageService,
    private targetTrackingService: TargetTrackingService,
    private toastService: ToastService,
    private router: Router
  ) {
    this.initializeYearOptions();
    this.initializeCurrentMonth();
  }

  ngOnInit(): void {
    this.loadPackages();
    this.setupFilterListeners();
  }

  private initializeYearOptions(): void {
    const currentYear = new Date().getFullYear();
    for (let i = currentYear - 2; i <= currentYear + 2; i++) {
      this.yearOptions.push(i);
    }
  }

  private initializeCurrentMonth(): void {
    const currentDate = new Date();
    this.monthFilter.setValue(this.months[currentDate.getMonth()]);
  }

  private setupFilterListeners(): void {
    this.statusFilter.valueChanges.subscribe(() => {
      this.loadPackages();
    });

    this.yearFilter.valueChanges.subscribe(() => {
      this.loadPackages();
    });

    this.monthFilter.valueChanges.subscribe(() => {
      this.loadPerformanceSnapshots();
    });
  }

  loadPackages(): void {
    this.loading = true;
    this.currentPage = 0;
    
    const filters: any = {};
    
    if (this.statusFilter.value && this.statusFilter.value !== 'All') {
      filters.status = this.statusFilter.value;
    }
    
    if (this.yearFilter.value) {
      filters.year = this.yearFilter.value;
    }

    this.salaryPackageService.getPackages(filters).subscribe({
      next: (response) => {
        if (response.success) {
          this.packages = response.data;
          this.loadPerformanceSnapshots();
        } else {
          this.performanceByEmployee = {};
        }
        this.loading = false;
      },
      error: (error) => {
        this.toastService.error('Failed to load salary packages');
        console.error('Error loading packages:', error);
        this.performanceByEmployee = {};
        this.loading = false;
      }
    });
  }

  private loadPerformanceSnapshots(): void {
    const month = this.monthFilter.value;
    const year = this.yearFilter.value;

    if (!month || !year) {
      this.performanceByEmployee = {};
      return;
    }

    this.targetTrackingService.getTargetDashboard(month, year, 1, 200).subscribe({
      next: (response) => {
        const employees = response.data?.employees || [];
        this.performanceByEmployee = employees.reduce<Record<string, EmployeeTargetData>>((acc, employee) => {
          acc[employee.employeeId] = employee;
          return acc;
        }, {});
      },
      error: (error) => {
        console.error('Error loading salary target snapshots:', error);
        this.performanceByEmployee = {};
      }
    });
  }

  formatDuration(duration: { fromDate: Date | string; toDate: Date | string }): string {
    const fromDate = new Date(duration.fromDate);
    const toDate = new Date(duration.toDate);
    
    const formatDate = (date: Date) => {
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      return `${day}.${month}`;
    };
    
    return `${formatDate(fromDate)}-${formatDate(toDate)}`;
  }

  formatCurrency(amount: number): string {
    return amount.toLocaleString('en-US');
  }

  onEdit(packageItem: SalaryPackage): void {
    this.router.navigate(['/salary-packages', packageItem._id, 'edit']);
  }

  onPrint(packageItem: SalaryPackage): void {
    // Create a printable view of the salary package
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    
    if (!printWindow) {
      this.toastService.error('Please allow pop-ups to print');
      return;
    }

    const printContent = this.generatePrintContent(packageItem);
    
    printWindow.document.write(printContent);
    printWindow.document.close();
    
    // Wait for content to load then print
    printWindow.onload = () => {
      printWindow.print();
    };
  }

  private generatePrintContent(packageItem: SalaryPackage): string {
    const fromDate = new Date(packageItem.duration.fromDate).toLocaleDateString();
    const toDate = new Date(packageItem.duration.toDate).toLocaleDateString();

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Salary Package - ${packageItem.employeeName}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 20px;
            max-width: 800px;
            margin: 0 auto;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #333;
            padding-bottom: 10px;
          }
          .header h1 {
            margin: 0;
            color: #333;
          }
          .section {
            margin-bottom: 20px;
          }
          .section-title {
            font-weight: bold;
            font-size: 16px;
            margin-bottom: 10px;
            color: #555;
            border-bottom: 1px solid #ddd;
            padding-bottom: 5px;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px dotted #ddd;
          }
          .info-label {
            font-weight: 600;
            color: #666;
          }
          .info-value {
            color: #333;
          }
          .brand-incentive {
            margin-left: 20px;
            padding: 10px;
            background-color: #f9f9f9;
            border-left: 3px solid #4CAF50;
            margin-bottom: 10px;
          }
          @media print {
            body {
              padding: 0;
            }
            .no-print {
              display: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Salary Package Details</h1>
          <p>Employee: ${packageItem.employeeName}</p>
          <p>Duration: ${fromDate} to ${toDate}</p>
        </div>

        <div class="section">
          <div class="section-title">Basic Information</div>
          <div class="info-row">
            <span class="info-label">Package ID:</span>
            <span class="info-value">${packageItem.packageId || 'N/A'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Basic Pay:</span>
            <span class="info-value">${this.formatCurrency(packageItem.basicPay.amount)}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Status:</span>
            <span class="info-value">${packageItem.status || 'Active'}</span>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Targets</div>
          <div class="info-row">
            <span class="info-label">Sales Target:</span>
            <span class="info-value">${this.formatCurrency(packageItem.salesTarget.targetAmount)} (${packageItem.salesTarget.incentiveType}: ${packageItem.salesTarget.incentiveValue})</span>
          </div>
          <div class="info-row">
            <span class="info-label">Recovery Target:</span>
            <span class="info-value">${this.formatCurrency(packageItem.recoveryTarget.targetAmount)} (${packageItem.recoveryTarget.incentiveType}: ${packageItem.recoveryTarget.incentiveValue})</span>
          </div>
          <div class="info-row">
            <span class="info-label">Party Visit Target:</span>
            <span class="info-value">${packageItem.partyVisitTarget.numberOfOrders} orders (${packageItem.partyVisitTarget.type}: ${packageItem.partyVisitTarget.value})</span>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Allowances</div>
          <div class="info-row">
            <span class="info-label">Daily Allowance:</span>
            <span class="info-value">${packageItem.dailyAllowance.type}: ${packageItem.dailyAllowance.value}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Petrol Allowance:</span>
            <span class="info-value">${packageItem.petrolAllowance.type}: ${packageItem.petrolAllowance.value}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Mobile Package:</span>
            <span class="info-value">${packageItem.mobilePackage.type}: ${packageItem.mobilePackage.value}</span>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Mobile Incentives</div>
          <div class="info-row">
            <span class="info-label">Mobile Order Incentive:</span>
            <span class="info-value">${packageItem.mobileOrderIncentive.type}: ${packageItem.mobileOrderIncentive.value}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Mobile Cash Recovery Incentive:</span>
            <span class="info-value">${packageItem.mobileCashRecoveryIncentive.type}: ${packageItem.mobileCashRecoveryIncentive.value}</span>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Bonuses</div>
          <div class="info-row">
            <span class="info-label">Eid Fitr Bonus:</span>
            <span class="info-value">${packageItem.eidFitrBonus.month} - ${packageItem.eidFitrBonus.type}: ${packageItem.eidFitrBonus.value}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Eid Adha Bonus:</span>
            <span class="info-value">${packageItem.eidAdhaBonus.month} - ${packageItem.eidAdhaBonus.type}: ${packageItem.eidAdhaBonus.value}</span>
          </div>
          ${packageItem.otherBonus.detail ? `
          <div class="info-row">
            <span class="info-label">Other Bonus:</span>
            <span class="info-value">${packageItem.otherBonus.detail} (${packageItem.otherBonus.month}) - ${packageItem.otherBonus.type}: ${packageItem.otherBonus.value}</span>
          </div>
          ` : ''}
        </div>

        ${packageItem.brandIncentives.length > 0 ? `
        <div class="section">
          <div class="section-title">Brand Incentives</div>
          ${packageItem.brandIncentives.map(incentive => {
            const fromDate = new Date(incentive.duration.fromDate).toLocaleDateString();
            const toDate = new Date(incentive.duration.toDate).toLocaleDateString();
            return `
            <div class="brand-incentive">
              <div><strong>${incentive.itemName}</strong></div>
              <div>Target Quantity: ${incentive.quantityTarget}</div>
              <div>Duration: ${fromDate} to ${toDate}</div>
              <div>Incentive: ${incentive.type}: ${incentive.value}</div>
            </div>
            `;
          }).join('')}
        </div>
        ` : ''}

        <div class="section no-print" style="margin-top: 30px; text-align: center;">
          <button onclick="window.print()" style="padding: 10px 20px; font-size: 16px; cursor: pointer;">Print</button>
          <button onclick="window.close()" style="padding: 10px 20px; font-size: 16px; cursor: pointer; margin-left: 10px;">Close</button>
        </div>
      </body>
      </html>
    `;
  }

  onCreateNew(): void {
    this.router.navigate(['/salary-packages/new']);
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
  }

  get pagedPackages(): SalaryPackage[] {
    const start = this.currentPage * this.pageSize;
    return this.packages.slice(start, start + this.pageSize);
  }

  getSerialNumber(index: number): number {
    return this.currentPage * this.pageSize + index + 1;
  }

  getVisitedParties(packageItem: SalaryPackage): number {
    const employeeId = typeof packageItem.employeeId === 'string'
      ? packageItem.employeeId
      : (packageItem.employeeId as any)?._id;
    return employeeId ? (this.performanceByEmployee[employeeId]?.partyVisitTarget?.achieved || 0) : 0;
  }
}
