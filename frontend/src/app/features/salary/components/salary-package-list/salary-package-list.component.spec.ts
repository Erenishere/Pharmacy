import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';

import { SalaryPackageListComponent } from './salary-package-list.component';
import { SalaryPackageService } from '../../services/salary-package.service';
import { ToastService } from '../../../../shared/services/toast.service';
import { SalaryPackage } from '../../../../core/models/salary-package.model';

describe('SalaryPackageListComponent', () => {
  let component: SalaryPackageListComponent;
  let fixture: ComponentFixture<SalaryPackageListComponent>;
  let mockSalaryPackageService: jasmine.SpyObj<SalaryPackageService>;
  let mockToastService: jasmine.SpyObj<ToastService>;
  let mockRouter: jasmine.SpyObj<Router>;

  const mockPackages: SalaryPackage[] = [
    {
      _id: 'pkg1',
      packageId: 'PKG001',
      employeeId: 'emp1',
      employeeName: 'Ahmed Khan',
      duration: {
        fromDate: new Date('2025-01-01'),
        toDate: new Date('2025-12-31')
      },
      basicPay: {
        amount: 50000,
        source: 'biodata'
      },
      salesTarget: {
        targetAmount: 500000,
        incentiveType: 'Fix Amount',
        incentiveValue: 5000
      },
      recoveryTarget: {
        targetAmount: 450000,
        incentiveType: 'Fix Amount',
        incentiveValue: 4500
      },
      dailyAllowance: {
        type: 'Fix Amount',
        value: 1000
      },
      petrolAllowance: {
        type: 'Fix Amount',
        value: 2000
      },
      mobilePackage: {
        type: 'Fix Amount',
        value: 1500
      },
      mobileOrderIncentive: {
        type: 'Fix Amount',
        value: 500
      },
      mobileCashRecoveryIncentive: {
        type: 'Fix Amount',
        value: 500
      },
      partyVisitTarget: {
        numberOfOrders: 100,
        type: 'Fix Amount',
        value: 1000
      },
      eidFitrBonus: {
        month: 'April',
        type: 'Fix Amount',
        value: 5000
      },
      eidAdhaBonus: {
        month: 'July',
        type: 'Fix Amount',
        value: 5000
      },
      otherBonus: {
        detail: '',
        month: '',
        type: 'Fix Amount',
        value: 0
      },
      brandIncentives: [
        {
          itemId: 'item1',
          itemName: 'Panadol',
          quantityTarget: 100,
          duration: {
            fromDate: new Date('2025-01-01'),
            toDate: new Date('2025-12-31')
          },
          type: 'Fix Amount',
          value: 1000
        }
      ],
      status: 'Active'
    },
    {
      _id: 'pkg2',
      packageId: 'PKG002',
      employeeId: 'emp2',
      employeeName: 'Ali Raza',
      duration: {
        fromDate: new Date('2025-01-01'),
        toDate: new Date('2025-12-31')
      },
      basicPay: {
        amount: 45000,
        source: 'biodata'
      },
      salesTarget: {
        targetAmount: 400000,
        incentiveType: '%',
        incentiveValue: 5
      },
      recoveryTarget: {
        targetAmount: 380000,
        incentiveType: '%',
        incentiveValue: 5
      },
      dailyAllowance: {
        type: 'Fix Amount',
        value: 800
      },
      petrolAllowance: {
        type: 'Fix Amount',
        value: 1800
      },
      mobilePackage: {
        type: 'Fix Amount',
        value: 1200
      },
      mobileOrderIncentive: {
        type: 'Amount',
        value: 50
      },
      mobileCashRecoveryIncentive: {
        type: 'Amount',
        value: 50
      },
      partyVisitTarget: {
        numberOfOrders: 80,
        type: 'Fix Amount',
        value: 800
      },
      eidFitrBonus: {
        month: 'April',
        type: 'Fix Amount',
        value: 4500
      },
      eidAdhaBonus: {
        month: 'July',
        type: 'Fix Amount',
        value: 4500
      },
      otherBonus: {
        detail: '',
        month: '',
        type: 'Fix Amount',
        value: 0
      },
      brandIncentives: [],
      status: 'Active'
    }
  ];

  beforeEach(async () => {
    mockSalaryPackageService = jasmine.createSpyObj('SalaryPackageService', ['getPackages']);
    mockToastService = jasmine.createSpyObj('ToastService', ['success', 'error']);
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);

    mockSalaryPackageService.getPackages.and.returnValue(
      of({ success: true, data: mockPackages })
    );

    await TestBed.configureTestingModule({
      imports: [
        SalaryPackageListComponent,
        BrowserAnimationsModule
      ],
      providers: [
        { provide: SalaryPackageService, useValue: mockSalaryPackageService },
        { provide: ToastService, useValue: mockToastService },
        { provide: Router, useValue: mockRouter }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SalaryPackageListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Data Display', () => {
    it('should load packages on initialization', () => {
      expect(mockSalaryPackageService.getPackages).toHaveBeenCalled();
      expect(component.packages.length).toBe(2);
    });

    it('should display correct package data', () => {
      expect(component.packages[0].employeeName).toBe('Ahmed Khan');
      expect(component.packages[0].basicPay.amount).toBe(50000);
      expect(component.packages[1].employeeName).toBe('Ali Raza');
      expect(component.packages[1].basicPay.amount).toBe(45000);
    });

    it('should format duration correctly', () => {
      const duration = component.formatDuration(mockPackages[0].duration);
      expect(duration).toBe('01.01-31.12');
    });

    it('should format currency correctly', () => {
      expect(component.formatCurrency(50000)).toBe('50,000');
      expect(component.formatCurrency(500000)).toBe('500,000');
      expect(component.formatCurrency(1000)).toBe('1,000');
    });

    it('should display all required columns', () => {
      expect(component.displayedColumns).toContain('serial');
      expect(component.displayedColumns).toContain('employeeName');
      expect(component.displayedColumns).toContain('duration');
      expect(component.displayedColumns).toContain('basicPay');
      expect(component.displayedColumns).toContain('partyVisitingTarget');
      expect(component.displayedColumns).toContain('visitedParties');
      expect(component.displayedColumns).toContain('salesTarget');
      expect(component.displayedColumns).toContain('recoveryTarget');
      expect(component.displayedColumns).toContain('actions');
    });

    it('should show loading state while fetching data', () => {
      component.loading = true;
      fixture.detectChanges();
      expect(component.loading).toBeTrue();
    });

    it('should hide loading state after data is loaded', () => {
      expect(component.loading).toBeFalse();
    });

    it('should handle empty packages list', () => {
      mockSalaryPackageService.getPackages.and.returnValue(
        of({ success: true, data: [] })
      );
      component.loadPackages();
      expect(component.packages.length).toBe(0);
    });

    it('should handle error when loading packages', () => {
      mockSalaryPackageService.getPackages.and.returnValue(
        throwError(() => new Error('Failed to load'))
      );
      component.loadPackages();
      expect(mockToastService.error).toHaveBeenCalledWith('Failed to load salary packages');
    });
  });

  describe('Filters', () => {
    it('should initialize with default filters', () => {
      expect(component.statusFilter.value).toBe('Active');
      expect(component.yearFilter.value).toBe(new Date().getFullYear());
    });

    it('should have correct status options', () => {
      expect(component.statusOptions).toEqual(['Active', 'Inactive', 'All']);
    });

    it('should generate year options', () => {
      const currentYear = new Date().getFullYear();
      expect(component.yearOptions.length).toBe(5);
      expect(component.yearOptions).toContain(currentYear);
      expect(component.yearOptions).toContain(currentYear - 1);
      expect(component.yearOptions).toContain(currentYear + 1);
    });

    it('should reload packages when status filter changes', () => {
      const initialCallCount = mockSalaryPackageService.getPackages.calls.count();
      component.statusFilter.setValue('Inactive');
      expect(mockSalaryPackageService.getPackages.calls.count()).toBe(initialCallCount + 1);
    });

    it('should reload packages when year filter changes', () => {
      const initialCallCount = mockSalaryPackageService.getPackages.calls.count();
      component.yearFilter.setValue(2024);
      expect(mockSalaryPackageService.getPackages.calls.count()).toBe(initialCallCount + 1);
    });

    it('should pass filters to service when loading packages', () => {
      component.statusFilter.setValue('Active');
      component.yearFilter.setValue(2025);
      component.loadPackages();
      
      expect(mockSalaryPackageService.getPackages).toHaveBeenCalledWith({
        status: 'Active',
        year: 2025
      });
    });

    it('should not pass status filter when set to All', () => {
      component.statusFilter.setValue('All');
      component.yearFilter.setValue(2025);
      component.loadPackages();
      
      expect(mockSalaryPackageService.getPackages).toHaveBeenCalledWith({
        year: 2025
      });
    });
  });

  describe('Actions', () => {
    it('should navigate to edit page when onEdit is called', () => {
      component.onEdit(mockPackages[0]);
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/salary-packages', 'pkg1', 'edit']);
    });

    it('should navigate to create page when onCreateNew is called', () => {
      component.onCreateNew();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/salary-packages/new']);
    });

    it('should open print window when onPrint is called', () => {
      spyOn(window, 'open').and.returnValue({
        document: {
          write: jasmine.createSpy('write'),
          close: jasmine.createSpy('close')
        },
        onload: null
      } as any);

      component.onPrint(mockPackages[0]);
      expect(window.open).toHaveBeenCalled();
    });

    it('should show error toast when print window is blocked', () => {
      spyOn(window, 'open').and.returnValue(null);
      component.onPrint(mockPackages[0]);
      expect(mockToastService.error).toHaveBeenCalledWith('Please allow pop-ups to print');
    });
  });

  describe('Print Content Generation', () => {
    it('should generate print content with employee name', () => {
      const printContent = (component as any).generatePrintContent(mockPackages[0]);
      expect(printContent).toContain('Ahmed Khan');
    });

    it('should generate print content with basic pay', () => {
      const printContent = (component as any).generatePrintContent(mockPackages[0]);
      expect(printContent).toContain('50,000');
    });

    it('should generate print content with sales target', () => {
      const printContent = (component as any).generatePrintContent(mockPackages[0]);
      expect(printContent).toContain('500,000');
    });

    it('should generate print content with recovery target', () => {
      const printContent = (component as any).generatePrintContent(mockPackages[0]);
      expect(printContent).toContain('450,000');
    });

    it('should include brand incentives in print content when present', () => {
      const printContent = (component as any).generatePrintContent(mockPackages[0]);
      expect(printContent).toContain('Brand Incentives');
      expect(printContent).toContain('Panadol');
    });

    it('should not include brand incentives section when empty', () => {
      const printContent = (component as any).generatePrintContent(mockPackages[1]);
      expect(printContent).not.toContain('Brand Incentives');
    });

    it('should include other bonus when detail is provided', () => {
      const packageWithBonus = {
        ...mockPackages[0],
        otherBonus: {
          detail: 'Performance Bonus',
          month: 'December',
          type: 'Fix Amount' as const,
          value: 10000
        }
      };
      const printContent = (component as any).generatePrintContent(packageWithBonus);
      expect(printContent).toContain('Performance Bonus');
    });
  });

  describe('Visited Parties', () => {
    it('should return 0 for visited parties (placeholder)', () => {
      const visitedParties = component.getVisitedParties(mockPackages[0]);
      expect(visitedParties).toBe(0);
    });
  });
});
