import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { SalaryPackageService } from '../../services/salary-package.service';
import { ToastService } from '../../../../shared/services/toast.service';
import {
  SalaryPackageCreateRequest,
  SalaryPackage,
  Employee,
  Item,
  IncentiveType,
  BrandIncentive
} from '../../../../core/models/salary-package.model';

@Component({
  selector: 'app-salary-package-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDividerModule
  ],
  templateUrl: './salary-package-form.component.html',
  styleUrl: './salary-package-form.component.scss'
})
export class SalaryPackageFormComponent implements OnInit {
  packageForm!: FormGroup;
  employees: Employee[] = [];
  items: Item[] = [];
  saving = false;
  loading = false;
  selectedEmployee: Employee | null = null;
  isEditMode = false;
  packageId: string | null = null;

  incentiveTypes: IncentiveType[] = ['Fix Amount', 'Amount', '%'];
  
  months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  constructor(
    private fb: FormBuilder,
    private salaryPackageService: SalaryPackageService,
    private toastService: ToastService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.loadEmployees();
    this.loadItems();
    this.setupEmployeeChangeListener();
    this.checkEditMode();
  }

  private checkEditMode(): void {
    this.packageId = this.route.snapshot.paramMap.get('id');
    if (this.packageId) {
      this.isEditMode = true;
      this.loadPackageData(this.packageId);
    }
  }

  private loadPackageData(id: string): void {
    this.loading = true;
    this.salaryPackageService.getPackageById(id).subscribe({
      next: (response) => {
        if (response.success) {
          this.populateForm(response.data);
        }
        this.loading = false;
      },
      error: (error) => {
        this.toastService.error('Failed to load package data');
        console.error('Error loading package:', error);
        this.loading = false;
        this.router.navigate(['/salary-packages']);
      }
    });
  }

  private populateForm(packageData: SalaryPackage): void {
    this.packageForm.patchValue({
      duration: {
        fromDate: new Date(packageData.duration.fromDate),
        toDate: new Date(packageData.duration.toDate)
      },
      employeeId: packageData.employeeId,
      basicPay: packageData.basicPay.amount,
      salesTarget: packageData.salesTarget,
      recoveryTarget: packageData.recoveryTarget,
      dailyAllowance: packageData.dailyAllowance,
      petrolAllowance: packageData.petrolAllowance,
      mobilePackage: packageData.mobilePackage,
      mobileOrderIncentive: packageData.mobileOrderIncentive,
      mobileCashRecoveryIncentive: packageData.mobileCashRecoveryIncentive,
      partyVisitTarget: packageData.partyVisitTarget,
      eidFitrBonus: packageData.eidFitrBonus,
      eidAdhaBonus: packageData.eidAdhaBonus,
      otherBonus: packageData.otherBonus
    });

    // Populate brand incentives
    packageData.brandIncentives.forEach(incentive => {
      const brandIncentiveGroup = this.fb.group({
        itemId: [incentive.itemId, Validators.required],
        itemName: [incentive.itemName],
        quantityTarget: [incentive.quantityTarget, [Validators.required, Validators.min(1)]],
        duration: this.fb.group({
          fromDate: [new Date(incentive.duration.fromDate), Validators.required],
          toDate: [new Date(incentive.duration.toDate), Validators.required]
        }),
        type: [incentive.type, Validators.required],
        value: [incentive.value, [Validators.required, Validators.min(0)]]
      });

      this.brandIncentives.push(brandIncentiveGroup);
    });
  }

  private initializeForm(): void {
    this.packageForm = this.fb.group({
      // Duration
      duration: this.fb.group({
        fromDate: ['', Validators.required],
        toDate: ['', Validators.required]
      }),
      
      // Employee
      employeeId: ['', Validators.required],
      
      // Basic Pay (read-only, auto-populated)
      basicPay: [{ value: 0, disabled: true }],
      
      // Sales Target
      salesTarget: this.fb.group({
        targetAmount: [0, [Validators.required, Validators.min(0)]],
        incentiveType: ['Fix Amount', Validators.required],
        incentiveValue: [0, [Validators.required, Validators.min(0)]]
      }),
      
      // Recovery Target
      recoveryTarget: this.fb.group({
        targetAmount: [0, [Validators.required, Validators.min(0)]],
        incentiveType: ['Fix Amount', Validators.required],
        incentiveValue: [0, [Validators.required, Validators.min(0)]]
      }),
      
      // Daily Allowance
      dailyAllowance: this.fb.group({
        type: ['Fix Amount', Validators.required],
        value: [0, [Validators.required, Validators.min(0)]]
      }),
      
      // Petrol Allowance
      petrolAllowance: this.fb.group({
        type: ['Fix Amount', Validators.required],
        value: [0, [Validators.required, Validators.min(0)]]
      }),
      
      // Mobile Package
      mobilePackage: this.fb.group({
        type: ['Fix Amount', Validators.required],
        value: [0, [Validators.required, Validators.min(0)]]
      }),
      
      // Mobile Order Incentive
      mobileOrderIncentive: this.fb.group({
        type: ['Fix Amount', Validators.required],
        value: [0, [Validators.required, Validators.min(0)]]
      }),
      
      // Mobile Cash Recovery Incentive
      mobileCashRecoveryIncentive: this.fb.group({
        type: ['Fix Amount', Validators.required],
        value: [0, [Validators.required, Validators.min(0)]]
      }),
      
      // Party Visit Target
      partyVisitTarget: this.fb.group({
        numberOfOrders: [0, [Validators.required, Validators.min(0)]],
        type: ['Fix Amount', Validators.required],
        value: [0, [Validators.required, Validators.min(0)]]
      }),
      
      // Eid Fitr Bonus
      eidFitrBonus: this.fb.group({
        month: ['', Validators.required],
        type: ['Fix Amount', Validators.required],
        value: [0, [Validators.required, Validators.min(0)]]
      }),
      
      // Eid Adha Bonus
      eidAdhaBonus: this.fb.group({
        month: ['', Validators.required],
        type: ['Fix Amount', Validators.required],
        value: [0, [Validators.required, Validators.min(0)]]
      }),
      
      // Other Bonus
      otherBonus: this.fb.group({
        detail: [''],
        month: [''],
        type: ['Fix Amount', Validators.required],
        value: [0, [Validators.min(0)]]
      }),
      
      // Brand Incentives (array)
      brandIncentives: this.fb.array([])
    });
  }

