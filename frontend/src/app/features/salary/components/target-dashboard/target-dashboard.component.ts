import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatInputModule } from '@angular/material/input';
import { TargetTrackingService } from '../../services/target-tracking.service';
import { ToastService } from '../../../../shared/services/toast.service';
import { TargetDashboardData, EmployeeTargetData } from '../../../../core/models/target-tracking.model';

@Component({
  selector: 'app-target-dashboard',
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
    MatInputModule,
    MatTooltipModule,
    MatChipsModule,
    MatExpansionModule
  ],
  templateUrl: './target-dashboard.component.html',
  styleUrl: './target-dashboard.component.scss'
})
export class TargetDashboardComponent implements OnInit {
  dashboardData: TargetDashboardData | null = null;
  loading = false;

  displayedColumns: string[] = [
    'serial',
    'employeeName',
    'salesTarget',
    'recoveryTarget',
    'partyVisitTarget',
    'mobileOrders',
    'brandIncentives'
  ];

  // Filters
  monthFilter = new FormControl('');
  yearFilter = new FormControl(new Date().getFullYear());

  months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  yearOptions: number[] = [];

  constructor(
    private targetTrackingService: TargetTrackingService,
    private toastService: ToastService
  ) {
    this.initializeYearOptions();
    this.initializeCurrentMonth();
  }

  ngOnInit(): void {
    this.loadDashboard();
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
    const currentMonth = this.months[currentDate.getMonth()];
    this.monthFilter.setValue(currentMonth);
  }

  private setupFilterListeners(): void {
    this.monthFilter.valueChanges.subscribe(() => {
      this.loadDashboard();
    });

    this.yearFilter.valueChanges.subscribe(() => {
      this.loadDashboard();
    });
  }

  loadDashboard(): void {
    const month = this.monthFilter.value;
    const year = this.yearFilter.value;

    if (!month || !year) {
      return;
    }

    this.loading = true;

    this.targetTrackingService.getTargetDashboard(month, year).subscribe({
      next: (response) => {
        if (response.success) {
          this.dashboardData = response.data;
        }
        this.loading = false;
      },
      error: (error) => {
        this.toastService.error('Failed to load target dashboard');
        console.error('Error loading dashboard:', error);
        this.loading = false;
      }
    });
  }

  getStatusClass(status: string): string {
    return status === 'achieved' ? 'achieved' : 'not-achieved';
  }

  getStatusIcon(status: string): string {
    return status === 'achieved' ? 'check_circle' : 'cancel';
  }

  formatCurrency(amount: number): string {
    return amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

  formatPercentage(percentage: number): string {
    return `${percentage.toFixed(1)}%`;
  }

  getProgressBarColor(percentage: number): string {
    if (percentage >= 100) return '#4CAF50'; // Green
    if (percentage >= 75) return '#FFC107'; // Amber
    if (percentage >= 50) return '#FF9800'; // Orange
    return '#F44336'; // Red
  }

  getProgressBarWidth(percentage: number): string {
    return `${Math.min(percentage, 100)}%`;
  }

  hasBrandIncentives(employee: EmployeeTargetData): boolean {
    return employee.brandIncentives && employee.brandIncentives.length > 0;
  }

  getBrandIncentivesAchieved(employee: EmployeeTargetData): number {
    if (!employee.brandIncentives) return 0;
    return employee.brandIncentives.filter(b => b.status === 'achieved').length;
  }

  getBrandIncentivesTotal(employee: EmployeeTargetData): number {
    return employee.brandIncentives?.length || 0;
  }
}
