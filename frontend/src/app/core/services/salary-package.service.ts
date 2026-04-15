import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface IncentiveConfig {
    type: 'Fix Amount' | 'Amount' | '%';
    value: number;
}

export interface TargetConfig extends IncentiveConfig {
    targetAmount: number;
}

export interface BrandIncentive {
    _id?: string;
    itemId: string;
    itemName?: string;
    quantityTarget: number;
    duration: {
        fromDate: string;
        toDate: string;
    };
    type: 'Fix Amount' | 'Amount' | '%';
    value: number;
}

export interface BonusConfig extends IncentiveConfig {
    month: string;
    detail?: string;
}

export interface SalaryPackage {
    _id?: string;
    packageId?: string;
    employeeId: string;
    employeeName?: string;
    duration: {
        fromDate: string;
        toDate: string;
    };
    basicPay?: {
        amount: number;
        source: string;
    };
    salesTarget?: TargetConfig;
    recoveryTarget?: TargetConfig;
    dailyAllowance?: IncentiveConfig;
    petrolAllowance?: IncentiveConfig;
    mobilePackage?: IncentiveConfig;
    mobileOrderIncentive?: IncentiveConfig;
    mobileCashRecoveryIncentive?: IncentiveConfig & {
        verifyWithCashBook?: boolean;
    };
    partyVisitTarget?: IncentiveConfig & {
        numberOfOrders: number;
    };
    eidFitrBonus?: BonusConfig;
    eidAdhaBonus?: BonusConfig;
    otherBonus?: BonusConfig;
    brandIncentives?: BrandIncentive[];
    status?: string;
    createdBy?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    packageId?: string;
    message?: string;
}

export interface PaginatedResponse<T> {
    success: boolean;
    packages?: T[];
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
export class SalaryPackageService {
    private baseUrl = `${environment.apiUrl}/salary-packages`;

    constructor(private http: HttpClient) { }

    /**
     * Create a new salary package
     * @param packageData - Salary package data
     * @returns Observable with API response
     */
    createPackage(packageData: SalaryPackage): Observable<ApiResponse<SalaryPackage>> {
        return this.http.post<ApiResponse<SalaryPackage>>(this.baseUrl, packageData);
    }

    /**
     * Get all salary packages with optional filters
     * @param filters - Optional filters (status, year, employeeId)
     * @returns Observable with paginated response
     */
    getPackages(filters?: {
        status?: string;
        year?: number;
        employeeId?: string;
        page?: number;
        limit?: number;
    }): Observable<PaginatedResponse<SalaryPackage>> {
        let params = new HttpParams();

        if (filters) {
            if (filters.status) params = params.set('status', filters.status);
            if (filters.year) params = params.set('year', filters.year.toString());
            if (filters.employeeId) params = params.set('employeeId', filters.employeeId);
            if (filters.page) params = params.set('page', filters.page.toString());
            if (filters.limit) params = params.set('limit', filters.limit.toString());
        }

        return this.http.get<PaginatedResponse<SalaryPackage>>(this.baseUrl, { params });
    }

    /**
     * Get a salary package by ID
     * @param id - Package ID
     * @returns Observable with API response
     */
    getPackageById(id: string): Observable<ApiResponse<SalaryPackage>> {
        return this.http.get<ApiResponse<SalaryPackage>>(`${this.baseUrl}/${id}`);
    }

    /**
     * Update an existing salary package
     * @param id - Package ID
     * @param updates - Updated package data
     * @returns Observable with API response
     */
    updatePackage(id: string, updates: Partial<SalaryPackage>): Observable<ApiResponse<SalaryPackage>> {
        return this.http.put<ApiResponse<SalaryPackage>>(`${this.baseUrl}/${id}`, updates);
    }

    /**
     * Delete a salary package
     * @param id - Package ID
     * @returns Observable with API response
     */
    deletePackage(id: string): Observable<ApiResponse<void>> {
        return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/${id}`);
    }
}
