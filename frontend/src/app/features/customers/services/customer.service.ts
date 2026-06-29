import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, of, throwError } from 'rxjs';
import { debounceTime, distinctUntilChanged, catchError, tap, map, switchMap } from 'rxjs/operators';
import { API_CONFIG } from '../../../core/constants/api.constants';
import {
    Customer,
    CustomerCreateRequest,
    CustomerUpdateRequest,
    CustomerListResponse,
    CustomerStatistics,
    CustomerFilters,
    ApiResponse
} from '../../../core/models/customer.model';

@Injectable({
    providedIn: 'root'
})
export class CustomerService {
    private statisticsCache$ = new BehaviorSubject<CustomerStatistics | null>(null);
    private readonly baseUrl = API_CONFIG.BASE_URL;

    constructor(private http: HttpClient) {}

    /**
     * 1. GET /customers - Get paginated, filtered, searchable customer list
     */
    getCustomers(filters?: CustomerFilters): Observable<CustomerListResponse> {
        let params = new HttpParams();

        if (filters) {
            if (filters.page) params = params.set('page', filters.page.toString());
            if (filters.limit) params = params.set('limit', filters.limit.toString());
            if (filters.type) params = params.set('type', filters.type);
            if (filters.isActive !== undefined) params = params.set('isActive', filters.isActive.toString());
            if (filters.search) params = params.set('keyword', filters.search);
            if (filters.includeDeleted) params = params.set('includeDeleted', filters.includeDeleted.toString());
        }

        return this.http.get<CustomerListResponse>(
            `${this.baseUrl}${API_CONFIG.ENDPOINTS.CUSTOMERS.BASE}`,
            { params }
        ).pipe(
            catchError((error) => throwError(() => error))
        );
    }

    /**
     * 2. GET /customers/:id - Get single customer by ID
     */
    getCustomerById(id: string): Observable<ApiResponse<Customer>> {
        return this.http.get<ApiResponse<Customer>>(`${this.baseUrl}${API_CONFIG.ENDPOINTS.CUSTOMERS.BY_ID(id)}`);
    }

    /**
     * 3. GET /customers/code/:code - Get customer by code
     */
    getCustomerByCode(code: string): Observable<ApiResponse<Customer>> {
        return this.http.get<ApiResponse<Customer>>(`${this.baseUrl}${API_CONFIG.ENDPOINTS.CUSTOMERS.BY_CODE(code)}`);
    }

    /**
     * 4. POST /customers - Create new customer
     */
    createCustomer(customerData: CustomerCreateRequest): Observable<ApiResponse<Customer>> {
        return this.http.post<ApiResponse<Customer>>(`${this.baseUrl}${API_CONFIG.ENDPOINTS.CUSTOMERS.BASE}`, customerData)
            .pipe(
                tap(() => this.invalidateStatisticsCache()),
                catchError((error) => throwError(() => error))
            );
    }

    /**
     * 5. PUT /customers/:id - Update customer
     */
    updateCustomer(id: string, customerData: CustomerUpdateRequest): Observable<ApiResponse<Customer>> {
        return this.http.put<ApiResponse<Customer>>(`${this.baseUrl}${API_CONFIG.ENDPOINTS.CUSTOMERS.BY_ID(id)}`, customerData);
    }

    /**
     * 6. DELETE /customers/:id - Soft delete customer
     */
    deleteCustomer(id: string): Observable<ApiResponse<any>> {
        return this.http.delete<ApiResponse<any>>(`${this.baseUrl}${API_CONFIG.ENDPOINTS.CUSTOMERS.BY_ID(id)}`)
            .pipe(
                tap(() => this.invalidateStatisticsCache())
            );
    }

    /**
     * 7. GET /customers/type/:type - Get customers by type
     */
    getCustomersByType(type: string): Observable<ApiResponse<Customer[]>> {
        return this.http.get<ApiResponse<Customer[]>>(`${this.baseUrl}${API_CONFIG.ENDPOINTS.CUSTOMERS.BY_TYPE(type)}`);
    }

    /**
     * 8. GET /customers/statistics - Get customer statistics
     */
    getCustomerStatistics(forceRefresh = false): Observable<ApiResponse<CustomerStatistics>> {
        if (!forceRefresh && this.statisticsCache$.value) {
            return of({ success: true, data: this.statisticsCache$.value! });
        }

        return this.http.get<ApiResponse<CustomerStatistics>>(`${this.baseUrl}${API_CONFIG.ENDPOINTS.CUSTOMERS.STATISTICS}`)
            .pipe(
                tap(response => {
                    if (response.success) {
                        this.statisticsCache$.next(response.data);
                    }
                })
            );
    }

    /**
     * 9. PATCH /customers/:id/toggle-status - Toggle customer active status
     */
    toggleCustomerStatus(id: string): Observable<ApiResponse<Customer>> {
        return this.http.patch<ApiResponse<Customer>>(`${this.baseUrl}${API_CONFIG.ENDPOINTS.CUSTOMERS.TOGGLE_STATUS(id)}`, {})
            .pipe(
                tap(() => this.invalidateStatisticsCache()),
                catchError((error) => throwError(() => error))
            );
    }

    /**
     * 10. POST /customers/:id/restore - Restore soft-deleted customer
     */
    restoreCustomer(id: string): Observable<ApiResponse<Customer>> {
        return this.http.post<ApiResponse<Customer>>(`${this.baseUrl}${API_CONFIG.ENDPOINTS.CUSTOMERS.RESTORE(id)}`, {})
            .pipe(
                tap(() => this.invalidateStatisticsCache())
            );
    }

    /**
     * Search customers with debounce
     */
    searchCustomers(searchTerm: Observable<string>, filters?: Partial<CustomerFilters>): Observable<CustomerListResponse> {
        return searchTerm.pipe(
            debounceTime(300),
            distinctUntilChanged(),
            map(term => ({ ...filters, search: term } as CustomerFilters)),
            switchMap(finalFilters => this.getCustomers(finalFilters))
        );
    }

    /**
     * Invalidate statistics cache
     */
    private invalidateStatisticsCache(): void {
        this.statisticsCache$.next(null);
    }

    /**
     * Get statistics observable for reactive updates
     */
    get statistics$(): Observable<CustomerStatistics | null> {
        return this.statisticsCache$.asObservable();
    }
}
