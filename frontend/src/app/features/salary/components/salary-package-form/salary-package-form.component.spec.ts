import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';

import { SalaryPackageFormComponent } from './salary-package-form.component';
import { SalaryPackageService } from '../../services/salary-package.service';
import { ToastService } from '../../../../shared/services/toast.service';
import { Employee, Item, SalaryPackage } from '../../../../core/models/salary-package.model';

describe('SalaryPackageFormComponent', () => {
  let component: SalaryPackageFormComponent;
  let fixture: ComponentFixture<SalaryPackageFormComponent>;
  let mockSalaryPackageService: jasmine.SpyObj<SalaryPackageService>;
  let mockToastService: jasmine.SpyObj<ToastService>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockActivatedRoute: any;

  const mockEmployees: Employee[] = [
    {
      _id: 'emp1',
      code: 'E001',
      name: 'Ahmed Khan',
      basicPay: 50000,
      accountType: 'employee',
      isActive: true
    },
    {
      _id: 'emp2',
      code: 'E002',
      name: 'Ali Raza',
      basicPay: 45000,
      accountType: 'employee',
      isActive: true
    }
  ];

  const mockItems: Item[] = [
    { _id: 'item1', code: 'I001', name: 'Panadol' },
    { _id: 'item2', code: 'I002', name: 'Aspirin' }
  ];

  beforeEach(async () => {
    mockSalaryPackageService = jasmine.createSpyObj('SalaryPackageService', [
      'getEmployees',
      'getItems',
      'createPackage',
      'updatePackage',
      'getPackageById'
    ]);
    mockToastService = jasmine.createSpyObj('ToastService', ['success', 'error']);
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);
    mockActivatedRoute = {
      snapshot: {
        paramMap: {
          get: jasmine.createSpy('get').and.returnValue(null)
        }
      }
    };

    mockSalaryPackageService.getEmployees.and.returnValue(
      of({ success: true, data: mockEmployees })
    );
    mockSalaryPackageService.getItems.and.returnValue(
      of({ success: true, data: mockItems })
    );

    await TestBed.configureTestingModule({
      imports: [
        SalaryPackageFormComponent,
        ReactiveFormsModule,
        BrowserAnimationsModule
      ],
      providers: [
        { provide: SalaryPackageService, useValue: mockSalaryPackageService },
        { provide: ToastService, useValue: mockToastService },
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: mockActivatedRoute }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SalaryPackageFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Form Validation', () => {
    it('should initialize form with all required fields', () => {
      expect(component.packageForm).toBeDefined();
      expect(component.packageForm.get('duration')).toBeDefined();
      expect(component.packageForm.get('employeeId')).toBeDefined();
      expect(component.packageForm.get('basicPay')).toBeDefined();
      expect(component.packageForm.get('salesTarget')).toBeDefined();
      expect(component.packageForm.get('recoveryTarget')).toBeDefined();
      expect(component.packageForm.get('dailyAllowance')).toBeDefined();
      expect(component.packageForm.get('petrolAllowance')).toBeDefined();
      expect(component.packageForm.get('mobilePackage')).toBeDefined();
      expect(component.packageForm.get('mobileOrderIncentive')).toBeDefined();
      expect(component.packageForm.get('mobileCashRecoveryIncentive')).toBeDefined();
      expect(component.packageForm.get('partyVisitTarget')).toBeDefined();
      expect(component.packageForm.get('eidFitrBonus')).toBeDefined();
      expect(component.packageForm.get('eidAdhaBonus')).toBeDefined();
      expect(component.packageForm.get('otherBonus')).toBeDefined();
      expect(component.packageForm.get('brandIncentives')).toBeDefined();
    });

    it('should mark form as invalid when required fields are empty', () => {
      expect(component.packageForm.valid).toBeFalse();
    });

    it('should require duration fromDate', () => {
      const durationControl = component.packageForm.get('duration.fromDate');
      expect(durationControl?.hasError('required')).toBeTrue();
    });

    it('should require duration toDate', () => {
      const durationControl = component.packageForm.get('duration.toDate');
      expect(durationControl?.hasError('required')).toBeTrue();
    });

    it('should require employeeId', () => {
      const employeeControl = component.packageForm.get('employeeId');
      expect(employeeControl?.hasError('required')).toBeTrue();
    });

    it('should validate sales target amount is non-negative', () => {
      const salesTargetAmount = component.packageForm.get('salesTarget.targetAmount');
      salesTargetAmount?.setValue(-100);
      expect(salesTargetAmount?.hasError('min')).toBeTrue();
    });

    it('should validate recovery target amount is non-negative', () => {
      const recoveryTargetAmount = component.packageForm.get('recoveryTarget.targetAmount');
      recoveryTargetAmount?.setValue(-100);
      expect(recoveryTargetAmount?.hasError('min')).toBeTrue();
    });

    it('should validate daily allowance value is non-negative', () => {
      const dailyAllowanceValue = component.packageForm.get('dailyAllowance.value');
      dailyAllowanceValue?.setValue(-50);
      expect(dailyAllowanceValue?.hasError('min')).toBeTrue();
    });

    it('should mark form as valid when all required fields are filled correctly', () => {
      component.packageForm.patchValue({
        duration: {
          fromDate: new Date('2025-01-01'),
          toDate: new Date('2025-12-31')
        },
        employeeId: 'emp1',
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
        }
      });

      expect(component.packageForm.valid).toBeTrue();
    });

    it('should show error toast when submitting invalid form', () => {
      component.onSubmit();
      expect(mockToastService.error).toHaveBeenCalledWith('Please fill all required fields');
    });
  });

  describe('Employee Selection', () => {
    it('should auto-populate basic pay when employee is selected', () => {
      component.packageForm.patchValue({ employeeId: 'emp1' });
      
      expect(component.selectedEmployee).toEqual(mockEmployees[0]);
      expect(component.packageForm.get('basicPay')?.value).toBe(50000);
    });

    it('should update basic pay when different employee is selected', () => {
      component.packageForm.patchValue({ employeeId: 'emp1' });
      expect(component.packageForm.get('basicPay')?.value).toBe(50000);

      component.packageForm.patchValue({ employeeId: 'emp2' });
      expect(component.packageForm.get('basicPay')?.value).toBe(45000);
    });

    it('should keep basic pay field disabled', () => {
      const basicPayControl = component.packageForm.get('basicPay');
      expect(basicPayControl?.disabled).toBeTrue();
    });
  });

  describe('Form Submission', () => {
    beforeEach(() => {
      component.packageForm.patchValue({
        duration: {
          fromDate: new Date('2025-01-01'),
          toDate: new Date('2025-12-31')
        },
        employeeId: 'emp1',
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
        }
      });
    });

    it('should call createPackage service when form is valid in create mode', () => {
      mockSalaryPackageService.createPackage.and.returnValue(
        of({ success: true, data: {} as any })
      );

      component.onSubmit();

      expect(mockSalaryPackageService.createPackage).toHaveBeenCalled();
      expect(mockToastService.success).toHaveBeenCalledWith('Salary package created successfully');
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/salary-packages']);
    });

    it('should handle create package error', () => {
      mockSalaryPackageService.createPackage.and.returnValue(
        throwError(() => ({ userMessage: 'Failed to create package' }))
      );

      component.onSubmit();

      expect(mockToastService.error).toHaveBeenCalledWith('Failed to create package');
    });
  });

  describe('Cancel Action', () => {
    it('should navigate to salary packages list on cancel', () => {
      component.onCancel();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/salary-packages']);
    });
  });

  describe('Brand Incentive Add/Remove Functionality', () => {
    it('should initialize with empty brand incentives array', () => {
      expect(component.brandIncentives.length).toBe(0);
    });

    it('should add a new brand incentive when addBrandIncentive is called', () => {
      component.addBrandIncentive();
      expect(component.brandIncentives.length).toBe(1);
    });

    it('should add multiple brand incentives', () => {
      component.addBrandIncentive();
      component.addBrandIncentive();
      component.addBrandIncentive();
      expect(component.brandIncentives.length).toBe(3);
    });

    it('should create brand incentive with required fields', () => {
      component.addBrandIncentive();
      const brandIncentive = component.brandIncentives.at(0);
      
      expect(brandIncentive.get('itemId')).toBeDefined();
      expect(brandIncentive.get('itemName')).toBeDefined();
      expect(brandIncentive.get('quantityTarget')).toBeDefined();
      expect(brandIncentive.get('duration')).toBeDefined();
      expect(brandIncentive.get('type')).toBeDefined();
      expect(brandIncentive.get('value')).toBeDefined();
    });

    it('should set default values for new brand incentive', () => {
      component.addBrandIncentive();
      const brandIncentive = component.brandIncentives.at(0);
      
      expect(brandIncentive.get('itemId')?.value).toBe('');
      expect(brandIncentive.get('quantityTarget')?.value).toBe(0);
      expect(brandIncentive.get('type')?.value).toBe('Fix Amount');
      expect(brandIncentive.get('value')?.value).toBe(0);
    });

    it('should validate brand incentive required fields', () => {
      component.addBrandIncentive();
      const brandIncentive = component.brandIncentives.at(0);
      
      expect(brandIncentive.get('itemId')?.hasError('required')).toBeTrue();
      expect(brandIncentive.get('quantityTarget')?.hasError('required')).toBeTrue();
      expect(brandIncentive.get('duration.fromDate')?.hasError('required')).toBeTrue();
      expect(brandIncentive.get('duration.toDate')?.hasError('required')).toBeTrue();
      expect(brandIncentive.get('type')?.hasError('required')).toBeTrue();
      expect(brandIncentive.get('value')?.hasError('required')).toBeTrue();
    });

    it('should validate quantity target is at least 1', () => {
      component.addBrandIncentive();
      const brandIncentive = component.brandIncentives.at(0);
      
      brandIncentive.get('quantityTarget')?.setValue(0);
      expect(brandIncentive.get('quantityTarget')?.hasError('min')).toBeTrue();
      
      brandIncentive.get('quantityTarget')?.setValue(-5);
      expect(brandIncentive.get('quantityTarget')?.hasError('min')).toBeTrue();
      
      brandIncentive.get('quantityTarget')?.setValue(1);
      expect(brandIncentive.get('quantityTarget')?.hasError('min')).toBeFalse();
    });

    it('should validate incentive value is non-negative', () => {
      component.addBrandIncentive();
      const brandIncentive = component.brandIncentives.at(0);
      
      brandIncentive.get('value')?.setValue(-100);
      expect(brandIncentive.get('value')?.hasError('min')).toBeTrue();
      
      brandIncentive.get('value')?.setValue(0);
      expect(brandIncentive.get('value')?.hasError('min')).toBeFalse();
    });

    it('should auto-populate itemName when itemId is selected', () => {
      component.addBrandIncentive();
      const brandIncentive = component.brandIncentives.at(0);
      
      brandIncentive.get('itemId')?.setValue('item1');
      fixture.detectChanges();
      
      expect(brandIncentive.get('itemName')?.value).toBe('Panadol');
    });

    it('should remove brand incentive at specified index', () => {
      component.addBrandIncentive();
      component.addBrandIncentive();
      component.addBrandIncentive();
      
      expect(component.brandIncentives.length).toBe(3);
      
      component.removeBrandIncentive(1);
      
      expect(component.brandIncentives.length).toBe(2);
    });

    it('should remove correct brand incentive by index', () => {
      component.addBrandIncentive();
      component.brandIncentives.at(0).patchValue({ itemId: 'item1', itemName: 'Panadol' });
      
      component.addBrandIncentive();
      component.brandIncentives.at(1).patchValue({ itemId: 'item2', itemName: 'Aspirin' });
      
      component.addBrandIncentive();
      component.brandIncentives.at(2).patchValue({ itemId: 'item1', itemName: 'Panadol' });
      
      component.removeBrandIncentive(1);
      
      expect(component.brandIncentives.length).toBe(2);
      expect(component.brandIncentives.at(0).get('itemName')?.value).toBe('Panadol');
      expect(component.brandIncentives.at(1).get('itemName')?.value).toBe('Panadol');
    });

    it('should handle removing the only brand incentive', () => {
      component.addBrandIncentive();
      expect(component.brandIncentives.length).toBe(1);
      
      component.removeBrandIncentive(0);
      expect(component.brandIncentives.length).toBe(0);
    });

    it('should handle removing first brand incentive', () => {
      component.addBrandIncentive();
      component.addBrandIncentive();
      component.addBrandIncentive();
      
      component.removeBrandIncentive(0);
      
      expect(component.brandIncentives.length).toBe(2);
    });

    it('should handle removing last brand incentive', () => {
      component.addBrandIncentive();
      component.addBrandIncentive();
      component.addBrandIncentive();
      
      component.removeBrandIncentive(2);
      
      expect(component.brandIncentives.length).toBe(2);
    });

    it('should maintain form validity when brand incentives are added', () => {
      // Fill required fields
      component.packageForm.patchValue({
        duration: {
          fromDate: new Date('2025-01-01'),
          toDate: new Date('2025-12-31')
        },
        employeeId: 'emp1',
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
        }
      });

      expect(component.packageForm.valid).toBeTrue();

      // Add brand incentive with valid data
      component.addBrandIncentive();
      component.brandIncentives.at(0).patchValue({
        itemId: 'item1',
        itemName: 'Panadol',
        quantityTarget: 100,
        duration: {
          fromDate: new Date('2025-01-01'),
          toDate: new Date('2025-12-31')
        },
        type: 'Fix Amount',
        value: 1000
      });

      expect(component.packageForm.valid).toBeTrue();
    });

    it('should invalidate form when brand incentive has invalid data', () => {
      // Fill required fields
      component.packageForm.patchValue({
        duration: {
          fromDate: new Date('2025-01-01'),
          toDate: new Date('2025-12-31')
        },
        employeeId: 'emp1',
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
        }
      });

      // Add brand incentive with missing required fields
      component.addBrandIncentive();

      expect(component.packageForm.valid).toBeFalse();
    });
  });
});