  private setupEmployeeChangeListener(): void {
    this.packageForm.get('employeeId')?.valueChanges.subscribe(employeeId => {
      const employee = this.employees.find(e => e._id === employeeId);
      if (employee) {
        this.selectedEmployee = employee;
        this.packageForm.patchValue({
          basicPay: employee.basicPay
        });
      }
    });
  }

  private loadEmployees(): void {
    this.salaryPackageService.getEmployees().subscribe({
      next: (response) => {
        if (response.success) {
          this.employees = response.data;
        }
      },
      error: (error) => {
        this.toastService.error('Failed to load employees');
        console.error('Error loading employees:', error);
      }
    });
  }

  private loadItems(): void {
    this.salaryPackageService.getItems().subscribe({
      next: (response) => {
        if (response.success) {
          this.items = response.data;
        }
      },
      error: (error) => {
        this.toastService.error('Failed to load items');
        console.error('Error loading items:', error);
      }
    });
  }

  get brandIncentives(): FormArray {
    return this.packageForm.get('brandIncentives') as FormArray;
  }

  addBrandIncentive(): void {
    const brandIncentiveGroup = this.fb.group({
      itemId: ['', Validators.required],
      itemName: [''],
      quantityTarget: [0, [Validators.required, Validators.min(1)]],
      duration: this.fb.group({
        fromDate: ['', Validators.required],
        toDate: ['', Validators.required]
      }),
      type: ['Fix Amount', Validators.required],
      value: [0, [Validators.required, Validators.min(0)]]
    });

    // Update itemName when itemId changes
    brandIncentiveGroup.get('itemId')?.valueChanges.subscribe(itemId => {
      const item = this.items.find(i => i._id === itemId);
      if (item) {
        brandIncentiveGroup.patchValue({ itemName: item.name });
      }
    });

    this.brandIncentives.push(brandIncentiveGroup);
  }

  removeBrandIncentive(index: number): void {
    this.brandIncentives.removeAt(index);
  }

  onSubmit(): void {
    if (this.packageForm.valid) {
      this.saving = true;

      const formValue = this.packageForm.getRawValue();
      
      const packageData: SalaryPackageCreateRequest = {
        employeeId: formValue.employeeId,
        duration: formValue.duration,
        salesTarget: formValue.salesTarget,
        recoveryTarget: formValue.recoveryTarget,
        dailyAllowance: formValue.dailyAllowance,
        petrolAllowance: formValue.petrolAllowance,
        mobilePackage: formValue.mobilePackage,
        mobileOrderIncentive: formValue.mobileOrderIncentive,
        mobileCashRecoveryIncentive: formValue.mobileCashRecoveryIncentive,
        partyVisitTarget: formValue.partyVisitTarget,
        eidFitrBonus: formValue.eidFitrBonus,
        eidAdhaBonus: formValue.eidAdhaBonus,
        otherBonus: formValue.otherBonus,
        brandIncentives: formValue.brandIncentives
      };

      const request$ = this.isEditMode && this.packageId
        ? this.salaryPackageService.updatePackage(this.packageId, packageData)
        : this.salaryPackageService.createPackage(packageData);

      request$.subscribe({
        next: (response) => {
          if (response.success) {
            this.toastService.success(
              this.isEditMode 
                ? 'Salary package updated successfully' 
                : 'Salary package created successfully'
            );
            this.router.navigate(['/salary-packages']);
          }
          this.saving = false;
        },
        error: (error) => {
          this.toastService.error(
            error.userMessage || 
            `Failed to ${this.isEditMode ? 'update' : 'create'} salary package`
          );
          this.saving = false;
        }
      });
    } else {
      this.toastService.error('Please fill all required fields');
      this.markFormGroupTouched(this.packageForm);
    }
  }

  private markFormGroupTouched(formGroup: FormGroup | FormArray): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();

      if (control instanceof FormGroup || control instanceof FormArray) {
        this.markFormGroupTouched(control);
      }
    });
  }

  onCancel(): void {
    this.router.navigate(['/salary-packages']);
  }
}
