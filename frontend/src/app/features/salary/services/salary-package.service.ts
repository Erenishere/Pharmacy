import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { API_CONFIG } from '../../../core/constants/api.constants';
import {
  SalaryPackage,
  SalaryPackageCreateRequest,
  Employee,
  Item,
  ApiResponse
} from '../../../core/models/salary-package.model';

@Injectable({
  providedIn: 'root'
})
export class SalaryPackageService {
  private readonly baseUrl = API_CONFIG.BASE_URL;
  private static createdPackages: SalaryPackage[] = [];

  constructor(private http: HttpClient) { }

  /**
   * Create salary package
   */
  createPackage(packageData: SalaryPackageCreateRequest): Observable<ApiResponse<SalaryPackage>> {
    return this.http.post<ApiResponse<SalaryPackage>>(
      `${this.baseUrl}/salary-packages`,
      packageData
    ).pipe(
      catchError((error) => {
        console.error('[SalaryPackageService] Create package failed:', error);
        // Mock response
        const mockPackage: SalaryPackage = {
          _id: Date.now().toString(),
          packageId: `PKG${Date.now()}`,
          employeeName: 'Mock Employee',
          basicPay: { amount: 0, source: 'biodata' },
          ...packageData,
          status: 'Active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        SalaryPackageService.createdPackages.push(mockPackage);
        return of({
          success: true,
          data: mockPackage,
          message: 'Package created (mock response)'
        });
      })
    );
  }

  /**
   * Get all packages with filters
   */
  getPackages(filters?: any): Observable<ApiResponse<SalaryPackage[]>> {
    let params = new HttpParams();
    if (filters) {
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null) {
          params = params.set(key, filters[key].toString());
        }
      });
    }

    return this.http.get<ApiResponse<SalaryPackage[]>>(
      `${this.baseUrl}/salary-packages`,
      { params }
    ).pipe(
      catchError((error) => {
        console.error('[SalaryPackageService] Get packages failed:', error);
        return of({
          success: true,
          data: SalaryPackageService.createdPackages,
          message: 'Mock data loaded'
        });
      })
    );
  }

  /**
   * Get package by ID
   */
  getPackageById(id: string): Observable<ApiResponse<SalaryPackage>> {
    return this.http.get<ApiResponse<SalaryPackage>>(
      `${this.baseUrl}/salary-packages/${id}`
    );
  }

  /**
   * Update package
   */
  updatePackage(id: string, packageData: Partial<SalaryPackageCreateRequest>): Observable<ApiResponse<SalaryPackage>> {
    return this.http.put<ApiResponse<SalaryPackage>>(
      `${this.baseUrl}/salary-packages/${id}`,
      packageData
    );
  }

  /**
   * Delete package
   */
  deletePackage(id: string): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(
      `${this.baseUrl}/salary-packages/${id}`
    );
  }

  /**
   * Get employees (from Account API)
   */
  getEmployees(): Observable<ApiResponse<Employee[]>> {
    return this.http.get<ApiResponse<Employee[]>>(
      `${this.baseUrl}/accounts?accountType=employee`
    ).pipe(
      catchError((error) => {
        console.error('[SalaryPackageService] Get employees failed:', error);
        // Mock employees
        const mockEmployees: Employee[] = [
          {
            _id: '1',
            code: 'EMP001',
            name: 'Ahmed Khan',
            email: 'ahmed@example.com',
            phone: '+1234567890',
            designation: 'Sales Manager',
            basicPay: 50000,
            accountType: 'employee',
            isActive: true
          },
          {
            _id: '2',
            code: 'EMP002',
            name: 'Ali Raza',
            email: 'ali@example.com',
            phone: '+1234567891',
            designation: 'Salesman',
            basicPay: 45000,
            accountType: 'employee',
            isActive: true
          },
          {
            _id: '3',
            code: 'EMP003',
            name: 'Sara Ahmed',
            email: 'sara@example.com',
            phone: '+1234567892',
            designation: 'Salesman',
            basicPay: 42000,
            accountType: 'employee',
            isActive: true
          }
        ];
        return of({
          success: true,
          data: mockEmployees,
          message: 'Mock employees loaded'
        });
      })
    );
  }

  /**
   * Get items for brand incentives
   */
  getItems(): Observable<ApiResponse<Item[]>> {
    return this.http.get<ApiResponse<Item[]>>(
      `${this.baseUrl}/items`
    ).pipe(
      catchError((error) => {
        console.error('[SalaryPackageService] Get items failed:', error);
        // Mock items
        const mockItems: Item[] = [
          { _id: '1', code: 'ITEM001', name: 'Panadol 500mg', category: 'Medicine' },
          { _id: '2', code: 'ITEM002', name: 'Brufen 400mg', category: 'Medicine' },
          { _id: '3', code: 'ITEM003', name: 'Augmentin 625mg', category: 'Antibiotic' },
          { _id: '4', code: 'ITEM004', name: 'Vitamin C 1000mg', category: 'Supplement' }
        ];
        return of({
          success: true,
          data: mockItems,
          message: 'Mock items loaded'
        });
      })
    );
  }
}
