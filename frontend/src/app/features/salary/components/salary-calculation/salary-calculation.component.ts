import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { SalaryCalculationService } from '../../services/salary-calculation.service';
import { SalaryPackageService } from '../../services/salary-package.service';
import { ToastService } from '../../../../shared/services/toast.service';
import { SalaryCalculation } from '../../../../core/models/salary-calculation.model';
import { Employee } from '../../../../core/models/salary-package.model';

@Component({
  selector: 'app-salary-calculation',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatInputModule,
    MatSelectModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatIconModule,
    MatTableModule
  ],
  templateUrl: './salary-calculation.component.html',
  styleUrl: './salary-calculation.component.scss'
})
export class SalaryCalculationComponent implements OnInit {
  calculationForm!: FormGroup;
  employees: Employee[] = [];
  calculation: SalaryCalculation | null = null;
  loading = false;
  calculating = false;

  months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  years: number[] = [];

  constructor(
    private fb: FormBuilder,
    private salaryCalculationService: SalaryCalculationService,
    private salaryPackageService: SalaryPackageService,
    private toastService: ToastService
  ) {
    this.initializeYears();
  }

  ngOnInit(): void {
    this.initializeForm();
    this.loadEmployees();
  }

  private initializeYears(): void {
    const currentYear = new Date().getFullYear();
    for (let i = currentYear - 2; i <= currentYear + 2; i++) {
      this.years.push(i);
    }
  }

  private initializeForm(): void {
    const currentDate = new Date();
    const currentMonth = this.months[currentDate.getMonth()];
    const currentYear = currentDate.getFullYear();

    this.calculationForm = this.fb.group({
      employeeId: ['', Validators.required],
      month: [currentMonth, Validators.required],
      year: [currentYear, Validators.required]
    });
  }

  private loadEmployees(): void {
    this.loading = true;
    this.salaryPackageService.getEmployees().subscribe({
      next: (response) => {
        if (response.success) {
          this.employees = response.data;
        }
        this.loading = false;
      },
      error: (error) => {
        this.toastService.error('Failed to load employees');
        console.error('Error loading employees:', error);
        this.loading = false;
      }
    });
  }

  onCalculate(): void {
    if (this.calculationForm.valid) {
      this.calculating = true;
      const formValue = this.calculationForm.value;

      this.salaryCalculationService.calculateSalary(formValue).subscribe({
        next: (response) => {
          if (response.success) {
            this.calculation = response.data;
            this.toastService.success('Salary calculated successfully');
          }
          this.calculating = false;
        },
        error: (error) => {
          this.toastService.error(error.userMessage || 'Failed to calculate salary');
          console.error('Error calculating salary:', error);
          this.calculating = false;
        }
      });
    } else {
      this.toastService.error('Please fill all required fields');
      this.calculationForm.markAllAsTouched();
    }
  }

  onPrintSalarySheet(): void {
    if (!this.calculation) {
      this.toastService.error('No calculation available to print');
      return;
    }

    const printWindow = window.open('', '_blank', 'width=800,height=600');
    
    if (!printWindow) {
      this.toastService.error('Please allow pop-ups to print');
      return;
    }

    const printContent = this.generatePrintContent(this.calculation);
    
    printWindow.document.write(printContent);
    printWindow.document.close();
    
    printWindow.onload = () => {
      printWindow.print();
    };
  }

