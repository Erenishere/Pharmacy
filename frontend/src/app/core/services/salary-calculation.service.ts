import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface IncentiveBreakdown {
    target: number;
    achieved: number;
    percentage: number;
    amount: number;
}

export interface MobileIncentiveBreakdown {
    ordersCreated?: number;
    amountRecovered?: number;
    amount: number;
}

export interface BrandIncentiveBreakdown {
    itemName: string;
    target: number;
    achieved: number;
    amount: number;
}

export interface BonusBreakdown {
    type: string;
    detail?: string;
    amount: number;
}

export interface Deductions {
    tax: number;
    advance: number;
    loan: number;
    other: number;
}

export interface SalaryCalculation {
    _id?: string;
    calculationId?: string;
    packageId: string;
    employeeId: string;
    employeeName?: string;
    month: string;
    year: number;
    
    // Fixed Components
    basicPay: number;
    dailyAllowance: number;
    petrolAllowance: number;
    mobilePackage: number;
    
    // Target-Based Incentives
    salesIncentive?: IncentiveBreakdown;
    recoveryIncentive?: IncentiveBreakdown;
    partyVisitIncentive?: {
        target: number;
        achieved: number;
        amount: number;
    };
    
    // Mobile Incentives
    mobileOrderIncentive?: MobileIncentiveBreakdown;
    mobileCashRecoveryIncentive?: MobileIncentiveBreakdown;
    
    // Brand Incentives
    brandIncentives?: BrandIncentiveBreakdown[];
    
    // Bonuses
    bonuses?: BonusBreakdown[];
    
    // Totals
    grossSalary: number;
    deductions?: Deductions;
    netSalary: number;
    
    calculatedAt?: string;
    calculatedBy?: string;
}

export interface CalculateRequest {
    packageId: string;
    month: string;
    year: number;
}

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    calculation?: T;
    salarySheet?: T;
    grossSalary?: number;
    netSalary?: number;
    message?: string;
}

export interface PaginatedResponse<T> {
    success: boolean;
    calculations?: T[];
    data?: T[];
    pagination?: {
        currentPage: number;
        totalPages: number;
        totalItems: number;
        itemsPerPage: number;
    };
    message?: string;
}

@Injectable({
    providedIn: 'root'
})
export class SalaryCalculationService {
    private baseUrl = `${environment.apiUrl}/salary`;

    constructor(private http: HttpClient) { }

    /**
     * Calculate salary for a specific package and month
     * @param request - Calculation request with packageId, month, and year
     * @returns Observable with calculation result
     */
    calculateSalary(request: CalculateRequest): Observable<ApiResponse<SalaryCalculation>> {
        return this.http.post<ApiResponse<SalaryCalculation>>(`${this.baseUrl}/calculate`, request);
    }

    /**
     * Get salary sheet for an employee
     * @param employeeId - Employee ID
     * @param month - Month name (e.g., 'January')
     * @param year - Year number
     * @returns Observable with salary sheet
     */
    getSalarySheet(employeeId: string, month?: string, year?: number): Observable<ApiResponse<SalaryCalculation>> {
        let params = new HttpParams();
        
        if (month) params = params.set('month', month);
        if (year) params = params.set('year', year.toString());

        return this.http.get<ApiResponse<SalaryCalculation>>(`${this.baseUrl}/sheet/${employeeId}`, { params });
    }

    /**
     * Get all salary calculations with optional filters
     * @param filters - Optional filters (month, year, employeeId, page, limit)
     * @returns Observable with paginated calculations
     */
    getCalculations(filters?: {
        month?: string;
        year?: number;
        employeeId?: string;
        page?: number;
        limit?: number;
    }): Observable<PaginatedResponse<SalaryCalculation>> {
        let params = new HttpParams();

        if (filters) {
            if (filters.month) params = params.set('month', filters.month);
            if (filters.year) params = params.set('year', filters.year.toString());
            if (filters.employeeId) params = params.set('employeeId', filters.employeeId);
            if (filters.page) params = params.set('page', filters.page.toString());
            if (filters.limit) params = params.set('limit', filters.limit.toString());
        }

        return this.http.get<PaginatedResponse<SalaryCalculation>>(`${this.baseUrl}/calculations`, { params });
    }
}
