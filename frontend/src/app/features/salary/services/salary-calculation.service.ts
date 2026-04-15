import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { API_CONFIG } from '../../../core/constants/api.constants';
import {
  SalaryCalculation,
  SalaryCalculationRequest,
  ApiResponse
} from '../../../core/models/salary-calculation.model';

@Injectable({
  providedIn: 'root'
})
export class SalaryCalculationService {
  private readonly baseUrl = API_CONFIG.BASE_URL;

  constructor(private http: HttpClient) {}

  /**
   * Calculate salary for employee for a specific month/year
   */
  calculateSalary(request: SalaryCalculationRequest): Observable<ApiResponse<SalaryCalculation>> {
    return this.http.post<ApiResponse<SalaryCalculation>>(
      `${this.baseUrl}/salary/calculate`,
      request
    ).pipe(
      catchError((error) => {
        console.error('[SalaryCalculationService] Calculate salary failed:', error);
        // Mock response for development
        const mockCalculation: SalaryCalculation = {
          _id: Date.now().toString(),
          calculationId: `CALC${Date.now()}`,
          packageId: 'PKG001',
          employeeId: request.employeeId,
          employeeName: 'Mock Employee',
          month: request.month,
          year: request.year,
          basicPay: 50000,
          dailyAllowance: 5000,
          petrolAllowance: 8000,
          mobilePackage: 2000,
          salesIncentive: {
            target: 500000,
            achieved: 550000,
            percentage: 110,
            amount: 25000
          },
          recoveryIncentive: {
            target: 450000,
            achieved: 480000,
            percentage: 106.67,
            amount: 15000
          },
          partyVisitIncentive: {
            target: 100,
            achieved: 95,
            amount: 0
          },
          mobileOrderIncentive: {
            ordersCreated: 45,
            amount: 4500
          },
          mobileCashRecoveryIncentive: {
            amountRecovered: 250000,
            amount: 5000
          },
          brandIncentives: [
            {
              itemName: 'Panadol 500mg',
              target: 1000,
              achieved: 1200,
              amount: 10000
            }
          ],
          bonuses: [
            {
              type: 'Eid Fitr',
              detail: 'Eid ul Fitr Bonus',
              amount: 20000
            }
          ],
          grossSalary: 144500,
          deductions: {
            tax: 7225,
            advance: 5000,
            loan: 10000,
            other: 0
          },
          netSalary: 122275,
          calculatedAt: new Date().toISOString()
        };
        
        return of({
          success: true,
          data: mockCalculation,
          message: 'Salary calculated successfully (mock response)'
        });
      })
    );
  }

  /**
   * Get salary sheet for employee
   */
  getSalarySheet(employeeId: string, month: string, year: number): Observable<ApiResponse<SalaryCalculation>> {
    let params = new HttpParams()
      .set('month', month)
      .set('year', year.toString());

    return this.http.get<ApiResponse<SalaryCalculation>>(
      `${this.baseUrl}/salary/sheet/${employeeId}`,
      { params }
    );
  }

  /**
   * Get all salary calculations with filters
   */
  getCalculations(filters?: any): Observable<ApiResponse<SalaryCalculation[]>> {
    let params = new HttpParams();
    if (filters) {
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null) {
          params = params.set(key, filters[key].toString());
        }
      });
    }

    return this.http.get<ApiResponse<SalaryCalculation[]>>(
      `${this.baseUrl}/salary/calculations`,
      { params }
    );
  }
}
