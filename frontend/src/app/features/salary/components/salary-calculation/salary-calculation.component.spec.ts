import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { SalaryCalculationComponent } from './salary-calculation.component';
import { SalaryCalculationService } from '../../services/salary-calculation.service';
import { SalaryPackageService } from '../../services/salary-package.service';
import { ToastService } from '../../../../shared/services/toast.service';

describe('SalaryCalculationComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        SalaryCalculationComponent,
        HttpClientTestingModule,
        BrowserAnimationsModule
      ],
      providers: [
        SalaryCalculationService,
        SalaryPackageService,
        ToastService
      ]
    }).compileComponents();
  });

  it('should create the component', () => {
    const fixture = TestBed.createComponent(SalaryCalculationComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('should initialize the form with current month and year', () => {
    const fixture = TestBed.createComponent(SalaryCalculationComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    const currentDate = new Date();
    const currentMonth = component.months[currentDate.getMonth()];
    const currentYear = currentDate.getFullYear();

    expect(component.calculationForm.get('month')?.value).toBe(currentMonth);
    expect(component.calculationForm.get('year')?.value).toBe(currentYear);
  });

  it('should have required validators on form fields', () => {
    const fixture = TestBed.createComponent(SalaryCalculationComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    const employeeIdControl = component.calculationForm.get('employeeId');
    const monthControl = component.calculationForm.get('month');
    const yearControl = component.calculationForm.get('year');

    expect(employeeIdControl?.hasError('required')).toBe(true);
    expect(monthControl?.hasError('required')).toBe(false); // Has default value
    expect(yearControl?.hasError('required')).toBe(false); // Has default value
  });

  it('should format currency correctly', () => {
    const fixture = TestBed.createComponent(SalaryCalculationComponent);
    const component = fixture.componentInstance;

    expect(component.formatCurrency(50000)).toBe('50,000.00');
    expect(component.formatCurrency(1234.56)).toBe('1,234.56');
    expect(component.formatCurrency(0)).toBe('0.00');
  });
});
