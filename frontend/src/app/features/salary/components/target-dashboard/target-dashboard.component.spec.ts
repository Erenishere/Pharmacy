import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';

import { TargetDashboardComponent } from './target-dashboard.component';
import { TargetTrackingService } from '../../services/target-tracking.service';
import { ToastService } from '../../../../shared/services/toast.service';
import { TargetDashboardData, EmployeeTargetData } from '../../../../core/models/target-tracking.model';

describe('TargetDashboardComponent', () => {
  let component: TargetDashboardComponent;
  let fixture: ComponentFixture<TargetDashboardComponent>;
  let mockTargetTrackingService: jasmine.SpyObj<TargetTrackingService>;
  let mockToastService: jasmine.SpyObj<ToastService>;

  const mockDashboardData: TargetDashboardData = {
    month: 'January',
    year: 2025,
    employees: [
      {
        employeeId: 'emp1',
        employeeName: 'Ahmed Khan',
        packageId: 'pkg1',
        salesTarget: {
          target: 500000,
          achieved: 550000,
          percentage: 110,
          status: 'achieved'
        },
        recoveryTarget: {
          target: 450000,
          achieved: 460000,
          percentage: 102.22,
          status: 'achieved'
        },
        partyVisitTarget: {
          target: 100,
          achieved: 95,
          percentage: 95,
          status: 'pending'
        },
        mobileOrders: {
          ordersCreated: 50,
          incentiveConfigured: true,
          incentiveType: 'Fix Amount',
          incentiveValue: 500
        },
        mobileCashRecovery: {
          amountRecovered: 200000,
          incentiveConfigured: true,
          incentiveType: 'Fix Amount',
          incentiveValue: 500
        },
        brandIncentives: [
          {
            itemName: 'Panadol',
            target: 100,
            achieved: 120,
            percentage: 120,
            status: 'achieved'
          },
          {
            itemName: 'Aspirin',
            target: 80,
            achieved: 60,
            percentage: 75,
            status: 'pending'
          }
        ]
      },
      {
        employeeId: 'emp2',
        employeeName: 'Ali Raza',
        packageId: 'pkg2',
        salesTarget: {
          target: 400000,
          achieved: 380000,
          percentage: 95,
          status: 'pending'
        },
        recoveryTarget: {
          target: 380000,
          achieved: 400000,
          percentage: 105.26,
          status: 'achieved'
        },
        partyVisitTarget: {
          target: 80,
          achieved: 82,
          percentage: 102.5,
          status: 'achieved'
        },
        mobileOrders: {
          ordersCreated: 40,
          incentiveConfigured: true,
          incentiveType: 'Amount',
          incentiveValue: 50
        },
        mobileCashRecovery: {
          amountRecovered: 150000,
          incentiveConfigured: true,
          incentiveType: 'Amount',
          incentiveValue: 50
        },
        brandIncentives: []
      }
    ],
    summary: {
      totalEmployees: 2,
      salesTargetAchievers: 1,
      recoveryTargetAchievers: 2,
      partyVisitTargetAchievers: 1
    }
  };

  beforeEach(async () => {
    mockTargetTrackingService = jasmine.createSpyObj('TargetTrackingService', ['getTargetDashboard']);
    mockToastService = jasmine.createSpyObj('ToastService', ['success', 'error']);

    mockTargetTrackingService.getTargetDashboard.and.returnValue(
      of({ success: true, data: mockDashboardData, message: 'Success' })
    );

    await TestBed.configureTestingModule({
      imports: [
        TargetDashboardComponent,
        BrowserAnimationsModule
      ],
      providers: [
        { provide: TargetTrackingService, useValue: mockTargetTrackingService },
        { provide: ToastService, useValue: mockToastService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TargetDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Color Coding', () => {
    it('should return "achieved" class for achieved status', () => {
      expect(component.getStatusClass('achieved')).toBe('achieved');
    });

    it('should return "not-achieved" class for non-achieved status', () => {
      expect(component.getStatusClass('pending')).toBe('not-achieved');
      expect(component.getStatusClass('no_package')).toBe('not-achieved');
      expect(component.getStatusClass('no_target')).toBe('not-achieved');
    });

    it('should return check_circle icon for achieved status', () => {
      expect(component.getStatusIcon('achieved')).toBe('check_circle');
    });

    it('should return cancel icon for non-achieved status', () => {
      expect(component.getStatusIcon('pending')).toBe('cancel');
      expect(component.getStatusIcon('no_package')).toBe('cancel');
    });

    it('should return green color for 100% or more achievement', () => {
      expect(component.getProgressBarColor(100)).toBe('#4CAF50');
      expect(component.getProgressBarColor(110)).toBe('#4CAF50');
      expect(component.getProgressBarColor(150)).toBe('#4CAF50');
    });

    it('should return amber color for 75-99% achievement', () => {
      expect(component.getProgressBarColor(75)).toBe('#FFC107');
      expect(component.getProgressBarColor(85)).toBe('#FFC107');
      expect(component.getProgressBarColor(99)).toBe('#FFC107');
    });

    it('should return orange color for 50-74% achievement', () => {
      expect(component.getProgressBarColor(50)).toBe('#FF9800');
      expect(component.getProgressBarColor(60)).toBe('#FF9800');
      expect(component.getProgressBarColor(74)).toBe('#FF9800');
    });

    it('should return red color for less than 50% achievement', () => {
      expect(component.getProgressBarColor(0)).toBe('#F44336');
      expect(component.getProgressBarColor(25)).toBe('#F44336');
      expect(component.getProgressBarColor(49)).toBe('#F44336');
    });

    it('should cap progress bar width at 100%', () => {
      expect(component.getProgressBarWidth(50)).toBe('50%');
      expect(component.getProgressBarWidth(100)).toBe('100%');
      expect(component.getProgressBarWidth(150)).toBe('100%');
    });
  });

  describe('Data Display', () => {
    it('should load dashboard data on initialization', () => {
      expect(mockTargetTrackingService.getTargetDashboard).toHaveBeenCalled();
      expect(component.dashboardData).toBeTruthy();
    });

    it('should display correct employee data', () => {
      expect(component.dashboardData?.employees.length).toBe(2);
      expect(component.dashboardData?.employees[0].employeeName).toBe('Ahmed Khan');
      expect(component.dashboardData?.employees[1].employeeName).toBe('Ali Raza');
    });

    it('should format currency correctly', () => {
      expect(component.formatCurrency(50000)).toBe('50,000');
      expect(component.formatCurrency(500000)).toBe('500,000');
      expect(component.formatCurrency(1234567)).toBe('1,234,567');
    });

    it('should format percentage correctly', () => {
      expect(component.formatPercentage(95.5)).toBe('95.5%');
      expect(component.formatPercentage(100)).toBe('100.0%');
      expect(component.formatPercentage(110.25)).toBe('110.3%');
    });

    it('should display all required columns', () => {
      expect(component.displayedColumns).toContain('serial');
      expect(component.displayedColumns).toContain('employeeName');
      expect(component.displayedColumns).toContain('salesTarget');
      expect(component.displayedColumns).toContain('recoveryTarget');
      expect(component.displayedColumns).toContain('partyVisitTarget');
      expect(component.displayedColumns).toContain('mobileOrders');
      expect(component.displayedColumns).toContain('brandIncentives');
    });

    it('should handle error when loading dashboard', () => {
      mockTargetTrackingService.getTargetDashboard.and.returnValue(
        throwError(() => new Error('Failed to load'))
      );
      component.loadDashboard();
      expect(mockToastService.error).toHaveBeenCalledWith('Failed to load target dashboard');
    });
  });

  describe('Filters', () => {
    it('should initialize with current month and year', () => {
      const currentDate = new Date();
      const currentMonth = component.months[currentDate.getMonth()];
      expect(component.monthFilter.value).toBe(currentMonth);
      expect(component.yearFilter.value).toBe(currentDate.getFullYear());
    });

    it('should have all 12 months', () => {
      expect(component.months.length).toBe(12);
      expect(component.months).toContain('January');
      expect(component.months).toContain('December');
    });

    it('should generate year options', () => {
      const currentYear = new Date().getFullYear();
      expect(component.yearOptions.length).toBe(5);
      expect(component.yearOptions).toContain(currentYear);
      expect(component.yearOptions).toContain(currentYear - 1);
      expect(component.yearOptions).toContain(currentYear + 1);
    });

    it('should reload dashboard when month filter changes', () => {
      const initialCallCount = mockTargetTrackingService.getTargetDashboard.calls.count();
      component.monthFilter.setValue('February');
      expect(mockTargetTrackingService.getTargetDashboard.calls.count()).toBe(initialCallCount + 1);
    });

    it('should reload dashboard when year filter changes', () => {
      const initialCallCount = mockTargetTrackingService.getTargetDashboard.calls.count();
      component.yearFilter.setValue(2024);
      expect(mockTargetTrackingService.getTargetDashboard.calls.count()).toBe(initialCallCount + 1);
    });

    it('should pass month and year to service when loading dashboard', () => {
      component.monthFilter.setValue('March');
      component.yearFilter.setValue(2025);
      component.loadDashboard();
      
      expect(mockTargetTrackingService.getTargetDashboard).toHaveBeenCalledWith('March', 2025);
    });

    it('should not load dashboard when month is empty', () => {
      const initialCallCount = mockTargetTrackingService.getTargetDashboard.calls.count();
      component.monthFilter.setValue('');
      component.loadDashboard();
      expect(mockTargetTrackingService.getTargetDashboard.calls.count()).toBe(initialCallCount);
    });

    it('should not load dashboard when year is empty', () => {
      const initialCallCount = mockTargetTrackingService.getTargetDashboard.calls.count();
      component.yearFilter.setValue(null as any);
      component.loadDashboard();
      expect(mockTargetTrackingService.getTargetDashboard.calls.count()).toBe(initialCallCount);
    });
  });

  describe('Brand Incentives', () => {
    it('should detect when employee has brand incentives', () => {
      const employee = mockDashboardData.employees[0];
      expect(component.hasBrandIncentives(employee)).toBeTrue();
    });

    it('should detect when employee has no brand incentives', () => {
      const employee = mockDashboardData.employees[1];
      expect(component.hasBrandIncentives(employee)).toBeFalse();
    });

    it('should count achieved brand incentives correctly', () => {
      const employee = mockDashboardData.employees[0];
      expect(component.getBrandIncentivesAchieved(employee)).toBe(1);
    });

    it('should return 0 achieved when no brand incentives', () => {
      const employee = mockDashboardData.employees[1];
      expect(component.getBrandIncentivesAchieved(employee)).toBe(0);
    });

    it('should count total brand incentives correctly', () => {
      const employee = mockDashboardData.employees[0];
      expect(component.getBrandIncentivesTotal(employee)).toBe(2);
    });

    it('should return 0 total when no brand incentives', () => {
      const employee = mockDashboardData.employees[1];
      expect(component.getBrandIncentivesTotal(employee)).toBe(0);
    });
  });

  describe('Loading State', () => {
    it('should show loading state while fetching data', () => {
      component.loading = true;
      fixture.detectChanges();
      expect(component.loading).toBeTrue();
    });

    it('should hide loading state after data is loaded', () => {
      expect(component.loading).toBeFalse();
    });
  });

  describe('Target Status Visualization', () => {
    it('should correctly identify achieved sales target', () => {
      const employee = mockDashboardData.employees[0];
      expect(employee.salesTarget.status).toBe('achieved');
      expect(component.getStatusClass(employee.salesTarget.status)).toBe('achieved');
    });

    it('should correctly identify pending sales target', () => {
      const employee = mockDashboardData.employees[1];
      expect(employee.salesTarget.status).toBe('pending');
      expect(component.getStatusClass(employee.salesTarget.status)).toBe('not-achieved');
    });

    it('should show correct progress bar color for high achievement', () => {
      const employee = mockDashboardData.employees[0];
      const color = component.getProgressBarColor(employee.salesTarget.percentage);
      expect(color).toBe('#4CAF50'); // Green for 110%
    });

    it('should show correct progress bar color for low achievement', () => {
      const employee = mockDashboardData.employees[1];
      const color = component.getProgressBarColor(employee.salesTarget.percentage);
      expect(color).toBe('#FFC107'); // Amber for 95%
    });
  });
});