  private generatePrintContent(calculation: SalaryCalculation): string {
    const totalDeductions = 
      calculation.deductions.tax + 
      calculation.deductions.advance + 
      calculation.deductions.loan + 
      calculation.deductions.other;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Salary Sheet - ${calculation.employeeName}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 20px;
            max-width: 900px;
            margin: 0 auto;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 3px solid #333;
            padding-bottom: 15px;
          }
          .header h1 {
            margin: 0 0 10px 0;
            color: #333;
            font-size: 28px;
          }
          .header .subtitle {
            color: #666;
            font-size: 16px;
          }
          .info-section {
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
            padding: 15px;
            background-color: #f5f5f5;
            border-radius: 5px;
          }
          .info-item {
            flex: 1;
          }
          .info-label {
            font-weight: 600;
            color: #666;
            font-size: 12px;
            text-transform: uppercase;
          }
          .info-value {
            color: #333;
            font-size: 16px;
            margin-top: 5px;
          }
          .section {
            margin-bottom: 25px;
          }
          .section-title {
            font-weight: bold;
            font-size: 18px;
            margin-bottom: 15px;
            color: #333;
            border-bottom: 2px solid #4CAF50;
            padding-bottom: 8px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
          }
          th {
            background-color: #f9f9f9;
            font-weight: 600;
            color: #555;
          }
          td.amount {
            text-align: right;
            font-family: 'Courier New', monospace;
          }
          .total-row {
            font-weight: bold;
            background-color: #f0f0f0;
          }
          .total-row td {
            border-top: 2px solid #333;
            border-bottom: 2px solid #333;
            padding: 15px 12px;
          }
          .net-salary-row {
            font-weight: bold;
            font-size: 18px;
            background-color: #4CAF50;
            color: white;
          }
          .net-salary-row td {
            border: none;
            padding: 15px 12px;
          }
          .achievement-badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 3px;
            font-size: 11px;
            font-weight: 600;
            margin-left: 8px;
          }
          .achieved {
            background-color: #4CAF50;
            color: white;
          }
          .not-achieved {
            background-color: #f44336;
            color: white;
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
          <h1>Salary Sheet</h1>
          <div class="subtitle">Monthly Salary Calculation</div>
        </div>

        <div class="info-section">
          <div class="info-item">
            <div class="info-label">Employee Name</div>
            <div class="info-value">${calculation.employeeName}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Month</div>
            <div class="info-value">${calculation.month} ${calculation.year}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Calculation ID</div>
            <div class="info-value">${calculation.calculationId || 'N/A'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Date</div>
            <div class="info-value">${new Date(calculation.calculatedAt || new Date()).toLocaleDateString()}</div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Fixed Components</div>
          <table>
            <thead>
              <tr>
                <th>Component</th>
                <th class="amount">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Basic Pay</td>
                <td class="amount">${this.formatCurrency(calculation.basicPay)}</td>
              </tr>
              <tr>
                <td>Daily Allowance</td>
                <td class="amount">${this.formatCurrency(calculation.dailyAllowance)}</td>
              </tr>
              <tr>
                <td>Petrol Allowance</td>
                <td class="amount">${this.formatCurrency(calculation.petrolAllowance)}</td>
              </tr>
              <tr>
                <td>Mobile Package</td>
                <td class="amount">${this.formatCurrency(calculation.mobilePackage)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="section">
          <div class="section-title">Target-Based Incentives</div>
          <table>
            <thead>
              <tr>
                <th>Incentive</th>
                <th>Target</th>
                <th>Achieved</th>
                <th>%</th>
                <th class="amount">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Sales Incentive ${calculation.salesIncentive.percentage >= 100 ? '<span class="achievement-badge achieved">ACHIEVED</span>' : '<span class="achievement-badge not-achieved">NOT ACHIEVED</span>'}</td>
                <td>${this.formatCurrency(calculation.salesIncentive.target)}</td>
                <td>${this.formatCurrency(calculation.salesIncentive.achieved)}</td>
                <td>${calculation.salesIncentive.percentage.toFixed(2)}%</td>
                <td class="amount">${this.formatCurrency(calculation.salesIncentive.amount)}</td>
              </tr>
              <tr>
                <td>Recovery Incentive ${calculation.recoveryIncentive.percentage >= 100 ? '<span class="achievement-badge achieved">ACHIEVED</span>' : '<span class="achievement-badge not-achieved">NOT ACHIEVED</span>'}</td>
                <td>${this.formatCurrency(calculation.recoveryIncentive.target)}</td>
                <td>${this.formatCurrency(calculation.recoveryIncentive.achieved)}</td>
                <td>${calculation.recoveryIncentive.percentage.toFixed(2)}%</td>
                <td class="amount">${this.formatCurrency(calculation.recoveryIncentive.amount)}</td>
              </tr>
              <tr>
                <td>Party Visit Incentive ${calculation.partyVisitIncentive.achieved >= calculation.partyVisitIncentive.target ? '<span class="achievement-badge achieved">ACHIEVED</span>' : '<span class="achievement-badge not-achieved">NOT ACHIEVED</span>'}</td>
                <td>${calculation.partyVisitIncentive.target} visits</td>
                <td>${calculation.partyVisitIncentive.achieved} visits</td>
                <td>${calculation.partyVisitIncentive.target > 0 ? ((calculation.partyVisitIncentive.achieved / calculation.partyVisitIncentive.target) * 100).toFixed(2) : 0}%</td>
                <td class="amount">${this.formatCurrency(calculation.partyVisitIncentive.amount)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="section">
          <div class="section-title">Mobile Incentives</div>
          <table>
            <thead>
              <tr>
                <th>Incentive</th>
                <th>Details</th>
                <th class="amount">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Mobile Order Incentive</td>
                <td>${calculation.mobileOrderIncentive.ordersCreated} orders created</td>
                <td class="amount">${this.formatCurrency(calculation.mobileOrderIncentive.amount)}</td>
              </tr>
              <tr>
                <td>Mobile Cash Recovery Incentive</td>
                <td>${this.formatCurrency(calculation.mobileCashRecoveryIncentive.amountRecovered)} recovered</td>
                <td class="amount">${this.formatCurrency(calculation.mobileCashRecoveryIncentive.amount)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        ${calculation.brandIncentives.length > 0 ? `
        <div class="section">
          <div class="section-title">Brand Incentives</div>
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Target</th>
                <th>Achieved</th>
                <th class="amount">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${calculation.brandIncentives.map(incentive => `
                <tr>
                  <td>${incentive.itemName}</td>
                  <td>${incentive.target} units</td>
                  <td>${incentive.achieved} units</td>
                  <td class="amount">${this.formatCurrency(incentive.amount)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}

        ${calculation.bonuses.length > 0 ? `
        <div class="section">
          <div class="section-title">Bonuses</div>
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>Detail</th>
                <th class="amount">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${calculation.bonuses.map(bonus => `
                <tr>
                  <td>${bonus.type}</td>
                  <td>${bonus.detail}</td>
                  <td class="amount">${this.formatCurrency(bonus.amount)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}

        <div class="section">
          <table>
            <tbody>
              <tr class="total-row">
                <td><strong>Gross Salary</strong></td>
                <td class="amount"><strong>${this.formatCurrency(calculation.grossSalary)}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="section">
          <div class="section-title">Deductions</div>
          <table>
            <tbody>
              <tr>
                <td>Tax</td>
                <td class="amount">${this.formatCurrency(calculation.deductions.tax)}</td>
              </tr>
              <tr>
                <td>Advance</td>
                <td class="amount">${this.formatCurrency(calculation.deductions.advance)}</td>
              </tr>
              <tr>
                <td>Loan</td>
                <td class="amount">${this.formatCurrency(calculation.deductions.loan)}</td>
              </tr>
              <tr>
                <td>Other</td>
                <td class="amount">${this.formatCurrency(calculation.deductions.other)}</td>
              </tr>
              <tr class="total-row">
                <td><strong>Total Deductions</strong></td>
                <td class="amount"><strong>${this.formatCurrency(totalDeductions)}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="section">
          <table>
            <tbody>
              <tr class="net-salary-row">
                <td><strong>NET SALARY</strong></td>
                <td class="amount"><strong>${this.formatCurrency(calculation.netSalary)}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="no-print" style="margin-top: 30px; text-align: center;">
          <button onclick="window.print()" style="padding: 10px 20px; font-size: 16px; cursor: pointer; background-color: #4CAF50; color: white; border: none; border-radius: 4px;">Print</button>
          <button onclick="window.close()" style="padding: 10px 20px; font-size: 16px; cursor: pointer; margin-left: 10px; background-color: #666; color: white; border: none; border-radius: 4px;">Close</button>
        </div>
      </body>
      </html>
    `;
  }

  formatCurrency(amount: number): string {
    return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  getSelectedEmployeeName(): string {
    const employeeId = this.calculationForm.get('employeeId')?.value;
    const employee = this.employees.find(e => e._id === employeeId);
    return employee ? employee.name : '';
  }
}
